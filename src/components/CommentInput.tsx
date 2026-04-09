import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet
} from "react-native";
import { Send } from "lucide-react-native";
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
          placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
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
          accessibilityLabel="Send"
          accessibilityRole="button"
        >
          <Send size={18} color={colors.card} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs
  },
  replyingTo: {
    ...typography.bodySmall,
    color: colors.secondary,
    paddingHorizontal: spacing.sm
  },
  replyName: {
    color: colors.accent,
    fontWeight: "600"
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.primary,
    maxHeight: 100,
    paddingVertical: spacing.xs
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  sendButtonDisabled: {
    opacity: 0.4
  }
});
