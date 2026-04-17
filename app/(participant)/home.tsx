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
  return "NEXT " + date.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function formatTimeShort(class_: ClassDoc): string {
  return class_.startTime;
}

function getNextSession(sessions: SessionDoc[]): SessionDoc | null {
  const now = Date.now();
  const upcoming = sessions
    .filter((s) => s.status === "upcoming" && new Date(s.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] ?? null;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

// ─── Next session hero card (mockup 20, lines 19-34) ────────────────────────

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
  const dateStr = `${formatDate(session.date)} \u00B7 ${formatTimeShort(class_)}`;
  const rsvpCount = session.rsvps.length;
  const isRsvpd = session.rsvps.includes(userId);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={styles.hero}
    >
      {/* Day label — gold, 10px, uppercase, letter-spacing 1.5 */}
      <Text style={styles.heroLabel}>{dayLabel}</Text>

      {/* Date + RSVP count row */}
      <View style={styles.heroRow}>
        <View style={styles.heroDateBlock}>
          <Text style={styles.heroDate}>{dateStr}</Text>
          <Text style={styles.heroLocation}>{class_.location}</Text>
        </View>
        <View style={styles.heroCountBlock}>
          <Text style={styles.heroCount}>{rsvpCount}</Text>
          <Text style={styles.heroCountLabel}>Going</Text>
        </View>
      </View>

      {/* RSVP button — gold bg, white text, 10px border-radius */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          styles.heroRsvpBtn,
          isRsvpd && styles.heroRsvpBtnConfirmed,
        ]}
      >
        <Text style={[
          styles.heroRsvpText,
          isRsvpd && styles.heroRsvpTextConfirmed,
        ]}>
          {isRsvpd ? "You\u2019re Going \u2713" : "RSVP \u2192"}
        </Text>
      </TouchableOpacity>
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

// ─── Announcement card (mockup 20, lines 37-46) ─────────────────────────────
// Warm cream bg (#FFF6E0), gold left border, 📢 emoji, plum text

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
      <View style={styles.announcementInner}>
        <Text style={styles.announcementIcon}>{"\uD83D\uDCE2"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.announcementText}>{announcement.text}</Text>
          <Text style={styles.announcementMeta}>
            {authorName}
            {ts ? ` \u00B7 ${ts}` : ""}
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.announcementDismiss}
            accessibilityLabel="Dismiss announcement"
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
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
      <Text style={styles.focusLabel}>THIS WEEK&apos;S FOCUS</Text>
      <Text style={styles.focusTopic}>{topic}</Text>
      {topicDescription ? (
        <Text style={styles.focusDescription}>{topicDescription}</Text>
      ) : null}
    </View>
  );
}

// ─── Quick Actions row (mockup 20, lines 62-75) ─────────────────────────────
// White cards with shadow, centered icon + label. Only "Add Photo" and "Invite".

interface QuickActionTileProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}

