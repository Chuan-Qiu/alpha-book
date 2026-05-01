import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Lot } from "@/types";
import { LotInput, LotRow } from "@/components/LotRow";

function toLotInput(lot: Lot): LotInput {
  return { date: lot.date, price: String(lot.price), quantity: String(lot.quantity) };
}

function parseLots(lots: LotInput[]): Lot[] {
  return lots.map((l) => ({
    date: l.date,
    price: parseFloat(l.price),
    quantity: parseInt(l.quantity, 10),
  }));
}

const emptyLot = (): LotInput => ({
  date: new Date().toISOString().slice(0, 10),
  price: "",
  quantity: "",
});

export default function EditTradeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [fetching, setFetching] = useState(true);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [stockName, setStockName] = useState("");
  const [stockCode, setStockCode] = useState("");
  const [buyLots, setBuyLots] = useState<LotInput[]>([emptyLot()]);
  const [hasSell, setHasSell] = useState(false);
  const [sellLots, setSellLots] = useState<LotInput[]>([emptyLot()]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("trades")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setStrategyId(data.strategy_id);
          setStockName(data.stock_name);
          setStockCode(data.stock_code);
          setBuyLots(data.buy_lots.map(toLotInput));
          setNotes(data.notes ?? "");
          if (data.sell_lots?.length > 0) {
            setHasSell(true);
            setSellLots(data.sell_lots.map(toLotInput));
          }
        }
        setFetching(false);
      });
  }, [id]);

  function updateLot(
    setter: React.Dispatch<React.SetStateAction<LotInput[]>>,
    index: number,
    field: keyof LotInput,
    value: string
  ) {
    setter((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLot(setter: React.Dispatch<React.SetStateAction<LotInput[]>>) {
    setter((prev) => [...prev, emptyLot()]);
  }

  function removeLot(setter: React.Dispatch<React.SetStateAction<LotInput[]>>, index: number) {
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  function copyLot(setter: React.Dispatch<React.SetStateAction<LotInput[]>>, index: number) {
    setter((prev) => [
      ...prev.slice(0, index + 1),
      { ...prev[index] },
      ...prev.slice(index + 1),
    ]);
  }

  async function handleSave() {
    setError(null);
    if (!stockName.trim() || !stockCode.trim()) {
      setError("请填写股票名称和代码");
      return;
    }
    if (buyLots.some((l) => !l.price || !l.quantity)) {
      setError("请填写所有买入记录的价格和数量");
      return;
    }
    if (hasSell && sellLots.some((l) => !l.price || !l.quantity)) {
      setError("请填写所有卖出记录的价格和数量");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from("trades")
      .update({
        stock_name: stockName.trim(),
        stock_code: stockCode.trim().toUpperCase(),
        buy_lots: parseLots(buyLots),
        sell_lots: hasSell ? parseLots(sellLots) : [],
        notes: notes.trim() || null,
      })
      .eq("id", id);

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => {
        router.replace(strategyId ? `/strategy/${strategyId}` : "/(tabs)");
      }, 700);
    }
  }

  if (fetching) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="px-4 pt-14 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() =>
            strategyId
              ? router.replace(`/strategy/${strategyId}`)
              : router.replace("/(tabs)")
          }
          className="mr-3"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </TouchableOpacity>
        <Text className="text-gray-900 text-xl font-bold">编辑交易</Text>
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {/* 股票信息 */}
        <Text className="text-gray-500 text-xs uppercase tracking-widest mb-3">
          股票信息
        </Text>
        <View className="flex-row gap-3 mb-5">
          <View className="flex-1">
            <Text className="text-gray-500 text-xs mb-1">名称</Text>
            <TextInput
              className="bg-surface text-gray-900 px-4 rounded-xl"
              style={{ height: 44, borderWidth: 1, borderColor: "#E5E7EB" }}
              value={stockName}
              onChangeText={setStockName}
              placeholder="如：贵州茅台"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View className="w-32">
            <Text className="text-gray-500 text-xs mb-1">代码</Text>
            <TextInput
              className="bg-surface text-gray-900 px-4 rounded-xl"
              style={{ height: 44, borderWidth: 1, borderColor: "#E5E7EB" }}
              value={stockCode}
              onChangeText={setStockCode}
              placeholder="600519"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* 买入记录 */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-500 text-xs uppercase tracking-widest">买入记录</Text>
          <TouchableOpacity
            className="flex-row items-center gap-1"
            onPress={() => addLot(setBuyLots)}
          >
            <Ionicons name="add-circle-outline" size={16} color="#10B981" />
            <Text className="text-primary text-sm">添加</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-surface rounded-2xl p-3 mb-5"
          style={{ borderWidth: 1, borderColor: "#E5E7EB" }}>
          {buyLots.map((lot, i) => (
            <LotRow
              key={i}
              lot={lot}
              index={i}
              onUpdate={(f, v) => updateLot(setBuyLots, i, f, v)}
              onRemove={() => removeLot(setBuyLots, i)}
              onCopy={() => copyLot(setBuyLots, i)}
              canRemove={buyLots.length > 1}
            />
          ))}
        </View>

        {/* 卖出开关 */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-500 text-xs uppercase tracking-widest">已卖出</Text>
          <Switch
            value={hasSell}
            onValueChange={setHasSell}
            trackColor={{ false: "#D1D5DB", true: "#059669" }}
            thumbColor="white"
          />
        </View>

        {/* 卖出记录 */}
        {hasSell && (
          <>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-500 text-xs uppercase tracking-widest">卖出记录</Text>
              <TouchableOpacity
                className="flex-row items-center gap-1"
                onPress={() => addLot(setSellLots)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#10B981" />
                <Text className="text-primary text-sm">添加</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-surface rounded-2xl p-3 mb-5"
              style={{ borderWidth: 1, borderColor: "#E5E7EB" }}>
              {sellLots.map((lot, i) => (
                <LotRow
                  key={i}
                  lot={lot}
                  index={i}
                  onUpdate={(f, v) => updateLot(setSellLots, i, f, v)}
                  onRemove={() => removeLot(setSellLots, i)}
                  onCopy={() => copyLot(setSellLots, i)}
                  canRemove={sellLots.length > 1}
                />
              ))}
            </View>
          </>
        )}

        {/* 备注 */}
        <Text className="text-gray-500 text-xs mb-1">备注（可选）</Text>
        <TextInput
          className="bg-surface text-gray-900 px-4 py-3 rounded-xl mb-4"
          style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
          value={notes}
          onChangeText={setNotes}
          placeholder="策略逻辑、心得..."
          placeholderTextColor="#9CA3AF"
          multiline
        />

        {error && (
          <Text className="text-danger text-sm mb-3 text-center">{error}</Text>
        )}

        <TouchableOpacity
          className="bg-primary py-4 rounded-xl items-center mb-12"
          onPress={handleSave}
          disabled={loading || saved}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "保存中..." : saved ? "✓ 已保存" : "保存修改"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
