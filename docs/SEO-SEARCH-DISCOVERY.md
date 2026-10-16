# SEO and search discovery plan

## Purpose

The site is public, but public availability does not guarantee search discovery or indexing. Search engines need stable crawlable URLs, meaningful HTML, canonical signals, page metadata, and a discovery mechanism such as a sitemap.

This plan improves discovery without renaming the repository or changing the current application routes.

## Implementation status

Implemented:

- Project-scoped `robots.txt`
- Build-generated `sitemap.xml`
- Exact-case canonical tags
- Unique metadata for the root, Blogs landing, and article pages
- Open Graph metadata
- Twitter card metadata
- `WebSite`, `Blog`, `BlogPosting`, `Person`, and breadcrumb structured data
- `noindex, follow` for the contributor article example
- Sitemap exclusion for drafts, hash routes, filters, and the contributor example
- Build validation for sitemap URLs and template metadata

Manual owner actions still required:

- Add the property in Google Search Console
- Obtain and install the verification token or HTML file
- Submit the sitemap
- Request indexing for the root, Blogs landing page, and each article
- Monitor indexing and enhancement reports

Deferred to a later routing phase:

- Physical static URLs for additional Fieldnotes sections
- Migration to a user-site root or custom domain

## Current public URL

The canonical project-site URL is:

`https://shubhamjms.github.io/Pages/`

The `Pages` segment is case-sensitive. The lowercase path `/pages/` returns `404`.

All canonical tags, sitemap entries, social URLs, Search Console properties, and internal absolute URLs must use the exact `/Pages/` casing.

## Why SEO is necessary

SEO work is necessary for this site because:

- The Fieldnotes application initially returns a JavaScript application shell with limited HTML content.
- Hash routes such as `#/library` are not separate crawlable URLs.
- Search engines may render JavaScript later than the initial crawl.
- Other crawlers, social preview bots, and smaller search engines may not execute the application.
- A new site may have few external links, so search engines need explicit discovery signals.
- Duplicate or differently-cased URLs can divide search signals.
- Article pages need unique metadata to produce useful search results and social previews.

SEO does not guarantee ranking or indexing. It makes the site technically discoverable and gives search engines consistent information.

## GitHub Pages constraints

### Case sensitivity

GitHub Pages project sites include the repository name in the URL. The repository is named `Pages`, so the project path is `/Pages/`.

Renaming the repository to lowercase is not part of this implementation because GitHub does not automatically redirect old project-site URLs after a repository rename.

### robots.txt location

Search engines request `robots.txt` from the hostname root:

`https://shubhamjms.github.io/robots.txt`

This project deploys beneath `/Pages/`, so its repository cannot control the hostname-root file unless a `shubhamjms.github.io` user-site repository is created.

The project publishes `/Pages/robots.txt` as documentation and for future root/custom-domain migration, but Google Search Console sitemap submission is the effective discovery mechanism for the current project site.

### Hash routes

Fragment routes are retained for the existing Fieldnotes application in this phase:

- `#/articles`
- `#/library`
- `#/learn`
- `#/tools`

They are intentionally excluded from the sitemap because fragments do not identify separately crawlable documents.

The physical CodeFox Blog pages use clean URLs and are included.

## Phase 1: immediate technical SEO

### 1. robots.txt

Publish a permissive project-scoped `robots.txt` that:

- Allows crawling
- References the canonical sitemap URL
- Does not block JavaScript, CSS, images, or article pages

### 2. sitemap.xml

Generate the sitemap during the content build.

Include:

- Fieldnotes root
- CodeFox Blogs landing page
- Every published CodeFox article

Exclude:

- Hash routes
- Draft posts
- Contributor article-template example
- Filter/query variants

### 3. canonical URLs

Add canonical links directly in raw HTML.

Canonical URLs must:

- Use HTTPS
- Use `shubhamjms.github.io`
- Use exact `/Pages/` casing
- Exclude query parameters
- Exclude fragments

### 4. unique page metadata

Every indexable physical page needs:

- Unique title
- Unique description
- Robots directive
- Canonical URL
- Social title and description
- Social URL
- Social image where available

### 5. Open Graph and Twitter metadata

Add:

- `og:type`
- `og:site_name`
- `og:title`
- `og:description`
- `og:url`
- `og:image`
- `twitter:card`
- `twitter:title`
- `twitter:description`
- `twitter:image`

### 6. structured data

Use JSON-LD in raw HTML:

- `WebSite` for The Builder's Fieldnotes
- `Blog` for CodeFox Community Hub
- `BlogPosting` for published articles
- `Person` for approved public authors
- `BreadcrumbList` for article hierarchy

Structured data must match visible page content.

### 7. noindex contributor examples

The contributor article-template page is a support resource, not a public article.

Set:

`noindex, follow`

Do not include it in the sitemap.

### 8. Google Search Console verification

Create a URL-prefix property:

`https://shubhamjms.github.io/Pages/`

Use the verification token or HTML file provided by Search Console. Do not commit a placeholder token.

### 9. Sitemap submission

Submit:

`https://shubhamjms.github.io/Pages/sitemap.xml`

Then inspect and request indexing for:

- Fieldnotes root
- Blogs landing page
- Each published article

### 10. More clean static Fieldnotes URLs

This is a later phase because it changes routing.

Candidate pages:

- `/Pages/articles/`
- `/Pages/library/`
- `/Pages/learn/`
- `/Pages/tools/`

Generate physical HTML before adding these URLs to the sitemap.

## Phase 2: content and authority

- Publish useful original articles consistently.
- Link related articles together.
- Add author profile pages when multiple authors are active.
- Obtain legitimate links from relevant profiles, repositories, and community resources.
- Avoid copied, thin, or automatically generated content.
- Keep article dates, summaries, images, and author records accurate.

## Phase 3: permanent URL strategy

Evaluate one of:

1. Keep the canonical `/Pages/` project URL.
2. Migrate to the free `shubhamjms.github.io` user-site root.
3. Configure an owned custom domain.

Do not rename the repository solely to change casing without an old-URL redirect strategy.

## Search Console process

1. Open Google Search Console.
2. Add a URL-prefix property using exact case.
3. Complete verification.
4. Submit `sitemap.xml`.
5. Inspect the canonical root.
6. Inspect the Blogs landing page.
7. Inspect each article.
8. Request indexing.
9. Review Page Indexing reports.
10. Review Core Web Vitals and enhancements.

Indexing may take days or weeks and is not guaranteed.

## Release checklist

Before deployment:

- Production build passes.
- `robots.txt` returns `200`.
- `sitemap.xml` returns `200`.
- Sitemap XML is valid.
- Sitemap URLs use exact casing.
- Every sitemap URL returns `200`.
- Every indexable page has one canonical tag.
- Canonical URLs match sitemap URLs.
- Contributor examples use `noindex`.
- JSON-LD parses as valid JSON.
- No draft post appears in the sitemap.
- No unresolved template token is present.
- No hash URL appears in the sitemap.

## Maintenance rules

- Update SEO configuration when the public hostname or repository path changes.
- Do not add lowercase `/pages/` URLs as aliases.
- Do not include tracking query parameters in canonical URLs.
- Keep article metadata in the Blog content source.
- Generate sitemap data from published content rather than maintaining it manually.
- Re-submit the sitemap after major URL migrations.

## Official references

- GitHub Pages site types: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- GitHub repository rename behavior: https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository
- GitHub Pages custom domains: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- Google URL structure guidance: https://developers.google.com/search/docs/crawling-indexing/url-structure
- Google JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google canonical guidance: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
