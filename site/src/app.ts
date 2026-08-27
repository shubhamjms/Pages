import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Home,
  LayoutGrid,
  Library,
  Menu,
  UserRound,
  UsersRound,
  Wrench,
  X,
  createIcons,
} from "lucide";
import { contentIndex } from "./generated/content-index";
import type {
  ArticleRecord,
  ArticleSummary,
  ChapterRecord,
  ChapterSummary,
  GuideSummary,
  HeadingRecord,
  ToolCategoryRecord,
  ToolRecord,
  ToolSummary,
  TopicRecord,
} from "./types";

const icons = {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Home,
  LayoutGrid,
  Library,
  Menu,
  UserRound,
  UsersRound,
  Wrench,
  X,
};

let mainElement: HTMLElement;
let menuButton: HTMLButtonElement;
let siteNavigation: HTMLElement;
let hasRendered = false;
let renderVersion = 0;

interface HomeCarouselItem {
  title: string;
  summary: string;
  route: string;
  label: string;
  detail: string;
  action: string;
  kind: "general" | "tool" | "learning";
  icon: "book-open" | "layout-grid" | "wrench";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function displayLabel(value: string): string {
  const labels: Record<string, string> = {
    ai: "AI",
    "github-copilot": "GitHub Copilot",
    vscode: "VS Code",
  };
  if (labels[value]) return labels[value];
  return value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function articleMetadata(article: ArticleSummary): string {
  return `${displayLabel(article.type)} · ${formatDate(article.published)} · ${article.readingTime} min`;
}

function articleCard(article: ArticleSummary, position?: number): string {
  return `
    <article class="reading-card${position ? " reading-card--numbered" : ""}">
      ${position ? `<span class="card-number" aria-hidden="true">${String(position).padStart(2, "0")}</span>` : ""}
      <p class="metadata">${escapeHtml(articleMetadata(article))}</p>
      <h3><a href="${article.route}">${escapeHtml(article.title)}</a></h3>
      <p>${escapeHtml(article.summary)}</p>
      <a class="text-link" href="${article.route}">Read fieldnote <i data-lucide="arrow-right"></i></a>
    </article>`;
}

function guideFeature(guide: GuideSummary): string {
  const firstChapter = guide.parts[0]?.chapters[0];
  return `
    <article class="learning-feature">
      <div>
        <p class="kicker">Structured learning</p>
        <h3><a href="${guide.route}">${escapeHtml(guide.title)}</a></h3>
        <p>${escapeHtml(guide.summary)}</p>
      </div>
      <dl class="stat-line" aria-label="Guide details">
        <div><dt>Parts</dt><dd>${guide.partCount}</dd></div>
        <div><dt>Chapters</dt><dd>${guide.chapterCount}</dd></div>
        <div><dt>Reading</dt><dd>${guide.readingTime} min</dd></div>
      </dl>
      <div class="action-row">
        ${firstChapter ? `<a class="button-link" href="${firstChapter.route}">Start guide <i data-lucide="arrow-right"></i></a>` : ""}
        <a class="quiet-link" href="${guide.route}">View contents</a>
      </div>
    </article>`;
}

function toolFeature(tool: ToolSummary): string {
  return `
    <article class="tool-feature">
      <span class="tool-mark" aria-hidden="true"><i data-lucide="wrench"></i></span>
      <div>
        <p class="metadata">${escapeHtml(displayLabel(tool.kind))} · ${escapeHtml(tool.status)}</p>
        <h3><a href="${tool.route}">${escapeHtml(tool.title)}</a></h3>
        <p>${escapeHtml(tool.summary)}</p>
      </div>
      <a class="text-link" href="${tool.route}">Open tool note <i data-lucide="arrow-right"></i></a>
    </article>`;
}

function findArticle(slug: string): ArticleSummary | undefined {
  return contentIndex.articles.find((article) => article.slug === slug);
}

function findTool(key: string): ToolSummary | undefined {
  return contentIndex.toolCategories.flatMap((category) => category.tools).find((tool) => tool.key === key);
}

function findChapter(guideSlug: string, chapterSlug: string): ChapterSummary | undefined {
  const guide: GuideSummary | undefined = contentIndex.guides.find((item) => item.slug === guideSlug);
  return guide?.parts.flatMap((part) => part.chapters).find((chapter) => chapter.slug === chapterSlug);
}

function homeCarouselSlide(item: HomeCarouselItem, index: number, total: number): string {
  const isActive = index === 0 && total > 0;
  return `
    <article class="home-carousel-card" data-home-carousel-slide data-card-kind="${item.kind}" data-position="${isActive ? "active" : "inactive"}" data-carousel-index="${index}">
      <a class="home-carousel-card__link" href="${item.route}" draggable="false" ${isActive ? 'aria-current="true"' : 'tabindex="-1"'} aria-label="${escapeHtml(`${item.action}: ${item.title}`)}">
        <div class="home-carousel-card__top">
          <span class="home-carousel-card__icon" aria-hidden="true"><i data-lucide="${item.icon}"></i></span>
          <p class="metadata">${escapeHtml(item.label)}</p>
        </div>
        <div class="home-carousel-card__body">
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.summary)}</p>
        </div>
        <div class="home-carousel-card__footer">
          <span>${escapeHtml(item.detail)}</span>
          <span class="home-carousel-card__action">${escapeHtml(item.action)} <i data-lucide="arrow-right"></i></span>
        </div>
      </a>
    </article>`;
}

function renderHome(): string {
  const home = contentIndex.home;
  const toolPriority = new Map([
    ["vs-code/github-copilot-insights-dashboard", 0],
    ["vs-code/d365-solutions-unpacking-agent", 1],
  ]);
  const tools: ToolSummary[] = contentIndex.toolCategories.flatMap((category) => category.tools);
  tools.sort((left, right) => (toolPriority.get(left.key) ?? 100) - (toolPriority.get(right.key) ?? 100) || right.updated.localeCompare(left.updated));
  const stableToolCount = tools.filter((tool) => tool.status === "stable").length;
  const lead = findArticle(home.leadArticle) ?? contentIndex.articles[0];
  const featured = home.featuredArticles.map(findArticle).filter((article): article is ArticleSummary => Boolean(article));
  const guides = home.featuredLearning
    .map((slug) => contentIndex.guides.find((guide) => guide.slug === slug))
    .filter((guide) => guide !== undefined);
  const featuredTools = home.featuredTools.map(findTool).filter((tool): tool is ToolSummary => Boolean(tool));
  const items: HomeCarouselItem[] = [
    {
      title: "All tools",
      summary: contentIndex.toolLibrary.summary,
      route: "#/tools",
      label: "General · Tool menu",
      detail: `${tools.length} tools · ${stableToolCount} stable`,
      action: "Browse tools",
      kind: "general",
      icon: "layout-grid",
    },
    ...tools.map((tool) => ({
      title: tool.title,
      summary: tool.summary,
      route: tool.route,
      label: `Tool · ${displayLabel(tool.kind)}`,
      detail: `${displayLabel(tool.status)}${tool.version ? ` · v${tool.version}` : ""}`,
      action: "View tool",
      kind: "tool" as const,
      icon: "wrench" as const,
    })),
    ...contentIndex.guides.map((guide) => ({
      title: guide.title,
      summary: guide.summary,
      route: guide.route,
      label: "Learning course",
      detail: `${guide.chapterCount} chapters · ${guide.readingTime} min`,
      action: "Open course",
      kind: "learning" as const,
      icon: "book-open" as const,
    })),
  ];

  return `
    <div class="view view-home view-home--simple" id="view-home">
      <section class="home-carousel-section" aria-labelledby="home-title">
        <header class="home-carousel-header">
          <p class="kicker">Field kit</p>
          <h1 id="home-title" tabindex="-1">Tools &amp; learning</h1>
        </header>
        <div class="home-carousel" data-home-carousel role="region" aria-roledescription="carousel" aria-label="Tools and learning">
          <div class="home-carousel-stage" data-home-carousel-stage tabindex="0">
            ${items.map((item, index) => homeCarouselSlide(item, index, items.length)).join("")}
          </div>
        </div>
      </section>

      <section class="lead-story" id="home-lead" aria-labelledby="lead-title">
        <div class="lead-story__label">
          <p class="kicker">Opening note</p>
          <span class="vertical-rule" aria-hidden="true"></span>
          <p class="metadata">${escapeHtml(articleMetadata(lead))}</p>
        </div>
        <article class="lead-story__body">
          <h2 id="lead-title"><a href="${lead.route}">${escapeHtml(lead.title)}</a></h2>
          <p>${escapeHtml(lead.summary)}</p>
          <a class="button-link" href="${lead.route}">Read the opening note <i data-lucide="arrow-right"></i></a>
        </article>
        <p class="lead-story__folio" aria-hidden="true">${escapeHtml(home.issue.number)}</p>
      </section>

      <section class="section-block featured-reading" aria-labelledby="featured-title">
        <div class="section-heading-row">
          <div><p class="kicker">Five ideas worth carrying</p><h2 id="featured-title">Featured reading</h2></div>
          <a class="quiet-link" href="#/library">Browse the library</a>
        </div>
        <div class="featured-stack">${featured.map((article, index) => articleCard(article, index + 1)).join("")}</div>
      </section>

      <section class="section-block home-split" aria-label="Learning and tools">
        <div>
          <div class="section-heading-row section-heading-row--compact"><div><p class="kicker">Learn deliberately</p><h2>Learning paths</h2></div><a class="quiet-link" href="#/learn">All guides</a></div>
          ${guides.map(guideFeature).join("")}
        </div>
        <div>
          <div class="section-heading-row section-heading-row--compact"><div><p class="kicker">Keep close at hand</p><h2>Builder tools</h2></div><a class="quiet-link" href="#/tools">Tool library</a></div>
          <div class="tool-feature-list">${featuredTools.map(toolFeature).join("")}</div>
        </div>
      </section>

    </div>`;
}

function pageHeader(kicker: string, title: string, summary: string, metadata = ""): string {
  return `
    <header class="page-header">
      <p class="kicker">${escapeHtml(kicker)}</p>
      <h1 tabindex="-1">${escapeHtml(title)}</h1>
      <p class="page-deck">${escapeHtml(summary)}</p>
      ${metadata ? `<p class="metadata page-metadata">${escapeHtml(metadata)}</p>` : ""}
    </header>`;
}

function selected(value: string, expected: string): string {
  return value === expected ? " selected" : "";
}

function renderLibrary(query: URLSearchParams): string {
  const topic = query.get("topic") ?? "all";
  const format = query.get("format") ?? "all";
  const length = query.get("length") ?? "all";
  const year = query.get("year") ?? "all";
  const years = [...new Set(contentIndex.articles.map((article) => article.published.slice(0, 4)))].sort().reverse();
  const articles = contentIndex.articles.filter((article) => {
    const matchesTopic = topic === "all" || article.topic === topic;
    const matchesFormat = format === "all" || article.type === format;
    const matchesYear = year === "all" || article.published.startsWith(year);
    const matchesLength =
      length === "all" ||
      (length === "short" && article.readingTime <= 5) ||
      (length === "medium" && article.readingTime > 5 && article.readingTime <= 10) ||
      (length === "long" && article.readingTime > 10);
    return matchesTopic && matchesFormat && matchesYear && matchesLength;
  });

  return `
    <div class="view collection-view" id="view-library">
      ${pageHeader("Reading library", "Every fieldnote, in one place", "Browse the complete notebook by topic, format, length, or year.", `${contentIndex.articles.length} published notes`)}
      <form class="filter-bar" id="library-filters" aria-label="Filter reading library">
        <label><span>Topic</span><select name="topic"><option value="all">All topics</option>${contentIndex.topics.map((item) => `<option value="${item.slug}"${selected(topic, item.slug)}>${escapeHtml(item.title)}</option>`).join("")}</select></label>
        <label><span>Format</span><select name="format"><option value="all">All formats</option>${[...new Set(contentIndex.articles.map((article) => article.type))].map((item) => `<option value="${item}"${selected(format, item)}>${escapeHtml(displayLabel(item))}</option>`).join("")}</select></label>
        <label><span>Length</span><select name="length"><option value="all">Any length</option><option value="short"${selected(length, "short")}>Up to 5 min</option><option value="medium"${selected(length, "medium")}>6–10 min</option><option value="long"${selected(length, "long")}>Over 10 min</option></select></label>
        <label><span>Year</span><select name="year"><option value="all">All years</option>${years.map((item) => `<option value="${item}"${selected(year, item)}>${item}</option>`).join("")}</select></label>
      </form>
      <section class="content-section" aria-labelledby="library-results-title">
        <div class="section-heading-row section-heading-row--compact"><div><p class="kicker">Filtered collection</p><h2 id="library-results-title">${articles.length} ${articles.length === 1 ? "result" : "results"}</h2></div><a class="quiet-link" href="#/library">Clear filters</a></div>
        ${articles.length ? `<div class="article-grid">${articles.map((article) => articleCard(article)).join("")}</div>` : `<div class="inline-empty"><h3>No notes match these filters.</h3><p>Reset the filters to return to the complete library.</p></div>`}
      </section>
    </div>`;
}

function renderTopic(topic: TopicRecord): string {
  const articles = contentIndex.articles.filter((article) => article.topic === topic.slug);
  const terms = [...new Set(articles.flatMap((article) => article.tags))].sort();
  const otherTopics = contentIndex.topics.filter((candidate) => candidate.slug !== topic.slug);
  return `
    <div class="view collection-view" id="view-topic-${topic.slug}">
      ${pageHeader("Topic", topic.title, topic.summary, `${topic.articleCount} ${topic.articleCount === 1 ? "fieldnote" : "fieldnotes"}`)}
      <section class="topic-overview"><div class="prose-compact">${topic.html}</div><dl class="term-list"><dt>Key terms</dt>${terms.map((term) => `<dd>${escapeHtml(displayLabel(term))}</dd>`).join("")}</dl></section>
      <section class="content-section" aria-labelledby="topic-reading-title"><div class="section-heading-row"><div><p class="kicker">Current reading</p><h2 id="topic-reading-title">Fieldnotes on ${escapeHtml(topic.title)}</h2></div></div><div class="article-grid">${articles.map((article) => articleCard(article)).join("")}</div></section>
      ${otherTopics.length ? `<section class="related-band"><p class="kicker">Continue elsewhere</p><h2>Related topics</h2><div class="inline-links">${otherTopics.map((item) => `<a href="${item.route}">${escapeHtml(item.title)} <i data-lucide="arrow-right"></i></a>`).join("")}</div></section>` : ""}
    </div>`;
}

function guideCard(guide: GuideSummary): string {
  const firstChapter = guide.parts[0]?.chapters[0];
  return `
    <article class="guide-card">
      <p class="metadata">${escapeHtml(displayLabel(guide.level))}</p>
      <h2><a href="${guide.route}">${escapeHtml(guide.title)}</a></h2>
      <p>${escapeHtml(guide.summary)}</p>
      <dl class="stat-line"><div><dt>Parts</dt><dd>${guide.partCount}</dd></div><div><dt>Chapters</dt><dd>${guide.chapterCount}</dd></div><div><dt>Reading</dt><dd>${guide.readingTime} min</dd></div></dl>
      <div class="action-row"><a class="button-link" href="${guide.route}">View guide <i data-lucide="arrow-right"></i></a>${firstChapter ? `<a class="quiet-link" href="${firstChapter.route}">Start reading</a>` : ""}</div>
    </article>`;
}

function renderLearning(): string {
  const guides = [...contentIndex.guides].sort((left, right) => Number(right.featured) - Number(left.featured) || left.title.localeCompare(right.title));
  return `<div class="view collection-view" id="view-learning">${pageHeader("Learning", "Guides for building with judgment", "Move from first principles to working patterns through complete, inspectable learning paths.", `${guides.length} published ${guides.length === 1 ? "guide" : "guides"}`)}<section class="content-section guide-grid" aria-label="Published guides">${guides.map(guideCard).join("")}</section></div>`;
}

function chapterCard(chapter: ChapterSummary, position: number): string {
  return `
    <article class="chapter-card">
      <div class="chapter-card__number" aria-hidden="true">${String(position).padStart(2, "0")}</div>
      <p class="metadata">${escapeHtml(displayLabel(chapter.type))} · ${chapter.readingTime} min</p>
      <h3><a href="${chapter.route}">${escapeHtml(chapter.title)}</a></h3>
      <p>${escapeHtml(chapter.summary)}</p>
      <a class="text-link" href="${chapter.route}">Open chapter <i data-lucide="arrow-right"></i></a>
    </article>`;
}

function renderGuide(guide: GuideSummary): string {
  let position = 0;
  const firstChapter = guide.parts[0]?.chapters[0];
  return `
    <div class="view guide-view" id="view-learning-${guide.slug}">
      ${pageHeader("Learning guide", guide.title, guide.summary, `${guide.partCount} parts · ${guide.chapterCount} chapters · ${guide.readingTime} min`)}
      <section class="guide-introduction"><div class="prose-compact">${guide.introductionHtml}</div>${firstChapter ? `<a class="button-link" href="${firstChapter.route}">Start with chapter one <i data-lucide="arrow-right"></i></a>` : ""}</section>
      <div class="guide-parts">${guide.parts.map((part) => `<section class="guide-part" aria-labelledby="part-${part.key}"><header class="guide-part__header"><div><p class="metadata">${part.chapters.length} chapters · ${part.readingTime} min</p><h2 id="part-${part.key}">${escapeHtml(part.title)}</h2></div><p>${escapeHtml(part.summary)}</p></header><div class="chapter-grid">${part.chapters.map((chapter) => chapterCard(chapter, ++position)).join("")}</div></section>`).join("")}</div>
    </div>`;
}

function toolCard(tool: ToolSummary): string {
  return `
    <article class="tool-card">
      <div class="tool-card__top"><span class="tool-mark" aria-hidden="true"><i data-lucide="wrench"></i></span><span class="status-label">${escapeHtml(tool.status)}</span></div>
      <p class="metadata">${escapeHtml(displayLabel(tool.kind))} · ${escapeHtml(tool.platforms.slice(0, 2).map(displayLabel).join(" / "))}</p>
      <h3><a href="${tool.route}">${escapeHtml(tool.title)}</a></h3><p>${escapeHtml(tool.summary)}</p>
      <a class="text-link" href="${tool.route}">View tool note <i data-lucide="arrow-right"></i></a>
    </article>`;
}

function categoryCard(category: ToolCategoryRecord): string {
  return `
    <article class="category-card">
      <p class="metadata">${category.toolCount} ${category.toolCount === 1 ? "tool" : "tools"} · Updated ${formatDate(category.updated)}</p>
      <h2><a href="${category.route}">${escapeHtml(category.title)}</a></h2><p>${escapeHtml(category.summary)}</p>
      <dl class="category-counts"><div><dt>Stable</dt><dd>${category.stableCount}</dd></div><div><dt>Preview</dt><dd>${category.previewCount}</dd></div><div><dt>Archived</dt><dd>${category.archivedCount}</dd></div></dl>
      <a class="text-link" href="${category.route}">Browse category <i data-lucide="arrow-right"></i></a>
    </article>`;
}

function renderTools(): string {
  const featuredTools = contentIndex.toolCategories.flatMap((category) => category.tools.filter((tool) => category.featuredTools.includes(tool.slug)));
  const toolCount = contentIndex.toolCategories.reduce((total, category) => total + category.toolCount, 0);
  return `
    <div class="view collection-view" id="view-tool">
      ${pageHeader("Tool library", contentIndex.toolLibrary.title, contentIndex.toolLibrary.summary, `${contentIndex.toolCategories.length} categories · ${toolCount} tools`)}
      <section class="tool-library-intro prose-compact">${contentIndex.toolLibrary.html}</section>
      <section class="content-section" aria-labelledby="tool-categories-title"><div class="section-heading-row"><div><p class="kicker">Browse by environment</p><h2 id="tool-categories-title">Categories</h2></div></div><div class="category-grid">${contentIndex.toolCategories.map(categoryCard).join("")}</div></section>
      <section class="content-section content-section--tinted" aria-labelledby="featured-tools-title"><div class="section-heading-row"><div><p class="kicker">Start here</p><h2 id="featured-tools-title">Featured tools</h2></div></div><div class="tool-grid">${featuredTools.map(toolCard).join("")}</div></section>
    </div>`;
}

function renderToolCategory(category: ToolCategoryRecord): string {
  const tools = [...category.tools].sort((left, right) => Number(category.featuredTools.includes(right.slug)) - Number(category.featuredTools.includes(left.slug)) || left.status.localeCompare(right.status) || left.title.localeCompare(right.title));
  return `
    <div class="view collection-view" id="view-tool-${category.slug}">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(category.title)}</span></nav>
      ${pageHeader("Tool category", category.title, category.summary, `${category.toolCount} ${category.toolCount === 1 ? "tool" : "tools"} · Updated ${formatDate(category.updated)}`)}
      <section class="content-section"><div class="tool-grid">${tools.map(toolCard).join("")}</div></section>
    </div>`;
}

function breadcrumbMarkup(items: Array<{ label: string; route?: string }>): string {
  return `<nav class="breadcrumbs reader-breadcrumbs" aria-label="Breadcrumb">${items.map((item, index) => `${item.route ? `<a href="${item.route}">${escapeHtml(item.label)}</a>` : `<span aria-current="page">${escapeHtml(item.label)}</span>`}${index < items.length - 1 ? `<span aria-hidden="true">/</span>` : ""}`).join("")}</nav>`;
}

function tableOfContents(route: string, headings: HeadingRecord[]): string {
  if (!headings.length) return "";
  return `
    <nav class="reader-toc" aria-label="On this page">
      <p class="kicker">On this page</p>
      <ol>${headings.map((heading) => `<li class="reader-toc__level-${heading.level}"><a href="${route}#${encodeURIComponent(heading.id)}">${escapeHtml(heading.text)}</a></li>`).join("")}</ol>
    </nav>`;
}

function readerLayout(route: string, headings: HeadingRecord[], html: string, aside = ""): string {
  return `
    <div class="reader-layout">
      <aside class="reader-sidebar">${tableOfContents(route, headings)}${aside}</aside>
      <article class="reader-prose">${html}</article>
    </div>`;
}

function renderArticleReader(article: ArticleRecord): string {
  const topic = contentIndex.topics.find((item) => item.slug === article.topic);
  const related = article.relatedArticles.map(findArticle).filter((item): item is ArticleSummary => Boolean(item));
  return `
    <div class="view reader-view reader-view--article" id="view-read-${article.slug}">
      ${breadcrumbMarkup([{ label: "Library", route: "#/library" }, ...(topic ? [{ label: topic.title, route: topic.route }] : []), { label: article.title }])}
      <header class="reader-header">
        <p class="kicker">${escapeHtml(displayLabel(article.type))}</p>
        <h1 tabindex="-1">${escapeHtml(article.title)}</h1>
        <p class="reader-deck">${escapeHtml(article.summary)}</p>
        <div class="reader-byline"><span>By Shubham Jadhav</span><span>${formatDate(article.published)}</span><span>${article.readingTime} min read</span></div>
        <div class="tag-list" aria-label="Article tags">${article.tags.map((tag) => `<span>${escapeHtml(displayLabel(tag))}</span>`).join("")}</div>
      </header>
      ${readerLayout(article.route, article.headings, article.html)}
      ${related.length ? `<section class="reader-related" aria-labelledby="related-reading-title"><div class="section-heading-row"><div><p class="kicker">Keep reading</p><h2 id="related-reading-title">Related fieldnotes</h2></div><a class="quiet-link" href="#/library">Full library</a></div><div class="article-grid">${related.map((item) => articleCard(item)).join("")}</div></section>` : ""}
    </div>`;
}

function chapterNavigation(chapter: ChapterRecord): string {
  return `
    <nav class="chapter-navigation" aria-label="Chapter navigation">
      ${chapter.previous ? `<a class="chapter-navigation__previous" href="${chapter.previous.route}"><span class="metadata"><i data-lucide="arrow-left"></i> Previous</span><strong>${escapeHtml(chapter.previous.title)}</strong></a>` : `<span></span>`}
      ${chapter.next ? `<a class="chapter-navigation__next" href="${chapter.next.route}"><span class="metadata">Next <i data-lucide="arrow-right"></i></span><strong>${escapeHtml(chapter.next.title)}</strong></a>` : `<a class="chapter-navigation__next" href="#/learn/${chapter.guideSlug}"><span class="metadata">Guide complete</span><strong>Return to the contents</strong></a>`}
    </nav>`;
}

function renderChapterReader(chapter: ChapterRecord): string {
  const progress = Math.round((chapter.position / chapter.chapterCount) * 100);
  const guideRoute = `#/learn/${chapter.guideSlug}`;
  const guideFacts = `
    <section class="reader-facts" aria-label="Chapter details">
      <p class="kicker">Guide progress</p>
      <div class="progress-track" role="progressbar" aria-valuenow="${chapter.position}" aria-valuemin="1" aria-valuemax="${chapter.chapterCount}" aria-label="Chapter ${chapter.position} of ${chapter.chapterCount}"><span style="width: ${progress}%"></span></div>
      <p class="metadata">${progress}% complete</p>
    </section>`;
  return `
    <div class="view reader-view reader-view--chapter" id="view-learn-${chapter.guideSlug}-${chapter.slug}">
      ${breadcrumbMarkup([{ label: "Learning", route: "#/learn" }, { label: chapter.guideTitle, route: guideRoute }, { label: chapter.title }])}
      <header class="reader-header">
        <p class="kicker">Chapter ${chapter.position} of ${chapter.chapterCount} · ${escapeHtml(chapter.partTitle)}</p>
        <h1 tabindex="-1">${escapeHtml(chapter.title)}</h1>
        <p class="reader-deck">${escapeHtml(chapter.summary)}</p>
        <div class="reader-byline"><span>${escapeHtml(displayLabel(chapter.type))}</span><span>${escapeHtml(displayLabel(chapter.level))}</span><span>${chapter.readingTime} min read</span><span>Updated ${formatDate(chapter.updated)}</span></div>
      </header>
      ${readerLayout(chapter.route, chapter.headings, chapter.html, guideFacts)}
      ${chapterNavigation(chapter)}
    </div>`;
}

function externalToolLinks(tool: ToolRecord): string {
  const links = Object.entries(tool.links);
  if (!links.length) return "";
  return `<div class="reader-actions">${links.map(([key, value], index) => {
    const link = typeof value === "string" ? { label: displayLabel(key), url: value } : value;
    return `<a class="${index === 0 ? "button-link" : "quiet-link"}" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} <i data-lucide="external-link"></i></a>`;
  }).join("")}</div>`;
}

function youtubeVideoId(value: string): string | undefined {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");
    const candidate = hostname === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(hostname)
        ? (url.searchParams.get("v") ?? url.pathname.match(/^\/embed\/([^/]+)/)?.[1])
        : undefined;
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function toolVideo(tool: ToolRecord): string {
  const video = tool.links.video;
  if (!video) return "";
  const link = typeof video === "string" ? { label: "Video overview", url: video } : video;
  const videoId = youtubeVideoId(link.url);
  if (!videoId) return "";
  const title = `${tool.title} video overview`;
  return `
    <section class="tool-video" aria-labelledby="tool-video-title">
      <div class="tool-video__heading"><p class="kicker">Watch the extension</p><h2 id="tool-video-title">Video overview</h2></div>
      <div class="tool-video__frame">
        <iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&amp;mute=1&amp;playsinline=1&amp;rel=0" title="${escapeHtml(title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>
      </div>
    </section>`;
}

function renderToolReader(tool: ToolRecord): string {
  const category = contentIndex.toolCategories.find((item) => item.slug === tool.categorySlug);
  const relatedTools = tool.relatedTools.map(findTool).filter((item): item is ToolSummary => Boolean(item));
  const relatedArticles = tool.relatedArticles.map(findArticle).filter((item): item is ArticleSummary => Boolean(item));
  const facts = `
    <section class="reader-facts" aria-label="Tool details">
      <p class="kicker">Tool details</p>
      <dl><div><dt>Status</dt><dd>${escapeHtml(displayLabel(tool.status))}</dd></div><div><dt>Kind</dt><dd>${escapeHtml(displayLabel(tool.kind))}</dd></div>${tool.version ? `<div><dt>Version</dt><dd>${escapeHtml(tool.version)}</dd></div>` : ""}<div><dt>Updated</dt><dd>${formatDate(tool.updated)}</dd></div></dl>
    </section>`;
  return `
    <div class="view reader-view reader-view--tool" id="view-tool-${tool.categorySlug}-${tool.slug}">
      ${breadcrumbMarkup([{ label: "Tools", route: "#/tools" }, { label: tool.categoryTitle, route: category?.route }, { label: tool.title }])}
      <header class="reader-header reader-header--tool${tool.titleImage ? " reader-header--tool-image" : ""}">
        <div class="tool-title-mark${tool.titleImage ? " tool-title-mark--image" : ""}" aria-hidden="true">${tool.titleImage ? `<img src="${escapeHtml(tool.titleImage)}" alt="" width="256" height="256">` : '<i data-lucide="wrench"></i>'}</div>
        <div><p class="kicker">${escapeHtml(tool.categoryTitle)}</p><h1 tabindex="-1">${escapeHtml(tool.title)}</h1><p class="reader-deck">${escapeHtml(tool.summary)}</p><div class="tag-list" aria-label="Supported platforms">${tool.platforms.map((platform) => `<span>${escapeHtml(displayLabel(platform))}</span>`).join("")}</div>${externalToolLinks(tool)}</div>
      </header>
      ${toolVideo(tool)}
      ${readerLayout(tool.route, tool.headings, tool.html, facts)}
      ${(relatedTools.length || relatedArticles.length) ? `<section class="reader-related" aria-labelledby="related-tools-title"><div class="section-heading-row"><div><p class="kicker">Continue exploring</p><h2 id="related-tools-title">Related notes</h2></div></div>${relatedTools.length ? `<div class="tool-grid">${relatedTools.map(toolCard).join("")}</div>` : ""}${relatedArticles.length ? `<div class="article-grid reader-related__articles">${relatedArticles.map((item) => articleCard(item)).join("")}</div>` : ""}</section>` : ""}
    </div>`;
}

type ReaderRequest =
  | { kind: "article"; summary: ArticleSummary }
  | { kind: "chapter"; summary: ChapterSummary }
  | { kind: "tool"; summary: ToolSummary };

interface RouteResolution {
  html: string;
  title: string;
  reader?: ReaderRequest;
}

function renderReaderLoading(summary: ArticleSummary | ChapterSummary | ToolSummary): string {
  return `<section class="view reader-loading" role="status"><p class="kicker">Opening fieldnote</p><h1 tabindex="-1">${escapeHtml(summary.title)}</h1><div class="loading-rule" aria-hidden="true"><span></span></div><p>Loading the published record…</p></section>`;
}

function renderReaderError(title: string): string {
  return `<section class="view empty-state reader-error" role="alert"><p class="kicker">Record unavailable</p><h1 tabindex="-1">${escapeHtml(title)} could not be loaded.</h1><p>The published record may have moved, or the connection may have been interrupted.</p><button class="button-link" id="reader-retry" type="button">Try again <i data-lucide="arrow-right"></i></button></section>`;
}

async function loadRecord<T>(recordFile: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}content/records/${encodeURIComponent(recordFile)}.json`);
  if (!response.ok) throw new Error(`Record request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}

async function renderDiagrams(root: HTMLElement): Promise<void> {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".mermaid"));
  if (!nodes.length) return;
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: {
      background: "#fffdf8",
      primaryColor: "#ddf3fc",
      primaryBorderColor: "#1f7599",
      primaryTextColor: "#17201b",
      lineColor: "#526159",
      fontFamily: "Space Grotesk",
    },
  });
  await mermaid.run({ nodes, suppressErrors: true });
}

