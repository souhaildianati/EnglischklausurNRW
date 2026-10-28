"""Usage: .venv/bin/python -m scripts.analyze_pdf input.pdf report.json"""

import argparse
import json
from pathlib import Path

from backend.pdf_analysis import analyze_pdf


def main():
    parser = argparse.ArgumentParser(description="Schriften und Seitengeometrie aus einer Referenz-PDF auslesen.")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    with args.input.open("rb") as stream:
        data = stream.read(10 * 1024 * 1024 + 1)
    report = analyze_pdf(data, args.input.name)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{report['filename']}: {report['pages_with_text']}/{report['page_count']} Seiten mit auslesbarem Text. Bericht: {args.output}")


if __name__ == "__main__":
    main()
