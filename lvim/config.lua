-- Read the docs: https://www.lunarvim.org/docs/configuration
-- Video Tutorials: https://www.youtube.com/watch?v=sFA9kX-Ud_c&list=PLhoH5vyxr6QqGu0i7tt_XoVK9v-KvZ3m6
-- Forum: https://www.reddit.com/r/lunarvim/
-- Discord: https://discord.com/invite/Xb9B4Ny
reload("user.config")

lvim.format_on_save.enabled = true
vim.opt.shiftwidth = 4 -- the number of spaces inserted for each indentation
vim.opt.tabstop = 4    -- insert 4 spaces for a tab
lvim.transparent_window = true
lvim.builtin.telescope.defaults.layout_config.width = 0.75
lvim.builtin.telescope.defaults.layout_config.preview_cutoff = 1
lvim.builtin.telescope.pickers.git_files.enable_preview = true
lvim.builtin.treesitter.rainbow.enable = true

lvim.plugins = {
    {
        "ray-x/lsp_signature.nvim",
        event = "BufRead",
        config = function() require "lsp_signature".on_attach() end,
    },
    {
        "mrjones2014/nvim-ts-rainbow",
    },
    {
        "nvim-lua/plenary.nvim",
    },
    {
        "ThePrimeagen/harpoon",
    },
    {
        "karb94/neoscroll.nvim",
        event = "WinScrolled",
        config = function()
            require('neoscroll').setup({
                -- All these keys will be mapped to their corresponding default scrolling animation
                mappings = { '<C-u>', '<C-d>', '<C-b>', '<C-f>',
                    '<C-y>', '<C-e>', 'zt', 'zz', 'zb' },
                hide_cursor = true,          -- Hide cursor while scrolling
                stop_eof = true,             -- Stop at <EOF> when scrolling downwards
                use_local_scrolloff = false, -- Use the local scope of scrolloff instead of the global scope
                respect_scrolloff = false,   -- Stop scrolling when the cursor reaches the scrolloff margin of the file
                cursor_scrolls_alone = true, -- The cursor will keep on scrolling even if the window cannot scroll further
                easing_function = nil,       -- Default easing function
                pre_hook = nil,              -- Function to run before the scrolling animation starts
                post_hook = nil,             -- Function to run after the scrolling animation ends
            })
        end
    },
    {
        "romgrk/nvim-treesitter-context",
        config = function()
            require("treesitter-context").setup {
                enable = true,   -- Enable this plugin (Can be enabled/disabled later via commands)
                throttle = true, -- Throttles plugin updates (may improve performance)
                max_lines = 0,   -- How many lines the window should span. Values <= 0 mean no limit.
                patterns = {     -- Match patterns for TS nodes. These get wrapped to match at word boundaries.
                    -- For all filetypes
                    -- Note that setting an entry here replaces all other patterns for this entry.
                    -- By setting the 'default' entry below, you can control which nodes you want to
                    -- appear in the context window.
                    default = {
                        'class',
                        'function',
                        'method',
                    },
                },
            }
        end
    },
}

lvim.autocommands = {
    { { "ColorScheme" },
        {
            pattern = "*",
            callback = function()
                vim.api.nvim_set_hl(0, "LineNr", { fg = "#5eacd3" })
                vim.api.nvim_set_hl(0, "CursorLineNR", { fg = "#e8abf8" })
            end,
        },
    },
}

-- harpoon setting
local mark = require("harpoon.mark")
local ui = require("harpoon.ui")
lvim.builtin.which_key.mappings["a"] = {
    name = "Harpoon",
    a = { mark.add_file, "add file to harpoon" },
    h = { ui.toggle_quick_menu, "toggle quick menu" },
    j = { function() ui.nav_file(1) end, "go to file 1" },
    k = { function() ui.nav_file(2) end, "go to file 2" },
    l = { function() ui.nav_file(3) end, "go to file 3" },
    u = { function() ui.nav_file(4) end, "go to file 4" },
    i = { function() ui.nav_file(5) end, "go to file 5" },
    o = { function() ui.nav_file(6) end, "go to file 6" },

}
