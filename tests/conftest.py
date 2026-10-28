import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("APP_DATA_DIR", str(tmp_path))
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def exam():
    return {
        "title": "The Last Bus", "course": "Q1 GK", "duration": 135,
        "text_type": "non-fiction", "source_title": "A town in motion",
        "source_reference": "An original test text, 2026.",
        "source_text": "Maya lost her job. The bus was more than transport. Residents demanded a fair trial.",
        "tasks": [
            {"area": "I", "instruction": "Outline the consequences.", "criteria": [{"description": "Benannt wird der Jobverlust.", "points": 10, "evidence": "Maya lost her job."}]},
            {"area": "II", "instruction": "Analyse the language.", "criteria": [{"description": "Erläutert die Bedeutung für die Teilhabe.", "points": 16, "evidence": "The bus was more than transport."}]},
            {"area": "III", "instruction": "Assess the council's decision.", "criteria": [{"description": "Wägt die Forderungen ab.", "points": 14, "evidence": "Residents demanded a fair trial."}]},
        ],
        "language_criteria": [{"description": "Sprachliche Leistung (Beispielgewichtung)", "points": 60}],
    }
