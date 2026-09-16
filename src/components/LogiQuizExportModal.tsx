import React, { useState } from 'react';
import { 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Laptop, 
  Globe, 
  FileCode, 
  X,
  Share2,
  Info
} from 'lucide-react';
import { H5PQuiz } from '../types';

interface LogiQuizExportModalProps {
  quiz: H5PQuiz;
  isOpen: boolean;
  onClose: () => void;
}

export const LogiQuizExportModal: React.FC<LogiQuizExportModalProps> = ({
  quiz,
  isOpen,
  onClose
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadH5P = async () => {
    setIsExporting(true);
    setDownloadSuccess(false);

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
      alert("Échec de l'exportation H5P : " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const triggerDownload = (blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (quiz.title || 'quiz').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '_');
    a.download = `logiquiz_${safeTitle}.h5p`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(quiz, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (quiz.title || 'quiz').replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, '_');
    a.download = `quizfeedback_${safeTitle}.json`;
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col border border-slate-200 overflow-hidden">
        
        {/* En-tête */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Exportation pour LogiQuiz &amp; Digiquiz
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  La Digitale
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Format standard universel .H5P QuestionSet avec rétroactions Pascal Pansu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-700">
          
          {/* Récapitulatif du contenu exporté */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{quiz.title}</h3>
              <p className="text-slate-500 text-xs mt-0.5">{quiz.theme || 'Général'} • {questionsCount} question(s)</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                <Sparkles className="w-3.5 h-3.5" />
                {feedbackCount} feedbacks intégrés
              </span>
            </div>
          </div>

          {/* Bouton Téléchargement Principal */}
          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={handleDownloadH5P}
              disabled={isExporting}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Génération du package .H5P...' : 'Télécharger le fichier .H5P (LogiQuiz)'}</span>
            </button>

            {downloadSuccess && (
              <p className="text-emerald-700 font-bold flex items-center justify-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Fichier H5P prêt et téléchargé dans vos Téléchargements !
              </p>
            )}
          </div>

          {/* Instructions d'utilisation dans l'écosystème La Digitale */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            
            {/* LogiQuiz (Hors ligne) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Laptop className="w-4 h-4 text-emerald-600" />
                <span>1. Ouvrir dans LogiQuiz</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Lancez <strong>LogiQuiz</strong> sur votre ordinateur, cliquez sur <em>Ouvrir une activité</em> et sélectionnez votre fichier <code>.h5p</code>. Vous pouvez le lire ou le modifier hors ligne.
              </p>
              <a
                href="https://ladigitale.dev/logiquiz/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
              >
                Télécharger LogiQuiz <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Digiquiz (En ligne) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Globe className="w-4 h-4 text-teal-600" />
                <span>2. Diffuser sur Digiquiz</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Rendez-vous sur <strong>Digiquiz</strong> (service gratuit et éthique de La Digitale), déposez votre fichier <code>.h5p</code> pour obtenir un lien web ou un QR code direct pour vos élèves.
              </p>
              <a
                href="https://digiquiz.ladigitale.dev/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800"
              >
                Accéder à Digiquiz <ExternalLink className="w-3 h-3" />
              </a>
            </div>

          </div>

          {/* Export JSON de sauvegarde */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">Besoin d'une sauvegarde réimportable ?</span>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Exporter en JSON</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
