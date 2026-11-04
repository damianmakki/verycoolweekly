# Very Cool Weekly publishing

The website is owned by this repository; email delivery is a separate service. The public home is **https://ruckuslabs.co/verycoolweekly/**. Each issue file is the single source for its web page, HTML email, text email, archive entry, and feed entry. Original issue URLs (issue-one through issue-eleven) are preserved under the new base path.

## Local setup

Use Node 22 or newer. Run `npm ci`, `npm run build`, and `npm run preview`. Open the printed local address. The output is `dist/`; HTML and text email exports are in `exports/emails/`, outside the public site. Generated output is ignored in this repository. Optimized images and their manifest are checked in, so builds and CI need no remote image downloads.

The old Gulp/Sass setup has been replaced with a Node static generator. Edit shared layout in `scripts/build.mjs`, styles in `assets/site.css`, and publication settings in `site.config.json`.

## Create a weekly edition

1. Run `npm run new:issue -- --date 2026-11-06 --title "Issue 12: A new chapter"`. This creates a draft in `content/issues/` and never overwrites an existing file.
2. Replace every TODO and example URL. Write a specific description, personal introduction, and 5–7 useful editorial picks. Use source URLs from the original publisher. Use plain text for titles, HTML only for `introHtml` and `bodyHtml`. Supported formatting is paragraphs, emphasis, lists, code, and HTTP(S) links; other markup is stripped.
3. Add a hero and optional item images. Local `image.src` paths are relative to the project root, without a leading slash. Supply accurate alt text; a title is an acceptable fallback for an archive preview, but describe new images properly. For remote artwork, confirm you can republish it and credit the creator.
4. Run `npm run optimize` when adding or replacing images. It downloads remote images once and stores responsive WebP previews under `assets/optimized/`. Large animations use a static preview with an on-demand original. If replacing an existing image, use a new filename/URL or remove its manifest entry to invalidate the cache.
5. Run `npm run build -- --drafts`, then `npm run preview`. This preview includes drafts and future editions and adds noindex metadata to every page. Never export a draft preview to production.
6. Run `npm test`. Review every source and commercial destination. Check desktop, phone, text-only email, spelling, image credits, and disclosures. Do not claim you tested a product unless you did.
7. Mark the issue `published` for immediate eligibility, or `scheduled` with a future date. Both are excluded until their date (UTC); an optional `publishAt` timestamp also gates the exact website release instant. Use `web:stage` below for reviewed timed releases. Email delivery has its own native Substack schedule. `draft` is always excluded. Non-archive placeholder copy blocks publication.
8. Run `npm run build && npm run check`. Production builds clear stale email exports and draft previews. Run `npm run export:ruckus` to copy this build into the sibling Ruckus Labs checkout. The export removes stale files only when they were recorded in this project's previous export manifest. It does not touch other Ruckus pages.
9. Publish the Ruckus Labs repository through its normal process. Confirm the web page and image URLs work publicly before scheduling the email. Prepare the generated Substack edition in verycoolweekly.substack.com, verify its subscription/footer settings, send a test, and schedule the reviewed weekly email. Do not also send the provider-neutral email export.

`npm run export:ruckus` always rebuilds production and runs checks first. The source repository's Friday CI workflow builds artifacts only. Website deployment is handled by `RuckusLabs/ruckuslabs.co` through `.github/workflows/deploy-pages.yml`: it checks out the newsletter source from `damianmakki/verycoolweekly` on `master`, runs its tests/build/checks, builds the existing Ruckus site with Jekyll, overlays only newsletter `dist/` at `/verycoolweekly/`, and deploys through GitHub Pages. Private reviews, local exports and source scripts are excluded from the website artifact. Pushes to Ruckus `main`, manual runs and Friday 9 a.m. America/Denver builds use the same process. GitHub schedules may run late; no exact-time delivery is guaranteed. Website deployment never sends email or schedules social posts.

### Stage an approved website release

