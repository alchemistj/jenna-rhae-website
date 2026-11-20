# Jenna Rhae rebuild: audit fixes spec for Cursor (Nov 20, 2026)

Branch: `claude/jenna-audit-fixes` (off `claude/busy-gauss-oku7rw` at ebaa80d).
Item numbers match the Sonnet audit punch list (49 items). Items not listed under "Build" are held for Josh or Jenna; do not touch them.

## Step 0: stop if anything differs

- `git rev-parse --abbrev-ref HEAD` must be `claude/jenna-audit-fixes`, and the head must be the commit named in the @cursor comment. If either differs, stop and reply on the PR with what you found. Do not build.

## Hard rules

1. **Keep every approved word exactly as it is.** Jenna approved this copy. Do not reword, shorten, add or delete any visible text unless this spec gives the exact new words. Case changes and markup fixes named below are the only exceptions.
2. **You write no copy.** If a fix seems to need new words that are not in this spec, skip that part and say so in your reply.
3. Push only to `claude/jenna-audit-fixes`, normal fast-forward push. No new branch, no PR, no merge, no force push. Do not touch `main` or `claude/busy-gauss-oku7rw`.
4. Never deploy, never touch DNS, never change anything on jennarhae.com, open no accounts, add no paid service.
5. No new npm dependencies unless the spec names one.
6. One commit per section below is ideal (Header, Footer, Legal, Fonts and photos, Pages, Blog, Global styles). Clear commit messages with the item numbers.

## Checks before every push

```
npm test
npx astro check   # if it runs in this repo; otherwise skip and say so
npx astro build
git diff --check
```

All must pass. Add or update vitest tests where a rule below says "test".

---

## A. Header (items 1, 41)

**1. No booking button in the header or the mobile menu.**
- `src/components/Header.astro`: remove both header `BookButton`s (the `bookLong` one shown at sm and up, and the `bookShort` one beside the hamburger) and the `BookButton` at the end of the mobile `<details data-menu>` menu.
- Keep the six text links and the hamburger. Keep the mobile bottom bar and all in-page buttons.
- Remove `header.bookLong`/`header.bookShort` from `site.ts` only if nothing else uses them (the mobile bar will reuse the "Book a Free Call" string; see item 42, so keep that string somewhere in `site.ts`).
- Test: built HTML of every page has no `data-cta-location="header"` and no `data-cta-location="mobile_menu"`.

**41. Bigger logo.** With the button gone, set the header logo to 180px wide (`getInlineLogo("jenna-logo.png", 180)`, `w-[180px]`). On phones keep it at 150px so it fits beside the hamburger. Keep the header height variable in sync if the logo needs a taller bar (`--header-h`; 72px is fine).

## B. Footer (items 13, 14, 15, 17, 18)

**13. Serving Women column.** Render the serving list as a single column (remove `grid grid-cols-2`). Keep every item and its exact words. No item may wrap mid-phrase at 1280 or 1440; if one still wraps, widen that column (see 15 for even columns). Add `&nbsp;` only inside "Kansas City, MO" and "Online — Nationwide" style phrases if needed to stop a split (do not change the words).

**14. Bottom row.**
- Copyright year from the build date: `© ${new Date().getFullYear()} JennaRhae.com | All Rights Reserved` (keep the rest of the string exactly as in `site.ts`; only the year becomes dynamic).
- The three legal links sit on one line at 390 and 1440 (smaller gap or font-size 14px is fine; no wrap of "Text Messaging Terms" onto its own line at 1440; at 390 they may stack as a centred group, but each link stays whole).
- The tagline "Jenna White — Christian Life Coach — Kansas City, MO" stays on one line at 1440, on the same baseline as the copyright. Use non-breaking spaces around the em dashes and in "Kansas City, MO" so "MO" never sits alone.

**15. Footer links.**
- Services list: link the items that have pages: Trauma Recovery Coaching → `/trauma-coaching/`, Christian Life Coaching → `/christian-life-coach-kansas-city-mo/`, Christian Coaching in Kansas City → `/christian-life-coach-kansas-city-mo/`, Tenacious Grace → `/tenacious-grace/`, Free Consultation Call → `/contact/#book`. Items without a page stay plain text. Do not change any item's words.
- Add a small "Pages" list or a link row with the existing nav labels (Home, About, Blog, Contact): reuse the exact `header.nav` labels and hrefs from `site.ts` (no new words). Put Tenacious Grace in the footer this way too if it is not already linked (decision 8: footer, not header).
- Even the columns: equal widths at 1440 (CSS grid with equal `1fr` columns, tops aligned). At 390 they stack.
- Links on the charcoal footer are cream/white with an underline on hover, never red on black.

