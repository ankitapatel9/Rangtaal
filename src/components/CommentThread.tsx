import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ThreadedComment } from "../hooks/useComments";
import { CommentDoc } from "../types/comment";
import { Avatar } from "./Avatar";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing, shadows } from "../theme/spacing";
import { formatTimeAgo } from "../lib/formatTime";

const AVATAR_SIZE = 32;
const REPLY_AVATAR_SIZE = 24;
const REPLY_INDENT = 40;

interface CommentRowProps {
  comment: CommentDoc;
  avatarSize: number;
  userId: string;
  isReply?: boolean;
  onReply?: (commentId: string, name: string) => void;
}

function CommentRow({
  comment,
  avatarSize,
  userId,
  isReply = false,
  onReply,
}: CommentRowProps) {
  return (
    <View
      style={[
        styles.commentCard,
        isReply ? styles.replyCard : styles.topLevelCard,
      ]}
    >
      <Avatar
        name={comment.userName}
        size={avatarSize}
        variant={isReply ? "gold" : "plum"}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.userName}>{comment.userName}</Text>
          <Text style={styles.timestamp}>
            {formatTimeAgo(comment.createdAt)}
          </Text>
        </View>
        <Text style={[styles.commentText, isReply && styles.replyText]}>
          {comment.text}
        </Text>
        <View style={styles.commentActions}>
          {onReply && (
            <TouchableOpacity
              onPress={() => onReply(comment.id, comment.userName)}
              activeOpacity={0.7}
              accessibilityLabel={`Reply to ${comment.userName}`}
              accessibilityRole="button"
            >
              <Text style={styles.replyLink}>Reply</Text>
            </TouchableOpacity>
          )}
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
  onReply,
}: CommentThreadProps) {
  return (
    <View style={styles.thread}>
      <CommentRow
        comment={comment}
        avatarSize={AVATAR_SIZE}
        userId={userId}
        isReply={false}
        onReply={onReply}
      />
      {comment.replies.map((reply) => (
        <View key={reply.id} style={styles.replyContainer}>
          <CommentRow
            comment={reply}
            avatarSize={REPLY_AVATAR_SIZE}
            userId={userId}
            isReply
            onReply={undefined}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: {
    gap: spacing.sm,
  },
  commentCard: {
    flexDirection: "row",
    gap: spacing.sm,
    borderRadius: 14,
    padding: 14,
  },
  topLevelCard: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
  replyCard: {
    backgroundColor: "#FAF7F2",
    borderRadius: 12,
    padding: 10,
  },
  replyContainer: {
    marginLeft: REPLY_INDENT,
  },
  commentContent: {
    flex: 1,
    gap: spacing.xs,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  userName: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  timestamp: {
    fontSize: 11,
    color: colors.secondary,
    lineHeight: 16,
  },
  commentText: {
    fontSize: 14,
    color: colors.body,
    lineHeight: 20,
  },
  replyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  replyLink: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: typography.fontWeight.semiBold,
  },
});
