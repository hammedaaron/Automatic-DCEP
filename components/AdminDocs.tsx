
import React from 'react';
import { useApp } from '../App';

interface AdminDocsProps {
  onClose: () => void;
}

const AdminDocs: React.FC<AdminDocsProps> = ({ onClose }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[3rem] border shadow-2xl transition-all animate-in zoom-in-95 duration-500 ${isDark ? 'bg-slate-900 border-indigo-500/30 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        
        {/* Header */}
        <header className={`sticky top-0 z-10 p-8 flex items-center justify-between border-b backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase">Admin Blueprint</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mastering Community Infrastructure</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="p-8 lg:p-12 space-y-16">
          
          {/* Section 1: Setup & Passwords */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest">Step 01: Core Setup</div>
              <h3 className="text-3xl font-black tracking-tight">The Password Algorithm</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                To prevent community overlap, every Admin must follow a specific security pattern. This code acts as your community's unique "Seed".
              </p>
              <div className={`p-6 rounded-3xl border-2 border-dashed ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-2xl">🔑</div>
                  <code className="text-indigo-500 font-black text-xl tracking-widest">Hamstar[XX][Y]</code>
                </div>
                <ul className="space-y-3 text-xs font-bold text-slate-500">
                  <li className="flex items-start gap-2"><span className="text-indigo-500">XX</span> — Your 2-digit Party Code (11-99)</li>
                  <li className="flex items-start gap-2"><span className="text-indigo-500">Y</span> — Your 1-digit Admin ID (1-9)</li>
                  <li className="pt-2 text-[10px] text-emerald-500 opacity-80 italic">Example: "Hamstar121" creates Community #12 for Admin #1.</li>
                </ul>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
              <svg className="relative w-full h-auto" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="50" y="50" width="300" height="200" rx="40" fill={isDark ? "#1e293b" : "#f1f5f9"} stroke="#6366f1" strokeWidth="4" />
                <rect x="80" y="90" width="240" height="40" rx="12" fill={isDark ? "#0f172a" : "#fff"} stroke="#e2e8f0" strokeWidth="2" />
                <circle cx="100" cy="110" r="8" fill="#6366f1" />
                <rect x="120" y="105" width="180" height="10" rx="5" fill="#6366f1" opacity="0.2" />
                <rect x="80" y="150" width="240" height="60" rx="12" fill="#6366f1" />
                <text x="135" y="187" fill="white" font-family="Outfit" font-weight="900" font-size="14">ESTABLISH HUB</text>
              </svg>
            </div>
          </section>

          {/* Section 2: Invites */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2 space-y-6">
              <div className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Step 02: Expansion</div>
              <h3 className="text-3xl font-black tracking-tight">Intelligent Invites</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Once your hub is live, access the sidebar. The "INVITE" button generates a unique, deep-linking URL that bypasses the manual search for your community.
              </p>
              <div className={`p-4 rounded-2xl flex items-center gap-4 ${isDark ? 'bg-slate-800' : 'bg-indigo-50'}`}>
                <div className="p-3 bg-white rounded-xl shadow-sm">🔗</div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black text-indigo-500 truncate">connectorpro.io/#/party/12/Biz-Hub</p>
                </div>
              </div>
            </div>
            <div className="lg:order-1">
              <div className={`p-8 rounded-[3rem] border shadow-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600"></div>
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-10 w-full bg-indigo-500 rounded-xl flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Copy Magic Link</span>
                  </div>
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Capabilities */}
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <h3 className="text-3xl font-black tracking-tight">Admin Capabilities</h3>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Your Command Center</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: "📁", title: "Folder Control", desc: "Create, rename, or terminate community sub-folders to keep users organized." },
                { icon: "📌", title: "Pinned Intel", desc: "Publish 'Instruction Boxes' that stay fixed at the top of every folder for rules." },
                { icon: "🛡️", title: "Profile Management", desc: "Admins have master-edit rights over any profile in their specific community." }
              ].map((cap, i) => (
                <div key={i} className={`p-8 rounded-[2.5rem] border transition-all hover:scale-105 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-lg'}`}>
                  <div className="text-4xl mb-6">{cap.icon}</div>
                  <h4 className="text-xl font-black mb-3">{cap.title}</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{cap.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Footer CTA */}
          <footer className="pt-8 text-center border-t border-slate-100 dark:border-slate-800">
             <button 
              onClick={onClose}
              className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all uppercase tracking-widest text-sm"
             >
               Understood, Let's Build.
             </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AdminDocs;
