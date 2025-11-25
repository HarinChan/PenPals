import requests

class EngineHandler:
    def __init__(self, base_url):
        self.base_url = base_url

    def get_data(self, endpoint):
        """
        Fetch data from the server.
        
        :param endpoint: The specific API endpoint to access.
        :return: The response from the server.
        """
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.get(url)
            response.raise_for_status()  # Raise an error for bad responses
            return response.json()  # Parse JSON response
        except requests.RequestException as e:
            print(f"Error: {e}")
            return None

    def post_data(self, endpoint, data):
        """
        Send data to the server.
        
        :param endpoint: The specific API endpoint to access.
        :param data: The JSON data to send.
        :return: The response from the server.
        """
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()  # Raise an error for bad respponses
            return response.json()  # Parse JSON response
        except requests.RequestException as e:
            print(f"Error: {e}")
            return None