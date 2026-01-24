---
name: update-brew-formula
description: Update a Homebrew tap formula to the latest GitHub Release assets using gh CLI, including verifying the tap repo, locating the formula, computing sha256 for release binaries, and committing/pushing changes. Use when asked to bump a Homebrew formula version to the latest release in a personal tap.
---

# Update Brew Formula

## Workflow

1. Verify the current directory is a Homebrew tap repo.
   - Require a `Formula/` directory at minimum.
   - If missing, stop and ask for the correct tap repo path.

2. Collect required inputs.
   - If not provided, ask for the local path to the repo where the updated GitHub Release exists.
   - Also confirm the GitHub repo slug (`owner/name`) and the formula name if unclear.

3. Locate the formula.
   - Check `Formula/` for the formula file (`<name>.rb`).
   - If no matching formula exists, stop and ask which formula to update (or confirm there is none).

4. Fetch the latest release assets via gh CLI.
   - Run in the release repo directory when possible.
   - Example:
     - `gh release view --json tagName,assets`
     - Use `--repo owner/name` if not in the repo.
   - Identify the latest tag and the binary assets (typically `.tar.gz`, exclude `.sha256`, `.sig`, or checksums unless the formula expects them).
   - If asset naming is ambiguous, ask which assets map to macOS/Linux and arm64/x86_64.

5. Compute sha256 for each binary asset.
   - Download each asset and compute hashes:
     - `curl -L -o /tmp/<asset> <url>`
     - `shasum -a 256 /tmp/<asset>`
   - Keep per-arch URLs and hashes aligned to the formula structure.

6. Update the formula file.
   - Bump `version` (or update the version implied in the URL/tag if version is not explicit).
   - Update each `url` and `sha256` for macOS/Linux and arm64/x86_64 blocks.
   - Preserve existing structure (e.g., `on_macos`, `on_linux`, `arm64`, `intel`).

7. Commit and push.
   - `git status` and `git add Formula/<name>.rb`.
   - Commit message example: `brew formula: bump <name> to <version>`.
   - `git push` to the tap remote.

## Guardrails

- Abort if the current directory is not a tap repo (no `Formula/`).
- Abort if the target formula does not exist.
- Use gh CLI for release discovery; do not scrape HTML pages.
- Ask questions when the release assets do not clearly map to target OS/arch.
