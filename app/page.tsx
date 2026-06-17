import { getTodayLogs } from "@/src/lib/repo";
import HomeClient from "./HomeClient";

export default function HomePage() {
  let todayLogs: Awaited<ReturnType<typeof getTodayLogs>> = [];
  try {
    todayLogs = getTodayLogs();
  } catch (e) {
    console.error("Failed to load today's logs:", e);
  }
  return <HomeClient todayLogs={todayLogs} />;
}
