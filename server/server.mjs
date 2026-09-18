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
// Par défaut, écoute locale uniquement. HOST=0.0.0.0 pour exposer sur le réseau.
const HOST = process.env.HOST || '127.0.0.1';
// CORS : '*' par défaut (outil local). CORS_ORIGIN=domaine1,domaine2 pour restreindre.
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function corsOriginFor(req) {
  if (CORS_ALLOWED_ORIGINS.includes('*')) return '*';
  const origin = req.headers.origin;
  return CORS_ALLOWED_ORIGINS.includes(origin) ? origin : CORS_ALLOWED_ORIGINS[0];
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'SAMEORIGIN'
  };
}

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
    'Access-Control-Allow-Origin': corsOriginFor(res.req),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...securityHeaders()
  });
  res.end(JSON.stringify(data));
}

function sendError(res, msg, status = 400) {
  sendJson(res, { error: msg }, status);
}

const MAX_BODY_BYTES = 25 * 1024 * 1024; // 25 Mo : large marge pour un .h5p encodé en base64

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOriginFor(req),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...securityHeaders()
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
    let bodyBytes = 0;
    let tooLarge = false;
    for await (const chunk of req) {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES) {
        tooLarge = true;
        break;
      }
      chunks.push(chunk);
    }
    if (tooLarge) {
      res.writeHead(413, {
        'Content-Type': 'application/json; charset=utf-8',
        'Connection': 'close',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'Corps de requête trop volumineux (limite : 25 Mo).' }));
      return;
    }
    const rawBuffer = Buffer.concat(chunks);
    let body = {};

    if (rawBuffer.length > 0) {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          body = JSON.parse(rawBuffer.toString('utf-8'));
        } catch (e) {
          return sendError(res, 'Corps de requête JSON invalide.', 400);
        }
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
            niveau_classe: r.classe_cible || 'Toutes',
            source_contenu: r.source_contenu || '',
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
        console.error('[QuizFeedback] Erreur liste quiz:', err);
        return sendError(res, 'Erreur interne lors de la lecture des quiz.', 500);
      }
    }

    // GET /api/h5p/quiz/:id : Détail complet
    if (pathname.startsWith('/api/h5p/quiz/') && (req.method === 'GET' || req.method === 'HEAD') && !pathname.includes('/export') && !pathname.endsWith('/attempts')) {
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
        niveau_classe: row.classe_cible || 'Toutes',
        source_contenu: row.source_contenu || '',
        description: row.description,
        content,
        options,
        created_at: row.created_at
      });
    }

    // POST /api/h5p/upload ou /api/h5p/import : Importation H5P ou JSON
    if ((pathname === '/api/h5p/upload' || pathname === '/api/h5p/import') && req.method === 'POST') {
      const { base64File, filename, rawJson, title, theme, niveau_classe, source_contenu, options } = body;
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
      const finalNiveau = (niveau_classe && niveau_classe.trim()) || 'Toutes';
      const finalSource = (source_contenu && source_contenu.trim()) || '';
      const finalOptions = { ...parsed.options, ...(options || {}) };

      // Refuser les imports sans contenu exploitable plutôt que créer un quiz vide
      const hasCards = Array.isArray(parsed.content?.cards) && parsed.content.cards.length > 0;
      const hasQuestions = Array.isArray(parsed.content?.questions) && parsed.content.questions.length > 0;
      if (!hasCards && !hasQuestions) {
        return sendError(res, "Aucune question exploitable n'a été trouvée dans le fichier. Vérifiez qu'il s'agit bien d'un export H5P ou JSON de Quiz Wizard.", 400);
      }

      db.prepare(`
        INSERT INTO h5p_quizzes (id, type, title, theme, classe_cible, source_contenu, description, content_json, options_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        quizId,
        parsed.type || 'quiz',
        finalTitle,
        finalTheme,
        finalNiveau,
        finalSource,
        parsed.description || '',
        JSON.stringify(parsed.content),
        JSON.stringify(finalOptions)
      );

      const created = {
        id: quizId,
        type: parsed.type || 'quiz',
        title: finalTitle,
        theme: finalTheme,
        niveau_classe: finalNiveau,
        source_contenu: finalSource,
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

      const { title, theme, niveau_classe, source_contenu, description, content, options } = body;

      const newTitle = (title && title.trim()) || row.title;
      const newTheme = (theme && theme.trim()) || row.theme;
      const newNiveau = (niveau_classe !== undefined) ? (niveau_classe.trim() || row.classe_cible) : row.classe_cible;
      const newSource = (source_contenu !== undefined) ? source_contenu.trim() : (row.source_contenu || '');
      const newDesc = description !== undefined ? description : row.description;
      const newContent = content ? JSON.stringify(content) : row.content_json;
      const newOptions = options ? JSON.stringify(options) : row.options_json;

      db.prepare(`
        UPDATE h5p_quizzes
        SET title = ?, theme = ?, classe_cible = ?, source_contenu = ?, description = ?, content_json = ?, options_json = ?
        WHERE id = ?
      `).run(newTitle, newTheme, newNiveau, newSource, newDesc, newContent, newOptions, quizId);

      return sendJson(res, {
        success: true,
        quiz: {
          id: quizId,
          type: row.type,
          title: newTitle,
          theme: newTheme,
          niveau_classe: newNiveau,
          source_contenu: newSource,
          description: newDesc,
          content: content || JSON.parse(row.content_json),
          options: options || JSON.parse(row.options_json)
        }
      });
    }

    // DELETE /api/h5p/quiz/:id : Suppression
    if (pathname.startsWith('/api/h5p/quiz/') && req.method === 'DELETE') {
      const quizId = pathname.replace('/api/h5p/quiz/', '').trim();
      const row = db.prepare('SELECT id FROM h5p_quizzes WHERE id = ?').get(quizId);
      if (!row) return sendError(res, 'Quiz introuvable', 404);

      db.prepare('DELETE FROM h5p_attempts WHERE quiz_id = ?').run(quizId);
      db.prepare('DELETE FROM h5p_quizzes WHERE id = ?').run(quizId);
      return sendJson(res, { success: true, message: 'Quiz supprimé avec succès' });
    }

    // GET /api/h5p/quiz/:id/export : Exportation de l'archive .h5p pour LogiQuiz / Digiquiz
    if (pathname.startsWith('/api/h5p/quiz/') && pathname.endsWith('/export') && (req.method === 'GET' || req.method === 'HEAD')) {
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
          'Access-Control-Allow-Origin': corsOriginFor(req),
          ...securityHeaders()
        });
        if (req.method === 'HEAD') return res.end();
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
          'Access-Control-Allow-Origin': corsOriginFor(req),
          ...securityHeaders()
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

      const quizRow = db.prepare('SELECT id FROM h5p_quizzes WHERE id = ?').get(quizId);
      if (!quizRow) return sendError(res, 'Quiz introuvable', 404);

      const numScore = Number(score);
      const numMax = Number(maxScore);
      if (!Number.isFinite(numScore) || !Number.isFinite(numMax) || numMax <= 0 || numScore < 0 || numScore > numMax) {
        return sendError(res, 'Score invalide : score et maxScore doivent être des nombres, avec 0 ≤ score ≤ maxScore.', 400);
      }
      const numDuration = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) >= 0
        ? Math.round(Number(durationSeconds))
        : 0;

      const attemptId = `att_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 4)}`;
      const percentage = Math.round((numScore / numMax) * 100);

      db.prepare(`
        INSERT INTO h5p_attempts (id, quiz_id, student_name, score, max_score, percentage, duration_seconds, answers_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        attemptId,
        quizId,
        typeof studentName === 'string' && studentName.trim() ? studentName.trim() : 'Testeur',
        numScore,
        numMax,
        percentage,
        numDuration,
        JSON.stringify(answers || [])
      );

      return sendJson(res, { success: true, attemptId });
    }

    // GET /api/h5p/quiz/:id/attempts : Historique des tentatives d'un quiz
    if (pathname.startsWith('/api/h5p/quiz/') && pathname.endsWith('/attempts') && req.method === 'GET') {
      const quizId = pathname.replace('/api/h5p/quiz/', '').replace(/\/attempts$/, '').trim();
      const quizRow = db.prepare('SELECT id FROM h5p_quizzes WHERE id = ?').get(quizId);
      if (!quizRow) return sendError(res, 'Quiz introuvable', 404);

      const rows = db.prepare('SELECT * FROM h5p_attempts WHERE quiz_id = ? ORDER BY created_at DESC').all(quizId);
      return sendJson(res, { attempts: rows });
    }

    // Aucune route API correspondante : répondre 404 JSON (pas le frontend)
    return sendError(res, 'Route API inconnue : ' + req.method + ' ' + pathname, 404);
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
      res.writeHead(200, { 'Content-Type': contentType, ...securityHeaders() });
      return res.end(content);
    }
  }

  // Fallback si pas de frontend buildé
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders() });
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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[QuizFeedback] Le port ${PORT} est déjà utilisé. Un autre QuizFeedback tourne probablement.`);
    console.error(`           Lancez le serveur sur un autre port : PORT=<autre-port> node server/server.mjs`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const shownHost = HOST === '0.0.0.0' ? '<adresse-ip-de-la-machine>' : HOST;
  console.log(`[QuizFeedback] Serveur démarré sur http://${shownHost}:${PORT}`);
  if (HOST === '0.0.0.0') {
    console.log('[QuizFeedback] Accessible depuis le réseau local (HOST=0.0.0.0).');
  }
});

export default server;
