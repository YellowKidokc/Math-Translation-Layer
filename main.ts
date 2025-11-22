import {
    App,
    Editor,
    MarkdownView,
    Menu,
    Notice,
    Plugin,
    TFile,
    TFolder
} from 'obsidian';

import { MathTranslator, TranslationResult } from './theophysics-math-translator';
import {
    TranslationModal,
    ScanResultsModal,
    FolderSelectorModal,
    FolderScanResultsModal
} from './modals';

export default class TheophysicsMathTranslatorPlugin extends Plugin {
    // Store scan results for dictionary export
    private lastScanResults: Map<string, TranslationResult[]> = new Map();

    async onload() {
        console.log('Loading Theophysics Math Translation Layer');

        // Add ribbon icon
        this.addRibbonIcon('calculator', 'Theophysics Math Translator', () => {
            new Notice('Select math and use "Translate Math to Narrative" command or right-click menu');
        });

        // COMMAND 1: Translate selected math to narrative
        this.addCommand({
            id: 'theophysics-translate-math',
            name: 'Translate Math to Narrative',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const selection = editor.getSelection();
                if (selection) {
                    const translation = MathTranslator.translate(selection);
                    new TranslationModal(this.app, selection, translation).open();
                } else {
                    new Notice("Please select a mathematical equation first.");
                }
            }
        });

