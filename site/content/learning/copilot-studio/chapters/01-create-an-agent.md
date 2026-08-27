---
title: How to Create an Agent (Step-by-Step)
summary: Create, configure, test, and publish a first agent in Copilot Studio.
type: chapter
level: beginner
updated: "2026-08-26"
draft: false
tags:
  - fundamentals
  - agent-builder
---

A complete walkthrough for creating your very first agent in Microsoft Copilot Studio,
including how to fill in the **Description**, **Instructions**, and pick the right **Model**.

> Do this **once** before starting [Lab 1](06-lab1.md). Then read
> [02-core-concepts.md](02-core-concepts.md) for the deeper why.

---

## Prerequisites

- A **work or school account** with access to Microsoft Copilot Studio, or a
  [Copilot Studio trial](https://copilotstudio.microsoft.com).
- Permission to use a **Power Platform environment** (your admin may control this).
- Modern browser (Edge or Chrome recommended).

---

## Step 1 — Sign in & pick an environment

1. Go to **https://copilotstudio.microsoft.com** and sign in.
2. In the **top-right corner**, click the **environment picker** and choose the environment you want to build in (for learning, pick a **dev/sandbox** environment, not production).

> An **environment** is an isolated container in Power Platform with its own data, security, and resources. Always know which environment you're in.

---

## Step 2 — Start creating

You'll land on the **Home** page. You have three ways to create an agent — pick **one**:

| Option | When to use | How |
| --- | --- | --- |
| **A. Natural-language create** (recommended for beginners) | You want the AI to suggest name, description, instructions, knowledge, and tools for you | On the **Home** page, type a description in the "Describe your agent" box (up to **1,024 characters**) and press **Enter** |
| **B. Create blank agent** | You want full manual control from scratch | On the **Home** or **Agents** page, select **Create blank agent** |
| **C. Advanced create** | You need to set the **primary language**, **solution**, or **schema name** before provisioning | **Agents** → arrow next to **Create blank agent** → **Advanced create** |

> If you're in a **sovereign cloud** (GCC, GCC High, DoD) or your admin disabled cross-geo, **Option A** may not appear. Use Option B instead.

### Example for Option A

In the "Describe your agent" box, type something like:

```
Help Contoso employees with HR questions about time-off policies,
benefits, and payroll. Escalate complex cases to a human HR agent.
```

Press **Enter**. Copilot Studio will:
- Generate a **name** (e.g., *HR Assistant*).
- Draft a **description** and **instructions**.
- Suggest **knowledge sources**, **tools**, and **triggers** (you can accept/dismiss).
- Provision the agent (~10–30 seconds).

You'll land on the **Overview** page.

---

## Step 3 — Tour of the Overview page

The Overview page is your agent's home base.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Overview │ Knowledge │ Tools │ Agents │ Topics │ Activity │ Analytics  │
├──────────────────────────────────────────────────────────────────────────┤
│  Details        ← name, icon, description                                │
│  Instructions   ← the system prompt that guides agent behavior           │
│  Model          ← which AI model the agent uses                          │
│  Starter prompts ← suggested conversation openers (Teams/M365)           │
│  Knowledge      ← websites, files, SharePoint, Dataverse                 │
│  Tools          ← connectors, Power Automate flows, MCP servers          │
└──────────────────────────────────────────────────────────────────────────┘
```

| Section | Purpose | Char limit |
| --- | --- | --- |
| **Details → Name** | What humans (and the orchestrator) see | short |
| **Details → Description** | One paragraph describing *what the agent does* | **1,024** |
| **Instructions** | The "system prompt" — *how* the agent should behave | **8,000** |
| **Model** | The LLM that powers orchestration & responses | — |
| **Starter prompts** | Up to **10** suggested openers (Teams / M365 only) | — |
| **Knowledge** | Up to many sources (websites, files, SharePoint, Dataverse, etc.) | — |
| **Tools** | Connectors, flows, prompts, MCP servers | — |

---

## Step 4 — Edit Details (Name, Icon, Description)

1. In the **Details** section, select **Edit**.
2. **Name**: Give it a clear, human-friendly name (e.g., *HR Assistant*, *Order Tracker*).
3. **Description** (up to 1,024 chars): Describe what the agent does, who uses it, and the kinds of tasks it handles.

   > **Why it matters:** The description is shown to users in the app catalog **and** is used by the orchestrator to decide when *this agent* should be invoked (e.g., from Microsoft 365 Copilot or as a child agent of another agent). A vague description = poor routing.

   **Good example:**

   ```
   HR Assistant helps Contoso employees with HR-related questions about
   time-off, benefits, payroll, and onboarding. It answers from the
   Contoso HR knowledge base and escalates complex or sensitive issues
   to a human HR business partner.
   ```

   **Bad example:**

   ```
   This is a chatbot.
   ```

4. **Icon**: Click the agent icon → **Change icon** → upload a **PNG ≤ 72 KB, max 192×192**.

   Why? A distinctive icon helps users recognize the agent in Teams, M365 Copilot, and the channel list.
5. **Save**.

---

## Step 5 — Write the Instructions (the "system prompt")

In the **Instructions** section, select **Edit** and write the rules the agent must follow.

- Up to **8,000 characters** of plain text.
- Type **`/`** at any point to insert a reference to a specific **tool**, **topic**, **agent**, **knowledge source**, **variable**, or **Power Fx expression**.
- After editing, **Test** in the right-hand pane. **Publish** to push live.

### A reusable instruction template

```
Role
You are <agent name>, a <role> for <audience>. You help users <main goals>.

Tone & style
- Friendly, professional, concise.
- Use short paragraphs and bullet points.
- Always include a clear next step.
- If unsure, say so and offer to escalate.

What you can do
- Answer questions from the connected knowledge sources.
- Use the <Tool A> tool to <do X>.
- Use the <Topic B> topic to <do Y>.

What you must NOT do
- Do not invent policies, prices, or dates.
- Do not share information you don't have a source for.
- Do not give legal, medical, or financial advice.

How to respond
- For policy questions, cite the source in your reply.
- For account changes, call /<Tool A> with the user's ID.
- If the user asks for a human, redirect to /<Topic Escalate>.

If you don't know
Say "I don't have that information yet — would you like me to connect
you to a person?" and then offer the escalation option.
```

### Tips for great Instructions
- **Be specific.** Vague rules → unpredictable behavior.
- **Reference real objects** with `/` (`/MyTool`, `/MyTopic`, `/Global.UserName`). Names carry more weight than descriptions in routing.
- **Define the tone & format** (lists, tables, citations).
- **State guardrails** (what NOT to do).
- **Avoid naming knowledge sources directly** — describe them generically (e.g., "the HR policy library") so the agent picks them on relevance.
- **Iterate**: change one thing at a time, then re-test.

---

## Step 6 — Pick the Model (and know why)

Open the **Model** section and pick the primary AI model. The current options group into three **categories**:

| Tag | Best for | Latency | Cost | Reasoning |
| --- | --- | --- | --- | --- |
| **General** | Everyday chat, FAQs, summarizing, drafting, light grounding | **Lowest** | **Lowest** | Shallow → moderate |
| **Auto** | Mixed workloads — some chat, some complex steps | Variable | Variable | Adaptive per turn |
| **Deep** | Multistep reasoning, policy/contract analysis, multi-tool workflows | **Highest** | **Highest** | Multistep, tool-rich |

### Quick decision guide
- **Building your first agent / chat / FAQ?** → Stay on the **default General** model (`GPT-4.1` today, or `GPT-5 Chat` where available).
- **Mixed traffic — knowledge + actions?** → Try **Auto** (e.g., `GPT-5 Auto`).
- **Complex reasoning, multi-step workflows, long documents?** → Use a **Deep** model (e.g., `GPT-5 Reasoning`, `Claude Opus`).
- **Experimenting only — not production?** → Try **Experimental** / **Preview** models, but never publish them to real users.

### How to change it
1. **Overview** → **Model** section.
2. Pick a model from the dropdown.
3. Test in the chat pane. You can switch back any time.

> See [09-models-and-instructions.md](09-models-and-instructions.md) for the full model list, regional availability, governance, and a deeper "why this model" decision tree.

---

## Step 7 — Add Knowledge (optional but powerful)

Knowledge lets the agent answer with **generative AI** grounded in your sources.

1. **Knowledge** section → **Add knowledge**.
2. Pick a source type:
   - **Public website** (URL)
   - **SharePoint** site, folder, file
   - **Uploaded files** (PDF, DOCX, TXT, …)
   - **Dataverse**, **Microsoft Graph**, **Azure AI Search**, etc.
3. Add the source, give it a clear **name** and **description** (description matters for routing).
4. **Add to agent**.

Test by asking a question whose answer lives in the source.

---

## Step 8 — Add a Topic (your first scripted flow)

1. Top nav → **Topics** → **+ Add a topic** → **From blank**.
2. Add 5–10 **trigger phrases** (classic) or a clear **description** (generative orchestration).
3. Build the flow with **Message** and **Question** nodes (see [04-nodes-message-and-question.md](04-nodes-message-and-question.md)).
4. **Save**.

Lab 1 walks through this in detail.

---

## Step 9 — Test the agent

The **Test your agent** chat panel is on the right.

1. Type a message that should trigger your topic, or a question that should use knowledge.
2. Useful test-pane controls:
   - **Track between topics** — visualize which node/topic ran.
   - **Variables tab** — watch variable values fill in real time.
   - **Activity map** — see what the orchestrator decided (generative mode).
   - **Start new test session** ⟳ — clears session state (good after changing variables/instructions).

> If you change **Instructions**, **Model**, or knowledge, click **Start new test session** so the next message uses the latest configuration.

---

## Step 10 — Add Suggested prompts (Teams / M365)

Only visible in Microsoft Teams and Microsoft 365 Copilot — not in the Copilot Studio test pane.

1. **Overview → Suggested prompts → Add suggested prompts**.
2. Add up to **10**. Each has a short **title** and the **prompt** text.
3. **Save**.

---

## Step 11 — Publish

When you're happy:

1. Top bar → **Publish** → **Publish**.
2. Open the **Channels** page to enable channels: **Demo website**, **Teams**, **Microsoft 365 Copilot**, **custom website**, **telephony**, etc.
3. For each channel, follow the prompts to grab the embed code or share link.

> **Publish whenever you change** the description, instructions, model, topics, or knowledge — except for **secret environment variables**, which are read at runtime and don't require republish.

---

## Step 12 — Iterate

- Review the **Activity** and **Analytics** tabs to see what users actually ask.
- Refine **Instructions**, add **knowledge**, or tune **descriptions** based on real behavior.
- Make **one change at a time** and re-test so you can see its effect.

---

## Common pitfalls

| Pitfall | Fix |
| --- | --- |
| Agent answers nothing useful | The **Description** is too short or the **Instructions** are vague. Rewrite both. |
| Wrong topic / tool triggers | Make **topic / tool descriptions** more specific. In generative mode, names carry more weight than descriptions. |
| Hallucinated answers | Add **knowledge sources**; turn off "Allow ungrounded responses" in the agent's generative AI settings. |
| Variables not remembered across topics | Make them **Global** (see [03-variables-and-data-types.md](03-variables-and-data-types.md)). |
| Test works, deployed agent doesn't | You forgot to **Publish**. |
| Costs higher than expected | You're on a **Deep** model for simple chat. Switch to **General**. |
| Test session uses old behavior | Click **Start new test session** ⟳. |

---

## What to read next

1. [02-core-concepts.md](02-core-concepts.md) — the mental model (now includes Description, Instructions, Model deep dives).
2. [09-models-and-instructions.md](09-models-and-instructions.md) — full model reference and a model-picking decision tree.
3. [06-lab1.md](06-lab1.md) — build your first real flow.

---

## Official Microsoft documentation (references)

The content in this section is based on the following Microsoft Learn pages:

- [Quickstart: Create and deploy an agent](https://learn.microsoft.com/microsoft-copilot-studio/fundamentals-get-started)
- [Create and delete agents](https://learn.microsoft.com/microsoft-copilot-studio/authoring-first-bot)
- [Write agent instructions](https://learn.microsoft.com/microsoft-copilot-studio/authoring-instructions)
- [Select a primary AI model for your agent](https://learn.microsoft.com/microsoft-copilot-studio/authoring-select-agent-model)
- [Configure suggested (starter) prompts](https://learn.microsoft.com/microsoft-copilot-studio/configure-starter-prompts)
- [Add knowledge sources](https://learn.microsoft.com/microsoft-copilot-studio/knowledge-copilot-studio)
- [Quickstart: Create a classic agent and publish it to Microsoft Teams](https://learn.microsoft.com/microsoft-copilot-studio/fundamentals-get-started-teams)
- [Test your agent](https://learn.microsoft.com/microsoft-copilot-studio/authoring-test-bot)
