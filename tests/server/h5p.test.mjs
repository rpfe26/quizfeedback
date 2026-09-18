import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuizWizardH5P, extractZipEntries, cleanHtml } from '../../server/h5p-parser.mjs';
import { generateH5PQuestionSetPackage, buildZipBuffer } from '../../server/h5p-exporter.mjs';
import {
  makeH5pBuffer, questionSetMeta, trueFalseContent, multiChoiceContent, quizWizardJson
} from '../fixtures/h5p-fixtures.mjs';

describe('cleanHtml', () => {
  test('nettoie les balises et entités courantes', () => {
    assert.equal(cleanHtml('<p>Bonjour <b>toi</b></p>'), 'Bonjour toi');
    assert.equal(cleanHtml('A&nbsp;B'), 'A B');
    assert.equal(cleanHtml('1 &lt; 2 &amp; 3'), '1 < 2 & 3');
  });

  test('gère les entrées vides ou non textuelles', () => {
    assert.equal(cleanHtml(''), '');
    assert.equal(cleanHtml(undefined), '');
    assert.equal(cleanHtml(null), '');
    assert.equal(cleanHtml(42), '');
  });
});

describe('extractZipEntries', () => {
  test('lit une archive construite par buildZipBuffer', () => {
    const buf = makeH5pBuffer({ meta: questionSetMeta(), contentJson: multiChoiceContent() });
    const entries = extractZipEntries(buf);
    assert.ok(entries['h5p.json']);
    assert.ok(entries['content/content.json']);
    const meta = JSON.parse(entries['h5p.json'].toString('utf-8'));
    assert.equal(meta.title, 'Fixture Quiz');
  });

  test('retourne un objet vide sur un buffer non ZIP', () => {
    const entries = extractZipEntries(Buffer.from('this is not a zip'));
    assert.deepEqual(entries, {});
  });

  test('lit une archive ZIP générée par un outil externe (zipfile)', () => {
    // Fixture réelle produite par python3 zipfile (ZIP_STORED, central directory + EOCD)
    const raw = Buffer.from(
      'UEsDBBQAAAAAAK2rMV2iU+mPDwAAAA8AAAAIAAAAdGVzdC50eHRjb250ZW51IGV4dGVybmVQSwECFAMUAAAAAACtqzFdolPpjw8AAAAPAAAACAAAAAAAAAAAAAAAgAEAAAAAdGVzdC50eHRQSwUGAAAAAAEAAQA2AAAANQAAAAAA',
      'base64'
    );
    const entries = extractZipEntries(raw);
    assert.ok(entries['test.txt']);
    assert.equal(entries['test.txt'].toString('utf-8'), 'contenu externe');
  });
});

describe('parseQuizWizardH5P — rejets explicites', () => {
  test('un JSON syntaxiquement invalide lève une erreur explicite', () => {
    assert.throws(() => parseQuizWizardH5P('{question: "sans guillemets"}'), /JSON est invalide/);
  });

  test('une archive au content.json corrompu lève une erreur', () => {
    const buf = makeH5pBuffer({ meta: questionSetMeta(), contentJson: multiChoiceContent() });
    // Corrompre le JSON stocké (méthode 0 = pas de compression) dans l'entrée content.json
    const idx = buf.indexOf(Buffer.from('content/content.json'));
    const start = idx - 30;
    const fnLen = buf.readUInt16LE(start + 26);
    const dataOffset = start + 30 + fnLen;
    buf.write('{corrompu', dataOffset);
    assert.throws(() => parseQuizWizardH5P(buf, 'broken.h5p'), /content\.json illisible/);
  });

  test('un fichier inconnu renvoie un quiz vide (la route d import le rejettera)', () => {
    // Le parser reste tolérant : il sert aussi au mode création (quiz vide autorisé).
    // Le garde-fou est la validation de la route POST /api/h5p/upload (voir server.test.mjs).
    const parsed = parseQuizWizardH5P(Buffer.from('ceci n est ni du json ni un zip'));
    assert.deepEqual(parsed.content.questions, []);
  });
});

