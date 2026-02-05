import requests
import json

BASE_URL = "http://127.0.0.1:5001"

def login():
    try:
        # Login as 'me'
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "me@penpals.com",
            "password": "Metest123!"
        })
        if resp.status_code == 200:
            return resp.json().get('access_token')
        print(f"Login failed: {resp.text}")
        return None
    except Exception as e:
        print(f"Connection error: {e}")
        return None

def check_availability(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get all classrooms
    resp = requests.get(f"{BASE_URL}/api/classrooms", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to fetch classrooms: {resp.text}")
        return

    classrooms = resp.json().get('classrooms', [])
    if not classrooms:
        print("No classrooms found")
        return

    print(f"Found {len(classrooms)} classrooms.")
    
    # Pick one with availability
    for c in classrooms:
        avail = c.get('availability')
        if avail:
            print(f"\nClassroom: {c.get('name')} (ID: {c.get('id')})")
            print(f"Availability Type: {type(avail)}")
            print(f"Availability Data: {json.dumps(avail, indent=2)}")
            break

if __name__ == "__main__":
    token = login()
    if token:
        check_availability(token)
