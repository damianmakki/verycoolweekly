# Substack expansion assessment

**November 3, 2026 — Substack selected for the weekly email.**

Publication: https://verycoolweekly.substack.com/
Signup: https://verycoolweekly.substack.com/subscribe

The website signup now uses the verified hosted subscription page. Paid subscriptions and subscriber imports have not been changed. The six week evaluation below remains the operating plan.

Substack is worth testing for reader discovery and conversation. Keep the Ruckus website and issue files as the publication's home and source of record. If we choose Substack, use it as the pilot's email delivery platform rather than launching a second email service at the same time. This trades some automation flexibility for access to Substack's reader network.

The publication and public signup page have been verified. On November 3, 2026 all eleven 2017 editions were imported through Substack’s RSS importer and verified in the live archive: original dates, 74 editorial headings/source links, and links back to Ruckus. The importer copied optimized images into Substack hosting. No subscriber import or email-send action was performed. Private import records are in `exports/substack/`.

## Where it fits

| Channel | Role | Content |
| --- | --- | --- |
| Ruckus website | Brand, searchable archive, advertiser destination | Complete editions in the custom Very Cool Weekly design. |
| X | Individual discoveries leading up to the roundup | The existing Tuesday–Thursday article drip and Friday roundup. |
| Substack Notes | Discovery and conversation within Substack | Three selected discoveries a week with original commentary; a Friday note introducing the edition. |
| Substack newsletter | One weekly email and a native reading experience | A complete, useful editorial edition, formatted for Substack. |

