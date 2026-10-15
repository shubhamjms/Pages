---
title: "PowerApps Solution Packager"
summary: "Export, download, and unpack Power Apps and Dataverse solutions from a dedicated VS Code sidebar without deleting existing files."
kind: "extension"
platforms:
  - "vscode"
  - "windows"
  - "power-platform"
  - "dynamics-365"
  - "dataverse"
version: "2.0.1"
status: "stable"
updated: "2026-10-08"
draft: false
presentation: "product"
latestReleaseSummary: "Version 2.0.1 improves prerequisite guidance, inline validation, and sidebar layout behavior."
titleImage: "./icon-powerapps-package.png"
links:
  marketplace:
    label: "Install from the Visual Studio Marketplace"
    url: "https://marketplace.visualstudio.com/items?itemName=codefox.d365-solutions-unpacking-agent-vscode"
  latest-video:
    label: "Watch the latest PowerApps Solution Packager walkthrough"
    url: "https://youtu.be/cmokj2ZzPZY"
  video:
    label: "Watch the PowerApps Solution Packager overview"
    url: "https://youtu.be/sJ4nCBstuK8"
relatedTools:
  - "edge/eagleeye"
relatedArticles: []
---

## Overview

**PowerApps Solution Packager** is a sidebar-first VS Code extension for moving Dynamics 365 and Dataverse solutions into source control. It supports an offline workflow for solution archives already on disk and an online workflow that signs in, exports a solution through the Dataverse Web API, downloads it, and optionally unpacks it.

Every extraction runs `SolutionPackager.exe` with `/allowDelete:No`. Files already present in the destination but absent from the solution archive are preserved.

## Why it exists

Power Platform solution work often requires developers to move between environment authentication, solution export, file downloads, command-line tools, and destination folders. PowerApps Solution Packager brings those dependencies into one guided Activity Bar view.

The sidebar orders the workflow around the shared SolutionPackager engine, then offline unpacking, followed by online authentication and download or unpack operations. Status borders, progress reporting, an Activity log, and quick folder access keep the current state visible.

## Useful for

- Unpacking a local solution `.zip` without signing in.
- Securely authenticating to Dynamics 365 or Dataverse with MSAL and PKCE.
- Listing environment solutions and exporting them as managed or unmanaged.
- Downloading a solution archive without unpacking it.
- Exporting and unpacking a solution in one guided operation.
- Preserving existing destination files during repeated exports.
- Using either an extension-managed or custom `SolutionPackager.exe`.

## Key capabilities

### Offline unpack

Choose a local solution archive, select its managed or unmanaged type, and unpack it into a destination folder. This path requires SolutionPackager but does not require an environment or authentication.

### Online download and unpack

Sign in through the browser, select a solution, and export it through the Dataverse `ExportSolution` action. Choose **Download only** to retain the `.zip`, or **Download & Unpack** to extract it into source-controlled files.

### Secure authentication

Authentication uses the MSAL authorization-code flow with PKCE and a loopback redirect. The logical session is cached for up to 24 hours and ends on sign-out, when that limit is reached, or when Microsoft Entra ID expires the refresh token.

### Managed SolutionPackager

The extension downloads `Microsoft.CrmSdk.CoreTools` from NuGet, caches `SolutionPackager.exe` and its dependencies in VS Code global storage, displays the installed version, checks for updates, and supports one-click updates.

A custom executable can be selected when machine policy blocks the managed copy. The extension validates the executable name, Windows signature, product identity, and required adjacent SDK assemblies before using it.

### Progress and safety

Each workflow card displays success or error state through its side border. During a run, setup cards collapse to keep the Activity log in focus, a determinate progress bar reports the current phase, and **Open folder** reveals the result.

## Extension identity and workflow

![PowerApps Solution Packager extension logo](./icon-powerapps-package-preview.png)

The extension's CodeFox helper uses the same workflow language shown in the sidebar:

1. 🦊 → 🚪 **Authenticate** — securely sign in to the target environment.
2. 🦊 → 🔎 **Discover** — load and search the available solutions.
3. 🦊 📦 **Export** — ask Dataverse to build the selected solution package.
4. 🦊 📦 **Download** — save the returned archive to the selected location.
5. 🦊 → 🧰 **Prepare** — validate or provision SolutionPackager.
6. 🦊 📂 **Unpack** — extract the solution into source files without deleting existing files.

## Installation

Install **PowerApps Solution Packager** from the Visual Studio Marketplace. Its extension identifier is `codefox.d365-solutions-unpacking-agent-vscode`, and it supports VS Code 1.90.0 and newer.

You can also install it from the command line:

```text
code --install-extension codefox.d365-solutions-unpacking-agent-vscode
```

## Usage

### Offline workflow

