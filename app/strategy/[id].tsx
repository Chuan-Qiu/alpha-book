import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Line as SvgLine, Text as SvgText } from "react-native-svg";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import {
  Strategy,
  Trade,
  calcReturn,
  formatPercent,
  formatCurrency,
  avgPrice,
  isOpen,
  totalBuyQty,
  totalSellQty,
} from "@/types";

const W = 340;
const H = 120;
const PAD = { top: 12, bottom: 24, left: 36, right: 12 };

function ReturnChart({ data }: { data: { x: number; y: number; label: string }[] }) {
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
    <View className="mx-4 mb-4 bg-surface rounded-2xl p-3">
      <Text className="text-gray-400 text-xs mb-2">累计收益率走势</Text>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* 零线 */}
        <SvgLine
          x1={PAD.left} y1={zero} x2={W - PAD.right} y2={zero}
          stroke="#374151" strokeWidth="1" strokeDasharray="4,3"
        />
        {/* 面积填充 */}
        <Path d={areaPath} fill="url(#grad)" />
        {/* 折线 */}
        <Path d={linePath} stroke={lineColor} strokeWidth="2" fill="none" strokeLinejoin="round" />
        {/* Y 轴标签 */}
        <SvgText x={PAD.left - 4} y={PAD.top + 4} fontSize="9" fill="#6B7280" textAnchor="end">
          {maxY >= 0 ? `+${maxY.toFixed(1)}%` : `${maxY.toFixed(1)}%`}
        </SvgText>
        <SvgText x={PAD.left - 4} y={zero + 3} fontSize="9" fill="#6B7280" textAnchor="end">0%</SvgText>
        {minY < 0 && (
          <SvgText x={PAD.left - 4} y={H - PAD.bottom + 4} fontSize="9" fill="#6B7280" textAnchor="end">
            {`${minY.toFixed(1)}%`}
          </SvgText>
        )}
        {/* X 轴首尾标签 */}
        <SvgText x={px(0)} y={H - 4} fontSize="9" fill="#6B7280" textAnchor="middle">
          {data[0].label}
        </SvgText>
        <SvgText x={px(data.length - 1)} y={H - 4} fontSize="9" fill="#6B7280" textAnchor="middle">
          {data[data.length - 1].label}
        </SvgText>
      </Svg>
    </View>
  );
}