Substack Notes supports short posts, links, images, restacks, drafts, and scheduling. A Note does not send the same standalone newsletter email as a publication post, although readers may receive digest or push notifications. This makes Notes the appropriate place for individual picks rather than emailing each article separately. [Official Notes guide](https://support.substack.com/hc/en-us/articles/14564821756308-Getting-started-on-Substack-Notes).

The full Friday edition should stand on its own: a personal introduction, the selected links, original explanations of why they matter, and a reader discussion prompt. Avoid making the Substack publication a collection of thin teasers whose main purpose is redirecting people elsewhere.

## Why it is attractive

The current [features overview](https://substack.com/features) describes publishing, subscriber management, analytics, recommendations, community features, and publication exports. Those features give us a way to test discovery beyond the people already reaching the website or X. They provide an opportunity to grow; they do not guarantee reach.

Publishing free content is free. If paid subscriptions are enabled later, Substack charges a 10% platform fee plus payment-processing fees. Start the pilot free; the core edit needs to prove its value before introducing a paid tier. [Official pricing explanation](https://faq.substack.com/p/how-do-paid-subscriptions-on-substack).

The tradeoff is an additional native editor, a separate public reading surface, and less control over presentation than the custom Ruckus site. If reliable API-based publishing is the deciding requirement, the earlier Buttondown recommendation remains the stronger fit.

## What changes in the weekly routine

Keep the existing X schedule. For Substack, start with a smaller set of stronger posts rather than duplicating every X message.

| Time | Proposed action |
| --- | --- |
| Monday, 2 p.m. Mountain | Research the upcoming Friday's shortlist, then review and edit the picks. |
| After Monday review | Prepare the Substack edition and adapt three approved picks into Notes. |
| Tuesday–Thursday | Schedule one substantive Note each day; respond when readers have something useful to discuss. |
| Friday, 9 a.m. Mountain | Publish and verify the Ruckus edition. |
| Friday, 9:30 a.m. Mountain | Publish the full Substack edition and send its weekly email. |
| Friday, 10 a.m. Mountain | Release the existing X roundup after its website check. |
| Friday, 10:30 a.m. Mountain | Share the published Substack edition in a Note. |

These are the operating times; actual scheduled jobs are recorded privately in `exports/delivery/`. The timezone remains America/Denver. Three Notes for the November 13 pilot edition were scheduled and verified on November 4 for November 10–12 at 9:45 a.m. Mountain. The Friday article/email remains a draft at the user's request because the Ruckus edition URL is not live. Substack supports scheduled posts for web-only publication or web plus email/app delivery. [Posts scheduling guide](https://support.substack.com/hc/en-us/articles/15853567274772-Guide-to-your-Substack-Posts-page).

Give each channel a useful version of the idea. X copy can be concise; Notes can add context or a specific question; the full edition contains the complete commentary. Do not invent author handles, imply personal product testing that did not happen, or use repetitive engagement requests.

## Automation boundary

We can generate the following locally from the existing issue files:

- A Substack editor draft containing the introduction, editorial picks, source links, and explicit commercial disclosures when applicable.
- Notes drafts with suggested local dates and times, drawing from the same approved picks as the X plan.
- A checklist and record of the eventual Substack post URL, send time, and issue version.

These exports are implemented in the review-first editorial hopper; only approved picks with resolved editing notes are included. They remain local drafts until scheduled.

For the pilot, prepare the material locally, review it, and schedule it in Substack's own editor. Its published Developer API terms describe access to public creator/profile information; the official material reviewed does not establish a supported publishing or email-sending API for this workflow. Do not assume a read API or RSS feed can create scheduled posts. [Developer API terms](https://substack.com/api-tos).

Substack also documents an MCP connector for publication analytics, currently requiring admin access to a Bestseller publication. It is described as reading publication data, not as an automated publisher. It is not a launch dependency. [Official MCP guide](https://support.substack.com/hc/en-us/articles/50834026608916-How-to-connect-Substack-to-your-AI-Assistant).

A third-party tool should only become part of the workflow after its authorized access method and specific scheduling capabilities have been verified. Avoid making a session-cookie script the foundation of the weekly publication.

### Native scheduling after review

Prepare drafts still creates local exports only. When the user requests Substack scheduling, use the signed-in native interface and the current approved hopper, not an unattended sender. Reconcile `exports/delivery/YYYY-MM-DD-substack.json`, existing Note drafts, and scheduled articles before creating anything. Leave unrelated drafts intact. Check the current batch fingerprint before acting.

- **Notes:** Create → Note → Drafts shows existing and scheduled Notes. Paste the exact approved readable text and original source URL. The current Notes editor replaces custom HTML anchor labels with their URLs on paste; use plain text to retain approved wording rather than silently turning creator names into raw URLs. Native mentions require independent identity verification. Link previews may use the source's hero image; no generated artwork is needed. Set the calendar date and time, blur the time field and verify the displayed schedule before Save, then verify the composer before the final Schedule action. Check the resulting entry in Drafts. The pilot uses Tuesday–Thursday at 9:45 a.m. Mountain.
- **Article/email:** create a single full edition from `substack.html`, using the title field separately from the HTML body. Preserve the approved six-pick text and source links; check the saved body after rich-text paste and use the Email preview. Do not paste the provider-neutral email's unsubscribe placeholders into Substack. Native preview recipients are samples, not evidence of a test send. When release is authorized and the website link is live, verify free audience, email/app delivery and the schedule time before the final scheduling action. One Substack edition supplies the article and weekly email; do not schedule a second email job.
- **Held draft:** if the website URL returns 404, keep the email as a draft unless the user explicitly chooses a self-contained edition without that link. The November 13 pilot is held as a draft by explicit user choice. Do not interpret an earlier scheduling request as permission to override that hold.
- **Records:** save remote article IDs/URLs, exact text, proposed or confirmed time, review/content fingerprints and visible scheduling evidence in the private delivery ledger. Where the Notes interface does not expose an ID, record the verified text/time and evidence rather than inventing one. Update current queue states, preserving X delivery records. Rebuilding exports does not update or cancel remote schedules; always reconcile the ledger first.

Scheduling is verified separately from delivery. Check the actual sent/published result later before claiming success. Native scheduling does not establish a background uploader or broaden the Monday research automation's permission to publish.

## Email and subscriber ownership

Choose one primary email delivery service for the pilot. If we choose Substack, connect the website signup path to the verified publication's actual subscribe page. Do not put an invented Substack handle into the splash page or run Buttondown and Substack broadcasts to the same list by default.

Substack provides hosted subscribe URLs, including on custom domains. The current website signup page can link there once the publication exists and the flow has been tested. [Subscriber entry points](https://support.substack.com/hc/en-us/articles/360037830631-How-do-readers-subscribe-to-my-Substack-publication).

Import only readers who explicitly opted into Very Cool Weekly and preserve suppression/unsubscribe records. Substack's subscriber dashboard supports CSV exports; back up the publication and list regularly in private storage. [Subscriber dashboard](https://support.substack.com/hc/en-us/articles/360058529871-How-do-I-use-the-subscriber-dashboard-on-Substack), [content and import rules](https://substack.com/content).

If we later keep both email providers, readers need a clear channel choice and coherent unsubscribe handling. A Substack signup should not silently enroll someone into another list.

## Sponsorships and affiliate links

Substack now has native sponsorship initiatives. Its October 8, 2026 announcement describes new formats and a program still testing with small groups of bestsellers and brands. Access and advertiser demand should not be assumed for a new Very Cool Weekly publication. [Current sponsorship announcement](https://on.substack.com/p/a-new-vision-for-sponsorships).

An older help article says Substack does not build advertising functionality. That 2023 wording does not describe the whole picture after the newer announcements, so it should not be the basis for ruling Substack out. [Older advertising guidance](https://support.substack.com/hc/en-us/articles/360037455072-Can-I-use-affiliate-links-or-advertising-in-my-emails).

The current content guidelines still distinguish editorial publishing from conventional email marketing and restrict publications whose primary purpose is product promotion or traffic generation. Our Substack edition should have substantial independent editorial value. Keep advertising secondary, label real commercial relationships, and verify current platform requirements for the intended placements before selling Substack-specific inventory. [Current content guidelines](https://substack.com/content).

For sponsor proposals, specify which channels are included. Do not automatically add Substack email reach to the website/X package, promise subscriber figures, or include Notes placements without agreement. Build reporting around the actual channel results.

## Archive and search strategy

On November 3, 2026 the owner requested importing the eleven original editions into Substack. Keep each edition together, preserve its original 2017 publication date and commentary, and publish to the web archive without sending eleven retrospective emails. The Ruckus archive remains available. Do not import subscribers as part of this operation.

Substack supports importing posts from supported platforms and RSS, as well as manual copy-and-paste. Treat import as a migration operation to test, not as an established recurring RSS-to-email integration. The normal RSS feed contains summaries. The dedicated `archive-import.xml` migration feed now includes all eleven original editions and 74 picks, complete sanitized commentary, original dates, original source links, and locally hosted optimized images where available. It is generated by `scripts/archive-feed.mjs` during the normal build; tests check dates, pick counts, and draft exclusion. Do not use the summary feed for migration. [Official import guide](https://support.substack.com/hc/en-us/articles/360037830351-How-do-I-import-my-posts-from-another-platform-such-as-Mailchimp-WordPress-Medium-or-Ghost).

Publish the Ruckus edition first and include a clear source link in the Substack edition. Verify Substack's actual canonical/SEO controls before assuming it can designate the Ruckus page as canonical. A source link is not the same as a canonical tag. If indexing the Ruckus page as the primary version is critical, test that behavior before importing the archive.

A Substack custom domain is optional and currently has a one-time $50 fee. Its documentation describes a subdomain-based setup and says email continues to come from a Substack address. Keep ruckuslabs.co/verycoolweekly/ for the existing site; a separate hostname such as weekly.ruckuslabs.co would be a future choice, not a change to make during this assessment. [Custom domain guide](https://support.substack.com/hc/en-us/articles/360051222571-How-do-I-set-up-my-custom-domain-on-Substack).

## Six week decision

Run six new weekly editions with three editorial Notes and one release Note per week. Record confirmed email growth attributable to Substack discovery, meaningful reader responses, engagement with the full edition, Ruckus referrals, and extra preparation time. Keep a private record of the source issue version and the published Substack URL.

At six weeks, decide whether the audience gained justifies the extra editorial and scheduling work. If it does, retain Substack as the confirmed email home and keep the verified signup connection. If API-driven operations matter more than the discovery gains, use Buttondown for email and reassess whether a lighter Substack presence is still worthwhile.

Native Note scheduling was verified on November 4, 2026. The first new full edition is saved in Substack as an unscheduled draft; its remote URL and the three confirmed Notes are recorded privately in `exports/delivery/2026-11-13-substack.json`. The remaining release steps are a live website edition, final email review/test, and explicitly authorized article/email scheduling. Subscriber imports, paid subscriptions and domain changes have not been performed.
