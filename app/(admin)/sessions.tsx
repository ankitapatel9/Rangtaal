import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/hooks/useAuth";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { createClassAndSeason } from "../../src/lib/classes";
import { SessionDoc } from "../../src/types/session";

const DEFAULT_SEASON = {
  name: "Garba Workshops 2026",
  location: "Roselle Park District, Maple Room",
  address: "555 W Bryn Mawr Ave, Roselle, IL 60172",
  startTime: "19:30",
  endTime: "21:30",
  monthlyFee: 60,
  seasonStart: "2026-04-21T19:30:00-05:00",
  seasonEnd: "2026-09-29T19:30:00-05:00",
};

export default function AdminSessions() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { class_, loading: classLoading } = useActiveClass();
  const { sessions, loading: sessionsLoading } = useSessions(class_?.id);
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    if (!authUser) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Create the 2026 season?",
        "This creates the Garba Workshops class and one session per Tuesday from April 21 through September 29, 2026.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Create", onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;
    setSeeding(true);
    try {
      await createClassAndSeason({
        ...DEFAULT_SEASON,
        adminUserId: authUser.uid,
      });
    } catch (err: any) {
      Alert.alert("Seed failed", err?.message ?? "Unknown error");
    } finally {
      setSeeding(false);
    }
  }

  if (classLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!class_) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No class yet</Text>
        <Text style={styles.sub}>Tap below to create the 2026 season.</Text>
        <TouchableOpacity
          style={[styles.seedBtn, seeding && { opacity: 0.5 }]}
          onPress={handleSeed}
          disabled={seeding}
        >
          <Text style={styles.seedBtnText}>
            {seeding ? "Creating..." : "Create 2026 Season"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{class_.name}</Text>
      <Text style={styles.subheader}>
        {sessions.length} sessions · {sessions.filter((s) => s.status === "upcoming").length} upcoming
      </Text>
      {sessionsLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => (
            <AdminSessionRow session={item} onPress={() => router.push(("/session/" + item.id) as any)} />
          )}
        />
      )}
    </View>
  );
}

function AdminSessionRow({ session, onPress }: { session: SessionDoc; onPress: () => void }) {
  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowDate}>{dateLabel}</Text>
        <Text style={styles.rowMeta}>
          {session.status} · {session.rsvps.length} RSVP{session.rsvps.length === 1 ? "" : "s"}
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
  seedBtn: { backgroundColor: "#FACC15", borderRadius: 32, paddingHorizontal: 32, paddingVertical: 16, marginTop: 24 },
  seedBtnText: { fontSize: 16, fontWeight: "700", color: "#3B0764" },
  row: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  rowDate: { fontSize: 16, fontWeight: "600", color: "#3B0764" },
  rowMeta: { fontSize: 12, color: "#3B0764", marginTop: 4 },
  chevron: { fontSize: 22, color: "#9CA3AF" },
});