function renderUnavailable(title = "This page is not available yet.", summary = "The route is reserved for a future issue of the notebook."): string {
  return `
    <section class="view empty-state" id="view-not-found">
      <p class="kicker">The Builder's Fieldnotes</p>
      <h1 tabindex="-1">${escapeHtml(title)}</h1>
      <p>${escapeHtml(summary)}</p>
      <a class="button-link" href="#/home">Return home <i data-lucide="arrow-right"></i></a>
    </section>`;
}

interface RouteState {
  path: string;
  segments: string[];
  query: URLSearchParams;
  anchor: string;
}

function parseRoute(): RouteState {
  const hash = window.location.hash.startsWith("#/") ? window.location.hash.slice(1) : "/home";
  const anchorIndex = hash.indexOf("#");
  const withoutAnchor = anchorIndex >= 0 ? hash.slice(0, anchorIndex) : hash;
  const anchor = anchorIndex >= 0 ? decodeURIComponent(hash.slice(anchorIndex + 1)) : "";
  const queryIndex = withoutAnchor.indexOf("?");
  const path = queryIndex >= 0 ? withoutAnchor.slice(0, queryIndex) : withoutAnchor;
  const query = new URLSearchParams(queryIndex >= 0 ? withoutAnchor.slice(queryIndex + 1) : "");
  return { path, segments: path.split("/").filter(Boolean), query, anchor };
}

