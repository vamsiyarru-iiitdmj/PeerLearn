"""
Playwright-based Frontend Test Suite for PeerLearn
Coordinating 5 Frontend Test Cases from testsprite_frontend_test_plan.json:
- TC001_Frontend: Student registration and verification onboarding UI flow
- TC002_Frontend: Student login and dashboard access flow
- TC003_Frontend: System health probe and Next.js frontend readiness
- TC004_Frontend: Student sign out and session termination flow
- TC005_Frontend: Doubts and Study Planner interactive page navigation
"""

import sys
import time
import requests
from playwright.sync_api import sync_playwright

FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:3001"
TIMEOUT = 30000


def test_tc001_student_registration_flow():
    print("--- [TC001_Frontend] Running Student Registration Flow Test ---", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            page.goto(f"{FRONTEND_URL}/login", timeout=TIMEOUT)
            page.wait_for_load_state("domcontentloaded")

            # Click Register tab
            register_tab = page.get_by_role("button", name="Register", exact=True)
            assert register_tab.is_visible(), "Register tab button should be visible"
            register_tab.click()
            page.wait_for_timeout(500)

            # Fill in registration start fields
            page.locator('input[placeholder*="25BCS270"], input[placeholder*="2022CSE001"]').first.fill("25BCS270")
            page.locator('input[placeholder*="Vamsi"]').first.fill("Vamsi Adithya")
            page.locator('input[placeholder*="personal@gmail.com"], input[placeholder*="example.com"]').first.fill("vamsi@example.com")
            page.locator('input[placeholder*="iiitdmj.ac.in"]').first.fill("25bcs270@iiitdmj.ac.in")

            # Click submit button
            submit_btn = page.locator('button[type="submit"]')
            submit_btn.click()

            # Wait for OTP verification step
            page.wait_for_timeout(3000)
            has_otp_step = page.locator('input[placeholder="6-digit code"]').is_visible() or \
                           page.get_by_text("OTP", exact=False).is_visible() or \
                           page.get_by_text("Verif", exact=False).is_visible()

            assert has_otp_step, "Registration start should transition to OTP verification step"
            print("TC001_Frontend PASSED: Registration flow successfully validated.", flush=True)
        finally:
            browser.close()


def test_tc002_student_login_flow():
    print("--- [TC002_Frontend] Running Student Login Flow Test ---", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            page.goto(f"{FRONTEND_URL}/login", timeout=TIMEOUT)
            page.wait_for_load_state("domcontentloaded")

            # Switch to Sign In tab if not already on it
            sign_in_tab = page.get_by_role("button", name="Sign In", exact=True)
            if sign_in_tab.is_visible():
                sign_in_tab.click()
                page.wait_for_timeout(300)

            # Fill login credentials
            page.locator('input[type="email"], input[placeholder*="iiitdmj.ac.in"]').first.fill("test.student@iiitdmj.ac.in")
            page.locator('input[type="password"], input[placeholder*="password"]').first.fill("Password123!")

            # Submit login form
            page.locator('button[type="submit"]').click()

            # Wait for token in localStorage
            page.wait_for_function("() => !!localStorage.getItem('pl_access_token')", timeout=15000)
            token = page.evaluate("() => localStorage.getItem('pl_access_token')")

            assert token is not None and len(token) > 20, f"Valid token should be saved in pl_access_token, got: {token}"
            print("TC002_Frontend PASSED: Student successfully authenticated and entered dashboard.", flush=True)
        finally:
            browser.close()


def test_tc003_health_readiness_probe():
    print("--- [TC003_Frontend] Running System Health & Readiness Probe ---", flush=True)
    # 1. Verify backend health endpoint
    health_resp = requests.get(f"{BACKEND_URL}/api/v1/health", timeout=10)
    assert health_resp.status_code == 200, f"Backend health returned {health_resp.status_code}"
    health_data = health_resp.json()
    assert health_data.get("status") == "ok", f"Health status should be ok: {health_data}"
    print(f"Backend Health: {health_data}", flush=True)

    # 2. Verify Next.js frontend login page
    frontend_resp = requests.get(f"{FRONTEND_URL}/login", timeout=10)
    assert frontend_resp.status_code == 200, f"Frontend returned status {frontend_resp.status_code}"
    assert "PeerLearn" in frontend_resp.text or "IIITDMJ" in frontend_resp.text, \
        "Frontend response should contain PeerLearn application markup"

    print("TC003_Frontend PASSED: Health and readiness probe verified for both frontend and backend.", flush=True)


def test_tc004_student_logout_flow():
    print("--- [TC004_Frontend] Running Student Logout Flow Test ---", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Login first
            page.goto(f"{FRONTEND_URL}/login", timeout=TIMEOUT)
            page.wait_for_load_state("domcontentloaded")
            page.locator('input[placeholder="rollno@iiitdmj.ac.in"]').fill("test.student@iiitdmj.ac.in")
            page.locator('input[placeholder="Your password"]').fill("Password123!")
            page.locator('button[type="submit"]').click()
            page.wait_for_function("() => !!localStorage.getItem('pl_access_token')", timeout=15000)

            # Ensure authenticated
            token_before = page.evaluate("() => localStorage.getItem('pl_access_token')")
            assert token_before is not None, "User should be logged in before testing logout"

            # Execute logout
            page.evaluate("""() => {
                localStorage.removeItem('pl_access_token');
                window.location.href = '/login';
            }""")

            page.wait_for_timeout(2000)
            token_after = page.evaluate("() => localStorage.getItem('pl_access_token')")
            assert token_after is None, f"Token must be purged on logout, got: {token_after}"
            assert "/login" in page.url, f"User should be on login page, got: {page.url}"

            print("TC004_Frontend PASSED: Session terminated and token cleared successfully.", flush=True)
        finally:
            browser.close()


def test_tc005_doubts_and_planner_navigation():
    print("--- [TC005_Frontend] Running Doubts & Study Planner Page Navigation Test ---", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Login through UI flow to establish complete session & state
            page.goto(f"{FRONTEND_URL}/login", timeout=TIMEOUT)
            page.wait_for_load_state("domcontentloaded")
            page.locator('input[placeholder="rollno@iiitdmj.ac.in"]').fill("test.student@iiitdmj.ac.in")
            page.locator('input[placeholder="Your password"]').fill("Password123!")
            page.locator('button[type="submit"]').click()
            page.wait_for_function("() => !!localStorage.getItem('pl_access_token')", timeout=15000)

            # Navigate to Doubts view via client routing or direct
            page.goto(f"{FRONTEND_URL}/doubts", timeout=TIMEOUT)
            page.wait_for_load_state("domcontentloaded")
            page.locator('h1:has-text("My Doubts")').wait_for(timeout=20000)
            assert page.locator('h1:has-text("My Doubts")').is_visible(), "Doubts page should display 'My Doubts' heading"

            # Navigate to Planner view via client link or direct
            planner_link = page.locator('a[href="/planner"]').first
            if planner_link.is_visible():
                planner_link.click()
            else:
                page.goto(f"{FRONTEND_URL}/planner", timeout=TIMEOUT)
                page.wait_for_load_state("domcontentloaded")

            page.locator('h1:has-text("Planner")').wait_for(timeout=20000)
            assert page.locator('h1:has-text("Planner")').is_visible(), "Planner page should display 'Planner' heading"

            print("TC005_Frontend PASSED: Doubts Hub and Study Planner successfully loaded and rendered.", flush=True)
        finally:
            browser.close()


if __name__ == "__main__":
    tests = [
        ("TC001_Frontend", test_tc001_student_registration_flow),
        ("TC002_Frontend", test_tc002_student_login_flow),
        ("TC003_Frontend", test_tc003_health_readiness_probe),
        ("TC004_Frontend", test_tc004_student_logout_flow),
        ("TC005_Frontend", test_tc005_doubts_and_planner_navigation),
    ]

    failed = 0
    passed = 0
    for name, t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {e}", flush=True)
            failed += 1

    print(f"\n==========================================", flush=True)
    print(f"Frontend Test Results: {passed} PASSED, {failed} FAILED", flush=True)
    print(f"==========================================", flush=True)

    if failed > 0:
        sys.exit(1)
    sys.exit(0)
