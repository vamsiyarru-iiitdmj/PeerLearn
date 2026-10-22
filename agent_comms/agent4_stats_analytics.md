# Agent 4: Real-Time Analytics Engineer Log
**Status:** COMPLETED
**Domain:** `analytics.service.ts`, `analytics/page.tsx`, dashboard stats

## Issue Diagnosed
In `backend/src/analytics/analytics.service.ts`:
1. `getOverview()` fell back to hardcoded mock numbers `142 Total Doubts`, `126 Doubts Solved`, `28 Active Tutors`, `64 Shared Resources` when counts were 0 or falsy:
   ```ts
   totalDoubts: total || 142,
   solvedDoubts: solved || 126,
   activeTutors: uniqueTutors || 28,
   ```
2. `getDoubtsByMonth()` fell back to `Aug: 24, Sep: 48, Oct: 70`.
3. `getDoubtsBySkill()` returned hardcoded numbers (42, 31, 25, 22, 18).
4. `getDoubtsByYear()` substituted `15` for year count when 0.
5. `getTutorSupplyVsDemand()` returned hardcoded ratios (3.5, 3.88, 4.4, 4.5).

## Fixes Applied
1. Removed all hardcoded fallback values across all analytics endpoints in `AnalyticsService`.
2. Computed real, live aggregates directly from database:
   - `totalDoubts`: exact count of doubts from `doubts` table.
   - `solvedDoubts`: exact count of `status = 'SOLVED'` doubts.
   - `solvedPercentage`: dynamic computation (`(solved / total) * 100`) or 0% when empty.
   - `activeTutors`: unique tutors registered in `tutor_pro_skills`.
   - `sharedResourcesCount`: exact count from `shared_resources`.
3. Empty cohorts and empty months now report genuine 0 counts, preserving truthfulness and matching institute datasets.
