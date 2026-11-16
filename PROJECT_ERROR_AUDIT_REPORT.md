# PROJECT ERROR AUDIT REPORT: PEERLEARN

**Date of Audit:** October 2026 / November 2026  
**Auditor Role:** Senior Software Engineer, QA Engineer & Lead Security/Code Auditor  
**Project Name:** PeerLearn (Peer Tutoring & Collaborative Academic Platform)  
**Repository Working Directory:** `/Users/srisaiganesh/peer learner/PeerLearn`  
**Backend Infrastructure:** InsForge BaaS (`https://c35py4a8.us-east.insforge.app`) & PostgreSQL  

---

## 1. PROJECT OVERVIEW

PeerLearn is a full-stack academic peer-tutoring and student collaboration platform designed specifically for college institutes (specifically tailored for IIITDM Jabalpur students, e.g., `@iiitdmj.ac.in`). The platform aims to facilitate:
1. **Peer Tutoring Sessions:** Booking, confirming, conducting, and rating 1-on-1 and group peer study sessions.
2. **Doubt Resolution Engine:** Asking academic questions, attaching code snippets or images, claiming questions as tutors, and posting verified answers.
3. **Academic Resources Repository:** Organizing, uploading, sharing, and upvoting subject-wise study materials, notes, PDFs, and external links.
4. **Study Planner & Daily Routines:** Goal tracking, subject-wise task checklists, and tutor-guided workflow suggestions.
5. **Student Performance Analytics:** Visualizing solved doubt ratios, earned tutor karma/ratings, study streaks, and academic metrics.
6. **Student Onboarding & Verification:** Authentication through institute credentials, password management, roll-number verification, and student profile onboarding.

---

## 2. PROJECT ARCHITECTURE

### Architecture Disconnect & Dual-Backend Hazard
The repository is split between two conflicting backend implementations, leading to severe architectural shadowing and functional breakage:

```
                              +---------------------------------------+
                              |         Next.js Client (React)        |
                              |  app/page.tsx, doubts/, sessions/ ... |
                              +---------------------------------------+
                                                  |
                                                  | API Calls (/api/v1/*)
                                                  v
                              +---------------------------------------+
                              | Next.js App Router Catch-All Route   |
                              |  app/api/v1/[...path]/route.ts        |
                              +---------------------------------------+
                                     |                         |
        next.config.ts rewrites      | (Handles requests)      | (Direct InsForge SDK calls)
        block localhost proxying!    |                         |
                                     x                         v
                     +---------------------------+   +---------------------------+
                     |  NestJS Backend (Offline) |   |  InsForge Cloud Backend   |
                     |  backend/src/* (Port 3001)|   |  PostgreSQL Database      |
                     |  Missing node_modules     |   |  Auth, Storage, RPC       |
                     +---------------------------+   +---------------------------+
```

1. **Frontend Architecture:** Next.js 15 (App Router) with React 19, TypeScript, Tailwind CSS, Lucide icons, and Recharts. Authentication state is held in React Context (`lib/auth-context.tsx`) reading tokens from `localStorage`.
2. **First Backend (Shadowed & Inactive):** NestJS modular backend located in `backend/` with dedicated modules for `auth`, `students`, `doubts`, `sessions`, `resources`, `planner`, `ratings`, `analytics`, `academics`, and `skills`. It was intended to run on port 3001. However, `backend/node_modules` is not installed, no local process runs on 3001, and `next.config.ts` explicitly disables proxying when `BACKEND_URL` is set to `localhost`.
3. **Second Backend (Active Catch-All Shim):** `app/api/v1/[...path]/route.ts` is a monolithic ~1,000-line route handler that intercepts all `/api/v1/*` requests and interacts directly with InsForge using `@insforge/sdk`. This handler only implements a subset of endpoints, omitting critical routes (such as session completions, confirmations, resource bucket creation, proposals, and suggestion responses), causing repeated 404 Not Found errors for frontend operations.
4. **Database & Storage Layer:** InsForge BaaS providing PostgreSQL with Row Level Security (RLS), custom RPC functions, JWT-based user authentication (`auth.users`), and object storage buckets (`resources`).

---

## 3. TECHNOLOGIES AND DEPENDENCIES

### Frontend & Core
- **Framework:** Next.js 15.3.0 (with Turbopack)
- **Runtime:** Node.js v20+ / React 19.0.0 / React DOM 19.0.0
- **Language:** TypeScript 5.8.2
- **Styling:** Tailwind CSS 3.4.1, PostCSS, Autoprefixer
- **UI Components & Icons:** Lucide React (0.475.0), Class Variance Authority (CVA), Tailwind Merge, clsx
- **Visualization:** Recharts 2.15.1
- **Backend-as-a-Service Client:** `@insforge/sdk` 0.1.0

### NestJS Backend (Subdirectory: `backend/`)
- **Framework:** NestJS 10.0.0 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- **Validation:** `class-validator` 0.14.1, `class-transformer` 0.5.1
- **Security:** `bcrypt` 5.1.1, `passport` 0.7.0, `passport-jwt` 4.0.1
- **Config & Utilities:** `@nestjs/config` 3.2.0, `rxjs` 7.8.1

### Test Suite (Subdirectory: `testsprite_tests/`)
- Python 3.12+
- `requests` library

---

## 4. EXECUTIVE SUMMARY

The audit evaluated all 78 project files across static analysis, linting, build pipelines, database schema definitions, runtime API execution, and test suites. 

### Key Findings:
- **Build & Quality Failures:** `npm run lint` failed with **270 problems (214 errors, 56 warnings)**. `npm run build` failed due to Turbopack attempting to fetch Google Fonts (`Newsreader`, `Plus_Jakarta_Sans`) without network fallbacks.
- **Architectural Schism:** The standalone NestJS backend is completely broken and offline (missing `node_modules` and missing `.env`), while the fallback Next.js catch-all route (`route.ts`) lacks at least 8 mandatory endpoints needed by the UI.
- **Catastrophic Security Holes:** 
  1. A `SECURITY DEFINER` PostgreSQL RPC `confirm_auth_user` is granted to `anon`, enabling unauthenticated password reset for any institute email without OTP verification.
  2. The endpoint `POST /api/v1/auth/reset-password` ignores OTP codes entirely.
  3. Production admin API keys (`ik_fa11...`) are hardcoded in client-bundleable code.
  4. Hardcoded backdoor OTPs (`123456`, `000000`, `111111`) are active in production authentication logic.
  5. API endpoints return `devOtpCode` in plaintext JSON responses.
  6. Re-registration of a student triggers `ON DELETE CASCADE`, permanently erasing their doubts, sessions, ratings, and tasks.
- **Database Schema Incompatibilities:** 
  - `POST /api/v1/resources` inserts into nonexistent columns `url` and `student_id` while omitting mandatory `type`, causing 100% crash rate on resource uploads.
  - Suggestion plan usage attempts to set invalid status `'FULFILLED'` (violating `CHECK (status IN ('OPEN', 'CLOSED'))`) and writes to nonexistent column `updated_at`.
  - Notification queries use `is_read` and `message` while the database schema defines `read_at`, `title`, and `body`, breaking notifications in the UI.

---

## 5. TOTAL ISSUES IDENTIFIED

| Severity | Count | Primary Impact |
|:---|:---:|:---|
| **CRITICAL** | 8 | Complete feature outage, data loss, total authentication bypass, unhandled DB schema crashes |
| **HIGH** | 12 | Security backdoors, leaked OTPs, broken flows, CI/build failure, test suite crashes |
| **MEDIUM** | 15 | Mock data in production UI, schema column mismatches, missing rate limits, dead code |
| **LOW** | 10 | ESLint syntax warnings, unescaped JSX, missing accessibility tags, log pollution |
| **TOTAL** | **45** | Complete project-wide findings |

---

## 6. CRITICAL ERRORS (CRIT-001 to CRIT-008)

### ERR-001 (CRIT-001): Dual Backend Split & NestJS Shadowing
- **Category:** Architecture & System Integration
- **File:** `next.config.ts:16-24`, `app/api/v1/[...path]/route.ts`, `backend/src/main.ts`
- **Impact:** System bifurcation. All frontend traffic is routed to `route.ts`, which only implements ~60% of the required endpoints. The NestJS backend is completely dead and unstartable.

### ERR-002 (CRIT-002): Insecure Auth Bypass via Unauthenticated Password Overwrite RPC
- **Category:** Critical Security Vulnerability
- **File:** `migrations/20261022131500_confirm-user-password.sql:1-32`
- **Impact:** Any anonymous user on the internet can invoke `confirm_auth_user` directly via InsForge RPC to reset any user's password without an old password or OTP verification.

### ERR-003 (CRIT-003): Hardcoded Production Admin API Key Exposure
- **Category:** Security Vulnerability
- **File:** `lib/insforge.ts:10`, `testsprite_tests/inspect_student.py:10`
- **Impact:** The InsForge master/admin API key (`ik_fa11...`) is hardcoded in client-accessible TypeScript files, exposing complete database and authentication administrative control to browser clients.

### ERR-004 (CRIT-004): Unauthenticated Password Reset Endpoint Bypassing OTP
- **Category:** Critical Security Vulnerability
- **File:** `app/api/v1/[...path]/route.ts:565-594`
- **Impact:** `POST /api/v1/auth/reset-password` accepts `{ email, newPassword, otp }` but never verifies `otp`. It immediately resets the password via RPC, allowing arbitrary account takeover via a standard HTTP call.

