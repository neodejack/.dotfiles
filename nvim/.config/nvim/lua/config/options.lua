-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here
vim.g.snacks_animate = false
vim.opt.conceallevel = 0

-- Remote sessions (plain SSH or a herdr pane) have no direct route to the
-- laptop clipboard: the pbcopy provider would write to THIS machine's
-- clipboard. Emit OSC 52 instead — herdr bridges it to the local client
-- (wezterm) in --remote mode, plain SSH passes it through.
-- Paste stays local (last yank register): OSC 52 *reads* need the terminal
-- to answer clipboard queries, which most block; cross-machine paste is
-- Cmd+V via bracketed paste.
if vim.env.SSH_CONNECTION or vim.env.SSH_TTY or vim.env.HERDR_PANE_ID then
  local osc52 = require("vim.ui.clipboard.osc52")
  local function paste_from_unnamed()
    return { vim.split(vim.fn.getreg('"'), "\n"), vim.fn.getregtype('"') }
  end
  vim.g.clipboard = {
    name = "OSC 52",
    copy = { ["+"] = osc52.copy("+"), ["*"] = osc52.copy("*") },
    paste = { ["+"] = paste_from_unnamed, ["*"] = paste_from_unnamed },
  }
end

-- LazyVim blanks clipboard under SSH_CONNECTION and, worse, snapshots the
-- value at startup and restores that snapshot at VeryLazy — so autocmds that
-- force it get stomped. Setting it here is the supported override point:
-- user options load after LazyVim's, so the snapshot picks this value up.
vim.opt.clipboard = "unnamedplus"
