#!/usr/bin/env python3
"""
PenPals Application Entry Point
Simple wrapper around main.py for deployment and production use.
"""

import os
import sys
import socket

def check_port_available(port, host='127.0.0.1'):
    """Check if a port is available"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex((host, port))
            return result != 0
    except socket.error:
        return False

def main():
    """Main application entry point"""
    # Import the Flask application
    from main import application
    
    # Determine port - default to 5001 for consistency with frontend
    default_port = 5001
    port = int(os.environ.get('PORT', default_port))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Check if port is available (only if using default)
    if port == default_port and not check_port_available(port, '127.0.0.1'):
        print(f"ERROR: Port {port} is already in use!")
        print(f"Please free up port {port} or set a different port using the PORT environment variable:")
        print(f"  export PORT=5002")
        print(f"  python src/app.py")
        sys.exit(1)
    
    print(f"Starting PenPals backend server...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Debug mode: {debug}")
    print(f"\n{'='*60}")
    print(f"  Backend API available at: http://127.0.0.1:{port}/api")
    if port != default_port:
        print(f"  WARNING: Using non-default port {port}")
        print(f"  Update frontend settings to connect to this port")
    print(f"{'='*60}\n")
    
    try:
        application.run(host=host, port=port, debug=debug)
    except KeyboardInterrupt:
        print("\nShutting down PenPals backend server...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()