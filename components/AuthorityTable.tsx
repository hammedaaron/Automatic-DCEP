
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getAuthorityData, deleteParty, deleteUser, resetAllData, SYSTEM_PARTY_ID, getRewardTier, expelAndBanUser } from '../db';
import { Party, User, Folder, Card, Follow } from '../types';
import { useApp } from '../App';

const AuthorityTable: React.FC = () => {
  const { showToast, logout, theme, isAdmin, follows, cards } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const res = await getAuthorityData();
    setData(res);
    setLoading(false);
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

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
      <header className="flex flex-col gap-4">
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Accountability Matrix</h2>
        <div className="flex gap-4">
          <button onClick={refreshData} className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">Sync Audit Records</button>
        </div>
      </header>

      <section className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-indigo-500/10 flex items-center justify-between">
           <div>
             <h3 className="text-white font-black uppercase tracking-widest text-sm">Performance Audit Status</h3>
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">Real-time engagement verification</p>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-500 uppercase font-black tracking-widest text-[9px]">
              <tr>
                <th className="p-6">Member / Tier</th>
                <th className="p-6">Outbound (Gave)</th>
                <th className="p-6">Inbound (Got)</th>
                <th className="p-6">Support Gap</th>
                <th className="p-6">Warnings</th>
                <th className="p-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditData.map((member: any) => (
                <tr key={member.id} className="hover:bg-white/5 group transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{member.tier.icon}</div>
                      <div>
                        <div className="font-black text-white text-sm">{member.name}</div>
                        <div className={`text-[8px] font-black uppercase tracking-tighter ${member.tier.color}`}>
                          {member.tier.level} Tier
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
                      {member.gap > 0 ? `+${member.gap} GAP` : 'STABLE'}
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
                  <td className="p-6">
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

      {/* Global Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Hub Members</p>
            <p className="text-3xl font-black text-white">{data?.users.length || 0}</p>
         </div>
         <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Active Communities</p>
            <p className="text-3xl font-black text-white">{data?.parties.length || 0}</p>
         </div>
         <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Blacklisted Nodes</p>
            <p className="text-3xl font-black text-red-500">{data?.banned.length || 0}</p>
         </div>
         <div className="p-8 rounded-3xl bg-indigo-600 border border-indigo-500">
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Engagements Logged</p>
            <p className="text-3xl font-black text-white">{data?.follows.length || 0}</p>
         </div>
      </div>
    </div>
  );
};

export default AuthorityTable;
