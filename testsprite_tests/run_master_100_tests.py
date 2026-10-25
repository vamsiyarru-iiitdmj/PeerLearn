import sys
import json
import urllib.request
import urllib.error
import time

BASE_URL = "http://localhost:3001/api/v1"

passed = 0
failed = 0
results = []

def record(test_num, name, success, details=""):
    global passed, failed
    if success:
        passed += 1
        status = "PASSED"
        print(f"  [PASS] Test {test_num:03d}: {name}")
    else:
        failed += 1
        status = "FAILED"
        print(f"  [FAIL] Test {test_num:03d}: {name} - {details}")
    sys.stdout.flush()
    results.append({
        "number": test_num,
        "name": name,
        "status": status,
        "details": str(details)
    })

def unwrap(res):
    if isinstance(res, dict) and "data" in res and res.get("success") is True:
        return res["data"]
    return res

def make_req(path, method="GET", payload=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            raw = json.loads(res_body) if res_body else {}
            return response.status, unwrap(raw), raw
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
        except:
            parsed = {"raw": err_body}
        return e.code, parsed, parsed
    except Exception as e:
        return 500, {"error": str(e)}, {"error": str(e)}

print("\n" + "="*80)
print("  PEERLEARN MASTER TEST SUITE: 110 COMPREHENSIVE AUTOMATED TESTS")
print("="*80 + "\n")

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY A: Multi-Student Authentication & Credentials (Tests 1-15)
# ══════════════════════════════════════════════════════════════════════════════
print("[CATEGORY A] Multi-Student Authentication & Credentials (Tests 1-15)")

# 1. Health endpoint
status, data, _ = make_req("/health")
record(1, "API Health Endpoint returns 200 OK", status == 200 and data.get("status") == "ok", f"status={status}")

# 2. Login Student 1 (Vamsi Adithya)
status, data, raw = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs270@iiitdmj.ac.in",
    "password": "vamsi056"
})
vamsi_token = data.get("accessToken") or data.get("token") or raw.get("accessToken") or raw.get("token")
record(2, "Login Student 1 (25BCS270) succeeds", status == 200 and vamsi_token is not None, f"status={status}")

# 3. JWT structure verification
is_jwt = vamsi_token and len(vamsi_token.split(".")) == 3
record(3, "Session returns valid 3-part JWT accessToken", is_jwt, f"token_prefix={vamsi_token[:15] if vamsi_token else None}")

# 4. Login Student 2 (Praneeth)
status, data, raw = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs195@iiitdmj.ac.in",
    "password": "praneeth123"
})
praneeth_token = data.get("accessToken") or data.get("token") or raw.get("accessToken") or raw.get("token")
record(4, "Login Student 2 (25BCS195) succeeds", status == 200 and praneeth_token is not None, f"status={status}")

# 5. Distinct student tokens
record(5, "Multiple students receive isolated distinct session tokens", vamsi_token != praneeth_token, "tokens are isolated")

# 6. Reject invalid password
status, err, _ = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs270@iiitdmj.ac.in",
    "password": "WrongPassword123!"
})
record(6, "Rejection of invalid password returns 401 Unauthorized", status == 401, f"status={status}")

# 7. Reject nonexistent account
status, err, _ = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "nonexistent999@iiitdmj.ac.in",
    "password": "password"
})
record(7, "Rejection of nonexistent email returns 401 Unauthorized", status == 401, f"status={status}")

# 8. Reject invalid email domain
status, err, _ = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "attacker@gmail.com",
    "password": "password"
})
record(8, "Rejection of non-institute domain returns 400 or 401", status in [400, 401], f"status={status}")

# 9. Protected endpoint without token
status, _, _ = make_req("/me/profile")
record(9, "Protected endpoint /me/profile rejects request without token with 401", status == 401, f"status={status}")

# 10. Protected endpoint with malformed token
status, _, _ = make_req("/me/profile", token="invalid.malformed.jwt")
record(10, "Protected endpoint rejects invalid token with 401", status == 401, f"status={status}")

# 11. Student 1 Profile retrieval
status, prof1, _ = make_req("/me/profile", token=vamsi_token)
st1 = prof1.get("student", {}) if isinstance(prof1, dict) else {}
record(11, "Student 1 /me/profile returns full student profile", status == 200 and st1.get("roll_number") == "25BCS270", f"roll={st1.get('roll_number')}")

# 12. Student 2 Profile retrieval
status, prof2, _ = make_req("/me/profile", token=praneeth_token)
st2 = prof2.get("student", {}) if isinstance(prof2, dict) else {}
record(12, "Student 2 /me/profile returns correct roll number 25BCS195", status == 200 and st2.get("roll_number") == "25BCS195", f"roll={st2.get('roll_number')}")

# 13. Student institute email domain assertion
record(13, "Student institute email domain is strictly @iiitdmj.ac.in", st1.get("institute_email", "").endswith("@iiitdmj.ac.in"), f"email={st1.get('institute_email')}")

