import React, { useState } from 'react';
import { 
  Sparkles, 
  ExternalLink, 
  FileUp, 
  Download, 
  CheckCircle2, 
  ArrowRight, 
  HelpCircle, 
  Lightbulb, 
  Play,
  FileCode
} from 'lucide-react';
import { H5PQuiz } from '../types';

interface QuizWizardHelperProps {
  onLoadSample: (sampleQuiz: Partial<H5PQuiz>) => void;
  onImportJson: (jsonStr: string) => void;
  onClose?: () => void;
}

const SAMPLE_QUIZ: Partial<H5PQuiz> = {
  type: 'quiz',
  title: 'La Révolution française et l’Empire (Exemple Quiz Wizard)',
  theme: 'Histoire-Géographie',
  description: 'Quiz généré avec Quiz Wizard pour tester l’intégration des rétroactions formatives de Pascal Pansu.',
  content: {
    questions: [
      {
        id: 'q_1',
        question: 'En quelle année a eu lieu la prise de la Bastille, événement emblématique de la Révolution française ?',
        type: 'multichoice',
        answers: [
          {
            id: 'ans_1_1',
            text: '1789',
            correct: true,
            feedback: "Excellente réponse ! Le 14 juillet 1789 marque l'insurrection populaire et la rupture définitive avec l'Ancien Régime."
          },
          {
            id: 'ans_1_2',
            text: '1792',
            correct: false,
            feedback: "Attention à la chronologie ! 1792 correspond à la proclamation de la Ire République après la chute de la monarchie, soit 3 ans après la Bastille."
          },
          {
            id: 'ans_1_3',
            text: '1799',
            correct: false,
            feedback: "Confusion fréquente : 1799 marque la fin de la Révolution avec le coup d'État du 18 Brumaire de Napoléon Bonaparte."
          },
          {
            id: 'ans_1_4',
            text: '1804',
            correct: false,
            feedback: "Erreur d'époque : 1804 est l'année du sacre de Napoléon Ier et de l'avènement du Premier Empire."
          }
        ],
        explanation: "La prise de la Bastille a eu lieu le 14 juillet 1789 à Paris."
      },
      {
        id: 'q_2',
        question: 'Quel texte fondamental, adopté le 26 août 1789, affirme l’égalité des droits des citoyens ?',
        type: 'multichoice',
        answers: [
          {
            id: 'ans_2_1',
            text: 'La Déclaration des droits de l’homme et du citoyen',
            correct: true,
            feedback: "Bravo ! Inspirée des Lumières, elle proclame que 'les hommes naissent et demeurent libres et égaux en droits'."
          },
          {
            id: 'ans_2_2',
            text: 'Le Code civil des Français',
            correct: false,
            feedback: "Vérifie l'initiateur : le Code civil a été promulgué en 1804 sous Napoléon Bonaparte pour unifier le droit français."
          },
          {
            id: 'ans_2_3',
            text: 'La Constitution de l’an VIII',
            correct: false,
            feedback: "Ce texte a instauré le Consulat en 1799, bien après la phase constituante de l'été 1789."
          },
          {
            id: 'ans_2_4',
            text: 'L’Édit de Nantes',
            correct: false,
            feedback: "Attention à l'anachronisme : l'Édit de Nantes a été signé par Henri IV en 1598 concernant les guerres de religion !"
          }
        ],
        explanation: "La Déclaration des droits de l'homme et du citoyen a été votée par l'Assemblée nationale constituante le 26 août 1789."
      },
      {
        id: 'q_3',
        question: 'Quel scientifique français, considéré comme le père de la chimie moderne, a été guillotiné sous la Terreur en 1794 ?',
        type: 'multichoice',
        answers: [
          {
            id: 'ans_3_1',
            text: 'Antoine Lavoisier',
            correct: true,
            feedback: "Exact ! Auteur de la célèbre maxime 'Rien ne se perd, rien ne se crée, tout se transforme', il était aussi fermier général."
          },
          {
            id: 'ans_3_2',
            text: 'Louis Pasteur',
            correct: false,
            feedback: "Attention aux siècles ! Pasteur a vécu au XIXe siècle (découverte du vaccin contre la rage en 1885)."
          },
          {
            id: 'ans_3_3',
            text: 'René Descartes',
            correct: false,
            feedback: "Pense au courant philosophique : Descartes est un savant et philosophe du XVIIe siècle (mort en 1650)."
          }
        ],
        explanation: "Antoine de Lavoisier est exécuté le 8 mai 1794 à Paris sur la place de la Révolution."
      }
    ]
  },
  options: {
    correctionMode: 'immediate',
    randomizeQuestions: true,
    randomizeAnswers: true,
    passPercentage: 60
  }
};

