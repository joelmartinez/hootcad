/**
 * Input controller for mouse and trackpad interactions
 * Handles user input and delegates camera control to CameraController
 */

// Zoom sensitivity configuration for cross-platform mouse/trackpad support
// These values are tuned to provide comfortable zoom speeds for both input types:
// - Mouse wheels emit large discrete deltas (~100 pixels), need lower sensitivity
// - Trackpads emit small continuous deltas (~1-4 pixels), need moderate sensitivity
const WHEEL_DELTA_THRESHOLD = 15; // Pixels - distinguishes mouse wheels from trackpads
const MOUSE_WHEEL_ZOOM_SPEED = 0.0008; // ~8% zoom per mouse wheel tick
const TRACKPAD_ZOOM_SPEED = 0.005; // ~1% zoom per typical trackpad delta

// Mouse drag sensitivity for camera rotation
const ROTATION_SENSITIVITY = 0.01; // Radians per pixel

export class InputController {
	constructor(element, cameraController, options = {}) {
		this.element = element;
		this.cameraController = cameraController;
		this.enabled = true;
		
		// Callbacks
		this.onInteraction = options.onInteraction || (() => {});
		
		// State
		this.isDragging = false;
		this.previousMousePosition = { x: 0, y: 0 };
		
		// Bind event handlers
		this._onMouseDown = this._onMouseDown.bind(this);
		this._onMouseMove = this._onMouseMove.bind(this);
		this._onMouseUp = this._onMouseUp.bind(this);
		this._onMouseLeave = this._onMouseLeave.bind(this);
		this._onWheel = this._onWheel.bind(this);
		
		// Attach event listeners
		this.attach();
	}

	/**
	 * Attach event listeners to the element
	 */
	attach() {
		this.element.addEventListener('mousedown', this._onMouseDown);
		this.element.addEventListener('mousemove', this._onMouseMove);
		this.element.addEventListener('mouseup', this._onMouseUp);
		this.element.addEventListener('mouseleave', this._onMouseLeave);
		this.element.addEventListener('wheel', this._onWheel, { passive: false });
	}

	/**
	 * Detach event listeners from the element
	 */
	detach() {
		this.element.removeEventListener('mousedown', this._onMouseDown);
		this.element.removeEventListener('mousemove', this._onMouseMove);
		this.element.removeEventListener('mouseup', this._onMouseUp);
		this.element.removeEventListener('mouseleave', this._onMouseLeave);
		this.element.removeEventListener('wheel', this._onWheel);
	}

	/**
	 * Enable input handling
	 */
	enable() {
		this.enabled = true;
	}

	/**
	 * Disable input handling
	 */
	disable() {
		this.enabled = false;
		this.isDragging = false;
	}

	/**
	 * Handle mouse down event - start dragging
	 */
	_onMouseDown(event) {
		if (!this.enabled) {
			return;
		}
		
		this.isDragging = true;
		this.previousMousePosition = { x: event.clientX, y: event.clientY };
		this.onInteraction();
	}

	/**
	 * Handle mouse move event - rotate camera if dragging
	 */
	_onMouseMove(event) {
		if (!this.enabled || !this.isDragging) {
			return;
		}
		
		const deltaX = event.clientX - this.previousMousePosition.x;
		const deltaY = event.clientY - this.previousMousePosition.y;
		
		this.cameraController.rotate(
			deltaX * ROTATION_SENSITIVITY,
			deltaY * ROTATION_SENSITIVITY
		);
		
		this.previousMousePosition = { x: event.clientX, y: event.clientY };
	}

	/**
	 * Handle mouse up event - stop dragging
	 */
	_onMouseUp(event) {
		if (!this.enabled) {
			return;
		}
		this.isDragging = false;
	}

	/**
	 * Handle mouse leave event - stop dragging
	 */
	_onMouseLeave(event) {
		if (!this.enabled) {
			return;
		}
		this.isDragging = false;
	}

	/**
	 * Handle wheel event - zoom camera
	 */
	_onWheel(event) {
		if (!this.enabled) {
			return;
		}
		
		event.preventDefault();
		this.onInteraction();
		
		// Normalize wheel delta based on deltaMode
		const delta = this._normalizeWheelDelta(event);
		
		// Detect input type and apply appropriate zoom sensitivity
		const zoomSpeed = this._getZoomSpeed(delta);
		const zoomFactor = Math.exp(delta * zoomSpeed);
		
		this.cameraController.zoom(zoomFactor);
	}

	/**
	 * Normalize wheel delta based on deltaMode
	 * @private
	 */
	_normalizeWheelDelta(event) {
		// Handle different deltaMode values (0=pixel, 1=line, 2=page)
		const modeMultiplier = event.deltaMode === 1 ? 16 : (event.deltaMode === 2 ? 100 : 1);
		return event.deltaY * modeMultiplier;
	}

	/**
	 * Determine zoom speed based on input type (mouse wheel vs trackpad)
	 * @private
	 */
	_getZoomSpeed(delta) {
		// Normalize for cross-platform consistency:
		// - Windows mouse wheels typically emit large discrete values (~100-120 pixels/tick)
		// - macOS trackpads emit many small continuous values (~1-4 pixels/tick)
		// We detect the input type and apply appropriate sensitivity.
		const absDelta = Math.abs(delta);
		const isLikelyMouseWheel = absDelta > WHEEL_DELTA_THRESHOLD;
		return isLikelyMouseWheel ? MOUSE_WHEEL_ZOOM_SPEED : TRACKPAD_ZOOM_SPEED;
	}

	/**
	 * Get current input configuration
	 */
	getConfig() {
		return {
			wheelDeltaThreshold: WHEEL_DELTA_THRESHOLD,
			mouseWheelZoomSpeed: MOUSE_WHEEL_ZOOM_SPEED,
			trackpadZoomSpeed: TRACKPAD_ZOOM_SPEED,
			rotationSensitivity: ROTATION_SENSITIVITY
		};
	}
}
