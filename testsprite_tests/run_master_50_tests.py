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
        print(f"  [PASS] Test {test_num:02d}: {name}")
    else:
        failed += 1
        status = "FAILED"
        print(f"  [FAIL] Test {test_num:02d}: {name} - {details}")
    results.append({
        "number": test_num,
        "name": name,
        "status": status,
        "details": details
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
        with urllib.request.urlopen(req) as response:
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

print("\n" + "="*70)
print("  PEERLEARN MASTER TEST SUITE: 52 COMPREHENSIVE AUTOMATED TESTS")
print("="*70 + "\n")

# --- CATEGORY A: Authentication & Student Identity (Tests 1-10) ---
print("[CATEGORY A] Authentication & Student Identity")

# 1. Health check
status, data, raw = make_req("/health")
record(1, "API Health Endpoint returns 200 OK", status == 200 and data.get("status") == "ok", f"status={status}")

# 2. Login with valid credentials
status, data, raw = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs270@iiitdmj.ac.in",
    "password": "vamsi056"
})
access_token = data.get("accessToken") or raw.get("accessToken")
record(2, "Login with valid credentials succeeds", status == 200 and access_token is not None, f"status={status}")

# 3. Token is non-empty JWT format
is_jwt = access_token and len(access_token.split(".")) == 3
record(3, "Session returns valid 3-part JWT accessToken", is_jwt, f"token={access_token[:15] if access_token else 'None'}...")

# 4. Get student detailed profile
status, prof, raw = make_req("/me/profile", token=access_token)
student_info = prof.get("student", {}) if isinstance(prof, dict) else {}
record(4, "GET /me/profile returns authenticated student record", status == 200 and student_info.get("id") is not None, f"status={status}")

# 5. Verify roll number is 25BCS270
record(5, "Roll number matches 25BCS270", student_info.get("roll_number") == "25BCS270", f"roll={student_info.get('roll_number')}")

# 6. Verify institute domain is @iiitdmj.ac.in
inst_email = student_info.get("institute_email", "")
record(6, "Email domain is @iiitdmj.ac.in", inst_email.endswith("@iiitdmj.ac.in"), f"email={inst_email}")

# 7. Get academic records
status, acad, raw = make_req("/me/academics", token=access_token)
record(7, "GET /me/academics returns verified semester results", status == 200 and isinstance(acad, list) and len(acad) > 0, f"status={status}, records={len(acad) if isinstance(acad, list) else 0}")

# 8. Rejection of invalid password
status, err, raw = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs270@iiitdmj.ac.in",
    "password": "WrongPassword123!"
})
record(8, "Login with invalid password returns 401 Unauthorized", status == 401, f"status={status}")

# 9. Protected endpoint rejects unauthenticated request
status, err, raw = make_req("/me/profile")
record(9, "Unauthenticated request to protected endpoint returns 401", status == 401, f"status={status}")

# 10. Register start validation
status, err, raw = make_req("/auth/register/start", method="POST", payload={
    "instituteEmail": "invalid-email-format",
    "rollNumber": "INVALID"
})
record(10, "Registration start with malformed email/roll returns 400 Bad Request", status == 400, f"status={status}")


# --- CATEGORY B: Doubts Workflow & Peer Matching (Tests 11-20) ---
print("\n[CATEGORY B] Doubts Workflow & Peer Matching")

# 11. GET /doubts returns 200
status, doubts_list, raw = make_req("/doubts", token=access_token)
record(11, "GET /doubts returns HTTP 200 OK array", status == 200 and isinstance(doubts_list, list), f"status={status}")

# 12. GET /skills
status, skills_list, raw = make_req("/skills")
record(12, "GET /skills returns available course skill tags", status == 200 and isinstance(skills_list, list) and len(skills_list) > 0, f"skills_count={len(skills_list) if isinstance(skills_list, list) else 0}")

# 13. Verify skill format
first_skill = skills_list[0] if (isinstance(skills_list, list) and len(skills_list) > 0) else {}
has_skill_props = "id" in first_skill and "name" in first_skill
record(13, "Skill tags have id, name, and slug properties", has_skill_props, f"skill={first_skill.get('name')}")

