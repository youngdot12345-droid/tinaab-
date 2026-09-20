CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_events (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  activity VARCHAR(128) NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  status VARCHAR(32) NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, activity)
);

CREATE INDEX IF NOT EXISTS idx_reward_events_user_created
  ON reward_events(user_id, created_at DESC);
