import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import YAML from "yaml";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(projectRoot, "content");
const generatedRoot = path.join(projectRoot, "src", "generated");
const publicContentRoot = path.join(projectRoot, "public", "content");
const recordsRoot = path.join(publicContentRoot, "records");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sourceLabel(absolutePath) {
  return path.relative(projectRoot, absolutePath).replaceAll("\\", "/");
}

function requireString(value, field, sourcePath) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourcePath}: ${field} must be a non-empty string.`);
  }

  return value.trim();
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
  const parsed = matter(fs.readFileSync(absolutePath, "utf8"));
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
    const rendered = defaultFence(tokens, index, options, environment, renderer);
    return rendered.replace("<pre>", `<pre aria-label="${language ? `${language} code sample` : "Code sample"}">`);
  };

  const html = sanitizeHtml(markdown.render(document.body), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption"]),
    allowedAttributes: {
      "*": ["id", "class", "role", "aria-label", "tabindex"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
    },
    allowedSchemes: ["http", "https", "mailto"],
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
  for (const section of ["Why it exists", "Useful for", "Usage", "Limitations"]) {
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
      const key = `${categorySlug}/${toolSlug}`;
      const recordFile = `tool--${categorySlug}--${toolSlug}`;
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
      };
      tools.push(core);
      records.push({
        ...core,
        categoryTitle,
        ...(document.data.titleImage === undefined
          ? {}
          : { titleImage: copyLocalImage(document.absolutePath, requireString(document.data.titleImage, "titleImage", document.sourcePath)) }),
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

export function generateContent() {
  fs.rmSync(generatedRoot, { recursive: true, force: true });
  fs.rmSync(publicContentRoot, { recursive: true, force: true });
  fs.mkdirSync(generatedRoot, { recursive: true });
  fs.mkdirSync(recordsRoot, { recursive: true });

  const homeSource = readPage("home.md");
  const aboutSource = readPage("about.md");
  const topics = buildTopics();
  const topicSlugs = new Set(topics.map((topic) => topic.slug));
  const articles = buildArticles(topicSlugs);
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
    guides,
    toolLibrary: toolLibrary.library,
    toolCategories: toolLibrary.categories,
  });
  const toolCount = toolLibrary.categories.reduce((total, category) => total + category.toolCount, 0);
  console.log(`Generated ${articles.length} articles, ${guides.length} guides, and ${toolCount} tools.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateContent();
}