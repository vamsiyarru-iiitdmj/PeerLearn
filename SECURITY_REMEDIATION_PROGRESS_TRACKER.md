# PeerLearn — InsForge Advisor Security & Performance Remediation Progress Tracker

> **Last Updated**: November 2026 (Phase 3 Sessions, Chat & Planner Security Remediation Complete)  
> **Target System**: PostgreSQL / InsForge BaaS (`PeerLearn` — `https://c35py4a8.us-east.insforge.app`)  
> **Master File**: `SECURITY_REMEDIATION_PROGRESS_TRACKER.md`  

---

## 1. Overall Remediation Progress Dashboard

```
LOCAL STAGING PROGRESS:       [█████████████████████─────] 82.4% (28 of 34 Security Findings Code-Verified)
REMOTE PRODUCTION APPLIED:    [──────────────────────────]  0.0% (Awaiting User Production Apply Approval)
TOTAL AUDIT FINDINGS:         [███████████───────────────] 40.6% (28 of 69 Total Findings Staged)
```

| Domain | Total Flagged | Phase 1 Staged | Phase 2 Staged | Phase 3 Staged | Remote Production Applied | Phase 4 (Planned) | Unresolved Security |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Critical Security (Functions)** | 10 | **4** | **4** | **2** | 0 | 0 | **0 remaining** (100% staged) |
| **Critical Security (RLS)** | 24 | **3** | **7** | **8** | 0 | 6 | 6 remaining (75% staged) |
| **Performance (Missing FK Indexes)** | 22 | 0 | 0 | 0 | 0 | 0 | 22 remaining |
| **Performance (Unused Indexes)** | 13 | 0 | 0 | 0 | 0 | 0 | 13 remaining |
| **TOTAL** | **69** | **7** | **11** | **10** | **0** | **6** | **41 remaining** |

> **Audit & Deployment Status Notice**:  
> - **Code Staging**: 28 of 34 critical security issues are **100% resolved and verified** across staged migration files, rollback scripts, automated test suites, and backend service code.
> - **Production Deployment**: Live PostgREST probes on `https://c35py4a8.us-east.insforge.app` confirm that the remote database is currently operating on the unhardened schema. The migrations have **NOT YET BEEN APPLIED TO THE REMOTE DATABASE** pending explicit user approval.

---

## 2. Phase 1 Solved & Remediated Errors (7 Issues)

Authored in [`migrations/20261114224000_phase1_security_remediation.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261114224000_phase1_security_remediation.sql).

| Issue # | Category | Rule ID | Affected Database Object | Remediation Applied | Local Staged Status | Remote Production Status |
|:---:|---|---|---|---|:---:|:---:|
| **1** | Critical Security | `dangerous-function` | `public.confirm_auth_user(text, text)` | Revoked `EXECUTE` from `anon`/`PUBLIC`; pinned `search_path = public, pg_temp;`. | 🟢 **STAGED (PHASE 1)** | 🟡 Unapplied on Remote |
| **6** | Critical Security | `dangerous-function` | `public.confirm_auth_user(text, text)` | Revoked `EXECUTE` from `authenticated`/`PUBLIC`. Preserved service-role execution. | 🟢 **STAGED (PHASE 1)** | 🟡 Unapplied on Remote |
| **12** | Critical Security | `rls-disabled` | `public.academic_records` | `ENABLE ROW LEVEL SECURITY;`. Restricted to backend service-role (`adminClient`). | 🟢 **STAGED (PHASE 1)** | 🔴 **Vulnerable on Remote** (12 rows leaked) |
| **13** | Critical Security | `rls-disabled` | `public.pending_registrations` | `ENABLE ROW LEVEL SECURITY;`. Sealed registration records and OTPs from PostgREST. | 🟢 **STAGED (PHASE 1)** | 🔴 **Vulnerable on Remote** (5 rows leaked) |
| **28** | Critical Security | `rls-disabled` | `public.academic_imports` | `ENABLE ROW LEVEL SECURITY;`. Sealed administrative import logs from PostgREST. | 🟢 **STAGED (PHASE 1)** | 🟢 0 rows leaked (empty) |
| **31** | Critical Security | `dangerous-function` | `public.confirm_auth_user(text)` | Revoked `EXECUTE` from `authenticated`/`PUBLIC` on legacy single-arg overload. | 🟢 **STAGED (PHASE 1)** | 🟡 Unapplied on Remote |
| **33** | Critical Security | `dangerous-function` | `public.confirm_auth_user(text)` | Revoked `EXECUTE` from `anon`/`PUBLIC` on legacy single-arg overload. | 🟢 **STAGED (PHASE 1)** | 🟡 Unapplied on Remote |

---

## 3. Phase 2 Solved & Remediated Errors (11 Issues)

Authored in [`migrations/20261115_phase2_profiles_matching_security.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261115_phase2_profiles_matching_security.sql).

