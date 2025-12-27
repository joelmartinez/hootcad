import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel;
let currentPanel: vscode.WebviewPanel | undefined;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	// Create output channel
	outputChannel = vscode.window.createOutputChannel("HootCAD");
	context.subscriptions.push(outputChannel);
	
	outputChannel.appendLine('HootCAD extension activated');

	// Create status bar item
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "HootCAD: Ready";
	context.subscriptions.push(statusBarItem);
	statusBarItem.show();

	// Register the "Open Preview" command
	const openPreviewCommand = vscode.commands.registerCommand('hootcad.openPreview', () => {
		outputChannel.appendLine('Opening HootCAD preview...');
		createOrShowPreview(context);
	});
	context.subscriptions.push(openPreviewCommand);

	// Watch for file saves
	const saveWatcher = vscode.workspace.onDidSaveTextDocument((document) => {
		if (document.fileName.endsWith('.jscad')) {
			const fileName = document.fileName.split('/').pop() || document.fileName;
			outputChannel.appendLine(`File saved: ${fileName}`);
			statusBarItem.text = `HootCAD: Saved ${fileName}`;
			
			// Send message to webview if it exists
			if (currentPanel) {
				currentPanel.webview.postMessage({
					type: 'fileSaved',
					fileName: fileName
				});
			}
			
			// Reset status after 3 seconds
			setTimeout(() => {
				statusBarItem.text = "HootCAD: Ready";
			}, 3000);
		}
	});
	context.subscriptions.push(saveWatcher);

	// Watch for active editor changes
	const editorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor && editor.document.fileName.endsWith('.jscad')) {
			const fileName = editor.document.fileName.split('/').pop() || editor.document.fileName;
			outputChannel.appendLine(`Active file: ${fileName}`);
			statusBarItem.text = `HootCAD: ${fileName}`;
		}
	});
	context.subscriptions.push(editorWatcher);
}

function createOrShowPreview(context: vscode.ExtensionContext) {
	// If panel already exists, reveal it
	if (currentPanel) {
		currentPanel.reveal(vscode.ViewColumn.Two);
		return;
	}

	// Create new webview panel
	currentPanel = vscode.window.createWebviewPanel(
		'hootcadPreview',
		'HootCAD Preview',
		vscode.ViewColumn.Two,
		{
			enableScripts: true,
			retainContextWhenHidden: true
		}
	);

	// Set HTML content
	currentPanel.webview.html = getWebviewContent();

	// Handle messages from webview
	currentPanel.webview.onDidReceiveMessage(
		message => {
			switch (message.type) {
				case 'info':
					outputChannel.appendLine(`Webview message: ${message.text}`);
					vscode.window.showInformationMessage(message.text);
					return;
				case 'ready':
					outputChannel.appendLine('Webview is ready');
					// Send initial message to webview
					currentPanel?.webview.postMessage({
						type: 'extensionMessage',
						text: 'Hello from extension!'
					});
					return;
			}
		},
		undefined,
		context.subscriptions
	);

	// Reset panel when disposed
	currentPanel.onDidDispose(
		() => {
			currentPanel = undefined;
			outputChannel.appendLine('Preview panel closed');
		},
		null,
		context.subscriptions
	);

	outputChannel.appendLine('Preview panel created');
}

function getWebviewContent(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>HootCAD Preview</title>
	<style>
		body {
			padding: 20px;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
		}
		h1 {
			color: var(--vscode-editor-foreground);
			border-bottom: 1px solid var(--vscode-panel-border);
			padding-bottom: 10px;
		}
		#preview-area {
			margin-top: 20px;
			padding: 20px;
			border: 2px dashed var(--vscode-panel-border);
			border-radius: 5px;
			min-height: 300px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-direction: column;
		}
		#status {
			margin-top: 10px;
			padding: 10px;
			background-color: var(--vscode-editor-inactiveSelectionBackground);
			border-radius: 3px;
		}
		button {
			margin-top: 10px;
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 2px;
			cursor: pointer;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<h1>HootCAD Preview</h1>
	<div id="preview-area">
		<p>Preview area placeholder</p>
		<p>JSCAD rendering will be implemented here</p>
	</div>
	<div id="status">Status: Initializing...</div>
	<button id="testButton">Send Message to Extension</button>

	<script>
		const vscode = acquireVsCodeApi();
		const statusElement = document.getElementById('status');

		// Send ready message to extension
		vscode.postMessage({ type: 'ready' });

		// Handle button click
		document.getElementById('testButton').addEventListener('click', () => {
			vscode.postMessage({ 
				type: 'info', 
				text: 'Hello from webview!' 
			});
		});

		// Listen for messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.type) {
				case 'extensionMessage':
					statusElement.textContent = 'Status: ' + message.text;
					break;
				case 'fileSaved':
					statusElement.textContent = 'Status: File saved - ' + message.fileName;
					break;
			}
		});
	</script>
</body>
</html>`;
}

export function deactivate() {
	if (outputChannel) {
		outputChannel.appendLine('HootCAD extension deactivated');
		outputChannel.dispose();
	}
}
