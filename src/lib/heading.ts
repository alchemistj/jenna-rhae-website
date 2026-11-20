/** Keep a heading dash with the word before it, and keep "Jenna White" on one line. */
export function lockHeading(text: string): string {
  return text.replace(/ —/g, "\u00A0—").replace(/Jenna White/g, "Jenna\u00A0White");
}
