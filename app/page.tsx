import { getTodayLogs, getOrCreateDefaultRecipient, isOnboardingPending } from "@/src/lib/repo";
import { listCustomBehaviors } from "@/src/lib/customBehaviors";
import HomeClient from "./HomeClient";

export default function HomePage() {
  let todayLogs: Awaited<ReturnType<typeof getTodayLogs>> = [];
  let customBehaviors: Awaited<ReturnType<typeof listCustomBehaviors>> = [];
  let careRecipient = getOrCreateDefaultRecipient();
  try {
    todayLogs = getTodayLogs();
    customBehaviors = listCustomBehaviors();
  } catch (e) {
    console.error("Failed to load today's logs:", e);
  }
  const customBehaviorLabels = Object.fromEntries(
    customBehaviors.map((b) => [b.code, b.label])
  );
  return (
    <HomeClient
      todayLogs={todayLogs}
      customBehaviors={customBehaviors}
      customBehaviorLabels={customBehaviorLabels}
      careRecipient={careRecipient}
      showOnboarding={isOnboardingPending(careRecipient)}
    />
  );
}
