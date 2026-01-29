import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'error' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmStyle = 'error',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmButtonClass = {
    error: 'btn-error',
    warning: 'btn-warning',
    primary: 'btn-primary',
  }[confirmStyle];

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p className="py-4">{message}</p>
      <div className="modal-action">
        <button className="btn" onClick={onCancel}>
          {cancelText}
        </button>
        <button className={`btn ${confirmButtonClass}`} onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