describe('parseQuizWizardH5P — imports valides', () => {
  test('JSON Quiz Wizard direct', () => {
    const parsed = parseQuizWizardH5P(JSON.stringify(quizWizardJson()), 'direct.json');
    assert.equal(parsed.type, 'quiz');
    assert.equal(parsed.title, 'Quiz Wizard Direct');
    assert.equal(parsed.content.questions.length, 1);
    const q = parsed.content.questions[0];
    assert.equal(q.question, '2 + 2 = ?');
    assert.equal(q.answers[0].correct, true);
    assert.equal(q.answers[0].feedback, 'Bravo !');
  });

  test('objet JSON direct (mode création)', () => {
    const parsed = parseQuizWizardH5P({ title: 'Objet', questions: [] });
    assert.equal(parsed.title, 'Objet');
    assert.equal(parsed.type, 'quiz');
  });

  test('archive H5P MultiChoice : nettoyage des entités et feedbacks', () => {
    const parsed = parseQuizWizardH5P(
      makeH5pBuffer({ meta: questionSetMeta(), contentJson: multiChoiceContent() }),
      'mc.h5p'
    );
    assert.equal(parsed.type, 'quiz');
    const q = parsed.content.questions[0];
    assert.equal(q.question, 'Quelle est la capitale du Canada ?');
    assert.equal(q.answers[1].text, 'Ottawa');
    assert.equal(q.answers[1].correct, true);
    assert.equal(q.answers[0].feedback, 'Toronto est la plus grande ville, pas la capitale.');
    assert.equal(q.explanation, 'À revoir.');
  });

  test('archive H5P TrueFalse : type détecté et feedbacks restitués', () => {
    const parsed = parseQuizWizardH5P(
      makeH5pBuffer({ meta: questionSetMeta(), contentJson: trueFalseContent() }),
      'tf.h5p'
    );
    const q = parsed.content.questions[0];
    assert.equal(q.type, 'truefalse');
    assert.equal(q.answers[0].text, 'Vrai');
    assert.equal(q.answers[0].correct, false);
    assert.equal(q.answers[1].correct, true);
    assert.equal(q.answers[1].feedback, 'Bravo !');
    assert.equal(q.answers[0].feedback, 'Non, elle est ronde.');
  });

  test('flashcards DialogCards', () => {
    const parsed = parseQuizWizardH5P({
      title: 'Mes cartes',
      dialogs: [{ text: 'Recto', answer: 'Verso', tip: 'Indice' }]
    });
    assert.equal(parsed.type, 'flashcards');
    assert.equal(parsed.content.cards[0].front, 'Recto');
    assert.equal(parsed.content.cards[0].back, 'Verso');
    assert.equal(parsed.content.cards[0].hint, 'Indice');
  });

  test('options par défaut présentes', () => {
    const parsed = parseQuizWizardH5P(JSON.stringify(quizWizardJson()), 'direct.json');
    assert.equal(parsed.options.passPercentage, 60);
    assert.ok(Array.isArray(parsed.options.scoreTiers));
  });
});