The production workflow was enabled and its first deployment verified on November 4, 2026: [successful deployment](https://github.com/RuckusLabs/ruckuslabs.co/actions/runs/41881053290). Home, signup, archive and feeds were checked publicly; Issue 12 remains absent until November 13 at 9 a.m. Mountain. Friday Substack email scheduling is still held by the user. Jekyll's container creates root-owned files, so the overlay step restores runner ownership of the generated `_site` artifact before replacing its newsletter folder.

After preparing the approved hopper, run:

```sh
npm run web:stage -- --batch 2026-11-13 --at 2026-11-13T09:00:00-07:00
```

This verifies current review/configuration fingerprints, backs up any existing issue privately under `exports/backups/`, and writes the approved issue into `content/issues/` with `status: scheduled` and an explicit `publishAt` instant. It preserves delivery ledgers and remote queues. The default build excludes the issue, its archive entry and its feed/sitemap entries until both its publication date and release time are due. `--drafts` is a local noindex preview only. Legacy archive issues without `publishAt` retain their original date-based behavior.

Commit only the approved publication source and required code/assets to the newsletter repository, keeping `content/review/` and `exports/` private. The hosted Friday build reads that committed source, not the local desk. Validate proposed changes before updating the release source. Changes to Ruckus source should use its normal deployment process; preserve unrelated local edits. Inspect the deployment result and public URLs before marking the website delivered. The Friday email remains a draft until the user releases its explicit hold.

## Visual direction

Current artwork direction, November 3, 2026: use the article’s existing hero image with a credit, or leave it blank. Do not generate replacement illustrations. Keep clean editorial crops for thumbnails and use existing source artwork for any weekly collage cover. Preserve previously selected artwork and edits. Use motion only when it explains the featured work; provide a static thumbnail for email. Record source, creator/photographer credit, and permission or license separately for every asset. This direction does not itself establish permission to reuse source images.

## Sponsorships, products, and affiliates

Copy the relevant objects from `content/templates/commercial-slots.json` into an issue. Leave `sponsor` null and `products` empty when there are no placements. Empty inventory produces no public placeholder ads. Never put test sponsors into a published edition.

- **One lead sponsor:** `sponsor` is a single object with name, title, URL, description or bodyHtml, optional image, and CTA. It appears after the introduction in web and email. The template labels it Paid sponsorship and names the sponsor.
- **Up to two products:** `kind: affiliate` requires a nearby explanation that you earn a commission. `kind: product` requires `relationship`, such as Our product or Independent pick. An independent unpaid pick can remain an editorial item instead.
- **Tracking:** original affiliate parameters are preserved. `track` defaults off. Set it true only when that partner permits appended UTM parameters. Web and email links then get distinct mediums, per-issue campaigns, and placement identifiers. The provider/partner analytics supply the results; this site does not collect click analytics itself.
- **No retroactive monetization:** archive recommendations are left as editorial links.
- **Editorial control:** paid content must still fit the audience. Keep a sponsor ledger of advertiser, issue, rate, booked/approved/paid status, copy deadline, destination, and reporting deadline. Agree on placement, dates, approval, cancellation, and reporting before a booking. Do not promise audience figures that have not been measured.

Start with a single sponsor and at most one affiliate or own product per issue. Sell direct fixed-fee placements after the first several new editions establish delivered audience and click baselines. Use clicks, conversions, and revenue per issue to evaluate fit; interpret open rates cautiously. Keep the majority of the issue useful editorial material.

## X posts before the weekly roundup

Use `npm run social:plan -- --issue issue-12` to generate local X drafts. See [the X posting plan](X-POSTING.md) for the Tuesday–Thursday article drip and Friday roundup. For this cadence, review the Monday-afternoon shortlist before Tuesday posting; the website/email-only cadence below allows later selection. Buffer Free is connected to @verycoolweekly. The planner creates drafts; approved posts still need scheduling in Buffer.

## A sustainable weekly cadence

- Monday–Tuesday: collect 10–15 candidates with original source, notes, date, category, and why it matters. Save a short list; skip recycled announcements and unsupported claims.
- Wednesday: select 5–7, write concise original commentary, verify links, and check image permissions. Draft the issue from the template.
- Thursday: finalize sponsor copy, verify affiliate terms and destinations, run the build/checks, review both editions, and send a test email.
- Friday: publish the website, verify it publicly, then release the email at the chosen local time. After 48–72 hours, record delivery, clicks, unsubscribes, sponsor performance, and product conversions.

As the publication grows, add a separate candidate inbox and sponsor ledger first. The JSON issue files stay the approved publication record. A browser editor or CMS can later write this same schema without changing rendering. Automated research may create drafts; a person should still verify sources and commercial claims before changing status.

## Launch checklist

- Substack is selected. Confirm the current active subscriber count, and retrieve only permissioned subscriber exports from the old account. Respect unsubscribes and suppression lists.
- Verify the sender domain with the records supplied by the provider and configure its sending identity, reply-to, physical mailing address, confirmation, and unsubscribe behavior. Test delivery to representative mailboxes.
- The live signup links to the verified Very Cool Weekly Substack subscribe page. Do not put API keys in `site.config.json`, browser code, or this repository. Enable signup only after confirmation and unsubscribe have been tested.
- If using provider-generated ad insertion, choose it or this repository's sponsor block for that slot; do not insert the same sponsorship twice.
- Add the nested sitemap URL to the domain's root robots.txt and Search Console. A robots.txt file inside a subfolder is informational; crawlers use the root file. If the old GitHub Pages site remains online, use a host-supported redirect or update its canonical links to the new URL.
- Check that the Ruckus hosting pipeline publishes the new subfolder. This project deliberately does not overwrite its root sitemap or existing pages.
- Replace provider-neutral email markers `{{ unsubscribe_url }}` and `{{ mailing_address }}` with the selected provider's actual fields. The generic exports are reviewable source templates, not ready-to-send campaigns.

## Verification and known archive limits

`npm test` checks publication timing, draft exclusion, safe rich text, affiliate parameter handling, commercial disclosures in both formats, and preservation of all 74 archive picks. `npm run check` checks the generated site for local links, image optimization, language, headings, unique SEO metadata, structured data, and feed visibility.

Seven original Mailchimp images returned HTTP 403 on November 3, 2026. Their URLs and descriptions are retained in `content/archive-image-unavailable.json`; the picks remain readable without broken images. All available article previews are served locally. External article destinations are historical and have not all been verified. The original animations remain available separately and are not downloaded by default.
