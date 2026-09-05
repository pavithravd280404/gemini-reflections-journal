import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Lazy GoogleGenAI client helper - kept strictly server-side
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

/**
 * Fallback model order:
 * 1. Configured primary model (or gemini-3.8-flash)
 * 2. gemini-3.8-flash
 * 3. gemini-3.7-flash
 * 4. gemini-3.6-flash
 * 5. gemini-3.5-flash-lite
 */
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL_SEQUENCE = [
  PRIMARY_MODEL,
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite'
];
// Deduplicate while strictly maintaining specified fallback order
const ORDERED_FALLBACK_MODELS = Array.from(new Set(FALLBACK_MODEL_SEQUENCE));

interface ErrorClassification {
  isRetryable: boolean;
  isNotFound: boolean;
  statusCode: number;
  statusText: string;
}

function classifyGeminiError(err: any): ErrorClassification {
  if (!err) {
    return { isRetryable: false, isNotFound: false, statusCode: 500, statusText: 'Unknown Error' };
  }

  const rawStatus = err.status || err.statusCode || err.code || err.error?.code || err.error?.status;
  const rawMessage = String(err.message || err.error?.message || err || '');
  const statusStr = String(rawStatus || '');
  const lowerMsg = rawMessage.toLowerCase();

  const isNotFound =
    rawStatus === 404 ||
    statusStr === '404' ||
    statusStr === 'NOT_FOUND' ||
    lowerMsg.includes('not found') ||
    lowerMsg.includes('is not supported') ||
    lowerMsg.includes('unknown model');

  const isRetryable =
    isNotFound ||
    rawStatus === 503 ||
    rawStatus === 429 ||
    rawStatus === 500 ||
    rawStatus === 502 ||
    rawStatus === 504 ||
    statusStr === '503' ||
    statusStr === '429' ||
    statusStr === '500' ||
    statusStr === '502' ||
    statusStr === '504' ||
    statusStr === 'UNAVAILABLE' ||
    statusStr === 'RESOURCE_EXHAUSTED' ||
    statusStr === 'INTERNAL' ||
    statusStr === 'DEADLINE_EXCEEDED' ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('429') ||
    lowerMsg.includes('500') ||
    lowerMsg.includes('502') ||
    lowerMsg.includes('504') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('high demand') ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('overloaded');

  let statusCode = 500;
  if (rawStatus === 503 || statusStr === 'UNAVAILABLE' || lowerMsg.includes('503') || lowerMsg.includes('high demand')) {
    statusCode = 503;
  } else if (rawStatus === 429 || statusStr === 'RESOURCE_EXHAUSTED' || lowerMsg.includes('429')) {
    statusCode = 429;
  } else if (isNotFound) {
    statusCode = 404;
  } else if (rawStatus === 502 || lowerMsg.includes('502')) {
    statusCode = 502;
  } else if (rawStatus === 504 || lowerMsg.includes('504')) {
    statusCode = 504;
  }

  return {
    isRetryable,
    isNotFound,
    statusCode,
    statusText: statusStr || rawMessage.slice(0, 160)
  };
}

/**
 * Reusable helper function to execute Gemini requests with fallback order:
 * 1. gemini-3.8-flash (or configured primary)
 * 2. gemini-3.7-flash
 * 3. gemini-3.6-flash
 * 4. gemini-3.5-flash-lite
 *
 * Automatically retries with exponential backoff on 503, 429, 500, 502, 504,
 * and falls back on 404 or exhausted retries.
 * Logs which model was attempted without logging API keys.
 */
