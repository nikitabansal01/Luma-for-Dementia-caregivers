"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CareRecipient } from "@/src/lib/repo";
import { saveCareProfileAction } from "../actions";
import CareProfileForm, {
  careProfileFormToPayload,
  validateCareProfileFormValues,
  type CareProfileFormValues,
} from "../CareProfileForm";

export default function ProfileClient({ recipient }: { recipient: CareRecipient }) {
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
    return result;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-care-forest sm:text-3xl">Profile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-care-stone">
          Your email, what brought you here, and who you care for. Care details appear in your clinician synopsis.
        </p>
      </header>

      <div className="max-w-5xl">
        <CareProfileForm recipient={recipient} onSubmit={handleSubmit} submitLabel="Save profile" />
      </div>

      <p className="text-sm text-care-stone">
        <Link href="/" className="text-care-forest underline hover:text-care-olive">
          Back to Today
        </Link>
      </p>
    </div>
  );
}
