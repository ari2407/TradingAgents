import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, CircleHelp, ClipboardList, Eye, EyeOff, HardDrive, LayoutDashboard, Menu, Moon, MoreHorizontal, Plus, Settings2, ShieldCheck, SlidersHorizontal, Sun, Wallet, WifiOff, X } from 'lucide-react';
import { useApp } from '../stores/AppContext';
import { usePlatform } from '../hooks/usePlatform';
import { dateLabel } from '../lib/format';
import { friendlyError } from '../lib/schemas';
import { LoadingScreen } from './ui';

const navigation = [
  { to: '/', label: 'Ringkasan', icon: LayoutDashboard, group: 0 },
  { to: '/trades', label: 'Daftar trade', icon: ClipboardList, group: 0 },
  { to: '/calendar', label: 'Kalender trading', icon: CalendarDays, group: 0 },
  { to: '/analytics', label: 'Analisis performa', icon: ChartNoAxesCombined, group: 0 },
  { to: '/strategies', label: 'Strategi & checklist', icon: SlidersHorizontal, group: 1 },
  { to: '/notes', label: 'Jurnal & review', icon: BookOpen, group: 1 },
  { to: '/tools', label: 'Kalkulator risiko', icon: ShieldCheck, group: 1 },
  { to: '/accounts', label: 'Akun trading', icon: Wallet, group: 2 },
  { to: '/settings', label: 'Pengaturan & backup', icon: Settings2, group: 2 },
];
export function AppShell() {
  const { data, setSettings, notify } = useApp();
  const { online, offlineReady, native } = usePlatform();
  const navigate = useNavigate(), location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false), [sidebarOpen, setSidebarOpen] = useState(false);
  const current = navigation.find(n => n.to === location.pathname) ?? navigation[0];
  useEffect(() => { setMoreOpen(false); setSidebarOpen(false); window.scrollTo({ top: 0 }); document.title = `${current.label} · TradingAgents Journal`; }, [location.pathname, current.label]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => Promise<void>) | undefined; let cancelled = false;
    import('@capacitor/app').then(({ App }) => App.addListener('backButton', () => {
      if (document.querySelector('[role="dialog"]')) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else if (location.pathname !== '/') navigate('/');
      else void App.exitApp();
    })).then(listener => { if (cancelled) void listener.remove(); else remove = () => listener.remove(); });
    return () => { cancelled = true; void remove?.(); };
  }, [location.pathname, navigate]);
  if (!data) return <LoadingScreen />;
  const { settings, account, accounts } = data;
  const initials = settings.displayName ? settings.displayName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'TR';
  const changeTheme = () => { void setSettings({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' }).catch(e => notify(friendlyError(e), 'error')); };
  const navItems = (group: number) => navigation.filter(n => n.group === group).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} strokeWidth={1.7} /><span>{label}</span>{to === '/trades' && <span className="nav-count">{data.trades.filter(t => t.accountId === account.id).length}</span>}</NavLink>);
  return <div className="app-layout" data-privacy={settings.hideBalances}>
    <a href="#main-content" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>Langsung ke konten</a>
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Tutup navigasi" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <NavLink to="/" className="brand" aria-label="TradingAgents Journal beranda"><span className="brand-mark"><ChartNoAxesCombined size={24} strokeWidth={2.4} /></span><span>TradingAgents<small>JOURNAL</small></span></NavLink>
      <button className="sidebar-add" onClick={() => navigate('/trades?new=1')}><Plus size={19} />Catat trade<span>+</span></button>
      <div className="nav-section-label">RUANG TRADING</div><nav aria-label="Navigasi utama">{navItems(0)}</nav>
      {['catatan', 'pengaturan'].map((group, i) => <div key={group}><div className="nav-section-label">{i === 0 ? 'BERTUMBUH LEBIH BAIK' : 'PENGELOLAAN'}</div><nav aria-label={i === 0 ? 'Alat jurnal' : 'Pengelolaan'}>{navItems(i + 1)}</nav></div>)}
      <div className="sidebar-bottom"><div className="local-card"><span className="local-card-icon"><ShieldCheck size={21} /></span><div><strong>Privasi Anda, terjaga.</strong><p>Data tersimpan di perangkat.<br />Tanpa login. Tanpa cloud.</p></div><span className="status-dot" /></div><button className="sidebar-help" onClick={() => navigate('/settings?tab=guide')}><CircleHelp size={17} />Panduan memulai<ArrowUpRight size={15} /></button><div className="sidebar-version"><span>TradingAgents Journal</span><span>v1.0.0</span></div></div>
    </aside>
    <div className="main-wrapper">
      <header className="topbar">
        <div className="breadcrumb"><button className="icon-btn mobile-menu" aria-label="Buka navigasi" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><span className="breadcrumb-home">Ruang trading</span><span className="breadcrumb-divider">/</span><strong>{current.label}</strong></div>
        <div className="topbar-actions"><span className={`connection-status ${online ? '' : 'offline'}`}>{online ? <span className="status-dot" /> : <WifiOff size={13} />}{native ? 'Aplikasi lokal' : online ? offlineReady ? 'Siap offline' : 'Menyiapkan offline' : 'Mode offline'}</span><div className="account-switch"><Wallet size={16} /><select aria-label="Pilih akun trading" value={account.id} onChange={e => void setSettings({ activeAccountId: e.target.value }).catch(err => notify(friendlyError(err), 'error'))}>{accounts.filter(a => !a.archived || a.id === account.id).map(a => <option value={a.id} key={a.id}>{a.name} · {a.currency}{a.archived ? ' (arsip)' : ''}</option>)}</select><ChevronDown size={13} /></div><span className="topbar-separator" /><button className="icon-btn" title={settings.hideBalances ? 'Tampilkan nominal' : 'Sembunyikan nominal'} aria-label={settings.hideBalances ? 'Tampilkan nominal' : 'Sembunyikan nominal'} onClick={() => void setSettings({ hideBalances: !settings.hideBalances })}>{settings.hideBalances ? <Eye size={18} /> : <EyeOff size={18} />}</button><button className="icon-btn theme-toggle" aria-label="Ganti tema terang atau gelap" onClick={changeTheme}>{document.documentElement.dataset.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><button className="avatar" aria-label="Buka profil dan pengaturan" onClick={() => navigate('/settings')}>{initials}</button></div>
      </header>
      {!online && <div className="offline-banner"><WifiOff size={15} />Anda sedang offline. Trade, jurnal, dan analisis tetap bisa digunakan.<Check size={15} /></div>}
      <main id="main-content" className="main-content" tabIndex={-1}><div className="page-context"><span>{dateLabel(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span><HardDrive size={12} />LOCAL-FIRST JOURNAL</span></div><Outlet /><footer className="page-footer"><span><ShieldCheck size={13} />Catatan kecil. Keputusan yang lebih baik.</span><span>Bukan saran investasi · Selalu kelola risiko</span></footer></main>
    </div>
    <nav className="bottom-nav" aria-label="Navigasi ponsel"><NavLink to="/" end><LayoutDashboard size={21} /><span>Ringkasan</span></NavLink><NavLink to="/trades"><ClipboardList size={21} /><span>Trade</span></NavLink><button className="bottom-add" aria-label="Catat trade baru" onClick={() => navigate('/trades?new=1')}><span><Plus size={25} /></span><small>Catat</small></button><NavLink to="/notes"><BookOpen size={21} /><span>Jurnal</span></NavLink><button className={moreOpen ? 'active' : ''} onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={22} /><span>Lainnya</span></button></nav>
    {moreOpen && <div className="more-backdrop" onClick={() => setMoreOpen(false)}><section className="more-sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle" /><div className="sheet-heading"><h2>Jelajahi jurnal Anda</h2><button className="icon-btn" aria-label="Tutup menu" onClick={() => setMoreOpen(false)}><X size={20} /></button></div>{navigation.filter(n => !['/', '/trades', '/notes'].includes(n.to)).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={21} />{label}<ArrowUpRight size={17} /></NavLink>)}</section></div>}
  </div>;
}
