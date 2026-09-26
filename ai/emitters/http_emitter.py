"""
HTTP Event Emitter (Phase 6 Integration)
Pushes inference events to the FastAPI backend asynchronously without blocking video processing.
"""

import os
import json
import logging
import requests

class HTTPEmitter:
    def __init__(self, backend_url: str = None, timeout_sec: float = 0.5):
        if backend_url is None:
            base_url = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
            self.backend_url = f"{base_url}/api/ai/events/inference" if not base_url.endswith("/api/ai/events/inference") else base_url
        else:
            self.backend_url = backend_url
        self.timeout_sec = timeout_sec

    def emit_event(self, event_payload: dict) -> bool:
        """
        Sends an inference event JSON payload to the FastAPI backend.
        """
        try:
            resp = requests.post(
                self.backend_url,
                json=event_payload,
                timeout=self.timeout_sec
            )
            return resp.status_code == 200
        except Exception:
            # Non-blocking: fail gracefully if backend is offline
            return False