### ERR-005 (CRIT-005): Catastrophic Cascade Student Deletion on Re-Registration
- **Category:** Critical Data Integrity & Business Logic
- **File:** `backend/src/auth/auth.service.ts:278-285`
- **Impact:** `registerComplete` executes `delete().eq('roll_number', rollNumber)`. Due to `ON DELETE CASCADE` foreign keys, re-registering a roll number or malicious re-registration permanently erases all doubts, answers, sessions, ratings, and tasks for that student.

### ERR-006 (CRIT-006): Missing API Endpoints in Next.js Catch-All Route Handler
- **Category:** Broken API Endpoints / Runtime Failure
- **File:** `app/api/v1/[...path]/route.ts:140-1000`
- **Impact:** Missing endpoints return 404 Not Found for:
  - `POST /api/v1/sessions/:id/complete`
  - `POST /api/v1/sessions/:id/confirm`
  - `POST /api/v1/resources/buckets`
  - `DELETE /api/v1/resources/:id`
  - `POST /api/v1/shared-resources/proposals`
  - `POST /api/v1/shared-resources/proposals/:id/vote`
  - `POST /api/v1/suggestions/:id/respond`
  - `POST /api/v1/suggestions/:id/use-plan`

### ERR-007 (CRIT-007): Database Constraint Crash on Resource Creation (`POST /api/v1/resources`)
- **Category:** Database Schema Mismatch & Runtime Crash
- **File:** `app/api/v1/[...path]/route.ts:760-776`
- **Impact:** Inserts `url` and `student_id` into `resources` table. The table schema defines `external_url` and `owner_id`, and requires `type NOT NULL CHECK (type IN ('PDF', 'LINK', 'PHOTO', 'TEXT'))`. Every attempt by a student to upload/share a resource results in an unhandled PostgreSQL constraint violation error.

### ERR-008 (CRIT-008): Planner Service Database Schema Mismatch & Status Violation Crash
- **Category:** Database Schema Mismatch & Runtime Crash
- **File:** `backend/src/planner/planner.service.ts:239-245, 297-308`
- **Impact:** `usePlan` updates `status: 'FULFILLED'` (table constraint restricts to `CHECK (status IN ('OPEN', 'CLOSED'))`) and attempts to update nonexistent `updated_at`. `respondToSuggestion` inserts nonexistent columns `title` and `description` into `suggestion_responses`.

---

## 7. HIGH-SEVERITY ERRORS (HIGH-001 to HIGH-012)

- **ERR-009 (HIGH-001):** Hardcoded backdoor OTPs (`123456`, `000000`, `111111`) active in `route.ts:544-548` and `auth.service.ts:182-184`.
- **ERR-010 (HIGH-002):** Plaintext OTP leaked directly in API response payloads (`devOtpCode`) in `route.ts:489, 560` and `auth.service.ts:167, 345`.
- **ERR-011 (HIGH-003):** Tenant isolation leak in `GET /api/v1/doubts` (`route.ts:175-185`) returning all private student doubts without filtering by student or department.
- **ERR-012 (HIGH-004):** Notifications schema mismatch: UI and `route.ts:953` expect `is_read` and `message`; DB schema defines `read_at`, `title`, and `body`, causing blank UI popovers and update crashes.
- **ERR-013 (HIGH-005):** Analytics resolution rate key mismatch: backend returns `resolutionRate` while `lib/api.ts:285-298` and `app/analytics/page.tsx:84` expect `solvedPercentage`, rendering 0% solved rate.
- **ERR-014 (HIGH-006):** Academic imports schema mismatch: `academics.service.ts:167` inserts `error_summary` which does not exist in `academic_imports` (actual column is `failure_reason`).
- **ERR-015 (HIGH-007):** Doubt title silently discarded: "Topic / Summary Title" in Ask Doubt modal (`app/doubts/page.tsx:413-435`) is dropped because `doubts` table and DTO lack a `title` column.
- **ERR-016 (HIGH-008):** Resource notes category invisibility: `route.ts:740` returns `text` while frontend `ResourceBucket` (`app/resources/page.tsx:43-58`) expects `notes`, hiding all text resources.
- **ERR-017 (HIGH-009):** Next.js Turbopack build failure: `app/layout.tsx:1-15` fetches Google Fonts dynamically, failing builds in offline or CI sandbox environments.
- **ERR-018 (HIGH-010):** Test suite crash: `testsprite_tests/run_master_100_tests.py:251` throws `TypeError: unhashable type: 'slice'` when indexing `all_skills` dict.
- **ERR-019 (HIGH-011):** Pre-deployment test crash: `testsprite_tests/run_pre_deployment_50_tests.py:265` throws `IndexError: list index out of range` on empty skill list.
- **ERR-020 (HIGH-012):** ESLint validation failure: 270 lint issues including React hook cascading `setState` calls in `Header.tsx:44` and `auth-context.tsx:66`.

---

## 8. MEDIUM-SEVERITY ERRORS (MED-001 to MED-015)

- **ERR-021 (MED-001):** Hardcoded mockup statistics ("12 PDFs, 8 Links, 5 Notes") rendered in `app/components/ResourcesCard.tsx:45-72`.
- **ERR-022 (MED-002):** Profile tutor rating hardcoded or defaulting to `5.0` / `0.0` in `app/profile/page.tsx:128` instead of aggregating real reviews from `ratings` table.
- **ERR-023 (MED-003):** Dead code & unused imports in `route.ts:1-25, 505` (`getInsforgeAnon`, unused `studentId` violating `prefer-const`).
- **ERR-024 (MED-004):** Unused helper functions in `backend/src/doubts/doubts.service.ts` and `sessions.service.ts`.
- **ERR-025 (MED-005):** Lack of transactional atomicity when creating sessions and corresponding notifications.
- **ERR-026 (MED-006):** Complete absence of rate limiting on authentication and OTP endpoints (`/api/v1/auth/*`).
- **ERR-027 (MED-007):** Hardcoded placeholder email `rollno@iiitdmj.ac.in` in `testsprite_tests/debug_login.py:12` causing test script failure.
- **ERR-028 (MED-008):** Missing `backend/node_modules/` preventing compilation and execution of NestJS backend.
- **ERR-029 (MED-009):** `backend/scripts/import_skills_master.mjs` throws `ENOENT` due to unhandled missing `backend/.env`.
- **ERR-030 (MED-010):** Inconsistent academic attendance modeling between numeric percentage in DB and fractional counts in service logic.
- **ERR-031 (MED-011):** Unhandled promise rejections on network disconnects in `app/components/Header.tsx:65-95`.
- **ERR-032 (MED-012):** Inaccurate pending doubt queue count in `app/components/TutorDashboard.tsx:75-90` due to client-side pagination slicing.
- **ERR-033 (MED-013):** Wildcard/unvalidated CORS configuration in `backend/src/main.ts:15-25`.
- **ERR-034 (MED-014):** Incomplete MIME type and extension validation during resource file uploads in `backend/src/resources/resources.service.ts`.
- **ERR-035 (MED-015):** Stale token retention: `lib/auth-context.tsx:85-110` leaves expired tokens in `localStorage` upon refresh failure.

---

## 9. LOW-SEVERITY ERRORS (LOW-001 to LOW-010)

- **ERR-036 (LOW-001):** Unescaped JSX entities in `app/login/page.tsx:145` and `app/doubts/page.tsx:210`.
- **ERR-037 (LOW-002):** Missing `rel="noopener noreferrer"` on external resource anchors in `app/resources/page.tsx:185`.
- **ERR-038 (LOW-003):** Disparate and inconsistent date formatting utilities across frontend views.
- **ERR-039 (LOW-004):** Unused utility classes in `app/globals.css:1-40`.
- **ERR-040 (LOW-005):** Missing `alt` accessibility attributes on avatar images in `Header.tsx:120` and `profile/page.tsx:85`.
- **ERR-041 (LOW-006):** Redundant JSON parsing on HTTP 204 No Content responses in `lib/api.ts:55-70`.
- **ERR-042 (LOW-007):** Missing foreign key index on `doubt_answers.doubt_id` in initial SQL migration.
- **ERR-043 (LOW-008):** Verbose debug `console.log` statements logging sensitive request data in `route.ts`.
- **ERR-044 (LOW-009):** Missing icon files referenced in `app/layout.tsx` metadata triggering 404s in browser console.
- **ERR-045 (LOW-010):** Department name typographical inconsistency between frontend filter enums and backend interfaces.

---

## 10. FILE-BY-FILE ERROR ANALYSIS

### Root & Configuration Files
- `next.config.ts`: Lines 16-24 prevent rewrites to localhost, severing frontend from the NestJS service.
- `package.json`: Contains linting script that fails on 214 errors; lacks build font optimization flags.
- `eslint.config.mjs`: Strict rules enabled without codebase adherence, blocking CI/CD builds.
- `lib/insforge.ts`: Line 10 hardcodes production admin secret API key.
- `lib/api.ts`: Lines 285-298 mismatch analytics keys (`solvedPercentage` vs `resolutionRate`). Lines 55-70 attempt JSON parse on 204 responses.
- `lib/auth-context.tsx`: Line 66 calls `setState` directly inside effect; fails to clear `localStorage` on refresh error.

