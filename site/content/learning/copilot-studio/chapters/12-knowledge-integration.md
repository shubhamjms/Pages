---
title: Knowledge Integration
summary: Connect and govern the data sources an agent uses for knowledge.
type: chapter
level: intermediate
updated: "2026-08-26"
draft: false
tags:
  - deep-dive
  - knowledge
---

**Knowledge integration** is how you connect Copilot Studio to *your* content — documents, websites,
business records, and external systems — so the agent answers from trusted sources instead of guessing.
This section goes deep on **what you can connect, how to connect it, how retrieval works, and how to
make it reliable and secure.**

> Closely related: [11-grounding.md](11-grounding.md) covers *all* grounding methods (knowledge, tools,
> instructions, Power Fx). This section focuses specifically on the **knowledge** piece.

---

## 1. What "knowledge" means here

Knowledge sources let an agent answer with **generative AI grounded in your data**. When a user asks
something, the agent **retrieves the most relevant chunks** from your sources and uses them to compose
an answer — usually **with citations**. This pattern is **RAG** (Retrieval-Augmented Generation).

```mermaid
flowchart LR
    Q[User question] --> S[Search indexed knowledge]
    S --> C[Top relevant chunks]
    C --> M[Model reads chunks]
    M --> A[Grounded answer + citation]
```

> The agent does **not** send your whole document to the model — it retrieves only the relevant pieces.

---

## 2. Knowledge source types (integration points)

| Integration | Connects to | Best for |
| --- | --- | --- |
| **Public website** | Crawlable public URLs | Marketing, FAQ, support pages |
| **SharePoint / OneDrive** | Your tenant's documents | Policies, handbooks, internal docs |
| **File upload** | PDF, DOCX, TXT, etc. | Static or one-off reference docs |
| **Dataverse** | Power Platform tables | Structured business records |
| **Microsoft Graph (enterprise)** | M365 content org-wide | Enterprise knowledge across apps |
| **Azure AI Search** | A prebuilt vector index | Large/custom corpora, advanced RAG |
| **Connectors** | External systems (Salesforce, ServiceNow…) | Third-party data |
| **Advanced / MCP** | Other graph or MCP knowledge | Specialized sources |

> Availability of some sources depends on **license**, **region**, and **cloud** (commercial vs.
> GCC/GCC High/DoD).

---

## 3. Two levels of knowledge

| Level | Where you add it | Scope |
| --- | --- | --- |
| **Agent-level** | **Knowledge** page / **Overview → Knowledge** | Whole agent; used by generative answers automatically |
| **Node-level** | **Create generative answers** node | Only the sources you pick, inside one topic |

