import { useState } from 'react';
import { FileSearch, LoaderCircle, Upload } from 'lucide-react';
import { OFFLINE_DEMO } from './build-mode';

type Font = { pdf_name: string; name: string; size_pt: number; characters: number };
type Report = {
  filename: string; sha256: string; page_count: number; pages_with_text: number; fonts: Font[];
  pages: { page: number; width_pt: number; height_pt: number; characters: number; status: string; fonts: Font[] }[];
  notice: string;
};

function size(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

export default function PdfReference() {
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (OFFLINE_DEMO) return <section className="panel pdf-reference"><h2>PDF-Analyse folgt in der vollständigen Version</h2><p className="pdf-intro">In dieser Testversion kannst du Aufgaben und Erwartungshorizonte bearbeiten und als Word-Dateien herunterladen. Die Untersuchung von PDF-Schriften und der Import von PDF- und Word-Dateien sind hier noch nicht freigeschaltet. Du kannst Text direkt einfügen oder TXT-Dateien importieren.</p></section>;

  async function analyze(file: File) {
    setError(''); setReport(undefined); setBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Bitte eine PDF mit höchstens 10 MB auswählen.');
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/analyze-pdf', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Die PDF konnte nicht analysiert werden.');
      setReport(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die Analyse ist fehlgeschlagen. Bitte erneut versuchen.');
    } finally { setBusy(false); }
  }

  function saveReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = report.filename.replace(/\.pdf$/i, '') + '.layout.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return <section className="panel pdf-reference" aria-label="PDF-Referenzanalyse">
    <div className="panel-heading"><div><h2><FileSearch size={20} />Eine PDF als Referenz</h2><p>Schriften und Seitengrößen direkt aus dem Original untersuchen.</p></div></div>
    <p className="pdf-intro">Eine vorherige Umwandlung in Word ist nicht nötig. Die Analyse liest vorhandene PDF-Schriftdaten; das Word-Formatprofil bleibt unverändert.</p>
    <label className={`button secondary file-button ${busy ? 'disabled' : ''}`}>
      {busy ? <LoaderCircle size={16} className="spin" /> : <Upload size={16} />}{busy ? 'PDF wird untersucht …' : 'Original-PDF untersuchen'}
      <input type="file" accept=".pdf,application/pdf" aria-label="Original-PDF untersuchen" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void analyze(file); event.target.value = ''; }} />
    </label>
    {error && <p role="alert" className="warning-text">{error}</p>}
    {report && <div className="pdf-report">
      <h3>{report.filename}</h3><p>{report.pages_with_text} von {report.page_count} Seiten mit auslesbarem Text.</p>
      {report.pages_with_text < report.page_count && <p className="warning-text">Auf Seiten ohne auslesbaren Text können wir Schriftart und Schriftgröße nicht zuverlässig bestimmen. Bei Scans ist eine Texterkennung erforderlich.</p>}
      <details open><summary>Ermittelte Schriften und Größen</summary><div className="pdf-table-scroll"><table><thead><tr><th>PDF-Schrift</th><th>Größe</th><th>Zeichen</th></tr></thead><tbody>{report.fonts.map(font => <tr key={`${font.pdf_name}-${font.size_pt}`}><td title={font.pdf_name}>{font.name}</td><td>{size(font.size_pt)} pt</td><td>{font.characters.toLocaleString('de-DE')}</td></tr>)}</tbody></table></div></details>
      <details><summary>Seitengrößen und Textverfügbarkeit</summary><div className="pdf-table-scroll"><table><thead><tr><th>Seite</th><th>Format in mm</th><th>Text</th></tr></thead><tbody>{report.pages.map(page => <tr key={page.page}><td>{page.page}</td><td>{size(page.width_pt * 25.4 / 72)} × {size(page.height_pt * 25.4 / 72)}</td><td>{page.characters ? `${page.characters} Zeichen` : 'Nicht auslesbar'}</td></tr>)}</tbody></table></div></details>
      <p className="hint">{report.notice}</p>
      <button className="text-button" onClick={saveReport}>Analysebericht herunterladen (.json)</button>
    </div>}
  </section>;
}
