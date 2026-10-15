---
title: "Building Smart D365 Plugins with GitHub Copilot Agent Mode"
subtitle: "Use agent mode to accelerate plugin development without giving up the contracts, guardrails, and review points that make server-side code dependable."
layout: "standard"
contentType: "article"
breadcrumb: "Agent-assisted plugins"
eyebrow: "Dynamics 365 / Engineering practice"
categories:
  - "dynamics-365"
  - "github-copilot"
published: "2025-11-24"
updated: "2025-11-24"
coverImage: "./article-covers/smart-d365-plugins.jpg"
featured: true
draft: false
tags:
  - "plugins"
  - "agent-mode"
  - "code-review"
---

A Dynamics 365 plugin is a compact piece of code with an unusually large responsibility. It runs inside a business process, works with privileged data, and can affect every user who triggers the same operation.

That makes it a strong candidate for AI-assisted development—and a poor candidate for unreviewed generation. The useful role for an agent is not to invent the behavior. It is to help us move from a clear contract to a complete, testable implementation with less mechanical effort.

## Start with the contract, not the code

Before opening agent mode, define what the plugin is allowed to assume and what it must guarantee. A useful specification names the message, stage, entity, filtering attributes, expected images, and the conditions that should end execution.

This gives the agent a boundary. More importantly, it gives the reviewer a way to decide whether the generated implementation is correct.

> **Builder warning:** Treat generated plugin code as a starting point. Validate execution depth, registration details, permissions, and data access before deploying it.

### A minimum plugin brief

- The event and pipeline stage where execution belongs.
- The exact attributes that should trigger the behavior.
- The data available in the target, pre-image, and post-image.
- Expected failure behavior and user-facing error messages.
- Tracing, recursion, security, and performance constraints.

## Give the agent useful context

Agent mode performs better when it can see the patterns already used by the solution. Include the shared plugin base class, tracing helpers, early-bound entity definitions, and representative tests. Point to the conventions that matter instead of relying on a long generic prompt.

## Use a workflow that stays reviewable

Ask for small, inspectable steps. Each step should produce an artifact you can review before the agent moves on.

1. **Inspect:** Map the project structure, plugin conventions, and available test infrastructure.
2. **Plan:** Describe the registration, guard clauses, data access, and observable outcomes before editing.
3. **Implement:** Create the smallest complete change and keep the business rule separate from pipeline mechanics.
4. **Verify:** Compile, run focused tests, inspect tracing, and verify the registration assumptions.

Guard clauses are especially important. They make the supported execution path visible and reduce unnecessary organization-service calls.

```csharp
public void Execute(IServiceProvider services)
{
    var context = services.Get<IPluginExecutionContext>();
    var trace = services.Get<ITracingService>();

    if (context.Depth > 1 ||
        context.MessageName != "Update" ||
        !context.InputParameters.TryGetValue("Target", out var value) ||
        value is not Entity target)
    {
        return;
    }

    trace.Trace("Validated plugin execution contract.");
    ExecuteBusinessRule(target, context, services);
}
```

## Treat generated output as a draft

Compilation is only the first check. Review every service call, column set, exception path, and assumption about the execution context. Confirm that the implementation does not retrieve more data than it needs or trigger recursively.

Tests should prove the business outcome as well as the guard behavior. Include missing attributes, unexpected stages, repeated execution, and permission failures. The goal is not to prove the agent produced code. The goal is to prove the plugin behaves correctly inside the platform.

## Key takeaways

- Write the execution contract before asking for implementation.
- Ground agent mode in the actual solution patterns and helper APIs.
- Work in small steps with reviewable outputs and focused validation.
- Review generated code for platform behavior, not only syntax.
- Keep human ownership of the business rule and release decision.