function resolveRoute(route: RouteState): RouteResolution {
  const [section, first, second, third] = route.segments;
  if (!section || section === "home") return { html: renderHome(), title: "The Builder's Fieldnotes" };
  if (section === "library" && !first) return { html: renderLibrary(route.query), title: "Library · The Builder's Fieldnotes" };
  if (section === "topic" && first && !second) {
    const topic = contentIndex.topics.find((item) => item.slug === first);
    return topic ? { html: renderTopic(topic), title: `${topic.title} · The Builder's Fieldnotes` } : { html: renderUnavailable("Topic not found", "That topic is not part of the published notebook."), title: "Topic not found" };
  }
  if (section === "learn" && !first) return { html: renderLearning(), title: "Learning · The Builder's Fieldnotes" };
  if (section === "learn" && first && !second) {
    const guide = contentIndex.guides.find((item) => item.slug === first);
    return guide ? { html: renderGuide(guide), title: `${guide.title} · The Builder's Fieldnotes` } : { html: renderUnavailable("Guide not found", "That learning path is not currently published."), title: "Guide not found" };
  }
  if (section === "tools" && !first) return { html: renderTools(), title: "Tools · The Builder's Fieldnotes" };
  if (section === "tools" && first && !second) {
    const category = contentIndex.toolCategories.find((item) => item.slug === first);
    return category ? { html: renderToolCategory(category), title: `${category.title} · The Builder's Fieldnotes` } : { html: renderUnavailable("Tool category not found", "That tool category is not currently published."), title: "Category not found" };
  }
  if (["search", "saved", "series"].includes(section)) return { html: renderUnavailable("Reserved for a future fieldnote", "This route is recognized, but the feature is intentionally outside the first release."), title: "Coming later · The Builder's Fieldnotes" };
  if (section === "read" && first && !second) {
    const article = findArticle(first);
    return article
      ? { html: renderReaderLoading(article), title: `${article.title} · The Builder's Fieldnotes`, reader: { kind: "article", summary: article } }
      : { html: renderUnavailable("Fieldnote not found", "That article is not part of the published library."), title: "Fieldnote not found" };
  }
  if (section === "learn" && first && second && !third) {
    const chapter = findChapter(first, second);
    return chapter
      ? { html: renderReaderLoading(chapter), title: `${chapter.title} · The Builder's Fieldnotes`, reader: { kind: "chapter", summary: chapter } }
      : { html: renderUnavailable("Chapter not found", "That chapter is not part of the published guide."), title: "Chapter not found" };
  }
  if (section === "tools" && first && second && !third) {
    const tool = contentIndex.toolCategories.find((category) => category.slug === first)?.tools.find((item) => item.slug === second);
    return tool
      ? { html: renderReaderLoading(tool), title: `${tool.title} · The Builder's Fieldnotes`, reader: { kind: "tool", summary: tool } }
      : { html: renderUnavailable("Tool note not found", "That tool is not part of the published library."), title: "Tool note not found" };
  }
  return { html: renderUnavailable("Page not found", "The address does not match a published fieldnote, guide, topic, or tool."), title: "Page not found" };
}

