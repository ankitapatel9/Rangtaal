import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { useGalleryFeed } from "../../src/hooks/useGalleryFeed";
import { useAllUsers } from "../../src/hooks/useAllUsers";
import {
  Avatar,
  AvatarStack,
  Card,
  SectionHeader,
  GoldButton,
} from "../../src/components";
import { NotificationBellIcon } from "../../src/components/NotificationBellIcon";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";
import { SessionDoc } from "../../src/types/session";
import { ClassDoc } from "../../src/types/class";
import { formatTimeAgo } from "../../src/lib/formatTime";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
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

// ─── Hero card ───────────────────────────────────────────────────────────────

interface HeroCardProps {
  session: SessionDoc;
  class_: ClassDoc;
  userName: string;
  onPress: () => void;
}

function NextSessionHero({ session, class_, userName, onPress }: HeroCardProps) {
  const dayLabel = formatDayLabel(session.date);
  const dateStr = formatDate(session.date);
  const rsvpCount = session.rsvps.length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.hero}>
      <Text style={styles.heroLabel}>{dayLabel}</Text>
      <View style={styles.heroRow}>
        <View style={styles.heroDateBlock}>
          <Text style={styles.heroDate}>{dateStr}</Text>
          <Text style={styles.heroTime}>{formatTimeRange(class_)}</Text>
          <Text style={styles.heroLocation}>{class_.location}</Text>
        </View>
        <View style={styles.heroCountBlock}>
          <Text style={styles.heroCount}>{rsvpCount}</Text>
          <Text style={styles.heroCountLabel}>Going</Text>
        </View>
      </View>
      <AvatarStack names={[userName]} size={28} maxVisible={5} style={styles.heroAvatars} />
      <GoldButton
        label="View Session →"
        onPress={onPress}
        style={styles.heroButton}
      />
    </TouchableOpacity>
  );
}

function NoSessionCard() {
  return (
    <Card style={styles.noSessionCard}>
      <Text style={styles.noSessionTitle}>No upcoming sessions</Text>
      <Text style={styles.noSessionSub}>
        Create a session to get started.
      </Text>
    </Card>
  );
}

// ─── Static feed items (MVP) ─────────────────────────────────────────────────

interface FeedItemProps {
  authorName: string;
  action: string;
  meta: string;
  preview: string;
}

function FeedItem({ authorName, action, meta, preview }: FeedItemProps) {
  return (
    <Card style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <Avatar name={authorName} size={36} />
        <View style={styles.feedHeaderText}>
          <Text style={styles.feedAction}>
            <Text style={styles.feedAuthor}>{authorName}</Text>
            {" "}
            <Text>{action}</Text>
          </Text>
          <Text style={styles.feedMeta}>{meta}</Text>
        </View>
      </View>
      <Text style={styles.feedPreview}>{preview}</Text>
    </Card>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminHome() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { class_ } = useActiveClass();
  const { sessions } = useSessions(class_?.id);
  const { items: feedItems } = useGalleryFeed();
  const { users } = useAllUsers();

  const nextSession = getNextSession(sessions);
  const userName = userDoc?.name ?? "Admin";

  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => { map[u.uid] = u.name; });
    return map;
  }, [users]);

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
        {/* Next session hero */}
        {nextSession != null && class_ != null ? (
          <NextSessionHero
            session={nextSession}
            class_={class_}
            userName={userName}
            onPress={() => navigateToSession(nextSession.id)}
          />
        ) : (
          <NoSessionCard />
        )}

        {/* Activity feed */}
        <SectionHeader title="RECENT" style={styles.sectionHeader} />

        {feedItems.length === 0 ? (
          <Card style={styles.feedCard}>
            <Text style={styles.feedPreview}>No recent activity.</Text>
          </Card>
        ) : (
          feedItems.slice(0, 5).map((item) => (
            <FeedItem
              key={item.id}
              authorName={userNameMap[item.uploadedBy] ?? "Someone"}
              action={
                item.source === "tutorial"
                  ? "posted a tutorial"
                  : item.type === "photo"
                  ? "added a photo"
                  : "added a video"
              }
              meta={formatTimeAgo(item.uploadedAt)}
              preview={item.title ?? ""}
            />
          ))
        )}
      </ScrollView>
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },

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
  heroDateBlock: { flex: 1, marginRight: spacing.base },
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
  heroCountBlock: { alignItems: "center" },
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
  heroAvatars: { marginBottom: spacing.sm },
  heroButton: { marginTop: spacing.sm },

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

  sectionHeader: {
    paddingHorizontal: spacing.pagePadding,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  feedCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.cardGap,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  feedHeaderText: { flex: 1, marginLeft: spacing.sm },
  feedAction: { fontSize: typography.fontSize.body, color: colors.textBody },
  feedAuthor: {
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  feedMeta: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  feedPreview: {
    fontSize: typography.fontSize.body,
    color: colors.textBody,
    lineHeight: typography.lineHeight.normal,
  },
});
