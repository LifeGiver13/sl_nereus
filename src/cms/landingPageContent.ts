/**
 * Landing page PageManager schema (this repo’s admin app).
 * Keep in sync with the web repo copy: `src/cms/landingPageContent.ts`.
 */

export type PageManagerSection = {
  name: string;
  active: boolean;
  fields: unknown[];
  displayOrder: number;
};

/** Ordered sections for the marketing landing page (display names stored as `name` on each section). */
export const LANDING_PAGE_SECTION_BLUEPRINT = [
  { name: "Hero", displayOrder: 0 },
  { name: "Partner Logos", displayOrder: 1 },
  { name: "Process Flow", displayOrder: 2 },
  { name: "Sectors", displayOrder: 3 },
  { name: "About Us", displayOrder: 4 },
  { name: "Contact Info", displayOrder: 5 },
] as const;

export const LANDING_PAGE_SLUG = "landing-page" as const;

/** Stored as `section.fields[0]` for the Hero section (`name === "Hero"`). */
export type HeroContentPayload = {
  kind: "hero";
  title: string;
  subTitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export const HERO_CONTENT_DEFAULTS: HeroContentPayload = {
  kind: "hero",
  title: "",
  subTitle: "",
  primaryCtaLabel: "Submit Application",
  secondaryCtaLabel: "Login",
};

export function parseHeroContent(fields: unknown[]): HeroContentPayload {
  const first = fields[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return { ...HERO_CONTENT_DEFAULTS };
  }
  const o = first as Record<string, unknown>;
  return {
    kind: "hero",
    title: typeof o.title === "string" ? o.title : "",
    subTitle: typeof o.subTitle === "string" ? o.subTitle : "",
    primaryCtaLabel:
      typeof o.primaryCtaLabel === "string"
        ? o.primaryCtaLabel
        : HERO_CONTENT_DEFAULTS.primaryCtaLabel,
    secondaryCtaLabel:
      typeof o.secondaryCtaLabel === "string"
        ? o.secondaryCtaLabel
        : HERO_CONTENT_DEFAULTS.secondaryCtaLabel,
  };
}

export function serializeHeroContent(payload: HeroContentPayload): unknown[] {
  return [{ ...HERO_CONTENT_DEFAULTS, ...payload, kind: "hero" as const }];
}

export function ensureHeroFieldsInSection(section: PageManagerSection): PageManagerSection {
  if (section.name !== "Hero") return section;
  return {
    ...section,
    fields: serializeHeroContent(parseHeroContent(section.fields)),
  };
}

/** One uploaded logo object in S3; full key is e.g. `public_assets/name__2026_03_30_12_5.png`. */
export type PartnerLogoEntry = {
  key: string;
};

/** Stored as `section.fields[0]` for the Partner Logos section (`name === "Partner Logos"`). */
export type PartnerLogosContentPayload = {
  kind: "partnerLogos";
  title: string;
  logos: PartnerLogoEntry[];
};

export const PARTNER_LOGOS_CONTENT_DEFAULTS: PartnerLogosContentPayload = {
  kind: "partnerLogos",
  title: "",
  logos: [],
};

export function parsePartnerLogosContent(fields: unknown[]): PartnerLogosContentPayload {
  const first = fields[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return { ...PARTNER_LOGOS_CONTENT_DEFAULTS };
  }
  const o = first as Record<string, unknown>;
  if (o.kind !== "partnerLogos") {
    return { ...PARTNER_LOGOS_CONTENT_DEFAULTS };
  }
  const logosRaw = o.logos;
  const logos: PartnerLogoEntry[] = [];
  if (Array.isArray(logosRaw)) {
    for (const item of logosRaw) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
      const k = (item as Record<string, unknown>).key;
      if (typeof k !== "string" || !k.trim()) continue;
      logos.push({ key: k.trim() });
    }
  }
  return {
    kind: "partnerLogos",
    title: typeof o.title === "string" ? o.title : "",
    logos,
  };
}

export function serializePartnerLogosContent(payload: PartnerLogosContentPayload): unknown[] {
  return [{ ...PARTNER_LOGOS_CONTENT_DEFAULTS, ...payload, kind: "partnerLogos" as const }];
}

export function ensurePartnerLogosFieldsInSection(section: PageManagerSection): PageManagerSection {
  if (section.name !== "Partner Logos") return section;
  return {
    ...section,
    fields: serializePartnerLogosContent(parsePartnerLogosContent(section.fields)),
  };
}

