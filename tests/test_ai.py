import json
from copy import deepcopy

import httpx

from backend import ai


def mock_provider(monkeypatch, content, captured, status=200):
    class FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, url, **kwargs):
            captured.update(kwargs)
            return httpx.Response(status, json={"choices": [{"message": {"content": json.dumps(content)}}]})

    monkeypatch.setattr(ai.httpx, "AsyncClient", FakeClient)
    monkeypatch.setenv("LLM_API_KEY", "test-secret-never-return")


def test_generated_content_validated_and_only_selected_knowledge_sent(client, exam, monkeypatch):
    first = client.post("/api/knowledge", json={"title": "Approved source", "kind": "Regel", "content": "Prefer precise operators.", "reference": "Teacher reference", "reviewed": True}).json()
    client.post("/api/knowledge", json={"title": "Not selected", "content": "This must not be sent."})
    exam["knowledge_ids"] = [first["id"]]
    captured = {}
    mock_provider(monkeypatch, {"tasks": exam["tasks"], "notes": "Teacher review required."}, captured)
    response = client.post("/api/generate", json={"exam": exam})
    assert response.status_code == 200
    assert response.json()["tasks"][0]["criteria"][0]["evidence"] == "Maya lost her job."
    sent = json.loads(captured["json"]["messages"][1]["content"])
    assert [s["id"] for s in sent["knowledge"]] == [first["id"]]
    assert "This must not be sent." not in json.dumps(sent)
    assert "test-secret" not in response.text
    assert client.get("/api/exams").json() == []  # Proposals do not silently overwrite saved work.


def test_unverified_knowledge_blocks_external_request(client, exam, monkeypatch):
    source = client.post("/api/knowledge", json={"title": "Unreviewed", "content": "A draft rule."}).json()
    exam["knowledge_ids"] = [source["id"]]
    captured = {}
    mock_provider(monkeypatch, {"tasks": exam["tasks"], "notes": "Draft"}, captured)
    assert client.post("/api/generate", json={"exam": exam}).status_code == 422
    assert not captured


def test_invented_evidence_is_rejected(client, exam, monkeypatch):
    tasks = deepcopy(exam["tasks"])
    tasks[0]["criteria"][0]["evidence"] = "This is not in the source."
    mock_provider(monkeypatch, {"tasks": tasks, "notes": "Draft"}, {})
    response = client.post("/api/generate", json={"exam": exam})
    assert response.status_code == 502
    assert "Textbeleg" in response.json()["detail"]


def test_invalid_structure_and_provider_errors_are_rejected(client, exam, monkeypatch):
    mock_provider(monkeypatch, {"tasks": [], "notes": "Draft"}, {})
    assert client.post("/api/generate", json={"exam": exam}).status_code == 502
    mock_provider(monkeypatch, {}, {}, status=401)
    response = client.post("/api/generate", json={"exam": exam})
    assert response.status_code == 502
    assert "401" in response.json()["detail"]
    assert "test-secret" not in response.text