**17. Cream strip under the footer on phones.** The mobile body `padding-bottom: var(--bar-h)` shows cream under the footer. Move that space into the footer (footer gets `padding-bottom: calc(var(--bar-h) + 1.5rem)` below md, body loses its padding-bottom), so the page ends on charcoal. Check at 390 that nothing is hidden behind the fixed bar.

**18. Wordmark and caps.**
- Footer: replace the hand-typed `J`+`ENNARHAE` div with the same butterfly logo image the header uses (`getInlineLogo("jenna-logo.png", 160)`), with alt text "JennaRhae". If the logo is dark on transparent and unreadable on charcoal, put it on a small cream rounded panel; do not recolour the logo.
- Blog list "READ MORE": change `readMoreLabel` values in `src/data/wp/blog.json` to "Read more" (case change only).
- `src/styles/global.css` `.eyebrow`: remove `text-transform: uppercase` (and any wide letter-spacing that only made sense in caps).
- Test: no element in the built HTML has `text-transform: uppercase` from our CSS, and no "READ MORE" string remains.

## C. Legal pages (item 2, decision 2)

The real legal text is a draft waiting on Jenna and a lawyer. Do **not** put the draft text on the site.
- Add `legalFinal: false` to `site.ts` (one flag).
- While `legalFinal` is false:
  - `/privacy/`, `/terms/`, `/text-messaging-terms/` render with `<meta name="robots" content="noindex, nofollow">` (add an optional `robots` prop to `BaseLayout.astro` and pass it from `[...slug].astro` for `kind: "legal"` routes).
  - Drop the three legal routes from `sitemap.xml` and `llms.txt` (filter `kind === "legal"` in `src/lib/seoFiles.ts` when the flag is false).
  - Hide the SMS consent block on the contact form (do not render the checkbox or its consent sentence). The phone field stays optional. Nothing about SMS consent is submitted.
- Keep the three pages and the footer links as they are (placeholder text unchanged).
- Tests: with the flag false, sitemap and llms exclude the legal URLs; the legal pages carry noindex; the contact page has no SMS consent checkbox. With the flag true (unit-level), all three come back.

## D. Fonts and photos (items 4, 5, 6, 7, 26, 27, 28)

**5. Script font from live.** Live uses **Berkshire Swash** (Google Fonts, weight 400).
- Self-host it: download the latin woff2 from Google Fonts (`https://fonts.googleapis.com/css2?family=Berkshire+Swash&display=swap`, then the woff2 URL in that CSS) into `public/fonts/berkshire-swash-400.woff2`. One weight only. It is under the SIL Open Font License; add its `OFL.txt` next to it.
- `@font-face` in `global.css` with `font-display: swap`. No preload. Add a Tailwind token `--font-script: "Berkshire Swash", Georgia, serif;`.
- Use it only on: every page hero H1 (the `Hero.astro` title), the About page title, and one accent line per page at most where live had red script. Keep Georgia for H2/H3 and system sans for body. Script headings use red (`text-accent`) or cream on dark photos, sized so the longest hero H1 still wraps to at most 3 lines at 390.