### Frontend Pages & Components (`app/`)
- `app/layout.tsx`: Lines 1-15 fail build when offline due to Google Fonts download. Lines 20-35 reference missing icons.
- `app/login/page.tsx`: Line 145 contains unescaped HTML entities.
- `app/doubts/page.tsx`: Lines 413-435 drop user's doubt title input on submission.
- `app/resources/page.tsx`: Lines 43-58 expect `notes` instead of `text`, hiding notes. Line 185 misses `rel="noopener noreferrer"`. Calls `POST /api/v1/resources/buckets` and `DELETE /api/v1/resources/:id` which return 404.
- `app/sessions/page.tsx`: Calls `POST /api/v1/sessions/:id/complete` and `POST /api/v1/sessions/:id/confirm` which return 404.
- `app/profile/page.tsx`: Line 85 lacks image `alt` attribute. Line 128 hardcodes tutor rating.
- `app/analytics/page.tsx`: Line 84 fails to display resolution rate due to property name mismatch.
- `app/components/Header.tsx`: Line 44 has synchronous `setState` in effect. Lines 143-155 fail to display notification message due to `is_read`/`message` vs `read_at`/`title`/`body` schema mismatch.
- `app/components/ResourcesCard.tsx`: Lines 45-72 display hardcoded static counts.
- `app/components/TutorDashboard.tsx`: Lines 75-90 calculate pending queue from partial paginated page.
- `app/api/v1/[...path]/route.ts`:
  - Lines 1-25: Unused imports and variables.
  - Lines 175-185: Tenant data leak in doubts feed.
  - Lines 489, 560: Plaintext OTP leaked in response.
  - Lines 544-548: Hardcoded backdoor OTPs.
  - Lines 565-594: Reset password endpoint executes without OTP verification.
  - Lines 760-776: Crashes on missing `type` and invalid columns `student_id`/`url`.
  - Lines 896: Returns `resolutionRate` breaking frontend contract.
  - Lines 953: Attempts to update nonexistent column `is_read`.
  - Missing handlers for 8 core endpoints.

### Backend Files (`backend/`)
- `backend/package.json`: Dependencies not installed in workspace.
- `backend/src/main.ts`: Default CORS allows all origins.
- `backend/src/auth/auth.service.ts`: Lines 182-184 have backdoor OTPs. Lines 278-285 cascade-delete student data on re-registration.
- `backend/src/planner/planner.service.ts`: Line 239 inserts nonexistent `title`/`description` into `suggestion_responses`. Line 300 sets invalid status `'FULFILLED'`.
- `backend/src/academics/academics.service.ts`: Line 167 inserts nonexistent `error_summary`.
- `backend/scripts/import_skills_master.mjs`: Line 10 crashes with `ENOENT` on missing `.env`.

### Migrations (`migrations/`)
- `20261021111104_init-peerlearn-schema.sql`: Missing index on `doubt_answers.doubt_id`.
- `20261022131500_confirm-user-password.sql`: Lines 1-32 grant `confirm_auth_user` with `SECURITY DEFINER` to `anon`.

### Tests (`testsprite_tests/`)
- `testsprite_tests/run_master_100_tests.py`: Line 251 crashes with `TypeError` on dict slicing. Points to offline port 3001.
- `testsprite_tests/run_pre_deployment_50_tests.py`: Line 265 crashes with `IndexError` on empty skill list.
- `testsprite_tests/debug_login.py`: Line 12 searches for invalid placeholder email `rollno@iiitdmj.ac.in`.
- `testsprite_tests/inspect_student.py`: Line 10 hardcodes production admin API key.

---

## 11. FRONTEND ERROR ANALYSIS

1. **Broken State Synchronization:** `Header.tsx` and `lib/auth-context.tsx` trigger ESLint warnings and React re-render hazards by executing `setState` directly inside `useEffect` bodies without appropriate cleanup or dependency stabilization.
2. **Missing Endpoint Invocations (404s):**
   - In `app/sessions/page.tsx`, clicking "Complete Session" calls `/api/v1/sessions/:id/complete` and returns 404.
   - In `app/sessions/page.tsx`, clicking "Confirm Attendance" calls `/api/v1/sessions/:id/confirm` and returns 404.
   - In `app/resources/page.tsx`, deleting a resource calls `DELETE /api/v1/resources/:id` and returns 404.
   - In `app/resources/page.tsx`, voting on shared proposals returns 404.
3. **Data Display Breakages:**
   - Notes are invisible in `app/resources/page.tsx` because backend produces key `text` while UI filters on `notes`.
   - Resolution rate is permanently `0%` in `app/analytics/page.tsx` because of `resolutionRate` vs `solvedPercentage`.
   - Notifications in the header bell popover render empty white lines because `notification.message` is undefined (`notification.title` and `notification.body` should be used).
4. **Dropped User Inputs:** The doubt creation modal accepts a title input, but discards it completely when sending the payload to the backend.

---

## 12. BACKEND ERROR ANALYSIS

1. **Unbuildable & Unrunnable State:** Running `cd backend && npm run build` fails with `sh: nest: command not found` because `backend/node_modules/` is missing. The server process on port 3001 is completely offline.
2. **Database Cascade Deletion:** In `auth.service.ts:280`, calling `delete().eq('roll_number', rollNumber)` deletes existing student records, triggering PostgreSQL `ON DELETE CASCADE` across all student activities.
3. **Missing Catch-All Route Handlers:** The Next.js replacement route handler in `app/api/v1/[...path]/route.ts` is missing handlers for:
   - `POST /sessions/:id/complete`
   - `POST /sessions/:id/confirm`
   - `POST /resources/buckets`
   - `DELETE /resources/:id`
   - `POST /shared-resources/proposals`
   - `POST /shared-resources/proposals/:id/vote`
   - `POST /suggestions/:id/respond`
   - `POST /suggestions/:id/use-plan`
4. **Invalid DTO Validation in Planner:** `planner.service.ts` submits steps as an array to `suggested_workflow` which PostgreSQL expects as `text`.

---

## 13. DATABASE ERROR ANALYSIS

1. **Resource Table Schema Conflict:**
   - Schema: `owner_id (UUID)`, `title (TEXT)`, `description (TEXT)`, `type (TEXT CHECK IN ('PDF','LINK','PHOTO','TEXT'))`, `external_url (TEXT)`, `file_key (TEXT)`.
   - API Insertion (`route.ts:761`): `{ student_id, title, description, url, tags }`.
   - Result: `column "student_id" does not exist`, `null value in column "type" violates not-null constraint`.
2. **Suggestion Requests Status Constraint Violation:**
   - Schema: `CHECK (status IN ('OPEN', 'CLOSED'))`.
   - Service Code (`planner.service.ts:300`): Sets `status: 'FULFILLED'`.
   - Result: `violates check constraint "suggestion_requests_status_check"`.
3. **Suggestion Responses Column Mismatch:**
   - Schema: `id`, `request_id`, `responder_student_id`, `suggested_workflow`, `suggested_routine`, `created_at`.
   - Service Code (`planner.service.ts:241`): Inserts `title`, `description`.
   - Result: `column "title" of relation "suggestion_responses" does not exist`.
4. **Academic Imports Column Mismatch:**
   - Schema: `failure_reason text`.
   - Service Code (`academics.service.ts:167`): Inserts `error_summary`.
   - Result: `column "error_summary" does not exist`.
5. **Notifications Column Mismatch:**
   - Schema: `id`, `student_id`, `title`, `body`, `type`, `read_at`, `created_at`.
   - Route Code (`route.ts:953`): Attempts to query and update `is_read`.
   - Result: `column "is_read" does not exist`.

---

## 14. API AND INTEGRATION ERROR ANALYSIS

1. **CORS Misconfiguration:** In `backend/src/main.ts`, `app.enableCors()` uses open defaults without specifying credentials or exact origin matching for production domains.
2. **Response Format Mismatches:**
   - Route `/api/v1/analytics` outputs `{ resolutionRate: X }`; client SDK interface `StudentAnalyticsDto` expects `{ solvedPercentage: X }`.
   - Route `/api/v1/resources` outputs `{ resources: { pdf: [], links: [], text: [] } }`; client expects `{ resources: { pdfs: [], links: [], notes: [] } }`.
3. **JSON Parsing on No-Content:** `lib/api.ts:60` attempts `await response.json()` on `HTTP 204` responses (common for DELETE and confirmation endpoints), throwing a JSON parsing syntax exception.
4. **Unhandled Port Conflict:** The python tests in `testsprite_tests/` hardcode `http://localhost:3001/api/v1`, but `next dev` runs on port 3000, causing connection refused errors across the entire automated test suite.

---

## 15. SECURITY VULNERABILITIES

### Summary of Vulnerabilities
1. **Critical: Anonymous Account Takeover via RPC (`confirm_auth_user`)**
   - Location: `migrations/20261022131500_confirm-user-password.sql`
   - Description: The RPC function is `SECURITY DEFINER` and granted to `public`/`anon`. It accepts `target_email` and `raw_password` and updates the password hash without requiring an OTP or authentication token.
2. **Critical: Password Reset Endpoint Ignores OTP**
   - Location: `app/api/v1/[...path]/route.ts:565`
   - Description: The endpoint takes `{ email, newPassword, otp }` from the client and calls `confirm_auth_user` without checking `otp`.
3. **Critical: Leaked Master Admin API Key**
   - Location: `lib/insforge.ts:10` and `testsprite_tests/inspect_student.py:10`
   - Description: Production secret key `ik_fa11d50c13a48c14fcd786fd165ea331` is committed into client-bundled source code.
4. **High: Hardcoded Backdoor OTPs**
   - Location: `route.ts:544-548` and `auth.service.ts:182-184`
   - Description: The codes `"123456"`, `"000000"`, and `"111111"` bypass verification for any account.
5. **High: OTP Leakage in JSON Response**
   - Location: `route.ts:489, 560` and `auth.service.ts:167, 345`
   - Description: Responses include `devOtpCode` containing the plaintext OTP.
6. **High: Tenant Data Leakage in Doubts Endpoint**
   - Location: `route.ts:175-185`
   - Description: `GET /api/v1/doubts` selects all doubts in the database with no student or tenancy filtering.
7. **Medium: Missing Authentication Rate Limiting**
   - Location: `route.ts:460-600`
   - Description: No throttling or IP-based limits exist on `/api/v1/auth/login` or registration endpoints.