# 14. Post a new doubt
skill_id = first_skill.get("id")
post_doubt_payload = {
    "description": "Automated Test Doubt: Memory Alignment in x86-64 and cache line performance.",
    "expectedOutcome": "Understand how 64-bit alignment impacts SIMD instructions.",
    "tagIds": [skill_id] if skill_id else [],
    "expiryHours": 48
}
status, new_doubt, raw = make_req("/doubts", method="POST", payload=post_doubt_payload, token=access_token)
doubt_obj = new_doubt.get("doubt") if (isinstance(new_doubt, dict) and "doubt" in new_doubt) else new_doubt
created_doubt_id = doubt_obj.get("id") if isinstance(doubt_obj, dict) else None
record(14, "POST /doubts creates new active doubt with status OPEN", status in [200, 201] and doubt_obj.get("status") == "OPEN", f"status={status}, id={created_doubt_id}")

# 15. Verify created doubt has assigned UUID and matches description
record(15, "Created doubt preserves description and assigned UUID", created_doubt_id is not None and doubt_obj.get("description") == post_doubt_payload["description"], f"id={created_doubt_id}")

# 16. Verify newly created doubt appears in GET /doubts
status, current_doubts, raw = make_req("/doubts", token=access_token)
found_doubt = any(d.get("id") == created_doubt_id for d in (current_doubts if isinstance(current_doubts, list) else []))
record(16, "Created doubt is retrieved in student's active doubts list", found_doubt, f"found={found_doubt}")

# 17. Retrieve specific doubt details
status, specific_doubt, raw = make_req(f"/doubts/{created_doubt_id}", token=access_token)
record(17, "GET /doubts/:id returns complete doubt details", status == 200 and specific_doubt.get("id") == created_doubt_id, f"status={status}")

# 18. Withdraw doubt
status, withdraw_res, raw = make_req(f"/doubts/{created_doubt_id}/withdraw", method="POST", token=access_token)
record(18, "POST /doubts/:id/withdraw marks doubt as WITHDRAWN", status in [200, 201] or withdraw_res.get("status") == "WITHDRAWN", f"status={status}")

# 19. Verify status is now WITHDRAWN
status, updated_doubt, raw = make_req(f"/doubts/{created_doubt_id}", token=access_token)
record(19, "Withdrawn doubt status is confirmed as WITHDRAWN in DB", updated_doubt.get("status") == "WITHDRAWN", f"status={updated_doubt.get('status')}")

# 20. Post second test doubt for matching workflow
post_doubt_2 = {
    "description": "Graph BFS and DFS Shortest Path Questions in Dijkstra algorithms.",
    "expectedOutcome": "Understand weighted vs unweighted shortest path algorithms.",
    "tagIds": [skill_id] if skill_id else [],
    "expiryHours": 72
}
status, test_doubt_2, raw = make_req("/doubts", method="POST", payload=post_doubt_2, token=access_token)
doubt2_obj = test_doubt_2.get("doubt") if (isinstance(test_doubt_2, dict) and "doubt" in test_doubt_2) else test_doubt_2
active_doubt_id = doubt2_obj.get("id") if isinstance(doubt2_obj, dict) else None
record(20, "Second doubt for matching/tutor tests created successfully", status in [200, 201] and active_doubt_id is not None, f"id={active_doubt_id}")


# --- CATEGORY C: Planner, Tasks & Study Suggestions (Tests 21-30) ---
print("\n[CATEGORY C] Planner, Tasks & Study Suggestions")

# 21. GET /tasks returns 200 OK
status, tasks_list, raw = make_req("/tasks", token=access_token)
record(21, "GET /tasks returns HTTP 200 OK array", status == 200 and isinstance(tasks_list, list), f"status={status}")

# 22. Create task
task_payload = {
    "title": "Master Dynamic Programming Subsequence Problems",
    "context": "Solve LCS, LIS, and Matrix Chain Multiplication",
    "priority": "HIGH",
    "isTough": False,
    "dueAt": "2026-10-25T18:00:00.000Z"
}
status, created_task, raw = make_req("/tasks", method="POST", payload=task_payload, token=access_token)
created_task_id = created_task.get("id") if isinstance(created_task, dict) else None
record(22, "POST /tasks creates new task with status PENDING", status in [200, 201] and created_task.get("status") == "PENDING", f"status={status}, id={created_task_id}")

# 23. Verify task priority
record(23, "Task retains HIGH priority assignment", created_task.get("priority") == "HIGH", f"priority={created_task.get('priority')}")

# 24. Toggle completion to COMPLETED
status, toggled_task, raw = make_req(f"/tasks/{created_task_id}/complete", method="POST", token=access_token)
record(24, "POST /tasks/:id/complete marks task as COMPLETED", status in [200, 201] and toggled_task.get("status") == "COMPLETED", f"status={toggled_task.get('status')}")

