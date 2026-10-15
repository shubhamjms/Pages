---
title: "Grounding a useful answer"
summary: "Choose sources and retrieval patterns that make an answer both relevant and inspectable."
type: "guide"
topic: "ai-copilot"
published: "2026-08-19"
draft: false
tags:
  - "grounding"
  - "knowledge"
relatedArticles:
  - "the-work-begins-after-the-answer"
---

Grounding is not merely attaching documents to an agent. It is the work of deciding what counts as trustworthy context and how a reader can recognize it in the result.

## Start with the question boundary

Write down the questions a source should answer and the questions it should not. A narrower boundary improves retrieval and makes gaps easier to see.

## Prefer inspectable sources

Use sources with an owner, a known update rhythm, and stable language. Remove duplicate or obsolete material before trying to compensate with prompt instructions.

## Test retrieval before prose

Inspect which passages are returned for representative questions. If the evidence is wrong, a more elegant answer only hides the defect.

> Retrieval quality is a content and information-architecture problem before it is a prompting problem.

## Show the path back

Return citations or source labels that a reader can follow. Good grounding shortens the distance between a claim and the evidence that supports it.