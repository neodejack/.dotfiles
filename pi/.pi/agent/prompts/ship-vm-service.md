---
description: Test, commit, and open a PR for this session's changes against origin/main
---
Ship only the files, hunks, and commits created during the current Pi session to a non-main branch on origin and create a PR; do not include changes from other sessions or agents sharing this worktree. Commit any uncommitted changes from this session before pushing. If ownership of any change is uncertain, stop and ask me before proceeding.
If a non-main branch doesn't exist yet, create one first.
First, fetch origin and check whether origin/main is ahead. If so, rebase and resolve merge conflicts, checking with me before proceeding if there are any substantive conflicts, then push.
Run the full test suite before pushing. If test failures are unrelated to this change (due to a commit upstream that introduced the failure), they can be ignored.
Once the PR is successfully created, use executor to send tonic a DM. The entire message must be `求求 ` followed by the actual GitHub PR URL, for example: `求求 https://github.com/owner/repository/pull/123`.
