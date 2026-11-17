# Very Cool Weekly publishing

The public home is **https://ruckuslabs.co/verycoolweekly/**. Substack publishes new complete editions and sends their weekly email; this repository owns the branded website and mirrors the published index and compatibility feeds. Local issue files remain portable draft/backup source and preserve the eleven original website editions and URLs (issue-one through issue-eleven).

## Current publishing workflow: Substack first

Substack is the sole publishing source for new editions. Review in the Editors Desk, prepare the approved Substack draft, and publish or schedule it in Substack's native editor. That one publication handles the full web post and intended email/app delivery. Do not separately publish a new local website issue or send a provider-neutral email export.

The website retains its custom homepage, signup, sponsor and policy pages. The homepage and archive index are built from Substack's public RSS feed; title, date, summary, and image links come from published posts. Read links lead to Substack. All eleven original `/issue-one/` through `/issue-eleven/` website pages remain available with their historical content and dates. Existing local future editions and private review/delivery records are preserved, but they cannot become new public website articles in Substack mode.

## Refresh and preview

```sh
npm ci
npm run sync:substack
npm run build
npm run preview
npm test
npm run check
```

`sync:substack` retrieves the public publication feed, sanitizes its HTML, normalizes public post URLs and images, and excludes future publication dates. It merges older cached posts that have rolled beyond the current RSS window; posts removed inside the current window disappear from the index. It carries the previous deployed index forward from `assets/substack-index.json`, avoiding archive loss on fresh deployment runners. The snapshot at `content/substack/posts.json` contains only public content.

A normal build is offline and deterministic from its cached snapshot. A failed local refresh uses the existing snapshot. Deployment uses `sync:substack -- --strict`; a refresh failure stops the build and leaves the current live site untouched. No Substack credentials or unpublished feed endpoints are used.

The active **Very Cool Weekly website refresh** automation (`very-cool-weekly-website-refresh`) checks Substack’s public feed on Fridays at 10:20 a.m. America/Denver from the Mac. The pinned Pages deployment was verified on November 9, 2026 (source `8656759`, website `85a6582`; run `42673145608`). Substack blocks GitHub-hosted feed requests with HTTP 403; the public feed works from this Mac. Keep this Mac awake with Codex running for refreshes. GitHub still hosts and builds the website, using the validated public snapshot already committed to the newsletter repository. No paid service or new account connection is required.

The automation clones a clean isolated newsletter checkout, installs dependencies and runs `npm run publish:substack -- --publish`. That command retrieves only the public RSS feed, sanitizes and checks the index, excludes future posts, and compares it with the live website. An unchanged index does nothing. For a change it runs the tests/build/check, commits only `content/substack/posts.json`, pushes without force, and dispatches the existing Ruckus Pages workflow pinned to the exact newsletter commit. It reuses a matching pending deployment rather than dispatching duplicates. Failed refreshes or checks leave the live site unchanged. After dispatch, verify the matching GitHub run and live homepage/archive/feed; dispatch is not deployment success. The source CI validates source changes but does not send email.

Use a fresh checkout for each refresh. The command refuses a dirty checkout, preserving the author’s active desk, private exports and unrelated local work. Omit `--publish` to validate a preview without a commit, push or deployment. After an interrupted process, inspect for a running refresh before removing a stale `vcw-public-substack-refresh.lock` in the system temporary folder.

## Website delivery

Run `npm run export:ruckus` to rebuild, check, and refresh the sibling website export. Its manifest removes only files managed by the newsletter export. Preserve unrelated Ruckus work. The root workflow accepts an optional `newsletter_ref` for the validated source commit. It builds the cached public index and does not fetch Substack from GitHub. Source changes and workflow changes must pass their checks before enabling the recurring Mac refresh.

The public RSS and JSON Feed keep their existing URLs, contain the full sanitized Substack edition and available images, and retain historical website GUIDs for the original imported editions. New entries use Substack post IDs/URLs. The homepage, archive, feed mirrors, and JSON-LD archive list all share the same published Substack index. Local authoring files cannot leak into these surfaces.

The historical `archive-import.xml` remains available for recovery/migration, without re-importing anything into Substack. Do not repeat the original eleven-issue import or send retrospective emails. Full posts and reader engagement now live on Substack; maintain original website archive links and regular backups.

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

## Weekly release cadence

Use `npm run social:plan -- --issue issue-12` to preview a local X plan. See [X posting](X-POSTING.md), [the editorial workflow](EDITORIAL-WORKFLOW.md) and [approved weekly release](APPROVED-RELEASE.md) for the current review and scheduling process.

Research starts Sunday at 6 p.m. America/Denver. Normally five approved picks receive matching X posts and Substack Notes Monday–Friday at 9:30 a.m., followed by the Friday Substack article/email at 9:45 a.m. and X roundup at 10 a.m. Explicit dated overrides in `social.config.json` preserve the six-pick November 13 and November 20 editions. Missed slots require an approved revised schedule; never backfill them.

Completed author review is the release gate under the standing instruction. Local draft generation does not schedule or send anything: verify the existing Buffer/Substack accounts, approved versions, native schedules, audience and actual Substack destination. Substack sends the sole weekly email. The separate Friday 10:20 a.m. website task mirrors already published editions. Preserve review history and delivery receipts in private local storage; never commit them or copy them into a public build.

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
