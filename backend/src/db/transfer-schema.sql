-- Tinaab wallet-to-wallet transfers.
-- Transfers are atomic and recorded in the sender/recipient ledgers.
CREATE TABLE IF NOT EXISTS wallet_transfers (
  id BIGSERIAL PRIMARY KEY,
  sender_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_user_id <> recipient_user_id)
);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_sender_created ON wallet_transfers(sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_recipient_created ON wallet_transfers(recipient_user_id, created_at DESC);
