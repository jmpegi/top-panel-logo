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

import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export default class TopPanelLogoPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    // Unpack settings
    const iconPath =
      settings.get_string("icon-path") ||
      settings.settings_schema
        .get_key("icon-path")
        .get_default_value()
        .unpack() ||
      "/";

    const iconSize =
      settings.get_int("icon-size") ||
      settings.settings_schema
        .get_key("icon-size")
        .get_default_value()
        .unpack() ||
      32;

    const iconPadding =
      settings.get_int("horizontal-padding") ||
      settings.settings_schema
        .get_key("horizontal-padding")
        .get_default_value()
        .unpack() ||
      4;

    const leftClickAction =
      settings.get_int("left-click-action") ||
      settings.settings_schema
        .get_key("left-click-action")
        .get_default_value()
        .unpack() ||
      0;

    const rightClickAction =
      settings.get_int("right-click-action") ||
      settings.settings_schema
        .get_key("right-click-action")
        .get_default_value()
        .unpack() ||
      2;

    // Create preferences page and main group container
    const page = new Adw.PreferencesPage();
    window.add(page);
    const mainGroup = new Adw.PreferencesGroup();
    page.add(mainGroup);

    // Vertical box to hold preference categories
    const prefsBox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 12,
      margin_top: 6,
      margin_bottom: 6,
      margin_start: 6,
      margin_end: 6,
    });
    mainGroup.add(prefsBox);

    // === ICON SETTINGS ===
    const iconGroup = new Adw.PreferencesGroup({ title: "Icon Settings" });
    prefsBox.append(iconGroup);

    const iconPathRow = new Adw.ActionRow({ title: "Icon Path" });
    const iconPathEntry = new Gtk.Entry({
      text: iconPath,
      hexpand: true,
      placeholder_text: "/path/to/icon",
    });

    // Debounce timeout for iconPathEntry
    let iconPathTimeout = null;
    iconPathEntry.connect("changed", () => {
      if (iconPathTimeout) {
        GLib.source_remove(iconPathTimeout);
        iconPathTimeout = null;
      }
      iconPathTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
        const path = iconPathEntry.get_text();
        settings.set_string("icon-path", path);
        iconPathTimeout = null;
        return GLib.SOURCE_REMOVE;
      });
    });
    iconPathEntry.connect("activate", () => {
      if (iconPathTimeout) {
        GLib.source_remove(iconPathTimeout);
        iconPathTimeout = null;
      }
      const path = iconPathEntry.get_text();
      settings.set_string("icon-path", path);
    });

    // FileChooser for iconPathEntry
    let lastUsedFolder = null;
    const fileChooserButton = new Gtk.Button({ label: "Browse" });
    fileChooserButton.connect("clicked", () => {
      const fileChooser = new Gtk.FileChooserDialog({
        title: "Select Icon File",
        action: Gtk.FileChooserAction.OPEN,
        transient_for: window,
        modal: true,
      });
      fileChooser.add_button("Cancel", Gtk.ResponseType.CANCEL);
      fileChooser.add_button("Select", Gtk.ResponseType.OK);

      // Set current folder to last used folder if available and valid
      if (lastUsedFolder) {
        try {
          if (GLib.file_test(lastUsedFolder, GLib.FileTest.IS_DIR)) {
            const folderFile = Gio.File.new_for_path(lastUsedFolder);
            fileChooser.set_current_folder(folderFile);
          } else {
            // If folder no longer exists, reset the variable
            lastUsedFolder = null;
          }
        } catch (error) {
          console.error(`Error accessing last used folder: ${error}`);
          lastUsedFolder = null; // Reset if there's any error
        }
      }

      // Restrict filetypes
      const imgFilter = new Gtk.FileFilter();
      imgFilter.set_name("Image Files");
      IMAGE_MIME_TYPES.forEach((m) => imgFilter.add_mime_type(m));
      fileChooser.add_filter(imgFilter);

      fileChooser.connect("response", (dlg, resp) => {
        if (resp === Gtk.ResponseType.OK) {
          const file = dlg.get_file();
          if (file) {
            const absolutePath = file.get_path();
            try {
              // Try to remember parent directory
              const parentDir = file.get_parent();
              if (parentDir) {
                const parentPath = parentDir.get_path();
                if (GLib.file_test(parentPath, GLib.FileTest.IS_DIR)) {
                  lastUsedFolder = parentPath;
                }
              }
            } catch (error) {
              console.error(`Error remembering folder: ${error}`);
            }
            if (!GLib.file_test(absolutePath, GLib.FileTest.EXISTS)) {
              window.add_toast(
                new Adw.Toast({
                  title: "Icon file does not exist or cannot be accessed",
                  timeout: 3,
                })
              );
            } else {
              // Convert to ~ notation for display
              const homeDir = GLib.get_home_dir();
              let displayPath = absolutePath;
              if (absolutePath.startsWith(homeDir + "/")) {
                displayPath = "~" + absolutePath.substring(homeDir.length);
              }
              iconPathEntry.set_text(displayPath);
              settings.set_string("icon-path", absolutePath);
            }
          }
        }
        dlg.close();
      });
      fileChooser.show();
    });

    iconPathRow.add_suffix(iconPathEntry);
    iconPathRow.add_suffix(fileChooserButton);
    iconGroup.add(iconPathRow);

    // Icon Size
    const iconSizeRow = new Adw.ActionRow({ title: "Icon Size" });
    const iconSizeSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 16,
        upper: 128,
        step_increment: 1,
      }),
      numeric: true,
    });
    iconSizeSpin.set_value(iconSize);
    iconSizeSpin.connect("value-changed", () =>
      settings.set_int("icon-size", iconSizeSpin.get_value())
    );
    iconSizeRow.add_suffix(iconSizeSpin);
    iconGroup.add(iconSizeRow);

    // Icon Padding
    const paddingRow = new Adw.ActionRow({ title: "Horizontal Padding" });
    const paddingSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 48,
        step_increment: 1,
      }),
      numeric: true,
    });
    paddingSpin.set_value(iconPadding);
    paddingSpin.connect("value-changed", () =>
      settings.set_int("horizontal-padding", paddingSpin.get_value())
    );
    paddingRow.add_suffix(paddingSpin);
    iconGroup.add(paddingRow);

    // === ACTIONS ===
    const actions = [
      "Show Overview",
      "Show Apps Grid",
      "Hide All Windows",
      "Open System Monitor",
      "Launch App",
      "Custom Command",
      "Do Nothing",
    ];

    // Display/Absolute path helper functions
    const toDisplayPath = (absolutePath) => {
      const homeDir = GLib.get_home_dir();
      if (absolutePath.startsWith(homeDir + "/")) {
        return "~" + absolutePath.substring(homeDir.length);
      }
      return absolutePath;
    };

    const toAbsolutePath = (displayPath) => {
      if (displayPath.startsWith("~/") || displayPath === "~") {
        const homeDir = GLib.get_home_dir();
        return displayPath.replace("~", homeDir);
      }
      return displayPath;
    };

    // Helper for Flatpak detection
    const extractFlatpakId = (execLine, fallbackId) => {
      let clean = execLine.replace(/%[fFuUdDnNickvm]/g, "").trim();
      let parts = clean.split(/\s+/);
      let idx = parts.findIndex(
        (p) => p.endsWith("flatpak") || p === "flatpak"
      );
      if (idx === -1 || parts[idx + 1] !== "run") return null;
      for (let i = idx + 2; i < parts.length; i++) {
        if (!parts[i].startsWith("-")) return parts[i];
      }
      return fallbackId;
    };

    // Debounce helper for entries to reduce excessive settings writes
    function setupDebouncedEntry(
      entry,
      settings,
      key,
      toDisplayPath,
      toAbsolutePath,
      delay = 500
    ) {
      let AppEntryTimeout = null;
      const applyChange = () => {
        const currentText = entry.get_text();
        const absolutePath = toAbsolutePath(currentText);
        settings.set_string(key, absolutePath);
        const displayText = toDisplayPath(absolutePath);
        if (displayText !== currentText) {
          entry.set_text(displayText);
        }
      };
      entry.connect("changed", () => {
        if (AppEntryTimeout) GLib.source_remove(AppEntryTimeout);
        AppEntryTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
          applyChange();
          AppEntryTimeout = null;
          return GLib.SOURCE_REMOVE;
        });
      });
      entry.connect("activate", () => {
        if (AppEntryTimeout) {
          GLib.source_remove(AppEntryTimeout);
          AppEntryTimeout = null;
        }
        applyChange();
      });
    }

    // App Chooser logic with Flatpak handling
    const makeAppChooserHandler = (entry, key) => () => {
      const appChooser = new Gtk.AppChooserDialog({
        content_type: "application/x-desktop",
        transient_for: window,
      });
      appChooser.set_resizable(true);
      appChooser.set_default_size(600, 400);
      appChooser.connect("response", (dlg, resp) => {
        if (resp === Gtk.ResponseType.OK) {
          const appInfo = dlg.get_app_info();
          if (appInfo) {
            let cmd = appInfo.get_executable();
            try {
              const deskInfo = Gio.DesktopAppInfo.new(appInfo.get_id());
              if (deskInfo) {
                const execLine = deskInfo.get_commandline();
                if (execLine && execLine.includes("flatpak run")) {
                  const appId = extractFlatpakId(execLine, appInfo.get_id());
                  cmd = `flatpak run ${appId}`;
                }
              }
            } catch (e) {
              console.log(
                "Could not get app id from Gio.DesktopAppInfo, using executable: ",
                e
              );
            }
            settings.set_string(key, cmd);
            entry.set_text(toDisplayPath(cmd));
          }
        }
        dlg.close();
      });
      appChooser.present();
    };

    // === LEFT CLICK ACTIONS ===
    const leftClickGroup = new Adw.PreferencesGroup({
      title: "Left Click",
    });
    prefsBox.append(leftClickGroup);
    const leftCombo = new Adw.ComboRow({ title: "Left Click Action" });
    const leftModel = new Gtk.StringList();
    actions.forEach((a) => leftModel.append(a));
    leftCombo.model = leftModel;
    leftCombo.selected = leftClickAction;
    leftCombo.connect("notify::selected", () =>
      settings.set_int("left-click-action", leftCombo.get_selected())
    );
    leftClickGroup.add(leftCombo);

    const leftAppRow = new Adw.ActionRow({ title: "App to Launch" });
    const leftAppEntry = new Gtk.Entry({
      text: toDisplayPath(settings.get_string("left-click-app") || ""),
      hexpand: true,
      placeholder_text: "App or executable",
    });
    leftAppEntry.connect("changed", () => {
      setupDebouncedEntry(
        leftAppEntry,
        settings,
        "left-click-app",
        toDisplayPath,
        toAbsolutePath,
        500
      );
    });
    const leftChooserBtn = new Gtk.Button({ label: "Choose" });
    leftChooserBtn.connect(
      "clicked",
      makeAppChooserHandler(leftAppEntry, "left-click-app")
    );
    leftAppRow.add_suffix(leftAppEntry);
    leftAppRow.add_suffix(leftChooserBtn);
    leftClickGroup.add(leftAppRow);

    const leftCmdRow = new Adw.ActionRow({ title: "Custom Command" });
    const leftCmdEntry = new Gtk.Entry({
      text: settings.get_string("left-custom-command"),
      hexpand: true,
      placeholder_text: "Command or script",
    });
    leftCmdEntry.connect("changed", () =>
      settings.set_string("left-custom-command", leftCmdEntry.get_text())
    );
    leftCmdRow.add_suffix(leftCmdEntry);
    leftClickGroup.add(leftCmdRow);

    // === RIGHT CLICK ACTIONS ===
    const rightClickGroup = new Adw.PreferencesGroup({
      title: "Right Click",
    });
    prefsBox.append(rightClickGroup);
    const rightCombo = new Adw.ComboRow({ title: "Right Click Action" });
    const rightModel = new Gtk.StringList();
    actions.forEach((a) => rightModel.append(a));
    rightCombo.model = rightModel;
    rightCombo.selected = rightClickAction;
    rightCombo.connect("notify::selected", () =>
      settings.set_int("right-click-action", rightCombo.get_selected())
    );
    rightClickGroup.add(rightCombo);

    const rightAppRow = new Adw.ActionRow({ title: "App to Launch" });
    const rightAppEntry = new Gtk.Entry({
      text: toDisplayPath(settings.get_string("right-click-app") || ""),
      hexpand: true,
      placeholder_text: "App or executable",
    });
    rightAppEntry.connect("changed", () => {
      setupDebouncedEntry(
        rightAppEntry,
        settings,
        "right-click-app",
        toDisplayPath,
        toAbsolutePath,
        500
      );
    });
    const rightChooserBtn = new Gtk.Button({ label: "Choose" });
    rightChooserBtn.connect(
      "clicked",
      makeAppChooserHandler(rightAppEntry, "right-click-app")
    );
    rightAppRow.add_suffix(rightAppEntry);
    rightAppRow.add_suffix(rightChooserBtn);
    rightClickGroup.add(rightAppRow);

    const rightCmdRow = new Adw.ActionRow({ title: "Custom Command" });
    const rightCmdEntry = new Gtk.Entry({
      text: settings.get_string("right-custom-command"),
      hexpand: true,
      placeholder_text: "Command or script",
    });
    rightCmdEntry.connect("changed", () =>
      settings.set_string("right-custom-command", rightCmdEntry.get_text())
    );
    rightCmdRow.add_suffix(rightCmdEntry);
    rightClickGroup.add(rightCmdRow);

    // Visibility toggle for 'Launch App' and 'Custom Command' rows
    const toggleVis = (combo, rowApp, rowCmd) => {
      const sel = combo.get_selected();
      rowApp.set_visible(sel === 4);
      rowCmd.set_visible(sel === 5);
    };
    leftCombo.connect("notify::selected", () =>
      toggleVis(leftCombo, leftAppRow, leftCmdRow)
    );
    rightCombo.connect("notify::selected", () =>
      toggleVis(rightCombo, rightAppRow, rightCmdRow)
    );
    toggleVis(leftCombo, leftAppRow, leftCmdRow);
    toggleVis(rightCombo, rightAppRow, rightCmdRow);

    // === RESTORE DEFAULTS ===
    const restoreDefaultsGroup = new Adw.PreferencesGroup();
    page.add(restoreDefaultsGroup);
    const restoreButton = new Gtk.Button({ label: "Restore Defaults" });
    restoreButton.connect("clicked", () => {
      let defIconPath = settings.settings_schema
        .get_key("icon-path")
        .get_default_value();
      settings.set_value("icon-path", defIconPath);
      iconPathEntry.set_text(defIconPath.unpack());
      let defIconSize = settings.settings_schema
        .get_key("icon-size")
        .get_default_value();
      settings.set_value("icon-size", defIconSize);
      iconSizeSpin.set_value(defIconSize.unpack());
      let defPadding = settings.settings_schema
        .get_key("horizontal-padding")
        .get_default_value();
      settings.set_value("horizontal-padding", defPadding);
      paddingSpin.set_value(defPadding.unpack());
      let defLeftClick = settings.settings_schema
        .get_key("left-click-action")
        .get_default_value();
      settings.set_value("left-click-action", defLeftClick);
      leftCombo.set_selected(defLeftClick.unpack());
      let defLeftApp = settings.settings_schema
        .get_key("left-click-app")
        .get_default_value();
      const defLeftAppValue = defLeftApp.unpack();
      settings.set_value("left-click-app", defLeftApp);
      leftAppEntry.set_text(toDisplayPath(defLeftAppValue));
      let defLeftCmd = settings.settings_schema
        .get_key("left-custom-command")
        .get_default_value();
      settings.set_value("left-custom-command", defLeftCmd);
      leftCmdEntry.set_text(defLeftCmd.unpack());
      let defRightClick = settings.settings_schema
        .get_key("right-click-action")
        .get_default_value();
      settings.set_value("right-click-action", defRightClick);
      rightCombo.set_selected(defRightClick.unpack());
      let defRightApp = settings.settings_schema
        .get_key("right-click-app")
        .get_default_value();
      const defRightAppValue = defRightApp.unpack();
      settings.set_value("right-click-app", defRightApp);
      rightAppEntry.set_text(toDisplayPath(defRightAppValue));
      let defRightCmd = settings.settings_schema
        .get_key("right-custom-command")
        .get_default_value();
      settings.set_value("right-custom-command", defRightCmd);
      rightCmdEntry.set_text(defRightCmd.unpack());
    });
    restoreDefaultsGroup.add(restoreButton);
  }
}
