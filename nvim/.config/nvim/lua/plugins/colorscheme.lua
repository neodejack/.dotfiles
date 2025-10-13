return {
  {
    "catppuccin/nvim",
    opts = function(_, opts)
      opts.color_overrides = {
        all = {
          base = "#171717",
          mantle = "#171717",
          crust = "#353535",
        },
      }
      return opts
    end,
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "catppuccin-mocha",
    },
  },
}
