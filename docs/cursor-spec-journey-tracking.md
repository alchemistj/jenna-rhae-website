# Cursor spec: journey tracking (Astro Rule 14.1)

Josh approved this on Nov 9, 2026. The rule is in `alchemistj/ff-architect` `docs/sop/astro-full-build-rules.md` Rule 14.1, and launch is not done without it.

**Reference code (copy the pattern, adapt it to this site):** SRA's working implementation is in `docs/reference/sra-journey/`. The files are renamed `*.ts.txt`, so they aren't compiled; read them as source. The FF Split Testing identity-cookie contract is `docs/reference/ff-split-testing-client-site-integration.md`. Don't import from `docs/reference`. Write this site's own files, and delete nothing in `docs/reference`.

## Build
1. **`middleware.ts`** at the repo root, a Vercel edge middleware. It must be `.ts`: a `.js` middleware that imports `.ts` fails Vercel's build.
   - Runs on HTML page requests only, never on `/_astro/*`, images, fonts, `/api/*`, `sitemap.xml`, `robots.txt` or `llms.txt`.
   - Sets the identity cookies `ff_vid` (anonymous visitor ID, 180 days) and `ff_sid` (session ID, 30 minutes, renewed on every page load), exactly as SRA and the split-testing contract do.
   - Never sets them for bots. For a recognized bot it sets the 2-minute `ff_bot=1` marker cookie instead, like SRA.
   - Entry tags: keep SRA's mechanism (a vanity path sets `ff_entry` for 30 minutes and 308s to the real page, keeping the query string), but with an **empty list** of entries for now. Adding one later should be a one-line config change.
   - Pages must stay cacheable on Vercel, the same as SRA. Don't add `cache-control: no-store` to pages.
2. **`api/site-events.ts`** plus the forwarder (from SRA `server/lib/forwardMeasurementCollect.ts`): the same-origin endpoint that forwards to FF Reports `https://ff-reports-analytics.vercel.app/api/measurement/collect`.
   - Pass the visitor's browser user agent in the `x-ff-client-user-agent` header.
   - Preview deployments behave like SRA's (`VERCEL_ENV` check).
   - The browser never calls FF Reports directly.
3. **Browser module** (from SRA `src/lib/measurement/*`): `siteKey` is `jenna-rhae-website`. Load it after the page has loaded and send with `sendBeacon` or a keepalive fetch. It must not delay first paint or change the inlined hero (Rule 8 and Rule 16).
4. **Events.** Each carries `ff_vid`, `ff_sid`, the page path, `entry` (if set), the session's first channel, and `automation` where it applies. No PII ever: no names, emails or form text.
   - `page_view` on every page, with the `engaged` follow-up exactly as SRA does it: the same `eventId`, sent once after the first scroll, tap, key press or 10 seconds visible.
   - `contact_click` on every link to `/contact/` **and every Book button** (they are Jenna's main call to action). Add `ctaLocation`: `header`, `mobile_menu`, `hero`, `cta_band`, `main`, `footer` or `sticky_bar`. Set it with a `data-cta-location` attribute on each link or button in the components, not by guessing from the DOM.
   - `scheduler_opened` once per page view, when the SpringboardCRM booking embed (`#book`) is at least 50% visible in the viewport for the first time after its iframe loaded.
   - `lead_form_success` after Central Forms accepts the lead (the same success condition the form already uses).
   - No `click_to_call` or `text_click`: the site has no phone or text links.
5. **Form:** the Central Forms submission (`src/lib/leadSubmit.ts`) adds the attribution envelope with the same `ff_vid` and `ff_sid`, like SRA `src/lib/leads/formsAttribution.ts`. Don't change anything else about the form.
6. **Channel:** keep the session's first channel in sessionStorage, as SRA does. `jennarhae.com`, `www.jennarhae.com` and the preview hosts never count as a referral. Session IDs must not go in sessionStorage.

## Tests (vitest, alongside the existing ones)
- Middleware:
  - sets `ff_vid` and `ff_sid` on HTML page requests only
  - sets nothing on assets or `/api/*`
  - sets only `ff_bot=1` for bots
  - entry-tag logic with a test entry injected
- Each event is sent once with `ff_vid`, `ff_sid` and the path, and carries no PII. `engaged` reuses the page view's `eventId`.
- `contact_click` carries the right `ctaLocation` for each location on the built pages: every Book button and every contact link has a `data-cta-location`.
- The forwarder passes `x-ff-client-user-agent` and posts to the FF Reports collect URL.
- The form submission carries the same session ID.
- Existing tests keep passing. The "no `<iframe>` in server HTML" and hero-size tests must still pass.

## Don't
- Don't change copy, layout, the hero or the GA4 loader.
- Don't change the Central Forms keys or the success logic, other than adding the envelope.
- Don't add any third-party script.
