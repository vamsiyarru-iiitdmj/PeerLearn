# PEERLEARN — REMAINING SECURITY & ARCHITECTURAL ISSUES

**Date:** November 15, 2026  
**Audited Against:** InsForge Backend Security Advisor Initial Report & Phase 4 Security Review  
**Security Remediation Progress:** **34 of 34 Critical Security Issues Remediated (100% Staged & Code-Verified)**  
**Phase 4 Review Items Remediated:** **5 of 5 Security Review Findings Remediated and Verified**  

---

## 1. Executive Status: Security Scope Complete

With the revised remediation of **Phase 4**, all **34 Critical Security findings** from the InsForge Advisor report and all **5 Security Review requirements** are **100% resolved and verified** across staged migrations, rollback scripts, automated test suites, and backend application code:

| Remediation Phase | Domain | Findings Targeted | Review Items | Automated Suite | Local Pass Rate | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 1** | Auth, Core Identity & Student Data | 7 | — | `test_phase1_security.py` | 100% | **STAGED** |
| **Phase 2** | Profiles & Doubt Matching | 11 | — | `test_phase2_security.py` | 100% | **STAGED** |
| **Phase 3** | Sessions, Live Chat & Study Planner | 10 | — | `test_phase3_security.py` | 100% | **STAGED** |
| **Phase 4** | Study Materials & Resource Collaboration | 6 | 5 Review Items | `test_phase4_security.py` | 100% | **STAGED** |
| **TOTAL SECURITY** | **Platform-Wide Access Control & RPCs** | **34** | **5 Review Items** | **4 Suites (214 Local Tests)** | **100.0%** | **READY FOR REMOTE** |

---

## 2. Phase 4 Review Items: Resolution Verification

| Review Item | Description & Vulnerability | Resolution Implemented | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **1. Shared Resource Access Logic** | Loose `OR` logic between `department = 'ALL'` and `batch = 'ALL'` allowed cross-academic leakage. Fuzzy department matching was insecure. | Implemented strict independent conjunction `(dept_cond) AND (batch_cond)` in SQL and backend. Added SQL function `public.normalize_department(dept)` and TS helper `normalizeDeptString`. Explicitly documented `NULL` semantics (restricted/admin only). Missing academic records restricted to public materials. | P4-ENG-01 through P4-ENG-14 (14 database engine tests passed); P4-MIG-01, P4-MIG-06, P4-BCK-01, P4-BCK-04 passed. |
| **2. Secure Resource Votes** | Exposing raw `resource_votes` rows leaked student voting decisions to peers. Proposers could vote on own proposals. Votes could be mutated. | RLS policy restricts `SELECT` to `voter_id = auth.uid()`. Backend API strips individual votes and exposes aggregate counts. Implemented `trg_resource_vote_immutability` trigger and `UNIQUE(proposal_id, voter_id)` constraint. Blocked self-voting on INSERT and UPDATE. | P4-ENG-15 through P4-ENG-22 (8 database engine tests passed); P4-MIG-10, P4-MIG-11, P4-BCK-05, P4-BCK-07 passed. |
| **3. Proposal Submission & Moderation** | Proposers could submit to buckets outside their department/batch, and ordinary students could self-approve proposals to `status = 'APPROVED'`. | Validated proposer matches target shared bucket academic scope on `INSERT`. Implemented `trg_resource_proposal_immutability` trigger blocking mutations to `proposer_id`, `bucket_id`, `department`, `batch`, and raising an exception on student self-approval to `APPROVED`. | P4-ENG-23 through P4-ENG-27 (5 database engine tests passed); P4-MIG-08, P4-MIG-09, P4-BCK-06 passed. |
| **4. Resource Parent Ownership** | Resources could potentially be orphaned or inserted into other students' buckets without parent ownership check. | Implemented dual-key validation on `resources` across all operations (`owner_id = auth.uid()` AND `EXISTS (SELECT 1 FROM resource_buckets b WHERE b.id = resources.bucket_id AND b.owner_id = resources.owner_id)`). Added defensive cleanup query in migration. | P4-ENG-28 through P4-ENG-30 (3 database engine tests passed); P4-MIG-02, P4-MIG-05, P4-BCK-03 passed. |
| **5. Audit Policies & Grants** | Permissive legacy policies and default `anon` permissions exposed table operations. | Dropped all legacy/permissive policies across all 6 tables. Revoked `ALL` from `anon` and `PUBLIC`. Granted least-privilege permissions to `authenticated`. | P4-MIG-03, P4-MIG-04, P4-MIG-12 passed; P4-ROL-01 through P4-ROL-04 passed. |

