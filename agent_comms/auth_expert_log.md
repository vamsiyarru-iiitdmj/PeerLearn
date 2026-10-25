# Authentication Expert Log
**Stream:** Authentication Robustness & Identity Validation
**Status:** COMPLETED

## Enhancements & Fixes
1. **Roll Number Format Realignment**:
   - Updated placeholder from legacy `2022CSE001` to official IIITDMJ student convention `25BCS270`.
   - Added breakdown guide for users:
     - First 2 digits: Year (e.g. `25`)
     - Middle letters: Branch (e.g. `BCS` for CSE, `BME`, `ECE`)
     - Last 3 digits: Specific Roll Number (e.g. `270`)
   - Added automatic email generation: typing `25BCS270` pre-populates `25bcs270@iiitdmj.ac.in`.
2. **Error Handling & Elimination of 500s**:
   - Refactored `lib/api.ts` error processor:
     - Unpacks array-based class-validator error messages cleanly (`msg.join("; ")`).
     - Detects disconnected backend proxy scenarios and translates them into actionable guidance:
       *"The backend server is temporarily unavailable or restarting. Please try again in a moment."*
     - Replaces unhelpful 500 messages with direct user feedback.
   - Enhanced `login()` in `backend/src/auth/auth.service.ts` to return strict `401 Unauthorized` with friendly guidance on invalid password or missing user profile.
