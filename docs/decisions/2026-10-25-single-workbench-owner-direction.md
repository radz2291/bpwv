# Owner direction: one workbench — 25 October 2026

Status: consolidation implemented on PR #5 and focused verification passed; final owner product acceptance pending. See the [closure report](../universal-workbench/SINGLE_WORKBENCH_CLOSURE_2026-10-25.md). Historical direction and pre-implementation statements below are retained as the original decision record.

## Owner finding

The application changes its entire interface when a saved workflow is selected: schema 1 opens the old editor, while schema 2 opens the universal workbench. The owner finds this confusing and does not want two editors.

Owner instruction: “we only need one.. the other have to be close... all old workflow can be remove, we dont have any real one yet”.

This is an **open product-experience finding**, not resolved by the successful MCP execution proof. U1's nine technical verification gates remain passed for their tested scope; owner product acceptance remains pending. Do not describe the split interface as an accepted final experience.

## Required direction

- Keep the universal workbench as the single user-facing editor and consistent application shell.
- Retire the legacy editor and its navigation/switching paths. Selecting a saved workflow must not replace the application with another editor.
- Present one normal application entry point. Separate proof/test ports may remain internal verification infrastructure, but must not require the owner to choose between two product interfaces.
- Use reusable operations, recipes and configuration inside that workbench; do not introduce project-specific engine nodes to address this finding.

## Workflow cleanup authorization

The owner states there are no real production workflows to retain. Existing old/demo/test workflows may be removed during the consolidation; preserving them in the active product or building a migration path for them is not an owner requirement. This supersedes the earlier requirement to preserve those disposable workflows as active application content for this follow-up. The historical BorderPoint demonstration does not need to keep the old editor alive.

This is not authorization to erase Git history, verification evidence, source archives, standalone media, credentials, tunnel identities or approval protections. Preserve the G8 workflow/run/artifact evidence independently even if its disposable test workflow is later removed from the active application. Workflow cleanup and any associated-data policy should be explicit in the implementation report; do not silently broaden it to unrelated files.

## Follow-up acceptance checks

1. Starting the application, creating a workflow and selecting every remaining saved workflow show the same application shell and universal editor.
2. No legacy-editor link, workflow-triggered editor replacement or competing product entry point remains.
3. Old/demo/test workflows are absent from the normal saved-workflow list after the authorized cleanup; a clean starting state is available.
4. ChatGPT MCP authoring still produces workflows in that same workbench, with typed contracts, revisions, real results and durable artifacts intact.
5. Existing execution permissions and Weave quotation/explicit approval protections remain unchanged. No paid generation, merge or U2 implementation is authorized by recording this feedback.

The current request is to include this direction in the report. No editor was closed, process stopped, workflow deleted or implementation changed while recording it. Implementation is a subsequent follow-up within the owner's single-workbench direction.