---

## 3. Remote Production Deployment Backlog

All migrations and rollback scripts authored across Phases 1, 2, 3, and 4 are staged in `migrations/` and have passed comprehensive static analysis and authentic relational SQL engine test suites. However, **they have NOT yet been applied to the live InsForge production database** (`https://c35py4a8.us-east.insforge.app`), awaiting explicit user authorization.

### Staged Migration Queue:
1. `migrations/20261114224000_phase1_security_remediation.sql` (Phase 1 — Auth & Student Records)
2. `migrations/20261115_phase2_profiles_matching_security.sql` (Phase 2 — Profiles & Doubt Matching)
3. `migrations/20261115_phase3_sessions_chat_planner_security.sql` (Phase 3 — Sessions, Chat & Planner)
4. `migrations/20261115_phase4_security_remediation.sql` (Phase 4 — Resources & Community Proposals)

### Staged Rollback Queue:
1. `migrations/20261114224000_phase1_security_remediation_rollback.sql` (Phase 1)
2. `migrations/20261115_phase2_profiles_matching_security_rollback.sql` (Phase 2)
3. `migrations/20261115_phase3_sessions_chat_planner_security_rollback.sql` (Phase 3)
4. `migrations/20261115_phase4_security_remediation_rollback.sql` / `migrations/rollback_phase4_security_remediation.sql` (Phase 4)

---

## 4. Performance & Database Hygiene Findings (Out of Security Scope)

The initial InsForge Advisor report identified 35 performance-related database findings. These were excluded from the security remediation phases to ensure focus on critical access-control vulnerabilities:

### A. 22 Missing Foreign Key Indexes
Columns referencing foreign tables without indexing cause Postgres to perform full table scans during cascading operations and joins. High priority indexes needed:
- `public.resource_buckets(owner_id)`
- `public.resources(bucket_id)`
- `public.resources(owner_id)`
- `public.shared_resources(bucket_id)`
- `public.shared_resources(created_by)`
- `public.resource_proposals(bucket_id)`
- `public.resource_proposals(proposer_id)`
- `public.resource_votes(proposal_id)`
- `public.resource_votes(voter_id)`
- `public.sessions(doubt_id)`
- `public.sessions(student_id)`
- `public.sessions(tutor_id)`
- `public.sessions(replacement_tutor_id)`
- `public.session_messages(session_id)`
- `public.session_messages(sender_id)`
- `public.session_ratings(session_id)`
- `public.session_ratings(tutor_id)`
- `public.notifications(user_id)`
- `public.task_subtasks(task_id)`
- `public.suggestion_requests(task_id)`
- `public.suggestion_responses(request_id)`
- `public.doubts(student_id)`

### B. 13 Unused Indexes
Indexes identified by Postgres statistics that have never been used in query execution scans, creating unnecessary write amplification during inserts and updates:
- Unused duplicate index on `academic_records`
- Unused indexes on `students` legacy lookup columns
- Redundant composite indexes on `doubt_tags`

---

## 5. Next Recommended Steps

1. **User Approval for Remote Migration Apply:** Authorize the execution of staged migrations 1 through 4 against `https://c35py4a8.us-east.insforge.app`.
2. **Post-Deployment Verification:** Run all 4 test suites against the live remote instance to verify all remote penetration probes transition from `BLOCKED / NOT APPLIED` to `PASS`.
3. **Performance Optimization Migration:** Implement foreign key indexes and drop unused indexes in a separate performance migration pass.
