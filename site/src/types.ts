export interface PageRecord {
  title: string;
  summary: string;
  html: string;
}

export interface HeadingRecord {
  level: number;
  text: string;
  id: string;
}

export interface ArticleSummary {
  slug: string;
  title: string;
  summary: string;
  type: "essay" | "guide" | "note" | "build" | "reference";
  topic: string;
  published: string;
  updated: string;
  readingTime: number;
  tags: string[];
  route: string;
  recordFile: string;
}

export interface ArticleRecord extends ArticleSummary {
  html: string;
  headings: HeadingRecord[];
  hasMermaid: boolean;
  relatedArticles: string[];
}

export interface TopicRecord extends PageRecord {
  slug: string;
  route: string;
  articleCount: number;
}

export interface ChapterSummary {
  guideSlug: string;
  partKey: string;
  slug: string;
  order: number;
  title: string;
  summary: string;
  type: "chapter" | "lab" | "reference";
  level: string;
  updated: string;
  readingTime: number;
  route: string;
  recordFile: string;
}

export interface GuidePart {
  key: string;
  title: string;
  summary: string;
  readingTime: number;
  chapters: ChapterSummary[];
}

export interface GuideSummary {
  slug: string;
  title: string;
  summary: string;
  level: string;
  featured: boolean;
  route: string;
  chapterCount: number;
  partCount: number;
  readingTime: number;
  updated: string;
  introductionHtml: string;
  parts: GuidePart[];
}

export interface ChapterRecord extends ChapterSummary {
  guideTitle: string;
  partTitle: string;
  position: number;
  chapterCount: number;
  html: string;
  headings: HeadingRecord[];
  hasMermaid: boolean;
  previous: ChapterSummary | null;
  next: ChapterSummary | null;
}

export interface ToolSummary {
  categorySlug: string;
  slug: string;
  key: string;
  title: string;
  summary: string;
  kind: string;
  platforms: string[];
  version?: string;
  status: "stable" | "preview" | "archived";
  updated: string;
  route: string;
  recordFile: string;
}

export interface ToolCategoryRecord {
  slug: string;
  title: string;
  summary: string;
  order: number;
  featured: boolean;
  featuredTools: string[];
  route: string;
  updated: string;
  toolCount: number;
  stableCount: number;
  previewCount: number;
  archivedCount: number;
  tools: ToolSummary[];
}

export interface ToolRecord extends ToolSummary {
  categoryTitle: string;
  titleImage?: string;
  html: string;
  headings: HeadingRecord[];
  hasMermaid: boolean;
  links: Record<string, string | { label: string; url: string }>;
  relatedTools: string[];
  relatedArticles: string[];
}

export interface HomeRecord extends PageRecord {
  issue: { number: string; date: string };
  leadArticle: string;
  featuredArticles: string[];
  archiveHighlight: string;
  featuredTopics: string[];
  featuredLearning: string[];
  featuredTools: string[];
  now: { reading: string; testing: string; building: string };
}

export interface ContentIndex {
  generatedAt: string;
  home: HomeRecord;
  about: PageRecord;
  topics: TopicRecord[];
  articles: ArticleSummary[];
  guides: GuideSummary[];
  toolLibrary: PageRecord;
  toolCategories: ToolCategoryRecord[];
}