export const QuizWizardHelper: React.FC<QuizWizardHelperProps> = ({
  onLoadSample,
  onImportJson,
  onClose
}) => {
  const [jsonText, setJsonText] = useState('');
  const [showJsonPaste, setShowJsonPaste] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handlePasteSubmit = () => {
    setJsonError(null);
    if (!jsonText.trim()) {
      setJsonError('Veuillez coller le JSON avant de valider.');
      return;
    }
    try {
      onImportJson(jsonText);
      setJsonText('');
      setShowJsonPaste(false);
    } catch (e: any) {
      setJsonError('Format JSON invalide : ' + e.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Entête du guide */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">
              Démarche : De Quiz Wizard à LogiQuiz
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-2xl leading-relaxed">
              Créez rapidement votre base de questions sur Quiz Wizard, enrichissez-la avec les rétroactions formatives de Pascal Pansu, puis publiez sur LogiQuiz / Digiquiz (La Digitale).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <a
            href="https://app.getquizwizard.com/create-content/source"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-amber-900 font-bold text-xs hover:bg-amber-50 transition-all shadow-md active:scale-95"
          >
            <span>Ouvrir Quiz Wizard</span>
            <ExternalLink className="w-4 h-4 text-amber-600" />
          </a>
        </div>
      </div>

      {/* 4 étapes visuelles */}
      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/50">
        
        {/* Étape 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">1</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Génération IA</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800 mb-1">Créer sur Quiz Wizard</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Collez votre cours ou un document dans Quiz Wizard pour générer automatiquement 5 à 15 questions à choix multiples.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <a 
              href="https://app.getquizwizard.com" 
              target="_blank" 
              rel="noreferrer" 
              className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
            >
              Quiz Wizard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Étape 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-black flex items-center justify-center">2</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Export H5P</span>
            </div>
            <h3 className="text-xs font-bold text-slate-800 mb-1">Télécharger le .H5P</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dans Quiz Wizard, cliquez sur <strong>Exporter</strong> puis choisissez <strong>Format H5P</strong>. Vous obtenez un fichier <code>.h5p</code>.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Fichier natif standard</span>
          </div>
        </div>

        {/* Étape 3 */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center">3</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Régulation Formative</span>
            </div>
            <h3 className="text-xs font-bold text-purple-900 mb-1">Rétroactions Pascal Pansu</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Importez le quiz ici. Générez le prompt IA structuré selon Pascal Pansu : chaque mauvaise réponse reçoit un étayage bienveillant expliquant l'erreur.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-100 text-[11px] text-purple-700 font-bold flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-purple-600" />
            <span>Sans verdict punitif binaire</span>
          </div>
        </div>

        {/* Étape 4 */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center">4</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">La Digitale</span>
            </div>
            <h3 className="text-xs font-bold text-emerald-900 mb-1">Export vers LogiQuiz</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Téléchargez le package <code>.h5p</code> final et ouvrez-le dans <strong>LogiQuiz</strong> (hors ligne) ou publiez-le sur <strong>Digiquiz</strong> en ligne.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-100 text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Prêt pour vos élèves</span>
          </div>
        </div>

      </div>

      {/* Barre d'action rapide (Tester avec un exemple / Coller JSON) */}
      <div className="px-5 py-3.5 bg-slate-100/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Pas encore de compte Quiz Wizard ? Vous pouvez charger notre quiz d'exemple immédiatement :</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLoadSample(SAMPLE_QUIZ)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Charger l'Exemple Révolution Française</span>
          </button>

          <button
            type="button"
            onClick={() => setShowJsonPaste(!showJsonPaste)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            <span>{showJsonPaste ? 'Masquer le collage JSON' : 'Coller du JSON'}</span>
          </button>
        </div>
      </div>

      {/* Zone de collage JSON si activée */}
      {showJsonPaste && (
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Coller le contenu JSON exporté ou copié depuis Quiz Wizard :
          </label>
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder='{ "title": "Mon Quiz", "questions": [ ... ] }'
            rows={5}
            className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50"
          />
          {jsonError && (
            <p className="text-xs font-bold text-red-600">{jsonError}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowJsonPaste(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handlePasteSubmit}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              Importer ce JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
