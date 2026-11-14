# PeerLearn — InsForge Advisor Security & Performance Remediation Progress Tracker

> **Last Updated**: November 2026 (Phase 2 Remediation Complete)  
> **Target System**: PostgreSQL / InsForge BaaS (`PeerLearn`)  
> **Master File**: `SECURITY_REMEDIATION_PROGRESS_TRACKER.md`  

---

## 1. Overall Remediation Progress Dashboard

```
CRITICAL SECURITY PROGRESS:   [██████████████────────────] 52.9% (18 of 34 Target Findings)
TOTAL AUDIT FINDINGS:         [███████───────────────────] 26.1% (18 of 69 Total Findings)
```

| Domain | Total Flagged | Phase 1 Staged | Phase 2 Staged | Phase 3 (Planned) | Phase 4 (Planned) | Unresolved |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Critical Security (Functions)** | 10 | **4** | **4** | 2 | 0 | 2 remaining |
| **Critical Security (RLS)** | 24 | **3** | **7** | 8 | 6 | 14 remaining |
| **Performance (Missing FK Indexes)** | 22 | 0 | 0 | 0 | 0 | 22 remaining |
| **Performance (Unused Indexes)** | 13 | 0 | 0 | 0 | 0 | 13 remaining |
| **TOTAL** | **69** | **7** | **11** | **10** | **6** | **51 remaining** |

> **Audit Discrepancy Note Resolved**:  
> - The Phase 1 roadmap summarized Phase 2 as "10 findings" because table `doubt_tags` (Issue 34) was initially paired informally with `doubts` (Issue 18).
> - There are **11 distinct Advisor finding IDs** across **9 unique database objects** in Phase 2:
>   - 2 functions with 2 findings each (anon + authenticated): `get_matching_doubts_for_tutor` (Issues 2 & 15) and `close_expired_doubts` (Issues 10 & 23).
>   - 7 distinct tables: `students` (17), `skills` (29), `student_skills` (16), `tutor_pro_skills` (27), `tutor_score_snapshots` (32), `doubts` (18), and `doubt_tags` (34).
> - Phase 4 contains 6 remaining tables (`resource_buckets`, `resources`, `shared_resource_buckets`, `shared_resources`, `resource_proposals`, `resource_votes`), bringing the total critical security findings to exactly 34 (7 + 11 + 10 + 6 = 34).

---

## 2. Phase 1 Solved & Remediated Errors (7 Issues)

These 7 issues were authored and verified in [`migrations/20261114224000_phase1_security_remediation.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261114224000_phase1_security_remediation.sql).

| Issue # | Category | Rule ID | Affected Database Object | Remediation Applied | Status |
|:---:|---|---|---|---|:---:|
| **1** | Critical Security | `dangerous-function` | `public.confirm_auth_user(text, text)` | Revoked `EXECUTE` from `anon`/`PUBLIC`; pinned `search_path = public, pg_temp;`. | 🟢 **STAGED (PHASE 1)** |
| **6** | Critical Security | `dangerous-function` | `public.confirm_auth_user(text, text)` | Revoked `EXECUTE` from `authenticated`/`PUBLIC`. Preserved service-role execution. | 🟢 **STAGED (PHASE 1)** |
| **12** | Critical Security | `rls-disabled` | `public.academic_records` | `ENABLE ROW LEVEL SECURITY;`. Restricted to backend service-role (`adminClient`). | 🟢 **STAGED (PHASE 1)** |
| **13** | Critical Security | `rls-disabled` | `public.pending_registrations` | `ENABLE ROW LEVEL SECURITY;`. Sealed registration records and OTPs from PostgREST. | 🟢 **STAGED (PHASE 1)** |
| **28** | Critical Security | `rls-disabled` | `public.academic_imports` | `ENABLE ROW LEVEL SECURITY;`. Sealed administrative import logs from PostgREST. | 🟢 **STAGED (PHASE 1)** |
| **31** | Critical Security | `dangerous-function` | `public.confirm_auth_user(text)` | Revoked `EXECUTE` from `authenticated`/`PUBLIC` on legacy single-arg overload. | 🟢 **STAGED (PHASE 1)** |
| **33** | Critical Security | `dangerous-function` | `public.confirm_auth_user(text)` | Revoked `EXECUTE` from `anon`/`PUBLIC` on legacy single-arg overload. | 🟢 **STAGED (PHASE 1)** |

---

## 3. Phase 2 Solved & Remediated Errors (11 Issues)

These 11 issues were authored and verified in [`migrations/20261115_phase2_profiles_matching_security.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261115_phase2_profiles_matching_security.sql) and tested via [`testsprite_tests/test_phase2_security.py`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/testsprite_tests/test_phase2_security.py).

