# Tinaab

A mobile-first social platform foundation for short-form content, profiles, follows, chat, live experiences, rewards and wallet transactions.

## Product direction
Tinaab is being built as a first-party platform rather than a collection of third-party social APIs. Core business logic will live on Tinaab's backend. A payment gateway is the external boundary used for actual money movement.

## Current foundation
- TikTok-style vertical For You feed
- Like, comment, share, repost and follow controls
- Chat, wallet and profile navigation
- Two-withdrawal-per-day wallet UI
- Responsive mobile-first frontend
- Netlify configuration

## Planned architecture
- Secure email/Gmail verification and sessions
- User profiles, follows and social graph
- Media upload/storage and processing
- Feed ranking and moderation
- Realtime messaging, voice notes and presence
- Notifications
- Live streaming and gifts
- Server-authoritative rewards and referrals
- Withdrawal ledger with fraud/risk checks
- Admin dashboard and account moderation
- Audit logs and transaction history

## Reward and withdrawal principles
Reward values are configuration, not client-side money creation. Every reward must be validated server-side and recorded in an immutable transaction ledger.

The product rule is up to two withdrawal requests per user per calendar day, with no artificial minimum or maximum set by the UI. Actual settlement speed depends on the payment provider/bank. Failed or reversed payouts must reconcile the ledger safely.

## Security
Never trust browser JavaScript for balances, reward creation, verification, withdrawal approval or admin permissions.
