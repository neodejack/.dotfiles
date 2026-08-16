# Dotfiles agent instructions

## GNU Stow packages

Each top-level configuration directory is a GNU Stow package targeting the
user's home directory.

Before adding a package, determine whether its application writes generated
state, logs, caches, sockets, sessions, credentials, or other unmanaged files
beside the versioned configuration. Such packages must be stowed with
`--no-folding` so their destination directories remain real directories and
only package files are symlinked into them.

The `no_folding` variable in `justfile` is the source of truth for these
packages. Add any package that needs this behavior to that variable. Keep the
`test` and `apply` recipes driven by the variable rather than adding
package-specific Stow commands.

Run `just test` before `just apply`. Do not use Git ignore rules as a substitute
for the correct Stow layout; generated application files must live outside the
repository.
