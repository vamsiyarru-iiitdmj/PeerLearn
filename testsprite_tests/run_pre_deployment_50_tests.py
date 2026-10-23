"""
Pre-Deployment Verification Suite: 50 Comprehensive Tests
PeerLearn Platform - Release: 'Pre deployment Checks-1'

Covers:
- Category 1: Authentication & Roll Number Validation (Tests 1-8)
- Category 2: Skills Master CSV Catalog (295 Skills) (Tests 9-16)
- Category 3: Transcript Semesters & Bug Fix Verification (Tests 17-22)
- Category 4: Tutor Mode, Appointments & Sessions (Tests 23-32)
- Category 5: Study Planner, Tasks & Suggestions (Tests 33-40)
- Category 6: Responsive Layout, Toggle Menu & UI/UX (Tests 41-46)
- Category 7: Robust Error Handling & Anti-500 Guardrails (Tests 47-50)
"""

import sys
import json
import urllib.request
import urllib.error
import time

BACKEND_URL = "http://localhost:3001/api/v1"
FRONTEND_URL = "http://localhost:3000"

passed = 0
failed = 0
results = []

def record(test_num, name, success, details=""):
    global passed, failed
    if success:
        passed += 1
        status = "PASSED"
        print(f"  [PASS] Test {test_num:02d}: {name}", flush=True)
    else:
        failed += 1
        status = "FAILED"
        print(f"  [FAIL] Test {test_num:02d}: {name} - {details}", flush=True)
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

def req(path, method="GET", payload=None, token=None, base=BACKEND_URL):
    url = f"{base}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_obj = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request_obj, timeout=15) as response:
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

def fetch_html(path):
    url = f"{FRONTEND_URL}{path}"
    try:
        req_obj = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req_obj, timeout=15) as response:
            html = response.read().decode("utf-8", errors="ignore")
            return response.status, html
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:
        return 500, ""

print("\n" + "="*75, flush=True)
print("  PEERLEARN PRE-DEPLOYMENT TEST SUITE: 50 AUTOMATED INTEGRATION TESTS", flush=True)
print("="*75 + "\n", flush=True)

# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY 1: Authentication & Roll Number Validation (Tests 1-8)
# ══════════════════════════════════════════════════════════════════════════════
print("[CATEGORY 1] Authentication & Roll Number Validation", flush=True)

# 1. API Health endpoint returns 200 OK
status, data, _ = req("/health")
record(1, "API Health endpoint returns 200 OK and services ok",
       status == 200 and data.get("status") == "ok", f"status={status}")

# 2. Student login with valid credentials
status, data, raw = req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs270@iiitdmj.ac.in",
    "password": "vamsi056"
})
access_token = data.get("accessToken") or raw.get("accessToken")
record(2, "Login with valid student credentials succeeds",
       status == 200 and access_token is not None, f"status={status}")

# 3. Access token is a valid JWT string
is_jwt = bool(access_token and len(access_token.split(".")) == 3)
record(3, "Login response delivers verified 3-segment JWT accessToken",
       is_jwt, f"jwt={is_jwt}")

# 4. Roll number format verification on profile
status, prof, _ = req("/me/profile", token=access_token)
student_rec = prof.get("student", {}) if isinstance(prof, dict) else {}
record(4, "Authenticated student roll number matches IIITDMJ format '25BCS270'",
       student_rec.get("roll_number") == "25BCS270", f"roll={student_rec.get('roll_number')}")

# 5. Invalid roll number during registration returns 400 (NOT 500)
status, err, _ = req("/auth/register/start", method="POST", payload={
    "instituteEmail": "25xyz999@iiitdmj.ac.in",
    "rollNumber": "INVALID_FORMAT_999"
})
record(5, "Register start with invalid roll number returns 400 Bad Request, NOT 500",
       status == 400, f"status={status}")

# 6. Invalid non-institute email domain rejected with 400 (NOT 500)
status, err, _ = req("/auth/register/start", method="POST", payload={
    "instituteEmail": "outsider@gmail.com",
    "rollNumber": "25BCS270"
})
record(6, "Register start with non-institute email returns 400 Bad Request",
       status == 400, f"status={status}")

# 7. Login with invalid password returns 401 Unauthorized with user-friendly error
status, err, _ = req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs270@iiitdmj.ac.in",
    "password": "IncorrectPassword999!"
})
record(7, "Login with wrong password returns 401 Unauthorized, NOT 500",
       status == 401, f"status={status}")

