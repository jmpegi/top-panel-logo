/*
 * Copyright (C) 2025 jmpegi <jmpegi@protonmail.com>
 *
 * This file is part of Top Panel Logo GNOME Shell Extension.
 *
 * Top Panel Logo GNOME Shell Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Top Panel Logo GNOME Shell Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Top Panel Logo GNOME Shell Extension.  If not, see <https://www.gnu.org/licenses/>.
 */

import St from "gi://St";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Meta from "gi://Meta";

// Main extension class
export default class TopPanelLogoExtension extends Extension {
  // Updates the status area icon according to settings
  _updateIcon() {
    const iconPath = this._settings.get_string("icon-path");
    const iconSize = this._settings.get_int("icon-size");
    const horizontalPadding = this._settings.get_int("horizontal-padding");

    this._button.remove_all_children();

    function resolveIconPath(pathSetting) {
      if (pathSetting.startsWith("~/")) {
        return GLib.get_home_dir() + pathSetting.substring(1);
      }
      return pathSetting;
    }

    const resolvedPath = resolveIconPath(iconPath);
    let icon = null;

    try {
      const iconFile = Gio.File.new_for_path(resolvedPath);
      if (iconFile.query_exists(null)) {
        icon = new St.Icon({
          gicon: new Gio.FileIcon({ file: iconFile }),
          icon_size: iconSize,
          style_class: "system-status-icon",
          style: `padding: 0 ${horizontalPadding}px;`,
        });
      } else {
        console.log("Icon file not found: " + resolvedPath);
        // Create a fallback St.Icon with themed icon
        icon = new St.Icon({
          gicon: new Gio.ThemedIcon({ name: "image-missing" }),
          icon_size: iconSize,
          style_class: "system-status-icon",
          style: `padding: 0 ${horizontalPadding}px;`,
        });
      }
    } catch (e) {
      console.log("Error loading icon: " + e.message);
      // Create error fallback icon
      icon = new St.Icon({
        gicon: new Gio.ThemedIcon({ name: "image-missing" }),
        icon_size: iconSize,
        style_class: "system-status-icon",
        style: `padding: 0 ${horizontalPadding}px;`,
      });
    }

    if (icon) {
      this._button.add_child(icon);
    }
  }

  // Called when extension is enabled by the user
  enable() {
    this._settings = this.getSettings();

    // Track which windows are hidden for "show desktop" functionality
    this._desktopHiddenWindows = [];
    this._workspaceChangedId = global.workspace_manager.connect(
      "active-workspace-changed",
      () => {
        this._desktopHiddenWindows = [];
      }
    );

    // Set default action for right-click, if not set
    if (this._settings.get_int("right-click-action") === 0) {
      this._settings.set_int("right-click-action", 3);
    }

    // Create a panel button
    this._button = new PanelMenu.Button(0.0, this.metadata.name, false);

    // Draw the current icon
    this._updateIcon();

    // Watch for relevant settings changes and update icon when needed
    this._settingsChangedHandlers = [
      this._settings.connect("changed::icon-path", () => this._updateIcon()),
      this._settings.connect("changed::icon-size", () => this._updateIcon()),
      this._settings.connect("changed::horizontal-padding", () =>
        this._updateIcon()
      ),
    ];

    // Handle mouse click events (left/right click)
    this._button.connect("button-press-event", (actor, event) => {
      const button = event.get_button();

      if (button === 1) {
        // Left click action
        const leftClickAction = this._settings.get_int("left-click-action");
        this._handleClickAction(leftClickAction, "left");
      } else if (button === 3) {
        // Right click action
        const rightClickAction = this._settings.get_int("right-click-action");
        this._handleClickAction(rightClickAction, "right");
      }

      return true; // Prevent further handling
    });

    // Add button to GNOME Shell's top panel (left side)
    Main.panel.addToStatusArea(this.uuid, this._button, 0, "left");
  }

  // Respond to the mouse click actions as configured in settings
  _handleClickAction(action, clickType) {
    switch (action) {
      case 0: // Show GNOME overview
        Main.overview.toggle();
        break;

      case 1: // Show apps grid within overview
        Main.overview.showApps();
        break;

      case 2: // Hide all windows
        let activeWs = global.workspace_manager.get_active_workspace();

        // Find normal-type windows (on this WS or sticky windows)
        let windows = global
          .get_window_actors()
          .map((actor) => actor.meta_window)
          .filter(
            (mw) =>
              mw &&
              mw.get_window_type() === Meta.WindowType.NORMAL &&
              (mw.get_workspace() === activeWs || mw.is_on_all_workspaces())
          );

        if (windows.length === 0) break;

        if (this._desktopHiddenWindows.length > 0) {
          // Restore previously hidden windows
          this._desktopHiddenWindows.forEach((mw) => {
            if (mw && mw.minimized) mw.unminimize(global.get_current_time());
          });
          this._desktopHiddenWindows = [];
        } else {
          // Hide all currently visible windows
          this._desktopHiddenWindows = windows.filter((mw) => !mw.minimized);
          this._desktopHiddenWindows.forEach((mw) => mw.minimize());
        }
        break;

      case 3: // Launch System Monitor
        try {
          GLib.spawn_command_line_async("gnome-system-monitor");
        } catch (e) {
          console.error("Failed to launch system monitor:", e);
        }
        break;

      case 4: // Launch app
        try {
          const appCommand = this._settings.get_string(
            clickType === "left" ? "left-click-app" : "right-click-app"
          );
          if (appCommand) {
            GLib.spawn_command_line_async(appCommand);
          }
        } catch (e) {
          console.error(`Failed to launch app on ${clickType} click:`, e);
        }
        break;

      case 5: // Run custom shell command
        try {
          const customCommand = this._settings.get_string(
            clickType === "left"
              ? "left-custom-command"
              : "right-custom-command"
          );
          if (customCommand) {
            GLib.spawn_command_line_async(customCommand);
          }
        } catch (e) {
          console.error(
            `Failed to run custom command on ${clickType} click:`,
            e
          );
        }
        break;

      case 6: //Do nothing
        break;
    }
  }

  // Called when extension is disabled by the user
  disable() {
    if (this._settingsChangedHandlers) {
      this._settingsChangedHandlers.forEach((handler) =>
        this._settings.disconnect(handler)
      );
      this._settingsChangedHandlers = null;
    }

    if (this._workspaceChangedId) {
      global.workspace_manager.disconnect(this._workspaceChangedId);
      this._workspaceChangedId = null;
    }
    this._desktopHiddenWindows = [];

    // Remove the button from the panel
    this._button?.destroy();
    this._button = null;

    this._settings = null;
  }
}
