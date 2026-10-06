-- Secure transaction PINs and payout requests.
CREATE TABLE IF NOT EXISTS transaction_pins (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payout_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  account_name TEXT NOT NULL,
  account_number_ciphertext TEXT NOT NULL,
  account_number_iv TEXT NOT NULL,
  account_number_tag TEXT NOT NULL,
  account_number_hash TEXT NOT NULL,
  account_number_last4 TEXT NOT NULL CHECK (account_number_last4 ~ '^[0-9]{4}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  provider TEXT NOT NULL DEFAULT 'pending_provider',
  provider_reference TEXT UNIQUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_created ON payout_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status_created ON payout_requests(status, created_at DESC);
