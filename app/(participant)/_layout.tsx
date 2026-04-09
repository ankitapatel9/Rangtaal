import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ParticipantLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3B0764",
        tabBarInactiveTintColor: "#9CA3AF"
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: "Videos",
          tabBarIcon: ({ color, size }) => <Ionicons name="play-circle" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
