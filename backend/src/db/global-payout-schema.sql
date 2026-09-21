-- Tinaab global withdrawal destinations.
-- Provider integrations must validate country, identity, currency and eligibility
-- before any real payout is submitted.
-- Supported destination providers: bank, PayPal, and Stripe Global Payouts.
CREATE TABLE IF NOT EXISTS global_payout_destinations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('paypal', 'stripe', 'bank')),
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  currency_code TEXT NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  label TEXT NOT NULL,
  destination_ciphertext TEXT NOT NULL,
  destination_iv TEXT NOT NULL,
  destination_tag TEXT NOT NULL,
  destination_hash TEXT NOT NULL,
  destination_last4 TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled', 'rejected')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider, destination_hash)
);

-- Upgrade existing installations from the previous crypto-enabled constraint.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'global_payout_destinations_provider_check'
      AND conrelid = 'global_payout_destinations'::regclass
  ) THEN
    ALTER TABLE global_payout_destinations
      DROP CONSTRAINT global_payout_destinations_provider_check;
  END IF;
END $$;

UPDATE global_payout_destinations
SET status = 'disabled'
WHERE provider = 'crypto' AND status <> 'disabled';

ALTER TABLE global_payout_destinations
  ADD CONSTRAINT global_payout_destinations_provider_check
  CHECK (provider IN ('paypal', 'stripe', 'bank'));

CREATE INDEX IF NOT EXISTS idx_global_payout_destinations_user_status
  ON global_payout_destinations(user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_global_payout_destination
  ON global_payout_destinations(user_id)
  WHERE is_default = TRUE;

ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS payout_destination_id BIGINT REFERENCES global_payout_destinations(id);
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS provider_snapshot TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS country_code_snapshot TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS currency_code_snapshot TEXT;
CREATE INDEX IF NOT EXISTS idx_withdrawals_payout_destination
  ON withdrawal_requests(payout_destination_id, created_at DESC);
