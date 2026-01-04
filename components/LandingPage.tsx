
import React from 'react';

interface LandingPageProps {
  onCreate: () => void;
  onJoin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onCreate, onJoin }) => {
  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 pt-4 lg:pt-6 pb-20 space-y-12 lg:space-y-20 overflow-x-hidden">
      
      {/* BRAND HEADER */}
      <header className="flex justify-center mb-2 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="group flex items-center gap-3 py-2 px-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md transition-all hover:border-indigo-500/50">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform">
            C
          </div>
          <div className="flex flex-col items-start leading-none">
            <h2 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.15em] brand-glow">
              Community Engagement Pro - <span className="text-indigo-400">DCEP</span>
            </h2>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="text-center space-y-6 lg:space-y-8 animate-in fade-in zoom-in-95 duration-1000">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
          Accountability-Driven POD Infrastructure
        </div>
        
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[1.05] lg:leading-[1] lg:max-w-5xl mx-auto">
          Turn Support Groups Into <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-emerald-400">Growth Machines.</span>
        </h1>
        
        <p className="text-slate-400 text-base sm:text-lg lg:text-xl max-w-3xl mx-auto font-medium leading-relaxed px-2">
          DCEP is the system serious communities use to guarantee real engagement — not empty promises and ghost members.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 px-4 sm:px-0">
          <button 
            onClick={onCreate}
            className="w-full sm:w-auto px-8 lg:px-10 py-4 lg:py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-xs lg:text-sm"
          >
            Create a POD
          </button>
          <button 
            onClick={onJoin}
            className="w-full sm:w-auto px-8 lg:px-10 py-4 lg:py-5 bg-slate-900 border border-slate-800 text-white font-black rounded-2xl hover:border-emerald-500 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-xs lg:text-sm"
          >
            Join an Active POD
          </button>
        </div>

        {/* Visual Mockup */}
        <div className="relative mt-8 lg:mt-12 group px-2 lg:px-0">
          <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] lg:blur-[100px] rounded-full group-hover:bg-indigo-500/30 transition-all"></div>
          <div className="relative glass-card border border-white/10 rounded-[2rem] lg:rounded-[3rem] p-4 lg:p-8 shadow-2xl overflow-hidden aspect-video max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4 lg:mb-6 border-b border-white/5 pb-4">
              <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-emerald-500/50"></div>
              <div className="ml-2 lg:ml-4 h-3 lg:h-4 w-32 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <span className="text-[6px] font-black text-emerald-400 uppercase tracking-widest">LIVE SCOREBOARD</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className={`h-16 lg:h-24 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-2`} style={{ opacity: 1 - (i * 0.1) }}>
                   <div className="w-6 h-6 rounded bg-indigo-500/20"></div>
                   <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: PAIN POINTS */}
      <section className="space-y-12 lg:space-y-16 px-2">
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight leading-tight">Engagement Is Broken.<br/><span className="text-red-500">And It’s Costing You Reach.</span></h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] lg:text-xs">The Debt Collector Cycle Ends Now</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {[
            { icon: "📉", title: "Empty Promises", desc: "You like a post… but no one returns the favor. Trust is built on thin air." },
            { icon: "👻", title: "Ghosting PODs", desc: "You comment… but the POD disappears into chaos and noise." },
            { icon: "🏃", title: "DM Chasing", desc: "You chase people in DMs like a debt collector. High effort, zero visibility." }
          ].map((item, i) => (
            <div key={i} className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 space-y-4">
              <div className="text-3xl">{item.icon}</div>
              <h3 className="text-white font-black text-xl">{item.title}</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center pt-8">
           <div className="inline-block px-10 py-6 rounded-[2.5rem] bg-indigo-600 text-white font-black text-2xl tracking-tighter shadow-2xl shadow-indigo-500/20">
             DCEP fixes that.
           </div>
        </div>
      </section>

      {/* SECTION: VALUE PROP */}
      <section className="bg-slate-900 rounded-[3rem] lg:rounded-[4rem] p-8 lg:p-20 border border-slate-800 relative overflow-hidden text-center space-y-6 lg:space-y-8">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 to-transparent"></div>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter relative z-10 leading-[1.2]">From Chaos to Clarity</h2>
        <p className="text-slate-400 text-base lg:text-xl max-w-3xl mx-auto font-medium relative z-10">
          DCEP replaces blind trust with transparent proof. No more spreadsheets. No more guessing who’s slacking. No more chasing people. Just clear, visual accountability.
        </p>
      </section>

      {/* SECTION: HOW IT WORKS */}
      <section className="space-y-12 lg:space-y-16 px-2">
        <div className="text-center space-y-4">
          <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight">How It Works</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] lg:text-xs">The Enforcement Protocol</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Create a POD", desc: "Admins launch an engagement POD in 60s. Define platform, daily actions, and thresholds." },
            { step: "02", title: "Join the POD", desc: "Members enter a private workspace. Each has a live card showing posts and rank." },
            { step: "03", title: "Real-Time Tracking", desc: "Every action is logged. Admins see who engaged, who skipped, and who is falling behind." },
            { step: "04", title: "Scoring System", desc: "Members are ranked by consistency, speed, and contribution value. Top performers rise." },
            { step: "05", title: "Auto-Accountability", desc: "DCEP flags low performers and triggers warnings. The system handles removals automatically." }
          ].map((item, i) => (
            <div key={i} className="group p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] transition-all hover:border-emerald-500">
              <div className="text-emerald-500 font-black text-5xl mb-6 opacity-20 group-hover:opacity-100 transition-opacity tracking-tighter">{item.step}</div>
              <h3 className="text-white font-black text-xl mb-3">{item.title}</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
          <div className="flex items-center justify-center p-8 bg-indigo-600/10 border border-dashed border-indigo-500/30 rounded-[2.5rem]">
             <p className="text-indigo-400 font-black text-center text-sm uppercase tracking-widest">More accountability <br/> modules incoming</p>
          </div>
        </div>
      </section>

      {/* SECTION: TARGET AUDIENCE */}
      <section className="text-center py-12 lg:py-20 space-y-8 bg-gradient-to-b from-transparent to-slate-900/50 rounded-[4rem]">
        <h2 className="text-3xl lg:text-6xl font-black text-white tracking-tighter">Built for Leaders Who Hate Babysitting</h2>
        <p className="text-slate-400 text-base lg:text-xl max-w-3xl mx-auto font-medium">
          DCEP is not for hobby groups. It's for creator networks, social sellers, and visibility teams where engagement equals revenue.
        </p>
      </section>

      {/* SECTION: COMPARISON TABLE */}
      <section className="px-2">
        <div className="max-w-4xl mx-auto overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-950 shadow-2xl">
           <div className="p-8 border-b border-slate-800 bg-slate-900/50">
             <h3 className="text-xl font-black text-white uppercase tracking-widest text-center">Why DCEP Dominates</h3>
           </div>
           <table className="w-full text-left text-sm">
             <thead>
               <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                 <th className="p-6">Feature</th>
                 <th className="p-6 text-red-500">Old PODs</th>
                 <th className="p-6 text-emerald-500">DCEP</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800/50 font-bold text-slate-300">
               {[
                 { f: "Verification", old: "Trust-based", new: "Proof-based" },
                 { f: "Tracking", old: "Manual spreadsheets", new: "Live dashboards" },
                 { f: "Visibility", old: "Ghost members", new: "Visible performance" },
                 { f: "Governance", old: "Zero standards", new: "Automated enforcement" },
                 { f: "Effort", old: "Burnout admins", new: "System-run" }
               ].map((row, i) => (
                 <tr key={i} className="hover:bg-white/5 transition-colors">
                   <td className="p-6 text-slate-500 uppercase text-[10px]">{row.f}</td>
                   <td className="p-6 opacity-60">{row.old}</td>
                   <td className="p-6 text-white">{row.new}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="text-center space-y-10 lg:space-y-12 pb-12 lg:pb-20 px-4">
        <div className="space-y-4">
          <h2 className="text-4xl lg:text-7xl font-black text-white tracking-tighter leading-[1.1]">Fix the Problem Early.</h2>
          <p className="text-slate-400 text-base lg:text-xl max-w-2xl mx-auto font-medium">
            The bigger your group gets, the harder it becomes to manage. When accountability dies, engagement follows. Stop it now.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button 
            onClick={onCreate}
            className="w-full sm:w-auto px-12 py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 uppercase tracking-widest text-sm"
          >
            Create Your First POD
          </button>
          <button 
            onClick={onJoin}
            className="w-full sm:w-auto px-12 py-6 bg-white text-slate-950 font-black rounded-[2rem] hover:bg-slate-100 transition-all hover:scale-105 uppercase tracking-widest text-sm"
          >
            Join a Live POD
          </button>
        </div>

        {/* DEVELOPER CREDIT */}
        <div className="pt-20 border-t border-slate-900 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-slate-600 font-black text-[10px] uppercase tracking-[0.4em]">
            Developed by <span className="text-slate-400">HAMS☆R</span>
          </div>
          <div className="text-slate-700 text-[8px] font-bold uppercase tracking-widest">
            © 2024 Community Engagement Pro. All Rights Reserved.
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
