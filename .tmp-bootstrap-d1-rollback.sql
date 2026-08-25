INSERT INTO admin_users (id, name, email, email_normalized, password_hash, role, active, created_at, created_by_admin_id, updated_at, must_change_password)
VALUES ('bootstrap-rollback-admin', 'Rollback Validation', 'bootstrap-rollback@example.invalid', 'bootstrap-rollback@example.invalid', 'pbkdf2_sha256$310000$c2FsdA$aGFzaA', 'admin', 1, '2026-08-25T00:01:00.000Z', NULL, '2026-08-25T00:01:00.000Z', 0);
INSERT INTO missing_bootstrap_validation_table (id) VALUES ('must-fail');
