import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import YAML from "yaml";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(projectRoot, "content");
const blogContentRoot = path.join(contentRoot, "blogs");
const blogTemplateRoot = path.join(projectRoot, "templates", "blogs");
const generatedRoot = path.join(projectRoot, "src", "generated");
const publicContentRoot = path.join(projectRoot, "public", "content");
const publicBlogRoot = path.join(projectRoot, "public", "codefox-blogs");
const recordsRoot = path.join(publicContentRoot, "records");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sourceLabel(absolutePath) {
  return path.relative(projectRoot, absolutePath).replaceAll("\\", "/");
}

function assertNoMergeConflictMarkers(value, sourcePath) {
  if (/^(?:<<<<<<< .+|=======|>>>>>>> .+)$/m.test(value)) {
    throw new Error(`${sourcePath}: unresolved Git merge-conflict markers were found.`);
  }
}

function requireString(value, field, sourcePath) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourcePath}: ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readYamlFile(absolutePath) {
  const label = sourceLabel(absolutePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`${label}: required YAML file is missing.`);
  const source = fs.readFileSync(absolutePath, "utf8");
  assertNoMergeConflictMarkers(source, label);
  const value = YAML.parse(source);
  if (!value || typeof value !== "object") throw new Error(`${label}: expected a YAML object or array.`);
  return { value, sourcePath: label };
}

function formatBlogDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function requireBoolean(value, field, sourcePath) {
  if (typeof value !== "boolean") {
    throw new Error(`${sourcePath}: ${field} must be true or false.`);
  }
  return value;
}

function requireDate(value, field, sourcePath) {
  const date = requireString(value, field, sourcePath);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`${sourcePath}: ${field} must use YYYY-MM-DD.`);
  }
  return date;
}

function requirePositiveInteger(value, field, sourcePath) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${sourcePath}: ${field} must be a positive integer.`);
  }
  return value;
}

function optionalStringArray(value, field, sourcePath) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${sourcePath}: ${field} must be an array of non-empty strings.`);
  }
  return value.map((item) => item.trim());
}

function assertSlug(slug, sourcePath) {
  if (!slugPattern.test(slug)) {
    throw new Error(`${sourcePath}: derived slug "${slug}" must be lowercase kebab-case.`);
  }
}

