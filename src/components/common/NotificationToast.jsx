/**
 * NotificationToast Component
 *
 * Displays toast notifications from the kanban store.
 * Supports success, error, warning, and info notification types.
 */

import React, { useEffect } from 'react';
import { useKanbanStore } from '../../stores/kanbanStore';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationToast = () => {
  const { notifications, removeNotification } = useKanbanStore();

  // Auto-position notifications from top
  const notificationStyles = (index) => ({
    top: `${20 + index * 80}px`,
  });

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-[9999] p-4 pointer-events-none">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`pointer-events-auto mb-3 w-96 rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out ${getBackgroundColor(notification.type)}`}
          style={notificationStyles(index)}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${getTextColor(notification.type)}`}>
                {notification.message}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => removeNotification(notification.id)}
                className={`inline-flex rounded-md ${getTextColor(notification.type)} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 p-1`}
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
