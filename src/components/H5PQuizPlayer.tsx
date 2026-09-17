import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  Trophy, 
  Sparkles, 
  HelpCircle,
  Brain,
  Edit3,
  Download
} from 'lucide-react';
import { H5PQuiz, H5PQuestion, H5PAnswer } from '../types';
import styles from './H5PQuizPlayer.module.css';

interface H5PQuizPlayerProps {
  quiz: H5PQuiz;
  onEditFeedbacks?: () => void;
  onExport?: () => void;
  onBackToList?: () => void;
}

const checkIsCorrect = (ans: H5PAnswer) => {
  return Boolean(ans.correct === true || (ans as any).correct === 'true' || (ans as any).isCorrect === true || (ans as any).isCorrect === 'true');
};

export const H5PQuizPlayer: React.FC<H5PQuizPlayerProps> = ({
  quiz,
  onEditFeedbacks,
  onExport,
  onBackToList
}) => {
  const questions = quiz.content?.questions || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIdx: number]: string }>({});
  const [validatedQuestions, setValidatedQuestions] = useState<{ [qIdx: number]: boolean }>({});
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIdx];
  const isCurrentValidated = Boolean(validatedQuestions[currentIdx]);
  const currentSelectedId = selectedAnswers[currentIdx];

  const handleSelectOption = (ansId: string, isCorr: boolean) => {
    if (isCurrentValidated) return;

    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: ansId }));
    setValidatedQuestions(prev => ({ ...prev, [currentIdx]: true }));

    if (isCorr) {
      setScore(prev => prev + 1);
    }
  };

  const handleRetryCurrent = () => {
    const prevAnsId = selectedAnswers[currentIdx];
    const prevChosen = (currentQ?.answers || []).find((a, aIdx) => (a.id || `ans_${currentIdx + 1}_${aIdx + 1}`) === prevAnsId);
    if (prevChosen && checkIsCorrect(prevChosen)) {
      setScore(prev => Math.max(0, prev - 1));
    }

    setSelectedAnswers(prev => {
      const copy = { ...prev };
      delete copy[currentIdx];
      return copy;
    });
    setValidatedQuestions(prev => {
      const copy = { ...prev };
      delete copy[currentIdx];
      return copy;
    });
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswers({});
    setValidatedQuestions({});
    setScore(0);
    setIsFinished(false);
  };

  if (!questions.length) {
    return (
      <div className={styles.playerCard} style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '1rem' }}>
          Ce quiz ne contient aucune question à jouer.
        </p>
        <button
          type="button"
          onClick={onBackToList}
          className={styles.btnValidate}
          style={{ margin: '0 auto' }}
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  // Écran de fin / Résultat
  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const passThreshold = quiz.options?.passPercentage || 50;
    const isPassed = percentage >= passThreshold;

    return (
      <div className={styles.finishCard}>
        <div className={styles.trophyWrap}>
          <Trophy style={{ width: 32, height: 32 }} />
        </div>

        <div>
          <h2 className={styles.finishTitle}>Test du Quiz Terminé !</h2>
          <p className={styles.finishSubtitle}>{quiz.title}</p>
        </div>

        <div className={styles.scoreBox}>
          <div className={styles.scoreNumber}>
            {score} <span className={styles.scoreDenom}>/ {questions.length}</span>
          </div>
          <div className={styles.scorePercent}>
            Score de réussite : {percentage}%
          </div>
          <div>
            <span className={isPassed ? styles.passBadgeSuccess : styles.passBadgeWarning}>
              {isPassed ? '✓ Objectif d’apprentissage validé' : 'Notions à consolider'}
            </span>
          </div>
        </div>

        <div className={styles.finishActionRow}>
          <button
            type="button"
            onClick={handleRestart}
            className={styles.btnReplay}
          >
            <RotateCcw style={{ width: 16, height: 16 }} />
            <span>Rejouer le test</span>
          </button>

          {onEditFeedbacks && (
            <button
              type="button"
              onClick={onEditFeedbacks}
              className={styles.btnAdjustFeedbacks}
            >
              <Edit3 style={{ width: 16, height: 16 }} />
              <span>Ajuster les Feedbacks Pansu</span>
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className={styles.btnPublishFromPlayer}
            >
              <Download style={{ width: 16, height: 16 }} />
              <span>Étape 4 : Diffuser &amp; Exporter (DigiQuiz / LogiQuiz)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const chosenAns = currentQ ? (currentQ.answers || []).find((a, aIdx) => (a.id || `ans_${currentIdx + 1}_${aIdx + 1}`) === currentSelectedId) : undefined;
  const isChosenCorrect = chosenAns ? checkIsCorrect(chosenAns) : false;

  return (
    <div className={styles.playerCard}>
      
      {/* Header Player */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.questionNumBadge}>
            {currentIdx + 1}
          </div>
          <div>
            <span className={styles.headerSub}>
              Simulation Interactive LogiQuiz / H5P
            </span>
            <h3 className={styles.headerTitle}>
              {quiz.title}
            </h3>
          </div>
        </div>

        <div className={styles.headerProgress}>
          <span>Question {currentIdx + 1} sur {questions.length}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className={styles.progressBarTrack}>
        <div 
          className={styles.progressBarFill}
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Zone Question */}
      <div className={styles.contentBody}>
        
        <h2 className={styles.questionStatement}>
          {currentQ.question}
        </h2>

        {/* Liste des Choix */}
        <div className={styles.optionsList}>
          {(currentQ.answers || []).map((ans, aIdx) => {
            const ansId = ans.id || `ans_${currentIdx + 1}_${aIdx + 1}`;
            const isSelected = currentSelectedId === ansId;
            const isCorr = checkIsCorrect(ans);
            let btnStyle = styles.optionButtonDefault;

            if (isCurrentValidated) {
              if (isCorr) {
                btnStyle = styles.optionButtonCorrect;
              } else if (isSelected && !isCorr) {
                btnStyle = styles.optionButtonWrong;
              } else {
                btnStyle = styles.optionButtonDimmed;
              }
            } else if (isSelected) {
              btnStyle = styles.optionButtonSelected;
            }

            return (
              <button
                key={ansId}
                type="button"
                disabled={isCurrentValidated}
                onClick={() => handleSelectOption(ansId, isCorr)}
                className={`${styles.optionButton} ${btnStyle}`}
              >
                <span className={`${styles.optionLetter} ${
                  isCurrentValidated 
                    ? (isCorr ? styles.optionLetterCorrect : (isSelected ? styles.optionLetterWrong : styles.optionLetterDefault))
                    : (isSelected ? styles.optionLetterSelected : styles.optionLetterDefault)
                }`}>
                  {String.fromCharCode(65 + aIdx)}
                </span>
                <span className={styles.optionText}>{ans.text}</span>

                {isCurrentValidated && isCorr && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-success)', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                    <CheckCircle2 style={{ width: 18, height: 18 }} />
                    <span>Bonne réponse</span>
                  </div>
                )}
                {isCurrentValidated && isSelected && !isCorr && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-error)', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                    <XCircle style={{ width: 18, height: 18 }} />
                    <span>Votre choix</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Rétroaction formative Pascal Pansu immédiate après sélection */}
        {isCurrentValidated && chosenAns && (
          <div className={`${styles.feedbackBox} ${isChosenCorrect ? styles.feedbackBoxSuccess : styles.feedbackBoxRegulation}`}>
            <div className={styles.feedbackHeader}>
              {isChosenCorrect ? (
                <>
                  <CheckCircle2 style={{ width: 18, height: 18, color: 'var(--color-success)', flexShrink: 0 }} />
                  <span>Validation formative : Excellente réponse !</span>
                </>
              ) : (
                <>
                  <Brain style={{ width: 18, height: 18, color: 'var(--color-purple)', flexShrink: 0 }} />
                  <span>Piste de régulation (Logique Pascal Pansu) :</span>
                </>
              )}
            </div>

            <p className={styles.feedbackContent}>
              {chosenAns.feedback?.trim() || (isChosenCorrect 
                ? "Bravo ! Vous avez parfaitement identifié la bonne réponse." 
                : "Analysez attentivement les indices de l'énoncé et la consigne pour surmonter ce piège fréquent.")}
            </p>

            {currentQ.explanation && (
              <div className={styles.feedbackReminder}>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>Rappel notionnel : </span>
                {currentQ.explanation}
              </div>
            )}

            {/* Boutons d'action directe sous la rétroaction */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleRetryCurrent}
                className={styles.btnRetry}
                title="Tester une autre option pour cette question"
              >
                <RotateCcw style={{ width: 14, height: 14 }} />
                <span>Tester une autre proposition</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className={styles.btnNext}
              >
                <span>{currentIdx < questions.length - 1 ? 'Question suivante' : 'Voir le bilan final'}</span>
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer Player / Boutons d'action */}
      <div className={styles.playerFooter}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className={styles.btnPrev}
          style={{ opacity: currentIdx === 0 ? 0.4 : 1 }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          <span>Question précédente</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isCurrentValidated ? (
            <button
              type="button"
              onClick={handleNext}
              className={styles.btnNext}
            >
              <span>{currentIdx < questions.length - 1 ? 'Question suivante' : 'Voir le bilan final'}</span>
              <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Cliquez sur une proposition ci-dessus pour la tester
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
