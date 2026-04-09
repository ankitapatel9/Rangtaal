/**
 * Session Detail Screen
 *
 * Shows session info, RSVP toggle, admin box, and a media gallery.
 *
 * NOTES:
 *  - expo-image-picker is not yet in package.json. Install with:
 *      npx expo install expo-image-picker
 *  - expo-av is not yet in package.json. Install with:
 *      npx expo install expo-av
 *  - @react-native-firebase/storage is not yet in package.json. Install with:
 *      npx expo install @react-native-firebase/storage
 *    Until then, the upload is STUBBED and won't persist to Storage.
 *    Remove the stub and uncomment the real upload block once the package is installed.
 */

import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMedia } from "../../src/hooks/useMedia";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { createMedia, deleteMedia } from "../../src/lib/media";
import { MediaDoc } from "../../src/types/media";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Optional package stubs — replace with real imports once packages installed
// ---------------------------------------------------------------------------

// expo-image-picker stub
const ImagePicker = {
  MediaTypeOptions: { All: "All" as const },
  launchImageLibraryAsync: async (_opts: any): Promise<{ canceled: boolean; assets?: { uri: string; type?: string }[] }> => {
    Alert.alert(
      "Package not installed",
      "expo-image-picker is not installed. Run: npx expo install expo-image-picker"
    );
    return { canceled: true };
  }
};

// ---------------------------------------------------------------------------
// Column count & item size
// ---------------------------------------------------------------------------
const NUM_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;
const ITEM_SIZE = (SCREEN_WIDTH - 32 - (NUM_COLUMNS - 1) * 4) / NUM_COLUMNS;

// ---------------------------------------------------------------------------
// MediaItem — renders one photo or video thumbnail in the grid
// ---------------------------------------------------------------------------
interface MediaItemProps {
  item: MediaDoc;
  currentUid: string | undefined;
  isAdmin: boolean;
  onPress: (item: MediaDoc) => void;
  onDelete: (mediaId: string) => void;
}

function MediaItem({ item, currentUid, isAdmin, onPress, onDelete }: MediaItemProps) {
  const canDelete = isAdmin || item.uploadedBy === currentUid;

  return (
    <TouchableOpacity onPress={() => onPress(item)} style={styles.gridItem}>
      <Image
        source={{ uri: item.storageUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      {item.type === "video" && (
        <View style={styles.playOverlay} pointerEvents="none">
          <Text style={styles.playIcon}>▶</Text>
        </View>
      )}
      {canDelete && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert("Delete media", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) }
            ]);
          }}
        >
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
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
  const { media, loading: mediaLoading } = useMedia(id);

  const [selectedItem, setSelectedItem] = useState<MediaDoc | null>(null);
  const [uploading, setUploading] = useState(false);

  const isAdmin = userDoc?.role === "admin";
  const isSignedIn = !!authUser;

  // -------------------------------------------------------------------------
  // Upload handler
  // -------------------------------------------------------------------------
  async function handleAddMedia() {
    if (!isSignedIn || !id || !authUser) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const isVideo = asset.type === "video" || uri.endsWith(".mp4") || uri.endsWith(".mov");
    const mediaType: "photo" | "video" = isVideo ? "video" : "photo";

    setUploading(true);
    try {
      // ------------------------------------------------------------------
      // STUB: @react-native-firebase/storage is not installed.
      // Replace this block once the package is available:
      //
      //   import storage from "@react-native-firebase/storage";
      //   const filename = `${Date.now()}-${uri.split("/").pop()}`;
      //   const ref = storage().ref(`sessions/${id}/media/${filename}`);
      //   await ref.putFile(uri);
      //   const downloadUrl = await ref.getDownloadURL();
      //
      // For now we use the local URI directly (won't survive app restarts).
      // ------------------------------------------------------------------
      const downloadUrl = uri; // STUB — replace with Storage download URL

      await createMedia({
        sessionId: id,
        type: mediaType,
        storageUrl: downloadUrl,
        uploadedBy: authUser.uid
      });
    } catch (err) {
      Alert.alert("Upload failed", String(err));
    } finally {
      setUploading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete handler
  // -------------------------------------------------------------------------
  async function handleDelete(mediaId: string) {
    try {
      await deleteMedia(mediaId);
    } catch (err) {
      Alert.alert("Delete failed", String(err));
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* ── Session ID header (replace with real session data in Phase 2) ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Session</Text>
        <Text style={styles.sessionId}>{id}</Text>
      </View>

      {/* ── Gallery section ── */}
      <View style={styles.galleryHeader}>
        <Text style={styles.galleryTitle}>
          Gallery {mediaLoading ? "" : `(${media.length})`}
        </Text>
        {isSignedIn && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddMedia}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#3B0764" size="small" />
            ) : (
              <Text style={styles.addBtnText}>+ Add Photo/Video</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {mediaLoading ? (
        <ActivityIndicator color="#3B0764" style={{ marginTop: 32 }} />
      ) : media.length === 0 ? (
        <Text style={styles.emptyText}>No media yet. Be the first to upload!</Text>
      ) : (
        <FlatList
          data={media}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <MediaItem
              item={item}
              currentUid={authUser?.uid}
              isAdmin={isAdmin}
              onPress={setSelectedItem}
              onDelete={handleDelete}
            />
          )}
        />
      )}

      {/* ── Full-screen viewer Modal ── */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedItem(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {selectedItem?.type === "photo" && (
            <Image
              source={{ uri: selectedItem.storageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}

          {selectedItem?.type === "video" && (
            // expo-av Video would go here once installed:
            //   import { Video, ResizeMode } from "expo-av";
            //   <Video source={{ uri: selectedItem.storageUrl }}
            //          style={styles.fullImage}
            //          useNativeControls
            //          resizeMode={ResizeMode.CONTAIN} />
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderText}>
                Video playback requires expo-av.{"\n"}
                Run: npx expo install expo-av
              </Text>
              <Text style={styles.videoUri}>{selectedItem.storageUrl}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEE7F1"
  },
  header: {
    padding: 24,
    paddingBottom: 8
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3B0764"
  },
  sessionId: {
    fontSize: 13,
    color: "#3B0764",
    opacity: 0.6,
    marginTop: 2
  },
  galleryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0C0DA"
  },
  galleryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3B0764"
  },
  addBtn: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 44,
    alignItems: "center"
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B0764"
  },
  emptyText: {
    textAlign: "center",
    marginTop: 48,
    color: "#3B0764",
    opacity: 0.6,
    fontSize: 14
  },
  grid: {
    padding: 16
  },
  row: {
    gap: 4,
    marginBottom: 4
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#F0C0DA"
  },
  thumbnail: {
    width: "100%",
    height: "100%"
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)"
  },
  playIcon: {
    color: "#fff",
    fontSize: 22
  },
  deleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center"
  },
  deleteIcon: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700"
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center"
  },
  modalClose: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2
  },
  videoPlaceholder: {
    padding: 32,
    alignItems: "center"
  },
  videoPlaceholderText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22
  },
  videoUri: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 12,
    textAlign: "center"
  }
});
