---
title: "GitHub Copilot Insights Dashboard"
summary: "Visualize local GitHub Copilot chat activity and AI usage, generate standup digests, and inspect accounts, models, and MCP servers in VS Code."
kind: "extension"
platforms:
  - "vscode"
  - "github-copilot"
  - "ai"
  - "mcp"
version: "4.2.0"
titleImage: "./ghcp-dashboard.png"
status: "stable"
updated: "2026-10-13"
draft: false
presentation: "product"
latestReleaseSummary: "Version 4.2.0 adds concise and detailed local standup reports, flexible day selection, and more accurate current-workspace evidence."
links:
  marketplace:
    label: "Install from the Visual Studio Marketplace"
    url: "https://marketplace.visualstudio.com/items?itemName=ShubhJ.ghcp-dashboard"
  video:
    label: "Watch the dashboard overview"
    url: "https://www.youtube.com/watch?v=MBr1_hbbHzs"
relatedTools: []
relatedArticles: []
---

## Overview

**GitHub Copilot Insights Dashboard** is a local-first VS Code extension for understanding Copilot chat activity, AI-assisted editing, accounts, models, MCP servers, and daily delivery evidence. It combines information that is otherwise distributed across VS Code authentication, workspace storage, Copilot sessions, AI Stats, model registrations, and MCP configuration files.

| Detail | Value |
| --- | --- |
| Marketplace identifier | `shubhj.ghcp-dashboard` |
| Publisher | ShubhJ |
| Current version | 4.2.0 |
| VS Code compatibility | `^1.95.0` |

The dashboard keeps usage analysis on the machine. Only its cached Marketplace version check uses a public network request.

## Why it exists

Developers often need to confirm which account Copilot is using, find an earlier chat, understand real AI-assisted editing, inspect available models, or verify local MCP configuration. VS Code exposes those signals through several APIs and storage locations rather than one unified view.

The extension reads those sources together and labels their scope carefully. It distinguishes retained local data from lifetime usage, identifies missing or stale AI Stats, and keeps current-workspace actions separate from sessions that belong to another workspace.

## Useful for

- Confirming the active GitHub Copilot account and detection strategy.
- Browsing Agent, Ask, Chat, Plan, and custom-agent conversations across workspaces.
- Measuring conversations, prompts, active days, AI character share, and chat edits.
- Generating concise or detailed standup Markdown from local activity.
- Reopening sessions that belong to the current workspace.
- Inspecting connected GitHub, Microsoft, and GitHub Enterprise accounts.
- Discovering MCP servers, commands, tools, tags, and configuration locations.
- Inspecting available language models, vendors, versions, and token limits.
- Checking whether local Copilot and AI Stats configuration is ready.

## Key capabilities

### 📊 Overview and AI usage

The overview combines Copilot Chat status, recent sessions, a seven-day Chat Activity snapshot, and collapsible AI Usage Metrics. AI Stats reads retained workspace `state.vscdb` data and its write-ahead log to show AI character share, typed and AI characters, applied chat edits, accepted suggestions where available, activity windows, and chat sessions.

### 💬 Chat sessions and activity

Browse Copilot sessions across workspaces with type, workspace, text, and sort filters. Expand a session to inspect prompts, responses, model attribution, checkpoints, file edits, and code changes. The Chat Activity preview charts unique conversations and recorded prompts for Today, This Week, or rolling 7/30/60/90-day periods.

### 📝 Standup Digest

Generate a copyable daily or detailed Markdown report for the current workspace. Choose Today, Yesterday, or Two Days Ago, retain Activity Highlights while changing report views, and review changed files, AI activity, delivery references, builds, deployments, and MCP evidence when those facts are available.

### 👤 Accounts and Copilot state

Review connected GitHub, Microsoft, and GitHub Enterprise accounts, OAuth scopes, trusted extensions, session information, and Copilot policy evidence. The dashboard identifies the account actively used by Copilot from local VS Code state.

### 🔌 MCP servers and language models

Discover MCP servers from workspace files, user configuration, and VS Code settings. View server commands, arguments, tools, tags, and source files. Language-model inspection uses `vscode.lm.selectChatModels()` to show vendor, family, version, token limits, and measured context information.

### ✅ Readiness and update awareness

Readiness checks summarize account, extension, session, model, and MCP conditions with ready, warning, or error states. The sidebar and full dashboard can show a cached Marketplace update banner when a newer extension version is available.

## Installation

Install **GitHub Copilot Insights Dashboard** from the Visual Studio Marketplace with identifier `shubhj.ghcp-dashboard`.

You can also install it from the command line:

```text
code --install-extension ShubhJ.ghcp-dashboard
```

After installation:

1. Select the GitHub icon in the VS Code Activity Bar.
2. Open **Account Overview**.
3. Choose **Open Full Dashboard** for the complete tabbed experience.

## Usage

1. Open the GHCP sidebar from the Activity Bar.
2. Select **Open Full Dashboard**.
3. Sign in to GitHub if VS Code requests authentication.
4. Use Overview, Chat Sessions, Chat Activity, AI Stats, Accounts, Model & MCP, Standup, and Info views.
5. Run **GHCP: Refresh Account Data** after changing accounts, AI settings, or MCP configuration.
6. Enable `editor.aiStats.enabled` if you want VS Code to retain AI editing statistics for future analysis.

Available commands include:

