-- Pull in the wezterm API
local wezterm = require("wezterm")

-- This will hold the configuration.
local config = wezterm.config_builder()
local act = wezterm.action

-- This is where you actually apply your config choices
-- config.font = wezterm.font("Fira Code", { weight = "Medium" })
-- config.harfbuzz_features = { "zero", "cv02", "cv04", "cv14", "onum", "cv30" }

config.front_end = "WebGpu"
--
-- config.freetype_load_target = "Light"
-- config.freetype_render_target = "Normal"
config.font = wezterm.font("Berkeley Mono", { weight = "Regular" })
-- config.font = wezterm.font("Monaspace Argon", { weight = "Medium" })
-- config.harfbuzz_features = { "ss01", "ss02", "ss03", "ss04", "ss05", "ss06", "ss07", "ss08", "calt", "dlig" }
-- For example, changing the color scheme:

config.initial_rows = 53
config.initial_cols = 160
config.window_decorations = "RESIZE"
config.hide_tab_bar_if_only_one_tab = true
config.use_fancy_tab_bar = false
config.window_background_opacity = 0.85
config.text_background_opacity = 0.75
config.macos_window_background_blur = 10
config.font_size = 15.5
config.line_height = 1.1
config.tab_max_width = 30
config.tab_bar_at_bottom = true

-- color scheme shenanigans
config.color_schemes = {
	["pantone2025"] = {
		foreground = "#CAD3F5",
		background = "#282a2e",
		ansi = { "#353535", "#d19c97", "#ACBB97", "#d16f54", "#a6c5ff", "#a793b9", "#779a95", "#a89b8f" },
		brights = {
			"#717171",
			"#F49AAE",
			"#ACBB97",
			"#DE9A87",
			"#88b1ff",
			"#C1B3CE",
			"#9FB8B4",
			"#C2B9B0",
		},
		-- Overrides the cell background color when the current cell is occupied by the
		-- cursor and the cursor style is set to Block
		cursor_bg = "#f0e9e0",
		-- Overrides the text color when the current cell is occupied by the cursor
		cursor_fg = "black",
		-- Specifies the border color of the cursor when the cursor style is set to Block,
		-- or the color of the vertical or horizontal bar when the cursor style is set to
		-- Bar or Underline.
		cursor_border = "#F09985",
		split = "#717171",
		tab_bar = {
			background = "#282a2e",
			-- The new tab button that let you create new tabs
			new_tab = {
				bg_color = "#282a2e",
				fg_color = "#808080",
			},
			inactive_tab = {
				bg_color = "#282a2e",
				fg_color = "#808080",
			},
			active_tab = {
				bg_color = "#0F0D04",
				fg_color = "#D19C97",
				intensity = "Bold",
			},
		},
		-- the background color of selected text
		selection_bg = "#6c938d",
		selection_fg = "#F0E9E0",
		-- selection_fg = "#F0E9E0",
	},
}

-- old color config
-- config.colors = {
-- 	background = "#2C333E",
-- 	tab_bar = {
-- 		active_tab = {
-- 			bg_color = "#2C333E",
-- 			fg_color = "#A47764",
-- 			italic = true,
-- 		},
-- 	},
-- }

config.color_scheme = "pantone2025"
-- config.color_scheme = "Catppuccin Macchiato"
--debug, run `WEZTERM_LOG=info wezterm` to see all key events
config.debug_key_events = true

-- config.window_padding = {
-- 	left = 20,
-- 	right = 20,
-- 	top = 20,
-- 	bottom = 5,
-- }

config.keys = {
	-- split pane stuff
	{
		key = "|",
		mods = "SUPER",
		action = wezterm.action.SplitHorizontal({ domain = "CurrentPaneDomain" }),
	},
	{
		key = "-",
		mods = "SUPER",
		action = wezterm.action.SplitVertical({ domain = "CurrentPaneDomain" }),
	},
	{
		key = "h",
		mods = "SUPER",
		action = act.ActivatePaneDirection("Left"),
	},
	{
		key = "l",
		mods = "SUPER",
		action = act.ActivatePaneDirection("Right"),
	},
	{
		key = "k",
		mods = "SUPER",
		action = act.ActivatePaneDirection("Up"),
	},
	{
		key = "j",
		mods = "SUPER",
		action = act.ActivatePaneDirection("Down"),
	},
	{
		key = "w",
		mods = "SUPER",
		action = wezterm.action.CloseCurrentPane({ confirm = true }),
	},
	-- tab bar stuff
	{
		key = "Tab",
		mods = "CTRL",
		action = wezterm.action.ActivateLastTab,
	},
	{ key = ",", mods = "SUPER", action = act.ActivateTabRelative(-1) },
	{ key = ".", mods = "SUPER", action = act.ActivateTabRelative(1) },
	{ key = ",", mods = "ALT", action = act.ActivateTabRelative(-1) },
	{ key = ".", mods = "ALT", action = act.ActivateTabRelative(1) },
	{ key = "LeftArrow", mods = "ALT", action = act.MoveTabRelative(-1) },
	{ key = "RightArrow", mods = "ALT", action = act.MoveTabRelative(1) },
	-- copy mode to ctrl-v
	{ key = "c", mods = "ALT", action = wezterm.action.ActivateCopyMode },
	-- launcher
	{ key = "Space", mods = "CTRL", action = wezterm.action.ShowLauncher },
	-- font size | zoom
	{ key = "=", mods = "SUPER", action = wezterm.action.IncreaseFontSize },
	{ key = "_", mods = "SUPER", action = wezterm.action.DecreaseFontSize },
}

-- and finally, return the configuration to wezterm
return config
