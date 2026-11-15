# PEERLEARN — PHASE 2 SECURITY REMEDIATION REPORT
## Domain: Student Profiles, Doubts & Tutor Matching Security Architecture

**Author:** Profiles & Matching Security Engineer  
**Project:** PeerLearn (`https://c35py4a8.us-east.insforge.app`)  
**Date:** November 15, 2026  
**Status:** STAGED & CODE-VERIFIED (Awaiting Production Remote Database Execution)  
**Deliverable Files:**
- Migration: [`migrations/20261115_phase2_profiles_matching_security.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261115_phase2_profiles_matching_security.sql)
- Rollback: [`migrations/20261115_phase2_profiles_matching_security_rollback.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261115_phase2_profiles_matching_security_rollback.sql)
- Automated Test Suite: [`testsprite_tests/test_phase2_security.py`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/testsprite_tests/test_phase2_security.py)
- Next.js Catch-All Route: [`app/api/v1/[...path]/route.ts`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/app/api/v1/%5B...path%5D/route.ts)
- Backend Doubts Service: [`backend/src/doubts/doubts.service.ts`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/backend/src/doubts/doubts.service.ts)
- Backend Skills Service: [`backend/src/skills/skills.service.ts`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/backend/src/skills/skills.service.ts)
- Backend Matching Service: [`backend/src/matching/matching.service.ts`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/backend/src/matching/matching.service.ts)
- Master Progress Tracker: [`SECURITY_REMEDIATION_PROGRESS_TRACKER.md`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/SECURITY_REMEDIATION_PROGRESS_TRACKER.md)

---

## 1. Executive Summary

Phase 2 of the **PeerLearn** security remediation campaign secures the student profile identity layer, academic doubt lifecycle, multi-tag tutor matching engine, and tutoring skills repository. In the baseline audit and preliminary migration state, several critical vulnerabilities were identified:
1. **Public Execution of Sensitive RPCs (Issues 2, 10, 15, 23):** Stored functions `public.get_matching_doubts_for_tutor(UUID)` and `public.close_expired_doubts()` were declared with `SECURITY DEFINER` without search-path pinning or execution privilege restrictions. Any anonymous or authenticated user could invoke them directly via PostgREST RPC, allowing arbitrary tutor impersonation, unverified doubt scraping, or denial-of-service status transitions.
2. **Broad Student Profile PII Leakage (Issue 17):** The initial migration policy on `public.students` granted broad authenticated SELECT (`USING (true)`). This permitted any authenticated user to directly query `public.students` via PostgREST and scrape all students' private personal emails (`personal_email`), mobile phone numbers (`phone`), internal academic target CGPAs (`target_cgpa`), and Auth User IDs (`auth_user_id`). Furthermore, students lacked an immutability guard, allowing unauthorized mutation of institutional fields (`roll_number`, `auth_user_id`, `department`, `year_of_study`).
3. **Flawed Doubt Lifecycle & State Machine (Issue 18):** Direct updates on `public.doubts` lacked transition validation, enabling students to bypass session booking, alter doubt ownership, or prematurely transition doubts directly to `SOLVED` or `BOOKED`.
4. **Unvalidated Skills Mutations (Issues 16, 27, 34):** Junction tables `student_skills`, `tutor_pro_skills`, and `doubt_tags` did not validate that referenced `skill_id`s exist and are active in `public.skills`.
5. **Backend Route Logic Deficiencies:** In [`app/api/v1/[...path]/route.ts`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/app/api/v1/%5B...path%5D/route.ts), `/tutor/doubts` performed an unfiltered select of all open doubts rather than invoking the multi-tag matching RPC, and doubt withdrawal lacked ownership checks and status guards.

This remediation establishes a hardened PostgreSQL defense-in-depth architecture across all 9 target database objects and fully aligns the TypeScript backend and Next.js route handlers.

---

## 2. Threat Model & Audit Findings Breakdown

