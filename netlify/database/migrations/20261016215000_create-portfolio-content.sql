CREATE TABLE IF NOT EXISTS portfolio_content (
  id VARCHAR(32) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO portfolio_content (id, data)
VALUES ('main', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
