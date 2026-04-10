import people_alt from "../assets/images/landing-page/icons/people_alt.png";
import insert_drive_file from "../assets/images/landing-page/icons/insert_drive_file.png";
import food_bank from "../assets/images/landing-page/icons/food_bank.png";
import cleaning_services from "../assets/images/landing-page/icons/cleaning_services.png";
import health_and_safety from "../assets/images/landing-page/icons/health_and_safety.png";
import settings_suggest from "../assets/images/landing-page/icons/settings_suggest.png";
import monetization_on from "../assets/images/landing-page/icons/monetization_on.png";

/** Icons for landing “Sectors” in the editor (same ids as public site). Keep assets under `src/assets/images/landing-page/icons/`. */
export const SECTOR_BUILTIN_ICONS = [
  { id: "people_alt", label: "People / Permanent", src: people_alt },
  { id: "insert_drive_file", label: "Office & Admin", src: insert_drive_file },
  { id: "food_bank", label: "Catering", src: food_bank },
  { id: "cleaning_services", label: "Cleaning", src: cleaning_services },
  { id: "health_and_safety", label: "Healthcare", src: health_and_safety },
  { id: "settings_suggest", label: "Manufacturing", src: settings_suggest },
  { id: "monetization_on", label: "Business and Finance", src: monetization_on },
] as const;

export type SectorBuiltinIconId = (typeof SECTOR_BUILTIN_ICONS)[number]["id"];

const byId = Object.fromEntries(SECTOR_BUILTIN_ICONS.map((i) => [i.id, i.src])) as Record<
  string,
  string
>;

export function getSectorBuiltinIconSrc(iconId: string): string | undefined {
  return iconId && byId[iconId] ? byId[iconId] : undefined;
}

export function isSectorBuiltinIconId(id: string): id is SectorBuiltinIconId {
  return SECTOR_BUILTIN_ICONS.some((i) => i.id === id);
}