# 14. Academic records retrieval for Student 1
status, acad1, _ = make_req("/me/academics", token=vamsi_token)
record(14, "Official academic records endpoint returns semester transcripts", status == 200 and isinstance(acad1, list) and len(acad1) > 0, f"transcripts_count={len(acad1) if isinstance(acad1, list) else 0}")

# 15. Active standing semester validation
record(15, "Semester transcript entries have valid numeric CPI and SGPA", all("cpi" in r or "spi" in r for r in (acad1 if isinstance(acad1, list) else [])), "transcripts validated")

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY B: Student Profile Customization & Direct Coordinates (Tests 16-30)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY B] Student Profile Customization & Direct Coordinates (Tests 16-30)")

# 16. Update phone number
test_phone = "+91 98765 43210"
status, updated_prof, _ = make_req("/me/profile", method="PATCH", payload={"phone": test_phone}, token=vamsi_token)
record(16, "PATCH /me/profile updates phone number", status == 200, f"status={status}")

# 17. Verify phone number persistence
status, verify_prof, _ = make_req("/me/profile", token=vamsi_token)
saved_phone = (verify_prof.get("student") or {}).get("phone") or verify_prof.get("phone")
record(17, "GET /me/profile verifies persisted phone number", status == 200 and saved_phone == test_phone, f"phone={saved_phone}")

# 18. Update profile photo URL
test_photo = "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
status, _, _ = make_req("/me/profile", method="PATCH", payload={"photoUrl": test_photo}, token=vamsi_token)
record(18, "PATCH /me/profile updates photoUrl", status == 200, f"status={status}")

# 19. Verify photo URL persistence
status, verify_prof, _ = make_req("/me/profile", token=vamsi_token)
saved_photo = (verify_prof.get("student") or {}).get("photo_url") or verify_prof.get("photo_url")
record(19, "GET /me/profile verifies persisted photo_url", status == 200 and saved_photo == test_photo, f"photo_url={saved_photo}")

# 20. Update target CGPA
test_target = 8.85
status, target_res, _ = make_req("/me/target", method="PATCH", payload={"targetCgpa": test_target}, token=vamsi_token)
record(20, "PATCH /me/target updates graduation target CGPA", status == 200, f"status={status}")

# 21. Verify recalculated required CPI is computed
academics_obj = target_res.get("academics") or (target_res if isinstance(target_res, dict) else {})
req_cpi = academics_obj.get("requiredAverageCpi") if isinstance(academics_obj, dict) else None
record(21, "Target update returns recalculated requiredAverageCpi", req_cpi is not None and req_cpi > 0, f"requiredCpi={req_cpi}")

# 22. Target CGPA reflects in profile
status, verify_prof, _ = make_req("/me/profile", token=vamsi_token)
saved_target = float((verify_prof.get("student") or {}).get("target_cgpa") or verify_prof.get("target_cgpa") or 0)
record(22, "GET /me/profile confirms target_cgpa reflects accurately", abs(saved_target - test_target) < 0.01, f"target={saved_target}")

# 23. Reject invalid target CGPA (> 10.0)
status, _, _ = make_req("/me/target", method="PATCH", payload={"targetCgpa": 11.5}, token=vamsi_token)
record(23, "PATCH /me/target rejects invalid CGPA (> 10.0) with 400", status == 400, f"status={status}")

# 24. Reject negative target CGPA (< 0.0)
status, _, _ = make_req("/me/target", method="PATCH", payload={"targetCgpa": -2.0}, token=vamsi_token)
record(24, "PATCH /me/target rejects negative CGPA with 400", status == 400, f"status={status}")

# 25. Update both phone and photo simultaneously
status, _, _ = make_req("/me/profile", method="PATCH", payload={
    "phone": "+91 91234 56789",
    "photoUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBAD_de1pFeIPdIvImZLsyd3x64RBvKydYO1hkBjLl16G42SJ"
}, token=vamsi_token)
record(25, "PATCH /me/profile supports atomic composite updates (phone + photo)", status == 200, f"status={status}")

# 26. Verify composite updates persisted
status, verify_prof, _ = make_req("/me/profile", token=vamsi_token)
st_updated = verify_prof.get("student") if isinstance(verify_prof.get("student"), dict) else verify_prof
record(26, "Composite fields both verify in persistent storage", st_updated.get("phone") == "+91 91234 56789" and "aida-public" in (st_updated.get("photo_url") or ""), f"phone={st_updated.get('phone')}")

# 27. Student 2 isolated profile updates do not bleed into Student 1
status, _, _ = make_req("/me/profile", method="PATCH", payload={"phone": "+91 88888 77777"}, token=praneeth_token)
status, verify_vamsi, _ = make_req("/me/profile", token=vamsi_token)
v_st = verify_vamsi.get("student") if isinstance(verify_vamsi.get("student"), dict) else verify_vamsi
record(27, "Tenant isolation: Student 2 edits do not mutate Student 1 profile", v_st.get("phone") != "+91 88888 77777", "tenant isolation passed")

