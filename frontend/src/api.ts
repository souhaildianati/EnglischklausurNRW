import { OFFLINE_DEMO } from './build-mode';
import type { Exam } from './types';

async function failure(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({}));
  const message = typeof body.detail === 'string'
    ? body.detail
    : Array.isArray(body.detail)
      ? body.detail.map((item: { loc?: string[]; msg?: string }) => `${item.loc?.slice(1).join(' › ') ?? 'Eingabe'}: ${item.msg}`).join('\n')
      : `Die Anfrage ist fehlgeschlagen (${response.status}).`;
  throw new Error(message);
}

export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  if (OFFLINE_DEMO) {
    const { demoRequest } = await import('./demo/storage');
    return demoRequest<T>(path, method, data);
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: data ? { 'Content-Type': 'application/json' } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error('Der Server ist nicht erreichbar. Deine geöffneten Eingaben bleiben erhalten.');
  }
  if (!response.ok) return failure(response);
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function importFile(file: File): Promise<{ text: string; filename: string; notice: string }> {
  if (OFFLINE_DEMO) return (await import('./demo/storage')).demoImport(file);
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/import', { method: 'POST', body: form });
  if (!response.ok) return failure(response);
  return response.json();
}

export async function download(kind: 'exam' | 'rubric', exam: unknown) {
  if (OFFLINE_DEMO) {
    const { demoProfile } = await import('./demo/storage');
    const { demoDocument } = await import('./demo/documents');
    saveBlob(await demoDocument(kind, exam as Exam, demoProfile()), kind === 'exam' ? 'Klausur.docx' : 'Erwartungshorizont.docx');
    return;
  }
  const response = await fetch(`/api/export/${kind}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exam),
  });
  if (!response.ok) return failure(response);
  saveBlob(await response.blob(), kind === 'exam' ? 'Klausur.docx' : 'Erwartungshorizont.docx');
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
