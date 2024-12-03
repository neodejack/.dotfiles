return {
    {
        "neovim/nvim-lspconfig",
        opts = function()
            local keys = require("lazyvim.plugins.lsp.keymaps").get()
            keys[#keys + 1] = {
                "gd",
                function()
                    -- DO NOT RESUSE WINDOW: this is to fix the zen mode bug(if reuse_win is true, then when `gd` leads to somewhere in the same window, zen mode will break )
                    require("telescope.builtin").lsp_definitions({ reuse_win = false })
                end,
                desc = "Goto Definition!!YES",
                has = "definition",
            }
        end,
    },
    {
        "neovim/nvim-lspconfig",
        opts = {
            inlay_hints = {
                enabled = false,
            },
        },
    },
}
