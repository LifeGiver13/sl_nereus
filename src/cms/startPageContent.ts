/**
 * Start page PageManager schema (this repo’s admin app).
 * Keep in sync with the web repo copy: `src/cms/startPageContent.ts`.
 */

export type StartPageSection = {
  name: string;
  active: boolean;
  fields: unknown[];
  displayOrder: number;
};

export const START_PAGE_SECTION_BLUEPRINT = [{ name: "Intro", displayOrder: 0 }] as const;

export const START_PAGE_SLUG = "start-page" as const;

/** Defaults match `web/src/pages/RegistrationWizard.tsx` (pre-CMS copy). */
export const START_INTRO_DEFAULT_TITLE = "Get Started With Us";

export const START_INTRO_DEFAULT_BODY =
  "By filling this form and setting up your profile, our system will offer you jobs that match your profile.";

export const START_INTRO_DEFAULT_CTA_LABEL = "Get Started";

/** Stored as `section.fields[0]` for the Intro section (`name === "Intro"`). */
export type StartIntroPayload = {
  kind: "startIntro";
  title: string;
  body: string;
  ctaLabel: string;
  /** S3 object key under `public_assets/` when a custom image is uploaded */
  imageKey: string;
};

export const START_INTRO_DEFAULTS: StartIntroPayload = {
  kind: "startIntro",
  title: START_INTRO_DEFAULT_TITLE,
  body: START_INTRO_DEFAULT_BODY,
  ctaLabel: START_INTRO_DEFAULT_CTA_LABEL,
  imageKey: "",
};

export function parseStartIntroContent(fields: unknown[]): StartIntroPayload {
  const first = fields[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return { ...START_INTRO_DEFAULTS };
  }
  const o = first as Record<string, unknown>;
  if (o.kind !== "startIntro") {
    return { ...START_INTRO_DEFAULTS };
  }
  let imageKey = "";
  if (typeof o.imageKey === "string" && o.imageKey.trim()) {
    imageKey = o.imageKey.trim();
  } else if (typeof o.key === "string" && o.key.trim()) {
    imageKey = o.key.trim();
  }
  const bodyFromStorage =
    typeof o.body === "string"
      ? o.body
      : typeof o.description === "string"
        ? o.description
        : undefined;
  const body = bodyFromStorage === undefined ? START_INTRO_DEFAULT_BODY : bodyFromStorage;
  /** Do not trim title/cta while typing (admin re-parses each render). */
  const title = typeof o.title === "string" ? o.title : "";
  const ctaLabel =
    typeof o.ctaLabel === "string"
      ? o.ctaLabel
      : typeof o.ctaText === "string"
        ? o.ctaText
        : "";
  return {
    kind: "startIntro",
    title,
    body,
    ctaLabel,
    imageKey,
  };
}

export function serializeStartIntroContent(payload: StartIntroPayload): unknown[] {
  return [{ ...START_INTRO_DEFAULTS, ...payload, kind: "startIntro" as const }];
}

export function ensureStartIntroFieldsInSection(section: StartPageSection): StartPageSection {
  if (section.name !== "Intro") return section;
  const parsed = parseStartIntroContent(section.fields);
  const ctaLabel = parsed.ctaLabel.trim() || START_INTRO_DEFAULT_CTA_LABEL;
  return {
    ...section,
    fields: serializeStartIntroContent({ ...parsed, ctaLabel }),
  };
}

export function buildDefaultStartSections(): StartPageSection[] {
  return START_PAGE_SECTION_BLUEPRINT.map((b) => ({
    name: b.name,
    active: true,
    fields: serializeStartIntroContent(START_INTRO_DEFAULTS),
    displayOrder: b.displayOrder,
  }));
}

export function normalizeStartSections(
  existing: StartPageSection[] | undefined | null
): StartPageSection[] {
  const byName = new Map((existing ?? []).map((sec) => [sec.name, sec]));
  return START_PAGE_SECTION_BLUEPRINT.map((blueprint) => {
    const prev = byName.get(blueprint.name);
    if (prev) {
      return {
        ...prev,
        name: blueprint.name,
        displayOrder: blueprint.displayOrder,
        /** Start page content is always shown on `/register`; do not persist inactive. */
        active: true,
        fields: Array.isArray(prev.fields) ? prev.fields : [],
      };
    }
    return {
      name: blueprint.name,
      active: true,
      fields: [],
      displayOrder: blueprint.displayOrder,
    };
  }).map((sec) => ensureStartIntroFieldsInSection(sec));
}

export function startPageSectionsNeedSeeding(
  existing: StartPageSection[] | undefined | null
): boolean {
  if (!existing?.length) return true;
  return !existing.some((s) => s.name === "Intro");
}

export function findStartIntroSection(
  sections: StartPageSection[],
  name = "Intro"
): StartPageSection | undefined {
  return sections.find((s) => s.name === name);
}
