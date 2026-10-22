import requests
import json

INSFORGE_URL = "https://c35py4a8.us-east.insforge.app"
API_KEY = "ik_fa11d50c13a48c14fcd786fd165ea331"

headers = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("=== 1. Check academic_records for 25BCS270 ===")
r = requests.get(f"{INSFORGE_URL}/rest/v1/academic_records?roll_number=eq.25BCS270", headers=headers)
print("academic_records:", r.status_code, r.text)

print("\n=== 2. Check students for 25BCS270 ===")
r = requests.get(f"{INSFORGE_URL}/rest/v1/students?roll_number=eq.25BCS270", headers=headers)
print("students by roll:", r.status_code, r.text)

print("\n=== 3. Check students for 25bcs270@iiitdmj.ac.in ===")
r = requests.get(f"{INSFORGE_URL}/rest/v1/students?institute_email=eq.25bcs270@iiitdmj.ac.in", headers=headers)
print("students by email:", r.status_code, r.text)

print("\n=== 4. Check pending_registrations ===")
r = requests.get(f"{INSFORGE_URL}/rest/v1/pending_registrations?roll_number=eq.25BCS270", headers=headers)
print("pending_registrations:", r.status_code, r.text)

print("\n=== 5. Test Auth signInWithPassword for 25bcs270@iiitdmj.ac.in with vamsi056 ===")
auth_payload = {"email": "25bcs270@iiitdmj.ac.in", "password": "vamsi056"}
r = requests.post(f"{INSFORGE_URL}/auth/v1/token?grant_type=password", json=auth_payload, headers=headers)
print("Auth token response:", r.status_code, r.text)

print("\n=== 6. Test Auth signInWithPassword for 25bcs270@iiitdmj.ac.in with Password123! ===")
auth_payload2 = {"email": "25bcs270@iiitdmj.ac.in", "password": "Password123!"}
r = requests.post(f"{INSFORGE_URL}/auth/v1/token?grant_type=password", json=auth_payload2, headers=headers)
print("Auth token response with Password123!:", r.status_code, r.text)
