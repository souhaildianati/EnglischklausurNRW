"""Measured PDF data, deliberately separate from inferred Word template settings."""

import hashlib
import math
import re
from collections import Counter
from io import BytesIO

import pdfplumber
from fastapi import HTTPException
from pypdf import PdfReader


def font_family(name: str) -> str:
    # PDF subsets have random prefixes; removing one does not identify a Word font.
    return re.sub(r"^[A-Z]{6}\+", "", name)


def font_summary(counter):
    return [{"pdf_name": font, "name": font_family(font), "size_pt": size, "characters": count}
            for (font, size), count in counter.most_common()]


def analyze_pdf(data: bytes, filename: str):
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "PDF-Dateien dürfen höchstens 10 MB groß sein.")
    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            raise HTTPException(422, "Verschlüsselte PDFs werden nicht unterstützt.")
        if len(reader.pages) > 100:
            raise HTTPException(422, "Bitte einen Ausschnitt mit höchstens 100 Seiten analysieren.")
        pages = []
        total = Counter()
        with pdfplumber.open(BytesIO(data)) as pdf:
            for index, page in enumerate(pdf.pages, 1):
                unit = float(reader.pages[index - 1].get("/UserUnit", 1))
                if not math.isfinite(unit) or unit <= 0:
                    raise ValueError("Invalid PDF coordinate unit")
                chars = [char for char in page.chars if char.get("text", "").strip()]
                fonts = Counter((str(c.get("fontname", "Unbekannt")), round(float(c["size"]) * unit, 2)) for c in chars)
                total.update(fonts)
                # These are the visible glyph bounds, NOT the original page margins.
                bounds = None if not chars else {
                    "left": round(min(c["x0"] for c in chars) * unit, 2),
                    "top": round(min(c["top"] for c in chars) * unit, 2),
                    "right": round(max(c["x1"] for c in chars) * unit, 2),
                    "bottom": round(max(c["bottom"] for c in chars) * unit, 2),
                }
                pages.append({"page": index, "width_pt": round(page.width * unit, 2),
                              "height_pt": round(page.height * unit, 2), "rotation": page.rotation,
                              "characters": len(chars), "images": len(page.images),
                              "status": "text" if chars else "no_extractable_text",
                              "fonts": font_summary(fonts), "text_bounds_pt": bounds,
                              "drawing_lines": len(page.lines), "drawing_rectangles": len(page.rects)})
                page.close()
        return {
            "filename": filename, "sha256": hashlib.sha256(data).hexdigest(),
            "page_count": len(pages), "pages_with_text": sum(p["status"] == "text" for p in pages),
            "fonts": font_summary(total), "pages": pages,
            "notice": "Gemessene PDF-Daten, keine rekonstruierte Word-Vorlage. PDF-Schriftnamen können Teilmengen oder Ersatzschriften bezeichnen. Größen beziehen sich auf die PDF-Zeichengeometrie; gedrehte oder skalierte Schrift gesondert prüfen. Textgrenzen sind keine Word-Seitenränder. Ohne auslesbaren Text lassen sich Schriftart und -größe nicht verlässlich auslesen. Das Formatprofil wird durch die Analyse nicht verändert.",
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Die PDF konnte nicht analysiert werden. Bitte eine gültige, unverschlüsselte Original-PDF verwenden.") from None
