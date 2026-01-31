# <img src="assets/top-panel-logo-icon.png" alt="Icon" style="height: 2rem;"> Top Panel Logo

Top Panel Logo is a **lightweight GNOME Shell extension** that **adds a customizable icon to the top panel**.

Both left‑click and right‑click actions are configurable, allowing for powerful shortcuts without cluttering your workflow.

![Screenshot](assets/top-panel-logo-screenshot.png)

## ✨ What it does

It lets you personalize your GNOME desktop with the icon of your choice. You can easily pick the icon, adjust its size and position, and customize what happens when you click on it!

Designed to be lightweight and efficient: no background polling, no unnecessary signals, no bells and whistles.

![Screenshot](assets/top-panel-logo-prefs.png)

## 🛠 Available Actions

For either Left Click or Right Click (independently), choose from:

- 'Do Nothing' - Does nothing.

- 'Show Overview' – Opens/closes GNOME Activities Overview.

- 'Show Apps Grid' – Opens/closes GNOME Applications Grid view.

- 'Hide Visible Windows' – Matches GNOME's “Hide all normal windows” behavior.

- 'Open System Monitor' – Launches gnome-system-monitor if installed.

- 'Launch App' – Launch a user‑chosen application (with Flatpak and AppImage support).

- 'Custom Command' – Run any shell command you define.

## 🎨 Icon Customization

- 'Path' – Point to any image or icon MIME file type.

- 'Position' – Select between left, center and right.

- 'Order' – Define the order within the panel.

- 'Size' – Set the pixel size of your panel icon.

- 'Padding' – Adjust space on either side of the icon.

## 🚀 Usage Examples

Left click: Show Overview, Right click: Hide All Windows.

Left click: Launch Terminal, Right click: Open System Monitor.

Left click: Custom Command, Right click: Show Apps Menu.

## 📋 Requirements

GNOME Shell 45+

For 'Custom Command' or 'Launch App', use valid executable commands.

## 📦 Installation

There are several ways of installation:

- From [GNOME Extensions website](https://extensions.gnome.org/extension/8559/top-panel-logo/):

[![Download from GNOME Extensions website](assets/get_it_on_gnome_extensions.png)](https://extensions.gnome.org/extension/8559/top-panel-logo/)

- From [GitHub](https://github.com/jmpegi/top-panel-logo):
  1. Clone this repo to `~/.local/share/gnome-shell/extensions/top-panel-logo@jmpegi.github.com`.
  2. Restart GNOME Shell (logout or reboot).
  3. Enable the extension.

     NOTE: You can also install the extension system-wide by placing it in `/usr/share/gnome-shell/extensions/top-panel-logo@jmpegi.github.com` instead. This is not recommended.

## 💡 Tips

- Most GNU/Linux distributions store their logo somewhere inside `/usr/share/pixmaps/` or `/usr/share/icons/`

- For ease of use, disable 'Hot Corner' under 'GNOME Settings/Multitasking'.

- To prevent gnome-terminal from automatically closing when running a custom command, use:  
  `gnome-terminal -- bash -c 'yourcommand; wait'` or  
  `gnome-terminal -- bash -c 'yourcommand; exec bash'` or  
  `gnome-terminal -- bash -c 'yourcommand; read -p "Press ENTER to close..."'`

## 📝 License

Copyright (C) 2025-2026 jmpegi <jmpegi@protonmail.com>.  
Released under GPL‑3.0 — feel free to modify or contribute.

Any feedback, ideas and bug reports are welcome!
