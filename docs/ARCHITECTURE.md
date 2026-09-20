# Tinaab Architecture

Tinaab is being built as a modular platform so the frontend can evolve without putting business-critical logic in the browser.

## Layers
- **Frontend:** mobile-first interface for feed, chat, wallet and profile experiences.
- **API:** server-side authentication, profiles, social graph, rewards, withdrawals, notifications and moderation.
- **Database:** authoritative users, balances, reward events, bank destinations, payout records, messages and audit history.
- **Storage:** media and user-uploaded assets.
- **Payout boundary:** a pluggable bank payout adapter for actual settlement. The provider is not part of the user-facing Tinaab Wallet.

## Wallet flow
**Tinaab Wallet → Add Bank Account → Select Default Bank → Withdraw → Payout Processing → Success/Failure Reconciliation**

Bank account numbers are encrypted at rest. Only masked account numbers are returned to normal client requests. Withdrawal requests preserve a destination snapshot.

## Security rule
The browser must never be trusted to create money, approve rewards, change balances, verify identity, authorize withdrawals or grant admin privileges.

## Development stages
1. Frontend foundation
2. API and authentication
3. Database and user accounts
4. Social graph and messaging
5. Server-authoritative rewards and wallet ledger
6. Saved bank accounts and withdrawal workflow
7. Payout adapter and real bank settlement
8. Moderation, fraud controls and audit logs
9. Production deployment and monitoring
