import { Children, cloneElement, isValidElement, useEffect, useId, useRef, type ReactElement, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Info, LoaderCircle, X, type LucideIcon } from 'lucide-react';
import { money, pnlClass } from '../lib/format';
import type { Currency } from '../lib/types';

let modalStack: string[] = [];
let previousOverflow = '';
export function Modal({ title, subtitle, children, onClose, className = '', zIndex = 100 }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; className?: string; zIndex?: number }) {
  const id = useId(), ref = useRef<HTMLDivElement>(null), closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    if (!modalStack.length) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    modalStack.push(id);
    const timer = setTimeout(() => { const first = ref.current?.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? ref.current?.querySelector<HTMLElement>('button'); first?.focus(); }, 40);
    const keydown = (e: KeyboardEvent) => {
      if (modalStack.at(-1) !== id) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') {
        const items = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? [])].filter(el => el.offsetParent !== null);
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', keydown); modalStack = modalStack.filter(m => m !== id); if (!modalStack.length) document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [id]);
  return <div className="modal-backdrop" style={{ zIndex }} onMouseDown={e => { if (e.target === e.currentTarget && modalStack.at(-1) === id) onClose(); }}>
    <div className={`modal ${className}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <header className="modal-header"><div><h2 id={`${id}-title`}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Tutup dialog"><X size={21} /></button></header>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}
export function Button({ children, variant = 'primary', icon: Icon, loading, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: LucideIcon; loading?: boolean }) {
  return <button className={`btn ${variant} ${className}`} {...props} disabled={props.disabled || loading}>{loading ? <LoaderCircle size={17} className="spin" /> : Icon ? <Icon size={17} /> : null}{children}</button>;
}
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{children && <div className="page-actions">{children}</div>}</div>;
}
export function Card({ title, subtitle, actions, children, className = '' }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{(title || actions) && <header className="card-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{actions}</header>}{children}</section>;
}
export function Money({ value, currency = 'IDR', sign = false, colored = false, compact = false }: { value: number | null | undefined; currency?: Currency; sign?: boolean; colored?: boolean; compact?: boolean }) {
  return <span className={`money-sensitive ${colored ? pnlClass(value) : ''}`}>{value !== undefined && value !== null && sign && value > 0 ? '+' : ''}{money(value, currency, compact)}</span>;
}
export function StatCard({ label, value, detail, icon: Icon, tone = '', children }: { label: string; value: ReactNode; detail?: ReactNode; icon: LucideIcon; tone?: string; children?: ReactNode }) {
  return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18} /></span></div><div className="stat-value">{value}</div>{detail && <div className="stat-detail">{detail}</div>}{children}</div>;
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function DirectionBadge({ direction }: { direction: 'long' | 'short' }) { return <Badge tone={direction === 'long' ? 'green' : 'red'}>{direction === 'long' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{direction === 'long' ? 'Long / Beli' : 'Short / Jual'}</Badge>; }
export function EmptyState({ icon: Icon, title, description, action, compact = false }: { icon: LucideIcon; title: string; description: string; action?: ReactNode; compact?: boolean }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}><span className="empty-icon"><Icon size={27} strokeWidth={1.6} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Field({ label, hint, error, children, required, className = '' }: { label: string; hint?: string; error?: string; children: ReactNode; required?: boolean; className?: string }) {
  const id = useId();
  const descriptionId = `${id}-description`;
  let foundControl = false;
  const controls = Children.map(children, child => {
    if (!foundControl && isValidElement(child) && typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type)) {
      foundControl = true;
      return cloneElement(child as ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>, {
        id, 'aria-describedby': hint || error ? descriptionId : undefined, 'aria-invalid': error ? true : undefined,
      });
    }
    return child;
  });
  const simple = foundControl;
  const control = simple ? controls : children;
  return <div className={`field ${error ? 'has-error' : ''} ${className}`}>
    <label className="field-label" htmlFor={simple ? id : undefined} id={`${id}-label`}>{label}{required && <span className="required"> *</span>}</label>
    {simple ? control : <div role="group" aria-labelledby={`${id}-label`} aria-describedby={hint || error ? descriptionId : undefined}>{control}</div>}
    {error ? <span id={descriptionId} className="field-error" role="alert">{error}</span> : hint ? <span id={descriptionId} className="field-hint">{hint}</span> : null}
  </div>;
}
export function InlineNotice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' | 'danger' }) { return <div className={`inline-notice ${tone}`}><Info size={17} /><div>{children}</div></div>; }
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button className="text-link" onClick={onClick}>{children}<ChevronRight size={15} /></button>; }
export function LoadingScreen() { return <div className="boot-screen"><LoaderCircle size={32} className="spin" /><h2>Menyiapkan ruang trading Anda…</h2><p>Data tetap berada di perangkat ini.</p></div>; }
export function ProgressBar({ value, tone = '' }: { value: number; tone?: string }) { return <div className={`progress-track ${tone}`} role="progressbar" aria-valuenow={Math.round(Math.min(100, Math.max(0, value)))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