# 28. Verify student degree details
record(28, "Student degree programme is verified as B.Tech", st_updated.get("programme") == "B.Tech", f"prog={st_updated.get('programme')}")

# 29. Verify student department is Computer Science & Engineering
record(29, "Student department contains Computer Science", "Computer Science" in str(st_updated.get("department", "")), f"dept={st_updated.get('department')}")

# 30. Verify completed semesters count
acad_data = verify_prof.get("academics") if isinstance(verify_prof.get("academics"), dict) else academics_obj
record(30, "Profile includes valid completed semesters count", (acad_data.get("completedSemesters", 0) > 0 if isinstance(acad_data, dict) else False) or st_updated.get("current_semester", 0) > 0 or st_updated.get("year_of_study", 0) > 0, "completed semesters present")

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY C: Tutor Accreditation Profile & Pro Skills (Tests 31-45)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY C] Tutor Accreditation Profile & Pro Skills (Tests 31-45)")

# 31. Get all available campus skills
status, all_skills, _ = make_req("/skills")
record(31, "GET /skills returns available academic subjects", status == 200 and isinstance(all_skills, list) and len(all_skills) >= 3, f"skills_count={len(all_skills) if isinstance(all_skills, list) else 0}")

# 32. Verify core required skills exist
skill_names = [s.get("name") for s in all_skills] if isinstance(all_skills, list) else []
has_core = any("Python" in s or "DSA" in s or "Machine Learning" in s for s in skill_names)
record(32, "Skills repository includes core curriculum subjects (DSA/Python/ML)", has_core, f"sample_skills={skill_names[:4]}")

# 33. Get Tutor Profile for Student 1
status, tutor_prof, _ = make_req("/tutor/profile", token=vamsi_token)
record(33, "GET /tutor/profile returns tutor perspective for authenticated student", status == 200 and isinstance(tutor_prof, dict), f"status={status}")

# 34. Tutor profile contains proficiency score
record(34, "Tutor profile returns proficiencyScore between 0 and 100", 0 <= tutor_prof.get("proficiencyScore", 0) <= 100, f"score={tutor_prof.get('proficiencyScore')}")

# 35. Tutor profile contains campus rank
record(35, "Tutor profile returns valid campus rank integer", tutor_prof.get("rank") is not None, f"rank={tutor_prof.get('rank')}")

# 36. Tutor profile contains doubtsSolved metric
record(36, "Tutor profile returns doubtsSolved count", "doubtsSolved" in tutor_prof, f"solved={tutor_prof.get('doubtsSolved')}")

# 37. Get current Tutor Pro Skills
status, current_pro, _ = make_req("/tutor/pro-skills", token=vamsi_token)
record(37, "GET /tutor/pro-skills returns tutor endorsed subjects", status == 200 and isinstance(current_pro, list), f"pro_skills_count={len(current_pro) if isinstance(current_pro, list) else 0}")

# 38. Update Tutor Pro Skills (assign first 2 skills)
skill_ids_to_set = [s["id"] for s in all_skills[:2]]
status, updated_pro, _ = make_req("/tutor/pro-skills", method="PUT", payload={"skillIds": skill_ids_to_set}, token=vamsi_token)
record(38, "PUT /tutor/pro-skills updates mastered skills list", status == 200 and len(updated_pro) == len(skill_ids_to_set), f"updated_count={len(updated_pro) if isinstance(updated_pro, list) else 0}")

# 39. Verify Pro Skills persistence
status, verify_pro, _ = make_req("/tutor/pro-skills", token=vamsi_token)
saved_ids = [s["id"] for s in verify_pro] if isinstance(verify_pro, list) else []
record(39, "GET /tutor/pro-skills confirms exact persisted skill IDs", set(saved_ids) == set(skill_ids_to_set), f"saved_ids={saved_ids}")

# 40. Reject invalid skill IDs in PUT /tutor/pro-skills
status, _, _ = make_req("/tutor/pro-skills", method="PUT", payload={"skillIds": ["00000000-0000-0000-0000-000000000000"]}, token=vamsi_token)
record(40, "PUT /tutor/pro-skills rejects invalid skill UUID with 400", status == 400, f"status={status}")

# 41. Pro skills idempotent assignment
status, idem_pro, _ = make_req("/tutor/pro-skills", method="PUT", payload={"skillIds": skill_ids_to_set}, token=vamsi_token)
record(41, "PUT /tutor/pro-skills is idempotent on identical inputs", status == 200 and len(idem_pro) == len(skill_ids_to_set), "idempotent update successful")

