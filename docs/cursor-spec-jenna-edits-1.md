# Cursor spec: Jenna's first round of copy edits

Jenna edited the copy Google Doc (https://docs.google.com/document/d/1X-jHtQm9jEa1gpJJYxikf_HHbt_Ef6iD1S8IrxCx_lg/edit). Josh approved these changes on Nov 9, 2026. Make exactly these changes and nothing else. Place all new or changed wording word for word.

## 1. Her name is Jenna White (no longer Jenna Barbosa)
- In every blog post JSON in `src/data/wp/`, change the author `name` "Jenna Barbosa" to "Jenna White". In each author `bio`, change "Jenna Barbosa, MA," to "Jenna White, MA,".
- `src/lib/wpAlt.ts`:
  - The author photo alt becomes "Portrait of Jenna White smiling, with long dark hair, glasses, and a floral top".
  - The Tenacious Grace cover alt becomes "Cover of the book Tenacious Grace, red with a plate, heart, fork, and spoon". Drop the author name, because the printed cover shows her old name.
- Rename the image key and file `jenna-barbosa-author` to `jenna-white-author` (in `src/assets/wp/`, `src/lib/images.ts`, `src/data/pages/wordpress.ts`, `wpAlt.ts` and the JSONs) so the old name isn't left in image URLs.
- **Exception, keep it as is:** in `src/data/wp/about.json`, the sentence "Many people have previously known me professionally as Jenna Barbosa, ..." keeps "Jenna Barbosa". It explains her old name.
- After this, the only "Barbosa" anywhere in `dist/` must be that About sentence. Add a test for it.

## 2. Only Jenna on the team
- `src/data/pages/home.ts`, "Meet Your Coaches": remove the Alisha Glasgow and Angel Williams entries. Keep the heading, the "Our Team" label and Jenna's entry.
- Remove the now-unused images `coach-alisha` and `coach-angel` (the asset files and the entries in `images.ts`).

## 3. Delete Angel Williams' blog post
- Remove `/the-gift-hidden-in-the-ask/`:
  - its entry in the route registry
  - `src/data/wp/the-gift-hidden-in-the-ask.json`
  - its import and use in `src/data/pages/wordpress.ts`
  - its card in `src/data/wp/blog.json` (both the `posts[]` entry and any `sections` text that names it)
  - its images: `the-gift-hidden-in-the-ask.jpg` and `angel-williams-author.jpg` (asset files, `images.ts` and `wpAlt.ts` entries)
  - the expectation in `tests/routes.test.ts`
- Add a 301 redirect `/the-gift-hidden-in-the-ask` → `/blog/`, in both slash forms. Put it in `src/lib/redirects.ts` and `vercel.json`, and update the redirect test count.
- The blog page must now list 6 posts. Update any test that counts 7.

## 4. Email is hello@jennarhae.com
- `src/lib/site.ts` `EMAIL` and `src/data/pages/contact.ts` change from `info@jennarhae.com` to `hello@jennarhae.com`. That covers every displayed address, every `mailto:` link, the form's fallback line and the JSON-LD `email`.
- Update `tests/dist.test.ts` and the comment in `contact.ts`. No `info@jennarhae.com` may remain in `dist/`.

## 5. About page fun fact
- `src/data/wp/about.json`: "motorcycles" becomes "pottery". The item now reads: "I love travel, deep conversations, pottery, and creating spaces where people feel safe to be fully seen and known."

## 6. New home page service card
- In `src/data/pages/home.ts`, in the "What Does Christian Life Coaching with Jenna White Include?" service cards, add a card directly **after** "Trauma Recovery Coaching" and before "Christian Life Coaching in Kansas City, MO":
  - Title: "From Survival to Stability Group Coaching Cohort"
  - Body: "Twelve week group coaching online and in-person in Kansas City for women ready to understand their nervous systems and find new ways of healing and hope."
- The sales page URL isn't known yet. Leave the card **unlinked**, styled like the other unlinked cards, with no "Learn More" and no placeholder link. Put `href` in the data as an optional field, so adding the link later is a one-line change.

## Don't change
- Anything else in the copy, the layout, the contact form logic, analytics, fonts or other redirects.
