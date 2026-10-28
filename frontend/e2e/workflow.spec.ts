import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

function referencePdf() {
  const content = 'BT /F1 12 Tf 50 700 Td (Reference example) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.32 841.92] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test('a teacher can edit, save, reopen and export both Word documents', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mit Beispiel ausprobieren' }).click();
  await expect(page.getByLabel('Ausgangstext', { exact: true })).toHaveValue(/When the council announced/);
  await page.getByLabel('Titel der Klausur', { exact: true }).fill('Mobility and participation');
  await page.getByRole('button', { name: 'Aufgaben entwickeln', exact: true }).click();
  await expect(page.getByRole('button', { name: 'KI-Vorschlag vorbereiten' })).toBeDisabled();
  await page.getByLabel('Kriterium 1.1', { exact: true }).fill('Beschreibt Mayas eingeschränkte Mobilität und die beruflichen Folgen.');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Klausur gespeichert');
  await page.reload();
  await expect(page.getByLabel('Titel der Klausur', { exact: true })).toHaveValue('Mobility and participation');
  await page.getByRole('button', { name: /2.*Aufgaben & Bewertung/ }).click();
  await expect(page.getByLabel('Kriterium 1.1', { exact: true })).toHaveValue('Beschreibt Mayas eingeschränkte Mobilität und die beruflichen Folgen.');
  await page.getByRole('button', { name: 'Klausur prüfen', exact: true }).click();
  await expect(page.getByText('Formatprofil geprüft', { exact: true })).toBeVisible();
  const studentEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Klausur.docx', exact: true }).click();
  const student = await studentEvent;
  expect(student.suggestedFilename()).toBe('Klausur.docx');
  expect((await readFile((await student.path())!)).subarray(0, 2).toString()).toBe('PK');
  const rubricEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Erwartungshorizont.docx', exact: true }).click();
  const rubric = await rubricEvent;
  expect(rubric.suggestedFilename()).toBe('Erwartungshorizont.docx');
  expect((await readFile((await rubric.path())!)).length).toBeGreaterThan(10000);
  expect(errors).toEqual([]);
});

test('knowledge is imported once, edited and explicitly reviewed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Wissensbasis/ }).first().click();
  await page.locator('input[type=file]').setInputFiles({ name: 'beispiel.txt', mimeType: 'text/plain', buffer: Buffer.from('A concrete analysis criterion with an exact reference.') });
  await expect(page.getByLabel('Aufbereiteter Inhalt')).toHaveValue('A concrete analysis criterion with an exact reference.');
  await page.getByLabel('Titel des Wissenseintrags').fill('Geprüftes Analysebeispiel');
  await page.getByLabel('Quelle / Gültigkeit').fill('Eigene Unterrichtsvorlage, 2026, S. 2');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(page.getByRole('status')).toContainText('Wissenseintrag gespeichert');
  await page.reload();
  await page.getByRole('button', { name: /Wissensbasis/ }).first().click();
  await page.getByRole('button', { name: /Geprüftes Analysebeispiel/ }).click();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.getByLabel('Aufbereiteter Inhalt').fill('Revised criterion – requires another review.');
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(page.getByRole('status')).toContainText('Wissenseintrag gespeichert');
});

test('format changes are versioned and affect export availability', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formatprofil', exact: true }).click();
  await page.getByLabel('Schriftart', { exact: true }).selectOption('Times New Roman');
  await page.getByLabel('Schriftgröße (pt)').fill('12');
  await page.getByLabel('Referenzvorlage / Gültigkeit').fill('Testvorlage der Lehrkraft, Ausgabe 2026');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Formatprofil speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Formatprofil v2 gespeichert');
  await page.getByLabel('Schriftgröße (pt)').fill('11');
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByRole('button', { name: /Klausurwerkstatt/ }).click();
  await page.getByRole('button', { name: /3.*Prüfen & Export/ }).click();
  await expect(page.getByRole('button', { name: 'Klausur.docx', exact: true })).toBeDisabled();
  await expect(page.getByText('Bitte Änderungen am Formatprofil zuerst speichern.')).toBeVisible();
});

test('the workspace fits mobile screens and the example is honest', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mit Beispiel ausprobieren' }).click();
  await expect(page.getByText('Manueller Modus')).toBeVisible();
  await expect(page.getByLabel('Titel der Klausur')).toHaveValue('A town after the last bus');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile-workspace.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/desktop-workspace.png', fullPage: true });
});

test('original PDF fonts are measured without automatically changing the Word profile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Formatprofil', exact: true }).click();
  const before = await (await page.request.get('/api/profile')).json();
  await page.getByLabel('Original-PDF untersuchen', { exact: true }).setInputFiles({ name: 'reference.pdf', mimeType: 'application/pdf', buffer: referencePdf() });
  await expect(page.getByText('1 von 1 Seiten mit auslesbarem Text.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Helvetica', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '12 pt', exact: true })).toBeVisible();
  expect(await (await page.request.get('/api/profile')).json()).toEqual(before);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Analysebericht herunterladen (.json)' }).click();
  const report = await event;
  const parsed = JSON.parse(await readFile((await report.path())!, 'utf8'));
  expect(parsed.fonts[0].name).toBe('Helvetica');
  expect(parsed.pages[0].text_bounds_pt.left).toBe(50);
});
