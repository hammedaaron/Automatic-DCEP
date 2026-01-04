
import React from 'react';
import { useApp } from '../App';

interface UserDocsProps {
  onClose: () => void;
}

const UserDocs: React.FC<UserDocsProps> = ({ onClose }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[3rem] border shadow-2xl transition-all animate-in zoom-in-95 duration-500 ${isDark ? 'bg-slate-900 border-emerald-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        
        {/* Header */}
        <header className={`sticky top-0 z-10 p-8 flex items-center justify-between border-b backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">POD Handbook</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">DCEP Operational Guide</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="p-8 lg:p-12 space-y-16">
          
          {/* Section 1: Accessing the POD */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest">01: Infiltration</div>
              <h3 className="text-3xl font-black tracking-tight">Accessing the POD</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Engagement PODs are private workspaces. To enter, you must know the <strong>Membership Name</strong> of the POD you were invited to.
              </p>
              <div className={`p-6 rounded-3xl border-2 border-dashed ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white shadow-sm border-slate-200'}`}>
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Example Protocol</p>
                  <div className="h-10 w-full bg-indigo-50 dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-slate-700 flex items-center px-4">
                    <span className="text-xs font-black text-indigo-500 opacity-60">X-Alpha-Squad-99</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
               <div className="p-8 rounded-[3rem] bg-indigo-600 text-white shadow-2xl rotate-3 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <h4 className="font-black text-xl mb-2">Establish Identity</h4>
                 <p className="text-xs opacity-80 font-bold mb-4 leading-relaxed">Submit your primary content link to create your Engagement Card.</p>
                 <div className="h-10 w-full bg-white/20 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest">Connect Link</div>
               </div>
            </div>
          </section>

          {/* Section 2: Proof-of-Engagement */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2 space-y-6">
              <div className="inline-flex px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest">02: Enforcement</div>
              <h3 className="text-3xl font-black tracking-tight">Enforcement Protocol</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                DCEP is <strong>Proof-Based</strong>. You cannot engage with a card until the system verifies you have opened the required links. No ghosting allowed.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-[10px]">1</div>
                  Click the Post Link buttons on any card.
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-[10px]">2</div>
                  Complete the action (Like/Comment).
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-[10px]">3</div>
                  The <span className="text-indigo-500">Engage Now</span> button will unlock.
                </li>
              </ul>
            </div>
            <div className="lg:order-1 flex justify-center">
               <div className={`p-8 rounded-[3rem] border-4 border-amber-500/30 ${isDark ? 'bg-slate-900' : 'bg-white shadow-xl'}`}>
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 mb-4 animate-pulse"></div>
                  <div className="space-y-2 mb-6">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800/50 rounded-full"></div>
                  </div>
                  <div className="p-4 bg-amber-500 text-white rounded-2xl font-black text-center text-xs tracking-widest uppercase shadow-lg shadow-amber-500/20">
                    LOCKED: VISIT LINKS
                  </div>
               </div>
            </div>
          </section>

          {/* Section 3: Accountability Metrics */}
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <h3 className="text-3xl font-black tracking-tight">Accountability Metrics</h3>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Performance visibility</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-lg'}`}>
                  <div className="text-3xl mb-4">📊</div>
                  <h4 className="text-xl font-black mb-3">Live Rankings</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    The <strong>Leaderboard</strong> tracks your Outbound vs. Inbound score. Top engagers rise, slackers are exposed.
                  </p>
               </div>
               <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-lg'}`}>
                  <div className="text-3xl mb-4">⌛</div>
                  <h4 className="text-xl font-black mb-3">Node Stability</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Cards expire after 48 hours. This keeps the POD fresh and ensures everyone is currently active.
                  </p>
               </div>
               <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-lg'}`}>
                  <div className="text-3xl mb-4">🤝</div>
                  <h4 className="text-xl font-black mb-3">Mutual Status</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Reciprocal engagement triggers a <strong>Mutual Badge</strong>. Admins prioritize these as "High-Value" connections.
                  </p>
               </div>
            </div>
          </section>

          {/* Footer CTA */}
          <footer className="pt-8 text-center border-t border-slate-100 dark:border-slate-800">
             <button 
              onClick={onClose}
              className="px-12 py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-2xl shadow-emerald-500/30 transition-all uppercase tracking-widest text-sm"
             >
               Initialize Engagement
             </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default UserDocs;
