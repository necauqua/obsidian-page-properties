import { App, Plugin, PluginSettingTab, Setting } from 'obsidian'
import { createViewPlugin, createMarkdownPostProcessor } from './render'

const DEFAULT_SETTINGS = {
    fieldsAreInnerLinks: true,
    autolinkPatterns: [
        { field: 'github', prefix: 'https://github.com/{0}' },
        { field: 'wiki', prefix: 'https://wikipedia.org/wiki/{0}' },
        { field: 'twitter', prefix: 'https://twitter.com/{0}' },
    ],
    hideInReaderMode: [
        'public'
    ]
}

type PagePropsSettings = typeof DEFAULT_SETTINGS
type AutolinkPatterns = Record<string, string | undefined>

export default class PagePropsPlugin extends Plugin {

    settings: PagePropsSettings
    autolinkPatterns: AutolinkPatterns

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
        this.refreshAutolinkPatterns()

        this.registerEditorExtension([createViewPlugin(this)])
        this.registerMarkdownPostProcessor(createMarkdownPostProcessor(this), -100)
        this.addSettingTab(new Settings(this.app, this))
    }

    private refreshAutolinkPatterns() {
        this.autolinkPatterns = {}
        for (const entry of this.settings.autolinkPatterns) {
            this.autolinkPatterns[entry.field] = entry.prefix
        }
    }

    async saveSettings() {
        this.refreshAutolinkPatterns()
        await this.saveData(this.settings)
    }
}

class Settings extends PluginSettingTab {

    constructor(app: App, readonly plugin: PagePropsPlugin) {
        super(app, plugin)
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        containerEl.createEl('h2', { text: 'General' })

        new Setting(containerEl)
            .setName('Page property names are inner links')
            .setDesc('A feature from Logseq, if you hover/click the page property name it\'ll behave as if it was a link to the page with the same name.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.fieldsAreInnerLinks)
                .onChange(async value => {
                    this.plugin.settings.fieldsAreInnerLinks = value
                    await this.plugin.saveSettings()
                }))

        const { autolinkPatterns, hideInReaderMode } = this.plugin.settings

        containerEl.createEl('h2', { text: 'Fields to hide in reader view' })

        for (let index = 0; index < hideInReaderMode.length; index++) {
            new Setting(containerEl)
                .setName('Hidden field #' + (index + 1))
                .addText(text => text
                    .setPlaceholder('Field that will be hidden')
                    .setValue(hideInReaderMode[index])
                    .onChange(async value => {
                        hideInReaderMode[index] = value
                        await this.plugin.saveSettings()
                    }))
                .addButton(button => button
                    .setButtonText('-')
                    .onClick(async () => {
                        hideInReaderMode.splice(index, 1)
                        this.display() // reload the view
                        await this.plugin.saveSettings()
                    }))
        }
        new Setting(containerEl)
            .addButton(button => button
                .setWarning()
                .setButtonText('Reset')
                .onClick(async () => {
                    this.plugin.settings.hideInReaderMode = [...DEFAULT_SETTINGS.hideInReaderMode]
                    this.display()
                    await this.plugin.saveSettings()
                }))
            .addButton(button => button
                .setButtonText('+')
                .onClick(async () => {
                    hideInReaderMode.push('')
                    this.display()
                    await this.plugin.saveSettings()
                }
            ))

        containerEl.createEl('h2', { text: 'Autolink Patterns' })

        for (let index = 0; index < autolinkPatterns.length; index++) {
            const entry = autolinkPatterns[index]

            new Setting(containerEl)
                .setName('Pattern #' + (index + 1))
                .addText(text => text
                    .setPlaceholder('Field for the link pattern')
                    .setValue(entry.field)
                    .onChange(async value => {
                        entry.field = value
                        await this.plugin.saveSettings()
                    }))
                .addText(text => text
                    .setPlaceholder('The link pattern')
                    .setValue(entry.prefix)
                    .onChange(async value => {
                        entry.prefix = value
                        await this.plugin.saveSettings()
                    }))
                .addButton(button => button
                    .setButtonText('-')
                    .onClick(async () => {
                        autolinkPatterns.splice(index, 1)
                        this.display()
                        await this.plugin.saveSettings()
                    }))
        }
        new Setting(containerEl)
            .addButton(button => button
                .setWarning()
                .setButtonText('Reset')
                .onClick(async () => {
                    this.plugin.settings.autolinkPatterns = [...DEFAULT_SETTINGS.autolinkPatterns]
                    this.display()
                    await this.plugin.saveSettings()
                }))
            .addButton(button => button
                .setButtonText('+')
                .onClick(async () => {
                    autolinkPatterns.push({ field: '', prefix: '' })
                    this.display()
                    await this.plugin.saveSettings()
                }
            ))
    }
}
