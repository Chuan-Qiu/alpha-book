import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("注册成功！请直接登录");
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl font-bold text-white mb-2">AlphaBook</Text>
        <Text className="text-gray-400 mb-10">策略交易记录本</Text>

        <TextInput
          className="bg-surface text-white px-4 py-3 rounded-xl mb-3"
          placeholder="邮箱"
          placeholderTextColor="#6B7280"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="bg-surface text-white px-4 py-3 rounded-xl mb-6"
          placeholder="密码"
          placeholderTextColor="#6B7280"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && (
          <Text className="text-danger text-sm mb-4 text-center">{error}</Text>
        )}
        {success && (
          <Text className="text-primary text-sm mb-4 text-center">{success}</Text>
        )}

        <TouchableOpacity
          className="bg-primary py-4 rounded-xl items-center"
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? "处理中..." : isRegister ? "注册" : "登录"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4 items-center"
          onPress={() => setIsRegister(!isRegister)}
        >
          <Text className="text-gray-400">
            {isRegister ? "已有账号？登录" : "没有账号？注册"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
