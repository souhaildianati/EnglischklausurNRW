import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Circle, FileText, FolderOpen, GraduationCap, Library, LoaderCircle, Plus, Save, Settings2, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { api, download, importFile } from './api';
import { blankExam, sampleExam } from './sample';
import PdfReference from './PdfReference';
import type { Exam, Knowledge, KnowledgeInput, Profile, Review, SavedExam, Status, Task } from './types';

const EMPTY_KNOWLEDGE: KnowledgeInput = { title: '', kind: 'Hinweis', content: '', reference: '', reviewed: false };
const STEPS = ['Material & Rahmen', 'Aufgaben & Bewertung', 'Prüfen & Export'];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const id = useId();
  function associate(nodes: ReactNode): ReactNode {
    return Children.map(nodes, node => {
      if (!isValidElement<Record<string, unknown>>(node)) return node;
      if (typeof node.type === 'string' && ['input', 'textarea', 'select'].includes(node.type)) {
        return cloneElement(node, { id, 'aria-describedby': hint ? `${id}-hint` : undefined });
      }
      return node.props.children ? cloneElement(node, { children: associate(node.props.children as ReactNode) }) : node;
    });
  }
  return <div className="field"><label className="field-label" htmlFor={id}>{label}</label>{associate(children)}{hint && <span className="hint" id={`${id}-hint`}>{hint}</span>}</div>;
}

function InputFile({ label, onImport, disabled }: { label: string; onImport: (file: File) => void; disabled: boolean }) {
  return <label className={`button secondary file-button ${disabled ? 'disabled' : ''}`}><Upload size={16} />{label}<input type="file" accept=".pdf,.docx,.txt,.md" disabled={disabled} onChange={e => { const file = e.target.files?.[0]; if (file) onImport(file); e.target.value = ''; }} /></label>;
}

function toExam(value: SavedExam): Exam {
  const { id: _id, updated_at: _updated, ...exam } = value;
  return exam;
}

