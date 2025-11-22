import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Menu } from 'obsidian';
import { MathTranslator } from './theophysics-math-translator';

interface TheophysicsSettings {
    scanFolder: string;
    autoScan: boolean;
    translationNotePath: string;
}

const DEFAULT_SETTINGS: TheophysicsSettings = {
    scanFolder: '',
    autoScan: false,
    translationNotePath: 'Theophysics Translations/Math Dictionary.md'
}

export default class TheophysicsMathPlugin extends Plugin {
    settings: TheophysicsSettings;

    async onload() {
        await this.loadSettings();

        // Add ribbon icon
        this.addRibbonIcon('calculator', 'Theophysics Math Translator', () => {
            new Notice('Select text and use the command palette to translate!');
        });

        // 1. Command: Translate Selection
        this.addCommand({
            id: 'theophysics-translate-math',
            name: 'Translate Math to Narrative',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const selection = editor.getSelection();
                if (selection) {
                    const translation = MathTranslator.translate(selection);
                    new TranslationModal(this.app, selection, translation).open();
                } else {
                    new Notice("Please highlight an equation first.");
                }
            }
        });

        // 2. Command: Scan Current File
        this.addCommand({
            id: 'theophysics-scan-current',
            name: 'Scan Current File for Math',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const file = view.file;
                if (!file) {
                    new Notice("No active file");
                    return;
                }

                const content = await this.app.vault.read(file);
                const translations = MathTranslator.translateDocument(content);

                if (translations.length === 0) {
                    new Notice("No math found in this file");
                    return;
                }

                new ScanResultsModal(this.app, file.basename, translations).open();
            }
        });

        // 3. Command: Scan Folder Recursively
        this.addCommand({
            id: 'theophysics-scan-folder',
            name: 'Scan Folder for All Math',
            callback: async () => {
                if (!this.settings.scanFolder) {
                    new Notice("Please set a scan folder in settings first");
                    this.openSettings();
                    return;
                }

                await this.scanFolderRecursively();
            }
        });

        // 4. Command: Export Translation Dictionary
        this.addCommand({
            id: 'theophysics-export-dictionary',
            name: 'Export Translation Dictionary',
            callback: async () => {
                await this.exportTranslationDictionary();
            }
        });

        // 5. Add context menu for selection
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
                const selection = editor.getSelection();
                if (selection && (selection.includes('$') || selection.includes('\\'))) {
                    menu.addItem((item) => {
                        item
                            .setTitle('Translate to Narrative')
                            .setIcon('calculator')
                            .onClick(() => {
                                const translation = MathTranslator.translate(selection);
                                new TranslationModal(this.app, selection, translation).open();
                            });
                    });
                }
            })
        );

        // Add settings tab
        this.addSettingTab(new TheophysicsSettingTab(this.app, this));
    }

    async scanFolderRecursively() {
        const folder = this.app.vault.getAbstractFileByPath(this.settings.scanFolder);

        if (!folder || !(folder instanceof TFolder)) {
            new Notice("Folder not found: " + this.settings.scanFolder);
            return;
        }

        new Notice("Scanning folder...");

        const allTranslations: Array<{file: string, math: string, narrative: string}> = [];
        const files = this.getMarkdownFilesRecursive(folder);

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const translations = MathTranslator.translateDocument(content);

            for (const trans of translations) {
                allTranslations.push({
                    file: file.path,
                    math: trans.original,
                    narrative: trans.translation
                });
            }
        }

        if (allTranslations.length === 0) {
            new Notice("No math equations found in folder");
            return;
        }

        // Show results and offer to save
        new FolderScanModal(this.app, allTranslations, this).open();
    }

    getMarkdownFilesRecursive(folder: TFolder): TFile[] {
        let files: TFile[] = [];

        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child);
            } else if (child instanceof TFolder) {
                files = files.concat(this.getMarkdownFilesRecursive(child));
            }
        }

        return files;
    }

    async exportTranslationDictionary() {
        const folder = this.app.vault.getAbstractFileByPath(this.settings.scanFolder);

        if (!folder || !(folder instanceof TFolder)) {
            new Notice("Please set a valid scan folder in settings");
            return;
        }

        new Notice("Building translation dictionary...");

        const allTranslations: Array<{file: string, math: string, narrative: string}> = [];
        const files = this.getMarkdownFilesRecursive(folder);

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const translations = MathTranslator.translateDocument(content);

            for (const trans of translations) {
                allTranslations.push({
                    file: file.path,
                    math: trans.original,
                    narrative: trans.translation
                });
            }
        }

        // Create markdown content
        let mdContent = `# Theophysics Math Translation Dictionary\n\n`;
        mdContent += `> Auto-generated on ${new Date().toLocaleString()}\n\n`;
        mdContent += `Total translations: ${allTranslations.length}\n\n`;
        mdContent += `---\n\n`;

        // Group by file
        const byFile = new Map<string, Array<{math: string, narrative: string}>>();

        for (const trans of allTranslations) {
            if (!byFile.has(trans.file)) {
                byFile.set(trans.file, []);
            }
            byFile.get(trans.file)!.push({
                math: trans.math,
                narrative: trans.narrative
            });
        }

        // Write grouped content
        for (const [filepath, translations] of byFile) {
            mdContent += `## ${filepath}\n\n`;

            for (const trans of translations) {
                mdContent += `### Math Layer\n\`\`\`latex\n${trans.math}\n\`\`\`\n\n`;
                mdContent += `### Narrative Layer\n> "${trans.narrative}"\n\n`;
                mdContent += `---\n\n`;
            }
        }

        // Save to vault
        const outputPath = this.settings.translationNotePath;
        const folder_path = outputPath.substring(0, outputPath.lastIndexOf('/'));

        // Create folder if it doesn't exist
        if (folder_path && !this.app.vault.getAbstractFileByPath(folder_path)) {
            await this.app.vault.createFolder(folder_path);
        }

        // Write or update file
        const existingFile = this.app.vault.getAbstractFileByPath(outputPath);
        if (existingFile instanceof TFile) {
            await this.app.vault.modify(existingFile, mdContent);
        } else {
            await this.app.vault.create(outputPath, mdContent);
        }

        new Notice(`Dictionary saved to ${outputPath}`);

        // Open the file
        const file = this.app.vault.getAbstractFileByPath(outputPath);
        if (file instanceof TFile) {
            this.app.workspace.getLeaf().openFile(file);
        }
    }

    openSettings() {
        // @ts-ignore
        this.app.setting.open();
        // @ts-ignore
        this.app.setting.openTabById(this.manifest.id);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// ==========================================
// MODAL: Single Translation Display
// ==========================================
class TranslationModal extends Modal {
    original: string;
    translation: string;

    constructor(app: App, original: string, translation: string) {
        super(app);
        this.original = original;
        this.translation = translation;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('theophysics-translation-modal');

        contentEl.createEl("h2", { text: "🔮 Theophysics Translation" });

        contentEl.createEl("h3", { text: "Math Layer:" });
        const mathCode = contentEl.createEl("code", { cls: "math-original" });
        mathCode.style.display = "block";
        mathCode.style.padding = "10px";
        mathCode.style.backgroundColor = "var(--background-secondary)";
        mathCode.style.borderRadius = "5px";
        mathCode.style.marginBottom = "15px";
        mathCode.setText(this.original);

        contentEl.createEl("h3", { text: "Narrative Layer:" });
        const narrative = contentEl.createEl("div", { cls: "theophysics-narrative" });
        narrative.style.fontSize = "1.2em";
        narrative.style.fontStyle = "italic";
        narrative.style.color = "var(--interactive-accent)";
        narrative.style.padding = "15px";
        narrative.style.backgroundColor = "var(--background-secondary)";
        narrative.style.borderRadius = "5px";
        narrative.style.marginBottom = "20px";
        narrative.setText(`"${this.translation}"`);

        const btnContainer = contentEl.createEl("div", { cls: "button-container" });
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";

        const copyBtn = btnContainer.createEl("button", { text: "📋 Copy Narrative" });
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(this.translation);
            new Notice("Copied to clipboard!");
        };

        const copyBothBtn = btnContainer.createEl("button", { text: "📄 Copy Both" });
        copyBothBtn.onclick = () => {
            const both = `Math: ${this.original}\n\nNarrative: "${this.translation}"`;
            navigator.clipboard.writeText(both);
            new Notice("Copied both layers!");
        };

        const closeBtn = btnContainer.createEl("button", { text: "✖ Close" });
        closeBtn.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ==========================================
// MODAL: Current File Scan Results
// ==========================================
class ScanResultsModal extends Modal {
    filename: string;
    translations: Array<{original: string, translation: string, position: number}>;

    constructor(app: App, filename: string, translations: Array<{original: string, translation: string, position: number}>) {
        super(app);
        this.filename = filename;
        this.translations = translations;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: `📊 Math Found in "${this.filename}"` });
        contentEl.createEl("p", { text: `Found ${this.translations.length} equation(s)` });

        const container = contentEl.createDiv({ cls: "scan-results-container" });
        container.style.maxHeight = "500px";
        container.style.overflowY = "auto";

        this.translations.forEach((trans, idx) => {
            const item = container.createDiv({ cls: "scan-result-item" });
            item.style.marginBottom = "20px";
            item.style.padding = "10px";
            item.style.backgroundColor = "var(--background-secondary)";
            item.style.borderRadius = "5px";

            item.createEl("h4", { text: `Equation ${idx + 1}` });

            const mathBox = item.createEl("code");
            mathBox.style.display = "block";
            mathBox.style.marginBottom = "10px";
            mathBox.setText(trans.original);

            const narrative = item.createEl("div");
            narrative.style.fontStyle = "italic";
            narrative.style.color = "var(--interactive-accent)";
            narrative.setText(`"${trans.translation}"`);
        });

        const closeBtn = contentEl.createEl("button", { text: "Close" });
        closeBtn.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ==========================================
// MODAL: Folder Scan Results
// ==========================================
class FolderScanModal extends Modal {
    translations: Array<{file: string, math: string, narrative: string}>;
    plugin: TheophysicsMathPlugin;

    constructor(app: App, translations: Array<{file: string, math: string, narrative: string}>, plugin: TheophysicsMathPlugin) {
        super(app);
        this.translations = translations;
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "📚 Folder Scan Complete" });
        contentEl.createEl("p", { text: `Found ${this.translations.length} equations across multiple files` });

        const fileCount = new Set(this.translations.map(t => t.file)).size;
        contentEl.createEl("p", { text: `Files scanned: ${fileCount}` });

        const container = contentEl.createDiv({ cls: "folder-scan-preview" });
        container.style.maxHeight = "300px";
        container.style.overflowY = "auto";
        container.style.marginBottom = "20px";
        container.style.padding = "10px";
        container.style.backgroundColor = "var(--background-secondary)";
        container.style.borderRadius = "5px";

        // Show first 5 translations as preview
        const preview = this.translations.slice(0, 5);
        preview.forEach((trans, idx) => {
            const item = container.createDiv();
            item.style.marginBottom = "10px";
            item.createEl("strong", { text: trans.file });
            item.createEl("br");
            item.createEl("code", { text: trans.math });
            item.createEl("br");
            const narrative = item.createEl("span");
            narrative.style.fontStyle = "italic";
            narrative.style.color = "var(--interactive-accent)";
            narrative.setText(`"${trans.narrative}"`);
            item.createEl("hr");
        });

        if (this.translations.length > 5) {
            container.createEl("p", { text: `... and ${this.translations.length - 5} more` });
        }

        const btnContainer = contentEl.createDiv();
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";

        const exportBtn = btnContainer.createEl("button", { text: "📖 Export Dictionary" });
        exportBtn.onclick = async () => {
            this.close();
            await this.plugin.exportTranslationDictionary();
        };

        const closeBtn = btnContainer.createEl("button", { text: "Close" });
        closeBtn.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ==========================================
// SETTINGS TAB
// ==========================================
class TheophysicsSettingTab extends PluginSettingTab {
    plugin: TheophysicsMathPlugin;

    constructor(app: App, plugin: TheophysicsMathPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Theophysics Math Translator Settings' });

        new Setting(containerEl)
            .setName('Scan Folder')
            .setDesc('Folder to recursively scan for math equations (e.g., "Papers" or "Research/Theophysics")')
            .addText(text => text
                .setPlaceholder('Papers')
                .setValue(this.plugin.settings.scanFolder)
                .onChange(async (value) => {
                    this.plugin.settings.scanFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Translation Dictionary Path')
            .setDesc('Where to save the auto-generated translation dictionary')
            .addText(text => text
                .setPlaceholder('Theophysics Translations/Math Dictionary.md')
                .setValue(this.plugin.settings.translationNotePath)
                .onChange(async (value) => {
                    this.plugin.settings.translationNotePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-scan on startup')
            .setDesc('Automatically scan folder when Obsidian opens')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoScan)
                .onChange(async (value) => {
                    this.plugin.settings.autoScan = value;
                    await this.plugin.saveSettings();
                }));

        // Info section
        containerEl.createEl('h3', { text: 'Usage Guide' });
        const guide = containerEl.createDiv();
        guide.innerHTML = `
            <p><strong>Quick Translation:</strong></p>
            <ul>
                <li>Highlight any equation in your note</li>
                <li>Right-click → "Translate to Narrative"</li>
                <li>Or use Command Palette → "Translate Math to Narrative"</li>
            </ul>
            <p><strong>Scan & Export:</strong></p>
            <ul>
                <li>Set a scan folder above (e.g., "Papers")</li>
                <li>Use "Scan Folder for All Math" from command palette</li>
                <li>Export dictionary to get a master translation document</li>
            </ul>
        `;
    }
}
