import pytest

from backend.origins import origin_allowed


@pytest.fixture
def codespaces(monkeypatch):
    monkeypatch.setenv("CODESPACES", "true")
    monkeypatch.setenv("CODESPACE_NAME", "teacher-test-123")
    monkeypatch.setenv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
    monkeypatch.delenv("PORT", raising=False)


def test_codespace_forwarding_allows_only_its_own_origin(client, exam, codespaces):
    response = client.post("/api/exams", json=exam, headers={"Origin": "https://teacher-test-123-8000.app.github.dev"})
    assert response.status_code == 201
    for origin in ["https://other-test-123-8000.app.github.dev", "https://teacher-test-123-5173.app.github.dev", "http://teacher-test-123-8000.app.github.dev", "https://other.example"]:
        assert client.post("/api/exams", json=exam, headers={"Origin": origin}).status_code == 403


def test_forwarded_header_is_not_trusted(client, exam, monkeypatch):
    monkeypatch.delenv("CODESPACES", raising=False)
    response = client.post("/api/exams", json=exam, headers={"Origin": "https://other.example", "X-Forwarded-Host": "other.example"})
    assert response.status_code == 403


def test_codespace_settings_have_no_effect_outside_codespaces(codespaces, monkeypatch):
    monkeypatch.setenv("CODESPACES", "false")
    assert not origin_allowed("https://teacher-test-123-8000.app.github.dev", "localhost:8000")
    assert origin_allowed("http://localhost:8000", "localhost:8000")


@pytest.mark.parametrize("origin", ["null", "file://testserver", "https://testserver/path", "https://user@testserver", "https://testserver?query=yes"])
def test_invalid_origins_rejected(origin):
    assert not origin_allowed(origin, "testserver")
