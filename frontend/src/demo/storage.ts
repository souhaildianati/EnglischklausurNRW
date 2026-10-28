import observations from '../../../docs/references/nrw-2025-observations.md?raw';
import { sampleExam } from '../sample';
import type { Exam, Knowledge, KnowledgeInput, Profile, SavedExam } from '../types';

const KEY = 'klausurwerk.offline-demo.v1';
type State = { version: 1; exams: SavedExam[]; knowledge: Knowledge[]; profile: Profile };
let state: State | undefined;
let persistent = false;

function id() { return globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

function load(): State {
  if (state) return state;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    localStorage.setItem(`${KEY}.check`, '1');
    localStorage.removeItem(`${KEY}.check`);
    persistent = true;
  } catch { persistent = false; }
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version !== 1 || !Array.isArray(parsed.exams) || !Array.isArray(parsed.knowledge) || !parsed.profile) throw new Error();
      state = parsed;
      return state;
    } catch { throw new Error('Die gespeicherten Demo-Daten sind nicht lesbar. Sie wurden nicht überschrieben. Bitte die Testdatei in einem anderen Browser öffnen.'); }
  }
  state = {
    version: 1,
    exams: [{ ...sampleExam(), id: id(), updated_at: new Date().toISOString() }],
    knowledge: [{ id: id(), updated_at: new Date().toISOString(), title: 'Gemeinsame Dokumentstruktur der NRW-Beispiele 2025', kind: 'Beispiel', content: observations, reference: 'Bereitgestellte PDF-Beispiele e_25_x_l_ht_gg.pdf und e_25_x_g_ht_gg.pdf, insbesondere PDF-S. 13, 20, 23 und 24–25. Gemeinsame Formatbeobachtungen, noch keine fertige Vorlage.', reviewed: false }],
    profile: { name: 'Arbeitsprofil · noch nicht mit NRW-Vorlage abgeglichen', font: 'Arial', font_size: 11, line_spacing: 1.5, margin_cm: 2.5, source_reference: '', reviewed: false, version: 1 },
  };
  return state;
}

function save(next: State) {
  if (persistent) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { throw new Error('Der Browser kann den Arbeitsstand nicht dauerhaft speichern. Bitte den Arbeitsstand über die Demo-Leiste herunterladen.'); }
  }
  state = next;
}

function requireText(value: string, label: string, limit: number) {
  if (!value?.trim()) throw new Error(`${label} bitte ausfüllen.`);
  if (value.length > limit) throw new Error(`${label} ist zu lang (höchstens ${limit} Zeichen).`);
}

function points(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('Punkte müssen ganze Zahlen zwischen 1 und 100 sein.');
}

export function validateExam(exam: Exam) {
  requireText(exam.title, 'Titel', 200);
  if (!Number.isInteger(exam.duration) || exam.duration < 15 || exam.duration > 360) throw new Error('Die Bearbeitungszeit muss zwischen 15 und 360 Minuten liegen.');
  if (exam.source_text.length > 50000) throw new Error('Der Ausgangstext darf höchstens 50.000 Zeichen enthalten.');
  if (exam.tasks.length > 6 || exam.language_criteria.length > 12) throw new Error('Zu viele Aufgaben oder Sprachkriterien.');
  for (const task of exam.tasks) {
    requireText(task.instruction, 'Arbeitsauftrag', 4000);
    if (task.criteria.length > 20) throw new Error('Höchstens 20 Kriterien pro Aufgabe.');
    for (const criterion of task.criteria) { requireText(criterion.description, 'Kriterium', 4000); points(criterion.points); }
  }
  for (const criterion of exam.language_criteria) { requireText(criterion.description, 'Sprachkriterium', 2000); points(criterion.points); }
}

function review(exam: Exam, profile: Profile) {
  validateExam(exam);
  return {
    checks: [
      { label: 'Ausgangstext vorhanden', passed: !!exam.source_text.trim(), detail: 'Der Ausgangstext bildet die Grundlage aller Aufgaben.' },
      { label: 'Quelle dokumentiert', passed: !!exam.source_reference.trim(), detail: 'Autor, Titel, Publikation, Datum und ggf. Bearbeitung ergänzen.' },
      { label: 'Anforderungsbereiche I–III', passed: ['I', 'II', 'III'].every(area => exam.tasks.some(t => t.area === area)), detail: 'Arbeitsprüfung für diesen Prototyp; noch kein Nachweis formaler NRW-Konformität.' },
      { label: 'Erwartungshorizont ausgefüllt', passed: !!exam.tasks.length && exam.tasks.every(t => t.criteria.length > 0), detail: 'Jede Aufgabe benötigt konkrete, bepunktete Kriterien.' },
      { label: 'Textbelege nachprüfbar', passed: !!exam.tasks.length && exam.tasks.every(t => t.criteria.length > 0 && t.criteria.every(c => !!c.evidence && exam.source_text.includes(c.evidence))), detail: 'Jedes inhaltliche Kriterium benötigt einen wörtlichen Beleg aus dem Ausgangstext; fachliche Angemessenheit manuell prüfen.' },
      { label: 'Sprachbewertung erfasst', passed: !!exam.language_criteria.length, detail: 'Gewichtung und Kriterien anhand der gewählten Klausurart prüfen.' },
      { label: 'Formatprofil geprüft', passed: profile.reviewed, detail: 'Mit einer gültigen Referenzvorlage abgleichen; Standardwerte sind keine amtlichen Vorgaben.' },
    ],
    content_points: exam.tasks.reduce((sum, task) => sum + task.criteria.reduce((total, c) => total + c.points, 0), 0),
    language_points: exam.language_criteria.reduce((sum, c) => sum + c.points, 0), profile_version: profile.version,
  };
}

