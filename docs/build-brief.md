# JennaRhae Astro site: build brief

Approved by Josh, 2 Nov 2026. Replaces the WordPress site at https://jennarhae.com.

## Sources
- **Rules:** `/home/user/ff-architect/docs/sop/astro-full-build-rules.md` and `/home/user/ff-architect/docs/sop/astro-first-frame-and-pagespeed.md`. Follow them except where this brief says otherwise.
- **Contact form:** `/home/user/ff-architect/docs/sop/central-forms-contact-form.md`.
- **New pages, design and copy:** the Lovable mockup at `/home/user/jenna-rhae-web-spark` (React/TanStack; preview https://jenna-rhae-web-spark.lovable.app). **Its copy is final.** Place it word for word.
- **Old pages:** the live WordPress site https://jennarhae.com. Its copy has been QA'd by people, and Jenna wrote the blog posts. Rebuild them word for word in the new design.

## Business facts
- JennaRhae, faith-integrated Christian life coaching, Jenna White, MA. She moved from Columbia, MO to Kansas City, MO.
- **No phone number and no street address anywhere.** Email: info@jennarhae.com.
- Primary CTA: "Book a Free Consultation Call" (SpringboardCRM booking widget `https://link.springboardcrm.com/widget/booking/5JgMZbYOgzpSpNXbNZCA`).
- Colors: Deep Charcoal #1C1C1C, Warm Off-White #FAF7F4, Warm Gold #C8A882, Accent Red #A51C30. The gold fails AA as small text on off-white, so use it only on dark backgrounds or for decoration.
- Analytics: GA4 `G-VSL24X5BJM` only (no ads, no GTM). Load it per Rule 16: on window load + 3 s or first interaction, whichever is first.

## Exceptions Josh approved to the Astro rules
- **No phone at all:** no tel: links, no call buttons, no NAP phone, no `telephone` in JSON-LD. The mobile bottom bar has the Book button only. The trust bar has no call line. The "phone number test" becomes: no phone numbers appear in `dist`.
- **Flat URLs, no cities:** no `cityConfig`, no city switcher, no top bar. Header: logo, nav links (Home | Trauma Coaching | Kansas City Coaching | Contact, plus About and Blog), and the Book button. Mobile: logo, hamburger and Book.
- **Booking calendar sits on the page** (like WordPress does): deferred-load the SpringboardCRM booking iframe per Rule 10 (first interaction or entering the viewport, height reserved, noscript link). It goes on Home, Trauma Recovery Coaching, Kansas City, Contact and Free Trauma Test, placed where WordPress or the mockup puts it. Every Book button on a page that has the embed jumps to `#book`.
- Canonical host: `https://jennarhae.com` (apex). `www` → apex.

## Pages (all with trailing slashes)
From Lovable: `/`, `/trauma-recovery-coaching/`, `/christian-life-coach-kansas-city-mo/`, `/contact/`, `/privacy/`, `/terms/`, `/text-messaging-terms/`.
Rebuilt from WordPress at their **same URLs**: `/about/`, `/free-trauma-test/` (LeadConnector quiz `https://api.leadconnectorhq.com/widget/quiz/yXQ8xBBTLGV4uQCjRI0i`, deferred like the booking embed), `/tenacious-grace/`, `/blog/`, and the 7 posts `/what-does-a-trauma-coach-do/`, `/what-causes-complex-trauma/`, `/the-gift-hidden-in-the-ask/`, `/is-grief-trauma/`, `/what-to-do-after-trauma/`, `/trauma-nightmares/`, `/how-to-trust-after-trauma/`.

## Redirects (`vercel.json`, both slash forms, 301)
- `/trauma-coaching` → `/trauma-recovery-coaching/`
- `/life-coach-columbia-mo` → `/christian-life-coach-kansas-city-mo/`
- WordPress leftovers: `/feed`, `/comments/feed` → `/blog/`. Anything else stays a 404.

## Contact form
Use Central Forms per the SOP (§4e submit function). siteKey `jenna-rhae-website`, formKey `main-contact`, production host gate `["jennarhae.com"]`. Keep the mockup's fields. "How did you hear about us" goes in `customFields` with a human label. Add a honeypot and an unchecked SMS consent box linking to the three legal pages. Jenna has no phone, so failure and no-JS messages say "email info@jennarhae.com or book a call" with a mailto link. No conversion event (no ads), but fire a GA4 `generate_lead` event once on a real success. Jenna isn't registered in Central Forms yet. That is a separate job, so the form only has to be built and unit-tested here.

## Images
All local, in `src/assets`, optimized by Astro. Never hotlink `jennarhae.com/wp-content` or Lovable/R2 URLs.

## Testimonials
The mockup's placeholder testimonial cards ("pending client approval") don't ship. Drop that section unless WordPress has real reviews from Jenna's clients (Thrive Ovation): if it does, use those word for word and note them in the PR.
