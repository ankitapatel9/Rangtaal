import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { colors } from "../../src/theme/colors";

export default function ParticipantLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          tabBarIcon: () => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
            >
              <Ionicons name="camera" size={22} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="videos" options={{ href: null }} />
    </Tabs>
  );
}