- Use **agent-level** for general "answer from our docs" behavior.
- Use **node-level** when a specific topic must draw from **specific, non-overlapping** sources
  (e.g., the *Device Help* topic uses only the *Device Manuals* source). See
  [11-grounding.md](11-grounding.md#11-grounding__4-generative-answers-node-scoped-grounding-inside-a-topic).

---

## 4. How to add knowledge (step by step)

1. Open your agent → **Knowledge** (top nav), or **Overview → Knowledge**.
2. Select **+ Add knowledge**.
3. Choose a **source type** (website, SharePoint/OneDrive, file, Dataverse, connector…).
4. Provide the location (URL / site / file) and a clear **name + description**.
5. **Add** it, then **wait for indexing** to finish (a status indicator shows when it's ready).
6. **Test** with a question whose answer lives in that source.
7. **Publish** to make it live for users.

> The **name + description** matter: the orchestrator uses them to decide *which* source to search.

---

## 5. Examples by scenario

**HR policy (SharePoint)**

> **User:** "How many vacation days do I get in my first year?"
> Agent searches the HR SharePoint → finds the policy → answers *"New full-time employees accrue 15
> days in year one"* **with a citation**.

**Product FAQ (public website)**

> Add `https://contoso.com/support`. User asks *"how do I reset my router?"* → the agent answers from
> the support page.

**Account record (Dataverse)**

> Ground on the `Accounts` table. User asks *"what's the status of account Northwind?"* → the agent
> reads the record and answers.

**Scoped manuals (node-level)**

```
Topic: Device Help
  Trigger: "I need help with my device"
  → Ask: "What's your question?"        → Topic.UserQuestion
  → Create generative answers
        Input:        Topic.UserQuestion
        Data sources: only "Device Manuals"
        Fallback:     "I couldn't find that in the manuals — connect to support?"
```

---

## 5a. Knowledge sources in detail

Different source types behave differently. Here's what to know about the ones beginners use most.

### Structured vs unstructured data (read this first)

The single biggest factor in choosing a source is **what *kind* of data** you have.

| | **Unstructured data** | **Structured data** |
| --- | --- | --- |
| What it is | Free-form text/documents | Rows, columns, fields with defined types |
| Examples | Policies, handbooks, PDFs, web pages, emails | Dataverse tables, databases, CRM records, clean spreadsheets |
| How the agent uses it | **Retrieves text chunks** and summarizes (RAG) | **Looks up / reads records** by field |
| Best sources | **SharePoint, file upload (PDF/DOCX), public website** | **Dataverse, connectors, tool/HTTP calls** |
| Great for | *Explaining* — "what does the policy say?" | *Precision* — "what's the status of order 123?" |
| Weak at | Exact values, math, aggregations | Long-form explanation/narrative |

**Why it matters**

- **Unstructured** content is perfect when the answer is *written down somewhere* and you want the
  agent to **find and explain** it. Knowledge/RAG shines here.
- **Structured** content is for **exact, record-level** answers and **live** data. Don't force this
  into a spreadsheet-as-knowledge — the agent reads it as text and can't reliably query it. Use
  **Dataverse** or a **tool/connector** so the answer comes from a real lookup.

> **Semi-structured** content (a clean, flat Excel table, a CSV, JSON) sits in between: small,
> tidy tables can work as knowledge for simple look-ups, but anything needing **filtering, math, or
> aggregation** belongs in structured data + a tool.

**Rule of thumb**

- *"Explain / summarize / what does it say?"* → **unstructured** (SharePoint, PDF, website).
- *"Look up / calculate / what's the exact value?"* → **structured** (Dataverse, connector, tool).

### SharePoint / OneDrive as a knowledge source

SharePoint is the most common enterprise source — your policies, handbooks, and team docs already
live there.

**How to add**
1. **Knowledge → + Add knowledge → SharePoint** (or paste a SharePoint/OneDrive URL).
2. Enter a **site**, **document library**, **folder**, or specific **file** URL.
3. Give it a clear **name + description**, then **Add** and wait for indexing.

**Good to know**
- **Permission-trimmed:** answers respect the **signed-in user's** SharePoint permissions — users
  never see content they can't already open. This needs **end-user authentication** on the channel.
- Works best with **text-based** Office docs (Word, PowerPoint, PDF, text) stored in the library.
- Points to **live** locations — when docs update, re-indexing eventually reflects changes (not
  instant).
- **URL must be reachable** by the agent's configured identity; broken/private links won't index.

**SharePoint limitations**
- **Not for anonymous channels** (no signed-in identity to permission-check).
- Very large libraries: only a bounded number of files/URLs index; curate to the folders that matter.
- Scanned/image PDFs, audio/video, and complex/merged-cell spreadsheets aren't read well.
- Sub-site/permission inheritance quirks can cause "I can't find that" even when the file exists.
- Indexing lag means **freshly edited** docs may answer with the **previous** version briefly.

> **Tip:** Point at a **specific library or folder** of curated, current docs rather than an entire
> sprawling site — relevance and speed both improve.

### PDF as a knowledge source

PDFs are great for static reference material (handbooks, manuals, policy packs).

**How to add**
- **Upload** the PDF under **Knowledge → + Add knowledge → Files**, *or* store it in a connected
  **SharePoint** library and index that.

**Good to know**
- The PDF must contain **real, selectable text** — the agent extracts text, then retrieves relevant
  chunks for answers.
- Clear structure (headings, normal paragraphs) → better chunking → better answers.

**PDF limitations**
- ❌ **Scanned / image-only PDFs have no OCR** — they read as blank. Re-export as a searchable/text PDF.
- **Complex layouts** (multi-column, tables-as-images, heavy graphics) can chunk poorly and lose
  meaning.
- **Per-file size limits** apply; huge PDFs may be truncated — split very large documents.
- Charts, diagrams, and images inside the PDF aren't understood (text only).
- Password-protected/encrypted PDFs won't index.

> **Tip:** Before uploading, open the PDF and try to **select text with your cursor**. If you can't,
> it's a scan — convert it to text first.

### Excel / spreadsheets as a knowledge source

Spreadsheets are useful for lists and tabular reference (price lists, product specs, FAQs in rows).

**How to add**
- **Upload** the workbook, or index it from **SharePoint/OneDrive**. (Dataverse is better for truly
  structured, queryable records — see below.)

**Good to know**
- Works best when data is a **clean, flat table**: a single header row, one record per row, no merged
  cells, on a single sheet.
- Good for **look-up style** reference the agent can read as text (e.g., "what's the spec for model X?").

**Excel limitations**
- ❌ **Formulas, pivots, macros, and charts** aren't evaluated — only the resulting **text/values**
  are read (and complex ones may not read cleanly).
- **Merged cells, multiple tables per sheet, and multi-sheet** layouts confuse chunking.
- It is **not a database** — the agent doesn't run row-level queries/aggregations ("sum of all
  orders" won't work). For real querying, use **Dataverse** or a **tool/connector**.
- Frequent edits + indexing lag = answers may reflect an **older** version briefly.
- Very wide/long sheets can exceed size limits and get truncated.

> **Tip:** If you need *"look up the exact value for this ID"* reliability, model the data in
> **Dataverse** (or call a system via a **tool**) instead of a spreadsheet.

### Public website as a knowledge source

- Indexes **crawlable, public** pages from URLs you provide.
- Good for FAQ, support, and product/marketing pages.

**Public website limitations**
- ❌ Can't read **auth-gated** (login-required) pages.
- ❌ **Heavily JavaScript-rendered** content often isn't captured (the crawler sees little HTML).
- **Bounded number of URLs** per source — point at the most relevant sections, not the whole site.
- **Freshness depends on re-crawling** — not real-time; recent edits may lag.
- No control over **page structure** — messy pages chunk poorly and reduce answer quality.
- Sites that **block crawlers** (robots rules, bot protection) may not index.

### Dataverse as a knowledge source

- Best for **structured business records** (accounts, cases, products).
- Respects Dataverse **security roles**.
- Use it when you need record-level accuracy rather than document text.

**Dataverse limitations**
- Requires the data to be **modeled in tables** first — heavier setup than uploading a file.
- Respects **security roles**: users without access to a row get nothing.
- Best for **lookup/record** answers; not a replacement for long-form document explanation.
- Complex relationships/large tables may need a **tool/flow** for precise querying.

### Azure AI Search as a knowledge source

- Best for **large or custom corpora** and advanced retrieval (your own vector index).

**Azure AI Search limitations**
- You must **build and maintain** the index yourself (extra setup, cost, and ownership).
- Index **quality/freshness** is your responsibility — stale indexes give stale answers.
- More moving parts → more that can misconfigure (schema, embeddings, refresh).

### Connectors / external systems as a knowledge source

- Bring in third-party data (e.g., Salesforce, ServiceNow) where supported.

**Connector limitations**
- Subject to the connector's **reliability, rate limits, and throttling**.
- Must be **allowed by DLP** policies in your environment.
- Auth/token expiry can break access until reconfigured.
- Coverage and fidelity vary by connector — test the specific one.

### Quick "which source?" guide

| Your content | Best source |
| --- | --- |
| Policies, handbooks, team docs | **SharePoint** |
| A static manual or policy pack | **PDF** (upload or via SharePoint) |
| A flat reference list/table | **Excel** (simple) or **Dataverse** (queryable) |
| Public FAQ/support pages | **Public website** |
| Structured records you query | **Dataverse** / **connector** |
| Large custom corpus, advanced RAG | **Azure AI Search** |

---

## 6. Supported content & formats

| Works well | Not reliably read |
| --- | --- |
| HTML pages (crawlable) | Scanned / image-only PDFs (no OCR) |
| Word / PDF with **real text** | Images, audio, video |
| Structured tables, text files | Heavily JavaScript-rendered pages |
| Permissioned SharePoint docs | Auth-gated content the agent can't access |

- Each file/source has **size and count limits**.
- Indexing is **not real-time** — updates take time to appear.
- See [10-limitations.md](10-limitations.md#10-limitations__2-knowledge-generative-answers-limits)
  for current caps.

---

## 6a. Limitations of knowledge integration

Knowledge is powerful but **not magic**. Knowing the boundaries up front prevents broken designs.

### General limitations (all sources)

- **Not real-time.** Content is **indexed**, not live — edits take time to appear; expect lag.
- **Size & count caps.** Per-file size limits and a max number of sources/URLs; large content is
  **truncated** or skipped.
- **Grounded ≠ guaranteed.** The model can still miss, misread, or over-summarize — always test.
- **No deep querying.** Knowledge **retrieves text**; it does **not** run database queries,
  aggregations, or math across rows ("total of all sales" won't work — use Dataverse/a tool).
- **Text only.** Images, charts, diagrams, audio, and video inside documents aren't understood.
- **Relevance depends on you.** Vague source **names/descriptions** or too many noisy sources lower
  answer quality.
- **Language quality varies** by language; best in well-supported languages.
- **Region/license/cloud** gate availability — some sources are limited in GCC/GCC High/DoD.
- **Permissions can hide answers.** Permission-trimmed sources return nothing on **anonymous** channels.

### Per-source limitations at a glance

| Source | Key limitations |
| --- | --- |
| **SharePoint / OneDrive** | Needs user auth (no anonymous); bounded file count; indexing lag; scanned PDFs & complex sheets read poorly; permission-inheritance quirks |
| **PDF** | **No OCR** for scans; complex/multi-column layouts chunk poorly; per-file size cap; encrypted PDFs fail; images/charts ignored |
| **Excel / spreadsheets** | Formulas/pivots/macros not evaluated; merged cells & multi-sheet confuse parsing; **not a queryable database**; wide/long sheets truncated |
| **Public website** | Public + crawlable only; no auth-gated or JS-heavy pages; bounded URL count; freshness depends on re-crawl |
| **Dataverse** | Respects security roles; needs proper modeling; setup heavier than a file |
| **Azure AI Search** | Requires building/maintaining the index; more setup/cost |
| **Connectors** | Depend on connector reliability, throttling, and DLP allow-listing |

> **Rule of thumb:** documents → great for *explaining*; structured/live data → use **Dataverse** or a
> **tool**, not a spreadsheet.

---

## 7. Security, permissions & governance

- **Permission trimming:** SharePoint/Graph respect the **signed-in user's** permissions — users only
  get answers from content they're already allowed to see.
- **Anonymous channels** can't use permission-gated sources (no signed-in identity).
- **DLP policies** (per environment) can block certain connectors/sources.
- Mark sensitive variables as **sensitive data** so values stay out of transcripts/logs.
- **Responsible AI** content filters may block certain prompts/answers.

---

## 8. Make knowledge answer reliably — checklist

- ✅ Clear **name + description** on every source (drives selection).
- ✅ Few, **high-quality** sources; remove noisy/outdated ones.
- ✅ Use **text-based** files; re-export scanned PDFs as searchable text.
- ✅ Confirm the source is **enabled** and **indexing finished**.
- ✅ Instructions say **"answer only from knowledge, cite, else escalate."**
- ✅ Scope with a **generative answers node** when topics need different sources.
- ✅ Re-test after every change with a **new test session** ⟳.

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Answers are **generic** | Source disabled or empty; tighten instructions to "only from sources" |
| Can't find **known** content | Scanned PDF (no OCR), permissions, or non-crawlable URL |
| **Stale** answers | Re-index / update the source; indexing isn't real-time |
| Pulls from the **wrong** source | Scope a **generative answers** node to specific sources |
| No **citations** | Confirm generative answers is enabled and the source supports it |
| Works in Test, not in **channel** | Anonymous channel can't access permissioned sources |

---

### Key takeaways

- Knowledge integration = connect **your** data so answers are **grounded + cited** (RAG).
- Sources: **website, SharePoint/OneDrive, files, Dataverse, Graph, Azure AI Search, connectors**.
- Choose **agent-level** for general use, **node-level** to scope sources per topic.
- Quality of **name/description**, **content format**, and **permissions** decides reliability.
- Verify caps and behavior in [10-limitations.md](10-limitations.md) and pair with strong
  **instructions** for trustworthy answers.

---

## Official Microsoft documentation (references)

- [Knowledge sources overview](https://learn.microsoft.com/microsoft-copilot-studio/knowledge-copilot-studio)
- [Add knowledge to an agent](https://learn.microsoft.com/microsoft-copilot-studio/knowledge-add-knowledge)
- [Add a public website as a knowledge source](https://learn.microsoft.com/microsoft-copilot-studio/knowledge-add-public-website)
- [Add SharePoint as a knowledge source](https://learn.microsoft.com/microsoft-copilot-studio/knowledge-add-sharepoint)
- [Add files as a knowledge source](https://learn.microsoft.com/microsoft-copilot-studio/knowledge-add-file-upload)
- [Add Dataverse as a knowledge source](https://learn.microsoft.com/microsoft-copilot-studio/knowledge-add-dataverse)
- [Use the Create generative answers node](https://learn.microsoft.com/microsoft-copilot-studio/nlu-generative-answers-node)
- [Data Loss Prevention (DLP) for agents](https://learn.microsoft.com/microsoft-copilot-studio/admin-data-loss-prevention)

Next: [11-grounding.md](11-grounding.md) — see how knowledge fits alongside tools, instructions, and Power Fx.
