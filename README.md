# Klausurwerk · Englisch NRW

Eine Web-App für Lehrkräfte: aus einem Ausgangstext editierbare Englischaufgaben und einen bepunkteten Erwartungshorizont entwickeln und beide als getrennte Word-Dateien exportieren.

**Stand: erster privater Funktionsprototyp.** Die mitgelieferten Formatwerte und Beispielgewichtungen sind **keine verifizierten NRW-Vorgaben**. Alle Word-Dateien tragen die Kennzeichnung „Entwurf“. Der erste Umfang ist der textbezogene Klausurteil; Hörverstehen, Sprachmittlung, vollständige Abiturprüfungsvarianten und Notenschlüssel sind noch nicht umgesetzt.

## Web-Testversion ohne Anmeldung

Die Web-Testversion lädt einen handverfassten Beispielentwurf direkt im Browser. Aufgaben und Kriterien lassen sich bearbeiten, im eigenen Browser speichern und als zwei echte Word-Dateien herunterladen. Ein zusätzlicher JSON-Download sichert den Arbeitsstand. Es werden keine Texte oder Arbeitsdaten an eine API gesendet.

Diese Testversion enthält noch keine KI, PDF-Analyse oder PDF-/DOCX-Importfunktion. Text kann eingefügt oder als TXT/Markdown eingelesen werden. Die vollständige servergestützte App behält diese zusätzlichen Funktionen. Die NRW-Vorlagen sind weiterhin vorläufig.

Die öffentlichen Dateien liegen im Branch `gh-pages`. Für den normalen Weblink muss GitHub Pages einmalig mit der Quelle **gh-pages / (root)** aktiviert werden. Das Hochladen des Branches allein bestätigt keine erfolgreiche Veröffentlichung; deren Status und der öffentliche HTTP-Aufruf müssen separat geprüft werden.

Für die Entwicklung:

```bash
npm run build:demo --prefix frontend
npm run test:demo --prefix frontend
bash scripts/publish-demo.sh
```

Der Build erzeugt eine selbstständige HTML-Webseite unter `frontend/demo-dist/index.html`. `publish-demo.sh` veröffentlicht ausschließlich diese Webseite und `.nojekyll`, keine Original-PDFs, Datenbanken oder Zugangsdaten. Es verwendet keinen zusätzlichen Git-Worktree. Die Browserprüfungen testen den Webaufruf, Speicherung, echte Word-Strukturen, die Trennung von Schüler- und Lehrkraftdokument sowie die Nutzung ohne weitere API-Anfragen. Codespaces bleibt eine optionale Entwicklungsumgebung unter `.devcontainer/`; es ist nicht der vorgesehene Testzugang für Lehrkräfte.

## Starten

Voraussetzungen: Python 3.12 oder 3.13, `uv`, Node.js 22.12+ (hier mit 24.19 getestet), npm.

```bash
cd /workspace/EnglischklausurNRW
bash scripts/setup.sh
bash scripts/start.sh
```

Das Startskript betreibt API und gebautes Frontend gemeinsam auf Port 8000 und bindet nur an die lokale Schnittstelle. Für die Entwicklung mit automatischem Neuladen: `bash scripts/dev.sh` (API 8000, Vite 5173 mit API-Proxy). Bereits vorbereitete Abhängigkeiten und das Frontend bleiben auf der Platte, Prozesse müssen nach einem Neustart neu gestartet werden. Cloud-Tasks sind bereits isoliert; im vorhandenen Checkout arbeiten, keinen zusätzlichen Git-Worktree anlegen.

`setup.sh` verwendet die eingecheckten Lockfiles und darf wiederholt ausgeführt werden. In anderen Umgebungen können `UV_CACHE_DIR` und `npm_config_cache` auf beschreibbare Verzeichnisse gesetzt werden.

## Was bereits funktioniert

