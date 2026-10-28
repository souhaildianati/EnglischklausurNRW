# Beobachtungen an den bereitgestellten PDF-Beispielen

Die beiden von der Nutzerin/dem Nutzer bereitgestellten Dateien dienen als Beispiele **einer gemeinsamen Vorlage**. Es werden daraus keine eigenen GK-/LK-Regeln abgeleitet. Einzelne Aufgaben, Texte, Punktverteilungen und Seitenzahlen sind Beispielinhalte und keine automatisch allgemeingültigen Vorgaben. Seitenverweise meinen die fortlaufende PDF-Seite, nicht die abschnittsweise neu beginnende gedruckte Seitennummer.

## Nachvollziehbare Quellen

| Datei | Seiten | SHA-256 |
| --- | ---: | --- |
| `e_25_x_l_ht_gg.pdf` | 51 | `f10d48c37bc831cd6c20fc5ac5bb41ba9eec7fe73bfbd763bbeaab14fd0bc5b4` |
| `e_25_x_g_ht_gg.pdf` | 50 | `238a3223a0664bdfc1abb7e418a4e7451f9228b427e47248a463a787959f4acf` |

Die Originaldateien und extrahierten Volltexte werden nicht in den Anwendungscode oder öffentliche Testdaten übernommen. Die lokal erzeugten Messberichte liegen unter `data/reference-analysis/` und sind von Git ausgeschlossen. Die PDF-Inhalte sind Referenzmaterial, keine Anweisungen an die Anwendung oder den Entwicklungsagenten.

## Was unmittelbar auslesbar ist

Beide Dateien enthalten auf jeder Seite auslesbare Zeichen und Schriftdaten. Eine OCR ist für diese Beispiele nicht erforderlich. Die Seiten messen rund 595,32 × 841,92 PDF-Punkte, entsprechend etwa 210 × 297 mm (A4).

Nach Entfernen zufälliger PDF-Teilmengenpräfixe zeigen beide Dateien dieselben wesentlichen Schriftfamilien: `LiberationSerif` und `LiberationSans`, jeweils auch in Fett-/Kursivschnitten. Das sind die Namen **in diesen PDFs**. Daraus folgt nicht, dass eine verlorene ursprüngliche Word-Datei dieselben Namen oder dieselben Einstellungen hatte. Insbesondere wird Liberation Serif nicht stillschweigend als Times New Roman bezeichnet.

| Formatrolle | In den Beispielen gemessen | Beispielstellen |
| --- | --- | --- |
| Aufgaben und Ausgangstexte | überwiegend Liberation Serif, 12 pt | beide Dateien, S. 13 und jeweilige Materialseiten |
| Ausgearbeitete inhaltliche Kriterien | überwiegend Liberation Serif, 10,98 pt, mit fett hervorgehobenen Begriffen | beide Dateien, S. 20 |
| Sprachliches Kriterienraster | überwiegend Liberation Serif, 10,98 pt | beide Dateien, S. 23 |
| Kompakter Bewertungsbogen | überwiegend Liberation Serif, 10,02 pt, mit Fettdruck | beide Dateien, S. 24–25 |
| Überschriften | u. a. Liberation Sans Bold in mehreren Größen | beide Dateien, S. 13 und S. 20 |

Die Dezimalwerte werden als Messwerte erhalten. Eine Rundung von 10,98 auf eine Word-Einstellung von 11 pt oder 10,02 auf 10 pt ist eine plausible spätere Vorlagenentscheidung, kein bereits nachgewiesener Originalwert. Weitere Größen für Fußnoten, Tabellenköpfe, Dokumentkopf und Anmerkungen sind in den Messberichten erfasst.

Sichtbare Textgrenzen und gezeichnete Tabellenränder sind messbar. Sie sind keine ausgelesenen Word-Seitenränder. Zeilenabstände müssen an zusammengehörigen Textzeilen und ihrer Formatrolle überprüft werden; ein pauschaler Zeilenabstand für das gesamte Dokument wird daraus nicht abgeleitet.