---

## 16. PERFORMANCE ISSUES

1. **Missing Foreign Key Indexes:** `doubt_answers.doubt_id` and `ratings.session_id` lack B-Tree indexes, causing full sequential table scans when joining answers and ratings.
2. **Unpaginated Doubts and Sessions Queries:** `route.ts:175` fetches all doubts and nested answers at once without `limit` or `offset`. In a production database with thousands of doubts, this causes severe query latency and high memory consumption.
3. **Client-Side Heavy Filtering:** `app/components/TutorDashboard.tsx` fetches doubts and filters locally on the client rather than delegating count and status queries to PostgreSQL.
4. **Dynamic Font Downloading on Every Build:** Fetching Google Fonts on build time prevents caching in isolated build runners.

---

## 17. LOGICAL AND FUNCTIONAL BUGS

1. **Student Onboarding Erases Academic History:** A student re-running onboarding has their existing student record deleted, wiping out past sessions, answers, and doubts.
2. **Doubt Title Dropped:** Students enter a descriptive title when asking a question, but the title is dropped, forcing peers to read long descriptions without a summary.
3. **Notes Count Showing Zero:** Even after uploading text notes, the resource page shows 0 notes because of the `text` vs `notes` key mismatch.
4. **Resolution Rate Showing Zero:** Analytics page shows 0% resolution rate regardless of how many doubts a student has resolved because of `resolutionRate` vs `solvedPercentage`.
5. **Stale Session Token Lockout:** Expired refresh tokens are not removed from `localStorage`, causing infinite refresh retry loops and 401 unauthenticated errors until local storage is manually wiped.

---

## 18. MISSING FEATURES OR INCOMPLETE IMPLEMENTATIONS

1. **Session Completion & Confirmation Flow:**
   - The UI buttons exist in `app/sessions/page.tsx`, but the backend route handler `route.ts` lacks `POST /api/v1/sessions/:id/complete` and `POST /api/v1/sessions/:id/confirm`.
2. **Resource Bucketing & Management:**
   - Creating resource buckets (`POST /api/v1/resources/buckets`) and deleting resources (`DELETE /api/v1/resources/:id`) are unimplemented in `route.ts`.
3. **Shared Resource Proposal Voting:**
   - The UI in `app/resources/page.tsx` renders voting buttons for shared proposals, but the backend endpoints (`POST /api/v1/shared-resources/proposals` and `vote`) return 404.
4. **Tutor Suggestion Workflow:**
   - Responding to student study planner suggestions (`POST /api/v1/suggestions/:id/respond`) and applying plans (`POST /api/v1/suggestions/:id/use-plan`) are unimplemented in `route.ts` and fail DB constraints in `planner.service.ts`.

---

## 19. ERROR DEPENDENCY MAP

```
+-----------------------------------------------------------------------------------+
|                                  FOUNDATION TIER                                  |
|                                                                                   |
|  [ERR-001] Architectural Resolution (Consolidate on Next.js Route or NestJS)       |
|  [ERR-002] Revoke Insecure RPC Grants & Fix DB Stored Procedures                  |
|  [ERR-003] Remove Hardcoded Admin API Key & Configure Secure Env Variables         |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                  SECURITY TIER                                    |
|                                                                                   |
|  [ERR-004] Implement Strict OTP Verification in Reset Password                    |
|  [ERR-005] Eliminate Student Cascade Deletion on Re-Registration                  |
|  [ERR-009] Remove Backdoor OTPs (123456, 000000, 111111)                          |
|  [ERR-010] Remove Plaintext devOtpCode from API Responses                         |
|  [ERR-011] Enforce Tenant/User Filtering on Doubts Feed                           |
|  [ERR-026] Add Authentication Rate Limiting Guards                                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              DATABASE & SCHEMA TIER                               |
|                                                                                   |
|  [ERR-007] Fix Resources Column Mapping (owner_id, external_url, type NOT NULL)   |
|  [ERR-008] Fix Planner Schema & Status Constraints ('OPEN', 'CLOSED')             |
|  [ERR-012] Align Notifications Schema (read_at, title, body)                      |
|  [ERR-014] Align Academics Schema (failure_reason)                                |
|  [ERR-042] Add Index to doubt_answers.doubt_id                                    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                API & ENDPOINT TIER                                |
|                                                                                   |
|  [ERR-006] Implement Missing Endpoints in Catch-All Route Handler                 |
|  [ERR-013] Align Analytics Keys (solvedPercentage vs resolutionRate)              |
|  [ERR-016] Align Resource Categories (notes vs text)                              |
|  [ERR-025] Add Transactional Integrity to Session & Notification Creation         |
|  [ERR-041] Fix 204 No Content JSON Parsing in API Client                          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                             FRONTEND & UI INTEGRATION                             |
|                                                                                   |
|  [ERR-015] Persist Doubt Title in Form Submission                                 |
|  [ERR-017] Configure Offline Fallback for Google Fonts in layout.tsx              |
|  [ERR-020] Fix ESLint Hook setState Cascades and Strict Types                     |
|  [ERR-021] Replace Mock Data in ResourcesCard with Live API Data                  |
|  [ERR-022] Bind Real Ratings to Profile View                                      |
|  [ERR-031] Handle Notification Stream Rejections                                  |
|  [ERR-035] Purge Local Storage on Token Expiration                                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               TEST SUITE VALIDATION                               |
|                                                                                   |
|  [ERR-018] Fix Dict Slicing TypeError in run_master_100_tests.py                  |
|  [ERR-019] Fix IndexError in run_pre_deployment_50_tests.py                       |
|  [ERR-027] Update debug_login.py with Valid Seed Credentials                      |
+-----------------------------------------------------------------------------------+
```

---

## 20. RECOMMENDED FIXING ORDER

1. **Step 1: Security Remediation (Immediate Priority)**
   - Revoke `confirm_auth_user` permissions in PostgreSQL and replace with server-verified RPC.
   - Remove hardcoded admin key in `lib/insforge.ts` and replace with strictly server-side environment variables.
   - Remove backdoor OTPs (`123456`, `000000`, `111111`) and delete `devOtpCode` from all API response objects.
   - Fix `POST /api/v1/auth/reset-password` to strictly validate OTP before resetting credentials.
   - Remove `delete().eq('roll_number')` in student onboarding to prevent data wiping.

2. **Step 2: Database Schema Alignment**
   - Correct `handleResourcesCreate` in `route.ts` to map payload to `owner_id`, `external_url`, and include valid `type` (`PDF`, `LINK`, `PHOTO`, `TEXT`).
   - Fix `planner.service.ts` to use status `'CLOSED'` instead of `'FULFILLED'` and remove nonexistent columns `updated_at`, `title`, and `description`.
   - Update `Header.tsx` and `route.ts` to read `title`, `body`, and update `read_at` on notifications.

3. **Step 3: Route & Endpoint Implementation**
   - Implement the 8 missing endpoints in `app/api/v1/[...path]/route.ts` (`/sessions/:id/complete`, `/sessions/:id/confirm`, `/resources/buckets`, `/resources/:id` DELETE, shared resource proposals, and study suggestion actions).
   - Standardize response keys: `solvedPercentage` for analytics and `notes` for resources.

4. **Step 4: Frontend & Build Stability**
   - Resolve ESLint errors in `Header.tsx` and `auth-context.tsx` by eliminating cascading `setState` calls inside `useEffect`.
   - Configure local font fallback in `app/layout.tsx` to ensure `npm run build` succeeds offline.
   - Persist doubt titles in `app/doubts/page.tsx` and display live counts in `ResourcesCard.tsx`.

5. **Step 5: Test Suite Modernization**
   - Fix dictionary slicing in `run_master_100_tests.py:251` and empty array checking in `run_pre_deployment_50_tests.py:265`.
   - Point test scripts to the active server port (3000) or configure NestJS dependencies.

---

## 21. TESTING PERFORMED

1. **Static Analysis & Linting:**
   - Executed `npm run lint`: Identified 270 problems (214 errors, 56 warnings).
   - Executed `npx tsc --noEmit`: Frontend TypeScript compilation passed with 0 fatal type errors.
2. **Build Pipeline:**
   - Executed `npm run build`: Failed during font generation due to offline Turbopack Google Fonts fetch.
   - Executed `cd backend && npm run build`: Failed with code 127 (`nest: command not found`) due to missing `backend/node_modules/`.
3. **Dev Server & API Health Checks:**
   - Verified Next.js dev server on port 3000 (PID 85184).
   - Queried `http://localhost:3000/api/v1/health`: Responded HTTP 200 `{"status":"ok"}`.
   - Executed authentication test `POST /api/v1/auth/login` with seeded student credentials: Confirmed successful authentication and JWT generation.
4. **Network & Backend Socket Inspection:**
   - Attempted socket connection to port 3001 (NestJS): Connection refused (offline).
5. **Automated Test Suite Execution:**
   - Executed `python3 testsprite_tests/run_master_100_tests.py`: Failed due to offline backend and crashed with `TypeError: unhashable type: 'slice'` at test 37.
   - Executed `python3 testsprite_tests/run_pre_deployment_50_tests.py`: Failed due to offline backend and crashed with `IndexError` at test 25.
   - Executed `node backend/scripts/import_skills_master.mjs`: Failed with `ENOENT` due to missing `backend/.env`.

---

## 22. TESTING NOT PERFORMED AND REASONS

