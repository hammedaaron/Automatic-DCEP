
import React, { useState, useEffect } from 'react';
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

      // Hard Ban Check
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
              <h2 className="text-3xl font-black text-white">{mode === 'admin-signup' ? 'Architect Hub' : 'Verify Identity'}</h2>
              
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
