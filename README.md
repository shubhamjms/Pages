# The Builder's Fieldnotes

A Markdown-driven reading site for articles, learning guides, and categorized tool notes.

The only application lives in `site/`. Content is compiled into a typed index and static JSON records before Vite builds the site.

## Local development

```bash
cd site
npm ci
npm run dev
```

Create a production build with `npm run build`. Vite writes the deployable site to `site/dist/` with the `/Pages/` base path.

## Content

- Articles: `site/content/articles/`
- Topics: `site/content/topics/`
- Learning guides: `site/content/learning/`
- Tool notes: `site/content/tools/`
- Home and About pages: `site/content/home.md` and `site/content/about.md`

The content generator validates metadata, relationships, internal links, and required tool sections. Do not edit `site/src/generated/` or `site/public/content/records/` by hand.

## Deployment

Pushes to `web-checks` run `.github/workflows/deploy-pages.yml` and publish `site/dist/` to [shubhamjms.github.io/Pages](https://shubhamjms.github.io/Pages/).
