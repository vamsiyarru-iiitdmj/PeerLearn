# PeerLearn Security & Privacy Architecture

## 1. Identity & Registration Hard Rules

- **Zero Unverified Accounts:** A user cannot obtain a `students` profile merely by creating an account. The backend verifies their roll number in `academic_records`, validates the `@iiitdmj.ac.in` domain, and checks the 6-digit email OTP before inserting any row into `students`.
- **Unique Student Constraints:**
  - `UNIQUE(roll_number)`
  - `UNIQUE(institute_email)`
  - `UNIQUE(auth_user_id)`

## 2. Row Level Security (RLS)

All user-owned tables have Row Level Security enabled in PostgreSQL:
- Students can only view and update their own profile, private buckets, resources, and planner tasks.
- Academic records are read-only for students; modifications are strictly reserved for administrative CSV imports.
- Tutors can only view doubts matching their verified pro skills.
- Sessions can only be viewed by the participating student, tutor, or designated replacement tutor.

## 3. Confidential Rating Privacy & Anti-Abuse

- **Private Feedback:** Individual ratings and feedback are **never** returned to the tutor. Tutors only see aggregated, smoothed proficiency scores released on a weekly schedule.
- **Unconfirmed Session Filtering:** Ratings where `did_session_happen = false` are flagged and excluded from the tutor's proficiency score.
- **Single Vote / Rating Enforcement:**
  - `UNIQUE(session_id, student_id)` on `session_ratings`
  - `UNIQUE(proposal_id, voter_id)` on `resource_votes`
- **Contributor Self-Vote Denial:** Contributors cannot vote on their own shared resource proposals.

## 4. Privacy-Preserving Analytics (k-Anonymity)

- Academic grades (CPI, CGPA) are **never** returned in analytics endpoints.
- Any cohort grouping (e.g. branch, year of study) with fewer than 10 participating students is automatically suppressed (`isSuppressedForPrivacy = true`, `count = null`) to prevent deanonymization.

## 5. Network & HTTP Hardening

- **Helmet:** Secure HTTP response headers (Content-Security-Policy, HSTS, X-Content-Type-Options).
- **Throttling:** Stricter rate limits on authentication, OTP generation, and doubt creation using `@nestjs/throttler`.
- **Validation Pipe:** Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` to prevent mass-assignment attacks.
- **Secret Isolation:** `INSFORGE_API_KEY` is exclusively read on the server side and never bundled into frontend assets or client responses.
