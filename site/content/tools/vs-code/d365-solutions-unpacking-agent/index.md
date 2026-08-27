---
title: "D365 CRM Solutions Unpacking Agent"
summary: "Export Dataverse solutions and unpack them into source files from a dedicated VS Code sidebar without deleting existing files."
kind: "extension"
platforms:
  - "vscode"
  - "windows"
  - "dynamics-365"
  - "dataverse"
version: "1.1.0"
status: "stable"
updated: "2026-08-27"
draft: false
links:
  marketplace:
    label: "Install from the Visual Studio Marketplace"
    url: "https://marketplace.visualstudio.com/items?itemName=codefox.d365-solutions-unpacking-agent-vscode"
relatedTools:
  - "edge/eagleeye"
relatedArticles: []
---

## Why it exists

Dynamics 365 and Dataverse solution work often requires builders to switch between environment authentication, Web API exports, and command-line unpacking. D365 CRM Solutions Unpacking Agent brings that workflow into a dedicated VS Code sidebar.

The extension authenticates to a Dynamics 365 or Dataverse environment, exports a selected solution through the Dataverse Web API, and unpacks it into source files with a self-managed `SolutionPackager.exe`. Existing files are never deleted as part of the workflow.

## Useful for

- authenticating to Dynamics 365 and Dataverse environments from VS Code;
- exporting managed or unmanaged solutions;
- unpacking solution archives into source-controlled files;
- keeping the export and unpack workflow in a single sidebar;
- preserving existing files while refreshing solution contents.

## Installation

Install **D365 CRM Solutions Unpacking Agent** from the Visual Studio Marketplace. The extension identifier is `codefox.d365-solutions-unpacking-agent-vscode` and version 1.1.0 supports VS Code 1.90.0 and newer.

The extension is published by **codefox**, authored by **Jadhav Shubhamm**, and licensed under MIT.

## Usage

Open the extension sidebar, authenticate to the target environment, select the solution to export, and choose the destination for its unpacked source. The extension downloads the solution through the Dataverse Web API and manages the Solution Packager executable used to unpack it.

## Limitations

The workflow requires valid environment credentials and sufficient Dataverse privileges to export solutions. It targets VS Code on Windows because solution unpacking relies on `SolutionPackager.exe`; environment policies and solution dependencies still apply.
