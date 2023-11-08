-- Read the docs: https://www.lunarvim.org/docs/configuration
-- Video Tutorials: https://www.youtube.com/watch?v=sFA9kX-Ud_c&list=PLhoH5vyxr6QqGu0i7tt_XoVK9v-KvZ3m6
-- Forum: https://www.reddit.com/r/lunarvim/
-- Discord: https://discord.com/invite/Xb9B4Ny
--

vim.opt.relativenumber = true
lvim.format_on_save.enabled = true
vim.opt.shiftwidth = 4 -- the number of spaces inserted for each indentation
vim.opt.tabstop = 4    -- insert 4 spaces for a tab
lvim.transparent_window = true
lvim.builtin.telescope.defaults.layout_config.width = 0.75
lvim.builtin.telescope.defaults.layout_config.preview_cutoff = 1
lvim.builtin.telescope.pickers.git_files.enable_preview = true

-- my kep map
lvim.keys.normal_mode["L"] = "$"
lvim.keys.normal_mode["H"] = "^"
lvim.keys.visual_mode["L"] = "$"
lvim.keys.visual_mode["H"] = "^"

lvim.builtin.which_key.mappings["P"] = lvim.builtin.which_key.mappings["p"]
lvim.builtin.which_key.mappings["p"] = { '"_dP', "the chad paste" }

-- lsp keymap
lvim.lsp.buffer_mappings.normal_mode['gt'] = { vim.lsp.buf.type_definition, "Goto type definition" }
lvim.lsp.buffer_mappings.normal_mode['gI'] = nil
--
-- change default lsp quick list to telescope
lvim.lsp.buffer_mappings.normal_mode["gr"] = {
    ":lua require'telescope.builtin'.lsp_references()<cr>",
    "? Find references"
}
lvim.lsp.buffer_mappings.normal_mode['gi'] = {
    ":lua require'telescope.builtin'.lsp_implementations()<cr>",
    "?? Find implementation"
}

