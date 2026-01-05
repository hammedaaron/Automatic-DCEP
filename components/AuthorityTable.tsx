
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { getAuthorityData, deleteParty, deleteUser, resetAllData, SYSTEM_PARTY_ID, getRewardTier, expelAndBanUser, updatePartyParkingStatus, getHubCycleInfo } from '../db';
import { Party, User, Folder, Card, Follow, UserRole } from '../types';
import { useApp } from '../App';

const AuthorityTable: React.FC = () => {
  const { showToast, logout, theme, isAdmin, activeParty } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showGlobalParking, setShowGlobalParking] = useState(false);
  const [showRowParkingId, setShowRowParkingId] = useState<string | null>(null);
  const [showCycleStatus, setShowCycleStatus] = useState(false);

  const globalParkingRef = useRef<HTMLDivElement>(null);
  const rowParkingRef = useRef<HTMLDivElement>(null);
  const cycleRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const res = await getAuthorityData();
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (globalParkingRef.current && !globalParkingRef.current.contains(event.target as Node)) {
        setShowGlobalParking(false);
      }
      if (rowParkingRef.current && !rowParkingRef.current.contains(event.target as Node)) {
        setShowRowParkingId(null);
      }
      if (cycleRef.current && !cycleRef.current.contains(event.target as Node)) {
        setShowCycleStatus(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cycleInfo = useMemo(() => getHubCycleInfo(activeParty), [activeParty]);

  const auditData = useMemo(() => {
    if (!data) return [];
    return data.users
      .filter((u: User) => u.role !== UserRole.DEV)
      .map((user: User) => {
        const outbound = data.follows ? data.follows.filter((f: Follow) => f.follower_id === user.id).length : 0;
        const inbound = data.follows ? data.follows.filter((f: Follow) => 
          data.cards.find((c: Card) => c.id === f.target_card_id)?.user_id === user.id
        ).length : 0;

        const gap = inbound - outbound; 
        const score = inbound + outbound;
        const tier = getRewardTier(score);

        return {
          ...user,
          inbound,
          outbound,
          gap,
          score,
          tier
        };
      }).sort((a: any, b: any) => b.score - a.score);
  }, [data]);

  const partyStats = useMemo(() => {
    if (!data || !data.parties) return [];
    return data.parties.map((p: Party) => {
      const usersInParty = data.users.filter((u: User) => u.party_id === p.id && u.role !== UserRole.DEV).length;
      const maxSlots = p.max_slots || 50;
      return {
        ...p,
        used: usersInParty,
        available: Math.max(0, maxSlots - usersInParty)
      };
    });
  }, [data]);

  const toggleParkingFeature = async () => {
    if (!activeParty) return;
    const newState = !activeParty.is_parking_enabled;
    try {
      await updatePartyParkingStatus(activeParty.id, newState);
      showToast(newState ? "Parking Portal: ENABLED" : "Parking Portal: DISABLED");
      refreshData();
    } catch (err) {
      showToast("Sync Error", "error");
    }
  };

  const handleManualExpel = async (user: User) => {
    if (window.confirm(`FORCE TERMINATE: Blacklist and expel ${user.name}?`)) {
      await expelAndBanUser(user);
      showToast(`User ${user.name} blacklisted.`);
      refreshData();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="space-y-8 sm:space-y-12 pb-32 max-w-full overflow-x-hidden">
      {/* HEADER CONTROLS */}
      <header className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-none truncate">Architect Hub</h2>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3 truncate">Central Management & Enforcement</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
               {/* Protocol Status Dropdown - REFINED UI */}
               <div className="relative" ref={cycleRef}>
                 <button 
                  onClick={() => setShowCycleStatus(!showCycleStatus)}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest transition-all border-2 flex items-center gap-2.5 ${
                    showCycleStatus 
                    ? 'bg-amber-500 border-amber-400 text-white shadow-lg' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-amber-500/50'
                  }`}
                 >
                   <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <span className="truncate">Matrix Timers</span>
                 </button>

                 {showCycleStatus && (
                   <div className="absolute top-12 sm:top-16 left-0 sm:right-0 sm:left-auto z-[200] w-[300px] sm:w-80 glass-card p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 slide-in-from-top-4 duration-300">
                     <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                       <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] truncate">Control Protocol</p>
                       <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                     </div>
                     
                     <div className="space-y-6">
                       {/* Current Window Status */}
                       <div>
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Live Environment</p>
                         {cycleInfo.activeSession ? (
                           <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl relative overflow-hidden group transition-all hover:bg-emerald-500/15">
                             <div className="absolute top-0 right-0 p-2 opacity-20"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg></div>
                             <p className="text-[10px] font-black text-emerald-400 uppercase truncate mb-1">{cycleInfo.activeSession.name}</p>
                             <div className="flex items-baseline gap-1.5">
                               <p className="text-2xl font-black text-white leading-none">{cycleInfo.activeSession.remaining}</p>
                               <span className="text-[8px] font-black text-emerald-500 uppercase">Minutes Remaining</span>
                             </div>
                           </div>
                         ) : (
                           <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-center">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Environmental Idle State</p>
                           </div>
                         )}
                       </div>

                       {/* Next Entry Notification */}
                       {cycleInfo.nextSession && (
                         <div>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Next Operational Window</p>
                           <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl group transition-all hover:bg-indigo-500/15">
                             <p className="text-[10px] font-black text-indigo-400 uppercase truncate mb-1">{cycleInfo.nextSession.name}</p>
                             <div className="flex items-baseline gap-1.5">
                               <span className="text-[8px] font-black text-indigo-500 uppercase">Commences In</span>
                               <p className="text-2xl font-black text-white leading-none">{cycleInfo.nextSession.countdown}</p>
                               <span className="text-[8px] font-black text-indigo-500 uppercase">Mins</span>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* Global Hub Wipe Indicator */}
                       <div className="pt-2 border-t border-white/5">
                         <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">System Cleanse Schedule</p>
                         <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between group transition-all hover:bg-red-500/15">
                           <div className="min-w-0">
                             <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter truncate">HUB WIPE @ {cycleInfo.resetTimeFormatted}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 truncate">Executing In {cycleInfo.resetIn} Minutes</p>
                           </div>
                           <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/20 shrink-0"></div>
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
               </div>

               {/* Parking Feature Toggle */}
               <button 
                onClick={toggleParkingFeature}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest transition-all border-2 truncate ${
                  activeParty?.is_parking_enabled 
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {activeParty?.is_parking_enabled ? 'Parking: ACTIVE' : 'Parking: IDLE'}
              </button>

              <button onClick={refreshData} className="px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-800 text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest border border-slate-700 hover:bg-slate-700 transition-colors shrink-0">Sync Hub</button>
          </div>
        </div>
      </header>

      {/* MATRIX TABLE */}
      <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
        <div className="p-6 sm:p-10 border-b border-slate-800 bg-gradient-to-r from-indigo-500/10 to-transparent flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-white font-black uppercase tracking-[0.2em] text-xs sm:text-sm truncate">Node Accountability Matrix</h3>
            <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-widest font-black mt-2 truncate">Real-time engagement audit & verification stream</p>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-slate-950/50 text-slate-500 uppercase font-black tracking-[0.25em] text-[8px] sm:text-[9px]">
              <tr className="border-b border-slate-800/50">
                <th className="p-6 sm:p-8">Identity Node</th>
                <th className="p-6 sm:p-8">Outbound</th>
                <th className="p-6 sm:p-8">Inbound</th>
                <th className="p-6 sm:p-8">Matrix Gap</th>
                <th className="p-6 sm:p-8">Warnings</th>
                <th className="p-6 sm:p-8 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {auditData.map((member: any) => (
                <tr key={member.id} className="hover:bg-white/[0.03] group transition-colors">
                  <td className="p-6 sm:p-8">
                    <div className="flex flex-col gap-3 relative">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl sm:text-3xl shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{member.tier.icon}</div>
                        <div className="min-w-0">
                          <div className="font-black text-white text-sm sm:text-base truncate group-hover:text-indigo-400 transition-colors">{member.name}</div>
                          <div className={`text-[8px] font-black uppercase tracking-widest mt-1 truncate ${member.tier.color}`}>
                            {member.tier.level} Protocol Active
                          </div>
                        </div>
                      </div>
                      
                      {activeParty?.is_parking_enabled && (
                        <div className="relative" ref={rowParkingRef}>
                          <button 
                            onClick={() => setShowRowParkingId(showRowParkingId === member.id ? null : member.id)}
                            className="bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all w-fit"
                          >
                            Verify Slot
                          </button>
                          
                          {showRowParkingId === member.id && (
                            <div className="absolute top-10 left-0 z-[100] w-64 glass-card p-5 rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 truncate border-b border-white/5 pb-2">Node Verification</p>
                              <div className="space-y-2.5">
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase flex items-center justify-between">
                                  <span>SLOT STATUS</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold text-slate-400 uppercase">
                                  Community: {member.party_id === SYSTEM_PARTY_ID ? 'GLOBAL ARCHIVE' : 'POD SPECIFIC'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-6 sm:p-8">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-indigo-400 text-base">{member.outbound}</span>
                      <svg className="w-4 h-4 text-indigo-500 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </div>
                  </td>
                  <td className="p-6 sm:p-8">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-400 text-base">{member.inbound}</span>
                      <svg className="w-4 h-4 text-emerald-500 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    </div>
                  </td>
                  <td className="p-6 sm:p-8">
                    <span className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-2 ${
                      member.gap > 3 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-slate-800/50 text-slate-500'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${member.gap > 3 ? 'bg-red-500' : 'bg-slate-600'}`}></span>
                      {member.gap > 0 ? `+${member.gap} LEACH` : 'STABLE'}
                    </span>
                  </td>
                  <td className="p-6 sm:p-8">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((dot) => (
                        <div 
                          key={dot} 
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-500 ${
                            dot <= (member.engagement_warnings || 0) 
                              ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse' 
                              : 'bg-slate-800'
                          }`} 
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-6 sm:p-8 text-right">
                    <button 
                      onClick={() => handleManualExpel(member)}
                      className="opacity-100 sm:opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                    >
                      Expel Node
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* GLOBAL HUD STATS - REFINED GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
         <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a7 7 0 00-7 7v1h11v-1a7 7 0 00-7-7z" /></svg></div>
            <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 truncate">Total Identity Nodes</p>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white truncate leading-none">{data?.users.filter((u: any) => u.role !== UserRole.DEV).length || 0}</p>
         </div>
         <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg></div>
            <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 truncate">Hub Clusters Active</p>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white truncate leading-none">{data?.parties.length || 0}</p>
         </div>
         <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg></div>
            <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 truncate">Blacklisted Nodes</p>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-red-500 truncate leading-none">{data?.banned.length || 0}</p>
         </div>
         <div className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-indigo-600 to-indigo-800 border border-indigo-500 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity"><svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg></div>
            <p className="text-[8px] sm:text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-2 truncate">Engagements Logged</p>
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white truncate leading-none">{data?.follows.length || 0}</p>
         </div>
      </div>
    </div>
  );
};

export default AuthorityTable;
