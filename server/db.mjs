import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DATA_DIR peut être surchargé (tests, Docker volume, etc.)
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'quizfeedback.db');

let dbInstance = null;

try {
  const { DatabaseSync } = await import('node:sqlite');
  dbInstance = new DatabaseSync(DB_PATH);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS h5p_quizzes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'Général',
      classe_cible TEXT NOT NULL DEFAULT 'Toutes',
      description TEXT,
      content_json TEXT NOT NULL,
      options_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS h5p_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      student_name TEXT,
      score REAL NOT NULL,
      max_score REAL NOT NULL,
      percentage REAL NOT NULL,
      duration_seconds INTEGER NOT NULL,
      answers_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_h5p_attempts_quiz ON h5p_attempts(quiz_id);
  `);
  console.log('[QuizFeedback DB] Base SQLite initialisée avec succès');
} catch (err) {
  console.warn('[QuizFeedback DB] SQLite natif indisponible, utilisation du stockage JSON en mémoire/fichier:', err.message);

  // Fallback JSON-based store in case sqlite cannot be loaded
  const JSON_STORE = path.join(DATA_DIR, 'quizzes.json');
  let memoryData = { quizzes: [], attempts: [] };
  if (fs.existsSync(JSON_STORE)) {
    try {
      memoryData = JSON.parse(fs.readFileSync(JSON_STORE, 'utf-8'));
    } catch (e) {}
  }

  const persist = () => {
    fs.writeFileSync(JSON_STORE, JSON.stringify(memoryData, null, 2), 'utf-8');
  };

  dbInstance = {
    prepare(sql) {
      return {
        all(...params) {
          if (sql.includes('FROM h5p_quizzes')) {
            return memoryData.quizzes;
          }
          if (sql.includes('FROM h5p_attempts')) {
            const qId = params[0];
            return memoryData.attempts.filter(a => a.quiz_id === qId);
          }
          return [];
        },
        get(...params) {
          if (sql.includes('FROM h5p_quizzes WHERE id = ?')) {
            return memoryData.quizzes.find(q => q.id === params[0]) || null;
          }
          if (sql.includes('COUNT(*) as attempt_count')) {
            const qId = params[0];
            const atts = memoryData.attempts.filter(a => a.quiz_id === qId);
            const sum = atts.reduce((acc, a) => acc + (a.percentage || 0), 0);
            return {
              attempt_count: atts.length,
              avg_score: atts.length ? sum / atts.length : null
            };
          }
          return null;
        },
        run(...params) {
          if (sql.includes('INSERT INTO h5p_quizzes')) {
            const [id, type, title, theme, classe, desc, content_json, options_json] = params;
            memoryData.quizzes.unshift({
              id, type, title, theme, classe_cible: classe, description: desc,
              content_json, options_json, created_at: new Date().toISOString()
            });
            persist();
          } else if (sql.includes('UPDATE h5p_quizzes')) {
            const [title, theme, classe, desc, content_json, options_json, id] = params;
            const idx = memoryData.quizzes.findIndex(q => q.id === id);
            if (idx !== -1) {
              memoryData.quizzes[idx] = {
                ...memoryData.quizzes[idx],
                title, theme, classe_cible: classe, description: desc,
                content_json, options_json, updated_at: new Date().toISOString()
              };
              persist();
            }
          } else if (sql.includes('DELETE FROM h5p_quizzes')) {
            const [id] = params;
            memoryData.quizzes = memoryData.quizzes.filter(q => q.id !== id);
            persist();
          } else if (sql.includes('INSERT INTO h5p_attempts')) {
            const [id, quiz_id, student_name, score, max_score, percentage, duration_seconds, answers_json] = params;
            memoryData.attempts.push({
              id, quiz_id, student_name, score, max_score, percentage, duration_seconds, answers_json,
              created_at: new Date().toISOString()
            });
            persist();
          }
          return { changes: 1 };
        }
      };
    }
  };
}

export const db = dbInstance;
