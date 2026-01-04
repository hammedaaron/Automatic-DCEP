
import React, { useState } from 'react';
import { useApp } from '../App';

interface AdminLoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // MASTER RULE: Username must be 'Admin'
    // Password must be 'Hamstarxxx' where x are digits except 0
    const passwordRegex = /^Hamstar[1-9]{3}$/;

    if (username === 'Admin' && passwordRegex.test(password)) {
      onSuccess();
    } else {
      setError('Invalid master credentials. Access denied.');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className={`w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border transform transition-all animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border-amber-500/30' : 'bg-white border-slate-200'}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Master Access</h2>
          <p className="text-sm text-slate-500 font-bold mt-1 uppercase tracking-widest">Administrator Credentials Required</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-6 py-4 rounded-2xl font-bold outline-none border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
              placeholder="Admin"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-6 py-4 rounded-2xl font-bold outline-none border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
              placeholder="Hamstar•••"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <button 
              type="submit"
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all uppercase tracking-widest text-sm"
            >
              Verify Identity
            </button>
            <button 
              type="button"
              onClick={onClose}
              className={`w-full py-4 text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;
