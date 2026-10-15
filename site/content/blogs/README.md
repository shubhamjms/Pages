# CodeFox Blogs content

This directory is the source of truth for published CodeFox Blogs content.

## Structure

```text
blogs/
├── publication.yml
├── categories.yml
├── ads.yml
├── POST_TEMPLATE.md
├── ARTICLE_EXAMPLE.md
├── authors/
    ├── registry.yml
    └── profiles/
        └── cf-author-0001.yml
└── posts/
    └── cf-author-0001/
        └── post-slug/
            └── index.md
```

## Responsibilities

- `publication.yml` contains publication-level branding, contact, and featured-post settings.
- `categories.yml` defines the ordered topic taxonomy. Use `active` for visible topics and `planned` for coming-soon topics.
- `ads.yml` defines the shared sponsored sidebar used by every standard article.
- `POST_TEMPLATE.md` is the internal maintainer starting format for new posts and is not published directly.
- `ARTICLE_EXAMPLE.md` powers the rendered contributor-facing example at `/codefox-blogs/article-template/`.
- `authors/registry.yml` assigns stable non-personal author keys and ownership references.
- `authors/profiles/<cf-author-id>.yml` contains an approved public contributor profile.
- `posts/<cf-author-id>/<post-slug>/index.md` contains that author's article frontmatter and Markdown content.

Author-interest and article-submission emails are intake only. Do not commit private submission data, unapproved profiles, or email threads into this directory.

## Add an author

Author keys use the sequential `cf-author-NNNN` format. `cf-author-0001` is reserved for the CodeFox owner. External contributors start at `cf-author-1000`. Display names may be duplicated and changed without affecting ownership.

When approving an author:

1. Read `nextAuthorNumber` from `authors/registry.yml`.
2. Assign that number as `cf-author-NNNN`.
3. Add a registry entry and increment `nextAuthorNumber`.
4. Reply to the private email thread with the ownership reference `CF-AUTH-NNNN`.
5. Apply a private Gmail label such as `CodeFox/Authors/cf-author-NNNN`.
6. Create `authors/profiles/cf-author-NNNN.yml`.

The Gmail thread and label are the private mapping to the author's email. Never add that email to Git.

Required registry entry:

```yaml
ownerAuthorId: "cf-author-0001"
externalAuthorStart: 1000
nextAuthorNumber: 1000
authors:
  - id: "cf-author-0001"
    status: "active"
    assignedAt: "YYYY-MM-DD"
    ownershipReference: "CF-AUTH-0001"
```

Required public profile fields:

```yaml
id: "cf-author-0001"
name: "Author Name"
initials: "AN"
role: "Role"
bio: "Public biography."
profileUrl: "https://example.com/profile"
```

## Add a post

Create `posts/cf-author-NNNN/<post-slug>/index.md`. The author is derived from the author-key folder under `posts`, and the post folder becomes the clean URL.

Required frontmatter:

```yaml
---
title: "Post title"
summary: "Post summary."
layout: "standard"
contentType: "article"
breadcrumb: "Short breadcrumb"
eyebrow: "Category / Content type"
categories:
  - "category-slug"
published: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
coverImage: "./article-covers/cover-file.jpg"
featured: false
draft: false
tags:
  - "tag"
---
```

Place cover images under `site/public/article-covers/`. Set `draft: true` to keep a post out of the generated site.

The `standard` layout provides the common article masthead, cover rail, generated table of contents, Markdown content area, author panel, sponsored sidebar, Home/Back controls, and responsive behavior. Posts should contain content only and must not duplicate those containers.

The shared ad configuration supports `standard` and `short` sidebar slots. Disable all article ads with `enabled: false` in `ads.yml`.

## Rich article content

Post bodies use Markdown and support:

- Level-two and level-three headings
- Bold and italic emphasis
- External links
- Ordered and unordered lists
- Warning or note blockquotes
- Local images stored beside the post
- Tables
- Fenced code blocks
- YouTube and Vimeo embeds

Raw HTML is intentionally disabled. This keeps contributor input portable and prevents unsafe markup.

Embed an allowlisted video with:

````markdown
```video
https://www.youtube.com/watch?v=VIDEO_ID
Accessible video title or short caption
```
````

YouTube embeds are converted to the privacy-enhanced `youtube-nocookie.com` host. Vimeo embeds use `player.vimeo.com`. Other video hosts and non-HTTPS URLs fail the build.

Post slugs must remain unique across all authors because public post URLs do not include the author ID.

The build validates:

- `cf-author-NNNN` key format and uniqueness
- Reserved owner ID below the external contributor range
- External contributor IDs starting at `1000`
- Sequential `nextAuthorNumber`
- Registry-to-folder mapping
- `CF-AUTH-NNNN` ownership references
- Duplicate post slugs across authors
- Author ownership derived from the directory path
- Absence of email fields in public profile and post data
- Category references, dates, cover images, required fields, template tokens, and featured-post configuration