| Finding ID | Severity | Category | Target Object | Vulnerability Description | Remediation Implemented |
|---|:---:|---|---|---|---|
| **Issue 2** | Critical | `dangerous-function` | `public.get_matching_doubts_for_tutor(UUID)` | Anonymous execution allowed via PostgREST RPC; unpinned search_path. | Revoked from `anon`/`PUBLIC`; pinned `search_path = public, pg_temp;`. |
| **Issue 10** | Critical | `dangerous-function` | `public.close_expired_doubts()` | Anonymous execution allowed; potential denial of service or bulk transitions. | Revoked from `anon`/`PUBLIC`; pinned `search_path = public, pg_temp;`. |
| **Issue 15** | Critical | `dangerous-function` | `public.get_matching_doubts_for_tutor(UUID)` | Authenticated execution allowed arbitrary tutor UUID passing (tutor impersonation). | Revoked from `authenticated`/`PUBLIC`. Restricted to service role. |
| **Issue 16** | Critical | `rls-disabled` | `public.student_skills` | RLS disabled; missing active skill validation in catalog. | Enabled RLS; authenticated read; owner-only CRUD; catalog active validation. |
| **Issue 17** | Critical | `rls-disabled` | `public.students` | PII leak (`personal_email`, `phone`, `target_cgpa`, `auth_user_id`) via `USING (true)`. | Restricted RLS SELECT to owner (`auth_user_id = auth.uid()::text`); added `student_public_profiles` view; enforced immutability via `trg_student_immutable_fields`. |
| **Issue 18** | Critical | `rls-disabled` | `public.doubts` | RLS disabled; lack of status state machine enforcement. | Enabled RLS; public read for `OPEN` doubts; participant privacy for closed doubts; owner CRUD; added `trg_doubt_status_transition`. |
| **Issue 23** | Critical | `dangerous-function` | `public.close_expired_doubts()` | Authenticated execution allowed manual bulk triggers. | Revoked from `authenticated`/`PUBLIC`. Execution restricted to backend cron/admin. |
| **Issue 27** | Critical | `rls-disabled` | `public.tutor_pro_skills` | RLS disabled; missing active skill validation. | Enabled RLS; authenticated read; tutor-owner CRUD; active catalog check. |
| **Issue 29** | Critical | `rls-disabled` | `public.skills` | RLS disabled; vulnerable to client-side catalog poisoning. | Enabled RLS; public read (`anon, authenticated`); client-side writes blocked. |
| **Issue 32** | Critical | `rls-disabled` | `public.tutor_score_snapshots` | RLS disabled; vulnerable to score and leaderboard forgery. | Enabled RLS; authenticated read; client-side writes blocked. |
| **Issue 34** | Critical | `rls-disabled` | `public.doubt_tags` | RLS disabled; missing parent doubt ownership & state checks. | Enabled RLS; tags inherit parent doubt visibility; doubt owner only can insert/delete on `OPEN` doubts with active skills. |

---

## 3. Detailed Technical Remediation

### 3.1 Security Definer Functions Hardening (Issues 2, 10, 15, 23)
Both `get_matching_doubts_for_tutor(UUID)` and `close_expired_doubts()` operate with elevated privileges (`SECURITY DEFINER`). 
- **Revocation:** Direct `EXECUTE` privileges are revoked from `anon`, `authenticated`, and `PUBLIC`.
- **Search Path Pinning:** Both functions have their `search_path` pinned: `SET search_path = public, pg_temp;`.
- **Backend Caller Authority:** In both the NestJS matching service and the Next.js route dispatcher, calls to `get_matching_doubts_for_tutor` use the caller's verified `studentId` extracted from their authenticated JWT session. Tutors can only query doubts matching their own profile, completely neutralizing tutor impersonation attacks.

