import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { db, initializeDatabase } from '../lib/db';
import { friendlyError } from '../lib/schemas';
import type { Account, Attachment, JournalNote, Settings, Strategy, Trade } from '../lib/types';
import { Modal } from '../components/ui';

interface Data { accounts: Account[]; trades: Trade[]; strategies: Strategy[]; notes: JournalNote[]; attachments: Attachment[]; settings: Settings; account: Account }
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }
interface ConfirmOptions { title: string; message: string; label?: string; danger?: boolean; requireText?: string }
interface AppContextValue {
  data: Data | null; loading: boolean; error: string; notify: (message: string, type?: Toast['type']) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  setSettings: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>;
}
const Context = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const [confirmation, setConfirmation] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  useEffect(() => { initializeDatabase().then(() => setReady(true)).catch(e => setError(friendlyError(e))); }, []);
  const result = useLiveQuery(async (): Promise<Data | null> => {
    if (!ready) return null;
    try {
    const [accounts, trades, strategies, notes, attachments, settings] = await Promise.all([db.accounts.toArray(), db.trades.toArray(), db.strategies.toArray(), db.notes.toArray(), db.attachments.toArray(), db.settings.get('preferences')]);
    if (!settings) return null;
    const account = accounts.find(a => a.id === settings.activeAccountId) ?? accounts.find(a => !a.archived) ?? accounts[0];
    return account ? { accounts, trades, strategies, notes, attachments, settings, account } : null;
    } catch (e) { setError(friendlyError(e)); return null; }
  }, [ready], null);
  const notify = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++nextId.current; setToasts(t => [...t.slice(-3), { id, message, type }]);
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === 'error' ? 10000 : 5000);
  }, []);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => { setConfirmationText(''); setConfirmation({ ...options, resolve }); }), []);
  const finishConfirm = (value: boolean) => { confirmation?.resolve(value); setConfirmation(null); };
  const setSettings = useCallback(async (patch: Partial<Omit<Settings, 'id'>>) => { await db.settings.update('preferences', patch); }, []);
  useEffect(() => {
    const theme = result?.settings.theme ?? 'light';
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme; };
    apply(); mq.addEventListener('change', apply); return () => mq.removeEventListener('change', apply);
  }, [result?.settings.theme]);
  return <Context.Provider value={{ data: result, loading: !result, error, notify, confirm, setSettings }}>
    {error && !result ? <div className="boot-screen"><AlertCircle size={40} /><h1>Penyimpanan belum bisa dibuka</h1><p>{error}</p><p>Pastikan browser mengizinkan penyimpanan situs. Jangan hapus data situs sebelum membuat backup.</p><button className="btn primary" onClick={() => location.reload()}>Coba lagi</button></div> : children}
    <div className="toast-stack" aria-live="polite" aria-atomic="false">{toasts.map(t => <div className={`toast ${t.type}`} key={t.id} role={t.type === 'error' ? 'alert' : 'status'}>{t.type === 'success' ? <CheckCircle2 size={20} /> : t.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}<span>{t.message}</span><button className="icon-btn" aria-label="Tutup notifikasi" onClick={() => setToasts(s => s.filter(x => x.id !== t.id))}><X size={16} /></button></div>)}</div>
    {confirmation && <Modal title={confirmation.title} onClose={() => finishConfirm(false)} className="confirm-modal" zIndex={200}>
      <div className={`confirm-symbol ${confirmation.danger ? 'danger' : ''}`}><AlertCircle size={26} /></div><p className="confirm-message">{confirmation.message}</p>
      {confirmation.requireText && <label className="field">Ketik <strong>{confirmation.requireText}</strong> untuk melanjutkan<input autoFocus value={confirmationText} onChange={e => setConfirmationText(e.target.value)} autoComplete="off" /></label>}
      <div className="modal-actions"><button className="btn secondary" onClick={() => finishConfirm(false)}>Batal</button><button className={`btn ${confirmation.danger ? 'danger' : 'primary'}`} disabled={!!confirmation.requireText && confirmationText !== confirmation.requireText} onClick={() => finishConfirm(true)}>{confirmation.label || 'Lanjutkan'}</button></div>
    </Modal>}
  </Context.Provider>;
}
export function useApp() { const context = useContext(Context); if (!context) throw new Error('AppProvider tidak tersedia.'); return context; }
