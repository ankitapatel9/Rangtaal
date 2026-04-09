/**
 * Session Detail Screen
 *
 * Shows session info, RSVP toggle, admin controls, and a Tutorials section.
 *
 * Dependency notes:
 *  - expo-av (video playback) NOT installed — video play is stubbed with Alert
 *  - expo-image-picker NOT installed — image/video picker is stubbed with Alert
 *  - @react-native-firebase/storage NOT installed — upload is stubbed with Alert
 *  - When those packages are added (npm install + expo prebuild), remove the stubs
 *    and uncomment the real implementations marked with TODO.
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTutorials } from "../../src/hooks/useTutorials";
import { createTutorial } from "../../src/lib/tutorials";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import type { TutorialDoc } from "../../src/types/tutorial";

// ---------------------------------------------------------------------------
// Paywall helpers
// ---------------------------------------------------------------------------

function handlePlayVideo(tutorial: TutorialDoc, paid: boolean) {
  if (!paid) {
    Alert.alert(
      "Unlock Tutorial Videos",
      "Contact admin to unlock tutorial videos."
    );
    return;
  }
  // TODO: install expo-av, then replace this Alert with inline Video playback:
  //   import { Video, ResizeMode } from "expo-av";
  //   Render <Video source={{ uri: tutorial.videoUrl }} ... />
  Alert.alert("Play Video", `Playing: ${tutorial.title}\n\n${tutorial.videoUrl}`);
}

// ---------------------------------------------------------------------------
// Admin upload
// ---------------------------------------------------------------------------

function AdminUploadButton({
  sessionId,
  currentCount,
  uploaderId
}: {
  sessionId: string;
  currentCount: number;
  uploaderId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleUpload() {
    // TODO: When expo-image-picker and @react-native-firebase/storage are installed:
    //   1. const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'videos' });
    //   2. if (result.canceled) return;
    //   3. const uri = result.assets[0].uri;
    //   4. const filename = uri.split("/").pop() ?? "video.mp4";
    //   5. const ref = storage().ref(`tutorials/${sessionId}/${filename}`);
    //   6. await ref.putFile(uri); setUploading(true) … setUploading(false);
    //   7. const videoUrl = await ref.getDownloadURL();
    //   8. await createTutorial({ sessionId, title, description, videoUrl, thumbnailUrl: null, createdBy: uploaderId, order: currentCount });

    // STUB: simulate upload with Alert since packages are missing
    Alert.alert(
      "Storage Not Available",
      "@react-native-firebase/storage, expo-av, and expo-image-picker are not installed.\n\nAdd them and update this stub."
    );
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title.");
      return;
    }
    setUploading(true);
    try {
      // STUB video URL until real upload is wired up
      const stubVideoUrl = `https://storage.example.com/tutorials/${sessionId}/stub.mp4`;
      await createTutorial({
        sessionId,
        title: title.trim(),
        description: description.trim(),
        videoUrl: stubVideoUrl,
        thumbnailUrl: null,
        createdBy: uploaderId,
        order: currentCount
      });
      setTitle("");
      setDescription("");
      setShowForm(false);
    } catch (err) {
      Alert.alert("Error", "Failed to save tutorial. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (uploading) {
    return (
      <View style={styles.uploadingRow}>
        <ActivityIndicator color="#3B0764" />
        <Text style={styles.uploadingText}>Saving tutorial…</Text>
      </View>
    );
  }

  if (!showForm) {
    return (
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => setShowForm(true)}
      >
        <Text style={styles.uploadButtonText}>+ Upload Tutorial</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.uploadForm}>
      <Text style={styles.formLabel}>Title *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Tutorial title"
        placeholderTextColor="#9CA3AF"
      />
      <Text style={styles.formLabel}>Description</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Optional description"
        placeholderTextColor="#9CA3AF"
        multiline
      />
      <View style={styles.formRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowForm(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickVideoButton} onPress={handleUpload}>
          <Text style={styles.pickVideoButtonText}>Pick Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
          <Text style={styles.saveButtonText}>Save (stub)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tutorial card
// ---------------------------------------------------------------------------

function TutorialCard({
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
      <View style={styles.tutorialCardBody}>
        <View style={styles.tutorialIcon}>
          <Text style={styles.tutorialIconText}>{paid ? "▶" : "🔒"}</Text>
        </View>
        <View style={styles.tutorialInfo}>
          <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
          {tutorial.description ? (
            <Text style={styles.tutorialDescription} numberOfLines={2}>
              {tutorial.description}
            </Text>
          ) : null}
        </View>
      </View>
      {!paid && (
        <Text style={styles.paywallHint}>Contact admin to unlock</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { tutorials, loading: tutorialsLoading } = useTutorials(id);

  const isAdmin = userDoc?.role === "admin";
  const isPaid = (userDoc as any)?.paid === true;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Session header */}
      <Text style={styles.heading}>Session</Text>
      <Text style={styles.sessionId}>{id}</Text>

      {/* RSVP area — stub, Phase 2 will wire real sessions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>RSVP</Text>
        <Text style={styles.cardSubtitle}>
          RSVP toggle arrives in Phase 2 (Class &amp; Schedule).
        </Text>
      </View>

      {/* Admin box stub */}
      {isAdmin && (
        <View style={[styles.card, styles.adminCard]}>
          <Text style={styles.adminCardTitle}>Admin Controls</Text>
          <Text style={styles.cardSubtitle}>
            Admin class controls arrive in Phase 2.
          </Text>
        </View>
      )}

      {/* Tutorials section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tutorials</Text>
      </View>

      {tutorialsLoading ? (
        <ActivityIndicator
          style={styles.spinner}
          color="#3B0764"
        />
      ) : tutorials.length === 0 ? (
        <Text style={styles.emptyText}>No tutorials yet.</Text>
      ) : (
        tutorials.map((t) => (
          <TutorialCard key={t.id} tutorial={t} paid={isPaid} />
        ))
      )}

      {isAdmin && id ? (
        <AdminUploadButton
          sessionId={id}
          currentCount={tutorials.length}
          uploaderId={authUser?.uid ?? ""}
        />
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1" },
  content: { padding: 20, paddingBottom: 40 },

  heading: { fontSize: 28, fontWeight: "700", color: "#3B0764", marginBottom: 4 },
  sessionId: { fontSize: 12, color: "#9CA3AF", marginBottom: 20 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#3B0764", marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: "#6B7280" },

  adminCard: { borderLeftWidth: 4, borderLeftColor: "#FACC15" },
  adminCardTitle: { fontSize: 18, fontWeight: "600", color: "#3B0764", marginBottom: 6 },

  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#3B0764" },

  spinner: { marginTop: 20 },
  emptyText: { color: "#6B7280", fontSize: 14, textAlign: "center", marginTop: 16 },

  // Tutorial card
  tutorialCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2
  },
  tutorialCardBody: { flexDirection: "row", alignItems: "center" },
  tutorialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE7F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  tutorialIconText: { fontSize: 18 },
  tutorialInfo: { flex: 1 },
  tutorialTitle: { fontSize: 15, fontWeight: "600", color: "#3B0764" },
  tutorialDescription: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  paywallHint: { fontSize: 11, color: "#FACC15", marginTop: 6, fontWeight: "600" },

  // Admin upload form
  uploadButton: {
    marginTop: 12,
    backgroundColor: "#3B0764",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  uploadButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },

  uploadingRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  uploadingText: { color: "#3B0764", marginLeft: 8 },

  uploadForm: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16
  },
  formLabel: { fontSize: 13, fontWeight: "600", color: "#3B0764", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#3B0764",
    marginBottom: 12
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  formRow: { flexDirection: "row", gap: 8 },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center"
  },
  cancelButtonText: { color: "#6B7280", fontWeight: "600" },
  pickVideoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FACC15",
    alignItems: "center"
  },
  pickVideoButtonText: { color: "#3B0764", fontWeight: "600" },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#3B0764",
    alignItems: "center"
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "600" }
});
