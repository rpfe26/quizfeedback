import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT, 'server/server.mjs');

const TMP_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'qf-test-data-'));
const PORT = 18123;
const BASE = `http://127.0.0.1:${PORT}`;

function request(method, urlPath, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${urlPath}`, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const postJson = (urlPath, data) => request('POST', urlPath, {
  body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' }
});

let child;
before(async () => {
  child = spawn(process.execPath, [SERVER_ENTRY], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: TMP_DATA },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  // Attendre le readiness (polling sur /api/status)
  for (let i = 0; i < 100; i++) {
    try {
      const r = await request('GET', '/api/status');
      if (r.status === 200) return;
    } catch (e) { /* pas encore prêt */ }
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('Le serveur de test ne répond pas sur /api/status');
});

after(async () => {
  child?.kill('SIGTERM');
  fs.rmSync(TMP_DATA, { recursive: true, force: true });
});

let createdQuizId;

describe('Serveur QuizFeedback (routes réelles)', () => {
  test('/api/status répond OK', async () => {
    const r = await request('GET', '/api/status');
    assert.equal(r.status, 200);
    const data = JSON.parse(r.text);
    assert.equal(data.status, 'ok');
    assert.equal(data.app, 'quizfeedback');
  });

  test('POST /api/h5p/upload (JSON direct) crée un quiz', async () => {
    const r = await postJson('/api/h5p/upload', {
      title: 'Mon Quiz',
      content: { questions: [{
        question: '1+1 ?', type: 'multichoice',
        answers: [{ text: '2', correct: true, feedback: 'Oui' }, { text: '3', correct: false, feedback: 'Non' }]
      }] }
    });
    assert.equal(r.status, 201);
    const data = JSON.parse(r.text);
    assert.ok(data.quizId);
    createdQuizId = data.quizId;
    assert.equal(data.quiz.title, 'Mon Quiz');
  });

  test('GET /api/h5p/quizzes liste le quiz créé', async () => {
    const r = await request('GET', '/api/h5p/quizzes');
    assert.equal(r.status, 200);
    const { quizzes } = JSON.parse(r.text);
    const mine = quizzes.find(q => q.id === createdQuizId);
    assert.ok(mine);
    assert.equal(mine.total_questions, 1);
  });

  test('GET /api/h5p/quiz/:id renvoie le détail', async () => {
    const r = await request('GET', `/api/h5p/quiz/${createdQuizId}`);
    assert.equal(r.status, 200);
    const data = JSON.parse(r.text);
    assert.equal(data.id, createdQuizId);
    assert.equal(data.content.questions[0].answers[0].text, '2');
  });

  test('GET /api/h5p/quiz/inexistant renvoie 404', async () => {
    const r = await request('GET', '/api/h5p/quiz/qf_nimporte');
    assert.equal(r.status, 404);
    assert.ok(JSON.parse(r.text).error);
  });

  test('PUT /api/h5p/quiz/:id met à jour titre et contenu', async () => {
    const r = await request('PUT', `/api/h5p/quiz/${createdQuizId}`, {
      body: JSON.stringify({
        title: 'Titre mis à jour',
        content: { questions: [{
          question: '2+2 ?', type: 'multichoice',
          answers: [{ text: '4', correct: true }]
        }] }
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(r.status, 200);
    const detail = JSON.parse((await request('GET', `/api/h5p/quiz/${createdQuizId}`)).text);
    assert.equal(detail.title, 'Titre mis à jour');
    assert.equal(detail.content.questions[0].question, '2+2 ?');
  });

  test('BUG-1 : upload d un fichier quelconque renvoie 400 (pas de quiz vide)', async () => {
    const r = await postJson('/api/h5p/upload', { title: 'garbage', content: 'not-a-zip-content' });
    assert.equal(r.status, 400);
    assert.ok(JSON.parse(r.text).error);
    // Aucun quiz créé côté liste
    const list = JSON.parse((await request('GET', '/api/h5p/quizzes')).text);
    assert.ok(!list.quizzes.some(q => q.title === 'garbage'));
  });

  test('BUG-1 : corps JSON malformé renvoie 400 avec message clair', async () => {
    const r = await request('POST', '/api/h5p/upload', {
      body: '{this is not valid json',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(r.status, 400);
    assert.ok(JSON.parse(r.text).error);
  });

  test('corps trop volumineux renvoie 413', async () => {
    const big = 'x'.repeat(26 * 1024 * 1024);
    const r = await request('POST', '/api/h5p/upload', {
      body: JSON.stringify({ title: 'big', content: big }),
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(r.status, 413);
    assert.ok(JSON.parse(r.text).error);
  });

  test('BUG-5 : DELETE sur un id inexistant renvoie 404', async () => {
    const r = await request('DELETE', '/api/h5p/quiz/qf_nimporte');
    assert.equal(r.status, 404);
    assert.equal(JSON.parse(r.text).error, 'Quiz introuvable');
  });

  test('BUG-7 : route API inconnue renvoie 404 JSON (pas le frontend)', async () => {
    const r = await request('GET', '/api/h5p/route-inexistante');
    assert.equal(r.status, 404);
    assert.equal(r.headers['content-type'], 'application/json; charset=utf-8');
    assert.ok(JSON.parse(r.text).error.includes('Route API inconnue'));
  });

  test('GET /download-standalone ne renvoie plus de route morte', async () => {
    // Route supprimée : le chemin tombe dans le fallback SPA (200 HTML) mais plus jamais
    // en "succès" d'un livrable fantôme côté API. On vérifie simplement que ce n'est pas JSON.
    const r = await request('GET', '/download-standalone');
    assert.notEqual(r.headers['content-type'], 'application/json; charset=utf-8');
  });

  test('BUG-8 : attempt avec quiz inconnu renvoie 404', async () => {
    const r = await postJson('/api/h5p/attempt', { quizId: 'fantome', score: 5, maxScore: 10 });
    assert.equal(r.status, 404);
  });

  test('BUG-8 : attempt avec score non numérique renvoie 400', async () => {
    const r = await postJson('/api/h5p/attempt', { quizId: createdQuizId, score: 'abc', maxScore: 'def' });
    assert.equal(r.status, 400);
    assert.ok(JSON.parse(r.text).error);
  });

  test('BUG-8 : attempt avec score > maxScore renvoie 400', async () => {
    const r = await postJson('/api/h5p/attempt', { quizId: createdQuizId, score: 15, maxScore: 10 });
    assert.equal(r.status, 400);
  });

  test('BUG-8 : attempt valide est enregistré', async () => {
    const r = await postJson('/api/h5p/attempt', {
      quizId: createdQuizId, score: 4, maxScore: 5, durationSeconds: 42, studentName: '  Alice  '
    });
    assert.equal(r.status, 200);
    const { attemptId } = JSON.parse(r.text);
    assert.ok(attemptId);
    // Vérifier via l'API attempts
    const list = JSON.parse((await request('GET', `/api/h5p/quiz/${createdQuizId}/attempts`)).text);
    assert.ok(list.attempts.some(a => a.id === attemptId && a.student_name === 'Alice' && a.percentage === 80));
  });

  test('BUG-8 : les mauvais scores ne créent pas de ligne incohérente', async () => {
    const before = JSON.parse((await request('GET', `/api/h5p/quiz/${createdQuizId}/attempts`)).text).attempts.length;
    await postJson('/api/h5p/attempt', { quizId: createdQuizId, score: 'x', maxScore: null });
    await postJson('/api/h5p/attempt', { quizId: createdQuizId, score: -3, maxScore: 10 });
    const after = JSON.parse((await request('GET', `/api/h5p/quiz/${createdQuizId}/attempts`)).text).attempts.length;
    assert.equal(before, after);
  });

  test('BUG-8 : maxScore <= 0 renvoie 400 (pas de division par zéro)', async () => {
    const r = await postJson('/api/h5p/attempt', { quizId: createdQuizId, score: 0, maxScore: 0 });
    assert.equal(r.status, 400);
  });

  test('export H5P : GET /api/h5p/quiz/:id/export renvoie une archive valide', async () => {
    const r = await request('GET', `/api/h5p/quiz/${createdQuizId}/export`);
    assert.equal(r.status, 200);
    assert.ok(r.headers['content-disposition']?.includes('.h5p'));
    assert.ok(r.text.startsWith('PK'));
  });

  test('export H5P : quiz inexistant renvoie 404', async () => {
    const r = await request('GET', '/api/h5p/quiz/qf_nimporte/export');
    assert.equal(r.status, 404);
  });

  test('path traversal : le fallback SPA protège les fichiers système', async () => {
    const r = await request('GET', '/..%2f..%2fserver%2fserver.mjs');
    assert.equal(r.status, 200);
    assert.ok(r.headers['content-type'].includes('text/html'));
    assert.ok(!r.text.includes('http.createServer'));
  });

  test('OPTIONS préflight CORS répond 204', async () => {
    const r = await request('OPTIONS', '/api/h5p/quizzes');
    assert.equal(r.status, 204);
  });

  test('fallback SPA : / renvoie l index html', async () => {
    const r = await request('GET', '/');
    assert.equal(r.status, 200);
    assert.ok(r.headers['content-type'].includes('text/html'));
  });

  test('EADDRINUSE : un second serveur sur le même port affiche un message clair et sort en 1', async () => {
    const result = await new Promise((resolve) => {
      execFile(process.execPath, [SERVER_ENTRY], {
        env: { ...process.env, PORT: String(PORT), DATA_DIR: TMP_DATA }
      }, (err, stdout, stderr) => resolve({ err, stderr }));
    });
    assert.ok(result.err);
    assert.equal(result.err.code, 1);
    assert.ok(result.stderr.includes('déjà utilisé'));
    assert.ok(result.stderr.includes('PORT='));
    assert.ok(!result.stderr.includes('EADDRINUSE: address already in use'));
  });
});