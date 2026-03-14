export class OpenItemsFactory {
  /**
   * Register the Cmd/Ctrl+Shift+U keyboard shortcut.
   */
  static registerShortcut() {
    ztoolkit.Keyboard.register((ev) => {
      if (
        (ev.metaKey || ev.ctrlKey) &&
        ev.shiftKey &&
        ev.key.toUpperCase() === "U"
      ) {
        ev.preventDefault();
        this.openSelectedItemURLs();
      }
    });
  }

  /**
   * Register a right-click menu item on library items.
   */
  static registerMenuItem() {
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "openitems-open-url",
      label: "Open URL in Browser",
      commandListener: () => this.openSelectedItemURLs(),
    });
  }

  /**
   * Get a URL to open for a Zotero item.
   * Tries: URL field, then DOI (converted to https://doi.org/...).
   * For attachment/note items, checks the parent item.
   */
  static getItemURL(item: Zotero.Item): string | null {
    // If this is an attachment or note, try the parent
    if (item.isAttachment() || item.isNote()) {
      const parentID = item.parentItemID;
      if (parentID) {
        item = Zotero.Items.get(parentID);
      }
    }

    // Try URL field
    const url = item.getField("url") as string;
    if (url) return url;

    // Try DOI field -> convert to URL
    let doi = item.getField("DOI") as string;
    if (doi) {
      doi = doi.replace(/^https?:\/\/doi\.org\//i, "");
      return `https://doi.org/${doi}`;
    }

    return null;
  }

  /**
   * Open URLs for all selected items in the items pane.
   */
  static openSelectedItemURLs() {
    const zoteroPane = Zotero.getActiveZoteroPane();
    if (!zoteroPane) return;

    const items = zoteroPane.getSelectedItems();
    if (!items || items.length === 0) {
      ztoolkit.log("No items selected");
      return;
    }

    let opened = 0;
    let failed = 0;

    for (const item of items) {
      const url = this.getItemURL(item);
      if (url) {
        Zotero.launchURL(url);
        opened++;
        ztoolkit.log("Opened: " + url);
      } else {
        failed++;
        ztoolkit.log(
          "No URL or DOI for item: " + item.getField("title"),
        );
      }
    }

    if (failed > 0 && opened === 0) {
      new ztoolkit.ProgressWindow(addon.data.config.addonName)
        .createLine({
          text:
            items.length === 1
              ? "No URL or DOI found for this item."
              : `No URL or DOI found for any of the ${items.length} selected items.`,
          type: "fail",
        })
        .show();
    } else if (opened > 0) {
      new ztoolkit.ProgressWindow(addon.data.config.addonName, {
        closeTime: 2000,
      })
        .createLine({
          text: `Opened ${opened} URL${opened > 1 ? "s" : ""}`,
          type: "success",
        })
        .show();
    }
  }
}
