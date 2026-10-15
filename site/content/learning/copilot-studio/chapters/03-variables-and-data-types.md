---
title: Variables & Data Types
summary: Store, transform, and pass typed data through agent conversations.
type: chapter
level: beginner
updated: "2026-08-26"
draft: false
tags:
  - building-blocks
  - variables
---

Variables are how your agent **remembers** things during a conversation. This file covers the
**data types**, the **four variable scopes**, **system variables**, and a gentle intro to **Power Fx**.

---

## 1. What is a variable?

A **variable** is a named container that stores a value while the conversation runs. Example:
the user answers *"My name is Sam"* → you store `"Sam"` in a variable called `UserName` → later the
agent says *"Thanks, {UserName}!"*.

You usually create variables in two ways:
- Automatically, when an **Ask a question** node saves the user's answer.
- Manually, with a **Set a variable value** node (Variable management).

Always **rename** the auto-generated name (like `Var1`) to something meaningful (`customerEmail`).

---

## 2. Data types (base types)

Every variable has a **base type** that decides what it can hold and which operators you can use on it.

| Type | Description | Example value |
| --- | --- | --- |
| **String** | A sequence of characters (text) | `"Hello"`, `"sam@contoso.com"` |
| **Boolean** | A logical value — only `true` or `false` | `true` |
| **Number** | Any real number | `42`, `3.14`, `1000` |
| **Table** | A list of values — all the **same** type | `["red","green","blue"]` |
| **Record** | A set of name–value pairs; values can be **any** type | `{ name: "Sam", age: 30 }` |
| **DateTime** | A date, time, day, or month relative to a point in time | `2026-06-14T09:00` |
| **Choice** | A list of string values, each with optional **synonyms** | `Hiking` (synonym: *trekking*) |
| **Blank** | A placeholder for "no value / unknown" | *(empty)* |

> **Type is set on first assignment and then fixed.** If you put `1` (Number) into a variable,
> you can't later put `"apples"` (String) into it — you'll get an error. During testing a variable
> with no value yet shows as type **unknown**.

### Limitations of data types

Data types are simple by design — keep these boundaries in mind so flows don't break.

**General limitations**
- **Type is fixed on first assignment.** You can't change a variable's type later; assigning a
  different type throws an error. Use a **new variable** or **Parse value** to convert.
- **No automatic conversion.** The agent won't silently turn a Number into text. Wrap with `Text(...)`
  to join a number to a string, or `Value(...)` to turn text into a Number.
- **Blank ≠ empty string ≠ 0.** A variable can be **Blank** (no value), `""` (empty text), or `0`.
  Test for "no answer" with `IsBlank(...)`, not `= ""` or `= 0`.
- **"Unknown" until set.** Before a value is assigned, the type shows as **unknown**; referencing it
  too early can misbehave — guard with `IsBlank(...)`.
- **Case/format sensitivity.** String comparisons are exact unless you normalize (e.g., `Lower(...)`,
  `Trim(...)`).

**Per-type limitations**

| Type | Watch out for |
| --- | --- |
| **String** | Very long text may hit message/size limits; comparisons are case-sensitive unless normalized. |
| **Number** | Floating-point rounding (`0.1 + 0.2` ≠ exactly `0.3`); no built-in currency/decimal precision — format with `Text(...)`. |
| **Boolean** | Only `true`/`false`; a Blank Boolean is **not** `false` — check `IsBlank` separately. |
| **DateTime** | **Time zones & formats** vary by channel/locale; the displayed string may differ from the stored value. Format explicitly. |
| **Choice** | Backed by a defined option set/entity; you can't store an arbitrary value not in the list. Comparisons use the option, not free text. |
| **Table** | All items must be the **same type**; large tables are heavy and can hit limits; no complex DB-style queries. |
| **Record** | Field names are fixed once shaped; referencing a missing field returns Blank, not an error. |
| **Blank** | Propagates through expressions (Blank + text = the text); always handle it explicitly. |

> **Beginner tip:** Most "why is my variable empty?" bugs are a **type or Blank** issue — print the
> variable in a Message node or watch the **Variables** tab to see its actual type and value.

### How entities map to data types

When a **Question** node uses an entity, the recognized value is saved as the type below
(this is the **web app** mapping — what current Copilot Studio uses):

| Entity (what you "Identify") | Stored as |
| --- | --- |
| Multiple-choice options | Choice |
| User's entire response | String |
| Age | Number |
| Boolean | Boolean |
| City | String |
| Color | String |
| Continent | String |
| Country or region | String |
| Date and time | DateTime |
| Email | String |
| Event | String |
| Integer | Number |
| Language | String |
| Money | Number |
| Number | Number |
| Ordinal | Number |
| Organization | String |
| Percentage | Number |
| Person name | String |
| Phone number | String |
| Point of interest | String |
| Speed | Number |
| State | String |
| Street address | String |
| Temperature | Number |
| URL | String |
| Weight | Number |
| Zip code | String |
| **Custom entity** | Choice |

> This is why a Question that uses the **Money** entity on *"It costs 1000 dollars"* stores the
> **number** `1000`, not the text — you can then do math or comparisons on it.

---

## 3. The four variable scopes

Scope = **where** a variable can be used and **how long** it lives.

