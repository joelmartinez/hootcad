import * as vscode from 'vscode';
import { resolveJscadEntrypoint, executeJscadFile, getParameterDefinitions } from './jscadEngine';
import { ParameterCache } from './parameterCache';

let outputChannel: vscode.OutputChannel;
let currentPanel: vscode.WebviewPanel | undefined;
let statusBarItem: vscode.StatusBarItem;
let parameterCache: ParameterCache;

/**
 * Extracts the filename from a file path, handling both Unix and Windows path separators.
 * @param filePath The full file path
 * @returns The filename, or 'preview' as fallback
 */
export function extractFilename(filePath: string): string {
	return filePath.split(/[/\\]/).pop() || 'preview';
}

/**
 * Formats a preview window title with the owl emoji and filename.
 * @param filePath The full file path
 * @returns The formatted title (e.g., "🦉 filename.jscad")
 */
export function formatPreviewTitle(filePath: string): string {
	const fileName = extractFilename(filePath);
	return `🦉 ${fileName}`;
}

export function activate(context: vscode.ExtensionContext) {
	// Create output channel
	outputChannel = vscode.window.createOutputChannel("HootCAD");
	context.subscriptions.push(outputChannel);
	
	outputChannel.appendLine('HootCAD extension activated');

	// Initialize parameter cache
	parameterCache = new ParameterCache(context);

	// Create status bar item
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "HootCAD: Ready";
	context.subscriptions.push(statusBarItem);
	statusBarItem.show();

	// Register the "Open Preview" command
	const openPreviewCommand = vscode.commands.registerCommand('hootcad.openPreview', async () => {
		outputChannel.appendLine('Opening HootCAD preview...');
		await createOrShowPreview(context);
	});
	context.subscriptions.push(openPreviewCommand);

	// Watch for file saves
	const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
		if (document.fileName.endsWith('.jscad')) {
			const fileName = extractFilename(document.fileName);
			outputChannel.appendLine(`File saved: ${fileName}`);
			statusBarItem.text = `HootCAD: Saved ${fileName}`;
			
			// Re-execute and re-render if panel is open
			if (currentPanel) {
				const entrypoint = resolveJscadEntrypoint();
				if (entrypoint) {
					await executeAndRender(entrypoint.filePath);
				}
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
			const fileName = extractFilename(editor.document.fileName);
			outputChannel.appendLine(`Active file: ${fileName}`);
			statusBarItem.text = `HootCAD: ${fileName}`;
		}
	});
	context.subscriptions.push(editorWatcher);
}

