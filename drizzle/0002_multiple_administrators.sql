CREATE TRIGGER IF NOT EXISTS guard_admin_signup
BEFORE INSERT ON accounts
WHEN NEW.role = 'admin' AND EXISTS (SELECT 1 FROM accounts WHERE role = 'admin')
BEGIN
  SELECT RAISE(IGNORE);
END;
--> statement-breakpoint
DROP INDEX IF EXISTS one_admin;
