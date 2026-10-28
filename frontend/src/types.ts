export type Criterion = { description: string; points: number; evidence: string };
export type Task = { area: 'I' | 'II' | 'III'; instruction: string; criteria: Criterion[] };
export type Exam = {
  title: string;
  course: 'EF' | 'Q1 GK' | 'Q1 LK' | 'Q2 GK' | 'Q2 LK';
  duration: number;
  text_type: 'fiction' | 'non-fiction';
  source_title: string;
  source_reference: string;
  source_text: string;
  focus: string;
  aids: string;
  tasks: Task[];
  language_criteria: { description: string; points: number }[];
  knowledge_ids: string[];
  generation_notes: string;
};
export type SavedExam = Exam & { id: string; updated_at: string };
export type KnowledgeInput = { title: string; kind: 'Regel' | 'Beispiel' | 'Hinweis'; content: string; reference: string; reviewed: boolean };
export type Knowledge = KnowledgeInput & { id: string; updated_at: string };
export type Profile = {
  name: string; font: 'Arial' | 'Calibri' | 'Times New Roman'; font_size: number; line_spacing: number;
  margin_cm: number; source_reference: string; reviewed: boolean; version: number;
};
export type Review = { checks: { label: string; passed: boolean; detail: string }[]; content_points: number; language_points: number; profile_version: number };
export type Status = { ai_available: boolean; ai_model: string; mode?: 'private-prototype' | 'offline-demo'; persistent?: boolean };