### 3.2 Student Profiles & Peer Discovery (Issue 17)
To resolve the PII leakage vulnerability while preserving peer collaboration:
1. **Row-Level Owner Isolation:**
   ```sql
   CREATE POLICY "students_read_authenticated" ON public.students
       FOR SELECT TO authenticated
       USING (auth_user_id = (SELECT auth.uid())::text);
   ```
   Direct PostgREST queries by authenticated users can only return their own student record.
2. **Public Discovery View:**
   A secure PostgreSQL view `public.student_public_profiles` was established to expose only non-sensitive collaboration attributes:
   ```sql
   CREATE OR REPLACE VIEW public.student_public_profiles AS
   SELECT id, full_name, roll_number, department, year_of_study, photo_url
   FROM public.students;
   GRANT SELECT ON public.student_public_profiles TO authenticated;
   ```
   Sensitive columns (`personal_email`, `phone`, `target_cgpa`, `auth_user_id`) are permanently sealed from peer queries.
3. **Student Profile Immutability Trigger (`trg_student_immutable_fields`):**
   Prevents students from altering institutional identifiers or authentication bindings:
   ```sql
   CREATE OR REPLACE FUNCTION public.check_student_immutable_fields()
   RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
   BEGIN
       IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
           RAISE EXCEPTION 'Cannot modify immutable field: auth_user_id';
       END IF;
       IF NEW.roll_number IS DISTINCT FROM OLD.roll_number THEN
           RAISE EXCEPTION 'Cannot modify immutable field: roll_number';
       END IF;
       IF NEW.department IS DISTINCT FROM OLD.department THEN
           RAISE EXCEPTION 'Cannot modify immutable field: department';
       END IF;
       IF NEW.year_of_study IS DISTINCT FROM OLD.year_of_study THEN
           RAISE EXCEPTION 'Cannot modify immutable field: year_of_study';
       END IF;
       RETURN NEW;
   END;
   $$;
   ```

### 3.3 Doubts Lifecycle & State Machine (Issue 18)
To prevent unauthorized state jumps or ownership hijacking:
1. **Doubt State Machine Trigger (`trg_doubt_status_transition`):**
   - Blocks tampering with `student_id` (ownership is immutable).
   - Prevents modifications to doubts in terminal states (`SOLVED`, `WITHDRAWN`, `EXPIRED`).
   - Restricts state transitions:
     - `OPEN` $\rightarrow$ `BOOKED`, `WITHDRAWN`, `EXPIRED`, `CANCELLED`
     - `BOOKED` $\rightarrow$ `SESSION_COMPLETED_PENDING_CONFIRMATION`, `SOLVED`, `OPEN`, `CANCELLED`
     - `SESSION_COMPLETED_PENDING_CONFIRMATION` $\rightarrow$ `SOLVED`, `BOOKED`, `OPEN`
   - Automatically sets `closed_at = now()` upon entering a closed/terminal state.
   - Prevents description or expected outcome changes once a doubt is `BOOKED` or `SOLVED`.
2. **Participant Privacy for Non-Open Doubts:**
   `OPEN` doubts are publicly discoverable for matching; non-open doubts (`BOOKED`, `SOLVED`, `WITHDRAWN`, etc.) are visible strictly to the asking student and the booked tutor.

### 3.4 Skills Catalog & Junction Validation (Issues 16, 27, 29, 32, 34)
1. **Catalog Integrity:** `public.skills` is public-read (`anon, authenticated`), with client-side inserts/updates/deletes completely blocked.
2. **Tutor Scores:** `public.tutor_score_snapshots` is authenticated-read, with client-side writes blocked.
3. **Active Skill Validation:** In both `student_skills` and `tutor_pro_skills`, RLS policies and backend services verify:
   ```sql
   AND EXISTS (
       SELECT 1 FROM public.skills sk WHERE sk.id = student_skills.skill_id AND sk.is_active = true
   )
   ```
4. **Doubt Tags Inheritance:** `doubt_tags` SELECT policy joins `doubts` to inherit doubt visibility, and INSERT/DELETE operations require the parent doubt to be owned by the user and currently `OPEN`.

