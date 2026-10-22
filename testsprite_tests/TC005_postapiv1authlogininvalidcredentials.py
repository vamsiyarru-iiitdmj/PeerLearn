import requests
import json
import re
import sys

BASE_URL = "http://localhost:3001"
FRONTEND_ORIGIN = "http://localhost:3000"
TIMEOUT = 30

def test_post_api_v1_auth_login_invalid_credentials():
    url = f"{BASE_URL}/api/v1/auth/login"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": FRONTEND_ORIGIN,
        "Referer": FRONTEND_ORIGIN
    }

    # Intentionally invalid credentials
    payload = {
        "email": "invalid.user@example.com",
        "password": "WrongPassword123!"
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"HTTP request to {url} failed: {e}")

    status = resp.status_code
    try:
        body = resp.json()
    except ValueError:
        body = resp.text

    # Expect an authentication failure (commonly 401, but some implementations may use 400 or 403)
    if status not in (400, 401, 403):
        raise AssertionError(f"Expected authentication failure status (400/401/403), got {status}. Response body: {body}")

    # Ensure response body conveys authentication failure
    body_text = json.dumps(body) if isinstance(body, (dict, list)) else str(body)
    if not re.search(r"(invalid|credential|credentials|authentication|unauthor|unauth|unauthorized|unauthenticated|failed)", body_text, re.I):
        raise AssertionError(f"Response does not indicate authentication failure. Status: {status}. Body: {body_text}")

    # If we reach here, the test passes
    print(f"PASS: POST /api/v1/auth/login with invalid credentials returned status {status} and an authentication failure message.")

if __name__ == "__main__":
    try:
        test_post_api_v1_auth_login_invalid_credentials()
    except AssertionError as e:
        print(f"FAIL: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected exception occurred: {e}")
        sys.exit(2)
    sys.exit(0)