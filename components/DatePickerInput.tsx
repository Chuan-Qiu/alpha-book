import { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseDate(s: string) {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: parseInt(m[1]), month: parseInt(m[2]) - 1, day: parseInt(m[3]) };
}

export function DatePickerInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const p = parseDate(value);
    return p?.year ?? new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const p = parseDate(value);
    return p?.month ?? new Date().getMonth();
  });

  function handleOpen() {
    const p = parseDate(value);
    const now = new Date();
    setViewYear(p?.year ?? now.getFullYear());
    setViewMonth(p?.month ?? now.getMonth());
    setOpen(true);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  }

  function selectToday() {
    const now = new Date();
    onChange(now.toISOString().slice(0, 10));
    setOpen(false);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mon=0
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const parsed = parseDate(value);
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  const isSelected = (day: number) =>
    parsed !== null &&
    day === parsed.day &&
    viewMonth === parsed.month &&
    viewYear === parsed.year;

  const isToday = (day: number) =>
    day === todayDay && viewMonth === todayMonth && viewYear === todayYear;

  // cell size: 7 × 36 = 252px, fits inside 290px modal with p-4
  const CELL = 36;
  const DOT = 30;

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        className="bg-surface flex-row items-center px-3 rounded-lg"
        style={{ height: 36 }}
      >
        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
        <Text className="text-white text-sm ml-2 flex-1">
          {value || "选择日期"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          {/* Stop press propagation on the card */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: "#1F2937", borderRadius: 20, padding: 16, width: 290 }}>
              {/* Month nav */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="chevron-back" size={20} color="white" />
                </TouchableOpacity>
                <Text style={{ color: "white", fontWeight: "600", fontSize: 14 }}>
                  {viewYear}年{viewMonth + 1}月
                </Text>
                <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
              <View style={{ flexDirection: "row", marginBottom: 4 }}>
                {WEEKDAYS.map((d) => (
                  <View key={d} style={{ width: CELL, alignItems: "center" }}>
                    <Text style={{ color: "#6B7280", fontSize: 11 }}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Day grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {cells.map((day, i) => {
                  const selected = day !== null && isSelected(day);
                  const today = day !== null && isToday(day);
                  return (
                    <View key={i} style={{ width: CELL, alignItems: "center", marginBottom: 4 }}>
                      {day !== null ? (
                        <TouchableOpacity
                          onPress={() => selectDay(day)}
                          style={{
                            width: DOT,
                            height: DOT,
                            borderRadius: DOT / 2,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: selected ? "#10B981" : "transparent",
                            borderWidth: today && !selected ? 1 : 0,
                            borderColor: "#10B981",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: selected ? "white" : today ? "#10B981" : "#E5E7EB",
                              fontWeight: selected || today ? "700" : "400",
                            }}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ width: DOT, height: DOT }} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Today shortcut */}
              <TouchableOpacity
                onPress={selectToday}
                style={{
                  marginTop: 8,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#374151",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#9CA3AF", fontSize: 13 }}>今天</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
