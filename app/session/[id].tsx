import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/hooks/useAuth";
import { useSession } from "../../src/hooks/useSession";
import { useUser } from "../../src/hooks/useUser";
import { rsvpToSession, removeRsvp } from "../../src/lib/sessions";
import { useActiveClass } from "../../src/hooks/useActiveClass";

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { class_ } = useActiveClass();
  const { session, loading } = useSession(id);
  const [submitting, setSubmitting] = useState(false);

  if (loading || !class_) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Session not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const d = new Date(session.date);
  const dateLabel = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isRsvped = !!authUser && session.rsvps.includes(authUser.uid);
  const cancelled = session.status === "cancelled";
  const isAdmin = userDoc?.role === "admin";

  async function handleToggleRsvp() {
    if (!authUser || !id) return;
    setSubmitting(true);
    try {
      if (isRsvped) {
        await removeRsvp(id, authUser.uid);
      } else {
        await rsvpToSession(id, authUser.uid);
      }
    } catch (err: any) {
      Alert.alert("RSVP failed", err?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.date}>{dateLabel}</Text>
      <Text style={styles.time}>
        {class_.startTime} – {class_.endTime}
      </Text>
      <Text style={styles.location}>{class_.location}</Text>
      <Text style={styles.address}>{class_.address}</Text>

      {cancelled ? (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledTitle}>This session was cancelled</Text>
          {session.cancellationReason ? (
            <Text style={styles.cancelledReason}>{session.cancellationReason}</Text>
          ) : null}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.rsvpBtn, isRsvped && styles.rsvpBtnActive, submitting && { opacity: 0.5 }]}
          onPress={handleToggleRsvp}
          disabled={submitting}
        >
          <Text style={[styles.rsvpBtnText, isRsvped && styles.rsvpBtnTextActive]}>
            {submitting ? "Saving..." : isRsvped ? "You're in! (Tap to remove)" : "RSVP"}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.rsvpCount}>
        {session.rsvps.length} {session.rsvps.length === 1 ? "person" : "people"} RSVP'd
      </Text>

      {isAdmin && !cancelled ? (
        <View style={styles.adminBox}>
          <Text style={styles.adminLabel}>Admin actions</Text>
          <Text style={styles.adminStub}>
            Cancel and custom-message flows arrive in Phase 4.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1", padding: 24 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE7F1", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#3B0764" },
  date: { fontSize: 28, fontWeight: "700", color: "#3B0764" },
  time: { fontSize: 18, color: "#3B0764", marginTop: 4 },
  location: { fontSize: 16, color: "#3B0764", marginTop: 16, fontWeight: "600" },
  address: { fontSize: 14, color: "#3B0764", marginTop: 4 },
  rsvpBtn: {
    backgroundColor: "#FACC15",
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
  },
  rsvpBtnActive: { backgroundColor: "#3B0764" },
  rsvpBtnText: { fontSize: 16, fontWeight: "700", color: "#3B0764" },
  rsvpBtnTextActive: { color: "#FACC15" },
  rsvpCount: { fontSize: 14, color: "#3B0764", textAlign: "center", marginTop: 12 },
  cancelledBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  cancelledTitle: { fontSize: 16, fontWeight: "700", color: "#991B1B" },
  cancelledReason: { fontSize: 14, color: "#991B1B", marginTop: 4 },
  adminBox: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FACC15",
  },
  adminLabel: { fontSize: 12, fontWeight: "700", color: "#3B0764", letterSpacing: 1 },
  adminStub: { fontSize: 12, color: "#3B0764", marginTop: 4 },
  backBtn: { marginTop: 16, backgroundColor: "#FACC15", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 32 },
  backBtnText: { color: "#3B0764", fontWeight: "700" },
});
