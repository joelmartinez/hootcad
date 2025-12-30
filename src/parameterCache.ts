import * as vscode from 'vscode';
import { ParameterDefinition } from './jscadEngine';

/**
 * Manages parameter value cache for JSCAD files
 * Stores user-edited parameter values per file path
 */
export class ParameterCache {
    private cache: Map<string, Record<string, any>> = new Map();
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadFromStorage();
    }

    /**
     * Get cached parameter values for a file
     */
    get(filePath: string): Record<string, any> | undefined {
        return this.cache.get(filePath);
    }

    /**
     * Set parameter values for a file
     */
    set(filePath: string, values: Record<string, any>): void {
        this.cache.set(filePath, values);
        this.saveToStorage();
    }

    /**
     * Update a single parameter value for a file
     */
    updateParameter(filePath: string, paramName: string, value: any): void {
        const current = this.cache.get(filePath) || {};
        current[paramName] = value;
        this.cache.set(filePath, current);
        this.saveToStorage();
    }

    /**
     * Get merged parameters with defaults and cached values
     */
    getMergedParameters(filePath: string, definitions: ParameterDefinition[]): Record<string, any> {
        const cached = this.cache.get(filePath) || {};
        const merged: Record<string, any> = {};

        const coerceValue = (def: ParameterDefinition, value: any): any => {
            if (value === undefined) {
                return value;
            }

            if (def.type === 'checkbox') {
                if (typeof value === 'boolean') {
                    return value;
                }
                if (typeof value === 'string') {
                    return value.toLowerCase() === 'true';
                }
                return Boolean(value);
            }

            if (def.type === 'int') {
                if (typeof value === 'number' && Number.isFinite(value)) {
                    return Math.trunc(value);
                }
                const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
                return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
            }

            if (def.type === 'number' || def.type === 'float' || def.type === 'slider') {
                if (typeof value === 'number' && Number.isFinite(value)) {
                    return value;
                }
                const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
                return Number.isFinite(parsed) ? parsed : undefined;
            }

            if (def.type === 'choice' && Array.isArray(def.values)) {
                const match = def.values.find(v => String(v) === String(value));
                return match !== undefined ? match : value;
            }

            return value;
        };

        // Start with default values from definitions
        for (const def of definitions) {
            if (def.type === 'checkbox') {
                merged[def.name] = def.checked ?? false;
            } else if (def.type === 'choice' && def.initial !== undefined) {
                merged[def.name] = def.initial;
            } else if (def.type === 'choice' && def.values && def.values.length > 0) {
                // Use first value as default when no initial value specified
                merged[def.name] = def.values[0];
            } else if (def.initial !== undefined) {
                merged[def.name] = def.initial;
            }
        }

        // Override with cached values (coerced to definition types)
        for (const def of definitions) {
            if (Object.prototype.hasOwnProperty.call(cached, def.name)) {
                const coerced = coerceValue(def, cached[def.name]);
                if (coerced !== undefined) {
                    merged[def.name] = coerced;
                }
            }
        }

        return merged;
    }

    /**
     * Clear cached values for a file
     */
    clear(filePath: string): void {
        this.cache.delete(filePath);
        this.saveToStorage();
    }

    /**
     * Clear all cached values
     */
    clearAll(): void {
        this.cache.clear();
        this.saveToStorage();
    }

    /**
     * Load cache from VS Code workspace state
     */
    private loadFromStorage(): void {
        const stored = this.context.workspaceState.get<Record<string, Record<string, any>>>('hootcad.parameterCache');
        if (stored) {
            this.cache = new Map(Object.entries(stored));
        }
    }

    /**
     * Save cache to VS Code workspace state
     */
    private saveToStorage(): void {
        const obj = Object.fromEntries(this.cache.entries());
        this.context.workspaceState.update('hootcad.parameterCache', obj);
    }
}