function newProcessFlowStepId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** One step in the process flow; thumbnail is an S3 key under `public_assets/`. */
export type ProcessFlowStep = {
  id: string;
  title: string;
  /** S3 object key for the step image */
  thumbnailKey: string;
};

export function createEmptyProcessFlowStep(): ProcessFlowStep {
  return { id: newProcessFlowStepId(), title: "", thumbnailKey: "" };
}

/** Default section heading for Process Flow (required in the editor). */
export const PROCESS_FLOW_DEFAULT_TITLE = "How We Work";

/** Stored as `section.fields[0]` for the Process Flow section (`name === "Process Flow"`). */
export type ProcessFlowContentPayload = {
  kind: "processFlow";
  title: string;
  steps: ProcessFlowStep[];
};

export const PROCESS_FLOW_CONTENT_DEFAULTS: ProcessFlowContentPayload = {
  kind: "processFlow",
  title: PROCESS_FLOW_DEFAULT_TITLE,
  steps: [],
};

export function parseProcessFlowContent(fields: unknown[]): ProcessFlowContentPayload {
  const first = fields[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return { ...PROCESS_FLOW_CONTENT_DEFAULTS };
  }
  const o = first as Record<string, unknown>;
  if (o.kind !== "processFlow") {
    return { ...PROCESS_FLOW_CONTENT_DEFAULTS };
  }
  const stepsRaw = o.steps;
  const steps: ProcessFlowStep[] = [];
  if (Array.isArray(stepsRaw)) {
    for (const item of stepsRaw) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : newProcessFlowStepId();
      const title = typeof row.title === "string" ? row.title : "";
      let thumbnailKey = "";
      if (typeof row.thumbnailKey === "string" && row.thumbnailKey.trim()) {
        thumbnailKey = row.thumbnailKey.trim();
      } else if (typeof row.key === "string" && row.key.trim()) {
        thumbnailKey = row.key.trim();
      }
      steps.push({ id, title, thumbnailKey });
    }
  }
  const rawTitle = typeof o.title === "string" ? o.title.trim() : "";
  return {
    kind: "processFlow",
    title: rawTitle || PROCESS_FLOW_DEFAULT_TITLE,
    steps,
  };
}

export function serializeProcessFlowContent(payload: ProcessFlowContentPayload): unknown[] {
  return [{ ...PROCESS_FLOW_CONTENT_DEFAULTS, ...payload, kind: "processFlow" as const }];
}

export function ensureProcessFlowFieldsInSection(section: PageManagerSection): PageManagerSection {
  if (section.name !== "Process Flow") return section;
  const parsed = parseProcessFlowContent(section.fields);
  const title = parsed.title.trim() || PROCESS_FLOW_DEFAULT_TITLE;
  return {
    ...section,
    fields: serializeProcessFlowContent({ ...parsed, title }),
  };
}

/** Known built-in sector icon ids (must match `web/src/config/sectorBuiltinIcons.ts`). */
export const SECTOR_BUILTIN_ICON_IDS = [
  "people_alt",
  "insert_drive_file",
  "food_bank",
  "cleaning_services",
  "health_and_safety",
  "settings_suggest",
  "monetization_on",
] as const;

export type SectorBuiltinIconId = (typeof SECTOR_BUILTIN_ICON_IDS)[number];

function normalizeSectorBuiltinIconId(id: unknown): string {
  if (typeof id !== "string" || !id.trim()) return "";
  const t = id.trim();
  return SECTOR_BUILTIN_ICON_IDS.includes(t as SectorBuiltinIconId) ? t : "";
}

function newSectorEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sector_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export type SectorEntry = {
  id: string;
  title: string;
  description: string;
  builtinIconId: string;
  thumbnailKey: string;
};

export function createEmptySectorEntry(): SectorEntry {
  return {
    id: newSectorEntryId(),
    title: "",
    description: "",
    builtinIconId: "",
    thumbnailKey: "",
  };
}

/** Default section heading for Sectors. */
export const SECTORS_SECTION_DEFAULT_TITLE = "Our Specialised Sectors";

/** Stored as `section.fields[0]` for the Sectors section (`name === "Sectors"`). */
export type SectorsContentPayload = {
  kind: "sectors";
  title: string;
  sectors: SectorEntry[];
};

