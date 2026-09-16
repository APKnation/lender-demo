import requests
import json

base_url = "http://localhost:8000/api"

def run():
    print("Logging in...")
    r = requests.post(f"{base_url}/auth/token/", json={"email": "admin@lender.local", "password": "admin-pass-123"})
    if r.status_code != 200:
        print("Login failed:", r.status_code, r.text)
        return
    token = r.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Fetching borrowers...")
    r1 = requests.get(f"{base_url}/borrowers/list/", headers=headers)
    print("Borrowers:", r1.status_code)
    if r1.status_code != 200: print(r1.text)

    print("Fetching audit logs...")
    r2 = requests.get(f"{base_url}/audit/logs/", headers=headers)
    print("Logs:", r2.status_code)
    if r2.status_code != 200: print(r2.text)

    print("Fetching credit results...")
    r3 = requests.get(f"{base_url}/audit/credit-results/", headers=headers)
    print("Credit Results:", r3.status_code)
    if r3.status_code != 200: print(r3.text)

if __name__ == "__main__":
    run()
