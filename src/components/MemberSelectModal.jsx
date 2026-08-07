import React, { useState } from 'react';
import { Crown, Plus, CheckCircle2, Users, X } from 'lucide-react';

export const INITIAL_DEMO_MEMBERS = [
  {
    id: 'gowtham',
    name: 'Gowtham',
    role: 'Engineering Manager',
    isManager: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    color: 'border-blue-500 bg-blue-50 text-blue-700'
  },
  {
    id: 'khidmat',
    name: 'Khidmat',
    role: 'Developer (Technical)',
    isManager: false,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    color: 'border-blue-500 bg-blue-50 text-blue-700'
  },
  {
    id: 'vansh',
    name: 'Vansh',
    role: 'Developer (Technical)',
    isManager: false,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    color: 'border-blue-500 bg-blue-50 text-blue-700'
  }
];

export function MemberSelectModal({ isOpen, onClose, currentUser, onSelectUser, members, onAddMember }) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');

  if (!isOpen) return null;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const createdMember = {
      id: Date.now().toString(),
      name: newName.trim(),
      role: newRole.trim() || 'Developer',
      isManager: false,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
      color: 'border-blue-500 bg-blue-50 text-blue-700'
    };
    onAddMember(createdMember);
    onSelectUser(createdMember);
    setNewName('');
    setNewRole('');
    setIsAddingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-heading text-slate-900">Select Active Identity</h2>
              <p className="text-xs text-slate-500">Switch role for this device session</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {members.map((member) => {
            const isSelected = currentUser?.id === member.id;
            return (
              <div
                key={member.id}
                onClick={() => {
                  onSelectUser(member);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-heading text-slate-900">
                        {member.name}
                      </span>
                      {member.isManager && (
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full border border-amber-300 bg-amber-50 text-amber-700 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-500" />
                          Manager
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{member.role}</div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active User</span>
                  </div>
                ) : (
                  <button className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs text-slate-700 font-medium shadow-2xs">
                    Access as {member.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {isAddingNew ? (
          <form onSubmit={handleAddSubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Add New Team Member:</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Member Name"
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                required
              />
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Role (e.g. Developer)"
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                Save & Switch
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingNew(true)}
            className="w-full py-2 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-all bg-slate-50/50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Member</span>
          </button>
        )}
      </div>
    </div>
  );
}
