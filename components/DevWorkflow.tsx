
import React, { useState, useRef } from 'react';
import { useApp } from '../App';
import { Card, InstructionBox } from '../types';
import { upsertCard, upsertInstruction, deleteInstruction, resetAllData } from '../db';
import UserCard from './UserCard';
import { SYSTEM_PARTY_ID } from '../db';

const DevWorkflow: React.FC<{ folderId: string | null }> = ({ folderId }) => {
  const { cards, instructions, activeParty, showToast, theme, folders, logout } = useApp();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Fix: filter by folder_id to match Card and InstructionBox types
  const folderCards = cards.filter(c => c.folder_id === folderId);
  const folderInstructions = instructions.filter(i => i.folder_id === folderId);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setActiveDragId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current || !activeDragId) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    const card = folderCards.find(c => c.id === activeDragId);
    if (card) {
      await upsertCard({ ...card, x, y }, true);
    } else {
      const box = folderInstructions.find(i => i.id === activeDragId);
      if (box) {
        await upsertInstruction({ ...box, x, y });
      }
    }
    setActiveDragId(null);
  };

  const addInstructionBox = async () => {
    if (!activeParty || !folderId) return;
    
    const currentFolder = folders.find(f => f.id === folderId);
    // Fix: access party_id instead of partyId to match Folder type
    const targetPartyId = currentFolder?.party_id === SYSTEM_PARTY_ID ? SYSTEM_PARTY_ID : activeParty.id;

    // Fix: property names in InstructionBox object to match types.ts
    const newBox: InstructionBox = {
      id: 'box-' + Math.random().toString(36).substr(2, 9),
      folder_id: folderId,
      party_id: targetPartyId,
      content: '## System Instructions\n1. Connect with **Key Members**\n2. Maintain **Engagement**\n3. Grow Universally',
      x: 50,
      y: 50,
      width: 320,
      height: 200
    };
    try {
      await upsertInstruction(newBox);
      showToast("Instruction Window Added");
    } catch (err) {
      showToast(err, "error");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("CRITICAL ACTION: This will delete ALL communities, users, profiles, and notifications permanently. Are you absolutely sure?")) return;
    
    try {
      showToast("Initiating wipe sequence...");
      await resetAllData();
      showToast("System Purged. Restarting...");
      setTimeout(() => {
        logout();
        window.location.reload();
      }, 2000);
    } catch (err) {
      showToast("Reset failed: " + err, "error");
    }
  };

  const updateBoxContent = async (id: string, content: string) => {
    const box = folderInstructions.find(i => i.id === id);
    if (box) {
      await upsertInstruction({ ...box, content });
    }
  };

  const renderContent = (text: any) => {
    let contentStr = "";
    if (typeof text === 'string') {
      contentStr = text;
    } else if (text?.message) {
      contentStr = text.message;
    } else if (text) {
      try {
        contentStr = JSON.stringify(text);
      } catch {
        contentStr = String(text);
      }
    }

    const parts = contentStr.split('\n');
    const boldRegex = /\*\*(.*?)\*\*/g;

    return parts.map((line, i) => {
      if (line.trim().startsWith('## ')) {
        return <h2 key={i} className="text-[#00ff9d] text-2xl font-black mb-4 mt-6 first:mt-0 uppercase tracking-tighter">{line.replace('## ', '').trim()}</h2>;
      }
      
      const segments = line.split(boldRegex);
      const formatted = segments.map((segment, index) => {
        if (index % 2 === 1) return <b key={index} className="text-[#2563eb] dark:text-[#60a5fa] font-black">{segment}</b>;
        return segment;
      });
      return <p key={i} className="text-sm leading-relaxed mb-2 opacity-90 font-medium">{formatted}</p>;
    });
  };

  if (!folderId) return null;

  return (
    <div 
      ref={canvasRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative w-full h-[3000px] rounded-[3rem] border-4 border-dashed transition-all duration-500 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
    >
      <div className="sticky top-6 left-6 z-50 flex flex-col sm:flex-row gap-4 pointer-events-none">
        <button 
          onClick={addInstructionBox}
          className="pointer-events-auto bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-emerald-500/30 text-xs uppercase tracking-widest flex items-center gap-3 transform transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          New System Message
        </button>
        <button 
          onClick={handleReset}
          className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-red-500/30 text-xs uppercase tracking-widest flex items-center gap-3 transform transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Reset Everything
        </button>
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 px-6 py-4 rounded-2xl text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] flex items-center shadow-2xl border-l-4 border-l-emerald-500">
          Architect Console: Design Global Community Workflows
        </div>
      </div>

      {folderCards.map(card => (
        <div 
          key={card.id}
          draggable
          onDragStart={(e) => handleDragStart(e, card.id)}
          className="absolute cursor-move transition-transform active:scale-[1.05] z-20 group"
          style={{ left: card.x || 0, top: card.y || 0, width: '280px' }}
        >
          <UserCard card={card} onEdit={() => {}} />
          <div className="absolute -top-3 -right-3 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
          </div>
        </div>
      ))}

      {folderInstructions.map(box => (
        <div 
          key={box.id}
          draggable
          onDragStart={(e) => handleDragStart(e, box.id)}
          className={`absolute p-10 rounded-[3rem] border-2 shadow-2xl transition-all cursor-move z-10 overflow-hidden ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100 backdrop-blur-md'}`}
          style={{ left: box.x, top: box.y, width: `${box.width}px`, minHeight: `${box.height}px` }}
        >
          <div className="absolute top-6 right-6 flex gap-2">
            <button 
              onClick={() => deleteInstruction(box.id)}
              className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <div className="relative">
            <textarea
              className={`w-full bg-transparent border-none outline-none font-mono text-[10px] opacity-10 focus:opacity-100 hover:opacity-100 transition-opacity p-4 rounded-3xl resize-none ${isDark ? 'text-white bg-slate-800' : 'text-slate-900 bg-slate-100'}`}
              value={box.content}
              onChange={(e) => updateBoxContent(box.id, e.target.value)}
              placeholder="System Markdown..."
              rows={4}
            />
            <div className="mt-8 pointer-events-none select-none">
              {renderContent(box.content)}
            </div>
          </div>
          {/* Fix: access party_id instead of partyId to match InstructionBox type */}
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.4em] opacity-30 whitespace-nowrap ${box.party_id === SYSTEM_PARTY_ID ? 'text-emerald-500' : 'text-slate-500'}`}>
            {box.party_id === SYSTEM_PARTY_ID ? 'GLOBAL_SYSTEM_UI' : 'LOCAL_NODE_UI'}::{box.id.split('-')[1]}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DevWorkflow;
