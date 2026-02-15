/*
 * Copyright (C) 2025-2026 jmpegi <jmpegi@protonmail.com>
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

// Supported MIME file types for the 'Icon Path' file chooser
const IMAGE_MIME_TYPES = ["image/*", "application/x-ico", "application/ico"];

export default class TopPanelLogoPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    window.default_height = 710;

    const settings = this.getSettings();

    // Unpack settings
    const iconPath =
      settings.get_string("icon-path") ||
      settings.settings_schema
        .get_key("icon-path")
        .get_default_value()
        .unpack() ||
      "/";

    const iconPosition =
      settings.get_string("icon-position") ||
      settings.settings_schema
        .get_key("icon-position")
        .get_default_value()
        .unpack() ||
      "left";

    const iconOrder =
      settings.get_int("icon-order") ||
      settings.settings_schema
        .get_key("icon-order")
        .get_default_value()
        .unpack() ||
      0;

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

    const cooldownDelay =
      settings.get_int("click-cooldown") ||
      settings.settings_schema
        .get_key("click-cooldown")
        .get_default_value()
        .unpack() ||
      300;

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
    const iconPathRow = new Adw.ActionRow({
      title: "Path",
    });
    const iconPathInfoButton = new Gtk.Button({
      icon_name: "help-about-symbolic",
      tooltip_text: "Supports icon and image MIME file types",
      has_tooltip: true,
      css_classes: ["flat"],
      valign: Gtk.Align.CENTER,
    });
    // Keep tooltip visible when button is clicked
    iconPathInfoButton.connect("clicked", (button) => {
      button.set_tooltip_text(button.get_tooltip_text());
      return true; // Stop event propagation
    });
    const iconPathEntry = new Gtk.Entry({
      text: iconPath,
      hexpand: true,
      placeholder_text: "/path/to/icon",
      valign: Gtk.Align.CENTER,
    });

    // Debounce timeout for iconPathEntry
    let iconPathTimeout = null;
    function flushIconPath() {
      if (iconPathTimeout) {
        GLib.source_remove(iconPathTimeout);
        iconPathTimeout = null;
      }
      const path = iconPathEntry.get_text();
      const homeDir = GLib.get_home_dir();
      const absolutePath = path.startsWith("~")
        ? path.replace("~", homeDir)
        : path;
      settings.set_string("icon-path", absolutePath);
      if (toDisplayPath(absolutePath) !== path) {
        iconPathEntry.set_text(toDisplayPath(absolutePath));
      }
    }
    // Flush on iconPathEntry changes
    iconPathEntry.connect("changed", () => {
      if (iconPathTimeout) GLib.source_remove(iconPathTimeout);
      iconPathTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
        flushIconPath();
        return GLib.SOURCE_REMOVE;
      });
    });
    // Also flush on 'Enter' keypress
    iconPathEntry.connect("activate", flushIconPath);
    // Also flush on focus-out
    iconPathEntry.connect("notify::has-focus", (entry) => {
      if (!entry.has_focus) {
        flushIconPath();
      }
    });
    // Also flush when the window appears
    iconPathEntry.connect("map", flushIconPath);
    // Also flush when closing the window
    window.connect("close-request", () => {
      flushIconPath();
      return false;
    });

    // FileChooser for iconPathEntry
    let lastUsedFolder = null;
    const fileChooserButton = new Gtk.Button({
      icon_name: "folder-open-symbolic",
      tooltip_text: "Browse for icon file",
      has_tooltip: true,
      css_classes: ["raised"],
      valign: Gtk.Align.CENTER,
    });
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
                }),
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

    iconPathRow.add_suffix(iconPathInfoButton);
    iconPathRow.add_suffix(iconPathEntry);
    iconPathRow.add_suffix(fileChooserButton);
    iconGroup.add(iconPathRow);

    // Icon Position
    const positionRow = new Adw.ActionRow({
      title: "Position",
    });
    const segmentedBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      css_classes: ["linked"],
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    const leftButton = new Gtk.ToggleButton({
      label: "Left",
      active: iconPosition === "left",
    });
    const centerButton = new Gtk.ToggleButton({
      label: "Center",
      active: iconPosition === "center",
    });
    const rightButton = new Gtk.ToggleButton({
      label: "Right",
      active: iconPosition === "right",
    });
    centerButton.set_group(leftButton);
    rightButton.set_group(leftButton);
    leftButton.connect("toggled", () => {
      if (leftButton.active) settings.set_string("icon-position", "left");
    });
    centerButton.connect("toggled", () => {
      if (centerButton.active) settings.set_string("icon-position", "center");
    });
    rightButton.connect("toggled", () => {
      if (rightButton.active) settings.set_string("icon-position", "right");
    });
    segmentedBox.append(leftButton);
    segmentedBox.append(centerButton);
    segmentedBox.append(rightButton);
    positionRow.add_suffix(segmentedBox);
    iconGroup.add(positionRow);

    // Icon Order
    const iconOrderRow = new Adw.ActionRow({
      title: "Order",
    });
    const iconOrderInfoButton = new Gtk.Button({
      icon_name: "help-about-symbolic",
      tooltip_text: "Order of the icon within the panel (0 = leftmost)",
      has_tooltip: true,
      css_classes: ["flat"],
      valign: Gtk.Align.CENTER,
    });
    // Keep tooltip visible when button is clicked
    iconOrderInfoButton.connect("clicked", (button) => {
      button.set_tooltip_text(button.get_tooltip_text());
      return true; // Stop event propagation
    });
    const iconOrderSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: -1,
        upper: 9,
        step_increment: 1,
      }),
      numeric: true,
      width_chars: 1,
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    iconOrderSpin.set_value(iconOrder);
    iconOrderSpin.connect("value-changed", () =>
      settings.set_int("icon-order", iconOrderSpin.get_value()),
    );
    iconOrderRow.add_suffix(iconOrderInfoButton);
    iconOrderRow.add_suffix(iconOrderSpin);
    iconGroup.add(iconOrderRow);

    // Icon Size
    const iconSizeRow = new Adw.ActionRow({ title: "Size (px)" });
    const iconSizeSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 16,
        upper: 128,
        step_increment: 1,
      }),
      numeric: true,
      digits: 0,
      width_chars: 2,
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    iconSizeSpin.set_value(iconSize);
    iconSizeSpin.connect("value-changed", () =>
      settings.set_int("icon-size", iconSizeSpin.get_value()),
    );
    iconSizeRow.add_suffix(iconSizeSpin);
    iconGroup.add(iconSizeRow);

    // Icon Padding
    const paddingRow = new Adw.ActionRow({ title: "Padding (px)" });
    const paddingSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 48,
        step_increment: 1,
      }),
      numeric: true,
      digits: 0,
      width_chars: 2,
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    paddingSpin.set_value(iconPadding);
    paddingSpin.connect("value-changed", () =>
      settings.set_int("horizontal-padding", paddingSpin.get_value()),
    );
    paddingRow.add_suffix(paddingSpin);
    iconGroup.add(paddingRow);

    // === ACTIONS ===
    const actions = [
      "Show Overview",
      "Show Apps Grid",
      "Hide Visible Windows",
      "Open System Monitor",
      "Launch App",
      "Custom Command",
      "Do Nothing",
      "Open Website",
      "Open Folder",
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
        (p) => p.endsWith("flatpak") || p === "flatpak",
      );
      if (idx === -1 || parts[idx + 1] !== "run") return null;
      for (let i = idx + 2; i < parts.length; i++) {
        if (!parts[i].startsWith("-")) return parts[i];
      }
      return fallbackId;
    };

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
                e,
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
    // === CLICK ACTIONS GROUP ===
    const clickActionsGroup = new Adw.PreferencesGroup({
      title: "Click Actions",
    });
    prefsBox.append(clickActionsGroup);

    // === LEFT CLICK ===
    const leftCombo = new Adw.ComboRow({ title: "Left Click" });
    const leftModel = new Gtk.StringList();
    actions.forEach((a) => leftModel.append(a));
    leftCombo.model = leftModel;
    leftCombo.selected = leftClickAction;
    leftCombo.connect("notify::selected", () =>
      settings.set_int("left-click-action", leftCombo.get_selected()),
    );
    clickActionsGroup.add(leftCombo);

    // Left app
    const leftAppRow = new Adw.ActionRow({ title: "App to Launch" });
    const leftAppRowInfoButton = new Gtk.Button({
      icon_name: "help-about-symbolic",
      tooltip_text:
        "Supports regular apps, Flatpaks, AppImages and .desktop files",
      has_tooltip: true,
      css_classes: ["flat"],
      valign: Gtk.Align.CENTER,
    });
    // Keep tooltip visible when button is clicked
    leftAppRowInfoButton.connect("clicked", (button) => {
      button.set_tooltip_text(button.get_tooltip_text());
      return true; // Stop event propagation
    });
    const leftAppEntry = new Gtk.Entry({
      text: toDisplayPath(settings.get_string("left-click-app") || ""),
      hexpand: true,
      placeholder_text: "App or executable",
    });
    leftAppEntry.connect("changed", () => {
      const displayText = leftAppEntry.get_text();
      const absolutePath = toAbsolutePath(displayText);
      settings.set_string("left-click-app", absolutePath);
      if (toDisplayPath(absolutePath) !== displayText) {
        leftAppEntry.set_text(toDisplayPath(absolutePath));
      }
    });
    const leftChooserBtn = new Gtk.Button({ label: "Choose" });
    leftChooserBtn.connect(
      "clicked",
      makeAppChooserHandler(leftAppEntry, "left-click-app"),
    );
    leftAppRow.add_suffix(leftAppRowInfoButton);
    leftAppRow.add_suffix(leftAppEntry);
    leftAppRow.add_suffix(leftChooserBtn);
    clickActionsGroup.add(leftAppRow);

    // Left custom command
    const leftCmdRow = new Adw.ActionRow({ title: "Custom Command" });
    const leftCmdRowInfoButton = new Gtk.Button({
      icon_name: "help-about-symbolic",
      tooltip_text: "Only use this if you know what you are doing! See README",
      has_tooltip: true,
      css_classes: ["flat"],
      valign: Gtk.Align.CENTER,
    });
    // Keep tooltip visible when button is clicked
    leftCmdRowInfoButton.connect("clicked", (button) => {
      button.set_tooltip_text(button.get_tooltip_text());
      return true; // Stop event propagation
    });
    const leftCmdEntry = new Gtk.Entry({
      text: settings.get_string("left-custom-command"),
      hexpand: true,
      placeholder_text: "Command or script",
    });
    leftCmdEntry.connect("changed", () =>
      settings.set_string("left-custom-command", leftCmdEntry.get_text()),
    );
    leftCmdRow.add_suffix(leftCmdRowInfoButton);
    leftCmdRow.add_suffix(leftCmdEntry);
    clickActionsGroup.add(leftCmdRow);

    // Left website
    const leftWebsiteRow = new Adw.ActionRow({ title: "Website URL" });
    const leftWebsiteEntry = new Gtk.Entry({
      text: settings.get_string("left-custom-website") || "",
      hexpand: true,
      placeholder_text: "www.example.com",
    });
    leftWebsiteEntry.connect("changed", () =>
      settings.set_string("left-custom-website", leftWebsiteEntry.get_text()),
    );
    leftWebsiteRow.add_suffix(leftWebsiteEntry);
    clickActionsGroup.add(leftWebsiteRow);

    // Left folder
    // === LEFT FOLDER (matching icon-path behavior) ===
    const leftFolderRow = new Adw.ActionRow({ title: "Folder Path" });
    const leftFolderEntry = new Gtk.Entry({
      text: toDisplayPath(settings.get_string("left-custom-folder") || ""),
      hexpand: true,
      placeholder_text: "~/",
    });
    leftFolderEntry.connect("changed", () => {
      const text = leftFolderEntry.get_text();
      const homeDir = GLib.get_home_dir();
      const absolutePath =
        text.startsWith("~/") || text === "~"
          ? text.replace("~", homeDir)
          : text;
      settings.set_string("left-custom-folder", absolutePath);
    });
    leftFolderRow.add_suffix(leftFolderEntry);
    clickActionsGroup.add(leftFolderRow);

    // === RIGHT CLICK ===
    const rightCombo = new Adw.ComboRow({ title: "Right Click" });
    const rightModel = new Gtk.StringList();
    actions.forEach((a) => rightModel.append(a));
    rightCombo.model = rightModel;
    rightCombo.selected = rightClickAction;
    rightCombo.connect("notify::selected", () =>
      settings.set_int("right-click-action", rightCombo.get_selected()),
    );
    clickActionsGroup.add(rightCombo);

    // Right app
    const rightAppRow = new Adw.ActionRow({ title: "App to Launch" });
    const rightAppRowInfoButton = new Gtk.Button({
      icon_name: "help-about-symbolic",
      tooltip_text:
        "Supports regular apps, Flatpaks, AppImages and .desktop files",
      has_tooltip: true,
      css_classes: ["flat"],
      valign: Gtk.Align.CENTER,
    });
    // Keep tooltip visible when button is clicked
    rightAppRowInfoButton.connect("clicked", (button) => {
      button.set_tooltip_text(button.get_tooltip_text());
      return true; // Stop event propagation
    });
    const rightAppEntry = new Gtk.Entry({
      text: toDisplayPath(settings.get_string("right-click-app") || ""),
      hexpand: true,
      placeholder_text: "App or executable",
    });
    rightAppEntry.connect("changed", () => {
      const displayText = rightAppEntry.get_text();
      const absolutePath = toAbsolutePath(displayText);
      settings.set_string("right-click-app", absolutePath);
      if (toDisplayPath(absolutePath) !== displayText) {
        rightAppEntry.set_text(toDisplayPath(absolutePath));
      }
    });
    const rightChooserBtn = new Gtk.Button({ label: "Choose" });
    rightChooserBtn.connect(
      "clicked",
      makeAppChooserHandler(rightAppEntry, "right-click-app"),
    );
    rightAppRow.add_suffix(rightAppRowInfoButton);
    rightAppRow.add_suffix(rightAppEntry);
    rightAppRow.add_suffix(rightChooserBtn);
    clickActionsGroup.add(rightAppRow);

    // Right custom command
    const rightCmdRow = new Adw.ActionRow({ title: "Custom Command" });
    const rightCmdRowInfoButton = new Gtk.Button({
      icon_name: "help-about-symbolic",
      tooltip_text: "Only use this if you know what you are doing! See README",
      has_tooltip: true,
      css_classes: ["flat"],
      valign: Gtk.Align.CENTER,
    });
    // Keep tooltip visible when button is clicked
    rightCmdRowInfoButton.connect("clicked", (button) => {
      button.set_tooltip_text(button.get_tooltip_text());
      return true; // Stop event propagation
    });
    const rightCmdEntry = new Gtk.Entry({
      text: settings.get_string("right-custom-command"),
      hexpand: true,
      placeholder_text: "Command or script",
    });
    rightCmdEntry.connect("changed", () =>
      settings.set_string("right-custom-command", rightCmdEntry.get_text()),
    );
    rightCmdRow.add_suffix(rightCmdRowInfoButton);
    rightCmdRow.add_suffix(rightCmdEntry);
    clickActionsGroup.add(rightCmdRow);

    // Right website
    const rightWebsiteRow = new Adw.ActionRow({ title: "Website URL" });
    const rightWebsiteEntry = new Gtk.Entry({
      text: settings.get_string("right-custom-website") || "",
      hexpand: true,
      placeholder_text: "www.example.com",
    });
    rightWebsiteEntry.connect("changed", () =>
      settings.set_string("right-custom-website", rightWebsiteEntry.get_text()),
    );
    rightWebsiteRow.add_suffix(rightWebsiteEntry);
    clickActionsGroup.add(rightWebsiteRow);

    // Right folder
    const rightFolderRow = new Adw.ActionRow({ title: "Folder Path" });
    const rightFolderEntry = new Gtk.Entry({
      text: toDisplayPath(settings.get_string("right-custom-folder") || ""),
      hexpand: true,
      placeholder_text: "~/",
    });
    rightFolderEntry.connect("changed", () => {
      const text = rightFolderEntry.get_text();
      const homeDir = GLib.get_home_dir();
      const absolutePath =
        text.startsWith("~/") || text === "~"
          ? text.replace("~", homeDir)
          : text;
      settings.set_string("right-custom-folder", absolutePath);
    });
    rightFolderRow.add_suffix(rightFolderEntry);
    clickActionsGroup.add(rightFolderRow);

    // Visibility toggle for preferences rows
    const toggleVis = (combo, rowApp, rowCmd, rowWebsite, rowFolder) => {
      const sel = combo.get_selected();
      rowApp.set_visible(sel === 4);
      rowCmd.set_visible(sel === 5);
      rowWebsite.set_visible(sel === 7);
      rowFolder.set_visible(sel === 8);
    };

    leftCombo.connect("notify::selected", () =>
      toggleVis(
        leftCombo,
        leftAppRow,
        leftCmdRow,
        leftWebsiteRow,
        leftFolderRow,
      ),
    );
    rightCombo.connect("notify::selected", () =>
      toggleVis(
        rightCombo,
        rightAppRow,
        rightCmdRow,
        rightWebsiteRow,
        rightFolderRow,
      ),
    );

    toggleVis(leftCombo, leftAppRow, leftCmdRow, leftWebsiteRow, leftFolderRow);
    toggleVis(
      rightCombo,
      rightAppRow,
      rightCmdRow,
      rightWebsiteRow,
      rightFolderRow,
    );

    // Click Cooldown
    const clickCooldownGroup = new Adw.PreferencesGroup({
      title: "",
    });
    prefsBox.append(clickCooldownGroup);
    const cooldownRow = new Adw.ActionRow({
      title: "Click Cooldown (ms)",
      css_classes: ["spaced-top"],
    });
    const cooldownInfoButton = new Gtk.Button({
      icon_name: "help-about-symbolic",
      tooltip_text: "Prevents rapid accidental clicks (0 = disable)",
      has_tooltip: true,
      css_classes: ["flat"],
      valign: Gtk.Align.CENTER,
    });
    // Keep tooltip visible when button is clicked
    cooldownInfoButton.connect("clicked", (button) => {
      button.set_tooltip_text(button.get_tooltip_text());
      return true; // Stop event propagation
    });
    const cooldownSpin = new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 5000,
        step_increment: 50,
        page_increment: 100,
      }),
      numeric: true,
      digits: 0,
      width_chars: 4,
      valign: Gtk.Align.CENTER,
      halign: Gtk.Align.CENTER,
    });
    cooldownSpin.set_value(cooldownDelay);
    cooldownSpin.connect("value-changed", () =>
      settings.set_int("click-cooldown", cooldownSpin.get_value()),
    );
    cooldownRow.add_suffix(cooldownInfoButton);
    cooldownRow.add_suffix(cooldownSpin);
    clickCooldownGroup.add(cooldownRow);

    // === RESTORE DEFAULTS ===
    const restoreDefaultsGroup = new Adw.PreferencesGroup();
    page.add(restoreDefaultsGroup);
    const restoreButton = new Gtk.Button({
      label: "Restore Defaults",
      css_classes: ["destructive-action"],
      halign: Gtk.Align.CENTER,
      hexpand: false,
    });

    restoreButton.connect("clicked", () => {
      // Create confirmation dialog
      const dialog = new Adw.MessageDialog({
        transient_for: window,
        heading: "Restore Defaults",
        body: "All settings will be restored to their default values. Continue?",
        close_response: "cancel",
      });
      dialog.add_response("cancel", "Cancel");
      dialog.add_response("restore", "Restore");
      dialog.set_response_appearance(
        "restore",
        Adw.ResponseAppearance.DESTRUCTIVE,
      );
      dialog.connect("response", (self, response) => {
        if (response === "restore") {
          restoreAllDefaults();
        }
      });
      dialog.present();
    });

    restoreDefaultsGroup.add(restoreButton);

    // Helper function to restore all defaults
    const restoreAllDefaults = () => {
      let defIconPath = settings.settings_schema
        .get_key("icon-path")
        .get_default_value();
      settings.set_value("icon-path", defIconPath);
      iconPathEntry.set_text(defIconPath.unpack());

      let defIconPosition = settings.settings_schema
        .get_key("icon-position")
        .get_default_value();
      settings.set_value("icon-position", defIconPosition);
      const defPosition = defIconPosition.unpack();
      leftButton.active = defPosition === "left";
      centerButton.active = defPosition === "center";
      rightButton.active = defPosition === "right";

      let defIconOrder = settings.settings_schema
        .get_key("icon-order")
        .get_default_value();
      settings.set_value("icon-order", defIconOrder);
      iconOrderSpin.set_value(defIconOrder.unpack());
      iconOrderSpin.emit("value-changed");

      let defIconSize = settings.settings_schema
        .get_key("icon-size")
        .get_default_value();
      settings.set_value("icon-size", defIconSize);
      iconSizeSpin.set_value(defIconSize.unpack());
      iconSizeSpin.emit("value-changed");

      let defPadding = settings.settings_schema
        .get_key("horizontal-padding")
        .get_default_value();
      settings.set_value("horizontal-padding", defPadding);
      paddingSpin.set_value(defPadding.unpack());
      paddingSpin.emit("value-changed");

      let defLeftClick = settings.settings_schema
        .get_key("left-click-action")
        .get_default_value();
      settings.set_value("left-click-action", defLeftClick);
      leftCombo.set_selected(defLeftClick.unpack());
      leftCombo.notify("selected");

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
      leftCmdEntry.emit("changed");

      let defRightClick = settings.settings_schema
        .get_key("right-click-action")
        .get_default_value();
      settings.set_value("right-click-action", defRightClick);
      rightCombo.set_selected(defRightClick.unpack());
      rightCombo.notify("selected");

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
      rightCmdEntry.emit("changed");

      let defCooldown = settings.settings_schema
        .get_key("click-cooldown")
        .get_default_value();
      settings.set_value("click-cooldown", defCooldown);
      cooldownSpin.set_value(defCooldown.unpack());
      cooldownSpin.emit("value-changed");
    };
  }
}