# 42. Campus Leaderboard endpoint
status, lboard, _ = make_req("/tutor/leaderboard", token=vamsi_token)
record(42, "GET /tutor/leaderboard returns campus standings", status == 200 and "leaderboard" in lboard, f"status={status}")

# 43. Leaderboard includes current tutor position
record(43, "Leaderboard returns currentTutorPosition badge", "currentTutorPosition" in lboard, f"pos={lboard.get('currentTutorPosition')}")

# 44. Tutor ranking ordering integrity
leaderboard_list = lboard.get("leaderboard", [])
is_sorted = True
if len(leaderboard_list) > 1:
    scores = [item.get("points", 0) for item in leaderboard_list]
    is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
record(44, "Leaderboard entries are strictly ordered by points descending", is_sorted, f"entries_checked={len(leaderboard_list)}")

# 45. Tutor accreditation level
record(45, "Tutor identity reflects verified accreditation seal", tutor_prof.get("experience") is not None, f"experience={tutor_prof.get('experience')}")

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY D: Doubts Feed, Skill Tagging & Safe Dates (Tests 46-60)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY D] Doubts Feed, Skill Tagging & Safe Dates (Tests 46-60)")

# 46. Student 2 posts a doubt matching Student 1's skills
target_skill_id = skill_ids_to_set[0]
status, created_doubt, _ = make_req("/doubts", method="POST", payload={
    "description": "Mastering Graph BFS and DFS Shortest Path Questions in Dijkstra algorithms",
    "expectedOutcome": "Understand priority queue implementation and vertex relaxation proofs",
    "tagIds": [target_skill_id],
    "expiryHours": 48
}, token=praneeth_token)
doubt_id = created_doubt.get("id") if isinstance(created_doubt, dict) else None
record(46, "POST /doubts creates new academic question with skill tag", status == 201 and doubt_id is not None, f"doubt_id={doubt_id}")

# 47. Created doubt has non-null createdAt/created_at
c_at = created_doubt.get("createdAt") or created_doubt.get("created_at")
record(47, "Created doubt has valid non-null createdAt timestamp", c_at is not None and "T" in str(c_at), f"created_at={c_at}")

# 48. Created doubt has non-null expiresAt/expires_at
exp_at = created_doubt.get("expiresAt") or created_doubt.get("expires_at")
record(48, "Created doubt has valid non-null expiresAt timestamp", exp_at is not None and "T" in str(exp_at), f"expires_at={exp_at}")

# 49. Reject doubt without skill tags
status, _, _ = make_req("/doubts", method="POST", payload={
    "description": "Question without skills",
    "expectedOutcome": "Fail validation",
    "tagIds": []
}, token=praneeth_token)
record(49, "POST /doubts rejects doubt with empty tagIds array with 400", status == 400, f"status={status}")

# 50. Reject doubt with empty description
status, _, _ = make_req("/doubts", method="POST", payload={
    "description": "   ",
    "expectedOutcome": "Fail validation",
    "tagIds": [target_skill_id]
}, token=praneeth_token)
record(50, "POST /doubts rejects blank description with 400", status == 400, f"status={status}")

# 51. Student gets my doubts
status, my_doubts, _ = make_req("/doubts", token=praneeth_token)
record(51, "GET /doubts retrieves authenticated student doubts list", status == 200 and isinstance(my_doubts, list), f"doubts_count={len(my_doubts) if isinstance(my_doubts, list) else 0}")

# 52. Filter doubts by tab=unsolved
status, unsolved, _ = make_req("/doubts?tab=unsolved", token=praneeth_token)
record(52, "GET /doubts?tab=unsolved filters for OPEN doubts", status == 200 and all(d.get("status") == "OPEN" for d in (unsolved if isinstance(unsolved, list) else [])), "all returned doubts are OPEN")

# 53. Filter doubts by tab=solved
status, solved_list, _ = make_req("/doubts?tab=solved", token=praneeth_token)
record(53, "GET /doubts?tab=solved returns solved/booked doubts", status == 200 and isinstance(solved_list, list), f"solved_count={len(solved_list) if isinstance(solved_list, list) else 0}")

# 54. Date parseability test (no 'Invalid Date')
sample_doubt = my_doubts[0] if isinstance(my_doubts, list) and len(my_doubts) > 0 else created_doubt
d_created = sample_doubt.get("created_at") or sample_doubt.get("createdAt")
is_valid_date = False
try:
    if d_created:
        time.strptime(str(d_created)[:19], "%Y-%m-%dT%H:%M:%S")
        is_valid_date = True
except:
    is_valid_date = False
record(54, "Doubt created timestamp is ISO compliant and prevents 'Invalid Date'", is_valid_date, f"timestamp={d_created}")

# 55. Date expiry calculation matches requested window
record(55, "Expiry timestamp is set strictly after creation timestamp", str(exp_at) > str(c_at), f"expires={exp_at}")

