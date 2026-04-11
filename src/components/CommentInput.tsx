import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addComment } from "../lib/comments";
import { CommentDoc } from "../types/comment";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export interface CommentInputProps {
  parentId: string;
  parentType: CommentDoc["parentType"];
  userId: string;
  userName: string;
  replyTo?: { id: string; name: string };
  onSend?: () => void;
}

export function CommentInput({
  parentId,
  parentType,
  userId,
  userName,
  replyTo,
  onSend
}: CommentInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await addComment({
        parentId,
        parentType,
        replyToId: replyTo?.id ?? null,
        userId,
        userName,
        text: trimmed
      });
      setText("");
      onSend?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      {replyTo && (
        <Text style={styles.replyingTo}>
          Replying to{" "}
          <Text style={styles.replyName}>{replyTo.name}</Text>
        </Text>
      )}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Add a comment..."
          placeholderTextColor={colors.secondary}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!sending}
          accessibilityLabel={replyTo ? "Reply input" : "Comment input"}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
          accessibilityLabel="Send"
          accessibilityRole="button"
        >
          <Ionicons name="send" size={18} color={colors.card} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  replyingTo: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600" as const,
    paddingHorizontal: spacing.base,
  },
  replyName: {
    color: colors.accent,
    fontWeight: "700" as const,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.base,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    maxHeight: 100,
    paddingVertical: 0,
    lineHeight: 20,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
