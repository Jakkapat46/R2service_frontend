import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';

import '../style/ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  // Disable window scrolling entirely while the modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop">
      <div className="glass-panel modal-content-box">
        <div className="modal-header-row">
          <AlertCircle className="modal-warning-icon" size={24} />
          <h3>{title}</h3>
        </div>
        <p className="modal-message">{message}</p>
        <div className="modal-actions-row">
          <button className="modal-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="modal-btn-confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
