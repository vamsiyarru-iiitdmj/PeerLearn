import requests
import time
import uuid

BASE_URL = "http://localhost:3001"
TIMEOUT = 30


def test_post_api_v1_auth_register_verify_valid_otp():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    # Generate a unique test identifier for roll/email to avoid collisions
    unique_id = str(int(time.time())) + "-" + uuid.uuid4().hex[:6]
    roll_number = f"TESTROLL-{unique_id}"
    email = f"{unique_id}@iiitdmj.ac.in"
    password = "TestPass!234"  # test password

    register_start_url = f"{BASE_URL}/api/v1/auth/register/start"
    register_verify_url = f"{BASE_URL}/api/v1/auth/register/verify"
    me_profile_url = f"{BASE_URL}/api/v1/me/profile"
    logout_url = f"{BASE_URL}/api/v1/auth/logout"

    token = None

    try:
        # Step 1: Start registration to generate OTP / verification challenge
        payload_start = {"roll_number": roll_number, "email": email}
        try:
            resp_start = session.post(register_start_url, json=payload_start, timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"Request to register/start failed: {e}")

        assert resp_start.status_code in (200, 201), f"Expected 200/201 from register/start, got {resp_start.status_code}: {resp_start.text}"

        try:
            data_start = resp_start.json()
        except ValueError:
            raise AssertionError(f"register/start did not return valid JSON: {resp_start.text}")

        # Attempt to extract OTP or verification token from response.
        otp = None
        verification_token = None
        verification_id = None
        # Common keys to check
        for key in ("otp", "otp_code", "otpCode", "code"):
            if key in data_start and data_start[key]:
                otp = str(data_start[key])
                break
        for key in ("verification_token", "verificationToken", "token", "challenge_token"):
            if key in data_start and data_start[key]:
                verification_token = data_start[key]
                break
        for key in ("verification_id", "verificationId", "challenge", "challenge_id", "id"):
            if key in data_start and data_start[key]:
                verification_id = data_start[key]
                break

        # If OTP was not returned, the test environment may require fetching OTP from logs or email.
        # Here assert OTP or verification token/id is present to continue the automated flow.
        assert (otp or verification_token or verification_id), (
            "register/start response did not include OTP, verification token, or challenge id. "
            f"Response keys: {list(data_start.keys())}"
        )

        # Step 2: Call register/verify with the OTP and password (assemble payload according to available fields)
        payload_verify = {"password": password}
        if otp:
            payload_verify["otp"] = otp
        if verification_token:
            payload_verify["verification_token"] = verification_token
        if verification_id:
            # some APIs expect the challenge id under different keys; include multiple possibilities
            payload_verify["verification_id"] = verification_id
            payload_verify["challenge"] = verification_id

        # Also include roll/email if API expects them
        payload_verify.setdefault("roll_number", roll_number)
        payload_verify.setdefault("email", email)

        try:
            resp_verify = session.post(register_verify_url, json=payload_verify, timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"Request to register/verify failed: {e}")

        assert resp_verify.status_code in (200, 201), f"Expected 200/201 from register/verify, got {resp_verify.status_code}: {resp_verify.text}"

        try:
            data_verify = resp_verify.json()
        except ValueError:
            raise AssertionError(f"register/verify did not return valid JSON: {resp_verify.text}")

        # Extract JWT / access token
        token_candidates = []
        for key in ("token", "access_token", "jwt", "id_token", "auth_token"):
            if key in data_verify and isinstance(data_verify[key], str) and data_verify[key]:
                token_candidates.append(data_verify[key])
        # Sometimes token may be nested under 'data' or 'result'
        if not token_candidates:
            for container_key in ("data", "result", "user", "session"):
                if container_key in data_verify and isinstance(data_verify[container_key], dict):
                    for key in ("token", "access_token", "jwt", "id_token", "auth_token"):
                        if key in data_verify[container_key] and isinstance(data_verify[container_key][key], str):
                            token_candidates.append(data_verify[container_key][key])

        assert token_candidates, f"No JWT/access token found in register/verify response: keys={list(data_verify.keys())}, body={data_verify}"
        token = token_candidates[0]
        assert isinstance(token, str) and token.strip(), "Extracted token is empty"

        # Step 3: Verify authenticated session by calling a protected endpoint with Bearer token
        auth_headers = {"Authorization": f"Bearer {token}"}
        try:
            resp_profile = session.get(me_profile_url, headers=auth_headers, timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"Request to me/profile failed: {e}")

        assert resp_profile.status_code == 200, f"Expected 200 from me/profile, got {resp_profile.status_code}: {resp_profile.text}"
        try:
            data_profile = resp_profile.json()
        except ValueError:
            raise AssertionError(f"me/profile did not return valid JSON: {resp_profile.text}")

        # Validate expected profile fields
        assert any(k in data_profile for k in ("email", "roll_number", "id", "userId", "name")), (
            f"Profile response does not contain expected user fields: {data_profile}"
        )

        print("TC003 passed: register/verify returned JWT and authenticated session is valid.")

    finally:
        # Cleanup: attempt to logout to invalidate the session if token exists
        if token:
            try:
                headers_logout = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                # Some APIs expect POST to logout, some DELETE; try POST then DELETE
                try:
                    resp_logout = session.post(logout_url, headers=headers_logout, timeout=TIMEOUT)
                    if resp_logout.status_code not in (200, 204):
                        # try DELETE as a fallback
                        resp_logout = session.delete(logout_url, headers=headers_logout, timeout=TIMEOUT)
                except requests.exceptions.RequestException:
                    # attempt DELETE if POST failed at transport level
                    try:
                        resp_logout = session.delete(logout_url, headers=headers_logout, timeout=TIMEOUT)
                    except requests.exceptions.RequestException:
                        resp_logout = None
                # No hard assertion in cleanup, but log if it failed
                if resp_logout is not None and resp_logout.status_code not in (200, 204):
                    print(f"Warning: logout returned unexpected status {resp_logout.status_code}: {getattr(resp_logout, 'text', '')}")
            except Exception as e:
                print(f"Warning: exception during logout cleanup: {e}")


if __name__ == "__main__":
    test_post_api_v1_auth_register_verify_valid_otp()