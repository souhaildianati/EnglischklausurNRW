import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const url = 'http://127.0.0.1:8200/';
const python = fileURLToPath(new URL('../../.venv/bin/python', import.meta.url));
const artifact = (name: string) => fileURLToPath(new URL(`../test-results/${name}`, import.meta.url));

test('web demo needs no API server and exports real Word documents after losing connection', async ({ page }) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await expect(page.getByText('Testversion · ohne Anmeldung')).toBeVisible();
  await expect(page.getByLabel('Titel der Klausur', { exact: true })).toHaveValue('A town after the last bus');
  await page.getByLabel('Titel der Klausur', { exact: true }).fill('Mein erster Offline-Test');
  await page.getByRole('button', { name: 'Aufgaben entwickeln', exact: true }).click();
  await expect(page.getByRole('button', { name: 'KI-Vorschlag vorbereiten' })).toBeDisabled();
  await page.getByLabel('Kriterium 1.1', { exact: true }).fill('Erklärt die Folgen für Maya & ihre beruflichen Möglichkeiten.');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Klausur gespeichert');
  await page.reload();
  await expect(page.getByLabel('Titel der Klausur', { exact: true })).toHaveValue('Mein erster Offline-Test');
  await page.getByRole('button', { name: /2.*Aufgaben & Bewertung/ }).click();
  await expect(page.getByLabel('Kriterium 1.1', { exact: true })).toHaveValue('Erklärt die Folgen für Maya & ihre beruflichen Möglichkeiten.');
  await page.getByRole('button', { name: 'Klausur prüfen', exact: true }).click();
  await expect(page.getByText('Textbelege nachprüfbar', { exact: true })).toBeVisible();
  await page.context().setOffline(true);
  const files: string[] = [];
  for (const name of ['Klausur.docx', 'Erwartungshorizont.docx']) {
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name, exact: true }).click();
    const download = await event;
    expect(download.suggestedFilename()).toBe(name);
    const path = (await download.path())!;
    expect((await readFile(path)).subarray(0, 2).toString()).toBe('PK');
    await copyFile(path, artifact(`demo-${name}`));
    files.push(path);
  }
  const result = execFileSync(python, ['-c', `
import sys
from docx import Document
from zipfile import ZipFile
from lxml import etree
student,teacher=map(Document,sys.argv[1:])
text='\\n'.join(p.text for p in student.paragraphs)
assert 'Mein erster Offline-Test' in text
assert 'When the council announced' in text
assert 'beruflichen Möglichkeiten' not in text
assert not student.tables
assert len(student.sections)==2
assert round(student.sections[0].left_margin.cm,1)==2.5
assert len(teacher.tables)==4
assert teacher.tables[0].cell(1,0).text=='Erklärt die Folgen für Maya & ihre beruflichen Möglichkeiten.'
assert teacher.tables[0].cell(1,2).text=='5'
assert any('Gesamt: 100 Punkte' in p.text for p in teacher.paragraphs)
with ZipFile(sys.argv[1]) as archive:
 assert 'countBy="5"' in archive.read('word/document.xml').decode()
 styles=etree.fromstring(archive.read('word/styles.xml'))
 ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
 assert styles.xpath('//w:docDefaults/w:rPrDefault/w:rPr/w:rFonts/@w:ascii',namespaces=ns)==['Arial']
 assert styles.xpath('//w:docDefaults/w:rPrDefault/w:rPr/w:sz/@w:val',namespaces=ns)==['22']
print('Word structure, profile, content separation and totals OK')
`, ...files], { encoding: 'utf8' });
  expect(result).toContain('Word structure');
  const backupEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Arbeitsstand herunterladen', exact: true }).click();
  const backup = await backupEvent;
  const data = JSON.parse(await readFile((await backup.path())!, 'utf8'));
  expect(data.exams[0].title).toBe('Mein erster Offline-Test');
  await page.screenshot({ path: artifact('offline-demo.png'), fullPage: true });
  expect(requests.every(request => request === url || request.endsWith('/favicon.ico'))).toBe(true);
  expect(errors).toEqual([]);
});

test('local text import, knowledge editing and format profile are usable', async ({ page }) => {
  await page.goto(url);
  await page.locator('input[type=file]').setInputFiles({ name: 'text.txt', mimeType: 'text/plain', buffer: Buffer.from('A fresh local text.') });
  await expect(page.getByLabel('Ausgangstext', { exact: true })).toHaveValue('A fresh local text.');
  await page.getByRole('button', { name: /Wissensbasis/ }).first().click();
  await expect(page.getByRole('button', { name: /Gemeinsame Dokumentstruktur/ })).toBeVisible();
  await page.getByLabel('Titel des Wissenseintrags').fill('Meine lokale Notiz');
  await page.getByLabel('Aufbereiteter Inhalt').fill('Ein redaktioneller Hinweis für meinen Test.');
  await page.getByRole('button', { name: 'Eintrag speichern' }).click();
  await expect(page.getByRole('status')).toContainText('Wissenseintrag gespeichert');
  await page.getByRole('button', { name: 'Formatprofil', exact: true }).click();
  await expect(page.getByText('PDF-Analyse folgt in der vollständigen Version', { exact: true })).toBeVisible();
  await page.getByLabel('Schriftart', { exact: true }).selectOption('Times New Roman');
  await page.getByLabel('Schriftgröße (pt)').fill('12');
  await page.getByRole('button', { name: 'Formatprofil speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Formatprofil v2 gespeichert');
});

test('invalid points are rejected and the file fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Aufgaben entwickeln', exact: true }).click();
  await page.getByLabel('Punkte 1.1', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Punkte müssen ganze Zahlen zwischen 1 und 100 sein.');
  await expect(page.getByLabel('Punkte 1.1', { exact: true })).toHaveValue('0');
});
