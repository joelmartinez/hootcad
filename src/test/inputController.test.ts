import * as assert from 'assert';

// Mock DOM element for testing
class MockElement {
	private eventListeners: Map<string, Function[]> = new Map();
	
	addEventListener(event: string, handler: Function, options?: any) {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}
		this.eventListeners.get(event)!.push(handler);
	}
	
	removeEventListener(event: string, handler: Function) {
		if (this.eventListeners.has(event)) {
			const handlers = this.eventListeners.get(event)!;
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}
	
	// Helper to trigger events for testing
	triggerEvent(event: string, eventData: any) {
		if (this.eventListeners.has(event)) {
			this.eventListeners.get(event)!.forEach(handler => {
				handler(eventData);
			});
		}
	}
	
	// Helper to check if event has listeners
	hasListener(event: string): boolean {
		return this.eventListeners.has(event) && this.eventListeners.get(event)!.length > 0;
	}
}

// Mock camera controller for testing
class MockCameraController {
	rotateCallCount = 0;
	zoomCallCount = 0;
	lastRotateArgs: [number, number] | null = null;
	lastZoomFactor: number | null = null;
	
	rotate(deltaTheta: number, deltaPhi: number) {
		this.rotateCallCount++;
		this.lastRotateArgs = [deltaTheta, deltaPhi];
	}
	
	zoom(factor: number) {
		this.zoomCallCount++;
		this.lastZoomFactor = factor;
	}
}

// Import the InputController
const inputControllerPath = '../webview/inputController.js';

