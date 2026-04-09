import React from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "../../src/lib/auth";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

// ─── Avatar initials ─────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Settings row ─────────────────────────────────────────────────────────────

interface SettingsRowProps {
  label: string;
  onPress: () => void;
  isLast?: boolean;
}

function SettingsRow({ label, onPress, isLast = false }: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={[styles.settingsRow, !isLast && styles.settingsRowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.settingsLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminProfile() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { class_ } = useActiveClass();
  const { sessions } = useSessions(class_?.id);

  const userName = userDoc?.name ?? "Admin";
  const phone = userDoc?.phoneNumber ?? "";

  // Season stats
  const totalSessions = sessions.length;
  const attended = sessions.filter((s) => s.rsvps.includes(authUser?.uid ?? "")).length;
  const rsvpd = sessions.filter(
    (s) => s.status === "upcoming" && s.rsvps.includes(authUser?.uid ?? "")
  ).length;
  // Uploaded count — placeholder until upload feature ships
  const uploaded = 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Avatar + name + phone ─── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{getInitials(userName)}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          {phone.length > 0 && <Text style={styles.userPhone}>{phone}</Text>}
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        {/* ─── Season stats card ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Season Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{attended}</Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{rsvpd}</Text>
              <Text style={styles.statLabel}>RSVP'd</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{uploaded}</Text>
              <Text style={styles.statLabel}>Uploaded</Text>
            </View>
          </View>
          {totalSessions > 0 && (
            <Text style={styles.statsMeta}>
              {totalSessions} session{totalSessions !== 1 ? "s" : ""} this season
            </Text>
          )}
        </View>

        {/* ─── Payment card (gold border) ─── */}
        <View style={[styles.card, styles.goldBorderCard]}>
          <View style={styles.paymentRow}>
            <View>
              <Text style={styles.cardTitle}>Payment</Text>
              <Text style={styles.paymentSub}>Season membership</Text>
            </View>
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>Paid ✓</Text>
            </View>
          </View>
        </View>

        {/* ─── Settings menu ─── */}
        <View style={styles.card}>
          <SettingsRow
            label="Notification Settings"
            onPress={() => router.push("/notifications" as any)}
          />
          <SettingsRow
            label="My Uploads"
            onPress={() => router.push("/(participant)/videos" as any)}
          />
          <SettingsRow
            label="Help & Support"
            onPress={() => router.push("/help" as any)}
            isLast
          />
        </View>

        {/* ─── Sign out ─── */}
        <View style={[styles.card, styles.signOutCard]}>
          <TouchableOpacity onPress={() => signOut()} activeOpacity={0.7}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.base,
  },

  // Avatar section
  avatarSection: {
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  userName: {
    fontSize: typography.fontSize.heroTitle,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  userPhone: {
    fontSize: typography.fontSize.body,
    color: colors.textBody,
    marginBottom: spacing.sm,
  },
  adminBadge: {
    backgroundColor: colors.primary,
    borderRadius: spacing.pillRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  adminBadgeText: {
    fontSize: typography.fontSize.label,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: typography.letterSpacing.label,
    textTransform: "uppercase",
  },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.cardRadius,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: typography.fontSize.cardTitle,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    marginBottom: spacing.base,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: spacing.sm,
  },
  statBlock: { alignItems: "center", flex: 1 },
  statValue: {
    fontSize: 28,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: typography.fontSize.caption,
    color: colors.textBody,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  statsMeta: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  // Payment card
  goldBorderCard: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paymentSub: {
    fontSize: typography.fontSize.caption,
    color: colors.textBody,
    marginTop: 2,
  },
  paidBadge: {
    backgroundColor: colors.paymentBannerBg,
    borderRadius: spacing.pillRadius,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  paidBadgeText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },

  // Settings rows
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.base,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsLabel: {
    fontSize: typography.fontSize.body,
    color: colors.primary,
  },

  // Sign out
  signOutCard: {
    alignItems: "center",
  },
  signOutText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.destructive,
  },
});
