# 💤 LazyVim

A starter template for [LazyVim](https://github.com/LazyVim/LazyVim).
Refer to the [documentation](https://lazyvim.github.io/installation) to get started.

## Troubleshooting

### Neovim exits silently when opening a file (macOS Tahoe 26.x)

After running `:TSUpdate` or upgrading plugins, neovim may instantly quit without any error when opening certain file types. This is caused by macOS Tahoe's stricter code signing enforcement — it kills neovim via `SIGKILL` when treesitter tries to load a locally compiled parser `.so` with an invalid signature.

**Fix:** Re-sign all treesitter parser `.so` files with ad-hoc signatures:

```bash
find ~/.local/share/nvim -name "*.so" -exec codesign -f -s - {} \;
```

Run this again after every `:TSUpdate` or plugin upgrade that recompiles parsers.