async function createOrShowPreview(context: vscode.ExtensionContext) {
	// Resolve JSCAD entrypoint
	const entrypoint = resolveJscadEntrypoint();
	
	if (!entrypoint) {
		const errorMsg = 'No JSCAD entrypoint found. Open a .jscad file or define one in package.json.';
		outputChannel.appendLine(`Error: ${errorMsg}`);
		vscode.window.showErrorMessage(errorMsg);
		return;
	}

	outputChannel.appendLine(`Resolved entrypoint: ${entrypoint.filePath} (source: ${entrypoint.source})`);

	// Format the preview window title
	const title = formatPreviewTitle(entrypoint.filePath);

	// If panel already exists, reveal it
	if (currentPanel) {
		currentPanel.title = title;
		currentPanel.reveal(vscode.ViewColumn.Two);
		// Re-execute and render
		await executeAndRender(entrypoint.filePath);
		return;
	}

	// Create new webview panel
	currentPanel = vscode.window.createWebviewPanel(
		'hootcadPreview',
		title,
		vscode.ViewColumn.Two,
		{
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [
				vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'three', 'build')
			]
		}
	);

	// Set HTML content
	currentPanel.webview.html = getWebviewContent(context, currentPanel.webview);

	// Handle messages from webview
	currentPanel.webview.onDidReceiveMessage(
		async message => {
			switch (message.type) {
				case 'info':
					outputChannel.appendLine(`Webview message: ${message.text}`);
					vscode.window.showInformationMessage(message.text);
					return;
				case 'ready':
					outputChannel.appendLine('Webview is ready');
					// Execute and render the JSCAD file
					await executeAndRender(entrypoint.filePath);
					return;
				case 'parameterChanged':
					outputChannel.appendLine(`Parameter changed: ${message.name} = ${message.value}`);
					// Update cache
					parameterCache.updateParameter(message.filePath, message.name, message.value);
					// Re-render with new parameters
					await executeAndRender(message.filePath);
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

async function executeAndRender(filePath: string) {
	let lastParams: Record<string, any> | undefined;
	try {
		outputChannel.appendLine(`Executing JSCAD file: ${filePath}`);
		statusBarItem.text = "HootCAD: Executing...";

		// Get parameter definitions
		const definitions = await getParameterDefinitions(filePath, outputChannel);
		
		// Get merged parameters (defaults + cached values)
		const params = parameterCache.getMergedParameters(filePath, definitions);
		lastParams = params;

		// Execute with parameters
		const entities = await executeJscadFile(filePath, outputChannel, params);

		if (currentPanel) {
			// Send both entities and parameter UI data to webview
			currentPanel.webview.postMessage({
				type: 'renderEntities',
				entities: entities,
				parameters: {
					definitions: definitions,
					values: params,
					filePath: filePath
				}
			});
			outputChannel.appendLine('Render entities sent to webview');
			statusBarItem.text = "HootCAD: Rendered";
			
			// Reset status after 3 seconds
			setTimeout(() => {
				statusBarItem.text = "HootCAD: Ready";
			}, 3000);
		}
	} catch (error) {
		const errorMsg = (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string')
			? (error as any).message
			: String(error);
		outputChannel.appendLine(`Execution failed: ${errorMsg}`);

		// Best-effort parameter snapshot to help users troubleshoot.
		try {
			const snapshotParams = lastParams;
			if (!snapshotParams) {
				throw new Error('No parameter snapshot available');
			}
			const snapshot = JSON.stringify(snapshotParams, Object.keys(snapshotParams).sort(), 2);
			// Avoid flooding the output.
			const maxLen = 10_000;
			outputChannel.appendLine('Parameter snapshot:');
			outputChannel.appendLine(snapshot.length > maxLen ? snapshot.slice(0, maxLen) + '\n… (truncated)' : snapshot);
		} catch (e) {
			outputChannel.appendLine('Parameter snapshot: <unavailable>');
		}

		// Source location reporting from stack trace, when available.
		const stack = (error && typeof error === 'object' && 'stack' in error && typeof (error as any).stack === 'string')
			? (error as any).stack
			: undefined;
		if (stack) {
			const escaped = filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const match = stack.match(new RegExp(`${escaped}:(\\d+):(\\d+)`));
			if (match) {
				outputChannel.appendLine(`Source location: ${filePath}:${match[1]}:${match[2]}`);
			}
		}

		vscode.window.showErrorMessage(`JSCAD execution failed: ${errorMsg} (see Output → HootCAD for details)`);
		statusBarItem.text = "HootCAD: Error";
		
		if (currentPanel) {
			currentPanel.webview.postMessage({
				type: 'error',
				message: errorMsg
			});
		}
	}
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
	// Get Three.js library paths
	const threePath = vscode.Uri.joinPath(
		context.extensionUri,
		'node_modules',
		'three',
		'build',
		'three.module.js'
	);
	
	const threeUri = webview.asWebviewUri(threePath);

	// Include the converter module inline
	const converterModule = `
		// JSCAD to Three.js converter (inline)
		function triangulatePolygon(vertices) {
			if (vertices.length < 3) return [];
			const triangles = [];
			for (let i = 1; i < vertices.length - 1; i++) {
				triangles.push([0, i, i + 1]);
			}
			return triangles;
		}

		function convertGeom3ToBufferGeometry(geom3, THREE) {
			const positions = [];
			const normals = [];
			
			for (const polygon of geom3.polygons) {
				const vertices = polygon.vertices;
				if (vertices.length < 3) continue;
				
				// Compute face normal
				const v0 = vertices[0];
				const v1 = vertices[1];
				const v2 = vertices[2];
				
				const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
				const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
				
				const normal = [
					edge1[1] * edge2[2] - edge1[2] * edge2[1],
					edge1[2] * edge2[0] - edge1[0] * edge2[2],
					edge1[0] * edge2[1] - edge1[1] * edge2[0]
				];
				
				const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
				if (length > 0) {
					normal[0] /= length;
					normal[1] /= length;
					normal[2] /= length;
				}
				
				const triangles = triangulatePolygon(vertices);
				
				for (const triangle of triangles) {
					for (const vertexIndex of triangle) {
						const vertex = vertices[vertexIndex];
						positions.push(vertex[0], vertex[1], vertex[2]);
						normals.push(normal[0], normal[1], normal[2]);
					}
				}
			}
			
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
			geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
			return geometry;
		}

		function convertGeom2ToLineGeometry(geom2, THREE) {
			const positions = [];
			for (const side of geom2.sides) {
				if (side.length === 2) {
					positions.push(side[0][0], side[0][1], 0);
					positions.push(side[1][0], side[1][1], 0);
				}
			}
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
			return geometry;
		}
	`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>HootCAD Preview</title>
	<style>
		:root {
			--hoot-param-panel-bg: color-mix(in srgb, var(--vscode-editorWidget-background) 88%, transparent);
			--hoot-param-panel-hover-bg: color-mix(in srgb, var(--vscode-list-hoverBackground) 70%, transparent);
			--hoot-param-muted-fg: color-mix(in srgb, var(--vscode-foreground) 50%, transparent);
		}
		body {
			margin: 0;
			padding: 0;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			overflow: hidden;
		}
		#container {
			display: flex;
			flex-direction: column;
			height: 100vh;
		}
		#header {
			padding: 10px 20px;
			border-bottom: 1px solid var(--vscode-panel-border);
		}
		h1 {
			margin: 0;
			font-size: 16px;
			color: var(--vscode-editor-foreground);
		}
		#canvas-container {
			flex: 1;
			position: relative;
			background-color: #2d2d2d;
		}
		#renderCanvas {
			width: 100%;
			height: 100%;
			display: block;
		}
		#status {
			padding: 8px 20px;
			background-color: var(--vscode-editor-inactiveSelectionBackground);
			border-top: 1px solid var(--vscode-panel-border);
			font-size: 12px;
		}
		#error-message {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background-color: var(--vscode-inputValidation-errorBackground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			color: var(--vscode-errorForeground);
			padding: 20px;
			border-radius: 4px;
			display: none;
			max-width: 80%;
			text-align: center;
		}
		.loading {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			color: var(--vscode-foreground);
		}
		#parameter-panel {
			position: absolute;
			top: 20px;
			right: 20px;
			background-color: var(--hoot-param-panel-bg);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 6px;
			min-width: 250px;
			max-width: 400px;
			max-height: calc(100vh - 200px);
			display: none;
			flex-direction: column;
			box-shadow: 0 4px 12px var(--vscode-widget-shadow);
			backdrop-filter: blur(4px);
		}
		#parameter-panel.visible {
			display: flex;
		}
		#parameter-header {
			padding: 12px 16px;
			border-bottom: 1px solid var(--vscode-panel-border);
			display: flex;
			justify-content: space-between;
			align-items: center;
			cursor: pointer;
			user-select: none;
		}
		#parameter-header:hover {
			background-color: var(--hoot-param-panel-hover-bg);
		}
		#parameter-title {
			font-size: 14px;
			font-weight: 600;
			color: var(--vscode-foreground);
		}
		#collapse-button {
			background: none;
			border: none;
			color: var(--vscode-foreground);
			cursor: pointer;
			font-size: 16px;
			padding: 0;
			width: 20px;
			text-align: center;
		}
		#parameter-content {
			overflow-y: auto;
			padding: 16px;
		}
		#parameter-content.collapsed {
			display: none;
		}
		.parameter-item {
			margin-bottom: 16px;
		}
		.parameter-label {
			display: block;
			margin-bottom: 6px;
			font-size: 12px;
			color: var(--hoot-param-muted-fg);
			font-weight: 500;
		}
		.parameter-input {
			width: 100%;
			padding: 6px 8px;
			background-color: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border);
			color: var(--vscode-input-foreground);
			border-radius: 3px;
			font-size: 13px;
			font-family: var(--vscode-font-family);
		}
		.parameter-input:focus {
			outline: none;
			border-color: var(--vscode-focusBorder);
		}
		.parameter-checkbox {
			width: auto;
			margin-right: 8px;
		}
		.parameter-checkbox-label {
			display: flex;
			align-items: center;
			cursor: pointer;
		}
		.parameter-slider {
			width: 100%;
		}
		.parameter-value {
			font-size: 11px;
			color: var(--hoot-param-muted-fg);
			margin-top: 4px;
		}
	</style>
