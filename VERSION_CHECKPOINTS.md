# VNS version checkpoints

The current website is saved on `main` and tagged `vns-current-2026-10-29`.

## View the saved current version

```powershell
git switch main
git show vns-current-2026-10-29
```

Keep later development on `vns-next` or a future-version branch, not on `main`.

## Work on the next version

```powershell
git switch vns-next
```

## Save and tag a completed future version

After reviewing and testing the intended changes:

```powershell
git add <reviewed-files>
git commit -m "Describe the completed version"
git tag vns-version-YYYY-MM-DD
```

Use a unique tag name for each checkpoint. Tags identify commits; do not move an existing checkpoint tag.

## Open either version safely in a separate worktree

Worktrees let you open versions in separate folders without switching or overwriting the checkout in this folder:

```powershell
git worktree add ..\vns-current --detach vns-current-2026-10-29
git worktree add ..\vns-next-work vns-next
```

Open `..\vns-current` for the saved version and `..\vns-next-work` for next-version development. Remove a worktree only after closing tools using it and confirming it has no uncommitted work:

```powershell
git worktree list
git worktree remove ..\vns-current
```
