import React, { useState } from 'react';
import { 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Share2, 
  ArrowLeft,
  Play
} from 'lucide-react';
import { H5PQuiz } from '../types';
import styles from './ExportView.module.css';

interface ExportViewProps {
  quiz: H5PQuiz;
  onBackToFeedback: () => void;
  onBackToPlay?: () => void;
  onBackToList: () => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  quiz,
  onBackToFeedback,
  onBackToPlay,
  onBackToList
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadH5P = async () => {
    setIsExporting(true);
    setDownloadSuccess(false);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/h5p/quiz/${quiz.id}/export`);
      if (!res.ok) {
        // Tentative fallback via POST direct
        const directRes = await fetch('/api/h5p/export-h5p', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz })
        });
        if (!directRes.ok) throw new Error("Erreur lors de la génération du package H5P");
        const blob = await directRes.blob();
        triggerDownload(blob);
      } else {
        const blob = await res.blob();
        triggerDownload(blob);
      }
      setDownloadSuccess(true);
    } catch (err: any) {
      setDownloadError("Échec de l'exportation H5P : " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const triggerDownload = (blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (quiz.title || 'quiz').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '_');
    a.download = `quizfeedback_${safeTitle}.h5p`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };



  const questionsCount = quiz.content?.questions?.length || 0;
  const feedbackCount = (quiz.content?.questions || []).reduce((acc, q) => {
    return acc + (q.answers || []).filter(a => Boolean(a.feedback && a.feedback.trim())).length;
  }, 0);

  return (
    <div className={styles.container}>
      
      {/* Barre de retour supérieure */}
      <div className={styles.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onBackToFeedback}
            className={styles.btnBack}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span>Revenir aux rétroactions</span>
          </button>

          {onBackToPlay && (
            <button
              type="button"
              onClick={onBackToPlay}
              className={styles.btnBack}
            >
              <Play style={{ width: 14, height: 14, fill: 'currentColor' }} />
              <span>Tester la simulation</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onBackToList}
          className={styles.btnBack}
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span>Tableau de bord</span>
        </button>
      </div>

      {/* Carte principale */}
      <div className={styles.card}>
        
        {/* En-tête */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconWrap}>
              <Download style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h2 className={styles.headerTitle}>
                Étape 4 : Publier et diffuser le quiz
              </h2>
              <p className={styles.headerDesc}>
                Votre quiz est enrichi de rétroactions Pascal Pansu pour chaque réponse et distracteur.
              </p>
            </div>
          </div>

          <div className={styles.headerMeta}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-apps-darkblue)' }}>
              {questionsCount} question(s)
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem', fontWeight: 700 }}>
              <Sparkles style={{ width: 12, height: 12 }} />
              <span>{feedbackCount} feedbacks actifs</span>
            </div>
          </div>
        </div>

        {/* Corps */}
        <div className={styles.content}>
          
          {/* Bloc de téléchargement H5P */}
          <div className={styles.downloadHero}>
            <h3 className={styles.downloadHeroTitle}>
              Télécharger le package .H5P définitif
            </h3>
            <p className={styles.downloadHeroDesc}>
              Fichier universel prêt à être partagé avec vos élèves ou lu hors ligne sur votre ordinateur.
            </p>

            <button
              type="button"
              onClick={handleDownloadH5P}
              disabled={isExporting}
              className={styles.btnDownloadH5P}
              style={{ opacity: isExporting ? 0.6 : 1 }}
            >
              <Download style={{ width: 18, height: 18 }} />
              <span>{isExporting ? 'Génération du package...' : 'Télécharger le fichier .H5P'}</span>
            </button>

            {downloadSuccess && (
              <div className={styles.downloadSuccessWrap}>
                <div className={styles.downloadSuccess}>
                  <CheckCircle2 style={{ width: 16, height: 16 }} />
                  <span>Fichier .H5P téléchargé avec succès dans vos Téléchargements !</span>
                </div>
                <div className={styles.openDigiRow}>
                  <a
                    href="https://ladigitale.dev/digiquiz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnOpenDigi}
                  >
                    <Share2 style={{ width: 15, height: 15 }} aria-hidden="true" />
                    <span>Ouvrir DigiQuiz</span>
                    <ExternalLink style={{ width: 13, height: 13 }} aria-hidden="true" />
                  </a>
                  <span className={styles.openDigiHint}>
                    Déposez ensuite le fichier .h5p téléchargé pour obtenir un lien ou un QR code pour vos élèves.
                  </span>
                </div>
              </div>
            )}

            {downloadError && (
              <div className={styles.downloadError} role="alert">
                <AlertTriangle style={{ width: 16, height: 16 }} />
                <span>{downloadError}</span>
              </div>
            )}
          </div>

          {/* Deux applications de diffusion La Digitale */}
          <div className={styles.diffusionSection}>
            <h4 className={styles.diffusionTitle}>
              Diffuser ou lire votre quiz
            </h4>

            <div className={styles.diffusionGrid}>
              
              {/* Carte DigiQuiz */}
              <div className={styles.diffusionCard}>
                <div>
                  <div className={styles.diffusionHeader}>
                    <div className={styles.diffusionIconWrap} style={{ backgroundColor: '#ccfbf1', color: '#0f766e' }}>
                      <Share2 style={{ width: 20, height: 20 }} />
                    </div>
                    <div>
                      <div className={styles.diffusionCardTitle}>DigiQuiz</div>
                      <div className={styles.diffusionCardSub}>En ligne sans compte</div>
                    </div>
                  </div>
                  <p className={styles.diffusionText} style={{ marginTop: '0.75rem' }}>
                    Déposez votre fichier <code>.h5p</code> sur <strong>DigiQuiz</strong> (outil libre et éthique de La Digitale) pour obtenir instantanément un lien direct ou un QR code pour vos élèves.
                  </p>
                </div>

                <a
                  href="https://ladigitale.dev/digiquiz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnDiffusionLink}
                >
                  <span>Accéder à DigiQuiz</span>
                  <ExternalLink style={{ width: 13, height: 13 }} />
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
