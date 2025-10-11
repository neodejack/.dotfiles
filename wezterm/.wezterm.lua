local wezterm = require("wezterm")

local config = wezterm.config_builder()
local act = wezterm.action

-- https://github.com/wezterm/wezterm/issues/2756#issue-1455540563, it says here that mac Metal should use WebGpu
config.front_end = "WebGpu"
-- https://wezterm.org/config/lua/config/webgpu_power_preference.html
config.webgpu_power_preference = "LowPower"
config.font = wezterm.font("Berkeley Mono", { weight = "Regular" })

config.initial_rows = 53
config.initial_cols = 160
config.window_decorations = "RESIZE"
config.hide_tab_bar_if_only_one_tab = true
config.use_fancy_tab_bar = false
config.window_background_opacity = 0.85
config.text_background_opacity = 0.75
config.macos_window_background_blur = 10
config.font_size = 18
config.line_height = 1.1
config.tab_max_width = 50
config.tab_bar_at_bottom = true

-- Bell/notification settings for Claude Code confirmations
config.audible_bell = "SystemBeep"
config.visual_bell = {
	fade_in_duration_ms = 100,
	fade_out_duration_ms = 100,
}
config.colors = {
	visual_bell = "#717171",
}

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
		cursor_bg = "#f0e9e0",
		cursor_fg = "black",
		cursor_border = "#F09985",
		split = "#717171",
		tab_bar = {
			background = "#282a2e",
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
		selection_bg = "#6c938d",
		selection_fg = "#F0E9E0",
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

-- Make inactive panes much more dim for better visibility
config.inactive_pane_hsb = {
	brightness = 0.3,
}

local hostname = require("wezterm").hostname()

if hostname == "ziliwork.local" then
	config.font_size = 17
	config.window_padding = {
		left = 15,
		right = 15,
		bottom = 1,
	}
end

config.leader = { key = "Space", mods = "CTRL", timeout_milliseconds = 1000 }
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
	{ key = "LeftArrow", mods = "ALT", action = act.MoveTabRelative(-1) },
	{ key = "RightArrow", mods = "ALT", action = act.MoveTabRelative(1) },
	-- copy mode to ctrl-v
	{ key = "c", mods = "ALT", action = wezterm.action.ActivateCopyMode },
	-- launcher
	{ key = "t", mods = "CTRL|SHIFT", action = wezterm.action.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }) },
	-- font size | zoom
	{ key = "=", mods = "SUPER", action = wezterm.action.IncreaseFontSize },
	{ key = "_", mods = "SUPER", action = wezterm.action.DecreaseFontSize },
	-- backward-word
	{ key = "b", mods = "CTRL", action = act.SendString("\x1bb") },
	-- forward-word
	{ key = "f", mods = "CTRL", action = act.SendString("\x1bf") },
}
-- replace only the copy mode Ctrl+C binding while keeping other defaults intact
local copy_mode = nil
if wezterm.gui then
	copy_mode = wezterm.gui.default_key_tables().copy_mode
	table.insert(copy_mode, { key = "c", mods = "CTRL", action = act.CopyMode("ClearSelectionMode") })
end

config.key_tables = config.key_tables or {}
config.key_tables.copy_mode = copy_mode

-- and finally, return the configuration to wezterm
return config
