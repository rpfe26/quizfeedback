import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Brain, 
  Play, 
  Download, 
  Trash2, 
  Layers,
  FileQuestion,
  Wand2,
  ExternalLink,
  Info,
  CheckCircle2
} from 'lucide-react';
import { H5PQuiz } from '../types';
import styles from './QuizListManager.module.css';

const NIVEAUX_CLASSE = [
  'Toutes',
  'Collège',
  'Lycée',
  'Bac professionnel',
  'CAP',
];

interface ImportMeta {
  file: File;
  niveau_classe: string;
}

interface QuizListManagerProps {
  quizzes: H5PQuiz[];
  onSelectQuiz: (quiz: H5PQuiz, view: 'play' | 'feedback') => void;
  onExportQuiz: (quiz: H5PQuiz) => void;
  onDeleteQuiz: (quizId: string) => void;
  onFileUpload: (file: File, meta?: { niveau_classe?: string }) => void;
  isLoading?: boolean;
}

export const QuizListManager: React.FC<QuizListManagerProps> = ({
  quizzes,
  onSelectQuiz,
  onExportQuiz,
  onDeleteQuiz,
  onFileUpload,
  isLoading
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [importPending, setImportPending] = useState<ImportMeta | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openImportModal = (file: File) => {
    setImportPending({ file, niveau_classe: 'Toutes' });
  };

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
      openImportModal(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      openImportModal(e.target.files[0]);
    }
    // Reset l'input pour pouvoir ré-importer le même fichier
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!importPending) return;
    onFileUpload(importPending.file, {
      niveau_classe: importPending.niveau_classe,
    });
    setImportPending(null);
  };

  const handleImportCancel = () => {
    setImportPending(null);
  };

  return (
    <div className={styles.container}>

      {/* Modale d'import : niveau de classe */}
      {importPending && (
        <div className={styles.importModalOverlay} role="dialog" aria-modal="true" aria-label="Choisir le niveau du quiz">
          <div className={styles.importModalCard}>
            <h2 className={styles.importModalTitle}>
              📂 Choisir le niveau de classe
            </h2>
            <div className={styles.importModalFile}>
              {importPending.file.name}
            </div>

            <div className={styles.importModalFields}>
              {/* Niveau de classe */}
              <div>
                <label htmlFor="import-niveau" className={styles.importModalLabel}>
                  Niveau de classe cible
                </label>
                <select
                  id="import-niveau"
                  className={styles.importModalSelect}
                  value={importPending.niveau_classe}
                  onChange={e => setImportPending(prev => prev ? { ...prev, niveau_classe: e.target.value } : prev)}
                >
                  {NIVEAUX_CLASSE.map(n => (
                    <option
                      key={n}
                      value={n}
                    >
                      {n}
                    </option>
                  ))}
                </select>
                <p className={styles.importModalHint}>
                  Le niveau adapte automatiquement le registre linguistique du prompt IA (vocabulaire, syntaxe, tutoiement/vouvoiement).
                </p>
              </div>
            </div>

            <div className={styles.importModalActions}>
              <button type="button" className={styles.btnImportCancel} onClick={handleImportCancel}>
                Annuler
              </button>
              <button type="button" className={styles.btnImportConfirm} onClick={handleImportConfirm}>
                <CheckCircle2 style={{ width: 15, height: 15 }} aria-hidden="true" />
                Importer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vignette : création du quiz sur Quiz Wizard */}
      <div className={styles.wizardCard}>
        <div className={styles.wizardCardIconWrap}>
          <Wand2 style={{ width: 26, height: 26 }} aria-hidden="true" />
        </div>
        <div className={styles.wizardCardBody}>
          <h2 className={styles.wizardCardTitle}>Je crée mon quiz sur Quiz Wizard</h2>
          <p className={styles.wizardCardText}>
            Créez votre QCM sur Quiz Wizard, téléchargez-le au format <span className={styles.dropzoneHighlight}>.h5p</span>, puis déposez-le ci-dessous.
          </p>
          <a
            href="https://app.getquizwizard.com/create-content/source"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.wizardCardLink}
          >
            Ouvrir Quiz Wizard
            <ExternalLink style={{ width: 15, height: 15 }} aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Note : compte Wooclap éducation */}
      <div className={styles.wooclapNote} role="note">
        <Info style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
        <p>
          Pas encore de compte ? Créez un <strong>compte Éducation</strong> avec votre adresse académique sur{' '}
          <a href="https://app.wooclap.com/auth/register?lang=fr" target="_blank" rel="noopener noreferrer">
            Wooclap
          </a>
          .
        </p>
      </div>

      {/* Zone de Dépôt Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        role="button"
        tabIndex={0}
        aria-label="Importer un quiz : glissez-déposez un fichier .h5p, ou appuyez sur Entrée pour parcourir vos fichiers"
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".h5p"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        <div className={styles.dropzoneContent}>
          <div className={styles.dropzoneIconWrap}>
            <Upload style={{ width: 28, height: 28 }} aria-hidden="true" />
          </div>
          <div>
            <h3 className={styles.dropzoneTitle}>
              Glissez-déposez ici votre quiz exporté (<span className={styles.dropzoneHighlight}>.h5p</span>)
            </h3>
            <p className={styles.dropzoneSub}>
              ou cliquez pour parcourir les fichiers de votre ordinateur
            </p>
          </div>
        </div>
      </div>

      {/* Panneau 1 : Mes Quiz & Activités */}
      <div className={styles.panelContainer}>
        <div className={styles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 className={styles.panelTitle}>
              <span>Mes quiz enregistrés</span>
            </h2>
            <span className={styles.countBadge}>
              {quizzes.length}
            </span>
          </div>
        </div>

        {/* Liste des quiz : un élément par ligne */}
        {isLoading ? (
          <div className={styles.emptyState}>
            Chargement de vos quiz...
          </div>
        ) : quizzes.length === 0 ? (
          <div className={styles.emptyState}>
            <FileQuestion style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 700, color: 'var(--color-apps-darkblue)' }}>Aucun quiz enregistré pour le moment</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Importez un fichier .h5p généré sur Quiz Wizard ou utilisez le guide ci-dessus.
            </p>
          </div>
        ) : (
          <div className={styles.quizList}>
            {quizzes.map((quiz) => {
              const qCount = quiz.content?.questions?.length || quiz.total_questions || 0;
              const fbConfigured = quiz.feedbacks_configured ?? (quiz.content?.questions || []).reduce((acc, q) => {
                return acc + (q.answers || []).filter(a => Boolean(a.feedback && a.feedback.trim())).length;
              }, 0);

              return (
                <div key={quiz.id} className={styles.quizRow}>
                  <div className={styles.rowMain}>
                    <div className={styles.cardIconWrap}>
                      H5P
                    </div>
                    <div className={styles.rowInfo}>
                      <div className={styles.rowTitleWrap}>
                        <h3 className={styles.cardTitle} title={quiz.title}>
                          {quiz.title}
                        </h3>
                        <span className={styles.cardTheme}>
                          {quiz.theme || 'Général'}
                        </span>
                      </div>

                      <div className={styles.rowDetails}>
                        <span className={styles.rowMetaItem}>
                          <Layers style={{ width: 13, height: 13 }} />
                          {qCount} question{qCount > 1 ? 's' : ''}
                        </span>
                        <span className={styles.rowDot}>•</span>
                        <span 
                          className={styles.rowMetaItem} 
                          style={{ color: fbConfigured > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                        >
                          <Brain style={{ width: 13, height: 13 }} />
                          {fbConfigured > 0 ? `${fbConfigured} feedback${fbConfigured > 1 ? 's' : ''}` : 'À étayer'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      onClick={() => onSelectQuiz(quiz, 'feedback')}
                      className={styles.btnActionPrimary}
                      title={fbConfigured > 0 ? "Vérifier et ajuster les rétroactions" : "Étape 2 : Préparer le prompt IA"}
                    >
                      <Brain style={{ width: 14, height: 14 }} />
                      <span>{fbConfigured > 0 ? 'Rétroactions' : 'Étape 2 : Prompt IA'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectQuiz(quiz, 'play')}
                      className={styles.btnActionIcon}
                      aria-label={`Simuler et tester le quiz ${quiz.title}`}
                      title="Simuler et tester"
                    >
                      <Play style={{ width: 14, height: 14, fill: 'currentColor' }} aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onExportQuiz(quiz)}
                      className={`${styles.btnActionSecondary} ${styles.btnActionExport}`}
                      aria-label={`Étape 4 : exporter et diffuser le quiz ${quiz.title}`}
                      title="Étape 4 : Exporter et diffuser"
                    >
                      <Download style={{ width: 14, height: 14 }} aria-hidden="true" />
                      <span>Étape 4 : Publier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteQuiz(quiz.id)}
                      className={`${styles.btnActionIcon} ${styles.btnActionDelete}`}
                      aria-label={`Supprimer le quiz ${quiz.title}`}
                      title="Supprimer"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