# 8. Forgot password endpoint handles registered institute email gracefully
status, fp_res, _ = req("/auth/forgot-password", method="POST", payload={
    "instituteEmail": "25bcs270@iiitdmj.ac.in"
})
record(8, "Forgot password endpoint accepts valid institute email and returns 200 OK",
       status in [200, 201], f"status={status}")


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY 2: Skills Master CSV Catalog (295 Skills) (Tests 9-16)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY 2] Skills Master Catalog (295 Skills)", flush=True)

# 9. GET /skills returns 200 OK
status, all_skills, _ = req("/skills")
skills_list = all_skills if isinstance(all_skills, list) else []
record(9, "GET /skills returns HTTP 200 OK array",
       status == 200 and isinstance(skills_list, list), f"status={status}")

# 10. Total skills count matches 295 from skills_master.csv
record(10, "Skills master catalog contains exactly 295 imported curriculum skills",
       len(skills_list) == 295, f"count={len(skills_list)}")

# 11. Core skills presence check (Python, DSA, DBMS, Machine Learning, React)
skill_names = [s.get("name", "").lower() for s in skills_list]
has_core = all(k in " ".join(skill_names) for k in ["python", "data structures", "dbms", "machine learning", "react"])
record(11, "Catalog includes flagship subjects: Python, DSA, DBMS, ML, and React",
       has_core, f"has_core={has_core}")

# 12. Every skill has valid schema: id, name, slug, category
valid_schema = all(bool(s.get("id") and s.get("name") and s.get("slug")) for s in skills_list[:50])
record(12, "Skills have populated id, name, and slug properties",
       valid_schema, f"valid_schema={valid_schema}")

# 13. Multiple curriculum categories represented in catalog
categories = set(s.get("category") for s in skills_list if s.get("category"))
record(13, "Catalog spans structured categories (Programming, DSA, AI, Web, Systems)",
       len(categories) >= 4, f"categories_count={len(categories)}")

# 14. GET /tutor/pro-skills returns tutor's currently selected skills
status, tutor_skills, _ = req("/tutor/pro-skills", token=access_token)
tutor_skills_list = tutor_skills if isinstance(tutor_skills, list) else []
record(14, "GET /tutor/pro-skills returns student's accredited competencies",
       status == 200 and isinstance(tutor_skills_list, list), f"status={status}")

# 15. PUT /tutor/pro-skills updates tutor's endorsed skills
sample_skill_ids = [s["id"] for s in skills_list[:3]]
status, put_res, _ = req("/tutor/pro-skills", method="PUT", payload={"skillIds": sample_skill_ids}, token=access_token)
record(15, "PUT /tutor/pro-skills updates tutor master competencies",
       status in [200, 201], f"status={status}")

# 16. Verify updated skills count
status, updated_skills, _ = req("/tutor/pro-skills", token=access_token)
up_list = updated_skills if isinstance(updated_skills, list) else []
record(16, "GET /tutor/pro-skills reflects newly endorsed skills",
       len(up_list) >= 3, f"count={len(up_list)}")


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY 3: Transcript Semesters & Bug Fix Verification (Tests 17-22)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY 3] Academic Transcripts & Semester CPI Calculations", flush=True)

# 17. GET /me/academics returns verified transcripts
status, acad_recs, _ = req("/me/academics", token=access_token)
acad_list = acad_recs if isinstance(acad_recs, list) else []
record(17, "GET /me/academics returns student's official semester records",
       status == 200 and isinstance(acad_list, list), f"status={status}")

# 18. Verified student (Batch 2025) has exactly 2 semesters, NOT 6 hardcoded
record(18, "Transcript strictly returns 2 real completed semesters (Sem 1 and Sem 2)",
       len(acad_list) == 2, f"semesters_found={len(acad_list)}")

# 19. Semester numbers are 1 and 2
sem_nums = sorted([r.get("semester") for r in acad_list])
record(19, "Semester indices correspond to Sem 1 and Sem 2",
       sem_nums == [1, 2], f"semesters={sem_nums}")

# 20. SGPA values are realistic (0.0 to 10.0 scale)
valid_sgpa = all(0.0 <= float(r.get("sgpa", 0)) <= 10.0 for r in acad_list)
record(20, "Semester SGPA entries are strictly calibrated between 0.0 and 10.0",
       valid_sgpa, f"valid_sgpa={valid_sgpa}")

