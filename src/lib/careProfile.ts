/**
 * Care recipient profile — onboarding fields and display labels.
 */

export const DEMENTIA_STAGES = [
  { code: "MCI", label: "Mild cognitive impairment" },
  { code: "MILD", label: "Early-stage dementia" },
  { code: "MODERATE", label: "Moderate dementia" },
  { code: "SEVERE", label: "Advanced dementia" },
  { code: "NOT_SURE", label: "Not sure" },
] as const;

export type DementiaStageCode = (typeof DEMENTIA_STAGES)[number]["code"];

export const AGE_RANGES = [
  { code: "UNDER_65", label: "Under 65" },
  { code: "AGE_65_74", label: "65–74" },
  { code: "AGE_75_84", label: "75–84" },
  { code: "AGE_85_PLUS", label: "85+" },
  { code: "NOT_SURE", label: "Not sure / prefer not to say" },
] as const;

export type AgeRangeCode = (typeof AGE_RANGES)[number]["code"];

export const CAREGIVER_RELATIONSHIPS = [
  { code: "SPOUSE", label: "My spouse or partner", synopsisLabel: "spouse" },
  { code: "ADULT_CHILD", label: "My parent", synopsisLabel: "adult child" },
  { code: "GRANDPARENT", label: "My grandparent", synopsisLabel: "grandchild" },
  { code: "PARENT", label: "My child", synopsisLabel: "parent" },
  { code: "SIBLING", label: "My sibling", synopsisLabel: "sibling" },
  { code: "OTHER_FAMILY", label: "Other family member", synopsisLabel: "family member" },
  { code: "PROFESSIONAL", label: "Professional caregiver (not family)", synopsisLabel: "professional caregiver" },
  { code: "OTHER", label: "Other", synopsisLabel: "caregiver" },
] as const;

export type CaregiverRelationshipCode = (typeof CAREGIVER_RELATIONSHIPS)[number]["code"];

export const LIVING_SITUATIONS = [
  { code: "LIVES_WITH_ME", label: "Lives with me" },
  { code: "LIVES_WITH_FAMILY", label: "Lives with another family member" },
  { code: "LIVES_ALONE", label: "Lives alone" },
  { code: "ASSISTED_LIVING", label: "Assisted living" },
  { code: "MEMORY_CARE", label: "Memory care" },
  { code: "NURSING_FACILITY", label: "Nursing facility" },
  { code: "OTHER", label: "Other / not sure" },
] as const;

export type LivingSituationCode = (typeof LIVING_SITUATIONS)[number]["code"];

export const VISIT_PURPOSES = [
  { code: "CURIOUS", label: "Curious about your work" },
  { code: "COLLABORATE", label: "Would love to collaborate on this further" },
  { code: "CAREGIVER", label: "Exploring this as a caregiver" },
  { code: "OTHER", label: "Something else" },
] as const;

export type VisitPurposeCode = (typeof VISIT_PURPOSES)[number]["code"];

const STAGE_LABELS = Object.fromEntries(DEMENTIA_STAGES.map((s) => [s.code, s.label]));
const AGE_RANGE_LABELS = Object.fromEntries(AGE_RANGES.map((a) => [a.code, a.label]));
const RELATIONSHIP_LABELS = Object.fromEntries(
  CAREGIVER_RELATIONSHIPS.map((r) => [r.code, r.label])
);
const RELATIONSHIP_SYNOPSIS_LABELS = Object.fromEntries(
  CAREGIVER_RELATIONSHIPS.map((r) => [r.code, r.synopsisLabel])
);
const LIVING_LABELS = Object.fromEntries(LIVING_SITUATIONS.map((l) => [l.code, l.label]));

export function getAgeRangeLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return AGE_RANGE_LABELS[code] ?? code;
}

export function getDementiaStageLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return STAGE_LABELS[code] ?? code;
}

export function getCaregiverRelationshipLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return RELATIONSHIP_LABELS[code] ?? code;
}

export function getCaregiverRelationshipSynopsisLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return RELATIONSHIP_SYNOPSIS_LABELS[code] ?? getCaregiverRelationshipLabel(code);
}

export function getLivingSituationLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return LIVING_LABELS[code] ?? code;
}

const PURPOSE_LABELS = Object.fromEntries(VISIT_PURPOSES.map((p) => [p.code, p.label]));

export function getVisitPurposeLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return PURPOSE_LABELS[code] ?? code;
}

export type CareProfileInput = {
  name: string;
  stage: DementiaStageCode;
  caregiver_relationship: CaregiverRelationshipCode;
  age_range: AgeRangeCode;
  living_situation?: LivingSituationCode | null;
};

/** One-line context for clinician synopsis. */
export function buildCareContextLine(profile: {
  name: string;
  stage: string | null;
  age_range: string | null;
  age: number | null;
  caregiver_relationship: string | null;
  living_situation: string | null;
}): string | null {
  const parts: string[] = [];
  const stageLabel = getDementiaStageLabel(profile.stage);
  if (stageLabel) parts.push(stageLabel);
  const ageLabel = getAgeRangeLabel(profile.age_range);
  if (ageLabel) parts.push(`age ${ageLabel.toLowerCase()}`);
  else if (profile.age != null && profile.age > 0) parts.push(`age ${profile.age}`);
  if (profile.name.trim() && profile.name !== "Default") {
    parts.unshift(profile.name.trim());
  }
  const relation = getCaregiverRelationshipSynopsisLabel(profile.caregiver_relationship);
  if (relation) parts.push(`cared for by ${relation}`);
  const living = getLivingSituationLabel(profile.living_situation);
  if (living) parts.push(living.toLowerCase());

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  const [first, ...rest] = parts;
  return `${first} — ${rest.join(", ")}`;
}

/** Fields from care profile used to personalize Luma conversation prompts. */
export type LumaCareProfileInput = {
  name: string;
  stage: string | null;
  caregiver_relationship: string | null;
  age_range: string | null;
  age: number | null;
  living_situation: string | null;
};

/** Companion system-prompt block; empty when profile has no care context yet. */
export function buildLumaCareProfileBrief(profile: LumaCareProfileInput): string {
  const lines: string[] = [];

  const name = profile.name.trim();
  if (name && name !== "Default") {
    lines.push(`Person they care for: ${name}`);
  }

  const stageLabel = getDementiaStageLabel(profile.stage);
  if (stageLabel) {
    lines.push(
      profile.stage === "NOT_SURE" ? "Dementia stage: not sure yet" : `Dementia stage: ${stageLabel}`
    );
  }

  const ageLabel = getAgeRangeLabel(profile.age_range);
  if (ageLabel && profile.age_range !== "NOT_SURE") {
    lines.push(`Age range: ${ageLabel}`);
  } else if (profile.age != null && profile.age > 0) {
    lines.push(`Age: ${profile.age}`);
  }

  const relation = getCaregiverRelationshipSynopsisLabel(profile.caregiver_relationship);
  if (relation) {
    lines.push(`Caregiver is their ${relation}`);
  }

  const living = getLivingSituationLabel(profile.living_situation);
  if (living) {
    lines.push(`Living situation: ${living}`);
  }

  if (lines.length === 0) return "";

  return `\n## Care context (from their saved profile)
${lines.map((l) => `- ${l}`).join("\n")}

Use this to tailor warmth and dementia-aware context when it genuinely helps. Do not recite the profile back or mention "profile" or "onboarding". If the conversation contradicts the profile, trust what they say now.`;
}