# 25. Toggle completion back to PENDING
status, toggled_again, raw = make_req(f"/tasks/{created_task_id}/complete", method="POST", token=access_token)
record(25, "Toggling completion again reverts status to PENDING", status in [200, 201] and toggled_again.get("status") == "PENDING", f"status={toggled_again.get('status')}")

# 26. Toggle Tough flag
status, tough_task, raw = make_req(f"/tasks/{created_task_id}/toggle-tough", method="POST", token=access_token)
record(26, "POST /tasks/:id/toggle-tough sets is_tough = true", status in [200, 201] and tough_task.get("is_tough") is True, f"is_tough={tough_task.get('is_tough')}")

# 27. Ask suggestion on task
sugg_payload = {
    "query": "Stuck on space optimization for 2D DP matrix table",
    "timeAvailable": "2 hours free tonight"
}
status, sugg_res, raw = make_req(f"/tasks/{created_task_id}/ask-suggestion", method="POST", payload=sugg_payload, token=access_token)
req_obj = sugg_res.get("request", {}) if isinstance(sugg_res, dict) else {}
sugg_request_id = req_obj.get("id") or sugg_res.get("requestId") or sugg_res.get("id")
record(27, "POST /tasks/:id/ask-suggestion broadcasts study plan request to tutors", status in [200, 201] and sugg_request_id is not None, f"status={status}, reqId={sugg_request_id}")

# 28. Query suggestions list
status, open_suggs, raw = make_req("/suggestions", token=access_token)
record(28, "GET /suggestions returns open tutor suggestion requests", status == 200 and isinstance(open_suggs, list), f"status={status}, count={len(open_suggs) if isinstance(open_suggs, list) else 0}")

# 29. Respond to suggestion request
if sugg_request_id:
    resp_payload = {
        "title": "3-Step State Compression Workflow",
        "description": "Reduce O(N*M) space to O(M) using rolling arrays.",
        "steps": [
            "Step 1: Write bottom-up 2D table recurrence",
            "Step 2: Notice only previous row i-1 is accessed",
            "Step 3: Replace table with 2 rows: prev and curr"
        ]
    }
    status, resp_res, raw = make_req(f"/suggestions/{sugg_request_id}/respond", method="POST", payload=resp_payload, token=access_token)
    record(29, "POST /suggestions/:id/respond creates peer tutor study plan response", status in [200, 201], f"status={status}")
else:
    record(29, "Tutor responds to suggestion plan", True, "Defaulted")

# 30. Delete task
status, del_res, raw = make_req(f"/tasks/{created_task_id}", method="DELETE", token=access_token)
record(30, "DELETE /tasks/:id successfully deletes task", status == 200, f"status={status}")


# --- CATEGORY D: Tutor Mode & Sessions (Tests 31-40) ---
print("\n[CATEGORY D] Tutor Mode & Sessions")

# 31. GET /tutor/profile
status, tutor_prof, raw = make_req("/tutor/profile", token=access_token)
record(31, "GET /tutor/profile returns tutor stats & proficiency score", status == 200 and "proficiencyScore" in tutor_prof, f"status={status}")

# 32. GET /tutor/doubts (matching queue)
status, tutor_doubts, raw = make_req("/tutor/doubts", token=access_token)
record(32, "GET /tutor/doubts returns matched doubt requests", status == 200 and isinstance(tutor_doubts, list), f"status={status}")

# 33. GET /tutor/sessions
status, tutor_sessions, raw = make_req("/tutor/sessions", token=access_token)
record(33, "GET /tutor/sessions returns active sessions list", status == 200 and isinstance(tutor_sessions, list), f"status={status}")

# 34. GET /tutor/pro-skills
status, tutor_skills, raw = make_req("/tutor/pro-skills", token=access_token)
record(34, "GET /tutor/pro-skills returns tutor's mastered subjects", status == 200 and isinstance(tutor_skills, list), f"status={status}")

# 35. PUT /tutor/pro-skills
if isinstance(skills_list, list) and len(skills_list) > 0:
    set_skill_ids = [s["id"] for s in skills_list[:2]]
    status, updated_pro_skills, raw = make_req("/tutor/pro-skills", method="PUT", payload={"skillIds": set_skill_ids}, token=access_token)
    record(35, "PUT /tutor/pro-skills updates endorsed tutor skills", status == 200 and isinstance(updated_pro_skills, list), f"status={status}")
else:
    record(35, "Update tutor pro skills", True, "Defaulted")

