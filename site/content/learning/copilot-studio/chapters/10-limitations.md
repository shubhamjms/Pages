---
title: Limitations & Boundaries
summary: Recognize platform constraints and design explicit boundaries around them.
type: reference
level: intermediate
updated: "2026-08-26"
draft: false
tags:
  - deep-dive
  - limitations
---

Every platform has limits. Knowing Copilot Studio's **quotas, character caps, throttles, and
feature boundaries** up front saves you from designing an agent that can't ship. This section
collects the limits that matter most for beginners and builders.

> Limits change over time and can differ by **license**, **region**, and **cloud** (commercial vs.
> GCC/GCC High/DoD). Always confirm the current numbers on the linked Microsoft Learn pages before
> committing to a design.

---

## 1. Authoring limits (characters & counts)

| Item | Limit | Notes |
| --- | --- | --- |
| **Description** | **1,024** characters | Drives discovery + routing. |
| **Instructions** | **8,000** characters | The system prompt; shorter+structured beats long. |
| **Agent name** | ~**30** characters (short) | Keep it human-friendly. |
| **Node name** | **500** characters | You can't rename Trigger / Go to step nodes. |
| **Trigger phrases** | **5–10** recommended per topic | More isn't always better; avoid overlap across topics. |
| **Starter / suggested prompts** | **10** max | Teams / Microsoft 365 only. |
| **Multiple entities in one question** | **5** max | "One of multiple entities"; only the first match is captured. |
| **Topics per agent** | Large but finite | Keep topics small and focused. |
| **Icon image** | **PNG ≤ 72 KB, ≤ 192×192** | A distinctive icon aids recognition. |

> Type is **fixed on first assignment** for a variable — you can't store a String into a Number
> variable later without an error.

---

## 2. Knowledge (generative answers) limits

| Area | Limitation |
| --- | --- |
| **File upload size** | Each uploaded file has a max size cap (varies by source type). Very large files are truncated or rejected. |
| **Number of sources** | You can add many, but more sources can dilute relevance and slow responses. |
| **Public website indexing** | Only crawlable, public pages; auth-gated or JS-heavy content may not be read. Limited number of URLs per source. |
| **SharePoint / OneDrive** | Respects the **signed-in user's** permissions; works best with text-based docs. |
| **Freshness** | Indexed content isn't real-time; updates take time to reflect. |
| **Unsupported content** | Images inside docs, scanned PDFs (no OCR), audio/video, and complex tables may not be understood. |
| **Citations** | Generative answers cite sources, but citation accuracy depends on source quality. |
| **Languages** | Quality varies by language; best results in well-supported languages. |

> Knowledge answers are **grounded but not guaranteed** — the model can still miss, misread, or
> over-summarize. Always test with real questions.

---

## 3. Generative AI & orchestration limits

- **No guaranteed determinism.** The same input can produce slightly different wording each turn.
- **Hallucination risk.** Without strong instructions + grounding, the model can invent facts.
- **Planning depth.** Generative orchestration can chain tools/topics, but extremely long multi-step
  plans may time out or lose track. Keep tasks bounded.
- **Context window.** Very long conversations or huge inputs can exceed the model's context and drop
  earlier details.
- **Model availability.** Newer/Deep/Experimental models may be **region-limited**, **preview**, or
  **cross-geo** (data may leave your region) — not all are valid for production.
- **Latency vs. capability trade-off.** Deep reasoning models are slower and costlier; General models
  are fast but shallower.
- **Tool/connector reliability.** The agent depends on the underlying connector/flow; if that fails
  or throttles, the step fails.

---

## 4. Channel & publishing limits

| Channel | Key limitations |
| --- | --- |
| **Microsoft Teams / M365 Copilot** | Adaptive Cards limited to schema **1.5**; some rich content renders differently. |
| **Web Chat / custom website** | Supports Adaptive Cards **1.6** (no `Action.Execute`). |
| **Telephony / voice** | Requires voice configuration; some nodes/content (images, cards) don't apply; DTMF and SSML have their own rules. |
| **Quick replies** | Not supported on every channel; some channels cap how many show. |
| **Publishing required** | Changes to description, instructions, model, topics, and knowledge need a **Publish** to reach users (except secret environment variables, read at runtime). |
| **Channel parity** | A feature that works in the Test pane may behave differently once published to a specific channel. |

---

## 5. Capacity, quotas & throttling

