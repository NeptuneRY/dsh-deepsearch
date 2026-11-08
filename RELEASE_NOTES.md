# dsh-deepsearch 1.1.48

This release cleans up the release package. It removes the two round-example screenshots that were no longer referenced by the README; `screenshots.json` now lists only `assets/methods.png`. There are no runtime changes.

## Install

```bash
dsh plugin add github:NeptuneRY/dsh-deepsearch
```

The npm name `dsh-deepsearch` is a 0.0.1 placeholder owned by someone else; the bare command installs the wrong package.

The command above tracks the default branch; the market pins the resolved commit and rewrites it when a newer version is available. To pin this release exactly:

```bash
dsh plugin add github:NeptuneRY/dsh-deepsearch#v1.1.48
```

Pinned tags/commits do not receive automatic updates.

## If you installed 1.1.46 with the old `#v1.1.46` command

That was a tag pin. Reinstall with the floating command above; from then on the market can offer 1.1.48 and later versions.

## Changes

- Package: removed `assets/round-1.png` and `assets/round-2.png`; `screenshots.json` keeps only `assets/methods.png`.
- README (zh/en): the command-line install uses the GitHub source; the pin example now points at `v1.1.48`.
