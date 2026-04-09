import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image
} from "react-native";
import { ThreadedComment } from "../hooks/useComments";
import { CommentDoc } from "../types/comment";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

const AVATAR_SIZE = 28;
const REPLY_AVATAR_SIZE = 20;
const REPLY_INDENT = 34;

function formatTimestamp(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

interface AvatarProps {
  name: string;
  size: number;
}

function Avatar({ name, size }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 }
      ]}
      accessibilityLabel={`Avatar for ${name}`}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
        {initials}
      </Text>
    </View>
  );
}

interface CommentRowProps {
  comment: CommentDoc;
  avatarSize: number;
  userId: string;
  onReply?: (commentId: string, name: string) => void;
}

function CommentRow({ comment, avatarSize, userId, onReply }: CommentRowProps) {
  const likeCount = 0; // Placeholder — likes on comments are tracked via useLikes hook at the container level

  return (
    <View style={styles.commentRow}>
      <Avatar name={comment.userName} size={avatarSize} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.userName}>{comment.userName}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <View style={styles.commentActions}>
          {onReply && (
            <TouchableOpacity
              onPress={() => onReply(comment.id, comment.userName)}
              accessibilityLabel={`Reply to ${comment.userName}`}
              accessibilityRole="button"
            >
              <Text style={styles.replyLink}>Reply</Text>
            </TouchableOpacity>
          )}
          <View style={styles.miniLike}>
            <Text style={styles.heartIcon}>♡</Text>
            {likeCount > 0 && (
              <Text style={styles.miniLikeCount}>{likeCount}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export interface CommentThreadProps {
  comment: ThreadedComment;
  userId: string;
  onReply: (commentId: string, name: string) => void;
}

export function CommentThread({
  comment,
  userId,
  onReply
}: CommentThreadProps) {
  return (
    <View style={styles.thread}>
      <CommentRow
        comment={comment}
        avatarSize={AVATAR_SIZE}
        userId={userId}
        onReply={onReply}
      />
      {comment.replies.map((reply) => (
        <View key={reply.id} style={styles.replyContainer}>
          <CommentRow
            comment={reply}
            avatarSize={REPLY_AVATAR_SIZE}
            userId={userId}
            onReply={undefined}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: {
    gap: spacing.md
  },
  commentRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  avatar: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  avatarText: {
    color: colors.card,
    fontWeight: "600"
  },
  commentContent: {
    flex: 1,
    gap: spacing.xs
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  userName: {
    ...typography.label,
    ...typography.bold,
    color: colors.primary
  },
  timestamp: {
    ...typography.bodySmall,
    color: colors.secondary
  },
  commentText: {
    ...typography.body,
    color: colors.body
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  replyLink: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600"
  },
  miniLike: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  },
  heartIcon: {
    fontSize: 13,
    color: colors.secondary
  },
  miniLikeCount: {
    ...typography.bodySmall,
    color: colors.secondary
  },
  replyContainer: {
    marginLeft: REPLY_INDENT
  }
});
