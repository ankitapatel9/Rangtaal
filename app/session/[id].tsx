/**
 * Session Detail Screen
 *
 * Sections (top to bottom):
 *  1. Session Info   — date, time range, location, address
 *  2. RSVP Toggle    — yellow/purple button, RSVP count, cancellation banner
 *  3. Admin Controls — cancel session (admins only)
 *  4. Tutorials      — video list with paywall; admin upload
 *  5. Gallery        — 3-column media grid; add / delete
 */

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef } from "react";
import { Video, ResizeMode } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import storage from "@react-native-firebase/storage";

import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useSession } from "../../src/hooks/useSession";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useTutorials } from "../../src/hooks/useTutorials";
import { useMedia } from "../../src/hooks/useMedia";

import { rsvpToSession, removeRsvp, cancelSession } from "../../src/lib/sessions";
import { createTutorial } from "../../src/lib/tutorials";
import { createMedia, deleteMedia } from "../../src/lib/media";

import type { TutorialDoc } from "../../src/types/tutorial";
import type { MediaDoc } from "../../src/types/media";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_SIZE = (SCREEN_WIDTH - 40 - 4) / 3; // 20px side padding each side, 2px gaps

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(t: string): string {
  // t = "19:30"
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr.padStart(2, "0")} ${suffix}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TutorialCard({
  tutorial,
  paid,
}: {
  tutorial: TutorialDoc;
  paid: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  function handlePress() {
    if (!paid) {
      Alert.alert(
        "Unlock Tutorial Videos",
        "Contact admin to unlock tutorial videos."
      );
      return;
    }
    setPlaying((prev) => !prev);
  }

  return (
    <View style={styles.tutorialCard}>
      <TouchableOpacity
        style={styles.tutorialCardBody}
        onPress={handlePress}
        activeOpacity={0.8}
      >
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
      </TouchableOpacity>

      {paid && playing && (
        <Video
          source={{ uri: tutorial.videoUrl }}
          style={styles.inlineVideo}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
        />
      )}

      {!paid && (
        <Text style={styles.paywallHint}>Contact admin to unlock</Text>
      )}
    </View>
  );
}

function AdminUploadTutorialButton({
  sessionId,
  currentCount,
  uploaderId,
}: {
  sessionId: string;
  currentCount: number;
  uploaderId: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    const uri = asset.uri;

    const title = await promptTitle();
    if (!title) return;

    setUploading(true);
    try {
      const filename = uri.split("/").pop() ?? `tutorial_${Date.now()}.mp4`;
      const ref = storage().ref(`tutorials/${sessionId}/${filename}`);
      await ref.putFile(uri);
      const videoUrl = await ref.getDownloadURL();
      await createTutorial({
        sessionId,
        title,
        description: "",
        videoUrl,
        thumbnailUrl: null,
        createdBy: uploaderId,
        order: currentCount,
      });
    } catch (err) {
      Alert.alert("Upload Failed", "Could not upload tutorial. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function promptTitle(): Promise<string | null> {
    return new Promise((resolve) => {
      Alert.prompt(
        "Tutorial Title",
        "Enter a title for this tutorial",
        [
          { text: "Cancel", onPress: () => resolve(null), style: "cancel" },
          { text: "Save", onPress: (text: string | undefined) => resolve(text?.trim() || null) },
        ],
        "plain-text"
      );
    });
  }

  if (uploading) {
    return (
      <View style={styles.uploadingRow}>
        <ActivityIndicator color="#3B0764" />
        <Text style={styles.uploadingText}>Uploading tutorial…</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
      <Text style={styles.uploadButtonText}>+ Upload Tutorial</Text>
    </TouchableOpacity>
  );
}

function MediaCell({
  item,
  onPress,
  onDelete,
  canDelete,
}: {
  item: MediaDoc;
  onPress: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.mediaCell, { width: CELL_SIZE, height: CELL_SIZE }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {item.type === "photo" ? (
        <Image
          source={{ uri: item.storageUrl }}
          style={styles.mediaCellImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.mediaCellVideo}>
          <Text style={styles.mediaCellPlayIcon}>▶</Text>
        </View>
      )}
      {canDelete && (
        <TouchableOpacity style={styles.deleteMediaBtn} onPress={onDelete}>
          <Text style={styles.deleteMediaBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { session, loading: sessionLoading } = useSession(id);
  const { class_: classDoc } = useActiveClass();
  const { tutorials, loading: tutorialsLoading } = useTutorials(id);
  const { media, loading: mediaLoading } = useMedia(id);

  const isAdmin = userDoc?.role === "admin";
  const isPaid = userDoc?.paid === true;

  // RSVP state
  const [rsvping, setRsvping] = useState(false);
  const hasRsvp =
    !!authUser && !!(session?.rsvps ?? []).includes(authUser.uid);

  // Gallery modal state
  const [selectedMedia, setSelectedMedia] = useState<MediaDoc | null>(null);

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // -------------------------------------------------------------------------
  // Loading / not-found guards
  // -------------------------------------------------------------------------

  if (sessionLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B0764" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Session not found.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // RSVP handlers
  // -------------------------------------------------------------------------

  async function handleRsvpToggle() {
    if (!authUser || !id) return;
    setRsvping(true);
    try {
      if (hasRsvp) {
        await removeRsvp(id, authUser.uid);
      } else {
        await rsvpToSession(id, authUser.uid);
      }
    } catch {
      Alert.alert("Error", "Could not update RSVP. Please try again.");
    } finally {
      setRsvping(false);
    }
  }

  // -------------------------------------------------------------------------
  // Admin cancel handler
  // -------------------------------------------------------------------------

  function handleCancelSession() {
    if (!id || !authUser) return;
    Alert.prompt(
      "Cancel Session",
      "Enter a reason for cancellation:",
      async (reason) => {
        if (!reason?.trim()) return;
        try {
          await cancelSession(id, reason.trim(), authUser.uid);
        } catch {
          Alert.alert("Error", "Could not cancel session. Please try again.");
        }
      },
      "plain-text"
    );
  }

  // -------------------------------------------------------------------------
  // Media upload handler
  // -------------------------------------------------------------------------

  async function handleAddMedia() {
    if (!authUser || !id) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
    });
    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const isVideo = asset.type === "video";

    setUploadingMedia(true);
    try {
      const ext = uri.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
      const filename = `${Date.now()}.${ext}`;
      const ref = storage().ref(`sessions/${id}/media/${filename}`);
      await ref.putFile(uri);
      const storageUrl = await ref.getDownloadURL();
      await createMedia({
        sessionId: id,
        type: isVideo ? "video" : "photo",
        storageUrl,
        uploadedBy: authUser.uid,
      });
    } catch {
      Alert.alert("Upload Failed", "Could not upload media. Try again.");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function handleDeleteMedia(item: MediaDoc) {
    Alert.alert("Delete", "Remove this media item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedia(item.id);
          } catch {
            Alert.alert("Error", "Could not delete media.");
          }
        },
      },
    ]);
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const isCancelled = session.status === "cancelled";
  const rsvpCount = (session.rsvps ?? []).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* ================================================================ */}
      {/* 1. Session Info                                                   */}
      {/* ================================================================ */}
      <View style={styles.infoCard}>
        <Text style={styles.dateText}>{formatDate(session.date)}</Text>

        {classDoc && (
          <>
            <Text style={styles.timeText}>
              {formatTime(classDoc.startTime)} – {formatTime(classDoc.endTime)}
            </Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>📍</Text>
              <View>
                <Text style={styles.locationName}>{classDoc.location}</Text>
                <Text style={styles.locationAddress}>{classDoc.address}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* ================================================================ */}
      {/* 2. RSVP / Cancellation                                            */}
      {/* ================================================================ */}
      {isCancelled ? (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledTitle}>Session Cancelled</Text>
          {session.cancellationReason ? (
            <Text style={styles.cancelledReason}>
              {session.cancellationReason}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.rsvpSection}>
          <TouchableOpacity
            style={[styles.rsvpButton, hasRsvp && styles.rsvpButtonActive]}
            onPress={handleRsvpToggle}
            disabled={rsvping || !authUser}
            activeOpacity={0.8}
          >
            {rsvping ? (
              <ActivityIndicator
                color={hasRsvp ? "#FACC15" : "#3B0764"}
                size="small"
              />
            ) : (
              <Text
                style={[
                  styles.rsvpButtonText,
                  hasRsvp && styles.rsvpButtonTextActive,
                ]}
              >
                {hasRsvp ? "You're in! (Tap to remove)" : "RSVP"}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.rsvpCount}>
            {rsvpCount === 1 ? "1 person going" : `${rsvpCount} people going`}
          </Text>
        </View>
      )}

      {/* ================================================================ */}
      {/* 3. Admin Controls                                                 */}
      {/* ================================================================ */}
      {isAdmin && !isCancelled && (
        <View style={styles.adminSection}>
          <TouchableOpacity
            style={styles.cancelSessionButton}
            onPress={handleCancelSession}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelSessionButtonText}>Cancel Session</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ================================================================ */}
      {/* 4. Tutorials                                                      */}
      {/* ================================================================ */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Tutorials{tutorials.length > 0 ? ` (${tutorials.length})` : ""}
        </Text>
      </View>

      {tutorialsLoading ? (
        <ActivityIndicator style={styles.spinner} color="#3B0764" />
      ) : tutorials.length === 0 ? (
        <Text style={styles.emptyText}>No tutorials yet.</Text>
      ) : (
        tutorials.map((t) => (
          <TutorialCard key={t.id} tutorial={t} paid={isPaid || isAdmin} />
        ))
      )}

      {isAdmin && id ? (
        <AdminUploadTutorialButton
          sessionId={id}
          currentCount={tutorials.length}
          uploaderId={authUser?.uid ?? ""}
        />
      ) : null}

      {/* ================================================================ */}
      {/* 5. Gallery                                                        */}
      {/* ================================================================ */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>
          Gallery{media.length > 0 ? ` (${media.length})` : ""}
        </Text>
      </View>

      {mediaLoading ? (
        <ActivityIndicator style={styles.spinner} color="#3B0764" />
      ) : media.length === 0 ? (
        <Text style={styles.emptyText}>No photos or videos yet.</Text>
      ) : (
        <View style={styles.galleryGrid}>
          {media.map((item) => {
            const canDelete =
              isAdmin || item.uploadedBy === (authUser?.uid ?? "");
            return (
              <MediaCell
                key={item.id}
                item={item}
                canDelete={canDelete}
                onPress={() => setSelectedMedia(item)}
                onDelete={() => handleDeleteMedia(item)}
              />
            );
          })}
        </View>
      )}

      {authUser && (
        <TouchableOpacity
          style={[styles.uploadButton, { marginTop: 12 }]}
          onPress={handleAddMedia}
          disabled={uploadingMedia}
        >
          {uploadingMedia ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.uploadButtonText}>+ Add Photo / Video</Text>
          )}
        </TouchableOpacity>
      )}

      {/* ================================================================ */}
      {/* Gallery full-screen modal                                         */}
      {/* ================================================================ */}
      <Modal
        visible={!!selectedMedia}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMedia(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedMedia(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {selectedMedia?.type === "photo" ? (
            <Image
              source={{ uri: selectedMedia.storageUrl }}
              style={styles.modalMedia}
              resizeMode="contain"
            />
          ) : selectedMedia?.type === "video" ? (
            <Video
              source={{ uri: selectedMedia.storageUrl }}
              style={styles.modalMedia}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEE7F1" },
  content: { padding: 20, paddingBottom: 60 },

  centered: {
    flex: 1,
    backgroundColor: "#FEE7F1",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  notFoundText: { fontSize: 18, color: "#3B0764", marginBottom: 16 },
  backButton: {
    backgroundColor: "#3B0764",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },

  // Session info card
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: { fontSize: 20, fontWeight: "700", color: "#3B0764", marginBottom: 4 },
  timeText: { fontSize: 15, color: "#6B7280", marginBottom: 10 },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  locationLabel: { fontSize: 16, marginTop: 1 },
  locationName: { fontSize: 15, fontWeight: "600", color: "#3B0764" },
  locationAddress: { fontSize: 13, color: "#6B7280" },

  // RSVP section
  rsvpSection: { marginBottom: 16 },
  rsvpButton: {
    backgroundColor: "#FACC15",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rsvpButtonActive: { backgroundColor: "#3B0764" },
  rsvpButtonText: { fontSize: 16, fontWeight: "700", color: "#3B0764" },
  rsvpButtonTextActive: { color: "#FACC15" },
  rsvpCount: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    color: "#6B7280",
  },

  // Cancellation banner
  cancelledBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#991B1B",
  },
  cancelledTitle: { fontSize: 16, fontWeight: "700", color: "#991B1B", marginBottom: 4 },
  cancelledReason: { fontSize: 14, color: "#991B1B" },

  // Admin section
  adminSection: { marginBottom: 16 },
  cancelSessionButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelSessionButtonText: { fontSize: 15, fontWeight: "700", color: "#991B1B" },

  // Section headers
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#3B0764" },
  spinner: { marginTop: 20 },
  emptyText: { color: "#6B7280", fontSize: 14, textAlign: "center", marginTop: 8 },

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
    elevation: 2,
  },
  tutorialCardBody: { flexDirection: "row", alignItems: "center" },
  tutorialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE7F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tutorialIconText: { fontSize: 18 },
  tutorialInfo: { flex: 1 },
  tutorialTitle: { fontSize: 15, fontWeight: "600", color: "#3B0764" },
  tutorialDescription: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  paywallHint: { fontSize: 11, color: "#FACC15", marginTop: 6, fontWeight: "600" },
  inlineVideo: { height: 200, marginTop: 12, borderRadius: 8 },

  // Upload button (shared by tutorials + media)
  uploadButton: {
    backgroundColor: "#3B0764",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  uploadButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
  uploadingRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  uploadingText: { color: "#3B0764", marginLeft: 8 },

  // Gallery grid
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  mediaCell: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  mediaCellImage: { width: "100%", height: "100%" },
  mediaCellVideo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B0764",
  },
  mediaCellPlayIcon: { fontSize: 28, color: "#FACC15" },
  deleteMediaBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteMediaBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  // Full-screen modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  modalMedia: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 },
});
