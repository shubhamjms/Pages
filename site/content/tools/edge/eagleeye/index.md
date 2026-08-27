---
title: "EagleEYE"
summary: "Detect supported Dynamics 365 model-driven apps and inspect the current cloud and host from a compact Microsoft Edge sidebar."
kind: "extension"
platforms:
  - "edge"
  - "dynamics-365"
  - "dataverse"
version: "0.1.2"
status: "stable"
updated: "2026-08-18"
draft: false
links:
  marketplace:
    label: "Install from Microsoft Edge Add-ons"
    url: "https://microsoftedge.microsoft.com/addons/detail/gphpjheamaiiacfgadcnkhjhpfmmicbf"
relatedTools:
  - "vs-code/d365-solutions-unpacking-agent"
relatedArticles: []
---

## Why it exists

Builders often move between several Dynamics 365 environments and need a quick way to confirm whether the active tab is a supported model-driven app. EagleEYE performs that check from a compact Microsoft Edge sidebar and reports the matched cloud category and host.

## Useful for

- detecting supported Dynamics 365 model-driven app tabs;
- seeing a clear connected or disconnected status;
- identifying the current Dynamics cloud category and host;
- avoiding activation on unrelated Microsoft and web pages;
- checking environment context without leaving the browser.

## Installation

Install **EagleEYE - Dynamics D365 Tools** from Microsoft Edge Add-ons. Version 0.1.2 is published by **Shubhamm**.

## Usage

Open a Dynamics 365 model-driven app, then open EagleEYE from the Edge sidebar. The extension validates the active tab and displays its connection status, matched cloud, and resolved host. Unsupported pages receive a disconnected status.

## Limitations

This release is a focused environment-awareness baseline. It detects and reports supported Dynamics hosts but does not modify pages or provide broader administration features. Its runtime validation intentionally keeps the extension inactive on unsupported sites.
