"use client";

import { useEffect, useRef, useState } from "react";
import type { CareRecipient } from "@/src/lib/repo";
import {
  AGE_RANGES,
  CAREGIVER_RELATIONSHIPS,
  DEMENTIA_STAGES,
  LIVING_SITUATIONS,
  VISIT_PURPOSES,
  type AgeRangeCode,
  type CaregiverRelationshipCode,
  type DementiaStageCode,
  type LivingSituationCode,
  type VisitPurposeCode,
} from "@/src/lib/careProfile";

export type CareProfileFormValues = {
  visitor_name: string;
  visitor_email: string;
  visit_purpose: VisitPurposeCode | "";
  care_recipient_name: string;
  caregiver_relationship: CaregiverRelationshipCode | "";
  stage: DementiaStageCode | "";
  age_range: AgeRangeCode | "";
  living_situation: LivingSituationCode | "";
};

function ageRangeFromRecipient(recipient: CareRecipient): AgeRangeCode | "" {
  if (recipient.age_range) return recipient.age_range as AgeRangeCode;
  if (recipient.age == null) return "";
  if (recipient.age < 65) return "UNDER_65";
  if (recipient.age <= 74) return "AGE_65_74";
  if (recipient.age <= 84) return "AGE_75_84";
  return "AGE_85_PLUS";
}

function valuesFromRecipient(recipient: CareRecipient): CareProfileFormValues {
  return {
    visitor_name: recipient.visitor_name ?? "",
    visitor_email: recipient.visitor_email ?? "",
    visit_purpose: (recipient.visit_purpose as VisitPurposeCode) ?? "",
    care_recipient_name: recipient.name === "Default" ? "" : recipient.name,
    caregiver_relationship: (recipient.caregiver_relationship as CaregiverRelationshipCode) ?? "",
    stage: (recipient.stage as DementiaStageCode) ?? "",
    age_range: ageRangeFromRecipient(recipient),
    living_situation: (recipient.living_situation as LivingSituationCode) ?? "",
  };
}

type CareProfileSubmitResult =
  | { success: true; recipient?: CareRecipient }
  | { success: false; error?: string };

type CareProfileFormProps = {
  recipient: CareRecipient;
  showDisclaimer?: boolean;
  actionNote?: string;
  submitLabel?: string;
  onSubmit: (values: CareProfileFormValues) => Promise<CareProfileSubmitResult | void>;
  onSkip?: () => Promise<{ success: boolean; error?: string } | void>;
  skipLabel?: string;
};

