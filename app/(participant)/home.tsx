import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { useGalleryFeed } from "../../src/hooks/useGalleryFeed";
import { useAnnouncements } from "../../src/hooks/useAnnouncements";
import { useUserNames } from "../../src/context/UserNamesContext";
import {
  Avatar,
  AvatarStack,
  Card,
  SectionHeader,
  GoldButton,
  PaymentBanner,
  VideoPlayerModal,
} from "../../src/components";
import { GalleryFeedItem } from "../../src/hooks/useGalleryFeed";
import { useLikes } from "../../src/hooks/useLikes";
import { useComments } from "../../src/hooks/useComments";
import { NotificationBellIcon } from "../../src/components/NotificationBellIcon";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing, shadows } from "../../src/theme/spacing";
import { SessionDoc } from "../../src/types/session";
import { ClassDoc } from "../../src/types/class";
import { AnnouncementDoc } from "../../src/types/announcement";
import { formatTimeAgo } from "../../src/lib/formatTime";
import {
  createAnnouncement,
  dismissAnnouncement,
} from "../../src/lib/announcements";
import { INVITE_MESSAGE } from "../../src/lib/constants";
import { createMedia } from "../../src/lib/media";

let storageModule: any = null;
try { storageModule = require("@react-native-firebase/storage").default; } catch {}

let manipulateAsync: any = null;
let SaveFormat: any = null;
try {
  const m = require("expo-image-manipulator");
  manipulateAsync = m.manipulateAsync;
  SaveFormat = m.SaveFormat;
} catch {}

let VideoThumbnailsHome: any = null;
try { VideoThumbnailsHome = require("expo-video-thumbnails"); } catch {}

