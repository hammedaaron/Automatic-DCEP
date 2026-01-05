
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Party } from '../types';
import { getParties, validateAdminPassword, validateDevPassword, registerParty, loginUser, registerUser, checkUserExists, findPartyByName, findParty, ensureDevUser, getFingerprint, isUserBanned, checkDatabaseHealth } from '../db';
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
  const [matrixStatus, setMatrixStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  // Restoration of Hub Discovery logic for Genesis mode
  const [showHubDiscovery, setShowHubDiscovery] = useState(false);
  const [existingParties, setExistingParties] = useState<Party[]>([]);

  useEffect(() => {
    const checkHealth = async () => {
      const health = await checkDatabaseHealth();
      setMatrixStatus(health.ok ? 'connected' : 'error');
    };
    checkHealth();
  }, []);

  const fetchExistingParties = async () => {
    try {
      const parties = await getParties();
      setExistingParties(parties);
    } catch (err) {
      console.error("Failed to fetch hubs");
    }
  };

  useEffect(() => {
    if (mode === 'admin-signup') {
      fetchExistingParties();
    }
  }, [mode]);

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
    const cleanPartyName = partyName.trim();

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

    try {
      let activeParty: Party | null = null;
      const adminInfo = validateAdminPassword(cleanPassword);

      if (adminInfo && cleanUsername === 'Admin') {
        activeParty = await findParty(adminInfo.partyId);
      } else if (cleanPartyName) {
        activeParty = await findPartyByName(cleanPartyName);
      }

      if (!activeParty) {
        setError("Hub not found. Establish it first.");
        setIsLoading(false);
        return;
      }

      const banned = await isUserBanned(activeParty.id, cleanUsername);
      if (banned) {
        setError("ACCESS TERMINATED: Identity blacklisted.");
        setIsLoading(false);
        return;
      }

      const user = await loginUser(cleanUsername, cleanPassword, activeParty.id);
      const fingerprint = await getFingerprint();

      if (user) {
        onAuth({ ...user, device_fingerprint: fingerprint });
      } else {
        if (adminInfo && cleanUsername === 'Admin' && adminInfo.partyId === activeParty.id) {
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
        } else {
          const exists = await checkUserExists(cleanUsername, activeParty.id);
          if (exists) {
            setError("Credentials rejected.");
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
      }
    } catch (err: any) {
      setError(`Matrix Connection Interrupted: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto custom-scrollbar flex flex-col items-center">
      {showAdminDocs && <AdminDocs onClose={() => setShowAdminDocs(false)} />}
      {showUserDocs && <UserDocs onClose={() => setShowUserDocs(false)} />}
      
      <div className="relative w-full min-h-screen flex flex-col items-center justify-start py-8 sm:py-10">
        {mode === 'land' ? (
          <LandingPage 
            onCreate={() => setMode('admin-signup')}
            onJoin={() => setMode('login')}
            matrixStatus={matrixStatus}
          />
        ) : mode === 'success' ? (
          <div className="w-full max-w-xl px-4 text-center space-y-8 animate-in zoom-in-95 duration-500">
             <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
               <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
             </div>
             <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Hub Initialized</h2>
             <p className="text-slate-400 font-medium">Community established in the Matrix. Access and invite your nodes now.</p>
             <button onClick={() => setMode('login')} className="px-12 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-sm">Access Command Center</button>
          </div>
        ) : (
          <div className="w-full max-w-xl px-4 animate-in fade-in zoom-in-95 duration-500 pb-20">
            <button onClick={() => setMode('land')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Abort Procedure</span>
            </button>

            <form onSubmit={mode === 'admin-signup' ? handleAdminSignup : handleLogin} className="bg-slate-900 border border-slate-800 p-6 sm:p-10 rounded-[2.5rem] shadow-2xl space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{mode === 'admin-signup' ? 'Hub Genesis' : 'Infiltrate Hub'}</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Identity verification required</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <input required placeholder="Community Hub Name" value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500 transition-all" />
                  {mode === 'admin-signup' && (
                    <button type="button" onClick={() => setShowHubDiscovery(!showHubDiscovery)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-500 uppercase tracking-tighter hover:text-white">Explore Matrix</button>
                  )}
                </div>

                {mode === 'admin-signup' && showHubDiscovery && (
                  <div className="grid grid-cols-9 gap-1 p-4 bg-slate-950 rounded-2xl border border-slate-800 animate-in zoom-in-95 shadow-inner">
                    {slots.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => s.taken && setPartyName(s.name!)}
                        className={`aspect-square rounded-sm border transition-all cursor-pointer flex items-center justify-center text-[8px] font-black ${s.taken ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-700 hover:border-slate-500'}`}
                        title={s.taken ? `Occupied: ${s.name}` : `Slot ${s.id} Vacant`}
                      >
                        {s.id}
                      </div>
                    ))}
                  </div>
                )}

                <input required placeholder="Identity Name (Username)" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500 transition-all" />
                <input required type="password" placeholder="Access Protocol (Password)" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500 transition-all" />
              </div>

              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-xl text-center leading-relaxed">{error}</div>}

              <button disabled={isLoading} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-sm disabled:opacity-50">
                {isLoading ? 'Verifying...' : mode === 'admin-signup' ? 'Establish Hub' : 'Infiltrate'}
              </button>

              <div className="flex justify-between px-2">
                <button type="button" onClick={() => mode === 'login' ? setShowUserDocs(true) : setShowAdminDocs(true)} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400">View Protocol Docs</button>
                <button type="button" onClick={() => setMode(mode === 'login' ? 'admin-signup' : 'login')} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-white">
                  {mode === 'login' ? 'Establish New Hub' : 'Enter Existing Hub'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gate;