function TradeCard({ trade, onDelete, onEdit, onDuplicate }: { trade: Trade; onDelete: () => void; onEdit: () => void; onDuplicate: () => void }) {
  const { rate, pnl } = calcReturn(trade);
  const open = isOpen(trade);
  const color = rate === null ? "text-gray-400" : rate >= 0 ? "text-primary" : "text-danger";
  const buyAvg = avgPrice(trade.buy_lots);
  const sellAvg = avgPrice(trade.sell_lots);

  async function handleDuplicate() {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("trades").insert({
      user_id: user!.id,
      strategy_id: trade.strategy_id,
      stock_name: trade.stock_name,
      stock_code: trade.stock_code,
      buy_lots: trade.buy_lots,
      sell_lots: trade.sell_lots,
      notes: trade.notes,
    });
    onDuplicate();
  }

  async function confirmDelete() {
    if (Platform.OS === "web") {
      if (!window.confirm(`确定删除 ${trade.stock_name} 这笔记录？`)) return;
      await supabase.from("trades").delete().eq("id", trade.id);
      onDelete();
    } else {
      Alert.alert("删除交易", `确定删除 ${trade.stock_name} 这笔记录？`, [
        { text: "取消", style: "cancel" },
        {
          text: "删除",
          style: "destructive",
          onPress: async () => {
            await supabase.from("trades").delete().eq("id", trade.id);
            onDelete();
          },
        },
      ]);
    }
  }

  return (
    <View className="bg-surface rounded-2xl p-4 mb-3 mx-4">
      {/* 标题行 */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-white font-semibold text-base">{trade.stock_name}</Text>
          <Text className="text-gray-500 text-xs">{trade.stock_code}</Text>
        </View>
        <View className="items-end">
          <Text className={`text-base font-bold ${color}`}>{formatPercent(rate)}</Text>
          <Text className={`text-xs ${color}`}>{formatCurrency(pnl)}</Text>
        </View>
      </View>

      {/* 买入/卖出汇总 */}
      <View className="flex-row border-t border-gray-700 pt-3 gap-4">
        <View className="flex-1">
          <Text className="text-gray-500 text-xs mb-1">
            买入 · {trade.buy_lots.length} 笔 · {totalBuyQty(trade)} 股
          </Text>
          <Text className="text-gray-300 text-sm">
            均价 ¥{buyAvg?.toFixed(2) ?? "--"}
          </Text>
          <Text className="text-gray-500 text-xs">
            {trade.buy_lots[0]?.date} {trade.buy_lots.length > 1 ? `~ ${trade.buy_lots[trade.buy_lots.length - 1]?.date}` : ""}
          </Text>
        </View>

        {!open ? (
          <View className="flex-1 items-end">
            <Text className="text-gray-500 text-xs mb-1">
              卖出 · {trade.sell_lots.length} 笔 · {totalSellQty(trade)} 股
            </Text>
            <Text className="text-gray-300 text-sm">
              均价 ¥{sellAvg?.toFixed(2) ?? "--"}
            </Text>
            <Text className="text-gray-500 text-xs">
              {trade.sell_lots[0]?.date} {trade.sell_lots.length > 1 ? `~ ${trade.sell_lots[trade.sell_lots.length - 1]?.date}` : ""}
            </Text>
          </View>
        ) : (
          <View className="items-end justify-center">
            <View className="bg-yellow-500/20 px-2 py-1 rounded-lg">
              <Text className="text-yellow-400 text-xs font-medium">持仓中</Text>
            </View>
          </View>
        )}
      </View>

      {trade.notes && (
        <Text className="text-gray-500 text-xs mt-2 italic">{trade.notes}</Text>
      )}

      <View className="absolute top-3 right-3 flex-row gap-3">
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil-outline" size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDuplicate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="copy-outline" size={16} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function StrategyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchData() {
    setLoading(true);
    const [stratRes, tradeRes] = await Promise.all([
      supabase.from("strategies").select("*").eq("id", id).single(),
      supabase
        .from("trades")
        .select("*")
        .eq("strategy_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (stratRes.data) setStrategy(stratRes.data);
    if (tradeRes.data) setTrades(tradeRes.data);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { fetchData(); }, [id]));

  const closed = trades.filter((t) => !isOpen(t));
  const totalCost = closed.reduce(
    (s, t) => s + t.buy_lots.reduce((a, l) => a + l.price * l.quantity, 0), 0
  );
  const totalRevenue = closed.reduce(
    (s, t) => s + t.sell_lots.reduce((a, l) => a + l.price * l.quantity, 0), 0
  );
  const totalReturn = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : null;
  const totalPnl = closed.length > 0 ? totalRevenue - totalCost : null;
  const wins = closed.filter((t) => {
    const cost = t.buy_lots.reduce((a, l) => a + l.price * l.quantity, 0);
    const rev = t.sell_lots.reduce((a, l) => a + l.price * l.quantity, 0);
    return rev > cost;
  }).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : null;
  const returnColor =
    totalReturn === null ? "text-gray-400" : totalReturn >= 0 ? "text-primary" : "text-danger";

  // 图表数据：按最后卖出日期排序的已平仓交易，计算累计收益率
  const chartData = (() => {
    const sorted = [...closed].sort((a, b) => {
      const da = a.sell_lots[a.sell_lots.length - 1]?.date ?? "";
      const db = b.sell_lots[b.sell_lots.length - 1]?.date ?? "";
      return da.localeCompare(db);
    });
    let cumCost = 0;
    let cumPnl = 0;
    return sorted.map((t, i) => {
      const cost = t.buy_lots.reduce((s, l) => s + l.price * l.quantity, 0);
      const rev = t.sell_lots.reduce((s, l) => s + l.price * l.quantity, 0);
      cumCost += cost;
      cumPnl += rev - cost;
      const label = t.sell_lots[t.sell_lots.length - 1]?.date?.slice(5) ?? `#${i + 1}`;
      return { x: i, y: cumCost > 0 ? (cumPnl / cumCost) * 100 : 0, label };
    });
  })();

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-14 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.replace("/(tabs)")} className="mr-3">
          <Ionicons name="chevron-back" size={26} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>
          {strategy?.name ?? ""}
        </Text>
      </View>

      <View className="mx-4 mb-4 bg-surface rounded-2xl p-4">
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-gray-400 text-xs mb-1">总收益率</Text>
            <Text className={`text-2xl font-bold ${returnColor}`}>
              {formatPercent(totalReturn)}
            </Text>
            <Text className={`text-xs mt-0.5 ${returnColor}`}>
              {formatCurrency(totalPnl)}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-400 text-xs mb-1">交易笔数</Text>
            <Text className="text-white text-2xl font-bold">{trades.length}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-400 text-xs mb-1">胜率</Text>
            <Text className="text-white text-2xl font-bold">
              {winRate !== null ? `${winRate.toFixed(0)}%` : "--"}
            </Text>
          </View>
        </View>
      </View>

      <ReturnChart data={chartData} />

      <FlatList
        data={trades}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
            <TradeCard
              trade={item}
              onDelete={fetchData}
              onEdit={() => router.push(`/trade/${item.id}`)}
              onDuplicate={fetchData}
            />
          )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#10B981" />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center mt-16">
              <Text className="text-gray-500">还没有交易记录</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        className="absolute bottom-8 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center"
        onPress={() => router.push(`/trade/new?strategyId=${id}`)}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
