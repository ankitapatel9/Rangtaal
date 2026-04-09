import { Stack } from "expo-router";

export default function SessionLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: "Back", title: "Session" }} />
  );
}
