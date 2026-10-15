---
title: "EagleEye — Dynamics D365 Tools"
summary: "Inspect, test, copy, clone, and navigate Dynamics 365 model-driven app records from a focused Microsoft Edge extension."
kind: "extension"
platforms:
  - "edge"
  - "power-platform"
  - "dynamics-365"
  - "dataverse"
version: "1.0.3"
status: "stable"
updated: "2026-09-23"
draft: false
presentation: "product"
latestReleaseSummary: "Version 1.0.3 adds a dedicated navigation toolset, grouped Forms and Navigation views, and clearer feature actions."
titleImage: "./eagleeye.png"
links:
  marketplace:
    label: "Install from Microsoft Edge Add-ons"
    url: "https://microsoftedge.microsoft.com/addons/detail/eagleeye-%E2%80%94-dynamics-d365-/gphpjheamaiiacfgadcnkhjhpfmmicbf"
  youtube-video:
    label: "Watch the EagleEye overview"
    url: "https://youtu.be/Jsz-ZxtSmJ4"
relatedTools:
  - "vs-code/d365-solutions-unpacking-agent"
relatedArticles: []
---

## Overview

**EagleEye — Dynamics D365 Tools** is a Microsoft Edge extension for developers and administrators working in Dynamics 365 model-driven apps. It brings form inspection, schema-name helpers, record utilities, cloning, preview editing, and environment navigation into a compact popup and side panel.

The extension activates only on supported Dataverse environment hosts. It detects the current record context, organizes available tools into **Forms** and **Navigation**, and keeps commonly used actions close to the active browser tab.

## Why it exists

Model-driven app troubleshooting frequently requires developers to inspect fields, copy logical names and record identifiers, construct Web API URLs, open administration pages, or temporarily reveal hidden form controls. Doing that manually interrupts the investigation and creates opportunities for copying the wrong environment or record context.

EagleEye resolves the current Dynamics page first, then exposes focused actions for that page.

## Useful for

- Revealing and enabling form controls temporarily with Eagle Mode.
- Finding every field and formatted value on the current record.
- Viewing choice labels alongside their underlying OptionSet numbers.
- Displaying and copying field logical names directly on the form.
- Copying the current record ID or opening its Dataverse Web API URL.
- Creating a shallow clone and reviewing device-local clone history.
- Previewing fields not present on the form through Eagle PRO Edit.
- Opening records, entity lists, Solutions, PPAC, and Plug-in Trace Logs.

## Key capabilities

### 🦅 Eagle Mode

Temporarily makes form fields optional, visible, and enabled, then expands tabs and sections for inspection and testing. Toggle it again to restore the original page state. The changes remain in the browser until a user explicitly saves the record.

### ▦ All Fields and OptionSet values

Loads record fields through the Dataverse Web API into a searchable table. Results include display names, logical names, formatted values, and copy actions. The OptionSet view maps Choice labels to their numeric values.

### 🏷 Logical-name tools

Adds logical-name badges beneath form labels across tabs, sections, and header controls. Copy Mode adds a one-click copy control beside each schema name.

### 🔑 Record references

Shows and copies the current record GUID. It can also construct, copy, or open the record's OData Web API endpoint for direct inspection.

### ⧉ Clone and history

Creates a shallow copy of the current record after confirmation, including scalar values and single-valued lookups. The clone receives an `EE-Clone` timestamped name, opens in a new tab when requested, and is added to a device-local reference history.

### ✎ Eagle PRO Edit

Provides a read-only preview of fields that may not appear on the current form. The feature is designed around System Administrator and System Customizer access checks because future write operations would bypass normal form logic.

### 🎯 Navigation tools

The Navigation group can open a record by entity and GUID, open an entity list, launch Solutions, open the Power Platform Admin Center, or go directly to Plug-in Trace Logs.

## Installation

Install **EagleEye — Dynamics D365 Tools** from Microsoft Edge Add-ons.

For local development, enable extension developer mode, choose **Load unpacked**, and select the repository's `extension` folder.

## Usage

1. Open a supported Dynamics 365 model-driven app in Microsoft Edge.
2. Select EagleEye from the browser toolbar or Edge side panel.
3. Confirm the connected environment and record context.
4. Choose a tool from the **Forms** or **Navigation** group.
5. Review the information note before actions that expose, clone, or eventually modify data.
6. Toggle reversible tools such as Eagle Mode or Logical Names again to restore the form.

Supported environment patterns include:

- `<org>.crm#.dynamics.com` for commercial and GCC environments.

## Privacy and permissions

- `activeTab` and `scripting` resolve and interact with the current supported Dynamics tab.
- `sidePanel` hosts the expanded tool experience.
- `clipboardWrite` supports explicit copy actions.
- `storage` retains preferences, favorites, and local clone references.
- Host permissions are limited to supported Dynamics and Dataverse environment patterns.
- Clone history stores references on the current device rather than synchronizing record data.

## Release notes

### Version 1.0.3 — 5 September 2026

**Navigation**

- Added **Open by ID** for launching a record from its entity logical name and GUID.
- Added **Open List** for opening an entity's main list view.
- Added direct links to **Solutions**, **Power Platform Admin Center**, and **Plug-in Trace Logs**.

**Organization and usability**

- Grouped tools into dedicated **Forms** and **Navigation** sections.
- Kept feature ordering stable while supporting favorites inside each category.
- Renamed logical-name actions to **Logical Names** and **Logical Names (Copy Mode)**.
- Consolidated secondary information, favorite, and PRO indicators into a clearer action area.

### Version 1.0.2 — 4 September 2026

**Eagle PRO Edit preview**

- Added a metadata-driven preview for record fields that are not present on the form.
- Added role-aware guidance for System Administrator and System Customizer scenarios.
- Marked the feature as read-only while validation, field-security handling, and safe write behavior remain under design.

### Version 1.0.1 — 1 September 2026

**Production UI**

- Promoted the extension to its 1.x production line.
- Refined feature-list presentation across the popup and side panel.
- Improved navigation between tool views while retaining shared favorites and feature metadata.

### Version 0.1.2 — 18 August 2026

**Form inspection**

- Expanded Eagle Mode behavior for form controls, tabs, and sections.
- Added shared form actions used by field inspection and record utilities.
- Prepared the production package used for the first Edge distribution line.

## Roadmap

These items are drawn from the project's phase plan and design documents. They describe direction under consideration, not committed release dates.

### Forms and testing

- **Changed fields and refresh tools** — inspect dirty values, refresh subgrids, refresh without saving, and open the modern form editor.
- **Forms Pro utilities** — form filling, blur and unblur controls, auto-save control, process discovery, and requirement-level highlighting.
- **Safe PRO Edit expansion** — add type-aware editing in risk order with role checks, field-security validation, confirmations, and explicit result reporting.

### Diagnostics and administration

- **Debug flags** — Forms Monitor, Command Checker, Performance Center, dark-mode flags, and an active-flags indicator.
- **Administrative navigation** — Security, System Jobs, Processes, Mailboxes, Solutions History, user information, organization settings, and privilege checks.
- **Metadata cache** — environment-scoped entity metadata to support safer entity and record pickers.

### Advanced workflows

- **Impersonation** — privilege-gated, per-tab impersonation with cleanup when a tab closes.
- **Custom commands** — a sandboxed command editor with import, export, and Xrm-aware completions.
- **Cross-environment clone** — a separately reviewed workflow with target mapping, confirmation, audit evidence, and strict non-production validation.

### Hardening

- Add automated unit and browser tests, accessibility validation, stronger focus management, and production store checks.
