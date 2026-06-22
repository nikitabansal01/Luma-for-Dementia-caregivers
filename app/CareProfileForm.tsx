"use client";

import { useEffect, useRef, useState } from "react";
import type { CareRecipient } from "@/src/lib/repo";
import {
  CAREGIVER_RELATIONSHIPS,
  DEMENTIA_STAGES,
  LIVING_SITUATIONS,
  VISIT_PURPOSES,
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
  age: string;
  living_situation: LivingSituationCode | "";
};

function valuesFromRecipient(recipient: CareRecipient): CareProfileFormValues {
  return {
    visitor_name: recipient.visitor_name ?? "",
    visitor_email: recipient.visitor_email ?? "",
    visit_purpose: (recipient.visit_purpose as VisitPurposeCode) ?? "",
    care_recipient_name: recipient.name === "Default" ? "" : recipient.name,
    caregiver_relationship: (recipient.caregiver_relationship as CaregiverRelationshipCode) ?? "",
    stage: (recipient.stage as DementiaStageCode) ?? "",
    age: recipient.age != null ? String(recipient.age) : "",
    living_situation: (recipient.living_situation as LivingSituationCode) ?? "",
  };
}

type CareProfileSubmitResult =
  | { success: true; recipient?: CareRecipient }
  | { success: false; error?: string };

type CareProfileFormProps = {
  recipient: CareRecipient;
  showDisclaimer?: boolean;
  submitLabel?: string;
  onSubmit: (values: CareProfileFormValues) => Promise<CareProfileSubmitResult | void>;
  onSkip?: () => Promise<{ success: boolean; error?: string } | void>;
  skipLabel?: string;
};

export default function CareProfileForm({
  recipient,
  showDisclaimer = false,
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
        <header className="care-profile-form__section-header">
          <h3 id="about-you-heading" className="care-profile-form__section-title">
            About you
          </h3>
          <p className="care-profile-form__section-lead">So we know who stopped by and how to reach you.</p>
        </header>

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
        <header className="care-profile-form__section-header">
          <h3 id="about-care-heading" className="care-profile-form__section-title">
            About the person you&apos;re caring for
          </h3>
          <p className="care-profile-form__section-lead">
            Helps Luma and your clinician synopsis use the right context.
          </p>
        </header>

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

            <div className="care-profile-form__field">
              <label htmlFor="care-age" className="care-profile-form__label">
                Their age
              </label>
              <input
                id="care-age"
                type="number"
                min={1}
                max={120}
                value={values.age}
                onChange={(e) => setValues((v) => ({ ...v, age: e.target.value }))}
                placeholder="e.g. 82"
                required
              />
            </div>
          </div>

          <div className="care-profile-form__field">
            <span className="care-profile-form__label">Dementia stage</span>
            <div className="care-profile-form__stage-grid" role="radiogroup" aria-label="Dementia stage">
              {DEMENTIA_STAGES.map((s) => (
                <label key={s.code} className="care-profile-form__stage-option">
                  <input
                    type="radio"
                    name="dementia-stage"
                    value={s.code}
                    checked={values.stage === s.code}
                    onChange={() => setValues((v) => ({ ...v, stage: s.code }))}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="care-profile-form__field lg:max-w-md">
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
  if (!values.stage) return "Select a dementia stage";
  const age = Number(values.age);
  if (!Number.isInteger(age) || age < 1 || age > 120) return "Enter a valid age between 1 and 120";
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
    age: Number(values.age),
    living_situation: values.living_situation || null,
  };
}
