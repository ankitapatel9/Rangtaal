import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useAllMedia } from "../../src/hooks/useAllMedia";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useLikes } from "../../src/hooks/useLikes";
import { useComments } from "../../src/hooks/useComments";
import { colors } from "../../src/theme/colors";
import { MediaDoc } from "../../src/types/media";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterType = "all" | "photo" | "video";

// ─── Engagement bar for a single media post ──────────────────────────────────

interface PostEngagementProps {
  mediaId: string;
  userId: string;
  onCommentPress: () => void;
}

function PostEngagement({ mediaId, userId, onCommentPress }: PostEngagementProps) {
  const { count: likeCount, isLiked, toggle } = useLikes(mediaId, userId, "media");
  const { comments } = useComments(mediaId);
  const commentCount = comments.length;
  const topComment = comments[0] ?? null;

  function handleShare() {
    Alert.alert("Share", "Share coming soon.");
  }

  return (
    <View>
      {/* Engagement row */}
      <View style={styles.engagementRow}>
        <TouchableOpacity
          onPress={toggle}
          style={styles.engagementBtn}
          accessibilityLabel={isLiked ? "Unlike" : "Like"}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={24}
            color={isLiked ? colors.accent : colors.textBody}
          />
          {likeCount > 0 && (
            <Text style={[styles.engagementCount, isLiked && styles.likedCount]}>
              {likeCount}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onCommentPress} style={styles.engagementBtn}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.textBody} />
          {commentCount > 0 && (
            <Text style={styles.engagementCount}>{commentCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={styles.engagementBtn}>
          <Ionicons name="share-outline" size={22} color={colors.textBody} />
        </TouchableOpacity>
      </View>

      {/* Top comment preview */}
      {topComment != null && (
        <View style={styles.commentPreview}>
          <Text style={styles.commentPreviewText} numberOfLines={2}>
            <Text style={styles.commentAuthor}>{topComment.userName} </Text>
            {topComment.text}
          </Text>
        </View>
      )}

      {/* View all comments link */}
      {commentCount > 0 && (
        <TouchableOpacity onPress={onCommentPress} style={styles.viewAllComments}>
          <Text style={styles.viewAllCommentsText}>
            View all {commentCount} comment{commentCount !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Single feed post ─────────────────────────────────────────────────────────

interface FeedPostProps {
  item: MediaDoc;
  userId: string;
  isLast: boolean;
}

function formatSessionDate(uploadedAt: number): string {
  const d = new Date(uploadedAt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " session";
}

function formatTimeAgo(uploadedAt: number): string {
  const diffMs = Date.now() - uploadedAt;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins} MINUTE${diffMins !== 1 ? "S" : ""} AGO`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} HOUR${diffHours !== 1 ? "S" : ""} AGO`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} DAY${diffDays !== 1 ? "S" : ""} AGO`;
}

function FeedPost({ item, userId, isLast }: FeedPostProps) {
  // Derive a display name from uploadedBy uid (use first 6 chars as placeholder)
  const uploaderLabel = item.uploadedBy.length > 0
    ? `User ${item.uploadedBy.slice(0, 6)}`
    : "Unknown";

  function handleCommentPress() {
    Alert.alert("Comments", "Comments coming soon.");
  }

  return (
    <View style={[styles.post, isLast && styles.postLast]}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={styles.authorAvatar}>
          <Text style={styles.authorAvatarInitial}>
            {uploaderLabel.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{uploaderLabel}</Text>
          <Text style={styles.sessionLabel}>{formatSessionDate(item.uploadedAt)}</Text>
        </View>
      </View>

      {/* Media — edge-to-edge */}
      {item.type === "photo" ? (
        <Image
          source={{ uri: item.storageUrl }}
          style={styles.media}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: item.storageUrl }}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted
          />
          <View style={styles.playOverlay}>
            <View style={styles.playCircle}>
              <Ionicons name="play" size={28} color={colors.card} />
            </View>
          </View>
        </View>
      )}

      {/* Engagement + comments */}
      <View style={styles.postFooter}>
        <PostEngagement
          mediaId={item.id}
          userId={userId}
          onCommentPress={handleCommentPress}
        />
        <Text style={styles.timestamp}>{formatTimeAgo(item.uploadedAt)}</Text>
      </View>

      {/* Divider */}
      {!isLast && <View style={styles.divider} />}
    </View>
  );
}

// ─── Main Gallery screen ──────────────────────────────────────────────────────

export default function GalleryScreen() {
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { media, loading } = useAllMedia();
  const [filter, setFilter] = useState<FilterType>("all");

  const userId = authUser?.uid ?? "";
  const displayName = userDoc?.name ?? "Me";

  const filteredMedia = media.filter((m) => {
    if (filter === "all") return true;
    if (filter === "photo") return m.type === "photo";
    if (filter === "video") return m.type === "video";
    return true;
  });

  const renderItem = useCallback(
    ({ item, index }: { item: MediaDoc; index: number }) => (
      <FeedPost
        item={item}
        userId={userId}
        isLast={index === filteredMedia.length - 1}
      />
    ),
    [userId, filteredMedia.length]
  );

  const keyExtractor = useCallback((item: MediaDoc) => item.id, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gallery</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Alert.alert("Notifications", "Notifications coming soon.")}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {(["all", "photo", "video"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filter === f && styles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
              {f === "all" ? "All" : f === "photo" ? "Photos" : "Videos"}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredMedia.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={56} color={colors.border} />
          <Text style={styles.emptyText}>
            {filter === "all"
              ? "No photos or videos yet. Capture moments during sessions!"
              : filter === "photo"
              ? "No photos yet."
              : "No videos yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMedia}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedContent}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.pageBackground,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBtn: {
    padding: 2,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "700",
  },

  // Filter pills
  filterScroll: {
    flexShrink: 0,
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textBody,
  },
  pillTextActive: {
    color: colors.card,
  },

  // Feed
  feedContent: {
    paddingBottom: 32,
  },

  // Post
  post: {
    backgroundColor: colors.card,
    marginBottom: 0,
  },
  postLast: {
    // no special treatment needed; divider handles spacing
  },

  // Author row
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  authorAvatarInitial: {
    color: colors.card,
    fontSize: 13,
    fontWeight: "700",
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  sessionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Media — edge-to-edge, no border radius
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH, // 1:1 ratio like Instagram
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  playCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Post footer
  postFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },

  // Engagement row
  engagementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 6,
  },
  engagementBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  engagementCount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textBody,
  },
  likedCount: {
    color: colors.accent,
  },

  // Comment preview
  commentPreview: {
    marginBottom: 4,
  },
  commentPreviewText: {
    fontSize: 13,
    color: colors.textBody,
    lineHeight: 18,
  },
  commentAuthor: {
    fontWeight: "700",
    color: colors.primary,
  },

  // View all comments
  viewAllComments: {
    marginBottom: 4,
  },
  viewAllCommentsText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Timestamp
  timestamp: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 6,
    marginBottom: 8,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Loading / empty
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textBody,
    textAlign: "center",
    lineHeight: 22,
  },
});
