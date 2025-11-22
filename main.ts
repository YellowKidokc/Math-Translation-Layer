import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Menu } from 'obsidian';
import { MathTranslator } from './theophysics-math-translator';

interface TheophysicsSettings {
    scanFolders: string[];  // Multiple folders to scan
    autoScan: boolean;
    translationNotePath: string;
}

const DEFAULT_SETTINGS: TheophysicsSettings = {
    scanFolders: ['_Term_Pages', 'data analytic', 'complete logos final papers'],
    autoScan: false,
    translationNotePath: 'data analytic/AA Math Translation Hub.md'
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

        // 3. Command: Scan Multiple Folders
        this.addCommand({
            id: 'theophysics-scan-folder',
            name: 'Scan All Folders for Math',
            callback: async () => {
                if (!this.settings.scanFolders || this.settings.scanFolders.length === 0) {
                    new Notice("Please set scan folders in settings first");
                    this.openSettings();
                    return;
                }

                await this.scanMultipleFolders();
            }
        });

        // 4. Command: Build AA Hub
        this.addCommand({
            id: 'theophysics-export-dictionary',
            name: 'Build AA Math Translation Hub',
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

    async scanMultipleFolders() {
        new Notice("Scanning multiple folders...");

        const allTranslations: Array<{file: string, math: string, narrative: string}> = [];
        let totalFiles = 0;
        const foldersScanned: string[] = [];

        // Scan each folder in the list
        for (const folderPath of this.settings.scanFolders) {
            const folder = this.app.vault.getAbstractFileByPath(folderPath);

            if (!folder || !(folder instanceof TFolder)) {
                new Notice(`⚠️ Folder not found: ${folderPath} (skipping)`);
                continue;
            }

            foldersScanned.push(folderPath);
            const files = this.getMarkdownFilesRecursive(folder);
            totalFiles += files.length;

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
        }

        if (allTranslations.length === 0) {
            new Notice(`No math equations found in ${foldersScanned.length} folder(s)`);
            return;
        }

        new Notice(`✅ Found ${allTranslations.length} equations in ${totalFiles} files across ${foldersScanned.length} folders!`);

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
        new Notice("Building AA Math Translation Hub...");

        const allTranslations: Array<{file: string, math: string, narrative: string}> = [];
        let totalFiles = 0;
        const foldersScanned: string[] = [];

        // Scan all configured folders
        for (const folderPath of this.settings.scanFolders) {
            const folder = this.app.vault.getAbstractFileByPath(folderPath);

            if (!folder || !(folder instanceof TFolder)) {
                console.log(`Folder not found: ${folderPath} (skipping)`);
                continue;
            }

            foldersScanned.push(folderPath);
            const files = this.getMarkdownFilesRecursive(folder);
            totalFiles += files.length;

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
        }

        // Create markdown content with dashboard styling
        let mdContent = `---\ncssclass: theophysics-hub\n---\n\n`;
        mdContent += `# 🔮 AA Math Translation Hub\n\n`;
        mdContent += `> **Auto-generated Translation Dashboard**\n`;
        mdContent += `> Last updated: ${new Date().toLocaleString()}\n`;
        mdContent += `> Scanned folders: ${foldersScanned.map(f => `\`${f}\``).join(', ')}\n\n`;
        
        mdContent += `## 📊 Statistics\n\n`;
        mdContent += `- **Total Equations Found:** ${allTranslations.length}\n`;
        mdContent += `- **Files Scanned:** ${totalFiles}\n`;
        mdContent += `- **Folders Scanned:** ${foldersScanned.length}\n`;
        mdContent += `- **Unique Translations:** ${new Set(allTranslations.map(t => t.math)).size}\n\n`;
        
        mdContent += `---\n\n`;
        mdContent += `## 📚 Quick Reference\n\n`;
        mdContent += `**How to use this hub:**\n`;
        mdContent += `1. Browse equations by file below\n`;
        mdContent += `2. Click file links to jump to source\n`;
        mdContent += `3. Copy narrative translations for your notes\n`;
        mdContent += `4. Use right-click "Translate to Narrative" on any page for instant translation\n\n`;
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

        // Write grouped content with better formatting
        mdContent += `## 📖 Translations by File\n\n`;
        
        for (const [filepath, translations] of byFile) {
            const filename = filepath.split('/').pop() || filepath;
            mdContent += `### [[${filepath}|${filename}]]\n\n`;
            mdContent += `*Found ${translations.length} equation(s)*\n\n`;

            translations.forEach((trans, idx) => {
                mdContent += `#### Equation ${idx + 1}\n\n`;
                mdContent += `**Math Layer:**\n\`\`\`latex\n${trans.math}\n\`\`\`\n\n`;
                mdContent += `**Narrative Layer:**\n> 💭 *"${trans.narrative}"*\n\n`;
                
                if (idx < translations.length - 1) {
                    mdContent += `---\n\n`;
                }
            });
            
            mdContent += `\n\n`;
        }

        // Add master glossary section
        mdContent += `---\n\n## 🗂️ Master Glossary\n\n`;
        mdContent += `*All unique equations in alphabetical order*\n\n`;
        
        const uniqueTranslations = Array.from(
            new Map(allTranslations.map(t => [t.math, t.narrative])).entries()
        ).sort((a, b) => a[0].localeCompare(b[0]));
        
        uniqueTranslations.forEach(([math, narrative]) => {
            mdContent += `- \`${math}\` → *"${narrative}"*\n`;
        });

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

        new Notice(`✅ AA Math Hub created: ${allTranslations.length} equations indexed!`);

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
            .setName('Scan Folders')
            .setDesc('Folders to scan for math equations (comma-separated). Default: "_Term_Pages, data analytic, complete logos final papers"')
            .addTextArea(text => text
                .setPlaceholder('_Term_Pages, data analytic, complete logos final papers')
                .setValue(this.plugin.settings.scanFolders.join(', '))
                .onChange(async (value) => {
                    // Split by comma and trim whitespace
                    this.plugin.settings.scanFolders = value.split(',').map(f => f.trim()).filter(f => f.length > 0);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('AA Hub Path')
            .setDesc('Where to save the AA Math Translation Hub dashboard')
            .addText(text => text
                .setPlaceholder('data analytic/AA Math Translation Hub.md')
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
            <p><strong>🎯 Quick Translation (On Any Page):</strong></p>
            <ul>
                <li>Highlight any equation in your note</li>
                <li>Right-click → "Translate to Narrative"</li>
                <li>Or use Command Palette → "Translate Math to Narrative"</li>
            </ul>
            <p><strong>📊 Build AA Hub Dashboard:</strong></p>
            <ul>
                <li>Set scan folders above (default: _Term_Pages, data analytic, complete logos final papers)</li>
                <li>Use Command Palette → "Scan All Folders for Math"</li>
                <li>Click "Build AA Math Translation Hub" to create the dashboard</li>
                <li>Hub will be created at: <code>data analytic/AA Math Translation Hub.md</code></li>
                <li>Scans ALL configured folders and aggregates results</li>
            </ul>
            <p><strong>💡 Pro Tips:</strong></p>
            <ul>
                <li>Add multiple folders separated by commas to scan them all</li>
                <li>The hub auto-links to source files - click to jump to equations</li>
                <li>Use the Master Glossary for quick reference</li>
                <li>Re-run scan to update hub with new equations from all folders</li>
            </ul>
        `;
    }
}
