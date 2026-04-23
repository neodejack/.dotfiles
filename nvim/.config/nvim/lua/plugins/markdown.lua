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
    "stevearc/conform.nvim",
    optional = true,
    opts = {
      formatters_by_ft = {
        yaml = { "yamlfmt" },
      },
      formatters = {
        prettier = {
          options = {
            ft_parsers = {
              markdown = "markdown",
            },
            ext_parsers = {
              md = "markdown",
            },
          },
          args = {
            "--stdin-filepath",
            "$FILENAME",
            "--embedded-language-formatting=off",
          },
        },
      },
    },
  },
}