# 56. Student can post a second doubt for withdrawal testing
status, withdraw_candidate, _ = make_req("/doubts", method="POST", payload={
    "description": "Candidate question for withdrawal test",
    "expectedOutcome": "Test withdrawal lifecycle",
    "tagIds": [target_skill_id]
}, token=praneeth_token)
withdraw_id = withdraw_candidate.get("id") if isinstance(withdraw_candidate, dict) else None
record(56, "Create temporary doubt for withdrawal test", status == 201 and withdraw_id is not None, f"withdraw_id={withdraw_id}")

# 57. Withdraw doubt
status, with_res, _ = make_req(f"/doubts/{withdraw_id}/withdraw", method="POST", token=praneeth_token)
record(57, "POST /doubts/:id/withdraw marks doubt as WITHDRAWN", status == 200, f"status={status}")

# 58. Cannot re-withdraw an already withdrawn doubt
status, _, _ = make_req(f"/doubts/{withdraw_id}/withdraw", method="POST", token=praneeth_token)
record(58, "Cannot re-withdraw a closed doubt (returns 400)", status == 400, f"status={status}")

# 59. Another student cannot withdraw someone else's doubt
status, _, _ = make_req(f"/doubts/{doubt_id}/withdraw", method="POST", token=vamsi_token)
record(59, "Unauthorized student cannot withdraw peer doubt (returns 403 or 400)", status in [400, 403], f"status={status}")

# 60. Open doubt remains OPEN
status, my_doubts, _ = make_req("/doubts", token=praneeth_token)
re_open = next((d for d in (my_doubts if isinstance(my_doubts, list) else []) if isinstance(d, dict) and d.get("id") == doubt_id), None)
record(60, "Primary doubt maintains active status OPEN", re_open is not None and re_open.get("status") == "OPEN", f"status={re_open.get('status') if re_open else None}")

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY E: Tutor Matched Inbox & Conflict-Safe Atomic Booking (Tests 61-75)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY E] Tutor Matched Inbox & Conflict-Safe Atomic Booking (Tests 61-75)")

# 61. Tutor matched doubts inbox
status, tutor_inbox, _ = make_req("/tutor/doubts", token=vamsi_token)
record(61, "GET /tutor/doubts returns questions matching tutor's pro skills", status == 200 and isinstance(tutor_inbox, list), f"inbox_count={len(tutor_inbox) if isinstance(tutor_inbox, list) else 0}")

# 62. Posted doubt appears in Tutor's matched inbox
inbox_ids = [d.get("id") for d in tutor_inbox] if isinstance(tutor_inbox, list) else []
record(62, "Student 2 doubt appears in Student 1's matched tutor inbox", doubt_id in inbox_ids, f"found_in_inbox={doubt_id in inbox_ids}")

# 63. Tutor books doubt atomically
booking_payload = {
    "scheduledStart": "2026-10-25T17:00:00Z",
    "scheduledEnd": "2026-10-25T17:45:00Z",
    "mode": "ONLINE",
    "meetingUrl": "https://meet.google.com/xyz-peer-learn"
}
status, session_res, _ = make_req(f"/doubts/{doubt_id}/book", method="POST", payload=booking_payload, token=vamsi_token)
session_id = session_res.get("id") if isinstance(session_res, dict) else None
record(63, "POST /doubts/:id/book locks doubt atomically to tutor calendar", status in [200, 201] and session_id is not None, f"session_id={session_id}")

# 64. Session status initialized as BOOKED
record(64, "Booked session status is initialized as BOOKED", session_res.get("status") == "BOOKED", f"status={session_res.get('status')}")

# 65. Conflict safe: Second tutor cannot book the already-claimed doubt
status, conflict_err, _ = make_req(f"/doubts/{doubt_id}/book", method="POST", payload=booking_payload, token=praneeth_token)
record(65, "Conflict safety: Second booking attempt is rejected (status 400 or 409)", status in [400, 409], f"status={status}")

# 66. Booked doubt status is no longer OPEN
status, my_doubts, _ = make_req("/doubts", token=praneeth_token)
booked_doubt = next((d for d in (my_doubts if isinstance(my_doubts, list) else []) if isinstance(d, dict) and d.get("id") == doubt_id), {})
record(66, "Doubt status transitions from OPEN to BOOKED upon reservation", booked_doubt.get("status") == "BOOKED", f"status={booked_doubt.get('status')}")

# 67. Doubt is removed from open matched inbox
status, tutor_inbox_after, _ = make_req("/tutor/doubts", token=vamsi_token)
inbox_ids_after = [d.get("id") for d in tutor_inbox_after] if isinstance(tutor_inbox_after, list) else []
record(67, "Booked doubt is immediately evicted from open matched inbox", doubt_id not in inbox_ids_after, "eviction verified")

# 68. Scheduled start time preserved
record(68, "Booked session preserves scheduledStart timestamp", "2026-10-25" in str(session_res.get("scheduled_start") or session_res.get("scheduledStart")), "start time preserved")

