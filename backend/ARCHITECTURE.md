# PeerLearn System Architecture

## Overview

PeerLearn connects student learners with peer student tutors in a collaborative learning network. Built for IIITDMJ with a collegiate editorial design ("Academic Quietude"), its backend combines **NestJS** for application business logic and **InsForge** for managed backend infrastructure (PostgreSQL, Authentication, Realtime, and File Storage).

```text
React / Next.js Frontend
       |
       | HTTPS REST / JSON
       v
NestJS Application Layer
       |
       +---> InsForge User Client (User-scoped via JWT / Access Token, enforcing RLS)
       |
       +---> InsForge Admin Client (Privileged operations, academic verification, score aggregation)
       |
       +---> InsForge PostgreSQL Database (24 tables, Row-Level Security, RPC functions)
       |
       +---> InsForge Storage (Private and shared study notes, PDFs, photos)
       |
       +---> InsForge Realtime (Live session chat, instant doubt matching notifications)
```

## Architectural Pillars

### 1. Separation of Concerns
- **NestJS owns application business rules:**
  - Strict 4-step identity verification against academic records.
  - State machine transitions (Doubt: `OPEN` -> `BOOKED` -> `COMPLETED_PENDING_CONFIRMATION` -> `SOLVED`).
  - Session replacement and dispute workflows.
  - Confidential rating privacy masking.
  - Analytical cohort suppression.
- **InsForge owns infrastructure:**
  - PostgreSQL hosting with high-performance indexes.
  - Distributed token authentication & email OTP delivery.
  - Object storage for notes and PYQs.
  - Realtime WebSockets pub/sub.

### 2. Transaction Safety & Atomic Booking
Competing tutors attempting to book an open doubt are serialized directly inside PostgreSQL using `SELECT ... FOR UPDATE` row locks within `book_doubt_atomic()`. This guarantees that double booking is physically impossible.

### 3. Strict Identity Distinction
An InsForge authentication user identity is distinct from a `students` application record. No student record is ever created until:
1. Roll number matches authoritative `academic_records`.
2. Institute email matches domain `@iiitdmj.ac.in`.
3. 6-digit OTP is verified.
4. Registration flow finishes with password setup.

### 4. Zero ORM Overhead
Instead of Prisma or TypeORM maintaining a separate schema layer, PeerLearn leverages `@insforge/sdk` and native SQL functions.