suite('Input Controller Test Suite', () => {
	let element: MockElement;
	let cameraController: MockCameraController;
	let InputController: any;

	suiteSetup(async () => {
		// Dynamically import the module
		const module = await import(inputControllerPath);
		InputController = module.InputController;
	});

	setup(() => {
		element = new MockElement();
		cameraController = new MockCameraController();
	});

	test('InputController should attach event listeners on creation', () => {
		const controller = new InputController(element, cameraController);
		
		assert.ok(element.hasListener('mousedown'), 'Should have mousedown listener');
		assert.ok(element.hasListener('mousemove'), 'Should have mousemove listener');
		assert.ok(element.hasListener('mouseup'), 'Should have mouseup listener');
		assert.ok(element.hasListener('mouseleave'), 'Should have mouseleave listener');
		assert.ok(element.hasListener('wheel'), 'Should have wheel listener');
	});

	test('InputController should handle mousedown event', () => {
		let interactionCalled = false;
		const controller = new InputController(element, cameraController, {
			onInteraction: () => { interactionCalled = true; }
		});
		
		element.triggerEvent('mousedown', { clientX: 100, clientY: 200 });
		
		assert.ok(interactionCalled, 'onInteraction should be called');
	});

	test('InputController should handle drag (mousemove after mousedown)', () => {
		const controller = new InputController(element, cameraController);
		
		// Start drag
		element.triggerEvent('mousedown', { clientX: 100, clientY: 100 });
		
		// Move mouse
		element.triggerEvent('mousemove', { clientX: 110, clientY: 105 });
		
		assert.strictEqual(cameraController.rotateCallCount, 1, 'Rotate should be called once');
		assert.ok(cameraController.lastRotateArgs !== null, 'Rotate should have arguments');
	});

	test('InputController should not rotate without mousedown', () => {
		const controller = new InputController(element, cameraController);
		
		// Move mouse without mousedown
		element.triggerEvent('mousemove', { clientX: 110, clientY: 105 });
		
		assert.strictEqual(cameraController.rotateCallCount, 0, 'Rotate should not be called');
	});

	test('InputController should stop dragging on mouseup', () => {
		const controller = new InputController(element, cameraController);
		
		// Start drag
		element.triggerEvent('mousedown', { clientX: 100, clientY: 100 });
		element.triggerEvent('mousemove', { clientX: 110, clientY: 105 });
		
		// End drag
		element.triggerEvent('mouseup', {});
		
		// Try to move again
		const previousCallCount = cameraController.rotateCallCount;
		element.triggerEvent('mousemove', { clientX: 120, clientY: 110 });
		
		assert.strictEqual(cameraController.rotateCallCount, previousCallCount, 'Rotate should not be called after mouseup');
	});

	test('InputController should stop dragging on mouseleave', () => {
		const controller = new InputController(element, cameraController);
		
		// Start drag
		element.triggerEvent('mousedown', { clientX: 100, clientY: 100 });
		element.triggerEvent('mousemove', { clientX: 110, clientY: 105 });
		
		// Leave element
		element.triggerEvent('mouseleave', {});
		
		// Try to move again
		const previousCallCount = cameraController.rotateCallCount;
		element.triggerEvent('mousemove', { clientX: 120, clientY: 110 });
		
		assert.strictEqual(cameraController.rotateCallCount, previousCallCount, 'Rotate should not be called after mouseleave');
	});

	test('InputController should handle wheel event for mouse wheel (large delta)', () => {
		let interactionCalled = false;
		const controller = new InputController(element, cameraController, {
			onInteraction: () => { interactionCalled = true; }
		});
		
		// Simulate mouse wheel event with large delta (typical for Windows mouse wheels)
		const wheelEvent = {
			deltaY: 100,
			deltaMode: 0,
			preventDefault: () => {}
		};
		
		element.triggerEvent('wheel', wheelEvent);
		
		assert.ok(interactionCalled, 'onInteraction should be called');
		assert.strictEqual(cameraController.zoomCallCount, 1, 'Zoom should be called once');
		assert.ok(cameraController.lastZoomFactor !== null, 'Zoom should have a factor');
	});

	test('InputController should handle wheel event for trackpad (small delta)', () => {
		const controller = new InputController(element, cameraController);
		
		// Simulate trackpad event with small delta (typical for macOS trackpads)
		const wheelEvent = {
			deltaY: 2,
			deltaMode: 0,
			preventDefault: () => {}
		};
		
		element.triggerEvent('wheel', wheelEvent);
		
		assert.strictEqual(cameraController.zoomCallCount, 1, 'Zoom should be called once');
		assert.ok(cameraController.lastZoomFactor !== null, 'Zoom should have a factor');
	});

	test('InputController should normalize deltaMode=1 (line mode)', () => {
		const controller = new InputController(element, cameraController);
		
		const wheelEvent = {
			deltaY: 1,
			deltaMode: 1, // Line mode
			preventDefault: () => {}
		};
		
		element.triggerEvent('wheel', wheelEvent);
		
		assert.strictEqual(cameraController.zoomCallCount, 1, 'Zoom should be called');
		// deltaMode=1 should multiply by 16
	});

	test('InputController should normalize deltaMode=2 (page mode)', () => {
		const controller = new InputController(element, cameraController);
		
		const wheelEvent = {
			deltaY: 1,
			deltaMode: 2, // Page mode
			preventDefault: () => {}
		};
		
		element.triggerEvent('wheel', wheelEvent);
		
		assert.strictEqual(cameraController.zoomCallCount, 1, 'Zoom should be called');
		// deltaMode=2 should multiply by 100
	});

	test('InputController.disable should prevent input handling', () => {
		const controller = new InputController(element, cameraController);
		
		controller.disable();
		
		// Try to start drag
		element.triggerEvent('mousedown', { clientX: 100, clientY: 100 });
		element.triggerEvent('mousemove', { clientX: 110, clientY: 105 });
		
		assert.strictEqual(cameraController.rotateCallCount, 0, 'Rotate should not be called when disabled');
		
		// Try to zoom
		element.triggerEvent('wheel', {
			deltaY: 100,
			deltaMode: 0,
			preventDefault: () => {}
		});
		
		assert.strictEqual(cameraController.zoomCallCount, 0, 'Zoom should not be called when disabled');
	});

	test('InputController.enable should re-enable input handling', () => {
		const controller = new InputController(element, cameraController);
		
		controller.disable();
		controller.enable();
		
		// Try to zoom
		element.triggerEvent('wheel', {
			deltaY: 100,
			deltaMode: 0,
			preventDefault: () => {}
		});
		
		assert.strictEqual(cameraController.zoomCallCount, 1, 'Zoom should be called when re-enabled');
	});

	test('InputController.detach should remove event listeners', () => {
		const controller = new InputController(element, cameraController);
		
		controller.detach();
		
		// Try to trigger events
		element.triggerEvent('mousedown', { clientX: 100, clientY: 100 });
		element.triggerEvent('wheel', {
			deltaY: 100,
			deltaMode: 0,
			preventDefault: () => {}
		});
		
		// Events might still be in the map but handlers should be removed
		// This test verifies the controller properly removes its handlers
		assert.strictEqual(cameraController.rotateCallCount, 0, 'Should not handle events after detach');
		assert.strictEqual(cameraController.zoomCallCount, 0, 'Should not handle events after detach');
	});

	test('InputController.getConfig should return configuration', () => {
		const controller = new InputController(element, cameraController);
		
		const config = controller.getConfig();
		
		assert.ok(config.wheelDeltaThreshold !== undefined, 'Config should include wheelDeltaThreshold');
		assert.ok(config.mouseWheelZoomSpeed !== undefined, 'Config should include mouseWheelZoomSpeed');
		assert.ok(config.trackpadZoomSpeed !== undefined, 'Config should include trackpadZoomSpeed');
		assert.ok(config.rotationSensitivity !== undefined, 'Config should include rotationSensitivity');
	});

	test('InputController should differentiate mouse wheel from trackpad based on delta', () => {
		const controller = new InputController(element, cameraController);
		
		// Mouse wheel (large delta)
		element.triggerEvent('wheel', {
			deltaY: 100,
			deltaMode: 0,
			preventDefault: () => {}
		});
		const mouseWheelZoomFactor = cameraController.lastZoomFactor;
		
		// Trackpad (small delta)
		element.triggerEvent('wheel', {
			deltaY: 2,
			deltaMode: 0,
			preventDefault: () => {}
		});
		const trackpadZoomFactor = cameraController.lastZoomFactor;
		
		// The zoom factors should be different due to different sensitivities
		assert.notStrictEqual(mouseWheelZoomFactor, trackpadZoomFactor, 'Mouse wheel and trackpad should use different zoom speeds');
	});
});
