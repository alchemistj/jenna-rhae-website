# WordPress content extraction notes

Source: https://jennarhae.com (WordPress + Thrive Architect), pulled 2 Nov 2026. Copy is word for word; nothing was reworded.

## Files
- `src/data/wp/<slug>.json` for `about`, `blog`, `free-trauma-test`, `tenacious-grace` and the 7 posts.
- `src/data/wp/testimonials.json` (empty, see below).
- `src/assets/wp/` holds 15 local full-size images. `scripts/wp-extract/images-manifest.json` maps each local file to its original WordPress URL (kept out of the page JSON so no JSON holds an http image URL).
- `scripts/wp-extract/`: `fetch.sh` (raw HTML into a folder), `extract.py` (HTML to JSON and images), `check.py` (verification).
  Re-run: `bash fetch.sh <dir>`, then `python3 -I extract.py <dir> <repo>`, then `python3 -I check.py <repo> [dir]`.

## JSON shape
Top level: `slug`, `url` (new-site path), `liveUrl`, `type` ("page"|"post"), `title` (Yoast), `metaDescription`, `h1`, `modifiedDate`, `schemaTypes`, `featuredImage`, `author`, `sections`, `faq`.
Posts also have `publishedDate`, `readingTime`; `author` is `{name, bio, image}`. Pages have `featuredImage: null` and `author: null`. Dates are Yoast ISO strings.

`sections` blocks:
- `{type:"h2"|"h3"|"h4", text}` (about uses one h4; the h1 is NOT in sections, it is the `h1` field)
- `{type:"p", text}`
- `{type:"ul"|"ol", items:[...]}`
- `{type:"quote", text}` (none occur on the live pages)
- `{type:"image", src, alt, title?, width?, height?, decorative?}`: `src` is a repo-relative path like `src/assets/wp/x.jpg`
- `{type:"cta", text, href, newTab?}`
- `{type:"embed", kind:"booking"|"quiz", src, title}`

## Inline link/format convention (one form everywhere)
All `text`, `items`, `bio` strings use simple inline markdown:
- `[label](href)` links, `**bold**`, `*italic*`
- a literal `\n` (newline char) is an in-paragraph `<br>`
No other HTML appears. Internal links are root-relative with trailing slash (`/is-grief-trauma/`), with the host dropped. `/trauma-coaching/` becomes `/trauma-recovery-coaching/` (anchors kept, e.g. `#trauma-quiz`; the page builder should make sure that id exists on the Lovable page or point it at `#book`/the quiz). `/life-coach-columbia-mo/` links would map to `/christian-life-coach-kansas-city-mo/` (none occur in these pages). WordPress `#more-123` anchors were removed. External links (e.g. the Amazon link on Tenacious Grace) are untouched.

## Per page
- **about**: h1 "About Me", 8 paragraphs, "Three fun facts about me:" (h4) and a 3-item list, 3 photos and the decorative flower icon.
- **free-trauma-test**: the live page's only content is the LeadConnector quiz iframe (kind "quiz"). It has no heading and no text, so `h1` is null. A page builder needs its own heading; Yoast title is "Free Trauma Test | Uncover Hidden Triggers From Past Trauma".
- **tenacious-grace**: complete (h1, one h2, image, 2 paragraphs, "Learn more" button to https://amzn.to/2UaJEaO, opens in new tab). It really is that short on the live site.
- **blog**: h1 "Blog". `sections` holds the live card text for the posts shown; `posts[]` is the structured list for all 7 posts (title, dates, listing excerpt, full WP excerpt, featured image), newest first. Do not render both.
- **7 posts**: full body, featured image, author box (name, bio, image), no FAQ sections (`faq` is `[]` on every page).

## Skipped on purpose
Header/footer/nav, copyright line, "Recent posts"/prev-next navigation, the Thrive author box wrapper (kept as `author`), Thrive pagination on /blog/ (it is `tcb-permanently-hidden` on the live site), scripts/styles, hidden elements.

## Odd things
- **Live /blog/ lists only 6 of 7 posts.** The oldest, `what-does-a-trauma-coach-do`, is cut off because pagination is permanently hidden. Its card data is still in `posts[]` (`onLiveListing: false`); the new blog should list all 7.
- **No booking iframes exist** on any of the pages extracted here. The only embed is the quiz.
- **Missing alt text on the live site** (empty `alt` kept as `""`, not invented): the author photo on every post (`jenna-barbosa-author.jpg`, also `angel-williams-author.jpg` on the-gift post), featured images of `the-gift-hidden-in-the-ask` and `what-causes-complex-trauma`, and the decorative flower icon (flagged `decorative: true`). The WordPress media library alt is empty for these too. Add real alt text in the build. Several present alts are just filenames ("jennarhae-Trauma-Coach", "facts-about-Jenna", "jenna").
- The author name on `what-does-a-trauma-coach-do` is "Jenna Barbosa" (Yoast), while the About page says she now goes by Jenna White. Left as published.
- The WordPress filename `Jenna-Barbossa-author.jpg` (typo) is saved locally as `jenna-barbosa-author.jpg`. `tenacious-grace.avif` is AVIF.
- `jenna-quotes.png` is a 150x150 icon in the-gift post, not a testimonial.
- Shortcodes: none leaked into the content. Thrive Architect dynamic data (dates, post titles) was resolved from the rendered HTML.
- /free-trauma-test/ and /tenacious-grace/ are small because they are small on the live site; both were checked against the rendered HTML and the Thrive editor tree.

## Testimonials
None found. Thrive Ovation's CSS/JS loads on the home page, `/trauma-coaching/`, `/about/` and `/life-coach-columbia-mo/`, but no testimonial markup is rendered on any of them (no testimonial/tvo elements, no blockquotes), and the testimonials REST route is absent or private. `src/data/wp/testimonials.json` records this with `testimonials: []`. Per the build brief, drop the testimonials section.

## Verification
`scripts/wp-extract/check.py` compares the live pages with the JSON: every p, li, heading and blockquote in the live main content must be present (markdown stripped), the blog listing excerpts and all 7 posts must be present, quiz embed present, every image path must exist and be a real image file, no thumbnail-sized image names, no http image URLs, no absolute jennarhae.com links, no old slugs. Result at commit time: 484 items checked, 0 failures. A negative test (deleting one list item) correctly fails.
