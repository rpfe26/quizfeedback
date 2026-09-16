import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Brain, 
  Download, 
  ExternalLink, 
  Laptop, 
  Layers, 
  BookOpen, 
  ArrowLeft,
  Info,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { H5PQuiz, AppView } from './types';
import { QuizWizardHelper } from './components/QuizWizardHelper';
import { QuizListManager } from './components/QuizListManager';
import { PansuFeedbackEngine } from './components/PansuFeedbackEngine';
import { H5PQuizPlayer } from './components/H5PQuizPlayer';
import { LogiQuizExportModal } from './components/LogiQuizExportModal';

export const App: React.FC = () => {
  const [quizzes, setQuizzes] = useState<H5PQuiz[]>([]);
  const [activeView, setActiveView] = useState<AppView>('list');
  const [selectedQuiz, setSelectedQuiz] = useState<H5PQuiz | null>(null);
  const [exportModalQuiz, setExportModalQuiz] = useState<H5PQuiz | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Chargement des quiz depuis l'API locale SQLite
  const loadQuizzes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/h5p/quizzes');
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (e) {
      console.warn('API non joignable ou mode statique, consultation localStorage');
      const saved = localStorage.getItem('quizfeedback_quizzes');
      if (saved) {
        try { setQuizzes(JSON.parse(saved)); } catch (err) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  // Synchronisation localStorage par sécurité
  useEffect(() => {
    if (quizzes.length > 0) {
      localStorage.setItem('quizfeedback_quizzes', JSON.stringify(quizzes));
    }
  }, [quizzes]);

  // Sauvegarde d'un quiz
  const handleSaveQuiz = async (updatedQuiz: H5PQuiz) => {
    try {
      const res = await fetch(`/api/h5p/quiz/${updatedQuiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuiz)
      });

      if (res.ok) {
        showNotification('Quiz et rétroactions enregistrés avec succès !');
      }
    } catch (e) {
      console.warn('Sauvegarde distante échouée, sauvegarde locale');
    }

    setQuizzes(prev => prev.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
    setSelectedQuiz(updatedQuiz);
  };

  // Suppression d'un quiz
  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await fetch(`/api/h5p/quiz/${quizId}`, { method: 'DELETE' });
    } catch (e) {}

    setQuizzes(prev => prev.filter(q => q.id !== quizId));
    if (selectedQuiz?.id === quizId) {
      setSelectedQuiz(null);
      setActiveView('list');
    }
    showNotification('Quiz supprimé.');
  };

  // Importation d'un fichier H5P ou JSON
  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch('/api/h5p/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64File: base64,
            filename: file.name
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Erreur lors du traitement du fichier H5P');
        }

        const data = await res.json();
        showNotification(`Quiz "${data.quiz?.title || file.name}" importé avec succès !`);
        await loadQuizzes();
        if (data.quiz) {
          setSelectedQuiz(data.quiz);
          setActiveView('feedback');
        }
      } catch (err: any) {
        alert("Erreur lors de l'importation : " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // Importation directe depuis JSON
  const handleImportJson = async (jsonStr: string) => {
    try {
      const res = await fetch('/api/h5p/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawJson: jsonStr })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Format JSON non valide');
      }

      const data = await res.json();
      showNotification(`Quiz importé avec succès !`);
      await loadQuizzes();
      if (data.quiz) {
        setSelectedQuiz(data.quiz);
        setActiveView('feedback');
      }
    } catch (err: any) {
      alert("Erreur importation JSON : " + err.message);
    }
  };

  // Chargement du modèle exemple
  const handleLoadSample = async (sample: Partial<H5PQuiz>) => {
    try {
      const res = await fetch('/api/h5p/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sample)
      });

      if (res.ok) {
        const data = await res.json();
        showNotification("Quiz d'exemple Révolution française chargé !");
        await loadQuizzes();
        if (data.quiz) {
          setSelectedQuiz(data.quiz);
          setActiveView('feedback');
        }
      }
    } catch (e: any) {
      alert("Impossible de charger le modèle : " + e.message);
    }
  };

  // Création d'un quiz vierge
  const handleCreateNew = async () => {
    const newQuiz: Partial<H5PQuiz> = {
      title: 'Nouveau Quiz',
      theme: 'Général',
      description: 'Quiz interactif avec rétroactions formatives Pascal Pansu.',
      content: {
        questions: [
          {
            id: 'q_1',
            question: 'Saisissez ici l’énoncé de votre première question :',
            type: 'multichoice',
            answers: [
              { id: 'ans_1_1', text: 'Option A (Bonne réponse)', correct: true, feedback: 'Bravo pour ce choix !' },
              { id: 'ans_1_2', text: 'Option B (Distracteur)', correct: false, feedback: 'Prenez le temps de relire la consigne...' }
            ]
          }
        ]
      }
    };
    await handleLoadSample(newQuiz);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 font-sans text-slate-900">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Titre */}
          <div className="flex items-center gap-3 sm:gap-4">
            {activeView !== 'list' ? (
              <button
                type="button"
                onClick={() => {
                  setActiveView('list');
                  loadQuizzes();
                }}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Tous les quiz</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                      QuizFeedback
                    </h1>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Autonome • Sans Identifiant
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-none mt-1 hidden sm:block">
                    Quiz H5P • Rétroactions Pascal Pansu • Export LogiQuiz (La Digitale)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Raccourcis externes (Quiz Wizard, LogiQuiz, La Digitale) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://app.getquizwizard.com/create-content/source"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs"
              title="Accéder à l'interface de Quiz Wizard pour créer des questions"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Quiz Wizard</span>
              <ExternalLink className="w-3 h-3 text-amber-500" />
            </a>

            <a
              href="https://ladigitale.dev/logiquiz/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all shadow-2xs"
              title="Télécharger LogiQuiz pour lire et modifier vos fichiers H5P hors ligne"
            >
              <Laptop className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">LogiQuiz</span>
              <ExternalLink className="w-3 h-3 text-emerald-500" />
            </a>

            <a
              href="https://digiquiz.ladigitale.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold transition-all shadow-2xs"
              title="Diffuser votre quiz en ligne sans compte sur Digiquiz"
            >
              <Share2 className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Digiquiz</span>
              <ExternalLink className="w-3 h-3 text-teal-500" />
            </a>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Vue 1 : Liste des Quiz & Guide Quiz Wizard */}
        {activeView === 'list' && (
          <div className="space-y-6">
            <QuizWizardHelper
              onLoadSample={handleLoadSample}
              onImportJson={handleImportJson}
            />

            <QuizListManager
              quizzes={quizzes}
              isLoading={isLoading}
              onSelectQuiz={(quiz, view) => {
                setSelectedQuiz(quiz);
                setActiveView(view);
              }}
              onExportQuiz={(quiz) => setExportModalQuiz(quiz)}
              onDeleteQuiz={handleDeleteQuiz}
              onFileUpload={handleFileUpload}
              onCreateNew={handleCreateNew}
            />
          </div>
        )}

        {/* Vue 2 : Moteur de Rétroactions Pascal Pansu */}
        {activeView === 'feedback' && selectedQuiz && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveView('list');
                  loadQuizzes();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour à la liste des quiz</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('play')}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs"
                >
                  Tester la simulation
                </button>
                <button
                  type="button"
                  onClick={() => setExportModalQuiz(selectedQuiz)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter LogiQuiz</span>
                </button>
              </div>
            </div>

            <PansuFeedbackEngine
              quiz={selectedQuiz}
              onSave={handleSaveQuiz}
              onClose={() => setActiveView('list')}
              onNavigateToExport={() => setExportModalQuiz(selectedQuiz)}
            />
          </div>
        )}

        {/* Vue 3 : Simulateur & Lecteur de test */}
        {activeView === 'play' && selectedQuiz && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour à la liste des quiz</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('feedback')}
                className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Modifier les Feedbacks Pansu</span>
              </button>
            </div>

            <H5PQuizPlayer
              quiz={selectedQuiz}
              onEditFeedbacks={() => setActiveView('feedback')}
              onExport={() => setExportModalQuiz(selectedQuiz)}
              onBackToList={() => setActiveView('list')}
            />
          </div>
        )}

      </main>

      {/* Modal Export LogiQuiz */}
      {exportModalQuiz && (
        <LogiQuizExportModal
          quiz={exportModalQuiz}
          isOpen={Boolean(exportModalQuiz)}
          onClose={() => setExportModalQuiz(null)}
        />
      )}

      {/* Footer Pédagogique */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">QuizFeedback</span>
            <span>•</span>
            <span>Évaluation Formative &amp; Régulation Cognitive (Pascal Pansu)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
            <span>100% Hors Ligne possible (DMG / EXE)</span>
            <span>•</span>
            <span>Standard H5P.QuestionSet</span>
            <span>•</span>
            <span>Compatible LogiQuiz &amp; Digiquiz (La Digitale)</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
