import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

const Toast = ({
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  show = true
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, handleClose]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Allow animation to complete
  }, [onClose]);

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      messageColor: 'text-green-700'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      messageColor: 'text-red-700'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      messageColor: 'text-yellow-700'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-700'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full
      transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className={`
        ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4
      `}>
        <div className="flex items-start">
          <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5 flex-shrink-0`} />

          <div className="ml-3 flex-1">
            {title && (
              <h3 className={`text-sm font-medium ${config.titleColor}`}>
                {title}
              </h3>
            )}
            {message && (
              <p className={`text-sm ${config.messageColor} ${title ? 'mt-1' : ''}`}>
                {message}
              </p>
            )}
          </div>

          <button
            onClick={handleClose}
            className={`ml-3 flex-shrink-0 ${config.iconColor} hover:opacity-75 transition-opacity`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts = [] }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id || index}
          {...toast}
          style={{ top: `${index * 80}px` }}
        />
      ))}
    </div>
  );
};


export { ToastContainer };
export default Toast;