- Ausgangstext einfügen oder PDF, DOCX, UTF-8-TXT/Markdown importieren (max. 10 MB). Der Import liest Text und Word-Tabellen aus; Scans benötigen vorher OCR. Importiertes Material vor der Verwendung überprüfen.
- Kurs, Bearbeitungszeit, Schwerpunkt und Hilfsmittel festlegen.
- Aufgaben für AFB I–III, inhaltliche Kriterien, Zitate und Sprachbewertung manuell bearbeiten; Punkte werden aus den Kriterien berechnet.
- Klausuren und Wissenseinträge serverseitig in SQLite speichern und erneut öffnen. Gespeichert wird bewusst per Schaltfläche; ungespeicherte Änderungen werden beim Verlassen angekündigt.
- Wissen einmal importieren, redaktionell aufbereiten und mit Quelle freigeben. Änderungen heben die Freigabe in der Oberfläche auf. Nur ausgewählte, freigegebene Einträge werden an die KI übermittelt.
- Ein zentral gespeichertes Formatprofil bestimmt Schrift, Grundschriftgröße, Zeilenabstand, A4-Format und gleichmäßige Ränder. Titel sind im Prototyp fünf Punkte größer als die Grundschrift. Profiländerungen erhöhen die Versionsnummer. Alte Profilstände werden derzeit nicht archiviert.
- Unter **Formatprofil → Original-PDF untersuchen** lassen sich die in einer PDF enthaltenen Schriftnamen, Schriftgrößen und Seitengrößen auslesen und als JSON-Messbericht herunterladen. Das verändert das Word-Profil nicht automatisch. Seiten ohne auslesbaren Text werden ausdrücklich gemeldet. Gemessene Textgrenzen sind keine rekonstruierten Word-Seitenränder.
- Getrennte `.docx`-Dateien für Lernende und Lehrkräfte. Der Erwartungshorizont enthält Kriterien, Belege, Maximalpunkte und leere Felder für erreichte Punkte. Der Schülertext erhält echte Word-Zeilennummerierung (jede fünfte Zeile, Neustart pro Seite), keine von Browserumbrüchen abgeleiteten Zeilenangaben.
- Optionale KI-Vorschläge über eine serverseitige OpenAI-Anbindung. Fehlende Schlüssel werden klar angezeigt; es wird keine KI-Antwort simuliert.

Über **„Mit Beispiel ausprobieren“** lässt sich der gesamte Ablauf ohne Schlüssel prüfen. Der Beispieltext und seine Aufgaben wurden eigens für diesen Prototyp verfasst.

## KI einrichten

Im Serverprozess `LLM_API_KEY` setzen. Standardmodell: `gpt-4.1-mini`; mit `LLM_MODEL` austauschbar. Die Umgebung benötigt HTTPS-Zugriff auf `api.openai.com`. Der Schlüssel gehört in die sichere Umgebungskonfiguration, niemals in Git oder Browsercode. `.env.example` dokumentiert die Namen; eine `.env`-Datei wird nicht automatisch geladen. Lokale Entwickler können ihre eigene Datei vor dem Start in ihre Shell laden.

Vor jeder Übertragung zeigt die App Anbieter und Umfang an. Übermittelt werden Ausgangstext, Kurs, Zeit, Schwerpunkt und gezielt ausgewählte Wissenseinträge. Die vollständige Datenbank wird nicht übertragen. Für den Einsatz mit urheberrechtlich geschütztem Material muss die Lehrkraft die Berechtigung zur Übermittlung klären; personenbezogene Angaben gehören nicht in die Wissensbasis.

Der KI-Vorschlag muss das strukturierte Antwortschema erfüllen. Jeder inhaltliche Beleg muss wörtlich im Ausgangstext vorkommen. Unbrauchbare Antworten werden abgewiesen; gespeicherte Klausuren werden dadurch nicht überschrieben. Das beweist weder die fachliche Güte eines Kriteriums noch die Angemessenheit seiner Punkte. Die Sprachbewertung ergänzt die Lehrkraft selbst. Eine echte Anbieteranfrage ist ohne API-Zugang noch nicht geprüft; die Integration ist mit kontrollierten Antworten getestet.

