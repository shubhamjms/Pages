---
title: "GHCP Account & Usage Dashboard"
summary: "See the active GitHub Copilot account and inspect cross-workspace sessions, real AI usage, MCP servers, and models from one offline VS Code dashboard."
kind: "extension"
platforms:
  - "vscode"
  - "github-copilot"
  - "ai"
version: "2.0.4"
titleImage: "./ghcp-dashboard.png"
status: "stable"
updated: "2026-06-08"
draft: false
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

Ever struggled to confirm which GitHub Copilot account is active in VS Code, or understand what your real AI usage looks like? **GHCP Account & Usage Dashboard** brings account, session, usage, model, and MCP information into one unified view directly inside VS Code.

| Detail | Value |
| --- | --- |
| Extension name | GHCP Account & Usage Dashboard |
| Unique identifier | `shubhj.ghcp-dashboard` |
| Publisher | ShubhJ |
| Version | 2.0.4 |
| VS Code compatibility | `^1.95.0` |
| Operation | 100% offline |

## Why it exists

Copilot information is otherwise spread across account sessions, local workspace storage, chat history, editor statistics, model registrations, and MCP configuration files. The dashboard connects those local sources so builders can identify the account Copilot is using, review meaningful usage evidence, and inspect their AI environment without leaving the editor.

All dashboard data is sourced locally. The extension does not require an internet connection or external API calls after installation.

## Useful for

- viewing connected GitHub, Microsoft, and GitHub Enterprise accounts;
- detecting which account is actively used by GitHub Copilot;
- browsing Agent, Ask, Chat, Plan, and custom-agent sessions across workspaces;
- reviewing AI rate, accepted suggestions, typed versus AI characters, chat edits, and sessions;
- inspecting MCP servers, registered tools, and configuration locations;
- reviewing available language models, vendors, token limits, and context-window measurements;
- checking whether the local Copilot environment is ready or missing required configuration.

## Dashboard views

### Dashboard overview

Shows Copilot extension status and version, the detected active account, current AI usage metrics, interactive charts, recent workspace sessions, and warnings when `editor.aiStats.enabled` is disabled.

### Chat Sessions

Browses Copilot conversations across all workspaces with filters for mode, workspace, search text, and sort order. Expand a session to inspect prompts, responses, model attribution, checkpoints, file edits, and code changes. Sessions from the current workspace can be reopened directly.

### AI Stats

Reads real usage data from workspace `state.vscdb` files. The dashboard tracks AI rate, AI and typed characters, accepted suggestions, chat edits, and sessions with workspace and period filters. It also detects disabled or stale AI statistics and explains when data cannot be recovered.

### Accounts

Lists connected GitHub, Microsoft, and GitHub Enterprise accounts with connection status, OAuth scopes, trusted extensions, session details, and Copilot policy information.

### Model & MCP

Lists available language models through `vscode.lm.selectChatModels()`, including vendor, family, version, and token limits. It also discovers MCP servers from workspace files, user configuration, and VS Code settings, then shows their commands, tools, tags, and source files.

### Sidebar and readiness

The compact sidebar summarizes weekly AI metrics, Copilot status, the last-used account, model count, and MCP servers. Readiness checks report clear ready, warning, or error states with actions for resolving missing configuration.

## Commands

| Command | Purpose |
| --- | --- |
| `GHCP: Open Account & Usage Dashboard` | Open the full dashboard panel. |
| `GHCP: Refresh Account Data` | Refresh accounts, statistics, sessions, and MCP configuration. |
| `GHCP: Switch GitHub Account` | Sign in, sign out, or manage GitHub and Microsoft accounts. |

The `GHCP` status-bar item also opens the dashboard.

## Installation

Install **GHCP Account & Usage Dashboard** from the Visual Studio Marketplace using identifier `shubhj.ghcp-dashboard`. After installation, select the GitHub icon in the Activity Bar and choose **Open Full Dashboard**.

## Usage

1. Open the GHCP sidebar from the VS Code Activity Bar.
2. Select **Open Full Dashboard**.
3. Sign in to GitHub when prompted.
4. Use the Overview, Chat Sessions, AI Stats, Accounts, and Model & MCP tabs to inspect the local environment.
5. Run **GHCP: Refresh Account Data** after changing accounts, settings, or MCP configuration.

## Privacy and data sources

- Account information comes from the VS Code authentication API and local `state.vscdb` data.
- AI statistics and chat sessions are read from VS Code workspace storage.
- MCP servers are read from local configuration files and VS Code settings.
- State database access is read-only.
- Access tokens are partially masked and never shown in full.
- Webview content uses a Content Security Policy with nonces.
- No dashboard data is sent to an external server.

## Limitations

AI usage history is available only when VS Code has recorded it through `editor.aiStats.enabled`; data missed while that setting is disabled cannot be reconstructed. Chat sessions can be reopened only from their original workspace. Model, MCP, account, and session views depend on what is installed or configured locally, and VS Code may not flush its latest statistics until a session ends or the workspace is restarted.
