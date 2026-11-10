# Client Site Integration

## Required Environment Variables

```env
FF_CRO_SITE_ID=
FF_CRO_SITE_TOKEN=
```

`FF_CRO_SITE_ID` is the `cro.sites.id` UUID from the dashboard site page. The short site key is a human label and the Edge Config item name. It is not the value the site, the tracker, or Edge Config compare.

Vercel automatically supplies:

```env
EDGE_CONFIG=
```

Optional (local/staging only):

```env
FF_CRO_INGEST_URL=
```

## Forbidden Variables

Never use experiment-specific environment variables:

```
FF_CRO_EXPERIMENT_ID=    ❌
FF_CRO_VARIANT=          ❌
FF_CRO_PAGE_PATH=        ❌
FF_CRO_ALLOCATION=       ❌
FF_CRO_GOAL=             ❌
FF_CRO_CONTROL_FALLBACK= ❌ (built-in default)
```

## Middleware

```typescript
import { handleCroRequest, readSiteEdgeConfig } from "@fluid-frame/cro-vercel";

export default async function middleware(request: Request) {
  const result = await handleCroRequest(request, {
    siteId: process.env.FF_CRO_SITE_ID!,
    getEdgeConfig: () => readSiteEdgeConfig(process.env.FF_CRO_EDGE_CONFIG_KEY!),
    isProduction: process.env.NODE_ENV === "production",
    previewSigningSecret: process.env.FF_CRO_PREVIEW_SIGNING_SECRET,
  });

  if (result.rewriteUrl) {
    // Framework-specific rewrite (see demo-site/middleware.ts)
  }
}
```

Do **not** add a second assignment package. `@fluid-frame/cro-vercel` already calls `@fluid-frame/website-runtime` for identity and `@fluid-frame/cro-core` `assignVariant` for sticky first-byte assignment. Experiment config comes from Edge Config after a human Start Test / Deploy — never from `FF_CRO_EXPERIMENT_ID` or a site-owned assignment runtime.

## Vite + prerender / Vercel Edge

Live Fluid Frame marketing sites (Window Dudes, SRA Roofing, and the same Vite + prerender template) are not Next.js App Router. Variant HTML must be chosen in Vercel Edge middleware **before** the first byte. Use `handleCroRequest` + `@vercel/functions` `rewrite()`, the same contract as `apps/demo-site/middleware.ts`.

Do not swap Control vs Variant in client JavaScript after paint. Do not `redirect()`. The browser URL stays the public path.

### 1. Implement Control and Variant at internal paths

Public URL stays the page path (often `/`). Emit two **internal** documents that are not canonical. `buildInternalVariantPath(experimentId, "a" | "b", publicPath)` from `@fluid-frame/cro-core` returns the same shape Edge Config `routes` use:

```
dist/__ff_cro/<experimentId>/a/index.html          →  /__ff_cro/<experimentId>/a
dist/__ff_cro/<experimentId>/b/index.html          →  /__ff_cro/<experimentId>/b
```

Nested public path (example `/offer`):

```
dist/__ff_cro/<experimentId>/a/offer/index.html    →  /__ff_cro/<experimentId>/a/offer
dist/__ff_cro/<experimentId>/b/offer/index.html    →  /__ff_cro/<experimentId>/b/offer
```

Bake the browser tracker into each file with that file's variant (`a` or `b`). Each placed variant document inherits the `robots` and `googlebot` meta tags of the route's own built document, and inherits none when that document has none. Internal `/__ff_cro/` responses stay out of the index with `X-Robots-Tag: noindex, nofollow` on an unsigned 404, a signed preview, and the preview cookie redirect. A response served at the public route does not get that header. See `apps/demo-site/vercel.json`.

Draft experiments are **not** published to Edge Config. Until a human Starts the test, `handleCroRequest` does not rewrite and the public path keeps serving Control.

### 2. Edge middleware — assign, then rewrite

```typescript
import { next, rewrite } from "@vercel/functions";
import { handleCroRequest, readSiteEdgeConfig } from "@fluid-frame/cro-vercel";

export const config = {
  matcher: ["/((?!api|assets|favicon|scripts).*)"],
};

export default async function middleware(request: Request) {
  const result = await handleCroRequest(request, {
    siteId: process.env.FF_CRO_SITE_ID!,
    getEdgeConfig: () => readSiteEdgeConfig(process.env.FF_CRO_EDGE_CONFIG_KEY!),
    isProduction: process.env.VERCEL_ENV === "production",
    previewSigningSecret: process.env.FF_CRO_PREVIEW_SIGNING_SECRET,
  });

  const response = result.rewriteUrl ? rewrite(result.rewriteUrl.toString()) : next();
  for (const [key, value] of result.response.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    response.headers.set(key, value);
  }
  return response;
}
```

`handleCroRequest` already:

- Assigns a deterministic variant from `ff_vid` + experiment salt (sticky, no `ff_cro_assignment` cookie)
- Rewrites to `/__ff_cro/{experimentId}/{a|b}{publicPath}` so Control and Variant B cannot share a CDN cache entry
- Sets `Cache-Control: private, no-store` (do not use `Vary: Cookie` as the primary isolation strategy)
- Leaves the public URL unchanged
- Falls back to Control when config, routes, or matching fail
- Does **not** record `experiment_exposure` or conversions; the browser tracker owns those after render

Copy Set-Cookie from `result.response` the same way `apps/demo-site/middleware.ts` does so visitor/session cookies stick.

### 3. Preview vs production

