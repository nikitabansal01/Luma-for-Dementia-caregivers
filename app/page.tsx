import { getTodayLogs, getOrCreateDefaultRecipient, isOnboardingPending } from "@/src/lib/repo";
import { listCustomBehaviors } from "@/src/lib/customBehaviors";
import { listCustomStrategies } from "@/src/lib/customStrategies";
import HomeClient from "./HomeClient";

export default function HomePage() {
  let todayLogs: Awaited<ReturnType<typeof getTodayLogs>> = [];
  let customBehaviors: Awaited<ReturnType<typeof listCustomBehaviors>> = [];
  let customStrategies: Awaited<ReturnType<typeof listCustomStrategies>> = [];
  let careRecipient = getOrCreateDefaultRecipient();
  try {
    todayLogs = getTodayLogs();
    customBehaviors = listCustomBehaviors();
    customStrategies = listCustomStrategies();
  } catch (e) {
    console.error("Failed to load today's logs:", e);
  }
  const customBehaviorLabels = Object.fromEntries(
    customBehaviors.map((b) => [b.code, b.label])
  );
  const customStrategyLabels = Object.fromEntries(
    customStrategies.map((s) => [s.code, s.label])
  );
  return (
    <HomeClient
      todayLogs={todayLogs}
      customBehaviors={customBehaviors}
      customBehaviorLabels={customBehaviorLabels}
      customStrategies={customStrategies}
      customStrategyLabels={customStrategyLabels}
      careRecipient={careRecipient}
      showOnboarding={isOnboardingPending(careRecipient)}
    />
  );
}