/** Initial sectors — keep in sync with `web/src/config/landingSectorsDefaults.ts`. */
export const DEFAULT_SECTORS_CONTENT: SectorsContentPayload = {
  kind: "sectors",
  title: SECTORS_SECTION_DEFAULT_TITLE,
  sectors: [
    {
      id: "sector_perm",
      title: "Permanent",
      description:
        "We have been supplying quality, experienced staff throughout South Wales for over 20 years.",
      builtinIconId: "people_alt",
      thumbnailKey: "",
    },
    {
      id: "sector_office",
      title: "Office & Admin",
      description:
        "We tailor our service to your exact requirements, making sure the candidate is an extremely strong match for your role.",
      builtinIconId: "insert_drive_file",
      thumbnailKey: "",
    },
    {
      id: "sector_catering",
      title: "Catering",
      description:
        "In such a fast moving service industry, it’s vital that you have effective and reactive staffing and recruitment procedures in place.",
      builtinIconId: "food_bank",
      thumbnailKey: "",
    },
    {
      id: "sector_cleaning",
      title: "Cleaning",
      description:
        "The cleaning industry is often plagued by staffing issues such as sickness and holiday cover.",
      builtinIconId: "cleaning_services",
      thumbnailKey: "",
    },
    {
      id: "sector_health",
      title: "Healthcare",
      description:
        "It is vital that organisations and care homes have a compliant and reliable care recruitment procedure in place.",
      builtinIconId: "health_and_safety",
      thumbnailKey: "",
    },
    {
      id: "sector_mfg",
      title: "Manufacturing",
      description:
        "Processes are getting smarter and automation is increasing all the time, but high quality human input is still vital.",
      builtinIconId: "settings_suggest",
      thumbnailKey: "",
    },
    {
      id: "sector_finance",
      title: "Business and Finance",
      description:
        "Our Business and Finance division specialises in recruiting talented finance professionals for accountancy and finance roles.",
      builtinIconId: "monetization_on",
      thumbnailKey: "",
    },
  ],
};

export const SECTORS_CONTENT_DEFAULTS: SectorsContentPayload = DEFAULT_SECTORS_CONTENT;

function cloneDefaultSectorsPayload(): SectorsContentPayload {
  return {
    ...DEFAULT_SECTORS_CONTENT,
    sectors: DEFAULT_SECTORS_CONTENT.sectors.map((s) => ({ ...s })),
  };
}

export function parseSectorsContent(fields: unknown[]): SectorsContentPayload {
  const first = fields[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return cloneDefaultSectorsPayload();
  }
  const o = first as Record<string, unknown>;
  if (o.kind !== "sectors") {
    return cloneDefaultSectorsPayload();
  }
  const sectorsRaw = o.sectors;
  const sectors: SectorEntry[] = [];
  if (Array.isArray(sectorsRaw)) {
    for (const item of sectorsRaw) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : newSectorEntryId();
      const title = typeof row.title === "string" ? row.title : "";
      const description = typeof row.description === "string" ? row.description : "";
      const builtinIconId = normalizeSectorBuiltinIconId(row.builtinIconId);
      let thumbnailKey = "";
      if (typeof row.thumbnailKey === "string" && row.thumbnailKey.trim()) {
        thumbnailKey = row.thumbnailKey.trim();
      } else if (typeof row.key === "string" && row.key.trim()) {
        thumbnailKey = row.key.trim();
      }
      sectors.push({ id, title, description, builtinIconId, thumbnailKey });
    }
  }
  const rawSectionTitle = typeof o.title === "string" ? o.title.trim() : "";
  return {
    kind: "sectors",
    title: rawSectionTitle || SECTORS_SECTION_DEFAULT_TITLE,
    sectors,
  };
}

export function serializeSectorsContent(payload: SectorsContentPayload): unknown[] {
  return [{ ...SECTORS_CONTENT_DEFAULTS, ...payload, kind: "sectors" as const }];
}

export function ensureSectorsFieldsInSection(section: PageManagerSection): PageManagerSection {
  if (section.name !== "Sectors") return section;
  const parsed = parseSectorsContent(section.fields);
  const title = parsed.title.trim() || SECTORS_SECTION_DEFAULT_TITLE;
  return {
    ...section,
    fields: serializeSectorsContent({ ...parsed, title }),
  };
}

/** Default heading for the About Us block (matches current marketing landing page). */
export const ABOUT_US_DEFAULT_TITLE = "About Us";

