import type { Exam } from './types';

export function blankExam(): Exam {
  return {
    title: 'Neue Englischklausur', course: 'Q1 GK', duration: 135, text_type: 'non-fiction',
    source_title: '', source_reference: '', source_text: '', focus: '', aids: 'Ein- und zweisprachiges Wörterbuch',
    tasks: [], language_criteria: [], knowledge_ids: [], generation_notes: '',
  };
}

export function sampleExam(): Exam {
  return {
    ...blankExam(), title: 'A town after the last bus', source_title: 'The Last Bus Home',
    source_reference: 'Klausurwerk: eigens verfasster Beispieltext (2026), keine Veröffentlichung. Alle Aufgaben und Punktwerte sind illustrative Entwürfe.',
    focus: 'Mobility, participation and social inequality',
    source_text: `When the council announced that the number 14 bus would stop running after six, the decision looked like a small saving on a spreadsheet. For seventeen-year-old Maya, it meant giving up her evening job at the cinema. Her parents shared one car, and a taxi home would cost more than she earned in an hour. “They call it an empty bus,” she said, “but nobody asked why we need it.”

The council argued that the route was losing money. Its report counted passengers but did not consider who had no other way to travel. A retired nurse used the service to visit her husband in hospital. Students relied on it to reach the library. The bus was more than transport; it was a way to take part in the life of the town.

After residents collected 800 signatures, the council agreed to run a three-month trial with a smaller vehicle. Maya welcomed the change but questioned why residents had to fight to be counted. A budget can tell a town what a service costs. It cannot, on its own, tell the town what that service is worth.`,
    tasks: [
      { area: 'I', instruction: 'Outline the consequences of the bus service cuts for the residents.', criteria: [
        { description: 'Stellt dar, dass Maya ihren Abendjob wegen der fehlenden Rückfahrt aufgeben muss.', points: 5, evidence: 'it meant giving up her evening job at the cinema' },
        { description: 'Nennt weitere betroffene Gruppen und ihre eingeschränkten Teilhabemöglichkeiten.', points: 5, evidence: 'Students relied on it to reach the library.' },
      ] },
      { area: 'II', instruction: 'Analyse how the author presents the conflict between financial savings and social participation. Focus on structure and use of language.', criteria: [
        { description: 'Erklärt die Wirkung des Kontrasts zwischen abstrakter Haushaltsplanung und Mayas konkretem Alltag.', points: 8, evidence: 'a small saving on a spreadsheet' },
        { description: 'Analysiert die Gegenüberstellung von Kosten und gesellschaftlichem Wert im Schluss; eine reine Benennung genügt nicht.', points: 8, evidence: 'what that service is worth' },
      ] },
      { area: 'III', instruction: 'Taking the article as a starting point, assess whether access to public transport should be treated as a public responsibility.', criteria: [
        { description: 'Entwickelt eine begründete Position zur öffentlichen Verantwortung und berücksichtigt unterschiedliche Interessen. Alternative tragfähige Positionen sind möglich.', points: 7, evidence: 'Its report counted passengers but did not consider who had no other way to travel.' },
        { description: 'Bezieht eine realistische Handlungsoption ein und wägt deren Grenzen ab.', points: 7, evidence: 'a three-month trial with a smaller vehicle' },
      ] },
    ],
    language_criteria: [
      { description: 'Kommunikative Textgestaltung – kohärent, adressatengerecht und aufgabenbezogen; Beispielgewichtung', points: 20 },
      { description: 'Ausdrucksvermögen – differenzierter Wortschatz und angemessener Satzbau; Beispielgewichtung', points: 20 },
      { description: 'Sprachrichtigkeit – Wortschatz, Grammatik und Orthografie; Beispielgewichtung', points: 20 },
    ],
    generation_notes: 'Handverfasstes Funktionsbeispiel, keine KI-Ausgabe und kein amtlicher Erwartungshorizont. Die 40/60-Punktverteilung dient nur der Demonstration. Die Textlänge ist für eine echte Klausur gesondert zu prüfen.',
  };
}
