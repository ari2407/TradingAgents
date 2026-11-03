import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles.css';
import { AppProvider } from './stores/AppContext';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/Dashboard';
import { TradesPage } from './pages/Trades';
import { CalendarPage } from './pages/Calendar';
import { AnalyticsPage } from './pages/Analytics';
import { StrategiesPage } from './pages/Strategies';
import { NotesPage } from './pages/Notes';
import { ToolsPage } from './pages/Tools';
import { AccountsPage } from './pages/Accounts';
import { SettingsPage } from './pages/Settings';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="boot-screen"><h1>Ada tampilan yang belum bisa dibuka.</h1><p>Data tersimpan Anda tidak dihapus. Muat ulang untuk mencoba lagi.</p><button className="btn primary" onClick={() => location.reload()}>Muat ulang aplikasi</button></div>;
    return this.props.children;
  }
}
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) registerSW({ immediate: true });
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><HashRouter><AppProvider><Routes><Route element={<AppShell />}><Route index element={<DashboardPage />} /><Route path="trades" element={<TradesPage />} /><Route path="calendar" element={<CalendarPage />} /><Route path="analytics" element={<AnalyticsPage />} /><Route path="strategies" element={<StrategiesPage />} /><Route path="notes" element={<NotesPage />} /><Route path="tools" element={<ToolsPage />} /><Route path="accounts" element={<AccountsPage />} /><Route path="settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes></AppProvider></HashRouter></ErrorBoundary></StrictMode>);
