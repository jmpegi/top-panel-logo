# Top Panel Logo

Top Panel Logo is a **lightweight GNOME Shell extension** that adds a customizable icon to the top panel.

Both left‑click and right‑click actions are user‑configurable, allowing for powerful shortcuts without cluttering your workflow.

## ✨ What it does

**Places a customizable icon in the GNOME Shell top panel** (left section).

Left click and right click can be assigned to different actions from a fixed set of useful options.

Designed to be lightweight: no background polling, no unnecessary signals — all actions run instantly on click.

## 🛠 Available Actions

For either Left Click or Right Click (independently), choose from:

- 'Show Overview' – Opens/closes GNOME Activities Overview.

- 'Show Apps Menu' – Opens GNOME’s applications grid view.

- 'Hide All Windows' (Minimize/Restore Windows On Current Workspace) – Matches GNOME's “Hide all normal windows” behavior.

- 'Open System Monitor' – Launches gnome-system-monitor if installed.

- 'Launch App' – Launch a user‑chosen application (Flatpak and .desktop support).

- 'Custom Command' – Run any shell command you define.

- 'Do Nothing' - Does nothing.

## 🎨 Icon Customization

- 'Icon Path' – Point to any PNG, JPEG, or SVG file to display.

- 'Icon Size' – Set the pixel size of your panel icon.

- 'Horizontal Padding' – Adjust space on either side of the icon.

## 🚀 Usage Examples

Left click: Show Overview, Right click: Hide All Windows.

Left click: Launch Terminal, Right click: Open System Monitor.

Left click: Custom Command, Right click: Show Apps Menu.

## 📋 Requirements

GNOME Shell 46+

For 'Custom Command' or 'Launch App', use valid executable commands.

## 📦 Installation

There are 2 ways of installation:

- From [GNOME Extensions website](https://extensions.gnome.org/extension/8559/top-panel-logo/).

- From [GitHub](https://github.com/jmpegi/top-panel-logo):

  1. Clone this repo to `~/.local/share/gnome-shell/extensions/top-panel-logo@jmpegi.github.com`.
  2. Restart GNOME Shell (logout or reboot).
  3. Enable the extension.

     NOTE: You can also install the extension system-wide by placing it in `/usr/share/gnome-shell/extensions/top-panel-logo@jmpegi.github.com` instead. This is not recommended.

## 💡 Tips

Most GNU/Linux distributions store their logo somewhere inside `/usr/share/pixmaps/` or `/usr/share/icons/desktop-base/`

For ease of use, disable 'Hot Corner' under 'GNOME Settings/Multitasking'.

To prevent gnome-terminal from automatically closing when running a custom command, use:  
`gnome-terminal -- bash -c 'yourcommand; exec bash'` or  
`gnome-terminal -- bash -c 'yourcommand; wait'`

## 📝 License

Copyright (C) 2025 jmpegi <jmpegi@protonmail.com>.  
Released under GPL‑3.0 — feel free to modify or contribute.

Any feedback, ideas and bug reports are welcome!
