# Tinaab Architecture

Tinaab is being built as a modular platform so the frontend can evolve without putting business-critical logic in the browser.

## Layers

- **Frontend:** mobile-first interface for feed, chat, wallet and profile experiences.
- **API:** server-side authentication, profiles, social graph, rewards, withdrawals, notifications and moderation.
- **Database:** authoritative users, balances, reward events, payout records, messages and audit history.
- **Storage:** media and user-uploaded assets.
- **Payment boundary:** external payment provider for actual money movement.

## Security rule

The browser must never be trusted to create money, approve rewards, change balances, verify identity, authorize withdrawals or grant admin privileges.

## Development stages

1. Frontend foundation
2. API and authentication
3. Database and user accounts
4. Social graph and messaging
5. Server-authoritative rewards and wallet ledger
6. Payment integration
7. Moderation, fraud controls and audit logs
8. Production deployment and monitoring
