"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: React.ReactNode; // For custom content in the modal body
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string; // Tailwind classes for confirm button bg color
  isDestructive?: boolean; // If true, confirm button will be red
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  confirmButtonColor, // Default handled below
  isDestructive = false,
}) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const finalConfirmButtonColor = confirmButtonColor
    ? confirmButtonColor
    : isDestructive
    ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
    : 'bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 id="modal-title" className="text-xl font-semibold text-gray-800">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        {children && (
          <div className="text-sm text-gray-600 mb-6">
            {children}
          </div>
        )}

        {/* Modal Footer (Buttons) */}
        <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors text-sm"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-white font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors text-sm ${finalConfirmButtonColor}`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;