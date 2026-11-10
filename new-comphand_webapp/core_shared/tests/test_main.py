from __future__ import annotations
import pytest
from fastapi.testclient import TestClient
from main import app

# Create a TestClient using our FastAPI app
client = TestClient(app)

def test_get_config():
    """
    Test that the /config endpoint successfully returns a 200 status code
    and valid JSON data from the biller_config.json file.
    """
    response = client.get("/config")
    
    # Assert that the request was successful
    assert response.status_code == 200
    
    # Assert that the response is JSON and contains expected data structure
    data = response.json()
    assert isinstance(data, dict)
    
    # Check if 'biller_id' key exists in the first item (assuming typical structure)
    # Even if it's empty, it should be a dict. If you have specific keys, test for them.
    # For a general sanity check, just making sure it's not empty is a good start.
    assert len(data) > 0
