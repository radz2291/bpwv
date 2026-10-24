# Development and verification

Owner direction, 25 October 2026: prioritize development velocity with risk-based verification.

- Ordinary UI changes: use focused functional smoke tests and regressions covering the changed experience. Do not repeatedly run the full suite.
- Shared service or MCP contracts: run relevant contract, revision and permission regressions, type checks and a build when affected. Use official Inspector for changed MCP behavior.
- Meaningful architectural, persistence, authorization or high-risk execution changes: add independent deep verification at an exact candidate commit. Routine UI consolidation does not require another full architectural review.
- Data cleanup: inventory first, make a verified recoverable backup, use explicit identities and revision checks, retain unidentified data, and verify preserved history and media. Never delete credentials or historical evidence as cleanup.
- Paid providers: preserve quotation and explicit approval requirements. Tests default to deterministic local execution; a write grant alone never authorizes paid calls.
- Report findings, remaining risks and the next owner action concisely. Keep historical failed and repaired verification evidence unchanged; append new results with their own scope and date.

Stop for unexpected data loss, authorization changes, paid execution, material integration conflicts or scope expansion. U2 and merges require separate owner authorization.
