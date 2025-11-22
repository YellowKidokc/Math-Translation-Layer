# Theophysics Math Translation Layer

**The Rosetta Stone Between Mathematics and Theology**

An Obsidian plugin that translates LaTeX physics equations into human-readable "Theophysics Narrative" language. Turn `$\chi = \int G \cdot K$` into _"The Logos Field equals the integral of Grace times Knowledge"_.

---

## ✨ Features

### 🔮 Instant Translation
- **Highlight & Translate**: Select any equation, right-click → "Translate to Narrative"
- **Beautiful Modal**: See both Math Layer and Narrative Layer side-by-side
- **One-Click Copy**: Copy translations to clipboard instantly

### 📚 Batch Processing
- **Scan Current File**: Extract and translate all math in the active note
- **Recursive Folder Scan**: Process entire folders of research papers
- **Auto-Export Dictionary**: Generate a master translation reference document

### 🎯 Smart Context-Aware Translation
Three-layer translation system:
1. **Full Equation Overrides** - Context-aware translations for complete equations
2. **Math Structure Grammar** - Handles fractions, integrals, derivatives
3. **Symbol Vocabulary** - Translates individual symbols and constants

---

## 🚀 Installation

### Method 1: Manual Installation
1. Download the latest release from [Releases](https://github.com/YellowKidokc/Math-Translation-Layer/releases)
2. Extract to your Obsidian vault's `.obsidian/plugins/theophysics-math-translator/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Method 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/YellowKidokc/Math-Translation-Layer.git
cd Math-Translation-Layer

# Install dependencies
npm install

# Build the plugin
npm run build

# Copy to your Obsidian vault
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/theophysics-math-translator/
```

---

## 📖 Usage Guide

### Quick Translation
1. **Highlight** any LaTeX equation in your note
2. **Right-click** → select "Translate to Narrative"
3. Or use **Command Palette** (Ctrl/Cmd+P) → "Translate Math to Narrative"
4. View the translation in a beautiful modal window

### Scan & Export Workflow
1. Go to **Settings** → Theophysics Math Translator
2. Set your **Scan Folder** (e.g., `Papers` or `Research/Theophysics`)
3. Use **Command Palette** → "Scan Folder for All Math"
4. Click **"Export Dictionary"** to save all translations to a master document
5. Re-scan anytime to update the dictionary

### Context Menu Integration
- The plugin automatically detects LaTeX in your selection
- Right-click on any equation to see the "Translate to Narrative" option
- Works with both inline `$math$` and block `$$math$$` equations

---

## 🧪 Translation Examples

| Math Layer | Narrative Layer |
|------------|----------------|
| `$\chi = \int (G \cdot K) d\Omega$` | "The Logos Field equals the integral of Grace times Knowledge over all creation" |
| `$FQ \ge \Theta_c$` | "Faith intensity times Quantum Potential must exceed the Actualization Threshold" |
| `$\frac{A}{B}$` | "the ratio of A to B" |
| `$\nabla^2 \Psi$` | "the curvature of the Field" |

---

## ⚙️ Configuration

### Settings

**Scan Folder**
- Path to recursively scan for equations
- Example: `Papers`, `Research/Theophysics`, `Notes/Math`

**Translation Dictionary Path**
- Where to save the auto-generated master document
- Default: `Theophysics Translations/Math Dictionary.md`

**Auto-scan on startup**
- Automatically scan your folder when Obsidian opens
- Useful for keeping your dictionary up-to-date

---

## 🏗️ Architecture

### File Structure
```
Math-Translation-Layer/
├── main.ts                          # Main plugin logic, commands, UI
├── theophysics-math-translator.ts   # Translation engine (Rosetta Stone)
├── styles.css                       # UI styling
├── manifest.json                    # Plugin metadata
├── package.json                     # Dependencies
└── tsconfig.json                    # TypeScript config
```

### Translation Engine (`theophysics-math-translator.ts`)

Three-layer translation system:

**Layer 1: Full Equation Overrides**
- Matches complete equations for context-aware translation
- Highest priority - ensures theological accuracy

**Layer 2: Math Structure Grammar**
- Handles LaTeX syntax: `\frac{}{}`, `\int`, `\sqrt{}`
- Preserves mathematical relationships

**Layer 3: Symbol Vocabulary**
- Individual symbol mappings
- Core Theophysics variables: χ (Logos), Ψ_S (Soul Field), etc.

---

## 🛠️ Development

### Setup
```bash
npm install
npm run dev    # Development build with watch mode
npm run build  # Production build
```

### Adding New Translations

Edit `theophysics-math-translator.ts`:

```typescript
// Add to EQUATION_MAP for full equations
"pattern": "translation"

// Add to STRUCTURE_MAP for LaTeX structures
"\\\\command": "narrative"

// Add to SYMBOL_MAP for individual symbols
"\\\\symbol": "meaning"
```

### Testing
1. Build the plugin: `npm run build`
2. Copy `main.js`, `manifest.json`, `styles.css` to your test vault
3. Reload Obsidian
4. Test with sample equations

---

## 📚 Use Cases

### For Researchers
- Translate complex equations in real-time
- Build a searchable narrative glossary
- Bridge mathematical formalism and conceptual understanding

### For Students
- Understand physics equations in plain language
- Study Theophysics papers with narrative translations
- Create study guides with both layers

### For Writers
- Explain technical concepts to general audiences
- Generate human-readable equation descriptions
- Maintain consistency in terminology

---

## 🤝 Contributing

Contributions welcome! To add new translations:

1. Fork the repository
2. Add translations to `theophysics-math-translator.ts`
3. Test with real equations from Theophysics papers
4. Submit a Pull Request

### Translation Guidelines
- Prioritize theological accuracy over literal translation
- Use "the" for field quantities (e.g., "the Logos Field")
- Capitalize Theophysics-specific terms (Grace, Knowledge, Soul Field)
- Test with context from actual papers

---

## 📜 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built for the Theophysics Research Project - exploring the intersection of quantum mechanics, consciousness, and theology through rigorous mathematical formalism.

**"In the beginning was the Logos, and the Logos was with God, and the Logos was God."**
*John 1:1, translated through mathematics*

---

## 🔗 Links

- [Theophysics Papers](https://github.com/YellowKidokc/theophysics-papers)
- [Report Issues](https://github.com/YellowKidokc/Math-Translation-Layer/issues)
- [Obsidian Plugin Documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
