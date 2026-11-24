# dsh-deepsearch 1.2.0

This release fixes lost subagent briefs. DSH 0.2.2 delivers a child's final answer automatically instead of asking the child to `send_message`; while a deepsearch run waits for its children inside `agent/pre-step`, those notices landed after the step's inbox batch had already been claimed and were dropped. The pre-step hook now reclaims them and folds them into the step being prepared, so the main agent reads the briefs instead of polling `list_agents` and asking each child to resend.

## Install

```bash
dsh plugin add github:NeptuneRY/dsh-deepsearch
```

The npm name `dsh-deepsearch` is a 0.0.1 placeholder owned by someone else; the bare command installs the wrong package.

The command above tracks the default branch; the market pins the resolved commit and rewrites it when a newer version is available. To pin this release exactly:

```bash
dsh plugin add github:NeptuneRY/dsh-deepsearch#v1.2.0
```

Pinned tags/commits do not receive automatic updates.

## Changes

- Runtime: `agent/pre-step` now reclaims the subagent messages that arrive while a run is parked waiting for its children (`inbox.remove`) and appends them to the step it is preparing, so closing messages and `send_message` replies reach the model even when the host claimed the step's inbox batch first.
- Test: `smoke.mjs` drives a parked pre-step with two pending messages and asserts both are reclaimed and enter that step.

The reclaim is a no-op on hosts that still deliver through the child's own `send_message`, so the plugin keeps working with the older contract.
