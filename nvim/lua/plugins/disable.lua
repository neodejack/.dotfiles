if true then
  return {
    {
      "neovim/nvim-lspconfig",
      opts = {
        inlay_hints = { enabled = false },
      },
    },

    -- zen config
    {
      "folke/snacks.nvim",
      keys = {
        { "<leader>fe", false },
        { "<leader>fE", false },
        { "<leader>e", false },
        { "<leader>E", false },
      },
      opts = {
        -- disable dimming
        zen = {
          toggles = {
            dim = false,
          },
        },
        -- disable background
        styles = {
          zen = {
            backdrop = { transparent = false, blend = 40 },
          },
        },
        snack_explorer = {
          enabled = false,
        },
        explorer = {
          replace_netrw = false,
          enabled = false,
        },
      },
    },
    -- disable the default flash keymap
    {
      "folke/flash.nvim",
      keys = {
        { "s", mode = { "n", "x", "o" }, false },
      },
    },
  }
end
