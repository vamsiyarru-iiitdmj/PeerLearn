from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))

    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("networkidle")

    # Fill
    page.locator('input[placeholder="rollno@iiitdmj.ac.in"]').fill("test.student@iiitdmj.ac.in")
    page.locator('input[placeholder="Your password"]').fill("Password123!")

    # Submit
    page.locator('button[type="submit"]').click()

    # Wait for token
    page.wait_for_function("() => !!localStorage.getItem('pl_access_token')", timeout=15000)

    print("Current URL:", page.url)
    token = page.evaluate("() => localStorage.getItem('pl_access_token')")
    print("pl_access_token:", token[:30] + "...")

    browser.close()
