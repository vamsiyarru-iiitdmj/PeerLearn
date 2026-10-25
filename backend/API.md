# PeerLearn REST API Specification (`/api/v1`)

## Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register/start` | Public | Verify roll number against academic records & dispatch OTP to institute email |
| `POST` | `/api/v1/auth/register/verify` | Public | Validate OTP and finalize verified student profile creation |
| `POST` | `/api/v1/auth/login` | Public | Authenticate student via institute email & password |
| `POST` | `/api/v1/auth/logout` | Auth | Invalidate session token |
| `POST` | `/api/v1/auth/forgot-password` | Public | Request password reset token |
| `POST` | `/api/v1/auth/reset-password` | Public | Set new password with token |
| `GET` | `/api/v1/auth/session` | Auth | Get current authenticated user session |

## Student Profile (`/api/v1/me`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/me` | Auth | Get student basic info |
| `GET` | `/api/v1/me/profile` | Auth | Detailed profile with sem-wise CPI, Target CGPA & required CPI |
| `PATCH` | `/api/v1/me/profile` | Auth | Update optional fields (phone, photoUrl) |
| `GET` | `/api/v1/me/academics` | Auth | Authoritative semester results |
| `PATCH` | `/api/v1/me/target` | Auth | Update target CGPA & recompute required CPI |

## Skills (`/api/v1/skills`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/skills` | Public | Catalog of active subject skills |
| `GET` | `/api/v1/me/skills` | Auth | Student's known skills |
| `POST` | `/api/v1/me/skills` | Auth | Add skill to student profile |
| `DELETE` | `/api/v1/me/skills/:id` | Auth | Remove skill from student profile |
| `GET` | `/api/v1/tutor/pro-skills` | Auth | Tutor's configured pro skills for matching |
| `PUT` | `/api/v1/tutor/pro-skills` | Auth | Set/replace all tutor pro skills |
| `POST` | `/api/v1/tutor/pro-skills` | Auth | Add single pro skill |
| `DELETE` | `/api/v1/tutor/pro-skills/:id` | Auth | Remove pro skill |

## Doubts & Matching (`/api/v1/doubts`, `/api/v1/matching`, `/api/v1/tutor`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/doubts` | Auth | Post new doubt with skill tags |
| `GET` | `/api/v1/doubts` | Auth | Student doubts (filter: tab=all/solved/unsolved, tagId) |
| `GET` | `/api/v1/doubts/:id` | Auth | Get doubt details |
| `POST` | `/api/v1/doubts/:id/withdraw` | Auth | Withdraw open doubt |
| `PATCH` | `/api/v1/doubts/:id/expiry` | Auth | Extend doubt expiry |
| `POST` | `/api/v1/matching/tag-stats` | Public | Calculate eligible tutors, avg & max proficiency for selected tags |
| `GET` | `/api/v1/tutor/doubts` | Auth | Matching doubts inbox for tutor (strict ALL-tags matching) |

## Sessions & Chat (`/api/v1/sessions`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/doubts/:id/book` | Auth | Atomic booking of open doubt by tutor |
| `GET` | `/api/v1/sessions` | Auth | List sessions for student or tutor |
| `GET` | `/api/v1/sessions/:id` | Auth | Session details (ratings omitted for tutor) |
| `POST` | `/api/v1/sessions/:id/complete` | Auth | Tutor marks session complete |
| `POST` | `/api/v1/sessions/:id/confirm` | Auth | Student confirms session took place |
| `POST` | `/api/v1/sessions/:id/request-replacement` | Auth | Tutor records replacement request |
| `POST` | `/api/v1/sessions/:id/messages` | Auth | Send chat message |
| `GET` | `/api/v1/sessions/:id/messages` | Auth | Chat history |

## Ratings (`/api/v1/ratings`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/sessions/:id/rating` | Auth | Submit confidential rating (1-5, feedback, didSessionHappen) |
| `POST` | `/api/v1/ratings/recompute-weekly` | Admin/Cron | Recompute weekly Bayesian tutor scores & release ratings |

## Resources (`/api/v1/resources`, `/api/v1/shared-resources`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/resources` | Auth | Student private buckets (grouped: pdfs, links, photos, text) |
| `POST` | `/api/v1/resources/buckets` | Auth | Create private bucket |
| `POST` | `/api/v1/resources` | Auth | Add item to private bucket |
| `DELETE` | `/api/v1/resources/:id` | Auth | Delete resource |
| `GET` | `/api/v1/shared-resources` | Public | Community shared buckets (PYQs, coding, dev) |
| `GET` | `/api/v1/shared-resources/proposals` | Public | Active proposals in 24h voting window |
| `POST` | `/api/v1/shared-resources/proposals` | Auth | Propose shared resource/bucket |
| `POST` | `/api/v1/shared-resources/proposals/:id/vote` | Auth | Cast vote (contributor cannot vote on own proposal) |

## Planner & Ask Suggestion (`/api/v1/tasks`, `/api/v1/suggestions`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/tasks` | Auth | Student planner tasks & subtasks |
| `POST` | `/api/v1/tasks` | Auth | Create task |
| `POST` | `/api/v1/tasks/:id/complete` | Auth | Toggle completion |
| `POST` | `/api/v1/tasks/:id/toggle-tough` | Auth | Toggle tough task flag |
| `DELETE` | `/api/v1/tasks/:id` | Auth | Delete task |
| `POST` | `/api/v1/tasks/:id/ask-suggestion` | Auth | Request tutor study workflow guidance |
| `GET` | `/api/v1/suggestions` | Auth | Open suggestion requests for tutors |
| `POST` | `/api/v1/suggestions/:id/respond` | Auth | Tutor provides actionable step-by-step plan |
| `POST` | `/api/v1/suggestions/:id/use-plan` | Auth | Student adopts plan (turns steps into task subtasks) |

## Campus Analytics (`/api/v1/analytics`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/overview` | Public | Doubts asked, solved %, active tutors, shared resources |
| `GET` | `/api/v1/analytics/doubts-by-month` | Public | Monthly volume trends |
| `GET` | `/api/v1/analytics/doubts-by-skill` | Public | Hardest topics by tag volume |
| `GET` | `/api/v1/analytics/doubts-by-year` | Public | Year distribution (suppressed if cohort < 10) |
| `GET` | `/api/v1/analytics/tutor-supply` | Public | Supply vs demand per skill |

## Health (`/api/v1/health`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | System and InsForge connectivity check |
