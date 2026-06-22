"use client";

import { useEffect, useRef, useState } from "react";
import type { CareRecipient } from "@/src/lib/repo";
import {
  CAREGIVER_RELATIONSHIPS,
  DEMENTIA_STAGES,
  LIVING_SITUATIONS,
  type CaregiverRelationshipCode,
  type DementiaStageCode,
  type LivingSituationCode,
} from "@/src/lib/careProfile";

export type CareProfileFormValues = {
  name: string;
  caregiver_relationship: CaregiverRelationshipCode | "";
  stage: DementiaStageCode | "";
  age: string;
  living_situation: LivingSituationCode | "";
};

function valuesFromRecipient(recipient: CareRecipient): CareProfileFormValues {
  return {
    name: recipient.name === "Default" ? "" : recipient.name,
    caregiver_relationship: (recipient.caregiver_relationship as CaregiverRelationshipCode) ?? "",
    stage: (recipient.stage as DementiaStageCode) ?? "",
    age: recipient.age != null ? String(recipient.age) : "",
    living_situation: (recipient.living_situation as LivingSituationCode) ?? "",
  };
}

type CareProfileFormProps = {
  recipient: CareRecipient;
  showDisclaimer?: boolean;
  submitLabel?: string;
  onSubmit: (values: CareProfileFormValues) => Promise<{ success: boolean; error?: string }>;
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
    <form onSubmit={handleSubmit} className="care-profile-form space-y-5" noValidate>
      {showDisclaimer && (
        <p className="care-profile-form__disclaimer">
          Luma helps you log and reflect — it is not medical advice. Your answers stay on this device.
        </p>
      )}

      <div className="care-profile-form__field">
        <label htmlFor="care-name" className="care-profile-form__label">
          First name or nickname
        </label>
        <input
          id="care-name"
          type="text"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Mom, Robert"
          autoComplete="off"
          required
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
  if (!values.name.trim()) return "Add a first name or nickname";
  if (!values.caregiver_relationship) return "Select who you're caring for";
  if (!values.stage) return "Select a dementia stage";
  const age = Number(values.age);
  if (!Number.isInteger(age) || age < 1 || age > 120) return "Enter a valid age between 1 and 120";
  return null;
}

export function careProfileFormToPayload(values: CareProfileFormValues) {
  return {
    name: values.name.trim(),
    caregiver_relationship: values.caregiver_relationship,
    stage: values.stage,
    age: Number(values.age),
    living_situation: values.living_situation || null,
  };
}
