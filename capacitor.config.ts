import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.ari2407.tradingagentsjournal',
  appName: 'TradingAgents Journal',
  webDir: 'dist',
  backgroundColor: '#f5f7f8',
  android: { backgroundColor: '#f5f7f8', allowMixedContent: false, webContentsDebuggingEnabled: false },
  server: { androidScheme: 'https' },
};
export default config;