/** Default CTA label on the About Us block. */
export const ABOUT_US_DEFAULT_CTA = "Submit Application";

/**
 * Default body copy — taken from the current landing page About Us section
 * (previously the static text beside the collaboration image).
 */
export const ABOUT_US_DEFAULT_BODY =
  "Our Business and Finance division specialises in recruiting talented finance professionals for accountancy and finance roles. Our Business and Finance division specialises in recruiting talented finance professionals for accountancy and finance roles. Our Business and Finance division specialises in recruiting talented finance professionals for accountancy and finance roles.";

/** Stored as `section.fields[0]` for the About Us section (`name === "About Us"`). */
export type AboutUsContentPayload = {
  kind: "aboutUs";
  title: string;
  body: string;
  /** S3 object key under `public_assets/` when a custom image is uploaded */
  imageKey: string;
  ctaLabel: string;
};

export const ABOUT_US_CONTENT_DEFAULTS: AboutUsContentPayload = {
  kind: "aboutUs",
  title: ABOUT_US_DEFAULT_TITLE,
  body: ABOUT_US_DEFAULT_BODY,
  imageKey: "",
  ctaLabel: ABOUT_US_DEFAULT_CTA,
};

export function parseAboutUsContent(fields: unknown[]): AboutUsContentPayload {
  const first = fields[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return { ...ABOUT_US_CONTENT_DEFAULTS };
  }
  const o = first as Record<string, unknown>;
  if (o.kind !== "aboutUs") {
    return { ...ABOUT_US_CONTENT_DEFAULTS };
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
  const body = bodyFromStorage === undefined ? ABOUT_US_DEFAULT_BODY : bodyFromStorage;
  const titleRaw = typeof o.title === "string" ? o.title.trim() : "";
  const ctaRaw =
    typeof o.ctaLabel === "string"
      ? o.ctaLabel.trim()
      : typeof o.ctaText === "string"
        ? o.ctaText.trim()
        : "";
  return {
    kind: "aboutUs",
    title: titleRaw || ABOUT_US_DEFAULT_TITLE,
    body,
    imageKey,
    ctaLabel: ctaRaw || ABOUT_US_DEFAULT_CTA,
  };
}

export function serializeAboutUsContent(payload: AboutUsContentPayload): unknown[] {
  return [{ ...ABOUT_US_CONTENT_DEFAULTS, ...payload, kind: "aboutUs" as const }];
}

export function ensureAboutUsFieldsInSection(section: PageManagerSection): PageManagerSection {
  if (section.name !== "About Us") return section;
  const parsed = parseAboutUsContent(section.fields);
  const title = parsed.title.trim() || ABOUT_US_DEFAULT_TITLE;
  const ctaLabel = parsed.ctaLabel.trim() || ABOUT_US_DEFAULT_CTA;
  return {
    ...section,
    fields: serializeAboutUsContent({ ...parsed, title, ctaLabel }),
  };
}

/** Default CTA beside the Contact Info description (logo column). */
export const CONTACT_INFO_DEFAULT_CTA = "Submit Application";

/** Optional heading shown above the contact / footer block on the public site (empty = no title). */
export const CONTACT_INFO_DEFAULT_TITLE = "";

/**
 * Default description — from the landing page company intro above the Contact / map grid
 * (Atlantic Resource paragraph with line break between sentences).
 */
export const CONTACT_INFO_DEFAULT_DESCRIPTION =
  "Atlantic Resource is an independent recruitment agency based in the heart of Cardiff City Centre.\n\nSpecialising in permanent recruitment solutions, construction & plant, office administration, catering, healthcare and security, we provide comprehensive recruitment services to employers and job seekers across the whole of the UK.";

/** Stored as `section.fields[0]` for the Contact Info section (`name === "Contact Info"`). */
export type ContactInfoContentPayload = {
  kind: "contactInfo";
  /** Main section heading above the footer grid; leave blank to hide. */
  title: string;
  description: string;
  ctaLabel: string;
};

export const CONTACT_INFO_CONTENT_DEFAULTS: ContactInfoContentPayload = {
  kind: "contactInfo",
  title: CONTACT_INFO_DEFAULT_TITLE,
  description: CONTACT_INFO_DEFAULT_DESCRIPTION,
  ctaLabel: CONTACT_INFO_DEFAULT_CTA,
};

export function parseContactInfoContent(fields: unknown[]): ContactInfoContentPayload {
  const first = fields[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return { ...CONTACT_INFO_CONTENT_DEFAULTS };
  }
  const o = first as Record<string, unknown>;
  if (o.kind !== "contactInfo") {
    return { ...CONTACT_INFO_CONTENT_DEFAULTS };
  }
  const descFromStorage =
    typeof o.description === "string"
      ? o.description
      : typeof o.body === "string"
        ? o.body
        : undefined;
  const description =
    descFromStorage === undefined ? CONTACT_INFO_DEFAULT_DESCRIPTION : descFromStorage;
  const ctaRaw =
    typeof o.ctaLabel === "string"
      ? o.ctaLabel.trim()
      : typeof o.ctaText === "string"
        ? o.ctaText.trim()
        : "";
  /** Do not trim: the admin editor re-parses fields every render; trimming would strip trailing spaces while typing. */
  const title = typeof o.title === "string" ? o.title : "";
  return {
    kind: "contactInfo",
    title,
    description,
    ctaLabel: ctaRaw || CONTACT_INFO_DEFAULT_CTA,
  };
}

export function serializeContactInfoContent(payload: ContactInfoContentPayload): unknown[] {
  return [{ ...CONTACT_INFO_CONTENT_DEFAULTS, ...payload, kind: "contactInfo" as const }];
}

export function ensureContactInfoFieldsInSection(section: PageManagerSection): PageManagerSection {
  if (section.name !== "Contact Info") return section;
  const parsed = parseContactInfoContent(section.fields);
  const ctaLabel = parsed.ctaLabel.trim() || CONTACT_INFO_DEFAULT_CTA;
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  return {
    ...section,
    fields: serializeContactInfoContent({ ...parsed, title, ctaLabel }),
  };
}

export function buildDefaultLandingSections(): PageManagerSection[] {
  return LANDING_PAGE_SECTION_BLUEPRINT.map((s) => {
    const base: PageManagerSection = {
      name: s.name,
      active: true,
      fields: [],
      displayOrder: s.displayOrder,
    };
    if (s.name === "Hero") {
      base.fields = serializeHeroContent(HERO_CONTENT_DEFAULTS);
    }
    if (s.name === "Partner Logos") {
      base.fields = serializePartnerLogosContent(PARTNER_LOGOS_CONTENT_DEFAULTS);
    }
    if (s.name === "Process Flow") {
      base.fields = serializeProcessFlowContent(PROCESS_FLOW_CONTENT_DEFAULTS);
    }
    if (s.name === "Sectors") {
      base.fields = serializeSectorsContent(cloneDefaultSectorsPayload());
    }
    if (s.name === "About Us") {
      base.fields = serializeAboutUsContent(ABOUT_US_CONTENT_DEFAULTS);
    }
    if (s.name === "Contact Info") {
      base.fields = serializeContactInfoContent(CONTACT_INFO_CONTENT_DEFAULTS);
    }
    return base;
  });
}

export function normalizeLandingSections(
  existing: PageManagerSection[] | undefined | null
): PageManagerSection[] {
  const byName = new Map((existing ?? []).map((sec) => [sec.name, sec]));
  return LANDING_PAGE_SECTION_BLUEPRINT.map((b) => {
    const prev = byName.get(b.name);
    if (prev) {
      return {
        ...prev,
        name: b.name,
        displayOrder: b.displayOrder,
        active: Boolean(prev.active),
        fields: Array.isArray(prev.fields) ? prev.fields : [],
      };
    }
    return {
      name: b.name,
      active: true,
      fields: [],
      displayOrder: b.displayOrder,
    };
  })
    .map((sec) => ensureHeroFieldsInSection(sec))
    .map((sec) => ensurePartnerLogosFieldsInSection(sec))
    .map((sec) => ensureProcessFlowFieldsInSection(sec))
    .map((sec) => ensureSectorsFieldsInSection(sec))
    .map((sec) => ensureAboutUsFieldsInSection(sec))
    .map((sec) => ensureContactInfoFieldsInSection(sec));
}

export function landingSectionsNeedSeeding(
  existing: PageManagerSection[] | undefined | null
): boolean {
  if (!existing?.length) return true;
  const names = new Set(existing.map((s) => s.name));
  return LANDING_PAGE_SECTION_BLUEPRINT.some((b) => !names.has(b.name));
}
