# Tinaab payout integration readiness

## Current provider decision

- **OPay:** approved provider option.
- **Paystack:** approved provider option.
- **Moniepoint:** excluded from the payout-processing flow.
- **Flutterwave:** excluded from the payout-processing flow.

## Current implementation state

The wallet can create a withdrawal request and place the requested amount into the wallet's pending balance. An administrator can reverse a failed request.

Successful payout reconciliation is intentionally blocked unless:

1. `PAYOUT_EXECUTION_ENABLED=true` is configured on the backend.
2. A verified provider adapter has been implemented for the selected provider.
3. Provider credentials are stored only in backend environment variables.
4. Provider webhooks or server-side status checks verify the provider transaction reference.
5. Production tests confirm idempotency, duplicate-reference protection, failure reversal, and ledger consistency.

Setting `PAYOUT_EXECUTION_ENABLED=true` before those conditions are met is unsafe and must not be done.

## Required next engineering work

1. Choose the active provider for the first production rollout: OPay or Paystack.
2. Confirm the provider's approved merchant/API access and supported Nigerian bank payout flow.
3. Implement a backend-only provider adapter with request signing, timeouts, retries, idempotency, and response validation.
4. Add verified webhook handling and/or server-side status polling.
5. Store provider request IDs and transaction references in an auditable record.
6. Run sandbox and controlled production tests before enabling execution.