export async function demoRequest<T>(path: string, method: string, data?: unknown): Promise<T> {
  const current = load();
  let result: unknown;
  if (path === '/status') result = { ai_available: false, ai_model: 'In dieser Demo nicht aktiv', mode: 'offline-demo', persistent };
  else if (path === '/backup' && method === 'GET') result = current;
  else if (path === '/exams' && method === 'GET') result = current.exams;
  else if ((path === '/exams' && method === 'POST') || (path.startsWith('/exams/') && method === 'PUT')) {
    const exam = clone(data as Exam); validateExam(exam);
    const examId = method === 'POST' ? id() : path.split('/')[2];
    if (method === 'PUT' && !current.exams.some(item => item.id === examId)) throw new Error('Klausur nicht gefunden.');
    const item = { ...exam, id: examId, updated_at: new Date().toISOString() };
    save({ ...current, exams: [item, ...current.exams.filter(item => item.id !== examId)] }); result = item;
  } else if (path === '/review') result = review(data as Exam, current.profile);
  else if (path === '/profile' && method === 'GET') result = current.profile;
  else if (path === '/profile' && method === 'PUT') {
    const profile = clone(data as Profile);
    requireText(profile.name, 'Profilname', 200);
    if (!['Arial', 'Calibri', 'Times New Roman'].includes(profile.font) || !Number.isInteger(profile.font_size) || profile.font_size < 9 || profile.font_size > 16 || !Number.isFinite(profile.line_spacing) || profile.line_spacing < 1 || profile.line_spacing > 2 || !Number.isFinite(profile.margin_cm) || profile.margin_cm < 1.5 || profile.margin_cm > 4) throw new Error('Bitte gültige Schrift- und Abstandswerte eingeben.');
    if (profile.reviewed && !profile.source_reference.trim()) throw new Error('Ein geprüftes Profil benötigt eine Quellenangabe.');
    profile.version = current.profile.version + 1;
    save({ ...current, profile }); result = profile;
  } else if (path === '/knowledge' && method === 'GET') result = current.knowledge;
  else if ((path === '/knowledge' && method === 'POST') || (path.startsWith('/knowledge/') && method === 'PUT')) {
    const input = clone(data as KnowledgeInput);
    requireText(input.title, 'Titel des Wissenseintrags', 200); requireText(input.content, 'Inhalt des Wissenseintrags', 60000);
    if (input.reviewed && !input.reference.trim()) throw new Error('Ein geprüfter Wissenseintrag benötigt eine Quellenangabe.');
    const itemId = method === 'POST' ? id() : path.split('/')[2];
    if (method === 'PUT' && !current.knowledge.some(item => item.id === itemId)) throw new Error('Wissenseintrag nicht gefunden.');
    const item = { ...input, id: itemId, updated_at: new Date().toISOString() };
    save({ ...current, knowledge: [item, ...current.knowledge.filter(item => item.id !== itemId)] }); result = item;
  } else if (path.startsWith('/knowledge/') && method === 'DELETE') {
    save({ ...current, knowledge: current.knowledge.filter(item => item.id !== path.split('/')[2]) }); return undefined as T;
  } else throw new Error('Diese Funktion ist in der lokalen Demo nicht verfügbar.');
  return clone(result) as T;
}

export function demoProfile() { return clone(load().profile); }

export async function demoImport(file: File) {
  if (!/\.(txt|md)$/i.test(file.name)) throw new Error('Die lokale Demo importiert TXT- und Markdown-Dateien. PDF- und Word-Import gehören zur servergestützten App.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Die Datei darf höchstens 10 MB groß sein.');
  const text = (await file.text()).replace(/^\uFEFF/, '').trim();
  requireText(text, 'Dateiinhalt', 60000);
  return { text, filename: file.name, notice: 'Textdatei lokal eingelesen. Es wurden keine Daten an einen Server gesendet.' };
}
