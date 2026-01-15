/**
 * MCP Manager - Manages the lifecycle of the HootCAD MCP server
 * 
 * Responsibilities:
 * - Start and stop the MCP server process
 * - Track MCP server state
 * - Handle user prompts and configuration
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as childProcess from 'child_process';

/**
 * Configuration keys for MCP settings
 */
const CONFIG_KEY_ENABLED = 'hootcad.mcp.enabled';
const CONFIG_KEY_DONT_ASK = 'hootcad.mcp.dontAskAgain';

/**
 * Manages the MCP server lifecycle
 */
export class McpManager {
	private context: vscode.ExtensionContext;
	private mcpProcess: childProcess.ChildProcess | null = null;
	private outputChannel: vscode.OutputChannel;
	
	constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
		this.context = context;
		this.outputChannel = outputChannel;
	}
	
	/**
	 * Check if MCP is enabled in settings
	 */
	private isMcpEnabled(): boolean {
		return this.context.globalState.get(CONFIG_KEY_ENABLED, false);
	}
	
	/**
	 * Check if user has opted out of prompts
	 */
	private shouldPrompt(): boolean {
		return !this.context.globalState.get(CONFIG_KEY_DONT_ASK, false);
	}
	
	/**
	 * Show first-run prompt to enable MCP server
	 */
	async showEnablementPrompt(): Promise<void> {
		// Don't show if already enabled or user opted out
		if (this.isMcpEnabled() || !this.shouldPrompt()) {
			return;
		}
		
		const choice = await vscode.window.showInformationMessage(
			'HootCAD can enable a local validation server so coding agents can safely evaluate math and validate models. This is optional and requires your approval.',
			'Enable',
			'Not Now',
			"Don't Ask Again"
		);
		
		if (choice === 'Enable') {
			await this.enableMcpServer();
		} else if (choice === "Don't Ask Again") {
			await this.context.globalState.update(CONFIG_KEY_DONT_ASK, true);
		}
	}
	
	/**
	 * Enable the MCP server via command
	 */
	async enableMcpServer(): Promise<void> {
		await this.context.globalState.update(CONFIG_KEY_ENABLED, true);
		await this.startMcpServer();
		
		// Show configuration guidance
		await this.showConfigurationGuidance();
		
		vscode.window.showInformationMessage('HootCAD MCP Validation Server enabled');
	}
	
	private async trySpawnMcpServer(command: string, args: string[]): Promise<boolean> {
		return await new Promise<boolean>((resolve) => {
			let started = false;

			const proc = childProcess.spawn(command, args, {
				stdio: ['pipe', 'pipe', 'pipe'],
				cwd: this.context.extensionPath
			});

			const startTimeout = setTimeout(() => {
				// If we didn't see the startup banner quickly, treat as not started
				// (this handles cases where the command launches an Electron GUI process instead).
				if (!started) {
					try {
						proc.kill();
					} catch {
						// ignore
					}
					resolve(false);
				}
			}, 2000);

			proc.stderr?.on('data', (data) => {
				const text = data.toString();
				this.outputChannel.appendLine(`MCP Server: ${text}`);
				if (!started && text.includes('HootCAD MCP server started')) {
					started = true;
					clearTimeout(startTimeout);
					this.mcpProcess = proc;
					// Attach lifecycle handlers now that we've accepted this process
					this.mcpProcess.on('exit', (code, signal) => {
						this.outputChannel.appendLine(`MCP server exited with code ${code}, signal ${signal}`);
						this.mcpProcess = null;
					});
					this.mcpProcess.on('error', (error) => {
						this.outputChannel.appendLine(`MCP server error: ${error.message}`);
						vscode.window.showErrorMessage(`MCP server failed to start: ${error.message}`);
						this.mcpProcess = null;
					});
					resolve(true);
				}
			});

			proc.on('exit', () => {
				clearTimeout(startTimeout);
				if (!started) {
					resolve(false);
				}
			});

			proc.on('error', () => {
				clearTimeout(startTimeout);
				if (!started) {
					resolve(false);
				}
			});
		});
	}

	/**
	 * Start the MCP server process
	 */
	async startMcpServer(): Promise<void> {
		if (this.mcpProcess) {
			this.outputChannel.appendLine('MCP server already running');
			return;
		}
		
		try {
			// Get the path to the compiled MCP server
			// In development, it's in dist/mcpServer.js
			// After packaging, it's bundled with the extension
			const mcpServerPath = path.join(this.context.extensionPath, 'dist', 'mcpServer.js');
			
			this.outputChannel.appendLine(`Starting MCP server: ${mcpServerPath}`);

			// Try without any Electron flags first (works for VS Code's "Code Helper (Plugin)" on macOS)
			const startedWithoutFlag = await this.trySpawnMcpServer(process.execPath, [mcpServerPath]);
			if (startedWithoutFlag) {
				this.outputChannel.appendLine('MCP server started successfully');
				return;
			}

			// Fallback: if execPath is truly an Electron binary, it may require this flag
			const startedWithFlag = await this.trySpawnMcpServer(
				process.execPath,
				['--ms-enable-electron-run-as-node', mcpServerPath]
			);
			if (startedWithFlag) {
				this.outputChannel.appendLine('MCP server started successfully');
				return;
			}

			throw new Error('MCP server failed to start (see output for details)');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.outputChannel.appendLine(`Failed to start MCP server: ${errorMessage}`);
			vscode.window.showErrorMessage(`Failed to start MCP server: ${errorMessage}`);
		}
	}
	
	/**
	 * Stop the MCP server process
	 */
	stopMcpServer(): void {
		if (this.mcpProcess) {
			this.outputChannel.appendLine('Stopping MCP server');
			this.mcpProcess.kill();
			this.mcpProcess = null;
		}
	}
	
	/**
	 * Show configuration guidance for agent integration
	 */
	private async showConfigurationGuidance(): Promise<void> {
		const mcpServerPath = path.join(this.context.extensionPath, 'dist', 'mcpServer.js');
		
		const configText = `
HootCAD MCP Server Configuration
=================================

To use the MCP server with your coding agent, add this configuration:

For GitHub Copilot / VS Code MCP:
{
  "mcpServers": {
    "hootcad": {
	  "command": "node",
	  "args": ["${mcpServerPath}"]
    }
  }
}

For Cursor or other agents:
Consult your agent's MCP configuration documentation and use:
- Command: node (or absolute path to your Node.js executable)
- Script: ${mcpServerPath}

The server exposes a "math.eval" tool for safe numeric expression evaluation.
`;
		
		const choice = await vscode.window.showInformationMessage(
			'MCP server configuration ready',
			'Copy Configuration',
			'Dismiss'
		);
		
		if (choice === 'Copy Configuration') {
			await vscode.env.clipboard.writeText(configText);
			vscode.window.showInformationMessage('Configuration copied to clipboard');
		}
	}
	
	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this.stopMcpServer();
	}
}
