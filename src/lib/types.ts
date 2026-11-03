export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR';
export type Market = 'Saham' | 'Crypto' | 'Forex' | 'Futures' | 'Lainnya';
export type Direction = 'long' | 'short';
export type Emotion = '' | 'tenang' | 'yakin' | 'ragu' | 'fomo' | 'takut' | 'balas-dendam' | 'lelah';
export interface Account {
  id: string; name: string; broker: string; currency: Currency;
  initialBalance: number; defaultFee: number; contractMultiplier: number;
  riskLimitPercent: number; dailyLossLimit: number; archived: boolean; createdAt: string;
}
export interface Strategy {
  id: string; name: string; description: string; timeframe: string;
  rules: string[]; riskNotes: string; archived: boolean; isExample: boolean; createdAt: string;
}
export interface ChecklistItem { id: string; text: string; checked: boolean }
export interface Attachment {
  id: string; name: string; mime: 'image/png' | 'image/jpeg' | 'image/webp';
  size: number; data: string; createdAt: string;
}
export interface Trade {
  id: string; accountId: string; strategyId?: string;
  symbol: string; market: Market; direction: Direction;
  openedAt: string; closedAt?: string;
  entryPrice: number; exitPrice?: number; quantity: number;
  stopLoss?: number; takeProfit?: number; fees: number;
  multiplier: number; leverage: number; tags: string[]; emotion: Emotion;
  setupNotes: string; exitNotes: string; lessons: string;
  checklist: ChecklistItem[]; attachmentIds: string[]; rating: number;
  createdAt: string; updatedAt: string;
}
export interface JournalNote {
  id: string; accountId: string; kind: 'daily' | 'weekly'; date: string;
  mood: Emotion; content: string; didWell: string; improve: string; nextPlan: string;
  discipline: number; createdAt: string; updatedAt: string;
}
export interface Settings {
  id: 'preferences'; displayName: string; activeAccountId: string;
  theme: 'light' | 'dark' | 'system'; defaultRiskPercent: number;
  hideBalances: boolean; lastBackupAt?: string;
}
export interface Draft { id: string; payload: unknown; updatedAt: string }
export interface BackupData {
  accounts: Account[]; strategies: Strategy[]; trades: Trade[];
  notes: JournalNote[]; attachments: Attachment[]; settings: Settings;
}
export interface Backup extends BackupData {
  app: 'tradingagents-journal'; version: 1; exportedAt: string; checksum: string;
}
export const MARKETS: Market[] = ['Saham', 'Crypto', 'Forex', 'Futures', 'Lainnya'];
export const CURRENCIES: Currency[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR'];
export const EMOTIONS: { value: Emotion; label: string }[] = [
  { value: '', label: 'Belum dipilih' }, { value: 'tenang', label: 'Tenang' },
  { value: 'yakin', label: 'Yakin & terencana' }, { value: 'ragu', label: 'Ragu-ragu' },
  { value: 'fomo', label: 'FOMO / takut ketinggalan' }, { value: 'takut', label: 'Takut / cemas' },
  { value: 'balas-dendam', label: 'Ingin balas dendam' }, { value: 'lelah', label: 'Lelah / kurang fokus' },
];
export const emotionLabel = (value: string) => EMOTIONS.find(e => e.value === value)?.label || 'Belum dicatat';
