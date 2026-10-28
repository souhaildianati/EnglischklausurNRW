from io import BytesIO

import pytest
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, FloatObject, NameObject

from backend.pdf_analysis import font_family


@pytest.fixture
def reference_pdf():
    writer = PdfWriter()
    page = writer.add_blank_page(width=595.32, height=841.92)
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
    page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})})
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 50 700 Td (Reference example) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(stream)
    return writer


def pdf_bytes(writer):
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_reference_analysis_measures_fonts_and_geometry_without_changing_profile(client, reference_pdf):
    before = client.get("/api/profile").json()
    response = client.post("/api/analyze-pdf", files={"file": ("reference.pdf", pdf_bytes(reference_pdf))})
    assert response.status_code == 200
    result = response.json()
    assert result["page_count"] == result["pages_with_text"] == 1
    assert result["fonts"][0] == {"pdf_name": "Helvetica", "name": "Helvetica", "size_pt": 12, "characters": 16}
    assert result["pages"][0]["width_pt"] == 595.32
    assert result["pages"][0]["text_bounds_pt"]["left"] == 50
    assert len(result["sha256"]) == 64
    assert "keine Word-Seitenränder" in result["notice"]
    assert client.get("/api/profile").json() == before
    assert client.get("/api/knowledge").json() == []


def test_pdf_user_unit_applies_to_font_and_geometry(client, reference_pdf):
    reference_pdf.pages[0][NameObject("/UserUnit")] = FloatObject(2)
    response = client.post("/api/analyze-pdf", files={"file": ("scaled.pdf", pdf_bytes(reference_pdf))})
    result = response.json()
    assert response.status_code == 200
    assert result["fonts"][0]["size_pt"] == 24
    assert result["pages"][0]["text_bounds_pt"]["left"] == 100
    assert result["pages"][0]["width_pt"] == 1190.64


def test_pages_without_text_are_reported_without_inventing_fonts(client):
    writer = PdfWriter()
    writer.add_blank_page(width=595.32, height=841.92)
    response = client.post("/api/analyze-pdf", files={"file": ("scan-or-blank.pdf", pdf_bytes(writer))})
    assert response.status_code == 200
    result = response.json()
    assert result["pages_with_text"] == 0
    assert result["fonts"] == []
    assert result["pages"][0]["text_bounds_pt"] is None
    assert result["pages"][0]["status"] == "no_extractable_text"


def test_analysis_rejects_unreadable_encrypted_or_oversized_files(client, reference_pdf):
    assert client.post("/api/analyze-pdf", files={"file": ("wrong.txt", b"text")}).status_code == 415
    assert client.post("/api/analyze-pdf", files={"file": ("broken.pdf", b"not a pdf")}).status_code == 422
    reference_pdf.encrypt("test-password")
    assert client.post("/api/analyze-pdf", files={"file": ("encrypted.pdf", pdf_bytes(reference_pdf))}).status_code == 422
    assert client.post("/api/analyze-pdf", files={"file": ("huge.pdf", b"x" * (10 * 1024 * 1024 + 1))}).status_code == 413


def test_analysis_rejects_excessive_page_count(client):
    writer = PdfWriter()
    for _ in range(101):
        writer.add_blank_page(width=595, height=842)
    assert client.post("/api/analyze-pdf", files={"file": ("long.pdf", pdf_bytes(writer))}).status_code == 422


def test_font_subset_prefix_is_not_mistaken_for_a_different_font():
    assert font_family("BBELOR+LiberationSerif") == "LiberationSerif"
    assert font_family("LiberationSerif-Italic") == "LiberationSerif-Italic"