function listDirectories(absolutePath) {
  if (!fs.existsSync(absolutePath)) return [];
  return fs
    .readdirSync(absolutePath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readMarkdown(relativePath) {
  const absolutePath = path.join(contentRoot, relativePath);
  const sourcePath = sourceLabel(absolutePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`${sourcePath}: required source file is missing.`);
  const source = fs.readFileSync(absolutePath, "utf8");
  assertNoMergeConflictMarkers(source, sourcePath);
  const parsed = matter(source);
  return { absolutePath, sourcePath, data: parsed.data, body: parsed.content.trim() };
}

function slugifyHeading(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function collectHeadings(body, sourcePath) {
  const headings = [];
  const anchorCounts = new Map();
  for (const line of body.split(/\r?\n/)) {
    const match = /^(#{2,6})\s+(.+?)\s*#*$/.exec(line);
    if (!match) continue;
    const text = match[2].trim();
    const baseId = slugifyHeading(text);
    if (!baseId) throw new Error(`${sourcePath}: heading "${text}" cannot produce an anchor.`);
    const occurrence = anchorCounts.get(baseId) ?? 0;
    const id = occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`;
    anchorCounts.set(baseId, occurrence + 1);
    headings.push({ level: match[1].length, text, id });
  }
  return headings;
}

function calculateReadingTime(body) {
  const words = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[^\p{L}\p{N}'-]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function copyLocalImage(sourceFile, imagePath) {
  if (/^(?:https?:)?\/\//i.test(imagePath)) return imagePath;
  const cleanPath = imagePath.split(/[?#]/, 1)[0];
  const absoluteImage = path.resolve(path.dirname(sourceFile), cleanPath);
  const relativeImage = path.relative(contentRoot, absoluteImage);
  if (relativeImage.startsWith("..") || path.isAbsolute(relativeImage) || !fs.existsSync(absoluteImage)) {
    throw new Error(`${sourceLabel(sourceFile)}: image "${imagePath}" is missing or outside content/.`);
  }
  const outputPath = path.join(publicContentRoot, relativeImage);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.copyFileSync(absoluteImage, outputPath);
  return `./content/${relativeImage.replaceAll("\\", "/")}`;
}

function normalizeVideoEmbedUrl(value, sourcePath) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${sourcePath}: video embed URL "${value}" is invalid.`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${sourcePath}: video embeds must use HTTPS.`);

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let videoId;
  if (hostname === "youtu.be") {
    videoId = parsed.pathname.split("/").filter(Boolean)[0];
  } else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(hostname)) {
    if (parsed.pathname === "/watch") videoId = parsed.searchParams.get("v");
    else {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments[0] === "embed") videoId = segments[1];
    }
  }
  if (videoId) {
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) throw new Error(`${sourcePath}: YouTube video ID is invalid.`);
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  }

  if (hostname === "vimeo.com" || hostname === "player.vimeo.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    const vimeoId = segments[0] === "video" ? segments[1] : segments[0];
    if (!/^\d{6,12}$/.test(vimeoId ?? "")) throw new Error(`${sourcePath}: Vimeo video ID is invalid.`);
    return `https://player.vimeo.com/video/${vimeoId}`;
  }

  throw new Error(`${sourcePath}: video embeds are limited to YouTube and Vimeo.`);
}

function renderDocument(document, rewriteLink = (href) => href) {
  const headings = collectHeadings(document.body, document.sourcePath);
  const headingQueue = [...headings];
  const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });
  const defaultFence = markdown.renderer.rules.fence.bind(markdown.renderer.rules);
  const defaultImage = markdown.renderer.rules.image.bind(markdown.renderer.rules);

  markdown.renderer.rules.heading_open = (tokens, index, options, environment, renderer) => {
    const heading = headingQueue.shift();
    if (heading) tokens[index].attrSet("id", heading.id);
    return renderer.renderToken(tokens, index, options);
  };
  markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
    const hrefIndex = tokens[index].attrIndex("href");
    if (hrefIndex >= 0) {
      const href = tokens[index].attrs[hrefIndex][1];
      tokens[index].attrs[hrefIndex][1] = rewriteLink(href);
      if (/^https?:\/\//i.test(href)) {
        tokens[index].attrSet("target", "_blank");
        tokens[index].attrSet("rel", "noreferrer");
      }
    }
    return renderer.renderToken(tokens, index, options);
  };
  markdown.renderer.rules.image = (tokens, index, options, environment, renderer) => {
    const sourceIndex = tokens[index].attrIndex("src");
    if (sourceIndex >= 0) {
      tokens[index].attrs[sourceIndex][1] = copyLocalImage(document.absolutePath, tokens[index].attrs[sourceIndex][1]);
    }
    tokens[index].attrSet("loading", "lazy");
    return defaultImage(tokens, index, options, environment, renderer);
  };
  markdown.renderer.rules.table_open = () =>
    '<div class="table-scroll" role="region" aria-label="Scrollable data table" tabindex="0"><table>';
  markdown.renderer.rules.table_close = () => "</table></div>";
  markdown.renderer.rules.fence = (tokens, index, options, environment, renderer) => {
    const language = tokens[index].info.trim().split(/\s+/, 1)[0];
    if (language === "mermaid") {
      return `<div class="mermaid-shell"><pre class="mermaid" aria-label="Diagram">${markdown.utils.escapeHtml(tokens[index].content)}</pre></div>`;
    }
    if (language === "video-placeholder") {
      const caption = tokens[index].content.trim() || "Responsive video embed appears here";
      return `<figure class="video-embed"><div class="video-embed__frame video-embed__placeholder" role="img" aria-label="${markdown.utils.escapeHtml(caption)}"><span aria-hidden="true">▶</span><strong>${markdown.utils.escapeHtml(caption)}</strong><small>YouTube or Vimeo URL supplied by the contributor</small></div><figcaption>Optional video placement</figcaption></figure>`;
    }
    if (language === "video") {
      const [rawUrl, ...captionLines] = tokens[index].content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!rawUrl) throw new Error(`${document.sourcePath}: video fence must include a URL.`);
      const embedUrl = normalizeVideoEmbedUrl(rawUrl, document.sourcePath);
      const caption = captionLines.join(" ") || "Embedded video";
      return `<figure class="video-embed"><div class="video-embed__frame"><iframe src="${embedUrl}" title="${markdown.utils.escapeHtml(caption)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><figcaption>${markdown.utils.escapeHtml(caption)}</figcaption></figure>`;
    }
    const rendered = defaultFence(tokens, index, options, environment, renderer);
    return rendered.replace("<pre>", `<pre aria-label="${language ? `${language} code sample` : "Code sample"}">`);
  };

  const html = sanitizeHtml(markdown.render(document.body), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption", "iframe"]),
    allowedAttributes: {
      "*": ["id", "class", "role", "aria-label", "tabindex"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      iframe: ["src", "title", "loading", "referrerpolicy", "allow", "allowfullscreen"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedIframeHostnames: ["www.youtube-nocookie.com", "player.vimeo.com"],
  });
  return {
    html,
    headings,
    readingTime: calculateReadingTime(document.body),
    hasMermaid: /```mermaid\s/i.test(document.body),
  };
}

function writeRecord(recordFile, value) {
  fs.writeFileSync(path.join(recordsRoot, `${recordFile}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

function readPage(relativePath) {
  const document = readMarkdown(relativePath);
  const rendered = renderDocument(document);
  return {
    data: document.data,
    page: {
      title: requireString(document.data.title, "title", document.sourcePath),
      summary: requireString(document.data.summary, "summary", document.sourcePath),
      html: rendered.html,
    },
    sourcePath: document.sourcePath,
  };
}

function buildTopics() {
  const topics = [];
  for (const slug of listDirectories(path.join(contentRoot, "topics"))) {
    assertSlug(slug, `content/topics/${slug}`);
    const document = readMarkdown(`topics/${slug}/index.md`);
    const rendered = renderDocument(document);
    topics.push({
      slug,
      title: requireString(document.data.title, "title", document.sourcePath),
      summary: requireString(document.data.summary, "summary", document.sourcePath),
      html: rendered.html,
      route: `#/topic/${slug}`,
    });
  }
  return topics;
}

function buildArticles(topicSlugs) {
  const summaries = [];
  const records = [];
  for (const slug of listDirectories(path.join(contentRoot, "articles"))) {
    assertSlug(slug, `content/articles/${slug}`);
    const document = readMarkdown(`articles/${slug}/index.md`);
    const title = requireString(document.data.title, "title", document.sourcePath);
    const summary = requireString(document.data.summary, "summary", document.sourcePath);
    const type = requireString(document.data.type, "type", document.sourcePath);
    const topic = requireString(document.data.topic, "topic", document.sourcePath);
    const published = requireDate(document.data.published, "published", document.sourcePath);
    const updated = document.data.updated ? requireDate(document.data.updated, "updated", document.sourcePath) : published;
    const draft = requireBoolean(document.data.draft, "draft", document.sourcePath);
    if (draft) continue;
    if (!["essay", "guide", "note", "build", "reference"].includes(type)) {
      throw new Error(`${document.sourcePath}: unsupported article type "${type}".`);
    }
    if (!topicSlugs.has(topic)) throw new Error(`${document.sourcePath}: topic "${topic}" does not exist.`);

    const rendered = renderDocument(document);
    const recordFile = `article--${slug}`;
    const core = {
      slug,
      title,
      summary,
      type,
      topic,
      published,
      updated,
      readingTime: rendered.readingTime,
      tags: optionalStringArray(document.data.tags, "tags", document.sourcePath),
      route: `#/read/${slug}`,
      recordFile,
    };
    const relatedArticles = optionalStringArray(document.data.relatedArticles, "relatedArticles", document.sourcePath);
    summaries.push(core);
    records.push({ ...core, html: rendered.html, headings: rendered.headings, hasMermaid: rendered.hasMermaid, relatedArticles });
  }

  const articleSlugs = new Set(summaries.map((article) => article.slug));
  for (const record of records) {
    for (const relatedSlug of record.relatedArticles) {
      if (!articleSlugs.has(relatedSlug)) throw new Error(`${record.slug}: related article "${relatedSlug}" does not exist.`);
    }
    writeRecord(record.recordFile, record);
  }
  return summaries.sort((left, right) => right.published.localeCompare(left.published));
}

function buildLinkedInArticles() {
  const relativePath = "linkedin-articles.yml";
  const absolutePath = path.join(contentRoot, relativePath);
  const sourcePath = sourceLabel(absolutePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`${sourcePath}: required article inventory is missing.`);

  const entries = YAML.parse(fs.readFileSync(absolutePath, "utf8"));
  if (!Array.isArray(entries)) throw new Error(`${sourcePath}: article inventory must be a YAML array.`);

  const urls = new Set();
  return entries
    .map((entry, index) => {
      const itemPath = `${sourcePath}: entry ${index + 1}`;
      if (!entry || typeof entry !== "object") throw new Error(`${itemPath} must be an object.`);
      const title = requireString(entry.title, "title", itemPath);
      const published = requireDate(entry.published, "published", itemPath);
      const linkedinUrl = requireString(entry.linkedinUrl, "linkedinUrl", itemPath);
      const coverImage = requireString(entry.coverImage, "coverImage", itemPath);
      let parsedUrl;
      try {
        parsedUrl = new URL(linkedinUrl);
      } catch {
        throw new Error(`${itemPath}: linkedinUrl must be a valid URL.`);
      }
      if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith("linkedin.com") || !parsedUrl.pathname.startsWith("/pulse/")) {
        throw new Error(`${itemPath}: linkedinUrl must be a LinkedIn Pulse URL.`);
      }
      if (urls.has(linkedinUrl)) throw new Error(`${itemPath}: linkedinUrl is duplicated.`);
      if (!coverImage.startsWith("./article-covers/")) {
        throw new Error(`${itemPath}: coverImage must point to ./article-covers/.`);
      }
      if (!fs.existsSync(path.join(projectRoot, "public", coverImage.slice(2)))) {
        throw new Error(`${itemPath}: coverImage "${coverImage}" does not exist in public/.`);
      }
      urls.add(linkedinUrl);
      return { title, published, linkedinUrl, coverImage };
    })
    .sort((left, right) => right.published.localeCompare(left.published));
}

function readGuideConfig(guideSlug) {
  const configPath = path.join(contentRoot, "learning", guideSlug, "guide.yml");
  if (!fs.existsSync(configPath)) throw new Error(`${sourceLabel(configPath)}: required guide config is missing.`);
  const sourcePath = sourceLabel(configPath);
  const config = YAML.parse(fs.readFileSync(configPath, "utf8"));
  if (!config || typeof config !== "object") throw new Error(`${sourcePath}: guide config must be a YAML object.`);
  if (!Array.isArray(config.parts) || config.parts.length === 0) {
    throw new Error(`${sourcePath}: parts must be a non-empty array.`);
  }
  return { config, sourcePath };
}

function rewriteChapterLink(href, guideSlug, chapterSlugs, sourcePath) {
  if (/^(?:https?:|mailto:|#)/i.test(href) || !href.toLowerCase().includes(".md")) return href;
  const [target, fragment] = href.split("#", 2);
  const match = /^(?:\.\/)?(?:chapters\/)?(?:\d+-)?([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/i.exec(target);
  if (!match) throw new Error(`${sourcePath}: unsupported local Markdown link "${href}".`);
  const chapterSlug = match[1].toLowerCase();
  if (!chapterSlugs.has(chapterSlug)) {
    throw new Error(`${sourcePath}: Markdown link target "${chapterSlug}" is not a chapter in this guide.`);
  }
  return `#/learn/${guideSlug}/${chapterSlug}${fragment ? `#${fragment}` : ""}`;
}

function buildGuide(guideSlug) {
  assertSlug(guideSlug, `content/learning/${guideSlug}`);
  const { config, sourcePath } = readGuideConfig(guideSlug);
  const title = requireString(config.title, "title", sourcePath);
  const summary = requireString(config.summary, "summary", sourcePath);
  const level = requireString(config.level, "level", sourcePath);
  const featured = requireBoolean(config.featured, "featured", sourcePath);
  if (requireBoolean(config.draft, "draft", sourcePath)) return null;

  const chapterDirectory = path.join(contentRoot, "learning", guideSlug, "chapters");
  const chapterFiles = fs.existsSync(chapterDirectory)
    ? fs.readdirSync(chapterDirectory).filter((fileName) => fileName.endsWith(".md")).sort()
    : [];
  const sourceBySlug = new Map();
  for (const fileName of chapterFiles) {
    const match = /^(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.exec(fileName);
    if (!match) throw new Error(`${sourceLabel(path.join(chapterDirectory, fileName))}: chapter filename must be {order}-{slug}.md.`);
    const chapterSlug = match[2];
    if (sourceBySlug.has(chapterSlug)) throw new Error(`${sourcePath}: chapter slug "${chapterSlug}" is duplicated.`);
    sourceBySlug.set(chapterSlug, { fileName, order: Number.parseInt(match[1], 10) });
  }

  const configuredSlugs = [];
  const partDefinitions = config.parts.map((part, partIndex) => {
    const partPath = `${sourcePath}: parts[${partIndex}]`;
    const key = requireString(part.key, "key", partPath);
    assertSlug(key, partPath);
    const chapters = optionalStringArray(part.chapters, "chapters", partPath);
    if (chapters.length === 0) throw new Error(`${partPath}: chapters must not be empty.`);
    for (const chapterSlug of chapters) {
      assertSlug(chapterSlug, partPath);
      if (configuredSlugs.includes(chapterSlug)) throw new Error(`${sourcePath}: chapter "${chapterSlug}" appears more than once.`);
      configuredSlugs.push(chapterSlug);
    }
    return {
      key,
      title: requireString(part.title, "title", partPath),
      summary: requireString(part.summary, "summary", partPath),
      chapterSlugs: chapters,
    };
  });

  for (const chapterSlug of configuredSlugs) {
    if (!sourceBySlug.has(chapterSlug)) throw new Error(`${sourcePath}: configured chapter "${chapterSlug}" has no source file.`);
  }
  for (const chapterSlug of sourceBySlug.keys()) {
    if (!configuredSlugs.includes(chapterSlug)) throw new Error(`${sourcePath}: source chapter "${chapterSlug}" is not assigned to a part.`);
  }

  const chapterSlugs = new Set(configuredSlugs);
  const compiled = configuredSlugs.map((chapterSlug, position) => {
    const source = sourceBySlug.get(chapterSlug);
    const document = readMarkdown(`learning/${guideSlug}/chapters/${source.fileName}`);
    const chapterTitle = requireString(document.data.title, "title", document.sourcePath);
    const chapterSummary = requireString(document.data.summary, "summary", document.sourcePath);
    const chapterType = requireString(document.data.type, "type", document.sourcePath);
    if (!["chapter", "lab", "reference"].includes(chapterType)) {
      throw new Error(`${document.sourcePath}: unsupported chapter type "${chapterType}".`);
    }
    if (requireBoolean(document.data.draft, "draft", document.sourcePath)) {
      throw new Error(`${document.sourcePath}: draft chapters must be removed from guide.yml.`);
    }
    const rendered = renderDocument(
      document,
      (href) => rewriteChapterLink(href, guideSlug, chapterSlugs, document.sourcePath),
    );
    const part = partDefinitions.find((candidate) => candidate.chapterSlugs.includes(chapterSlug));
    const recordFile = `chapter--${guideSlug}--${chapterSlug}`;
    const core = {
      guideSlug,
      partKey: part.key,
      slug: chapterSlug,
      order: source.order,
      title: chapterTitle,
      summary: chapterSummary,
      type: chapterType,
      level: requireString(document.data.level, "level", document.sourcePath),
      updated: requireDate(document.data.updated, "updated", document.sourcePath),
      readingTime: rendered.readingTime,
      route: `#/learn/${guideSlug}/${chapterSlug}`,
      recordFile,
    };
    return { core, rendered, partTitle: part.title, position };
  });

  for (let index = 1; index < compiled.length; index += 1) {
    if (compiled[index - 1].core.order >= compiled[index].core.order) {
      throw new Error(`${sourcePath}: guide chapter order must increase across parts.`);
    }
  }
  const summaries = compiled.map((chapter) => chapter.core);
  compiled.forEach((chapter, position) => {
    writeRecord(chapter.core.recordFile, {
      ...chapter.core,
      guideTitle: title,
      partTitle: chapter.partTitle,
      position: position + 1,
      chapterCount: compiled.length,
      html: chapter.rendered.html,
      headings: chapter.rendered.headings,
      hasMermaid: chapter.rendered.hasMermaid,
      previous: summaries[position - 1] ?? null,
      next: summaries[position + 1] ?? null,
    });
  });

  const introductionPath = path.join(contentRoot, "learning", guideSlug, "index.md");
  const introductionHtml = fs.existsSync(introductionPath)
    ? renderDocument(readMarkdown(`learning/${guideSlug}/index.md`)).html
    : "";
  const parts = partDefinitions.map((part) => {
    const chapters = summaries.filter((chapter) => part.chapterSlugs.includes(chapter.slug));
    return {
      key: part.key,
      title: part.title,
      summary: part.summary,
      readingTime: chapters.reduce((total, chapter) => total + chapter.readingTime, 0),
      chapters,
    };
  });
  return {
    slug: guideSlug,
    title,
    summary,
    level,
    featured,
    route: `#/learn/${guideSlug}`,
    chapterCount: summaries.length,
    partCount: parts.length,
    readingTime: summaries.reduce((total, chapter) => total + chapter.readingTime, 0),
    updated: summaries.reduce((latest, chapter) => chapter.updated > latest ? chapter.updated : latest, "0000-00-00"),
    introductionHtml,
    parts,
  };
}

function buildGuides() {
  return listDirectories(path.join(contentRoot, "learning"))
    .map((guideSlug) => buildGuide(guideSlug))
    .filter(Boolean);
}

function requireExternalUrl(value, field, sourcePath) {
  const url = requireString(value, field, sourcePath);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${sourcePath}: ${field} must be an absolute URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${sourcePath}: ${field} must use http or https.`);
  }
  return url;
}

function normalizeToolLinks(value, sourcePath) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${sourcePath}: links must be an object.`);
  }
  const links = {};
  for (const [key, link] of Object.entries(value)) {
    assertSlug(key, `${sourcePath}: links`);
    if (typeof link === "string") {
      links[key] = requireExternalUrl(link, `links.${key}`, sourcePath);
      continue;
    }
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      throw new Error(`${sourcePath}: links.${key} must be a URL or a label and URL object.`);
    }
    links[key] = {
      label: requireString(link.label, `links.${key}.label`, sourcePath),
      url: requireExternalUrl(link.url, `links.${key}.url`, sourcePath),
    };
  }
  return links;
}

function assertToolSections(headings, sourcePath) {
  const sectionIds = new Set(headings.filter((heading) => heading.level === 2).map((heading) => slugifyHeading(heading.text)));
  for (const section of ["Overview", "Why it exists", "Useful for", "Usage", "Release notes", "Roadmap"]) {
    const id = slugifyHeading(section);
    if (!sectionIds.has(id)) throw new Error(`${sourcePath}: required section "${section}" is missing.`);
  }
}

function buildTools(articleSlugs) {
  const librarySource = readPage("tools/index.md");
  const categories = [];
  const records = [];
  const toolsRoot = path.join(contentRoot, "tools");

  for (const categorySlug of listDirectories(toolsRoot)) {
    assertSlug(categorySlug, `content/tools/${categorySlug}`);
    const configPath = path.join(toolsRoot, categorySlug, "category.yml");
    const configSource = sourceLabel(configPath);
    if (!fs.existsSync(configPath)) throw new Error(`${configSource}: required category config is missing.`);
    const config = YAML.parse(fs.readFileSync(configPath, "utf8"));
    if (!config || typeof config !== "object") throw new Error(`${configSource}: category config must be a YAML object.`);
    if (requireBoolean(config.draft, "draft", configSource)) continue;

    const categoryTitle = requireString(config.title, "title", configSource);
    const featuredTools = optionalStringArray(config.featuredTools, "featuredTools", configSource);
    const tools = [];
    for (const toolSlug of listDirectories(path.join(toolsRoot, categorySlug))) {
      assertSlug(toolSlug, `content/tools/${categorySlug}/${toolSlug}`);
      const document = readMarkdown(`tools/${categorySlug}/${toolSlug}/index.md`);
      if (requireBoolean(document.data.draft, "draft", document.sourcePath)) continue;
      const kind = requireString(document.data.kind, "kind", document.sourcePath);
      if (!["extension", "web-app", "desktop-app", "cli", "script", "library", "template", "utility"].includes(kind)) {
        throw new Error(`${document.sourcePath}: unsupported tool kind "${kind}".`);
      }
      const platforms = optionalStringArray(document.data.platforms, "platforms", document.sourcePath);
      if (platforms.length === 0) throw new Error(`${document.sourcePath}: platforms must not be empty.`);
      for (const platform of platforms) assertSlug(platform, `${document.sourcePath}: platforms`);
      const status = requireString(document.data.status, "status", document.sourcePath);
      if (!["stable", "preview", "archived"].includes(status)) {
        throw new Error(`${document.sourcePath}: unsupported tool status "${status}".`);
      }

      const rendered = renderDocument(document);
      assertToolSections(rendered.headings, document.sourcePath);
      const presentation = document.data.presentation === undefined
        ? undefined
        : requireString(document.data.presentation, "presentation", document.sourcePath);
      if (presentation !== undefined && !["reader", "product"].includes(presentation)) {
        throw new Error(`${document.sourcePath}: unsupported presentation "${presentation}".`);
      }
      const key = `${categorySlug}/${toolSlug}`;
      const recordFile = `tool--${categorySlug}--${toolSlug}`;
      const titleImage = document.data.titleImage === undefined
        ? undefined
        : copyLocalImage(document.absolutePath, requireString(document.data.titleImage, "titleImage", document.sourcePath));
      const core = {
        categorySlug,
        slug: toolSlug,
        key,
        title: requireString(document.data.title, "title", document.sourcePath),
        summary: requireString(document.data.summary, "summary", document.sourcePath),
        kind,
        platforms,
        ...(document.data.version === undefined
          ? {}
          : { version: requireString(document.data.version, "version", document.sourcePath) }),
        status,
        updated: requireDate(document.data.updated, "updated", document.sourcePath),
        route: `#/tools/${categorySlug}/${toolSlug}`,
        recordFile,
        ...(titleImage === undefined ? {} : { titleImage }),
      };
      tools.push(core);
      records.push({
        ...core,
        categoryTitle,
        ...(presentation === undefined ? {} : { presentation }),
        ...(document.data.latestReleaseSummary === undefined
          ? {}
          : { latestReleaseSummary: requireString(document.data.latestReleaseSummary, "latestReleaseSummary", document.sourcePath) }),
        html: rendered.html,
        headings: rendered.headings,
        hasMermaid: rendered.hasMermaid,
        links: normalizeToolLinks(document.data.links, document.sourcePath),
        relatedTools: optionalStringArray(document.data.relatedTools, "relatedTools", document.sourcePath),
        relatedArticles: optionalStringArray(document.data.relatedArticles, "relatedArticles", document.sourcePath),
      });
    }

    if (tools.length === 0) throw new Error(`${configSource}: category must contain at least one published tool.`);
    for (const toolSlug of featuredTools) {
      if (!tools.some((tool) => tool.slug === toolSlug)) {
        throw new Error(`${configSource}: featured tool "${toolSlug}" is not a published child tool.`);
      }
    }
    tools.sort((left, right) => right.updated.localeCompare(left.updated) || left.title.localeCompare(right.title));
    categories.push({
      slug: categorySlug,
      title: categoryTitle,
      summary: requireString(config.summary, "summary", configSource),
      order: requirePositiveInteger(config.order, "order", configSource),
      featured: requireBoolean(config.featured, "featured", configSource),
      featuredTools,
      route: `#/tools/${categorySlug}`,
      updated: tools.reduce((latest, tool) => tool.updated > latest ? tool.updated : latest, "0000-00-00"),
      toolCount: tools.length,
      stableCount: tools.filter((tool) => tool.status === "stable").length,
      previewCount: tools.filter((tool) => tool.status === "preview").length,
      archivedCount: tools.filter((tool) => tool.status === "archived").length,
      tools,
    });
  }

  const toolKeys = new Set(records.map((tool) => tool.key));
  for (const record of records) {
    for (const key of record.relatedTools) {
      if (!toolKeys.has(key)) throw new Error(`${record.key}: related tool "${key}" does not exist.`);
    }
    for (const articleSlug of record.relatedArticles) {
      if (!articleSlugs.has(articleSlug)) throw new Error(`${record.key}: related article "${articleSlug}" does not exist.`);
    }
    writeRecord(record.recordFile, record);
  }

  categories.sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
  return { library: librarySource.page, categories, toolKeys };
}

function validateHome(home, articleSlugs, topicSlugs, guideSlugs, toolKeys, sourcePath) {
  const references = [home.leadArticle, home.archiveHighlight, ...(home.featuredArticles ?? [])].filter(Boolean);
  for (const slug of references) {
    if (!articleSlugs.has(slug)) throw new Error(`${sourcePath}: article reference "${slug}" does not exist.`);
  }
  for (const slug of home.featuredTopics ?? []) {
    if (!topicSlugs.has(slug)) throw new Error(`${sourcePath}: topic reference "${slug}" does not exist.`);
  }
  for (const slug of home.featuredLearning ?? []) {
    if (!guideSlugs.has(slug)) throw new Error(`${sourcePath}: learning reference "${slug}" does not exist.`);
  }
  for (const key of home.featuredTools ?? []) {
    if (!toolKeys.has(key)) throw new Error(`${sourcePath}: tool reference "${key}" does not exist.`);
  }
}

function writeIndex(value) {
  fs.writeFileSync(
    path.join(generatedRoot, "content-index.ts"),
    `import type { ContentIndex } from "../types";\n\nexport const contentIndex = ${JSON.stringify(value, null, 2)} satisfies ContentIndex;\n`,
  );
}

function requireBlogCover(value, field, sourcePath) {
  const coverImage = requireString(value, field, sourcePath);
  if (!coverImage.startsWith("./article-covers/")) {
    throw new Error(`${sourcePath}: ${field} must point to ./article-covers/.`);
  }
  if (!fs.existsSync(path.join(projectRoot, "public", coverImage.slice(2)))) {
    throw new Error(`${sourcePath}: ${field} "${coverImage}" does not exist in public/.`);
  }
  return coverImage;
}

function buildBlogContent() {
  const postTemplatePath = path.join(blogContentRoot, "POST_TEMPLATE.md");
  if (!fs.existsSync(postTemplatePath)) throw new Error(`${sourceLabel(postTemplatePath)}: required contributor post template is missing.`);
  const postTemplateSource = fs.readFileSync(postTemplatePath, "utf8");
  if (!postTemplateSource.includes('layout: "standard"') || !postTemplateSource.includes('contentType: "article"')) {
    throw new Error(`${sourceLabel(postTemplatePath)}: template must use the standard article layout.`);
  }

  const publicationSource = readYamlFile(path.join(blogContentRoot, "publication.yml"));
  const publicationData = publicationSource.value;
  const publication = {
    title: requireString(publicationData.title, "title", publicationSource.sourcePath),
    brandName: requireString(publicationData.brandName, "brandName", publicationSource.sourcePath),
    brandSuffix: requireString(publicationData.brandSuffix, "brandSuffix", publicationSource.sourcePath),
    pageTitle: requireString(publicationData.pageTitle, "pageTitle", publicationSource.sourcePath),
    metaDescription: requireString(publicationData.metaDescription, "metaDescription", publicationSource.sourcePath),
    eyebrow: requireString(publicationData.eyebrow, "eyebrow", publicationSource.sourcePath),
    headline: requireString(publicationData.headline, "headline", publicationSource.sourcePath),
    headlineAccent: requireString(publicationData.headlineAccent, "headlineAccent", publicationSource.sourcePath),
    summary: requireString(publicationData.summary, "summary", publicationSource.sourcePath),
    featuredPost: requireString(publicationData.featuredPost, "featuredPost", publicationSource.sourcePath),
    ownerEmail: requireString(publicationData.ownerEmail, "ownerEmail", publicationSource.sourcePath),
    authorInterestOpen: requireBoolean(publicationData.authorInterestOpen, "authorInterestOpen", publicationSource.sourcePath),
  };
  assertSlug(publication.featuredPost, publicationSource.sourcePath);

  const categorySource = readYamlFile(path.join(blogContentRoot, "categories.yml"));
  if (!Array.isArray(categorySource.value)) throw new Error(`${categorySource.sourcePath}: expected a YAML array.`);
  const categorySlugs = new Set();
  const categories = categorySource.value
    .map((entry, index) => {
      const itemPath = `${categorySource.sourcePath}: entry ${index + 1}`;
      if (!entry || typeof entry !== "object") throw new Error(`${itemPath} must be an object.`);
      const slug = requireString(entry.slug, "slug", itemPath);
      assertSlug(slug, itemPath);
      if (categorySlugs.has(slug)) throw new Error(`${itemPath}: category slug "${slug}" is duplicated.`);
      categorySlugs.add(slug);
      const status = requireString(entry.status, "status", itemPath);
      if (!["active", "planned"].includes(status)) throw new Error(`${itemPath}: unsupported status "${status}".`);
      return {
        slug,
        title: requireString(entry.title, "title", itemPath),
        order: requirePositiveInteger(entry.order, "order", itemPath),
        status,
      };
    })
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));

  const adSource = readYamlFile(path.join(blogContentRoot, "ads.yml"));
  const adData = adSource.value;
  const adsEnabled = requireBoolean(adData.enabled, "enabled", adSource.sourcePath);
  if (!Array.isArray(adData.slots) || (adsEnabled && adData.slots.length === 0)) {
    throw new Error(`${adSource.sourcePath}: slots must be a non-empty array when ads are enabled.`);
  }
  const adSlotIds = new Set();
  const ads = {
    enabled: adsEnabled,
    label: requireString(adData.label, "label", adSource.sourcePath),
    policy: requireString(adData.policy, "policy", adSource.sourcePath),
    slots: adData.slots.map((entry, index) => {
      const itemPath = `${adSource.sourcePath}: slots[${index}]`;
      if (!entry || typeof entry !== "object") throw new Error(`${itemPath} must be an object.`);
      const id = requireString(entry.id, "id", itemPath);
      assertSlug(id, itemPath);
      if (adSlotIds.has(id)) throw new Error(`${itemPath}: ad slot id "${id}" is duplicated.`);
      adSlotIds.add(id);
      const variant = requireString(entry.variant, "variant", itemPath);
      if (!["standard", "short"].includes(variant)) throw new Error(`${itemPath}: unsupported variant "${variant}".`);
      return {
        id,
        title: requireString(entry.title, "title", itemPath),
        size: requireString(entry.size, "size", itemPath),
        variant,
      };
    }),
  };

  const authorRoot = path.join(blogContentRoot, "authors");
  const registrySource = readYamlFile(path.join(authorRoot, "registry.yml"));
  const registryData = registrySource.value;
  const schemaVersion = requirePositiveInteger(registryData.schemaVersion, "schemaVersion", registrySource.sourcePath);
  if (schemaVersion !== 1) throw new Error(`${registrySource.sourcePath}: unsupported schemaVersion "${schemaVersion}".`);
  const ownerAuthorId = requireString(registryData.ownerAuthorId, "ownerAuthorId", registrySource.sourcePath);
  if (!/^cf-author-\d{4}$/.test(ownerAuthorId)) {
    throw new Error(`${registrySource.sourcePath}: ownerAuthorId must use cf-author-NNNN format.`);
  }
  const externalAuthorStart = requirePositiveInteger(registryData.externalAuthorStart, "externalAuthorStart", registrySource.sourcePath);
  const nextAuthorNumber = requirePositiveInteger(registryData.nextAuthorNumber, "nextAuthorNumber", registrySource.sourcePath);
  if (!Array.isArray(registryData.authors) || registryData.authors.length === 0) {
    throw new Error(`${registrySource.sourcePath}: authors must be a non-empty array.`);
  }

  const registeredIds = new Set();
  const registryAuthors = registryData.authors.map((entry, index) => {
    const itemPath = `${registrySource.sourcePath}: authors[${index}]`;
    if (!entry || typeof entry !== "object") throw new Error(`${itemPath} must be an object.`);
    const id = requireString(entry.id, "id", itemPath);
    if (!/^cf-author-\d{4}$/.test(id)) throw new Error(`${itemPath}: id must use cf-author-NNNN format.`);
    if (registeredIds.has(id)) throw new Error(`${itemPath}: author id "${id}" is duplicated.`);
    registeredIds.add(id);
    const status = requireString(entry.status, "status", itemPath);
    if (!["active", "inactive"].includes(status)) throw new Error(`${itemPath}: unsupported status "${status}".`);
    const ownershipReference = requireString(entry.ownershipReference, "ownershipReference", itemPath);
    const expectedReference = `CF-AUTH-${id.slice("cf-author-".length)}`;
    if (ownershipReference !== expectedReference) {
      throw new Error(`${itemPath}: ownershipReference must be "${expectedReference}".`);
    }
    return {
      id,
      status,
      assignedAt: requireDate(entry.assignedAt, "assignedAt", itemPath),
      ownershipReference,
      number: Number(id.slice("cf-author-".length)),
    };
  });
  const ownerRecord = registryAuthors.find((author) => author.id === ownerAuthorId);
  if (!ownerRecord) throw new Error(`${registrySource.sourcePath}: ownerAuthorId "${ownerAuthorId}" is not registered.`);
  if (ownerRecord.number >= externalAuthorStart) {
    throw new Error(`${registrySource.sourcePath}: the owner author number must be below externalAuthorStart.`);
  }
  for (const author of registryAuthors) {
    if (author.id !== ownerAuthorId && author.number < externalAuthorStart) {
      throw new Error(`${registrySource.sourcePath}: external author "${author.id}" must start at ${externalAuthorStart}.`);
    }
  }
  if (nextAuthorNumber < externalAuthorStart) {
    throw new Error(`${registrySource.sourcePath}: nextAuthorNumber must be at least ${externalAuthorStart}.`);
  }
  const highestAuthorNumber = Math.max(...registryAuthors.map((author) => author.number));
  if (nextAuthorNumber <= highestAuthorNumber) {
    throw new Error(`${registrySource.sourcePath}: nextAuthorNumber must be greater than ${highestAuthorNumber}.`);
  }

  const profileRoot = path.join(authorRoot, "profiles");
  const profileIds = fs
    .readdirSync(profileRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => path.basename(entry.name, path.extname(entry.name)));
  for (const authorId of profileIds) {
    if (!registeredIds.has(authorId)) throw new Error(`content/blogs/authors/profiles/${authorId}.yml: profile is not registered.`);
  }
  for (const authorId of registeredIds) {
    if (!profileIds.includes(authorId)) throw new Error(`${registrySource.sourcePath}: registered author "${authorId}" has no profile.`);
  }

  const authors = new Map();
  for (const registeredAuthor of registryAuthors) {
    const authorId = registeredAuthor.id;
    assertSlug(authorId, `content/blogs/authors/profiles/${authorId}.yml`);
    const authorSource = readYamlFile(path.join(profileRoot, `${authorId}.yml`));
    const authorData = authorSource.value;
    for (const field of Object.keys(authorData)) {
      if (field.toLowerCase().includes("email")) {
        throw new Error(`${authorSource.sourcePath}: private email fields are not allowed in public author profiles.`);
      }
    }
    const id = requireString(authorData.id, "id", authorSource.sourcePath);
    assertSlug(id, authorSource.sourcePath);
    if (authorId !== id) {
      throw new Error(`${authorSource.sourcePath}: filename must match author id "${id}".`);
    }
    if (authors.has(id)) throw new Error(`${authorSource.sourcePath}: author id "${id}" is duplicated.`);
    authors.set(id, {
      id,
      name: requireString(authorData.name, "name", authorSource.sourcePath),
      initials: requireString(authorData.initials, "initials", authorSource.sourcePath),
      role: requireString(authorData.role, "role", authorSource.sourcePath),
      bio: requireString(authorData.bio, "bio", authorSource.sourcePath),
      profileUrl: requireString(authorData.profileUrl, "profileUrl", authorSource.sourcePath),
      status: registeredAuthor.status,
      assignedAt: registeredAuthor.assignedAt,
      ownershipReference: registeredAuthor.ownershipReference,
    });
  }
  if (authors.size === 0) throw new Error("content/blogs/authors: at least one author is required.");

  const posts = [];
  const postSlugs = new Set();
  const postRoot = path.join(blogContentRoot, "posts");
  const postAuthorIds = listDirectories(postRoot);
  for (const authorId of postAuthorIds) {
    if (!registeredIds.has(authorId)) throw new Error(`content/blogs/posts/${authorId}: post owner is not registered.`);
  }
  for (const author of authors.values()) {
    const authorPostRoot = path.join(postRoot, author.id);
    for (const slug of listDirectories(authorPostRoot)) {
      const postPath = `content/blogs/posts/${author.id}/${slug}`;
      assertSlug(slug, postPath);
      if (postSlugs.has(slug)) throw new Error(`${postPath}: post slug "${slug}" is duplicated across authors.`);
      postSlugs.add(slug);

      const document = readMarkdown(`blogs/posts/${author.id}/${slug}/index.md`);
      if (Object.hasOwn(document.data, "author")) {
        throw new Error(`${document.sourcePath}: author must be derived from the parent author folder.`);
      }
      for (const field of Object.keys(document.data)) {
        if (field.toLowerCase().includes("email")) {
          throw new Error(`${document.sourcePath}: private email fields are not allowed in published post frontmatter.`);
        }
      }
      const draft = requireBoolean(document.data.draft, "draft", document.sourcePath);
      if (draft) continue;

      const postCategorySlugs = optionalStringArray(document.data.categories, "categories", document.sourcePath);
      if (postCategorySlugs.length === 0) throw new Error(`${document.sourcePath}: categories must not be empty.`);
      for (const categorySlug of postCategorySlugs) {
        if (!categorySlugs.has(categorySlug)) throw new Error(`${document.sourcePath}: category "${categorySlug}" does not exist.`);
      }

      const rendered = renderDocument(document);
      const layout = requireString(document.data.layout, "layout", document.sourcePath);
      if (layout !== "standard") throw new Error(`${document.sourcePath}: unsupported layout "${layout}".`);
      const contentType = requireString(document.data.contentType, "contentType", document.sourcePath);
      if (contentType !== "article") throw new Error(`${document.sourcePath}: unsupported contentType "${contentType}".`);
      posts.push({
        slug,
        layout,
        contentType,
        title: requireString(document.data.title, "title", document.sourcePath),
        summary: requireString(document.data.summary, "summary", document.sourcePath),
        breadcrumb: requireString(document.data.breadcrumb, "breadcrumb", document.sourcePath),
        eyebrow: requireString(document.data.eyebrow, "eyebrow", document.sourcePath),
        author,
        categories: postCategorySlugs,
        categoryRecords: postCategorySlugs.map((categorySlug) => categories.find((category) => category.slug === categorySlug)),
        published: requireDate(document.data.published, "published", document.sourcePath),
        updated: requireDate(document.data.updated, "updated", document.sourcePath),
        coverImage: requireBlogCover(document.data.coverImage, "coverImage", document.sourcePath),
        featured: requireBoolean(document.data.featured, "featured", document.sourcePath),
        tags: optionalStringArray(document.data.tags, "tags", document.sourcePath),
        html: rendered.html
          .replace("<p>", '<p class="lead">')
          .replaceAll('src="./content/', 'src="../../content/'),
        headings: rendered.headings,
        readingTime: rendered.readingTime,
      });
    }
  }
  posts.sort((left, right) => right.published.localeCompare(left.published));
  if (posts.length === 0) throw new Error("content/blogs/posts: at least one published author post is required.");

  const featured = posts.find((post) => post.slug === publication.featuredPost);
  if (!featured) throw new Error(`${publicationSource.sourcePath}: featuredPost "${publication.featuredPost}" is not published.`);

  const exampleDocument = readMarkdown("blogs/ARTICLE_EXAMPLE.md");
  const exampleLayout = requireString(exampleDocument.data.layout, "layout", exampleDocument.sourcePath);
  const exampleContentType = requireString(exampleDocument.data.contentType, "contentType", exampleDocument.sourcePath);
  if (exampleLayout !== "standard" || exampleContentType !== "article") {
    throw new Error(`${exampleDocument.sourcePath}: contributor example must use the standard article layout.`);
  }
  const renderedExample = renderDocument(exampleDocument);
  const articleExample = {
    slug: "article-template",
    layout: exampleLayout,
    contentType: exampleContentType,
    title: requireString(exampleDocument.data.title, "title", exampleDocument.sourcePath),
    summary: requireString(exampleDocument.data.summary, "summary", exampleDocument.sourcePath),
    breadcrumb: requireString(exampleDocument.data.breadcrumb, "breadcrumb", exampleDocument.sourcePath),
    eyebrow: requireString(exampleDocument.data.eyebrow, "eyebrow", exampleDocument.sourcePath),
    author: {
      initials: requireString(exampleDocument.data.authorInitials, "authorInitials", exampleDocument.sourcePath),
      name: requireString(exampleDocument.data.authorName, "authorName", exampleDocument.sourcePath),
      role: requireString(exampleDocument.data.authorRole, "authorRole", exampleDocument.sourcePath),
      bio: requireString(exampleDocument.data.authorBio, "authorBio", exampleDocument.sourcePath),
      profileUrl: "../#contributors",
    },
    categoryRecords: [{
      title: requireString(exampleDocument.data.primaryCategory, "primaryCategory", exampleDocument.sourcePath),
    }],
    published: requireDate(exampleDocument.data.published, "published", exampleDocument.sourcePath),
    coverImage: requireBlogCover(exampleDocument.data.coverImage, "coverImage", exampleDocument.sourcePath),
    html: renderedExample.html
      .replace("<p>", '<p class="lead">')
      .replaceAll('src="./content/', 'src="../../content/'),
    headings: renderedExample.headings,
    readingTime: renderedExample.readingTime,
    sourceLabel: "Example structure",
  };

  return { publication, categories, authors, posts, featured, ads, articleExample };
}

function renderBlogTemplate(templateName, tokens) {
  const templatePath = path.join(blogTemplateRoot, templateName);
  if (!fs.existsSync(templatePath)) throw new Error(`${sourceLabel(templatePath)}: required blog template is missing.`);
  let html = fs.readFileSync(templatePath, "utf8");
  assertNoMergeConflictMarkers(html, sourceLabel(templatePath));
  for (const [name, value] of Object.entries(tokens)) {
    html = html.replaceAll(`{{${name}}}`, String(value));
  }
  const unresolved = html.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved) throw new Error(`${sourceLabel(templatePath)}: unresolved template tokens: ${[...new Set(unresolved)].join(", ")}.`);
  return html;
}

function writeBlogPage(outputParts, html) {
  assertNoMergeConflictMarkers(html, `Generated blog page ${outputParts.join("/")}`);
  for (const previewPath of ["../site/", "blogs-preview.html", "blog-article-preview.html"]) {
    if (html.includes(previewPath)) throw new Error(`Generated blog page contains unresolved template path "${previewPath}".`);
  }
  const outputPath = path.join(publicBlogRoot, ...outputParts);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
}

function generateBlogSite(blog) {
  fs.rmSync(publicBlogRoot, { recursive: true, force: true });
  const { publication, categories, posts, featured, ads, articleExample } = blog;
  const featuredCategory = featured.categoryRecords[0];
  const categoryCounts = new Map(categories.map((category) => [
    category.slug,
    posts.filter((post) => post.categories.includes(category.slug)).length,
  ]));
  const topicLinks = [
    `<a href="#latest" aria-current="true"><span>All stories</span><strong>${String(posts.length).padStart(2, "0")}</strong></a>`,
    ...categories.map((category) => {
      const count = categoryCounts.get(category.slug) ?? 0;
      if (category.status === "planned" && count === 0) {
        return `<span class="topic-coming-soon"><span>${escapeHtml(category.title)}</span><strong>Coming soon</strong></span>`;
      }
      return `<a href="#latest"><span>${escapeHtml(category.title)}</span><strong>${String(count).padStart(2, "0")}</strong></a>`;
    }),
  ].join("");
  const categoryOptions = categories
    .map((category) => `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.title)}</option>`)
    .join("");
  const adSlots = ads.slots
    .map((slot) => `<div class="ad-slot${slot.variant === "short" ? " ad-slot--short" : ""}" data-ad-slot="${escapeHtml(slot.id)}" aria-label="${escapeHtml(slot.title)} placeholder"><strong>${escapeHtml(slot.title)}</strong><span>${escapeHtml(slot.size)}</span></div>`)
    .join("");

  let homeHtml = renderBlogTemplate("home.html", {
    BLOG_META_DESCRIPTION: escapeHtml(publication.metaDescription),
    BLOG_PAGE_TITLE: escapeHtml(publication.pageTitle),
    BLOG_TITLE: escapeHtml(publication.title),
    BLOG_BRAND_NAME: escapeHtml(publication.brandName),
    BLOG_BRAND_SUFFIX: escapeHtml(publication.brandSuffix),
    BLOG_EYEBROW: escapeHtml(publication.eyebrow),
    BLOG_HEADLINE: escapeHtml(publication.headline),
    BLOG_HEADLINE_ACCENT: escapeHtml(publication.headlineAccent),
    BLOG_SUMMARY: escapeHtml(publication.summary),
    BLOG_POST_COUNT_PADDED: String(posts.length).padStart(2, "0"),
    BLOG_POST_COUNT_LABEL: `${posts.length} published ${posts.length === 1 ? "story" : "stories"}`,
    AUTHOR_INTEREST_STATUS: publication.authorInterestOpen ? "Open" : "Closed",
    BLOG_TOPIC_LINKS: topicLinks,
    BLOG_CATEGORY_OPTIONS: categoryOptions,
    OWNER_EMAIL: escapeHtml(publication.ownerEmail),
    FEATURED_ROUTE: `./${featured.slug}/`,
    FEATURED_HOME_COVER: `.${featured.coverImage}`,
    FEATURED_TITLE: escapeHtml(featured.title),
    FEATURED_SUMMARY: escapeHtml(featured.summary),
    FEATURED_CATEGORY: escapeHtml(featuredCategory.title),
    FEATURED_PUBLISHED_ISO: featured.published,
    FEATURED_PUBLISHED_DISPLAY: formatBlogDate(featured.published),
    FEATURED_AUTHOR: escapeHtml(featured.author.name),
  });
  homeHtml = homeHtml
    .replaceAll('href="blogs-preview.html"', 'href="./"')
    .replaceAll('href="../site/index.html"', 'href="../"');
  writeBlogPage(["index.html"], homeHtml);

  for (const post of [...posts, articleExample]) {
    const primaryCategory = post.categoryRecords[0];
    const toc = post.headings
      .filter((heading) => heading.level === 2)
      .map((heading) => `<li><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a></li>`)
      .join("");
    let articleHtml = renderBlogTemplate("article.html", {
      BLOG_TITLE: escapeHtml(publication.title),
      BLOG_BRAND_NAME: escapeHtml(publication.brandName),
      BLOG_BRAND_SUFFIX: escapeHtml(publication.brandSuffix),
      ARTICLE_META_DESCRIPTION: escapeHtml(post.summary),
      ARTICLE_PAGE_TITLE: escapeHtml(`${post.title} | ${publication.title}`),
      ARTICLE_PRIMARY_CATEGORY: escapeHtml(primaryCategory.title),
      ARTICLE_BREADCRUMB: escapeHtml(post.breadcrumb),
      ARTICLE_CATEGORY_LABEL: escapeHtml(post.eyebrow),
      ARTICLE_TITLE: escapeHtml(post.title),
      ARTICLE_SUMMARY: escapeHtml(post.summary),
      ARTICLE_PUBLISHED_ISO: post.published,
      ARTICLE_PUBLISHED_DISPLAY: formatBlogDate(post.published),
      ARTICLE_READING_TIME: post.readingTime,
      ARTICLE_SOURCE_LABEL: escapeHtml(post.sourceLabel ?? "CodeFox original"),
      ARTICLE_COVER: `../.${post.coverImage}`,
      ARTICLE_TOC: toc,
      ADS_HIDDEN_ATTRIBUTE: ads.enabled ? "" : " hidden",
      ADS_LABEL: escapeHtml(ads.label),
      ADS_SLOTS: adSlots,
      ADS_POLICY: escapeHtml(ads.policy),
      AUTHOR_INITIALS: escapeHtml(post.author.initials),
      AUTHOR_NAME: escapeHtml(post.author.name),
      AUTHOR_ROLE: escapeHtml(post.author.role),
      AUTHOR_BIO: escapeHtml(post.author.bio),
      AUTHOR_PROFILE_URL: escapeHtml(post.author.profileUrl),
    });
    articleHtml = articleHtml.replace(
      /<!-- BLOG_POST_CONTENT_START -->[\s\S]*?<!-- BLOG_POST_CONTENT_END -->/,
      `<!-- BLOG_POST_CONTENT_START -->\n${post.html}\n          <!-- BLOG_POST_CONTENT_END -->`,
    );
    articleHtml = articleHtml
      .replaceAll('href="blogs-preview.html#topics"', 'href="../#topics"')
      .replaceAll('href="blogs-preview.html#contributors"', 'href="../#contributors"')
      .replaceAll('href="blogs-preview.html"', 'href="../"')
      .replaceAll('href="../site/index.html"', 'href="../../"');
    writeBlogPage([post.slug, "index.html"], articleHtml);
  }
}

export function generateContent() {
  fs.rmSync(generatedRoot, { recursive: true, force: true });
  fs.rmSync(publicContentRoot, { recursive: true, force: true });
  fs.mkdirSync(generatedRoot, { recursive: true });
  fs.mkdirSync(recordsRoot, { recursive: true });
  const blog = buildBlogContent();
  generateBlogSite(blog);

  const homeSource = readPage("home.md");
  const aboutSource = readPage("about.md");
  const topics = buildTopics();
  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  const articles = buildArticles(topicSlugs);
  const linkedinArticles = buildLinkedInArticles();
  const guides = buildGuides();
  const toolLibrary = buildTools(new Set(articles.map((article) => article.slug)));
  validateHome(
    homeSource.data,
    new Set(articles.map((article) => article.slug)),
    topicSlugs,
    new Set(guides.map((guide) => guide.slug)),
    toolLibrary.toolKeys,
    homeSource.sourcePath,
  );

  writeIndex({
    generatedAt: new Date().toISOString(),
    home: { ...homeSource.page, ...homeSource.data },
    about: aboutSource.page,
    topics: topics.map((topic) => ({
      ...topic,
      articleCount: articles.filter((article) => article.topic === topic.slug).length,
    })),
    articles,
    linkedinArticles,
    guides,
    toolLibrary: toolLibrary.library,
    toolCategories: toolLibrary.categories,
  });
  const toolCount = toolLibrary.categories.reduce((total, category) => total + category.toolCount, 0);
  console.log(`Generated ${articles.length} fieldnotes, ${linkedinArticles.length} LinkedIn articles, ${guides.length} guides, ${toolCount} tools, and ${blog.posts.length + 2} static blog pages.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateContent();
}