import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Strategy, Trade, formatPercent, formatCurrency, isOpen } from "@/types";

interface StrategyWithStats extends Strategy {
  tradeCount: number;
  openCount: number;
  totalReturn: number | null;
  totalPnl: number | null;
  winRate: number | null;
}

function computeStats(
  trades: Trade[]
): Pick<StrategyWithStats, "tradeCount" | "openCount" | "totalReturn" | "totalPnl" | "winRate"> {
  const closed = trades.filter((t) => !isOpen(t));
  const tradeCount = trades.length;
  const openCount = trades.length - closed.length;
  if (closed.length === 0) return { tradeCount, openCount, totalReturn: null, totalPnl: null, winRate: null };

  let totalCost = 0;
  let totalRevenue = 0;
  let wins = 0;

  for (const t of closed) {
    const cost = t.buy_lots.reduce((s, l) => s + l.price * l.quantity, 0);
    const revenue = t.sell_lots.reduce((s, l) => s + l.price * l.quantity, 0);
    totalCost += cost;
    totalRevenue += revenue;
    if (revenue > cost) wins++;
  }

  return {
    tradeCount,
    openCount,
    totalReturn: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : null,
    totalPnl: totalRevenue - totalCost,
    winRate: (wins / closed.length) * 100,
  };
}

export default function StrategiesScreen() {
  const [strategies, setStrategies] = useState<StrategyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function fetchStrategies() {
    setLoading(true);
    const { data, error } = await supabase
      .from("strategies")
      .select("*, trades(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchStrategies error:", JSON.stringify(error));
    }

    const mapped = (data ?? []).map((s: any) => ({
      ...s,
      ...computeStats(s.trades ?? []),
    }));
    setStrategies(mapped);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchStrategies();
    }, [])
  );

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("strategies")
      .insert({ name: newName.trim(), user_id: user!.id });
    if (error) {
      console.error("insert error:", JSON.stringify(error));
    }
    setNewName("");
    setShowInput(false);
    setSaving(false);
    await fetchStrategies();
  }

  function renderItem({ item }: { item: StrategyWithStats }) {
    const hasReturn = item.totalReturn !== null;
    const returnColor = !hasReturn
      ? "text-gray-400"
      : item.totalReturn! >= 0
      ? "text-primary"
      : "text-danger";

    return (
      <TouchableOpacity
        className="bg-surface rounded-2xl px-5 pt-4 pb-4 mb-3 mx-4"
        style={{ borderWidth: 1, borderColor: "#F3F4F6" }}
        onPress={() => router.push(`/strategy/${item.id}`)}
        activeOpacity={0.75}
      >
        {/* Name */}
        <Text className="text-gray-900 font-bold text-base mb-3" numberOfLines={1}>
          {item.name}
        </Text>

        {/* Big return number */}
        <Text className={`text-4xl font-bold ${returnColor} mb-0.5`}>
          {formatPercent(item.totalReturn)}
        </Text>
        <Text className={`text-sm ${returnColor} mb-4`}>
          {hasReturn ? formatCurrency(item.totalPnl) : "暂无已平仓交易"}
        </Text>

        {/* Bottom stats */}
        <View className="flex-row items-center pt-3" style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
          <Text className="text-gray-400 text-sm">{item.tradeCount} 笔</Text>
          {item.winRate !== null && (
            <Text className="text-gray-400 text-sm ml-3">
              胜率 {item.winRate.toFixed(0)}%
            </Text>
          )}
          {item.openCount > 0 && (
            <View className="ml-auto bg-amber-50 px-2 py-0.5 rounded-md">
              <Text className="text-amber-600 text-xs font-medium">
                {item.openCount} 持仓中
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-14 pb-4 flex-row justify-between items-center">
        <Text className="text-gray-900 text-2xl font-bold">AlphaBook</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* 内联新建输入框 */}
      {showInput && (
        <View className="mx-4 mb-3 bg-surface rounded-2xl p-3 flex-row items-center gap-2"
          style={{ borderWidth: 1, borderColor: "#E5E7EB" }}>
          <TextInput
            className="flex-1 text-gray-900 text-base px-2"
            placeholder="策略名称..."
            placeholderTextColor="#9CA3AF"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity
            className="bg-primary px-4 py-2 rounded-xl"
            onPress={handleAdd}
            disabled={saving}
          >
            <Text className="text-white font-medium">
              {saving ? "..." : "确定"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowInput(false); setNewName(""); }}>
            <Ionicons name="close" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={strategies}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchStrategies}
            tintColor="#10B981"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center mt-20">
              <Text className="text-gray-400 text-base">
                还没有策略，点击 + 新建
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        className="absolute bottom-8 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center"
        style={{ elevation: 4 }}
        onPress={() => setShowInput(true)}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
