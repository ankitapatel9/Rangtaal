/**
 * Participant Videos Tab
 *
 * Shows all tutorial videos grouped by session date.
 *
 * Phase 2 dependency: `useActiveClass` and `useSessions` hooks are not yet
 * implemented (they land in Phase 2: Class & Schedule). Until then, the
 * session list is empty and the "No tutorials yet" empty state is shown.
 * When Phase 2 ships, import those hooks, replace `sessions` below, and
 * this screen will work end-to-end.
 *
 * Paywall: paid users can play videos; unpaid users see a lock icon and a
 * prompt to contact admin.
 *
 * Video playback dependency: expo-av is not installed. Replace the stub
 * Alert in `handlePlayVideo` with a <Video> component once expo-av is added.
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from "react-native";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useTutorials } from "../../src/hooks/useTutorials";
import type { TutorialDoc } from "../../src/types/tutorial";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal session shape — replace with real SessionDoc from Phase 2. */
interface SessionSummary {
  id: string;
  /** Unix timestamp (ms) — used to display a human-readable date header. */
  date: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Placeholder session list
// Phase 2: replace with `useSessions(activeClassId)` from the real hooks.
// ---------------------------------------------------------------------------
const NO_SESSIONS: SessionSummary[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function handlePlayVideo(tutorial: TutorialDoc, paid: boolean) {
  if (!paid) {
    Alert.alert(
      "Unlock Tutorial Videos",
      "Contact admin to unlock tutorial videos."
    );
    return;
  }
  // TODO: install expo-av then replace this stub:
  //   import { Video, ResizeMode } from "expo-av";
  //   render <Video source={{ uri: tutorial.videoUrl }} ... />
  Alert.alert("Play Video", `Playing: ${tutorial.title}\n\n${tutorial.videoUrl}`);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TutorialRow({
  tutorial,
  paid
}: {
  tutorial: TutorialDoc;
  paid: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.tutorialCard}
      onPress={() => handlePlayVideo(tutorial, paid)}
      activeOpacity={0.8}
    >
      <View style={styles.tutorialIconWrap}>
        <Text style={styles.tutorialIconText}>{paid ? "▶" : "🔒"}</Text>
      </View>
      <View style={styles.tutorialInfo}>
        <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
        {tutorial.description ? (
          <Text style={styles.tutorialDescription} numberOfLines={2}>
            {tutorial.description}
          </Text>
        ) : null}
        {!paid && (
          <Text style={styles.paywallHint}>Contact admin to unlock</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Shows tutorials for a single session, with a date section header.
 * Renders nothing when the session has no tutorials.
 */
function SessionSection({
  session,
  paid
}: {
  session: SessionSummary;
  paid: boolean;
}) {
  const { tutorials, loading } = useTutorials(session.id);

  if (loading) {
    return (
      <View style={styles.sectionSpinner}>
        <ActivityIndicator color="#3B0764" size="small" />
      </View>
    );
  }

  if (tutorials.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>
        {session.label || formatDate(session.date)}
      </Text>
      {tutorials.map((t) => (
        <TutorialRow key={t.id} tutorial={t} paid={paid} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ParticipantVideos() {
  const { user: authUser } = useAuth();
  const { user: userDoc, loading: userLoading } = useUser(authUser?.uid);

  const isPaid = (userDoc as any)?.paid === true;

  // Phase 2: replace with real sessions from useSessions / useActiveClass
  const sessions: SessionSummary[] = NO_SESSIONS;

  if (userLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3B0764" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Tutorial Videos</Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No tutorials yet</Text>
          <Text style={styles.emptySubtitle}>
            Tutorial videos will appear here once sessions are scheduled and
            videos are uploaded by your admin.
          </Text>
        </View>
      ) : (
        sessions.map((session) => (
          <SessionSection key={session.id} session={session} paid={isPaid} />
        ))
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE7F1" },

  heading: { fontSize: 28, fontWeight: "700", color: "#3B0764", marginBottom: 20 },

  emptyState: { alignItems: "center", marginTop: 60 },
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
    borderBottomColor: "#F3D2E5"
  },
  sectionSpinner: { alignItems: "center", paddingVertical: 12 },

  tutorialCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center"
  },
  tutorialIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEE7F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  tutorialIconText: { fontSize: 20 },
  tutorialInfo: { flex: 1 },
  tutorialTitle: { fontSize: 15, fontWeight: "600", color: "#3B0764" },
  tutorialDescription: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  paywallHint: { fontSize: 11, color: "#FACC15", marginTop: 4, fontWeight: "600" }
});
