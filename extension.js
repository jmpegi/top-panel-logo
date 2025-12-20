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
  // Updates the icon's path, size and padding
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
      // If file exists and is not a directory, create the icon
      if (
        iconFile.query_exists(null) &&
        iconFile.query_file_type(
          Gio.FileQueryInfoFlags.FOLLOW_SYMLINKS,
          null
        ) !== Gio.FileType.DIRECTORY
      ) {
        icon = new St.Icon({
          gicon: new Gio.FileIcon({ file: iconFile }),
          icon_size: iconSize,
          style_class: "system-status-icon",
          style: `padding: 0 ${horizontalPadding}px;`,
        });
      } else {
        console.log("Icon file not found: " + resolvedPath);
        // Else, create a fallback icon
        icon = new St.Icon({
          gicon: new Gio.ThemedIcon({ name: "image-x-generic" }),
          icon_size: iconSize,
          style_class: "system-status-icon",
          style: `padding: 0 ${horizontalPadding}px;`,
        });
      }
    } catch (e) {
      console.log("Error loading icon: " + e.message);
      // Otherwise, create error fallback icon
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

  // Updates the button's position and order
  _updatePosition() {
    const iconPosition = this._settings.get_string("icon-position");
    const iconOrder = this._settings.get_int("icon-order");

    if (!this._button) return;

    // Get the target container
    const targetContainer =
      iconPosition === "center"
        ? Main.panel._centerBox
        : iconPosition === "right"
        ? Main.panel._rightBox
        : Main.panel._leftBox;

    const currentParent = this._button.get_parent();

    // Initial add
    if (!currentParent) {
      Main.panel.addToStatusArea(
        this.uuid,
        this._button,
        iconOrder,
        iconPosition
      );
      return;
    }

    // If already in correct container, check order
    if (currentParent === targetContainer) {
      const currentIndex = targetContainer.get_children().indexOf(this._button);
      if (currentIndex !== iconOrder) {
        targetContainer.set_child_at_index(this._button, iconOrder);
      }
      return;
    }

    // Else, move to correct container
    currentParent.remove_child(this._button);
    targetContainer.insert_child_at_index(this._button, iconOrder);
  }

  // Called when extension is enabled by the user
  enable() {
    this._settings = this.getSettings();

    // Track which windows are hidden for "Minimize visible windows" functionality
    this._desktopHiddenWindows = [];

    // Create button
    this._button = new PanelMenu.Button(0.0, this.metadata.name, false);

    // Create icon and add it to button
    this._updateIcon();

    // Add button to panel
    this._updatePosition();

    // Watch for relevant settings changes and update icon when needed
    this._settingsChangedHandlers = [
      this._settings.connect("changed::icon-path", () => this._updateIcon()),
      this._settings.connect("changed::icon-size", () => this._updateIcon()),
      this._settings.connect("changed::horizontal-padding", () =>
        this._updateIcon()
      ),
      this._settings.connect("changed::icon-position", () =>
        this._updatePosition()
      ),
      this._settings.connect("changed::icon-order", () =>
        this._updatePosition()
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
  }

  // Respond to the mouse click actions as configured in settings
  _handleClickAction(action, clickType) {
    switch (action) {
      case 0: // Show overview
        Main.overview.toggle();
        break;

      case 1: // Show apps grid
        if (Main.overview.visible) {
          Main.overview.hide();
        } else {
          Main.overview.showApps();
        }
        break;

      case 2: // Minimize visible windows
        try {
          let activeWs = global.workspace_manager.get_active_workspace();
          let wsIndex = activeWs.index();

          // Find minimizable regular windows on this WS
          let windows = global
            .get_window_actors()
            .map((actor) => actor.meta_window)
            .filter((mw) => {
              if (!mw) return false;
              // Check if window can be minimized (not all can)
              if (!mw.can_minimize()) return false;
              // Check if window is on the active workspace
              const onActiveWorkspace =
                mw.get_workspace() === activeWs || mw.is_on_all_workspaces();
              if (!onActiveWorkspace) return false;
              // Check window type
              const wtype = mw.get_window_type();
              return (
                wtype === Meta.WindowType.NORMAL ||
                wtype === Meta.WindowType.DIALOG ||
                wtype === Meta.WindowType.MODAL_DIALOG ||
                wtype === Meta.WindowType.UTILITY
              );
            });

          // If there are no windows, do nothing
          if (windows.length === 0) break;

          const hasVisibleWindows = windows.some((mw) => !mw.minimized);
          if (hasVisibleWindows) {
            // If there are visible windows, hide them all
            const windowsToHide = windows.filter((mw) => !mw.minimized);
            windowsToHide.forEach((mw) => mw.minimize());
            // Also track them
            this._desktopHiddenWindows[wsIndex] = windowsToHide;
          } else {
            // Else, restore the windows we previously hid
            (this._desktopHiddenWindows[wsIndex] || []).forEach((mw) => {
              if (mw?.minimized) mw.unminimize();
            });
            this._desktopHiddenWindows[wsIndex] = [];
          }
        } catch (e) {
          console.error("Failed to minimize windows:", e);
        }
        break;

      case 3: // Launch system monitor
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
