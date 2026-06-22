/**
 * Care recipient profile — onboarding fields and display labels.
 */

export const DEMENTIA_STAGES = [
  { code: "MCI", label: "MCI (mild cognitive impairment)" },
  { code: "MILD", label: "Mild dementia" },
  { code: "MODERATE", label: "Moderate dementia" },
  { code: "SEVERE", label: "Severe dementia" },
] as const;

export type DementiaStageCode = (typeof DEMENTIA_STAGES)[number]["code"];

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
  { code: "SAME_CITY_SEPARATE", label: "Same area, separate home" },
  { code: "MEMORY_CARE", label: "Memory care / facility" },
  { code: "OTHER", label: "Other" },
] as const;

export type LivingSituationCode = (typeof LIVING_SITUATIONS)[number]["code"];

const STAGE_LABELS = Object.fromEntries(DEMENTIA_STAGES.map((s) => [s.code, s.label]));
const RELATIONSHIP_LABELS = Object.fromEntries(
  CAREGIVER_RELATIONSHIPS.map((r) => [r.code, r.label])
);
const RELATIONSHIP_SYNOPSIS_LABELS = Object.fromEntries(
  CAREGIVER_RELATIONSHIPS.map((r) => [r.code, r.synopsisLabel])
);
const LIVING_LABELS = Object.fromEntries(LIVING_SITUATIONS.map((l) => [l.code, l.label]));

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

export type CareProfileInput = {
  name: string;
  stage: DementiaStageCode;
  caregiver_relationship: CaregiverRelationshipCode;
  age: number;
  living_situation?: LivingSituationCode | null;
};

/** One-line context for clinician synopsis. */
export function buildCareContextLine(profile: {
  name: string;
  stage: string | null;
  age: number | null;
  caregiver_relationship: string | null;
  living_situation: string | null;
}): string | null {
  const parts: string[] = [];
  const stageLabel = getDementiaStageLabel(profile.stage);
  if (stageLabel) parts.push(stageLabel);
  if (profile.age != null && profile.age > 0) parts.push(`age ${profile.age}`);
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
