---
title: "Small tools, clear contracts"
summary: "A focused tool with explicit inputs and outputs often outlives a broad platform promise."
type: "essay"
topic: "builder-tools"
published: "2026-07-28"
draft: false
tags:
  - "tools"
  - "maintenance"
relatedArticles:
  - "evidence-before-automation"
---

A small tool is easy to underestimate. Its narrow scope can be an advantage when the contract is explicit and the work can be inspected.

## Name the job

The tool should have one sentence that explains the change it makes for a builder. If that sentence keeps accumulating conjunctions, the ownership boundary is probably too wide.

## Keep inputs boring

Prefer stable formats, validated identifiers, and familiar controls. Novel input mechanisms rarely improve a repetitive engineering task.

## Return a useful result

Show what happened, where it happened, and what the builder can do next. A success toast without evidence is only decoration.

## Make removal possible

Tools age. Clear dependencies and portable data make replacement an ordinary maintenance decision rather than a crisis.