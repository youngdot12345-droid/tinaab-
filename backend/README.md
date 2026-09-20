# Tinaab backend foundation

The backend is the security boundary for Tinaab.

## Security rules
- Reward amounts are calculated by the server; the browser cannot choose a reward.
- Verified activity rewards are capped at **₦500 per configured activity**.
- Wallet balances are ledger-backed rather than browser-controlled.
- Withdrawal requests are limited to **2 per calendar day**.
- Money is stored as integer kobo to avoid floating-point currency errors.
- Social input is validated on the server.
- Rate limiting and security headers are enabled.

## Current foundation
Authentication/OTP primitives, wallet schema, reward claims, withdrawals, social graph, posts, likes, comments, reposts, notifications, conversations and messages are represented in the database/API structure.

## Still required before real-money launch
A production database connection, authenticated sessions, persistent transaction handling, anti-fraud verification, media storage/processing, email delivery, payment-gateway credentials, payout reconciliation, admin controls, monitoring and security testing must be configured. The frontend alone must never be trusted with money or admin permissions.
