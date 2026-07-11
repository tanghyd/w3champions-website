// Shared helpers for the native Warehouse section: race string <-> ERaceEnum
// mapping and hero-icon resolution. The warehouse API speaks full race strings
// ("Human" | "Orc" | "NightElf" | "Undead" | "Random") and serves hero icons at
// URLs like /static/icons/heroes/demonhunter.png. Where the site ships an
// equivalent local hero asset we prefer it (HeroPicture); otherwise we fall back
// to the warehouse-hosted image.

import { ERaceEnum } from "@/store/types";
import type { Race } from "@/store/warehouse/types";

export const WAREHOUSE_RACES: Race[] = ["Human", "Orc", "NightElf", "Undead", "Random"];

// Race string -> the site's ERaceEnum (drives PlayerIcon / RaceIcon).
export function raceToEnum(race: string | null | undefined): ERaceEnum {
  switch (race) {
    case "Human":
      return ERaceEnum.HUMAN;
    case "Orc":
      return ERaceEnum.ORC;
    case "NightElf":
      return ERaceEnum.NIGHT_ELF;
    case "Undead":
      return ERaceEnum.UNDEAD;
    default:
      return ERaceEnum.RANDOM;
  }
}

// Short label used in compact stat labels ("HU vs NE").
export function raceShort(race: string | null | undefined): string {
  switch (race) {
    case "Human":
      return "HU";
    case "Orc":
      return "OR";
    case "NightElf":
      return "NE";
    case "Undead":
      return "UD";
    case "Random":
      return "RD";
    default:
      return race ?? "";
  }
}

// The hero PNGs shipped under public/assets/heroes (static; safe to hardcode).
// A warehouse hero whose icon basename is in this set renders via HeroPicture.
export const KNOWN_HERO_ICONS: ReadonlySet<string> = new Set([
  "alchemist",
  "archmage",
  "avatarofflame",
  "bansheeranger",
  "beastmaster",
  "blademaster",
  "cryptlord",
  "deathknight",
  "demonhunter",
  "dreadlord",
  "farseer",
  "keeperofthegrove",
  "lich",
  "mountainking",
  "paladin",
  "pandarenbrewmaster",
  "pitlord",
  "priestessofthemoon",
  "seawitch",
  "shadowhunter",
  "sorceror",
  "taurenchieftain",
  "tinker",
  "warden",
]);

// Derive the basename ("demonhunter") from a warehouse icon_url or hero_id.
export function heroIconBasename(url: string | null | undefined): string {
  if (!url) return "";
  const last = url.split("/").pop() ?? "";
  return last.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}
