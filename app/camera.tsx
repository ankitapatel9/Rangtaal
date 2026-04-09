import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions, CameraType, CameraMode } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { X, SwitchCamera, Image as ImageIcon } from "lucide-react-native";
import storage from "@react-native-firebase/storage";
import { useAuth } from "../src/hooks/useAuth";
import { createMedia } from "../src/lib/media";
import { colors } from "../src/theme/colors";
import { typography } from "../src/theme/typography";
import { spacing } from "../src/theme/spacing";

// UI labels use "photo"/"video"; CameraView mode prop uses "picture"/"video"
type CaptureMode = "photo" | "video";

export default function CameraScreen() {
  const { sessionId, sessionDate } = useLocalSearchParams<{
    sessionId: string;
    sessionDate: string;
  }>();
  const router = useRouter();
  const { user: authUser } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>("back");
  const [mode, setMode] = useState<CaptureMode>("photo");
  // Map UI mode to CameraView's mode prop ('picture' | 'video')
  const cameraMode: CameraMode = mode === "photo" ? "picture" : "video";
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request permission on mount
  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current != null) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  function formatTimer(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // ─── Upload helper ────────────────────────────────────────────────────────

  async function uploadAndCreateDoc(
    uri: string,
    type: "photo" | "video"
  ): Promise<void> {
    if (!authUser || !sessionId) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = type === "photo" ? "jpg" : "mp4";
      const filename = `${timestamp}.${ext}`;
      const storagePath = `sessions/${sessionId}/media/${filename}`;

      await storage().ref(storagePath).putFile(uri);
      const downloadUrl = await storage().ref(storagePath).getDownloadURL();

      await createMedia({
        sessionId,
        type,
        storageUrl: downloadUrl,
        uploadedBy: authUser.uid,
      });

      // Navigate back to session detail, passing captured type for toast
      router.replace({
        pathname: "/session/[id]",
        params: { id: sessionId, captured: type },
      } as any);
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Upload failed", "Could not upload media. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // ─── Photo capture ────────────────────────────────────────────────────────

  async function handlePhotoCapture() {
    if (!cameraRef.current || uploading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo) return;

      // Compress: resize to max 1080px, JPEG 0.8
      const compressed = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      await uploadAndCreateDoc(compressed.uri, "photo");
    } catch (err) {
      console.error("Photo capture error:", err);
      Alert.alert("Capture failed", "Could not take photo. Please try again.");
    }
  }

  // ─── Video capture ────────────────────────────────────────────────────────

  async function handleVideoStart() {
    if (!cameraRef.current || uploading) return;
    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync();
      if (!video) return;
      await uploadAndCreateDoc(video.uri, "video");
    } catch (err) {
      console.error("Video record error:", err);
      Alert.alert("Record failed", "Could not record video. Please try again.");
    } finally {
      setIsRecording(false);
    }
  }

  async function handleVideoStop() {
    if (!cameraRef.current) return;
    cameraRef.current.stopRecording();
    // isRecording will be set to false after recordAsync resolves above
  }

  function handleShutterPress() {
    if (mode === "photo") {
      handlePhotoCapture();
    } else {
      if (isRecording) {
        handleVideoStop();
      } else {
        handleVideoStart();
      }
    }
  }

  // ─── Camera roll ─────────────────────────────────────────────────────────

  async function handleOpenCameraRoll() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const type = asset.type === "video" ? "video" : "photo";

    if (type === "photo") {
      const compressed = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      await uploadAndCreateDoc(compressed.uri, "photo");
    } else {
      await uploadAndCreateDoc(asset.uri, "video");
    }
  }

  // ─── Permission not granted ───────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera access is required to capture photos and videos.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Camera UI ────────────────────────────────────────────────────────────

  const sessionTag = sessionDate ?? "Session";

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraFacing}
        mode={cameraMode}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={24} color={colors.card} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.sessionTagPill}>
            <Text style={styles.sessionTagText}>{sessionTag}</Text>
          </View>

          {/* Spacer to balance layout */}
          <View style={styles.topBarSpacer} />
        </View>

        {/* Recording indicator */}
        {isRecording && (
          <View style={styles.recordingRow}>
            <View style={styles.recordingPill}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingTimer}>{formatTimer(recordingSeconds)}</Text>
            </View>
          </View>
        )}

        {/* Upload overlay */}
        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color={colors.card} />
            <Text style={styles.uploadText}>Uploading…</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity onPress={() => { if (!isRecording) setMode("photo"); }}>
              <Text style={[styles.modeLabel, mode === "photo" && styles.modeLabelActive]}>
                PHOTO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (!isRecording) setMode("video"); }}>
              <Text style={[styles.modeLabel, mode === "video" && styles.modeLabelActive]}>
                VIDEO
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom row: camera roll | shutter | flip */}
          <View style={styles.bottomRow}>
            {/* Camera roll shortcut */}
            <TouchableOpacity
              style={styles.sideButton}
              onPress={handleOpenCameraRoll}
              disabled={uploading}
            >
              <ImageIcon size={18} color={colors.card} strokeWidth={1.5} />
            </TouchableOpacity>

            {/* Shutter */}
            <TouchableOpacity
              style={[
                styles.shutter,
                isRecording && styles.shutterRecording,
              ]}
              onPress={handleShutterPress}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.shutterInner,
                  isRecording && styles.shutterInnerRecording,
                ]}
              />
            </TouchableOpacity>

            {/* Flip camera */}
            <TouchableOpacity
              style={styles.sideButton}
              onPress={() =>
                setCameraFacing((f) => (f === "back" ? "front" : "back"))
              }
              disabled={isRecording || uploading}
            >
              <SwitchCamera size={18} color={colors.card} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {mode === "photo"
              ? "Tap for photo"
              : isRecording
              ? "Tap to stop recording"
              : "Tap to start recording"}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
  },
  camera: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingTop: 56, // safe area + status bar approximation
    paddingBottom: spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionTagPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.pillRadius,
  },
  sessionTagText: {
    fontSize: typography.fontSize.caption,
    color: colors.card,
    fontWeight: typography.fontWeight.medium,
  },
  topBarSpacer: {
    width: 36,
  },

  // Recording indicator
  recordingRow: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  recordingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(220,38,38,0.85)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.pillRadius,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.card,
  },
  recordingTimer: {
    fontSize: typography.fontSize.caption,
    color: colors.card,
    fontWeight: typography.fontWeight.semiBold,
  },

  // Upload overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  uploadText: {
    fontSize: typography.fontSize.body,
    color: colors.card,
    fontWeight: typography.fontWeight.medium,
  },

  // Controls
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: spacing.pagePadding,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  modeLabel: {
    fontSize: typography.fontSize.label,
    fontWeight: typography.fontWeight.semiBold,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: typography.letterSpacing.labelWide,
  },
  modeLabelActive: {
    color: colors.accent,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxl,
  },
  sideButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Shutter
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterRecording: {
    borderColor: colors.destructive,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.card,
  },
  shutterInnerRecording: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },

  hint: {
    textAlign: "center",
    marginTop: spacing.md,
    fontSize: typography.fontSize.label,
    color: "rgba(255,255,255,0.3)",
  },

  // Permission screen
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.pagePadding,
    gap: spacing.base,
  },
  permissionText: {
    fontSize: typography.fontSize.body,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: spacing.buttonRadius,
  },
  permissionButtonText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.card,
  },
});