lvim.plugins = {
    {
        'Olical/conjure',
        "nvim-neotest/neotest-go",
        "nvim-lua/plenary.nvim",
        "ThePrimeagen/harpoon",
        "leoluz/nvim-dap-go",
    },
    {
        "ray-x/lsp_signature.nvim",
        event = "BufRead",
        config = function() require "lsp_signature".on_attach() end,
    },
    {
        "karb94/neoscroll.nvim",
        event = "WinScrolled",
        config = function()
            require('neoscroll').setup({
                -- All these keys will be mapped to their corresponding default scrolling animation
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
                    -- For all filetypes Note that setting an entry here replaces all other patterns for this entry.
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
    {
        "nvim-neotest/neotest",
        dependencies = {
            "nvim-lua/plenary.nvim",
            "antoinemadec/FixCursorHold.nvim"
        }, 
        config = function()
            -- get neotest namespace (api call creates or returns namespace)
            local neotest_ns = vim.api.nvim_create_namespace("neotest")
            vim.diagnostic.config({
                virtual_text = {
                    format = function(diagnostic)
                        local message =
                            diagnostic.message:gsub("\n", " "):gsub("\t", " "):gsub("%s+", " "):gsub("^%s+", "")
                        return message
                    end,
                },
            }, neotest_ns)
            require("neotest").setup({
                -- your neotest config here
                adapters = {
                    require("neotest-go"),
                },
            })
        end,
    },
    -- TODO: curretnly this is broken, will try again with the newer verion of lunarvim once released
    -- {
    --     "andymass/vim-matchup",
    --     event = "CursorMoved",
    --     config = function()
    --         vim.g.matchup_matchparen_offscreen = { method = "popup" }
    --     end,
    -- },
    {
        "kevinhwang91/nvim-bqf",
        event = { "BufRead", "BufNew" },
        config = function()
            require("bqf").setup({
                auto_enable = true,
                preview = {
                    win_height = 12,
                    win_vheight = 12,
                    delay_syntax = 80,
                    border_chars = { "?", "?", "?", "?", "?", "?", "?", "?", "?" },
                },
                func_map = {
                    vsplit = "",
                    ptogglemode = "z,",
                    stoggleup = "",
                },
                filter = {
                    fzf = {
                        action_for = { ["ctrl-s"] = "split" },
                        extra_opts = { "--bind", "ctrl-o:toggle-all", "--prompt", "> " },
                    },
                },
            })
        end,
    },
    {
        "rmagatti/goto-preview",
        config = function()
            require('goto-preview').setup {
                width = 120,             -- Width of the floating window
                height = 25,             -- Height of the floating window
                default_mappings = true, -- Bind default mappings
                debug = false,           -- Print debug information
                opacity = nil,           -- 0-100 opacity level of the floating window where 100 is fully transparent.
                post_open_hook = nil,    -- A function taking two arguments, a buffer and a window to be ran as a hook.
                focus_on_open = true,    -- Focus the floating window when opening it.
                dismiss_on_move = false, -- Dismiss the floating window when moving the cursor.
                -- You can use "default_mappings = true" setup option
                -- Or explicitly set keybindings
                -- vim.cmd("nnoremap gpd <cmd>lua require('goto-preview').goto_preview_definition()<CR>")
                -- vim.cmd("nnoremap gpi <cmd>lua require('goto-preview').goto_preview_implementation()<CR>")
                -- vim.cmd("nnoremap gP <cmd>lua require('goto-preview').close_all_win()<CR>")
            }
        end
    },
    -- {
    --     "itchyny/vim-cursorword",
    --     event = { "BufEnter", "BufNewFile" },
    --     config = function()
    --         vim.api.nvim_command("augroup user_plugin_cursorword")
    --         vim.api.nvim_command("autocmd!")
    --         vim.api.nvim_command("autocmd FileType NvimTree,lspsagafinder,dashboard,vista let b:cursorword = 0")
    --         vim.api.nvim_command("autocmd WinEnter * if &diff || &pvw | let b:cursorword = 0 | endif")
    --         vim.api.nvim_command("autocmd InsertEnter * let b:cursorword = 0")
    --         vim.api.nvim_command("autocmd InsertLeave * let b:cursorword = 1")
    --         vim.api.nvim_command("augroup END")
    --     end
    -- },
    {
        "folke/todo-comments.nvim",
        event = "BufRead",
        config = function()
            require("todo-comments").setup()
        end,
    },
    {
        "folke/persistence.nvim",
        event = "BufReadPre",
        config = function()
            require("persistence").setup({
                dir = vim.fn.expand(vim.fn.stdpath "state" .. "/sessions/"),
                options = { "buffers", "curdir", "tabpages", "winsize" }
            })
        end
    },
}

-- diagnostics remap
lvim.builtin.which_key.mappings["t"] = {
    name = "Diagnostics",
    b = { "<cmd>Telescope diagnostics bufnr=0 theme=get_ivy<cr>", "Buffer Diagnostics" },
    w = { "<cmd>Telescope diagnostics<cr>", "Diagnostics" },
    j = {
        "<cmd>lua vim.diagnostic.goto_next()<cr>",
        "Next Diagnostic",
    },
    k = {
        "<cmd>lua vim.diagnostic.goto_prev()<cr>",
        "Prev Diagnostic",
    }
}

-- remove the defalult diagnostic keymap
lvim.builtin.which_key.mappings["l"]["j"] = {}
lvim.builtin.which_key.mappings["l"]["k"] = {}
lvim.builtin.which_key.mappings["l"]["d"] = {}
lvim.builtin.which_key.mappings['l']["w"] = {}
lvim.builtin.which_key.mappings["l"]["q"] = {}
lvim.builtin.which_key.mappings["l"]["e"][2] = "Move Quickfix list to Telescope"

-- todo plugin keymap
lvim.builtin.which_key.mappings["sd"] = { "<cmd>TodoTelescope<cr>", "to do" }

lvim.autocommands = {
    -- line number color setting
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
lvim.builtin.which_key.mappings["H"] = lvim.builtin.which_key.mappings["h"]
lvim.builtin.which_key.mappings["h"] = {
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

-- neoscroll setting
require('neoscroll').setup({
    -- Set any options as needed
})

local t    = {}
-- Syntax: t[keys] = {function, {function arguments}}
t['<C-u>'] = { 'scroll', { '-vim.wo.scroll', 'true', '70' } }
t['<C-d>'] = { 'scroll', { 'vim.wo.scroll', 'true', '70' } }
t['zt']    = { 'zt', { '120' } }
t['zz']    = { 'zz', { '120' } }
t['zb']    = { 'zb', { '120' } }
require('neoscroll.config').set_mappings(t)

lvim.builtin.which_key.mappings["dm"] = { "<cmd>lua require('neotest').run.run()<cr>", "Test Method" }
lvim.builtin.which_key.mappings["df"] = { "<cmd>lua require('neotest').run.run({vim.fn.expand('%')})<cr>", "Test Class" }
lvim.builtin.which_key.mappings["dS"] = { "<cmd>lua require('neotest').summary.toggle()<cr>", "Test Summary" }

-- debugger for go
lvim.builtin.dap.active = true
require('dap-go').setup {
    dap_configurations = {
        {
            -- Must be "go" or it will be ignored by the plugin
            type = "go",
            name = "Debug Cron DataEmail",
            request = "launch",
            program = "${file}",
            args = { "-c local.dev.toml --run-once data-email" }
            ,
        },
    },
    delve = {
        build_flags =
        '-race -ldflags \'-X "github.com/M2R-System-Technology-Pte-Ltd/cloudy-server/ver.Git=df787f1024def46056199ce79707802a6f3b7752" -X "github.com/M2R-System-Technology-Pte-Ltd/cloudy-server/ver.Compile=go version go1.21.1 darwin/arm64" -X "github.com/M2R-System-Technology-Pte-Ltd/cloudy-server/ver.Date=2023-09-20 10:43:30 +0800"\'',
    }
}

-- enable treesitter integration for the matchup plugin
--


-- keymap for persistence plugin
lvim.builtin.which_key.mappings["S"] = {
    name = "Session",
    c = { "<cmd>lua require('persistence').load()<cr>", "Restore last session for current dir" },
    l = { "<cmd>lua require('persistence').load({ last = true })<cr>", "Restore last session" },
    Q = { "<cmd>lua require('persistence').stop()<cr>", "Quit without saving session" },
}

-- options
lvim.builtin.project.detection_methods = { "lsp", "pattern" }
lvim.builtin.project.patterns = {
    ".git",
    "package-lock.json",
    "yarn.lock",
    "package.json",
    "requirements.txt",
}
lvim.builtin.telescope.defaults.path_display = { "truncate" }

-- localleader for conjure plugin
vim.g.maplocalleader = ','

-- find all files (including gitigored files)
lvim.builtin.which_key.mappings["s"]["F"] = { "<cmd>Telescope find_files hidden=true no_ignore=true<cr>",
    "Find File Everywhere" }
lvim.builtin.which_key.mappings["s"]["G"] = {
    function()
        require("telescope.builtin").live_grep {
            additional_args = function(args) return vim.list_extend(args, { "--hidden", "--no-ignore" }) end,
        }
    end,
    "Grep text Everywhere",
}
-- turn on previewer for telescope finder
lvim.builtin.which_key.mappings["f"] = {
    function()
        require("lvim.core.telescope.custom-finders").find_project_files { previewer = true }
    end,
    "Find File",
}

-- make <C-p> finding files
lvim.keys.normal_mode["<C-p>"] =
"<cmd>lua require('lvim.core.telescope.custom-finders').find_project_files({previewer = true})<cr>"

-- map <leader>sg to live grep text files
lvim.builtin.which_key.mappings["s"]["g"] = lvim.builtin.which_key.mappings["s"]["t"]
lvim.builtin.which_key.mappings["s"]["g"][2] = "Grep text"
lvim.builtin.which_key.mappings["s"]["t"] = {}