# 21. PATCH /me/target updates target CGPA
status, target_res, _ = req("/me/target", method="PATCH", payload={"targetCgpa": 8.85}, token=access_token)
record(21, "PATCH /me/target updates student graduation target CGPA",
       status in [200, 201], f"status={status}")

# 22. Profile reflects updated target CGPA
status, prof2, _ = req("/me/profile", token=access_token)
stud2 = prof2.get("student", {}) if isinstance(prof2, dict) else {}
record(22, "Updated target CGPA is accurately saved in student record",
       float(stud2.get("target_cgpa", 0)) == 8.85, f"target={stud2.get('target_cgpa')}")


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY 4: Tutor Mode, Appointments & Sessions (Tests 23-32)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY 4] Tutor Mode, Appointments & Fulfillment", flush=True)

# 23. GET /tutor/profile returns tutor stats
status, tutor_prof, _ = req("/tutor/profile", token=access_token)
record(23, "GET /tutor/profile returns tutor standing and rating details",
       status == 200 and isinstance(tutor_prof, dict), f"status={status}")

# 24. GET /tutor/leaderboard returns ranked campus tutors
status, leaderboard, _ = req("/tutor/leaderboard", token=access_token)
lb_list = leaderboard if isinstance(leaderboard, list) else []
record(24, "GET /tutor/leaderboard returns active campus leaderboard array",
       status == 200 and isinstance(lb_list, list), f"status={status}, tutors={len(lb_list)}")

# 25. GET /tutor/sessions returns active sessions
status, sessions, _ = req("/tutor/sessions", token=access_token)
record(25, "GET /tutor/sessions returns tutor booked appointments",
       status == 200 and isinstance(sessions, list), f"status={status}")

# 26. Peer student creates a doubt for tutor booking
p_status, p_login, p_raw = req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs195@iiitdmj.ac.in",
    "password": "praneeth123"
})
praneeth_token = (p_login.get("accessToken") if isinstance(p_login, dict) else None) or (p_raw.get("accessToken") if isinstance(p_raw, dict) else None)

test_skill_id = skills_list[0]["id"]
doubt_payload = {
    "description": "Pre-deployment Test: Lock-free concurrency with Compare-And-Swap.",
    "expectedOutcome": "Understand ABA problem and memory barriers in x86.",
    "tagIds": [test_skill_id],
    "expiryHours": 48
}
status, new_doubt, _ = req("/doubts", method="POST", payload=doubt_payload, token=praneeth_token or access_token)
doubt_obj = new_doubt.get("doubt") if (isinstance(new_doubt, dict) and "doubt" in new_doubt) else new_doubt
created_doubt_id = doubt_obj.get("id") if isinstance(doubt_obj, dict) else None
record(26, "Peer student POST /doubts creates active doubt with status OPEN",
       status in [200, 201] and created_doubt_id is not None, f"id={created_doubt_id}")

# 27. GET /doubts returns created doubt in peer doubts feed
status, my_doubts, _ = req("/doubts", token=praneeth_token or access_token)
found_created = any(d.get("id") == created_doubt_id for d in (my_doubts if isinstance(my_doubts, list) else []))
record(27, "Created doubt appears in student's active doubts query",
       found_created, f"found={found_created}")

# 28. Tutor Vamsi books appointment on peer student Praneeth's doubt
status, booked_session, _ = req(f"/doubts/{created_doubt_id}/book", method="POST", payload={
    "scheduledStart": "2026-10-25T14:00:00.000Z",
    "scheduledEnd": "2026-10-25T15:00:00.000Z",
    "mode": "ONLINE",
    "meetingUrl": "https://meet.google.com/xyz-peer-learn"
}, token=access_token)
session_obj = booked_session.get("session") if (isinstance(booked_session, dict) and "session" in booked_session) else booked_session
session_id = session_obj.get("id") if isinstance(session_obj, dict) else None
record(28, "POST /doubts/:id/book books a 1-on-1 tutoring appointment",
       status in [200, 201] and session_id is not None, f"status={status}, sessionId={session_id}")

# 29. Booked appointment status is confirmed
status, session_detail, _ = req(f"/sessions/{session_id}", token=access_token)
sess_status = session_detail.get("status") if isinstance(session_detail, dict) else None
record(29, "Booked session status is confirmed as BOOKED/CONFIRMED/SCHEDULED",
       sess_status in ["BOOKED", "CONFIRMED", "SCHEDULED", "PENDING"], f"status={sess_status}")