| Issue # | Category | Rule ID | Affected Database Object | Remediation Applied | Local Staged Status | Remote Production Status |
|:---:|---|---|---|---|:---:|:---:|
| **2** | Critical Security | `dangerous-function` | `public.get_matching_doubts_for_tutor(uuid)` | Revoked `EXECUTE` from `anon`/`PUBLIC`; pinned `search_path = public, pg_temp;`. | 🟢 **STAGED (PHASE 2)** | 🔴 **Vulnerable on Remote** (Anon executed) |
| **10** | Critical Security | `dangerous-function` | `public.close_expired_doubts()` | Revoked `EXECUTE` from `anon`/`PUBLIC`; pinned `search_path = public, pg_temp;`. | 🟢 **STAGED (PHASE 2)** | 🔴 **Vulnerable on Remote** (Anon executed) |
| **15** | Critical Security | `dangerous-function` | `public.get_matching_doubts_for_tutor(uuid)` | Revoked `EXECUTE` from `authenticated`/`PUBLIC`. Preserved backend service-role invocation. | 🟢 **STAGED (PHASE 2)** | 🔴 **Vulnerable on Remote** |
| **16** | Critical Security | `rls-disabled` | `public.student_skills` | `ENABLE RLS;` Added authenticated read and student-owner insert/update/delete policies. | 🟢 **STAGED (PHASE 2)** | 🟡 Unapplied on Remote |
| **17** | Critical Security | `rls-disabled` | `public.students` | `ENABLE RLS;` Added authenticated read and self-update policy (`auth_user_id = auth.uid()::text`). | 🟢 **STAGED (PHASE 2)** | 🔴 **Vulnerable on Remote** (2 rows leaked) |
| **18** | Critical Security | `rls-disabled` | `public.doubts` | `ENABLE RLS;` Added open-read policy (`status = 'OPEN'`) and student owner insert/update/delete. | 🟢 **STAGED (PHASE 2)** | 🔴 **Vulnerable on Remote** (51 rows leaked) |
| **23** | Critical Security | `dangerous-function` | `public.close_expired_doubts()` | Revoked `EXECUTE` from `authenticated`/`PUBLIC`. Preserved scheduled/backend execution. | 🟢 **STAGED (PHASE 2)** | 🔴 **Vulnerable on Remote** |
| **27** | Critical Security | `rls-disabled` | `public.tutor_pro_skills` | `ENABLE RLS;` Added authenticated read and tutor-managed pro skill policies. | 🟢 **STAGED (PHASE 2)** | 🟡 Unapplied on Remote |
| **29** | Critical Security | `rls-disabled` | `public.skills` | `ENABLE RLS;` Added public reference read policy (`anon, authenticated`). Writes locked to admin. | 🟢 **STAGED (PHASE 2)** | 🟢 295 items readable (public catalog) |
| **32** | Critical Security | `rls-disabled` | `public.tutor_score_snapshots` | `ENABLE RLS;` Added authenticated read policy for leaderboard; client writes strictly blocked. | 🟢 **STAGED (PHASE 2)** | 🟢 0 rows leaked (empty) |
| **34** | Critical Security | `rls-disabled` | `public.doubt_tags` | `ENABLE RLS;` Added parent doubt visibility join policy and doubt-owner insert/delete policies. | 🟢 **STAGED (PHASE 2)** | 🟡 Unapplied on Remote |

---

## 4. Phase 3 Solved & Remediated Errors (10 Issues)

