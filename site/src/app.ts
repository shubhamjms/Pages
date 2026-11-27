import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Home,
  LayoutGrid,
  Library,
  Maximize2,
  Menu,
  Newspaper,
  RotateCcw,
  UserRound,
  UsersRound,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
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
  ArrowUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Home,
  LayoutGrid,
  Library,
  Maximize2,
  Menu,
  Newspaper,
  RotateCcw,
  UserRound,
  UsersRound,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
};

let mainElement: HTMLElement;
let menuButton: HTMLButtonElement;
let siteNavigation: HTMLElement;
let readerImageDialog: HTMLDialogElement | null = null;
let readerImageViewport: HTMLElement | null = null;
let readerImageElement: HTMLImageElement | null = null;
let readerImageStatus: HTMLElement | null = null;
let readerImageTrigger: HTMLElement | null = null;
let readerImageScale = 1;
let readerImageFitScale = 1;
let readerImagePinchDistance = 0;
let readerImagePinchScale = 1;
const readerImagePointers = new Map<number, { x: number; y: number }>();
let hasRendered = false;
let renderVersion = 0;
let roadmapDiagramObserver: ResizeObserver | null = null;
let roadmapDiagramRefresh: (() => void) | null = null;
let roadmapPartObserver: IntersectionObserver | null = null;
let roadmapNavigation: { path: string; moveTo: (anchor: string) => boolean } | null = null;
const roadmapPartRenders = new WeakMap<HTMLElement, Promise<void>>();
const codeFoxBlogsUrl = `${import.meta.env.BASE_URL}codefox-blogs/`;

interface HomeCarouselItem {
  title: string;
  summary: string;
  route: string;
  label: string;
  detail: string;
  action: string;
  kind: "general" | "tool" | "learning" | "blogs";
  icon: "book-open" | "layout-grid" | "users-round" | "wrench";
}

interface RoadmapPartView {
  heading: HTMLHeadingElement;
  panel: HTMLElement;
  trigger: HTMLButtonElement;
  core: boolean;
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

function guideStats(guide: GuideSummary): string {
  return `
    <dl class="stat-line" aria-label="Guide details">
      ${guide.presentation === "roadmap"
        ? "<div><dt>Content</dt><dd>Roadmap</dd></div><div><dt>Lessons</dt><dd>Planned</dd></div>"
        : `<div><dt>Parts</dt><dd>${guide.partCount}</dd></div><div><dt>Chapters</dt><dd>${guide.chapterCount}</dd></div>`}
      <div><dt>Reading</dt><dd>${guide.readingTime} min</dd></div>
    </dl>`;
}

function guideFeature(guide: GuideSummary): string {
  const firstChapter = guide.parts[0]?.chapters[0];
  return `
    <article class="learning-feature">
      <div>
        <p class="kicker">${guide.presentation === "roadmap" ? "Learning roadmap" : "Structured learning"}</p>
        <h3><a href="${guide.route}">${escapeHtml(guide.title)}</a></h3>
        <p>${escapeHtml(guide.summary)}</p>
      </div>
      ${guideStats(guide)}
      <div class="action-row">
        ${firstChapter ? `<a class="button-link" href="${firstChapter.route}">Start guide <i data-lucide="arrow-right"></i></a>` : ""}
        <a class="quiet-link" href="${guide.route}">${guide.presentation === "roadmap" ? "Explore roadmap" : "View contents"}</a>
      </div>
    </article>`;
}

function toolFeature(tool: ToolSummary): string {
  return `
    <article class="tool-feature">
      ${toolCardMark(tool)}
      <div>
        <p class="metadata">${escapeHtml(displayLabel(tool.kind))} · ${escapeHtml(tool.status)}</p>
        <h3><a href="${tool.route}">${escapeHtml(tool.title)}</a></h3>
        <p>${escapeHtml(tool.summary)}</p>
      </div>
      <a class="text-link" href="${tool.route}">Open tool note <i data-lucide="arrow-right"></i></a>
    </article>`;
}

function toolCardMark(tool: ToolSummary): string {
  return `<span class="tool-mark${tool.titleImage ? " tool-mark--image" : ""}" aria-hidden="true">${tool.titleImage ? `<img src="${escapeHtml(tool.titleImage)}" alt="" width="48" height="48">` : '<i data-lucide="wrench"></i>'}</span>`;
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
      label: guide.presentation === "roadmap" ? "Learning roadmap" : "Learning course",
      detail: guide.presentation === "roadmap" ? "Roadmap only · Lessons planned" : `${guide.chapterCount} chapters · ${guide.readingTime} min`,
      action: guide.presentation === "roadmap" ? "Explore roadmap" : "Open course",
      kind: "learning" as const,
      icon: "book-open" as const,
    })),
    {
      title: "CodeFox Community Hub",
      summary: "Community-written articles on AI, GitHub Copilot, Dynamics 365, and practical builder workflows.",
      route: codeFoxBlogsUrl,
      label: "Blogs · Community publication",
      detail: "1 story · Author interest open",
      action: "Open blogs",
      kind: "blogs",
      icon: "users-round",
    },
  ];

  return `
    <div class="view view-home view-home--simple" id="view-home">
      <section class="home-carousel-section" aria-labelledby="home-title">
        <header class="home-carousel-header">
          <p class="kicker">Field kit</p>
          <h1 id="home-title" tabindex="-1">Tools, learning &amp; blogs</h1>
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

function pageHeader(kicker: string, title: string, summary: string, metadata = "", brand?: { image: string; label: string; slug: string }): string {
  return `
    <header class="page-header">
      <p class="kicker">${escapeHtml(kicker)}</p>
      <h1${brand ? ' class="page-header__branded-title"' : ""} tabindex="-1">${brand ? `<span class="page-header__brand page-header__brand--${brand.slug}"><img src="${brand.image}" alt="" width="64" height="64"></span><span>${escapeHtml(title)}</span>` : escapeHtml(title)}</h1>
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

function renderArticles(): string {
  const articles = contentIndex.linkedinArticles;
  return `
    <div class="view collection-view" id="view-articles">
      ${pageHeader("Article archive", "Articles from LinkedIn", "A chronological index of writing on AI, GitHub Copilot, Dynamics 365, and practical development.", `${articles.length} published articles`)}
      <section class="content-section linkedin-articles-section" aria-labelledby="linkedin-articles-title">
        <div class="section-heading-row section-heading-row--compact">
          <div><p class="kicker">Original publications</p><h2 id="linkedin-articles-title">All articles</h2></div>
        </div>
        <ol class="linkedin-article-list">
          ${articles
            .map(
              (article, index) => `
                <li class="linkedin-article-item">
                  <a class="linkedin-article-cover" href="${article.linkedinUrl}" target="_blank" rel="noopener noreferrer" aria-label="Read ${escapeHtml(article.title)} on LinkedIn">
                    <img src="${article.coverImage}" alt="${escapeHtml(article.title)} cover" loading="lazy">
                  </a>
                  <div class="linkedin-article-body">
                    <div class="linkedin-article-meta">
                      <span class="linkedin-article-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
                      <time datetime="${article.published}">${escapeHtml(formatDate(article.published))}</time>
                    </div>
                    <h3><a href="${article.linkedinUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a></h3>
                    <a class="text-link" href="${article.linkedinUrl}" target="_blank" rel="noopener noreferrer" aria-label="Read ${escapeHtml(article.title)} on LinkedIn">Read on LinkedIn <i data-lucide="external-link"></i></a>
                  </div>
                </li>`,
            )
            .join("")}
        </ol>
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
    <article class="guide-card${guide.presentation === "roadmap" ? " guide-card--roadmap" : ""}">
      <p class="metadata">${escapeHtml(displayLabel(guide.level))}${guide.presentation === "roadmap" ? " · Roadmap only" : ""}</p>
      <h2><a href="${guide.route}">${escapeHtml(guide.title)}</a></h2>
      <p>${escapeHtml(guide.summary)}</p>
      ${guideStats(guide)}
      <div class="action-row"><a class="button-link" href="${guide.route}">${guide.presentation === "roadmap" ? "Explore roadmap" : "View guide"} <i data-lucide="arrow-right"></i></a>${firstChapter ? `<a class="quiet-link" href="${firstChapter.route}">Start reading</a>` : ""}</div>
    </article>`;
}