export async function generateWithFallback(
  ai: GoogleGenAI,
  payload: {
    contents: any;
    config?: any;
  },
  taskName: string = 'Request'
): Promise<{ text: string; model: string }> {
  let lastError: any = null;
  const maxAttemptsPerModel = 2; // initial call + 1 backoff retry before switching model

  for (let i = 0; i < ORDERED_FALLBACK_MODELS.length; i++) {
    const model = ORDERED_FALLBACK_MODELS[i];

    for (let attempt = 0; attempt < maxAttemptsPerModel; attempt++) {
      try {
        // Safe logging of attempted model (NEVER logs the API key)
        console.log(
          `[Gemini ${taskName}] Attempting model "${model}" (attempt ${attempt + 1}/${maxAttemptsPerModel})`
        );

        const response = await ai.models.generateContent({
          model,
          contents: payload.contents,
          config: payload.config
        });

        if (response.text) {
          console.log(`[Gemini ${taskName}] Successfully generated response using model "${model}"`);
          return {
            text: response.text,
            model
          };
        } else {
          throw new Error(`Model ${model} returned empty text.`);
        }
      } catch (err: any) {
        lastError = err;
        const errInfo = classifyGeminiError(err);
        console.warn(
          `[Gemini ${taskName}] Model "${model}" failed on attempt ${attempt + 1}: [Code ${errInfo.statusCode}] ${errInfo.statusText}`
        );

        // If non-retryable error, stop trying this model
        if (!errInfo.isRetryable) {
          break;
        }

        // If model not found (404), skip immediate retries and fall back to next model
        if (errInfo.isNotFound) {
          console.warn(`[Gemini ${taskName}] Model "${model}" not found (404). Falling back to next model...`);
          break;
        }

        // Retry with exponential backoff
        if (attempt < maxAttemptsPerModel - 1) {
          const delay = Math.min(500 * Math.pow(2, attempt), 2000);
          console.log(`[Gemini ${taskName}] Waiting ${delay}ms before retrying "${model}"...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.log(`[Gemini ${taskName}] Retries exhausted for "${model}". Falling back to next model...`);
        }
      }
    }
  }

  // All models in fallback list failed
  const friendlyError: any = new Error(
    'All Gemini models are temporarily experiencing high demand. Please try again in a few moments.'
  );
  friendlyError.statusCode = 503;
  friendlyError.status = 'UNAVAILABLE';
  friendlyError.originalError = lastError;
  throw friendlyError;
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// 1. Gemini Journal Reflection API
app.post('/api/gemini/reflect', async (req, res) => {
  try {
    const { title, content, mood, mode = 'reflect' } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Journal content is required.' });
    }

    const ai = getAI();

    let systemInstruction = `You are an insightful, compassionate, and psychologically grounded reflective journaling guide.
Your purpose is to help the user process their thoughts, celebrate breakthroughs, understand emotional undertones, recognize cognitive patterns, and discover meaningful perspectives.
Maintain a warm, non-judgmental, authentic tone. Avoid platitudes and generic cheerleading.
Format your response using clean Markdown with distinct sections.`;

    let userPrompt = '';
    if (mode === 'brainstorm') {
      userPrompt = `The user has written the following journal entry titled "${title || 'Untitled'}":
Mood indicated: ${mood || 'Not specified'}

Journal Entry:
"""
${content}
"""

Please provide a creative and practical Brainstorming Reflection:
1. **Core Opportunities & Fresh Angles**: 3-4 creative ways or perspectives to approach the situations/thoughts described.
2. **"What If?" Thought Experiments**: 2 thoughtful hypothetical questions to open up new possibilities.
3. **Actionable Experiments**: 2-3 small, low-friction steps they could test out in the real world.`;
    } else if (mode === 'summarize') {
      userPrompt = `The user has written the following journal entry titled "${title || 'Untitled'}":
Mood indicated: ${mood || 'Not specified'}

Journal Entry:
"""
${content}
"""

Please provide a structured Synthesis & Summary:
1. **Executive Summary**: A concise 2-sentence distillation of the core thought or event.
2. **Key Themes & Emotions**: Bullet points of recurring threads and feelings.
3. **Underlying Motivations / Insights**: What matters most to the writer here.
4. **Closing Anchor**: A grounding single takeaway statement.`;
    } else {
      userPrompt = `The user has written the following journal entry titled "${title || 'Untitled'}":
Mood indicated: ${mood || 'Not specified'}

Journal Entry:
"""
${content}
"""

Please provide a deep, empathetic Journal Reflection:
1. **Reflection & Validation**: Validate their experience with empathetic depth and articulate what stands out.
2. **Underlying Themes & Patterns**: Gently highlight cognitive patterns, values, or recurring motivations evident in their writing.
3. **Deepening Inquiries**: 2-3 powerful, open-ended introspective questions for further journaling or contemplation.
4. **Gentle Affirmation / Next Step**: An encouraging grounding perspective to carry forward.`;
    }

    const promptEnding = `\n\nAt the very end of your response, on a new line, provide a single-sentence takeaway summary (max 25 words) strictly in this exact format:
---SUMMARY---
<single sentence summary>`;

    userPrompt += promptEnding;

    const result = await generateWithFallback(
      ai,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          temperature: 0.7
        }
      },
      'Reflection'
    );

    const fullResponseText = result.text;
    let reflectionText = fullResponseText;
    let summary = '';

    const summarySplit = fullResponseText.split(/---SUMMARY---/i);
    if (summarySplit.length > 1) {
      reflectionText = summarySplit[0].trim();
      summary = summarySplit[1].trim().replace(/^["']/, '').replace(/["']$/, '');
    } else {
      const cleanExcerpt = fullResponseText.replace(/[#*_`]/g, '').trim().split(/[.\n]/)[0];
      summary = cleanExcerpt ? (cleanExcerpt.slice(0, 120) + (cleanExcerpt.length > 120 ? '...' : '.')) : 'Reflective insights generated.';
    }

    return res.json({
      reflection: reflectionText,
      summary: summary,
      mode,
      modelUsed: result.model
    });
  } catch (error: any) {
    console.error('[Reflection API Error]:', error?.message || error);
    return res.status(503).json({
      error: 'All Gemini models are temporarily experiencing high demand. Please try again in a few moments.',
      code: 503,
      status: 'UNAVAILABLE'
    });
  }
});

