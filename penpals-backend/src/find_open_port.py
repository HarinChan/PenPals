import socket

def find_open_port(start_port=5000, end_port=6000) -> int:
    for port in range(start_port, end_port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return -1

if __name__ == '__main__':
    open_port = find_open_port()
    if open_port != -1:
        print(f'Open port found: {open_port}')
    else:
        print('No open port found in the given range.')