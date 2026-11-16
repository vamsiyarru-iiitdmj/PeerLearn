# PEERLEARN — REMAINING SECURITY & ARCHITECTURAL ISSUES

**Date:** November 15, 2026  
**Audited Against:** InsForge Backend Security Advisor Initial Report  
**Remediation Progress:** 28 of 34 Critical Security Issues Staged (82.4% Complete)  

---

## 1. Overall Status Overview

| Phase | Domain | Issues Targeted | Status | Automated Test Suite | Local Pass Rate |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Phase 1** | Auth, Core Identity & Student Data | 7 | STAGED | `test_phase1_security.py` | 100% |
| **Phase 2** | Profiles & Doubt Matching | 11 | STAGED | `test_phase2_security.py` | 100% |
| **Phase 3** | Sessions, Live Chat & Study Planner | 10 | STAGED | `test_phase3_security.py` | 100% |
| **Phase 4** | Study Materials & Resource Collaboration | 6 | PENDING | Not Started | — |
| **Non-Security** | Database Index Performance & Hygiene | 35 | OUT OF SCOPE | — | — |

---

## 2. Remaining Critical Security Issues (Phase 4 Scope)

The final 6 critical security issues from the InsForge Backend Advisor belong to the **Study Materials & Resource Collaboration** domain. In the current database state, Row Level Security is disabled on these tables, allowing anonymous and untrusted users to read, modify, or delete shared academic resources and manipulate vote tallies.

| Issue ID | Severity | Target Table | Vulnerability Description | Required Remediation in Phase 4 |
| :--- | :--- | :--- | :--- | :--- |
| **Issue 4** | Critical | `public.resource_proposals` | RLS Disabled | Enable RLS; allow community discovery of proposed resources; restrict edits to the submitting student; restrict approval actions to moderators. |
| **Issue 8** | Critical | `public.resource_buckets` | RLS Disabled | Enable RLS; allow authenticated discovery of subject resource folders; restrict creation/deletion to authorized owners or departmental leads. |
| **Issue 12** | Critical | `public.shared_resource_buckets` | RLS Disabled | Enable RLS; enforce collaborative access permissions between authorized peer groups. |
| **Issue 13** | Critical | `public.resources` | RLS Disabled | Enable RLS; allow public read of approved academic materials; restrict uploads and deletes strictly to the uploader student ID. |
| **Issue 20** | Critical | `public.shared_resources` | RLS Disabled | Enable RLS; ensure resources shared between specific study peers are accessible only to authorized participants. |
| **Issue 24** | Critical | `public.resource_votes` | RLS Disabled | Enable RLS; enforce one vote per user per resource; restrict vote insertion and deletion strictly to `student_id = auth.uid()`. |

---

## 3. Remote Production Deployment Backlog

All migrations and rollback scripts authored across Phases 1, 2, and 3 are staged in `migrations/` and have passed comprehensive static analysis and local emulation test suites. However, **they have NOT yet been applied to the live InsForge production database** (`https://c35py4a8.us-east.insforge.app`), awaiting explicit user authorization.

### Staged Migration Queue:
1. `migrations/20261114224000_phase1_security_remediation.sql` (Phase 1)
2. `migrations/20261115_phase2_profiles_matching_security.sql` (Phase 2)
3. `migrations/20261115_phase3_sessions_chat_planner_security.sql` (Phase 3)

### Staged Rollback Queue:
1. `migrations/20261114224000_phase1_security_remediation_rollback.sql` (Phase 1)
2. `migrations/20261115_phase2_profiles_matching_security_rollback.sql` (Phase 2)
3. `migrations/20261115_phase3_sessions_chat_planner_security_rollback.sql` (Phase 3)

---

## 4. Performance & Database Hygiene Findings (Out of Security Scope)

The initial InsForge Advisor report identified 35 performance-related database findings. These were excluded from the security remediation phases to ensure focus on critical access-control vulnerabilities:

### A. 22 Missing Foreign Key Indexes
Columns referencing foreign tables without indexing cause Postgres to perform full table scans during cascading operations and joins. High priority indexes needed:
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
- `public.doubts(booked_tutor_id)`
- `public.doubt_tags(doubt_id)`
- `public.doubt_tags(skill_id)`
- `public.resources(bucket_id)`
- `public.resources(student_id)`
- `public.resource_votes(resource_id)`
- `public.resource_votes(student_id)`

### B. 13 Unused Indexes
Indexes identified by Postgres statistics that have never been used in query execution scans, creating unnecessary write amplification during inserts and updates:
- Unused duplicate index on `academic_records`
- Unused indexes on `students` legacy lookup columns
- Redundant composite indexes on `doubt_tags`

---

## 5. Next Recommended Steps

1. **Phase 4 Execution:** Author `migrations/20261115_phase4_resources_security.sql` and corresponding test suite to remediate the final 6 critical security findings (Issues 4, 8, 12, 13, 20, 24).
2. **Production Deployment Window:** Schedule a deployment window to execute Phase 1, Phase 2, Phase 3, and Phase 4 migrations in sequence against `https://c35py4a8.us-east.insforge.app`.
3. **Post-Deployment Verification:** Run all test suites against the live environment to ensure all penetration probes pass with 100% remote compliance.
4. **Performance Phase:** Author a standalone performance migration adding the 22 missing foreign key indexes and safely pruning unused indexes.
