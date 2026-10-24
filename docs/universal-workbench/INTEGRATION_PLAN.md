# Product, architecture and U0 integration plan

Prepared 24 October 2026. **Review preparation only; no merge into main authorized or performed.**

**Subsequent execution record, 24 October 2026:** the owner separately authorized all four merges. They completed in the order below with original ancestry preserved; the four-layer main baseline is `3391df4b28a7779d543ef54e47fe8303957261ad`. See [the integration verification report](INTEGRATION_VERIFICATION_2026-10-24.md). The original preparation and proposed sequence below are retained as historical context. U1 execution still requires separate authorization.

## Recovered history

The local working tree was clean at accepted U0 `5e70993`. Local main was `45c9096`, one original Stage 2 commit ahead of remote main `b673887`. PR #1 was open/unmerged at documentation tip `a939cbe`; PR #2 was open/unmerged at `5e70993`, targeting main and showing 98 files across 11 commits. Its broad diff was caused by ancestry, not new U0 production changes.

Existing merge `a4832d29da59265cd559b9b33a669da807590c75` already has exact parents `45c9096780df1e43c32f5a15a5bafb2ce2170728` and `a939cbe8e82657fdd2782f8131b97813a37d5b70`. It provides a natural architecture/product boundary without copying commits or creating a synthetic replacement implementation.

## Review stack now prepared

| Layer / PR | Head branch and exact boundary | Base branch | Focused diff |
| --- | --- | --- | --- |
| Product — [PR #3](https://github.com/radz2291/bpwv/pull/3) | `review/stage2-visual-references` at `45c9096` | `main` at `b673887` | Original Stage 2 only: 1 commit, 64 files |
| Architecture — [PR #1](https://github.com/radz2291/bpwv/pull/1) | `docs/universal-workbench-foundation` at `a4832d2` | `review/stage2-visual-references` | Original approved docs: AGENTS + five design files, 6 files; includes six original doc commits and existing merge |
| U0 — [PR #2](https://github.com/radz2291/bpwv/pull/2) | `dev/u0-universal-workbench` at accepted `5e70993` | `docs/universal-workbench-foundation` | U0 only: 3 commits, 34 files |
| Acceptance + preparation | `docs/u0-acceptance-u1-handoff` | `dev/u0-universal-workbench` | Documentation and preparation-verification records only; no source/config/package/test/data changes |

The documentation branch advanced **fast-forward** from `a939cbe` to the already-existing `a4832d2`. Its approved files at that boundary are unchanged. Its full tree includes Stage 2, but its PR base contains that identical product layer, so the review diff is documentation-only. The accepted U0 branch/head has not moved. PR #2 is narrowed by base retargeting, with no amended, rebased, dropped or cherry-picked shared commits.

The local main branch remains `45c9096`; remote main remains `b673887`. This distinction is deliberate and is not a claim that Stage 2 has merged remotely. Do not push local main as a shortcut.

## Recommended merge sequence — requires separate owner approval

1. Review/approve **PR #3**, then merge it into main using a merge commit (or ancestry-preserving fast-forward where supported). Confirm main contains original `45c9096`. Do not squash/rebase the layer, and retain its branch for dependent PRs.
2. Retarget **PR #1** to main after #3 is integrated. Check the resulting diff is still the six architecture files and approved document content. Merge only with owner approval, preserving original docs and merge ancestry. Confirm main contains `a4832d2` and `a939cbe`.
3. Retarget **PR #2** to main after #1 is integrated. Check its diff remains the 34-file isolated U0 layer and retains `fd646e9 → bea4c50 → 5e70993`. Confirm the accepted implementation has not changed; merge only with owner approval, preserving ancestry.
4. Retarget the **acceptance/U1-preparation PR** to main after #2 integrates. Verify documentation-only scope again; merge only with owner approval. Keep historical U0 evidence intact.
5. Only after integration and an explicit separate U1 execution instruction, start U1 from the integrated main tip, recording exact SHA and rechecking source/data/runtime health. Do not treat approval of this handoff or U0 acceptance as authority to implement.

Retarget before deleting dependent branches: automatic branch deletion or GitHub base retargeting can otherwise broaden/close a stacked PR unexpectedly. Recheck actual PR base/head/diff after each merge. If unrelated commits land on main, resolve ordinary documentation conflicts additively on the relevant review branch, keep original accepted SHAs, and reverify affected evidence; material implementation changes require review.

If repository policy requires squash/rebase-only merging, **stop before merging this stack**. Present an ancestry-preserving alternative or new review branches with explicit provenance and revalidation; do not force-push the shared branches or silently replace the accepted commit lineage. No paid call or local database operation is needed for any integration step.

## Verification and rollback boundaries

Read-only checks: `git status --short`, `git log --graph`, `git merge-base --is-ancestor`, `git diff --name-only <base>...<head>`, `git rev-list --count <base>..<head>`, `git ls-remote`, remote PR metadata and file lists. Verify exact local/remote SHAs and zero ahead/behind for each pushed branch, not just a successful push message.

The preparation branch must have the same source/tests/scripts/package/config/assets and historical evidence blobs as accepted `5e70993`; allowed changes are project documentation plus a new preparation-review report. The verifier should challenge the stack, scope and authority boundaries at an exact commit. This task does not need to rerun paid generation or modify workflows to prove documentation changes.

If a retarget is unsuitable, restore the prior PR base metadata; original commits remain available. Branch creation and fast-forward advancement are additive and retain the original documentation tip. No reset, clean, recursive deletion, force-push or history rewrite is part of this plan. No PR is automatically merged or closed.
