import { useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/hooks/useAuth";
import { useUser } from "../../src/hooks/useUser";
import { cancelSession } from "../../src/lib/sessions";

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: authUser } = useAuth();
  const { user: userDoc } = useUser(authUser?.uid);

  const isAdmin = userDoc?.role === "admin";

  function handleCancelSession() {
    Alert.prompt(
      "Cancel Session",
      "Please provide a reason for cancellation:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async (reason?: string) => {
            if (!reason?.trim()) {
              Alert.alert("Error", "A cancellation reason is required.");
              return;
            }
            if (!authUser?.uid) return;
            try {
              await cancelSession(id, reason.trim(), authUser.uid);
              Alert.alert("Session Cancelled", "The session has been cancelled and attendees have been notified.");
            } catch {
              Alert.alert("Error", "Failed to cancel session. Please try again.");
            }
          },
        },
      ],
      "plain-text"
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Details</Text>
      <Text style={styles.sessionId}>Session ID: {id}</Text>

      {isAdmin && (
        <View style={styles.adminBox}>
          <Text style={styles.adminLabel}>Admin Actions</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSession}>
            <Text style={styles.cancelButtonText}>Cancel Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#FEF9FF",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3B0764",
    marginBottom: 8,
  },
  sessionId: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  adminBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFF",
    marginTop: 16,
  },
  adminLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B0764",
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
