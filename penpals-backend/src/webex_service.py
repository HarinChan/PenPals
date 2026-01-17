import os
import requests
from datetime import datetime
import json

class WebexService:
    BASE_URL = "https://webexapis.com/v1"
    
    def __init__(self):
        self.access_token = os.environ.get('WEBEX_ACCESS_TOKEN')
        
    def _get_headers(self):
        if not self.access_token:
            # Fallback for development/testing if token is not set
            print("WARNING: WEBEX_ACCESS_TOKEN not set")
            return {}
            
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def create_meeting(self, title, start_time: datetime, end_time: datetime, attendees=None):
        """
        Create a WebEx meeting.
        
        args:
            title: Meeting title
            start_time: start datetime object
            end_time: end datetime object
            attendees: list of email addresses (optional)
        """
        if not self.access_token:
            # Mock response for development if no token
            print("Mocking WebEx meeting creation")
            return {
                "id": f"mock_webex_id_{datetime.now().timestamp()}",
                "title": title,
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "webLink": "https://meet.jit.si/PenPalsMockMeeting" # Fallback to Jitsi or just a placeholder
            }

        url = f"{self.BASE_URL}/meetings"
        
        # WebEx expects ISO 8601 format
        payload = {
            "title": title,
            "start": start_time.strftime('%Y-%m-%dT%H:%M:%S'),
            "end": end_time.strftime('%Y-%m-%dT%H:%M:%S'),
            "enabledAutoRecordMeeting": False,
            "allowAnyUserToBeCoHost": True
        }
        
        # Note: timezone handling is important. 
        # For simplicity assuming the server time or UTC, 
        # but real WebEx API might want a timezone field or proper offset in string.
        
        try:
            response = requests.post(url, headers=self._get_headers(), json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error creating WebEx meeting: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")
            raise e
