import socket

class PenpalsHelper: # static class
    @staticmethod
    def find_open_port(start_port=5000, end_port=6000) -> int:
        for port in range(start_port, end_port):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex(('127.0.0.1', port)) != 0:
                    return port
        return -1
    
    