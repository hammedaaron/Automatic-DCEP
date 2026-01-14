
import React, { useMemo } from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';
import { getRewardTier } from '../db';

const LeaderboardTable: React.FC = () => {
  const { cards, follows, theme, currentUser } = useApp();
  const isDark = theme === 'dark';

  const { displayStats, myStats, myRank } = useMemo(() => {
    const statsMap = new Map<string, { userId: string, name: string, engagement: number, followsReceived: number, followsGiven: number, role: UserRole }>();

    cards.forEach(card => {
      if (!statsMap.has(card.user_id)) {
        statsMap.set(card.user_id, { 
          userId: card.user_id, 
          name: card.display_name, 
          engagement: 0, 
          followsReceived: 0, 
          followsGiven: 0,
          role: card.creator_role
        });
      }
    });

    follows.forEach(follow => {
      const giver = statsMap.get(follow.follower_id);
      if (giver) {
        giver.followsGiven++;
        giver.engagement++;
      }

      const targetCard = cards.find(c => c.id === follow.target_card_id);
      if (targetCard) {
        const receiver = statsMap.get(targetCard.user_id);
        if (receiver) {
          receiver.followsReceived++;
          receiver.engagement++;
        }
      }
    });

    const allSorted = Array.from(statsMap.values())
      .sort((a, b) => b.engagement - a.engagement);

    const myRankIdx = allSorted.findIndex(s => s.userId === currentUser?.id);
    const myStats = currentUser ? statsMap.get(currentUser.id) : null;

    // Show all roles in the leaderboard for full transparency
    const displayStats = allSorted;

    return { 
      displayStats, 
      myStats, 
      myRank: myRankIdx !== -1 ? myRankIdx + 1 : null 
    };
  }, [cards, follows, currentUser]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {myStats && (
        <div className={`p-6 lg:p-8 rounded-[2.5rem] border-2 shadow-2xl relative overflow-hidden transition-all ${isDark ? 'bg-slate-900/50 border-indigo-500/30' : 'bg-white border-indigo-100'}`}>
          <div className="flex flex-col md:flex-row items-center gap-6 lg:gap-10 relative z-10">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Current Tier</span>
              <div className="text-4xl">{getRewardTier(myStats.engagement).icon}</div>
              <p className={`text-[10px] font-black uppercase mt-2 ${getRewardTier(myStats.engagement).color}`}>
                {getRewardTier(myStats.engagement).level}
              </p>
            </div>
            
            <div className="h-px w-full md:h-16 md:w-px bg-slate-200 dark:bg-slate-800" />
            
            <div className="flex-1 text-center md:text-left">
              <h4 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {myStats.name} <span className="text-indigo-500 text-xs font-bold uppercase ml-2">RANK #{myRank}</span>
              </h4>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                Identity Matrix: Verified Active
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <p className="text-xl font-black text-indigo-500">{myStats.engagement}</p>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-emerald-500">{myStats.followsReceived}</p>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Inbound</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-indigo-400">{myStats.followsGiven}</p>
                <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Outbound</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="p-6 lg:p-8 border-b border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div>
              <h3 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Member Standings</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live competitive ranking by contribution</p>
           </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`text-[10px] font-black uppercase tracking-widest border-b ${isDark ? 'bg-slate-950 text-slate-500 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
              <tr>
                <th className="p-6">Rank</th>
                <th className="p-6">Member</th>
                <th className="p-6">Tier</th>
                <th className="p-6 text-right">Engagement Score</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
              {displayStats.length > 0 ? displayStats.map((stat, index) => {
                const isMe = stat.userId === currentUser?.id;
                const tier = getRewardTier(stat.engagement);
                const isAdminNode = stat.role === UserRole.ADMIN || stat.role === UserRole.DEV;

                return (
                  <tr key={stat.userId} className={`group transition-all ${isMe ? 'bg-indigo-500/10' : 'hover:bg-indigo-500/5'}`}>
                    <td className="p-6">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                        index === 0 ? 'bg-amber-500 text-white' : 
                        index === 1 ? 'bg-slate-300 text-slate-900' : 
                        index === 2 ? 'bg-orange-400 text-white' : 
                        isMe ? 'bg-indigo-600 text-white' :
                        isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <div className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.name}</div>
                          {isMe && <span className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm">You</span>}
                        </div>
                        {isAdminNode && (
                          <span className={`text-[8px] font-black uppercase tracking-widest ${stat.role === UserRole.DEV ? 'text-emerald-500' : 'text-orange-500'}`}>
                            {stat.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{tier.icon}</span>
                        <span className={`font-black text-[10px] uppercase tracking-widest ${tier.color}`}>{tier.level}</span>
                      </div>
                    </td>
                    <td className="p-6 font-black text-indigo-500 text-lg text-right">{stat.engagement}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                    No engagement data recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardTable;
