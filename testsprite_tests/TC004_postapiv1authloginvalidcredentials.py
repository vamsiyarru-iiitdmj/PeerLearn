import os
import sys
import requests

def test_post_api_v1_auth_login_valid_credentials():
    base_url = "http://localhost:3001"
    login_url = f"{base_url}/api/v1/auth/login"

    # Credentials must be provided via environment variables
    email = os.getenv("VALID_EMAIL")
    password = os.getenv("VALID_PASSWORD")
    if not email or not password:
        raise AssertionError("Environment variables VALID_EMAIL and VALID_PASSWORD must be set for this test.")

    payload = {"email": email, "password": password}
    headers = {"Content-Type": "application/json"}

    try:
        resp = requests.post(login_url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        raise AssertionError(f"HTTP request failed: {e}")

    assert resp.status_code == 200, f"Expected status 200, got {resp.status_code}: {resp.text}"

    try:
        data = resp.json()
    except ValueError:
        raise AssertionError("Response is not valid JSON")

    # Locate token in common fields or nested objects
    token_keys = ["token", "accessToken", "access_token", "jwt", "id_token", "bearer"]
    token = None
    if isinstance(data, dict):
        for k in token_keys:
            if k in data and data[k]:
                token = data[k]
                break
        # nested search
        if token is None:
            for v in data.values():
                if isinstance(v, dict):
                    for k in token_keys:
                        if k in v and v[k]:
                            token = v[k]
                            break
                if token is not None:
                    break

    assert token, f"No token found in response JSON. Keys present: {list(data.keys())}"

    # Normalize token string and validate JWT format (three dot-separated parts)
    token_str = token if isinstance(token, str) else str(token)
    token_str = token_str.strip()
    if token_str.lower().startswith("bearer "):
        token_str = token_str.split(" ", 1)[1].strip()
    parts = token_str.split(".")
    assert len(parts) == 3 and all(parts), f"Token does not appear to be a JWT: {token_str}"

    # Locate user profile
    user_keys = ["user", "profile", "userProfile", "user_profile"]
    user = None
    for k in user_keys:
        if k in data and data[k]:
            user = data[k]
            break
    if user is None:
        for v in data.values():
            if isinstance(v, dict):
                for k in user_keys:
                    if k in v and v[k]:
                        user = v[k]
                        break
            if user is not None:
                break
    assert isinstance(user, dict), f"User profile not found or invalid in response: {data}"

    # Locate active session status
    session_keys = ["session", "active", "isActive", "session_active", "sessionStatus", "activeSession"]
    session_status = None
    for k in session_keys:
        if k in data:
            session_status = data[k]
            break
    if session_status is None:
        for v in data.values():
            if isinstance(v, dict):
                for k in session_keys:
                    if k in v:
                        session_status = v[k]
                        break
            if session_status is not None:
                break

    # Interpret session status
    session_ok = False
    if isinstance(session_status, bool):
        session_ok = session_status is True
    elif isinstance(session_status, str):
        session_ok = session_status.lower() in ("active", "true", "ok")
    elif isinstance(session_status, dict):
        if session_status.get("isActive") is True or session_status.get("is_active") is True:
            session_ok = True
        elif str(session_status.get("status", "")).lower() in ("active", "ok"):
            session_ok = True

    assert session_status is not None and session_ok, f"Active session status not found or not active: {session_status}"

    print("TC004 PASS: Received JWT bearer token, user profile, and active session status.")

if __name__ == "__main__":
    try:
        test_post_api_v1_auth_login_valid_credentials()
    except AssertionError as e:
        print(f"TC004 FAIL: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC004 ERROR: Unexpected exception: {e}")
        sys.exit(2)
    sys.exit(0)