import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ArrowLeft,
  Download,
  BookOpen
} from 'lucide-react';
import { H5PQuiz, AppView } from './types';
import { StepBanner } from './components/StepBanner';
import { QuizListManager } from './components/QuizListManager';
import { PansuFeedbackEngine } from './components/PansuFeedbackEngine';
import { H5PQuizPlayer } from './components/H5PQuizPlayer';
import { ExportView } from './components/ExportView';
import styles from './App.module.css';

export const App: React.FC = () => {
  const [quizzes, setQuizzes] = useState<H5PQuiz[]>([]);
  const [activeView, setActiveView] = useState<AppView>('list');
  const [selectedQuiz, setSelectedQuiz] = useState<H5PQuiz | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDysMode, setIsDysMode] = useState<boolean>(() => {
    return localStorage.getItem('quizfeedback_dys_mode') === 'true';
  });

  // Synchronisation du mode DYS
  useEffect(() => {
    if (isDysMode) {
      document.body.classList.add('dys-mode');
    } else {
      document.body.classList.remove('dys-mode');
    }
    localStorage.setItem('quizfeedback_dys_mode', String(isDysMode));
  }, [isDysMode]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Chargement des quiz depuis l'API locale
  const loadQuizzes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/h5p/quizzes');
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (e) {
      console.warn('API non joignable, consultation localStorage');
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

  useEffect(() => {
    if (quizzes.length > 0) {
      localStorage.setItem('quizfeedback_quizzes', JSON.stringify(quizzes));
    }
  }, [quizzes]);

  const handleSaveQuiz = async (updatedQuiz: H5PQuiz) => {
    setQuizzes(prev => prev.map(q => q.id === updatedQuiz.id ? updatedQuiz : q));
    setSelectedQuiz(updatedQuiz);

    try {
      await fetch(`/api/h5p/quiz/${updatedQuiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedQuiz.title,
          theme: updatedQuiz.theme,
          description: updatedQuiz.description,
          content: updatedQuiz.content,
          options: updatedQuiz.options
        })
      });
    } catch (e) {
      console.warn('Backend sync failed, saved in local state:', e);
    }
  };

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
          setActiveView('prompt');
        }
      } catch (err: any) {
        showNotification("Erreur lors de l'importation : " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

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
          setActiveView('prompt');
        }
      }
    } catch (e: any) {
      showNotification("Impossible de charger le modèle : " + e.message);
    }
  };

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
    <div className={styles.appContainer}>
      
      {/* Toast Notification */}
      {notification && (
        <div className={styles.toast} role="status" aria-live="polite">
          <CheckCircle2 className={styles.toastIcon} aria-hidden="true" />
          <span>{notification}</span>
        </div>
      )}

      {/* Barre supérieure épurée */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          
          {/* Nom de l'application */}
          <button
            type="button"
            onClick={() => {
              setActiveView('list');
              setSelectedQuiz(null);
            }}
            className={styles.brandTitleWrap}
            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
            aria-label="Quiz Feedback IA : retour à la liste des quiz"
          >
            <span className={styles.brandTitle}>Quiz Feedback IA</span>
          </button>

          {/* Commutateur Mode DYS */}
          <div className={styles.headerRight}>
            <button
              type="button"
              className={`${styles.switchWrap} ${isDysMode ? styles.switchWrapActive : ''}`}
              onClick={() => setIsDysMode(prev => !prev)}
              style={{ cursor: 'pointer', background: 'none', border: 'none', font: 'inherit' }}
              aria-pressed={isDysMode}
              aria-label={isDysMode ? "Désactiver le mode DYS" : "Activer le mode de lecture DYS"}
            >
              <BookOpen style={{ width: 16, height: 16, color: isDysMode ? 'var(--color-apps-blue)' : 'var(--color-text-muted)' }} aria-hidden="true" />
              <span className={styles.switchLabel}>Mode DYS</span>
            </button>
          </div>

        </div>
      </header>

      {/* Contenu Principal */}
      <main className={styles.mainContent}>
        
        {/* Vue 1 : Liste des Quiz & Parcours en 5 étapes */}
        {activeView === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <StepBanner />

            <QuizListManager
              quizzes={quizzes}
              isLoading={isLoading}
              onSelectQuiz={(quiz, view) => {
                setSelectedQuiz(quiz);
                setActiveView(view);
              }}
              onExportQuiz={(quiz) => {
                setSelectedQuiz(quiz);
                setActiveView('export');
              }}
              onDeleteQuiz={handleDeleteQuiz}
              onFileUpload={handleFileUpload}
              onCreateNew={handleCreateNew}
            />
          </div>
        )}

        {/* Étape 2 & Étape 3 : Moteur de Rétroactions Pascal Pansu & Contrôle */}
        {(activeView === 'feedback' || activeView === 'prompt' || activeView === 'control') && selectedQuiz && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveView('list');
                  loadQuizzes();
                }}
                className={styles.circleBtn}
                style={{ width: 'auto', padding: '0.4rem 0.8rem', borderRadius: '8px', gap: '0.4rem' }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} />
                <span>Retour au tableau de bord</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveView('play')}
                  className={styles.circleBtn}
                  style={{ width: 'auto', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                >
                  <span>Tester la simulation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('export')}
                  className={styles.circleBtnActive}
                  style={{ width: 'auto', padding: '0.4rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  <span>Étape 4 : Publier</span>
                </button>
              </div>
            </div>

            <PansuFeedbackEngine
              quiz={selectedQuiz}
              initialTab={activeView === 'prompt' ? 'prompt' : (activeView === 'control' ? 'import' : undefined)}
              onSave={handleSaveQuiz}
              onClose={() => setActiveView('list')}
              onNavigateToPlay={() => setActiveView('play')}
              onNavigateToExport={() => setActiveView('export')}
            />
          </div>
        )}

        {/* Vue 3 : Simulateur élève */}
        {activeView === 'play' && selectedQuiz && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setActiveView('control')}
                className={styles.circleBtn}
                style={{ width: 'auto', padding: '0.4rem 0.8rem', borderRadius: '8px', gap: '0.4rem' }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} />
                <span>Revenir à l'édition des rétroactions</span>
              </button>
            </div>

            <H5PQuizPlayer
              quiz={selectedQuiz}
              onEditFeedbacks={() => setActiveView('control')}
              onExport={() => setActiveView('export')}
              onBackToList={() => setActiveView('list')}
            />
          </div>
        )}

        {/* Vue 4 : Exportation & Diffusion */}
        {activeView === 'export' && selectedQuiz && (
          <ExportView
            quiz={selectedQuiz}
            onBackToFeedback={() => setActiveView('control')}
            onBackToPlay={() => setActiveView('play')}
            onBackToList={() => {
              setSelectedQuiz(null);
              setActiveView('list');
              loadQuizzes();
            }}
          />
        )}

      </main>

      {/* Footer officiel épuré */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span style={{ fontWeight: 800, color: 'var(--color-apps-darkblue)', fontSize: '0.95rem' }}>Quiz Feedback IA</span>
          </div>

          <div className={styles.footerLinks}>
            <span>Rétroactions formatives Pascal Pansu</span>
            <span>•</span>
            <span>Standard H5P &amp; La Digitale</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
