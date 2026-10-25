# PeerLearn Backend API (NestJS + InsForge)

Production-quality backend service for **PeerLearn**, the collaborative peer tutoring platform for IIITDMJ.

## Tech Stack & Architecture

- **Runtime:** Node.js 22 LTS / 24
- **Framework:** NestJS 12.2.0 (Strictly modular: `auth`, `students`, `academics`, `skills`, `doubts`, `matching`, `sessions`, `ratings`, `tutors`, `resources`, `planner`, `analytics`, `notifications`)
- **Backend as a Service:** [InsForge](https://insforge.dev) (`@insforge/sdk` 1.5.2)
- **Database:** PostgreSQL on InsForge Cloud with Row-Level Security (RLS) & transactional RPC functions
- **Documentation:** OpenAPI / Swagger (`/api/docs`)
- **Security:** Helmet, Cookie-Parser, Throttling / Rate-Limiting, Class-Validator DTO pipes

---

## Key Business Logic & Hard Rules Enforced

1. **Strict 4-Step Identity Verification:**
   - No `students` application record can exist merely from signing up.
   - Verification flow: Official Academic Record check + `@iiitdmj.ac.in` domain verification + OTP verification + Registration finalize = Application Student record.
2. **Atomic One-Winner Booking:**
   - Row-level lock (`FOR UPDATE`) via PostgreSQL RPC `book_doubt_atomic` prevents race conditions when multiple tutors try to book the same doubt simultaneously. Exactly one tutor succeeds; competing tutors receive HTTP 409 Conflict.
3. **Multi-Tag Matching:**
   - Routes doubts only to tutors who possess **ALL** tagged pro skills via `get_matching_doubts_for_tutor`.
4. **Confidential Private Ratings:**
   - Ratings are strictly private. Tutors never see individual ratings or student identities.
   - Released in weekly batches; weekly scores recomputed with Bayesian smoothing and volume caps.
5. **Democratic Shared Resources:**
   - Proposing resources into batch/department pools triggers a 24-hour voting window.
   - Contributors cannot vote on their own proposals. Minimum 3 approval votes with majority promotes proposal to the shared library.
6. **Privacy-Preserving Analytics:**
   - Individual grades/CPI are never exposed.
   - Cohorts with $< 10$ participating students are automatically suppressed to ensure k-anonymity.

---

## Setup & Running

```bash
cd backend
npm install
npm run build
npm start
```

For development with hot reload:
```bash
npm run start:dev
```

### Running Tests

```bash
npm run test
```

### API Documentation

Visit [http://localhost:3001/api/docs](http://localhost:3001/api/docs) to view the interactive Swagger interface.
