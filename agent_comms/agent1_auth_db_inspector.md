# Agent 1: Auth & Database Inspector Log
**Status:** RESOLVED
**Timestamp:** 2026-10-22T13:22:00+05:30
**Assigned Sub-Agent:** Database & Auth Schema Inspector

## Findings
1. **Root Cause Analysis:**
   - In `auth.users`, the record for `25bcs270@iiitdmj.ac.in` was created during initial OTP dispatch (`signInWithOtp`), which creates a passwordless account with `password = NULL`.
   - When the user subsequently entered their desired password (`vamsi056`) during registration, `admin.auth.signUp` failed silently with "User already registered", leaving `password = NULL` in `auth.users`.
   - Consequently, `POST /api/v1/auth/login` calling `signInWithPassword` returned HTTP `401 Unauthorized ("Invalid credentials")`.

2. **Database Schema & Auth Crypt Analysis:**
   - InsForge Auth stores passwords in `auth.users.password` as standard bcrypt hashes (`$2a$10$...` / `$2b$10$...`).
   - The PostgreSQL `pgcrypto` extension was verified active with `crypt(new_password, gen_salt('bf', 10))`.

3. **Database Remediation:**
   - Applied migration [`20261022131500_confirm-user-password.sql`](file:///c:/Users/vamsi/OneDrive/Desktop/peerlearn/migrations/20261022131500_confirm-user-password.sql) upgrading `confirm_auth_user(target_email text, new_password text)` to securely hash and store passwords upon registration.
   - Set password for `25bcs270@iiitdmj.ac.in` to `vamsi056`.
