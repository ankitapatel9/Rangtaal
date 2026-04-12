/**
 * VideoPlayerModal — Instagram Reels-style full-screen video player
 *
 * Features:
 * - Full-screen dark background (#0F0F0F)
 * - Video fills screen with native controls (expo-av, safe-loaded)
 * - Close button (X) top-left inside SafeAreaView
 * - Right-side floating action column: like, comment, share
 * - Bottom overlay with title + uploader name
 * - Comment bottom sheet (half-screen) that slides up from bottom
 * - Video keeps playing while comment sheet is open
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Share,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLikes } from "../hooks/useLikes";
import { useComments } from "../hooks/useComments";
import { CommentThread } from "./CommentThread";
import { CommentInput } from "./CommentInput";
import { colors } from "../theme/colors";

// ─── Safe-load expo-av ────────────────────────────────────────────────────────

let VideoComponent: any = null;
let ResizeModeEnum: any = null;
let Audio: any = null;
try {
  VideoComponent = require("expo-av").Video;
  ResizeModeEnum = require("expo-av").ResizeMode;
  Audio = require("expo-av").Audio;
} catch {}

// ─── Dimensions ───────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Video with loading spinner ──────────────────────────────────────────────

function VideoWithLoading({ videoUrl }: { videoUrl: string }) {
  const [buffering, setBuffering] = useState(true);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      setBuffering(status.isBuffering ?? false);
    }
  }, []);

  return (
    <View style={styles.videoContainer}>
      {buffering && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}
      <VideoComponent
        source={{ uri: videoUrl }}
        useNativeControls
        resizeMode={ResizeModeEnum?.CONTAIN ?? "contain"}
        shouldPlay
        isMuted={false}
        volume={1.0}
        style={styles.video}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onLoad={() => setBuffering(false)}
      />
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VideoPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  uploaderName: string;
  parentId: string;
  parentType: "tutorial" | "media";
  userId: string;
  userName: string;
}

// ─── Comment bottom sheet ─────────────────────────────────────────────────────

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  parentId: string;
  parentType: "tutorial" | "media";
  userId: string;
  userName: string;
}

function CommentSheet({
  visible,
  onClose,
  parentId,
  parentType,
  userId,
  userName,
}: CommentSheetProps) {
  const { comments } = useComments(parentId);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | undefined>(undefined);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Semi-transparent backdrop — tap to close */}
      <TouchableOpacity
        style={sheetStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet container */}
      <KeyboardAvoidingView
        style={sheetStyles.sheetWrapper}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={sheetStyles.sheet}>
          {/* Handle */}
          <View style={sheetStyles.handle} />

          {/* Header */}
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.headerTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close comments">
              <Ionicons name="close" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Comment list */}
          <ScrollView
            style={sheetStyles.commentList}
            contentContainerStyle={sheetStyles.commentListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {comments.length === 0 ? (
              <Text style={sheetStyles.emptyText}>No comments yet. Be the first!</Text>
            ) : (
              comments.map((c) => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  userId={userId}
                  onReply={(id, name) => setReplyTo({ id, name })}
                />
              ))
            )}
          </ScrollView>

          {/* Comment input */}
          <View style={sheetStyles.inputWrapper}>
            <CommentInput
              parentId={parentId}
              parentType={parentType}
              userId={userId}
              userName={userName}
              replyTo={replyTo}
              onSend={() => setReplyTo(undefined)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.55,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  commentList: {
    flex: 1,
  },
  commentListContent: {
    padding: 16,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
  inputWrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

// ─── Main VideoPlayerModal ────────────────────────────────────────────────────

export function VideoPlayerModal({
  visible,
  onClose,
  videoUrl,
  title,
  uploaderName,
  parentId,
  parentType,
  userId,
  userName,
}: VideoPlayerModalProps) {
  const [commentSheetOpen, setCommentSheetOpen] = useState(false);
  const { count: likeCount, isLiked, toggle: toggleLike } = useLikes(parentId, userId, parentType);
  const { comments } = useComments(parentId);
  const commentCount = comments.length;

  // Ensure audio plays even when the phone is on silent mode (iOS)
  useEffect(() => {
    if (visible && Audio) {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    }
  }, [visible]);

  async function handleShare() {
    try {
      await Share.share({ message: `Check out "${title}" on Rangtaal!` });
    } catch {
      // share dismissed or unavailable — no-op
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Full-screen dark background */}
      <View style={styles.container}>

        {/* ── Video ─────────────────────────────────────────────────────────── */}
        <View style={styles.videoWrapper}>
          {VideoComponent ? (
            <VideoWithLoading videoUrl={videoUrl} />
          ) : (
            <View style={styles.unavailable}>
              <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.unavailableText}>Video requires app update</Text>
            </View>
          )}
        </View>

        {/* ── Close button (top-left) ────────────────────────────────────────── */}
        <SafeAreaView style={styles.safeTopLeft} pointerEvents="box-none">
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Close video"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* ── Right action column ────────────────────────────────────────────── */}
        <View style={styles.actionColumn} pointerEvents="box-none">
          {/* Like */}
          <TouchableOpacity
            onPress={toggleLike}
            style={styles.actionItem}
            accessibilityLabel={isLiked ? "Unlike" : "Like"}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={28}
                color={isLiked ? "#FF3B5C" : "#FFFFFF"}
              />
            </View>
            {likeCount > 0 && (
              <Text style={styles.actionCount}>{likeCount}</Text>
            )}
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity
            onPress={() => setCommentSheetOpen(true)}
            style={styles.actionItem}
            accessibilityLabel="Comments"
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
            </View>
            {commentCount > 0 && (
              <Text style={styles.actionCount}>{commentCount}</Text>
            )}
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            onPress={handleShare}
            style={styles.actionItem}
            accessibilityLabel="Share"
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="share-outline" size={26} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Bottom overlay ─────────────────────────────────────────────────── */}
        <View style={styles.bottomOverlay} pointerEvents="box-none">
          <Text style={styles.bottomTitle} numberOfLines={2}>{title}</Text>
          {uploaderName.length > 0 && (
            <Text style={styles.bottomUploader} numberOfLines={1}>
              {uploaderName}
            </Text>
          )}
        </View>
      </View>

      {/* ── Comment sheet (sits on top of the video modal) ─────────────────── */}
      <CommentSheet
        visible={commentSheetOpen}
        onClose={() => setCommentSheetOpen(false)}
        parentId={parentId}
        parentType={parentType}
        userId={userId}
        userName={userName}
      />
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
  },

  // Video fills the screen, centered
  videoWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  loadingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 8,
  },

  // Unavailable fallback
  unavailable: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  unavailableText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },

  // Close button — absolute top-left
  safeTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  closeBtn: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Right action column — absolute right, vertically centered
  actionColumn: {
    position: "absolute",
    right: 16,
    bottom: 120,
    alignItems: "center",
    gap: 20,
  },
  actionItem: {
    alignItems: "center",
    gap: 4,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Bottom overlay — dark tinted background simulating a gradient
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: Platform.OS === "ios" ? 48 : 24,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  bottomTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomUploader: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
