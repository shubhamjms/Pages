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

Learning guides default to the chapter-based presentation. A roadmap-only entry uses `presentation: "roadmap"`, `parts: []`, an `updated` date in `guide.yml`, and a non-empty `index.md`. It appears under Learning without lesson links or chapter-completion claims. The Microsoft Dynamics 365 entry currently uses this presentation; its detailed planning notes remain in [the roadmap draft](docs/dynamics365-crm-learning-draft.md).

Roadmap content includes a Mermaid diagram and consecutively numbered level-two stage headings (`## 1 - ...`) containing level-three part headings and topic lists. Numbered diagram labels must match the part numbers. All numbered parts stay visible under colored stage headers; diagram buttons jump to the corresponding part instead of collapsing it. Stage introduction paragraphs belong under the stage heading, and reference sections following a stage remain grouped with that stage. Optional topic groups use unnumbered level-two headings containing unnumbered level-three topic headings; their diagram labels must match those titles (whitespace and line breaks are ignored). Only optional topics open one at a time and support same-topic/Close/Escape collapse. Existing part/topic/reference anchors and contents links navigate to the appropriate content.

The Dynamics roadmap keeps the original draft-notes diagram style, with four stages: Understand CRM and the Platform (01-07); Configure, Secure and Automate (08-14); Develop and Integrate (15-21); Test, Deploy and Design Solutions (22-28). Each stage has seven parts. Stage 1 includes Types of Apps after the platform introduction, distinguishing model-driven/canvas app types from Power Pages websites. Stage 2 separates rules, process flows, and cloud flows. Stage 3 separates plug-ins, custom APIs, integration, PCF, and Canvas/custom pages, with relevant language/tool checkpoints and scenario-dependent UI builds. Stage 4 begins with advanced architecture review, then separates migration, reporting, solution tests/UAT, releases, operations, and handover. Existing bookmarked links from all earlier numbering schemes are preserved by validated `anchorAliases` in `guide.yml`; targets must exist and aliases must not conflict with canonical IDs. Combined-automation links navigate to Part 12; plug-in/API links to Part 17. Former Stage 4 combined links navigate to the first relevant split: migration/reporting to Part 23, testing/ALM to Part 25, and architecture/operations/capstone to Part 22 (the full capstone is now Part 28). No image-viewer popup is used. Prerequisites, examples, and completion checks remain in the part details and draft notes.

Each part can include a small Mermaid concept diagram beneath its level-three heading. Parts show this diagram on the left and topic lists on the right, with separate prerequisites/practice/readiness cards underneath. Mobile layouts stack the diagram above the points and the note cards vertically. Core diagrams render when their sections approach the viewport (400px margin) or are explicitly visited; deferred diagrams retain their authored text until rendering. Optional diagrams render only when opened. Duplicate rendering requests are guarded, and observers are disconnected when leaving the route. The main diagram remains unchanged.

Every core part and stage completion exercise has a "Back to roadmap" footer link. Same-roadmap links move focus and scroll to the destination without rebuilding the page, preserving zoom and diagram state; their anchors remain bookmarkable and browser Back/Forward navigation is supported. Core buttons use `aria-current="location"` for the selected destination, not an expanded/collapsed state. Only optional buttons retain `aria-expanded`.

The Dynamics roadmap also has six unnumbered application branches: Sales, Customer Service, Field Service, Customer Insights (Data and Journeys child modules), Contact Center, and Project Operations. Three optional AI topics cover Dynamics 365 Copilot, Copilot Studio (linking to the existing guide), and an AI agent harness. The harness topic compares the currently documented Standard, Microsoft Copilot, and Customer Conversation choices; its separate experience table covers Microsoft Copilot, Microsoft 365 Copilot, GitHub Copilot, and Studio without treating them as four runtimes. It explains the GitHub-to-shared-Microsoft harness naming transition and checks availability, permissions, approvals, and billing. All nine optional boxes open the same focused detail layout independently of the 28 core parts. The overview canvas grows to at least half the rendered SVG's natural width, retaining the 1100px minimum, so additional branches do not make labels unreadable; narrower screens scroll inside the diagram. Availability and licensing must be checked per application; Project Operations financial integration and separate ERP tracks are not mandatory CRM prerequisites.

Only the main roadmap has inline Zoom in/Zoom out controls (50%-200%, in 1.2x steps) and a live percentage. Its default 100% uses the readable overview width described above, not the SVG's natural size. Initial load and Reset view center the first numbered stage; its Mermaid cluster label must match the stage heading, optionally prefixed with "Stage". The viewer adds only the side padding needed to keep Stage 1 centerable when a compact diagram fits inside it, without enlarging the SVG. Zooming preserves the current viewport focus and repositions the native topic buttons; viewport resizing preserves the horizontal center. Reset restores 100% and Stage 1. Focused part diagrams and the article-image viewer are unchanged.

The main diagram keeps the four core stages on the left, with Applications and Copilot/AI side by side on the right. Cards remain vertical inside both optional groups; wrapped labels, reduced spacing, and elbow connectors keep them narrow. Transparent `CORE_PATH` and `OPTIONAL_PATH` containers control placement but are not extra stages. The rounded "Optional learning" junction is on the right and is not a lesson. Its `OPTIONAL_ROUTE` connector from Stage 2 uses `stepAfter` to leave the core lane before descending; separate dashed arrows reach each group. There is no application-to-AI ordering or prerequisite link.

## Deployment

Pushes to `web-checks` run `.github/workflows/deploy-pages.yml` and publish `site/dist/` to [shubhamjms.github.io/Pages](https://shubhamjms.github.io/Pages/).
