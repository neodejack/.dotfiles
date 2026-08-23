# Dotfiles agent instructions

## GNU Stow packages

Each top-level configuration directory is a GNU Stow package targeting the
user's home directory.

Before adding a package, determine whether its application writes generated
state, logs, caches, sockets, sessions, credentials, or other unmanaged files
beside the versioned configuration. Add the shared destination directory to
the `anchor_dirs` variable in `justfile` so it remains a real directory while
Stow can still fold managed subdirectories beneath it.

The `anchor_dirs` variable is the source of truth for these boundaries. The
`ensure_dirs` recipe creates missing path components and refuses to continue
if any component is a symlink or non-directory. Keep `test` and `apply`
dependent on that recipe rather than adding package-specific Stow commands or
using package-wide `--no-folding`.

Run `just test` before `just apply`. Do not use Git ignore rules as a substitute
for the correct Stow layout; generated application files must live outside the
repository.