| Scope | Prefix | Where it works | Lifetime | Who sets it |
| --- | --- | --- | --- | --- |
| **Topic** (default) | *(none)* — `Topic.X` | Only in the topic that created it | While that topic runs | You |
| **Global** | `Global.X` (`bot.X` in classic) | **All** topics | Whole user **session** | You / external sources |
| **System** | `System.X` | All topics | Provided by the platform | Copilot Studio |
| **Environment** | *(env var name)* | All topics — **read-only** | Set in Power Platform | Admins |

### Topic variables
The default. Created and used inside a single topic. Private to that topic.

### Global variables
Available everywhere and remembered for the **entire session**. Create one by opening a topic
variable's **Variable properties** and selecting **Global (any topic can access)** — its name gets the
`Global.` prefix.

Use cases:
- Remember the user's name once, reuse it in every topic (don't ask twice).
- Receive context from a website or Dynamics 365 ("External sources can set values").

> **Lifecycle:** global values persist until the session ends or the **Reset Conversation /
> Start Over** topic runs (which clears them). If a global is used before it's been filled,
> the agent jumps to where it's first defined, asks, then returns — seamlessly.

### System variables
Auto-created, read-only context about the conversation. Reference with `System.` in formulas. Examples:

| System variable | Type | Meaning |
| --- | --- | --- |
| `Activity.Text` | string | The user's most recent message |
| `Activity.Channel` | choice | Which channel the chat is on |
| `Conversation.Id` | string | Unique ID of this conversation |
| `Conversation.InTestMode` | Boolean | `true` when running in the Test pane |
| `User.DisplayName` | string | Signed-in user's display name (when authenticated) |
| `User.IsLoggedIn` | Boolean | Whether the user is authenticated |
| `Bot.Name` | string | The agent's name |

### Environment variables
A **Power Platform** concept for values that change between environments (dev/test/prod) — API keys,
URLs, etc. They are **read-only** in Copilot Studio; admins set them in Power Apps. Great for
**Application Lifecycle Management (ALM)** so you don't hard-code environment-specific values.

---

## 4. Passing variables between topics

By default a topic variable is private. To share a value without making it global, use the
**Variables panel** to mark a variable as an **input** (can receive a value from another topic),
an **output** (can return a value), or both. Then a **Redirect** can pass values in and out — like
arguments and return values for a function.

```mermaid
flowchart LR
    A[Topic A] -- pass orderId in --> B[Topic B: Lookup]
    B -- return status out --> A
```

Choose **global** when many topics need the value all the time; choose **input/output passing**
when only specific topics exchange a value.

---

## 5. Power Fx basics (formulas)

Copilot Studio uses **Power Fx** — the same Excel-like language as Power Apps — for conditions and
expressions. You'll meet it in **Condition** nodes and **Set variable value** nodes (choose
"Formula"). A formula starts conceptually with `=`.

Common patterns:

| Goal | Power Fx |
| --- | --- |
| Greet by name | `"Hello " & Topic.UserName & "!"` |
| Uppercase | `Upper(Topic.UserName)` |
| Is the box checked? | `Topic.Continue = true` |
| Not empty? | `!IsBlank(Topic.Email)` |
| Number compare | `Topic.Age >= 18` |
| Pick a value | `If(Topic.Score > 50, "Pass", "Fail")` |
| Current date/time | `Now()` |
| Combine text + number | `"You ordered " & Text(Topic.Qty) & " items"` |

> Use `&` to join strings. Wrap a number with `Text(...)` before joining it to text.
> Use `IsBlank(...)` to check for "no value", which is the safest way to branch on optional answers.

---

## 6. Quick reference: choosing the right type

- Storing a name, email, address, ID → **String**
- Counting / math / comparisons / money → **Number**
- Yes/No, on/off, agreed? → **Boolean**
- A date or time → **DateTime**
- A pick-from-a-list answer → **Choice** (via Multiple-choice or a custom entity)
- A list of same-typed items → **Table**
- A bundle of mixed fields (name + age + email) → **Record**

---

### Key takeaways

- Types: **String, Boolean, Number, Table, Record, DateTime, Choice, Blank**.
- Type is **fixed on first assignment**.
- Scopes: **Topic → Global → System → Environment**.
- Use **global** to remember things across topics; **system** for context; **environment** for ALM.
- **Power Fx** (`&`, `If`, `IsBlank`, `Text`) powers conditions and expressions.

---

## Official Microsoft documentation (references)

The content in this section is based on the following Microsoft Learn pages:

- [Variables overview (types, scopes, system variables)](https://learn.microsoft.com/microsoft-copilot-studio/authoring-variables-about)
- [Work with variables](https://learn.microsoft.com/microsoft-copilot-studio/authoring-variables)
- [Work with global variables](https://learn.microsoft.com/microsoft-copilot-studio/authoring-variables-bot)
- [Environment variables (Power Platform)](https://learn.microsoft.com/power-apps/maker/data-platform/environmentvariables)
- [Use Power Fx in Copilot Studio](https://learn.microsoft.com/microsoft-copilot-studio/advanced-power-fx)
- [Power Fx data types](https://learn.microsoft.com/power-platform/power-fx/data-types)
- [Remove sensitive data](https://learn.microsoft.com/microsoft-copilot-studio/voice-sensitive-data)
- [Pass context variables from a webpage to an agent](https://learn.microsoft.com/microsoft-copilot-studio/guidance/pass-context-variables-from-webpage-to-copilot)

Next: [04-nodes-message-and-question.md](04-nodes-message-and-question.md)
