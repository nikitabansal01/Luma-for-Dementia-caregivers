"use client";

import { useRouter } from "next/navigation";
import type { CareRecipient } from "@/src/lib/repo";
import { saveCareProfileAction, skipOnboardingAction } from "./actions";
import CareProfileForm, {
  careProfileFormToPayload,
  validateCareProfileFormValues,
  type CareProfileFormValues,
} from "./CareProfileForm";

type OnboardingModalProps = {
  recipient: CareRecipient;
};

export default function OnboardingModal({ recipient }: OnboardingModalProps) {
  const router = useRouter();

  async function handleSubmit(values: CareProfileFormValues) {
    const validationError = validateCareProfileFormValues(values);
    if (validationError) {
      return { success: false, error: validationError };
    }
    const result = await saveCareProfileAction(careProfileFormToPayload(values));
    if (result?.success) {
      router.refresh();
    }
    return (
      result ?? {
        success: false,
        error: "Could not save your profile. Please try again.",
      }
    );
  }

  async function handleSkip() {
    const result = await skipOnboardingAction();
    if (result?.success) {
      router.refresh();
    }
    return (
      result ?? {
        success: false,
        error: "Could not skip onboarding. Please try again.",
      }
    );
  }

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-card card">
        <header className="mb-6 space-y-2">
          <h2 id="onboarding-title" className="font-serif text-xl font-semibold text-care-forest sm:text-2xl">
            Welcome to Luma
          </h2>
          <p className="text-sm leading-relaxed text-care-stone">
            A quick setup helps Luma and your clinician synopsis understand your situation. About a minute.
          </p>
        </header>

        <CareProfileForm
          recipient={recipient}
          showDisclaimer
          submitLabel="Continue"
          skipLabel="Set up later"
          onSubmit={handleSubmit}
          onSkip={handleSkip}
        />
      </div>
    </div>
  );
}
