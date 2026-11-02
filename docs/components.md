# Components and how to add a page

All pages come from one template, `src/pages/[...slug].astro`. A page is a typed data file in `src/data/pages/`
(type `PageData` in `src/data/types.ts`) holding every visible string word for word. No copy lives in components.

## Add a page (for example `/about/`)
1. Write `src/data/pages/about.ts` (`export default { path: "/about/", seo, hero?, blocks, ... } satisfies PageData`).
2. Add it to `pages` in `src/data/pages/index.ts`.
3. In `src/lib/routeRegistry.ts` remove `pending: true` for the route. Set `hasBooking` (true only if the page has a `{ type: "booking" }` block; the layout throws if they disagree) and `photoHero`.
4. Add images to `src/assets`, register a key in `src/lib/images.ts`, and refer to it by key in the data. Hero photos must be named `<key>.jpg` (they are inlined as AVIF at build time).
5. Nav links and card links to a route render only once the route is published. Run `npm test`; the copy test checks every string in your data file appears in the built HTML.
Need a new section type? Add it to `Block` in `types.ts` and a `case` in `PageBlocks.astro`.

## Layout and chrome
- `layouts/BaseLayout.astro` props: `page: PageData`. Builds SEO head, canonical, Open Graph, JSON-LD, then body in first-frame order. Derives the Book button target (`#book` or `/contact/#book`).
- `Header.astro` props: `path`, `bookHref`. Hide on scroll, details-based hamburger. Nav comes from `data/site.ts` and skips pending routes.
- `Footer.astro` props: `bookHref`. `MobileBar.astro` props: `bookHref` (Book button only).
- `HeroPhoto.astro` props: `image` (key), `alt`, `objectPosition?`, `overlayOpacity?`. `Hero.astro` props: `hero: HeroData`, `bookHref`.
- `BookButton.astro` props: `label`, `href`, `class?`.

## Sections
- `Section.astro` props: `bg?: "cream" | "gold" | "charcoal"`, `id?`, `class?`, `compact?`. Slot.
- `SectionHeader.astro` props: `eyebrow?`, `heading`, `class?`.
- `TwoColumn.astro` props: `image` (key), `alt`, `side?: "right" | "left"` (alternate down the page), `photoFirstOnMobile?`. Slot is the text column.
- `Faq.astro` props: `items: {q, a}[]` (native details). `FinalCta.astro` props: `quote`, `ctaLabel`, `bookHref`.
- `Icon.astro` props: `name` (check, mail, map-pin, monitor, menu, close), `size?`, `class?`.

## Embeds and form
- `DeferredIframe.astro` props: `src`, `title`, `noscriptLabel`, `height?`, `mobileHeight?`, `id?`. No iframe in server HTML; loads on first interaction or when 10% visible. Use it for the LeadConnector quiz: `QUIZ_URL` in `src/lib/site.ts`.
- `BookingEmbed.astro` (no props): section with id `book`, heading and iframe from `data/site.ts` `booking`.
- `LeadForm.astro` props: `form: FormCopy`, `bookHref`. Logic in `src/lib/leadSubmit.ts` (tests in `tests/leadSubmit.test.ts`).

## Libraries
`lib/routeRegistry.ts` (routes, `isPublished`), `lib/seoFiles.ts` (sitemap, robots, llms), `lib/redirects.ts` plus `vercel.json` (kept in sync by `tests/redirects.test.ts`), `lib/analytics.ts` (GA4 loaded 3 s after window load or on first interaction), `lib/inlineImage.ts` (hero AVIF 35-60 KB and logo, inlined at build).
