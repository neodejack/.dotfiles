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
          enabled = true,
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
    {
      "folke/sidekick.nvim",
      opts = function()
        -- to manually enable: run :`Sidekick nes enable`
        require("sidekick.nes").disable()
      end,
    },
  }
end