1. **Full Runtime Execution of NestJS Endpoints:** Cannot be tested directly through NestJS because `backend/node_modules` was not installed and dependencies could not be fetched in the sandboxed environment.
2. **End-to-End Realtime WebSocket Subscriptions:** Could not be fully evaluated under high concurrent socket load due to isolated local sandbox restrictions.
3. **Production File Upload to S3/Storage Buckets:** Cloud storage file uploads with large binary payloads were verified via schema inspection rather than actual multi-megabyte binary streaming to avoid altering remote production bucket state.

---

## 23. FINAL RECOMMENDATIONS

1. **Consolidate on Next.js App Router API:** Retain `app/api/v1/[...path]/route.ts` as the primary API layer, fully implement the 8 missing endpoints, and safely archive or separate `backend/` to prevent maintenance confusion.
2. **Secure Database RPC Functions:** Immediately run a migration removing `GRANT EXECUTE ON FUNCTION confirm_auth_user TO anon, public;` and enforce strict service-role execution.
3. **Establish CI Lint & Font Gates:** Fix React hook dependency arrays, sanitize ESLint type casts, and package local font assets to ensure offline builds succeed consistently.

---

# PHASE 7: AI-READY FIXING INSTRUCTIONS

The following actionable instructions are formatted for direct execution by another AI coding agent.

---

### ERROR ID: ERR-001
**FILE:** `next.config.ts`, `app/api/v1/[...path]/route.ts`  
**LOCATION:** `next.config.ts:16-24` and `app/api/v1/[...path]/route.ts`  
**PROBLEM:**  
The repository maintains two disjoint backends: a NestJS service (`backend/`) and an App Router catch-all route (`route.ts`). `next.config.ts` prevents rewrites to localhost, while `backend/node_modules` does not exist, causing endpoint 404s and confusion.  
**ROOT CAUSE:**  
Frontend was partially shimmed with an in-process catch-all route handler, leaving the NestJS backend unmaintained and unreachable.  
**REQUIRED FIX:**  
Adopt a single backend strategy: Consolidate all endpoint logic directly inside `app/api/v1/[...path]/route.ts` by porting missing handlers, and remove the unreached localhost proxy check in `next.config.ts`.  
**RELATED FILES:**  
- `next.config.ts`  
- `app/api/v1/[...path]/route.ts`  
- `backend/src/*`  
**EXPECTED RESULT:**  
All frontend API calls are reliably handled with full feature parity without depending on an external uninstalled backend process.  
**VALIDATION:**  
`curl http://localhost:3000/api/v1/health` and all sub-routes respond with HTTP 200/201.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-002
**FILE:** `migrations/20261022131500_confirm-user-password.sql`  
**LOCATION:** Lines 1-32 (`confirm_auth_user`)  
**PROBLEM:**  
`confirm_auth_user` is a `SECURITY DEFINER` function granted to `anon` and `authenticated` that updates `auth.users` passwords without validating the current password, an OTP token, or session authorization.  
**ROOT CAUSE:**  
Admin convenience helper exposed to public database roles.  
**REQUIRED FIX:**  
Create a new migration revoking execute permissions from `anon` and `public`:
`REVOKE EXECUTE ON FUNCTION confirm_auth_user(text, text) FROM public, anon;`
Ensure password updates require a valid reset token or authenticated session.  
**RELATED FILES:**  
- `migrations/20261022131500_confirm-user-password.sql`  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
Unauthenticated users cannot invoke `confirm_auth_user` to change user passwords.  
**VALIDATION:**  
Invoke `insforge.rpc('confirm_auth_user', ...)` with an anon client and verify it returns HTTP 403 / permission denied.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-003
**FILE:** `lib/insforge.ts`  
**LOCATION:** Line 10  
**PROBLEM:**  
The master service/admin API key (`ik_fa11d50c...`) is hardcoded in `lib/insforge.ts` which is imported by client components.  
**ROOT CAUSE:**  
Hardcoded fallback value in source code.  
**REQUIRED FIX:**  
Replace the hardcoded key fallback with `process.env.INSFORGE_ANON_KEY` or `process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY`. For admin operations, ensure only server-side environment variables (`INSFORGE_SERVICE_KEY`) are accessed inside server routes.  
**RELATED FILES:**  
- `lib/insforge.ts`  
- `testsprite_tests/inspect_student.py`  
- `.env.local`  
**EXPECTED RESULT:**  
No admin keys are present in source code or sent to client browsers.  
**VALIDATION:**  
Run `grep -rn "ik_fa11" .` and verify 0 occurrences in source code.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-004
**FILE:** `app/api/v1/[...path]/route.ts`  
**LOCATION:** Lines 565-594 (`handleResetPassword`)  
**PROBLEM:**  
The reset password handler accepts `otp` in the request body but never validates it, immediately calling `confirm_auth_user`.  
**ROOT CAUSE:**  
Missing validation block before invoking the credential update procedure.  
**REQUIRED FIX:**  
Add verification against stored OTPs in InsForge/cache or auth verification table before calling the password update RPC:
```typescript
if (!verifyOtp(email, body.otp)) {
  return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
}
```  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
Password resets fail with HTTP 400 when an invalid OTP is provided.  
**VALIDATION:**  
Send a `POST /api/v1/auth/reset-password` request with an incorrect OTP and verify it is rejected with 400 Bad Request.  
**FIX DEPENDENCIES:**  
ERR-002

---

### ERROR ID: ERR-005
**FILE:** `backend/src/auth/auth.service.ts`  
**LOCATION:** Lines 278-285 (`registerComplete`)  
**PROBLEM:**  
Executes `delete().eq('roll_number', rollNumber)` on `students`, triggering cascading deletes on doubts, sessions, tasks, and ratings.  
**ROOT CAUSE:**  
Attempting to prevent duplicate student entries by deleting existing records rather than using `UPSERT` or rejecting duplicate registrations.  
**REQUIRED FIX:**  
Remove the `.delete()` call. Instead, check if the student exists and perform an `upsert` or return a message indicating the student is already registered:
```typescript
const { data: existing } = await client.from('students').select('id').eq('roll_number', rollNumber).maybeSingle();
if (existing) {
  // Update onboarding status without deleting relational data
  await client.from('students').update({ ...profileData }).eq('id', existing.id);
}
```  
**RELATED FILES:**  
- `backend/src/auth/auth.service.ts`  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
Completing registration updates the student's profile without deleting existing doubts, sessions, or tasks.  
**VALIDATION:**  
Re-register an existing student account and verify their records in `doubts` and `sessions` remain intact.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-006
**FILE:** `app/api/v1/[...path]/route.ts`  
**LOCATION:** Route Dispatcher (Lines 140-1000)  
**PROBLEM:**  
The catch-all route returns 404 for 8 essential endpoints used by the frontend:
- `POST /sessions/:id/complete`
- `POST /sessions/:id/confirm`
- `POST /resources/buckets`
- `DELETE /resources/:id`
- `POST /shared-resources/proposals`
- `POST /shared-resources/proposals/:id/vote`
- `POST /suggestions/:id/respond`
- `POST /suggestions/:id/use-plan`  
**ROOT CAUSE:**  
Incomplete endpoint implementation during catch-all route creation.  
**REQUIRED FIX:**  
Add explicit handler functions and route cases for each of the 8 missing endpoints in `route.ts`.  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `lib/api.ts`  
- `app/sessions/page.tsx`  
- `app/resources/page.tsx`  
**EXPECTED RESULT:**  
Frontend session completion, resource bucket creation, voting, and study suggestions succeed with HTTP 200/201.  
**VALIDATION:**  
Send HTTP POST/DELETE requests to each of the 8 endpoints and verify they return valid JSON instead of 404.  
**FIX DEPENDENCIES:**  
ERR-001

---

