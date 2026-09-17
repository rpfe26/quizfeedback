import React from 'react';
import { 
  Download, 
  Upload, 
  Bot, 
  CheckSquare, 
  Share2, 
  ExternalLink,
  ArrowDown
} from 'lucide-react';
import styles from './StepBanner.module.css';

interface StepBannerProps {}

export const StepBanner: React.FC<StepBannerProps> = () => {
  return (
    <div className={styles.bannerContainer}>
      <div className={styles.bannerHeader}>
        <div className={styles.bannerTitleWrap}>
          <h2 className={styles.bannerTitle}>
            Parcours en 5 étapes
          </h2>
          <span className={styles.bannerSubtitle}>
            De la création sur Quiz Wizard à la diffusion sur DigiQuiz
          </span>
        </div>
      </div>

      <div className={styles.vignettesGrid}>
        
        {/* Vignette 1 */}
        <div className={styles.vignetteCard}>
          <div className={styles.vignetteTop}>
            <div className={styles.stepBadge}>1</div>
            <Download className={styles.vignetteIcon} style={{ width: 18, height: 18 }} />
          </div>
          <div className={styles.vignetteBody}>
            <h3 className={styles.vignetteTitle}>
              1 - Je fais mon quiz et je le télécharge
            </h3>
            <p className={styles.vignetteDesc}>
              Créez votre QCM sur Quiz Wizard et téléchargez le fichier au format <strong>.h5p</strong> sur votre poste.
            </p>
          </div>
          <div className={styles.vignetteFooter}>
            <a
              href="https://app.getquizwizard.com/create-content/source"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.vignetteLink}
            >
              <span>Quiz Wizard</span>
              <ExternalLink style={{ width: 13, height: 13 }} />
            </a>
          </div>
        </div>

        {/* Vignette 2 */}
        <div className={styles.vignetteCard}>
          <div className={styles.vignetteTop}>
            <div className={styles.stepBadge}>2</div>
            <Upload className={styles.vignetteIcon} style={{ width: 18, height: 18 }} />
          </div>
          <div className={styles.vignetteBody}>
            <h3 className={styles.vignetteTitle}>
              2 - J'importe et je copie le prompt
            </h3>
            <p className={styles.vignetteDesc}>
              Glissez-déposez votre <strong>.h5p</strong> ci-dessous pour préparer et copier le prompt de rétroactions.
            </p>
          </div>
          <div className={styles.vignetteFooter}>
            <span className={styles.vignetteTag}>
              <ArrowDown style={{ width: 13, height: 13 }} />
              <span>Zone de dépôt ci-dessous</span>
            </span>
          </div>
        </div>

        {/* Vignette 3 */}
        <div className={styles.vignetteCard}>
          <div className={styles.vignetteTop}>
            <div className={styles.stepBadge}>3</div>
            <Bot className={styles.vignetteIcon} style={{ width: 18, height: 18 }} />
          </div>
          <div className={styles.vignetteBody}>
            <h3 className={styles.vignetteTitle}>
              3 - Je fais travailler l'IA et je copie sa réponse
            </h3>
            <p className={styles.vignetteDesc}>
              Collez le prompt dans votre IA (ChatGPT, Claude, Mistral...) et copiez le résultat JSON généré.
            </p>
          </div>
          <div className={styles.vignetteFooter}>
            <span className={styles.vignetteTag}>
              <span>ChatGPT, Claude, Mistral</span>
            </span>
          </div>
        </div>

        {/* Vignette 4 */}
        <div className={styles.vignetteCard}>
          <div className={styles.vignetteTop}>
            <div className={styles.stepBadge}>4</div>
            <CheckSquare className={styles.vignetteIcon} style={{ width: 18, height: 18 }} />
          </div>
          <div className={styles.vignetteBody}>
            <h3 className={styles.vignetteTitle}>
              4 - Je vérifie et modifie les réponses et j'exporte le résultat
            </h3>
            <p className={styles.vignetteDesc}>
              Vérifiez la pertinence des rétroactions (méthode Pascal Pansu), ajustez et exportez votre quiz en <strong>.h5p</strong>.
            </p>
          </div>
          <div className={styles.vignetteFooter}>
            <span className={styles.vignetteTag}>
              <span>Validation Pansu &amp; Export</span>
            </span>
          </div>
        </div>

        {/* Vignette 5 */}
        <div className={styles.vignetteCard}>
          <div className={styles.vignetteTop}>
            <div className={styles.stepBadge}>5</div>
            <Share2 className={styles.vignetteIcon} style={{ width: 18, height: 18 }} />
          </div>
          <div className={styles.vignetteBody}>
            <h3 className={styles.vignetteTitle}>
              5 - J'ouvre DigiQuiz et j'importe mon H5P pour diffusion
            </h3>
            <p className={styles.vignetteDesc}>
              Accédez à DigiQuiz (La Digitale) et importez directement votre fichier <strong>.h5p</strong> pour vos élèves.
            </p>
          </div>
          <div className={styles.vignetteFooter}>
            <a
              href="https://ladigitale.dev/digiquiz/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.vignetteLink}
            >
              <span>Ouvrir DigiQuiz</span>
              <ExternalLink style={{ width: 13, height: 13 }} />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
