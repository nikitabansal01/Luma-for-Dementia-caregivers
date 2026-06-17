import { getCoachRulesContent } from "@/src/lib/coach";
import CoachRulesEditor from "./CoachRulesEditor";

export default function CoachRulesPage() {
  const initialContent = getCoachRulesContent();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-care-forest sm:text-3xl">
          Coach rules
        </h1>
        <p className="mt-1 text-sm text-care-stone">
          Edit the JSON below. Structure: Behavior → Trigger → array of suggestion strings. Use
          &quot;default&quot; per behavior or at top level for fallback.
        </p>
      </header>
      <CoachRulesEditor initialContent={initialContent} />
    </div>
  );
}
