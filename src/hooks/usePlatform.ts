import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferredPrompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e as InstallPrompt; listeners.forEach(fn => fn()); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; listeners.forEach(fn => fn()); });
}
export function usePlatform() {
  const [online, setOnline] = useState(navigator.onLine);
  const [installable, setInstallable] = useState(!!deferredPrompt);
  const [offlineReady, setOfflineReady] = useState(Capacitor.isNativePlatform() || !!navigator.serviceWorker?.controller);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  useEffect(() => {
    const update = () => setOnline(navigator.onLine), install = () => setInstallable(!!deferredPrompt);
    window.addEventListener('online', update); window.addEventListener('offline', update); listeners.add(install);
    if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(() => setOfflineReady(true)).catch(() => undefined);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); listeners.delete(install); };
  }, []);
  const install = async () => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice;
    deferredPrompt = null; setInstallable(false); return choice.outcome;
  };
  return { online, offlineReady, installable, install, standalone, native: Capacitor.isNativePlatform() };
}
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