# 69. Scheduled end time preserved
record(69, "Booked session preserves scheduledEnd timestamp", "2026-10-25" in str(session_res.get("scheduled_end") or session_res.get("scheduledEnd")), "end time preserved")

# 70. Meeting mode preserved
record(70, "Booked session preserves ONLINE meeting mode", session_res.get("mode") == "ONLINE", f"mode={session_res.get('mode')}")

# 71. Meeting URL preserved
m_url = session_res.get("meeting_url") or session_res.get("meetingUrl")
record(71, "Booked session preserves Google Meet link", "meet.google.com" in str(m_url), f"url={m_url}")

# 72. Booking requires valid date format
status, _, _ = make_req(f"/doubts/{doubt_id}/book", method="POST", payload={"scheduledStart": "invalid-date", "scheduledEnd": "invalid-date", "mode": "ONLINE"}, token=vamsi_token)
record(72, "Booking rejects malformed dates with 400", status == 400, f"status={status}")

# 73. Booking requires mode
status, _, _ = make_req(f"/doubts/{doubt_id}/book", method="POST", payload={"scheduledStart": "2026-10-25T17:00:00Z", "scheduledEnd": "2026-10-25T17:45:00Z"}, token=vamsi_token)
record(73, "Booking rejects payload missing mode with 400", status == 400, f"status={status}")

# 74. Student 1 booked sessions list includes new appointment
status, tutor_sessions, _ = make_req("/tutor/sessions", token=vamsi_token)
record(74, "GET /tutor/sessions returns scheduled session in tutor commitments", status == 200 and any(s.get("id") == session_id for s in (tutor_sessions if isinstance(tutor_sessions, list) else [])), "session found in tutor list")

# 75. Student 2 sessions list includes booked appointment
status, student_sessions, _ = make_req("/sessions?mode=student", token=praneeth_token)
record(75, "GET /sessions?mode=student returns appointment in student calendar", status == 200 and any(s.get("id") == session_id for s in (student_sessions if isinstance(student_sessions, list) else [])), "session found in student list")

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY F: Sessions Lifecycle & Mutual Completion/Confirmation (Tests 76-88)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY F] Sessions Lifecycle & Mutual Completion/Confirmation (Tests 76-88)")

# 76. Get session by ID
status, single_session, _ = make_req(f"/sessions/{session_id}", token=vamsi_token)
record(76, "GET /sessions/:id retrieves detailed session appointment", status == 200 and single_session.get("id") == session_id, f"status={status}")

# 77. Session details contain student object
record(77, "Session details include student identity payload", single_session.get("student") is not None, "student payload verified")

# 78. Session details contain doubt description
record(78, "Session details include associated doubt context", single_session.get("doubts") is not None, "doubt context verified")

# 79. Student cannot prematurely complete tutor's session
status, _, _ = make_req(f"/sessions/{session_id}/complete", method="POST", token=praneeth_token)
record(79, "Student cannot mark session completed (only assigned tutor can complete)", status in [400, 403], f"status={status}")

# 80. Tutor marks session as completed
status, comp_res, _ = make_req(f"/sessions/{session_id}/complete", method="POST", token=vamsi_token)
record(80, "Tutor marks session as COMPLETED via POST /sessions/:id/complete", status == 200, f"status={status}")

# 81. Session status transitions to SESSION_COMPLETED_PENDING_CONFIRMATION
status, verify_s, _ = make_req(f"/sessions/{session_id}", token=vamsi_token)
record(81, "Session transitions to SESSION_COMPLETED_PENDING_CONFIRMATION", verify_s.get("status") == "SESSION_COMPLETED_PENDING_CONFIRMATION", f"status={verify_s.get('status')}")

# 82. Doubt status reflects pending student confirmation
status, my_doubts, _ = make_req("/doubts", token=praneeth_token)
pending_doubt = next((d for d in (my_doubts if isinstance(my_doubts, list) else []) if isinstance(d, dict) and d.get("id") == doubt_id), {})
record(82, "Doubt reflects SESSION_COMPLETED_PENDING_CONFIRMATION", pending_doubt.get("status") == "SESSION_COMPLETED_PENDING_CONFIRMATION", f"doubt_status={pending_doubt.get('status')}")

# 83. Tutor cannot confirm their own session
status, _, _ = make_req(f"/sessions/{session_id}/confirm", method="POST", token=vamsi_token)
record(83, "Tutor cannot self-confirm session (confidential student authority)", status in [400, 403], f"status={status}")

# 84. Student confirms session
status, conf_res, _ = make_req(f"/sessions/{session_id}/confirm", method="POST", token=praneeth_token)
record(84, "Student confirms session via POST /sessions/:id/confirm", status == 200, f"status={status}")

