import sys
import json
import urllib.request
import urllib.error
import time

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000/api/v1"

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

print("\n" + "="*75)
print(f"  PEERLEARN REAL DEPLOYMENT TEST SUITE (Target: {BASE_URL})")
print("="*75 + "\n")

# ── Test 1: Health Check ──
status, data, _ = make_req("/health")
record(1, "GET /health - Service Liveness & Status", status == 200 and data.get("status") == "ok", f"status={status}, data={data}")

# ── Test 2: Auth Login - Invalid Credentials ──
status, data, _ = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs195@iiitdmj.ac.in",
    "password": "WrongPassword999!"
})
record(2, "POST /auth/login - Rejection of Invalid Credentials (401)", status == 401, f"status={status}")

# ── Test 3: Auth Login - Valid Credentials (25BCS195) ──
status, data, _ = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs195@iiitdmj.ac.in",
    "password": "praneeth12345"
})
auth_token = data.get("accessToken") or data.get("token") or (data.get("data") or {}).get("accessToken")
student_data = data.get("student") or data.get("profile") or (data.get("data") or {}).get("student")
record(3, "POST /auth/login - Verified Login (25BCS195 / Praneeth)", status == 200 and bool(auth_token) and student_data.get("roll_number") == "25BCS195", f"status={status}, token={'yes' if auth_token else 'no'}")

# ── Test 4: Auth Login - Valid Credentials (25BCS270) ──
status2, data2, _ = make_req("/auth/login", method="POST", payload={
    "instituteEmail": "25bcs270@iiitdmj.ac.in",
    "password": "Password123!"
})
auth_token2 = data2.get("accessToken") or data2.get("token") or (data2.get("data") or {}).get("accessToken")
student_data2 = data2.get("student") or data2.get("profile") or (data2.get("data") or {}).get("student")
record(4, "POST /auth/login - Verified Login (25BCS270 / Vamsi)", status2 == 200 and bool(auth_token2) and student_data2.get("roll_number") == "25BCS270", f"status={status2}, roll={student_data2.get('roll_number') if student_data2 else None}")

# ── Test 5: Profile - Detailed Profile with Academic Stats ──
status, profile_data, _ = make_req("/me/profile", token=auth_token)
has_student = bool(profile_data.get("student"))
has_academics = bool(profile_data.get("academics"))
record(5, "GET /me/profile - Authenticated Student Profile & Academic Stats", status == 200 and has_student and has_academics, f"status={status}, has_student={has_student}, has_academics={has_academics}")

# ── Test 6: Academics - Semester Records ──
status, acad_data, _ = make_req("/me/academics", token=auth_token)
is_list = isinstance(acad_data, list)
record(6, "GET /me/academics - Authoritative Semester Records Query", status == 200 and is_list and len(acad_data) > 0, f"status={status}, count={len(acad_data) if is_list else 0}")

# ── Test 7: Skills - Available Skills Catalog ──
status, skills_data, _ = make_req("/skills")
is_skills_list = isinstance(skills_data, list) and len(skills_data) > 0
skill_id = skills_data[0].get("id") if is_skills_list else None
record(7, "GET /skills - Public Curated Skills Catalog", status == 200 and is_skills_list, f"status={status}, count={len(skills_data) if isinstance(skills_data, list) else 0}")

# ── Test 8: Doubts - List Campus Doubts ──
status, doubts_data, _ = make_req("/doubts", token=auth_token)
is_doubts_list = isinstance(doubts_data, list)
record(8, "GET /doubts - Campus Doubt Hub Listing", status == 200 and is_doubts_list, f"status={status}, count={len(doubts_data) if is_doubts_list else 0}")

# ── Test 9: Doubts - Create Doubt Validation Failure (Empty Description) ──
status, err_data, _ = make_req("/doubts", method="POST", payload={
    "description": "",
    "expectedOutcome": "Test",
    "tagIds": [skill_id] if skill_id else []
}, token=auth_token)
record(9, "POST /doubts - Validation Rejection for Blank Description", status == 400, f"status={status}")

# ── Test 10: Doubts - Create Valid Doubt with Tags ──
test_desc = f"Deployment Verification Doubt #{int(time.time())}"
status, new_doubt, _ = make_req("/doubts", method="POST", payload={
    "description": test_desc,
    "expectedOutcome": "Verify end-to-end question publishing in deployment",
    "tagIds": [skill_id] if skill_id else [],
    "expiryHours": 48
}, token=auth_token)
created_doubt_id = new_doubt.get("id")
record(10, "POST /doubts - Create New Doubt with Tags & Expiry", status == 201 and bool(created_doubt_id), f"status={status}, id={created_doubt_id}")

# ── Test 11: Planner - Create & Retrieve Tasks ──
task_title = f"Deployment Task #{int(time.time())}"
status_task_create, created_task, _ = make_req("/tasks", method="POST", payload={
    "title": task_title,
    "context": "Automated deployment task verification",
    "priority": "HIGH",
    "isTough": True
}, token=auth_token)

status_tasks_get, tasks_list, _ = make_req("/tasks", token=auth_token)
task_found = any(t.get("title") == task_title for t in tasks_list) if isinstance(tasks_list, list) else False
record(11, "POST & GET /tasks - Study Planner Task Creation & Retrieval", status_task_create == 201 and status_tasks_get == 200 and task_found, f"created={status_task_create}, found={task_found}")

# ── Test 12: Notifications - List Notifications ──
status, notifs, _ = make_req("/notifications", token=auth_token)
record(12, "GET /notifications - User Notifications Query", status == 200 and isinstance(notifs, list), f"status={status}, count={len(notifs) if isinstance(notifs, list) else 0}")

# ── Test 13: Analytics - Campus Live Analytics Overview ──
status, analytics, _ = make_req("/analytics/overview")
has_counts = "totalDoubts" in analytics and "doubtsSolved" in analytics and "activeTutors" in analytics
record(13, "GET /analytics/overview - Campus Live Metrics & Leaderboard", status == 200 and has_counts, f"status={status}, totalDoubts={analytics.get('totalDoubts')}, tutors={analytics.get('activeTutors')}")

# ── Test 14: Resources - Public Resources Hub ──
status, resources, _ = make_req("/resources", token=auth_token)
record(14, "GET /resources - Academic Resources Catalog", status == 200 and isinstance(resources, list), f"status={status}, count={len(resources) if isinstance(resources, list) else 0}")

print("\n" + "-"*75)
print(f"  TEST SUMMARY: {passed} PASSED / {failed} FAILED (TOTAL {passed + failed})")
print("-" * 75 + "\n")

with open("testsprite_tests/deployment_test_results.json", "w") as f:
    json.dump({
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "targetUrl": BASE_URL,
        "total": passed + failed,
        "passed": passed,
        "failed": failed,
        "results": results
    }, f, indent=2)

if failed > 0:
    sys.exit(1)
sys.exit(0)
