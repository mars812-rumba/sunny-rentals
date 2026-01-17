from fastapi import FastAPI
from fastapi.testclient import TestClient

app = FastAPI()

@app.get("/")
def read_main():
    return {"msg": "Hello World"}

def test_read_main():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"msg": "Hello World"}
