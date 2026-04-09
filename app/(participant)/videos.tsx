import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { useTutorials } from "../../src/hooks/useTutorials";
import type { TutorialDoc } from "../../src/types/tutorial";

function TutorialRow({ tutorial, paid }: { tutorial: TutorialDoc; paid: boolean }) {
  const [playing, setPlaying] = useState(false);

  function handlePress() {
    if (!paid) {
      Alert.alert("Unlock Tutorial Videos", "Contact admin to unlock tutorial videos.");
      return;
    }
    setPlaying(!playing);
  }

  return (
    <View style={styles.tutorialCard}>
      <TouchableOpacity style={styles.tutorialHeader} onPress={handlePress} activeOpacity={0.8}>
        <View style={styles.tutorialIconWrap}>
          <Text style={styles.tutorialIconText}>{paid ? "▶" : "🔒"}</Text>
        </View>
        <View style={styles.tutorialInfo}>
          <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
          {tutorial.description ? (
            <Text style={styles.tutorialDescription} numberOfLines={2}>{tutorial.description}</Text>
          ) : null}
          {!paid && <Text style={styles.paywallHint}>Contact admin to unlock</Text>}
        </View>
      </TouchableOpacity>
      {playing && paid && (
        <Video
          source={{ uri: tutorial.videoUrl }}
          style={styles.videoPlayer}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
        />
      )}
    </View>
  );
}

function SessionSection({ sessionId, dateLabel, paid }: { sessionId: string; dateLabel: string; paid: boolean }) {
  const { tutorials, loading } = useTutorials(sessionId);

  if (loading) {
    return <ActivityIndicator style={{ paddingVertical: 12 }} color="#3B0764" size="small" />;
  }
  if (tutorials.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{dateLabel}</Text>
      {tutorials.map((t) => (
        <TutorialRow key={t.id} tutorial={t} paid={paid} />
      ))}
    </View>
  );
}

export default function ParticipantVideos() {
  const { user: authUser } = useAuth();
  const { user: userDoc, loading: userLoading } = useUser(authUser?.uid);
  const { class_, loading: classLoading } = useActiveClass();
  const { sessions, loading: sessionsLoading } = useSessions(class_?.id);

  const isPaid = userDoc?.paid === true;
  const loading = userLoading || classLoading || sessionsLoading;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3B0764" />
      </View>
    );
  }

  if (!class_ || sessions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No tutorials yet</Text>
        <Text style={styles.emptySubtitle}>
          Tutorial videos will appear here once sessions are scheduled and videos are uploaded.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Tutorial Videos</Text>
      {sessions.map((session) => {
        const d = new Date(session.date);
        const dateLabel = d.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        return (
          <SessionSection
            key={session.id}
            sessionId={session.id}
            dateLabel={dateLabel}
            paid={isPaid}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE7F1", padding: 24 },
  heading: { fontSize: 28, fontWeight: "700", color: "#3B0764", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#3B0764", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  section: { marginBottom: 24 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B0764",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3D2E5",
  },
  tutorialCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  tutorialHeader: {
    flexDirection: "row",
    padding: 14,
    alignItems: "center",
  },
  tutorialIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEE7F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tutorialIconText: { fontSize: 20 },
  tutorialInfo: { flex: 1 },
  tutorialTitle: { fontSize: 15, fontWeight: "600", color: "#3B0764" },
  tutorialDescription: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  paywallHint: { fontSize: 11, color: "#FACC15", marginTop: 4, fontWeight: "600" },
  videoPlayer: { width: "100%", height: 220 },
});
