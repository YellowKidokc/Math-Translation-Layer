# Theophysics Math Translation Layer

An Obsidian plugin that translates LaTeX mathematical equations into Theophysics Narrative descriptions, bridging the gap between mathematical formalism and spiritual/philosophical meaning.

## 🌟 Features

- **Instant Translation**: Select any LaTeX equation and translate it to narrative form
- **Right-Click Context Menu**: Quick access to translation directly from the editor
- **File Scanning**: Scan individual files or entire folders for mathematical expressions
- **Dictionary Export**: Generate comprehensive translation dictionaries showing all math found with their translations
- **Rescan & Update**: Keep your translation dictionary up-to-date as your vault evolves

## 📖 Example Translations

| LaTeX | Theophysics Narrative |
|-------|----------------------|
| `$\chi = \int G \cdot K$` | The Logos Field equals the integral of Grace times Knowledge |
| `$E = mc^2$` | Energy equals mass times the speed of light squared |
| `$\psi = \sin(\theta)$` | The Soul Function equals the sine of the Angle of Faith |
| `$F = ma$` | Faith equals mass times acceleration |

## 🎯 Core Symbol Mappings

### Greek Letters (Theophysics Concepts)
- `\chi` → the Logos Field
- `\psi` → the Soul Function
- `\phi` → the Divine Proportion
- `\theta` → the Angle of Faith
- `\alpha` → the Beginning Constant
- `\omega` → the End Constant
- `\lambda` → the Wavelength of Grace
- `\sigma` → the Standard Deviation of Faith

### Variables
- `G` → Grace
- `K` → Knowledge
- `F` → Faith
- `L` → Love
- `H` → Hope
- `W` → Wisdom
- `S` → Spirit
- `T` → Truth

### Operators
- `\int` → the integral
- `\sum` → the sum
- `\partial` → the partial derivative
- `\nabla` → the gradient
- `\cdot` → times

## 🚀 Installation

### Method 1: Manual Installation (For Development)

1. Clone this repository into your Obsidian vault's plugins folder:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/YellowKidokc/Math-Translation-Layer.git theophysics-math-translator
   ```

2. Navigate to the plugin directory:
   ```bash
   cd theophysics-math-translator
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the plugin:
   ```bash
   npm run build
   ```

5. Enable the plugin in Obsidian:
   - Open Settings → Community Plugins
   - Disable Safe Mode (if enabled)
   - Find "Theophysics Math Translation Layer" in your installed plugins
   - Toggle it on

### Method 2: Development Mode

For active development:
```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## 📝 Usage

### Command Palette Commands

Access these commands via `Ctrl/Cmd + P`:

1. **Translate Math to Narrative**
   - Select a mathematical equation in your note
   - Run this command to see the translation in a modal

2. **Scan Current File for Math**
   - Scans the active file for all mathematical expressions
   - Shows all found equations with their translations

3. **Scan Folder for All Math**
   - Opens a folder selector
   - Recursively scans all markdown files in the selected folder
   - Displays comprehensive results

4. **Export Translation Dictionary**
   - Exports the last scan results as a markdown file
   - Creates a timestamped dictionary file in your vault
   - Includes both unique translations and file-by-file breakdown

5. **Rescan and Update Dictionary**
   - Scans your entire vault
   - Automatically exports an updated dictionary

### Right-Click Context Menu

1. Select any text containing LaTeX (must include `$` or `\`)
2. Right-click on the selection
3. Choose "Translate to Narrative"
4. View the translation in a modal

### Ribbon Icon

Click the calculator icon in the left ribbon for quick access instructions.

## 🎨 Supported LaTeX Patterns

The translator recognizes:

- **Inline math**: `$equation$`
- **Display math**: `$$equation$$`
- **Integrals**: `\int f(x) dx`, `\int_a^b f(x) dx`
- **Sums**: `\sum_{i=1}^n x_i`
- **Fractions**: `\frac{numerator}{denominator}`
- **Square roots**: `\sqrt{x}`, `\sqrt[n]{x}`
- **Powers**: `x^2`, `x^{n+1}`
- **Greek letters**: All standard Greek symbols
- **Operators**: Standard mathematical operators
- **Functions**: `\sin`, `\cos`, `\tan`, `\log`, `\exp`, etc.

## 🔧 Customization

### Adding Custom Translations

Edit `theophysics-math-translator.ts`:

```typescript
private static symbolMap: Record<string, string> = {
    '\\chi': 'your custom translation',
    // Add more symbols...
};

private static variableMap: Record<string, string> = {
    'G': 'your custom variable meaning',
    // Add more variables...
};
```

### Adding Custom Patterns

Add special pattern matching in the `translateSpecialPatterns` method:

```typescript
// Your custom pattern
if (/your-regex-pattern/.test(expr)) {
    return "Your custom translation";
}
```

## 📂 Project Structure

```
theophysics-math-translator/
├── main.ts                          # Main plugin file
├── theophysics-math-translator.ts   # Translation engine
├── modals.ts                        # UI components
├── manifest.json                    # Plugin metadata
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── esbuild.config.mjs              # Build configuration
├── version-bump.mjs                # Version management
└── README.md                       # Documentation
```

## 🧪 Development

### Building

```bash
# Production build
npm run build

# Development mode (watch)
npm run dev
```

### Testing

1. Make changes to the source files
2. The plugin will auto-rebuild (if using `npm run dev`)
3. Reload Obsidian or run "Reload app without saving" command
4. Test your changes

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Adding New Translations

To contribute new symbol or variable translations:

1. Add entries to `symbolMap` or `variableMap` in `theophysics-math-translator.ts`
2. Follow the existing naming conventions
3. Test with example equations
4. Submit a PR with examples

## 📋 Roadmap

- [ ] Settings page for custom symbol mappings
- [ ] Support for more complex LaTeX expressions
- [ ] Custom translation templates
- [ ] Integration with templater plugin
- [ ] Export to different formats (PDF, HTML)
- [ ] Multi-language support for narratives
- [ ] Interactive translation editor
- [ ] Statistics and analytics dashboard

## 🐛 Known Issues

- Very complex nested LaTeX expressions may not translate perfectly
- Some advanced LaTeX packages are not yet supported
- Inline comments in equations are not preserved

## 📜 License

MIT License - see LICENSE file for details

## 👤 Author

**YellowKidokc**

- GitHub: [@YellowKidokc](https://github.com/YellowKidokc)
- Repository: [Math-Translation-Layer](https://github.com/YellowKidokc/Math-Translation-Layer)

## 🙏 Acknowledgments

- Built for the Obsidian community
- Inspired by the intersection of mathematics, physics, and theology
- Thanks to all contributors and testers

## 📞 Support

- Report bugs: [GitHub Issues](https://github.com/YellowKidokc/Math-Translation-Layer/issues)
- Feature requests: Open an issue with the "enhancement" label
- Questions: Start a discussion in the repository

---

**Made with ❤️ for the Theophysics community**
