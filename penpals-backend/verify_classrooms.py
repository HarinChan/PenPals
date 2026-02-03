import urllib.request
import urllib.parse
import urllib.error
import json
import ssl

BASE_URL = "http://localhost:5001/api"

# Bypass SSL verification if needed (for localhost sometimes)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def make_request(url, method='GET', data=None, headers=None):
    if headers is None:
        headers = {}
    
    if data:
        data_bytes = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    else:
        data_bytes = None
        
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            return {
                'status_code': response.status,
                'json': json.load(response),
                'text': ''
            }
    except urllib.error.HTTPError as e:
        return {
            'status_code': e.code,
            'json': json.load(e) if e.headers.get_content_type() == 'application/json' else {},
            'text': e.reason
        }
    except Exception as e:
        print(f"Request error: {e}")
        return None

def run_verification():
    print("Starting verification...")

    # 1. Register/Login to get token
    email = "verifier@test.com"
    password = "Password123!"
    
    # Try login first
    print(f"Logging in as {email}...")
    response = make_request(f"{BASE_URL}/auth/login", method='POST', data={
        "email": email,
        "password": password
    })
    
    if not response:
        print("Failed to connect to backend. Is it running?")
        return

    if response['status_code'] != 200:
        print("Login failed, trying to register...")
        response = make_request(f"{BASE_URL}/auth/register", method='POST', data={
            "email": email,
            "password": password
        })
        if response and response['status_code'] == 201:
             print("Registration successful, logging in...")
             response = make_request(f"{BASE_URL}/auth/login", method='POST', data={
                "email": email,
                "password": password
            })
    
    if not response or response['status_code'] != 200:
        print("Authentication failed.")
        print(response)
        return

    token = response['json'].get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("Authentication successful.")

    # 2. Get Classrooms
    print("Fetching classrooms...")
    response = make_request(f"{BASE_URL}/classrooms", method='GET', headers=headers)
    
    if response and response['status_code'] == 200:
        data = response['json']
        print(f"Success! Status Code: {response['status_code']}")
        print(f"Count: {data.get('count')}")
        classrooms = data.get('classrooms', [])
        if classrooms:
            print("First classroom sample:")
            print(json.dumps(classrooms[0], indent=2))
        else:
            print("No classrooms found.")
            
        if data.get('count') >= 0:
            print("Verification PASSED: Endpoint returns valid structure.")
        else:
             print("Verification FAILED: 'count' missing or invalid.")
    else:
        print(f"Failed. Status Code: {response['status_code'] if response else 'Unknown'}")
        print(response)

if __name__ == "__main__":
    run_verification()