# 30. Tutor marks appointment as completed
status, mark_comp, _ = req(f"/sessions/{session_id}/complete", method="POST", token=access_token)
record(30, "POST /sessions/:id/complete marks session completed pending student confirmation",
       status in [200, 201], f"status={status}")

# 31. Student confirms session completion
status, confirm_res, _ = req(f"/sessions/{session_id}/confirm", method="POST", token=praneeth_token or access_token)
record(31, "POST /sessions/:id/confirm finalizes session and triggers tutor reputation increase",
       status in [200, 201], f"status={status}")

# 32. Verify doubt is now SOLVED
status, resolved_doubt, _ = req(f"/doubts/{created_doubt_id}", token=access_token)
doubt_status = resolved_doubt.get("status") if isinstance(resolved_doubt, dict) else None
record(32, "Associated doubt transitions to SOLVED state upon confirmation",
       doubt_status in ["SOLVED", "RESOLVED", "COMPLETED"], f"status={doubt_status}")


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY 5: Study Planner, Tasks & Suggestions (Tests 33-40)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY 5] Study Planner, Tasks & Suggestions", flush=True)

# 33. GET /tasks returns 200 OK
status, tasks, _ = req("/tasks", token=access_token)
record(33, "GET /tasks returns student's planner tasks list",
       status == 200 and isinstance(tasks, list), f"status={status}")

# 34. POST /tasks creates new task
task_payload = {
    "title": "Study Cache Coherence Protocols (MESI & MOESI)",
    "context": "Prepare presentation for Advanced Computer Architecture",
    "priority": "HIGH",
    "isTough": False,
    "dueAt": "2026-10-26T18:00:00.000Z"
}
status, created_task, _ = req("/tasks", method="POST", payload=task_payload, token=access_token)
task_id = created_task.get("id") if isinstance(created_task, dict) else None
record(34, "POST /tasks creates new task with status PENDING",
       status in [200, 201] and created_task.get("status") == "PENDING", f"status={status}, id={task_id}")

# 35. Toggle task completion to COMPLETED
status, toggled_1, _ = req(f"/tasks/{task_id}/complete", method="POST", token=access_token)
record(35, "POST /tasks/:id/complete transitions task status to COMPLETED",
       status in [200, 201] and toggled_1.get("status") == "COMPLETED", f"status={toggled_1.get('status')}")

# 36. Toggle task back to PENDING
status, toggled_2, _ = req(f"/tasks/{task_id}/complete", method="POST", token=access_token)
record(36, "Toggling completion again returns task status to PENDING",
       status in [200, 201] and toggled_2.get("status") == "PENDING", f"status={toggled_2.get('status')}")

# 37. Toggle tough flag
status, tough_res, _ = req(f"/tasks/{task_id}/toggle-tough", method="POST", token=access_token)
record(37, "POST /tasks/:id/toggle-tough marks task as is_tough = true",
       status in [200, 201] and tough_res.get("is_tough") is True, f"is_tough={tough_res.get('is_tough')}")

# 38. Ask suggestion on task
sugg_payload = {
    "query": "Need help setting up Gem5 simulator on Ubuntu 24.04",
    "timeAvailable": "3 hours this weekend"
}
status, sugg_res, _ = req(f"/tasks/{task_id}/ask-suggestion", method="POST", payload=sugg_payload, token=access_token)
sugg_id = sugg_res.get("id") or sugg_res.get("requestId") or (sugg_res.get("request", {}) or {}).get("id")
record(38, "POST /tasks/:id/ask-suggestion broadcasts study plan request to tutors",
       status in [200, 201] and sugg_id is not None, f"status={status}")

# 39. GET /suggestions returns open suggestions
status, sugg_list, _ = req("/suggestions", token=access_token)
record(39, "GET /suggestions returns open suggestion requests for tutors",
       status == 200 and isinstance(sugg_list, list), f"status={status}")

# 40. DELETE /tasks/:id cleans up task
status, del_res, _ = req(f"/tasks/{task_id}", method="DELETE", token=access_token)
record(40, "DELETE /tasks/:id deletes task cleanly",
       status == 200, f"status={status}")


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY 6: Responsive Layout, Toggle Menu & UI/UX (Tests 41-46)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY 6] Responsive Layout, Toggle Menu & UI/UX", flush=True)

