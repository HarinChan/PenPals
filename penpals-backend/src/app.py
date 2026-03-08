#!/usr/bin/env python3
"""
PenPals Application Entry Point
Simple wrapper around main.py for deployment and production use.
"""

import os
import sys
from penpals_helper import PenpalsHelper

def find_available_port():
    """Find an available port for the application"""
    # Use fixed default port 5001 for consistency with frontend
    # Users can override with PORT environment variable if needed
    return 5001

def main():
    """Main application entry point"""
    # Import the Flask application
    from main import application
    
    # Determine port
    port = int(os.environ.get('PORT', find_available_port()))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"Starting PenPals backend server...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Debug mode: {debug}")
    
    try:
        application.run(host=host, port=port, debug=debug)
    except KeyboardInterrupt:
        print("\nShutting down PenPals backend server...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()