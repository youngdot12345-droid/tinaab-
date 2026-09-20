# Tinaab security model

## Never trust the client
The browser can display balances and reward information, but it must never be authoritative for wallet balance, reward amount, withdrawal approval, verification status, or admin permissions.

## Reward protection
Every reward must be derived from a server-side activity rule. The current configured ceiling is ₦500 per verified activity. A claim must be tied to an authenticated user and a unique activity reference before a ledger entry can be posted.

## Withdrawal protection
The server counts withdrawal requests by user and calendar day and blocks requests after two. A production payment adapter must use idempotency/provider references so retries cannot create duplicate payouts.

## Social safety
Tinaab should provide block, mute, report and moderation controls before public launch. Messaging/live features should use abuse-rate limits and account-level enforcement.

## Secrets
Never commit database passwords, API keys, payment credentials or session secrets. Use environment variables/secrets in deployment.
