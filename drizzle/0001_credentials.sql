CREATE TABLE credentials (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  digest TEXT NOT NULL
);
CREATE TABLE sessions (
  digest TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES credentials(id),
  expires INTEGER NOT NULL
);
CREATE TABLE login_limits (
  email TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