function updateNavigation(route: string): void {
  document.querySelectorAll<HTMLAnchorElement>("[data-nav-prefix]").forEach((link) => {
    const prefix = link.dataset.navPrefix ?? "";
    const routePath = `#${route}`;
    const active = routePath === prefix || (prefix !== "#/home" && routePath.startsWith(`${prefix}/`));
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const homeButton = document.querySelector<HTMLAnchorElement>("#navigation-home");
  if (route === "/home") homeButton?.setAttribute("aria-current", "page");
  else homeButton?.removeAttribute("aria-current");
  const backButton = document.querySelector<HTMLButtonElement>("#navigation-back");
  if (backButton) backButton.hidden = route === "/home";
}

function refreshIcons(root: HTMLElement | Document = document): void {
  createIcons({ icons, root, attrs: { "aria-hidden": "true", "stroke-width": "1.75" } });
}

function closeMenu(): void {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
  siteNavigation.removeAttribute("data-open");
}

function setupHomeCarousel(): void {
  const carousel = mainElement.querySelector<HTMLElement>("[data-home-carousel]");
  if (!carousel) return;

  const stage = carousel.querySelector<HTMLElement>("[data-home-carousel-stage]");
  const originalSlides = [...carousel.querySelectorAll<HTMLElement>("[data-home-carousel-slide]")];
  if (!originalSlides.length || !stage) return;

  const logicalCount = originalSlides.length;
  originalSlides.forEach((slide, logicalIndex) => {
    slide.dataset.carouselCopy = "middle";
    slide.dataset.logicalIndex = String(logicalIndex);
  });

  const createCopy = (copy: "before" | "after"): DocumentFragment => {
    const fragment = document.createDocumentFragment();
    originalSlides.forEach((slide, logicalIndex) => {
      const clone = slide.cloneNode(true) as HTMLElement;
      clone.dataset.carouselCopy = copy;
      clone.dataset.logicalIndex = String(logicalIndex);
      fragment.append(clone);
    });
    return fragment;
  };

  stage.prepend(createCopy("before"));
  stage.append(createCopy("after"));
  const slides = [...stage.querySelectorAll<HTMLElement>("[data-home-carousel-slide]")];

  let activeIndex = logicalCount;
  let scrollFrame = 0;
  let dragging = false;
  let pointerStartX = 0;
  let pointerStartScrollLeft = 0;
  let suppressClick = false;
  let isProgrammaticScroll = false;
  let programmaticScrollTimer = 0;
  let scrollSettleTimer = 0;
  let recenterFrame = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const update = (): void => {
    const activeLogicalIndex = slides[activeIndex]?.dataset.logicalIndex;
    slides.forEach((slide, index) => {
      const isActive = index === activeIndex;
      const isVisuallyActive = slide.dataset.logicalIndex === activeLogicalIndex;
      slide.dataset.position = isActive ? "active" : "inactive";
      slide.dataset.visualPosition = isVisuallyActive ? "active" : "inactive";
      slide.dataset.depth = isActive ? "spotlight" : index < activeIndex ? "before" : "after";
      slide.toggleAttribute("inert", !isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      const link = slide.querySelector<HTMLAnchorElement>(".home-carousel-card__link");
      if (link) {
        link.tabIndex = isActive ? 0 : -1;
        if (isActive) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      }
    });

    const selectedTitle = slides[activeIndex]?.querySelector("h2")?.textContent?.trim() ?? "";
    carousel.setAttribute("aria-label", `Tools and learning. Selected: ${selectedTitle}`);
  };

  const scrollToIndex = (index: number, behavior: ScrollBehavior): void => {
    const slide = slides[index];
    if (!slide) return;
    const left = slide.offsetLeft - (stage.clientWidth - slide.offsetWidth) / 2;
    stage.scrollTo({ left, behavior });
  };

  const recenterActiveSlide = (): void => {
    let middleIndex = activeIndex;
    if (activeIndex < logicalCount) middleIndex += logicalCount;
    else if (activeIndex >= logicalCount * 2) middleIndex -= logicalCount;
    if (middleIndex === activeIndex) return;

    const scrollShift = slides[middleIndex].offsetLeft - slides[activeIndex].offsetLeft;
    stage.classList.add("is-recentering");
    activeIndex = middleIndex;
    update();
    stage.scrollLeft += scrollShift;
    if (dragging) pointerStartScrollLeft += scrollShift;
    cancelAnimationFrame(recenterFrame);
    recenterFrame = requestAnimationFrame(() => stage.classList.remove("is-recentering"));
  };

  const selectNearestSlide = (): void => {
    let nearestIndex = activeIndex;
    let nearestDistance = Number.POSITIVE_INFINITY;
    slides.forEach((slide, index) => {
      const centeredScrollLeft = slide.offsetLeft - (stage.clientWidth - slide.offsetWidth) / 2;
      const distance = Math.abs(centeredScrollLeft - stage.scrollLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    if (nearestIndex !== activeIndex) {
      activeIndex = nearestIndex;
      update();
    }

    const edgeBuffer = Math.max(1, Math.floor(logicalCount / 2));
    if (activeIndex < edgeBuffer || activeIndex >= slides.length - edgeBuffer) recenterActiveSlide();
  };

  const finishProgrammaticScroll = (forceCenter = false): void => {
    if (!isProgrammaticScroll) return;
    window.clearTimeout(programmaticScrollTimer);
    stage.classList.add("is-recentering");
    if (forceCenter) scrollToIndex(activeIndex, "auto");
    isProgrammaticScroll = false;
    recenterActiveSlide();
    update();
    cancelAnimationFrame(recenterFrame);
    recenterFrame = requestAnimationFrame(() => stage.classList.remove("is-recentering"));
  };

  const centerActiveSlide = (): void => {
    isProgrammaticScroll = true;
    scrollToIndex(activeIndex, reduceMotion ? "auto" : "smooth");
    window.clearTimeout(programmaticScrollTimer);
    if (reduceMotion) finishProgrammaticScroll();
    else programmaticScrollTimer = window.setTimeout(() => finishProgrammaticScroll(true), 700);
  };

  const settleFreeScroll = (): void => {
    window.clearTimeout(scrollSettleTimer);
    if (dragging || isProgrammaticScroll) return;
    selectNearestSlide();
    centerActiveSlide();
  };

  const rotate = (direction: -1 | 1): void => {
    if (activeIndex + direction < 0 || activeIndex + direction >= slides.length) recenterActiveSlide();
    activeIndex += direction;
    update();
    centerActiveSlide();
  };

  stage.addEventListener("scroll", () => {
    if (isProgrammaticScroll || stage.classList.contains("is-recentering")) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(selectNearestSlide);
    window.clearTimeout(scrollSettleTimer);
    scrollSettleTimer = window.setTimeout(settleFreeScroll, 180);
  }, { passive: true });
  stage.addEventListener("scrollend", () => {
    if (stage.classList.contains("is-recentering")) return;
    if (isProgrammaticScroll) finishProgrammaticScroll();
    else settleFreeScroll();
  });
  stage.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    rotate(event.key === "ArrowLeft" ? -1 : 1);
  });
  const moveDrag = (event: MouseEvent): void => {
    if (!dragging) return;
    const distance = event.clientX - pointerStartX;
    if (Math.abs(distance) > 5) suppressClick = true;
    if (suppressClick) event.preventDefault();
    stage.scrollLeft = pointerStartScrollLeft - distance;
  };

  const finishDrag = (): void => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    document.removeEventListener("mousemove", moveDrag);
    document.removeEventListener("mouseup", finishDrag);
    selectNearestSlide();
    centerActiveSlide();
  };

  const interruptProgrammaticScroll = (): void => {
    if (!isProgrammaticScroll) return;
    window.clearTimeout(programmaticScrollTimer);
    isProgrammaticScroll = false;
    stage.scrollTo({ left: stage.scrollLeft, behavior: "auto" });
  };

  stage.addEventListener("wheel", interruptProgrammaticScroll, { passive: true });
  stage.addEventListener("touchstart", interruptProgrammaticScroll, { passive: true });

  stage.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    isProgrammaticScroll = false;
    window.clearTimeout(programmaticScrollTimer);
    dragging = true;
    pointerStartX = event.clientX;
    pointerStartScrollLeft = stage.scrollLeft;
    suppressClick = false;
    stage.classList.add("is-dragging");
    document.addEventListener("mousemove", moveDrag);
    document.addEventListener("mouseup", finishDrag);
  });
  stage.addEventListener("click", (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);

  stage.classList.add("is-recentering");
  update();
  scrollToIndex(activeIndex, "auto");
  cancelAnimationFrame(recenterFrame);
  recenterFrame = requestAnimationFrame(() => stage.classList.remove("is-recentering"));
}

function finishRoute(route: RouteState): void {
  refreshIcons(mainElement);
  if (route.anchor) {
    requestAnimationFrame(() => document.getElementById(route.anchor)?.scrollIntoView());
  } else if (hasRendered) {
    window.scrollTo({ top: 0, behavior: "instant" });
    mainElement.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }
  hasRendered = true;
}

async function renderRoute(): Promise<void> {
  const version = ++renderVersion;
  const route = parseRoute();
  const resolved = resolveRoute(route);
  mainElement.setAttribute("aria-busy", "true");
  mainElement.innerHTML = resolved.html;
  updateNavigation(route.path);
  closeMenu();
  refreshIcons(mainElement);
  document.title = resolved.title;

  if (resolved.reader) {
    try {
      let html: string;
      let hasMermaid: boolean;
      if (resolved.reader.kind === "article") {
        const record = await loadRecord<ArticleRecord>(resolved.reader.summary.recordFile);
        html = renderArticleReader(record);
        hasMermaid = record.hasMermaid;
      } else if (resolved.reader.kind === "chapter") {
        const record = await loadRecord<ChapterRecord>(resolved.reader.summary.recordFile);
        html = renderChapterReader(record);
        hasMermaid = record.hasMermaid;
      } else {
        const record = await loadRecord<ToolRecord>(resolved.reader.summary.recordFile);
        html = renderToolReader(record);
        hasMermaid = record.hasMermaid;
      }
      if (version !== renderVersion) return;
      mainElement.innerHTML = html;
      mainElement.setAttribute("aria-busy", "false");
      finishRoute(route);
      if (hasMermaid) {
        try {
          await renderDiagrams(mainElement);
        } catch (error) {
          console.error("Unable to render one or more diagrams.", error);
        }
      }
      return;
    } catch (error) {
      if (version !== renderVersion) return;
      console.error("Unable to load content record.", error);
      mainElement.innerHTML = renderReaderError(resolved.reader.summary.title);
      mainElement.setAttribute("aria-busy", "false");
      refreshIcons(mainElement);
      mainElement.querySelector<HTMLButtonElement>("#reader-retry")?.addEventListener("click", () => void renderRoute());
      hasRendered = true;
      return;
    }
  }

  mainElement.setAttribute("aria-busy", "false");

  const filterForm = mainElement.querySelector<HTMLFormElement>("#library-filters");
  filterForm?.addEventListener("change", () => {
    const formData = new FormData(filterForm);
    const nextQuery = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value !== "all") nextQuery.set(key, value);
    }
    window.location.hash = `#/library${nextQuery.size ? `?${nextQuery}` : ""}`;
  });

  setupHomeCarousel();
  finishRoute(route);
}

