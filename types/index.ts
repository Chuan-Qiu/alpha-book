export interface Lot {
  date: string;
  price: number;
  quantity: number;
}

export interface Trade {
  id: string;
  user_id: string;
  strategy_id: string;
  stock_name: string;
  stock_code: string;
  buy_lots: Lot[];
  sell_lots: Lot[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  trades?: Trade[];
}

export function totalBuyQty(trade: Trade) {
  return trade.buy_lots.reduce((s, l) => s + l.quantity, 0);
}

export function totalSellQty(trade: Trade) {
  return trade.sell_lots.reduce((s, l) => s + l.quantity, 0);
}

export function isOpen(trade: Trade) {
  return trade.sell_lots.length === 0 || totalSellQty(trade) < totalBuyQty(trade);
}

export function calcReturn(trade: Trade): { rate: number | null; pnl: number | null } {
  if (trade.sell_lots.length === 0) return { rate: null, pnl: null };
  const totalCost = trade.buy_lots.reduce((s, l) => s + l.price * l.quantity, 0);
  const totalRevenue = trade.sell_lots.reduce((s, l) => s + l.price * l.quantity, 0);
  if (totalCost === 0) return { rate: null, pnl: null };
  const pnl = totalRevenue - totalCost;
  return { rate: (pnl / totalCost) * 100, pnl };
}

export function avgPrice(lots: Lot[]): number | null {
  const totalQty = lots.reduce((s, l) => s + l.quantity, 0);
  if (totalQty === 0) return null;
  return lots.reduce((s, l) => s + l.price * l.quantity, 0) / totalQty;
}

export function formatPercent(value: number | null): string {
  if (value === null) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatCurrency(value: number | null): string {
  if (value === null) return "--";
  return `${value >= 0 ? "+" : "-"}¥${Math.abs(value).toFixed(2)}`;
}