### ERROR ID: ERR-007
**FILE:** `app/api/v1/[...path]/route.ts`  
**LOCATION:** Lines 760-776 (`handleResourcesCreate`)  
**PROBLEM:**  
Inserts `{ student_id, url }` into `resources` and omits mandatory `type`, causing PostgreSQL constraint failures.  
**ROOT CAUSE:**  
Mismatch between route payload mapping and database migration schema (`owner_id`, `external_url`, `type`).  
**REQUIRED FIX:**  
Update the insert payload to conform to the `resources` table definition:
```typescript
const insertPayload = {
  owner_id: student.id,
  title: body.title,
  description: body.description || null,
  type: body.type || 'LINK',
  external_url: body.url || body.external_url || null,
  tags: body.tags || []
};
```  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `migrations/20261021111104_init-peerlearn-schema.sql`  
**EXPECTED RESULT:**  
Resource creation succeeds without PostgreSQL schema errors.  
**VALIDATION:**  
Send `POST /api/v1/resources` with valid payload and verify HTTP 201 with record inserted.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-008
**FILE:** `backend/src/planner/planner.service.ts`  
**LOCATION:** Lines 239-245, 297-308  
**PROBLEM:**  
`usePlan` sets invalid status `'FULFILLED'` (violating `CHECK (status IN ('OPEN', 'CLOSED'))`) and updates nonexistent `updated_at`. `respondToSuggestion` inserts nonexistent columns `title` and `description`.  
**ROOT CAUSE:**  
Code written against an incorrect schema model.  
**REQUIRED FIX:**  
1. In `usePlan`, set `status: 'CLOSED'` and remove `updated_at`.
2. In `respondToSuggestion`, remove `title` and `description` from the insert payload, and serialize `steps` into string `suggested_workflow`.  
**RELATED FILES:**  
- `backend/src/planner/planner.service.ts`  
- `migrations/20261021111104_init-peerlearn-schema.sql`  
**EXPECTED RESULT:**  
Responding to suggestions and applying study plans executes without database constraint violations.  
**VALIDATION:**  
Call `usePlan` and verify database row status updates to `'CLOSED'`.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-009
**FILE:** `app/api/v1/[...path]/route.ts:544-548`, `backend/src/auth/auth.service.ts:182-184`  
**LOCATION:** OTP verification functions  
**PROBLEM:**  
Hardcoded backdoor OTPs (`"123456"`, `"000000"`, `"111111"`) are treated as valid for all accounts.  
**ROOT CAUSE:**  
Testing shortcuts left in production code.  
**REQUIRED FIX:**  
Remove the hardcoded OTP array checks. Verify OTP strictly against generated codes stored with expiration timestamps.  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `backend/src/auth/auth.service.ts`  
**EXPECTED RESULT:**  
Only genuinely generated, valid, unexpired OTPs are accepted.  
**VALIDATION:**  
Attempt to verify registration with `123456` and confirm it is rejected.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-010
**FILE:** `app/api/v1/[...path]/route.ts:489, 560`, `backend/src/auth/auth.service.ts:167, 345`  
**LOCATION:** `register/start` and `forgot-password` handlers  
**PROBLEM:**  
Responses return `{ message: "...", devOtpCode: otp }`, leaking OTPs over HTTP.  
**ROOT CAUSE:**  
Debug property included in production JSON responses.  
**REQUIRED FIX:**  
Remove `devOtpCode` from all JSON responses:
```typescript
return NextResponse.json({ message: 'OTP sent successfully' });
```  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `backend/src/auth/auth.service.ts`  
**EXPECTED RESULT:**  
No OTP codes are returned in API response bodies.  
**VALIDATION:**  
Trigger registration start and verify `devOtpCode` is not present in the response body.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-011
**FILE:** `app/api/v1/[...path]/route.ts`  
**LOCATION:** Lines 175-185 (`handleDoubtsGet`)  
**PROBLEM:**  
`GET /api/v1/doubts` selects all doubts from all students across the entire institution without tenancy or user filters.  
**ROOT CAUSE:**  
Missing query parameter parsing and WHERE clause filtering.  
**REQUIRED FIX:**  
Parse query parameters (`mine`, `status`, `subject`, `department`) and apply appropriate filters:
```typescript
let query = client.from('doubts').select('*, student:students(*), answers:doubt_answers(*)');
if (searchParams.get('mine') === 'true') {
  query = query.eq('student_id', currentStudent.id);
}
```  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `app/doubts/page.tsx`  
**EXPECTED RESULT:**  
Students view filtered, relevant doubts rather than unpartitioned global database rows.  
**VALIDATION:**  
Pass `?mine=true` and verify only the requesting student's doubts are returned.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-012
**FILE:** `app/api/v1/[...path]/route.ts:953`, `app/components/Header.tsx:143-155`  
**LOCATION:** Notification query and update logic  
**PROBLEM:**  
Code expects `is_read` and `message`, whereas PostgreSQL schema defines `read_at`, `title`, and `body`. Popovers show blank messages and mark-as-read crashes.  
**ROOT CAUSE:**  
Frontend/API property naming discrepancy with SQL schema.  
**REQUIRED FIX:**  
1. In `route.ts`, map database fields:
```typescript
message: n.body || n.title,
is_read: n.read_at !== null
```
2. In mark-as-read, update `read_at: new Date().toISOString()` instead of `is_read: true`.  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `app/components/Header.tsx`  
- `migrations/20261021111104_init-peerlearn-schema.sql`  
**EXPECTED RESULT:**  
Notifications display proper title/body text and mark-as-read succeeds without schema errors.  
**VALIDATION:**  
Open notifications popover in UI, verify notification text is visible, click to mark as read, and verify `read_at` is updated in DB.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-013
**FILE:** `app/api/v1/[...path]/route.ts:896`, `lib/api.ts:285-298`, `app/analytics/page.tsx:84`  
**LOCATION:** Analytics response generation and consumption  
**PROBLEM:**  
Backend returns `resolutionRate` but frontend reads `solvedPercentage`, displaying 0% resolution rate.  
**ROOT CAUSE:**  
Property name mismatch across API layer.  
**REQUIRED FIX:**  
In `route.ts`, return both or standardize to `solvedPercentage`:
```typescript
solvedPercentage: resolutionRate,
resolutionRate: resolutionRate
```  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `lib/api.ts`  
- `app/analytics/page.tsx`  
**EXPECTED RESULT:**  
Analytics dashboard correctly renders the student's solved doubt percentage.  
**VALIDATION:**  
Navigate to `/analytics` and verify Resolution Rate displays accurate non-zero percentage.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-014
**FILE:** `backend/src/academics/academics.service.ts`  
**LOCATION:** Line 167  
**PROBLEM:**  
Inserts `error_summary` into `academic_imports` which does not exist (actual column is `failure_reason`).  
**ROOT CAUSE:**  
Typographical mismatch with SQL migration schema.  
**REQUIRED FIX:**  
Change column name in insert payload from `error_summary` to `failure_reason`.  
**RELATED FILES:**  
- `backend/src/academics/academics.service.ts`  
- `migrations/20261021111104_init-peerlearn-schema.sql`  
**EXPECTED RESULT:**  
Academic import failures record their failure reason without throwing column errors.  
**VALIDATION:**  
Trigger a failed academic import and check that `failure_reason` is populated in `academic_imports`.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-015
**FILE:** `app/doubts/page.tsx`  
**LOCATION:** Lines 413-435  
**PROBLEM:**  
The Ask Doubt modal has an input for "Topic / Summary Title" (`newDoubt.title`), but it is not included in the payload sent to the backend.  
**ROOT CAUSE:**  
Frontend omitted title from `createDoubt` API call payload.  
**REQUIRED FIX:**  
Prepend the title to the description or store it if `title` column is added to `doubts`:
```typescript
description: `${newDoubt.title.trim()}\n\n${newDoubt.description.trim()}`
```  
**RELATED FILES:**  
- `app/doubts/page.tsx`  
- `lib/api.ts`  
**EXPECTED RESULT:**  
The title provided by the user is preserved and visible to peers viewing the doubt feed.  
**VALIDATION:**  
Submit a doubt with title "Calculus Limits" and description "How to solve limit x->0", verify both appear in the doubt details view.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-016
**FILE:** `app/api/v1/[...path]/route.ts:740`, `app/resources/page.tsx:43-58`  
**LOCATION:** Resource categorization  
**PROBLEM:**  
`route.ts` groups resources under `text`, while `app/resources/page.tsx` expects `notes`, hiding text notes.  
**ROOT CAUSE:**  
Key name mismatch in resource dictionary.  
**REQUIRED FIX:**  
In `route.ts`, return both `notes` and `text` (or standardize to `notes`):
```typescript
notes: resources.filter(r => r.type === 'TEXT'),
text: resources.filter(r => r.type === 'TEXT')
```  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `app/resources/page.tsx`  
**EXPECTED RESULT:**  
Text notes are correctly visible in the Resources page under Notes tab.  
**VALIDATION:**  
Upload a text note and verify it appears in the UI list of notes.  
**FIX DEPENDENCIES:**  
ERR-007

---

### ERROR ID: ERR-017
**FILE:** `app/layout.tsx`  
**LOCATION:** Lines 1-15  
**PROBLEM:**  
Turbopack build fails when offline because `next/font/google` attempts to fetch font files from Google servers.  
**ROOT CAUSE:**  
Dynamic external font loading without local font fallback.  
**REQUIRED FIX:**  
Add fallback system font families or configure local font definitions in `app/layout.tsx`:
```typescript
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});
```  
**RELATED FILES:**  
- `app/layout.tsx`  
**EXPECTED RESULT:**  
`npm run build` succeeds even in offline or sandboxed environments.  
**VALIDATION:**  
Run `npm run build` in standard sandbox and verify build exits with code 0.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-018
**FILE:** `testsprite_tests/run_master_100_tests.py`  
**LOCATION:** Line 251  
**PROBLEM:**  
Crashes with `TypeError: unhashable type: 'slice'` when trying to slice `all_skills[:3]` because `all_skills` is a dictionary (`{"skills": [...]}`).  
**ROOT CAUSE:**  
Improper assumption of JSON response structure.  
**REQUIRED FIX:**  
Extract the skills list before slicing:
```python
skills_data = response.json()
skills_list = skills_data.get("skills", skills_data) if isinstance(skills_data, dict) else skills_data
selected = skills_list[:3]
```  
**RELATED FILES:**  
- `testsprite_tests/run_master_100_tests.py`  
**EXPECTED RESULT:**  
The test suite continues executing past test 37 without Python unhandled type exceptions.  
**VALIDATION:**  
Run `python3 testsprite_tests/run_master_100_tests.py` and verify test 37 passes.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-019
**FILE:** `testsprite_tests/run_pre_deployment_50_tests.py`  
**LOCATION:** Line 265  
**PROBLEM:**  
Crashes with `IndexError: list index out of range` when accessing `skills_list[0]` on an empty list.  
**ROOT CAUSE:**  
Missing empty-state check before list indexing.  
**REQUIRED FIX:**  
Add bounds verification and safe fallback:
```python
if not skills_list:
    print("Warning: No skills found, skipping session skill selection")
    skill_id = None
else:
    skill_id = skills_list[0]["id"]
```  
**RELATED FILES:**  
- `testsprite_tests/run_pre_deployment_50_tests.py`  
**EXPECTED RESULT:**  
Pre-deployment test suite runs to completion without `IndexError`.  
**VALIDATION:**  
Run `python3 testsprite_tests/run_pre_deployment_50_tests.py` against a blank test database and verify no crashes.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-020
**FILE:** `app/components/Header.tsx:44`, `lib/auth-context.tsx:66`, `eslint.config.mjs`  
**LOCATION:** React `useEffect` hooks and TypeScript type assertions  
**PROBLEM:**  
ESLint fails with 270 problems (214 errors) due to cascading hook updates and over 200 `@typescript-eslint/no-explicit-any` violations.  
**ROOT CAUSE:**  
Calling `setState` directly in `useEffect` and loose TypeScript typing.  
**REQUIRED FIX:**  
1. Wrap state updates in `Header.tsx` and `auth-context.tsx` inside callbacks or event listeners rather than executing synchronously on initial render.
2. Replace `@typescript-eslint/no-explicit-any` with explicit interfaces or adjust rule severity in `eslint.config.mjs`.  
**RELATED FILES:**  
- `app/components/Header.tsx`  
- `lib/auth-context.tsx`  
- `eslint.config.mjs`  
**EXPECTED RESULT:**  
`npm run lint` exits with code 0 (0 errors).  
**VALIDATION:**  
Run `npm run lint` and verify 0 errors.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-021
**FILE:** `app/components/ResourcesCard.tsx`  
**LOCATION:** Lines 45-72  
**PROBLEM:**  
Displays hardcoded static mock strings ("12 PDFs", "8 Links", "5 Notes", "3 Batch-verified") regardless of database state.  
**ROOT CAUSE:**  
Mockup template data left unintegrated with API data.  
**REQUIRED FIX:**  
Bind counts to props passed from `app/resources/page.tsx` or fetch live counts from `/api/v1/resources`.  
**RELATED FILES:**  
- `app/components/ResourcesCard.tsx`  
- `app/resources/page.tsx`  
**EXPECTED RESULT:**  
Counts dynamically reflect the exact number of resources stored in the database.  
**VALIDATION:**  
Upload a new PDF and verify the PDF count increments on the card.  
**FIX DEPENDENCIES:**  
ERR-007

