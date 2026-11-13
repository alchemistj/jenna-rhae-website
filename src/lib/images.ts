import type { ImageMetadata } from "astro";
import heroHome from "../assets/hero-home.jpg";
import heroTrauma from "../assets/hero-trauma.jpg";
import heroKc from "../assets/hero-kc.jpg";
import heroContact from "../assets/hero-contact.jpg";
import faithCoffeeBible from "../assets/faith-coffee-bible.jpg";
import jenna from "../assets/jenna.jpg";
import coachJenna from "../assets/coach-jenna.jpg";
import logo from "../assets/jenna-logo.png";
import wpFlowerIcon from "../assets/wp/flower-icon.png";
import wpJennarhaeTraumaCoach from "../assets/wp/jennarhae-trauma-coach.jpg";
import wpFactsAboutJenna from "../assets/wp/facts-about-jenna.jpg";
import wpChristianLifeCoach from "../assets/wp/christian-life-coach.jpg";
import wpJennaWhiteAuthor from "../assets/wp/jenna-white-author.jpg";
import wpWhatCausesComplexTrauma from "../assets/wp/what-causes-complex-trauma.jpg";
import wpTenaciousGrace from "../assets/wp/tenacious-grace.avif";
import wpTraumaCoaching from "../assets/wp/trauma-coaching.jpg";
import wpJennaQuotes from "../assets/wp/jenna-quotes.png";
import wpTraumaNightmares from "../assets/wp/trauma-nightmares.png";
import wpHowToTrustAfterTrauma from "../assets/wp/how-to-trust-after-trauma.jpg";
import wpHowToRetrain from "../assets/wp/how-to-retrain-your-brain-after-trauma.jpg";
import wpIsGriefTrauma from "../assets/wp/is-grief-trauma.jpg";

/** Every site image is a local file in src/assets, optimized at build time. Data files refer to them by key. */
export const images = {
  "hero-home": heroHome,
  "hero-trauma": heroTrauma,
  "hero-kc": heroKc,
  "hero-contact": heroContact,
  "faith-coffee-bible": faithCoffeeBible,
  jenna,
  "coach-jenna": coachJenna,
  logo,
  "wp-flower-icon": wpFlowerIcon,
  "wp-jennarhae-trauma-coach": wpJennarhaeTraumaCoach,
  "wp-facts-about-jenna": wpFactsAboutJenna,
  "wp-christian-life-coach": wpChristianLifeCoach,
  "wp-jenna-white-author": wpJennaWhiteAuthor,
  "wp-what-causes-complex-trauma": wpWhatCausesComplexTrauma,
  "wp-tenacious-grace": wpTenaciousGrace,
  "wp-trauma-coaching": wpTraumaCoaching,
  "wp-jenna-quotes": wpJennaQuotes,
  "wp-trauma-nightmares": wpTraumaNightmares,
  "wp-how-to-trust-after-trauma": wpHowToTrustAfterTrauma,
  "wp-how-to-retrain-your-brain-after-trauma": wpHowToRetrain,
  "wp-is-grief-trauma": wpIsGriefTrauma,
} satisfies Record<string, ImageMetadata>;

export type ImageKey = keyof typeof images;

export function getImageMeta(key: ImageKey): ImageMetadata {
  return images[key];
}
