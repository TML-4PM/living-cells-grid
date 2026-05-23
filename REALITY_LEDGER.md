# Reality Ledger

Canonical evidence log for this repository. Every closed issue should append a row here.

## Format

```yaml
- issue: TML-4PM/<repo>#<num>
  closed_at: ISO-8601
  status: REAL | PARTIAL | BLOCKED
  evidence:
    - commit_sha: ...
    - api_response: ...
    - execution_trace: ...
  receipt: receipts/pen-<N>-*.md
```

## Auto-closing convention

- Ship `receipts/pen-<N>-<short-name>.md` to close `TML-4PM/the-pen#<N>` (sweeper picks it up within 15 min).
- Auto-generated blockers with label `auto-generated, health-check` are closed by `gh_sweep_resolved_blockers` once their component logs PASS for 15 min.
- Bridge-poller duplicate issues are closed automatically by `gh_sweep_bridge_dupes`.