export default function App() {
  const [view, setView] = useState<'exam' | 'knowledge' | 'profile'>('exam');
  const [step, setStep] = useState(0);
  const [exam, setExam] = useState<Exam>(blankExam);
  const [examId, setExamId] = useState<string>();
  const [saved, setSaved] = useState<SavedExam[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [knowledgeDraft, setKnowledgeDraft] = useState<KnowledgeInput>({ ...EMPTY_KNOWLEDGE });
  const [knowledgeId, setKnowledgeId] = useState<string>();
  const [profile, setProfile] = useState<Profile>();
  const [profileDirty, setProfileDirty] = useState(false);
  const [status, setStatus] = useState<Status>();
  const [review, setReview] = useState<Review>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [knowledgeDirty, setKnowledgeDirty] = useState(false);
  const [aiDialog, setAiDialog] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const [exams, sources, format, server] = await Promise.all([
        api<SavedExam[]>('/exams'), api<Knowledge[]>('/knowledge'), api<Profile>('/profile'), api<Status>('/status'),
      ]);
      setSaved(exams); setKnowledge(sources); setProfile(format); setStatus(server);
      if (exams.length) { setExam(toExam(exams[0])); setExamId(exams[0].id); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty || profileDirty || knowledgeDirty) event.preventDefault();
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, profileDirty, knowledgeDirty]);
  useEffect(() => {
    if (aiDialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [aiDialog]);

  async function act(label: string, work: () => Promise<void>) {
    setBusy(label); setError(''); setNotice('');
    try { await work(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Die Aktion konnte nicht abgeschlossen werden.'); }
    finally { setBusy(''); }
  }

  function change(patch: Partial<Exam>) {
    setExam(previous => ({ ...previous, ...patch })); setDirty(true); setReview(undefined);
  }

  function openExam(next: Exam, id?: string) {
    if (dirty && !window.confirm('Die Klausur hat ungespeicherte Änderungen. Trotzdem eine andere Klausur öffnen?')) return;
    setExam(next); setExamId(id); setDirty(!id); setReview(undefined); setView('exam'); setStep(0); setError(''); setNotice('');
  }

  async function saveExam() {
    const value = await api<SavedExam>(examId ? `/exams/${examId}` : '/exams', examId ? 'PUT' : 'POST', exam);
    setExamId(value.id); setSaved(previous => [value, ...previous.filter(item => item.id !== value.id)]); setDirty(false);
    setNotice('Klausur gespeichert.');
  }

  function updateTask(index: number, patch: Partial<Task>) {
    change({ tasks: exam.tasks.map((task, i) => i === index ? { ...task, ...patch } : task) });
  }

  function updateKnowledge(patch: Partial<KnowledgeInput>) {
    setKnowledgeDraft(previous => ({ ...previous, ...patch })); setKnowledgeDirty(true);
  }

  function openKnowledge(item?: Knowledge) {
    if (knowledgeDirty && !window.confirm('Ungespeicherte Änderungen am Wissenseintrag verwerfen?')) return;
    if (item) {
      const { id, updated_at: _updated, ...rest } = item;
      setKnowledgeDraft(rest); setKnowledgeId(id);
    } else { setKnowledgeDraft({ ...EMPTY_KNOWLEDGE }); setKnowledgeId(undefined); }
    setKnowledgeDirty(false);
  }

  const contentPoints = exam.tasks.reduce((total, task) => total + task.criteria.reduce((sum, c) => sum + c.points, 0), 0);
  const languagePoints = exam.language_criteria.reduce((sum, c) => sum + c.points, 0);
  const words = exam.source_text.trim() ? exam.source_text.trim().split(/\s+/).length : 0;
  const reviewedSources = knowledge.filter(item => item.reviewed);
  const validSelection = exam.knowledge_ids.every(id => reviewedSources.some(item => item.id === id));

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setView('exam'); }} aria-label="Klausurwerk Start"><span className="brand-icon"><BookOpen size={23} /></span><span>Klausurwerk<small>ENGLISCH · NRW</small></span></a>
      <div className="sidebar-section-label">DEIN ARBEITSPLATZ</div>
      <nav aria-label="Hauptnavigation">
        <button className={view === 'exam' ? 'nav-item active' : 'nav-item'} onClick={() => setView('exam')}><FileText size={18} />Klausurwerkstatt<ChevronRight size={15} /></button>
        <button className={view === 'knowledge' ? 'nav-item active' : 'nav-item'} onClick={() => setView('knowledge')}><Library size={18} />Wissensbasis<span className="nav-count">{knowledge.length}</span></button>
        <button className={view === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => setView('profile')}><Settings2 size={18} />Formatprofil{profileDirty && <span className="unsaved-dot" />}</button>
      </nav>
      <div className="sidebar-section-label saved-heading">DEINE KLAUSUREN <button aria-label="Neue Klausur" disabled={!!busy} onClick={() => openExam(blankExam())}><Plus size={16} /></button></div>
      <div className="saved-list">{saved.length === 0 ? <p className="sidebar-empty">Hier findest du deine gespeicherten Entwürfe.</p> : saved.map(item => <button key={item.id} disabled={!!busy} className={`saved-item ${item.id === examId ? 'selected' : ''}`} onClick={() => openExam(toExam(item), item.id)}><span className="saved-file"><FileText size={15} /></span><span>{item.title}<small>{item.course} · {new Date(item.updated_at).toLocaleDateString('de-DE')}</small></span></button>)}</div>
      <div className="sidebar-note"><ShieldCheck size={20} /><div><strong>Deine fachliche Entscheidung zählt.</strong><p>Du prüfst und bearbeitest jeden Entwurf vor dem Einsatz.</p></div></div>
      <div className="sidebar-bottom"><span className="prototype-dot" />Privater Prototyp<span>v0.1</span></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Arbeitsplatz<ChevronRight size={14} /><strong>{view === 'exam' ? 'Klausurwerkstatt' : view === 'knowledge' ? 'Wissensbasis' : 'Formatprofil'}</strong></div><div className="topbar-right"><span className={`ai-status ${status?.ai_available ? 'online' : ''}`}><span />{status?.ai_available ? 'KI konfiguriert' : 'Manueller Modus'}</span><span className="avatar" aria-label="Arbeitsbereich Lehrkraft">LK</span></div></header>
      <main>
        {error && <div role="alert" className="message error"><strong>Das hat noch nicht geklappt.</strong><span>{error}</span><button aria-label="Fehlermeldung schließen" onClick={() => setError('')}><X size={17} /></button></div>}
        {notice && <div role="status" className="message success"><CheckCircle2 size={18} /><span>{notice}</span><button aria-label="Hinweis schließen" onClick={() => setNotice('')}><X size={17} /></button></div>}
        {loading ? <div className="loading"><LoaderCircle className="spin" />Deine Werkstatt wird geöffnet …</div> : !profile || !status ? <div className="panel"><h1>Die Werkstatt ist noch nicht erreichbar.</h1><button className="button primary" onClick={() => void load()}>Erneut laden</button></div> : <>
          {view === 'exam' && <>
            <div className="page-heading"><div><div className="eyebrow"><span />VOM TEXT ZUR KLAUSUR</div><h1>Mehr Zeit fürs Unterrichten.</h1><p>Material auswählen. Aufgaben entwickeln. Gute Klausuren gestalten.</p></div><button className="button secondary" disabled={!!busy} onClick={() => openExam(blankExam())}><Plus size={17} />Neue Klausur</button></div>
            <div className="workspace-topline"><span className="pill">Englisch · Sekundarstufe II</span><span className="draft-label"><span />Redaktioneller Entwurf</span><button className="text-button sample-button" disabled={!!busy} onClick={() => openExam(sampleExam())}>Mit Beispiel ausprobieren<ArrowRight size={14} /></button></div>
            <nav className="steps" aria-label="Arbeitsschritte">{STEPS.map((label, index) => <button key={label} className={index === step ? 'step current' : 'step'} disabled={!!busy} onClick={() => { setStep(index); if (index === 2) void act('Prüfen', async () => setReview(await api<Review>('/review', 'POST', exam))); }}><span className="step-number">{index + 1}</span><span>{label}</span>{index !== 2 && <ChevronRight size={16} />}</button>)}</nav>
            <fieldset className="workspace-fieldset" disabled={!!busy}>
              <div className="workspace-grid"><div className="editor-column">
                {step === 0 && <>
                  <section className="panel"><div className="panel-heading"><div><h2><span className="section-index">01</span>Der Rahmen deiner Klausur</h2><p>Die wichtigsten Angaben, bevor es an den Text geht.</p></div><GraduationCap size={22} className="muted" /></div>
                    <Field label="Titel der Klausur"><input value={exam.title} maxLength={200} onChange={e => change({ title: e.target.value })} placeholder="z. B. The changing world of work" /></Field>
                    <div className="form-row three"><Field label="Jahrgang & Kurs"><select value={exam.course} onChange={e => change({ course: e.target.value as Exam['course'] })}>{['EF', 'Q1 GK', 'Q1 LK', 'Q2 GK', 'Q2 LK'].map(c => <option key={c}>{c}</option>)}</select></Field><Field label="Bearbeitungszeit"><div className="input-unit"><input type="number" min={15} max={360} value={exam.duration} onChange={e => change({ duration: Number(e.target.value) })} /><span>Min.</span></div></Field><Field label="Textart"><select value={exam.text_type} onChange={e => change({ text_type: e.target.value as Exam['text_type'] })}><option value="non-fiction">Nicht fiktional</option><option value="fiction">Fiktional</option></select></Field></div>
                    <Field label="Thematischer Schwerpunkt" hint="Optional: Was sollen die Lernenden besonders in den Blick nehmen?"><input value={exam.focus} maxLength={2000} onChange={e => change({ focus: e.target.value })} placeholder="z. B. Identity, belonging and cultural diversity" /></Field>
                    <Field label="Zugelassene Hilfsmittel"><input value={exam.aids} maxLength={1000} onChange={e => change({ aids: e.target.value })} /></Field>
                  </section>
                  <section className="panel"><div className="panel-heading"><div><h2><span className="section-index">02</span>Dein Ausgangstext</h2><p>Ein Artikel, ein literarischer Auszug oder ein eigener Text.</p></div><InputFile disabled={!!busy} label="Importieren" onImport={file => void act('Text importieren', async () => { const result = await importFile(file); if (result.text.length > 50000) throw new Error('Der Ausgangstext darf höchstens 50.000 Zeichen umfassen. Bitte einen kürzeren Ausschnitt wählen.'); change({ source_text: result.text, source_title: exam.source_title || result.filename }); setNotice(result.notice); })} /></div>
                    <Field label="Texttitel"><input value={exam.source_title} maxLength={300} onChange={e => change({ source_title: e.target.value })} placeholder="Titel des Artikels oder Auszugs" /></Field>
                    <Field label="Ausgangstext"><textarea className="source-text" value={exam.source_text} maxLength={50000} onChange={e => change({ source_text: e.target.value })} placeholder="Füge deinen englischen Text hier ein oder importiere eine PDF-, Word- oder Textdatei …" /></Field><div className="text-stats"><span>{words.toLocaleString('de-DE')} Wörter</span><span>{exam.source_text.length.toLocaleString('de-DE')} / 50.000 Zeichen</span></div>
                    <Field label="Quellenangabe" hint="Autor, Titel, Publikation, Datum, URL und ggf. Kürzungen/Bearbeitungen."><textarea rows={2} value={exam.source_reference} maxLength={2000} onChange={e => change({ source_reference: e.target.value })} placeholder="Vollständige Quelle des Ausgangstextes" /></Field>
                  </section>
                </>}

                {step === 1 && <>
                  <section className="panel"><div className="panel-heading"><div><h2>Aufgaben mit Substanz.</h2><p>Formuliere Arbeitsaufträge auf Englisch und bewerte konkrete Leistungen.</p></div></div><div className="inline-notice"><Sparkles size={18} /><div>{status.ai_available ? 'Die KI erstellt bearbeitbare Vorschläge mit überprüfbaren Textbelegen.' : 'Du kannst sofort manuell arbeiten. Für KI-Vorschläge fehlt noch der serverseitige API-Zugang.'}</div></div>
                    {reviewedSources.length > 0 && <div className="source-picker"><strong>Geprüftes Wissen für diesen Entwurf</strong>{reviewedSources.map(item => <label className="checkbox-label" key={item.id}><input type="checkbox" checked={exam.knowledge_ids.includes(item.id)} onChange={e => change({ knowledge_ids: e.target.checked ? [...exam.knowledge_ids, item.id] : exam.knowledge_ids.filter(id => id !== item.id) })} />{item.title}</label>)}</div>}
                    {!validSelection && <p className="warning-text">Eine zuvor ausgewählte Wissensquelle ist nicht mehr freigegeben. Bitte die Auswahl zurücksetzen.</p>}
                    <div className="button-row"><button className="button primary" disabled={!status.ai_available || !exam.source_text.trim() || !validSelection} onClick={() => setAiDialog(true)}><Sparkles size={16} />KI-Vorschlag vorbereiten</button>{!validSelection && <button className="button secondary" onClick={() => change({ knowledge_ids: [] })}>Auswahl zurücksetzen</button>}</div>
                  </section>
                  {exam.tasks.map((task, taskIndex) => <section className="panel task-panel" key={taskIndex}><div className="panel-heading"><h2><span className="section-index">{String(taskIndex + 1).padStart(2, '0')}</span>Aufgabe {taskIndex + 1}</h2><button className="icon-button" aria-label={`Aufgabe ${taskIndex + 1} entfernen`} onClick={() => change({ tasks: exam.tasks.filter((_, i) => i !== taskIndex) })}><Trash2 size={16} /></button></div>
                    <Field label={`Anforderungsbereich Aufgabe ${taskIndex + 1}`}><select value={task.area} onChange={e => updateTask(taskIndex, { area: e.target.value as Task['area'] })}><option value="I">I · Comprehension</option><option value="II">II · Analysis</option><option value="III">III · Evaluation / Re-creation</option></select></Field>
                    <Field label={`Arbeitsauftrag ${taskIndex + 1} (Englisch)`}><textarea rows={3} maxLength={4000} value={task.instruction} onChange={e => updateTask(taskIndex, { instruction: e.target.value })} placeholder="Analyse how the author …" /></Field>
                    <div className="criteria-heading"><h3>Erwartungshorizont</h3><span>{task.criteria.reduce((sum, c) => sum + c.points, 0)} Punkte</span></div>
                    {task.criteria.map((criterion, index) => <div className="criterion" key={index}><div className="criterion-fields"><Field label={`Kriterium ${taskIndex + 1}.${index + 1}`}><textarea rows={3} maxLength={4000} value={criterion.description} onChange={e => updateTask(taskIndex, { criteria: task.criteria.map((c, i) => i === index ? { ...c, description: e.target.value } : c) })} placeholder="Die Schülerin / der Schüler erläutert …" /></Field><Field label={`Textbeleg ${taskIndex + 1}.${index + 1}`} hint="Wörtliches Zitat aus dem Ausgangstext."><input value={criterion.evidence} maxLength={2000} onChange={e => updateTask(taskIndex, { criteria: task.criteria.map((c, i) => i === index ? { ...c, evidence: e.target.value } : c) })} /></Field></div><div className="criterion-points"><Field label="Punkte"><input aria-label={`Punkte ${taskIndex + 1}.${index + 1}`} type="number" min={1} max={100} value={criterion.points} onChange={e => updateTask(taskIndex, { criteria: task.criteria.map((c, i) => i === index ? { ...c, points: Number(e.target.value) } : c) })} /></Field><button className="icon-button" aria-label={`Kriterium ${taskIndex + 1}.${index + 1} entfernen`} onClick={() => updateTask(taskIndex, { criteria: task.criteria.filter((_, i) => i !== index) })}><Trash2 size={15} /></button></div></div>)}
                    <button className="text-button" disabled={task.criteria.length >= 20} onClick={() => updateTask(taskIndex, { criteria: [...task.criteria, { description: '', evidence: '', points: 5 }] })}><Plus size={15} />Kriterium hinzufügen</button>
                  </section>)}
                  <button className="add-panel" disabled={exam.tasks.length >= 6} onClick={() => change({ tasks: [...exam.tasks, { area: (['I', 'II', 'III'] as const)[Math.min(exam.tasks.length, 2)], instruction: '', criteria: [] }] })}><Plus size={19} />Aufgabe hinzufügen</button>
                  <section className="panel"><div className="panel-heading"><div><h2>Sprachliche Leistung</h2><p>Kriterien und Gewichtung selbst festlegen und mit der Vorgabe abgleichen.</p></div></div>{exam.language_criteria.map((criterion, index) => <div className="language-row" key={index}><Field label={`Sprachkriterium ${index + 1}`}><textarea rows={2} maxLength={2000} value={criterion.description} onChange={e => change({ language_criteria: exam.language_criteria.map((c, i) => i === index ? { ...c, description: e.target.value } : c) })} /></Field><Field label="Punkte"><input aria-label={`Sprachpunkte ${index + 1}`} type="number" min={1} max={100} value={criterion.points} onChange={e => change({ language_criteria: exam.language_criteria.map((c, i) => i === index ? { ...c, points: Number(e.target.value) } : c) })} /></Field><button className="icon-button" aria-label={`Sprachkriterium ${index + 1} entfernen`} onClick={() => change({ language_criteria: exam.language_criteria.filter((_, i) => i !== index) })}><Trash2 size={16} /></button></div>)}<button className="text-button" disabled={exam.language_criteria.length >= 12} onClick={() => change({ language_criteria: [...exam.language_criteria, { description: '', points: 10 }] })}><Plus size={15} />Sprachkriterium hinzufügen</button></section>
                  {exam.generation_notes && <section className="panel notes-panel"><h3>Hinweise zu diesem Entwurf</h3><p>{exam.generation_notes}</p></section>}
                </>}

                {step === 2 && <>
                  <section className="panel"><div className="panel-heading"><div><h2>Ein letzter Blick.</h2><p>Diese Arbeitsprüfung ersetzt keine fachliche Freigabe.</p></div><button className="button secondary small" onClick={() => void act('Prüfen', async () => setReview(await api<Review>('/review', 'POST', exam)))}>Erneut prüfen</button></div>{review ? <div className="review-list">{review.checks.map(check => <div className={`review-item ${check.passed ? 'passed' : ''}`} key={check.label}>{check.passed ? <CheckCircle2 size={19} /> : <Circle size={19} />}<div><strong>{check.label}</strong><p>{check.detail}</p></div><span>{check.passed ? 'Erfüllt' : 'Offen'}</span></div>)}</div> : <p>Prüfung läuft oder steht noch aus.</p>}</section>
                  <section className="panel export-panel"><div className="export-icon"><FileText size={29} /></div><h2>Bereit für deinen Feinschliff in Word.</h2><p>Zwei bearbeitbare Dokumente, ein gemeinsames Formatprofil.<br />Alle Exporte sind als Entwurf gekennzeichnet.</p><div className="button-row"><button className="button primary" disabled={!exam.source_text.trim() || !exam.tasks.length || profileDirty} onClick={() => void act('Klausur exportieren', async () => { await download('exam', exam); setNotice('Klausur als Word-Datei heruntergeladen.'); })}><ArrowDownToLine size={17} />Klausur.docx</button><button className="button secondary" disabled={!exam.source_text.trim() || !exam.tasks.length || exam.tasks.some(t => !t.criteria.length) || profileDirty} onClick={() => void act('Erwartungshorizont exportieren', async () => { await download('rubric', exam); setNotice('Erwartungshorizont als Word-Datei heruntergeladen.'); })}><ArrowDownToLine size={17} />Erwartungshorizont.docx</button></div>{profileDirty && <p className="warning-text">Bitte Änderungen am Formatprofil zuerst speichern.</p>}</section>
                </>}
              </div>
              <aside className="context-column"><section className="summary-card"><div className="summary-icon"><FileText size={23} /></div><span className="eyebrow">DEINE KLAUSUR IM BLICK</span><h2>{exam.title || 'Ohne Titel'}</h2><div className="summary-pills"><span>{exam.course}</span><span>{exam.duration} Min.</span></div><div className="summary-metrics"><div><span>Textumfang</span><strong>{words} <small>Wörter</small></strong></div><div><span>Aufgaben</span><strong>{exam.tasks.length}</strong></div><div><span>Inhalt / Sprache</span><strong>{contentPoints} / {languagePoints} <small>P.</small></strong></div></div><div className="summary-total"><span>Gesamtpunktzahl</span><strong>{contentPoints + languagePoints}</strong></div></section>
                <section className="tip-card"><div className="tip-heading"><BookOpen size={17} /><strong>Wissen, das mitwächst.</strong></div><p>Hinterlege bewährte Beispiele und Vorgaben einmal in deiner Wissensbasis. Du entscheidest, welche davon die KI verwenden darf.</p><button className="text-button" onClick={() => setView('knowledge')}>Zur Wissensbasis<ArrowRight size={15} /></button></section>
                <div className="format-note"><ShieldCheck size={18} /><div><strong>{profile.reviewed ? 'Formatprofil manuell geprüft' : 'Format noch nicht verifiziert'}</strong><p>{profile.font} · {profile.font_size} pt · Zeilenabstand {profile.line_spacing}<br />Für verbindliche Vorgaben ist eine Referenzvorlage nötig.</p><button className="text-button" onClick={() => setView('profile')}>Profil bearbeiten<ArrowRight size={13} /></button></div></div>
              </aside></div>
              <div className="workspace-actions"><div><span className={`save-state ${dirty ? 'unsaved' : ''}`}>{dirty ? <Circle size={12} /> : <Check size={14} />}{dirty ? 'Ungespeicherte Änderungen' : examId ? 'Alle Änderungen gespeichert' : 'Noch nicht gespeichert'}</span></div><div className="button-row"><button className="button secondary" disabled={!exam.title.trim()} onClick={() => void act('Speichern', saveExam)}><Save size={16} />Speichern</button>{step < 2 && <button className="button primary" onClick={() => { const next = step + 1; setStep(next); if (next === 2) void act('Prüfen', async () => setReview(await api<Review>('/review', 'POST', exam))); }}>{step === 0 ? 'Aufgaben entwickeln' : 'Klausur prüfen'}<ArrowRight size={16} /></button>}</div></div>
            </fieldset>
          </>}

          {view === 'knowledge' && <>
            <div className="page-heading"><div><div className="eyebrow"><span />DEIN FACHLICHES FUNDAMENT</div><h1>Gutes Wissen bleibt.</h1><p>Vorgaben, Beispiele und Erfahrungen – einmal aufbereitet, wiederverwendbar.</p></div><button className="button secondary" disabled={!!busy} onClick={() => openKnowledge()}><Plus size={17} />Neuer Eintrag</button></div>
            <div className="inline-notice knowledge-notice"><Library size={21} /><div><strong>Die PDF wird nur beim Import gelesen.</strong><p>Danach bearbeitest du den gespeicherten Text. Für die KI gibst du geprüfte Quellen gezielt frei. Scans benötigen vorher OCR.</p></div></div>
            <div className="knowledge-grid"><div className="knowledge-list">{knowledge.length ? knowledge.map(item => <button key={item.id} disabled={!!busy} className={`knowledge-item ${knowledgeId === item.id ? 'selected' : ''}`} onClick={() => openKnowledge(item)}><span className="knowledge-kind">{item.kind}</span><strong>{item.title}</strong><span className={item.reviewed ? 'reviewed-tag' : 'unreviewed-tag'}>{item.reviewed ? <CheckCircle2 size={13} /> : <Circle size={13} />}{item.reviewed ? 'Geprüft' : 'Prüfung offen'}</span></button>) : <div className="empty-card"><FolderOpen size={30} /><h3>Platz für dein Wissen.</h3><p>Importiere eine Vorlage oder halte eine Regel direkt als Text fest.</p></div>}</div>
              <fieldset className="panel" disabled={!!busy}><div className="panel-heading"><h2>{knowledgeId ? 'Wissenseintrag bearbeiten' : 'Wissenseintrag anlegen'}</h2><InputFile disabled={!!busy} label="Datei importieren" onImport={file => void act('Wissen importieren', async () => { const result = await importFile(file); updateKnowledge({ content: result.text, title: knowledgeDraft.title || result.filename, reviewed: false }); setNotice(result.notice); })} /></div>
                <Field label="Titel des Wissenseintrags"><input maxLength={200} value={knowledgeDraft.title} onChange={e => updateKnowledge({ title: e.target.value, reviewed: false })} placeholder="z. B. Erwartungshorizont – Sachtextanalyse" /></Field><Field label="Art des Wissens"><select value={knowledgeDraft.kind} onChange={e => updateKnowledge({ kind: e.target.value as KnowledgeInput['kind'], reviewed: false })}>{['Regel', 'Beispiel', 'Hinweis'].map(kind => <option key={kind}>{kind}</option>)}</select></Field>
                <Field label="Aufbereiteter Inhalt" hint="Extrahierte Texte vor der Freigabe bereinigen. Persönliche Angaben und Schülerdaten entfernen."><textarea className="knowledge-content" maxLength={60000} value={knowledgeDraft.content} onChange={e => updateKnowledge({ content: e.target.value, reviewed: false })} placeholder="Regel, Beispielkriterien oder extrahierten Text hier festhalten …" /></Field><Field label="Quelle / Gültigkeit"><textarea rows={2} maxLength={2000} value={knowledgeDraft.reference} onChange={e => updateKnowledge({ reference: e.target.value, reviewed: false })} placeholder="Dokumenttitel, Herausgeber, Jahr, Kursart, Seite oder URL" /></Field>
                <label className="checkbox-label review-checkbox"><input type="checkbox" checked={knowledgeDraft.reviewed} disabled={!knowledgeDraft.reference.trim()} onChange={e => updateKnowledge({ reviewed: e.target.checked })} /><span>Ich habe Inhalt und Quelle geprüft. Dieser Eintrag darf für KI-Vorschläge ausgewählt werden.</span></label>
                <div className="editor-footer">{knowledgeId && <button className="button danger" onClick={() => { if (window.confirm('Diesen Wissenseintrag dauerhaft löschen?')) void act('Eintrag löschen', async () => { await api(`/knowledge/${knowledgeId}`, 'DELETE'); setKnowledge(previous => previous.filter(i => i.id !== knowledgeId)); setKnowledgeDraft({ ...EMPTY_KNOWLEDGE }); setKnowledgeId(undefined); setKnowledgeDirty(false); setNotice('Wissenseintrag gelöscht.'); }); }}><Trash2 size={15} />Löschen</button>}<span className="save-state">{knowledgeDirty ? 'Ungespeicherte Änderungen' : ''}</span><button className="button primary" disabled={!knowledgeDraft.title.trim() || !knowledgeDraft.content.trim()} onClick={() => void act('Wissen speichern', async () => { const value = await api<Knowledge>(knowledgeId ? `/knowledge/${knowledgeId}` : '/knowledge', knowledgeId ? 'PUT' : 'POST', knowledgeDraft); setKnowledge(previous => [value, ...previous.filter(i => i.id !== value.id)]); setKnowledgeId(value.id); setKnowledgeDirty(false); setNotice('Wissenseintrag gespeichert.'); })}><Save size={16} />Eintrag speichern</button></div>
              </fieldset></div>
          </>}

          {view === 'profile' && <>
            <div className="page-heading"><div><div className="eyebrow"><span />KLARE REGELN. EINHEITLICHE DOKUMENTE.</div><h1>Das Format hat System.</h1><p>Diese Einstellungen werden bei jedem Word-Export verbindlich angewendet.</p></div><span className="pill">Profilversion {profile.version}</span></div>
            <PdfReference />
            <div className="profile-grid"><fieldset className="panel" disabled={!!busy}><div className="panel-heading"><h2>Dein Word-Formatprofil</h2><Settings2 size={20} className="muted" /></div><div className="inline-notice"><ShieldCheck size={20} /><div>Die Ausgangswerte sind technische Beispiele. Erst der Abgleich mit einer gültigen Vorlage macht sie zu deinem geprüften Profil.</div></div>
              <Field label="Name des Formatprofils"><input value={profile.name} maxLength={200} onChange={e => { setProfile({ ...profile, name: e.target.value, reviewed: false }); setProfileDirty(true); }} /></Field>
              <div className="form-row"><Field label="Schriftart"><select value={profile.font} onChange={e => { setProfile({ ...profile, font: e.target.value as Profile['font'], reviewed: false }); setProfileDirty(true); }}>{['Arial', 'Calibri', 'Times New Roman'].map(font => <option key={font}>{font}</option>)}</select></Field><Field label="Schriftgröße (pt)"><input type="number" min={9} max={16} value={profile.font_size} onChange={e => { setProfile({ ...profile, font_size: Number(e.target.value), reviewed: false }); setProfileDirty(true); }} /></Field></div>
              <div className="form-row"><Field label="Zeilenabstand"><select value={profile.line_spacing} onChange={e => { setProfile({ ...profile, line_spacing: Number(e.target.value), reviewed: false }); setProfileDirty(true); }}>{[1, 1.15, 1.5, 2].map(spacing => <option key={spacing} value={spacing}>{String(spacing).replace('.', ',')}</option>)}</select></Field><Field label="Seitenränder (cm)"><input type="number" min={1.5} max={4} step={0.1} value={profile.margin_cm} onChange={e => { setProfile({ ...profile, margin_cm: Number(e.target.value), reviewed: false }); setProfileDirty(true); }} /></Field></div>
              <Field label="Referenzvorlage / Gültigkeit" hint="z. B. offizielles Dokument mit Ausgabejahr und Seitenangabe. Die App verifiziert diese Angabe nicht automatisch."><textarea rows={3} maxLength={2000} value={profile.source_reference} onChange={e => { setProfile({ ...profile, source_reference: e.target.value, reviewed: false }); setProfileDirty(true); }} /></Field><label className="checkbox-label review-checkbox"><input type="checkbox" disabled={!profile.source_reference.trim()} checked={profile.reviewed} onChange={e => { setProfile({ ...profile, reviewed: e.target.checked }); setProfileDirty(true); }} /><span>Ich habe dieses Formatprofil mit der genannten Referenzvorlage abgeglichen.</span></label>
              <div className="editor-footer"><span className="save-state">{profileDirty ? 'Ungespeicherte Änderungen' : 'Gespeichertes Profil'}</span><button className="button primary" disabled={!profileDirty} onClick={() => void act('Formatprofil speichern', async () => { const result = await api<Profile>('/profile', 'PUT', profile); setProfile(result); setProfileDirty(false); setReview(undefined); setNotice(`Formatprofil v${result.version} gespeichert.`); })}><Save size={16} />Formatprofil speichern</button></div>
            </fieldset><aside><div className="paper-preview" style={{ fontFamily: profile.font, fontSize: `${profile.font_size}px`, lineHeight: profile.line_spacing }}><div className="paper-preview-label">ILLUSTRATIVE VORSCHAU</div><h2>Englischklausur</h2><p>Qualifikationsphase · Grundkurs</p><div className="paper-rule" /><strong>Tasks</strong><p>1. Outline the main ideas presented in the text.</p><p>2. Analyse how the author conveys their point of view.</p><div className="paper-lines">{[1, 2, 3, 4].map(i => <span key={i} />)}</div><div className="paper-footer">Entwurf · Formatprofil v{profile.version}</div></div><p className="preview-caption">Die Vorschau zeigt die Gestaltung vereinfacht. Maßgeblich ist das erzeugte Word-Dokument. Benötigte Schriftarten müssen auf dem Zielgerät installiert sein.</p></aside></div>
          </>}
        </>}
        <footer className="main-footer"><span>Klausurwerk</span><p>Mit Sorgfalt vorbereitet. Von dir entschieden.</p><span>Englisch · NRW</span></footer>
      </main>
    </div>
    {busy && <div className="busy-indicator" role="status"><LoaderCircle size={17} className="spin" />{busy} …</div>}
    <dialog ref={dialogRef} onCancel={() => setAiDialog(false)} className="ai-dialog"><div className="dialog-heading"><span className="summary-icon"><Sparkles size={23} /></span><button className="icon-button" aria-label="Dialog schließen" onClick={() => setAiDialog(false)}><X size={20} /></button></div><h2>Vorschlag mit KI erstellen</h2><p>Dein Ausgangstext ({words} Wörter), Kurs, Zeit und Schwerpunkt sowie {exam.knowledge_ids.length} ausgewählte Wissenseinträge werden an OpenAI gesendet. Vorhandene Aufgaben werden nach erfolgreicher Prüfung ersetzt.</p><p>Bitte nur Material verwenden, das du an diesen Anbieter übermitteln darfst, und personenbezogene Angaben vorher entfernen.</p><div className="dialog-model">Modell: {status?.ai_model} · Ergebnis bleibt ein bearbeitbarer Entwurf</div><div className="button-row"><button className="button secondary" onClick={() => setAiDialog(false)}>Abbrechen</button><button className="button primary" onClick={() => { setAiDialog(false); void act('KI erstellt einen Vorschlag', async () => { const result = await api<{ tasks: Task[]; notes: string }>('/generate', 'POST', { exam }); change({ tasks: result.tasks, generation_notes: result.notes }); setNotice('KI-Vorschlag übernommen. Bitte Kriterien, Belege und Punkte fachlich prüfen.'); }); }}><Sparkles size={16} />An KI senden</button></div></dialog>
  </div>;
}
