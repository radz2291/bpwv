# U0 owner acceptance — 24 October 2026

Decision authority: the repository owner, in the Creative Flow conversation following review of the U0 report and independent verification.

Owner's explicit decision: **“U0 is owner-accepted: PASS WITH NON-BLOCKING FINDINGS.”** The eight universal primitives remain the approved architectural foundation: Input, Transform, Invoke, Branch, Iterate, Approve, Subflow and Output.

## Accepted subject and immutable lineage

| Record | Exact commit | Meaning |
| --- | --- | --- |
| Published product baseline | `b673887bd5555fca9a2ce67391254aa073f100ed` | Main before Stage 2 and U0 integration |
| Previous working product | `45c9096780df1e43c32f5a15a5bafb2ce2170728` | Original Stage 2 implementation, unchanged |
| Approved architecture documents | `a939cbe8e82657fdd2782f8131b97813a37d5b70` | Tip of six original documentation commits |
| Combined prerequisite | `a4832d29da59265cd559b9b33a669da807590c75` | Existing merge, parents Stage 2 and approved documentation |
| Earlier U0 candidate | `fd646e9ba3a2c76460254533124dd968c2c46377` | Independent verdict HELD for recovered artifact validation defects |
| Repaired candidate | `bea4c50857fa4805eafd899c8e8656040adb0216` | Independent PASS WITH NON-BLOCKING LIMITS; type, producer, lineage and completion validation repaired |
| Final accepted U0 candidate | `5e70993033ca2f093a2f1e7e7b63813c7e8ea8b1` | Evidence/report closure; exact final SHA independently rechecked before delivery |

The owner verdict is recorded verbatim; the verifier's distinct wording is retained. Evidence under `evidence/u0/`, including the initial failed-candidate findings and repaired-candidate recheck, remains unchanged. This new decision record supersedes historical “owner acceptance pending” statements as an acceptance-status update; it does not rewrite the dates or truth of those earlier reports.

## What acceptance means

U0's audit, proposed contracts, migration strategy, bounded cross-domain expressibility challenge and isolated non-paid feasibility proof are accepted. It established a useful foundation and repaired the demonstrated correctness defects. The primitive vocabulary is approved for continued development.

It is **not** acceptance of a shipped production universal engine. The experimental module remains separate from the production registry, shared WorkflowService and visual/MCP authoring. Structural domain fixtures are not runnable production scenarios. Branch, Iterate, Approve and Subflow scheduling, general provider execution, durable universal artifact persistence, structured schema resolution and authenticated approvals remain unimplemented or contract-only as documented. No additional model rights or provider availability are inferred.

## Authority after acceptance

The owner authorizes recording closure, preparing review branches/PRs to separate product, architecture and U0 layers, and preparing a comprehensive U1 handoff. Preserve all commits and evidence; no shared-history rewrite or force-push. Merge into main still requires owner approval. U1 implementation, paid generation, deployment and production data migration are **not authorized** by this decision.

Recommended next decision: review the [integration plan](../universal-workbench/INTEGRATION_PLAN.md) and [U1 implementation handoff](../universal-workbench/U1_IMPLEMENTATION_HANDOFF.md), then separately authorize the merge sequence and U1 execution scope when ready.
