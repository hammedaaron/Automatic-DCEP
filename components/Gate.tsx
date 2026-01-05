
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { getParties, validateAdminPassword, validateDevPassword, registerParty, loginUser, registerUser, checkUserExists, findPartyByName, ensureDevUser, getFingerprint, isUserBanned } from '../db';
import LandingPage from './LandingPage';
import AdminDocs from './AdminDocs';
import UserDocs from './UserDocs';

interface GateProps {
  onAuth: (user: User) => void;
}

const Gate: React.FC<GateProps> = ({ onAuth }) => {
  const [mode, setMode] = useState<'land' | 'admin-signup' | 'login' | 'success'>('land');
  const [partyName, setPartyName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminDocs, setShowAdminDocs] = useState(false);
  const [showUserDocs, setShowUserDocs] = useState(false);
  
  // Slot visibility state
  const [showSlotStatus, setShowSlotStatus] = useState(false);
  const [existingParties, setExistingParties] = useState<any[]>([]);

  const fetchExistingParties = async () => {
    try {
      const parties = await getParties();
      setExistingParties(parties);
    } catch (err) {
      console.error("Failed to fetch slots");
    }
  };

  useEffect(() => {
    if (mode === 'admin-signup' || mode === 'login') {
      fetchExistingParties();
    }
  }, [mode]);

  // Calculate the 11-99 range (excluding zeros as per regex)
  const slots = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= 9; i++) {
      for (let j = 1; j <= 9; j++) {
        const id = `${i}${j}`;
        const party = existingParties.find(p => p.id === id);
        arr.push({ id, taken: !!party, name: party?.name || null });
      }
    }
    return arr;
  }, [existingParties]);

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (username !== 'Admin') throw new Error("Admin username must be 'Admin'.");
      await registerParty(partyName, password, timezone);
      setMode('success');
    } catch (err: any) {
      setError(err.message || "Failed to create community.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (cleanUsername === 'Dev' && validateDevPassword(cleanPassword)) {
      try {
        const devUser = await ensureDevUser();
        onAuth(devUser);
        return;
      } catch (err) {
        setError("Dev Init Failed.");
        setIsLoading(false);
        return;
      }
    }

    const cleanPartyName = partyName.trim();
    if (!cleanPartyName) {
      setError("Enter Hub Name.");
      setIsLoading(false);
      return;
    }

    try {
      const activeParty = await findPartyByName(cleanPartyName);
      if (!activeParty) {
        setError("Hub not found.");
        setIsLoading(false);
        return;
      }

      const banned = await isUserBanned(activeParty.id, cleanUsername);
      if (banned) {
        setError("ACCESS TERMINATED: Identity blacklisted for engagement violations.");
        setIsLoading(false);
        return;
      }

      const user = await loginUser(cleanUsername, cleanPassword, activeParty.id);
      const fingerprint = await getFingerprint();

      if (user) {
        onAuth({ ...user, device_fingerprint: fingerprint });
      } else {
        const adminInfo = validateAdminPassword(cleanPassword);
        
        if (adminInfo && cleanUsername === 'Admin') {
          if (adminInfo.partyId === activeParty.id) {
            const adminId = `admin-${adminInfo.partyId}-${adminInfo.adminId}`;
            const newAdmin: User = {
              id: adminId,
              name: 'Admin',
              admin_code: cleanPassword,
              role: UserRole.ADMIN,
              party_id: activeParty.id,
              device_fingerprint: fingerprint
            };
            await registerUser(newAdmin);
            onAuth(newAdmin);
            return;
          }
        }

        const exists = await checkUserExists(cleanUsername, activeParty.id);
        if (exists) {
          setError("Invalid credentials.");
        } else {
          const newUser: User = {
            id: Math.random().toString(36).substr(2, 9),
            name: cleanUsername,
            password: cleanPassword,
            role: UserRole.REGULAR,
            party_id: activeParty.id,
            device_fingerprint: fingerprint
          };
          await registerUser(newUser);
          onAuth(newUser);
        }
      }
    } catch (err: any) {
      setError("Auth failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto custom-scrollbar">
      {showAdminDocs && <AdminDocs onClose={() => setShowAdminDocs(false)} />}
      {showUserDocs && <UserDocs onClose={() => setShowUserDocs(false)} />}
      
      <div className="relative min-h-screen flex flex-col items-center justify-start py-10">
        {mode === 'land' ? (
          <LandingPage 
            onCreate={() => { setMode('admin-signup'); setPartyName(''); setError(''); }}
            onJoin={() => { setMode('login'); setError(''); }}
          />
        ) : (
          <div className="w-full max-w-xl px-4 animate-in fade-in zoom-in-95 duration-500">
            <form onSubmit={mode === 'admin-signup' ? handleAdminSignup : handleLogin} className="bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-white">{mode === 'admin-signup' ? 'Establish Hub' : 'Verify Identity'}</h2>
                {mode === 'admin-signup' && (
                  <button 
                    type="button"
                    onClick={() => setShowSlotStatus(!showSlotStatus)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${showSlotStatus ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    {showSlotStatus ? 'Hide Slots' : 'Check Available Slots'}
                  </button>
                )}
              </div>

              {/* Slot Availability Visualizer */}
              {mode === 'admin-signup' && showSlotStatus && (
                <div className="p-6 bg-slate-950 rounded-[2rem] border border-slate-800 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global Hub Slot Map</p>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black text-slate-500 uppercase">Open</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[8px] font-black text-slate-500 uppercase">Signed</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-9 gap-1.5">
                    {slots.map(slot => (
                      <div 
                        key={slot.id} 
                        title={slot.taken ? `Signed: ${slot.name}` : `Available: Slot ${slot.id}`}
                        className={`aspect-square rounded flex items-center justify-center text-[8px] font-black transition-all ${slot.taken ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'}`}
                      >
                        {slot.id}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[8px] text-center text-slate-600 font-bold uppercase tracking-widest">Pick an open ID to use in your Architect Password</p>
                </div>
              )}
              
              <div className="space-y-4">
                <input placeholder="Hub Name" value={partyName} onChange={e => setPartyName(e.target.value)}
                  className="w-full bg-slate-800 border-slate-700 text-white rounded-2xl px-6 py-4 font-bold outline-none border transition-all" disabled={isLoading} />
                
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white rounded-2xl px-6 py-4 font-bold outline-none border transition-all" disabled={isLoading} />
                  <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white rounded-2xl px-6 py-4 font-bold outline-none border transition-all" disabled={isLoading} />
                </div>
              </div>

              <div className="flex justify-center">
                {mode === 'admin-signup' ? (
                  <button 
                    type="button"
                    onClick={() => setShowAdminDocs(true)}
                    className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Admin Guide & Token Docs
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setShowUserDocs(true)}
                    className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    View User Manual
                  </button>
                )}
              </div>
              
              {error && <p className="text-red-500 text-[10px] font-black uppercase text-center bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</p>}
              
              <button disabled={isLoading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50">
                {isLoading ? (
                   <span className="flex items-center justify-center gap-2">
                     <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     Initializing...
                   </span>
                ) : mode === 'admin-signup' ? 'Establish Hub' : 'Enter Portal'}
              </button>
              <button type="button" onClick={() => setMode('land')} className="w-full text-slate-500 font-bold text-[10px] uppercase">Abort Access</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gate;
