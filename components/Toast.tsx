
import React from 'react';

interface ToastProps {
  message: any;
  type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  // Robust conversion to string for rendering
  const displayMessage = typeof message === 'string' 
    ? message 
    : message?.message || JSON.stringify(message) || "Notice";

  return (
    <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-4 duration-300">
      <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
        type === 'success' 
          ? 'bg-emerald-500/90 border-emerald-400 text-white' 
          : 'bg-red-500/90 border-red-400 text-white'
      }`}>
        {type === 'success' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="text-sm font-black uppercase tracking-widest">{displayMessage}</span>
      </div>
    </div>
  );
};

export default Toast;