| Issue # | Category | Rule ID | Affected Database Object | Remediation Applied | Status |
|:---:|---|---|---|---|:---:|
| **2** | Critical Security | `dangerous-function` | `public.get_matching_doubts_for_tutor(uuid)` | Revoked `EXECUTE` from `anon`/`PUBLIC`; pinned `search_path = public, pg_temp;`. | 🟢 **STAGED (PHASE 2)** |
| **10** | Critical Security | `dangerous-function` | `public.close_expired_doubts()` | Revoked `EXECUTE` from `anon`/`PUBLIC`; pinned `search_path = public, pg_temp;`. | 🟢 **STAGED (PHASE 2)** |
| **15** | Critical Security | `dangerous-function` | `public.get_matching_doubts_for_tutor(uuid)` | Revoked `EXECUTE` from `authenticated`/`PUBLIC`. Preserved backend service-role invocation. | 🟢 **STAGED (PHASE 2)** |
| **16** | Critical Security | `rls-disabled` | `public.student_skills` | `ENABLE RLS;` Added authenticated read and student-owner insert/update/delete policies. | 🟢 **STAGED (PHASE 2)** |
| **17** | Critical Security | `rls-disabled` | `public.students` | `ENABLE RLS;` Added authenticated read and self-update policy (`auth_user_id = auth.uid()::text`). | 🟢 **STAGED (PHASE 2)** |
| **18** | Critical Security | `rls-disabled` | `public.doubts` | `ENABLE RLS;` Added open-read policy (`status = 'OPEN'`) and student owner insert/update/delete. | 🟢 **STAGED (PHASE 2)** |
| **23** | Critical Security | `dangerous-function` | `public.close_expired_doubts()` | Revoked `EXECUTE` from `authenticated`/`PUBLIC`. Preserved scheduled/backend execution. | 🟢 **STAGED (PHASE 2)** |
| **27** | Critical Security | `rls-disabled` | `public.tutor_pro_skills` | `ENABLE RLS;` Added authenticated read and tutor-managed pro skill policies. | 🟢 **STAGED (PHASE 2)** |
| **29** | Critical Security | `rls-disabled` | `public.skills` | `ENABLE RLS;` Added public reference read policy (`anon, authenticated`). Writes locked to admin. | 🟢 **STAGED (PHASE 2)** |
| **32** | Critical Security | `rls-disabled` | `public.tutor_score_snapshots` | `ENABLE RLS;` Added authenticated read policy for leaderboard; client writes strictly blocked. | 🟢 **STAGED (PHASE 2)** |
| **34** | Critical Security | `rls-disabled` | `public.doubt_tags` | `ENABLE RLS;` Added parent doubt visibility join policy and doubt-owner insert/delete policies. | 🟢 **STAGED (PHASE 2)** |

---

## 4. Remaining Security Errors To Solve (16 Issues)

### A. Phase 3 Scope — Sessions, Live Chat & Study Planner (10 Issues)

| Issue # | Category | Rule ID | Affected Database Object | Scheduled Action | Target Phase |
|:---:|---|---|---|---|:---:|
| **3** | Critical Security | `rls-disabled` | `public.task_subtasks` | Enable RLS with task owner isolation | Phase 3 |
| **5** | Critical Security | `dangerous-function` | `public.book_doubt_atomic(...)` | Revoke `authenticated`/`PUBLIC`; pin `search_path` | Phase 3 |
| **7** | Critical Security | `rls-disabled` | `public.suggestion_requests` | Enable RLS with task owner policy | Phase 3 |
| **9** | Critical Security | `dangerous-function` | `public.book_doubt_atomic(...)` | Revoke `anon`/`PUBLIC`; pin `search_path` | Phase 3 |
| **11** | Critical Security | `rls-disabled` | `public.notifications` | Enable RLS with recipient `user_id` policy | Phase 3 |
| **19** | Critical Security | `rls-disabled` | `public.sessions` | Enable RLS with participant isolation (student/tutor) | Phase 3 |
| **21** | Critical Security | `rls-disabled` | `public.session_messages` | Enable RLS with session participant access | Phase 3 |
| **22** | Critical Security | `rls-disabled` | `public.session_ratings` | Enable RLS preserving rating privacy | Phase 3 |
| **25** | Critical Security | `rls-disabled` | `public.suggestion_responses` | Enable RLS with request participant policy | Phase 3 |
| **26** | Critical Security | `rls-disabled` | `public.tasks` | Enable RLS with student owner isolation | Phase 3 |

### B. Phase 4 Scope — Resource Library & Community Governance (6 Issues)

| Issue # | Category | Rule ID | Affected Database Object | Scheduled Action | Target Phase |
|:---:|---|---|---|---|:---:|
| **4** | Critical Security | `rls-disabled` | `public.resource_proposals` | Enable RLS with community proposal policies | Phase 4 |
| **8** | Critical Security | `rls-disabled` | `public.resource_buckets` | Enable RLS with owner isolation | Phase 4 |
| **14** | Critical Security | `rls-disabled` | `public.shared_resource_buckets` | Enable RLS with batch/department authenticated read | Phase 4 |
| **20** | Critical Security | `rls-disabled` | `public.resources` | Enable RLS with owner isolation | Phase 4 |
| **24** | Critical Security | `rls-disabled` | `public.shared_resources` | Enable RLS with authenticated read | Phase 4 |
| **30** | Critical Security | `rls-disabled` | `public.resource_votes` | Enable RLS with voter isolation | Phase 4 |

---

## 5. Remaining Performance Findings (35 Issues)

### A. Missing Foreign Key Indexes (22 Warnings)
*To be indexed in a dedicated Performance Optimization pass:*
- Issues 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56.

### B. Unused Indexes (13 Info Notices)
*To be suppressed in InsForge Advisor as confirmed false positives:*
- Issues 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69.

---
*Living tracking ledger for PeerLearn security remediation.*
