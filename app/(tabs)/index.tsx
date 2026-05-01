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
    const returnColor =
      item.totalReturn === null
        ? "text-gray-400"
        : item.totalReturn >= 0
        ? "text-primary"
        : "text-danger";

    return (
      <TouchableOpacity
        className="bg-surface rounded-2xl p-4 mb-3 mx-4"
        onPress={() => router.push(`/strategy/${item.id}`)}
        activeOpacity={0.75}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-white font-semibold text-base">{item.name}</Text>
            {item.description ? (
              <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>
          <View className="items-end">
            <Text className={`text-base font-bold ${returnColor}`}>
              {formatPercent(item.totalReturn)}
            </Text>
            <Text className={`text-xs ${returnColor}`}>
              {formatCurrency(item.totalPnl)}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <Text className="text-gray-500 text-xs">{item.tradeCount} 笔</Text>
          {item.winRate !== null && (
            <Text className="text-gray-500 text-xs">胜率 {item.winRate.toFixed(0)}%</Text>
          )}
          {item.openCount > 0 && (
            <View className="bg-yellow-500/15 px-2 py-0.5 rounded-md">
              <Text className="text-yellow-400 text-xs">{item.openCount} 持仓中</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-14 pb-4 flex-row justify-between items-center">
        <Text className="text-white text-2xl font-bold">AlphaBook</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 内联新建输入框 */}
      {showInput && (
        <View className="mx-4 mb-3 bg-surface rounded-2xl p-3 flex-row items-center gap-2">
          <TextInput
            className="flex-1 text-white text-base px-2"
            placeholder="策略名称..."
            placeholderTextColor="#6B7280"
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
            <Ionicons name="close" size={22} color="#6B7280" />
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
              <Text className="text-gray-500 text-base">
                还没有策略，点击 + 新建
              </Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        className="absolute bottom-8 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center"
        onPress={() => setShowInput(true)}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