- Implement and QA on the clone / Vercel Preview. Operator `create` / `configure` stay `draft` and do not write production Edge Config.
- Production keeps serving Control until a human `validate` then `activate` (or dashboard Start test).
- Draft visual QA uses the internal variant path plus a signed `?ff_cro_preview=` query token. `handleInternalRouteProtection` accepts that token, sets the preview cookie, and 302s to the clean internal path. It does **not** make Draft experiments rewrite the public URL.

## Event Proxy

```typescript
import { createEventProxyHandler } from "@fluid-frame/cro-vercel";

export const POST = createEventProxyHandler({
  siteToken: process.env.FF_CRO_SITE_TOKEN!,
});
```

The handler forwards the visitor `User-Agent` to ingest as `x-ff-cro-client-user-agent`, capped at 1024 characters.

Luecke's `/api/ff-cro/events` proxy filters metadata through `FORWARDED_METADATA` before it calls this handler. The list is `formId`, `clientSubmissionId`, `leadId`, `placement`, `schedulerSessionId`, `sid`, and `automation`. `automation` is the boolean `true` the tracker sends when `navigator.webdriver` is true, the User-Agent contains `HeadlessChrome`, or `navigator.languages` is empty. `sid` is sent only when it differs from `schedulerSessionId`. The site filter has to forward the boolean so ingest can set `is_bot`. Re-vendoring Luecke is a separate change; this list is the contract that filter should match.

## Sitewide surfaces

One running experiment may set `sitewide: true`. Its `route` is still the only
page with placed A/B documents. Every other canonical HTML page receives the
assignment cookie `ff_cro_sw`.

- Value: `<experiment id>:<a|b>`. The id matches `data-ff-cro-experiment-id` on
  the variant documents (the manifest id, not the experiment UUID).
- Attributes: `Path=/; SameSite=Lax; Secure` (Secure is omitted only where the
  identity cookies already omit it). `Max-Age` is the session inactivity window
  (30 minutes). The cookie is not HttpOnly.
- The middleware sets it on the experiment route and on every other canonical
  public HTML GET or HEAD. It does not set it for bots, ignored requests,
  non-canonical paths, `/__ff_cro`, `/api/`, or assets. It does not set it when
  the experiment is not running, or when Edge Config is missing or belongs to
  another site.
- A request that still carries `ff_cro_sw` after the experiment is paused, or
  when no single running sitewide experiment matches, clears the cookie with
  `Max-Age=0`. The next view is Control.
- Off the route, a visitor who sees the sitewide surface is counted in exposures
  and visitor denominators the same way the route counts its assignment.
- Preview review links (`?ff_preview=<id>:<a|b>`) force a sitewide variant on
  every page of a host with `allowUnsignedPreview`. A non-sitewide preview stays
  on its one path. A review lasts 7 days, or until `?ff_preview=off`.
  Production ignores `ff_preview`.

The static placer injects the tracker on every HTML document when a sitewide
manifest exists:

```html
<script
  src="/scripts/ff-cro.js"
  defer
  data-ff-cro-sitewide="luecke-scheduler-cta"
  data-ff-cro-public-path="/about/"
  data-ff-cro-data-layer="lead_submitted,referral_submitted"
  data-ff-cro-proxy-path="/api/ff-cro/events"
></script>
```

On a page without its own variant key, the tracker reads `ff_cro_sw`. It sends
clicks and dataLayer goals only when the cookie names that experiment. With no
cookie, or a cookie for another experiment, it sends nothing. With no sitewide
manifest, placer output is unchanged.

### Luecke example

The first Luecke test changes the scheduler button wording. The homepage hero
button stays on the homepage and comes from the placed B document. The header
quote button, the mobile menu button, and the mobile sticky bar are the same
test on every page.

Control text in the HTML: "Get a Roof Estimate". Variant B text: "Book Your
Roofing Appointment". Manifest id: `luecke-scheduler-cta`.

Put this inline script immediately after those three controls. Do not defer it.
It runs before first paint and does not touch the homepage hero:

```html
<a id="header-quote" href="#schedule">Get a Roof Estimate</a>
<a id="mobile-menu-quote" href="#schedule">Get a Roof Estimate</a>
<a id="sticky-quote" href="#schedule">Get a Roof Estimate</a>
<script>
  (function () {
    var match = document.cookie.match(/(?:^|; )ff_cro_sw=([^;]*)/);
    if (!match) return;
    var value;
    try {
      value = decodeURIComponent(match[1]);
    } catch (error) {
      return;
    }
    if (value !== "luecke-scheduler-cta:b") return;
    var label = "Book Your Roofing Appointment";
    ["header-quote", "mobile-menu-quote", "sticky-quote"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.textContent = label;
    });
  })();
</script>
```

A booking from any page counts. The tracker attributes `scheduler_cta_click`,
`scheduler_opened`, `appointment_booked`, and `lead_submitted` to
`luecke-scheduler-cta` and the variant in `ff_cro_sw`.

## Browser Tracker

```html
<script
  src="https://cro.fluidframemarketing.com/scripts/ff-cro.js"
  data-ff-cro-site-id="YOUR_SITE_UUID"
  data-ff-cro-public-path="/current/path"
  data-ff-cro-experiment-id="..."
  data-ff-cro-variant-key="a"
></script>
```

Or via npm:

```typescript
import { initTracker } from "@fluid-frame/cro-tracker";

initTracker({
  context: { siteId, publicPath, experimentId, variantKey, isPreview: false },
});
```

## Conversion Tracking

```javascript
window.ffCRO.track("lead_submitted", { formId: "hero-contact-form" });
```

## Production Ingestion URL

Built into the adapter: `https://cro.fluidframemarketing.com/api/events/ingest`
