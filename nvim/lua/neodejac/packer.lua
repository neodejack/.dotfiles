-- This file can be loaded by calling `lua require('plugins')` from your init.vim

-- Only required if you have packer configured as `opt`
vim.cmd [[packadd packer.nvim]]

return require("packer").startup(function()
    use("wbthomason/packer.nvim")

    -- Colorscheme
    use("folke/tokyonight.nvim")
    use("gruvbox-community/gruvbox")

    use("sbdchd/neoformat")
    --Telescope Requirements
    use 'nvim-lua/popup.nvim'
    use 'nvim-lua/plenary.nvim'
    use {
        'nvim-telescope/telescope.nvim', tag = '0.1.0',
        requires = { {'nvim-lua/plenary.nvim'} }
    }

    --comments
    use("folke/todo-comments.nvim")
    use {
    'numToStr/Comment.nvim',
    config = function()
        require('Comment').setup()
    end
}

    -- lsp config
    use("neovim/nvim-lspconfig")
    use("nvim-treesitter/nvim-treesitter", {
        run = ":TSUpdate"
    })
    use("nvim-lua/lsp_extensions.nvim")
    use("glepnir/lspsaga.nvim")

    -- nvim-cmp for lsp
    use("hrsh7th/cmp-nvim-lsp")
    use("hrsh7th/cmp-buffer")
    use("hrsh7th/nvim-cmp")
    use("L3MON4D3/LuaSnip")
    use("saadparwaiz1/cmp_luasnip")
    use("onsails/lspkind-nvim")
    use("tzachar/cmp-tabnine", { run = "./install.sh", requires = 'hrsh7th/nvim-cmp'})

    -- tree like symbol outline
    use("simrat39/symbols-outline.nvim")

    --.md file preview
    use({
        "iamcco/markdown-preview.nvim",
        run = function() vim.fn["mkdp#util#install"]() end,
    })

end)
