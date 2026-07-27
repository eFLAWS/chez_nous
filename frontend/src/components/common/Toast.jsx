// Toast.jsx
// Notification éphémère : confirme une action réussie (ou signale une
// erreur ponctuelle) sans jamais bloquer l'interface. Purement
// présentationnel — la logique de temporisation vit dans useToast.js.
export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} onClick={() => onDismiss(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
