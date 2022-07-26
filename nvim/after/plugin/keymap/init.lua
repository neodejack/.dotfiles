local Remap = require("neodejac.keymap")
local nnoremap = Remap.nnoremap
local vnoremap = Remap.vnoremap
local inoremap = Remap.inoremap
local xnoremap = Remap.xnoremap
local nmap = Remap.nmap

--nnoremap("<leader>pv", ":Ex<CR>")
--open up the file tree
nnoremap("<leader>pv", ":wincmd v<bar> :Ex <bar> :vertical resize 30<CR>")
