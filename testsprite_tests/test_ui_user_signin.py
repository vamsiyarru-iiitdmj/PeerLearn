from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("domcontentloaded")

    # Enter user credentials from screenshot
    page.locator('input[placeholder="rollno@iiitdmj.ac.in"]').fill("25bcs270@iiitdmj.ac.in")
    page.locator('input[placeholder="Your password"]').fill("vamsi056")

    # Click Sign In
    page.locator('button[type="submit"]').click()

    # Wait for login to complete and token to be saved
    page.wait_for_function("() => !!localStorage.getItem('pl_access_token')", timeout=15000)
    token = page.evaluate("() => localStorage.getItem('pl_access_token')")
    print("SUCCESS: Logged in! Token:", token[:25] + "...")

    page.wait_for_timeout(2000)
    print("Current URL after login:", page.url)
    assert token is not None, "Login should store token in localStorage"
    print("UI Sign In Test PASSED cleanly for 25bcs270@iiitdmj.ac.in / vamsi056!")

    browser.close()
