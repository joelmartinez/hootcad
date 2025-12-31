import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';
import * as vm from 'vm';

function getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message;
    }
    return String(error);
}

function getErrorStack(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'stack' in error && typeof (error as any).stack === 'string') {
        return (error as any).stack;
    }
    return undefined;
}

function loadJscadModuleFromFile(filePath: string, outputChannel: vscode.OutputChannel): any {
    // Use eval to get the real Node.js require (bypasses webpack)
    const nodeRequire = eval('require');

    // Create a require function from the extension's context so it can find @jscad modules
    const extensionRequire = createRequire(path.join(__dirname, '..', 'package.json'));

    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Create a custom require that tries both the file's directory and extension's node_modules
    const customRequire = (moduleName: string) => {
        // Handle relative requires (./ or ../)
        if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
            const resolvedPath = path.resolve(dirname, moduleName);
            // If it's a .jscad file, load it recursively
            if (resolvedPath.endsWith('.jscad')) {
                return loadJscadModuleFromFile(resolvedPath, outputChannel);
            }
            // Otherwise use standard Node require
            return nodeRequire(resolvedPath);
        }
        
        try {
            // First try to require from the file's directory / Node resolution
            return nodeRequire(moduleName);
        } catch (e) {
            // Fallback to extension's node_modules
            return extensionRequire(moduleName);
        }
    };

    const module = { exports: {} as any };
    const dirname = path.dirname(filePath);

    // Execute the JSCAD file in a VM context with filename so stack traces show real locations.
    const context = vm.createContext({
        require: customRequire,
        module,
        exports: module.exports,
        __filename: filePath,
        __dirname: dirname,
        console
    });

    const script = new vm.Script(fileContent, { filename: filePath });
    script.runInContext(context);

    return module.exports;
}

export interface JscadEntrypoint {
    filePath: string;
    source: 'package.json' | 'index.jscad' | 'active-editor';
}

export interface ResolveJscadEntrypointOptions {
    /**
     * Overrides the workspace root folder for entrypoint resolution.
     * When omitted, uses VS Code's current workspace.
     */
    workspaceRoot?: string;

    /**
     * Overrides the active editor file path used for the final fallback.
     * When omitted, uses VS Code's active editor.
     */
    activeEditorFilePath?: string | null;
}

export interface ParameterDefinition {
    name: string;
    type: 'number' | 'float' | 'int' | 'slider' | 'text' | 'checkbox' | 'choice' | 'color' | 'date' | 'email' | 'password' | 'url';
    initial?: any;
    caption?: string;
    // For number/int/slider
    min?: number;
    max?: number;
    step?: number;
    // For checkbox
    checked?: boolean;
    // For choice
    values?: any[];
    captions?: string[];
}

/**
 * Resolves the JSCAD entrypoint using the following priority:
 * 1. Workspace package.json "main" field (if it's a .jscad file)
 * 2. Workspace index.jscad
 * 3. Active editor .jscad file
 * 4. Error if none found
 */
export function resolveJscadEntrypoint(): JscadEntrypoint | null {
    return resolveJscadEntrypointWithOptions({});
}

/**
 * Internal implementation with injectable inputs for testing.
 */
export function resolveJscadEntrypointWithOptions(options: ResolveJscadEntrypointOptions): JscadEntrypoint | null {
    const workspaceRoot = options.workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        // No workspace, try active editor
        return resolveFromActiveEditor(options.activeEditorFilePath);
    }

    // 1. Check package.json main field
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (packageJson.main && typeof packageJson.main === 'string') {
                const mainPath = path.resolve(workspaceRoot, packageJson.main);
                if (mainPath.endsWith('.jscad') && fs.existsSync(mainPath)) {
                    return {
                        filePath: mainPath,
                        source: 'package.json'
                    };
                }
            }
        } catch (error) {
            // Invalid package.json, continue to next option
        }
    }

    // 2. Check for index.jscad at workspace root
    const indexJscadPath = path.join(workspaceRoot, 'index.jscad');
    if (fs.existsSync(indexJscadPath)) {
        return {
            filePath: indexJscadPath,
            source: 'index.jscad'
        };
    }

    // 3. Fallback to active editor
    return resolveFromActiveEditor(options.activeEditorFilePath);
}