1. Open **PowerApps Solution Packager** from the Activity Bar.
2. Set up the managed SolutionPackager or select a custom executable.
3. Choose a solution `.zip` already on disk.
4. Select **Managed** or **Unmanaged** to match the archive.
5. Choose the extraction folder and start unpacking.

### Online workflow

1. Authenticate to the target Dynamics 365 or Dataverse environment.
2. Load and select a solution.
3. Choose managed or unmanaged export.
4. Select a download folder.
5. Choose **Download only** or **Download & Unpack**.
6. For unpacking, select the destination folder and start the run.

The online unpack path ultimately runs:

```text
SolutionPackager.exe /action:Extract /zipfile:<downloaded.zip> /folder:<extract-folder> /packagetype:<Managed|Unmanaged> /allowWrite:Yes /allowDelete:No /errorlevel:Info /nologo
```

## Configuration

- `d365UnpackingAgent.auth.clientId` and `tenantId` control the public-client application and tenant used for sign-in.
- `d365UnpackingAgent.auth.sessionLifetimeHours` allows 1–24 hours and defaults to 24.
- `d365UnpackingAgent.solutionPackager.pathOverride` selects a custom `SolutionPackager.exe`.
- `d365UnpackingAgent.solutionPackager.nugetPackageId` defaults to `Microsoft.CrmSdk.CoreTools`.
- `d365UnpackingAgent.apiVersion` defaults to Dataverse Web API `v9.2`.
- `d365UnpackingAgent.notifications` supports all, important, or silent desktop notifications. The in-view status footer and Activity log remain available in every mode.

## Release notes

### Version 2.0.1 — 8 October 2026

**Interaction and validation**

- Kept idle actions available so selecting an unavailable workflow now explains the missing prerequisite instead of presenting only a disabled control.
- Added consolidated guidance for missing authentication, SolutionPackager setup, and required fields.
- Clear field-level and section-level errors as users correct folders, solutions, and other inputs.
- Improved online and offline prerequisite messages, including guidance to use **Download only** when SolutionPackager is not required.

**Layout**

- Improved long-label handling with constrained widths, truncation, and safer wrapping in the sidebar.
- Refined CodeFox helper layout behavior alongside the updated form interactions.

### Version 2.0.0 — 8 October 2026

**Product identity**

- Renamed the extension from **D365 CRM Solutions Unpacking Agent** to **PowerApps Solution Packager**.
- Introduced the Power Apps package logo used by the Marketplace, Activity Bar, sidebar, and extension page.
- Updated commands, configuration labels, window titles, and sign-in status text to use the new product name.

**Documentation**

- Updated the README, developer guide, and feature backlog to match the new identity while retaining the existing extension identifier for compatibility.

### Version 1.5.6 — 29 September 2026

**Sidebar polish**

- Corrected the managed/unmanaged archive warning layout so its explanatory text aligns and wraps consistently.
- Improved supporting message presentation without changing the underlying unpack workflow.

### Version 1.5.5 — 24 September 2026

**Offline unpacking**

- Added a complete offline path for unpacking a local solution `.zip` without authentication or an environment.
- Reused the same managed or custom SolutionPackager setup used by online operations.

**Guided sidebar**

- Reorganized the sidebar by dependency: SolutionPackager, Offline unpack, then Online unpack with Authentication and Download & Unpack steps.
- Added a read-only environment URL synchronized with the active sign-in and reset the form when the environment changes.
- Added green and red status borders to workflow cards.
- Collapsed setup cards during active runs so the Activity log stays visible.

**Run feedback**

- Added determinate progress reporting and an **Open folder** action on completion.
- Ensured Download-only mode clears the hidden unpack destination.

### Version 1.4.5 — 15 September 2026

**Download modes**

- Added an explicit choice between **Download only** and **Download & Unpack**.
- Made the extraction folder conditional so it is required only when unpacking.
- Updated form state and validation to follow the selected mode.

## Roadmap

These items come from the project's feature backlog. They are ideas under consideration, not committed release dates or guarantees.

### Near-term candidates

- **Zip retention policy** — support overwrite, timestamped archives, and keeping the most recent N exports per solution.
- **Advanced SolutionPackager options** — expose localization, map files, log files, and configurable error levels.

### Workflow expansion

- **Multi-solution batch runs** — export a selected set of solutions with per-solution progress and failure summaries.
- **Managed and unmanaged in one run** — export both package types to separate archives and folders.
- **Multiple concurrent organizations** — retain several authenticated environment sessions and switch the active environment from the sidebar.

### Longer-term exploration

- **Pack and import** — reverse the flow by packaging an edited source folder and importing it with explicit confirmation and asynchronous status polling.
- **Large-solution export** — evaluate `ExportSolutionAsync` with polling to avoid synchronous export timeouts.
