import { useState } from 'react';

/**
 * Toast Hook for easier usage
 * Provides methods to manage toast notifications
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, options = {}) =>
    addToast({ type: 'success', message, ...options });

  const error = (message, options = {}) =>
    addToast({ type: 'error', message, ...options });

  const warning = (message, options = {}) =>
    addToast({ type: 'warning', message, ...options });

  const info = (message, options = {}) =>
    addToast({ type: 'info', message, ...options });

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};