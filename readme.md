# Very Cool Weekly

Independent design and development picks curated by Damian Makki.

Canonical home: **https://ruckuslabs.co/verycoolweekly/**

The homepage is a compact splash page linking to signup, advertiser information, and the archives. This repository builds the responsive static website and portable HTML/text email editions from structured issue files. All eleven original 2017 issues and their 74 editorial picks are preserved.

```sh
npm ci
npm run build
npm run preview
```

Use Node 22+. The preview prints its local URL. Production output is in `dist/`; email source editions are in `exports/emails/`.

```sh
npm run new:issue -- --date 2026-11-06 --title "Issue 12: A new chapter"
npm run optimize
npm run build -- --drafts
npm test
npm run build
npm run check
npm run export:ruckus
```

Drafts and future editions are excluded from production. Paid sponsorships, products, and affiliate recommendations are optional and visibly labeled. Weekly email uses Substack. Website signup links to the verified Very Cool Weekly subscription page; the inactive Mailchimp form is removed. X publishing is being prepared for Buffer Free, with paid services disabled.

- [Research, thumbs up/down review, and publishing hopper](docs/EDITORIAL-WORKFLOW.md)
- [Weekly content sources and collection routine](sources.md)
- [X article drip, Friday roundup, and automation plan](docs/X-POSTING.md)
- [Publishing workflow, commercial slots, and launch checklist](docs/PUBLISHING.md)
- [Email provider comparison and recommendation](docs/EMAIL-PROVIDERS.md)
- [Substack expansion assessment and pilot](docs/SUBSTACK.md)
- Shared settings: `site.config.json`
- Issue template: `content/templates/issue.json`
- Commercial examples: `content/templates/commercial-slots.json`
- Shared layout: `scripts/build.mjs`; styles: `assets/site.css`

The Friday GitHub workflow validates and produces downloadable web/email artifacts. Deployment to Ruckus and live email delivery remain separate, explicit operations.