---

### ERROR ID: ERR-022
**FILE:** `app/profile/page.tsx`  
**LOCATION:** Line 128  
**PROBLEM:**  
Tutor rating is hardcoded or defaults to `5.0` / `0.0` with static stars not bound to `ratings` table averages.  
**ROOT CAUSE:**  
Missing aggregated rating fetch on the profile page.  
**REQUIRED FIX:**  
Query `/api/v1/ratings/summary?studentId=:id` and display the calculated `average_rating` and review count.  
**RELATED FILES:**  
- `app/profile/page.tsx`  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
Profile page shows accurate, calculated peer-review ratings.  
**VALIDATION:**  
Add a 4.0 rating to a tutor and verify their profile renders 4.0 stars.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-023
**FILE:** `app/api/v1/[...path]/route.ts`  
**LOCATION:** Lines 1-25, Line 505  
**PROBLEM:**  
Unused imports (`getInsforgeAnon`), unused caught errors (`rpcErr`), and `let studentId` which is never reassigned (violating `prefer-const`).  
**ROOT CAUSE:**  
Code cleanup omission.  
**REQUIRED FIX:**  
Remove unused imports and change `let studentId` to `const studentId`.  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
No unused variables or `prefer-const` linting errors in `route.ts`.  
**VALIDATION:**  
Run `npx eslint app/api/v1/[...path]/route.ts` and verify 0 errors.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-024
**FILE:** `backend/src/doubts/doubts.service.ts`, `backend/src/sessions/sessions.service.ts`  
**LOCATION:** Helper functions  
**PROBLEM:**  
Dead code functions defined but never invoked across the application.  
**ROOT CAUSE:**  
Incomplete refactoring.  
**REQUIRED FIX:**  
Remove dead functions or integrate them into query pipelines.  
**RELATED FILES:**  
- `backend/src/doubts/doubts.service.ts`  
**EXPECTED RESULT:**  
Clean codebase without orphaned logic.  
**VALIDATION:**  
Run static dead code analysis or TypeScript compiler.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-025
**FILE:** `backend/src/sessions/sessions.service.ts:85-110`, `app/api/v1/[...path]/route.ts:680-710`  
**LOCATION:** `createSession`  
**PROBLEM:**  
Session creation and notification creation are separate uncommitted operations; failure of notification leaves orphaned sessions.  
**ROOT CAUSE:**  
Lack of transactional wrapping.  
**REQUIRED FIX:**  
Wrap session and notification insertion in a single atomic database function or RPC call.  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
- `backend/src/sessions/sessions.service.ts`  
**EXPECTED RESULT:**  
Session and notifications are created atomically.  
**VALIDATION:**  
Simulate notification error and ensure session insert rolls back.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-026
**FILE:** `app/api/v1/[...path]/route.ts`  
**LOCATION:** Lines 460-600  
**PROBLEM:**  
No rate limiting on `/api/v1/auth/*` allows brute force attacks on passwords and OTP exhaustion.  
**ROOT CAUSE:**  
Missing rate limiting middleware.  
**REQUIRED FIX:**  
Implement IP/email rate limiting using an in-memory token bucket or InsForge rate limiting guard.  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
Excessive requests to auth endpoints return HTTP 429 Too Many Requests.  
**VALIDATION:**  
Send 15 login requests within 5 seconds and verify 429 is returned.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-027
**FILE:** `testsprite_tests/debug_login.py`  
**LOCATION:** Line 12  
**PROBLEM:**  
Searches for obsolete placeholder email `rollno@iiitdmj.ac.in`, causing debug script failure.  
**ROOT CAUSE:**  
Hardcoded test email not updated with seeded test fixtures.  
**REQUIRED FIX:**  
Update email to valid seeded student roll number: `25bcs270@iiitdmj.ac.in`.  
**RELATED FILES:**  
- `testsprite_tests/debug_login.py`  
**EXPECTED RESULT:**  
Debug script successfully finds student and validates authentication token.  
**VALIDATION:**  
Run `python3 testsprite_tests/debug_login.py` and verify HTTP 200 with student profile returned.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-028
**FILE:** `backend/package.json`  
**LOCATION:** `backend/` directory  
**PROBLEM:**  
`backend/node_modules/` is missing, preventing compilation or execution of NestJS backend.  
**ROOT CAUSE:**  
Dependencies were never installed in the backend subfolder.  
**REQUIRED FIX:**  
Run `cd backend && npm install` or adopt the Next.js catch-all API consolidation (ERR-001).  
**RELATED FILES:**  
- `backend/package.json`  
**EXPECTED RESULT:**  
NestJS packages installed and `nest build` executes successfully.  
**VALIDATION:**  
Run `cd backend && npm run build` and verify output in `backend/dist/`.  
**FIX DEPENDENCIES:**  
ERR-001

---

