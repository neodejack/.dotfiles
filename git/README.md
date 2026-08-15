# Git configuration

This Stow package separates personal and work GitHub identities according to
the repository's directory.

## Directory convention

Every machine must classify repositories under one of these roots. Subdirectory
layout below each root is machine-specific and does not affect account selection.

```text
~/code/
├── personal/       # personal Git identity and SSH account
└── work/           # work Git identity and SSH account
```

The package installs three configuration files:

- `~/.gitconfig` selects an account according to repository location.
- `~/.gitconfig-personal` contains the personal commit identity and URL rewrite.
- `~/.gitconfig-work` contains the work commit identity.

`user.useConfigOnly = true` makes commits outside the two roots fail instead of
silently using the wrong identity. Commit identity and GitHub authentication
are separate: Git selects the name/email, while SSH selects the GitHub account.

## SSH accounts

Use these key filenames and SSH hosts consistently on every machine:

```sshconfig
Host github.com
  HostName github.com
  User git
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519_github_work
  IdentitiesOnly yes

Host github.com-personal
  HostName github.com
  User git
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519_github_personal
  IdentitiesOnly yes
```

`github.com` is the work account. The personal Git config rewrites remotes in
personal repositories from `git@github.com:` to `git@github.com-personal:`,
selecting the personal key. Use SSH remotes for account separation; the `gh`
HTTPS credential helper follows its active login rather than repository
directory. Never commit private keys, tokens, or credential stores.

## New-machine setup

```bash
mkdir -p ~/code/personal ~/code/work ~/.ssh

# Skip generation when securely transferring existing keys to the same names.
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github_personal -C "neodejack@gmail.com"
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github_work -C "insert_work_email_here"

cd ~/.dotfiles
stow -Rvt ~ git
```

Add each `.pub` key to its corresponding GitHub account, add the SSH host
configuration above to `~/.ssh/config`, and clone repositories beneath the
appropriate root.

## Verification

```bash
git -C ~/code/personal/<repo> config --show-origin --get user.email
git -C ~/code/work/<repo> config --show-origin --get user.email
git -C ~/code/personal/<repo> remote get-url origin
git -C ~/code/work/<repo> remote get-url origin
ssh -T git@github.com
ssh -T git@github.com-personal
```
