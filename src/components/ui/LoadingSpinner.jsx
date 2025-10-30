import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({
  size = 'medium',
  message = 'Loading...',
  className = '',
  overlay = false
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
    xlarge: 'h-12 w-12'
  };

  const containerClasses = overlay
    ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    : 'flex items-center justify-center p-4';

  const spinnerSize = sizeClasses[size] || sizeClasses.medium;

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={`flex flex-col items-center space-y-3 ${overlay ? 'bg-white rounded-lg p-6 shadow-lg' : ''}`}>
        <Loader2 className={`${spinnerSize} animate-spin text-primary-600`} />
        {message && (
          <p className="text-sm text-gray-600 font-medium">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;