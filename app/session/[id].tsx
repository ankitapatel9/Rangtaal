import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLikes } from "../../src/hooks/useLikes";
import { useComments } from "../../src/hooks/useComments";
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
  ActivityIndicator,
} from "react-native";
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
  updateSessionTopic,
} from "../../src/lib/sessions";
import { createTutorial } from "../../src/lib/tutorials";
import { createMedia, deleteMedia } from "../../src/lib/media";
import {
  Avatar,
  AvatarStack,
  Card,
  SectionHeader,
  GoldButton,
  LikeButton,
  EngagementBar,
  CommentThread,
  CommentInput,
  CaptureButton,
  VideoPlayerModal,
} from "../../src/components";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";
import { TutorialDoc } from "../../src/types/tutorial";
import { MediaDoc } from "../../src/types/media";
import { ClassDoc } from "../../src/types/class";

// ─── Safe lazy-loaded native deps ─────────────────────────────────────────────

let storage: any = null;
try { storage = require("@react-native-firebase/storage").default; } catch {}

let ImagePicker: any = null;
try { ImagePicker = require("expo-image-picker"); } catch {}

let VideoThumbnails: any = null;
try { VideoThumbnails = require("expo-video-thumbnails"); } catch {}

async function generateThumbnail(videoUri: string): Promise<string | null> {
  if (!VideoThumbnails) return null;
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 });
    return uri;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GALLERY_COL = 3;
const GALLERY_SIZE =
  (SCREEN_WIDTH - spacing.pagePadding * 2 - spacing.xs * 2) / GALLERY_COL;

function formatLongDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

