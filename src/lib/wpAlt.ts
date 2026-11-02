/**
 * Alt text written for WordPress images whose live alt was empty or only the filename.
 * Decorative images stay alt="". Every other filename-like alt must be listed here.
 */

export const WRITTEN_ALTS: Record<string, string> = {
  "src/assets/wp/jennarhae-trauma-coach.jpg":
    "Jenna White smiling in a field of sunflowers, wearing a burgundy shirt",
  "src/assets/wp/facts-about-jenna.jpg":
    "Jenna White smiling in a car, with curly hair, a gold necklace, and long earrings",
  "src/assets/wp/christian-life-coach.jpg":
    "Jenna White in a lace wedding gown and veil, holding a red and white bouquet beside her husband in a tan suit",
  "src/assets/wp/jenna-barbosa-author.jpg":
    "Portrait of Jenna Barbosa smiling, with long dark hair, glasses, and a floral top",
  "src/assets/wp/angel-williams-author.jpg":
    "Portrait of Angel Williams smiling, with long twists and a striped shirt",
  "src/assets/wp/what-causes-complex-trauma.jpg":
    "Woman in a white dress standing at the ocean with her arms open, seen from behind",
  "src/assets/wp/the-gift-hidden-in-the-ask.jpg": "Close-up of clasped hands in a cream knit sweater",
  "src/assets/wp/jenna-quotes.png": "White opening quotation marks on a black square",
  "src/assets/wp/trauma-coaching.jpg": "Woman sitting on a rocky overlook above a turquoise mountain lake",
  "src/assets/wp/how-to-trust-after-trauma.jpg":
    "Two people sitting together on a park bench at sunset, seen in silhouette",
  "src/assets/wp/how-to-retrain-your-brain-after-trauma.jpg":
    "Woman sitting in a lavender field with her eyes closed in warm sunlight",
  "src/assets/wp/trauma-nightmares.png": "Woman lying on her side in bed beside a bright window",
  "src/assets/wp/is-grief-trauma.jpg": "Two people hugging by the water in winter coats while snow falls",
  "src/assets/wp/tenacious-grace.avif":
    "Cover of the book Tenacious Grace by Jenna Barbosa, red with a plate, heart, fork, and spoon",
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** True when the live alt is empty or just the file name (including "Title Case" versions of it). */
export function filenameLikeAlt(alt: string, src: string): boolean {
  const trimmed = alt.trim();
  if (!trimmed) return true;
  if (trimmed.toLowerCase() === "jenna") return true;
  const base = src.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") ?? "";
  return normalizeToken(trimmed) === normalizeToken(base);
}

export function resolveAlt(image: { src: string; alt: string; decorative?: boolean }): string {
  if (image.decorative) return "";
  if (!filenameLikeAlt(image.alt, image.src)) return image.alt;
  const written = WRITTEN_ALTS[image.src];
  if (!written) throw new Error(`Write alt text for ${image.src} (live alt ${JSON.stringify(image.alt)})`);
  return written;
}
