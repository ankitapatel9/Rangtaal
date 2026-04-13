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
  onPress: () => void;
}

function NextSessionHero({ session, class_, userName, userId, onPress }: HeroCardProps) {
  const dayLabel = formatDayLabel(session.date);
  const dateStr = formatDate(session.date);
  const timeStr = formatTimeRange(class_);
  const rsvpCount = session.rsvps.length;
  const isRsvpd = session.rsvps.includes(userId);

  // Build avatar names from rsvp UIDs — in MVP we only have the current user's name
  const rsvpNames = isRsvpd ? [userName] : [];

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
}

function AnnouncementCard({ announcement, authorName }: AnnouncementCardProps) {
  const ts = announcement.createdAt
    ? formatTimeAgo(announcement.createdAt)
    : "";
  return (
    <View style={styles.announcementCard}>
      <View style={styles.announcementBorder} />
      <View style={styles.announcementContent}>
        <View style={styles.announcementHeader}>
          <Text style={styles.announcementIcon}>📢</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.announcementText}>{announcement.text}</Text>
            <Text style={styles.announcementMeta}>
              {authorName}
              {ts ? `  ·  ${ts}` : ""}
            </Text>
          </View>
        </View>
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
}

function QuickActions({ isPaid, isAdmin, router }: QuickActionsProps) {
  function handlePay() {
    Alert.alert("Payment", "Contact admin to arrange payment.");
  }

  async function handleInvite() {
    await Share.share({
      message:
        "Join me at Rangtaal — a Garba dance community. Download the app and RSVP for our next session!",
    });
  }

  return (
    <View style={styles.quickActionsRow}>
      {isAdmin ? (
        <QuickActionTile
          icon="card-outline"
          label="Manage Payments"
          onPress={() => router.push("/(admin)/finance" as any)}
        />
      ) : !isPaid ? (
        <QuickActionTile
          icon="card-outline"
          label="Pay $60"
          onPress={handlePay}
          highlight
        />
      ) : null}
      <QuickActionTile
        icon="camera-outline"
        label="Add Photo"
        onPress={() => router.push("/(participant)/capture" as any)}
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
      ) : VideoComponent ? (
        <TouchableOpacity activeOpacity={0.95} onPress={() => onVideoPress(item)}>
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
        </TouchableOpacity>
      ) : (
        <TouchableOpacity activeOpacity={0.85} onPress={() => onVideoPress(item)} style={styles.mediaVideoPlaceholder}>
          <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.8)" />
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

  // Latest active announcement only
  const latestAnnouncement = announcements[0] ?? null;

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
        {/* 1. Payment banner — show when not paid */}
        {userDoc != null && userDoc.paid === false && (
          <PaymentBanner />
        )}

        {/* 2. Next session hero */}
        {nextSession != null && class_ != null ? (
          <NextSessionHero
            session={nextSession}
            class_={class_}
            userName={userName}
            userId={userId}
            onPress={() => navigateToSession(nextSession.id)}
          />
        ) : (
          <NoSessionCard />
        )}

        {/* 3. Announcement card (latest active only) */}
        {latestAnnouncement != null && (
          <AnnouncementCard
            announcement={latestAnnouncement}
            authorName={userNameMap[latestAnnouncement.createdBy] ?? "Admin"}
          />
        )}

        {/* 4. This Week's Focus */}
        {nextSession?.topic != null && nextSession.topic.length > 0 && (
          <FocusCard
            topic={nextSession.topic}
            topicDescription={nextSession.topicDescription ?? null}
          />
        )}

        {/* 5. Quick Actions */}
        <QuickActions isPaid={isPaid} isAdmin={isAdmin} router={router} />

        {/* 6. Gallery feed inline */}
        {feedItems.length > 0 && feedItems.slice(0, 5).map((item) => (
          <MediaPost
            key={item.id}
            item={item}
            authorName={userNameMap[item.uploadedBy] ?? "Someone"}
            userId={userId}
            onVideoPress={(v) => setActiveVideo(v)}
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
    color: colors.accent,
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
    color: colors.accent,
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

  // Announcement card
  announcementCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.base,
    backgroundColor: colors.paymentBannerBg,
    borderRadius: spacing.cardRadius,
    flexDirection: "row",
    overflow: "hidden",
    ...shadows.card,
  },
  announcementBorder: {
    width: 4,
    backgroundColor: colors.accent,
    borderTopLeftRadius: spacing.cardRadius,
    borderBottomLeftRadius: spacing.cardRadius,
  },
  announcementContent: {
    flex: 1,
    padding: spacing.cardPadding,
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  announcementIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  announcementText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: 4,
  },
  announcementMeta: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
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
