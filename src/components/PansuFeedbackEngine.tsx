import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  Copy, 
  Check, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Lightbulb, 
  BookOpen, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info
} from 'lucide-react';
import { H5PQuiz, H5PQuestion, H5PAnswer } from '../types';

interface PansuFeedbackEngineProps {
  quiz: H5PQuiz;
  onSave: (updatedQuiz: H5PQuiz) => Promise<void> | void;
  onClose?: () => void;
  onNavigateToExport?: () => void;
}

export const PansuFeedbackEngine: React.FC<PansuFeedbackEngineProps> = ({
  quiz,
  onSave,
  onClose,
  onNavigateToExport
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'import' | 'edit'>('prompt');
  const [workingQuiz, setWorkingQuiz] = useState<H5PQuiz>(() => JSON.parse(JSON.stringify(quiz)));
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [aiResponseText, setAiResponseText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(0);

  const questions = workingQuiz.content?.questions || [];

  // Génération dynamique du prompt pédagogique Pascal Pansu
  const generatedPromptText = useMemo(() => {
    const questionsListText = questions.map((q, qIdx) => {
      const answersText = (q.answers || []).map((a, aIdx) => {
        const flag = a.correct ? '[✓ BONNE RÉPONSE]' : '[✗ MAUVAISE RÉPONSE / DISTRACTEUR]';
        return `  - ${flag} (id: "${a.id}") : "${a.text}"`;
      }).join('\n');

      return `### Question ${qIdx + 1} (id: "${q.id}")
Énoncé : "${q.question}"
Type : Question à choix multiple (H5P.MultiChoice)
Propositions :
${answersText}
Explication actuelle : ${q.explanation || 'Aucune'}`;
    }).join('\n\n');

    return `# DIRECTIVES PÉDAGOGIQUES : RÉDACTION DES RÉTROACTIONS SELON LA LOGIQUE DE PASCAL PANSU (ÉVALUATION FORMATIVE)

Vous êtes un expert de référence en sciences de l'éducation et en psychologie cognitive scolaire, spécialisé dans l'évaluation formative et la régulation des comportements d'apprentissage d'après les travaux scientifiques de Pascal Pansu (notamment Georges & Pansu, 2011 ; Pansu & Sarrazin).

Votre mission est de rédiger un feedback pédagogique personnalisé pour CHAQUE mauvaise réponse (distracteur) et pour CHAQUE bonne réponse du quiz ci-dessous.

Ces feedbacks seront directement intégrés dans un package H5P Question Set pour LogiQuiz / Digiquiz (La Digitale) afin de fournir à chaque élève un retour immédiat et étayé dès qu'il clique sur une proposition.

---

## RÈGLES IMPÉRATIVES DE CONCEPTION DES FEEDBACKS (LOGIQUE DE PASCAL PANSU) :

1. FEEDBACK ÉLABORÉ À HAUTE VALEUR INFORMATIVE (Feed-up, Feed-back, Feed-forward) :
   - Proscrire impérativement les verdicts binaires ou sanctions non formatives ("Faux", "Non", "Incorrect", "Perdu", "Mauvais choix").
   - Expliciter clairement POURQUOI ce distracteur est erroné : identifier la méconception sous-jacente, le contresens ou le piège récurrent qui a rendu ce choix tentant.

2. ATTRIBUTION CAUSALE INTERNE ET CONTRÔLABLE (Pansu & Sarrazin) :
   - Préserver l'estime de soi et le sentiment d'efficacité personnelle (SEP) de l'élève.
   - Attribuer la difficulté à des facteurs modifiables et sous le contrôle direct de l'élève : l'attention portée aux indices de l'énoncé, la méthode de calcul, la stratégie de lecture, l'étape de vérification.
   - Bannir tout jugement sur la personne ou sur ses capacités intellectuelles globales.

3. ÉTAYAGE (SCAFFOLDING) ET ACTIONNABILITÉ SANS SURCHARGE COGNITIVE :
   - Fournir un indice ou une relance constructive permettant à l'élève de comprendre la bonne démarche sans donner brutalement la solution.
   - Rester concis : 1 à 2 phrases percutantes par réponse (environ 20 à 35 mots maximum).

4. ADAPTATION SELON LA NATURE DE LA PROPOSITION :
   - Bonne réponse : valoriser le raisonnement exact et justifier succinctement pourquoi c'est la réponse attendue pour consolider l'ancrage mnésique.
   - Distracteur : identifier l'erreur fréquente (confusion de dates, calcul incomplet, faux ami lexical) et donner la clé de distinction.

---

## STRUCTURE DU QUIZ À TRAITER :
Titre du quiz : ${workingQuiz.title}
Thème : ${workingQuiz.theme || 'Général'}
Description / Contexte : ${workingQuiz.description || 'Non spécifié'}
Nombre de questions : ${questions.length}

${questionsListText}

---

## FORMAT DE RÉPONSE STRICT ATTENDU (À FOURNIR DANS UN BLOC \`\`\`json ... \`\`\`) :
Veuillez répondre UNIQUEMENT avec un objet JSON structuré respectant scrupuleusement le schéma ci-dessous :

\`\`\`json
{
  "questions": [
    {
      "questionId": "q_1",
      "feedbackCorrect": "Félicitations ! Tu as bien appliqué la règle... (1 phrase valorisante)",
      "feedbackIncorrect": "Attention aux indices de l'énoncé... (1 phrase d'encouragement méthodologique)",
      "explanation": "Rappel de cours essentiel résumant la notion...",
      "answers": [
        {
          "id": "ans_1_1",
          "text": "Texte exact de l'option 1",
          "feedback": "Feedback personnalisé selon la logique de Pascal Pansu..."
        },
        {
          "id": "ans_1_2",
          "text": "Texte exact de l'option 2",
          "feedback": "Feedback personnalisé explicitant la méconception..."
        }
      ]
    }
  ]
}
\`\`\``;
  }, [workingQuiz, questions]);

  // Copier le prompt
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPromptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  // Traiter la réponse IA
  const handleProcessAiResponse = () => {
    setParseError(null);
    setParseSuccessMessage(null);

    if (!aiResponseText.trim()) {
      setParseError("Veuillez coller la réponse générée par l'IA avant de lancer l'analyse.");
      return;
    }

    try {
      let rawJson = aiResponseText.trim();

      // Extraire le bloc ```json ... ``` ou ``` ... ```
      const jsonMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        rawJson = jsonMatch[1].trim();
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(rawJson);
      } catch (e) {
        // Nettoyage virgules traînantes
        const cleaned = rawJson
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        parsedData = JSON.parse(cleaned);
      }

      const questionsList = Array.isArray(parsedData)
        ? parsedData
        : (parsedData.questions || parsedData.Questions || []);

      if (!Array.isArray(questionsList) || questionsList.length === 0) {
        throw new Error("Aucune liste de questions trouvée dans le JSON retourné par l'IA.");
      }

      const updatedQuiz: H5PQuiz = JSON.parse(JSON.stringify(workingQuiz));
      const currentQuestions = updatedQuiz.content?.questions || [];
      let totalFeedbacksAdded = 0;

      currentQuestions.forEach((origQ, qIdx) => {
        const matchedQ = questionsList.find((aiQ: any, aiIdx: number) => {
          if (aiQ.questionId && (aiQ.questionId === origQ.id || aiQ.questionId === `q_${qIdx + 1}`)) return true;
          if (aiQ.id && (aiQ.id === origQ.id || aiQ.id === `q_${qIdx + 1}`)) return true;
          if (aiIdx === qIdx) return true;
          if (aiQ.question && origQ.question && aiQ.question.toLowerCase().includes(origQ.question.toLowerCase().slice(0, 15))) return true;
          return false;
        });

        if (matchedQ) {
          if (matchedQ.feedbackCorrect) origQ.feedbackCorrect = matchedQ.feedbackCorrect;
          if (matchedQ.feedbackIncorrect) origQ.feedbackIncorrect = matchedQ.feedbackIncorrect;
          if (matchedQ.explanation) origQ.explanation = matchedQ.explanation;

          const aiAnswers = matchedQ.answers || matchedQ.options || [];

          (origQ.answers || []).forEach((origAns, aIdx) => {
            const matchedAns = aiAnswers.find((aiA: any, aiAIdx: number) => {
              if (aiA.id && (aiA.id === origAns.id || aiA.id === `ans_${qIdx + 1}_${aIdx + 1}`)) return true;
              if (aiAIdx === aIdx) return true;
              if (aiA.text && origAns.text && (
                aiA.text.trim().toLowerCase() === origAns.text.trim().toLowerCase() ||
                aiA.text.toLowerCase().includes(origAns.text.toLowerCase().slice(0, 12))
              )) return true;
              return false;
            });

            if (matchedAns && (matchedAns.feedback || matchedAns.feedbackText)) {
              origAns.feedback = matchedAns.feedback || matchedAns.feedbackText;
              totalFeedbacksAdded++;
            }
          });
        }
      });

      setWorkingQuiz(updatedQuiz);
      setParseSuccessMessage(`${totalFeedbacksAdded} rétroaction(s) de régulation Pascal Pansu ont été intégrées avec succès !`);
      setActiveTab('edit');
    } catch (err: any) {
      setParseError(`Erreur d'analyse du JSON : ${err.message}. Assurez-vous d'avoir copié l'intégralité du bloc de code JSON fourni par l'IA.`);
    }
  };

  // Mise à jour manuelle
  const handleUpdateFeedback = (qIdx: number, aIdx: number, val: string) => {
    setWorkingQuiz(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      if (clone.content?.questions?.[qIdx]?.answers?.[aIdx]) {
        clone.content.questions[qIdx].answers[aIdx].feedback = val;
      }
      return clone;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(workingQuiz);
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Compteurs statistiques de couverture
  const stats = useMemo(() => {
    let totalOptions = 0;
    let configuredOptions = 0;
    let distractorsWithFeedback = 0;
    let totalDistractors = 0;

    questions.forEach(q => {
      (q.answers || []).forEach(a => {
        totalOptions++;
        if (!a.correct) totalDistractors++;
        if (a.feedback && a.feedback.trim()) {
          configuredOptions++;
          if (!a.correct) distractorsWithFeedback++;
        }
      });
    });

    const percent = totalOptions > 0 ? Math.round((configuredOptions / totalOptions) * 100) : 0;
    return { totalOptions, configuredOptions, distractorsWithFeedback, totalDistractors, percent };
  }, [questions]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Moteur de Rétroactions Formatives
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/30">
                Logique Pascal Pansu
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-200/80 mt-1 max-w-2xl leading-relaxed">
              Transformez les erreurs en leviers d'apprentissage grâce à l'étayage bienveillant et l'attribution causale contrôlable.
            </p>
          </div>
        </div>

        {/* Jauge de complétion */}
        <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/10 shrink-0 self-start sm:self-center">
          <div className="text-right">
            <div className="text-xs font-bold text-white">Couverture Rétroactions</div>
            <div className="text-[11px] text-purple-200">
              {stats.configuredOptions} / {stats.totalOptions} options ({stats.percent}%)
            </div>
          </div>
          <div className="w-10 h-10 rounded-full border-3 border-purple-400 flex items-center justify-center text-xs font-black text-white">
            {stats.percent}%
          </div>
        </div>
      </div>

      {/* Navigation des Onglets */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'prompt'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Générer le Prompt IA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Coller la Réponse IA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>3. Ajuster &amp; Valider ({stats.configuredOptions}/{stats.totalOptions})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
          </button>

          {onNavigateToExport && (
            <button
              type="button"
              onClick={onNavigateToExport}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <span>Exporter LogiQuiz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu de l'Onglet */}
      <div className="p-5 sm:p-6 flex-1">
        
        {/* TAB 1 : GENERER LE PROMPT */}
        {activeTab === 'prompt' && (
          <div className="space-y-4">
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 flex items-start gap-3">
              <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Comment ça marche ?</strong>
                <p className="mt-0.5 text-purple-800 leading-relaxed">
                  1. Cliquez sur <strong>Copier le prompt</strong> ci-dessous.<br />
                  2. Ouvrez votre IA préférée (ChatGPT, Claude, Gemini, Mistral).<br />
                  3. Collez le prompt et appuyez sur Entrée. L'IA rédigera les rétroactions formatives pour chaque distracteur.<br />
                  4. Revenez ici à l'onglet <strong>2. Coller la Réponse IA</strong>.
                </p>
              </div>
            </div>

            {/* Accès rapide aux IA */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Ouvrir votre IA :</span>
              <a
                href="https://chatgpt.com"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1"
              >
                ChatGPT <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1"
              >
                Claude <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="https://gemini.google.com"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1"
              >
                Gemini <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="https://chat.mistral.ai"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1"
              >
                Mistral Le Chat <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>

            {/* Zone Prompt */}
            <div className="relative">
              <div className="flex items-center justify-between bg-slate-800 text-slate-200 px-4 py-2.5 rounded-t-xl text-xs font-mono">
                <span>prompt_pansu_evaluation_formative.md</span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copié dans le presse-papier !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier tout le Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                readOnly
                value={generatedPromptText}
                rows={14}
                className="w-full p-4 font-mono text-xs bg-slate-900 text-slate-100 rounded-b-xl focus:outline-none leading-relaxed select-all"
              />
            </div>
          </div>
        )}

        {/* TAB 2 : COLLER LA REPONSE IA */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700">
              <strong className="font-bold text-slate-900">Collez ci-dessous le texte ou le bloc JSON retourné par l'IA :</strong>
              <p className="mt-1 text-slate-500 leading-relaxed">
                Le parseur intelligent extrait automatiquement le bloc <code>```json ... ```</code> même s'il y a du texte avant ou après.
              </p>
            </div>

            {parseError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {parseSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{parseSuccessMessage}</span>
              </div>
            )}

            <textarea
              value={aiResponseText}
              onChange={e => setAiResponseText(e.target.value)}
              placeholder="Collez ici la réponse complète fournie par ChatGPT, Claude, Gemini ou Mistral..."
              rows={12}
              className="w-full p-4 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAiResponseText('')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={handleProcessAiResponse}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyser et Injecter les Rétroactions</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3 : AJUSTER & REVOIR */}
        {activeTab === 'edit' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Vérification et Personnalisation Question par Question ({questions.length} questions)
              </h3>
              <div className="text-xs text-slate-500">
                Cliquez sur une question pour déplier ses propositions.
              </div>
            </div>

            <div className="space-y-3">
              {questions.map((q, qIdx) => {
                const isExpanded = expandedQuestionIdx === qIdx;
                const totalAns = (q.answers || []).length;
                const feedbackAns = (q.answers || []).filter(a => Boolean(a.feedback && a.feedback.trim())).length;
                const isComplete = totalAns > 0 && feedbackAns === totalAns;

                return (
                  <div 
                    key={q.id || qIdx}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-all"
                  >
                    {/* Header Question */}
                    <button
                      type="button"
                      onClick={() => setExpandedQuestionIdx(isExpanded ? null : qIdx)}
                      className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">
                            {q.question}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            <span className="text-slate-500">{totalAns} propositions</span>
                            <span>•</span>
                            <span className={isComplete ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                              {feedbackAns}/{totalAns} rétroactions renseignées
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isComplete ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Complet
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            En cours
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {/* Contenu Déplié */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                        
                        {/* Énoncé complet */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Énoncé de la question :
                          </span>
                          <p className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium">
                            {q.question}
                          </p>
                        </div>

                        {/* Réponses et feedbacks */}
                        <div className="space-y-3">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Propositions et Rétroactions de régulation :
                          </span>

                          {(q.answers || []).map((ans, aIdx) => (
                            <div 
                              key={ans.id || aIdx}
                              className={`p-3.5 rounded-xl border transition-all ${
                                ans.correct 
                                  ? 'bg-emerald-50/40 border-emerald-200' 
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                    ans.correct 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {ans.correct ? '✓ Bonne réponse' : '✗ Distracteur (mauvais choix)'}
                                  </span>
                                  <span className="font-bold text-slate-800">{ans.text}</span>
                                </div>

                                {ans.feedback ? (
                                  <span className="text-[10px] font-bold text-purple-700 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-purple-500" /> Pansu actif
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-amber-600">
                                    Sans rétroaction
                                  </span>
                                )}
                              </div>

                              <div className="mt-2">
                                <label className="block text-[11px] text-slate-500 mb-1">
                                  {ans.correct 
                                    ? "Rétroaction de consolidation / feed-forward :" 
                                    : "Rétroaction de régulation Pascal Pansu (étayage bienveillant sur l'erreur) :"}
                                </label>
                                <textarea
                                  value={ans.feedback || ''}
                                  onChange={e => handleUpdateFeedback(qIdx, aIdx, e.target.value)}
                                  rows={2}
                                  placeholder={ans.correct 
                                    ? "Ex: Bravo ! Tu as parfaitement repéré..." 
                                    : "Ex: Attention à ne pas confondre... Prends le temps de vérifier..."}
                                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Explication générale facultative */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Rappel de cours général / Synthèse :
                          </label>
                          <input
                            type="text"
                            value={q.explanation || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setWorkingQuiz(prev => {
                                const clone = JSON.parse(JSON.stringify(prev));
                                if (clone.content?.questions?.[qIdx]) {
                                  clone.content.questions[qIdx].explanation = val;
                                }
                                return clone;
                              });
                            }}
                            placeholder="Optionnel : résumé notionnel de la question..."
                            className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pied de page action */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer toutes les Rétroactions'}</span>
              </button>

              {onNavigateToExport && (
                <button
                  type="button"
                  onClick={onNavigateToExport}
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Passer à l'Export LogiQuiz (.h5p)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
