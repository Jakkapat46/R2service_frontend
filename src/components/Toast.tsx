import React from 'react';

import '../style/Toast.css';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: ToastItem[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          <span className="toast-pulse-dot"></span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
