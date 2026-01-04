
import React, { useState } from 'react';
import { Card, UserRole } from '../types';
import { useApp } from '../App';

interface EditProfileModalProps {
  card: Card;
  onClose: () => void;
  onUpdate: (id: string, name: string, link1: string, link2: string, link1Label?: string, link2Label?: string, isPermanent?: boolean) => void;
  onDelete: (id: string) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ card, onClose, onUpdate, onDelete }) => {
  const { theme, currentUser, isDev } = useApp();
  // Standardized to snake_case properties from Card interface
  const [name, setName] = useState(card.display_name || '');
  const [link1, setLink1] = useState(card.external_link || '');
  const [link2, setLink2] = useState(card.external_link2 || '');
  const [link1Label, setLink1Label] = useState(card.link1_label || 'Post 1');
  const [link2Label, setLink2Label] = useState(card.link2_label || 'Post 2');
  const [isPermanent, setIsPermanent] = useState(card.is_permanent || false);
  const isDark = theme === 'dark';
  
  const isOwn = card.user_id === currentUser?.id;

  const handleUpdate = () => {
    // Trim checks are now safe as state is initialized properly
    if (!name.trim() || !link1.trim()) return;
    
    let cleanLink1 = link1.trim();
    if (!cleanLink1.startsWith('http://') && !cleanLink1.startsWith('https://')) cleanLink1 = `https://${cleanLink1}`;
    
    let cleanLink2 = link2.trim();
    if (cleanLink2 && !cleanLink2.startsWith('http://') && !cleanLink2.startsWith('https://')) cleanLink2 = `https://${cleanLink2}`;

    onUpdate(
      card.id, 
      name.trim(), 
      cleanLink1, 
      cleanLink2, 
      isDev ? link1Label : undefined, 
      isDev ? link2Label : undefined, 
      isDev ? isPermanent : false
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`w-full max-w-lg p-8 rounded-[3rem] shadow-2xl border animate-in slide-in-from-bottom-8 duration-500 overflow-y-auto max-h-[90vh] custom-scrollbar ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className={`font-black text-2xl tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isOwn ? 'Edit Your Card' : 'Admin: Management'}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Updating Identity in {card.folder_id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Display Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-6 py-4 rounded-2xl font-bold outline-none border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
            />
          </div>

          {isDev && (
            <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 space-y-4 animate-in fade-in slide-in-from-top-4">
              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Architect Priorities</h4>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Enable Permanence</span>
                <button 
                  onClick={() => setIsPermanent(!isPermanent)}
                  className={`w-12 h-6 rounded-full transition-all relative border ${isPermanent ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-700 border-slate-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPermanent ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Label 1</label>
                   <input type="text" value={link1Label} onChange={(e) => setLink1Label(e.target.value)} className={`w-full bg-slate-800 border-slate-700 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none border focus:border-emerald-500`} />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Label 2</label>
                   <input type="text" value={link2Label} onChange={(e) => setLink2Label(e.target.value)} className={`w-full bg-slate-800 border-slate-700 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none border focus:border-emerald-500`} />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Post Link 1</label>
            <input 
              type="text" 
              value={link1}
              onChange={(e) => setLink1(e.target.value)}
              className={`w-full px-6 py-4 rounded-2xl font-bold outline-none border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Post Link 2 (Optional)</label>
            <input 
              type="text" 
              value={link2}
              onChange={(e) => setLink2(e.target.value)}
              className={`w-full px-6 py-4 rounded-2xl font-bold outline-none border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
            />
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button 
              onClick={handleUpdate}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 transition-all text-sm uppercase tracking-widest"
            >
              Save Changes
            </button>
            <button 
              onClick={() => onDelete(card.id)}
              className={`w-full py-4 text-xs font-black uppercase tracking-widest border border-dashed rounded-2xl transition-all ${isDark ? 'border-red-500/30 text-red-500 hover:bg-red-500/10' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
            >
              Delete This Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