function renderLearning(): string {
  const guides = [...contentIndex.guides].sort((left, right) => Number(right.featured) - Number(left.featured) || left.title.localeCompare(right.title));
  return `<div class="view collection-view" id="view-learning">${pageHeader("Learning", "Guides for building with judgment", "Explore structured guides and roadmaps, from first principles to working patterns.", `${guides.length} published learning ${guides.length === 1 ? "path" : "paths"}`)}<section class="content-section guide-grid" aria-label="Published learning paths">${guides.map(guideCard).join("")}</section></div>`;
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
  if (guide.presentation === "roadmap") {
    return `
      <div class="view guide-view roadmap-view" id="view-learning-${guide.slug}">
        ${pageHeader("Learning roadmap", guide.title, guide.summary, `Roadmap only · Updated ${formatDate(guide.updated)}`)}
        <section class="roadmap-notice" aria-label="Learning path availability">
          <span class="roadmap-badge">Roadmap available</span>
          <p>Lessons and labs are planned, not published yet. Choose a small part box to see its topic points below.</p>
        </section>
        ${readerLayout(guide.route, guide.headings, guide.introductionHtml)}
      </div>`;
  }
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
      <div class="tool-card__top">${toolCardMark(tool)}<span class="status-label">${escapeHtml(tool.status)}</span></div>
      <p class="metadata">${escapeHtml(displayLabel(tool.kind))} · ${escapeHtml(tool.platforms.slice(0, 2).map(displayLabel).join(" / "))}</p>
      <h3><a href="${tool.route}">${escapeHtml(tool.title)}</a></h3><p>${escapeHtml(tool.summary)}</p>
      <a class="text-link" href="${tool.route}">View tool note <i data-lucide="arrow-right"></i></a>
    </article>`;
}

function toolCategoryBrand(category: ToolCategoryRecord): { image: string; label: string; slug: string } | undefined {
  return category.slug === "vs-code"
    ? { image: "./brands/visual-studio-code.png", label: "Visual Studio Code", slug: "vs-code" }
    : category.slug === "edge"
      ? { image: "./brands/microsoft-edge.svg", label: "Microsoft Edge", slug: "edge" }
      : undefined;
}

function categoryCard(category: ToolCategoryRecord): string {
  const brand = toolCategoryBrand(category);
  return `
    <article class="category-card">
      <div class="category-card__top">
        ${brand ? `<span class="category-card__brand category-card__brand--${category.slug}"><img src="${brand.image}" alt="${brand.label}" width="44" height="44"></span>` : ""}
        <p class="metadata">${category.toolCount} ${category.toolCount === 1 ? "tool" : "tools"} · Updated ${formatDate(category.updated)}</p>
      </div>
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
  const brand = toolCategoryBrand(category);
  return `
    <div class="view collection-view" id="view-tool-${category.slug}">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/tools">Tools</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(category.title)}</span></nav>
      ${pageHeader("Tool category", category.title, category.summary, `${category.toolCount} ${category.toolCount === 1 ? "tool" : "tools"} · Updated ${formatDate(category.updated)}`, brand)}
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
  const links = Object.entries(tool.links).filter(([key]) => key !== "video" && !key.endsWith("-video"));
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
  const videos = Object.entries(tool.links)
    .filter(([key]) => key === "video" || key.endsWith("-video"))
    .flatMap(([key, value]) => {
      const link = typeof value === "string" ? { label: displayLabel(key), url: value } : value;
      const videoId = youtubeVideoId(link.url);
      return videoId ? [{ ...link, videoId, embedHost: key === "youtube-video" ? "https://www.youtube.com" : "https://www.youtube-nocookie.com" }] : [];
    });
  if (!videos.length) return "";
  const multipleVideos = videos.length > 1;
  return `
    <section class="tool-video" aria-labelledby="tool-video-title">
      <div class="tool-video__heading"><p class="kicker">Watch the extension</p><h2 id="tool-video-title">${multipleVideos ? "Video walkthroughs" : "Video overview"}</h2></div>
      <div class="tool-video__grid">
        ${videos.map((video) => `
          <article class="tool-video__item">
            <div class="tool-video__frame">
              <iframe src="${video.embedHost}/embed/${video.videoId}?playsinline=1&amp;rel=0&amp;origin=${encodeURIComponent(window.location.origin)}" title="${escapeHtml(video.label)}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
            </div>
            <p>${escapeHtml(video.label)}</p>
          </article>`).join("")}
      </div>
    </section>`;
}

function toolReleaseNotice(tool: ToolRecord): string {
  if (!tool.version || !tool.latestReleaseSummary) return "";
  return `
    <aside class="tool-release-notice" aria-label="Latest release">
      <span class="tool-release-notice__icon" aria-hidden="true">NEW</span>
      <div><strong>Version ${escapeHtml(tool.version)} is available</strong><p>${escapeHtml(tool.latestReleaseSummary)}</p></div>
      <button type="button" data-tool-tab-target="releases">Read release notes <i data-lucide="arrow-right"></i></button>
    </aside>`;
}

function insertAfterOverviewHeading(html: string, markup: string): string {
  const headingStart = html.indexOf('<h2 id="overview">');
  if (headingStart === -1) return `${markup}${html}`;
  const headingEnd = html.indexOf("</h2>", headingStart);
  if (headingEnd === -1) return `${markup}${html}`;
  const insertionPoint = headingEnd + "</h2>".length;
  return `${html.slice(0, insertionPoint)}${markup}${html.slice(insertionPoint)}`;
}

function renderProductToolContent(tool: ToolRecord, facts: string): string {
  const releaseMarker = '<h2 id="release-notes">';
  const roadmapMarker = '<h2 id="roadmap">';
  const releaseStart = tool.html.indexOf(releaseMarker);
  const roadmapStart = tool.html.indexOf(roadmapMarker);
  if (releaseStart === -1 || roadmapStart === -1 || roadmapStart <= releaseStart) {
    return readerLayout(tool.route, tool.headings, tool.html, facts);
  }

  const releaseHeadingIndex = tool.headings.findIndex((heading) => heading.id === "release-notes");
  const roadmapHeadingIndex = tool.headings.findIndex((heading) => heading.id === "roadmap");
  const overviewHtml = insertAfterOverviewHeading(tool.html.slice(0, releaseStart), toolReleaseNotice(tool));
  const releaseHtml = tool.html.slice(releaseStart, roadmapStart);
  const roadmapHtml = tool.html.slice(roadmapStart);
  const overviewHeadings = tool.headings.slice(0, releaseHeadingIndex);
  const releaseHeadings = tool.headings.slice(releaseHeadingIndex, roadmapHeadingIndex);
  const roadmapHeadings = tool.headings.slice(roadmapHeadingIndex);
  const releaseFacts = `
    <section class="reader-facts" aria-label="Latest release details">
      <p class="kicker">Latest release</p>
      <dl>${tool.version ? `<div><dt>Version</dt><dd>${escapeHtml(tool.version)}</dd></div>` : ""}<div><dt>Released</dt><dd>${formatDate(tool.updated)}</dd></div><div><dt>Channel</dt><dd>${escapeHtml(displayLabel(tool.status))}</dd></div></dl>
    </section>`;
  const roadmapFacts = `
    <section class="reader-facts tool-roadmap-note" aria-label="Roadmap guidance">
      <p class="kicker">Roadmap status</p>
      <p class="metadata">Backlog ideas are directional and do not represent committed release dates.</p>
    </section>`;

  return `
    <nav class="tool-product-tabs" role="tablist" aria-label="Extension information">
      <button id="tool-tab-overview" type="button" role="tab" aria-selected="true" aria-controls="tool-panel-overview" data-tool-tab-target="overview">Overview</button>
      <button id="tool-tab-releases" type="button" role="tab" aria-selected="false" aria-controls="tool-panel-releases" data-tool-tab-target="releases">Release notes</button>
      <button id="tool-tab-roadmap" type="button" role="tab" aria-selected="false" aria-controls="tool-panel-roadmap" data-tool-tab-target="roadmap">Roadmap</button>
    </nav>
    <div id="tool-panel-overview" class="tool-product-panel" role="tabpanel" aria-labelledby="tool-tab-overview" data-tool-panel="overview">
      ${readerLayout(tool.route, overviewHeadings, overviewHtml, facts)}
    </div>
    <div id="tool-panel-releases" class="tool-product-panel" role="tabpanel" aria-labelledby="tool-tab-releases" data-tool-panel="releases" hidden>
      ${readerLayout(tool.route, releaseHeadings, releaseHtml, releaseFacts)}
    </div>
    <div id="tool-panel-roadmap" class="tool-product-panel" role="tabpanel" aria-labelledby="tool-tab-roadmap" data-tool-panel="roadmap" hidden>
      ${readerLayout(tool.route, roadmapHeadings, roadmapHtml, roadmapFacts)}
    </div>`;
}

function toolPlatformBrand(tool: ToolRecord): string {
  if (tool.platforms.includes("vscode")) {
    return '<p class="kicker tool-platform-brand"><img src="./brands/visual-studio-code.png" alt="" width="24" height="24"><span>Visual Studio Code extension</span></p>';
  }
  if (tool.platforms.includes("edge")) {
    return '<p class="kicker tool-platform-brand"><img src="./brands/microsoft-edge.svg" alt="" width="24" height="24"><span>Microsoft Edge extension</span></p>';
  }
  return `<p class="kicker">${escapeHtml(tool.categoryTitle)}</p>`;
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
    <div class="view reader-view reader-view--tool${tool.presentation === "product" ? " reader-view--product" : ""}" id="view-tool-${tool.categorySlug}-${tool.slug}">
      ${breadcrumbMarkup([{ label: "Tools", route: "#/tools" }, { label: tool.categoryTitle, route: category?.route }, { label: tool.title }])}
      <header class="reader-header reader-header--tool${tool.titleImage ? " reader-header--tool-image" : ""}">
        <div class="tool-title-mark${tool.titleImage ? " tool-title-mark--image" : ""}" aria-hidden="true">${tool.titleImage ? `<img src="${escapeHtml(tool.titleImage)}" alt="" width="256" height="256">` : '<i data-lucide="wrench"></i>'}</div>
        <div>${toolPlatformBrand(tool)}<h1 tabindex="-1">${escapeHtml(tool.title)}</h1><p class="reader-deck">${escapeHtml(tool.summary)}</p><div class="tag-list" aria-label="Supported platforms">${tool.platforms.map((platform) => `<span>${escapeHtml(displayLabel(platform))}</span>`).join("")}</div>${externalToolLinks(tool)}</div>
      </header>
      ${toolVideo(tool)}
      ${tool.presentation === "product" ? renderProductToolContent(tool, facts) : readerLayout(tool.route, tool.headings, tool.html, facts)}
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
  const available = (node: HTMLElement): boolean =>
    node.isConnected && node.dataset.processed !== "true" && node.dataset.roadmapDeferred !== "true" &&
    node.dataset.diagramRendering !== "true" && !node.closest(".roadmap-details[hidden]");
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".mermaid")).filter(available);
  if (!nodes.length) return;
  const version = renderVersion;
  const { default: mermaid } = await import("mermaid");
  if (version !== renderVersion) return;
  const activeNodes = nodes.filter(available);
  if (!activeNodes.length) return;
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
  const sources = activeNodes.map((node) => ({ node, code: node.textContent ?? "" }));
  activeNodes.forEach((node) => { node.dataset.diagramRendering = "true"; });
  const restoreHidden = (): void => {
    for (const { node, code } of sources) {
      if (node.closest(".roadmap-details[hidden]")) {
        node.textContent = code;
        node.removeAttribute("data-processed");
      }
    }
  };
  try {
    await mermaid.run({ nodes: activeNodes });
  } catch (error) {
    restoreHidden();
    if (version !== renderVersion || !activeNodes.some((node) => node.isConnected && !node.closest(".roadmap-details[hidden]"))) return;
    throw error;
  } finally {
    activeNodes.forEach((node) => { delete node.dataset.diagramRendering; });
    if (version === renderVersion) roadmapDiagramRefresh?.();
  }
  restoreHidden();
  if (version === renderVersion) setupRoadmapDiagramTargets(root);
}

function renderRoadmapPart(panel: HTMLElement): Promise<void> {
  const pending = roadmapPartRenders.get(panel);
  if (pending) return pending;
  panel.querySelectorAll<HTMLElement>(".mermaid").forEach((node) => { delete node.dataset.roadmapDeferred; });
  roadmapPartObserver?.unobserve(panel);
  const rendering = renderDiagrams(panel).catch((error) => {
    if (panel.isConnected && !panel.hidden) showDiagramError(panel, error);
  }).finally(() => {
    roadmapPartRenders.delete(panel);
  });
  roadmapPartRenders.set(panel, rendering);
  return rendering;
}

function setupRoadmapPartObserver(): void {
  const panels = mainElement.querySelectorAll<HTMLElement>(".roadmap-details--core");
  if (!panels.length) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.target instanceof HTMLElement) void renderRoadmapPart(entry.target);
    }
  }, { rootMargin: "400px 0px" });
  roadmapPartObserver = observer;
  panels.forEach((panel) => {
    if (panel.querySelector('[data-roadmap-deferred="true"]')) observer.observe(panel);
  });
}

function setupRoadmapOverview(anchor: string): ((anchor: string) => boolean) | undefined {
  const view = mainElement.querySelector<HTMLElement>(".roadmap-view");
  if (!view) return;
  const prose = view.querySelector<HTMLElement>(".reader-prose");
  const title = view.querySelector("h1")?.textContent?.trim();
  const diagram = prose?.querySelector<HTMLElement>(".mermaid-shell");
  if (!prose || !title || !diagram) throw new Error("The roadmap is missing its title, content, or diagram.");
  const headings = [...prose.children].filter((element): element is HTMLHeadingElement =>
    element instanceof HTMLHeadingElement && element.tagName === "H2",
  );
  const firstStageTitle = headings.find((heading) => /^\d+\s*-\s+/.test(heading.textContent ?? ""))?.textContent?.trim();
  if (!firstStageTitle) {
    throw new Error("The roadmap requires numbered section headings.");
  }

  const sections = headings.map((heading) => {
    const content: Element[] = [];
    for (let node = heading.nextElementSibling; node && !(node instanceof HTMLHeadingElement && node.tagName === "H2"); node = node.nextElementSibling) {
      content.push(node);
    }
    return { heading, content };
  });
  const areas = sections.flatMap(({ heading, content }) => {
    const partHeadings = content.filter((element): element is HTMLHeadingElement =>
      element instanceof HTMLHeadingElement && element.tagName === "H3",
    );
    if (!partHeadings.length) {
      if (/^\d+\s*-\s+/.test(heading.textContent ?? "")) {
        throw new Error(`Roadmap section "${heading.textContent}" has no parts.`);
      }
      return [];
    }
    const parts = partHeadings.map((partHeading) => {
      const partContent: Element[] = [];
      for (let node = partHeading.nextElementSibling; node && !(node instanceof HTMLHeadingElement && ["H2", "H3"].includes(node.tagName)); node = node.nextElementSibling) {
        partContent.push(node);
      }
      const partTitle = partHeading.textContent?.trim();
      if (!partTitle || !partHeading.id || !partContent.some((element) => element instanceof HTMLUListElement || element instanceof HTMLOListElement)) {
        throw new Error("Each roadmap part requires a title, an anchor, and topic points.");
      }
      return { heading: partHeading, title: partTitle, content: partContent };
    });
    return [{ heading, core: /^\d+\s*-\s+/.test(heading.textContent ?? ""), intro: content.slice(0, content.indexOf(partHeadings[0])), parts }];
  });

  const overview = document.createElement("div");
  overview.id = "roadmap-overview";
  overview.className = "roadmap-overview";
  overview.tabIndex = -1;
  overview.setAttribute("role", "group");
  overview.setAttribute("aria-label", "Roadmap part overview");
  overview.dataset.roadmapStartStage = firstStageTitle.replace(/\s+/g, "");
  const controls = document.createElement("div");
  controls.className = "roadmap-diagram-controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Main diagram controls");
  controls.innerHTML = `
    <button class="icon-button" type="button" data-roadmap-action="zoom-out" aria-label="Zoom out main diagram" title="Zoom out" disabled><i data-lucide="zoom-out"></i></button>
    <output class="roadmap-zoom-status" aria-label="Main diagram zoom level" aria-live="polite">100%</output>
    <button class="icon-button" type="button" data-roadmap-action="zoom-in" aria-label="Zoom in main diagram" title="Zoom in" disabled><i data-lucide="zoom-in"></i></button>
    <button class="button-link" type="button" data-roadmap-action="reset" title="Reset zoom and center Stage 1" disabled>Reset view</button>`;
  diagram.before(overview);
  overview.append(controls, diagram);
  const details = document.createElement("div");
  details.className = "roadmap-details-container roadmap-optional-details";
  overview.after(details);
  const partViews: RoadmapPartView[] = [];

  const routePath = parseRoute().path;
  const routePrefix = `#${routePath}`;
  let navigationVersion = 0;
  const selectOptionalPart = (selected: RoadmapPartView | null): void => {
    for (const part of partViews.filter((part) => !part.core)) {
      part.panel.hidden = part !== selected;
      part.trigger.setAttribute("aria-expanded", String(part === selected));
    }
  };
  const closePart = (part: RoadmapPartView): void => {
    selectOptionalPart(null);
    if (part.trigger.hidden) overview.focus();
    else part.trigger.focus();
  };
  const moveTo = (id: string): boolean => {
    const target = id ? document.getElementById(id) : view.querySelector<HTMLElement>("h1");
    if (!(target instanceof HTMLElement) || !view.contains(target)) return false;
    const part = partViews.find((part) => part.panel.contains(target));
    selectOptionalPart(part && !part.core ? part : null);
    for (const item of partViews.filter((item) => item.core)) {
      if (item === part) item.trigger.setAttribute("aria-current", "location");
      else item.trigger.removeAttribute("aria-current");
    }
    const destination = part && target.classList.contains("roadmap-stage-anchor") ? part.heading : target;
    const version = ++navigationVersion;
    destination.tabIndex = -1;
    destination.focus({ preventScroll: true });
    destination.scrollIntoView({ behavior: "instant", block: "start" });
    if (part) {
      void renderRoadmapPart(part.panel).then(() => {
        if (view.isConnected && version === navigationVersion && document.activeElement === destination) {
          destination.scrollIntoView({ behavior: "instant", block: "start" });
        }
      });
    }
    return true;
  };
  const visitAnchor = (id: string): void => {
    if (!moveTo(id)) throw new Error(`Roadmap destination "${id}" is missing.`);
    const hash = `${routePrefix}#${encodeURIComponent(id)}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  };
  const backFooter = (): HTMLElement => {
    const footer = document.createElement("footer");
    footer.className = "roadmap-details-footer";
    const link = document.createElement("a");
    link.className = "button-link roadmap-back-link";
    link.href = `${routePrefix}#${overview.id}`;
    link.innerHTML = '<i data-lucide="arrow-up"></i> Back to roadmap';
    footer.append(link);
    return footer;
  };

  areas.forEach((area) => {
    let stage: HTMLElement | null = null;
    if (area.core) {
      stage = document.createElement("section");
      stage.className = "roadmap-stage";
      stage.dataset.roadmapStage = area.heading.textContent?.match(/^\d+/)?.[0];
      stage.setAttribute("aria-labelledby", area.heading.id);
      area.heading.before(stage);
      const header = document.createElement("header");
      header.className = "roadmap-stage-header";
      const range = document.createElement("p");
      range.className = "kicker";
      range.textContent = `${area.parts.length} planned parts | ${area.parts[0].title.match(/^\d+/)?.[0]}-${area.parts.at(-1)?.title.match(/^\d+/)?.[0]}`;
      area.heading.prepend("Stage ");
      area.heading.tabIndex = -1;
      header.append(range, area.heading, ...area.intro);
      stage.append(header);
    } else {
      area.heading.remove();
    }
    area.parts.forEach((part, partIndex) => {
      const panel = document.createElement("section");
      panel.id = `roadmap-details-${part.heading.id}`;
      panel.className = `roadmap-details${area.core ? " roadmap-details--core" : ""}`;
      panel.hidden = !area.core;
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", part.heading.id);
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "roadmap-part-button";
      trigger.hidden = true;
      trigger.dataset.roadmapPart = part.heading.id;
      if (!area.core) trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-controls", panel.id);
      trigger.setAttribute("aria-label", `${part.title}: ${area.core ? "go to part" : "view topic points"}`);
      const number = part.title.match(/^(\d+)\s*-\s+/)?.[1];
      if (number) trigger.dataset.roadmapNumber = number;
      trigger.dataset.roadmapLabel = part.title.replace(/\s+/g, "");
      trigger.title = part.title;
      overview.append(trigger);
      if (!area.core && partIndex === 0) {
        const stageAnchor = document.createElement("span");
        stageAnchor.id = area.heading.id;
        stageAnchor.className = "roadmap-stage-anchor";
        stageAnchor.setAttribute("aria-hidden", "true");
        panel.append(stageAnchor);
      }
      const header = document.createElement("div");
      header.className = "roadmap-details-header";
      part.heading.tabIndex = -1;
      header.append(part.heading);
      const close = area.core ? null : document.createElement("button");
      if (close) {
        close.type = "button";
        close.className = "quiet-link roadmap-close";
        close.textContent = "Close";
        close.setAttribute("aria-label", "Close topic points");
        header.append(close);
      }
      const body = document.createElement("div");
      body.className = "roadmap-details-body";
      const visual = document.createElement("div");
      visual.className = "roadmap-details-visual";
      visual.setAttribute("role", "group");
      visual.setAttribute("aria-label", "Part concept diagram");
      const points = document.createElement("div");
      points.className = "roadmap-details-points";
      const notes = document.createElement("div");
      notes.className = "roadmap-details-notes";
      const content = !area.core && partIndex === 0 ? [...area.intro, ...part.content] : part.content;
      for (const node of content) {
        if (node.classList.contains("mermaid-shell")) {
          if (area.core) {
            node.querySelectorAll<HTMLElement>(".mermaid").forEach((diagram) => { diagram.dataset.roadmapDeferred = "true"; });
          }
          visual.append(node);
        } else if (node instanceof HTMLParagraphElement) {
          if (node.textContent?.trim() === "Planned topics:") {
            node.remove();
          } else {
            const label = node.textContent?.trim().match(/^(Prerequisites|Practice goal|Readiness check):/)?.[1];
            if (label) {
              const note = document.createElement("div");
              note.className = "roadmap-note";
              note.dataset.roadmapNote = label.toLowerCase().replace(/\s+/g, "-");
              note.append(node);
              notes.append(note);
            } else {
              points.append(node);
            }
          }
        } else {
          points.append(node);
        }
      }
      if (!visual.children.length) {
        visual.hidden = true;
        body.classList.add("roadmap-details-body--text-only");
      }
      body.append(visual, points);
      panel.append(header, body, notes);
      if (area.core) panel.append(backFooter());
      (stage ?? details).append(panel);
      const partView = { heading: part.heading, panel, trigger, core: area.core };
      partViews.push(partView);
      trigger.addEventListener("click", () => {
        if (area.core) visitAnchor(part.heading.id);
        else if (panel.hidden) moveTo(part.heading.id);
        else closePart(partView);
      });
      close?.addEventListener("click", () => closePart(partView));
    });
    if (stage) {
      const sectionIndex = sections.findIndex((section) => section.heading === area.heading);
      for (const reference of sections.slice(sectionIndex + 1)) {
        if (areas.some((area) => area.heading === reference.heading)) break;
        const block = document.createElement("section");
        block.className = "roadmap-stage-reference";
        block.setAttribute("aria-labelledby", reference.heading.id);
        reference.heading.tabIndex = -1;
        block.append(reference.heading, ...reference.content);
        if (/completion exercise/i.test(reference.heading.textContent ?? "")) block.append(backFooter());
        stage.append(block);
      }
    }
  });
  details.addEventListener("keydown", (event) => {
    const selected = partViews.find((part) => !part.core && !part.panel.hidden);
    if (event.key === "Escape" && selected) {
      event.preventDefault();
      closePart(selected);
    }
  });
  const anchoredElement = anchor ? document.getElementById(anchor) : null;
  const anchoredPart = partViews.find((part) => part.panel.contains(anchoredElement));
  if (anchoredPart) {
    if (!anchoredPart.core) selectOptionalPart(anchoredPart);
    anchoredPart.panel.querySelectorAll<HTMLElement>(".mermaid").forEach((node) => { delete node.dataset.roadmapDeferred; });
  }
  roadmapNavigation = { path: routePath, moveTo };
  view.addEventListener("click", (event) => {
    if (!(event instanceof MouseEvent) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a") : null;
    const href = link?.getAttribute("href");
    if (!href?.startsWith(`${routePrefix}#`) || link?.hasAttribute("download") || (link?.target && link.target !== "_self")) return;
    const id = decodeURIComponent(href.slice(routePrefix.length + 1));
    if (!view.contains(document.getElementById(id))) return;
    event.preventDefault();
    visitAnchor(id);
  });
  return moveTo;
}

function setupRoadmapDiagramTargets(root: HTMLElement): void {
  const overview = root.querySelector<HTMLElement>(".roadmap-overview");
  if (!overview) return;
  const viewport = overview.querySelector<HTMLElement>(".mermaid-shell");
  const canvas = overview.querySelector<HTMLElement>(".mermaid");
  const svg = canvas?.querySelector<SVGSVGElement>("svg");
  const zoomOut = overview.querySelector<HTMLButtonElement>('[data-roadmap-action="zoom-out"]');
  const zoomIn = overview.querySelector<HTMLButtonElement>('[data-roadmap-action="zoom-in"]');
  const reset = overview.querySelector<HTMLButtonElement>('[data-roadmap-action="reset"]');
  const status = overview.querySelector<HTMLOutputElement>(".roadmap-zoom-status");
  if (!viewport || !canvas || !svg || !zoomOut || !zoomIn || !reset || !status) {
    throw new Error("The roadmap diagram and its controls could not be initialized.");
  }
  const firstStage = [...svg.querySelectorAll<SVGGElement>(".cluster")].find((stage) =>
    stage.querySelector(".cluster-label")?.textContent?.trim().replace(/^Stage\s*/i, "").replace(/\s+/g, "") === overview.dataset.roadmapStartStage,
  );
  if (!firstStage) throw new Error("The roadmap's first stage is missing from the diagram.");
  const baseWidth = Math.max(1100, svg.viewBox.baseVal.width / 2);
  let zoom = 1;
  svg.style.maxWidth = "none";
  const buttons = [...overview.querySelectorAll<HTMLButtonElement>(".roadmap-part-button")];
  const targets: Array<{ node: SVGGElement; button: HTMLButtonElement }> = [];
  for (const node of svg.querySelectorAll<SVGGElement>(".node")) {
    const number = node.textContent?.trim().match(/^(\d{2})\s*-/)?.[1];
    const label = node.textContent?.replace(/\s+/g, "");
    const button = buttons.find((item) => number
      ? item.dataset.roadmapNumber === number
      : item.dataset.roadmapLabel === label,
    );
    if (!button) {
      if (number) throw new Error(`Roadmap diagram part ${number} has no matching topic points.`);
      continue;
    }
    if (targets.some((target) => target.button === button)) {
      throw new Error(`Roadmap diagram topic "${button.title}" has more than one matching box.`);
    }
    node.setAttribute("aria-hidden", "true");
    targets.push({ node, button });
  }
  if (targets.length !== buttons.length) throw new Error("Some roadmap topics are missing from the diagram.");
  canvas.append(...buttons);

  const positionTargets = (): void => {
    if (!overview.isConnected) return;
    const frame = canvas.getBoundingClientRect();
    if (frame.width <= 0 || frame.height <= 0) return;
    for (const { node, button } of targets) {
      const bounds = node.getBBox();
      const matrix = node.getCTM();
      if (!matrix) throw new Error(`Roadmap diagram topic "${button.title}" has no coordinate transform.`);
      const corners = [
        new DOMPoint(bounds.x, bounds.y),
        new DOMPoint(bounds.x + bounds.width, bounds.y),
        new DOMPoint(bounds.x, bounds.y + bounds.height),
        new DOMPoint(bounds.x + bounds.width, bounds.y + bounds.height),
      ].map((point) => point.matrixTransform(matrix));
      const left = Math.min(...corners.map((point) => point.x));
      const top = Math.min(...corners.map((point) => point.y));
      button.style.left = `${left}px`;
      button.style.top = `${top}px`;
      button.style.width = `${Math.max(...corners.map((point) => point.x)) - left}px`;
      button.style.height = `${Math.max(...corners.map((point) => point.y)) - top}px`;
      button.hidden = false;
    }
  };
  const firstStageCenter = (): number => {
    const bounds = firstStage.getBBox();
    const matrix = firstStage.getCTM();
    if (!matrix) throw new Error("The roadmap's first stage has no coordinate transform.");
    return new DOMPoint(bounds.x + bounds.width / 2, bounds.y).matrixTransform(matrix).x;
  };
  const centerFirstStage = (): void => {
    const frame = viewport.getBoundingClientRect();
    viewport.scrollLeft += canvas.getBoundingClientRect().left + firstStageCenter() - (frame.left + viewport.clientLeft + viewport.clientWidth / 2);
    viewport.scrollTop = 0;
  };
  const canvasInset = (): number =>
    canvas.getBoundingClientRect().left - viewport.getBoundingClientRect().left - viewport.clientLeft + viewport.scrollLeft;
  const updateViewportPadding = (): void => {
    const stageCenter = firstStageCenter();
    const halfWidth = viewport.clientWidth / 2;
    const padding = parseFloat(getComputedStyle(viewport).paddingTop);
    viewport.style.paddingLeft = `${Math.max(padding, halfWidth - stageCenter)}px`;
    viewport.style.paddingRight = `${Math.max(padding, halfWidth - (canvas.getBoundingClientRect().width - stageCenter))}px`;
  };
  let viewportWidth = viewport.clientWidth;
  let viewportInset = canvasInset();
  const preserveViewportCenter = (): void => {
    updateViewportPadding();
    const width = viewport.clientWidth;
    const inset = canvasInset();
    viewport.scrollLeft += (viewportWidth - width) / 2 + inset - viewportInset;
    viewportWidth = width;
    viewportInset = inset;
  };
  const updateZoom = (nextZoom: number, resetView = false): void => {
    preserveViewportCenter();
    const frame = viewport.getBoundingClientRect();
    const previous = canvas.getBoundingClientRect();
    const centerX = frame.left + viewport.clientLeft + viewport.clientWidth / 2;
    const centerY = frame.top + viewport.clientTop + viewport.clientHeight / 2;
    const focusX = (centerX - previous.left) / previous.width;
    const focusY = (centerY - previous.top) / previous.height;
    zoom = Math.min(2, Math.max(0.5, nextZoom));
    canvas.style.width = `${baseWidth * zoom}px`;
    canvas.style.minWidth = `${baseWidth * zoom}px`;
    status.value = `${Math.round(zoom * 100)}%`;
    zoomOut.disabled = zoom <= 0.5;
    zoomIn.disabled = zoom >= 2;
    reset.disabled = false;
    updateViewportPadding();
    positionTargets();
    if (resetView) {
      centerFirstStage();
    } else {
      const current = canvas.getBoundingClientRect();
      viewport.scrollLeft += current.left + focusX * current.width - centerX;
      viewport.scrollTop += current.top + focusY * current.height - centerY;
    }
    viewportInset = canvasInset();
  };
  zoomOut.addEventListener("click", () => updateZoom(zoom / 1.2));
  zoomIn.addEventListener("click", () => updateZoom(zoom * 1.2));
  reset.addEventListener("click", () => updateZoom(1, true));
  updateZoom(1, true);
  const observer = new ResizeObserver(() => {
    try {
      preserveViewportCenter();
      positionTargets();
    } catch (error) {
      observer.disconnect();
      if (roadmapDiagramObserver === observer) roadmapDiagramObserver = null;
      showDiagramError(overview, error);
    }
  });
  roadmapDiagramObserver?.disconnect();
  roadmapDiagramObserver = observer;
  roadmapDiagramRefresh = positionTargets;
  observer.observe(overview);
  observer.observe(svg);
}

function showDiagramError(root: HTMLElement, error: unknown): void {
  console.error("Unable to render one or more diagrams.", error);
  root.insertAdjacentHTML("beforeend", '<p class="diagram-error" role="alert">A diagram could not be displayed. The written content is still available.</p>');
}

function renderUnavailable(title = "This page is not available yet.", summary = "The route is reserved for a future issue of the notebook."): string {
  return `
    <section class="view empty-state" id="view-not-found">
      <p class="kicker">The Builder's Fieldnotes</p>
      <h1 tabindex="-1">${escapeHtml(title)}</h1>
      <p>${escapeHtml(summary)}</p>
      <a class="button-link" href="./">Return home <i data-lucide="arrow-right"></i></a>
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
  if (section === "articles" && !first) return { html: renderArticles(), title: "Articles · The Builder's Fieldnotes" };
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

function setMobileSocialRail(open: boolean): void {
  const rail = document.querySelector<HTMLElement>("#app-social-author-rail");
  const toggle = document.querySelector<HTMLButtonElement>("#social-author-rail-toggle");
  const content = document.querySelector<HTMLElement>("#social-author-rail-content");
  if (!rail || !toggle || !content) return;

  rail.toggleAttribute("data-mobile-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close social sidebar" : "Open social sidebar");
  content.toggleAttribute("inert", !open && window.matchMedia("(max-width: 47.99rem)").matches);
}

function closeReaderContents(): void {
  const button = mainElement?.querySelector<HTMLButtonElement>("#reader-contents-toggle");
  const sidebar = mainElement?.querySelector<HTMLElement>(".reader-sidebar");
  sidebar?.removeAttribute("data-mobile-open");
  button?.setAttribute("aria-expanded", "false");
  button?.setAttribute("aria-label", "Open page contents");
}

function positionReaderContents(button: HTMLButtonElement, sidebar: HTMLElement): void {
  const buttonBounds = button.getBoundingClientRect();
  const readerBounds = sidebar.closest<HTMLElement>(".reader-view")?.getBoundingClientRect();
  const mobile = window.matchMedia("(max-width: 47.99rem)").matches;
  const rightAllowance = mobile ? 28 : 16;
  const panelWidth = Math.min(340, window.innerWidth - rightAllowance - 16);
  const left = Math.max(8, Math.min(buttonBounds.left, window.innerWidth - panelWidth - rightAllowance));
  const viewportTop = buttonBounds.bottom + 12;
  sidebar.style.setProperty("--reader-contents-top", `${Math.round(viewportTop - (readerBounds?.top ?? 0))}px`);
  sidebar.style.setProperty("--reader-contents-left", `${Math.round(left - (readerBounds?.left ?? 0))}px`);
  sidebar.style.setProperty("--reader-contents-viewport-top", `${Math.round(viewportTop)}px`);
}

function setupReaderContents(): void {
  const sidebar = mainElement.querySelector<HTMLElement>(".reader-sidebar");
  const hasContents = Boolean(sidebar?.querySelector(".reader-toc"));
  const heading = mainElement.querySelector<HTMLHeadingElement>(".reader-header h1");
  if (!sidebar || !hasContents || !heading) return;

  sidebar.id = "reader-contents-panel";
  const titleRow = document.createElement("div");
  titleRow.className = "reader-title-row";
  const button = document.createElement("button");
  button.id = "reader-contents-toggle";
  button.className = "icon-button reader-contents-toggle";
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "Open page contents");
  button.setAttribute("aria-controls", sidebar.id);
  button.innerHTML = '<i data-lucide="book-open"></i>';
  heading.before(titleRow);
  titleRow.append(button, heading);
  button.addEventListener("click", () => {
    const isOpen = !sidebar.hasAttribute("data-mobile-open");
    closeReaderContents();
    if (isOpen) {
      positionReaderContents(button, sidebar);
      sidebar.setAttribute("data-mobile-open", "");
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "Close page contents");
    }
  });
  sidebar.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) closeReaderContents();
  });
}

function updateReaderImageScale(nextScale: number, focus?: { x: number; y: number }): void {
  if (!readerImageViewport || !readerImageElement || !readerImageElement.naturalWidth || !readerImageElement.naturalHeight) return;

  const minimumScale = Math.min(0.25, readerImageFitScale * 0.5);
  const previousScale = readerImageScale;
  const scale = Math.min(4, Math.max(minimumScale, nextScale));
  const focusX = focus?.x ?? readerImageViewport.clientWidth / 2;
  const focusY = focus?.y ?? readerImageViewport.clientHeight / 2;
  const contentX = readerImageViewport.scrollLeft + focusX;
  const contentY = readerImageViewport.scrollTop + focusY;

  readerImageScale = scale;
  readerImageElement.style.width = `${Math.round(readerImageElement.naturalWidth * scale)}px`;
  readerImageElement.style.height = `${Math.round(readerImageElement.naturalHeight * scale)}px`;
  readerImageStatus!.textContent = `${Math.round(scale * 100)}%`;

  const zoomOut = readerImageDialog?.querySelector<HTMLButtonElement>('[data-image-action="zoom-out"]');
  const zoomIn = readerImageDialog?.querySelector<HTMLButtonElement>('[data-image-action="zoom-in"]');
  if (zoomOut) zoomOut.disabled = scale <= minimumScale + 0.001;
  if (zoomIn) zoomIn.disabled = scale >= 3.999;

  requestAnimationFrame(() => {
    if (!readerImageViewport || previousScale <= 0) return;
    const ratio = scale / previousScale;
    readerImageViewport.scrollLeft = contentX * ratio - focusX;
    readerImageViewport.scrollTop = contentY * ratio - focusY;
  });
}

function fitReaderImage(): void {
  if (!readerImageViewport || !readerImageElement || !readerImageElement.naturalWidth || !readerImageElement.naturalHeight) return;
  const availableWidth = Math.max(1, readerImageViewport.clientWidth - 32);
  const availableHeight = Math.max(1, readerImageViewport.clientHeight - 32);
  readerImageFitScale = Math.min(1, availableWidth / readerImageElement.naturalWidth, availableHeight / readerImageElement.naturalHeight);
  updateReaderImageScale(readerImageFitScale);
  requestAnimationFrame(() => {
    if (!readerImageViewport) return;
    readerImageViewport.scrollLeft = Math.max(0, (readerImageViewport.scrollWidth - readerImageViewport.clientWidth) / 2);
    readerImageViewport.scrollTop = Math.max(0, (readerImageViewport.scrollHeight - readerImageViewport.clientHeight) / 2);
  });
}

function closeReaderImageViewer(): void {
  if (readerImageDialog?.open) readerImageDialog.close();
}

function openReaderImageViewer(source: HTMLImageElement, trigger: HTMLElement): void {
  if (!readerImageDialog || !readerImageElement || !readerImageStatus) return;
  const imageSource = source.currentSrc || source.src;
  if (!imageSource) return;

  readerImageTrigger = trigger;
  readerImageStatus.textContent = "Loading image";
  readerImageElement.alt = source.alt || "Expanded article image";
  const title = readerImageDialog.querySelector<HTMLElement>("#reader-image-viewer-title");
  if (title) title.textContent = source.alt || "Article image";
  readerImageElement.onload = () => fitReaderImage();
  readerImageElement.onerror = () => {
    if (readerImageStatus) readerImageStatus.textContent = "Unable to load image";
  };
  readerImageElement.src = imageSource;
  readerImageDialog.showModal();
  if (readerImageElement.complete && readerImageElement.naturalWidth) requestAnimationFrame(fitReaderImage);
}

function setupReaderImages(): void {
  const images = [...mainElement.querySelectorAll<HTMLImageElement>(".reader-prose img")];
  for (const image of images) {
    image.loading = "lazy";
    image.decoding = "async";
    image.setAttribute("fetchpriority", "low");

    const recordDimensions = (): void => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      if (!image.hasAttribute("width")) image.width = image.naturalWidth;
      if (!image.hasAttribute("height")) image.height = image.naturalHeight;
    };
    if (image.complete) recordDimensions();
    else image.addEventListener("load", recordDimensions, { once: true });

    if (image.closest(".reader-image")) continue;
    const wrapper = document.createElement("span");
    wrapper.className = "reader-image";
    image.before(wrapper);
    wrapper.append(image);

    const expandButton = document.createElement("button");
    expandButton.className = "reader-image__expand";
    expandButton.type = "button";
    expandButton.setAttribute("aria-label", image.alt ? `View full-size image: ${image.alt}` : "View full-size image");
    expandButton.title = "View full-size image";
    expandButton.innerHTML = '<i data-lucide="maximize-2"></i>';
    expandButton.addEventListener("click", () => openReaderImageViewer(image, expandButton));
    wrapper.append(expandButton);
  }
}

function setupReaderImageViewer(root: HTMLElement): void {
  readerImageDialog = root.querySelector<HTMLDialogElement>("#reader-image-viewer");
  readerImageViewport = root.querySelector<HTMLElement>("#reader-image-viewer-viewport");
  readerImageElement = root.querySelector<HTMLImageElement>("#reader-image-viewer-image");
  readerImageStatus = root.querySelector<HTMLElement>("#reader-image-viewer-status");
  if (!readerImageDialog || !readerImageViewport || !readerImageElement || !readerImageStatus) return;

  readerImageDialog.querySelector<HTMLButtonElement>('[data-image-action="close"]')?.addEventListener("click", closeReaderImageViewer);
  readerImageDialog.querySelector<HTMLButtonElement>('[data-image-action="zoom-out"]')?.addEventListener("click", () => updateReaderImageScale(readerImageScale / 1.2));
  readerImageDialog.querySelector<HTMLButtonElement>('[data-image-action="zoom-in"]')?.addEventListener("click", () => updateReaderImageScale(readerImageScale * 1.2));
  readerImageDialog.querySelector<HTMLButtonElement>('[data-image-action="actual"]')?.addEventListener("click", () => updateReaderImageScale(1));
  readerImageDialog.querySelector<HTMLButtonElement>('[data-image-action="fit"]')?.addEventListener("click", fitReaderImage);
  readerImageDialog.addEventListener("close", () => {
    readerImagePointers.clear();
    readerImagePinchDistance = 0;
    readerImageElement?.removeAttribute("src");
    readerImageElement?.removeAttribute("style");
    if (readerImageTrigger?.isConnected) readerImageTrigger.focus();
    readerImageTrigger = null;
  });

  readerImageViewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    const bounds = readerImageViewport!.getBoundingClientRect();
    updateReaderImageScale(readerImageScale * (event.deltaY < 0 ? 1.15 : 1 / 1.15), {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, { passive: false });

  readerImageViewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    readerImageViewport?.setPointerCapture(event.pointerId);
    readerImagePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (readerImagePointers.size === 2) {
      const [first, second] = [...readerImagePointers.values()];
      readerImagePinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
      readerImagePinchScale = readerImageScale;
    }
  });

  readerImageViewport.addEventListener("pointermove", (event) => {
    const previous = readerImagePointers.get(event.pointerId);
    if (!previous) return;
    readerImagePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (readerImagePointers.size === 1) {
      readerImageViewport!.scrollLeft -= event.clientX - previous.x;
      readerImageViewport!.scrollTop -= event.clientY - previous.y;
      return;
    }

    if (readerImagePointers.size === 2 && readerImagePinchDistance > 0) {
      const [first, second] = [...readerImagePointers.values()];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const bounds = readerImageViewport!.getBoundingClientRect();
      updateReaderImageScale(readerImagePinchScale * distance / readerImagePinchDistance, {
        x: (first.x + second.x) / 2 - bounds.left,
        y: (first.y + second.y) / 2 - bounds.top,
      });
    }
  });

  const releasePointer = (event: PointerEvent): void => {
    readerImagePointers.delete(event.pointerId);
    if (readerImagePointers.size < 2) readerImagePinchDistance = 0;
  };
  readerImageViewport.addEventListener("pointerup", releasePointer);
  readerImageViewport.addEventListener("pointercancel", releasePointer);
  window.addEventListener("resize", () => {
    if (readerImageDialog?.open) fitReaderImage();
  });
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
    carousel.setAttribute("aria-label", `Tools, learning, and blogs. Selected: ${selectedTitle}`);
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

function setupToolProductTabs(anchor?: string): void {
  const tabs = [...mainElement.querySelectorAll<HTMLButtonElement>('.tool-product-tabs [role="tab"]')];
  const panels = [...mainElement.querySelectorAll<HTMLElement>("[data-tool-panel]")];
  const controls = [...mainElement.querySelectorAll<HTMLButtonElement>("[data-tool-tab-target]")];
  if (!tabs.length || !panels.length) return;

  const selectTab = (name: string, moveFocus: boolean): void => {
    const selectedTab = tabs.find((tab) => tab.dataset.toolTabTarget === name);
    if (!selectedTab) return;
    for (const tab of tabs) tab.setAttribute("aria-selected", String(tab === selectedTab));
    for (const panel of panels) panel.hidden = panel.dataset.toolPanel !== name;
    if (moveFocus) {
      selectedTab.focus({ preventScroll: true });
      mainElement.querySelector<HTMLElement>(".tool-product-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  for (const control of controls) {
    control.addEventListener("click", () => {
      const target = control.dataset.toolTabTarget;
      if (target) selectTab(target, true);
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextTab = tabs[(index + offset + tabs.length) % tabs.length];
      if (nextTab.dataset.toolTabTarget) selectTab(nextTab.dataset.toolTabTarget, true);
    });
  });

  const anchoredPanel = anchor
    ? mainElement.querySelector<HTMLElement>(`#${CSS.escape(anchor)}`)?.closest<HTMLElement>("[data-tool-panel]")
    : undefined;
  selectTab(anchoredPanel?.dataset.toolPanel ?? "overview", false);
}

function finishRoute(route: RouteState): void {
  setupReaderContents();
  setupReaderImages();
  refreshIcons(mainElement);
  if (route.anchor) {
    if (!roadmapNavigation) requestAnimationFrame(() => document.getElementById(route.anchor)?.scrollIntoView());
  } else if (hasRendered) {
    window.scrollTo({ top: 0, behavior: "instant" });
    mainElement.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }
  hasRendered = true;
}

async function renderRoute(): Promise<void> {
  const route = parseRoute();
  if (roadmapNavigation?.path === route.path && roadmapNavigation.moveTo(route.anchor)) return;
  roadmapDiagramObserver?.disconnect();
  roadmapDiagramObserver = null;
  roadmapDiagramRefresh = null;
  roadmapPartObserver?.disconnect();
  roadmapPartObserver = null;
  roadmapNavigation = null;
  const version = ++renderVersion;
  const resolved = resolveRoute(route);
  const contentLayout = mainElement.parentElement;
  contentLayout?.classList.remove("app-content-layout--wide");
  closeReaderContents();
  closeReaderImageViewer();
  setMobileSocialRail(false);
  mainElement.setAttribute("aria-busy", "true");
  mainElement.innerHTML = resolved.html;
  if (mainElement.querySelector(".guide-view")) contentLayout?.classList.add("app-content-layout--wide");
  updateNavigation(route.path);
  closeMenu();
  refreshIcons(mainElement);
  document.title = resolved.title;

  if (resolved.reader) {
    contentLayout?.classList.add("app-content-layout--wide");
    try {
      let html: string;
      let hasMermaid: boolean;
      let hasToolProductTabs = false;
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
        hasToolProductTabs = record.presentation === "product";
      }
      if (version !== renderVersion) return;
      mainElement.innerHTML = html;
      mainElement.setAttribute("aria-busy", "false");
      if (hasToolProductTabs) setupToolProductTabs(route.anchor);
      finishRoute(route);
      if (hasMermaid) {
        try {
          await renderDiagrams(mainElement);
        } catch (error) {
          if (version === renderVersion) showDiagramError(mainElement, error);
        }
      }
      return;
    } catch (error) {
      if (version !== renderVersion) return;
      console.error("Unable to load content record.", error);
      mainElement.innerHTML = renderReaderError(resolved.reader.summary.title);
      mainElement.setAttribute("aria-busy", "false");
      setupReaderContents();
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
  let moveToRoadmap: ((anchor: string) => boolean) | undefined;
  try {
    moveToRoadmap = setupRoadmapOverview(route.anchor);
  } catch (error) {
    console.error("Unable to initialize the roadmap overview.", error);
    mainElement.insertAdjacentHTML("beforeend", '<p class="diagram-error" role="alert">The interactive roadmap could not be displayed. Its written topics are still available.</p>');
  }
  finishRoute(route);
  try {
    await renderDiagrams(mainElement);
    if (version === renderVersion) {
      setupRoadmapPartObserver();
      if (route.anchor) moveToRoadmap?.(route.anchor);
    }
  } catch (error) {
    if (version === renderVersion) showDiagramError(mainElement, error);
  }
}

function shellMarkup(): string {
  return `
    <div id="app-shell">
      <a class="skip-link" href="#app-main">Skip to content</a>
      <header id="app-header">
        <div class="header-inner">
          <a id="app-header-brand" href="./" aria-label="The Builder's Fieldnotes home"><span class="brand-fox" aria-hidden="true">🦊</span><span>The Builder's Fieldnotes</span></a>
          <button class="icon-button menu-button" id="menu-toggle" type="button" aria-controls="site-navigation" aria-expanded="false" aria-label="Open navigation"><i data-lucide="menu"></i></button>
          <nav id="site-navigation" aria-label="Primary navigation">
            <a href="#/articles" data-nav-prefix="#/articles"><i data-lucide="newspaper"></i><span>Articles</span></a>
            <a href="#/library" data-nav-prefix="#/library"><i data-lucide="library"></i><span>Library</span></a>
            <a href="#/learn" data-nav-prefix="#/learn"><i data-lucide="book-open"></i><span>Learning</span></a>
            <a href="#/tools" data-nav-prefix="#/tools"><i data-lucide="wrench"></i><span>Tools</span></a>
            <a class="blogs-nav-link" href="${codeFoxBlogsUrl}" aria-label="Open CodeFox Blogs"><i data-lucide="users-round"></i><span>Blogs</span></a>
          </nav>
        </div>
      </header>

      <div id="app-floating-navigation"><div id="app-floating-navigation-controls"><a class="icon-button" id="navigation-home" href="./" aria-label="Go home"><i data-lucide="home"></i></a><button class="icon-button" id="navigation-back" type="button" aria-label="Go back"><i data-lucide="arrow-left"></i></button></div></div>

      <div id="app-main-fox-field" aria-hidden="true"><span class="crystal-fox crystal-fox--primary">🦊</span><span class="crystal-fox crystal-fox--middle">🦊</span><span class="crystal-fox crystal-fox--lower">🦊</span></div>

      <div id="app-content-layout">
        <main id="app-main" tabindex="-1"></main>
        <aside id="app-social-author-rail" aria-label="Shubhamm Jadhav, AI Dev">
          <button id="social-author-rail-toggle" class="social-author-rail__toggle" type="button" aria-controls="social-author-rail-content" aria-expanded="false" aria-label="Open social sidebar"><i class="social-author-rail__open-icon" data-lucide="chevron-left"></i><i class="social-author-rail__close-icon" data-lucide="chevron-right"></i></button>
          <div id="social-author-rail-content" class="social-author-rail__content">
            <div class="social-actions">
              <a id="social-linkedin-profile" class="social-button" href="https://www.linkedin.com/in/shubhamm-j-64285ab3" target="_blank" rel="noopener noreferrer" aria-label="Open LinkedIn profile" data-tooltip="LinkedIn profile"><span class="linkedin-mark" aria-hidden="true">in</span><span class="social-badge"><i data-lucide="user-round"></i></span></a>
              <a id="social-linkedin-group" class="social-button" href="https://www.linkedin.com/groups/14634066/" target="_blank" rel="noopener noreferrer" aria-label="Open LinkedIn group" data-tooltip="LinkedIn group"><span class="linkedin-mark" aria-hidden="true">in</span><span class="social-badge"><i data-lucide="users-round"></i></span></a>
            </div>
            <div class="author-identity">
              <p class="author-stack">Shubhamm Jadhav</p>
              <p class="author-role"><span>AI</span><span>DEV</span></p>
            </div>
            <span class="rail-eagle" aria-hidden="true">🦅</span>
          </div>
        </aside>
      </div>

      <footer id="app-footer"><p class="footer-note">Notes on AI, systems, and useful software.</p><p class="footer-author">Shubhamm Jadhav</p><span class="footer-focus">AI | Copilot | Dynamics 365 | CRM</span></footer>

      <dialog id="app-info-ad-dialog" aria-labelledby="app-info-ad-title"><button class="icon-button dialog-close" type="button" aria-label="Close dialog"><i data-lucide="x"></i></button><p class="kicker">Fieldnote</p><h2 id="app-info-ad-title">A small update</h2><p>Announcements will appear here only when there is something useful to say.</p></dialog>
      <dialog id="reader-image-viewer" aria-labelledby="reader-image-viewer-title">
        <header class="reader-image-viewer__toolbar">
          <p id="reader-image-viewer-title">Article image</p>
          <div class="reader-image-viewer__actions" role="toolbar" aria-label="Image controls">
            <button class="icon-button" type="button" data-image-action="zoom-out" aria-label="Zoom out"><i data-lucide="zoom-out"></i></button>
            <button class="icon-button" type="button" data-image-action="actual" aria-label="Show image at full size"><i data-lucide="maximize-2"></i></button>
            <button class="icon-button" type="button" data-image-action="fit" aria-label="Fit image to screen"><i data-lucide="rotate-ccw"></i></button>
            <button class="icon-button" type="button" data-image-action="zoom-in" aria-label="Zoom in"><i data-lucide="zoom-in"></i></button>
            <button class="icon-button" type="button" data-image-action="close" aria-label="Close image viewer"><i data-lucide="x"></i></button>
          </div>
          <output id="reader-image-viewer-status" aria-live="polite">100%</output>
        </header>
        <div id="reader-image-viewer-viewport" class="reader-image-viewer__viewport">
          <div class="reader-image-viewer__canvas"><img id="reader-image-viewer-image" alt=""></div>
        </div>
      </dialog>
    </div>`;
}

export function startApplication(root: HTMLDivElement): void {
  root.innerHTML = shellMarkup();
  mainElement = root.querySelector<HTMLElement>("#app-main")!;
  menuButton = root.querySelector<HTMLButtonElement>("#menu-toggle")!;
  siteNavigation = root.querySelector<HTMLElement>("#site-navigation")!;

  setupReaderImageViewer(root);
  refreshIcons(root);
  setMobileSocialRail(false);
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!open));
    siteNavigation.toggleAttribute("data-open", !open);
    menuButton.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
  });
  root.querySelector<HTMLButtonElement>("#navigation-back")?.addEventListener("click", () => window.history.back());
  root.querySelector<HTMLButtonElement>("#social-author-rail-toggle")?.addEventListener("click", (event) => {
    const toggle = event.currentTarget as HTMLButtonElement;
    setMobileSocialRail(toggle.getAttribute("aria-expanded") !== "true");
  });
  siteNavigation.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) closeMenu();
  });
  window.addEventListener("hashchange", () => void renderRoute());
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeReaderContents();
      setMobileSocialRail(false);
    }
  });
  window.matchMedia("(max-width: 47.99rem)").addEventListener("change", () => setMobileSocialRail(false));

  void renderRoute();
}