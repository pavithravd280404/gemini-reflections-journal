# Firestore Security Specification

## 1. Data Invariants
1. **Zero Cross-User Leakage**: Any read or write under `/users/{userId}/...` is strictly permitted ONLY if `request.auth.uid == userId`. No user can ever query or read another user's profile, entries, or chat messages.
2. **Identity Integrity**: For every created or updated `JournalEntry` or `JournalMessage`, the `userId` payload field MUST strictly equal `request.auth.uid`.
3. **Subcollection Relational Guard**: In `/users/{userId}/entries/{entryId}/messages/{messageId}`, the message must reference the valid parent entry and user ID, and cannot be accessed if the user is not the owner.
4. **Bounded Sizes**:
   - `content` has maximum character bounds to prevent Denial-of-Wallet payload exhaustion attacks.
   - `title` is limited to 200 characters.
   - String fields and list bounds are strictly guarded.
5. **Path ID Integrity**: All document IDs (`userId`, `entryId`, `messageId`) must match safe identifier pattern `^[a-zA-Z0-9_\-]+$`.

## 2. The Dirty Dozen Attack Payloads & Rejected Cases
1. **Unauthenticated Read**: Anonymous/unauthenticated request attempting `get(/users/user123/entries/entry1)`. -> `PERMISSION_DENIED`
2. **Cross-Tenant Snoop**: User `user_alice` querying `/users/user_bob/entries`. -> `PERMISSION_DENIED`
3. **Spoofed Author Write**: User `user_alice` attempting to write an entry with `userId: "user_bob"`. -> `PERMISSION_DENIED`
4. **Foreign Parent Injection**: User writing to `/users/user_alice/entries/entry1/messages/msg1` with `userId: "user_charlie"`. -> `PERMISSION_DENIED`
5. **Oversized String Bomb**: An entry payload containing a 10MB `content` string. -> `PERMISSION_DENIED`
6. **Path Traversal / ID Poisoning**: Document ID containing `../` or special control chars. -> `PERMISSION_DENIED`
7. **Missing Mandatory Fields**: Journal entry missing `title` or `content`. -> `PERMISSION_DENIED`
8. **Invalid Role in Message**: `JournalMessage` with `role: "admin"` instead of `"user" | "model"`. -> `PERMISSION_DENIED`
9. **Blank Key Creation**: Document with no keys or unauthorized shadow keys. -> `PERMISSION_DENIED`
10. **Tampered Update**: Modifying immutable `id`, `userId`, or `createdAt` on an existing entry. -> `PERMISSION_DENIED`
11. **Malicious Tag List**: Injecting arbitrary non-string objects into `tags`. -> `PERMISSION_DENIED`
12. **Broad List Query Bypass**: Client attempting an unbounded collectionGroup or unauthenticated list query. -> `PERMISSION_DENIED`
