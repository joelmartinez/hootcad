import * as vscode from 'vscode';

/**
 * Provides HTML content for the webview preview panel
 * Handles template generation and resource URI management
 */
export class WebviewContentProvider {
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Generate complete HTML content for the webview
	 */
	getWebviewContent(webview: vscode.Webview): string {
		// Get Three.js library URI
		const threeUri = this.getThreeJsUri(webview);

		// Include the converter module inline
		const converterModule = this.getConverterModule();

		return this.generateHtmlTemplate(threeUri, converterModule);
	}

	/**
	 * Get the webview URI for Three.js module
	 */
	private getThreeJsUri(webview: vscode.Webview): vscode.Uri {
		const threePath = vscode.Uri.joinPath(
			this.context.extensionUri,
			'node_modules',
			'three',
			'build',
			'three.module.js'
		);
		return webview.asWebviewUri(threePath);
	}

	/**
	 * Get the JSCAD to Three.js converter module as inline JavaScript
	 */
	private getConverterModule(): string {
		return `
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
	}

	/**
	 * Generate the complete HTML template
	 */
	private generateHtmlTemplate(threeUri: vscode.Uri, converterModule: string): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>HootCAD Preview</title>
	<style>
		${this.getStyles()}
	</style>
</head>
<body>
	${this.getBodyContent()}
	<script type="module">
		${converterModule}
		
		import * as THREE from '${threeUri}';
		
		${this.getClientScript()}
	</script>
</body>
</html>`;
	}

	/**
	 * Get CSS styles for the webview
	 */
	private getStyles(): string {
		return `
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
	`;
	}

	/**
	 * Get HTML body content
	 */
	private getBodyContent(): string {
		return `
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
	`;
	}

	/**
	 * Get client-side JavaScript for Three.js rendering and interaction
	 */
	private getClientScript(): string {
		return `
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
			scene.background = new THREE.Color(0xf5f5f5); // Near-white background
		
			// Camera
			const aspect = canvas.clientWidth / canvas.clientHeight;
			camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
			camera.position.set(30, 30, 30);
			camera.lookAt(0, 0, 0);
			
			// Renderer
			renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
			renderer.setSize(canvas.clientWidth, canvas.clientHeight);
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap;
			
			// Lights - studio-style setup
			const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
			scene.add(ambientLight);
			
			// Key light (main)
			const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
			keyLight.position.set(20, 30, 20);
			keyLight.castShadow = true;
			scene.add(keyLight);
			
			// Fill light (softer, from opposite side)
			const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
			fillLight.position.set(-20, 10, -10);
			scene.add(fillLight);
			
			// Rim light (from behind/below for edge definition)
			const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
			rimLight.position.set(0, -10, -20);
			scene.add(rimLight);
			
			// Grid and axes - subtle gray/blue grid
			// 400mm x 400mm grid (typical 3D printer build plate size) with 40 divisions (10mm each)
			const gridHelper = new THREE.GridHelper(400, 40, 0x8899aa, 0xc5d0dd);
			scene.add(gridHelper);
			
			const axesHelper = new THREE.AxesHelper(100);
			scene.add(axesHelper);
			
			// Add mesh group
			scene.add(meshGroup);
			
			// Basic orbit controls (manual implementation)
			setupControls();
			
			// Handle window resize using ResizeObserver
			// Watch the canvas-container instead of the canvas itself
			const container = document.getElementById('canvas-container');
			const resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					console.log('ResizeObserver triggered:', entry.contentRect.width, 'x', entry.contentRect.height);
					onWindowResize();
				}
			});
			resizeObserver.observe(container);
			
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
			const container = document.getElementById('canvas-container');
			const width = container.clientWidth;
			const height = container.clientHeight;
			console.log('Resize detected:', width, 'x', height);
			
			// Update camera aspect ratio
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			
			// Update renderer size - this updates the canvas drawing buffer
			renderer.setSize(width, height);
			
			// Ensure pixel ratio is maintained
			renderer.setPixelRatio(window.devicePixelRatio);
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
						
						// Determine color - use geom color if available, otherwise default metal gray
						let color = 0xb0b8c0; // Light metal gray
						if (geom.color && Array.isArray(geom.color) && geom.color.length >= 3) {
							// Convert from [r, g, b, a] (0-1) to hex color
							const r = Math.round(geom.color[0] * 255);
							const g = Math.round(geom.color[1] * 255);
							const b = Math.round(geom.color[2] * 255);
							color = (r << 16) | (g << 8) | b;
						}
						
						const material = new THREE.MeshStandardMaterial({
							color: color,
							metalness: 0.5,
							roughness: 0.5,
							side: THREE.DoubleSide
						});
						const mesh = new THREE.Mesh(geometry, material);
						
						// Apply transforms if available
						if (geom.transforms && Array.isArray(geom.transforms) && geom.transforms.length === 16) {
							// JSCAD uses column-major order, Three.js uses column-major too
							const matrix = new THREE.Matrix4();
							matrix.fromArray(geom.transforms);
							matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
						}
						
						meshGroup.add(mesh);
						console.log('Added geom3 mesh with color:', color.toString(16));
					} else if (geom.type === 'geom2') {
						const geometry = convertGeom2ToLineGeometry(geom, THREE);
						
						// Determine color - use geom color if available, otherwise default dark blue
						let color = 0x2266cc; // Dark blue for visibility on white
						if (geom.color && Array.isArray(geom.color) && geom.color.length >= 3) {
							const r = Math.round(geom.color[0] * 255);
							const g = Math.round(geom.color[1] * 255);
							const b = Math.round(geom.color[2] * 255);
							color = (r << 16) | (g << 8) | b;
						}
						
						const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
						const line = new THREE.LineSegments(geometry, material);
						
						// Apply transforms if available
						if (geom.transforms && Array.isArray(geom.transforms) && geom.transforms.length === 16) {
							const matrix = new THREE.Matrix4();
							matrix.fromArray(geom.transforms);
							matrix.decompose(line.position, line.quaternion, line.scale);
						}
						
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
	`;
	}
}
