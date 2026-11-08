# dsh-deepsearch 1.1.47

This release only fixes installation and release notes; there are no runtime changes.

## Install

```bash
dsh plugin add github:NeptuneRY/dsh-deepsearch
```

The npm name `dsh-deepsearch` is a 0.0.1 placeholder owned by someone else; the bare command installs the wrong package.

The command above tracks the default branch; the market pins the resolved commit and rewrites it when a newer version is available. To pin this release exactly:

```bash
dsh plugin add github:NeptuneRY/dsh-deepsearch#v1.1.47
```

Pinned tags/commits do not receive automatic updates.

## If you installed 1.1.46 with the old `#v1.1.46` command

That was a tag pin. Reinstall with the floating command above; from then on the market can offer 1.1.47 and later versions.

## Changes

- README (zh/en): the command-line install now uses the GitHub source.
- Release notes: the primary install command is the floating GitHub source; exact pins are documented separately.
