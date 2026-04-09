import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { SessionDoc } from "../../src/types/session";

export default function ParticipantSchedule() {
  const router = useRouter();
  const { class_, loading: classLoading } = useActiveClass();
  const { sessions, loading: sessionsLoading } = useSessions(class_?.id);

  const loading = classLoading || sessionsLoading;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!class_) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No active class</Text>
        <Text style={styles.sub}>An admin needs to set up the season first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{class_.name}</Text>
      <Text style={styles.subheader}>
        {class_.location} · {class_.startTime}–{class_.endTime}
      </Text>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <SessionRow session={item} onPress={() => router.push(("/session/" + item.id) as any)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No sessions scheduled yet.</Text>
        }
      />
    </View>
  );
}

function SessionRow({ session, onPress }: { session: SessionDoc; onPress: () => void }) {
  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const cancelled = session.status === "cancelled";
  return (
    <TouchableOpacity style={[styles.row, cancelled && styles.rowCancelled]} onPress={onPress}>
      <View>
        <Text style={[styles.rowDate, cancelled && styles.textStrike]}>{dateLabel}</Text>
        <Text style={styles.rowMeta}>
          {cancelled ? "Cancelled" : `${session.rsvps.length} RSVP${session.rsvps.length === 1 ? "" : "s"}`}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1", padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE7F1", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#3B0764" },
  sub: { fontSize: 14, color: "#3B0764", marginTop: 8, textAlign: "center" },
  header: { fontSize: 24, fontWeight: "700", color: "#3B0764" },
  subheader: { fontSize: 14, color: "#3B0764", marginTop: 4, marginBottom: 8 },
  row: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowCancelled: { opacity: 0.5 },
  rowDate: { fontSize: 16, fontWeight: "600", color: "#3B0764" },
  rowMeta: { fontSize: 12, color: "#3B0764", marginTop: 4 },
  textStrike: { textDecorationLine: "line-through" },
  chevron: { fontSize: 22, color: "#9CA3AF" },
  empty: { textAlign: "center", color: "#3B0764", marginTop: 24 },
});
