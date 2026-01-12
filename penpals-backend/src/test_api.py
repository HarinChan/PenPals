#!/usr/bin/env python3
"""
Test script for PenPals API endpoints
"""
import requests
import json

BASE_URL = "http://127.0.0.1:5001"

def test_register():
    """Test account registration"""
    print("Testing account registration...")
    data = {
        "email": "teacher@example.com",
        "password": "TestPass123!",
        "organization": "Test School"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json=data)
    print(f"Register response: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 201

def test_login():
    """Test account login"""
    print("\nTesting account login...")
    data = {
        "email": "teacher@example.com",
        "password": "TestPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=data)
    print(f"Login response: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    
    if response.status_code == 200:
        return result.get('access_token')
    return None

def test_create_classroom(token):
    """Test classroom creation"""
    print("\nTesting classroom creation...")
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "name": "Grade 5A",
        "location": "London, UK",
        "latitude": "51.5074",
        "longitude": "-0.1278",
        "class_size": 25,
        "interests": ["science", "art", "music", "geography"],
        "availability": [
            {"day": "Monday", "time": "10:00-11:00"},
            {"day": "Wednesday", "time": "14:00-15:00"}
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/classrooms", json=data, headers=headers)
    print(f"Create classroom response: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    
    if response.status_code == 201:
        return result.get('classroom', {}).get('id')
    return None

def test_search_classrooms(token):
    """Test classroom search"""
    print("\nTesting classroom search...")
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "interests": ["science", "art"],
        "n_results": 5
    }
    
    response = requests.post(f"{BASE_URL}/api/classrooms/search", json=data, headers=headers)
    print(f"Search response: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    return response.status_code == 200

def test_get_account(token):
    """Test get account details"""
    print("\nTesting get account...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/api/account", headers=headers)
    print(f"Get account response: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    return response.status_code == 200

def test_account_stats(token):
    """Test account stats endpoint"""
    print("\nTesting account stats...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/api/account/stats", headers=headers)
    print(f"Account stats response: {response.status_code}")
    result = response.json()
    print(f"Response: {result}")
    return response.status_code == 200

def main():
    """Run all tests"""
    print("Starting PenPals API tests...")
    
    # Test registration
    if not test_register():
        print("Registration failed, stopping tests")
        return
    
    # Test login
    token = test_login()
    if not token:
        print("Login failed, stopping tests")
        return
    
    # Test account endpoints
    test_get_account(token)
    test_account_stats(token)
    
    # Test classroom creation
    classroom_id = test_create_classroom(token)
    if classroom_id:
        print(f"Created classroom with ID: {classroom_id}")
    
    # Test classroom search
    test_search_classrooms(token)
    
    print("\nAll tests completed!")

if __name__ == "__main__":
    main()