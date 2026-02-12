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
      opts = function(_, opts)
        -- turn off Copilot NES completely
        opts.nes = opts.nes or {}
        opts.nes.enabled = false

        -- add amp as a sidekick tool
        opts.cli = opts.cli or {}
        opts.cli.tools = opts.cli.tools or {}
        opts.cli.tools.amp = {
          cmd = { "amp" },
          format = function(text)
            local Text = require("sidekick.text")
            Text.transform(text, function(str)
              return str:find("[^%w/_%.%-]") and ('"' .. str .. '"') or str
            end, "SidekickLocFile")
            local ret = Text.to_string(text)
            -- transform line ranges to a format that amp understands
            ret = ret:gsub("@([^ ]+)%s*:L(%d+):C%d+%-L(%d+):C%d+", "@%1#L%2-%3")
            ret = ret:gsub("@([^ ]+)%s*:L(%d+):C%d+%-C%d+", "@%1#L%2")
            ret = ret:gsub("@([^ ]+)%s*:L(%d+)%-L(%d+)", "@%1#L%2-%3")
            ret = ret:gsub("@([^ ]+)%s*:L(%d+):C%d+", "@%1#L%2")
            ret = ret:gsub("@([^ ]+)%s*:L(%d+)", "@%1#L%2")
            return ret
          end,
        }

        return opts
      end,
    },
  }
end