### ERROR ID: ERR-029
**FILE:** `backend/scripts/import_skills_master.mjs`  
**LOCATION:** Lines 10-15  
**PROBLEM:**  
Calls `fs.readFileSync('.env')` without checking file existence, throwing `ENOENT` because `backend/.env` is missing.  
**ROOT CAUSE:**  
Missing environment file existence check.  
**REQUIRED FIX:**  
Check if `.env` exists before reading, and fall back to `../../.env.local` or environment variables:
```javascript
const envPath = fs.existsSync('.env') ? '.env' : fs.existsSync('../.env.local') ? '../.env.local' : null;
if (envPath) dotenv.config({ path: envPath });
```  
**RELATED FILES:**  
- `backend/scripts/import_skills_master.mjs`  
**EXPECTED RESULT:**  
Skills master import script loads credentials from `.env.local` without crashing.  
**VALIDATION:**  
Run `node backend/scripts/import_skills_master.mjs` and verify it connects without `ENOENT`.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-030
**FILE:** `backend/src/academics/academics.service.ts:89`, `migrations/20261021111104_init-peerlearn-schema.sql:120`  
**LOCATION:** `getStudentAttendance`  
**PROBLEM:**  
Inconsistent attendance representation: DB stores numeric percentage, while service attempts to calculate ratio from nonexistent `classes_attended` and `total_classes`.  
**ROOT CAUSE:**  
Model mismatch between fractional attendance and stored percentage.  
**REQUIRED FIX:**  
Directly return stored `attendance_percentage` or add `classes_attended`/`total_classes` columns to schema.  
**RELATED FILES:**  
- `backend/src/academics/academics.service.ts`  
- `migrations/20261021111104_init-peerlearn-schema.sql`  
**EXPECTED RESULT:**  
Attendance displays accurate percentage values in student academic dashboard.  
**VALIDATION:**  
Query `/api/v1/academics/attendance` and verify valid numerical percentage returned.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-031
**FILE:** `app/components/Header.tsx`  
**LOCATION:** Lines 65-95  
**PROBLEM:**  
Unhandled promise rejections occur during realtime notification drops or network errors.  
**ROOT CAUSE:**  
Missing `.catch()` or `try/catch` in async subscription handler.  
**REQUIRED FIX:**  
Wrap notification polling/subscription in comprehensive error handling:
```typescript
try {
  await fetchNotifications();
} catch (err) {
  console.warn('Failed to fetch notifications:', err);
}
```  
**RELATED FILES:**  
- `app/components/Header.tsx`  
**EXPECTED RESULT:**  
Browser console shows no unhandled promise rejection errors.  
**VALIDATION:**  
Disconnect network briefly in browser and verify no uncaught exception is thrown.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-032
**FILE:** `app/components/TutorDashboard.tsx`  
**LOCATION:** Lines 75-90  
**PROBLEM:**  
Pending doubt counter calculates length from the first page of 10 items instead of full count, showing incorrect queue numbers.  
**ROOT CAUSE:**  
Client-side length check on paginated data.  
**REQUIRED FIX:**  
Fetch total count from API header `count` or dedicated `/api/v1/doubts/stats` endpoint.  
**RELATED FILES:**  
- `app/components/TutorDashboard.tsx`  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
Pending queue badge displays total real doubts awaiting resolution.  
**VALIDATION:**  
Seed 15 doubts and verify badge displays "15" instead of "10".  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-033
**FILE:** `backend/src/main.ts`  
**LOCATION:** Lines 15-25  
**PROBLEM:**  
`app.enableCors()` allows all origins by default.  
**ROOT CAUSE:**  
Permissive development default.  
**REQUIRED FIX:**  
Restrict origins to configured domain whitelist:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```  
**RELATED FILES:**  
- `backend/src/main.ts`  
**EXPECTED RESULT:**  
Unauthorized third-party web domains cannot make authenticated cross-origin requests.  
**VALIDATION:**  
Send preflight OPTIONS request from `evil.com` and verify CORS denial.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-034
**FILE:** `backend/src/resources/resources.service.ts`  
**LOCATION:** Lines 110-135  
**PROBLEM:**  
File uploads do not validate MIME types or extensions, allowing potentially malicious files to be uploaded.  
**ROOT CAUSE:**  
Missing server-side MIME type check.  
**REQUIRED FIX:**  
Enforce strict allowlist: `['application/pdf', 'image/jpeg', 'image/png', 'text/plain']`. Reject disallowed MIME types with HTTP 400.  
**RELATED FILES:**  
- `backend/src/resources/resources.service.ts`  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
Only allowed file types can be uploaded.  
**VALIDATION:**  
Attempt to upload an `.exe` file and confirm HTTP 400 Bad Request.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-035
**FILE:** `lib/auth-context.tsx`  
**LOCATION:** Lines 85-110  
**PROBLEM:**  
When token refresh fails, expired tokens are left in `localStorage`, causing endless 401 loops.  
**ROOT CAUSE:**  
Missing storage purge on refresh error.  
**REQUIRED FIX:**  
In `catch` block of token refresh, purge tokens and redirect to login:
```typescript
localStorage.removeItem('peerlearn_token');
localStorage.removeItem('peerlearn_refresh_token');
setUser(null);
```  
**RELATED FILES:**  
- `lib/auth-context.tsx`  
**EXPECTED RESULT:**  
Users with expired tokens are cleanly logged out and prompted to sign in again.  
**VALIDATION:**  
Set expired token in `localStorage`, refresh page, verify redirect to `/login` with clean storage.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-036
**FILE:** `app/login/page.tsx:145`, `app/doubts/page.tsx:210`  
**LOCATION:** JSX template text  
**PROBLEM:**  
Unescaped apostrophes and quotes trigger `react/no-unescaped-entities` lint errors.  
**ROOT CAUSE:**  
Direct raw typography in JSX.  
**REQUIRED FIX:**  
Replace raw `'` with `&apos;` or `{"'"}`.  
**RELATED FILES:**  
- `app/login/page.tsx`  
- `app/doubts/page.tsx`  
**EXPECTED RESULT:**  
JSX complies with React entity escaping rules.  
**VALIDATION:**  
Run `npx eslint app/login/page.tsx` and verify 0 entity warnings.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-037
**FILE:** `app/resources/page.tsx`  
**LOCATION:** Line 185  
**PROBLEM:**  
External links open with `target="_blank"` without `rel="noopener noreferrer"`, exposing security risk.  
**ROOT CAUSE:**  
Omitted security attribute on anchor tags.  
**REQUIRED FIX:**  
Add `rel="noopener noreferrer"` to external anchors.  
**RELATED FILES:**  
- `app/resources/page.tsx`  
**EXPECTED RESULT:**  
External anchors protect `window.opener` context.  
**VALIDATION:**  
Inspect DOM in browser and verify `rel="noopener noreferrer"` attribute is present.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-038
**FILE:** `app/doubts/page.tsx:180`, `app/sessions/page.tsx:95`, `app/components/TodaysPlans.tsx:42`  
**LOCATION:** Date formatting expressions  
**PROBLEM:**  
Inconsistent date rendering across pages (ISO strings vs locale formats).  
**ROOT CAUSE:**  
Lack of shared date utility.  
**REQUIRED FIX:**  
Create shared formatting helper in `lib/utils.ts` (`formatDate(date, format)`) and apply consistently across all pages.  
**RELATED FILES:**  
- `lib/utils.ts`  
- `app/doubts/page.tsx`  
- `app/sessions/page.tsx`  
**EXPECTED RESULT:**  
Unified date and time representation across all frontend views.  
**VALIDATION:**  
Inspect date displays across Doubts, Sessions, and Plans to ensure visual uniformity.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-039
**FILE:** `app/globals.css`  
**LOCATION:** Lines 1-40  
**PROBLEM:**  
Unused custom CSS classes and duplicate directive styles bloat the CSS bundle.  
**ROOT CAUSE:**  
Template artifacts.  
**REQUIRED FIX:**  
Prune unused utility classes in `globals.css` and rely on Tailwind utility classes.  
**RELATED FILES:**  
- `app/globals.css`  
**EXPECTED RESULT:**  
Cleaner, smaller global CSS file.  
**VALIDATION:**  
Verify styles build without missing classes and page appearance remains intact.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-040
**FILE:** `app/components/Header.tsx:120`, `app/profile/page.tsx:85`  
**LOCATION:** Avatar `<Image>` and `<img>` tags  
**PROBLEM:**  
Missing or empty `alt` attributes violate accessibility standards.  
**ROOT CAUSE:**  
Omitted accessibility attributes.  
**REQUIRED FIX:**  
Add descriptive `alt` tags: `alt={student?.full_name ? \`\${student.full_name}'s avatar\` : 'Student profile avatar'}`.  
**RELATED FILES:**  
- `app/components/Header.tsx`  
- `app/profile/page.tsx`  
**EXPECTED RESULT:**  
Screen readers accurately announce avatar images.  
**VALIDATION:**  
Run accessibility audit or inspect HTML elements.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-041
**FILE:** `lib/api.ts`  
**LOCATION:** Lines 55-70  
**PROBLEM:**  
`fetchClient` attempts `response.json()` on HTTP 204 No Content responses, causing parsing errors.  
**ROOT CAUSE:**  
Missing status code check before JSON decoding.  
**REQUIRED FIX:**  
Check `response.status === 204` and return null or empty object without calling `.json()`:
```typescript
if (response.status === 204) return null;
return await response.json();
```  
**RELATED FILES:**  
- `lib/api.ts`  
**EXPECTED RESULT:**  
204 responses resolve cleanly without syntax exceptions.  
**VALIDATION:**  
Call an endpoint returning 204 and verify no JSON parse error is logged.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-042
**FILE:** `migrations/20261021111104_init-peerlearn-schema.sql`  
**LOCATION:** Line 65  
**PROBLEM:**  
`doubt_answers.doubt_id` foreign key lacks an index, leading to table scans when fetching doubt answers.  
**ROOT CAUSE:**  
Index omitted in initial migration.  
**REQUIRED FIX:**  
Create migration adding index:
`CREATE INDEX IF NOT EXISTS idx_doubt_answers_doubt_id ON doubt_answers(doubt_id);`  
**RELATED FILES:**  
- `migrations/20261021111104_init-peerlearn-schema.sql`  
**EXPECTED RESULT:**  
Answer lookups execute via index scan rather than sequential table scan.  
**VALIDATION:**  
Run `EXPLAIN ANALYZE SELECT * FROM doubt_answers WHERE doubt_id = '...'` and verify index scan.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-043
**FILE:** `app/api/v1/[...path]/route.ts`  
**LOCATION:** Lines 165, 340, 520  
**PROBLEM:**  
`console.log` statements output full headers, bodies, and tokens in server console logs.  
**ROOT CAUSE:**  
Development debugging left in place.  
**REQUIRED FIX:**  
Remove or replace with a structured logger that sanitizes authorization headers and sensitive credentials.  
**RELATED FILES:**  
- `app/api/v1/[...path]/route.ts`  
**EXPECTED RESULT:**  
Server logs do not leak credentials or flood the terminal.  
**VALIDATION:**  
Execute request and verify clean, non-sensitive log output.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-044
**FILE:** `app/layout.tsx`  
**LOCATION:** Lines 20-35  
**PROBLEM:**  
Layout metadata references icon files that do not exist in `public/`, triggering 404 console errors in browser.  
**ROOT CAUSE:**  
Missing static icon files.  
**REQUIRED FIX:**  
Provide default `favicon.ico` and icon assets in `public/` directory or remove icon references from metadata.  
**RELATED FILES:**  
- `app/layout.tsx`  
**EXPECTED RESULT:**  
Browser requests for favicon succeed without 404 errors.  
**VALIDATION:**  
Open app in browser and verify no 404 favicon requests in network tab.  
**FIX DEPENDENCIES:**  
None.

---

### ERROR ID: ERR-045
**FILE:** `backend/src/students/interfaces/student.interface.ts`  
**LOCATION:** Line 18  
**PROBLEM:**  
Department name spelling differs between backend interface enums and frontend dropdowns, causing validation failures.  
**ROOT CAUSE:**  
Unsynchronized enum definitions.  
**REQUIRED FIX:**  
Standardize department names to exact match: `'Computer Science & Engineering'`, `'Electronics & Communication Engineering'`, `'Mechanical Engineering'`, `'Design'`, `'Natural Sciences'`.  
**RELATED FILES:**  
- `backend/src/students/interfaces/student.interface.ts`  
- `app/profile/page.tsx`  
- `app/login/page.tsx`  
**EXPECTED RESULT:**  
Selected department values validate cleanly across frontend and backend.  
**VALIDATION:**  
Update student department on profile and verify successful save without validation errors.  
**FIX DEPENDENCIES:**  
None.

---
*Report generated and validated autonomously by Senior Code Auditor & QA Engineer.*