**4. Home hero: live's wheat field.**
- Find the wheat-field photo on live `https://jennarhae.com/` (the background image of the first section on the home page; check the page source and computed styles for the first section's background-image URL). Download it to `src/assets/hero-home-wheat.jpg`.
- If you cannot find it or download it, **stop this item**, leave the current hero, and say so in your reply. Do not use a stock or generated image.
- Use it for the home hero. Alt text (neutral, not naming Jenna): `Woman walking through a golden wheat field at sunset`. If the photo shows something else, describe what it actually shows in that style, without names.
- Overlay: drop the full dark overlay. Use a gradient only behind the text side (for example `linear-gradient(90deg, rgba(28,28,28,.6) 0%, rgba(28,28,28,.35) 45%, rgba(28,28,28,0) 75%)` at desktop, and a bottom-up gradient behind the text at 390). Text must pass 4.5:1 contrast where it sits. Keep the warm gold of the photo.
- Keep the inline AVIF/first-frame pattern (`HeroPhoto`, `.atf`) working with the new image.
- Remove the old `hero-home.jpg` if nothing else uses it.

**6. About: beach hero.**
- Download `https://jennarhae.com/wp-content/uploads/2025/02/About-Me-Jenna-Barbosa.jpg` to `src/assets/about-beach.jpg` (rename removes the old surname; the file name must not contain "Barbosa").
- Give About a full-width photo hero like the other pages, with the approved title "About Me" in the script font, and the existing red flower icon (`src/assets/wp/flower-icon.png`) beside the title.
- Remove the floating flower and its ~250px gap under the old title. One normal section gap before the first paragraph.
- Alt text: `Beach at the water's edge in soft light` (adjust to what the photo shows; no names).

**7. "Why Work With Jenna White?" photo (Home and Kansas City).**
- Replace the selfie (`jenna` image) in that two-column block on both pages with the curly-hair portrait `coach-jenna`.
- Crop centred on her face: `object-position` so the face sits in the upper third, never cut at forehead or chin at 390 or 1440.
- Photo column height close to the text column (no tall photo with torso beside short text); aspect ratio around 4:5 at 1440 and 4:3 at 390.
- Keep the existing alt text.

**26. Trauma Coaching hero.** Keep the photo (no brand replacement exists). Move the subject out from behind the text: `object-position` toward the right at desktop, and put the text-side gradient as in item 4. Change the alt text to the neutral `Woman seated near a window in soft light` (drop "with Jenna White").

**27. Kansas City hero.**
- Alt text to `Two women talking over coffee` (drop "Kansas City coffee shop").
- Shift `object-position` so the H1 does not sit over their faces, and add the text-side gradient.
- H1: `text-wrap: balance` and a non-breaking space between "Jenna" and "White" so "White" never sits alone.
- Hero button "Book a Free Consultation in Kansas City" (approved words, keep them): make it fit one line at 390 if the button style allows (slightly smaller horizontal padding is fine); if it must wrap, use `text-wrap: balance` so no single word sits alone, and keep the standard button height rule.

**28. Contact hero.** Move the photo's focal point so the mug and hand sit away from the text (`object-position`), and add the text-side gradient so the H1, subhead and bullets read cleanly. Do not change the words.

## E. Pages (items 6 gap, 8, 10, 11, 12, 29, 30, 31, 32, 35, 36, 42, 43, 46)

**8. Final call-to-action band (new words, Sonnet-written, pending Jenna's approval).**
Build one `FinalCta` band used as the last section before the footer on: all six blog posts (replace the current `closing-book` charcoal band), Trauma Coaching, Kansas City Coaching, and Contact (replace the charcoal button-free or quote band at the end; keep the quote band if it is approved copy, but it must not be the last band, and it must not be footer charcoal).
- Background: brand red `#a51c30` with cream text, or gold `#c8a882` with charcoal text. Use red. Must differ from the charcoal footer.
- Headline (exact): `You Don't Have to Carry This Alone`
- Body (exact): `Start with a free call. We will talk about what you are carrying and what feels hard right now, with no pressure to decide anything.`
- Button (approved label, exact): `Book a Free Consultation Call`. On the red band use the cream/outline button variant so it does not vanish (one of the site's existing button styles; no new button style).
- Put these strings in `site.ts` under `finalCta` with a comment `// Draft copy pending Jenna's approval (Nov 20, 2026)`.
- The headline is the script font or Georgia; your choice, keep it consistent.

**10. Home service cards.**
- Every linked card shows the same cue: the approved "Learn More →" label pinned to the card bottom. Cards that are already whole-card links without a label (Tenacious Grace, Free Trauma Clarity Test) get the same "Learn More →" cue (the label is existing approved text used on the sibling cards).
- Free Consultation Call card links to `/contact/#book` with the same cue.
- Faith-Based Emotional Freedom and Secure Singleness have no page: render them as visibly static (no hover lift, no cursor pointer, no arrow).
- (43) Equal card heights per row, cue aligned along the bottom.

**11. Tenacious Grace cover.** Show the whole cover: `object-fit: contain` in a portrait box (aspect about 2:3), no cropping at 390 or 1440. Trim the ~150px gap under the cover at 390. (34, gaps only:) close the ~110px gap between the H1 and H2 to one normal heading gap, and put the "Learn more" button directly under the last paragraph. Do not change the cover image.

**12. 404 page (new words, Sonnet-written, pending Jenna's approval).**
Add `src/pages/404.astro` using `BaseLayout` with header, footer and mobile bar.
- `<title>` (exact): `Page Not Found | JennaRhae`
- noindex.
- H1 (exact): `Let's Get You Back on Track`
- Body (exact): `That link has moved or no longer works, and that is okay. Pick a place below to keep going, or reach out if you need help.`
- Three links using the existing nav labels: Home (`/`), Trauma Coaching (`/trauma-coaching/`), Contact (`/contact/`).
- Not in sitemap or llms.txt. Make sure Vercel serves it for unknown URLs (Astro static `404.html` in the output root).
- Strings in `site.ts` under `notFound` with the same draft-copy comment.

**29. Meet Your Coaches.** With one member, centre the single card (max width about 360px, centred in the column) instead of pinning it left in a 3-column grid. Keep the grid for 2+ members.

**30. Body text.** One body size across content pages: 17px (1.0625rem) at 390 and 1440, line-height 1.65. Paragraphs over 3 lines are left-aligned (remove centring on the Home intro and services intro paragraphs; centred headings are fine). Do not split or merge paragraphs (that would change approved copy layout); just the size and alignment.

**31. Free Trauma Test.** Give it a title treatment like the other pages: a centred H1 in the script font on a cream band (or the standard hero component without a photo if `Hero.astro` supports that). Cut the ~90px gap above the quiz box to one normal section gap. Same quiz box width as the content column.

**32. Booking embed placeholder.** In the deferred `#book` embed area, show a visible placeholder card inside the reserved space before the embed loads: the existing booking heading stays above it; inside, a cream bordered box with the approved button "Book a Free Consultation Call" that loads the embed on click (it already loads on interaction), and a light skeleton. Reserve height close to the loaded widget (measure the loaded height on the preview; do not leave 1000px of blank cream). Do not move the booking section on Home (layout order is approved).

**35. About spacing and photos.**
- Even photo-to-paragraph spacing on phones (one value, about 24 to 32px) after the sunflower, wedding and car photos.
- Wedding photo: crop showing both faces at 390 (`object-position: center 20%` or similar), and at 1440 its height close to the text beside it (no 542px stretch).
- "Three fun facts about me:" renders as an H3 styled like other H3s (change the block `type` from `h4` to `h3` in `about.json`; words unchanged).

**36. About search title.** In `src/data/wp/about.json` change the `title` to `About Jenna White | Freedom Life Coach` (removes "Rhae" from the name, matching the approved name; nothing else changes).

**42. Mobile bottom bar.** Label becomes `Book a Free Call` (the existing header string, reused). Same button size and style as the standard primary button. Keep the bar.

**46. Contact consent label.** (Only applies once `legalFinal` is true, since C hides it now.) Make the SMS consent label at least 15px at 390 so it is readable when it comes back. Leave the "How did you find Jenna?" options as they are.

## F. Blog (items 9, 20, 21, 22, 23, 25, 47, 49 part)

**9. Blog list on phones.** Photo first, then date, title, excerpt, "Read more", so each card groups together. Balanced title wraps (`text-wrap: balance`) so "Cope", "Overlap", "Forward" never sit alone.

**20. Half-bold words.** Markup fix only, words unchanged:
- `src/data/wp/how-to-trust-after-trauma.json`: `**scan for safet**y` → `**scan for safety**`
- `src/data/wp/trauma-nightmares.json`: `**process trauma during the da**y` → `**process trauma during the day**`

**21. Excerpts.** Add a `listExcerpt` field per post in `src/data/wp/blog.json` and render it instead of `excerpt` in the blog list. These are the posts' own opening sentences, cut at a sentence end, no "[...]" and no new words. Use exactly:
- how-to-trust-after-trauma: `Learning to trust after trauma is one of the hardest — and most courageous — parts of the healing journey. When trauma involves betrayal, abandonment, or abuse, it teaches your nervous system that people aren’t safe and that you must stay on guard.`
- what-to-do-after-trauma: `Retraining your brain after trauma can feel challenging — but it’s also one of the most empowering parts of recovery. When trauma takes hold, it changes the way the brain stores memories, reacts to stress, and senses safety.`
- trauma-nightmares: `Trauma nightmares can be deeply disturbing — especially when they catch you off guard or repeat night after night. So what’s really going on when they happen?`
- is-grief-trauma: `Often, people wonder if grief and trauma are the same thing. The short answer? They can overlap — but they’re not the same.`
- what-causes-complex-trauma: `A good way to understand complex trauma is to recognize that it’s caused by repeated or prolonged exposure to what we can think of as highly stressful, overwhelming, or harmful experiences — the kind that affect us emotionally, physically, mentally, or even relationally.`
- what-does-a-trauma-coach-do: `Let me guess: You’ve done the therapy. You’ve read the books. You’ve done the work. And yet, you still feel stuck.`
- Test: no blog list excerpt contains "[…]" or "[...]".

**22. Blog list at 1440.** Equal-height rows, the same image aspect ratio (3:2) on every card, "Read more" aligned at the bottom of each text column.

**23. Post header block.** H1, one meta line, featured image with 24 to 32px gaps (remove the ~100px gaps). Article prose max width about 700px (`max-w-[44rem]`) at 17 to 18px, in the 900px container. Body text colour dark enough for 4.5:1 on cream (charcoal at 85% or darker).

**25. Chat link.** `src/data/wp/what-does-a-trauma-coach-do.json`: link "book a free 15-minute chat" → `/contact/#book` (the URL only; words unchanged). Leave the author box "jennarhae.com" link as is.

**47. Author box and meta.**
- At 390 stack the author photo above the bio.
- Featured image at 1440: full column width (900px) at a 2:1 ratio, or keep it at 448px but centred; prefer full width.
- Meta line: date, read time and author on one line separated by a middle dot `·` (a separator character, no new words).

**49 (part).** In the four post JSON files, change the author image `title` "Jenna-Barbossa-author" to "Jenna-White-author" (not rendered; data cleanup). Do not change meta descriptions or titles.

## G. Global styles (items 37, 38, 39, 43, 44)

**37. Headings and widths.**
- One H3 style site-wide (Georgia, 22px at 1440, 20px at 390, weight 400 or 600; pick one and use it in posts, FAQ and cards). Post H2 and H3 both Georgia.
- Eyebrows render as `<p class="eyebrow">`, not `<h2>`.
- Container 900px; prose blocks capped near 700px; no other ad hoc widths (remove the 672px and 494px one-offs).

**38. Buttons.** One primary size (16px text, 54px min height, same padding) and one outline size (the same metrics), everywhere: header is gone, hero, in-page, bottom bar, "About Jenna". On phones, primary buttons in heroes are full content width (or all `auto` width with the same padding; pick one rule and apply it everywhere). Labels never clip; long labels wrap balanced.

**39. Palette accents from live.** Keep the four colours and the single width. Add: red on H2 accent underline or a short divider under section headings, gold on dividers and eyebrows, red for the final CTA band (item 8), and the red flower icon as a small centred divider between major sections on Home, About and Tenacious Grace (decorative, `alt=""`, at most 3 per page).

**43. Card and column balance.** "Learn More" pinned to card bottoms (cards are flex columns), equal heights per row (Home services; Trauma and Kansas City related services). Two-column photo sections: photo about 40 to 45% of the row, text 55 to 60%.

**44. Heading wraps.** Non-breaking space before every em dash in headings (Home and Trauma H1s keep "Christian Life Coach —" and "Jenna White" together as live intends: the dash stays with the word before it). `text-wrap: balance` on all h1 to h3. Buttons with "Book a Free Consultation Call" never leave "Call" alone at 390 (balance or nbsp between "Consultation" and "Call").

---

## Held (do not build)

3 Central Forms; 16 social links; 19 Menu label; 24 related posts band; 33 course link; 34 cover image swap; 40 rule 0.5 phrases; 45 "By Appointment"; 46 dropdown options; 48 photo identity and alt names; 49 meta trims and the is-grief-trauma description; the old cities in the footer (13) stay as approved.

## When you finish

Reply on the PR with: each item number above marked done or skipped (with the reason), the commit SHAs, and the check output (tests count, build pages count).
