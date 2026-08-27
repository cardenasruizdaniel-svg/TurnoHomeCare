import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className={`relative w-full ${maxWidth} rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <h3 className="text-lg font-bold font-display text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = 'md', text = 'Cargando...' }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className={`${sizeMap[size] || sizeMap.md} rounded-full border-sky-500/20 border-t-sky-500 animate-spin`} />
      {text && <p className="text-sm font-medium text-slate-400">{text}</p>}
    </div>
  );
}
