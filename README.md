# Obsidian Page Properties

This is a plugin for [Obsidian](https://obsidian.md) which adds page properties similar to those present in Logseq.

![demo-1.png](https://user-images.githubusercontent.com/33968278/226478801-b8e9122d-78ff-4b1b-b4c0-6c6d25d57e9e.png)
![demo-2.png](https://user-images.githubusercontent.com/33968278/226478803-4ca621ba-cdce-4bd9-a408-4214d869f98d.png)

The main two things it does are:
- Adds pretty tag-like styles for full-line inline fields from [Dataview](https://github.com/blacksmithgu/obsidian-dataview) - note that while Dataview is not a dependency they're not that useful without it.
- Makes the field name into an inner link - a cute little feature from Logseq.

Another couple of features, that are *missing* in Logseq are:
- For certain fields the value is converted into a link by a specified pattern - this is configurable.
	- This is useful when the tag already describes what the host should be, for example a relevant GitHub repository, or a wiki page - instead of the full link you only set the username/repository part or the wiki page name.
	- Works really well with the [Surfing](https://obsidian.md/plugins?id=surfing) plugin :)
- Some fields can be hidden from the reader view - also configurable.

## Installation
- Currently awaiting approval on the [Obsidian Plugin Marketplace](https://obsidian.md/plugins?id=page-properties), so use one of the methods below.
- You can use the [Brat](https://github.com/TfTHacker/obsidian42-brat) plugin.
- You can download the `main.js`, `styles.css` and `manifest.json` files manually from the [releases](https://github.com/necauqua/obsidian-page-properties/releases) page and put them into the `$VAULT/.obsidian/plugins/page-properties` folder.
- For Nix users, you can do this too:
```bash
nix profile install github:necauqua/obsidian-page-properties
ln -s ~/.nix-profile/share/obsidian/plugins/page-properties $VAULT/.obsidian/plugins/page-properties
```