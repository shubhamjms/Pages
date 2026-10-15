---
title: "Evidence before automation"
summary: "Establish observable outcomes before asking a system to act without supervision."
type: "build"
topic: "ai-copilot"
published: "2026-08-08"
draft: false
tags:
  - "testing"
  - "automation"
relatedArticles:
  - "agents-need-boundaries"
---

Automation should follow observability. If a builder cannot tell whether a manual or supervised run succeeded, autonomous execution only makes the uncertainty faster.

## Define the evidence first

For every action, identify the record, status, message, or test that proves the intended outcome occurred.

## Exercise failure deliberately

Test missing inputs, denied permissions, unavailable dependencies, and partial completion. These states deserve designed messages rather than generic exceptions.

## Increase autonomy gradually

Begin with suggestions, move to confirmed actions, and automate only after the evidence is stable and reviewable.