function QuickActionTile({ icon, label, onPress }: QuickActionTileProps) {
  return (
    <TouchableOpacity
      style={styles.quickTile}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons
        name={icon}
        size={22}
        color={colors.primary}
      />
      <Text style={styles.quickTileLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface QuickActionsProps {
  isAdmin: boolean;
  router: ReturnType<typeof useRouter>;
  nearestSessionId: string | null;
  userId: string;
}

function QuickActions({ isAdmin, router, nearestSessionId, userId }: QuickActionsProps) {
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
        label={uploading ? "Uploading\u2026" : "Add Photo"}
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

// ─── Media feed post (mockup 08, lines 46-110) ─────────────────────────────
// White cards with 14px border-radius, shadow.
// Media INSIDE the card with margin and border-radius (NOT edge-to-edge).

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
        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? colors.orange : colors.primary} />
        {likeCount > 0 && <Text style={styles.engagementCount}>{likeCount}</Text>}
      </TouchableOpacity>
      <View style={styles.engagementBtn}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
        {comments.length > 0 && <Text style={styles.engagementCount}>{comments.length}</Text>}
      </View>
      <TouchableOpacity style={styles.engagementBtn} activeOpacity={0.7}>
        <Ionicons name="share-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function MediaPost({ item, authorName, userId, onVideoPress }: MediaPostProps) {
  const [mediaLoading, setMediaLoading] = useState(true);
  const parentType = item.source === "tutorial" ? "tutorial" as const : "media" as const;
  // Card-inset media width: screen - 2*pagePadding - 2*14px inner margin
  const cardInnerWidth = SCREEN_WIDTH - spacing.pagePadding * 2 - 28;

  return (
    <View style={styles.mediaPost}>
      {/* Author row — small avatar + name bold + timestamp */}
      <View style={styles.mediaAuthorRow}>
        <Avatar name={authorName} size={28} />
        <View style={{ flex: 1 }}>
          <Text style={styles.mediaAuthorLine}>
            <Text style={styles.mediaAuthorName}>{authorName}</Text>
            {item.source === "tutorial" && item.title && !item.title.includes("_")
              ? " posted a tutorial"
              : " added a photo"}
          </Text>
        </View>
        <Text style={styles.mediaTimestamp}>{formatTimeAgo(item.uploadedAt)}</Text>
      </View>

      {/* Loading shimmer */}
      {mediaLoading && (
        <View style={[styles.mediaShimmer, { width: cardInnerWidth }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {/* Media — inside the card with margin + border-radius (NOT edge-to-edge) */}
      {item.type === "photo" ? (
        <Image
          source={{ uri: item.storageUrl }}
          style={[styles.mediaImage, { width: cardInnerWidth }]}
          resizeMode="cover"
          onLoad={() => setMediaLoading(false)}
        />
      ) : (
        <TouchableOpacity activeOpacity={0.95} onPress={() => onVideoPress(item)}>
          {item.thumbnailUrl ? (
            <View style={[styles.mediaVideo, { width: cardInnerWidth }]}>
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={[styles.mediaVideo, { width: cardInnerWidth, position: "absolute" }]}
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
              style={[styles.mediaVideo, { width: cardInnerWidth }]}
              resizeMode={ResizeModeEnum?.COVER ?? "cover"}
              shouldPlay
              isLooping
              isMuted
              onLoad={() => setMediaLoading(false)}
              progressUpdateIntervalMillis={500}
            />
          ) : (
            <View style={[styles.mediaVideoPlaceholder, { width: cardInnerWidth }]}>
              <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Title for tutorials */}
      {item.source === "tutorial" && item.title && !item.title.includes("_") && (
        <View style={styles.mediaTitleRow}>
          <Text style={styles.mediaTitleText}>{item.title}</Text>
        </View>
      )}

      {/* Likes, comments, share */}
      <MediaPostEngagement parentId={item.id} parentType={parentType} userId={userId} />
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

  // Find nearest session (by absolute time distance) for upload attachment
  const now2 = Date.now();
  const sorted2 = [...sessions].sort(
    (a, b) =>
      Math.abs(new Date(a.date).getTime() - now2) -
      Math.abs(new Date(b.date).getTime() - now2)
  );
  const nearestSessionId = sorted2[0]?.id ?? null;

  function navigateToSession(id: string) {
    router.push(`/session/${id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — mockup 20 line 8-14 */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>Rangtaal</Text>
        <View style={styles.headerRight}>
          <NotificationBellIcon />
          <Avatar name={userName} size={32} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Next session hero */}
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

        {/* 2. Admin: Post Announcement button — gold outline */}
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
            <Ionicons name="megaphone-outline" size={16} color={colors.accent} />
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
          isAdmin={isAdmin}
          router={router}
          nearestSessionId={nearestSessionId}
          userId={userId}
        />

        {/* 6. Divider before feed — mockup 20 line 78 */}
        {feedItems.length > 0 && <View style={styles.feedDivider} />}

        {/* 7. "RECENT" section label — mockup 08 line 43 */}
        {feedItems.length > 0 && (
          <Text style={styles.recentLabel}>RECENT</Text>
        )}

        {/* 8. Gallery feed — white cards with rounded corners */}
        {feedItems.map((item) => (
          <MediaPost
            key={item.id}
            item={item}
            authorName={userNameMap[item.uploadedBy] ?? "User"}
            userId={userId}
            onVideoPress={setActiveVideo}
          />
        ))}
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

  // Header — mockup 20 lines 8-14
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.pagePadding,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: colors.pageBackground,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },

  // ── Hero card — mockup 20 lines 19-34 ──
  // bg #342145, 16px borderRadius, 16px padding
  hero: {
    marginHorizontal: spacing.pagePadding,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
  },
  // "NEXT TUESDAY" — 10px, gold, bold, uppercase, letter-spacing 1.5
  heroLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },
  heroDateBlock: {
    flex: 1,
    marginRight: spacing.base,
  },
  // "April 21 · 7:30 PM" — 17px, bold, white
  heroDate: {
    fontSize: 17,
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  // "Maple Room, Roselle" — 12px, white 50% opacity
  heroLocation: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  heroCountBlock: {
    alignItems: "center",
  },
  // "8" — 24px, extra-bold, gold
  heroCount: {
    fontSize: 24,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.accent,
  },
  // "Going" — 9px, white 50%, uppercase
  heroCountLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
  },
  // RSVP button — gold bg, 10px radius, 10px padding, centered
  heroRsvpBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  heroRsvpBtnConfirmed: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  // "RSVP →" — 13px, bold, white
  heroRsvpText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  heroRsvpTextConfirmed: {
    color: colors.accent,
  },

  // No session
  noSessionCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: 12,
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

  // ── Post Announcement button (admin) — gold outline, subtle ──
  postAnnouncementBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginHorizontal: spacing.pagePadding,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  postAnnouncementText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },

  // ── Announcement card — mockup 20 lines 37-46 ──
  // bg #FFF6E0, border-left 3px gold, 14px radius, 14px padding
  announcementCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: 12,
    backgroundColor: colors.announcementBg,
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: 14,
  },
  announcementInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  // 📢 emoji — 18px
  announcementIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  // Title — 14px, semiBold, dark plum #342145
  announcementText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    lineHeight: 20,
  },
  // Meta — 11px, gray #8B8FA3
  announcementMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  announcementDismiss: {
    padding: 2,
    alignSelf: "flex-start",
  },

  // ── Focus card — mockup 20 lines 48-59 ──
  focusCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: 12,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
  },
  focusLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  focusTopic: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: "#FFFFFF",
    marginTop: 6,
  },
  focusDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
    lineHeight: 18,
  },

  // ── Quick Actions — mockup 20 lines 62-75 ──
  // White cards, 12px radius, 12px padding, centered, shadow
  quickActionsRow: {
    flexDirection: "row",
    marginHorizontal: spacing.pagePadding,
    marginBottom: 16,
    gap: 8,
  },
  quickTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
    ...shadows.card,
  },
  // 11px, semiBold, #342145
  quickTileLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    textAlign: "center",
  },

  // ── Feed divider — mockup 20 line 78 ──
  feedDivider: {
    height: 6,
    backgroundColor: colors.border,
  },

  // ── "RECENT" label — mockup 08 line 43 ──
  recentLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semiBold,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginHorizontal: spacing.pagePadding,
    marginTop: 12,
    marginBottom: 12,
  },

  // ── Media feed posts — mockup 08 lines 46-110 ──
  // White cards with 14px border-radius, shadow, media INSIDE with margin + radius
  mediaPost: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    ...shadows.card,
  },
  // Author row: 12px 14px padding, flex, gap 10
  mediaAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  // "Ankita posted a tutorial" — 13px, #342145
  mediaAuthorLine: {
    fontSize: 13,
    color: colors.primary,
  },
  mediaAuthorName: {
    fontWeight: typography.fontWeight.semiBold,
  },
  // Timestamp — 11px, #8B8FA3, pushed to right
  mediaTimestamp: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: "auto",
    flexShrink: 0,
  },
  // Loading shimmer
  mediaShimmer: {
    height: 180,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  // Photo — inside card with margin + border-radius
  mediaImage: {
    aspectRatio: 4 / 3,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
  },
  // Video — inside card with margin + border-radius
  mediaVideo: {
    aspectRatio: 3 / 4,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    overflow: "hidden",
  },
  mediaVideoPlaceholder: {
    aspectRatio: 16 / 9,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaVideoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  // Title row below media for tutorials
  mediaTitleRow: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  mediaTitleText: {
    fontSize: 15,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  // Engagement row — inside card
  engagementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  engagementBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  engagementCount: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
});
