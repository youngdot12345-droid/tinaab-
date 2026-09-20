# Tinaab

A mobile-first social platform foundation for short-form content, profiles, follows, chat, live experiences, rewards and the Tinaab Wallet.

## Product direction
Tinaab is being built as a first-party platform rather than a collection of third-party social APIs. Core business logic lives on Tinaab's backend. The user-facing money experience is the **Tinaab Wallet**.

## Current foundation
- TikTok-style vertical For You feed
- Like, comment, share, repost and follow controls
- Chat, wallet and profile navigation
- Saved Nigerian bank accounts for withdrawals
- Two-withdrawal-per-day wallet rule
- Responsive mobile-first frontend
- Netlify configuration

## Wallet and bank withdrawal
The Tinaab Wallet is an internal, server-authoritative ledger. Users can add a Nigerian bank account, choose a default account, and create a withdrawal request against a saved destination.

Bank account numbers are encrypted at rest and only masked account numbers are returned to the client. A withdrawal stores a destination snapshot so later bank-account edits do not silently change an existing request.

Actual bank settlement is deliberately kept behind a payout adapter. No specific provider is assumed or branded into the Tinaab product until one is selected and configured.

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

The product rule is up to two withdrawal requests per user per calendar day, with no artificial minimum or maximum set by the UI. Actual settlement speed depends on the bank payout infrastructure. Failed or reversed payouts must reconcile the ledger safely.

## Security
Never trust browser JavaScript for balances, reward creation, verification, withdrawal approval or admin permissions.
