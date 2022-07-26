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

    use("neovim/nvim-lspconfig")
    use("nvim-treesitter/nvim-treesitter", {
        run = ":TSUpdate"
    })

    --.md file preview
    use({
        "iamcco/markdown-preview.nvim",
        run = function() vim.fn["mkdp#util#install"]() end,
    })

end)
