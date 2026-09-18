import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Brain, 
  Copy, 
  Check, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Play
} from 'lucide-react';
import { H5PQuiz, H5PQuestion, H5PAnswer } from '../types';
import { AiAgentPicker } from './AiAgentPicker';
import styles from './PansuFeedbackEngine.module.css';
const moduleStyles = styles;

interface PansuFeedbackEngineProps {
  quiz: H5PQuiz;
  onSave: (updatedQuiz: H5PQuiz) => Promise<void> | void;
  onClose?: () => void;
  onNavigateToExport?: () => void;
  onNavigateToPlay?: () => void;
  initialTab?: 'prompt' | 'import' | 'edit';
}


// Bloc d'une question en accordéon, mémoïsé pour éviter de re-rendre toutes les questions à chaque frappe.
const QuestionAccordionItem = React.memo<{
  q: H5PQuestion;
  qIdx: number;
  isExpanded: boolean;
  onToggle: (qIdx: number) => void;
  onUpdateFeedback: (qIdx: number, aIdx: number, val: string) => void;
  onUpdateExplanation: (qIdx: number, val: string) => void;
}>(({ q, qIdx, isExpanded, onToggle, onUpdateFeedback, onUpdateExplanation }) => {
  const totalAns = (q.answers || []).length;
  const feedbackAns = (q.answers || []).filter(a => Boolean(a.feedback && a.feedback.trim())).length;
  const isComplete = totalAns > 0 && feedbackAns === totalAns;
  const styles = moduleStyles;

  return (
  <div
    className={styles.accordionItem}
  >
    {/* Header Question */}
    <button
      type="button"
      onClick={() => onToggle(qIdx)}
      aria-expanded={isExpanded}
      className={styles.accordionHeader}
    >
      <div className={styles.accordionHeaderLeft}>
        <span className={styles.questionIndexBadge}>
          {qIdx + 1}
        </span>
        <div>
          <p className={styles.questionHeaderTitle}>
            {q.question}
          </p>
          <div className={styles.questionMeta}>
            <span style={{ color: 'var(--color-text-muted)' }}>{totalAns} propositions</span>
            <span>•</span>
            <span style={{ color: isComplete ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 700 }}>
              {feedbackAns}/{totalAns} rétroactions renseignées
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {isComplete ? (
          <span className={styles.badgeComplete}>
            <Check style={{ width: 12, height: 12 }} /> Complet
          </span>
        ) : (
          <span className={styles.badgeIncomplete}>
            En cours
          </span>
        )}
        {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--color-text-light)' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'var(--color-text-light)' }} />}
      </div>
    </button>

    {/* Contenu Déplié */}
    {isExpanded && (
      <div className={styles.accordionBody}>

        {/* Énoncé complet */}
        <div>
          <span className={styles.sectionLabel}>
            Énoncé de la question :
          </span>
          <p className={styles.statementText}>
            {q.question}
          </p>
        </div>

        {/* Réponses et feedbacks */}
        <div className={styles.answersList}>
          <span className={styles.sectionLabel}>
            Propositions et Rétroactions de régulation :
          </span>

          {(q.answers || []).map((ans, aIdx) => (
            <div 
              key={ans.id || aIdx}
              className={`${styles.answerCard} ${ans.correct ? styles.answerCardCorrect : ''}`}
            >
              <div className={styles.answerCardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={ans.correct ? styles.answerTagCorrect : styles.answerTagWrong}>
                    {ans.correct ? '✓ Bonne réponse' : '✗ Distracteur (mauvais choix)'}
                  </span>
                  <span className={styles.answerText}>{ans.text}</span>
                </div>

                {ans.feedback ? (
                  <span className={styles.feedbackTagActive}>
                    <Sparkles style={{ width: 12, height: 12, color: 'var(--color-primary)' }} /> Pansu actif
                  </span>
                ) : (
                  <span className={styles.feedbackTagMissing}>
                    Sans rétroaction
                  </span>
                )}
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <label className={styles.feedbackLabel}>
                  {ans.correct 
                    ? "Rétroaction de consolidation / feed-forward :" 
                    : "Rétroaction de régulation Pascal Pansu (étayage bienveillant sur l'erreur) :"}
                </label>
                <textarea
                  value={ans.feedback || ''}
                  onChange={e => onUpdateFeedback(qIdx, aIdx, e.target.value)}
                  rows={2}
                  placeholder={ans.correct 
                    ? "Ex: Bravo ! Tu as parfaitement repéré..." 
                    : "Ex: Attention à ne pas confondre... Prends le temps de vérifier..."}
                  className={styles.feedbackTextarea}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Explication générale facultative */}
        <div>
          <label className={styles.sectionLabel}>
            Rappel de cours général / Synthèse :
          </label>
          <input
            type="text"
            value={q.explanation || ''}
            onChange={e => onUpdateExplanation(qIdx, e.target.value)}
            placeholder="Optionnel : résumé notionnel de la question..."
            className={styles.explanationInput}
          />
        </div>

      </div>
    )}
  </div>
  );
});

export const PansuFeedbackEngine: React.FC<PansuFeedbackEngineProps> = ({
  quiz,
  onSave,
  onClose,
  onNavigateToExport,
  onNavigateToPlay,
  initialTab
}) => {
  useEffect(() => {
    if (initialTab === 'edit') {
      const el = document.getElementById('questions-review-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialTab]);

  const hasExistingFeedbacks = useMemo(() => {
    return (quiz.content?.questions || []).some(q =>
      (q.answers || []).some(a => a.feedback && a.feedback.trim().length > 0)
    );
  }, [quiz]);

  const [isAiSectionOpen, setIsAiSectionOpen] = useState(() => {
    if (initialTab === 'prompt') return true;
    if (initialTab === 'edit') return false;
    return !hasExistingFeedbacks;
  });

  const [workingQuiz, setWorkingQuiz] = useState<H5PQuiz>(() => JSON.parse(JSON.stringify(quiz)));

  useEffect(() => {
    setWorkingQuiz(JSON.parse(JSON.stringify(quiz)));
    const hasFb = (quiz.content?.questions || []).some(q =>
      (q.answers || []).some(a => a.feedback && a.feedback.trim().length > 0)
    );
    if (initialTab === 'prompt') {
      setIsAiSectionOpen(true);
    } else if (hasFb) {
      setIsAiSectionOpen(false);
    }
  }, [quiz.id, initialTab]);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [aiResponseText, setAiResponseText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(0);

  const questions = workingQuiz.content?.questions || [];

  // Génération dynamique du prompt pédagogique Pascal Pansu
  const generatedPromptText = useMemo(() => {
    const niveauClasse = workingQuiz.niveau_classe && workingQuiz.niveau_classe !== 'Toutes'
      ? workingQuiz.niveau_classe
      : null;
    const sourceContenu = workingQuiz.source_contenu?.trim() || null;

    // Adaptation du registre linguistique selon le niveau
    const niveauSection = niveauClasse ? `\n**Public cible : ${niveauClasse}**
Adaptez impérativement le vocabulaire, la syntaxe et la longueur des phrases au niveau cognitif et langagier d'un·e élève de ${niveauClasse}.` : '';

    const niveauDetails = (() => {
      if (!niveauClasse) return '- Utilisez un registre soutenu, précis et bienveillant adapté à un public scolaire général.';
      const n = niveauClasse.toLowerCase();
      if (n.includes('cp') || n.includes('ce1') || n.includes('ce2') || n.includes('ps') || n.includes('ms') || n.includes('gs') || n.includes('tps')) {
        return '- Utilisez des phrases très courtes (5 à 8 mots), un vocabulaire ultra-simple, concret et imagé.\n- Pas de termes abstraits. Préférez des analogies du quotidien de l\'enfant.\n- Ton chaleureux et encourageant, comme une approbation orale d\'un adulte bienveillant.\n- Tutoyez l\'élève.';
      }
      if (n.includes('cm1') || n.includes('cm2')) {
        return '- Phrases courtes à moyennes (8 à 12 mots). Vocabulaire courant, légèrement enrichi.\n- Expliquez le pourquoi de l\'erreur de façon concrète, en liant à un exemple de la vie réelle.\n- Tutoyez l\'élève.';
      }
      if (['6ème', '5ème', '4ème', '3ème'].some(l => n.includes(l.toLowerCase()))) {
        return '- Phrases de longueur moyenne (10 à 15 mots). Vocabulaire disciplinaire introduit progressivement.\n- Expliquez la méconception avec clarté, sans jargon excessif.\n- Tutoyez l\'élève (registre collégial).';
      }
      if (['2nde', '1ère', 'terminale'].some(l => n.includes(l.toLowerCase()))) {
        return '- Phrases précises, structurées (12 à 20 mots). Vocabulaire disciplinaire pleinement utilisé.\n- Donnez la clé de raisonnement manquante plutôt que la solution brute.\n- Vouvoyez ou utilisez l\'infinitif (registre lycée).';
      }
      if (['bts', 'but', 'licence', 'master', 'bac pro', 'cap'].some(l => n.includes(l.toLowerCase()))) {
        return '- Registre professionnel ou académique. Précision conceptuelle attendue.\n- Référencez si possible la notion ou la compétence exacte mobilisée.\n- Vouvoyez ou utilisez l\'infinitif. Style synthétique.';
      }
      return '- Utilisez un registre adapté au niveau scolaire indiqué, bienveillant et précis.';
    })();

    // Section Source (Feedback+)
    const sourceSection = sourceContenu ? `\n---\n\n## 📚 SOURCE DE RÉFÉRENCE (Feedback+)\n\nLe quiz a été créé à partir de la ressource suivante :\n\n> **${sourceContenu}**\n\nVeuillez vous appuyer sur le contenu et les notions clés de cette source pour rédiger des feedbacks précis et ancrés dans le document de référence plutôt que dans des généralités disciplinaires. Chaque feedback de distracteur doit idéalement renvoyer à la logique de la source.` : '';

    const questionsListText = questions.map((q, qIdx) => {
      const answersText = (q.answers || []).map((a, aIdx) => {
        const flag = a.correct ? '[✓ BONNE RÉPONSE]' : '[✗ DISTRACTEUR]';
        return `  - ${flag} (id: "${a.id}") : "${a.text}"`;
      }).join('\n');

      return `### Question ${qIdx + 1} (id: "${q.id}")
Énoncé : "${q.question}"
Type : Question à choix multiple (H5P.MultiChoice)
Propositions :
${answersText}
Explication actuelle : ${q.explanation || 'Aucune'}`;
    }).join('\n\n');

    return `# MISSION : RÉDACTION DES RÉTROACTIONS FORMATIVES (LOGIQUE PASCAL PANSU)

Vous êtes un expert en sciences de l'éducation, spécialisé dans l'évaluation formative et la régulation de l'apprentissage d'après les travaux de **Pascal Pansu** (Pansu & Sarrazin, 2007 ; Georges & Pansu, 2011).

Votre mission est de rédiger un **feedback pédagogique de haute valeur formative** pour chaque proposition du quiz ci-dessous — bonne réponse comme distracteur.

Ces feedbacks seront intégrés directement dans un package H5P pour DigiQuiz / LogiQuiz, et s'afficheront à l'élève **au moment où il clique sur sa réponse**.${niveauSection}
${sourceSection}

---

## CADRE PÉDAGOGIQUE : LES 3 NIVEAUX DE FEEDBACK (HATTIE & TIMPERLEY, 2007 — appliqués par Pansu)

Chaque feedback doit répondre, même implicitement, à ces trois questions :

| Niveau | Question | Objectif |
|--------|----------|----------|
| **Feed-up** | Quel est l'objectif visé ? | Rappeler la cible d'apprentissage |
| **Feed-back** | Où en est l'élève ? | Identifier précisément l'erreur ou la réussite |
| **Feed-forward** | Comment progresser ? | Donner une piste d'action concrète et contrôlable |

---

## RÈGLES IMPÉRATIVES (LOGIQUE PANSU)

### 1. Proscription totale du verdict binaire
- ❌ JAMAIS : "Faux", "Incorrect", "Mauvaise réponse", "Non", "Perdu", "Erreur".
- ✅ À LA PLACE : Nommez l'erreur (quelle méconception ?), expliquez pourquoi ce choix est tentant, orientez vers le bon raisonnement.

### 2. Attribution causale interne et contrôlable (Weiner / Pansu)
- L'erreur s'explique par des facteurs **modifiables** : une stratégie de lecture, une confusion de concepts, une étape de vérification oubliée. JAMAIS par un manque d'intelligence ou de capacité.
- Formulations recommandées : *"Il est facile de confondre..."*, *"L'énoncé attire l'attention sur..."*, *"En relisant attentivement..."*, *"La clé est de distinguer..."*.

### 3. Préservation du sentiment d'efficacité personnelle (SEP)
- Reformuler l'erreur comme une étape normale du processus d'apprentissage, pas comme un échec.
- Valoriser la démarche tentée, même incorrecte, avant de pointer la méconception.

### 4. Étayage (scaffolding) — Actionnable et sans surcharge cognitive
- Fournir un **indice de relance** permettant à l'élève de progresser par lui-même, sans donner brutalement la solution.
- **Longueur cible : 20 à 40 mots** par feedback (1 à 2 phrases percutantes).

### 5. Adaptation du registre linguistique
${niveauDetails}

### 6. Feedback pour la bonne réponse (consolidation)
- Féliciter le raisonnement **exact** (pas juste le résultat).
- Expliquer succinctement **pourquoi** c'est la réponse attendue pour consolider l'ancrage mémoriel.
- Ajouter un élément de **feed-forward** : une nuance, un approfondissement, un lien avec la suite du cours.

---

## EXEMPLES DE FORMULATIONS PANSU (à adapter)

**Distracteur (mauvaise réponse) :**
> *"Il est courant de confondre [concept A] et [concept B] car ils partagent [point commun]. La différence décisive est [clé de distinction]. En relisant la définition de [concept A], tu retrouveras la bonne piste."*

**Bonne réponse :**
> *"C'est bien ça ! Tu as repéré que [élément clé] est déterminant ici. Ce raisonnement s'applique aussi chaque fois que [généralisation utile]."*

---

## STRUCTURE DU QUIZ À TRAITER

**Titre :** ${workingQuiz.title}
**Thème :** ${workingQuiz.theme || 'Général'}
**Niveau :** ${niveauClasse || 'Non spécifié'}
**Description / Contexte :** ${workingQuiz.description || 'Non spécifié'}
**Nombre de questions :** ${questions.length}

${questionsListText}

---

## FORMAT DE RÉPONSE STRICT (bloc JSON uniquement)

Répondez UNIQUEMENT avec le bloc JSON suivant, sans texte avant ni après :

\`\`\`json
{
  "questions": [
    {
      "questionId": "q_1",
      "feedbackCorrect": "Félicitations ! Tu as bien identifié que... (1 à 2 phrases valorisant le raisonnement exact)",
      "feedbackIncorrect": "Attention, il est facile de... (1 phrase d'orientation méthodologique)",
      "explanation": "Rappel de cours synthétique sur la notion clé...",
      "answers": [
        {
          "id": "ans_1_1",
          "text": "Texte exact de la proposition 1",
          "feedback": "Feedback personnalisé Pansu — 20 à 40 mots — adapté au niveau ${niveauClasse || 'scolaire'}"
        },
        {
          "id": "ans_1_2",
          "text": "Texte exact de la proposition 2",
          "feedback": "Feedback explicite sur la méconception — attribution causale interne — étayage bienveillant"
        }
      ]
    }
  ]
}
\`\`\``;
  }, [workingQuiz, questions]);

  // Copier le prompt (API Clipboard + repli textarea pour HTTP hors localhost)
  const handleCopyPrompt = async () => {
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = generatedPromptText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedPromptText);
      } else {
        fallbackCopy();
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      try {
        fallbackCopy();
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2500);
      } catch {
        setCopiedPrompt(false);
      }
    }
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
      onSave(updatedQuiz);
      setParseSuccessMessage(`${totalFeedbacksAdded} rétroaction(s) de régulation Pascal Pansu ont été intégrées avec succès !`);
      setParseError(null);
      setAiResponseText('');
      setIsAiSectionOpen(false);
      setTimeout(() => {
        const el = document.getElementById('questions-review-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setParseError(`Erreur d'analyse du JSON : ${err.message}. Assurez-vous d'avoir copié l'intégralité du bloc de code JSON fourni par l'IA.`);
    }
  };

  // Mise à jour manuelle
  const handleUpdateFeedback = useCallback((qIdx: number, aIdx: number, val: string) => {
    setWorkingQuiz(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      if (clone.content?.questions?.[qIdx]?.answers?.[aIdx]) {
        clone.content.questions[qIdx].answers[aIdx].feedback = val;
      }
      return clone;
    });
  }, []);

  const handleToggleQuestion = useCallback((qIdx: number) => {
    setExpandedQuestionIdx(prev => (prev === qIdx ? null : qIdx));
  }, []);

  const handleUpdateExplanation = useCallback((qIdx: number, val: string) => {
    setWorkingQuiz(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      if (clone.content?.questions?.[qIdx]) {
        clone.content.questions[qIdx].explanation = val;
      }
      return clone;
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(workingQuiz);
    } catch (err: any) {
      setSaveError("Erreur lors de l'enregistrement : " + err.message);
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
    <div className={styles.engineCard}>
      
      {/* Header Calm & Accessible */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconWrap}>
            <Brain style={{ width: 24, height: 24, color: '#60a5fa' }} />
          </div>
          <div>
            <div className={styles.headerTitleRow}>
              <h2 className={styles.headerTitle}>
                Moteur de Rétroactions Formatives
              </h2>
              <span className={styles.headerTag}>
                Logique Pascal Pansu
              </span>
            </div>
            <p className={styles.headerDesc}>
              Transformez les erreurs en leviers d'apprentissage grâce à l'étayage bienveillant et l'attribution causale contrôlable.
            </p>
          </div>
        </div>

        {/* Jauge de complétion et Enregistrement */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className={styles.statsGauge}>
            <div className={styles.statsText}>
              <div className={styles.statsLabel}>Couverture Rétroactions</div>
              <div className={styles.statsDetail}>
                {stats.configuredOptions} / {stats.totalOptions} options ({stats.percent}%)
              </div>
            </div>
            <div className={styles.statsCircle}>
              {stats.percent}%
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={styles.btnSave}
              style={{ opacity: isSaving ? 0.5 : 1 }}
            >
              <Save style={{ width: 14, height: 14 }} aria-hidden="true" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
            {saveError && (
              <span role="alert" style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 600 }}>
                {saveError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Corps du Moteur */}
      <div className={styles.engineBody}>
        
        {/* Étapes 2 & 3 : Zone Génération & Injection IA (repliable) */}
        {!isAiSectionOpen ? (
          <div className={styles.aiSectionCollapsedBar}>
            <div className={styles.collapsedBarLeft}>
              <div className={styles.collapsedBadge}>
                {stats.configuredOptions > 0 ? (
                  <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--color-success)' }} />
                ) : (
                  <Sparkles style={{ width: 16, height: 16, color: '#f59e0b' }} />
                )}
              </div>
              <div>
                <div className={styles.collapsedTitle}>
                  {stats.configuredOptions > 0 
                    ? `Rétroactions IA intégrées (${stats.configuredOptions}/${stats.totalOptions} options configurées)` 
                    : 'Étapes 2 & 3 : Prompt et Réponse IA'}
                </div>
                <div className={styles.collapsedSub}>
                  {stats.configuredOptions > 0 
                    ? 'La réponse IA a été intégrée. La zone de saisie est masquée pour faciliter la vérification ci-dessous.' 
                    : 'Copiez le prompt et collez la réponse fournie par votre IA.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAiSectionOpen(true)}
              className={styles.btnToggleAiSection}
              title="Ouvrir le prompt et la zone de saisie IA"
            >
              <ChevronDown style={{ width: 15, height: 15 }} />
              <span>Afficher le Prompt &amp; la zone IA</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className={styles.aiSectionOpenHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles style={{ width: 15, height: 15, color: '#f59e0b' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-apps-darkblue)' }}>
                  Étapes 2 &amp; 3 : Copier le prompt et coller la réponse IA
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAiSectionOpen(false)}
                className={styles.btnToggleAiSection}
                title="Masquer le prompt et la zone de réponse IA"
              >
                <ChevronUp style={{ width: 15, height: 15 }} />
                <span>Masquer cette zone</span>
              </button>
            </div>

            <AiAgentPicker />

            {/* Grille : 1. Prompt IA & 2. Réponse IA */}
            <div className={styles.promptAndResponseGrid}>
              
              {/* Bloc 1 : Copier le Prompt (Gauche) */}
              <div className={styles.promptCard}>
                <div className={styles.sectionCardHeader}>
                  <div className={styles.sectionCardTitle}>
                    <Sparkles style={{ width: 15, height: 15, color: '#f59e0b' }} />
                    <span>1. Prompt IA (à copier)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={styles.btnCopyPrompt}
                  >
                    {copiedPrompt ? (
                      <>
                        <Check style={{ width: 14, height: 14 }} />
                        <span>Copié dans le presse-papier !</span>
                      </>
                    ) : (
                      <>
                        <Copy style={{ width: 14, height: 14 }} />
                        <span>Copier tout le Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  readOnly
                  value={generatedPromptText}
                  className={styles.promptTextarea}
                />
              </div>

              {/* Bloc 2 : Coller la Réponse IA (Droite) */}
              <div className={styles.responseCard}>
                <div className={styles.sectionCardHeader}>
                  <div className={styles.sectionCardTitle}>
                    <FileText style={{ width: 15, height: 15, color: 'var(--color-primary)' }} />
                    <span>2. Réponse de l'IA (à coller)</span>
                  </div>
                  <div className={styles.responseCardActions}>
                    {aiResponseText && (
                      <button
                        type="button"
                        onClick={() => setAiResponseText('')}
                        className={styles.btnClear}
                      >
                        Effacer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleProcessAiResponse}
                      className={styles.btnInject}
                    >
                      <Sparkles style={{ width: 14, height: 14, color: '#fde047' }} />
                      <span>Analyser et Injecter</span>
                    </button>
                  </div>
                </div>

                {parseError && (
                  <div className={styles.alertError}>
                    <AlertCircle style={{ width: 16, height: 16, color: 'var(--color-error)', flexShrink: 0, marginTop: 2 }} />
                    <span>{parseError}</span>
                  </div>
                )}

                <textarea
                  value={aiResponseText}
                  onChange={e => setAiResponseText(e.target.value)}
                  placeholder="Collez ici la réponse complète fournie par votre IA..."
                  className={styles.responseInput}
                />
              </div>
            </div>
          </div>
        )}

        {parseSuccessMessage && (
          <div className={styles.alertSuccessBanner}>
            <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--color-success)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block' }}>
                {parseSuccessMessage}
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                La réponse IA a été intégrée. La zone de saisie a été masquée pour vous permettre de vérifier directement les propositions ci-dessous.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setParseSuccessMessage(null)}
              className={styles.btnCloseAlert}
            >
              ×
            </button>
          </div>
        )}

        {/* Section 3 : Contrôle et Personnalisation Question par Question */}
        <div id="questions-review-section" className={styles.editSection}>
          <div className={styles.editHeader}>
            <div>
              <h3 className={styles.editTitle}>
                Vérification et Personnalisation Question par Question ({questions.length} questions)
              </h3>
              <div className={styles.editSub}>
                Cliquez sur une question pour déplier ses propositions et personnaliser les feedbacks.
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={styles.btnSave}
              style={{ opacity: isSaving ? 0.5 : 1 }}
            >
              <Save style={{ width: 14, height: 14 }} aria-hidden="true" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
            {saveError && (
              <span role="alert" style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 600 }}>
                {saveError}
              </span>
            )}
          </div>

          <div className={styles.accordionList}>
              {questions.map((q, qIdx) => (
                <QuestionAccordionItem
                  key={q.id || qIdx}
                  q={q}
                  qIdx={qIdx}
                  isExpanded={expandedQuestionIdx === qIdx}
                  onToggle={handleToggleQuestion}
                  onUpdateFeedback={handleUpdateFeedback}
                  onUpdateExplanation={handleUpdateExplanation}
                />
              ))}
            </div>

            {/* Pied de page action */}
            <div className={styles.tabFooterRow}>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={styles.btnSave}
                style={{ opacity: isSaving ? 0.5 : 1 }}
              >
                <Save style={{ width: 16, height: 16 }} />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer toutes les Rétroactions'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {onNavigateToPlay && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onSave(workingQuiz);
                      } catch (e) {}
                      onNavigateToPlay();
                    }}
                    className={styles.btnPlay}
                  >
                    <Play style={{ width: 16, height: 16, fill: 'currentColor' }} />
                    <span>Tester la Simulation</span>
                  </button>
                )}

                {onNavigateToExport && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onSave(workingQuiz);
                      } catch (e) {}
                      onNavigateToExport();
                    }}
                    className={styles.btnNextExport}
                  >
                    <span>Valider et passer à l'Étape 4 : Publier</span>
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};
