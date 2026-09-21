# Tinaab production launch checklist

This checklist separates code readiness from live-service readiness.

## Frontend

- Deploy the repository's static frontend through Vercel or Netlify.
- Set `window.TINAAB_API_BASE` before loading `frontend/js/api.js` when the API is hosted on a different domain.
- Confirm signup, email verification, login, feed loading, follow/unfollow, comments, reposts and sharing in a real browser.
- Check mobile layout and browser console errors.

## Backend

- Run the Express API on a managed Node.js host.
- Configure `DATABASE_URL`, email delivery settings, media storage and payment provider credentials through encrypted environment variables.
- Apply database migrations and create an admin account securely.
- Configure CORS to allow only the production frontend origin.
- Add monitoring, structured logs, backups and rate-limit alerts.

## Money and safety

- Complete payment-provider verification and payout reconciliation before enabling real withdrawals.
- Keep all reward calculations and wallet balance changes server-side.
- Test duplicate requests, replayed reward claims, invalid bank details and failed payouts.
- Keep withdrawal approval and admin permissions behind authenticated server-side checks.

## Release gate

Do not advertise Tinaab as a live money-earning service until authentication, email delivery, database persistence, anti-fraud controls, payment settlement and monitoring have been tested in production-like conditions.