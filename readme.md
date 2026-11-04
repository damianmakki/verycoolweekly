# Very Cool Weekly

Independent design and development picks curated by Damian Makki.

Canonical home: **https://ruckuslabs.co/verycoolweekly/**

The homepage introduces the newsletter and links to signup, advertiser information, and the archives. All pages share the same header and footer, using the original Very Cool logo. This repository builds the responsive static website and portable HTML/text email editions from structured issue files. All eleven original 2017 issues and their 74 editorial picks are preserved.

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
- [Substack expansion assessment and pilot](docs/SUBSTACK.md)
- Shared settings: `site.config.json`
- Issue template: `content/templates/issue.json`
- Commercial examples: `content/templates/commercial-slots.json`
- Shared layout: `scripts/build.mjs`; styles: `assets/site.css`
- Shared logo: `assets/images/verycool.svg` (public site and Editors Desk)
- Active icons: `favicon-32x32.png` and `apple-touch-icon-152x152.png`

Original archive image paths and animations remain available for historical links. Optimized previews are tracked in `assets/optimized/manifest.json`. The completed one-time importer and unused legacy icon variants have been removed.

The Friday GitHub workflow validates and produces downloadable web/email artifacts. Deployment to Ruckus and live email delivery remain separate, explicit operations.
