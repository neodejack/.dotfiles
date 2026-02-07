-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here
vim.g.snacks_animate = false
vim.opt.conceallevel = 0

if not vim.env.SSH_CONNECTION then
  local clipboard_group = vim.api.nvim_create_augroup("local_clipboard", { clear = true })
  local function force_unnamedplus()
    vim.opt.clipboard = "unnamedplus"
  end

  -- LazyVim defers clipboard setup; enforce unnamedplus when UI is ready.
  vim.api.nvim_create_autocmd("VimEnter", {
    group = clipboard_group,
    callback = force_unnamedplus,
  })
  vim.api.nvim_create_autocmd("User", {
    group = clipboard_group,
    pattern = "VeryLazy",
    callback = force_unnamedplus,
  })
end
