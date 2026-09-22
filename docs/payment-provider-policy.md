# Tinaab Payment Provider Policy

## Approved providers

Tinaab's planned reward-withdrawal processing providers are **OPay and Paystack only**.

- **OPay:** approved provider for the planned payout integration, subject to API access, merchant approval, credentials, webhook verification, and production testing.
- **Paystack:** approved provider for the planned payout integration, subject to API access, merchant approval, credentials, webhook verification, and production testing.
- **Moniepoint:** not approved and must not be added to the payout-processing flow.
- **Flutterwave:** not approved and must not be added to the payout-processing flow.

## Implementation rules

1. Never place provider secrets, API keys, signing secrets, or private credentials in frontend code.
2. Payout requests must be created and verified on the backend.
3. A withdrawal must not be marked successful solely because a client reports success.
4. Provider webhooks and/or server-side status checks must verify the transaction reference before the wallet ledger is finalized.
5. If OPay or Paystack credentials/API support are not configured, the relevant payout operation must remain disabled or return a clear configuration error; do not simulate a successful payout.
6. Keep a server-side audit trail for withdrawal requests, provider references, status changes, and reconciliation results.
7. Use a provider adapter/configuration layer so OPay and Paystack can be enabled independently without exposing credentials to users.

## Current status

This file records the product decision. It does not claim that OPay or Paystack API access, merchant approval, live credentials, or production payout settlement has already been completed.
