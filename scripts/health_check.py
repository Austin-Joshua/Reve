#!/usr/bin/env python3
"""
Reve Platform - CLI Health Check Utility
Pings the backend service and prints human-readable diagnostic status.
"""
import sys
import json
import urllib.request
import urllib.error

API_URL = "http://localhost:8000/api/v1/health"

def main():
    print("=" * 60)
    print("Reve Platform - System Health Diagnostic")
    print("=" * 60)
    print(f"Connecting to: {API_URL}")

    try:
        req = urllib.request.Request(API_URL, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Overall Status: {data.get('status', 'unknown').upper()}")
            print(f"Environment:    {data.get('environment')}")
            print(f"Version:        {data.get('version')}")
            print("-" * 60)
            print("Subsystem Diagnostics:")
            for svc, details in data.get("services", {}).items():
                status_str = details.get("status", "unknown").upper()
                print(f"  • {svc:<15}: [{status_str}] {details}")
            print("=" * 60)
            return 0
    except urllib.error.URLError as e:
        print(f"ERROR: Failed to connect to backend at {API_URL}: {e}")
        print("Ensure the FastAPI server is running with: uvicorn app.main:app")
        return 1

if __name__ == "__main__":
    sys.exit(main())
