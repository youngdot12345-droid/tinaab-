# Tinaab API Inventory

This document records the APIs Tinaab needs. Internal Tinaab APIs are implemented in the backend and must remain the primary application interface. External providers are optional integrations and must never be called directly from browser code.

## Internal Tinaab API groups

### System
- `GET /api/health` — service health check.
- `GET /api/config` — safe public runtime configuration only; never return secrets.

### Authentication and account
- Signup, login, session lookup, email verification, and logout/session handling.
- All protected endpoints require a server-issued bearer token.
- Passwords, verification secrets, provider keys, and signing secrets remain server-side.

### Profiles and social graph
- Public profile lookup.
- Profile posts and profile statistics.
- Follow and unfollow users.
- Public feed and following feed.

### Posts and engagement
- Create posts and upload media.
- Like/unlike posts.
- Comments and comment listing.
- Repost/unrepost.
- Share tracking and reward eligibility checks.
- Server-side anti-abuse controls and idempotent reward claims.

### Messaging
- `GET /api/conversations` — list the authenticated user's conversations.
- `POST /api/conversations` — create or reuse a conversation with another user.
- `GET /api/conversations/:id/messages` — list messages with pagination.
- `POST /api/conversations/:id/messages` — send a text message.
- `POST /api/conversations/:id/read` — mark a conversation as read.

Future messaging APIs should be added behind authenticated routes:
- Typing presence and online status.
- Message delivery/read receipts.
- Attachments and voice notes.
- Voice/video call signaling.
- Block, mute, report, and abuse controls.

### Wallet and withdrawals
- Wallet balance and server-side ledger.
- Reward claim validation.
- Bank account creation and secure masking.
- Withdrawal request creation.
- Admin reconciliation and audit history.
- A withdrawal must never be marked successful from a browser response alone.

## External integrations

External services are intentionally kept behind backend adapters:

1. **Email provider** — verification and transactional messages. Provider selection remains configurable.
2. **OPay** — approved candidate for payout processing, subject to merchant approval, API access, webhook verification, and production testing.
3. **Paystack** — approved candidate for payout processing, subject to the exact transfer product being enabled, account activation, credentials, webhook verification, and production testing.
4. **Database provider** — PostgreSQL-compatible production database.
5. **Object/media storage** — only if local backend storage is not suitable for production scale.

## Integration rules

- Never place secret keys in `frontend/`, HTML, browser JavaScript, public repositories, or client-side environment variables.
- Validate every request on the backend.
- Apply authentication, authorization, rate limits, input validation, and audit logging.
- Verify webhook signatures and transaction status server-side.
- Use idempotency keys for money movement and reward claims.
- Keep test and production credentials completely separate.
- Do not activate real-money processing until sandbox tests, reconciliation tests, failure handling, and compliance checks are complete.

## Release order

1. Authentication and email verification.
2. Feed, profiles, follows, likes, comments, reposts, and sharing.
3. Text messaging with pagination and read status.
4. Presence, attachments, and call signaling.
5. Production hosting, database, monitoring, backups, and security testing.
6. Optional payout provider activation after formal verification and testing.
