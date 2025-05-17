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
