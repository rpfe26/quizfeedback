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

interface H5PQuizPlayerProps {
  quiz: H5PQuiz;
  onEditFeedbacks?: () => void;
  onExport?: () => void;
  onBackToList?: () => void;
}

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

  const handleSelectOption = (ansId: string) => {
    if (isCurrentValidated) return;
    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: ansId }));
  };

  const handleValidateAnswer = () => {
    if (!currentSelectedId || isCurrentValidated) return;

    setValidatedQuestions(prev => ({ ...prev, [currentIdx]: true }));

    const chosen = (currentQ.answers || []).find(a => a.id === currentSelectedId);
    if (chosen?.correct) {
      setScore(prev => prev + 1);
    }
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
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <p className="text-sm font-bold text-slate-700">Ce quiz ne contient aucune question à jouer.</p>
        <button
          type="button"
          onClick={onBackToList}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  // Écran de fin / Résultat
  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const passThreshold = quiz.options?.passPercentage || 60;
    const isPassed = percentage >= passThreshold;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900">Test du Quiz Terminé !</h2>
          <p className="text-xs text-slate-500 mt-1">{quiz.title}</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 inline-block min-w-[240px]">
          <div className="text-4xl font-black text-slate-900">
            {score} <span className="text-lg text-slate-400 font-medium">/ {questions.length}</span>
          </div>
          <div className="text-xs font-bold mt-1 text-slate-600">
            Score de réussite : {percentage}%
          </div>
          <div className="mt-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              isPassed 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {isPassed ? '✓ Objectif d’apprentissage validé' : 'Notions à consolider'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRestart}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rejouer le test</span>
          </button>

          {onEditFeedbacks && (
            <button
              type="button"
              onClick={onEditFeedbacks}
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Ajuster les Feedbacks Pansu</span>
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exporter pour LogiQuiz</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const chosenAns = (currentQ.answers || []).find(a => a.id === currentSelectedId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-w-3xl mx-auto">
      
      {/* Header Player */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs">
            {currentIdx + 1}
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Simulation Interactive LogiQuiz / H5P
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-1">
              {quiz.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span>Question {currentIdx + 1} sur {questions.length}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-slate-200 h-1.5">
        <div 
          className="bg-amber-500 h-1.5 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Zone Question */}
      <div className="p-5 sm:p-6 space-y-5">
        
        <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
          {currentQ.question}
        </h2>

        {/* Liste des Choix */}
        <div className="space-y-2.5">
          {(currentQ.answers || []).map((ans, aIdx) => {
            const isSelected = currentSelectedId === ans.id;
            let btnClass = "border-slate-200 bg-white hover:bg-slate-50 text-slate-800";

            if (isCurrentValidated) {
              if (ans.correct) {
                btnClass = "border-emerald-500 bg-emerald-50/80 text-emerald-900 font-bold";
              } else if (isSelected && !ans.correct) {
                btnClass = "border-amber-400 bg-amber-50/80 text-amber-900 font-semibold";
              } else {
                btnClass = "border-slate-200 bg-slate-50 text-slate-400 opacity-60";
              }
            } else if (isSelected) {
              btnClass = "border-amber-500 bg-amber-50/60 text-amber-900 font-bold ring-2 ring-amber-500/20";
            }

            return (
              <button
                key={ans.id || aIdx}
                type="button"
                disabled={isCurrentValidated}
                onClick={() => handleSelectOption(ans.id)}
                className={`w-full p-3.5 sm:p-4 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-3 transition-all cursor-pointer disabled:cursor-default ${btnClass}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5 border ${
                  isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 text-slate-600'
                }`}>
                  {String.fromCharCode(65 + aIdx)}
                </span>
                <span className="flex-1 leading-snug">{ans.text}</span>

                {isCurrentValidated && ans.correct && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                {isCurrentValidated && isSelected && !ans.correct && (
                  <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Rétroaction formative Pascal Pansu immédiate après validation */}
        {isCurrentValidated && chosenAns && (
          <div className={`p-4 rounded-xl border animate-fade-in text-xs leading-relaxed space-y-1.5 ${
            chosenAns.correct 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-purple-50 border-purple-200 text-purple-900'
          }`}>
            <div className="flex items-center gap-2 font-black">
              {chosenAns.correct ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Validation formative :</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span>Piste de régulation (Pascal Pansu) :</span>
                </>
              )}
            </div>

            <p className="pl-6 font-medium">
              {chosenAns.feedback || (chosenAns.correct 
                ? "Excellente réponse !" 
                : "Analysez attentivement les indices de l'énoncé et la consigne pour surmonter ce piège fréquent.")}
            </p>

            {currentQ.explanation && (
              <div className="mt-2 pt-2 border-t border-purple-200/60 pl-6 text-slate-600">
                <span className="font-bold text-slate-700">Rappel essentiel : </span>
                {currentQ.explanation}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer Player / Boutons d'action */}
      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Précédente</span>
        </button>

        <div className="flex items-center gap-2">
          {!isCurrentValidated ? (
            <button
              type="button"
              onClick={handleValidateAnswer}
              disabled={!currentSelectedId}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs disabled:opacity-40 cursor-pointer"
            >
              Vérifier la réponse
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{currentIdx < questions.length - 1 ? 'Question suivante' : 'Voir le bilan'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
