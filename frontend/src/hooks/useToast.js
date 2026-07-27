// useToast.js
// Hook réutilisable : file d'attente de notifications éphémères.
// Chaque toast se ferme seul après `duration` ms, ou au clic.
import { useState, useCallback, useRef } from "react";

let idCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, type = "success", duration = 3000) => {
      const id = ++idCounter;
      setToasts((t) => [...t, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  return { toasts, showToast, dismiss };
}