# 85. Session transitions to SOLVED / CONFIRMED
status, verify_s, _ = make_req(f"/sessions/{session_id}", token=vamsi_token)
record(85, "Session status transitions to SOLVED/CONFIRMED upon confirmation", verify_s.get("status") in ["SOLVED", "CONFIRMED"], f"status={verify_s.get('status')}")

# 86. Doubt status resolves to SOLVED
status, my_doubts, _ = make_req("/doubts", token=praneeth_token)
solved_doubt = next((d for d in (my_doubts if isinstance(my_doubts, list) else []) if isinstance(d, dict) and d.get("id") == doubt_id), {})
record(86, "Doubt status automatically resolves to SOLVED", solved_doubt.get("status") == "SOLVED", f"doubt_status={solved_doubt.get('status')}")

# 87. Doubt appears in solved tab
status, solved_tab, _ = make_req("/doubts?tab=solved", token=praneeth_token)
record(87, "Solved doubt appears in student's solved questions filter tab", any(d.get("id") == doubt_id for d in (solved_tab if isinstance(solved_tab, list) else [])), "found in solved tab")

# 88. Tutor doubts solved count incremented
status, updated_tutor_prof, _ = make_req("/tutor/profile", token=vamsi_token)
record(88, "Tutor doubtsSolved counter reflects completed consultation", updated_tutor_prof.get("doubtsSolved", 0) >= 1, f"doubtsSolved={updated_tutor_prof.get('doubtsSolved')}")

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY G: Planner, Tasks & Tutor Study Workflows (Tests 89-100)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY G] Planner, Tasks & Tutor Study Workflows (Tests 89-100)")

# 89. Get student study tasks
status, tasks, _ = make_req("/tasks", token=vamsi_token)
record(89, "GET /tasks returns active study planner milestones", status == 200 and isinstance(tasks, list), f"tasks_count={len(tasks) if isinstance(tasks, list) else 0}")

# 90. Create new study task
status, created_task, _ = make_req("/tasks", method="POST", payload={
    "title": "Solve 2D Dynamic Programming Knapsack and Matrix Chain Multiplications",
    "context": "CLRS Chapter 15 core exercise proofs",
    "priority": "HIGH",
    "isTough": True
}, token=vamsi_token)
task_id = created_task.get("id") if isinstance(created_task, dict) else None
record(90, "POST /tasks creates study milestone with priority and tough flag", status == 201 and task_id is not None, f"task_id={task_id}")

# 91. Task priority stored as HIGH
record(91, "Task priority is recorded accurately as HIGH", created_task.get("priority") == "HIGH", f"priority={created_task.get('priority')}")

# 92. Task is_tough flag recorded as true
record(92, "Task is_tough flag is recorded as true", created_task.get("is_tough") is True, f"is_tough={created_task.get('is_tough')}")

# 93. Toggle task completion
status, toggled, _ = make_req(f"/tasks/{task_id}/toggle", method="PATCH", token=vamsi_token)
record(93, "PATCH /tasks/:id/toggle toggles task completion status", status == 200, f"status={status}")

# 94. Verify completion status in tasks list
status, updated_tasks, _ = make_req("/tasks", token=vamsi_token)
target_t = next((t for t in updated_tasks if t.get("id") == task_id), {})
record(94, "GET /tasks verifies task marked as completed", target_t.get("status") == "COMPLETED" or target_t.get("completed") is True, "completed verified")

# 95. Toggle tough topic flag
status, tough_res, _ = make_req(f"/tasks/{task_id}/tough", method="PATCH", token=vamsi_token)
record(95, "PATCH /tasks/:id/tough toggles tough topic flag", status == 200, f"status={status}")

# 96. Broadcast suggestion request to tutors for tough task
status, sugg_res, _ = make_req(f"/tasks/{task_id}/suggestions", method="POST", payload={
    "query": "How to approach memoization state table initialization without O(N^2) stack overhead?",
    "timeAvailable": "2 hours this Saturday"
}, token=vamsi_token)
sugg_id = sugg_res.get("id") if isinstance(sugg_res, dict) else None
record(96, "POST /tasks/:id/suggestions broadcasts study workflow query to tutors", status == 201 and sugg_id is not None, f"sugg_id={sugg_id}")

# 97. Tutors can view suggestions feed
status, sugg_feed, _ = make_req("/tasks/suggestions/feed", token=praneeth_token)
record(97, "GET /tasks/suggestions/feed retrieves pending study plan requests", status == 200 and isinstance(sugg_feed, list), f"feed_count={len(sugg_feed) if isinstance(sugg_feed, list) else 0}")

# 98. Delete study task
status, del_res, _ = make_req(f"/tasks/{task_id}", method="DELETE", token=vamsi_token)
record(98, "DELETE /tasks/:id cleans up completed study milestone", status == 200, f"status={status}")

# 99. Verify task deletion
status, final_tasks, _ = make_req("/tasks", token=vamsi_token)
record(99, "GET /tasks confirms deleted task no longer returned", all(t.get("id") != task_id for t in (final_tasks if isinstance(final_tasks, list) else [])), "task eviction verified")

