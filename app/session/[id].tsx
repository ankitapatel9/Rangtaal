import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { useActiveClass } from "../../src/hooks/useActiveClass";
import { useSession } from "../../src/hooks/useSession";
import { useTutorials } from "../../src/hooks/useTutorials";
import { useMedia } from "../../src/hooks/useMedia";
import {
  rsvpToSession,
  removeRsvp,
  cancelSession,
} from "../../src/lib/sessions";
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
import { TutorialDoc } from "../../src/types/tutorial";
import { MediaDoc } from "../../src/types/media";
import { ClassDoc } from "../../src/types/class";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GALLERY_COL = 3;
const GALLERY_SIZE = (SCREEN_WIDTH - spacing.pagePadding * 2 - spacing.xs * 2) / GALLERY_COL;

// ─── Section 1: Plum hero header ─────────────────────────────────────────────

interface HeaderSectionProps {
  dateStr: string;
  class_: ClassDoc | null;
  cancelled: boolean;
  onBack: () => void;
}

function formatLongDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function HeaderSection({ dateStr, class_, cancelled, onBack }: HeaderSectionProps) {
  return (
    <View style={styles.heroSection}>
      <SafeAreaView>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <Text style={styles.heroLabel}>
        {cancelled ? "CANCELLED SESSION" : "UPCOMING SESSION"}
      </Text>
      <Text style={styles.heroDate}>{formatLongDate(dateStr)}</Text>
      {class_ != null && (
        <Text style={styles.heroTime}>{class_.startTime} – {class_.endTime}</Text>
      )}
      {class_ != null && (
        <View style={styles.heroLocationRow}>
          <Text style={styles.heroLocationIcon}>📍</Text>
          <View>
            <Text style={styles.heroLocationName}>{class_.location}</Text>
            <Text style={styles.heroAddress}>{class_.address}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Section 2: RSVP card ────────────────────────────────────────────────────

interface RsvpSectionProps {
  sessionId: string;
  rsvps: string[];
  userId: string;
  userName: string;
  cancelled: boolean;
  cancellationReason: string | null;
  userPaid: boolean;
}

function RsvpSection({
  sessionId,
  rsvps,
  userId,
  userName,
  cancelled,
  cancellationReason,
}: RsvpSectionProps) {
  const [loading, setLoading] = useState(false);
  const isRsvpd = rsvps.includes(userId);
  const rsvpNames = rsvps.map((_, i) => `Attendee ${i + 1}`);

  async function handleRsvpToggle() {
    if (!userId) return;
    setLoading(true);
    try {
      if (isRsvpd) {
        await removeRsvp(sessionId, userId);
      } else {
        await rsvpToSession(sessionId, userId);
      }
    } catch (err) {
      Alert.alert("Error", "Could not update RSVP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (cancelled) {
    return (
      <View style={[styles.cancelledBanner]}>
        <Text style={styles.cancelledBannerTitle}>This session was cancelled</Text>
        {cancellationReason != null && cancellationReason.length > 0 && (
          <Text style={styles.cancelledBannerReason}>{cancellationReason}</Text>
        )}
      </View>
    );
  }

  return (
    <Card style={styles.rsvpCard}>
      <View style={styles.rsvpRow}>
        <AvatarStack names={rsvpNames} size={32} maxVisible={5} />
        <Text style={styles.rsvpCount}>
          {rsvps.length} {rsvps.length === 1 ? "person" : "people"} going
        </Text>
      </View>

      {isRsvpd ? (
        <Card goldBorder style={styles.confirmedCard}>
          <View style={styles.confirmedRow}>
            <View style={styles.confirmedCheck}>
              <Text style={styles.confirmedCheckMark}>✓</Text>
            </View>
            <View style={styles.confirmedText}>
              <Text style={styles.confirmedTitle}>You're in!</Text>
              <TouchableOpacity onPress={handleRsvpToggle} disabled={loading}>
                <Text style={styles.confirmedSub}>
                  {loading ? "Updating…" : "Tap to cancel your RSVP"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      ) : (
        <GoldButton
          label="RSVP to this session"
          onPress={handleRsvpToggle}
          loading={loading}
          style={styles.rsvpButton}
        />
      )}
    </Card>
  );
}

// ─── Section 3: Admin cancel (bottom sheet) ───────────────────────────────────

interface AdminCancelSectionProps {
  sessionId: string;
  adminUid: string;
  cancelled: boolean;
}

function AdminCancelSection({ sessionId, adminUid, cancelled }: AdminCancelSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (cancelled) return null;

  async function handleCancel() {
    if (!reason.trim()) {
      Alert.alert("Reason required", "Please enter a cancellation reason.");
      return;
    }
    setLoading(true);
    try {
      await cancelSession(sessionId, reason.trim(), adminUid);
      setSheetOpen(false);
      setReason("");
    } catch {
      Alert.alert("Error", "Could not cancel session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.adminSection}>
      <GoldButton
        label="Cancel Session"
        onPress={() => setSheetOpen(true)}
        variant="destructive"
      />

      {/* Bottom sheet modal for cancel reason */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSheetOpen(false)}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Cancel Session</Text>
          <Text style={styles.sheetSub}>
            Let participants know why this session is being cancelled.
          </Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="Cancellation reason (e.g. venue unavailable)"
            placeholderTextColor={colors.textSecondary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            autoFocus
          />
          <GoldButton
            label="Cancel Session"
            onPress={handleCancel}
            variant="destructive"
            loading={loading}
            style={styles.sheetButton}
          />
          <GoldButton
            label="Keep Session"
            onPress={() => setSheetOpen(false)}
            variant="outline"
            style={styles.sheetButtonSecondary}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Section 4: Tutorials ─────────────────────────────────────────────────────

interface TutorialCardProps {
  tutorial: TutorialDoc;
  userPaid: boolean;
}

function TutorialCard({ tutorial, userPaid }: TutorialCardProps) {
  const [playing, setPlaying] = useState(false);
  const locked = !userPaid;

  function handlePress() {
    if (locked) {
      Alert.alert("Unlock Required", "Contact admin to get access to tutorials.");
      return;
    }
    setPlaying((prev) => !prev);
  }

  return (
    <TouchableOpacity key={tutorial.id} onPress={handlePress} activeOpacity={0.8}>
      <Card style={styles.tutorialCard}>
        {/* Gold accent line at top */}
        <View style={styles.tutorialAccentLine} />
        <View style={styles.tutorialRow}>
          {/* Icon */}
          <View style={[styles.tutorialIconCircle, locked && styles.tutorialIconCircleLocked]}>
            <Text style={styles.tutorialIcon}>{locked ? "🔒" : (playing ? "■" : "▶")}</Text>
          </View>
          {/* Info */}
          <View style={styles.tutorialInfo}>
            <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
            {tutorial.description != null && (
              <Text style={styles.tutorialDesc} numberOfLines={playing ? undefined : 2}>
                {tutorial.description}
              </Text>
            )}
          </View>
        </View>
        {playing && !locked && (
          <Video
            source={{ uri: tutorial.videoUrl }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            style={styles.inlineVideo}
          />
        )}
      </Card>
    </TouchableOpacity>
  );
}

interface TutorialsSectionProps {
  tutorials: TutorialDoc[];
  userPaid: boolean;
  isAdmin: boolean;
}

function TutorialsSection({ tutorials, userPaid, isAdmin }: TutorialsSectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title="Tutorials"
        rightLabel={tutorials.length > 0 ? `${tutorials.length} videos` : undefined}
        rightLabelVariant="gray"
        style={styles.sectionHeaderPadded}
      />

      {tutorials.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tutorials yet.</Text>
        </Card>
      ) : (
        tutorials.map((t) => (
          <TutorialCard key={t.id} tutorial={t} userPaid={userPaid} />
        ))
      )}

      {isAdmin && (
        <GoldButton
          label="Upload Tutorial"
          onPress={() => Alert.alert("Upload", "Tutorial upload coming in Phase 2.")}
          variant="plum"
          style={styles.uploadButton}
        />
      )}
    </View>
  );
}

// ─── Section 5: Gallery ───────────────────────────────────────────────────────

interface GallerySectionProps {
  media: MediaDoc[];
  isAdmin: boolean;
  userId: string;
}

function GallerySection({ media, isAdmin, userId }: GallerySectionProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  function handleMediaPress(m: MediaDoc) {
    if (m.type === "photo") {
      setPreviewUri(m.storageUrl);
    } else {
      Alert.alert("Video", "Video playback coming in Phase 2.");
    }
  }

  const canDelete = (m: MediaDoc) => isAdmin || m.uploadedBy === userId;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Gallery"
        rightLabel={media.length > 0 ? `+ Add` : "+ Add"}
        rightLabelVariant="gold"
        onRightPress={() => Alert.alert("Add Media", "Media upload coming in Phase 2.")}
        style={styles.sectionHeaderPadded}
      />

      {media.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No photos or videos yet.</Text>
        </Card>
      ) : (
        <View style={styles.galleryGrid}>
          {media.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => handleMediaPress(m)}
              onLongPress={() => {
                if (canDelete(m)) {
                  Alert.alert("Delete", "Delete this media? (Phase 2 implementation)");
                }
              }}
              activeOpacity={0.85}
              style={styles.galleryCell}
            >
              <Image
                source={{ uri: m.storageUrl }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
              {m.type === "video" && (
                <View style={styles.galleryVideoOverlay}>
                  <Text style={styles.galleryPlayIcon}>▶</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Full-screen photo preview modal */}
      <Modal
        visible={previewUri != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <TouchableOpacity
          style={styles.previewOverlay}
          onPress={() => setPreviewUri(null)}
          activeOpacity={1}
        >
          {previewUri != null && (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Loading / Not Found states ───────────────────────────────────────────────

function LoadingScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity onPress={onBack} style={styles.backBtnTop}>
        <Text style={styles.backTextTop}>‹ Back</Text>
      </TouchableOpacity>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading session…</Text>
      </View>
    </SafeAreaView>
  );
}

function NotFoundScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity onPress={onBack} style={styles.backBtnTop}>
        <Text style={styles.backTextTop}>‹ Back</Text>
      </TouchableOpacity>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Session not found.</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);
  const { class_ } = useActiveClass();
  const { session, loading } = useSession(id);
  const { tutorials } = useTutorials(id);
  const { media } = useMedia(id);

  const userId = authUser?.uid ?? "";
  const userName = userDoc?.name ?? "You";
  const isAdmin = userDoc?.role === "admin";
  const userPaid = userDoc?.paid ?? false;

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(participant)/schedule" as Parameters<typeof router.replace>[0]);
    }
  }

  if (loading) return <LoadingScreen onBack={handleBack} />;
  if (session == null) return <NotFoundScreen onBack={handleBack} />;

  const isCancelled = session.status === "cancelled";

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section 1: Plum hero header */}
        <HeaderSection
          dateStr={session.date}
          class_={class_}
          cancelled={isCancelled}
          onBack={handleBack}
        />

        {/* Section 2: RSVP */}
        <RsvpSection
          sessionId={session.id}
          rsvps={session.rsvps}
          userId={userId}
          userName={userName}
          cancelled={isCancelled}
          cancellationReason={session.cancellationReason}
          userPaid={userPaid}
        />

        {/* Section 3: Admin cancel */}
        {isAdmin && (
          <AdminCancelSection
            sessionId={session.id}
            adminUid={userId}
            cancelled={isCancelled}
          />
        )}

        {/* Section 4: Tutorials */}
        <TutorialsSection
          tutorials={tutorials}
          userPaid={userPaid}
          isAdmin={isAdmin}
        />

        {/* Section 5: Gallery */}
        <GallerySection
          media={media}
          isAdmin={isAdmin}
          userId={userId}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxxl },

  // Hero header
  heroSection: {
    backgroundColor: colors.heroGradientStart,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  backBtn: {
    marginBottom: spacing.base,
  },
  backText: {
    color: colors.accent,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
  },
  heroLabel: {
    fontSize: typography.fontSize.label,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    letterSpacing: typography.letterSpacing.labelWide,
    marginBottom: spacing.sm,
  },
  heroDate: {
    fontSize: 24,
    fontWeight: typography.fontWeight.extraBold,
    color: colors.card,
    marginBottom: spacing.xs,
  },
  heroTime: {
    fontSize: typography.fontSize.cardTitle,
    color: "rgba(255,255,255,0.75)",
    marginBottom: spacing.sm,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  heroLocationIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  heroLocationName: {
    fontSize: typography.fontSize.body,
    color: colors.card,
    fontWeight: typography.fontWeight.medium,
  },
  heroAddress: {
    fontSize: typography.fontSize.caption,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },

  // RSVP section
  rsvpCard: {
    marginHorizontal: spacing.pagePadding,
    marginTop: spacing.base,
  },
  rsvpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  rsvpCount: {
    fontSize: typography.fontSize.body,
    color: colors.textBody,
  },
  rsvpButton: {
    // Full width already
  },
  confirmedCard: {
    marginTop: 0,
    padding: spacing.sm,
  },
  confirmedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  confirmedCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmedCheckMark: {
    color: colors.card,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
  confirmedText: { flex: 1 },
  confirmedTitle: {
    fontSize: typography.fontSize.cardTitle,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  confirmedSub: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Cancelled banner
  cancelledBanner: {
    marginHorizontal: spacing.pagePadding,
    marginTop: spacing.base,
    backgroundColor: colors.cancelledBg,
    borderRadius: spacing.cardRadius,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  cancelledBannerTitle: {
    fontSize: typography.fontSize.cardTitle,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.destructive,
    marginBottom: spacing.xs,
  },
  cancelledBannerReason: {
    fontSize: typography.fontSize.body,
    color: colors.destructive,
  },

  // Admin cancel section
  adminSection: {
    marginHorizontal: spacing.pagePadding,
    marginTop: spacing.base,
  },

  // Bottom sheet (custom Modal implementation)
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.pagePadding,
    paddingBottom: spacing.xxxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.base,
  },
  sheetTitle: {
    fontSize: typography.fontSize.sectionTitle,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sheetSub: {
    fontSize: typography.fontSize.body,
    color: colors.textBody,
    marginBottom: spacing.base,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.tagRadius,
    padding: spacing.sm,
    fontSize: typography.fontSize.body,
    color: colors.primary,
    backgroundColor: colors.pageBackground,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: spacing.base,
  },
  sheetButton: {
    marginBottom: spacing.sm,
  },
  sheetButtonSecondary: {},

  // Section wrapper
  section: {
    marginTop: spacing.sectionSpacing,
  },
  sectionHeaderPadded: {
    paddingHorizontal: spacing.pagePadding,
  },

  // Tutorial cards
  tutorialCard: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: spacing.cardGap,
    padding: 0,
    overflow: "hidden",
  },
  tutorialAccentLine: {
    height: 3,
    backgroundColor: colors.accent,
    borderTopLeftRadius: spacing.cardRadius,
    borderTopRightRadius: spacing.cardRadius,
  },
  tutorialRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  tutorialIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tutorialIconCircleLocked: {
    backgroundColor: colors.border,
  },
  tutorialIcon: {
    fontSize: 14,
    color: colors.card,
  },
  tutorialInfo: { flex: 1 },
  tutorialTitle: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    marginBottom: 2,
  },
  tutorialDesc: {
    fontSize: typography.fontSize.caption,
    color: colors.textBody,
    marginBottom: spacing.xs,
  },
  tutorialMeta: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tutorialMetaText: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
  },
  uploadButton: {
    marginHorizontal: spacing.pagePadding,
    marginTop: spacing.sm,
  },
  inlineVideo: {
    width: "100%",
    height: 220,
  },

  // Gallery
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.pagePadding,
    gap: spacing.xs,
  },
  galleryCell: {
    width: GALLERY_SIZE,
    height: GALLERY_SIZE,
    borderRadius: spacing.tagRadius,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryPlayIcon: {
    color: colors.card,
    fontSize: 20,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "80%",
  },

  // Loading / not found
  backBtnTop: {
    padding: spacing.pagePadding,
  },
  backTextTop: {
    color: colors.primary,
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semiBold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: typography.fontSize.body,
    color: colors.textBody,
  },

  emptyCard: {
    marginHorizontal: spacing.pagePadding,
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.body,
    color: colors.textBody,
  },
});
