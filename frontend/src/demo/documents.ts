import { Document, Footer, HeadingLevel, LineNumberRestartFormat, Packer, PageNumber, Paragraph, SectionType, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType, convertMillimetersToTwip } from 'docx';
import type { ISectionOptions } from 'docx';
import type { Exam, Profile } from '../types';
import { validateExam } from './storage';

export async function demoDocument(kind: 'exam' | 'rubric', exam: Exam, profile: Profile): Promise<Blob> {
  validateExam(exam);
  if (!exam.source_text.trim() || !exam.tasks.length) throw new Error('Für den Export sind ein Ausgangstext und mindestens eine Aufgabe erforderlich.');
  if (kind === 'rubric' && exam.tasks.some(task => !task.criteria.length)) throw new Error('Bitte für jede Aufgabe Bewertungskriterien ergänzen.');
  const width = convertMillimetersToTwip(210 - profile.margin_cm * 20);
  const page = { size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) }, margin: { top: convertMillimetersToTwip(profile.margin_cm * 10), bottom: convertMillimetersToTwip(profile.margin_cm * 10), left: convertMillimetersToTwip(profile.margin_cm * 10), right: convertMillimetersToTwip(profile.margin_cm * 10) } };
  const footer = () => ({ default: new Footer({ children: [new Paragraph({ children: [new TextRun(`Testversion · Entwurf · Formatprofil v${profile.version} · Seite `), new TextRun({ children: [PageNumber.CURRENT] })] })] }) });
  const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, suppressLineNumbers: true });
  const opening = [new Paragraph({ text: exam.title, heading: HeadingLevel.TITLE, suppressLineNumbers: true }), new Paragraph({ text: `Englisch · ${exam.course} · ${exam.duration} Minuten`, suppressLineNumbers: true })];

  function table(headers: string[], rows: string[][], proportions: number[]) {
    const widths = proportions.map(proportion => Math.round(proportion * width));
    return new Table({ width: { size: width, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: widths, rows: [
      new TableRow({ tableHeader: true, children: headers.map((text, index) => new TableCell({ width: { size: widths[index], type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text, bold: true })], keepNext: true })] })) }),
      ...rows.map(values => new TableRow({ cantSplit: true, children: values.map((text, index) => new TableCell({ width: { size: widths[index], type: WidthType.DXA }, children: [new Paragraph(text)] })) })),
    ] });
  }

  const sections: ISectionOptions[] = [];
  if (kind === 'exam') {
    sections.push({ properties: { page }, footers: footer(), children: [
      ...opening,
      new Paragraph({ text: 'Name: ____________________________    Datum: ______________', suppressLineNumbers: true }),
      new Paragraph({ text: `Hilfsmittel: ${exam.aids}`, suppressLineNumbers: true }),
      heading('Tasks'),
      ...exam.tasks.map((task, index) => new Paragraph({ text: `${index + 1}. ${task.instruction}`, suppressLineNumbers: true })),
    ] });
    sections.push({ properties: { type: SectionType.NEXT_PAGE, page, lineNumbers: { countBy: 5, restart: LineNumberRestartFormat.NEW_PAGE } }, footers: footer(), children: [
      heading(exam.source_title || 'Text'), new Paragraph({ text: exam.source_reference || 'Quellenangabe ergänzen', suppressLineNumbers: true }),
      ...exam.source_text.split('\n').map(text => new Paragraph(text)),
    ] });
  } else {
    const children: (Paragraph | Table)[] = [...opening, heading('Erwartungshorizont'), new Paragraph('Redaktioneller Entwurf aus der Testversion. Die Lehrkraft prüft fachliche Richtigkeit, alternative Lösungen und Gewichtung.')];
    let content = 0;
    for (const [index, task] of exam.tasks.entries()) {
      const points = task.criteria.reduce((sum, c) => sum + c.points, 0); content += points;
      children.push(heading(`Aufgabe ${index + 1} · AFB ${task.area} · ${points} Punkte`), new Paragraph({ text: task.instruction, keepNext: true }), table(['Erwartete Leistung', 'Textbeleg', 'Max.', 'Erreicht'], task.criteria.map(c => [c.description, c.evidence, String(c.points), '']), [.49, .29, .09, .13]));
    }
    const language = exam.language_criteria.reduce((sum, c) => sum + c.points, 0);
    children.push(heading('Sprachliche Leistung / Darstellungsleistung'), table(['Kriterium', 'Max.', 'Erreicht'], exam.language_criteria.map(c => [c.description, String(c.points), '']), [.76, .1, .14]), new Paragraph(`Inhalt: ${content} · Sprache/Darstellung: ${language} · Gesamt: ${content + language} Punkte`), heading('Prüfvermerk'), new Paragraph(`Formatprofil: ${profile.name} (v${profile.version})\nReferenz: ${profile.source_reference || 'Noch nicht hinterlegt'}\nFormat manuell geprüft: ${profile.reviewed ? 'Ja' : 'Nein'}`));
    if (exam.generation_notes) children.push(new Paragraph(exam.generation_notes));
    sections.push({ properties: { page }, footers: footer(), children });
  }
  const doc = new Document({
    title: exam.title, creator: 'Klausurwerk · Testversion', description: 'Vorläufiger Funktionsentwurf, noch keine originalgetreue NRW-Vorlage.',
    styles: { default: {
      document: { run: { font: profile.font, size: profile.font_size * 2 }, paragraph: { spacing: { line: Math.round(profile.line_spacing * 240), after: 120 } } },
      title: { run: { font: profile.font, size: (profile.font_size + 5) * 2 } },
      heading1: { run: { font: profile.font, size: profile.font_size * 2, bold: true, color: '000000' }, paragraph: { keepNext: true } },
    } }, sections,
  });
  return Packer.toBlob(doc);
}