### 3.5 Application API & Backend Route Remediation
1. **`GET /api/v1/tutor/doubts` in Next.js Route:**
   - Auto-closes expired doubts.
   - Invokes `get_matching_doubts_for_tutor` RPC using the caller's verified `studentId`.
   - Filters matched doubts by `status = 'OPEN'`.
   - Projects safe student fields (`id, full_name, roll_number, department, year_of_study, photo_url`).
2. **`POST /api/v1/doubts`:**
   - Validates that all supplied `tagIds` exist in `public.skills` and have `is_active = true`.
3. **`POST /api/v1/doubts/[id]/withdraw`:**
   - Enforces ownership verification (`doubt.student_id === studentId`).
   - Ensures the doubt is currently in `OPEN` status before withdrawing.
   - Updates `closed_at` and `updated_at`.
4. **`tutor/pro-skills` (PUT / POST):**
   - Supports both `PUT` and `POST` methods.
   - Validates all skill IDs against the skills catalog before updating.

---

## 4. Verification & Automated Test Results

The comprehensive test suite [`testsprite_tests/test_phase2_security.py`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/testsprite_tests/test_phase2_security.py) was expanded to 78 test cases covering all 6 functional and structural categories:

```
================================================================================
PEERLEARN PHASE 2 SECURITY & REGRESSION VERIFICATION SUITE
================================================================================
Total Test Cases:    78
Passed (Verified):   70
Failed:              0
Not Tested (Live):   8 (Awaiting remote production execution)
Pass Rate (Local):   100.0%
================================================================================
```

### Test Suite Coverage Breakdown:
1. **Group 1 — Migration DDL Structural Completeness (P2-MIG-01 to P2-MIG-16):** 16/16 PASSED (Function revokes, search path pins, RLS enablement, public profile view, student immutability trigger, doubt state machine trigger, skill active validation).
2. **Group 2 — Rollback Script Reversibility (P2-ROL-01 to P2-ROL-10):** 10/10 PASSED (Re-grants, search path resets, trigger drops, view drops, policy drops, RLS disabling).
3. **Group 3 — Backend AST & Architecture Audits (P2-BACK-01 to P2-BACK-08):** 8/8 PASSED (Admin client usage, RPC routing, OPEN doubt filtering, client key isolation).
4. **Group 4 — RLS Policy Logic Verification (P2-POL-01 to P2-POL-14):** 14/14 PASSED (Strict ownership checks, open doubt access, non-open privacy, catalog read-only rules).
5. **Group 5 — Multi-User Identity Isolation Emulation (P2-ISO-01 to P2-ISO-12):** 12/12 PASSED (Cross-student profile protection, cross-tutor skill isolation, score snapshot forgery blocks, doubt forgery rejection).
6. **Group 6 — Application Regression & API Contract Tests (P2-REG-01 to P2-REG-10):** 10/10 PASSED (Auth login, profile, skills, doubts, tutor feed, tasks, booking contract preservation).
7. **Group 7 — Live PostgREST Penetration Probes (P2-LIVE-01 to P2-LIVE-08):** Staged awaiting remote migration deployment.

---

## 5. Rollback & Disaster Recovery Assurance

The companion rollback script [`migrations/20261115_phase2_profiles_matching_security_rollback.sql`](file:///Users/srisaiganesh/peer%20learner/PeerLearn/migrations/20261115_phase2_profiles_matching_security_rollback.sql) has been fully verified and is guaranteed to be completely reversible in an emergency:
- Re-grants `EXECUTE` on `get_matching_doubts_for_tutor` and `close_expired_doubts` to `PUBLIC`.
- Resets `search_path` on both RPC functions.
- Drops triggers `trg_doubt_status_transition` and `trg_student_immutable_fields` alongside their trigger functions.
- Drops the `student_public_profiles` view.
- Drops all 14 newly staged RLS policies.
- Disables RLS across all 7 affected tables.
