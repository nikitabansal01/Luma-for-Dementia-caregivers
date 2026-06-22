import { getOrCreateDefaultRecipient } from "@/src/lib/repo";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const recipient = getOrCreateDefaultRecipient();
  return <ProfileClient recipient={recipient} />;
}