async function pickAndUploadMedia(
  sessionId: string,
  userId: string,
  mediaTypes: "photo" | "video"
): Promise<string | null> {
  if (!ImagePicker) return null;
  if (!storage) return null;

  const perms = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perms.granted) {
    Alert.alert("Permission required", "Please allow photo library access.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:
      mediaTypes === "video"
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const ext = asset.uri.split(".").pop() ?? (mediaTypes === "video" ? "mp4" : "jpg");
  const path = `sessions/${sessionId}/${mediaTypes}/${Date.now()}.${ext}`;

  const ref = storage().ref(path);
  await ref.putFile(asset.uri);
  return await ref.getDownloadURL();
}

// ─── Section 1: Plum hero header ─────────────────────────────────────────────

interface HeaderSectionProps {
  dateStr: string;
  class_: ClassDoc | null;
  cancelled: boolean;
  onBack: () => void;
}

function HeaderSection({
  dateStr,
  class_,
  cancelled,
  onBack,
}: HeaderSectionProps) {
  return (
    <View style={styles.heroSection}>
      <SafeAreaView>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <Text style={styles.heroLabel}>
        {cancelled ? "CANCELLED SESSION" : "UPCOMING SESSION"}
      </Text>
      <Text style={styles.heroDate}>{formatLongDate(dateStr)}</Text>
      {class_ != null && (
        <Text style={styles.heroTime}>
          {class_.startTime} – {class_.endTime}
        </Text>
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
  const [submitting, setSubmitting] = useState(false);
  const isRsvpd = rsvps.includes(userId);
  const rsvpNames = rsvps.map((_, i) => `Attendee ${i + 1}`);

  async function handleRsvpToggle() {
    if (!userId || submitting) return;
    setSubmitting(true);
    try {
      if (isRsvpd) {
        await removeRsvp(sessionId, userId);
      } else {
        await rsvpToSession(sessionId, userId);
      }
    } catch {
      Alert.alert("Error", "Could not update RSVP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cancelled) {
    return (
      <View style={styles.cancelledBanner}>
        <Text style={styles.cancelledBannerTitle}>
          This session was cancelled
        </Text>
        {cancellationReason != null && cancellationReason.length > 0 && (
          <Text style={styles.cancelledBannerReason}>
            {cancellationReason}
          </Text>
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
              <TouchableOpacity
                onPress={handleRsvpToggle}
                disabled={submitting}
              >
                <Text style={styles.confirmedSub}>
                  {submitting ? "Updating…" : "Tap to cancel your RSVP"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      ) : (
        <GoldButton
          label="RSVP to this session"
          onPress={handleRsvpToggle}
          loading={submitting}
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

function AdminCancelSection({
  sessionId,
  adminUid,
  cancelled,
}: AdminCancelSectionProps) {
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

// ─── Section 3b: Admin set topic ─────────────────────────────────────────────

interface AdminSetTopicSectionProps {
  sessionId: string;
  currentTopic: string | null;
}

function AdminSetTopicSection({ sessionId, currentTopic }: AdminSetTopicSectionProps) {
  function handleSetTopic() {
    Alert.prompt(
      "Set Topic",
      "What's the topic for this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Next",
          onPress: (topic) => {
            const trimmedTopic = topic?.trim();
            if (!trimmedTopic) return;
            Alert.prompt(
              "Description (optional)",
              "Add a short description for this topic.",
              [
                { text: "Skip", onPress: () => updateSessionTopic(sessionId, trimmedTopic, "").catch(() => Alert.alert("Error", "Could not set topic.")) },
                {
                  text: "Save",
                  onPress: (desc) => {
                    updateSessionTopic(sessionId, trimmedTopic, desc?.trim() ?? "").catch(() =>
                      Alert.alert("Error", "Could not set topic.")
                    );
                  },
                },
              ],
              "plain-text"
            );
          },
        },
      ],
      "plain-text",
      currentTopic ?? ""
    );
  }

  return (
    <View style={styles.adminSetTopicSection}>
      <GoldButton
        label={currentTopic ? "Update Topic" : "Set Topic"}
        onPress={handleSetTopic}
        variant="plum"
      />
    </View>
  );
}

// ─── VideoPlayerModal is now the shared src/components/VideoPlayerModal ──────
// (imported above from ../../src/components)

// ─── Section 4: Tutorial card ─────────────────────────────────────────────────

interface TutorialCardProps {
  tutorial: TutorialDoc;
  userPaid: boolean;
  userId: string;
  userName: string;
}

const TutorialCard = React.memo(function TutorialCard({
  tutorial,
  userPaid,
  userId,
  userName,
}: TutorialCardProps) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<
    { id: string; name: string } | undefined
  >(undefined);
  const { comments } = useComments(tutorial.id);
  const locked = !userPaid;

  function handleThumbnailPress() {
    if (locked) {
      Alert.alert(
        "Unlock Required",
        "Contact admin to get access to tutorials."
      );
      return;
    }
    setVideoOpen(true);
  }

  return (
    <View style={styles.tutorialCard}>
      {/* 16:9 thumbnail area */}
      <TouchableOpacity
        onPress={handleThumbnailPress}
        activeOpacity={0.8}
        style={styles.tutorialThumbnailArea}
        accessibilityLabel={locked ? "Locked tutorial" : `Play ${tutorial.title}`}
      >
        {tutorial.thumbnailUrl ? (
          <Image
            source={{ uri: tutorial.thumbnailUrl }}
            style={styles.tutorialThumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.tutorialThumbnailPlaceholder}>
            <Ionicons
              name="play-circle"
              size={56}
              color={locked ? colors.secondary : "rgba(255,255,255,0.85)"}
            />
          </View>
        )}

        {/* Lock badge top-right */}
        {locked && (
          <View style={styles.tutorialLockBadge}>
            <Ionicons name="lock-closed" size={14} color={colors.card} />
          </View>
        )}

        {/* Duration badge: reserved for future use when duration is in TutorialDoc */}
      </TouchableOpacity>

      {/* Title + description area */}
      <View style={styles.tutorialInfo}>
        <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
        {tutorial.description != null && tutorial.description.length > 0 && (
          <Text style={styles.tutorialDesc} numberOfLines={2}>
            {tutorial.description}
          </Text>
        )}
      </View>

      {/* Engagement bar below title */}
      <View style={styles.tutorialEngagement}>
        <LikeButton
          parentId={tutorial.id}
          parentType="tutorial"
          userId={userId}
        />
        <TouchableOpacity
          onPress={() => setCommentOpen((v) => !v)}
          style={styles.commentToggle}
          accessibilityLabel="Toggle comments"
        >
          <Ionicons
            name="chatbubble-outline"
            size={16}
            color={colors.textSecondary}
          />
          {comments.length > 0 && (
            <Text style={styles.commentCount}>{comments.length}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Inline comment thread */}
      {commentOpen && (
        <View style={styles.tutorialComments}>
          {comments.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              userId={userId}
              onReply={(id, name) => setReplyTo({ id, name })}
            />
          ))}
          <CommentInput
            parentId={tutorial.id}
            parentType="tutorial"
            userId={userId}
            userName={userName}
            replyTo={replyTo}
            onSend={() => setReplyTo(undefined)}
          />
        </View>
      )}

      {/* Full-screen Reels-style video player modal */}
      {videoOpen && (
        <VideoPlayerModal
          visible={videoOpen}
          onClose={() => setVideoOpen(false)}
          videoUrl={tutorial.videoUrl}
          title={tutorial.title}
          uploaderName=""
          parentId={tutorial.id}
          parentType="tutorial"
          userId={userId}
          userName={userName}
        />
      )}
    </View>
  );
});

interface TutorialsSectionProps {
  sessionId: string;
  tutorials: TutorialDoc[];
  userPaid: boolean;
  isAdmin: boolean;
  userId: string;
  userName: string;
}

function TutorialsSection({
  sessionId,
  tutorials,
  userPaid,
  isAdmin,
  userId,
  userName,
}: TutorialsSectionProps) {
  const [uploading, setUploading] = useState(false);

  async function handleUploadTutorial() {
    if (!ImagePicker) {
      Alert.alert(
        "Unavailable",
        "Tutorial upload requires an app update."
      );
      return;
    }
    if (!storage) {
      Alert.alert(
        "Unavailable",
        "Storage not available. Tutorial upload requires an app update."
      );
      return;
    }

    setUploading(true);
    try {
      // Pick and get local asset URI for thumbnail generation before upload
      if (!ImagePicker) return;
      const perms = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perms.granted) {
        Alert.alert("Permission required", "Please allow photo library access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const ext = asset.uri.split(".").pop() ?? "mp4";
      const timestamp = Date.now();
      const videoPath = `sessions/${sessionId}/video/${timestamp}.${ext}`;
      const videoRef = storage().ref(videoPath);
      await videoRef.putFile(asset.uri);
      const url = await videoRef.getDownloadURL();

      // Generate and upload thumbnail
      let thumbnailUrl: string | null = null;
      const thumbLocalUri = await generateThumbnail(asset.uri);
      if (thumbLocalUri) {
        const thumbPath = `thumbnails/${timestamp}_thumb.jpg`;
        await storage().ref(thumbPath).putFile(thumbLocalUri);
        thumbnailUrl = await storage().ref(thumbPath).getDownloadURL();
      }

      await createTutorial({
        sessionId,
        title: `Tutorial ${tutorials.length + 1}`,
        description: "",
        videoUrl: url,
        thumbnailUrl,
        createdBy: userId,
        order: tutorials.length,
      });
    } catch (err: any) {
      Alert.alert("Upload failed", err?.message ?? "Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Tutorials"
        rightLabel={
          tutorials.length > 0 ? `${tutorials.length} videos` : undefined
        }
        rightLabelVariant="gray"
        style={styles.sectionHeaderPadded}
      />

      {tutorials.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tutorials yet.</Text>
        </Card>
      ) : (
        tutorials.map((t) => (
          <TutorialCard
            key={t.id}
            tutorial={t}
            userPaid={userPaid}
            userId={userId}
            userName={userName}
          />
        ))
      )}

      {isAdmin && (
        <GoldButton
          label={uploading ? "Uploading…" : "Upload Tutorial"}
          onPress={handleUploadTutorial}
          loading={uploading}
          variant="plum"
          style={styles.uploadButton}
        />
      )}
    </View>
  );
}

// ─── Section 5: Gallery ───────────────────────────────────────────────────────

interface GalleryCellProps {
  item: MediaDoc;
  userId: string;
  onPress: () => void;
  onLongPress: () => void;
}

function GalleryCell({
  item,
  userId,
  onPress,
  onLongPress,
}: GalleryCellProps) {
  const { count: likeCount, isLiked } = useLikes(item.id, userId, "media");

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={styles.galleryCell}
    >
      <Image
        source={{ uri: item.storageUrl }}
        style={styles.galleryImage}
        resizeMode="cover"
      />
      {item.type === "video" && (
        <View style={styles.galleryVideoOverlay}>
          <Text style={styles.galleryPlayIcon}>▶</Text>
        </View>
      )}
      <View style={styles.galleryLikeOverlay}>
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={12}
          color={colors.card}
        />
        {likeCount > 0 && (
          <Text style={styles.galleryLikeCount}>{likeCount}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// PhotoPreviewModal — simple full-screen photo viewer (videos use VideoPlayerModal)
interface PhotoPreviewModalProps {
  item: MediaDoc | null;
  onClose: () => void;
}

function PhotoPreviewModal({ item, onClose }: PhotoPreviewModalProps) {
  if (!item) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.previewOverlay}>
        <TouchableOpacity
          style={styles.previewClose}
          onPress={onClose}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={28} color={colors.card} />
        </TouchableOpacity>
        <Image
          source={{ uri: item.storageUrl }}
          style={styles.previewImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}

interface GallerySectionProps {
  sessionId: string;
  media: MediaDoc[];
  isAdmin: boolean;
  userId: string;
  userName: string;
}

function GallerySection({
  sessionId,
  media,
  isAdmin,
  userId,
  userName,
}: GallerySectionProps) {
  const [selectedItem, setSelectedItem] = useState<MediaDoc | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleAddFromRoll() {
    if (!ImagePicker) {
      Alert.alert("Unavailable", "Photo upload requires an app update.");
      return;
    }
    if (!storage) {
      Alert.alert("Unavailable", "Storage not available. Photo upload requires an app update.");
      return;
    }

    setUploading(true);
    try {
      const perms = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perms.granted) {
        Alert.alert("Permission required", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const isVideo = asset.type === "video";
      const ext = asset.uri.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
      const timestamp = Date.now();
      const path = `sessions/${sessionId}/gallery/${timestamp}.${ext}`;
      const ref = storage().ref(path);
      await ref.putFile(asset.uri);
      const url = await ref.getDownloadURL();

      // Generate and upload thumbnail for videos
      let thumbnailUrl: string | null = null;
      if (isVideo) {
        const thumbLocalUri = await generateThumbnail(asset.uri);
        if (thumbLocalUri) {
          const thumbPath = `thumbnails/${timestamp}_thumb.jpg`;
          await storage().ref(thumbPath).putFile(thumbLocalUri);
          thumbnailUrl = await storage().ref(thumbPath).getDownloadURL();
        }
      }

      await createMedia({
        sessionId,
        type: isVideo ? "video" : "photo",
        storageUrl: url,
        thumbnailUrl,
        uploadedBy: userId,
      });
    } catch (err: any) {
      Alert.alert("Upload failed", err?.message ?? "Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleLongPress(m: MediaDoc) {
    const canDelete = isAdmin || m.uploadedBy === userId;
    if (!canDelete) return;

    Alert.alert(
      "Delete media?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMedia(m.id);
            } catch {
              Alert.alert("Error", "Could not delete. Please try again.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Gallery"
        rightLabel={uploading ? "Uploading…" : "+ Add"}
        rightLabelVariant="gold"
        onRightPress={uploading ? undefined : handleAddFromRoll}
        style={styles.sectionHeaderPadded}
      />

      {media.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No photos or videos yet.</Text>
        </Card>
      ) : (
        <View style={styles.galleryGrid}>
          {media.map((m) => (
            <GalleryCell
              key={m.id}
              item={m}
              userId={userId}
              onPress={() => setSelectedItem(m)}
              onLongPress={() => handleLongPress(m)}
            />
          ))}
        </View>
      )}

      {/* Photos: simple full-screen viewer */}
      {selectedItem && selectedItem.type === "photo" && (
        <PhotoPreviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Videos: Reels-style player */}
      {selectedItem && selectedItem.type === "video" && (
        <VideoPlayerModal
          visible
          onClose={() => setSelectedItem(null)}
          videoUrl={selectedItem.storageUrl}
          title=""
          uploaderName=""
          parentId={selectedItem.id}
          parentType="media"
          userId={userId}
          userName={userName}
        />
      )}

      {/* CaptureButton FAB */}
      <CaptureButton onPress={handleAddFromRoll} />
    </View>
  );
}

// ─── Section 6: Session-level comments ───────────────────────────────────────

interface CommentsSectionProps {
  sessionId: string;
  userId: string;
  userName: string;
}

function CommentsSection({
  sessionId,
  userId,
  userName,
}: CommentsSectionProps) {
  const { comments, loading } = useComments(sessionId);
  const [replyTo, setReplyTo] = useState<
    { id: string; name: string } | undefined
  >(undefined);

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Comments"
        rightLabel={
          comments.length > 0 ? `${comments.length}` : undefined
        }
        rightLabelVariant="gray"
        style={styles.sectionHeaderPadded}
      />

      <View style={styles.commentsBody}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : comments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No comments yet. Be the first!
            </Text>
          </Card>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <CommentThread
                comment={c}
                userId={userId}
                onReply={(id, name) => setReplyTo({ id, name })}
              />
            </View>
          ))
        )}

        <View style={styles.commentInputWrapper}>
          <CommentInput
            parentId={sessionId}
            parentType="session"
            userId={userId}
            userName={userName}
            replyTo={replyTo}
            onSend={() => setReplyTo(undefined)}
          />
        </View>
      </View>
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
      router.replace(
        "/(participant)/schedule" as Parameters<typeof router.replace>[0]
      );
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
        keyboardShouldPersistTaps="handled"
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

        {/* Section 3b: Admin set topic */}
        {isAdmin && !isCancelled && (
          <AdminSetTopicSection
            sessionId={session.id}
            currentTopic={session.topic ?? null}
          />
        )}

        {/* Section 4: Tutorials */}
        <TutorialsSection
          sessionId={session.id}
          tutorials={tutorials}
          userPaid={userPaid}
          isAdmin={isAdmin}
          userId={userId}
          userName={userName}
        />

        {/* Section 5: Gallery */}
        <GallerySection
          sessionId={session.id}
          media={media}
          isAdmin={isAdmin}
          userId={userId}
          userName={userName}
        />

        {/* Section 6: Session-level comments */}
        <CommentsSection
          sessionId={session.id}
          userId={userId}
          userName={userName}
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
  rsvpButton: {},
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

  // Admin set topic section
  adminSetTopicSection: {
    marginHorizontal: spacing.pagePadding,
    marginTop: spacing.sm,
  },

  // Bottom sheet
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
    backgroundColor: colors.card,
    borderRadius: spacing.cardRadiusLg,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tutorialThumbnailArea: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.primary,
    borderTopLeftRadius: spacing.cardRadiusLg,
    borderTopRightRadius: spacing.cardRadiusLg,
    overflow: "hidden",
    position: "relative",
  },
  tutorialThumbnailImage: {
    width: "100%",
    height: "100%",
  },
  tutorialThumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  tutorialLockBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: spacing.tagRadius,
    padding: 4,
  },
  tutorialDurationBadge: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tutorialDurationText: {
    color: colors.card,
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
  },
  tutorialInfo: {
    padding: spacing.cardPadding,
    paddingBottom: spacing.sm,
  },
  tutorialTitle: {
    fontSize: typography.fontSize.cardTitle,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
    marginBottom: 4,
  },
  tutorialDesc: {
    fontSize: 13,
    color: colors.textBody,
    lineHeight: 18,
  },
  tutorialEngagement: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.cardPadding,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentCount: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
  },
  tutorialComments: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.cardPadding,
    gap: spacing.md,
  },
  videoUnavailable: {
    fontSize: typography.fontSize.caption,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.cardPadding,
  },

  // VideoPlayerModal
  videoModalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoModalSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  videoModalCloseBtn: {
    padding: spacing.base,
    alignSelf: "flex-start",
  },
  videoModalPlayer: {
    width: "100%",
    aspectRatio: 16 / 9,
    marginTop: 80,
    backgroundColor: "#000",
  },
  videoModalUnavailable: {
    width: "100%",
    aspectRatio: 16 / 9,
    marginTop: 80,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.pagePadding,
  },
  videoModalUnavailableText: {
    color: colors.secondary,
    fontSize: typography.fontSize.body,
    textAlign: "center",
  },
  videoModalMeta: {
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  videoModalTitle: {
    fontSize: typography.fontSize.sectionTitle,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.card,
    marginBottom: spacing.sm,
  },
  videoModalEngagement: {},
  videoModalComments: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.sm,
  },
  uploadButton: {
    marginHorizontal: spacing.pagePadding,
    marginTop: spacing.sm,
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
    borderRadius: spacing.sm,
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
  galleryLikeOverlay: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  galleryLikeCount: {
    color: colors.card,
    fontSize: 10,
    fontWeight: "700",
  },

  // Full-screen preview modal
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  previewClose: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  previewImage: {
    width: "100%",
    height: "55%",
    marginTop: 40,
  },
  previewVideo: {
    width: "100%",
    height: "55%",
    marginTop: 40,
  },
  previewEngagement: {
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  previewComments: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.sm,
  },

  // Session comments section
  commentsBody: {
    paddingHorizontal: spacing.pagePadding,
    gap: spacing.md,
  },
  commentItem: {
    paddingVertical: spacing.xs,
  },
  commentInputWrapper: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
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
