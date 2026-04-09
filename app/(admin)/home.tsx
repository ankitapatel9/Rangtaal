import React from "react";
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
import {
  Avatar,
  AvatarStack,
  Card,
  SectionHeader,
  GoldButton,
} from "../../src/components";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";
import { SessionDoc } from "../../src/types/session";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDayLabel(dateMs: number): string {
  return new Date(dateMs)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
}

function formatDate(dateMs: number): string {
  return new Date(dateMs).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getNextSession(sessions: SessionDoc[]): SessionDoc | null {
  const now = Date.now();
  const upcoming = sessions
    .filter((s) => !s.cancelled && s.date >= now)
    .sort((a, b) => a.date - b.date);
  return upcoming[0] ?? null;
}

// ─── Hero card ───────────────────────────────────────────────────────────────

interface HeroCardProps {
  session: SessionDoc;
  userName: string;
  onPress: () => void;
}

function NextSessionHero({ session, userName, onPress }: HeroCardProps) {
  const dayLabel = formatDayLabel(session.date);
  const dateStr = formatDate(session.date);
  const rsvpCount = session.rsvpUids.length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.hero}>
      <Text style={styles.heroLabel}>{dayLabel}</Text>
      <View style={styles.heroRow}>
        <View style={styles.heroDateBlock}>
          <Text style={styles.heroDate}>{dateStr}</Text>
          <Text style={styles.heroTime}>{session.time}</Text>
          <Text style={styles.heroLocation}>{session.location}</Text>
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

  const nextSession = getNextSession(sessions);
  const userName = userDoc?.name ?? "Admin";

  function navigateToSession(id: string) {
    router.push(`/session/${id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>Rangtaal</Text>
        <Avatar name={userName} size={36} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Next session hero */}
        {nextSession != null ? (
          <NextSessionHero
            session={nextSession}
            userName={userName}
            onPress={() => navigateToSession(nextSession.id)}
          />
        ) : (
          <NoSessionCard />
        )}

        {/* Activity feed */}
        <SectionHeader title="RECENT" style={styles.sectionHeader} />

        {/* Static MVP feed */}
        <FeedItem
          authorName="Priya S."
          action="posted a tutorial"
          meta="Garba Circle · 3 days ago"
          preview="Week 4 footwork breakdown — slow version with counts"
        />
        <FeedItem
          authorName="Rahul M."
          action="added photos"
          meta="Apr 1 session · 2 days ago"
          preview="12 new photos from the last session"
        />
        <FeedItem
          authorName="Asha K."
          action="in chat"
          meta="2 hours ago"
          preview="Anyone know if we're doing the Dandiya routine this Tuesday?"
        />
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
