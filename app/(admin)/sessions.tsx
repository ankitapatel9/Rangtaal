import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSessions } from "../../src/hooks/useSessions";
import {
  SegmentedControl,
  SectionHeader,
  Card,
  AvatarStack,
  GoldButton,
} from "../../src/components";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";
import { SessionDoc } from "../../src/types/session";
import { ClassDoc } from "../../src/types/class";

// ─── helpers ────────────────────────────────────────────────────────────────

const DAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return date >= startOfWeek && date <= endOfWeek;
}

// ─── Calendar view ───────────────────────────────────────────────────────────

interface CalendarViewProps {
  sessions: SessionDoc[];
  class_: ClassDoc | null;
  onSelectSession: (session: SessionDoc) => void;
}

function CalendarView({ sessions, class_, onSelectSession }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const firstDay = new Date(year, month, 1);
  const totalDays = daysInMonth(year, month);
  const startDow = firstDay.getDay();

  const sessionDateSet = useMemo(() => {
    const map = new Map<string, SessionDoc>();
    for (const s of sessions) {
      const d = new Date(s.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map.set(d.getDate().toString(), s);
      }
    }
    return map;
  }, [sessions, year, month]);

  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId) ?? null;
  }, [selectedSessionId, sessions]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const cells: (number | null)[] = [
    ...Array<null>(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function handleDayPress(day: number) {
    const s = sessionDateSet.get(day.toString());
    if (s) setSelectedSessionId(prev => (prev === s.id ? null : s.id));
  }

  const todayDate = today.getDate();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <View>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.monthArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.monthArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calRow}>
        {DAYS.map((d, i) => (
          <View key={i} style={styles.calCell}>
            <Text style={styles.dayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.calRow}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (day == null) return <View key={col} style={styles.calCell} />;
            const session = sessionDateSet.get(day.toString());
            const isSession = session != null;
            const isSelected = session != null && session.id === selectedSessionId;
            const isToday = isCurrentMonth && day === todayDate;

            return (
              <TouchableOpacity
                key={col}
                style={styles.calCell}
                onPress={() => handleDayPress(day)}
                disabled={!isSession}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.dayCircle,
                  isSession && styles.dayCircleSession,
                  isSelected && styles.dayCircleSelected,
                  isToday && !isSession && styles.dayCircleToday,
                ]}>
                  <Text style={[
                    styles.dayNumber,
                    isSession && styles.dayNumberSession,
                    isSelected && styles.dayNumberSelected,
                    !isSession && styles.dayNumberMuted,
                  ]}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendLabel}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendLabel}>Session</Text>
        </View>
      </View>

      {selectedSession != null && (
        <TouchableOpacity onPress={() => onSelectSession(selectedSession)} activeOpacity={0.85}>
          <Card goldBorder style={styles.previewCard}>
            <View style={styles.previewRow}>
              <View style={styles.previewInfo}>
                <Text style={styles.previewDate}>{formatLongDate(selectedSession.date)}</Text>
                {class_ != null && (
                  <Text style={styles.previewTime}>
                    {class_.startTime} – {class_.endTime}
                  </Text>
                )}
                {class_ != null && (
                  <Text style={styles.previewLocation}>{class_.location}</Text>
                )}
                <View style={styles.previewMeta}>
                  <AvatarStack
                    names={selectedSession.rsvps.map((_, i) => `User ${i + 1}`)}
                    size={24}
                    maxVisible={4}
                  />
                  <Text style={styles.previewCount}>
                    {selectedSession.rsvps.length} going
                  </Text>
                </View>
              </View>
              <Text style={styles.previewChevron}>›</Text>
            </View>
          </Card>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── List view ───────────────────────────────────────────────────────────────

interface ListViewProps {
  sessions: SessionDoc[];
  onSelectSession: (session: SessionDoc) => void;
}

function ListView({ sessions, onSelectSession }: ListViewProps) {
  const now = Date.now();
  const upcoming = sessions
    .filter((s) => s.status !== "cancelled" && new Date(s.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = sessions
    .filter((s) => s.status !== "cancelled" && new Date(s.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const cancelled = sessions.filter((s) => s.status === "cancelled");

  function SessionRow({ session }: { session: SessionDoc }) {
    const thisWeek = isThisWeek(session.date);
    const isCancelled = session.status === "cancelled";
    return (
      <TouchableOpacity onPress={() => onSelectSession(session)} activeOpacity={0.8}>
        <Card
          goldBorder={thisWeek && !isCancelled}
          style={[styles.listCard, isCancelled && styles.listCardCancelled]}
        >
          <View style={styles.listRow}>
            <View style={styles.listInfo}>
              <Text style={[styles.listDate, isCancelled && styles.listDateCancelled]}>
                {formatShortDate(session.date)}
              </Text>
              <Text style={styles.listMeta}>
                {session.rsvps.length} going
              </Text>
              {isCancelled && <Text style={styles.cancelledLabel}>Cancelled</Text>}
            </View>
            <Text style={styles.listChevron}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyText}>No sessions yet. Create one to get started.</Text>
      </Card>
    );
  }

  return (
    <View>
      {upcoming.length > 0 && (
        <>
          <SectionHeader title="UPCOMING" rightLabelVariant="gold" style={styles.listSectionHeader} />
          {upcoming.map((s) => <SessionRow key={s.id} session={s} />)}
        </>
      )}
      {past.length > 0 && (
        <>
          <SectionHeader title="PAST" rightLabelVariant="gray" style={styles.listSectionHeader} />
          {past.map((s) => (
            <View key={s.id} style={styles.pastRow}>
              <SessionRow session={s} />
            </View>
          ))}
        </>
      )}
      {cancelled.length > 0 && (
        <>
          <SectionHeader title="CANCELLED" rightLabelVariant="gray" style={styles.listSectionHeader} />
          {cancelled.map((s) => <SessionRow key={s.id} session={s} />)}
        </>
      )}
    </View>
  );
}

// ─── No class seed prompt ────────────────────────────────────────────────────

function NoClassPrompt() {
  return (
    <Card style={styles.noClassCard}>
      <Text style={styles.noClassTitle}>No class yet</Text>
      <Text style={styles.noClassSub}>
        Create your first Rangtaal class to start scheduling sessions.
      </Text>
      <GoldButton
        label="Create Class"
        onPress={() => { /* Phase 2 implementation */ }}
        style={styles.noClassButton}
        variant="plum"
      />
    </Card>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminSessions() {
  const router = useRouter();
  const { class_ } = useActiveClass();
  const { sessions } = useSessions(class_?.id);
  const [viewIndex, setViewIndex] = useState<0 | 1>(0);

  function navigateToSession(session: SessionDoc) {
    router.push(`/session/${session.id}` as Parameters<typeof router.push>[0]);
  }

  if (class_ == null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sessions</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <NoClassPrompt />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sessions</Text>
        <SegmentedControl
          options={["Calendar", "List"]}
          selectedIndex={viewIndex}
          onChange={setViewIndex}
          style={styles.toggle}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {viewIndex === 0 ? (
          <CalendarView sessions={sessions} class_={class_} onSelectSession={navigateToSession} />
        ) : (
          <ListView sessions={sessions} onSelectSession={navigateToSession} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBackground },
  header: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.pageBackground,
  },
  headerTitle: {
    fontSize: typography.fontSize.heroTitle,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  toggle: {},
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxxl,
  },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  monthArrow: { fontSize: 24, color: colors.primary, fontWeight: typography.fontWeight.bold, paddingHorizontal: spacing.sm },
  monthTitle: { fontSize: typography.fontSize.sectionTitle, fontWeight: typography.fontWeight.bold, color: colors.primary },

  calRow: { flexDirection: "row", marginBottom: 4 },
  calCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  dayLabel: { fontSize: typography.fontSize.caption, fontWeight: typography.fontWeight.semiBold, color: colors.textSecondary },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayCircleSession: { backgroundColor: colors.primary },
  dayCircleSelected: { backgroundColor: colors.accent },
  dayCircleToday: { borderWidth: 1.5, borderColor: colors.primary },
  dayNumber: { fontSize: typography.fontSize.body, color: colors.primary, fontWeight: typography.fontWeight.medium },
  dayNumberSession: { color: colors.card, fontWeight: typography.fontWeight.bold },
  dayNumberSelected: { color: colors.card, fontWeight: typography.fontWeight.bold },
  dayNumberMuted: { color: colors.textSecondary },

  legend: { flexDirection: "row", justifyContent: "center", gap: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.base },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: typography.fontSize.caption, color: colors.textSecondary },

  previewCard: { marginTop: spacing.sm, marginBottom: spacing.base },
  previewRow: { flexDirection: "row", alignItems: "center" },
  previewInfo: { flex: 1 },
  previewDate: { fontSize: typography.fontSize.cardTitle, fontWeight: typography.fontWeight.semiBold, color: colors.primary, marginBottom: 2 },
  previewTime: { fontSize: typography.fontSize.body, color: colors.textBody, marginBottom: 2 },
  previewLocation: { fontSize: typography.fontSize.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  previewMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  previewCount: { fontSize: typography.fontSize.caption, color: colors.textSecondary, marginLeft: spacing.xs },
  previewChevron: { fontSize: 22, color: colors.textSecondary, marginLeft: spacing.sm },

  listSectionHeader: { marginTop: spacing.base, marginBottom: spacing.xs },
  listCard: { marginBottom: spacing.cardGap },
  listCardCancelled: { opacity: 0.55 },
  listRow: { flexDirection: "row", alignItems: "center" },
  listInfo: { flex: 1 },
  listDate: { fontSize: typography.fontSize.cardTitle, fontWeight: typography.fontWeight.semiBold, color: colors.primary, marginBottom: 2 },
  listDateCancelled: { textDecorationLine: "line-through", color: colors.textSecondary },
  listMeta: { fontSize: typography.fontSize.caption, color: colors.textSecondary },
  cancelledLabel: { fontSize: typography.fontSize.caption, color: colors.destructive, fontWeight: typography.fontWeight.semiBold, marginTop: 2 },
  listChevron: { fontSize: 22, color: colors.textSecondary, marginLeft: spacing.sm },
  pastRow: { opacity: 0.7 },
  emptyCard: { alignItems: "center", paddingVertical: spacing.xl },
  emptyText: { fontSize: typography.fontSize.body, color: colors.textBody, textAlign: "center" },

  noClassCard: { alignItems: "center", paddingVertical: spacing.xl },
  noClassTitle: { fontSize: typography.fontSize.cardTitle, fontWeight: typography.fontWeight.semiBold, color: colors.primary, marginBottom: spacing.xs },
  noClassSub: { fontSize: typography.fontSize.body, color: colors.textBody, textAlign: "center", marginBottom: spacing.base },
  noClassButton: {},
});