async function generateThumbnailHome(videoUri: string): Promise<string | null> {
  if (!VideoThumbnailsHome) return null;
  try {
    const { uri } = await VideoThumbnailsHome.getThumbnailAsync(videoUri, { time: 1000 });
    return uri;
  } catch {
    return null;
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTimeRange(class_: ClassDoc): string {
  return `${class_.startTime} – ${class_.endTime}`;
}

function getNextSession(sessions: SessionDoc[]): SessionDoc | null {
  const now = Date.now();
  const upcoming = sessions
    .filter((s) => s.status === "upcoming" && new Date(s.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] ?? null;
}

// ─── Next session hero card ──────────────────────────────────────────────────

interface HeroCardProps {
  session: SessionDoc;
  class_: ClassDoc;
  userName: string;
  userId: string;
  userNameMap: Record<string, string>;
  onPress: () => void;
}

function NextSessionHero({ session, class_, userName, userId, userNameMap, onPress }: HeroCardProps) {
  const dayLabel = formatDayLabel(session.date);
  const dateStr = formatDate(session.date);
  const timeStr = formatTimeRange(class_);
  const rsvpCount = session.rsvps.length;
  const isRsvpd = session.rsvps.includes(userId);

  // Build avatar names from rsvp UIDs using the real name map
  const rsvpNames = session.rsvps.map((uid) => userNameMap[uid] ?? "User");

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={styles.hero}
    >
      {/* Day label */}
      <Text style={styles.heroLabel}>{dayLabel}</Text>

      {/* Date + RSVP count row */}
      <View style={styles.heroRow}>
        <View style={styles.heroDateBlock}>
          <Text style={styles.heroDate}>{dateStr}</Text>
          <Text style={styles.heroTime}>{timeStr}</Text>
          <Text style={styles.heroLocation}>{class_.location}</Text>
        </View>
        <View style={styles.heroCountBlock}>
          <Text style={styles.heroCount}>{rsvpCount}</Text>
          <Text style={styles.heroCountLabel}>Going</Text>
        </View>
      </View>

      {/* Avatar stack */}
      {rsvpNames.length > 0 && (
        <AvatarStack names={rsvpNames} size={28} maxVisible={5} style={styles.heroAvatars} />
      )}

      {/* RSVP button */}
      <GoldButton
        label={isRsvpd ? "You're Going ✓" : "RSVP to this session"}
        onPress={() => onPress()}
        variant={isRsvpd ? "outline" : "gold"}
        style={styles.heroButton}
      />
    </TouchableOpacity>
  );
}

// ─── Empty hero placeholder ──────────────────────────────────────────────────

function NoSessionCard() {
  return (
    <Card style={styles.noSessionCard}>
      <Text style={styles.noSessionTitle}>No upcoming sessions</Text>
      <Text style={styles.noSessionSub}>
        Check back soon — your next Garba session will appear here.
      </Text>
    </Card>
  );
}

// ─── Announcement card ───────────────────────────────────────────────────────

interface AnnouncementCardProps {
  announcement: AnnouncementDoc;
  authorName: string;
  isAdmin?: boolean;
}

function AnnouncementCard({ announcement, authorName, isAdmin }: AnnouncementCardProps) {
  const ts = announcement.createdAt
    ? formatTimeAgo(announcement.createdAt)
    : "";

  function handleDismiss() {
    Alert.alert(
      "Dismiss Announcement",
      "Remove this announcement for all users?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Dismiss",
          style: "destructive",
          onPress: () => dismissAnnouncement(announcement.id),
        },
      ]
    );
  }

  return (
    <View style={styles.announcementCard}>
      <Ionicons name="megaphone" size={20} color={colors.orange} style={styles.announcementIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.announcementText}>{announcement.text}</Text>
        <Text style={styles.announcementMeta}>
          {authorName}
          {ts ? `  ·  ${ts}` : ""}
        </Text>
      </View>
      {isAdmin && (
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.announcementDismiss}
          accessibilityLabel="Dismiss announcement"
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── This Week's Focus card ──────────────────────────────────────────────────

interface FocusCardProps {
  topic: string;
  topicDescription: string | null;
}

function FocusCard({ topic, topicDescription }: FocusCardProps) {
  return (
    <View style={styles.focusCard}>
      <Text style={styles.focusLabel}>THIS WEEK'S FOCUS</Text>
      <Text style={styles.focusTopic}>{topic}</Text>
      {topicDescription ? (
        <Text style={styles.focusDescription}>{topicDescription}</Text>
      ) : null}
    </View>
  );
}

// ─── Quick Actions row ────────────────────────────────────────────────────────

interface QuickActionTileProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  highlight?: boolean;
}

function QuickActionTile({ icon, label, onPress, highlight }: QuickActionTileProps) {
  return (
    <TouchableOpacity
      style={styles.quickTile}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons
        name={icon}
        size={26}
        color={highlight ? colors.orange : colors.primary}
      />
      <Text style={[styles.quickTileLabel, highlight && { color: colors.orange }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface QuickActionsProps {
  isPaid: boolean;
  isAdmin: boolean;
  router: ReturnType<typeof useRouter>;
  nearestSessionId: string | null;
  userId: string;
}

function QuickActions({ isPaid, isAdmin, router, nearestSessionId, userId }: QuickActionsProps) {
  const [uploading, setUploading] = useState(false);

  async function handleAddPhoto() {
    if (!nearestSessionId) {
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

      if (type === "photo" && manipulateAsync && SaveFormat) {
        const compressed = await manipulateAsync(
          uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        uri = compressed.uri;
      }

      if (storageModule) {
        const timestamp = Date.now();
        const ext = type === "photo" ? "jpg" : "mp4";
        const filename = `${timestamp}.${ext}`;
        const storagePath = `sessions/${nearestSessionId}/media/${filename}`;
        await storageModule().ref(storagePath).putFile(uri);
        const downloadUrl = await storageModule().ref(storagePath).getDownloadURL();

        let thumbnailUrl: string | null = null;
        if (type === "video") {
          const thumbLocalUri = await generateThumbnailHome(uri);
          if (thumbLocalUri && storageModule) {
            const thumbPath = `thumbnails/${timestamp}_thumb.jpg`;
            await storageModule().ref(thumbPath).putFile(thumbLocalUri);
            thumbnailUrl = await storageModule().ref(thumbPath).getDownloadURL();
          }
        }

        await createMedia({
          sessionId: nearestSessionId,
          type,
          storageUrl: downloadUrl,
          thumbnailUrl,
          uploadedBy: userId,
        });
      } else {
        await createMedia({
          sessionId: nearestSessionId,
          type,
          storageUrl: uri,
          uploadedBy: userId,
        });
      }

      Alert.alert("Uploaded!", `${type === "photo" ? "Photo" : "Video"} added to gallery.`);
    } catch {
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInvite() {
    await Share.share({ message: INVITE_MESSAGE });
  }

  return (
    <View style={styles.quickActionsRow}>
      <QuickActionTile
        icon={uploading ? "hourglass-outline" : "camera-outline"}
        label={uploading ? "Uploading…" : "Add Photo"}
        onPress={handleAddPhoto}
      />
      <QuickActionTile
        icon="person-add-outline"
        label="Invite"
        onPress={handleInvite}
      />
    </View>
  );
}

// ─── Safe-load expo-av ──────────────────────────────────────────────────────

let VideoComponent: any = null;
let ResizeModeEnum: any = null;
try { VideoComponent = require("expo-av").Video; ResizeModeEnum = require("expo-av").ResizeMode; } catch {}

// ─── Media feed post (Instagram-style) ──────────────────────────────────────

interface MediaPostProps {
  item: GalleryFeedItem;
  authorName: string;
  userId: string;
  onVideoPress: (item: GalleryFeedItem) => void;
}

function MediaPostEngagement({ parentId, parentType, userId }: { parentId: string; parentType: "media" | "tutorial"; userId: string }) {
  const { count: likeCount, isLiked, toggle: toggleLike } = useLikes(parentId, userId, parentType);
  const { comments } = useComments(parentId);

  return (
    <View style={styles.engagementRow}>
      <TouchableOpacity onPress={toggleLike} style={styles.engagementBtn} activeOpacity={0.7}>
        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? colors.orange : colors.primary} />
        {likeCount > 0 && <Text style={styles.engagementCount}>{likeCount}</Text>}
      </TouchableOpacity>
      <View style={styles.engagementBtn}>
        <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
        {comments.length > 0 && <Text style={styles.engagementCount}>{comments.length}</Text>}
      </View>
      <TouchableOpacity style={styles.engagementBtn} activeOpacity={0.7}>
        <Ionicons name="share-outline" size={22} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function MediaPost({ item, authorName, userId, onVideoPress }: MediaPostProps) {
  const [mediaLoading, setMediaLoading] = useState(true);
  const parentType = item.source === "tutorial" ? "tutorial" as const : "media" as const;

  return (
    <View style={styles.mediaPost}>
      {/* Author row */}
      <View style={styles.mediaAuthorRow}>
        <Avatar name={authorName} size={32} />
        <View style={{ flex: 1 }}>
          <Text style={styles.mediaAuthorName}>{authorName}</Text>
          <Text style={styles.mediaTimestamp}>{formatTimeAgo(item.uploadedAt)}</Text>
        </View>
        {item.source === "tutorial" && item.title && !item.title.includes("_") ? (
          <Text style={styles.mediaInlineTitle}>{item.title}</Text>
        ) : null}
      </View>

      {/* Loading shimmer */}
      {mediaLoading && (
        <View style={styles.mediaShimmer}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Media — edge to edge */}
      {item.type === "photo" ? (
        <Image
          source={{ uri: item.storageUrl }}
          style={styles.mediaImage}
          resizeMode="cover"
          onLoad={() => setMediaLoading(false)}
        />
      ) : (
        <TouchableOpacity activeOpacity={0.95} onPress={() => onVideoPress(item)}>
          {item.thumbnailUrl ? (
            <View style={styles.mediaVideo}>
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={[styles.mediaVideo, { position: "absolute" }]}
                resizeMode="cover"
                onLoad={() => setMediaLoading(false)}
              />
              <View style={styles.mediaVideoPlayOverlay}>
                <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          ) : VideoComponent ? (
            <VideoComponent
              source={{ uri: item.storageUrl }}
              style={styles.mediaVideo}
              resizeMode={ResizeModeEnum?.COVER ?? "cover"}
              shouldPlay
              isLooping
              isMuted
              onLoad={() => setMediaLoading(false)}
              progressUpdateIntervalMillis={500}
            />
          ) : (
            <View style={styles.mediaVideoPlaceholder}>
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Likes, comments, share */}
      <MediaPostEngagement parentId={item.id} parentType={parentType} userId={userId} />

      {/* Divider */}
      <View style={styles.mediaDivider} />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ParticipantHome() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { class_ } = useActiveClass();
  const { sessions } = useSessions(class_?.id);
  const { items: feedItems } = useGalleryFeed();
  const { announcements } = useAnnouncements();
  const userNameMap = useUserNames();

  const [activeVideo, setActiveVideo] = useState<GalleryFeedItem | null>(null);

  const nextSession = getNextSession(sessions);
  const userName = userDoc?.name ?? "You";
  const userId = authUser?.uid ?? "";
  const isAdmin = userDoc?.role === "admin";
  const isPaid = userDoc?.paid ?? true;

  // Find nearest session (by absolute time distance) for upload attachment
  const now2 = Date.now();
  const sorted2 = [...sessions].sort(
    (a, b) =>
      Math.abs(new Date(a.date).getTime() - now2) -
      Math.abs(new Date(b.date).getTime() - now2)
  );
  const nearestSessionId = sorted2[0]?.id ?? null;

  // All active announcements (newest first)

  function navigateToSession(id: string) {
    router.push(`/session/${id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>Rangtaal</Text>
        <View style={styles.headerRight}>
          <NotificationBellIcon />
          <Avatar name={userName} size={36} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Payment banner — only for unpaid participants, never admins */}
        {userDoc != null && userDoc.paid === false && userDoc.role === "participant" && (
          <PaymentBanner />
        )}

        {/* 2. Next session hero */}
        {nextSession != null && class_ != null ? (
          <NextSessionHero
            session={nextSession}
            class_={class_}
            userName={userName}
            userId={userId}
            userNameMap={userNameMap}
            onPress={() => navigateToSession(nextSession.id)}
          />
        ) : (
          <NoSessionCard />
        )}

        {/* 2b. Admin: Post Announcement button */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.postAnnouncementBtn}
            activeOpacity={0.75}
            onPress={() => {
              Alert.prompt(
                "Post Announcement",
                "What would you like to announce?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Post",
                    onPress: (text) => {
                      const trimmed = text?.trim();
                      if (!trimmed) return;
                      createAnnouncement({ text: trimmed, createdBy: userId }).catch(() =>
                        Alert.alert("Error", "Could not post announcement.")
                      );
                    },
                  },
                ],
                "plain-text"
              );
            }}
          >
            <Ionicons name="megaphone-outline" size={18} color={colors.orange} />
            <Text style={styles.postAnnouncementText}>Post Announcement</Text>
          </TouchableOpacity>
        )}

        {/* 3. All active announcements */}
        {announcements.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            authorName={userNameMap[announcement.createdBy] ?? "Admin"}
            isAdmin={isAdmin}
          />
        ))}

        {/* 4. This Week's Focus */}
        {nextSession?.topic != null && nextSession.topic.length > 0 && (
          <FocusCard
            topic={nextSession.topic}
            topicDescription={nextSession.topicDescription ?? null}
          />
        )}

        {/* 5. Quick Actions */}
        <QuickActions
          isPaid={isPaid}
          isAdmin={isAdmin}
          router={router}
          nearestSessionId={nearestSessionId}
          userId={userId}
        />

      </ScrollView>

      {/* Video player modal */}
      {activeVideo && activeVideo.type === "video" && (
        <VideoPlayerModal
          visible
          onClose={() => setActiveVideo(null)}
          videoUrl={activeVideo.storageUrl}
          title={activeVideo.title ?? ""}
          uploaderName={userNameMap[activeVideo.uploadedBy] ?? ""}
          parentId={activeVideo.id}
          parentType={activeVideo.source === "tutorial" ? "tutorial" : "media"}
          userId={userId}
          userName={userName}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.pageBackground,
  },
  wordmark: {
    fontSize: typography.fontSize.heroTitle,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },

  // Hero card
  hero: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.base,
    backgroundColor: colors.heroGradientStart,
    borderRadius: spacing.cardRadiusLg,
    padding: spacing.cardPaddingLg,
  },
  heroLabel: {
    fontSize: typography.fontSize.label,
    fontWeight: typography.fontWeight.bold,
    color: colors.orange,
    letterSpacing: typography.letterSpacing.labelWide,
    marginBottom: spacing.sm,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  heroDateBlock: {
    flex: 1,
    marginRight: spacing.base,
  },
  heroDate: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: colors.card,
    marginBottom: 2,
  },
  heroTime: {
    fontSize: typography.fontSize.body,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 2,
  },
  heroLocation: {
    fontSize: typography.fontSize.caption,
    color: "rgba(255,255,255,0.60)",
  },
  heroCountBlock: {
    alignItems: "center",
  },
  heroCount: {
    fontSize: 36,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.green,
    lineHeight: 40,
  },
  heroCountLabel: {
    fontSize: typography.fontSize.caption,
    color: "rgba(255,255,255,0.70)",
    fontWeight: typography.fontWeight.medium,
  },
  heroAvatars: {
    marginBottom: spacing.sm,
  },
  heroButton: {
    marginTop: spacing.sm,
  },

  // No session
  noSessionCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.base,
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  noSessionTitle: {
    fontSize: typography.fontSize.cardTitle,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  noSessionSub: {
    fontSize: typography.fontSize.body,
    color: colors.textBody,
    textAlign: "center",
  },

  // Post Announcement button (admin only)
  postAnnouncementBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.base,
    backgroundColor: colors.card,
    borderRadius: spacing.cardRadius,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  postAnnouncementText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.orange,
  },

  // Announcement card
  announcementCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.orange,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  announcementIcon: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  announcementText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: 4,
  },
  announcementMeta: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
  },
  announcementDismiss: {
    padding: 2,
    alignSelf: "flex-start",
  },

  // Focus card
  focusCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.base,
    backgroundColor: colors.primary,
    borderRadius: spacing.cardRadiusLg,
    padding: spacing.cardPaddingLg,
  },
  focusLabel: {
    fontSize: typography.fontSize.label,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: typography.letterSpacing.labelWide,
    marginBottom: spacing.sm,
  },
  focusTopic: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: colors.card,
    marginBottom: spacing.xs,
  },
  focusDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
    lineHeight: typography.lineHeight.relaxed,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: "row",
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  quickTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: spacing.cardRadius,
    paddingVertical: spacing.base,
    alignItems: "center",
    gap: spacing.xs,
    ...shadows.card,
  },
  quickTileLabel: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    textAlign: "center",
  },

  // Section header
  // Media feed posts
  mediaPost: {
    marginTop: 8,
  },
  mediaAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mediaAuthorName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  mediaTimestamp: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  mediaShimmer: {
    width: "100%",
    height: 200,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaImage: {
    width: Dimensions.get("window").width,
    aspectRatio: 4 / 3,
  },
  mediaVideo: {
    width: Dimensions.get("window").width,
    aspectRatio: 3 / 4,
  },
  mediaVideoPlaceholder: {
    width: Dimensions.get("window").width,
    aspectRatio: 16 / 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaVideoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaInlineTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  engagementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  engagementBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  engagementCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  mediaDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