</head>
<body>
	<div id="container">
		<div id="header">
			<h1>HootCAD Preview</h1>
		</div>
		<div id="canvas-container">
			<canvas id="renderCanvas"></canvas>
			<div id="loading" class="loading">Loading...</div>
			<div id="error-message"></div>
			<div id="parameter-panel">
				<div id="parameter-header">
					<div id="parameter-title">Parameters</div>
					<button id="collapse-button" title="Collapse/Expand">▼</button>
				</div>
				<div id="parameter-content"></div>
			</div>
		</div>
		<div id="status">Status: Initializing...</div>
	</div>

	<script type="module">
		${converterModule}
		
		import * as THREE from '${threeUri}';
		
		const vscode = acquireVsCodeApi();
		const canvas = document.getElementById('renderCanvas');
		const statusElement = document.getElementById('status');
		const loadingElement = document.getElementById('loading');
		const errorElement = document.getElementById('error-message');
		const parameterPanel = document.getElementById('parameter-panel');
		const parameterContent = document.getElementById('parameter-content');
		const collapseButton = document.getElementById('collapse-button');
		
		// Three.js scene setup
		let scene, camera, renderer, controls;
		let meshGroup = new THREE.Group();
		let animationFrameId = null;
		
		// Initialize Three.js
		function initThreeJS() {
			// Scene
			scene = new THREE.Scene();
			scene.background = new THREE.Color(0x2d2d2d);
			
			// Camera
			const aspect = canvas.clientWidth / canvas.clientHeight;
			camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
			camera.position.set(30, 30, 30);
			camera.lookAt(0, 0, 0);
			
			// Renderer
			renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
			renderer.setSize(canvas.clientWidth, canvas.clientHeight);
			renderer.setPixelRatio(window.devicePixelRatio);
			
			// Lights
			const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
			scene.add(ambientLight);
			
			const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
			directionalLight1.position.set(10, 10, 10);
			scene.add(directionalLight1);
			
			const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
			directionalLight2.position.set(-10, -10, -5);
			scene.add(directionalLight2);
			
			// Grid and axes
			const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
			scene.add(gridHelper);
			
			const axesHelper = new THREE.AxesHelper(15);
			scene.add(axesHelper);
			
			// Add mesh group
			scene.add(meshGroup);
			
			// Basic orbit controls (manual implementation)
			setupControls();
			
			// Handle window resize
			window.addEventListener('resize', onWindowResize);
			
			// Start render loop
			animate();
			
			console.log('Three.js initialized');
			statusElement.textContent = 'Status: Ready';
			loadingElement.style.display = 'none';
		}
		
		function setupControls() {
			let isDragging = false;
			let previousMousePosition = { x: 0, y: 0 };
			let cameraRotation = { theta: Math.PI / 4, phi: Math.PI / 4 };
			let cameraDistance = 50;
			
			canvas.addEventListener('mousedown', (e) => {
				isDragging = true;
				previousMousePosition = { x: e.clientX, y: e.clientY };
			});
			
			canvas.addEventListener('mousemove', (e) => {
				if (!isDragging) return;
				
				const deltaX = e.clientX - previousMousePosition.x;
				const deltaY = e.clientY - previousMousePosition.y;
				
				cameraRotation.theta -= deltaX * 0.01;
				cameraRotation.phi -= deltaY * 0.01;
				cameraRotation.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraRotation.phi));
				
				updateCameraPosition();
				
				previousMousePosition = { x: e.clientX, y: e.clientY };
			});
			
			canvas.addEventListener('mouseup', () => {
				isDragging = false;
			});
			
			canvas.addEventListener('mouseleave', () => {
				isDragging = false;
			});
			
			canvas.addEventListener('wheel', (e) => {
				e.preventDefault();
				cameraDistance += e.deltaY * 0.05;
				cameraDistance = Math.max(5, Math.min(200, cameraDistance));
				updateCameraPosition();
			});
			
			function updateCameraPosition() {
				camera.position.x = cameraDistance * Math.sin(cameraRotation.phi) * Math.cos(cameraRotation.theta);
				camera.position.y = cameraDistance * Math.cos(cameraRotation.phi);
				camera.position.z = cameraDistance * Math.sin(cameraRotation.phi) * Math.sin(cameraRotation.theta);
				camera.lookAt(0, 0, 0);
			}
		}
		
		function onWindowResize() {
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		}
		
		function animate() {
			animationFrameId = requestAnimationFrame(animate);
			renderer.render(scene, camera);
		}
		
		function clearScene() {
			while (meshGroup.children.length > 0) {
				const child = meshGroup.children[0];
				meshGroup.remove(child);
				if (child.geometry) child.geometry.dispose();
				if (child.material) child.material.dispose();
			}
		}
		
		function renderGeometries(geometries) {
			console.log('Rendering', geometries.length, 'geometries');
			clearScene();
			
			for (const geom of geometries) {
				try {
					if (geom.type === 'geom3') {
						const geometry = convertGeom3ToBufferGeometry(geom, THREE);
						const material = new THREE.MeshStandardMaterial({
							color: 0x4488ff,
							metalness: 0.3,
							roughness: 0.7,
							side: THREE.DoubleSide
						});
						const mesh = new THREE.Mesh(geometry, material);
						meshGroup.add(mesh);
						console.log('Added geom3 mesh');
					} else if (geom.type === 'geom2') {
						const geometry = convertGeom2ToLineGeometry(geom, THREE);
						const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
						const line = new THREE.LineSegments(geometry, material);
						meshGroup.add(line);
						console.log('Added geom2 lines');
					}
				} catch (error) {
					console.error('Error converting geometry:', error);
				}
			}
			
			statusElement.textContent = \`Status: Rendered \${geometries.length} object(s)\`;
		}
		
		function showError(message) {
			errorElement.textContent = message;
			errorElement.style.display = 'block';
			statusElement.textContent = 'Status: Error';
		}
		
		function hideError() {
			errorElement.style.display = 'none';
		}
		
		function updateParameterUI(parameters) {
			if (!parameters || !parameters.definitions || parameters.definitions.length === 0) {
				parameterPanel.classList.remove('visible');
				return;
			}
			
			parameterPanel.classList.add('visible');
			parameterContent.innerHTML = '';
			
			for (const def of parameters.definitions) {
				const item = document.createElement('div');
				item.className = 'parameter-item';
				
				const label = document.createElement('label');
				label.className = 'parameter-label';
				label.textContent = def.caption || def.name;
				item.appendChild(label);
				
				const currentValue = parameters.values[def.name] !== undefined 
					? parameters.values[def.name] 
					: def.initial;
				
				if (def.type === 'checkbox') {
					const checkboxLabel = document.createElement('label');
					checkboxLabel.className = 'parameter-checkbox-label';
					const checkbox = document.createElement('input');
					checkbox.type = 'checkbox';
					checkbox.className = 'parameter-input parameter-checkbox';
					checkbox.checked = currentValue;
					checkbox.addEventListener('change', () => {
						vscode.postMessage({
							type: 'parameterChanged',
							filePath: parameters.filePath,
							name: def.name,
							value: checkbox.checked
						});
					});
					checkboxLabel.appendChild(checkbox);
					checkboxLabel.appendChild(document.createTextNode(' ' + (def.caption || def.name)));
					item.innerHTML = '';
					item.appendChild(checkboxLabel);
				} else if (def.type === 'slider' || (def.type === 'number' && def.min !== undefined && def.max !== undefined)) {
					const slider = document.createElement('input');
					slider.type = 'range';
					slider.className = 'parameter-input parameter-slider';
					slider.min = def.min || 0;
					slider.max = def.max || 100;
					slider.step = def.step || 1;
					slider.value = currentValue;
					
					const valueDisplay = document.createElement('div');
					valueDisplay.className = 'parameter-value';
					valueDisplay.textContent = currentValue;
					
					slider.addEventListener('input', () => {
						valueDisplay.textContent = slider.value;
						vscode.postMessage({
							type: 'parameterChanged',
							filePath: parameters.filePath,
							name: def.name,
							value: parseFloat(slider.value)
						});
					});
					
					item.appendChild(slider);
					item.appendChild(valueDisplay);
				} else {
					const input = document.createElement('input');
					input.type = 'text';
					input.className = 'parameter-input';
					input.value = currentValue;
					input.addEventListener('change', () => {
						let value = input.value;
						if (def.type === 'number' || def.type === 'int' || def.type === 'float') {
							value = parseFloat(value);
						}
						vscode.postMessage({
							type: 'parameterChanged',
							filePath: parameters.filePath,
							name: def.name,
							value
						});
					});
					item.appendChild(input);
				}
				
				parameterContent.appendChild(item);
			}
		}
		
		// Parameter panel collapse
		document.getElementById('parameter-header').addEventListener('click', () => {
			parameterContent.classList.toggle('collapsed');
			collapseButton.textContent = parameterContent.classList.contains('collapsed') ? '▶' : '▼';
		});
		
		// Message handling
		window.addEventListener('message', (event) => {
			const message = event.data;
			switch (message.type) {
				case 'renderEntities':
					hideError();
					renderGeometries(message.entities);
					if (message.parameters) {
						updateParameterUI(message.parameters);
					}
					break;
				case 'error':
					showError(message.message);
					break;
			}
		});
		
		// Initialize
		initThreeJS();
		
		// Signal ready
		vscode.postMessage({ type: 'ready' });
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
