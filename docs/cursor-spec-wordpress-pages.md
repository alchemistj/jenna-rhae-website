# Cursor spec: build the WordPress pages into the Astro site

Repo `alchemistj/jenna-rhae-website`, branch `claude/busy-gauss-oku7rw`. Read `docs/build-brief.md` (Josh's decisions), `docs/components.md` (how to add a page) and `docs/wp-content-notes.md` (format of the WordPress data) first. The Astro rules are `docs/sop/` in `alchemistj/ff-architect`; the brief's exceptions win.

The site, the Lovable pages and the WordPress content are already on the branch. `npm test` passes (71 tests).

## Task
Build these pages from `src/data/wp/*.json`, **word for word**: people have QA'd this copy, and Jenna wrote the posts. Don't reword, trim or reorder it.

1. `/about/` from `about.json`.
2. `/tenacious-grace/` from `tenacious-grace.json`.
3. `/free-trauma-test/` from `free-trauma-test.json`. The quiz goes in `DeferredIframe` with `QUIZ_URL`, plus the deferred `BookingEmbed` (WordPress has the booking calendar on this page). The page has no H1 on WordPress. Use **"Free Trauma Test"**, the first part of its WordPress SEO title, as the H1 and say so in your report.
4. `/blog/`: list all 7 posts from `blog.json` `posts[]` (title, excerpt, date, featured image, link). Don't also render its `sections`. The live page hides one post, and the new one must show all 7.
5. The 7 posts at their same URLs, using one post template: H1, date, author, featured image, body blocks, then the final CTA/Book button the site already uses. Add `Article`/`BlogPosting` JSON-LD with the published and modified dates. Keep author names as published ("Jenna Barbosa" stays).

For each page:
- Remove `pending: true` in `src/lib/routeRegistry.ts`.
- Add the images (already in `src/assets/wp/`) through `src/lib/images.ts`.
- Use the WordPress `title` and `metaDescription` for SEO.
- Render inline markdown links, bold and italics as described in `wp-content-notes.md`.

Body images follow Astro Rule 4.2 where it fits: beside the text, alternating sides. Inside a blog post, keep images where the author put them.

Alt text:
- Where an image has an empty alt or a filename-like alt (e.g. "jennarhae-Trauma-Coach"), write a short, plain description of what is actually in the photo.
- Keep `decorative: true` images as `alt=""`.
- List every alt you wrote in your report.

Links:
- Now that `/about/` exists, the home page's "Our Team" buttons link to `/about/` (they render as non-links while it's pending).
- The home page cards "Free Trauma Clarity Test" and "Tenacious Grace" link to `/free-trauma-test/` and `/tenacious-grace/`.
- Nav shows About and Blog once published.
- `#trauma-quiz` anchors in the WordPress content must land somewhere real. Give the quiz section on `/free-trauma-test/` `id="trauma-quiz"` and point those links at `/free-trauma-test/#trauma-quiz`.

Tests:
- The existing copy test, or an equivalent, must also cover `src/data/wp`: every `p`/`li`/heading string appears in the built HTML of its page.
- Add a test that all 7 posts appear on `/blog/` and in `sitemap.xml`.
- The redirects `/feed` and `/comments/feed` → `/blog/` must now resolve to a published page.

## Required checks
`npm run check`, `npm run lint`, `npm test`, `npm run build` and `git diff --check` must all pass. Never game a check.

## Don't
- Don't change copy in `src/data/pages/*` or `src/data/wp/*`, except the H1 and alt text cases above.
- Don't touch the contact form, GA4, `vercel.json` redirects, legal pages or fonts.
- Don't add Google Fonts, phone numbers or hotlinked images.