function ProfileSectionHeader({
  title,
  titleId,
  whyText,
}: {
  title: string;
  titleId: string;
  whyText: string;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyId = `${titleId}-why`;

  return (
    <header className="care-profile-form__section-header">
      <h3 id={titleId} className="care-profile-form__section-title">
        {title}
      </h3>
      <div className={`care-profile-form__section-why${whyOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="care-profile-form__why-btn"
          aria-expanded={whyOpen}
          aria-controls={whyId}
          onClick={() => setWhyOpen((open) => !open)}
        >
          Why?
        </button>
        <p id={whyId} className="care-profile-form__section-lead" role="tooltip">
          {whyText}
        </p>
      </div>
    </header>
  );
}

export default function CareProfileForm({
  recipient,
  showDisclaimer = false,
  actionNote,
  submitLabel = "Save profile",
  onSubmit,
  onSkip,
  skipLabel = "Set up later",
}: CareProfileFormProps) {
  const [values, setValues] = useState<CareProfileFormValues>(() => valuesFromRecipient(recipient));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValues(valuesFromRecipient(recipient));
  }, [recipient]);

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    []
  );

  function showSuccess(message: string) {
    setSuccess(message);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(null), 4000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const result = await onSubmit(values);
      if (!result) {
        setError("Could not reach the server. If you're on a demo deploy, try again in a moment.");
        return;
      }
      if (result.success) {
        if (result.recipient) {
          setValues(valuesFromRecipient(result.recipient));
        }
        showSuccess("Profile saved.");
      } else {
        setError(result.error ?? "Could not save profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (!onSkip) return;
    setSkipping(true);
    setError(null);
    try {
      const result = await onSkip();
      if (result && !result.success) {
        setError(result.error ?? "Could not continue");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setSkipping(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="care-profile-form space-y-6" noValidate>
      {showDisclaimer && (
        <p className="care-profile-form__disclaimer">
          Luma helps you log and reflect — it is not medical advice. Your answers stay on this device.
        </p>
      )}

      <div className="care-profile-form__sections">
      <section className="care-profile-form__section care-profile-form__section--you" aria-labelledby="about-you-heading">
        <ProfileSectionHeader
          title="About you"
          titleId="about-you-heading"
          whyText="So we know who stopped by and how to reach you."
        />

        <div className="care-profile-form__section-body space-y-4">
          <div className="care-profile-form__row">
            <div className="care-profile-form__field">
              <label htmlFor="visitor-name" className="care-profile-form__label">
                Your name or nickname
              </label>
              <input
                id="visitor-name"
                type="text"
                value={values.visitor_name}
                onChange={(e) => setValues((v) => ({ ...v, visitor_name: e.target.value }))}
                placeholder="e.g. Nikita"
                autoComplete="name"
                required
                maxLength={60}
              />
            </div>

            <div className="care-profile-form__field">
              <label htmlFor="visitor-email" className="care-profile-form__label">
                Your email
              </label>
              <input
                id="visitor-email"
                type="email"
                value={values.visitor_email}
                onChange={(e) => setValues((v) => ({ ...v, visitor_email: e.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
                required
                maxLength={120}
              />
            </div>

            <div className="care-profile-form__field md:col-span-2 lg:col-span-1">
              <label htmlFor="visit-purpose" className="care-profile-form__label">
                What brings you here?
              </label>
              <select
                id="visit-purpose"
                value={values.visit_purpose}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    visit_purpose: e.target.value as VisitPurposeCode,
                  }))
                }
                required
              >
                <option value="">Select…</option>
                {VISIT_PURPOSES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section
        className="care-profile-form__section care-profile-form__section--care"
        aria-labelledby="about-care-heading"
      >
        <ProfileSectionHeader
          title="About the person you're caring for"
          titleId="about-care-heading"
          whyText="Helps Luma and your clinician synopsis use the right context."
        />

        <div className="care-profile-form__section-body space-y-4">
          <div className="care-profile-form__row">
            <div className="care-profile-form__field">
              <label htmlFor="care-recipient-name" className="care-profile-form__label">
                Their name or nickname{" "}
                <span className="font-normal text-care-stone">(optional)</span>
              </label>
              <input
                id="care-recipient-name"
                type="text"
                value={values.care_recipient_name}
                onChange={(e) => setValues((v) => ({ ...v, care_recipient_name: e.target.value }))}
                placeholder="e.g. Mom, Robert"
                autoComplete="off"
                maxLength={60}
              />
            </div>

            <div className="care-profile-form__field">
              <label htmlFor="care-relationship" className="care-profile-form__label">
                Who are you caring for?
              </label>
              <select
                id="care-relationship"
                value={values.caregiver_relationship}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    caregiver_relationship: e.target.value as CaregiverRelationshipCode,
                  }))
                }
                required
              >
                <option value="">Select…</option>
                {CAREGIVER_RELATIONSHIPS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="care-profile-form__row">
            <div className="care-profile-form__field">
              <label htmlFor="care-age-range" className="care-profile-form__label">
                Age range
              </label>
              <select
                id="care-age-range"
                value={values.age_range}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    age_range: e.target.value as AgeRangeCode,
                  }))
                }
                required
              >
                <option value="">Select…</option>
                {AGE_RANGES.map((range) => (
                  <option key={range.code} value={range.code}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="care-profile-form__field">
              <label htmlFor="care-diagnosis" className="care-profile-form__label">
                Diagnosis journey
              </label>
              <select
                id="care-diagnosis"
                value={values.stage}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    stage: e.target.value as DementiaStageCode,
                  }))
                }
                required
              >
                <option value="">Select…</option>
                {DEMENTIA_STAGES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="care-profile-form__field">
              <label htmlFor="care-living" className="care-profile-form__label">
                Living situation <span className="font-normal text-care-stone">(optional)</span>
              </label>
              <select
                id="care-living"
                value={values.living_situation}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    living_situation: e.target.value as LivingSituationCode | "",
                  }))
                }
              >
                <option value="">Select if you&apos;d like…</option>
                {LIVING_SITUATIONS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>
      </div>

      {error && <p className="care-profile-form__error">{error}</p>}
      {success && <p className="care-profile-form__success">{success}</p>}

      <div className="care-profile-form__actions">
        <button
          type="submit"
          className={`btn-primary w-full sm:w-auto${success ? " btn-primary--saved" : ""}`}
          disabled={saving || skipping}
        >
          {saving ? "Saving…" : success ? "Saved" : submitLabel}
        </button>
        {onSkip && (
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={handleSkip}
            disabled={saving || skipping}
          >
            {skipping ? "…" : skipLabel}
          </button>
        )}
      </div>
      {actionNote && <p className="care-profile-form__action-note">{actionNote}</p>}
    </form>
  );
}

export function validateCareProfileFormValues(values: CareProfileFormValues): string | null {
  if (!values.visitor_name.trim()) return "Add your name or nickname";
  const email = values.visitor_email.trim();
  if (!email) return "Enter your email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
  if (!values.visit_purpose) return "Select what brings you here";
  if (!values.caregiver_relationship) return "Select who you're caring for";
  if (!values.age_range) return "Select an age range";
  if (!values.stage) return "Select a diagnosis journey";
  return null;
}

export function careProfileFormToPayload(values: CareProfileFormValues) {
  return {
    visitor_name: values.visitor_name.trim(),
    visitor_email: values.visitor_email.trim(),
    visit_purpose: values.visit_purpose,
    name: values.care_recipient_name.trim() || undefined,
    caregiver_relationship: values.caregiver_relationship,
    stage: values.stage,
    age_range: values.age_range,
    living_situation: values.living_situation || null,
  };
}
