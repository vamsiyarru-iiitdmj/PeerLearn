# PeerLearn — InsForge Advisor Security & Performance Remediation Progress Tracker

> **Last Updated**: November 2026 (Phase 1 Remediation)  
> **Target System**: PostgreSQL / InsForge BaaS (`PeerLearn`)  
> **Master File**: `SECURITY_REMEDIATION_PROGRESS_TRACKER.md`  

---

## 1. Overall Remediation Progress Dashboard

```
CRITICAL SECURITY PROGRESS:   [█████──────────────────────] 20.6% (7 of 34 Target Findings)
TOTAL AUDIT FINDINGS:         [███────────────────────────] 10.1% (7 of 69 Total Findings)
```

| Domain | Total Flagged | Phase 1 Staged | Phase 2 (Planned) | Phase 3 (Planned) | Phase 4 (Planned) | Unresolved |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Critical Security (Functions)** | 10 | **4** | 4 | 2 | 0 | 6 remaining |
| **Critical Security (RLS)** | 24 | **3** | 6 | 8 | 7 | 21 remaining |
| **Performance (Missing FK Indexes)** | 22 | 0 | 0 | 0 | 0 | 22 remaining |
| **Performance (Unused Indexes)** | 13 | 0 | 0 | 0 | 0 | 13 remaining |
| **TOTAL** | **69** | **7** | **10** | **10** | **7** | **62 remaining** |

---

## 2. Phase 1 Solved & Remediated Errors (7 Issues)

These 7 issues have been fully authored and verified in [`migrations/20261114224000_phase1_security_remediation.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261114224000_phase1_security_remediation.sql).

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

## 3. Remaining Security Errors To Solve (27 Issues)

### A. Phase 2 Scope — Profiles & Doubt Matching Domain (10 Issues)

| Issue # | Category | Rule ID | Affected Database Object | Scheduled Action | Target Phase |
|:---:|---|---|---|---|:---:|
| **2** | Critical Security | `dangerous-function` | `public.get_matching_doubts_for_tutor(uuid)` | Revoke `anon`/`PUBLIC`; pin `search_path` | Phase 2 |
| **10** | Critical Security | `dangerous-function` | `public.close_expired_doubts()` | Revoke `anon`/`PUBLIC`; pin `search_path` | Phase 2 |
| **15** | Critical Security | `dangerous-function` | `public.get_matching_doubts_for_tutor(uuid)` | Revoke `authenticated`/`PUBLIC` | Phase 2 |
| **16** | Critical Security | `rls-disabled` | `public.student_skills` | Enable RLS with student owner update policy | Phase 2 |
| **17** | Critical Security | `rls-disabled` | `public.students` | Enable RLS with authenticated read & own-profile update | Phase 2 |
| **18** | Critical Security | `rls-disabled` | `public.doubts` | Enable RLS with open-doubt read & student insert/update | Phase 2 |
| **23** | Critical Security | `dangerous-function` | `public.close_expired_doubts()` | Revoke `authenticated`/`PUBLIC` | Phase 2 |
| **27** | Critical Security | `rls-disabled` | `public.tutor_pro_skills` | Enable RLS with tutor-managed policy | Phase 2 |
| **29** | Critical Security | `rls-disabled` | `public.skills` | Enable RLS with public read policy (`true`) | Phase 2 |
| **32** | Critical Security | `rls-disabled` | `public.tutor_score_snapshots` | Enable RLS with authenticated read policy | Phase 2 |
| **34** | Critical Security | `rls-disabled` | `public.doubt_tags` | Enable RLS with authenticated read policy | Phase 2 |

### B. Phase 3 Scope — Sessions, Live Chat & Study Planner (10 Issues)

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

### C. Phase 4 Scope — Resource Library & Community Governance (7 Issues)

| Issue # | Category | Rule ID | Affected Database Object | Scheduled Action | Target Phase |
|:---:|---|---|---|---|:---:|
| **4** | Critical Security | `rls-disabled` | `public.resource_proposals` | Enable RLS with community proposal policies | Phase 4 |
| **8** | Critical Security | `rls-disabled` | `public.resource_buckets` | Enable RLS with owner isolation | Phase 4 |
| **14** | Critical Security | `rls-disabled` | `public.shared_resource_buckets` | Enable RLS with batch/department authenticated read | Phase 4 |
| **20** | Critical Security | `rls-disabled` | `public.resources` | Enable RLS with owner isolation | Phase 4 |
| **24** | Critical Security | `rls-disabled` | `public.shared_resources` | Enable RLS with authenticated read | Phase 4 |
| **30** | Critical Security | `rls-disabled` | `public.resource_votes` | Enable RLS with voter isolation | Phase 4 |

---

## 4. Remaining Performance Findings (35 Issues)

### A. Missing Foreign Key Indexes (22 Warnings)
*To be indexed in a dedicated Performance Optimization pass:*
- Issues 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56.

### B. Unused Indexes (13 Info Notices)
*To be suppressed in InsForge Advisor as confirmed false positives:*
- Issues 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69.

---
*Living tracking ledger for PeerLearn security remediation.*
