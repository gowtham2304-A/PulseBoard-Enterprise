import React, { useState, useEffect } from 'react';
import { X, GitBranch, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, ExternalLink } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://pulseboard-enterprise.onrender.com/api';

export function SourceControlModal({ isOpen, onClose, onConnectionUpdated }) {
  const [provider, setProvider] = useState('github');

  // GitHub Fields
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghToken, setGhToken] = useState('');

  // GitLab Fields
  const [glUrl, setGlUrl] = useState('https://gitlab.com');
  const [glProjectId, setGlProjectId] = useState('');
  const [glToken, setGlToken] = useState('');

  // Connection State
  const [status, setStatus] = useState('idle'); // idle | testing | success | error | saving | saved
  const [statusMessage, setStatusMessage] = useState('');
  const [verifiedRepo, setVerifiedRepo] = useState(null);

  // Fetch current connection status from server on modal open
  useEffect(() => {
    if (isOpen) {
      fetchConnectionStatus();
    }
  }, [isOpen]);

  async function fetchConnectionStatus() {
    try {
      const res = await fetch(`${API_BASE}/integrations/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.connection) {
          setProvider(data.connection.provider || 'github');
          if (data.connection.repository) {
            setVerifiedRepo(data.connection.repository);
            if (data.connection.status === 'connected') {
              setStatus('success');
              setStatusMessage(`Connected to ${data.connection.provider.toUpperCase()} repository "${data.connection.repository.id}"`);
            }
          }
        }
      }
    } catch (e) {
      console.log('[PulseBoard] Could not load connection status.');
    }
  }

  async function handleTestConnection() {
    setStatus('testing');
    setStatusMessage('Authenticating with source control server...');
    setVerifiedRepo(null);

    const config = provider === 'github'
      ? { owner: ghOwner, repo: ghRepo, token: ghToken }
      : { projectId: glProjectId, token: glToken, url: glUrl };

    try {
      const res = await fetch(`${API_BASE}/integrations/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, config })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setStatusMessage(data.message || 'Connection test successful!');
        setVerifiedRepo(data.repository);
      } else {
        setStatus('error');
        setStatusMessage(data.message || 'Connection test failed. Check credentials.');
      }
    } catch (err) {
      setStatus('error');
      setStatusMessage(`Network error connecting to backend API: ${err.message}`);
    }
  }

  async function handleSaveConnection() {
    if (!verifiedRepo) return;
    setStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/integrations/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          repository: verifiedRepo
        })
      });

      if (res.ok) {
        setStatus('saved');
        setStatusMessage('Connection verified and saved! Restart PulseBoard server to begin background monitoring for this repository.');
        if (onConnectionUpdated) onConnectionUpdated();
        setTimeout(() => setStatus('success'), 3000);
      } else {
        setStatus('error');
        setStatusMessage('Failed to save connection metadata.');
      }
    } catch (err) {
      setStatus('error');
      setStatusMessage('Error saving connection metadata.');
    }
  }

  function handleDisconnect() {
    setStatus('idle');
    setStatusMessage('Disconnected.');
    setVerifiedRepo(null);
    setGhToken('');
    setGlToken('');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Source Control Integration</h2>
              <p className="text-xs text-slate-500">Connect PulseBoard to your code repository server</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Provider Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Source Control Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setStatus('idle');
                setStatusMessage('');
                setVerifiedRepo(null);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
            </select>
          </div>

          {/* GitHub Form Fields */}
          {provider === 'github' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                GitHub Repository Configuration
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner / Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. gowtham2304-A"
                  value={ghOwner}
                  onChange={(e) => setGhOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. exchnage"
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Requires <code className="bg-slate-200 px-1 rounded text-slate-700">repo</code> read access. Leave blank to use server environment variables.
                </p>
              </div>
            </div>
          )}

          {/* GitLab Form Fields */}
          {provider === 'gitlab' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                GitLab Project Configuration
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GitLab Instance URL
                </label>
                <input
                  type="url"
                  placeholder="https://gitlab.com"
                  value={glUrl}
                  onChange={(e) => setGlUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports GitLab.com or self-hosted enterprise URLs (e.g. <code className="bg-slate-200 px-1 rounded text-slate-700">https://gitlab.company.com</code>).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Project ID or Encoded Path
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345678 or group/project"
                  value={glProjectId}
                  onChange={(e) => setGlProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  GitLab Project ID number or full path string (e.g. <code className="bg-slate-200 px-1 rounded text-slate-700">group/my-project</code>).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GitLab Personal / Project Access Token
                </label>
                <input
                  type="password"
                  placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                  value={glToken}
                  onChange={(e) => setGlToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Requires <code className="bg-slate-200 px-1 rounded text-slate-700">read_repository</code> or <code className="bg-slate-200 px-1 rounded text-slate-700">api</code> scope.
                </p>
              </div>
            </div>
          )}

          {/* Status Message & Verified Repository Info */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                status === 'success' || status === 'saved'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : status === 'error'
                  ? 'bg-rose-50 text-rose-900 border border-rose-200'
                  : status === 'testing' || status === 'saving'
                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {status === 'testing' || status === 'saving' ? (
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
              ) : status === 'success' || status === 'saved' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : status === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : null}
              <div className="flex-1">
                <p className="font-semibold">{statusMessage}</p>
                {verifiedRepo && (
                  <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 font-mono text-[11px] space-y-0.5 text-emerald-950">
                    <div>Repository ID: <strong>{verifiedRepo.id}</strong></div>
                    <div>Repository Name: <strong>{verifiedRepo.name}</strong></div>
                    {verifiedRepo.url && (
                      <div className="flex items-center gap-1">
                        <span>URL:</span>
                        <a href={verifiedRepo.url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-0.5 text-emerald-700">
                          {verifiedRepo.url} <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tokens are sent directly over secure API connections and never stored in cleartext.</span>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-200/60 font-semibold text-xs transition-all"
          >
            Disconnect
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={status === 'testing' || status === 'saving'}
              className="px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-all disabled:opacity-50"
            >
              {status === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              onClick={handleSaveConnection}
              disabled={!verifiedRepo || status === 'saving'}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved ✓' : 'Save Connection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