// 2. Gemini Multi-turn Chat responses on an entry
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, journalContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getAI();

    let contextSnippet = '';
    if (journalContext) {
      contextSnippet = `\nContext of the journal entry being discussed:
Title: ${journalContext.title || 'Untitled'}
Original Journal Content:
"""
${journalContext.content || ''}
"""
${journalContext.reflection ? `Initial Gemini Reflection:\n"""\n${journalContext.reflection}\n"""` : ''}`;
    }

    const systemInstruction = `You are a thoughtful, compassionate, and attentive journaling companion conversing with the user about their specific journal entry.${contextSnippet}
Help the user dive deeper, explore alternative perspectives, feel heard, and discover insights.
Keep conversational replies focused, genuine, and encouraging. Use clear formatting when structuring ideas.`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const result = await generateWithFallback(
      ai,
      {
        contents: contents,
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          temperature: 0.7
        }
      },
      'Chat'
    );

    return res.json({
      reply: result.text || 'No response received from Gemini.',
      modelUsed: result.model
    });
  } catch (error: any) {
    console.error('[Chat API Error]:', error?.message || error);
    return res.status(503).json({
      error: 'All Gemini models are temporarily experiencing high demand. Please try again in a few moments.',
      code: 503,
      status: 'UNAVAILABLE'
    });
  }
});

// 3. Gemini Standalone Summary generation
app.post('/api/gemini/summary', async (req, res) => {
  try {
    const { content, title } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required for summary.' });
    }

    const ai = getAI();
    const prompt = `Summarize this journal entry titled "${title || 'Untitled'}" in 1-2 crisp, thoughtful sentences (max 30 words):\n\n"${content}"`;

    const result = await generateWithFallback(
      ai,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.3 }
      },
      'Summary'
    );

    return res.json({
      summary: result.text.trim().replace(/^["']/, '').replace(/["']$/, ''),
      modelUsed: result.model
    });
  } catch (error: any) {
    console.error('[Summary API Error]:', error?.message || error);
    return res.status(503).json({
      error: 'All Gemini models are temporarily experiencing high demand. Please try again in a few moments.',
      code: 503,
      status: 'UNAVAILABLE'
    });
  }
});

// 4. Gemini Title Generation
app.post('/api/gemini/title', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required to generate a title.' });
    }

    const ai = getAI();
    const prompt = `Read this reflective journal entry and suggest a concise, poignant title (2 to 6 words). Respond ONLY with the title text itself without quotation marks or explanations:\n\n"${content.slice(0, 1500)}"`;

    const result = await generateWithFallback(
      ai,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.7 }
      },
      'Title'
    );

    const cleanTitle = result.text.trim().replace(/^["']/, '').replace(/["']$/, '').replace(/^[#*\s]+/, '');

    return res.json({
      title: cleanTitle || 'Mindful Reflection',
      modelUsed: result.model
    });
  } catch (error: any) {
    console.error('[Title API Error]:', error?.message || error);
    return res.status(503).json({
      error: 'All Gemini models are temporarily experiencing high demand. Please try again in a few moments.',
      code: 503,
      status: 'UNAVAILABLE'
    });
  }
});

// 5. Gemini Insights API (cognitive trends and patterns)
app.post('/api/gemini/insights', async (req, res) => {
  try {
    const { content, mood } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required for insights.' });
    }

    const ai = getAI();
    const prompt = `Analyze this journal entry (mood: ${mood || 'unspecified'}) for underlying cognitive themes, emotional patterns, and psychological strengths.
Provide:
- **Core Emotional Need**: The primary unvoiced or expressed need.
- **Cognitive Strengths**: 2 positive resilience anchors shown.
- **Reframing Perspective**: A gentle mental reframe to consider.

Keep it concise, compassionate, and actionable.

Journal Entry:
"""
${content}
"""`;

    const result = await generateWithFallback(
      ai,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.6 }
      },
      'Insights'
    );

    return res.json({
      insights: result.text,
      modelUsed: result.model
    });
  } catch (error: any) {
    console.error('[Insights API Error]:', error?.message || error);
    return res.status(503).json({
      error: 'All Gemini models are temporarily experiencing high demand. Please try again in a few moments.',
      code: 503,
      status: 'UNAVAILABLE'
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