- **Message/capacity packs.** Usage is metered (messages / Copilot Studio capacity). Heavy traffic
  consumes quota and may require additional licensing.
- **Rate limits / throttling.** APIs, connectors, and generative calls are subject to per-tenant and
  per-connector throttles; bursts can be slowed or queued.
- **HTTP request node.** Subject to timeouts and payload-size limits; long-running external calls can
  fail. Use Power Automate for complex/long operations.
- **Power Automate flows.** Inherit Power Platform flow limits (run duration, throughput, connector
  limits).
- **Concurrent sessions.** Very high concurrency may hit service limits depending on plan.

---

## 6. Security, governance & compliance limits

- **Environment scope.** Variables, solutions, and DLP policies are **per environment**; what works
  in dev may be blocked in prod by **Data Loss Prevention (DLP)** policies.
- **Authentication.** Some knowledge/tools require user authentication; anonymous channels can't
  access them.
- **Admin controls.** Tenant admins can disable agent creation, restrict connectors, and gate model
  access — you may not see features your license technically includes.
- **Sovereign clouds (GCC/GCC High/DoD).** Reduced feature set; some models, natural-language create,
  and cross-geo features are unavailable.
- **Sensitive data.** Mark variables as **sensitive** to keep them out of transcripts/logs — but this
  is opt-in, not automatic.
- **Responsible AI.** Generative features include content filters that may block certain prompts or
  responses.

---

## 7. Application Lifecycle Management (ALM) limits

- **Environment variables** are read-only in Copilot Studio (set by admins in Power Apps).
- **Solution-awareness** matters: build agents inside a **solution** for clean dev→test→prod movement.
- **Some references don't travel** cleanly across environments (connections, secrets, environment-
  specific URLs) and need reconfiguration after import.

---

## 8. Things Copilot Studio is *not* great at (by design)

- **Heavy custom UI.** It's conversational; it isn't a full app builder (use Power Apps for rich UI).
- **Deterministic, rules-only workflows at scale.** Pure logic pipelines may fit **Power Automate**
  better.
- **Long-form document generation / complex math.** The model can help but isn't a guaranteed engine.
- **Real-time data without a tool.** It only knows live data if you connect a tool/flow/HTTP call.
- **Offline use.** It's a cloud service; no offline mode.

---

## 9. Practical design tips to stay within limits

- Keep **instructions structured and concise** — well under 8,000 characters.
- Keep **topics small**; reuse logic via redirects.
- **Curate knowledge** — fewer, higher-quality sources beat many noisy ones.
- **Always test on the target channel**, not just the Test pane.
- Use **GA/Default models** for production; reserve Deep models for tasks that truly need them.
- Plan for **failure paths** (tool timeouts, "no valid entity", escalation to a human).
- Confirm **licensing/quota** for expected traffic before go-live.

---

### Key takeaways

- Hard caps to remember: **Description 1,024**, **Instructions 8,000**, **5** entities/question,
  **10** starter prompts, **Adaptive Cards 1.5 (Teams) / 1.6 (Web Chat)**.
- Generative answers are **grounded but not guaranteed** — design for hallucination and failure.
- **License, region, cloud, and admin policy** all change what you can actually use.
- Copilot Studio is **conversational-first** — pair it with Power Apps / Power Automate for the rest.

---

## Official Microsoft documentation (references)

Limits change frequently — verify current numbers here:

- [Quotas and limits in Copilot Studio](https://learn.microsoft.com/microsoft-copilot-studio/requirements-quotas)
- [Key concepts — knowledge sources](https://learn.microsoft.com/microsoft-copilot-studio/knowledge-copilot-studio)
- [Supported languages](https://learn.microsoft.com/microsoft-copilot-studio/authoring-language-support)
- [Adaptive Cards in agents](https://learn.microsoft.com/microsoft-copilot-studio/authoring-send-message)
- [Data Loss Prevention (DLP) for agents](https://learn.microsoft.com/microsoft-copilot-studio/admin-data-loss-prevention)
- [Application lifecycle management (ALM)](https://learn.microsoft.com/microsoft-copilot-studio/authoring-lifecycle-management)
- [Responsible AI FAQ](https://learn.microsoft.com/microsoft-copilot-studio/responsible-ai-overview)
- [Licensing and message capacity](https://learn.microsoft.com/microsoft-copilot-studio/requirements-licensing-subscriptions)
