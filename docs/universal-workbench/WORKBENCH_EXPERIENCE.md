# Universal Workbench — user and agent experience

Status: **Design proposal** for owner review and later execution proof.

## One model, two synchronized views

1. **Creative View** is the default. It shows intent and meaningful recipe stages such as Plan, Create, Review, Refine, Deliver. These are labels or compositions, not registry node kinds.
2. **Engineering View** shows the exact universal operations, typed ports, conditions, subflow boundaries and runtime statuses.

Both are projections of one durable recipe revision. Editing or authoring through ChatGPT/MCP updates the same graph shown in the browser. A conceptual stage can expand to show its underlying operations; no separate implementation is allowed for the simplified view.

Every operation can expose its actual inputs, settings, current/previous results, logs, cost status and downstream relationships. Any artifact can preview with an appropriate viewer; image/video/audio/document previews do not require a 'Preview' execution node.

## AI authoring interaction

Desired user dialogue:
1. User describes a goal, attaches references, or selects an existing recipe.
2. Agent discovers available primitives, tools/providers, media constraints and existing recipes.
3. Agent proposes a bounded recipe or a **revisioned diff** to an existing recipe, including assumptions, unresolved provider requirements and expected paid actions.
4. User can inspect, manually edit, accept or reject the proposed graph changes.
5. The agent applies approved authoring changes transactionally through the same service/MCP with expected revision checks.
6. Execution remains separate: paid runs, publishing and consequential actions require explicit authorization at the appropriate step.
7. The editor updates run states and media previews; user feedback can create a new candidate and comparison without losing earlier results.

Agents must never silently replace a newer editor revision, invent output assets, treat visual prose as a valid typed port, or infer execution permission from graph-edit permission.

## BorderPoint reference recipe (one possible composition)

- Inputs: raw scene request, exact approved B style text, primary approved B image, optional Tabriz exemplar.
- Invoke language/structured model with Scene Director instructions, yielding a validated scene specification.
- Transform or template the scene specification, approved style, and generation wrapper into final prompt inputs.
- Invoke image model with explicit prompt plus role-labelled style references.
- Invoke vision model with generated candidate, expected meaning/style and reviewer rubric, yielding a structured review.
- Branch on review recommendation and/or pause at Approve.
- When requested, Invoke image-edit model using generated candidate as edit target and consolidated correction note. Preserve original and successor artifacts.
- Output the approved artifact and provenance.

**Scene Director, Persian Miniature Style, Visual Reviewer and Refinement are recipe roles, prompts or configurations—not engine node kinds.**

This recipe is a regression example, not a license for automatic image-generation retries. The previously saved workflows and first real output remain historical references.

## Cross-domain challenge recipes

**Cinematic production:** script/audio inputs → deterministic segmentation/scene analysis → Iterate over shots → Invoke image/video models → review/approval → assemble/export artifacts. Handles multiple media and item-level cost gates.

**Research/report:** research question/files → Invoke authorized retrieval/tool capabilities → Transform and summarize structured evidence → Branch on missing support → Approve → Output report. No project-specific node kind.

**Local deterministic processing:** Input assets → Transform rename/crop/extract metadata → Branch on validation → Output saved files. No model or credits required.

**Feedback loop:** candidate → Invoke evaluation → Approve/Revise → bounded Iterate editing attempts → compare versions → Output selected candidate. The user can break the loop and preserve every candidate.

A design does not pass agnosticism validation unless these can be represented through the same eight primitives and typed artifact vocabulary.

## Visual standard

- Stage and node cards indicate ready/running/pending/failed/blocked/skipped accurately.
- An image artifact shows its thumbnail on the canvas or accessible inspector; video/audio expose appropriate playable previews.
- Click-through reveals source prompt, model, references and reviewer history.
- Iteration shows item count, progress, failed items and outstanding spend authorization.
- Subflows collapse visually but can be inspected and edited as versioned recipes.
- A stale AI or human edit results in a visible revision conflict, not lost work.
- A stopped/restarted editor reconstructs persisted recipes, approvals and actual outputs without replaying external paid calls.
- Cost previews are labelled estimated or quoted, never shown as actual billed credits without proof.

The product should feel understandable at the creative stage level without hiding the concrete execution machinery when deeper control is needed.
