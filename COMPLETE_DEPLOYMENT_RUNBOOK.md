# COMPLETE DEPLOYMENT RUNBOOK — PEERLEARN
**Date:** November 15, 2026  
**Auditor / DevOps:** Principal Security Architect & DevOps Engineer  
**Target Platform:** InsForge BaaS / PostgreSQL 15+ (`https://c35py4a8.us-east.insforge.app`)  
**Target Environment:** Staging & Controlled Production  
**Execution Status:** Ready to Execute (Awaiting User Authorization)

---

## 1. Pre-Deployment Protocol & Safety Measures

> [!CAUTION]
> Do NOT execute migrations without completing the pre-deployment backup. Migrations modify Row Level Security, RPC execution privileges, constraints, and triggers.

### Step 1.1: Database Snapshot Backup
Before applying any migration, take a full transactional dump of the PostgreSQL database:

```bash
# Set connection variables from your InsForge dashboard (.env.local)
export PGHOST="c35py4a8.us-east.insforge.app"
export PGPORT="5432"
export PGDATABASE="postgres"
export PGUSER="postgres"
export PGPASSWORD="<YOUR_INSFORGE_DB_PASSWORD>"

# Execute full schema and data snapshot
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -F c -b -v -f "peerlearn_pre_migration_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Step 1.2: Verify Environmental Variables
Ensure `.env.local` exists in the repository root and contains the necessary service keys:
```bash
# Verify environment keys are present
test -f .env.local && echo ".env.local exists" || echo "CRITICAL: .env.local missing!"
```

---

## 2. Migration Execution Order (Phase 1 to Phase 5)

All migrations are wrapped within explicit `BEGIN; ... COMMIT;` transactions with `DROP POLICY IF EXISTS` and `CREATE INDEX IF NOT EXISTS` guards. Apply each migration sequentially:

### Phase 1: Authentication & Core Identity Security
```bash
# Applies RPC privilege revokes, search_path pinning, and RLS on academic_records & pending_registrations
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261114224000_phase1_security_remediation.sql
```
*Expected Output:* `COMMIT` with zero errors.

### Phase 2: Profiles, Skills & Doubt Matching Security
```bash
# Applies RLS on students, skills, doubts; creates student_public_profiles view; attaches immutability triggers
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261115_phase2_profiles_matching_security.sql
```
*Expected Output:* `COMMIT` with zero errors.

### Phase 3: Sessions, Chat, Ratings & Planner Security
```bash
# Applies RLS on sessions, messages, ratings, tasks; creates session immutability trigger; hardens book_doubt_atomic
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261115_phase3_sessions_chat_planner_security.sql
```
*Expected Output:* `COMMIT` with zero errors.

### Phase 4: Shared Resources, Proposals & Concurrency Security
```bash
# Applies independent conjunction RLS; creates atomic proposal promotion RPC; enforces secret ballot on votes
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261115_phase4_security_remediation.sql
```
*Expected Output:* `COMMIT` with zero errors.

### Phase 5: Database Performance & Foreign Key Index Optimization
```bash
# Creates 22 missing B-Tree foreign key indexes to eliminate full table scans and deadlocks
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261115_phase5_performance_optimization.sql
```
*Expected Output:* `COMMIT` with zero errors.

---

## 3. Post-Deployment Verification Protocol

Immediately after applying the migrations, execute the automated verification test suites in unsandboxed mode with live network access:

```bash
# 1. Run Phase 1 verification against live database
python3 testsprite_tests/test_phase1_security.py

# 2. Run Phase 2 verification against live database
python3 testsprite_tests/test_phase2_security.py

# 3. Run Phase 3 verification against live database
python3 testsprite_tests/test_phase3_security.py

# 4. Run Phase 4 verification against live database
python3 testsprite_tests/test_phase4_security.py
```

### Manual Curl Verification Probes

#### Probe 1: Verify `confirm_auth_user` is Blocked for Anonymous Roles
```bash
curl -X POST "https://c35py4a8.us-east.insforge.app/rest/v1/rpc/confirm_auth_user" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"target_email":"test@iiitdmj.ac.in","new_password":"HackedPassword123!"}'
```
*Expected Response:* HTTP `401 Unauthorized` or `403 Forbidden` (`permission denied for function confirm_auth_user`).

#### Probe 2: Verify `academic_records` Cannot be Harvested
```bash
curl -s "https://c35py4a8.us-east.insforge.app/rest/v1/academic_records?select=*" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```
*Expected Response:* HTTP `200 OK` with body `[]` (Empty array returned; RLS active).

#### Probe 3: Verify `pending_registrations` Cannot be Read
```bash
curl -s "https://c35py4a8.us-east.insforge.app/rest/v1/pending_registrations?select=*" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```
*Expected Response:* HTTP `200 OK` with body `[]` (Empty array returned; RLS active).

---

## 4. Emergency Rollback Procedures

If an unexpected critical regression occurs during deployment, execute rollbacks in **strict reverse sequential order** (Phase 5 down to Phase 1).

> [!WARNING]
> Rolling back removes Row Level Security policies and restores public execution permissions. Only rollback the specific phase exhibiting issues.

### Rollback Phase 5 (Performance Indexes)
```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261115_phase5_performance_optimization_rollback.sql
```
*Impact:* Drops the 22 created foreign key indexes. Safe; does not affect data.

### Rollback Phase 4 (Resources & Proposals)
```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261115_phase4_security_remediation_rollback.sql
```
*Impact:* Reverts independent conjunction policies, drops proposal immutability triggers, and drops `promote_approved_proposal_atomic` RPC.

### Rollback Phase 3 (Sessions, Chat, Ratings & Tasks)
```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261115_phase3_sessions_chat_planner_security_rollback.sql
```
*Impact:* Drops session immutability triggers, drops ratings unique index, and reverts RLS on sessions/messages.

### Rollback Phase 2 (Profiles, Skills & Doubts)
```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261115_phase2_profiles_matching_security_rollback.sql
```
*Impact:* Drops `student_public_profiles` view, drops student/doubt immutability triggers, and restores public access on matching RPCs.

### Rollback Phase 1 (Authentication & Core Identity)
```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f migrations/20261114224000_phase1_security_remediation_rollback.sql
```
*Impact:* Re-grants `confirm_auth_user` execute permissions to `anon` and `authenticated`. Disables RLS on `academic_records` and `pending_registrations`.

---

## 5. Deployment Sign-Off Checklist

- [ ] Database backup created and verified (`peerlearn_pre_migration_backup_*.dump`).
- [ ] Phase 1 applied successfully (`20261114224000_phase1_security_remediation.sql`).
- [ ] Phase 2 applied successfully (`20261115_phase2_profiles_matching_security.sql`).
- [ ] Phase 3 applied successfully (`20261115_phase3_sessions_chat_planner_security.sql`).
- [ ] Phase 4 applied successfully (`20261115_phase4_security_remediation.sql`).
- [ ] Phase 5 applied successfully (`20261115_phase5_performance_optimization.sql`).
- [ ] Automated security suites passed across all 4 phases.
- [ ] Anonymous penetration curls verified (HTTP 401/403/[] responses).
- [ ] Next.js production build (`npm run build`) succeeded without errors.
- [ ] Deployment complete and signed off.
