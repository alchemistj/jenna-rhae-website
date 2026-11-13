# Cursor spec: make the booking calendar look clean

Josh, Nov 11, 2026: the "Book a Free Consultation Call" calendar looks cluttered. On the preview today:
- **Double frame.** Our `.deferred-embed` box draws a grey border and a cream background around the SpringboardCRM widget, which already has its own white bordered card.
- **Inner scroll bar.** The iframe is a fixed height (`height={820}`, `mobileHeight={900}` in `src/components/BookingEmbed.astro`) that's shorter than the widget, so the widget scrolls inside the page.
- **Cut off.** The time-slot column is clipped at the bottom.

## How the old WordPress site does it
`https://jennarhae.com/contact/` loads SpringboardCRM's `https://link.springboardcrm.com/js/form_embed.js`. That script includes an iframe resizer for `/booking/` iframes and sets the iframe's height to the widget's content. Measured Nov 11: 859px tall at a 390px viewport and 787px at 1440px (998px wide there), with no inner scroll. The iframe there has `id="5JgMZbYOgzpSpNXbNZCA_1738869228115"` (the booking widget ID, an underscore, then a number) and `style="width:100%;border:none;overflow:hidden;"`.

## Task
1. **Remove our frame.** No border and no background on the booking embed container, so the only frame is the widget's own card. This applies to the booking embed only. The LeadConnector quiz on `/free-trauma-test/` uses the same `DeferredIframe`, so either add a prop or check it still looks right.
2. **Auto-height.** When the booking iframe is inserted (the existing deferred trigger: first interaction or entering the viewport, never on page load), also load `form_embed.js` once, so the resizer sizes the iframe to its content.
   - Give the iframe an `id` in the widget-ID-plus-number form, `scrolling="no"`, and `style="width:100%;border:none;overflow:hidden;"`.
   - Stop positioning the iframe `absolute`. Its height must come from the resizer.
   - Server HTML must still contain no `<iframe>` and no third-party `src`. The existing test must keep passing.
3. **No layout shift.** Keep reserving space before the iframe loads, but set the reserved height to the widget's real resized height at each breakpoint. Measure it on this branch's Vercel preview with Playwright at 390px and 1440px, in our real container width. After the resize, the reserved box should match the final height within about 40px, so nothing below jumps.
4. **Check the result in a browser** on this branch's preview at 390px and 1440px:
   - no inner scroll bar on the calendar
   - all time slots visible
   - a single frame
   - the `scheduler_opened` event still fires once when the calendar is half visible
   - Book buttons still jump to `#book`
   
   Report the measured heights before and after the resize at both widths.

## Tests
- Update the embed tests: no `<iframe>` in server HTML, the resizer script is not in server HTML, and it loads only alongside the deferred iframe.
- All existing tests pass.

## Don't
- Don't change copy, the widget URL, the quiz behavior, GA4 or journey tracking.
- Don't load `form_embed.js` on page load.