| Command | Purpose |
| --- | --- |
| `GHCP: Open Copilot Insights Dashboard` | Open the full dashboard panel. |
| `GHCP: Refresh Account Data` | Refresh accounts, usage, sessions, models, and MCP configuration. |
| `GHCP: Switch GitHub Account` | Sign in, sign out, or manage GitHub and Microsoft accounts. |

## Privacy and data sources

- Account information comes from the VS Code authentication API and local state.
- AI statistics are read from workspace `state.vscdb` and `state.vscdb-wal` files.
- Chat history comes from local Copilot and agent-session storage.
- MCP definitions come from workspace files, user files, and VS Code settings.
- State database access is read-only.
- Tokens are partially masked and never displayed in full.
- Webview content uses a nonce-based Content Security Policy.
- A public Marketplace request is cached and used only to check for a newer extension version.
- Dashboard, chat, usage, and standup data are not uploaded to an extension-owned server.

## Release notes

### Version 4.2.0 — 13 October 2026

**Standup reporting**

- Added **Daily Digest Preview** and **Detailed Digest Preview** with separate Markdown copy actions.
- Added detailed evidence for changed files, activity timelines, AI activity, delivery references, builds, deployments, and MCP use.
- Added Today, Yesterday, and Two Days Ago selection while preserving current-workspace scope.

**Accuracy and layout**

- Kept Activity Highlights visible while switching the report card on the right.
- Included sessions explicitly marked as current-workspace activity, including multi-root repositories.
- Prevented current-day activity windows from extending beyond the current local time.
- Simplified Sidebar Quick Access and New Releases by removing redundant AI Stats entries.

### Version 4.1.0 — 13 October 2026

**Chat Activity Dashboard preview**

- Added daily conversation and prompt charts with summary tiles.
- Added Today, This Week, and rolling 7/30/60/90-day ranges.
- Added workspace and conversation-type filters.
- Counted multi-day conversations once in the period total and on each day with recorded request activity.

**Update and overview experience**

- Added a cached Marketplace update check with Update and Cancel actions in the sidebar and dashboard.
- Added a fixed seven-day Chat Activity snapshot above collapsed AI Usage Metrics.
- Reorganized the top overview row into a responsive Copilot Chat and Recent Sessions split.
- Added horizontally scrollable charts with a sticky Y-axis and unclipped date labels.

### Version 4.0.1 — 7 October 2026

**Session and usage accuracy**

- Assigned chat activity to dates containing real request activity rather than only the final message date.
- Added retained-coverage reporting when a selected period exceeds available AI Stats records.
- Added current `agent-host-copilotcli` cache support and native session-resource reopening.
- Derived Copilot SDK and CLI prompt totals from persisted session turns.

**Session presentation**

- Replaced ambiguous status squares with semantic Agent, Chat, Ask, Plan, and Custom Agent icons.
- Added grouping by date or workspace, clearer workspace notices, prompt-count badges, and explicit Agent identity.
- Removed Accepted Suggestions cards and charts from the primary metrics UI.

### Version 3.0.3 — 7 October 2026

- Prevented near-100% AI character share from rounding to 100% when typed characters exist.
- Clarified that Sessions are VS Code five-minute AI activity windows.
- Renamed **All Time** to **All Available** to reflect bounded local storage.
- Grouped long-range charts into weekly or monthly buckets without changing totals.
- Added an explicit Overview workspace filter.
- Replaced the cramped sidebar tile grid with a readable single-column layout.

### Version 3.0.1 — 25 September 2026

- Added the first **Standup Digest preview** for local current-workspace activity.
- Added focused sidebar links for AI Stats, Standup, and Chat Sessions.
- Corrected AI Stats reads to use the live SQLite row instead of stale pages.
- Merged agent-cache and JSONL session evidence with request timestamps and tool provenance.
- Scoped Standup to the current workspace and current day.

### Version 2.0.5 — 8 June 2026

- Added a Chat Sessions tile to AI Stats using the same period and workspace filters.
- Counted chat-only days in Active Days and displayed their contribution.
- Combined AI activity windows and chat sessions in the Sessions Activity chart.
- Added chat overlap details to AI Rate chart tooltips.
- Included workspaces that contain chat activity even when they have no AI Stats records.

## Roadmap

Roadmap items are taken from the extension's current **Upcoming Features** panel and feature-ideas backlog. They are directional and do not represent committed delivery dates.

### Highlighted upcoming features

- 🛡️ **MCP Security Check** — scan MCP configurations for risky secrets and unsafe commands.
- 🔐 **Privacy Inspector** — review local AI data locations and potential sensitive content.
- ⚖️ **Model and Agent Comparison** — compare session activity, edits, and outcomes by model or agent.

### Reporting and analysis

- **Usage trends and exports** — weekly or monthly reporting with exportable evidence.
- **Acceptance by language** — compare Copilot assistance across TypeScript, Python, C#, and other languages.
- **Session export and bookmarks** — retain important conversations and export them to Markdown.
- **Full-content chat search** — search prompts and responses rather than session titles only.

### Health and operations

- **Copilot Health Check** — combine authentication, extension versions, settings, models, and network diagnostics.
- **MCP Server Health Monitor** — surface connected, stopped, and failed states with logs and restart actions.
- **Notification reminders** — warn when AI Stats recording becomes disabled or local activity becomes stale.

### Team-level exploration

- **Opt-in team dashboard** — aggregate explicitly shared adoption evidence for engineering leads.
- **Productivity and cost models** — explore transparent estimates based on local accepted edits and usage evidence without presenting them as authoritative ROI.
