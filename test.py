import httpx
import time
import json

BASE_URL = "http://127.0.0.1:8000/api"

def run_test():
    print("1. Registering Agent 1 (Dummy JSON API)...")
    a1 = httpx.post(f"{BASE_URL}/registry", json={
        "name": "JSONPlaceholder",
        "endpoint": "https://jsonplaceholder.typicode.com/posts",
        "description": "Dummy API",
        "headers": {},
        "schema_hint": ""
    }).json()
    print("Agent 1 ID:", a1["id"])

    print("2. Registering Agent 2 (HttpBin Echo)...")
    a2 = httpx.post(f"{BASE_URL}/registry", json={
        "name": "HttpBin",
        "endpoint": "https://httpbin.org/post",
        "description": "Echoes back the request",
        "headers": {},
        "schema_hint": ""
    }).json()
    print("Agent 2 ID:", a2["id"])

    print("3. Creating Workflow...")
    wf = httpx.post(f"{BASE_URL}/workflows", json={
        "name": "Test Universal Pipeline",
        "nodes": [a1["id"], a2["id"]],
        "edges": [
            {"source": a1["id"], "target": a2["id"], "mapping_prompt": "Map the id of the post to user_id"}
        ]
    }).json()
    print("Workflow ID:", wf["id"])

    print("4. Executing Workflow...")
    exec_resp = httpx.post(f"{BASE_URL}/execute/{wf['id']}", json={
        "initial_payload": {"title": "foo", "body": "bar", "userId": 1},
        "llm_api_key": "dummy_key",
        "llm_model": "openai/gpt-4o"
    }).json()
    
    exec_id = exec_resp["execution_id"]
    print("Execution ID:", exec_id)

    print("5. Polling Execution Status...")
    for _ in range(10):
        time.sleep(2)
        status_resp = httpx.get(f"{BASE_URL}/executions/{exec_id}").json()
        print(f"Status: {status_resp['status']}")
        if status_resp['status'] == 'success' or status_resp['status'] == 'failed':
            print("Final Payload:", json.dumps(status_resp['payload'], indent=2))
            print("Logs:", json.dumps(status_resp['logs'], indent=2))
            break

if __name__ == "__main__":
    run_test()
