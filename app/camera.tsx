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
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/hooks/useAuth";
import { createMedia } from "../src/lib/media";
import { colors } from "../src/theme/colors";

// Try to load native modules — they may not be in the current binary
let CameraView: any = null;
let useCameraPermissions: any = null;
let manipulateAsync: any = null;
let SaveFormat: any = null;
let storage: any = null;

try {
  const cam = require("expo-camera");
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {}

try {
  const manip = require("expo-image-manipulator");
  manipulateAsync = manip.manipulateAsync;
  SaveFormat = manip.SaveFormat;
} catch {}

try {
  storage = require("@react-native-firebase/storage").default;
} catch {}

type CaptureMode = "photo" | "video";

export default function CameraScreen() {
  const { sessionId, sessionDate } = useLocalSearchParams<{
    sessionId: string;
    sessionDate: string;
  }>();
  const router = useRouter();
  const { user: authUser } = useAuth();

  const [cameraFacing, setCameraFacing] = useState<"back" | "front">("back");
  const [mode, setMode] = useState<CaptureMode>("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);

  const cameraRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If expo-camera isn't available, show fallback
  if (!CameraView || !useCameraPermissions) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={48} color={colors.accent} />
        <Text style={styles.permissionText}>
          Camera requires a new app build.{"\n"}Use "Add from roll" in the gallery instead.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => handleOpenCameraRoll()}
        >
          <Text style={styles.permissionButtonText}>Open Camera Roll</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: "rgba(255,255,255,0.15)" }]}
          onPress={() => {
              if (router.canGoBack()) { router.back(); }
              else { router.replace("/(participant)/gallery" as any); }
            }}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  async function uploadAndCreateDoc(uri: string, type: "photo" | "video"): Promise<void> {
    if (!authUser || !sessionId) return;
    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = type === "photo" ? "jpg" : "mp4";
      const filename = `${timestamp}.${ext}`;
      const storagePath = `sessions/${sessionId}/media/${filename}`;

      if (storage) {
        await storage().ref(storagePath).putFile(uri);
        const downloadUrl = await storage().ref(storagePath).getDownloadURL();
        await createMedia({
          sessionId,
          type,
          storageUrl: downloadUrl,
          uploadedBy: authUser.uid,
        });
      } else {
        // Storage not available — save with local URI as stub
        await createMedia({
          sessionId,
          type,
          storageUrl: uri,
          uploadedBy: authUser.uid,
        });
      }

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

  async function handlePhotoCapture() {
    if (!cameraRef.current || uploading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo) return;

      let uri = photo.uri;
      if (manipulateAsync && SaveFormat) {
        const compressed = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        uri = compressed.uri;
      }

      await uploadAndCreateDoc(uri, "photo");
    } catch (err) {
      console.error("Photo capture error:", err);
      Alert.alert("Capture failed", "Could not take photo. Please try again.");
    }
  }

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
  }

  function handleShutterPress() {
    if (mode === "photo") {
      handlePhotoCapture();
    } else {
      if (isRecording) handleVideoStop();
      else handleVideoStart();
    }
  }

  async function handleOpenCameraRoll() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const type = asset.type === "video" ? "video" : "photo";

    if (type === "photo" && manipulateAsync && SaveFormat) {
      const compressed = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      await uploadAndCreateDoc(compressed.uri, "photo");
    } else {
      await uploadAndCreateDoc(asset.uri, type);
    }
  }

  const sessionTag = sessionDate ?? "Session";
  const cameraMode = mode === "photo" ? "picture" : "video";

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
          <TouchableOpacity onPress={() => {
              if (router.canGoBack()) { router.back(); }
              else { router.replace("/(participant)/gallery" as any); }
            }} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.sessionTagPill}>
            <Text style={styles.sessionTagText}>{sessionTag}</Text>
          </View>
          <View style={{ width: 36 }} />
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
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.uploadText}>Uploading…</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.modeRow}>
            <TouchableOpacity onPress={() => { if (!isRecording) setMode("photo"); }}>
              <Text style={[styles.modeLabel, mode === "photo" && styles.modeLabelActive]}>PHOTO</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (!isRecording) setMode("video"); }}>
              <Text style={[styles.modeLabel, mode === "video" && styles.modeLabelActive]}>VIDEO</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.sideButton} onPress={handleOpenCameraRoll} disabled={uploading}>
              <Ionicons name="images-outline" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shutter, isRecording && styles.shutterRecording]}
              onPress={handleShutterPress}
              disabled={uploading}
            >
              <View style={[styles.shutterInner, isRecording && styles.shutterInnerRecording]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => setCameraFacing((f) => (f === "back" ? "front" : "back"))}
              disabled={isRecording || uploading}
            >
              <Ionicons name="camera-reverse-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {mode === "photo" ? "Tap for photo" : isRecording ? "Tap to stop recording" : "Tap to start recording"}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  camera: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  closeButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  sessionTagPill: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  sessionTagText: { fontSize: 12, color: "white", fontWeight: "500" },
  recordingRow: { alignItems: "center", marginTop: 8 },
  recordingPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(220,38,38,0.85)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "white" },
  recordingTimer: { fontSize: 12, color: "white", fontWeight: "600" },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadText: { fontSize: 14, color: "white", fontWeight: "500" },
  controls: { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: 40, paddingHorizontal: 20 },
  modeRow: { flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 20 },
  modeLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.4)", letterSpacing: 1.5 },
  modeLabelActive: { color: colors.accent },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 },
  sideButton: { width: 40, height: 40, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: "white", alignItems: "center", justifyContent: "center" },
  shutterRecording: { borderColor: "#DC2626" },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "white" },
  shutterInnerRecording: { width: 28, height: 28, borderRadius: 4, backgroundColor: "#DC2626" },
  hint: { textAlign: "center", marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.3)" },
  permissionContainer: { flex: 1, backgroundColor: "#0F0F0F", alignItems: "center", justifyContent: "center", padding: 20, gap: 16 },
  permissionText: { fontSize: 14, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 22 },
  permissionButton: { backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permissionButtonText: { fontSize: 14, fontWeight: "600", color: "white" },
});
