# Email provider assessment

Assessed November 3, 2026 against official provider documentation. The existing Mailchimp integration is retired. No new account, paid plan, subscriber import, or live campaign has been created.

## Recommendation: Buttondown

Buttondown is the best match for a custom website at ruckuslabs.co/verycoolweekly and a source-controlled weekly workflow. Its email API accepts HTML, supports draft creation, and has a canonical_url field so the Ruckus page can remain the original source. Direct sponsorship tools can be added later. The website and email copy remain portable.

- First 100 subscribers are free according to the current pricing page; total cost above that depends on the active list size. The live pricing page currently lists sponsorships as a $29/month add-on and automations separately. Our own sponsor blocks do not require provider-managed ad insertion. Confirm current pricing at signup; the sponsorship docs and pricing page describe plans differently.
- Its sponsorship system supports direct ad slots, sponsor content review, and scheduled insertion, rather than providing a reason to assume guaranteed advertiser demand.
- Best first integration: generate/import a draft, use the Ruckus canonical URL, keep hosted duplicate archives disabled if appropriate, verify a test delivery, and schedule the reviewed edition in Buttondown. Add an API draft adapter once the account exists and credentials are available securely. Never automatically resend historical issues.

Sources: [pricing](https://buttondown.com/pricing), [creating an email](https://docs.buttondown.com/api-emails-create), [sponsorships](https://docs.buttondown.com/sponsorships), [API overview](https://marketing.buttondown.email/features/api).

## Alternative: beehiiv

Choose beehiiv if built-in publication growth and ad monetization become the main operating priority. Its current pricing page lists free email sends/templates/API and integrations, while paid Lite adds ad monetization and automations; Pro adds further analytics and dynamic content. It bundles its own publication website, which overlaps with the Ruckus archive.

The current page shows Lite at $49/month on yearly billing at the displayed 1,000-subscriber setting and Pro at $95/month on yearly billing. These are the displayed plan/volume combination, not a quote for your list. Confirm the ability to create and schedule the required HTML campaigns through the selected plan before paying; API access alone does not establish send/post creation access. Use its hosted editor if that is a better fit than importing the custom template.

Sources: [pricing](https://www.beehiiv.com/pricing), [direct sponsorships](https://www.beehiiv.com/support/article/31674987552535-faqs-about-direct-sponsorships).

## Alternative: Kit

Choose Kit if the publication becomes a product business with segmentation, launch sequences, and digital products. Its pricing page currently lists a free plan up to 10,000 subscribers, and Creator at $33/month billed yearly for the displayed 1,000-subscriber setting. Creator includes visual automations and sequences. Kit also documents newsletter sponsorships, with advertiser matching/offers subject to suitability rather than guaranteed revenue.

Sources: [pricing](https://kit.com/pricing), [newsletter sponsorships](https://help.kit.com/en/articles/8532157-monetizing-your-emails-with-kit-newsletter-sponsorships).

## Substack expansion option

For a reader-discovery pilot, Substack is worth evaluating before committing to an email provider. It combines a native reading surface, email, and Notes, with editor-based scheduling. Keep the Ruckus website as the custom archive and use one email service during the pilot. Buttondown remains the recommendation when API-driven publishing is the priority; Substack is the alternative when testing its reader network is more valuable than full publishing automation.

See the [Substack assessment](SUBSTACK.md) for the proposed six week pilot, current sponsorship developments, subscriber handling, and automation limits. No publication or delivery account has been connected.

## Decision before connecting delivery

Confirm active subscriber count, available list export and suppression records, whether you want direct sponsors or an ad network, and whether you expect to sell your own digital products. Start with Buttondown if API-driven email is the priority; evaluate the Substack pilot for reader discovery, or beehiiv if its ad ecosystem justifies the added platform dependency. Exact annual costs need the actual list size and chosen features.

## SEO and disclosure references

The build uses crawlable HTML, responsive images with explicit dimensions, descriptive alternative text, canonical URLs, a sitemap, and article structured data. These improve discoverability and consistency; rankings are not guaranteed. Commercial relationships are explained beside placements, rather than relying on a disclosure page alone.

References: [Google image guidance](https://developers.google.com/search/docs/appearance/google-images), [Google lazy-loading guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading), [FTC endorsement guidance](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking).
