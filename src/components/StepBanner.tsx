import React from 'react';
import styles from './StepBanner.module.css';

export const StepBanner: React.FC = () => {
  return (
    <div className={styles.bannerContainer}>
      <h2 className={styles.bannerTitle}>Parcours en 5 étapes</h2>
      <ol className={styles.stepList}>
        <li>
          Je crée mon QCM sur{' '}
          <a href="https://app.getquizwizard.com/create-content/source" target="_blank" rel="noopener noreferrer">
            Quiz Wizard
          </a>{' '}
          et je télécharge le fichier <code>.h5p</code>.
        </li>
        <li>Je dépose mon fichier ci-dessous, puis je copie le prompt proposé.</li>
        <li>Je colle le prompt dans mon IA et je copie sa réponse JSON.</li>
        <li>Je vérifie les rétroactions et j'exporte le quiz enrichi en <code>.h5p</code>.</li>
        <li>
          J'importe le <code>.h5p</code> sur{' '}
          <a href="https://ladigitale.dev/digiquiz/" target="_blank" rel="noopener noreferrer">
            DigiQuiz
          </a>{' '}
          pour le diffuser aux élèves.
        </li>
      </ol>
    </div>
  );
};
