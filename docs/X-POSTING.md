# X posting for Very Cool Weekly

Account: [@verycoolweekly](https://x.com/verycoolweekly). Prepared November 3, 2026.

## The approach

Publish the individual editorial picks first, then the full weekly roundup. Use the existing issue file as the source for both, so the website, email, and X campaign stay aligned.

**Selected delivery: Buffer Free**, connected to **@verycoolweekly** on November 3, 2026. The dashboard confirms the Free plan, Twitter/X channel, and America/Denver timezone. No posts were created or scheduled during setup.

Buffer supports automatic X publishing on its free tier, with ten queued posts per channel and three channels. The six individual links plus Friday roundup fit that queue. See [Buffer pricing](https://buffer.com/pricing) and [X integration](https://support.buffer.com/en-us/articles/using-xtwitter-with-buffer-nA84XnWtuU). Do not upgrade, buy X credits, or add paid tools.

The review and draft generator runs locally. Buffer handles delivery **after approved posts are scheduled there**. There is no unattended uploader or API credential in this repository. The weekly research automation does not itself schedule or publish posts. Current channel ID is recorded in `social.config.json`; it is an identifier, not a credential.

## Default cadence

For an edition containing six editorial picks:

| Day | Mountain time | Post |
| --- | --- | --- |
| Tuesday | 9:30 a.m. | Article 1 |
| Tuesday | 2:30 p.m. | Article 2 |
| Wednesday | 9:30 a.m. | Article 3 |
| Wednesday | 2:30 p.m. | Article 4 |
| Thursday | 9:30 a.m. | Article 5 |
| Thursday | 2:30 p.m. | Article 6 |
| Friday | 10 a.m. | The full roundup, after the web edition is live |

These are starting slots, not a claim about optimal engagement. Evaluate clicks and meaningful responses after four editions, then adjust.

`social.config.json` stores the account, IANA timezone `America/Denver`, two article times, and roundup time. The configured Tuesday-start planner supports 1–6 picks, spreads them across Tuesday–Thursday, never schedules more than two in a day, and leaves the roundup until Friday. Smaller editions have fewer posts; it does not fill empty slots with repeats. More than six picks needs an explicit alternative cadence. The legacy Monday-start option supports eight.

### Editorial timing changes

Research runs Monday at 2 p.m. Mountain. Review and approve the picks with editing notes on Monday afternoon or evening, then start the individual posts Tuesday. If review finishes later, reschedule the affected posts or use fewer slots; do not backfill missed times.

Changes to an issue or social configuration change the content fingerprint. The future sender must reject an old approval after edits. If an article was already posted, preserve its record and revise or skip the remaining posts rather than starting the campaign again.

## How the posts work

**Individual picks:** one clear observation or reason to click, followed by the original article URL. No link to an unpublished Friday page. Keep the whole thought useful without requiring a thread. Credit the author when known; don't invent handles or add unsolicited mentions.

**Friday roundup:** a short introduction to the collection plus the live issue URL, with `utm_source=x`, `utm_medium=social`, and the issue slug as the campaign. Include a signup invitation in the copy only when signup is actually open.

Article links are preserved verbatim. The planner does not append our tracking to someone else's article or alter partner parameters. The site's roundup link gets our campaign tracking; X and site analytics still need separate configuration to measure results.

By default, only `items` (editorial picks) are included. Sponsorships, affiliates, and our own product cards are not silently added to the drip. If we later promote those on X, write explicit commercial copy and add the appropriate disclosure; do not treat an editorial campaign as blanket approval for ad campaigns. X's [create-post endpoint](https://docs.x.com/x-api/posts/create-post) also documents a `paid_partnership` field for relevant paid placements.

## Generate a reviewable post plan

```sh
npm run social:plan -- --issue issue-12
```

This writes:

- `exports/social/issue-12/x-plan.json` — structured posts, local and UTC times, stable post IDs, content fingerprint, length checks, and blockers.
- `exports/social/issue-12/x-posts.txt` — human-readable copy and schedule for review or manual posting.

The output stays outside the public site. All generated posts are drafts and `approvedAt` is null. `readyToReview` means there are no planner blockers; it does **not** mean approved, scheduled, or sent. The generator never makes a network request to X.

For each editorial item, add an optional `xText` containing the body copy without its URL. Add optional top-level `xSummary` for the Friday body copy. The generator appends the correct URL and validates the result. Without overrides it creates a first draft from the title and existing commentary; review the wording before using it.

```json
{
  "xSummary": "This week’s edit: thoughtful interfaces, a useful tool, and one delightful rabbit hole. The full edition is here ↓",
  "items": [
    {
      "kind": "editorial",
      "title": "The original article title",
      "url": "https://publisher.example/article",
      "bodyHtml": "<p>The longer newsletter commentary goes here.</p>",
      "xText": "A shorter, specific observation about why this is worth opening."
    }
  ]
}
```

This is a field example, not a complete issue. Preserve the issue's other required fields and replace the example destination. There is no need to type `@verycoolweekly` into every post; the posting account supplies that identity.

For a historical demonstration only:

```sh
npm run social:plan -- --issue issue-eleven --example
```

Archive campaigns require this explicit example flag and remain blocked. Draft issues, placeholders, and missed times are also flagged. The script uses X's recommended `twitter-text` library for weighted character counts, including URLs and Unicode. Oversized custom copy fails validation rather than being silently cut. See [X's character-counting documentation](https://docs.x.com/fundamentals/counting-characters).

## Schedule approved posts for free

1. Apply the user's review decisions and editing notes, then regenerate the hopper. Check the review/content fingerprints against the current batch.
2. Use the connected Very Cool Weekly Buffer channel. Verify the exact handle and Free plan before adding posts. Use **custom date/time** from the approved plan; Buffer's initial suggested queue slots have not been replaced with our editorial cadence.
3. Schedule only approved, edited article copy. Never backfill a missed time. Keep no more than ten posts queued and account for posts already present.
4. Save each Buffer post ID, exact text, due time, batch fingerprint, and scheduling result in a private delivery ledger under `exports/`. Reconcile the queue before retrying an interrupted action so the same post is not scheduled twice.
5. Hold the Friday roundup until the actual edition is live at its expected URL with the correct title and canonical URL. Confirm the previous picks are scheduled/sent or explicitly skipped.
6. If approved copy changes after scheduling, update or remove the matching Buffer entry as well; rebuilding local exports does not change remote posts.
7. Check Buffer's Sent/failed status after delivery. A queued post is not proof that X received it.

We can schedule the reviewed campaign through Buffer's interface in this chat; it will publish at the chosen times without the computer running. Fully unattended upload would need a separate connection. Buffer currently offers its API on Free too ([official API guide](https://support.buffer.com/articles/using-buffers-api-GtIYIQilz5)), but no key has been generated and no API uploader has been implemented. A key would create persistent posting access and requires an explicit, secure setup; never paste it into chat or commit it.

## First live campaign

Finish one issue, review its article drafts and Friday roundup, use the connected Buffer account, and verify the first scheduled post deliberately. Start with text plus links. Add images only after deciding which images we have permission to republish; the newsletter's original-source links do not establish image rights.

After the first four editions, compare source-link engagement, roundup visits, and signup conversions. Keep useful individual posts even when they do not generate immediate signup clicks; the roundup is the conversion opportunity, while the daily picks build the publication's voice.