Authored in [`migrations/20261115_phase3_sessions_chat_planner_security.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261115_phase3_sessions_chat_planner_security.sql).

| Issue # | Category | Rule ID | Affected Database Object | Remediation Applied | Local Staged Status | Remote Production Status |
|:---:|---|---|---|---|:---:|:---:|
| **3** | Critical Security | `rls-disabled` | `public.task_subtasks` | `ENABLE RLS;` Implemented parent task ownership link policies for select/insert/update/delete. | 🟢 **STAGED (PHASE 3)** | 🟡 Unapplied on Remote |
| **5** | Critical Security | `dangerous-function` | `public.book_doubt_atomic(...)` | Revoked `EXECUTE` from `authenticated`/`PUBLIC`; pinned `search_path = public, pg_temp;`. | 🟢 **STAGED (PHASE 3)** | 🔴 **Vulnerable on Remote** |
| **7** | Critical Security | `rls-disabled` | `public.suggestion_requests` | `ENABLE RLS;` Permitted open request peer discovery; restricted writes strictly to task owner. | 🟢 **STAGED (PHASE 3)** | 🟡 Unapplied on Remote |
| **9** | Critical Security | `dangerous-function` | `public.book_doubt_atomic(...)` | Revoked `EXECUTE` from `anon`/`PUBLIC`; routed all bookings through backend service role. | 🟢 **STAGED (PHASE 3)** | 🔴 **Vulnerable on Remote** |
| **11** | Critical Security | `rls-disabled` | `public.notifications` | `ENABLE RLS;` Scoped inbox select/update/delete strictly to recipient `user_id = auth.uid()`. | 🟢 **STAGED (PHASE 3)** | 🔴 **Vulnerable on Remote** |
| **19** | Critical Security | `rls-disabled` | `public.sessions` | `ENABLE RLS;` Restricted access strictly to session student, assigned tutor, and replacement tutor. | 🟢 **STAGED (PHASE 3)** | 🔴 **Vulnerable on Remote** |
| **21** | Critical Security | `rls-disabled` | `public.session_messages` | `ENABLE RLS;` Enforced parent session participant membership for message reading and sending. | 🟢 **STAGED (PHASE 3)** | 🔴 **Vulnerable on Remote** |
| **22** | Critical Security | `rls-disabled` | `public.session_ratings` | `ENABLE RLS;` Preserved confidential feedback; concealed reviews from tutors until batch release. | 🟢 **STAGED (PHASE 3)** | 🔴 **Vulnerable on Remote** |
| **25** | Critical Security | `rls-disabled` | `public.suggestion_responses` | `ENABLE RLS;` Restricted responses to submitting tutor and requesting student. | 🟢 **STAGED (PHASE 3)** | 🟡 Unapplied on Remote |
| **26** | Critical Security | `rls-disabled` | `public.tasks` | `ENABLE RLS;` Scoped personal planner tasks strictly to creating student owner. | 🟢 **STAGED (PHASE 3)** | 🔴 **Vulnerable on Remote** |

---

## 5. Remaining Security Errors To Solve (Phase 4 Scope — 6 Issues)

| Issue # | Category | Rule ID | Affected Database Object | Scheduled Action | Target Phase |
|:---:|---|---|---|---|:---:|
| **4** | Critical Security | `rls-disabled` | `public.resource_proposals` | Enable RLS with community proposal policies | Phase 4 |
| **8** | Critical Security | `rls-disabled` | `public.resource_buckets` | Enable RLS with owner isolation | Phase 4 |
| **12** | Critical Security | `rls-disabled` | `public.shared_resource_buckets` | Enable RLS with batch/department authenticated read | Phase 4 |
| **13** | Critical Security | `rls-disabled` | `public.resources` | Enable RLS with owner isolation | Phase 4 |
| **20** | Critical Security | `rls-disabled` | `public.shared_resources` | Enable RLS with authenticated read | Phase 4 |
| **24** | Critical Security | `rls-disabled` | `public.resource_votes` | Enable RLS with voter isolation | Phase 4 |

---

## 6. Remaining Performance Findings (35 Issues)

### A. Missing Foreign Key Indexes (22 Warnings)
*To be indexed in a dedicated Performance Optimization pass:*
- Issues 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56.

### B. Unused Indexes (13 Info Notices)
*To be suppressed in InsForge Advisor as confirmed false positives:*
- Issues 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69.

---
*Living tracking ledger for PeerLearn security remediation.*

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
