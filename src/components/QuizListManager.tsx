import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Upload, 
  Brain, 
  Play, 
  Download, 
  Trash2, 
  Sparkles, 
  FileCode, 
  CheckCircle2, 
  Clock, 
  Layers,
  FileQuestion,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { H5PQuiz } from '../types';

interface QuizListManagerProps {
  quizzes: H5PQuiz[];
  onSelectQuiz: (quiz: H5PQuiz, view: 'play' | 'feedback') => void;
  onExportQuiz: (quiz: H5PQuiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onFileUpload: (file: File) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export const QuizListManager: React.FC<QuizListManagerProps> = ({
  quizzes,
  onSelectQuiz,
  onExportQuiz,
  onDeleteQuiz,
  onFileUpload,
  onCreateNew,
  isLoading
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Zone de Dépôt Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragging 
            ? 'border-purple-500 bg-purple-50/60 scale-99' 
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".h5p,.json"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Glissez-déposez ici votre quiz exporté depuis Quiz Wizard (<span className="text-purple-700">.h5p</span> ou <span className="text-purple-700">.json</span>)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ou cliquez pour parcourir vos fichiers sur votre ordinateur
            </p>
          </div>
        </div>
      </div>

      {/* Barre d'action & Titre de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Mes Quiz &amp; Rétroactions</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
              {quizzes.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérez vos quiz, enrichissez-les avec la méthode Pascal Pansu et exportez pour LogiQuiz.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un quiz vide</span>
          </button>
        </div>
      </div>

      {/* Grille de Quiz */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">
          Chargement de vos quiz...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileQuestion className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Aucun quiz enregistré pour le moment</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Exportez votre premier quiz depuis <strong>Quiz Wizard</strong> puis déposez-le ci-dessus, ou cliquez sur <em>Charger l'exemple</em> dans le guide.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {quizzes.map(quiz => {
            const qCount = quiz.content?.questions?.length || quiz.total_questions || 0;
            const fbConfigured = quiz.feedbacks_configured ?? (quiz.content?.questions || []).reduce((acc, q) => {
              return acc + (q.answers || []).filter(a => Boolean(a.feedback && a.feedback.trim())).length;
            }, 0);

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Haut de carte */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {quiz.theme || 'Général'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Supprimer le quiz "${quiz.title}" ?`)) {
                          onDeleteQuiz(quiz.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md cursor-pointer"
                      title="Supprimer ce quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-purple-900 transition-colors">
                      {quiz.title}
                    </h3>
                    {quiz.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {quiz.description}
                      </p>
                    )}
                  </div>

                  {/* Badges de statut & feedbacks */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                      <Layers className="w-3 h-3 text-slate-400" />
                      {qCount} question(s)
                    </span>

                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border text-[11px] ${
                      fbConfigured > 0
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      <Brain className="w-3 h-3" />
                      {fbConfigured > 0 ? `${fbConfigured} feedback(s) Pansu` : 'Feedbacks à configurer'}
                    </span>
                  </div>
                </div>

                {/* Barre de boutons d'action */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                  
                  {/* Tester / Jouer */}
                  <button
                    type="button"
                    onClick={() => onSelectQuiz(quiz, 'play')}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Simuler et tester le quiz"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-slate-800" />
                    <span>Tester</span>
                  </button>

                  {/* Feedbacks Pansu */}
                  <button
                    type="button"
                    onClick={() => onSelectQuiz(quiz, 'feedback')}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    title="Ouvrir le moteur de régulation Pascal Pansu"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Feedbacks</span>
                  </button>

                  {/* Export LogiQuiz */}
                  <button
                    type="button"
                    onClick={() => onExportQuiz(quiz)}
                    className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    title="Exporter le package H5P pour LogiQuiz & Digiquiz"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
