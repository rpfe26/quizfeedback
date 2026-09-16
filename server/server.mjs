import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from './db.mjs';
import { parseQuizWizardH5P } from './h5p-parser.mjs';
import { generateH5PQuestionSetPackage } from './h5p-exporter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3050', 10);
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, msg, status = 400) {
  sendJson(res, { error: msg }, status);
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // 1. Health & Status
  if (pathname === '/api/status' && req.method === 'GET') {
    return sendJson(res, {
      status: 'ok',
      app: 'quizfeedback',
      name: 'QuizFeedback',
      description: 'Générateur de Quiz H5P & Feedbacks Pascal Pansu pour LogiQuiz',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }

  // 2. API Routes
  if (pathname.startsWith('/api/h5p')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBuffer = Buffer.concat(chunks);
    let body = {};

    if (rawBuffer.length > 0) {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          body = JSON.parse(rawBuffer.toString('utf-8'));
        } catch (e) {}
      }
    }

    // GET /api/h5p/quizzes : Liste des quiz
    if (pathname === '/api/h5p/quizzes' && req.method === 'GET') {
      try {
        const rows = db.prepare('SELECT * FROM h5p_quizzes ORDER BY created_at DESC').all();

        const quizzes = rows.map(r => {
          let content = {};
          let options = {};
          try { content = JSON.parse(r.content_json); } catch (e) {}
          try { options = JSON.parse(r.options_json); } catch (e) {}

          const questions = content.questions || [];
          const totalQuestions = questions.length;
          let feedbackCount = 0;
          let totalAnswers = 0;

          questions.forEach(q => {
            (q.answers || []).forEach(a => {
              totalAnswers++;
              if (a.feedback && a.feedback.trim()) feedbackCount++;
            });
          });

          return {
            id: r.id,
            type: r.type,
            title: r.title,
            theme: r.theme,
            description: r.description,
            content,
            options,
            created_at: r.created_at,
            total_questions: totalQuestions,
            total_answers: totalAnswers,
            feedbacks_configured: feedbackCount
          };
        });

        return sendJson(res, { quizzes });
      } catch (err) {
        return sendError(res, err.message, 500);
      }
    }

    // GET /api/h5p/quiz/:id : Détail complet
    if (pathname.startsWith('/api/h5p/quiz/') && req.method === 'GET' && !pathname.endsWith('/export')) {
      const quizId = pathname.replace('/api/h5p/quiz/', '').trim();
      const row = db.prepare('SELECT * FROM h5p_quizzes WHERE id = ?').get(quizId);
      if (!row) return sendError(res, 'Quiz introuvable', 404);

      let content = {};
      let options = {};
      try { content = JSON.parse(row.content_json); } catch (e) {}
      try { options = JSON.parse(row.options_json); } catch (e) {}

      return sendJson(res, {
        id: row.id,
        type: row.type,
        title: row.title,
        theme: row.theme,
        description: row.description,
        content,
        options,
        created_at: row.created_at
      });
    }

    // POST /api/h5p/upload ou /api/h5p/import : Importation H5P ou JSON
    if ((pathname === '/api/h5p/upload' || pathname === '/api/h5p/import') && req.method === 'POST') {
      const { base64File, filename, rawJson, title, theme, options } = body;
      let parsed;

      try {
        if (base64File) {
          const buffer = Buffer.from(base64File.replace(/^data:.*?;base64,/, ''), 'base64');
          parsed = parseQuizWizardH5P(buffer, filename || 'quiz.h5p');
        } else if (rawJson) {
          parsed = parseQuizWizardH5P(rawJson, filename || 'quiz.json');
        } else if (body.content && (body.content.questions || body.content.cards)) {
          parsed = {
            type: body.type || (body.content.cards ? 'flashcards' : 'quiz'),
            title: body.title || 'Nouveau Quiz',
            theme: body.theme || 'Général',
            description: body.description || '',
            content: body.content,
            options: body.options || {}
          };
        } else if (rawBuffer.length > 0) {
          parsed = parseQuizWizardH5P(rawBuffer, filename || 'quiz.h5p');
        } else {
          return sendError(res, 'Fichier H5P ou contenu JSON requis');
        }
      } catch (parseErr) {
        return sendError(res, 'Erreur lors du décodage du fichier : ' + parseErr.message, 400);
      }

      const quizId = `qf_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 4)}`;
      const finalTitle = (title && title.trim()) || parsed.title || 'Quiz H5P';
      const finalTheme = (theme && theme.trim()) || parsed.theme || 'Général';
      const finalOptions = { ...parsed.options, ...(options || {}) };

      db.prepare(`
        INSERT INTO h5p_quizzes (id, type, title, theme, classe_cible, description, content_json, options_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        quizId,
        parsed.type || 'quiz',
        finalTitle,
        finalTheme,
        'Toutes',
        parsed.description || '',
        JSON.stringify(parsed.content),
        JSON.stringify(finalOptions)
      );

      const created = {
        id: quizId,
        type: parsed.type || 'quiz',
        title: finalTitle,
        theme: finalTheme,
        description: parsed.description,
        content: parsed.content,
        options: finalOptions,
        created_at: new Date().toISOString()
      };

      return sendJson(res, { success: true, quizId, quiz: created }, 201);
    }

    // PUT /api/h5p/quiz/:id : Mise à jour
    if (pathname.startsWith('/api/h5p/quiz/') && req.method === 'PUT') {
      const quizId = pathname.replace('/api/h5p/quiz/', '').trim();
      const row = db.prepare('SELECT * FROM h5p_quizzes WHERE id = ?').get(quizId);
      if (!row) return sendError(res, 'Quiz introuvable', 404);

      const { title, theme, description, content, options } = body;

      const newTitle = (title && title.trim()) || row.title;
      const newTheme = (theme && theme.trim()) || row.theme;
      const newDesc = description !== undefined ? description : row.description;
      const newContent = content ? JSON.stringify(content) : row.content_json;
      const newOptions = options ? JSON.stringify(options) : row.options_json;

      db.prepare(`
        UPDATE h5p_quizzes
        SET title = ?, theme = ?, classe_cible = 'Toutes', description = ?, content_json = ?, options_json = ?
        WHERE id = ?
      `).run(newTitle, newTheme, newDesc, newContent, newOptions, quizId);

      return sendJson(res, {
        success: true,
        quiz: {
          id: quizId,
          type: row.type,
          title: newTitle,
          theme: newTheme,
          description: newDesc,
          content: content || JSON.parse(row.content_json),
          options: options || JSON.parse(row.options_json)
        }
      });
    }

    // DELETE /api/h5p/quiz/:id : Suppression
    if (pathname.startsWith('/api/h5p/quiz/') && req.method === 'DELETE') {
      const quizId = pathname.replace('/api/h5p/quiz/', '').trim();
      db.prepare('DELETE FROM h5p_attempts WHERE quiz_id = ?').run(quizId);
      db.prepare('DELETE FROM h5p_quizzes WHERE id = ?').run(quizId);
      return sendJson(res, { success: true, message: 'Quiz supprimé avec succès' });
    }

    // GET /api/h5p/quiz/:id/export : Exportation de l'archive .h5p pour LogiQuiz / Digiquiz
    if (pathname.startsWith('/api/h5p/quiz/') && pathname.endsWith('/export') && req.method === 'GET') {
      const quizId = pathname.replace('/api/h5p/quiz/', '').replace(/\/export$/, '').trim();
      const row = db.prepare('SELECT * FROM h5p_quizzes WHERE id = ?').get(quizId);
      if (!row) return sendError(res, 'Quiz introuvable', 404);

      let content = {};
      let options = {};
      try { content = JSON.parse(row.content_json); } catch (e) {}
      try { options = JSON.parse(row.options_json); } catch (e) {}

      const quizData = {
        id: row.id,
        type: row.type,
        title: row.title,
        theme: row.theme,
        description: row.description,
        content,
        options
      };

      try {
        const h5pZipBuffer = generateH5PQuestionSetPackage(quizData);
        const safeFilename = `logiquiz_${(row.title || 'h5p').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '_')}.h5p`;

        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFilename)}"`,
          'Content-Length': h5pZipBuffer.length,
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(h5pZipBuffer);
      } catch (err) {
        console.error('Erreur génération H5P:', err);
        return sendError(res, 'Échec de la génération du package H5P: ' + err.message, 500);
      }
    }

    // POST /api/h5p/export-h5p : Génération directe .h5p à partir d'un objet JSON
    if (pathname === '/api/h5p/export-h5p' && req.method === 'POST') {
      const quizData = body.quiz || body;
      if (!quizData || !quizData.content) {
        return sendError(res, 'Données du quiz requises');
      }

      try {
        const h5pZipBuffer = generateH5PQuestionSetPackage(quizData);
        const safeFilename = `logiquiz_${(quizData.title || 'h5p').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '_')}.h5p`;

        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(safeFilename)}"`,
          'Content-Length': h5pZipBuffer.length,
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(h5pZipBuffer);
      } catch (err) {
        console.error('Erreur export direct H5P:', err);
        return sendError(res, 'Échec de la génération du package H5P: ' + err.message, 500);
      }
    }

    // POST /api/h5p/attempt : Enregistrement d'un test
    if (pathname === '/api/h5p/attempt' && req.method === 'POST') {
      const { quizId, studentName, score, maxScore, durationSeconds, answers } = body;
      const attemptId = `att_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 4)}`;
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      db.prepare(`
        INSERT INTO h5p_attempts (id, quiz_id, student_name, score, max_score, percentage, duration_seconds, answers_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        attemptId,
        quizId,
        studentName || 'Testeur',
        score || 0,
        maxScore || 1,
        percentage,
        durationSeconds || 0,
        JSON.stringify(answers || [])
      );

      return sendJson(res, { success: true, attemptId });
    }
  }

  // 3. Fichiers statiques dist/ (Frontend React)
  if (fs.existsSync(DIST_DIR)) {
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(content);
    }
  }

  // Fallback si pas de frontend buildé
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><title>QuizFeedback API</title></head>
      <body style="font-family:sans-serif;padding:2rem;text-align:center;">
        <h2>QuizFeedback API est en cours d'exécution sur le port ${PORT}</h2>
        <p>Le frontend n'est pas encore compilé. Exécutez <code>npm run build</code> ou <code>npm run dev</code>.</p>
      </body>
    </html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[QuizFeedback] Serveur démarré avec succès sur http://0.0.0.0:${PORT}`);
});

export default server;
