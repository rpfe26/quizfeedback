import React, { useEffect, useState } from 'react';
import { ExternalLink, Pencil, X, Check } from 'lucide-react';
import styles from './AiAgentPicker.module.css';

const GOUV_AGENT = {
  label: 'Assistant Agents publics',
  url: 'https://assistant.numerique.gouv.fr/chat/'
};

const STORAGE_KEY = 'quizfeedback.preferredAgent';

interface PreferredAgent {
  label: string;
  url: string;
}

export const AiAgentPicker: React.FC = () => {
  const [preferred, setPreferred] = useState<PreferredAgent | null>(null);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PreferredAgent;
        if (parsed && parsed.url && parsed.label) {
          setPreferred(parsed);
        }
      }
    } catch {
      /* stockage indisponible : l'agent préféré reste non configuré */
    }
  }, []);

  const openForm = () => {
    setLabel(preferred?.label ?? '');
    setUrl(preferred?.url ?? '');
    setError('');
    setEditing(true);
  };

  const save = () => {
    const trimmedUrl = url.trim();
    const trimmedLabel = label.trim() || 'Mon agent IA';
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setError("L'adresse doit commencer par http:// ou https://");
      return;
    }
    const agent: PreferredAgent = { label: trimmedLabel, url: trimmedUrl };
    setPreferred(agent);
    setEditing(false);
    setError('');
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(agent));
    } catch {
      /* stockage indisponible : on garde la valeur en mémoire */
    }
  };

  const clear = () => {
    setPreferred(null);
    setEditing(false);
    setLabel('');
    setUrl('');
    setError('');
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stockage indisponible */
    }
  };

  return (
    <div className={styles.pickerBar} role="group" aria-label="Choix de l'agent IA pour générer la réponse">
      <span className={styles.pickerTitle}>Ouvrir votre agent IA :</span>

      <a
        href={GOUV_AGENT.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.agentChipPrimary}
        title="Assistant IA de l'État pour les agents publics"
      >
        <ExternalLink style={{ width: 14, height: 14 }} aria-hidden="true" />
        <span>{GOUV_AGENT.label}</span>
        <span className={styles.agentChipBadge}>Recommandé</span>
      </a>

      {editing ? (
        <div className={styles.prefForm}>
          <label className={styles.prefField}>
            <span>Nom</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex. : Le Chat"
              className={styles.prefInput}
              maxLength={40}
            />
          </label>
          <label className={styles.prefField}>
            <span>Adresse</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className={styles.prefInput}
            />
          </label>
          <button type="button" onClick={save} className={styles.prefSave}>
            <Check style={{ width: 14, height: 14 }} aria-hidden="true" />
            <span>Enregistrer</span>
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setError(''); }}
            className={styles.prefCancel}
          >
            Annuler
          </button>
          {error && <span className={styles.prefError} role="alert">{error}</span>}
        </div>
      ) : preferred ? (
        <>
          <a
            href={preferred.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.agentChip}
            title={preferred.url}
          >
            <ExternalLink style={{ width: 14, height: 14 }} aria-hidden="true" />
            <span>{preferred.label}</span>
          </a>
          <button
            type="button"
            onClick={openForm}
            className={styles.agentChipGhost}
            aria-label="Modifier l'agent préféré"
            title="Modifier l'agent préféré"
          >
            <Pencil style={{ width: 13, height: 13 }} aria-hidden="true" />
            <span>Modifier</span>
          </button>
          <button
            type="button"
            onClick={clear}
            className={styles.agentChipGhost}
            aria-label="Retirer l'agent préféré"
            title="Retirer l'agent préféré"
          >
            <X style={{ width: 13, height: 13 }} aria-hidden="true" />
            <span>Retirer</span>
          </button>
        </>
      ) : (
        <button type="button" onClick={openForm} className={styles.agentChipGhost}>
          <Pencil style={{ width: 13, height: 13 }} aria-hidden="true" />
          <span>Mon agent préféré…</span>
        </button>
      )}

      <span className={styles.pickerHint}>
        Copiez le prompt ci-dessous, collez-le dans votre agent, puis revenez coller sa réponse à droite.
      </span>
    </div>
  );
};