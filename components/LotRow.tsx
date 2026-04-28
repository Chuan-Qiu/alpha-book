import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DatePickerInput } from "./DatePickerInput";

export interface LotInput {
  date: string;
  price: string;
  quantity: string;
}

interface LotRowProps {
  lot: LotInput;
  index: number;
  onUpdate: (field: keyof LotInput, value: string) => void;
  onRemove: () => void;
  onCopy: () => void;
  canRemove: boolean;
}

export function LotRow({ lot, index, onUpdate, onRemove, onCopy, canRemove }: LotRowProps) {
  return (
    <View className="bg-background rounded-xl p-3 mb-2">
      {/* Row header */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-gray-500 text-xs">第 {index + 1} 笔</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={onCopy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="copy-outline" size={15} color="#6B7280" />
          </TouchableOpacity>
          {canRemove && (
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle-outline" size={17} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date */}
      <View className="mb-2">
        <Text className="text-gray-500 text-xs mb-1">日期</Text>
        <DatePickerInput value={lot.date} onChange={(v) => onUpdate("date", v)} />
      </View>

      {/* Price + Quantity */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="text-gray-500 text-xs mb-1">价格（元）</Text>
          <TextInput
            className="bg-surface text-white px-3 rounded-lg text-sm"
            style={{ height: 36 }}
            value={lot.price}
            onChangeText={(v) => onUpdate("price", v)}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#6B7280"
          />
        </View>
        <View className="flex-1">
          <Text className="text-gray-500 text-xs mb-1">数量（股）</Text>
          <TextInput
            className="bg-surface text-white px-3 rounded-lg text-sm"
            style={{ height: 36 }}
            value={lot.quantity}
            onChangeText={(v) => onUpdate("quantity", v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#6B7280"
          />
        </View>
      </View>
    </View>
  );
}
