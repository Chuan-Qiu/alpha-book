import { useCallback, useState } from "react";
import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import Svg, { Rect, Path, Defs, LinearGradient, Stop, Text as SvgText, Line as SvgLine } from "react-native-svg";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Trade, formatPercent, formatCurrency, isOpen } from "@/types";

interface AllStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  totalReturn: number | null;
  totalPnl: number | null;
  winRate: number | null;
  bestTrade: (Trade & { rate: number }) | null;
  worstTrade: (Trade & { rate: number }) | null;
  avgReturn: number | null;
}

interface StrategyBar {
  name: string;
  rate: number | null;
}

interface ChartPoint {
  x: number;
  y: number;
  label: string;
}

const W = 340;
const H = 130;
const PAD = { top: 12, bottom: 24, left: 38, right: 12 };

function TotalReturnChart({ data }: { data: ChartPoint[] }) {
  if (data.length < 2) return null;

  const ys = data.map((d) => d.y);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const rangeY = maxY - minY || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const px = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const py = (y: number) => PAD.top + (1 - (y - minY) / rangeY) * innerH;
  const zero = py(0);
  const positive = data[data.length - 1].y >= 0;
  const lineColor = positive ? "#10B981" : "#EF4444";

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(d.y).toFixed(1)}`)
    .join(" ");
  const areaPath =
    linePath +
    ` L${px(data.length - 1).toFixed(1)},${zero.toFixed(1)} L${px(0).toFixed(1)},${zero.toFixed(1)} Z`;

  return (
    <View className="mx-4 mb-4 bg-surface rounded-2xl p-3"
      style={{ borderWidth: 1, borderColor: "#F3F4F6" }}>
      <Text className="text-gray-500 text-xs mb-2">总累计收益率走势</Text>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.2" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <SvgLine x1={PAD.left} y1={zero} x2={W - PAD.right} y2={zero}
          stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4,3" />
        <Path d={areaPath} fill="url(#totalGrad)" />
        <Path d={linePath} stroke={lineColor} strokeWidth="2" fill="none" strokeLinejoin="round" />
        <SvgText x={PAD.left - 4} y={PAD.top + 4} fontSize="9" fill="#9CA3AF" textAnchor="end">
          {maxY >= 0 ? `+${maxY.toFixed(1)}%` : `${maxY.toFixed(1)}%`}
        </SvgText>
        <SvgText x={PAD.left - 4} y={zero + 3} fontSize="9" fill="#9CA3AF" textAnchor="end">0%</SvgText>
        {minY < 0 && (
          <SvgText x={PAD.left - 4} y={H - PAD.bottom + 4} fontSize="9" fill="#9CA3AF" textAnchor="end">
            {`${minY.toFixed(1)}%`}
          </SvgText>
        )}
        <SvgText x={px(0)} y={H - 4} fontSize="9" fill="#9CA3AF" textAnchor="middle">
          {data[0].label}
        </SvgText>
        <SvgText x={px(data.length - 1)} y={H - 4} fontSize="9" fill="#9CA3AF" textAnchor="middle">
          {data[data.length - 1].label}
        </SvgText>
      </Svg>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View className="bg-surface rounded-2xl p-4 flex-1"
      style={{ borderWidth: 1, borderColor: "#F3F4F6" }}>
      <Text className="text-gray-500 text-xs mb-1">{label}</Text>
      <Text className={`text-xl font-bold ${color ?? "text-gray-900"}`}>{value}</Text>
    </View>
  );
}

const BW = 340;
const BH = 160;
const BPAD = { top: 12, bottom: 32, left: 8, right: 8 };

function StrategyBarChart({ bars }: { bars: StrategyBar[] }) {
  if (bars.length === 0) return null;

  const rates = bars.map((b) => b.rate ?? 0);
  const maxAbs = Math.max(Math.abs(Math.min(...rates)), Math.abs(Math.max(...rates)), 1);
  const innerW = BW - BPAD.left - BPAD.right;
  const innerH = BH - BPAD.top - BPAD.bottom;
  const zeroY = BPAD.top + innerH / 2;
  const barW = Math.min(40, (innerW / bars.length) * 0.6);
  const gap = innerW / bars.length;

  return (
    <View className="mx-4 mb-4 bg-surface rounded-2xl p-3"
      style={{ borderWidth: 1, borderColor: "#F3F4F6" }}>
      <Text className="text-gray-500 text-xs mb-2">各策略收益率对比</Text>
      <Svg width={BW} height={BH}>
        <SvgLine
          x1={BPAD.left} y1={zeroY} x2={BW - BPAD.right} y2={zeroY}
          stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4,3"
        />
        <SvgText x={BPAD.left} y={zeroY - 3} fontSize="8" fill="#9CA3AF">0%</SvgText>

        {bars.map((bar, i) => {
          const rate = bar.rate ?? 0;
          const barH = Math.abs(rate) / maxAbs * (innerH / 2);
          const x = BPAD.left + gap * i + gap / 2 - barW / 2;
          const y = rate >= 0 ? zeroY - barH : zeroY;
          const color = rate >= 0 ? "#10B981" : "#EF4444";
          const label = bar.name.length > 4 ? bar.name.slice(0, 4) + "…" : bar.name;
          const rateLabel = rate >= 0 ? `+${rate.toFixed(1)}%` : `${rate.toFixed(1)}%`;

          return (
            <Svg key={i}>
              <Rect x={x} y={y} width={barW} height={Math.max(barH, 2)} fill={color} rx={3} />
              <SvgText
                x={x + barW / 2} y={BH - 2}
                fontSize="9" fill="#9CA3AF" textAnchor="middle"
              >
                {label}
              </SvgText>
              <SvgText
                x={x + barW / 2}
                y={rate >= 0 ? y - 3 : y + barH + 10}
                fontSize="8" fill={color} textAnchor="middle"
              >
                {bar.rate !== null ? rateLabel : "--"}
              </SvgText>
            </Svg>
          );
        })}
      </Svg>
    </View>
  );
}

export default function StatsScreen() {
  const [stats, setStats] = useState<AllStats | null>(null);
  const [strategyBars, setStrategyBars] = useState<StrategyBar[]>([]);
  const [totalChartData, setTotalChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);

    const [tradesRes, strategiesRes] = await Promise.all([
      supabase.from("trades").select("*").order("created_at", { ascending: true }),
      supabase.from("strategies").select("*, trades(*)").order("created_at", { ascending: true }),
    ]);

    if (tradesRes.error) {
      Alert.alert("加载失败", tradesRes.error.message);
      setLoading(false);
      return;
    }

    const trades: Trade[] = tradesRes.data ?? [];
    const closed = trades.filter((t) => !isOpen(t));
    const openTrades = trades.filter((t) => isOpen(t));

    let totalCost = 0;
    let totalRevenue = 0;
    let wins = 0;
    let bestTrade: (Trade & { rate: number }) | null = null;
    let worstTrade: (Trade & { rate: number }) | null = null;
    const rates: number[] = [];

    for (const t of closed) {
      const cost = t.buy_lots.reduce((s, l) => s + l.price * l.quantity, 0);
      const revenue = t.sell_lots.reduce((s, l) => s + l.price * l.quantity, 0);
      const rate = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
      totalCost += cost;
      totalRevenue += revenue;
      rates.push(rate);
      if (revenue > cost) wins++;
      if (!bestTrade || rate > bestTrade.rate) bestTrade = { ...t, rate };
      if (!worstTrade || rate < worstTrade.rate) worstTrade = { ...t, rate };
    }

    const totalPnl = totalRevenue - totalCost;
    const totalReturn = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : null;
    const avgReturn = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;

    setStats({
      totalTrades: trades.length,
      closedTrades: closed.length,
      openTrades: openTrades.length,
      totalReturn,
      totalPnl: totalCost > 0 ? totalPnl : null,
      winRate,
      bestTrade,
      worstTrade,
      avgReturn,
    });

    const bars: StrategyBar[] = (strategiesRes.data ?? []).map((s: any) => {
      const sClosed = (s.trades as Trade[]).filter((t) => !isOpen(t));
      if (sClosed.length === 0) return { name: s.name, rate: null };
      const cost = sClosed.reduce((a: number, t: Trade) => a + t.buy_lots.reduce((x, l) => x + l.price * l.quantity, 0), 0);
      const rev = sClosed.reduce((a: number, t: Trade) => a + t.sell_lots.reduce((x, l) => x + l.price * l.quantity, 0), 0);
      return { name: s.name, rate: cost > 0 ? ((rev - cost) / cost) * 100 : null };
    });
    setStrategyBars(bars);

    const sortedClosed = [...closed].sort((a, b) => {
      const da = a.sell_lots[a.sell_lots.length - 1]?.date ?? "";
      const db = b.sell_lots[b.sell_lots.length - 1]?.date ?? "";
      return da.localeCompare(db);
    });
    let cumCost = 0;
    let cumPnl = 0;
    setTotalChartData(
      sortedClosed.map((t, i) => {
        const cost = t.buy_lots.reduce((s, l) => s + l.price * l.quantity, 0);
        const rev = t.sell_lots.reduce((s, l) => s + l.price * l.quantity, 0);
        cumCost += cost;
        cumPnl += rev - cost;
        const label = t.sell_lots[t.sell_lots.length - 1]?.date?.slice(5) ?? `#${i + 1}`;
        return { x: i, y: cumCost > 0 ? (cumPnl / cumCost) * 100 : 0, label };
      })
    );

    setLoading(false);
  }

  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  const returnColor =
    !stats?.totalReturn ? "text-gray-400" : stats.totalReturn >= 0 ? "text-primary" : "text-danger";

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor="#10B981" />}
    >
      <View className="px-4 pt-14 pb-4">
        <Text className="text-gray-900 text-2xl font-bold">总体统计</Text>
      </View>

      {stats && (
        <>
          {/* 总收益 */}
          <View className="mx-4 mb-4 bg-surface rounded-2xl p-5"
            style={{ borderWidth: 1, borderColor: "#F3F4F6" }}>
            <Text className="text-gray-500 text-sm mb-1">总收益率（已平仓）</Text>
            <Text className={`text-4xl font-bold mb-1 ${returnColor}`}>
              {formatPercent(stats.totalReturn)}
            </Text>
            <Text className={`text-base ${returnColor}`}>
              {formatCurrency(stats.totalPnl)}
            </Text>
          </View>

          <TotalReturnChart data={totalChartData} />

          {strategyBars.length > 1 && <StrategyBarChart bars={strategyBars} />}

          <View className="mx-4 mb-4 flex-row gap-3">
            <StatCard label="总交易数" value={String(stats.totalTrades)} />
            <StatCard label="胜率" value={stats.winRate !== null ? `${stats.winRate.toFixed(1)}%` : "--"} />
            <StatCard label="平均收益" value={formatPercent(stats.avgReturn)}
              color={stats.avgReturn !== null && stats.avgReturn >= 0 ? "text-primary" : "text-danger"} />
          </View>

          <View className="mx-4 mb-4 flex-row gap-3">
            <StatCard label="已平仓" value={String(stats.closedTrades)} />
            <StatCard label="持仓中" value={String(stats.openTrades)} />
          </View>

          {stats.bestTrade && (
            <View className="mx-4 mb-3 bg-surface rounded-2xl p-4"
              style={{ borderWidth: 1, borderColor: "#F3F4F6" }}>
              <Text className="text-gray-500 text-xs mb-2">最佳交易</Text>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-gray-900 font-semibold">{stats.bestTrade.stock_name}</Text>
                  <Text className="text-gray-400 text-xs">{stats.bestTrade.stock_code}</Text>
                </View>
                <Text className="text-primary text-lg font-bold">{formatPercent(stats.bestTrade.rate)}</Text>
              </View>
            </View>
          )}

          {stats.worstTrade && (
            <View className="mx-4 mb-6 bg-surface rounded-2xl p-4"
              style={{ borderWidth: 1, borderColor: "#F3F4F6" }}>
              <Text className="text-gray-500 text-xs mb-2">最差交易</Text>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-gray-900 font-semibold">{stats.worstTrade.stock_name}</Text>
                  <Text className="text-gray-400 text-xs">{stats.worstTrade.stock_code}</Text>
                </View>
                <Text className="text-danger text-lg font-bold">{formatPercent(stats.worstTrade.rate)}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {!loading && !stats?.totalTrades && (
        <View className="items-center mt-20">
          <Text className="text-gray-400">还没有交易记录</Text>
        </View>
      )}
    </ScrollView>
  );
}
