---
description: Test, commit, and push this session's changes to origin/main
---
Ship only the files, hunks, and commits created during the current Pi session; do not include changes from other sessions or agents sharing this worktree. Commit any uncommitted changes from this session before pushing. If ownership of any change is uncertain, stop and ask me before proceeding.
If the changes are on a non-main branch, push to the remote branch and create a PR. Let me know the PR URL once done.
If the changes are on the local main branch, ship it to origin/main.
If push fails because origin/main is protected and can't be pushed, create a branch, push it, and create a PR. Let me know the PR URL once done.
If push fails because origin/main is ahead, rebase and resolve merge conflicts, checking with me before proceeding if there are any substantive conflicts, then try pushing again. Run the full test suite before pushing. If test failures are unrelated to this change (due to a commit upstream that introduced the failure), they can be ignored.
