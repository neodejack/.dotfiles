return {
  ---@type LazySpec
  {
    "mikavilpas/yazi.nvim",
    event = "VeryLazy",
    dependencies = {
      -- check the installation instructions at
      -- https://github.com/folke/snacks.nvim
      "folke/snacks.nvim",
    },
    keys = {
      -- 👇 in this section, choose your own keymappings!
      {
        -- Open in the current working directory
        "<leader>e",
        "<cmd>Yazi<cr>",
        desc = "Open the file manager in the file directory",
      },
      {
        -- Open in the current working directory
        "<leader>E",
        "<cmd>Yazi cwd<cr>",
        desc = "Open the file manager in nvim's working directory",
      },
      {
        "<leader>cw",
        "<cmd>Yazi toggle<cr>",
        desc = "Resume the last yazi session",
      },
    },
    ---@type YaziConfig | {}
    opts = {
      -- if you want to open yazi instead of netrw, see below for more info
      open_for_directories = false,
      keymaps = {
        show_help = "<f1>",
      },
    },
    -- 👇 if you use `open_for_directories=true`, this is recommended
    init = function()
      -- More details: https://github.com/mikavilpas/yazi.nvim/issues/802
      vim.g.loaded_netrw = 1
      vim.g.loaded_netrwPlugin = 1
    end,
  },

  {
    "neodejack/copy_with_context.nvim",
    config = function()
      require("copy_with_context").setup({
        -- Customize mappings
        mappings = {
          relative = "<leader>y",
          absolute = "<leader>Y",
        },
        -- whether to trim lines or not
        trim_lines = false,
        context_format = "@%s:%s", -- Default format for context: "# Source file: filepath:line"
        copy_content = false,
      })
    end,
  },
}