function resolveFromActiveEditor(activeEditorFilePath?: string | null): JscadEntrypoint | null {
    const editorFilePath = activeEditorFilePath ?? vscode.window.activeTextEditor?.document.fileName;
    if (editorFilePath && editorFilePath.endsWith('.jscad')) {
        return {
            filePath: editorFilePath,
            source: 'active-editor'
        };
    }
    return null;
}

/**
 * Gets parameter definitions from a JSCAD file
 */
export async function getParameterDefinitions(filePath: string, outputChannel: vscode.OutputChannel): Promise<ParameterDefinition[]> {
    try {
        outputChannel.appendLine(`Getting parameter definitions from: ${filePath}`);

        const jscadModule = loadJscadModuleFromFile(filePath, outputChannel) as any;

        // Check if getParameterDefinitions function exists
        if (jscadModule.getParameterDefinitions && typeof jscadModule.getParameterDefinitions === 'function') {
            const definitions = jscadModule.getParameterDefinitions();
            outputChannel.appendLine(`Found ${definitions.length} parameter definition(s)`);
            return definitions;
        }

        // No parameter definitions
        outputChannel.appendLine('No parameter definitions found');
        return [];
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        outputChannel.appendLine(`Error getting parameter definitions: ${errorMessage}`);
        // Return empty array on error
        return [];
    }
}

/**
 * Executes a JSCAD file and returns renderer-ready entities
 */
export async function executeJscadFile(filePath: string, outputChannel: vscode.OutputChannel, params?: Record<string, any>): Promise<any[]> {
    // Create a require function from the extension's context so it can find @jscad modules
    const extensionRequire = createRequire(path.join(__dirname, '..', 'package.json'));
    
    try {
        outputChannel.appendLine(`Executing JSCAD file: ${filePath}`);

        const jscadModule = loadJscadModuleFromFile(filePath, outputChannel) as any;

        // Check if main function exists
        if (!jscadModule.main || typeof jscadModule.main !== 'function') {
            throw new Error('JSCAD file must export a main() function');
        }

        // Execute main with provided parameters or empty object
        const mainParams = params || {};
        const result = jscadModule.main(mainParams);

        outputChannel.appendLine('JSCAD main() executed successfully');

        // Ensure result is an array
        const geometries = Array.isArray(result) ? result : [result];
        
        outputChannel.appendLine(`Executed JSCAD main() - returned ${geometries.length} geometry object(s)`);
        
        // Serialize geometries for webview
        // We return raw JSCAD geometries (geom3/geom2) and let the webview handle conversion to Three.js
        const serializedGeometries = geometries.map((geom: any, i: number) => {
            // Detect geometry type
            const hasPolygons = geom && Array.isArray(geom.polygons);
            const hasSides = geom && Array.isArray(geom.sides);
            
            if (hasPolygons) {
                // geom3 (3D solid)
                outputChannel.appendLine(`  [${i}] geom3 with ${geom.polygons.length} polygons`);
                
                return {
                    type: 'geom3',
                    polygons: geom.polygons,
                    transforms: geom.transforms,
                    color: geom.color
                };
            } else if (hasSides) {
                // geom2 (2D path)
                outputChannel.appendLine(`  [${i}] geom2 with ${geom.sides.length} sides`);
                
                return {
                    type: 'geom2',
                    sides: geom.sides,
                    transforms: geom.transforms,
                    color: geom.color
                };
            } else {
                outputChannel.appendLine(`  [${i}] Unknown geometry type - keys: ${Object.keys(geom).join(', ')}`);
                return {
                    type: 'unknown',
                    data: geom
                };
            }
        });
        
        return serializedGeometries;
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        outputChannel.appendLine(`Error executing JSCAD file: ${errorMessage}`);
        const stack = getErrorStack(error);
        if (stack) {
            outputChannel.appendLine(stack);
        }
        throw error;
    }
}
