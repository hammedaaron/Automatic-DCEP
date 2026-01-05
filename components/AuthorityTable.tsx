
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { getAuthorityData, deleteParty, deleteUser, resetAllData, SYSTEM_PARTY_ID, getRewardTier, expelAndBanUser, updatePartyParkingStatus } from '../db';
import { Party, User, Folder, Card, Follow } from '../types';
import { useApp } from '../App';

const AuthorityTable: React.FC = () => {
  const { showToast, logout, theme, isAdmin, activeParty } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showGlobalParking, setShowGlobalParking] = useState(false);
  const [showRowParkingId, setShowRowParkingId] = useState<string | null>(null);

  const globalParkingRef = useRef<HTMLDivElement>(null);
  const rowParkingRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const auditData = useMemo(() => {
    if (!data) return [];
    return data.users.map((user: User) => {
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
      const usersInParty = data.users.filter((u: User) => u.party_id === p.id).length;
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
    <div className="space-y-12 pb-32">
      {/* HEADER CONTROLS */}
      <header className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Architect Hub</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Central Management & Parking Enforcement</p>
          </div>

          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-3">
               {/* Parking Feature Toggle */}
               <button 
                onClick={toggleParkingFeature}
                className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${
                  activeParty?.is_parking_enabled 
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {activeParty?.is_parking_enabled ? 'Parking: ACTIVE' : 'Parking: DISABLED'}
              </button>

              {/* Check Available Parking Button */}
              <div className="relative" ref={globalParkingRef}>
                <button 
                  onClick={() => setShowGlobalParking(!showGlobalParking)}
                  className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${
                    showGlobalParking 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500'
                  }`}
                >
                  Check Available Parking
                </button>
                
                {showGlobalParking && (
                  <div className="absolute top-14 right-0 z-[200] w-80 glass-card p-6 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global Slot Distribution</span>
                      <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px] font-black">{partyStats.length} HUBs</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {partyStats.map((p: any) => (
                        <div key={p.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white truncate max-w-[150px]">{p.name}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${p.available > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                              {p.available > 0 ? 'Vacant' : 'Full'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${p.available > 5 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                              style={{ width: `${(p.used / (p.max_slots || 50)) * 100}%` }} 
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-bold text-slate-500">
                            <span>{p.used} SIGNED</span>
                            <span>{p.available} AVAILABLE</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={refreshData} className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs border border-slate-700 hover:bg-slate-700 transition-colors">Sync Matrix</button>
            </div>
          </div>
        </div>
      </header>

      {/* MATRIX TABLE */}
      <section className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-indigo-500/10 flex items-center justify-between">
           <div>
             <h3 className="text-white font-black uppercase tracking-widest text-sm">Member Accountability Stream</h3>
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Status checks placed above member ratings</p>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-500 uppercase font-black tracking-widest text-[9px]">
              <tr>
                <th className="p-6">Parking / Node Rating</th>
                <th className="p-6">Outbound Engagement</th>
                <th className="p-6">Inbound Support</th>
                <th className="p-6">Support Gap</th>
                <th className="p-6">Strikes</th>
                <th className="p-6">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditData.map((member: any) => (
                <tr key={member.id} className="hover:bg-white/5 group transition-colors">
                  <td className="p-6">
                    <div className="flex flex-col gap-3 relative">
                      {/* Per-User Parking Check (Placed Above Rating) */}
                      {activeParty?.is_parking_enabled && (
                        <div className="relative" ref={rowParkingRef}>
                          <button 
                            onClick={() => setShowRowParkingId(showRowParkingId === member.id ? null : member.id)}
                            className="bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all w-fit"
                          >
                            Check Available Parking
                          </button>
                          
                          {showRowParkingId === member.id && (
                            <div 
                              className="absolute top-10 left-0 z-[100] w-64 glass-card p-4 rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
                            >
                              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Node Parking Status</span>
                              </div>
                              <div className="space-y-2">
                                <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-slate-300">
                                  Current Hub: {member.party_id === SYSTEM_PARTY_ID ? 'UNIVERSAL' : 'LOCAL POD'}
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase">
                                  SLOT STATUS: SIGNED & ACTIVE
                                </div>
                                <p className="text-[8px] text-slate-500 font-bold italic text-center mt-2">Identity verified next to architect home</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{member.tier.icon}</div>
                        <div>
                          <div className="font-black text-white text-sm">{member.name}</div>
                          <div className={`text-[8px] font-black uppercase tracking-tighter ${member.tier.color}`}>
                            {member.tier.level} Tier Rating
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-indigo-400 text-sm">{member.outbound}</span>
                      <svg className="w-3 h-3 text-indigo-500 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-emerald-400 text-sm">{member.inbound}</span>
                      <svg className="w-3 h-3 text-emerald-500 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1.5 rounded-xl font-black text-[10px] ${
                      member.gap > 3 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {member.gap > 0 ? `+${member.gap} LEACH GAP` : 'STABLE MATRIX'}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((dot) => (
                        <div 
                          key={dot} 
                          className={`w-3 h-3 rounded-full transition-all ${
                            dot <= (member.engagement_warnings || 0) 
                              ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse' 
                              : 'bg-slate-800'
                          }`} 
                        />
                      ))}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button 
                      onClick={() => handleManualExpel(member)}
                      className="opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
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

      {/* GLOBAL HUD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Hub Members</p>
            <p className="text-3xl font-black text-white">{data?.users.length || 0}</p>
         </div>
         <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Signed Communities</p>
            <p className="text-3xl font-black text-white">{data?.parties.length || 0}</p>
         </div>
         <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Blacklisted Identity</p>
            <p className="text-3xl font-black text-red-500">{data?.banned.length || 0}</p>
         </div>
         <div className="p-8 rounded-[2.5rem] bg-indigo-600 border border-indigo-500 shadow-indigo-500/20 shadow-2xl">
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Matrix Engagements</p>
            <p className="text-3xl font-black text-white">{data?.follows.length || 0}</p>
         </div>
      </div>
    </div>
  );
};

export default AuthorityTable;
