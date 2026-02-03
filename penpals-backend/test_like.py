import requests

API_BASE = "http://127.0.0.1:5001/api"
EMAIL = "me@penpals.com"
PASSWORD = "Metest123!"

def test_like_persistence():
    # 1. Login
    print("Logging in...")
    resp = requests.post(f"{API_BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    token = resp.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in.")

    # 2. Get posts to find one to like
    print("Fetching posts...")
    resp = requests.get(f"{API_BASE}/posts", headers=headers)
    if resp.status_code != 200:
        print(f"Fetch posts failed: {resp.text}")
        return
    
    posts = resp.json()['posts']
    if not posts:
        print("No posts found!")
        return
        
    target_post = posts[0]
    post_id = target_post['id']
    initial_likes = target_post['likes']
    print(f"Target Post ID: {post_id}, Initial Likes: {initial_likes}")

    # 3. Like the post
    print(f"Liking post {post_id}...")
    resp = requests.post(f"{API_BASE}/posts/{post_id}/like", headers=headers)
    
    if resp.status_code == 200:
        new_likes = resp.json()['likes']
        print(f"Like successful. Returned Likes: {new_likes}")
        
        if new_likes == initial_likes + 1:
            print("SUCCESS: Like count incremented correctly.")
        else:
            print(f"FAILURE: Like count mismatch. Expected {initial_likes + 1}, got {new_likes}")
    else:
        print(f"Like failed with status {resp.status_code}: {resp.text}")

    # 4. Verify persistence (fetch again)
    print("Verifying persistence...")
    resp = requests.get(f"{API_BASE}/posts", headers=headers)
    updated_post = next(p for p in resp.json()['posts'] if p['id'] == post_id)
    print(f"fetched updated likes: {updated_post['likes']}")

if __name__ == "__main__":
    test_like_persistence()