function shellMarkup(): string {
  return `
    <div id="app-shell">
      <a class="skip-link" href="#app-main">Skip to content</a>
      <header id="app-header">
        <div class="header-inner">
          <a id="app-header-brand" href="#/home" aria-label="The Builder's Fieldnotes home"><span class="brand-fox" aria-hidden="true">🦊</span><span>The Builder's Fieldnotes</span></a>
          <button class="icon-button menu-button" id="menu-toggle" type="button" aria-controls="site-navigation" aria-expanded="false" aria-label="Open navigation"><i data-lucide="menu"></i></button>
          <nav id="site-navigation" aria-label="Primary navigation">
            <a href="#/library" data-nav-prefix="#/library"><i data-lucide="library"></i><span>Library</span></a>
            <a href="#/learn" data-nav-prefix="#/learn"><i data-lucide="book-open"></i><span>Learning</span></a>
            <a href="#/tools" data-nav-prefix="#/tools"><i data-lucide="wrench"></i><span>Tools</span></a>
          </nav>
        </div>
      </header>

      <div id="app-floating-navigation"><div id="app-floating-navigation-controls"><a class="icon-button" id="navigation-home" href="#/home" aria-label="Go home"><i data-lucide="home"></i></a><button class="icon-button" id="navigation-back" type="button" aria-label="Go back"><i data-lucide="arrow-left"></i></button></div></div>

      <div id="app-main-fox-field" aria-hidden="true"><span class="crystal-fox crystal-fox--primary">🦊</span><span class="crystal-fox crystal-fox--middle">🦊</span><span class="crystal-fox crystal-fox--lower">🦊</span></div>

      <div id="app-content-layout">
        <main id="app-main" tabindex="-1"></main>
        <aside id="app-social-author-rail" aria-label="Shubhamm Jadhav, AI Dev">
          <div class="social-actions">
            <a id="social-linkedin-profile" class="social-button" href="https://www.linkedin.com/in/shubhamm-j-64285ab3" target="_blank" rel="noopener noreferrer" aria-label="Open LinkedIn profile" data-tooltip="LinkedIn profile"><span class="linkedin-mark" aria-hidden="true">in</span><span class="social-badge"><i data-lucide="user-round"></i></span></a>
            <a id="social-linkedin-group" class="social-button" href="https://www.linkedin.com/groups/14634066/" target="_blank" rel="noopener noreferrer" aria-label="Open LinkedIn group" data-tooltip="LinkedIn group"><span class="linkedin-mark" aria-hidden="true">in</span><span class="social-badge"><i data-lucide="users-round"></i></span></a>
          </div>
          <div class="author-identity">
            <p class="author-stack">Shubhamm Jadhav</p>
            <p class="author-role"><span>AI</span><span>DEV</span></p>
          </div>
          <span class="rail-eagle" aria-hidden="true">🦅</span>
        </aside>
      </div>

      <footer id="app-footer"><p class="footer-note">Notes on AI, systems, and useful software.</p><p class="footer-author">Shubhamm Jadhav</p><span class="footer-focus">AI | Copilot | Dynamics 365 | CRM</span></footer>

      <dialog id="app-info-ad-dialog" aria-labelledby="app-info-ad-title"><button class="icon-button dialog-close" type="button" aria-label="Close dialog"><i data-lucide="x"></i></button><p class="kicker">Fieldnote</p><h2 id="app-info-ad-title">A small update</h2><p>Announcements will appear here only when there is something useful to say.</p></dialog>
    </div>`;
}

export function startApplication(root: HTMLDivElement): void {
  root.innerHTML = shellMarkup();
  mainElement = root.querySelector<HTMLElement>("#app-main")!;
  menuButton = root.querySelector<HTMLButtonElement>("#menu-toggle")!;
  siteNavigation = root.querySelector<HTMLElement>("#site-navigation")!;

  refreshIcons(root);
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!open));
    siteNavigation.toggleAttribute("data-open", !open);
    menuButton.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
  });
  root.querySelector<HTMLButtonElement>("#navigation-back")?.addEventListener("click", () => window.history.back());
  siteNavigation.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) closeMenu();
  });
  window.addEventListener("hashchange", () => void renderRoute());

  if (!window.location.hash) window.location.replace("#/home");
  else void renderRoute();
}