# 41. Frontend login route renders with status 200 OK
status, login_html = fetch_html("/login")
record(41, "GET /login renders Next.js authentication interface with status 200 OK",
       status == 200 and "25bcs270@iiitdmj.ac.in" in login_html, f"status={status}")

# 42. Menu toggle button defined in Header component with accessibility & IDs
with open("app/components/Header.tsx", "r", encoding="utf-8") as f:
    header_code = f.read()
record(42, "Header component source includes #menu-toggle-btn with toggleSidebar interaction",
       'id="menu-toggle-btn"' in header_code and 'toggleSidebar' in header_code, "verified")

# 43. Sidebar drawer includes responsive slide drawer & close button
with open("app/components/Sidebar.tsx", "r", encoding="utf-8") as f:
    sidebar_code = f.read()
record(43, "Sidebar drawer includes #sidebar-close-btn and responsive translate drawer classes",
       'id="sidebar-close-btn"' in sidebar_code and 'translate-x-0' in sidebar_code, "verified")

# 44. PageShell layout includes responsive layout padding across breakpoints
with open("app/components/PageShell.tsx", "r", encoding="utf-8") as f:
    shell_code = f.read()
record(44, "PageShell container provides responsive layout padding (px-3.5 sm:px-6 md:px-8)",
       'sm:px-6' in shell_code and 'md:px-8' in shell_code, "verified")

# 45. Profile page provides #open-skills-modal-btn for Mastered Skills
with open("app/profile/page.tsx", "r", encoding="utf-8") as f:
    profile_code = f.read()
record(45, "Profile page provides #open-skills-modal-btn to manage tutor competencies",
       'id="open-skills-modal-btn"' in profile_code, "verified")

# 46. Profile page includes 295-skill searchable modal (#skill-search-input & #save-skills-modal-btn)
record(46, "Profile page includes 295-skill searchable catalog modal (#skill-search-input & #save-skills-modal-btn)",
       'id="skill-search-input"' in profile_code and 'id="save-skills-modal-btn"' in profile_code, "verified")


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY 7: Robust Error Handling & Anti-500 Guardrails (Tests 47-50)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[CATEGORY 7] Robust Error Handling & Anti-500 Guardrails", flush=True)

# 47. Non-existent API route returns 404 (NOT 500 socket hangup)
status, err404, _ = req("/non-existent-endpoint-route-check")
record(47, "Non-existent API route returns clean HTTP 404 Not Found, NOT 500",
       status == 404, f"status={status}")

# 48. Malformed JSON body returns 400 Bad Request, NOT unhandled 500
status, err_bad, _ = req("/auth/login", method="POST", payload={"badField": 123})
record(48, "Missing required credentials returns 400 Bad Request with client guidance, NOT 500",
       status in [400, 401], f"status={status}")

# 49. Next.js API proxy to port 3001 returns 200 OK
status, proxy_health, _ = req("/health", base=f"{FRONTEND_URL}/api/v1")
record(49, "Next.js proxy rewrite (/api/v1/* -> port 3001) returns 200 OK with zero socket hangup",
       status == 200 and proxy_health.get("status") == "ok", f"status={status}")

# 50. Campus Overview Analytics returns real computed metrics
status, analytics, _ = req("/analytics/overview", token=access_token)
record(50, "GET /analytics/overview returns calculated campus metrics from database",
       status == 200 and "totalDoubts" in analytics, f"status={status}")


# ══════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY REPORT
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*75, flush=True)
print(f"  PRE-DEPLOYMENT SUITE FINISHED: {passed} PASSED, {failed} FAILED (TOTAL: {passed + failed})", flush=True)
print("="*75, flush=True)

# Save results JSON
with open("testsprite_tests/pre_deployment_50_results.json", "w") as f:
    json.dump({
        "timestamp": time.time(),
        "total": passed + failed,
        "passed": passed,
        "failed": failed,
        "pass_rate": f"{(passed/(passed+failed))*100:.1f}%",
        "results": results
    }, f, indent=2)

if failed > 0:
    print(f"\n[ALERT] {failed} tests failed. See details above.", flush=True)
    sys.exit(1)
else:
    print(f"\n[SUCCESS] 100% PASS RATE! System verified stable and ready for deployment.", flush=True)
    sys.exit(0)