describe('generateH5PQuestionSetPackage', () => {
  test('produit une archive contenant h5p.json et content/content.json', () => {
    const quiz = {
      id: 'x', type: 'quiz', title: 'Export', description: 'Test',
      content: { questions: quizWizardJson().questions.map((q, i) => ({ id: `q_${i + 1}`, type: 'multichoice', ...q })) },
      options: {}
    };
    const entries = extractZipEntries(generateH5PQuestionSetPackage(quiz));
    assert.ok(entries['h5p.json']);
    assert.ok(entries['content/content.json']);
    const meta = JSON.parse(entries['h5p.json'].toString('utf-8'));
    assert.equal(meta.mainLibrary, 'H5P.QuestionSet');
  });

  test('échappe le HTML des questions, réponses et feedbacks (BUG-2)', () => {
    const quiz = {
      id: 'x', type: 'quiz', title: 'T', description: 'd',
      content: { questions: [{
        id: 'q_1', question: 'a < b & c', type: 'multichoice',
        answers: [{ id: 'a1', text: '<script>alert(1)</script>', correct: true, feedback: 'OK & <bien>' }],
        explanation: 'Expl <x>'
      }] },
      options: {}
    };
    const entries = extractZipEntries(generateH5PQuestionSetPackage(quiz));
    const content = JSON.parse(entries['content/content.json'].toString('utf-8'));
    const p = content.questions[0].params;
    assert.equal(p.question, '<p>a &lt; b &amp; c</p>');
    assert.equal(
      p.answers[0].tipsAndFeedback.chosenFeedback,
      '<div>OK &amp; &lt;bien&gt;</div><div class="h5p-notional-reminder" style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px dashed rgba(0,0,0,0.25);"><strong>💡 Rappel notionnel :</strong> Expl &lt;x&gt;</div>'
    );
    assert.equal(p.tipsAndFeedback.overallFeedback, '<div>Expl &lt;x&gt;</div>');
    // Le texte doit rester lisible après un re-parse (échappement réversible)
    const re = parseQuizWizardH5P(generateH5PQuestionSetPackage(quiz), 're.h5p');
    assert.equal(re.content.questions[0].question, 'a < b & c');
    assert.equal(re.content.questions[0].answers[0].text, '<script>alert(1)</script>');
    assert.equal(re.content.questions[0].answers[0].feedback, 'OK & <bien>');
    assert.equal(re.content.questions[0].explanation, 'Expl <x>');
  });

  test('le titre reste lisible sans balises actives', () => {
    const title = 'Mauvais <img src=x onerror=alert(1)> titre';
    const quiz = {
      id: 'x', type: 'quiz', title, description: '',
      content: { questions: [] }, options: {}
    };
    const entries = extractZipEntries(generateH5PQuestionSetPackage(quiz));
    const content = JSON.parse(entries['content/content.json'].toString('utf-8'));
    const meta = JSON.parse(entries['h5p.json'].toString('utf-8'));
    // Le titre est échappé : la balise ne peut pas être interprétée par le lecteur H5P
    assert.ok(!content.introPage.title.includes('<img'));
    assert.equal(content.introPage.title, 'Mauvais &lt;img src=x onerror=alert(1)&gt; titre');
    assert.equal(meta.title, content.introPage.title);
  });

  test('exporte feedbackCorrect / feedbackIncorrect sur les mauvaises réponses (BUG-3)', () => {
    const quiz = {
      id: 'x', type: 'quiz', title: 'T', description: '',
      content: { questions: [{
        id: 'q_1', question: 'Q ?', type: 'multichoice',
        answers: [
          { id: 'a1', text: 'Bonne', correct: true, feedback: '' },
          { id: 'a2', text: 'Mauvaise', correct: false, feedback: '' }
        ],
        feedbackCorrect: 'Bien joué',
        feedbackIncorrect: 'Réessaie'
      }] },
      options: {}
    };
    const entries = extractZipEntries(generateH5PQuestionSetPackage(quiz));
    const content = JSON.parse(entries['content/content.json'].toString('utf-8'));
    const answers = content.questions[0].params.answers;
    assert.equal(answers[0].tipsAndFeedback.chosenFeedback, '');
    assert.equal(answers[0].tipsAndFeedback.notChosenFeedback, '<div>Réessaie</div>');
    assert.equal(answers[1].tipsAndFeedback.notChosenFeedback, '<div>Bien joué</div>');
  });

  test('le feedback individuel prime sur le feedback générique (BUG-3)', () => {
    const quiz = {
      id: 'x', type: 'quiz', title: 'T', description: '',
      content: { questions: [{
        id: 'q_1', question: 'Q ?', type: 'multichoice',
        answers: [{ id: 'a1', text: 'Bonne', correct: true, feedback: 'Précis !' }],
        feedbackCorrect: 'Générique',
        feedbackIncorrect: ''
      }] },
      options: {}
    };
    const entries = extractZipEntries(generateH5PQuestionSetPackage(quiz));
    const content = JSON.parse(entries['content/content.json'].toString('utf-8'));
    const a = content.questions[0].params.answers[0];
    assert.equal(a.tipsAndFeedback.chosenFeedback, '<div>Précis !</div>');
  });

  test('exporte un vrai-ou-faux en H5P.TrueFalse avec la bonne valeur (BUG-4)', () => {
    const quiz = {
      id: 'x', type: 'quiz', title: 'T', description: '',
      content: { questions: [{
        id: 'q_1', question: 'La Terre est plate.', type: 'truefalse',
        answers: [
          { id: 'a1', text: 'Vrai', correct: false },
          { id: 'a2', text: 'Faux', correct: true }
        ],
        feedbackCorrect: 'Bravo !', feedbackIncorrect: 'Non.'
      }] },
      options: {}
    };
    const entries = extractZipEntries(generateH5PQuestionSetPackage(quiz));
    const content = JSON.parse(entries['content/content.json'].toString('utf-8'));
    const q = content.questions[0];
    assert.equal(q.library, 'H5P.TrueFalse 1.6');
    assert.equal(q.params.correct, 'false');
    assert.equal(q.params.feedbackCorrect, 'Bravo !');
    assert.equal(q.params.feedbackWrong, 'Non.');
    const meta = JSON.parse(entries['h5p.json'].toString('utf-8'));
    assert.ok(meta.preloadedDependencies.some(d => d.machineName === 'H5P.TrueFalse'));
  });

  test('TrueFalse : correct=true quand Vrai est coché', () => {
    const quiz = {
      id: 'x', type: 'quiz', title: 'T', description: '',
      content: { questions: [{
        id: 'q_1', question: 'Q ?', type: 'truefalse',
        answers: [{ id: 'a1', text: 'Vrai', correct: true }, { id: 'a2', text: 'Faux', correct: false }]
      }] },
      options: {}
    };
    const entries = extractZipEntries(generateH5PQuestionSetPackage(quiz));
    const content = JSON.parse(entries['content/content.json'].toString('utf-8'));
    assert.equal(content.questions[0].params.correct, 'true');
  });

  test('round-trip complet : export puis ré-import d un quiz multichoice', () => {
    const quiz = {
      id: 'x', type: 'quiz', title: 'Roundtrip Éàç', description: 'Intro',
      content: { questions: [{
        id: 'q_1', question: 'Capitale ? Éàç & <br/>', type: 'multichoice',
        answers: [
          { id: 'a1', text: 'Paris', correct: true, feedback: 'Oui & bravo' },
          { id: 'a2', text: 'Lyon', correct: false, feedback: 'Non' }
        ],
        explanation: 'Explication'
      }] },
      options: { randomizeAnswers: false }
    };
    const re = parseQuizWizardH5P(generateH5PQuestionSetPackage(quiz), 'rt.h5p');
    assert.equal(re.type, 'quiz');
    assert.equal(re.title, 'Roundtrip Éàç');
    const q = re.content.questions[0];
    assert.equal(q.answers[0].text, 'Paris');
    assert.equal(q.answers[0].correct, true);
    assert.equal(q.answers[0].feedback, 'Oui & bravo');
    assert.equal(q.answers[1].feedback, 'Non');
    assert.equal(q.explanation, 'Explication');
  });
});

