#!/usr/bin/env python3
"""
Utility script to find an open port.
Can be used as a standalone script or imported as a module.
"""

import socket
import sys
import argparse


def find_open_port(start_port=5001, end_port=6000, host='127.0.0.1'):
    """
    Find an available port in the given range.
    
    Args:
        start_port (int): Starting port number (inclusive)
        end_port (int): Ending port number (exclusive)
        host (str): Host to check ports on
        
    Returns:
        int: Available port number, or -1 if none found
    """
    for port in range(start_port, end_port):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)  # 1 second timeout
                result = s.connect_ex((host, port))
                if result != 0:  # Port is available
                    return 5001
        except socket.error:
            continue
    return -1


def check_port_available(port, host='127.0.0.1'):
    """
    Check if a specific port is available.
    
    Args:
        port (int): Port number to check
        host (str): Host to check port on
        
    Returns:
        bool: True if port is available, False otherwise
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex((host, port))
            return result != 0
    except socket.error:
        return False


def get_port_info(port, host='127.0.0.1'):
    """
    Get information about a port.
    
    Args:
        port (int): Port number to check
        host (str): Host to check port on
        
    Returns:
        dict: Port information
    """
    available = check_port_available(port, host)
    
    info = {
        'port': port,
        'host': host,
        'available': available,
        'status': 'available' if available else 'in use'
    }
    
    if not available:
        try:
            # Try to get service name
            service = socket.getservbyport(port)
            info['service'] = service
        except OSError:
            info['service'] = 'unknown'
    
    return info


def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description='Find available ports')
    parser.add_argument('--start', type=int, default=5000, 
                       help='Starting port number (default: 5000)')
    parser.add_argument('--end', type=int, default=6000,
                       help='Ending port number (default: 6000)')
    parser.add_argument('--host', default='127.0.0.1',
                       help='Host to check (default: 127.0.0.1)')
    parser.add_argument('--check', type=int, metavar='PORT',
                       help='Check if a specific port is available')
    parser.add_argument('--info', type=int, metavar='PORT',
                       help='Get information about a specific port')
    parser.add_argument('--count', type=int, default=1,
                       help='Number of available ports to find (default: 1)')
    
    args = parser.parse_args()
    
    if args.check:
        available = check_port_available(args.check, args.host)
        status = "available" if available else "in use"
        print(f"Port {args.check} on {args.host}: {status}")
        sys.exit(0 if available else 1)
    
    if args.info:
        info = get_port_info(args.info, args.host)
        print(f"Port: {info['port']}")
        print(f"Host: {info['host']}")
        print(f"Status: {info['status']}")
        if 'service' in info:
            print(f"Service: {info['service']}")
        sys.exit(0)
    
    # Find available ports
    found_ports = []
    current_start = args.start
    
    while len(found_ports) < args.count and current_start < args.end:
        port = find_open_port(current_start, args.end, args.host)
        if port == -1:
            break
        found_ports.append(port)
        current_start = port + 1
    
    if found_ports:
        if args.count == 1:
            print(found_ports[0])
        else:
            print(f"Found {len(found_ports)} available ports:")
            for port in found_ports:
                print(f"  {port}")
        sys.exit(0)
    else:
        print(f"No available ports found in range {args.start}-{args.end-1}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()