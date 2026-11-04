# Very Cool Weekly

Independent design and development picks curated by Damian Makki.

- Branded website: **https://ruckuslabs.co/verycoolweekly/**
- Publishing source: **https://verycoolweekly.substack.com/**

Write, review, and publish the complete edition once in Substack. The website imports published posts into its homepage preview and archive index, with links to the full Substack editions. All eleven original website issue URLs and their 74 editorial picks remain available.

```sh
npm ci
npm run sync:substack
npm run build
npm run preview
```

Use Node 22+. The preview prints its local address. Output is in `dist/`. Builds use the cached public Substack snapshot and require no network access; `sync:substack` refreshes it. A failed local refresh retains the last successful snapshot. CI uses `--strict`, so a failed refresh cannot replace the deployed site with an older build.

```sh
npm test
npm run check
npm run export:ruckus
```

The parent website's deployment workflow checks Substack hourly at minute 17 and rebuilds only when published content changes. GitHub schedules can run late. Manual deployments refresh Substack before building too. These workflow changes take effect after publication of both repositories.

The index combines the current feed with cached older posts, so older editions remain listed after leaving Substack's rolling feed window. Each successful deployment carries this archive history forward in `assets/substack-index.json`. The public `feed.xml` and `feed.json` URLs mirror complete Substack posts and images; historical feed IDs are preserved for existing subscribers. `archive-import.xml` remains a separate historical migration artifact and does not send email.

The Editors Desk remains the research and review workspace. Its Substack, X, and Notes drafts are still prepared locally; author approval and native Substack publication are unchanged. Local non-archive issue files no longer publish new website editions, and `web:stage` explains the new workflow. Existing drafts, review decisions, and delivery records remain intact.

- [Research and review workflow](docs/EDITORIAL-WORKFLOW.md)
- [Publishing and website refresh](docs/PUBLISHING.md)
- [Substack workflow and history](docs/SUBSTACK.md)
- [X and Notes](docs/X-POSTING.md)
- [Discovery sources](sources.md)
- Shared layout: `scripts/build.mjs`; styles: `assets/site.css`
- Public Substack snapshot: `content/substack/posts.json`
- Feed parser, sanitization, and archive retention: `scripts/substack.mjs`
- Feed refresh: `scripts/sync-substack.mjs`
- Compatibility feeds: `scripts/feeds.mjs`
- Structured data: `scripts/seo.mjs`
- Shared logo: `assets/images/verycool.svg`
