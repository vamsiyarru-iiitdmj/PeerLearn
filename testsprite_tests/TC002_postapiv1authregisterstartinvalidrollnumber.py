import requests
import sys

BASE_URL = "http://localhost:3001"
ENDPOINT = "/api/v1/auth/register/start"
TIMEOUT = 30


def _collect_strings(obj):
    strings = []
    if isinstance(obj, str):
        strings.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            strings.extend(_collect_strings(v))
    elif isinstance(obj, list) or isinstance(obj, tuple):
        for item in obj:
            strings.extend(_collect_strings(item))
    return strings


def test_postapiv1authregisterstartinvalidrollnumber():
    url = BASE_URL.rstrip("/") + ENDPOINT
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Use a roll number that's very unlikely to exist and an institute email
    payload = {
        # include common key variants; backend should pick the correct one if named differently
        "rollNumber": "INVALIDROLL9999",
        "roll_number": "INVALIDROLL9999",
        "email": "invalidroll9999@iiitdmj.ac.in",
        "instituteEmail": "invalidroll9999@iiitdmj.ac.in"
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    # Expect a client error (4xx). It should not succeed.
    assert 400 <= resp.status_code < 500, (
        f"Expected 4xx client error for invalid/unknown roll number, got status {resp.status_code}. "
        f"Response text: {resp.text}"
    )

    # Try to validate response body contains an error message referencing roll number invalid/unknown/not found
    found_message = False
    try:
        body = resp.json()
        strings = _collect_strings(body)
        for s in strings:
            sl = s.lower()
            if "roll" in sl and ("invalid" in sl or "unknown" in sl or "not found" in sl or "notfound" in sl):
                found_message = True
                break
        # fallback: message may not mention 'roll' word but indicate not found
        if not found_message:
            for s in strings:
                sl = s.lower()
                if ("invalid" in sl or "unknown" in sl or "not found" in sl or "notfound" in sl) and any(k in sl for k in ("roll", "roll number", "rollnumber", "roll_no")):
                    found_message = True
                    break
    except ValueError:
        # Not JSON; use text search as last resort
        text = resp.text or ""
        tl = text.lower()
        if "roll" in tl and ("invalid" in tl or "unknown" in tl or "not found" in tl or "notfound" in tl):
            found_message = True

    assert found_message, (
        "Error response did not indicate an invalid/unknown roll number. "
        f"Status: {resp.status_code}, Response: {resp.text}"
    )

    # If reached here, test passed
    print("TC002 passed: invalid/unknown roll number correctly rejected.")


if __name__ == "__main__":
    try:
        test_postapiv1authregisterstartinvalidrollnumber()
    except AssertionError as e:
        print(f"TC002 failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC002 encountered an unexpected error: {e}")
        sys.exit(2)
    sys.exit(0)