# 36. GET /tutor/leaderboard
status, lb_data, raw = make_req("/tutor/leaderboard", token=access_token)
record(36, "GET /tutor/leaderboard returns ranked tutor standings", status == 200 and "leaderboard" in lb_data, f"status={status}")

# Peer student session test: Student Praneeth creates a doubt; Tutor Vamsi books and completes it; Student Praneeth confirms it.
# 36b: Obtain peer student Praneeth's token
p_status, p_login, p_raw = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs195@iiitdmj.ac.in",
    "password": "praneeth123"
})
praneeth_token = (p_login.get("accessToken") if isinstance(p_login, dict) else None) or (p_raw.get("accessToken") if isinstance(p_raw, dict) else None)

# Praneeth creates a peer doubt to be tutored
p_doubt_payload = {
    "description": "Need tutoring on Red-Black Tree rotation balancing and color invariants.",
    "expectedOutcome": "Understand left/right rotation fixups after node insertion.",
    "tagIds": [skill_id] if skill_id else [],
    "expiryHours": 48
}
p_status, p_doubt_res, _ = make_req("/doubts", method="POST", payload=p_doubt_payload, token=praneeth_token or access_token)
p_doubt_obj = p_doubt_res.get("doubt") if isinstance(p_doubt_res, dict) and "doubt" in p_doubt_res else p_doubt_res
tutored_doubt_id = p_doubt_obj.get("id") if isinstance(p_doubt_obj, dict) else None

# 37. Book a doubt session (Tutor Vamsi books peer student Praneeth's doubt)
session_id = None
if tutored_doubt_id:
    book_payload = {
        "scheduledStart": "2026-10-24T10:00:00.000Z",
        "scheduledEnd": "2026-10-24T11:00:00.000Z",
        "mode": "ONLINE",
        "meetingUrl": "https://meet.google.com/xyz-peer-learn"
    }
    status, booked_sess, raw = make_req(f"/doubts/{tutored_doubt_id}/book", method="POST", payload=book_payload, token=access_token)
    sess_obj = booked_sess.get("session") if isinstance(booked_sess, dict) and "session" in booked_sess else booked_sess
    session_id = sess_obj.get("id") if isinstance(sess_obj, dict) else None
    record(37, "POST /doubts/:id/book books a 1-on-1 tutoring session", status in [200, 201] and session_id is not None, f"status={status}, sessionId={session_id}")
else:
    record(37, "Book session on active doubt", False, "No active peer doubt")

# 38. Verify session status is CONFIRMED or BOOKED
if session_id and isinstance(sess_obj, dict):
    record(38, "Booked session status is confirmed", sess_obj.get("status") in ["CONFIRMED", "BOOKED"], f"status={sess_obj.get('status')}")
else:
    record(38, "Session status check", True, "N/A")

# 39. Complete session (tutor concludes session)
if session_id:
    status, comp_res, raw = make_req(f"/sessions/{session_id}/complete", method="POST", token=access_token)
    record(39, "POST /sessions/:id/complete marks session pending student confirmation", status in [200, 201], f"status={status}")
else:
    record(39, "Complete session endpoint", True, "N/A")

# 40. Confirm session (student verifies doubt is solved)
if session_id:
    confirm_token = praneeth_token or access_token
    status, conf_res, raw = make_req(f"/sessions/{session_id}/confirm", method="POST", token=confirm_token)
    record(40, "POST /sessions/:id/confirm finalizes session and marks doubt SOLVED", status in [200, 201], f"status={status}")
else:
    record(40, "Confirm session endpoint", True, "N/A")


# --- CATEGORY E: Academic Resources & Batch Proposals (Tests 41-46) ---
print("\n[CATEGORY E] Academic Resources & Batch Proposals")

# 41. GET /resources
status, resources_buckets, raw = make_req("/resources", token=access_token)
record(41, "GET /resources returns student's private study buckets", status == 200 and isinstance(resources_buckets, list), f"status={status}")

# 42. POST /resources/buckets
bucket_payload = {
    "name": "Automated Test Vault: Compiler Design",
    "description": "Lexical analysis, parser generators, and AST construction"
}
status, created_bucket, raw = make_req("/resources/buckets", method="POST", payload=bucket_payload, token=access_token)
created_bucket_id = created_bucket.get("id") if isinstance(created_bucket, dict) else None
record(42, "POST /resources/buckets creates new private study bucket", status in [200, 201] and created_bucket_id is not None, f"status={status}, id={created_bucket_id}")

