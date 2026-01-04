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
import * as child_process from 'child_process';

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
	private mcpProcess: child_process.ChildProcess | null = null;
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
			
			// Start the MCP server as a child process
			this.mcpProcess = child_process.spawn(
				process.execPath, // Use Node.js executable
				[mcpServerPath],
				{
					stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
					cwd: this.context.extensionPath
				}
			);
			
			// Log stderr (server logs go here)
			this.mcpProcess.stderr?.on('data', (data) => {
				this.outputChannel.appendLine(`MCP Server: ${data.toString()}`);
			});
			
			// Handle process exit
			this.mcpProcess.on('exit', (code, signal) => {
				this.outputChannel.appendLine(`MCP server exited with code ${code}, signal ${signal}`);
				this.mcpProcess = null;
			});
			
			// Handle process errors
			this.mcpProcess.on('error', (error) => {
				this.outputChannel.appendLine(`MCP server error: ${error.message}`);
				vscode.window.showErrorMessage(`MCP server failed to start: ${error.message}`);
				this.mcpProcess = null;
			});
			
			this.outputChannel.appendLine('MCP server started successfully');
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
      "command": "${process.execPath}",
      "args": ["${mcpServerPath}"]
    }
  }
}

For Cursor or other agents:
Consult your agent's MCP configuration documentation and use:
- Command: ${process.execPath}
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
