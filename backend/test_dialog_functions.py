
import os
import json
from datetime import datetime, timedelta
import time
import pytest
from fastapi.testclient import TestClient

# Temporarily add backend to path to import modules
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from web_integration import app, log_dialog_event
# Mock data
TEST_USER_ID = 123456789
HISTORY_FILE = 'backend/data/crm_history.jsonl'

# Test Client for FastAPI
# client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    # Setup: Ensure the history file is clean before each test
    if os.path.exists(HISTORY_FILE):
        os.remove(HISTORY_FILE)
    yield
    # Teardown: Clean up the history file after each test
    if os.path.exists(HISTORY_FILE):
        os.remove(HISTORY_FILE)

def test_log_dialog_event():
    """Tests if events are correctly written to the history file."""
    log_dialog_event(TEST_USER_ID, "dialog_started", initiated_by="user")
    assert os.path.exists(HISTORY_FILE)
    with open(HISTORY_FILE, 'r') as f:
        data = json.loads(f.readline())
        assert data["user_id"] == TEST_USER_ID
        assert data["action"] == "dialog_started"
        assert data["initiated_by"] == "user"