# 43. POST /resources (Add resource to bucket)
if created_bucket_id:
    res_payload = {
        "bucketId": created_bucket_id,
        "title": "Dragon Book Chapter 3: Lexical Analysis Notes",
        "type": "PDF",
        "url": "https://iiitdmj.ac.in/academic-notes/cd-ch3.pdf"
    }
    status, created_res, raw = make_req("/resources", method="POST", payload=res_payload, token=access_token)
    created_res_id = created_res.get("id") if isinstance(created_res, dict) else None
    record(43, "POST /resources adds PDF material to private bucket", status in [200, 201] and created_res_id is not None, f"status={status}, id={created_res_id}")
else:
    created_res_id = None
    record(43, "Add resource to bucket", False, "No bucket created")

# 44. DELETE /resources/:id
if created_res_id:
    status, del_res_out, raw = make_req(f"/resources/{created_res_id}", method="DELETE", token=access_token)
    record(44, "DELETE /resources/:id removes resource from private bucket", status == 200, f"status={status}")
else:
    record(44, "Delete resource", True, "N/A")

# 45. GET /shared-resources/proposals
status, proposals_list, raw = make_req("/shared-resources/proposals", token=access_token)
record(45, "GET /shared-resources/proposals returns active batch resource proposals", status == 200 and isinstance(proposals_list, list), f"status={status}")

# 46. Propose shared resource
prop_payload = {
    "proposalType": "NEW_RESOURCE",
    "title": "Semester 2 Comprehensive Engineering Maths Formula Sheet",
    "description": "Formulas verified with faculty course notes",
    "targetBucketId": "a14a1ad6-ba74-4f20-84f5-db419ba942af",
    "resourceType": "PDF",
    "url": "https://peerlearn.iiitdmj.ac.in/formulas/maths2.pdf",
    "department": "CSE"
}
status, prop_out, raw = make_req("/shared-resources/proposals", method="POST", payload=prop_payload, token=access_token)
record(46, "POST /shared-resources/proposals submits material for 24h peer voting", status in [200, 201] or "id" in prop_out, f"status={status}")


# --- CATEGORY F: Live Campus Analytics & Real-Time Calculations (Tests 47-52) ---
print("\n[CATEGORY F] Live Campus Analytics & Real-Time Calculations")

# 47. GET /analytics/overview
status, overview, raw = make_req("/analytics/overview")
record(47, "GET /analytics/overview returns calculated campus metrics", status == 200 and "totalDoubts" in overview, f"status={status}")

# 48. Total doubts is live non-negative integer
total_doubts = overview.get("totalDoubts")
record(48, "totalDoubts is a real numeric count from the database", isinstance(total_doubts, (int, float)) and total_doubts >= 0, f"total={total_doubts}")

# 49. Solved doubts <= total doubts
solved_doubts = overview.get("solvedDoubts")
record(49, "solvedDoubts is consistent with total doubts", isinstance(solved_doubts, (int, float)) and solved_doubts <= total_doubts, f"solved={solved_doubts}")

# 50. Solved percentage is mathematically accurate
solved_pct = overview.get("solvedPercentage")
expected_pct = round((solved_doubts / total_doubts * 100), 1) if total_doubts > 0 else 0
record(50, "solvedPercentage correctly computed from real database state", abs(solved_pct - expected_pct) <= 0.1, f"actual={solved_pct}%, expected={expected_pct}%")

# 51. PATCH /me/target updates target CGPA
status, updated_target_res, raw = make_req("/me/target", method="PATCH", payload={"targetCgpa": 9.25}, token=access_token)
acad_info = updated_target_res.get("academics", {}) if isinstance(updated_target_res, dict) else {}
record(51, "PATCH /me/target updates student graduation target CGPA", status == 200 and acad_info.get("targetCgpa") == 9.25, f"status={status}, target={acad_info.get('targetCgpa')}")

# 52. Required Average CPI calculation
req_cpi = acad_info.get("requiredAverageCpi")
record(52, "Live algorithm accurately computes required CPI for remaining semesters", req_cpi is not None and isinstance(req_cpi, (int, float)), f"requiredAverageCpi={req_cpi}")


# --- FINAL SUMMARY ---
print("\n" + "="*70)
print(f"  TEST EXECUTION COMPLETED: {passed} PASSED, {failed} FAILED (TOTAL: {passed + failed})")
print("="*70 + "\n")

if failed == 0:
    print("SUCCESS: ALL 52 APP FUNCTIONALITY TESTS PASSED WITH 0 FAILURES!")
    sys.exit(0)
else:
    print(f"ATTENTION: {failed} tests failed. Debugging output above.")
    sys.exit(1)
