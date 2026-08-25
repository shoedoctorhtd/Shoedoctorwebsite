INSERT INTO admin_users (id, name, email, email_normalized, password_hash, role, active, created_at, created_by_admin_id, updated_at, must_change_password)
SELECT 'bootstrap-validation-admin', 'Bootstrap Validation', 'bootstrap-validation@example.invalid', 'bootstrap-validation@example.invalid', 'pbkdf2_sha256$310000$c2FsdA$aGFzaA', 'super_admin', 1, '2026-08-25T00:00:00.000Z', NULL, '2026-08-25T00:00:00.000Z', 0
WHERE NOT EXISTS (SELECT 1 FROM admin_users);
INSERT INTO audit_logs (id, actor_type, admin_user_id, administrator_name_snapshot, administrator_email_snapshot, administrator_role_snapshot, action, entity_type, entity_id, booking_reference, pair_reference, previous_values, new_values, changed_fields, reason, session_id, request_id, created_at)
SELECT 'bootstrap-validation-audit', 'legacy', NULL, 'Bootstrap Validation', NULL, NULL, 'ADMIN_USER_CREATED', 'admin_user', id, NULL, NULL, NULL, '{"name":"Bootstrap Validation","role":"super_admin","active":true}', '["creation"]', 'Bootstrap validation', NULL, NULL, '2026-08-25T00:00:00.000Z'
FROM admin_users WHERE id = 'bootstrap-validation-admin' AND (SELECT COUNT(*) FROM admin_users) = 1;
INSERT INTO owner_alert_events (id, audit_log_id, event_key, alert_type, delivery_status, attempt_count, created_at, updated_at)
SELECT 'bootstrap-validation-alert', 'bootstrap-validation-audit', 'audit:bootstrap-validation-audit', 'ADMIN_USER_CREATED', 'pending', 1, '2026-08-25T00:00:00.000Z', '2026-08-25T00:00:00.000Z'
WHERE EXISTS (SELECT 1 FROM audit_logs WHERE id = 'bootstrap-validation-audit');
UPDATE admin_auth_settings
SET bootstrap_completed_at = '2026-08-25T00:00:00.000Z', shared_login_disabled_at = '2026-08-25T00:00:00.000Z', updated_at = '2026-08-25T00:00:00.000Z'
WHERE singleton = 1 AND EXISTS (SELECT 1 FROM admin_users WHERE id = 'bootstrap-validation-admin') AND (SELECT COUNT(*) FROM admin_users) = 1;
SELECT CASE WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = 'bootstrap-validation-admin') AND EXISTS (SELECT 1 FROM audit_logs WHERE id = 'bootstrap-validation-audit') AND EXISTS (SELECT 1 FROM owner_alert_events WHERE id = 'bootstrap-validation-alert') AND EXISTS (SELECT 1 FROM admin_auth_settings WHERE singleton = 1 AND shared_login_disabled_at = '2026-08-25T00:00:00.000Z') THEN 'created' ELSE 'not_created' END AS bootstrap_status;