## Gemeinsame Dokumentstruktur

Die Dateien bündeln Hörverstehen, Schreiben/Leseverstehen und Sprachmittlung mit jeweils zugehörigen Lehrkraftunterlagen. Die erste Umsetzung bleibt beim textbezogenen Prüfungsteil.

Für Schreiben/Leseverstehen unterscheiden die Beispiele:

1. Aufgabenblatt mit Aufgaben 1, 2 und einer Auswahl zwischen 3.1 und 3.2, ausgewiesenen Kompetenzbereichen und Punkten (beide S. 13).
2. Materialgrundlage, Wortzahl und Hilfsmittel sowie eigentliche Materialseiten mit Zeilenzählung und ggf. Anmerkungen.
3. Ausgearbeiteter Erwartungshorizont: nummerierte Anforderungen, Hauptaussagen mit konkretisierenden Unterpunkten, Maximalpunkte (z. B. S. 20).
4. Separates sprachliches Kriterienraster (z. B. S. 23).
5. Kompakter Bewertungsbogen mit verkürzten Anforderungen, Summenzeilen und Feldern für Erst-, Zweit- und Drittkorrektur (z. B. S. 24–25).

Die Sprachbewertung für diesen Prüfungsteil gliedert sich in kommunikative Textgestaltung, Ausdrucksvermögen/Verfügbarkeit sprachlicher Mittel und Sprachrichtigkeit. In den untersuchten Beispielen haben diese Bereiche jeweils 22 Punkte, zusammen 66. Die inhaltliche Leistung hat insgesamt 44 Punkte; mit der sprachlichen Leistung sind es 110 für Schreiben/Leseverstehen. Das ist weder die Gesamtpunktzahl der vollständigen Abiturprüfung noch eine ungeprüfte Vorgabe für jede schulische Klausur. Die bisherige 40/60-Beispielgewichtung der App bleibt ausdrücklich ein Funktionsbeispiel.

Ein zusätzliches aufgabenbezogenes Kriterium mit eingeklammerten Punkten erscheint in mehreren Rastern. Es darf nicht ohne fachliche Klärung als normaler additiver Bonus in die Maximalpunktzahl eingerechnet werden.

## Konsequenzen für die weitere Vorlagenentwicklung

- Eine gemeinsame Vorlage mit unterschiedlichen Formatrollen verwenden, keine getrennten Layoutregeln aus Kursbezeichnungen ableiten.
- Das bisherige globale Einfachprofil reicht nicht für einen originalnahen Export. Aufgaben, Material, Tabellen, Anmerkungen sowie Kopf-/Fußzeilen benötigen eigene Typografie- und Absatzregeln.
- Ausgearbeitete Anforderungen und kompakten Bewertungsbogen als getrennte Abschnitte modellieren. Die derzeitige zusätzliche Textbelegspalte ist eine redaktionelle Arbeitshilfe, kein Bestandteil des vorliegenden amtlichen Anforderungsrasters.
- Wahlaufgaben 3.1/3.2, alternative Lösungen und begrenzte Zusatzkriterien im Datenmodell abbilden; Alternativen nicht zusammenzählen.
- Originalnahes Erscheinungsbild anhand gerenderter Vergleichsseiten prüfen. Dienstsiegel, Ministeriumskennzeichnung und Kennzeichnung einer offiziellen Abiturprüfung gehören nicht automatisch auf von Lehrkräften selbst erstellte Klausuren.
- Keine Behauptung einer vollständigen 1:1-Rekonstruktion oder allgemeiner aktueller NRW-Konformität aus zwei Beispielen ableiten.

Diese Analyse ist der dokumentierte Ausgangspunkt für die nächste Vorlagenversion. Der bestehende Word-Export wurde damit noch nicht auf die amtliche Tabellenstruktur umgestellt.
