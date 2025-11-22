import { App, Modal, Notice, TFolder } from 'obsidian';
import { TranslationResult } from './theophysics-math-translator';

/**
 * Modal for displaying a single translation
 */
export class TranslationModal extends Modal {
    private original: string;
    private translation: string;

    constructor(app: App, original: string, translation: string) {
        super(app);
        this.original = original;
        this.translation = translation;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('theophysics-translation-modal');

        // Title
        contentEl.createEl('h2', { text: 'Theophysics Translation' });

        // Original equation
        contentEl.createEl('h3', { text: 'Original:' });
        const originalDiv = contentEl.createDiv({ cls: 'math-display' });
        originalDiv.createEl('code', { text: this.original });

        // Translation
        contentEl.createEl('h3', { text: 'Translation:' });
        const translationDiv = contentEl.createDiv({ cls: 'translation-text' });
        translationDiv.createEl('p', { text: this.translation });

        // Copy button
        const buttonDiv = contentEl.createDiv({ cls: 'modal-button-container' });
        const copyBtn = buttonDiv.createEl('button', { text: 'Copy Translation' });
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(this.translation);
            new Notice('Translation copied to clipboard!');
        });

        const closeBtn = buttonDiv.createEl('button', { text: 'Close' });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Modal for displaying scan results from a file
 */
export class ScanResultsModal extends Modal {
    private fileName: string;
    private results: TranslationResult[];

    constructor(app: App, fileName: string, results: TranslationResult[]) {
        super(app);
        this.fileName = fileName;
        this.results = results;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('theophysics-scan-results-modal');

        // Title
        contentEl.createEl('h2', { text: `Math Found in: ${this.fileName}` });
        contentEl.createEl('p', {
            text: `Found ${this.results.length} mathematical expression${this.results.length !== 1 ? 's' : ''}`
        });

        // Results list
        const resultsList = contentEl.createDiv({ cls: 'scan-results-list' });

        this.results.forEach((result, index) => {
            const resultItem = resultsList.createDiv({ cls: 'scan-result-item' });

            resultItem.createEl('h4', { text: `${index + 1}. Original:` });
            const originalCode = resultItem.createEl('code', { text: result.original });
            originalCode.style.display = 'block';
            originalCode.style.marginBottom = '8px';

            resultItem.createEl('p', {
                text: `Translation: ${result.translated}`,
                cls: 'translation-text'
            });

            // Copy button for this translation
            const copyBtn = resultItem.createEl('button', {
                text: 'Copy',
                cls: 'copy-translation-btn'
            });
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(result.translated);
                new Notice('Translation copied!');
            });

            if (index < this.results.length - 1) {
                resultItem.createEl('hr');
            }
        });

        // Close button
        const buttonDiv = contentEl.createDiv({ cls: 'modal-button-container' });
        const closeBtn = buttonDiv.createEl('button', { text: 'Close' });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Modal for selecting a folder to scan
 */
export class FolderSelectorModal extends Modal {
    private folders: TFolder[];
    private onSelect: (folder: TFolder) => void;

    constructor(app: App, onSelect: (folder: TFolder) => void) {
        super(app);
        this.onSelect = onSelect;
        this.folders = this.getAllFolders();
    }

    private getAllFolders(): TFolder[] {
        const folders: TFolder[] = [];
        const rootFolder = this.app.vault.getRoot();

        const collectFolders = (folder: TFolder) => {
            folders.push(folder);
            for (const child of folder.children) {
                if (child instanceof TFolder) {
                    collectFolders(child);
                }
            }
        };

        collectFolders(rootFolder);
        return folders;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('theophysics-folder-selector-modal');

        contentEl.createEl('h2', { text: 'Select Folder to Scan' });
        contentEl.createEl('p', { text: 'Choose a folder to scan recursively for mathematical equations' });

        const folderList = contentEl.createDiv({ cls: 'folder-list' });

        this.folders.forEach(folder => {
            const folderItem = folderList.createDiv({ cls: 'folder-item' });
            const folderBtn = folderItem.createEl('button', {
                text: folder.path === '/' ? '📁 Root (entire vault)' : `📁 ${folder.path}`,
                cls: 'folder-select-btn'
            });

            folderBtn.addEventListener('click', () => {
                this.onSelect(folder);
                this.close();
            });
        });

        // Cancel button
        const buttonDiv = contentEl.createDiv({ cls: 'modal-button-container' });
        const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Modal for displaying folder scan progress and results
 */
export class FolderScanResultsModal extends Modal {
    private folderPath: string;
    private allResults: Map<string, TranslationResult[]>;
    private totalEquations: number;

    constructor(app: App, folderPath: string, allResults: Map<string, TranslationResult[]>) {
        super(app);
        this.folderPath = folderPath;
        this.allResults = allResults;
        this.totalEquations = Array.from(allResults.values()).reduce((sum, results) => sum + results.length, 0);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('theophysics-folder-scan-modal');

        // Title and summary
        contentEl.createEl('h2', { text: `Scan Results: ${this.folderPath}` });

        const summary = contentEl.createDiv({ cls: 'scan-summary' });
        summary.createEl('p', { text: `Files scanned: ${this.allResults.size}` });
        summary.createEl('p', { text: `Total equations found: ${this.totalEquations}` });

        if (this.totalEquations === 0) {
            contentEl.createEl('p', { text: 'No mathematical expressions found in this folder.' });
            const closeBtn = contentEl.createEl('button', { text: 'Close' });
            closeBtn.addEventListener('click', () => this.close());
            return;
        }

        // Results by file
        const resultsContainer = contentEl.createDiv({ cls: 'folder-scan-results' });

        for (const [filePath, results] of this.allResults) {
            if (results.length === 0) continue;

            const fileSection = resultsContainer.createDiv({ cls: 'file-section' });
            fileSection.createEl('h3', { text: `📄 ${filePath} (${results.length} equations)` });

            const fileResults = fileSection.createDiv({ cls: 'file-results' });
            results.forEach((result, index) => {
                const resultItem = fileResults.createDiv({ cls: 'result-item-compact' });
                resultItem.createEl('strong', { text: `${index + 1}. ` });
                resultItem.createEl('code', { text: result.original });
                resultItem.createEl('br');
                resultItem.createEl('span', {
                    text: `→ ${result.translated}`,
                    cls: 'translation-preview'
                });
            });
        }

        // Export button
        const buttonDiv = contentEl.createDiv({ cls: 'modal-button-container' });
        const exportBtn = buttonDiv.createEl('button', { text: 'Export Dictionary' });
        exportBtn.addEventListener('click', () => {
            this.close();
            // Trigger export - will be handled by main.ts
            new Notice('Use "Export Translation Dictionary" command to export these results');
        });

        const closeBtn = buttonDiv.createEl('button', { text: 'Close' });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