## Daten und Betriebsgrenze

SQLite liegt unter `data/klausurwerk.sqlite3`; mit `APP_DATA_DIR` lässt sich ein privates, dauerhaftes Datenverzeichnis wählen. Die Originaldateien werden nicht gespeichert, sondern nur der extrahierte und anschließend gespeicherte Text. Das Datenverzeichnis ist von Git ausgeschlossen und muss im späteren Betrieb separat gesichert werden. Import und Speicherung sind zwei getrennte Schritte.

Der Prototyp hat noch keine Anmeldung, Mandantentrennung, differenzierten Berechtigungen oder Freigabehistorie. Er ist für einen privaten Arbeitsbereich gedacht. Vor einer Bereitstellung für mehrere Schulen sind diese Funktionen und ein abgestimmtes Datenschutz- und Betriebskonzept notwendig. Er wird durch dieses Repository nicht öffentlich bereitgestellt.

## Prüfen

```bash
.venv/bin/pytest -q
npm run build --prefix frontend
npm run test:e2e --prefix frontend
```

Die Browserprüfungen starten einen eigenen Server auf Port 8100 mit einer neuen temporären SQLite-Datenbank und deaktivierter KI. Sie verwenden Chromium unter `/usr/bin/chromium`; für andere Installationen `CHROMIUM_PATH` setzen. Die Python-Tests prüfen Speicherung, echte DOCX-Strukturen, PDF-Extraktion, Quellenfreigabe, Fehlerfälle und KI-Antwortvalidierung. Browserprüfungen testen Bearbeitung, erneutes Öffnen, beide Downloads, Wissensimport, Formatprofil und mobile Darstellung.

## Fachliche Abnahme als nächster Meilenstein

1. Eine gültige Referenzklausur, den zugehörigen Erwartungshorizont und die für Jahr/Kurs/Prüfungsvariante geltenden Vorgaben bereitstellen.
2. Dokumentgeometrie, Kopf-/Fußzeilen, Schriften, Zeilennummerierung und Bewertungsraster daraus ausdrücklich festlegen. Unterschiede zwischen Klausur und Erwartungshorizont sowie zwischen Prüfungsvarianten als eigene Vorlagen modellieren.
3. Musterfälle für fiktionale und nicht fiktionale Texte mit Fachlehrkräften abgleichen; Punktverteilungen, Operatoren und alternative Lösungen prüfen.
4. Diese Fälle als dauerhaftes fachliches Prüfset verwenden. Erst nach dieser Abnahme einen verbindlichen Konformitätsanspruch formulieren.

Die offizielle NRW-Website konnte bei der Erstentwicklung wegen der Netzrichtlinie nicht abgerufen werden; es wurden keine amtlichen Detailvorgaben daraus übernommen.

Inzwischen wurden zwei bereitgestellte PDF-Beispiele aus dem Abiturjahr 2025 untersucht. Die [Beobachtungen mit Seitenverweisen](docs/references/nrw-2025-observations.md) dokumentieren die gemeinsame Struktur. Sie sind Grundlage der weiteren Vorlagenentwicklung, noch kein Nachweis eines originalgetreuen Exports. Die PDFs werden auf ausdrücklichen Nutzerwunsch als Beispiele einer gemeinsamen Vorlage behandelt; es werden daraus keine eigenen GK-/LK-Formatregeln abgeleitet.

Die PDF-Analyse lässt sich auch ohne Browser reproduzieren:

```bash
.venv/bin/python -m scripts.analyze_pdf /pfad/zur/referenz.pdf data/reference-analysis/referenz.layout.json
```

Siehe [Architektur und Wissenskonzept](docs/architecture.md).