describe('buildZipBuffer', () => {
  test('écrit des archives PKZIP valides (EOCD, CRC32, tailles)', () => {
    const buf = makeH5pBuffer({ meta: questionSetMeta(), contentJson: multiChoiceContent() });
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    assert.notEqual(eocd, -1);
    assert.equal(buf.readUInt16LE(eocd + 10), 2); // 2 entrées
    assert.ok(buf.readUInt32LE(eocd + 12) > 0);   // taille du central directory

    // CRC32 connu : "123456789" -> 0xCBF43926
    const single = buildZipBuffer([{ path: 'a.txt', content: '123456789' }]);
    const nameIdx = single.indexOf(Buffer.from('a.txt'));
    const crc = single.readUInt32LE(nameIdx - 30 + 14);
    assert.equal(crc, 0xCBF43926);
  });

  test('normalise les chemins (antislash, slash initial)', () => {
    const buf = buildZipBuffer([{ path: '\\sub\\dir\\file.txt', content: 'x' }]);
    // Noms d'entrée dans le central directory (offset 46 après la signature)
    const names = [];
    for (let i = 0; (i = buf.indexOf(Buffer.from('PK\x01\x02'), i)) !== -1; i += 4) {
      const fnLen = buf.readUInt16LE(i + 28);
      names.push(buf.slice(i + 46, i + 46 + fnLen).toString('utf-8'));
    }
    assert.ok(names.includes('sub/dir/file.txt'));
    assert.ok(!names.some(n => n.startsWith('/')));
  });
});