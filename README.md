# HootCAD

VS Code extension to view JSCAD files

## Features

- **HootCAD: Open Preview** command to open a preview panel
- Activates automatically when opening `.jscad` files
- Webview panel with bidirectional messaging between extension and webview
- File save watcher that updates status when `.jscad` files are saved
- Output channel "HootCAD" for logging
- Status bar indicator showing current file and save status

## Development

### Prerequisites

- Node.js (v14 or higher)
- VS Code

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Extension (F5)

1. Open the project in VS Code
2. Press `F5` to open a new Extension Development Host window
3. In the Extension Development Host:
   - Create or open a `.jscad` file
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the command palette
   - Type "HootCAD: Open Preview" and select the command
   - The preview panel will open on the right side
4. Make changes to the extension code
5. Press `Ctrl+R` (or `Cmd+R` on Mac) in the Extension Development Host to reload the extension

### Building

To compile the extension:
```bash
npm run compile
```

To watch for changes and compile automatically:
```bash
npm run watch
```

### Testing

To run tests:
```bash
npm test
```

### Packaging and Installing Locally

1. Install `vsce` (VS Code Extension Manager):
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension into a `.vsix` file:
   ```bash
   vsce package
   ```
   This will create a file like `hootcad-0.0.1.vsix`

3. Install the `.vsix` file in VS Code:
   - **Option 1: Using Command Palette**
     - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
     - Type "Extensions: Install from VSIX..."
     - Select the generated `.vsix` file
   
   - **Option 2: Using Command Line**
     ```bash
     code --install-extension hootcad-0.0.1.vsix
     ```

4. Reload VS Code to activate the extension

### Debugging

- Set breakpoints in the TypeScript source files
- Press `F5` to start debugging
- Breakpoints will be hit in the Extension Development Host
- Use the Debug Console in VS Code to view output and evaluate expressions
- Check the "HootCAD" output channel for extension logs

## Usage

1. Open a `.jscad` file in VS Code
2. The extension will activate automatically
3. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
4. Run "HootCAD: Open Preview"
5. The preview panel will open with:
   - A title
   - A placeholder area for future JSCAD rendering
   - Status text that updates when files are saved
   - A test button to verify webview messaging

## Project Structure

- `src/extension.ts` - Main extension code
- `package.json` - Extension manifest
- `tsconfig.json` - TypeScript configuration
- `webpack.config.js` - Webpack bundler configuration
- `.vscode/` - VS Code workspace settings and launch configurations

## Notes

- This version focuses on scaffolding and the development loop
- JSCAD library integration and 3D rendering will be added in future versions
- The webview supports bidirectional messaging for future interactivity
