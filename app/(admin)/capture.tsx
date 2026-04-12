import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../src/hooks/useAuth";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { createMedia } from "../../src/lib/media";
import { colors } from "../../src/theme/colors";

let storage: any = null;
try { storage = require("@react-native-firebase/storage").default; } catch {}

let manipulateAsync: any = null;
let SaveFormat: any = null;
try {
  const m = require("expo-image-manipulator");
  manipulateAsync = m.manipulateAsync;
  SaveFormat = m.SaveFormat;
} catch {}

export default function CaptureTab() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { class_, loading: classLoading } = useActiveClass();
  const { sessions, loading: sessionsLoading } = useSessions(class_?.id);
  const [uploading, setUploading] = useState(false);

  const loading = classLoading || sessionsLoading;

  // Find nearest session
  const now = Date.now();
  const sorted = [...sessions].sort(
    (a, b) =>
      Math.abs(new Date(a.date).getTime() - now) -
      Math.abs(new Date(b.date).getTime() - now)
  );
  const nearest = sorted[0];

  async function handleCapture() {
    if (!nearest || !authUser) {
      Alert.alert("No Sessions", "No sessions available to attach media to.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const type = asset.type === "video" ? "video" as const : "photo" as const;

    setUploading(true);
    try {
      let uri = asset.uri;

      // Compress photos
      if (type === "photo" && manipulateAsync && SaveFormat) {
        const compressed = await manipulateAsync(
          uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        uri = compressed.uri;
      }

      // Upload to storage
      if (storage) {
        const timestamp = Date.now();
        const ext = type === "photo" ? "jpg" : "mp4";
        const filename = `${timestamp}.${ext}`;
        const storagePath = `sessions/${nearest.id}/media/${filename}`;
        await storage().ref(storagePath).putFile(uri);
        const downloadUrl = await storage().ref(storagePath).getDownloadURL();
        await createMedia({
          sessionId: nearest.id,
          type,
          storageUrl: downloadUrl,
          uploadedBy: authUser.uid,
        });
      } else {
        await createMedia({
          sessionId: nearest.id,
          type,
          storageUrl: uri,
          uploadedBy: authUser.uid,
        });
      }

      Alert.alert("Uploaded!", `${type === "photo" ? "Photo" : "Video"} added to gallery.`);
      router.push("/(admin)/gallery" as any);
    } catch (err) {
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenCamera() {
    if (!nearest) {
      Alert.alert("No Sessions", "No sessions available.");
      return;
    }
    const dateLabel = new Date(nearest.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    router.push({
      pathname: "/camera",
      params: { sessionId: nearest.id, sessionDate: dateLabel + " Session" },
    } as any);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="camera" size={40} color="white" />
        </View>
        <Text style={styles.title}>Capture</Text>
        <Text style={styles.subtitle}>
          {nearest
            ? `Add to ${new Date(nearest.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })} session`
            : "No sessions available"}
        </Text>

        {uploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={handleCapture} activeOpacity={0.7}>
              <Ionicons name="images-outline" size={22} color={colors.primary} />
              <Text style={styles.buttonText}>Camera Roll</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonGold} onPress={handleOpenCamera} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={22} color="white" />
              <Text style={styles.buttonGoldText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBackground, alignItems: "center", justifyContent: "center" },
  content: { alignItems: "center", padding: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.primary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 32 },
  buttonRow: { flexDirection: "row", gap: 12 },
  button: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.card, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  buttonText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  buttonGold: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.accent, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  buttonGoldText: { fontSize: 15, fontWeight: "600", color: "white" },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  uploadingText: { fontSize: 14, color: colors.textSecondary },
});