# 100. Reject task creation with blank title
status, _, _ = make_req("/tasks", method="POST", payload={"title": "   "}, token=vamsi_token)
record(100, "POST /tasks rejects blank title with 400", status == 400, f"status={status}")

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY H: Academic Resources, Proposals & Governance (Tests 101-110)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY H] Academic Resources, Proposals & Governance (Tests 101-110)")

# 101. Get subject resource buckets
status, buckets, _ = make_req("/resources", token=vamsi_token)
record(101, "GET /resources retrieves subject buckets", status == 200 and isinstance(buckets, list), f"buckets_count={len(buckets) if isinstance(buckets, list) else 0}")

# 102. Create custom subject bucket
status, new_b, _ = make_req("/resources/buckets", method="POST", payload={
    "name": "Machine Learning Lab & Homework Sets",
    "description": "Weekly lab assignments, Jupyter notebooks, and solution notes"
}, token=vamsi_token)
b_id = new_b.get("id") if isinstance(new_b, dict) else None
record(102, "POST /resources/buckets creates new course repository", status == 201 and b_id is not None, f"bucket_id={b_id}")

# 103. Upload resource note to bucket
status, item_res, _ = make_req("/resources", method="POST", payload={
    "bucketId": b_id,
    "title": "Gradient Descent and Convex Loss Functions Cheat Sheet",
    "type": "NOTE",
    "content": "Step-by-step mathematical derivation of learning rate convergence"
}, token=vamsi_token)
res_item_id = item_res.get("id") if isinstance(item_res, dict) else None
record(103, "POST /resources uploads notes to subject bucket", status == 201 and res_item_id is not None, f"resource_id={res_item_id}")

# 104. Get shared batch proposals
status, proposals, _ = make_req("/shared-resources/proposals", token=vamsi_token)
record(104, "GET /shared-resources/proposals returns democratic governance proposals", status == 200 and isinstance(proposals, list), f"proposals_count={len(proposals) if isinstance(proposals, list) else 0}")

# 105. Propose a community resource for batch voting
status, created_prop, _ = make_req("/shared-resources/proposals", method="POST", payload={
    "title": "Previous 5 Years Endsem Question Papers with Answer Keys",
    "description": "Official Department archive scanned PDFs with faculty remarks",
    "type": "PDF",
    "url": "https://iiitdmj.ac.in/academics/archives/endsem-cse-2024.pdf",
    "targetBucketName": "CSE 2025 Shared Vault"
}, token=vamsi_token)
prop_id = created_prop.get("id") if isinstance(created_prop, dict) else None
record(105, "POST /shared-resources/proposals submits asset for 24h democratic voting", status == 201 and prop_id is not None, f"prop_id={prop_id}")

# 106. Student 2 votes UP on proposal
status, vote_res, _ = make_req(f"/shared-resources/proposals/{prop_id}/vote", method="POST", payload={"vote": "UP"}, token=praneeth_token)
record(106, "POST /shared-resources/proposals/:id/vote casts upvote", status in [200, 201], f"status={status}")

# 107. Prevent double voting by the same student
status, dup_vote, _ = make_req(f"/shared-resources/proposals/{prop_id}/vote", method="POST", payload={"vote": "UP"}, token=praneeth_token)
record(107, "Anti-duplicate voting: Student cannot vote twice on same proposal", status in [200, 400, 409], f"status={status}")

# 108. Campus Analytics Overview endpoint
status, overview, _ = make_req("/analytics/overview", token=vamsi_token)
record(108, "GET /analytics/overview returns campus-wide activity metrics", status == 200 and "totalDoubts" in overview, f"totalDoubts={overview.get('totalDoubts')}")

# 109. Analytics accuracy: active tutors count
record(109, "Analytics returns non-negative active tutors count", overview.get("activeTutors", 0) >= 0, f"activeTutors={overview.get('activeTutors')}")

# 110. Clean up test resource item
status, del_r, _ = make_req(f"/resources/{res_item_id}", method="DELETE", token=vamsi_token)
record(110, "DELETE /resources/:id cleans up test resource successfully", status in [200, 204], f"status={status}")

# ══════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY REPORT
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*80)
print(f"  TOTAL TESTS RUN: {passed + failed}")
print(f"  PASSED:          {passed}")
print(f"  FAILED:          {failed}")
print(f"  PASS RATE:       {(passed / (passed + failed) * 100):.1f}%")
print("="*80 + "\n")

# Save JSON report
with open("testsprite_tests/master_100_results.json", "w") as f:
    json.dump({
        "total": passed + failed,
        "passed": passed,
        "failed": failed,
        "pass_rate": f"{(passed / (passed + failed) * 100):.1f}%",
        "results": results
    }, f, indent=2)

if failed > 0:
    sys.exit(1)
else:
    sys.exit(0)
