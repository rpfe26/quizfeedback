import { buildZipBuffer } from '../../server/h5p-exporter.mjs';

/**
 * Construit une archive .h5p réelle (buffer ZIP) à partir d'une définition compacte.
 * Sert de fixture pour tester le parseur sur un vrai conteneur PKZIP.
 */
export function makeH5pBuffer({ meta, contentJson }) {
  return buildZipBuffer([
    { path: 'h5p.json', content: JSON.stringify(meta) },
    { path: 'content/content.json', content: JSON.stringify(contentJson) }
  ]);
}

/** Métadonnées H5P minimales pour un QuestionSet */
export function questionSetMeta() {
  return {
    title: 'Fixture Quiz',
    language: 'fr',
    mainLibrary: 'H5P.QuestionSet',
    embedTypes: ['iframe'],
    license: 'CC BY-SA',
    preloadedDependencies: [
      { machineName: 'H5P.QuestionSet', majorVersion: 1, minorVersion: 20 },
      { machineName: 'H5P.MultiChoice', majorVersion: 1, minorVersion: 16 },
      { machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }
    ]
  };
}

/** Un vrai-ou-faux H5P.TrueFalse (structure params réelle de la lib) */
export function trueFalseContent() {
  return {
    passPercentage: 60,
    questions: [
      {
        library: 'H5P.TrueFalse 1.6',
        params: {
          question: '<p>La Terre est plate.</p>',
          correct: 'false',
          behaviour: { enableRetry: true },
          feedbackCorrect: '<p>Bravo !</p>',
          feedbackWrong: '<p>Non, elle est ronde.</p>'
        }
      }
    ]
  };
}

/** Un QCM H5P.MultiChoice avec feedbacks par réponse */
export function multiChoiceContent() {
  return {
    passPercentage: 60,
    questions: [
      {
        library: 'H5P.MultiChoice 1.16',
        params: {
          question: '<p>Quelle est la capitale du Canada&nbsp;?</p>',
          answers: [
            { text: 'Toronto', correct: false, tipsAndFeedback: { chosenFeedback: '<p>Toronto est la plus grande ville, pas la capitale.</p>' } },
            { text: 'Ottawa', correct: true, tipsAndFeedback: { chosenFeedback: '<p>Exact !</p>' } }
          ],
          tipsAndFeedback: { overallFeedback: '<p>À revoir.</p>' }
        }
      }
    ]
  };
}

/** JSON Quiz Wizard direct (sans conteneur ZIP) */
export function quizWizardJson() {
  return {
    title: 'Quiz Wizard Direct',
    questions: [
      {
        question: '2 + 2 = ?',
        answers: [
          { text: '4', correct: true, feedback: 'Bravo !' },
          { text: '5', correct: false, feedback: 'Presque…' }
        ]
      }
    ]
  };
}