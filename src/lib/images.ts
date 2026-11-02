import type { ImageMetadata } from "astro";
import heroHome from "../assets/hero-home.jpg";
import heroTrauma from "../assets/hero-trauma.jpg";
import heroKc from "../assets/hero-kc.jpg";
import heroContact from "../assets/hero-contact.jpg";
import faithCoffeeBible from "../assets/faith-coffee-bible.jpg";
import jenna from "../assets/jenna.jpg";
import coachJenna from "../assets/coach-jenna.jpg";
import coachAlisha from "../assets/coach-alisha.jpg";
import coachAngel from "../assets/coach-angel.jpg";
import logo from "../assets/jenna-logo.png";

/** Every site image is a local file in src/assets, optimized at build time. Data files refer to them by key. */
export const images = {
  "hero-home": heroHome,
  "hero-trauma": heroTrauma,
  "hero-kc": heroKc,
  "hero-contact": heroContact,
  "faith-coffee-bible": faithCoffeeBible,
  jenna,
  "coach-jenna": coachJenna,
  "coach-alisha": coachAlisha,
  "coach-angel": coachAngel,
  logo,
} satisfies Record<string, ImageMetadata>;

export type ImageKey = keyof typeof images;

export function getImageMeta(key: ImageKey): ImageMetadata {
  return images[key];
}
