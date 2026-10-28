from .models import Exam, FormatProfile


def review(exam: Exam, profile: FormatProfile):
    checks = []

    def add(label, passed, detail):
        checks.append({"label": label, "passed": passed, "detail": detail})

    add("Ausgangstext vorhanden", bool(exam.source_text.strip()), "Der Ausgangstext bildet die Grundlage aller Aufgaben.")
    add("Quelle dokumentiert", bool(exam.source_reference.strip()), "Autor, Titel, Publikation, Datum und ggf. Bearbeitung ergänzen.")
    add("Anforderungsbereiche I–III", {t.area for t in exam.tasks} == {"I", "II", "III"}, "Arbeitsprüfung für diesen Prototyp; noch kein Nachweis formaler NRW-Konformität.")
    add("Erwartungshorizont ausgefüllt", bool(exam.tasks) and all(t.criteria for t in exam.tasks), "Jede Aufgabe benötigt konkrete, bepunktete Kriterien.")
    add("Textbelege nachprüfbar", bool(exam.tasks) and all(t.criteria and all(c.evidence and c.evidence in exam.source_text for c in t.criteria) for t in exam.tasks), "Jedes inhaltliche Kriterium benötigt einen wörtlichen Beleg aus dem Ausgangstext; fachliche Angemessenheit manuell prüfen.")
    add("Sprachbewertung erfasst", bool(exam.language_criteria), "Gewichtung und Kriterien anhand der gewählten Klausurart prüfen.")
    add("Formatprofil geprüft", profile.reviewed, "Mit einer gültigen Referenzvorlage abgleichen; Standardwerte sind keine amtlichen Vorgaben.")
    return {"checks": checks, "content_points": sum(c.points for t in exam.tasks for c in t.criteria),
            "language_points": sum(c.points for c in exam.language_criteria), "profile_version": profile.version}