        // COMMAND 2: Scan current file for math
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
                    new Notice("No mathematical expressions found in this file");
                    return;
                }

                // Store results for potential export
                this.lastScanResults.clear();
                this.lastScanResults.set(file.path, translations);

                // Show results modal
                new ScanResultsModal(this.app, file.basename, translations).open();
            }
        });

        // COMMAND 3: Scan folder for all math
        this.addCommand({
            id: 'theophysics-scan-folder',
            name: 'Scan Folder for All Math',
            callback: async () => {
                new FolderSelectorModal(this.app, async (folder: TFolder) => {
                    await this.scanFolder(folder);
                }).open();
            }
        });

        // COMMAND 4: Export translation dictionary
        this.addCommand({
            id: 'theophysics-export-dictionary',
            name: 'Export Translation Dictionary',
            callback: async () => {
                if (this.lastScanResults.size === 0) {
                    new Notice("No scan results to export. Please scan a file or folder first.");
                    return;
                }

                await this.exportDictionary();
            }
        });

        // COMMAND 5: Rescan and update dictionary
        this.addCommand({
            id: 'theophysics-rescan-update',
            name: 'Rescan and Update Dictionary',
            callback: async () => {
                // Get the root folder and scan everything
                const rootFolder = this.app.vault.getRoot();
                await this.scanFolder(rootFolder);

                // Auto-export after scan
                if (this.lastScanResults.size > 0) {
                    new Notice("Vault scanned! Exporting updated dictionary...");
                    await this.exportDictionary();
                }
            }
        });

        // RIGHT-CLICK CONTEXT MENU
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
                const selection = editor.getSelection();
                // Show menu item if selection contains LaTeX indicators
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

        // Add CSS styles
        this.addStyles();
    }

    /**
     * Scan a folder recursively for mathematical expressions
     */
    private async scanFolder(folder: TFolder): Promise<void> {
        new Notice(`Scanning folder: ${folder.path}...`);

        this.lastScanResults.clear();
        let totalFiles = 0;
        let totalEquations = 0;

        const scanRecursive = async (currentFolder: TFolder) => {
            for (const child of currentFolder.children) {
                if (child instanceof TFile && child.extension === 'md') {
                    totalFiles++;
                    const content = await this.app.vault.read(child);
                    const translations = MathTranslator.translateDocument(content);

                    if (translations.length > 0) {
                        this.lastScanResults.set(child.path, translations);
                        totalEquations += translations.length;
                    }
                } else if (child instanceof TFolder) {
                    await scanRecursive(child);
                }
            }
        };

        await scanRecursive(folder);

        new Notice(`Scan complete! Found ${totalEquations} equations in ${totalFiles} files.`);

        if (totalEquations > 0) {
            new FolderScanResultsModal(
                this.app,
                folder.path === '/' ? 'Root (entire vault)' : folder.path,
                this.lastScanResults
            ).open();
        }
    }

    /**
     * Export translation dictionary as a markdown file
     */
    private async exportDictionary(): Promise<void> {
        // Collect all translations
        const allTranslations: TranslationResult[] = [];

        for (const [filePath, translations] of this.lastScanResults) {
            for (const translation of translations) {
                // Add file information to the result
                const enhancedResult: TranslationResult = {
                    ...translation,
                    location: { line: 0, column: 0 } // Could be enhanced with actual line numbers
                };
                allTranslations.push(enhancedResult);
            }
        }

        if (allTranslations.length === 0) {
            new Notice("No translations to export");
            return;
        }

        // Generate dictionary content
        let dictionaryContent = "# Theophysics Math Translation Dictionary\n\n";
        dictionaryContent += `**Generated:** ${new Date().toLocaleString()}\n\n`;
        dictionaryContent += `**Total Equations:** ${allTranslations.length}\n\n`;
        dictionaryContent += `**Files Scanned:** ${this.lastScanResults.size}\n\n`;
        dictionaryContent += "---\n\n";

        // Create unique translations map
        const uniqueTranslations = new Map<string, { translated: string, files: Set<string> }>();

        for (const [filePath, translations] of this.lastScanResults) {
            for (const result of translations) {
                if (!uniqueTranslations.has(result.original)) {
                    uniqueTranslations.set(result.original, {
                        translated: result.translated,
                        files: new Set([filePath])
                    });
                } else {
                    uniqueTranslations.get(result.original)!.files.add(filePath);
                }
            }
        }

        dictionaryContent += "## All Translations\n\n";
        let index = 1;

        for (const [original, data] of uniqueTranslations) {
            dictionaryContent += `### ${index}. ${original}\n\n`;
            dictionaryContent += `**Translation:** ${data.translated}\n\n`;
            dictionaryContent += `**Found in:**\n`;
            for (const file of data.files) {
                dictionaryContent += `- ${file}\n`;
            }
            dictionaryContent += "\n---\n\n";
            index++;
        }

        // Add file-by-file breakdown
        dictionaryContent += "## By File\n\n";

        for (const [filePath, translations] of this.lastScanResults) {
            if (translations.length === 0) continue;

            dictionaryContent += `### 📄 ${filePath}\n\n`;
            dictionaryContent += `Found ${translations.length} equation${translations.length !== 1 ? 's' : ''}:\n\n`;

            translations.forEach((result, idx) => {
                dictionaryContent += `${idx + 1}. ${result.original}\n`;
                dictionaryContent += `   - ${result.translated}\n\n`;
            });

            dictionaryContent += "\n";
        }

        // Save the dictionary file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = `Theophysics-Math-Dictionary-${timestamp}.md`;

        try {
            await this.app.vault.create(fileName, dictionaryContent);
            new Notice(`Dictionary exported to: ${fileName}`);

            // Open the newly created file
            const file = this.app.vault.getAbstractFileByPath(fileName);
            if (file instanceof TFile) {
                await this.app.workspace.getLeaf().openFile(file);
            }
        } catch (error) {
            console.error('Error exporting dictionary:', error);
            new Notice('Error exporting dictionary. Check console for details.');
        }
    }

    /**
     * Add custom CSS styles
     */
    private addStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            /* Translation Modal Styles */
            .theophysics-translation-modal .math-display {
                background-color: var(--background-secondary);
                padding: 1em;
                border-radius: 5px;
                margin: 1em 0;
                font-family: monospace;
            }

            .theophysics-translation-modal .translation-text {
                background-color: var(--background-primary-alt);
                padding: 1em;
                border-radius: 5px;
                margin: 1em 0;
                font-size: 1.1em;
                line-height: 1.6;
            }

            .modal-button-container {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 1.5em;
            }

            .modal-button-container button {
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }

            /* Scan Results Modal Styles */
            .theophysics-scan-results-modal .scan-results-list {
                max-height: 60vh;
                overflow-y: auto;
                padding: 1em 0;
            }

            .scan-result-item {
                margin: 1.5em 0;
                padding: 1em;
                background-color: var(--background-secondary);
                border-radius: 5px;
            }

            .scan-result-item code {
                background-color: var(--background-primary);
                padding: 0.5em;
                border-radius: 3px;
            }

            .copy-translation-btn {
                margin-top: 0.5em;
                padding: 5px 12px;
                font-size: 0.9em;
                cursor: pointer;
            }

            /* Folder Selector Modal Styles */
            .theophysics-folder-selector-modal .folder-list {
                max-height: 50vh;
                overflow-y: auto;
                margin: 1em 0;
            }

            .folder-item {
                margin: 0.5em 0;
            }

            .folder-select-btn {
                width: 100%;
                padding: 10px;
                text-align: left;
                cursor: pointer;
                border-radius: 4px;
                background-color: var(--background-secondary);
            }

            .folder-select-btn:hover {
                background-color: var(--background-modifier-hover);
            }

            /* Folder Scan Results Modal Styles */
            .theophysics-folder-scan-modal .scan-summary {
                background-color: var(--background-secondary);
                padding: 1em;
                border-radius: 5px;
                margin: 1em 0;
            }

            .folder-scan-results {
                max-height: 60vh;
                overflow-y: auto;
                margin: 1em 0;
            }

            .file-section {
                margin: 1.5em 0;
                padding: 1em;
                background-color: var(--background-secondary);
                border-radius: 5px;
            }

            .result-item-compact {
                margin: 0.8em 0;
                padding-left: 1em;
            }

            .result-item-compact code {
                background-color: var(--background-primary);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.9em;
            }

            .translation-preview {
                color: var(--text-muted);
                font-style: italic;
                margin-left: 1em;
            }
        `;
        document.head.appendChild(style);
    }

    onunload() {
        console.log('Unloading Theophysics Math Translation Layer');
    }
}
