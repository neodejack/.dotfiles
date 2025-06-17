local HOME = os.getenv("HOME")
return {
  {
    "mfussenegger/nvim-lint",
    optional = true,
    opts = {
      linters = {
        ["markdownlint-cli2"] = {
          args = { "--config", HOME .. "/.config/.markdownlint-cli2.yaml", "--" },
        },
      },
    },
  },
  {
    "MeanderingProgrammer/render-markdown.nvim",
    enabled = false,
  },
}
