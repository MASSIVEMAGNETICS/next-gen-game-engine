/**
 * NextGen Game Engine - Input System
 * Comprehensive input handling for keyboard, mouse, gamepad, and touch
 */

import { EventEmitter } from '../events';
import { Vector2 } from '../math';

/**
 * Key codes enumeration
 */
export enum KeyCode {
  // Letters
  A = 'KeyA', B = 'KeyB', C = 'KeyC', D = 'KeyD', E = 'KeyE',
  F = 'KeyF', G = 'KeyG', H = 'KeyH', I = 'KeyI', J = 'KeyJ',
  K = 'KeyK', L = 'KeyL', M = 'KeyM', N = 'KeyN', O = 'KeyO',
  P = 'KeyP', Q = 'KeyQ', R = 'KeyR', S = 'KeyS', T = 'KeyT',
  U = 'KeyU', V = 'KeyV', W = 'KeyW', X = 'KeyX', Y = 'KeyY',
  Z = 'KeyZ',
  
  // Numbers
  Digit0 = 'Digit0', Digit1 = 'Digit1', Digit2 = 'Digit2',
  Digit3 = 'Digit3', Digit4 = 'Digit4', Digit5 = 'Digit5',
  Digit6 = 'Digit6', Digit7 = 'Digit7', Digit8 = 'Digit8',
  Digit9 = 'Digit9',
  
  // Function keys
  F1 = 'F1', F2 = 'F2', F3 = 'F3', F4 = 'F4', F5 = 'F5',
  F6 = 'F6', F7 = 'F7', F8 = 'F8', F9 = 'F9', F10 = 'F10',
  F11 = 'F11', F12 = 'F12',
  
  // Arrow keys
  ArrowUp = 'ArrowUp', ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft', ArrowRight = 'ArrowRight',
  
  // Special keys
  Space = 'Space', Enter = 'Enter', Escape = 'Escape',
  Tab = 'Tab', Backspace = 'Backspace', Delete = 'Delete',
  ShiftLeft = 'ShiftLeft', ShiftRight = 'ShiftRight',
  ControlLeft = 'ControlLeft', ControlRight = 'ControlRight',
  AltLeft = 'AltLeft', AltRight = 'AltRight',
  MetaLeft = 'MetaLeft', MetaRight = 'MetaRight'
}

/**
 * Mouse buttons enumeration
 */
export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
  Back = 3,
  Forward = 4
}

/**
 * Gamepad buttons enumeration (standard mapping)
 */
export enum GamepadButton {
  A = 0, B = 1, X = 2, Y = 3,
  LeftBumper = 4, RightBumper = 5,
  LeftTrigger = 6, RightTrigger = 7,
  Back = 8, Start = 9,
  LeftStick = 10, RightStick = 11,
  DPadUp = 12, DPadDown = 13,
  DPadLeft = 14, DPadRight = 15,
  Home = 16
}

/**
 * Gamepad axes enumeration
 */
export enum GamepadAxis {
  LeftStickX = 0,
  LeftStickY = 1,
  RightStickX = 2,
  RightStickY = 3
}

/**
 * Input events
 */
export interface InputEvents {
  'key:down': { code: string; key: string; repeat: boolean };
  'key:up': { code: string; key: string };
  'mouse:down': { button: MouseButton; position: Vector2 };
  'mouse:up': { button: MouseButton; position: Vector2 };
  'mouse:move': { position: Vector2; delta: Vector2 };
  'mouse:wheel': { deltaX: number; deltaY: number };
  'touch:start': { id: number; position: Vector2 };
  'touch:move': { id: number; position: Vector2; delta: Vector2 };
  'touch:end': { id: number; position: Vector2 };
  'gamepad:connected': { index: number };
  'gamepad:disconnected': { index: number };
  'gamepad:button:down': { gamepadIndex: number; button: number };
  'gamepad:button:up': { gamepadIndex: number; button: number };
}

/**
 * Touch point data
 */
interface TouchPoint {
  id: number;
  position: Vector2;
  startPosition: Vector2;
  previousPosition: Vector2;
}

/**
 * Input action binding
 */
export interface InputAction {
  name: string;
  keys?: string[];
  mouseButtons?: MouseButton[];
  gamepadButtons?: number[];
}

/**
 * Input Manager - handles all input devices
 */
export class InputManager extends EventEmitter<InputEvents> {
  private keys: Map<string, boolean> = new Map();
  private keysDown: Set<string> = new Set();
  private keysUp: Set<string> = new Set();
  
  private mouseButtons: Map<MouseButton, boolean> = new Map();
  private mouseButtonsDown: Set<MouseButton> = new Set();
  private mouseButtonsUp: Set<MouseButton> = new Set();
  private mousePosition: Vector2 = new Vector2();
  private mouseDelta: Vector2 = new Vector2();
  private mouseWheel: Vector2 = new Vector2();
  
  private touches: Map<number, TouchPoint> = new Map();
  private touchesStarted: number[] = [];
  private touchesEnded: number[] = [];
  
  private gamepads: Map<number, Gamepad> = new Map();
  private gamepadButtonStates: Map<number, Map<number, boolean>> = new Map();
  private gamepadButtonsDown: Map<number, Set<number>> = new Map();
  private gamepadButtonsUp: Map<number, Set<number>> = new Map();
  
  private actions: Map<string, InputAction> = new Map();
  private deadzone: number = 0.1;
  
  private _enabled: boolean = true;
  private _initialized: boolean = false;

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  /**
   * Initialize input system (browser only)
   */
  init(target: HTMLElement | Window = typeof window !== 'undefined' ? window : {} as Window): void {
    if (typeof window === 'undefined') {
      this._initialized = true;
      return;
    }

    // Keyboard events
    target.addEventListener('keydown', this.handleKeyDown.bind(this));
    target.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Mouse events
    target.addEventListener('mousedown', this.handleMouseDown.bind(this));
    target.addEventListener('mouseup', this.handleMouseUp.bind(this));
    target.addEventListener('mousemove', this.handleMouseMove.bind(this));
    target.addEventListener('wheel', this.handleWheel.bind(this));
    target.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch events
    target.addEventListener('touchstart', this.handleTouchStart.bind(this));
    target.addEventListener('touchmove', this.handleTouchMove.bind(this));
    target.addEventListener('touchend', this.handleTouchEnd.bind(this));
    target.addEventListener('touchcancel', this.handleTouchEnd.bind(this));

    // Gamepad events
    window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));

    this._initialized = true;
  }

  /**
   * Update input states (call at end of frame)
   */
  update(): void {
    // Clear frame-specific states
    this.keysDown.clear();
    this.keysUp.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsUp.clear();
    this.mouseDelta = new Vector2();
    this.mouseWheel = new Vector2();
    this.touchesStarted = [];
    this.touchesEnded = [];

    // Update gamepad states
    this.updateGamepads();
  }

  // Keyboard methods
  isKeyHeld(code: string): boolean {
    return this.keys.get(code) || false;
  }

  isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  isKeyUp(code: string): boolean {
    return this.keysUp.has(code);
  }

  isAnyKeyHeld(): boolean {
    return Array.from(this.keys.values()).some(v => v);
  }

  isAnyKeyDown(): boolean {
    return this.keysDown.size > 0;
  }

  // Mouse methods
  isMouseButtonHeld(button: MouseButton): boolean {
    return this.mouseButtons.get(button) || false;
  }

  isMouseButtonDown(button: MouseButton): boolean {
    return this.mouseButtonsDown.has(button);
  }

  isMouseButtonUp(button: MouseButton): boolean {
    return this.mouseButtonsUp.has(button);
  }

  getMousePosition(): Vector2 {
    return this.mousePosition.clone();
  }

  getMouseDelta(): Vector2 {
    return this.mouseDelta.clone();
  }

  getMouseWheel(): Vector2 {
    return this.mouseWheel.clone();
  }

  // Touch methods
  getTouchCount(): number {
    return this.touches.size;
  }

  getTouch(id: number): TouchPoint | undefined {
    return this.touches.get(id);
  }

  getAllTouches(): TouchPoint[] {
    return Array.from(this.touches.values());
  }

  isTouchStarted(id: number): boolean {
    return this.touchesStarted.includes(id);
  }

  isTouchEnded(id: number): boolean {
    return this.touchesEnded.includes(id);
  }

  // Gamepad methods
  isGamepadConnected(index: number): boolean {
    return this.gamepads.has(index);
  }

  getConnectedGamepads(): number[] {
    return Array.from(this.gamepads.keys());
  }

  isGamepadButtonHeld(gamepadIndex: number, button: number): boolean {
    return this.gamepadButtonStates.get(gamepadIndex)?.get(button) || false;
  }

  isGamepadButtonDown(gamepadIndex: number, button: number): boolean {
    return this.gamepadButtonsDown.get(gamepadIndex)?.has(button) || false;
  }

  isGamepadButtonUp(gamepadIndex: number, button: number): boolean {
    return this.gamepadButtonsUp.get(gamepadIndex)?.has(button) || false;
  }

  getGamepadAxis(gamepadIndex: number, axis: GamepadAxis): number {
    const gamepad = this.gamepads.get(gamepadIndex);
    if (!gamepad || !gamepad.axes[axis]) return 0;
    
    const value = gamepad.axes[axis];
    return Math.abs(value) > this.deadzone ? value : 0;
  }

  getGamepadLeftStick(gamepadIndex: number): Vector2 {
    return new Vector2(
      this.getGamepadAxis(gamepadIndex, GamepadAxis.LeftStickX),
      this.getGamepadAxis(gamepadIndex, GamepadAxis.LeftStickY)
    );
  }

  getGamepadRightStick(gamepadIndex: number): Vector2 {
    return new Vector2(
      this.getGamepadAxis(gamepadIndex, GamepadAxis.RightStickX),
      this.getGamepadAxis(gamepadIndex, GamepadAxis.RightStickY)
    );
  }

  setDeadzone(value: number): void {
    this.deadzone = Math.max(0, Math.min(1, value));
  }

  // Action system
  registerAction(action: InputAction): void {
    this.actions.set(action.name, action);
  }

  unregisterAction(name: string): void {
    this.actions.delete(name);
  }

  isActionHeld(name: string): boolean {
    const action = this.actions.get(name);
    if (!action) return false;

    if (action.keys?.some(key => this.isKeyHeld(key))) return true;
    if (action.mouseButtons?.some(button => this.isMouseButtonHeld(button))) return true;
    if (action.gamepadButtons?.some(button => {
      return this.getConnectedGamepads().some(gp => this.isGamepadButtonHeld(gp, button));
    })) return true;

    return false;
  }

  isActionDown(name: string): boolean {
    const action = this.actions.get(name);
    if (!action) return false;

    if (action.keys?.some(key => this.isKeyDown(key))) return true;
    if (action.mouseButtons?.some(button => this.isMouseButtonDown(button))) return true;
    if (action.gamepadButtons?.some(button => {
      return this.getConnectedGamepads().some(gp => this.isGamepadButtonDown(gp, button));
    })) return true;

    return false;
  }

  isActionUp(name: string): boolean {
    const action = this.actions.get(name);
    if (!action) return false;

    if (action.keys?.some(key => this.isKeyUp(key))) return true;
    if (action.mouseButtons?.some(button => this.isMouseButtonUp(button))) return true;
    if (action.gamepadButtons?.some(button => {
      return this.getConnectedGamepads().some(gp => this.isGamepadButtonUp(gp, button));
    })) return true;

    return false;
  }

  // Simulate input (useful for testing)
  simulateKeyDown(code: string): void {
    if (!this._enabled) return;
    this.keys.set(code, true);
    this.keysDown.add(code);
    this.emit('key:down', { code, key: code, repeat: false });
  }

  simulateKeyUp(code: string): void {
    if (!this._enabled) return;
    this.keys.set(code, false);
    this.keysUp.add(code);
    this.emit('key:up', { code, key: code });
  }

  simulateMouseDown(button: MouseButton, position?: Vector2): void {
    if (!this._enabled) return;
    if (position) this.mousePosition = position;
    this.mouseButtons.set(button, true);
    this.mouseButtonsDown.add(button);
    this.emit('mouse:down', { button, position: this.mousePosition });
  }

  simulateMouseUp(button: MouseButton, position?: Vector2): void {
    if (!this._enabled) return;
    if (position) this.mousePosition = position;
    this.mouseButtons.set(button, false);
    this.mouseButtonsUp.add(button);
    this.emit('mouse:up', { button, position: this.mousePosition });
  }

  simulateMouseMove(position: Vector2): void {
    if (!this._enabled) return;
    this.mouseDelta = position.subtract(this.mousePosition);
    this.mousePosition = position;
    this.emit('mouse:move', { position: this.mousePosition, delta: this.mouseDelta });
  }

  // Event handlers
  private handleKeyDown(event: Event): void {
    if (!this._enabled) return;
    const e = event as KeyboardEvent;
    const code = e.code;
    
    if (!this.keys.get(code)) {
      this.keysDown.add(code);
    }
    this.keys.set(code, true);
    
    this.emit('key:down', { code, key: e.key, repeat: e.repeat });
  }

  private handleKeyUp(event: Event): void {
    if (!this._enabled) return;
    const e = event as KeyboardEvent;
    const code = e.code;
    
    this.keys.set(code, false);
    this.keysUp.add(code);
    
    this.emit('key:up', { code, key: e.key });
  }

  private handleMouseDown(event: Event): void {
    if (!this._enabled) return;
    const e = event as MouseEvent;
    const button = e.button as MouseButton;
    
    this.mouseButtons.set(button, true);
    this.mouseButtonsDown.add(button);
    
    this.emit('mouse:down', { button, position: this.mousePosition });
  }

  private handleMouseUp(event: Event): void {
    if (!this._enabled) return;
    const e = event as MouseEvent;
    const button = e.button as MouseButton;
    
    this.mouseButtons.set(button, false);
    this.mouseButtonsUp.add(button);
    
    this.emit('mouse:up', { button, position: this.mousePosition });
  }

  private handleMouseMove(event: Event): void {
    if (!this._enabled) return;
    const e = event as MouseEvent;
    const newPosition = new Vector2(e.clientX, e.clientY);
    this.mouseDelta = newPosition.subtract(this.mousePosition);
    this.mousePosition = newPosition;
    
    this.emit('mouse:move', { position: this.mousePosition, delta: this.mouseDelta });
  }

  private handleWheel(event: Event): void {
    if (!this._enabled) return;
    const e = event as WheelEvent;
    this.mouseWheel = new Vector2(e.deltaX, e.deltaY);
    
    this.emit('mouse:wheel', { deltaX: e.deltaX, deltaY: e.deltaY });
  }

  private handleTouchStart(event: Event): void {
    if (!this._enabled) return;
    const e = event as TouchEvent;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const position = new Vector2(touch.clientX, touch.clientY);
      
      this.touches.set(touch.identifier, {
        id: touch.identifier,
        position: position,
        startPosition: position.clone(),
        previousPosition: position.clone()
      });
      
      this.touchesStarted.push(touch.identifier);
      this.emit('touch:start', { id: touch.identifier, position });
    }
  }

  private handleTouchMove(event: Event): void {
    if (!this._enabled) return;
    const e = event as TouchEvent;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchPoint = this.touches.get(touch.identifier);
      
      if (touchPoint) {
        const newPosition = new Vector2(touch.clientX, touch.clientY);
        const delta = newPosition.subtract(touchPoint.position);
        
        touchPoint.previousPosition = touchPoint.position.clone();
        touchPoint.position = newPosition;
        
        this.emit('touch:move', { id: touch.identifier, position: newPosition, delta });
      }
    }
  }

  private handleTouchEnd(event: Event): void {
    if (!this._enabled) return;
    const e = event as TouchEvent;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchPoint = this.touches.get(touch.identifier);
      
      if (touchPoint) {
        this.touchesEnded.push(touch.identifier);
        this.emit('touch:end', { id: touch.identifier, position: touchPoint.position });
        this.touches.delete(touch.identifier);
      }
    }
  }

  private handleGamepadConnected(event: Event): void {
    const e = event as GamepadEvent;
    this.gamepads.set(e.gamepad.index, e.gamepad);
    this.gamepadButtonStates.set(e.gamepad.index, new Map());
    this.gamepadButtonsDown.set(e.gamepad.index, new Set());
    this.gamepadButtonsUp.set(e.gamepad.index, new Set());
    
    this.emit('gamepad:connected', { index: e.gamepad.index });
  }

  private handleGamepadDisconnected(event: Event): void {
    const e = event as GamepadEvent;
    this.gamepads.delete(e.gamepad.index);
    this.gamepadButtonStates.delete(e.gamepad.index);
    this.gamepadButtonsDown.delete(e.gamepad.index);
    this.gamepadButtonsUp.delete(e.gamepad.index);
    
    this.emit('gamepad:disconnected', { index: e.gamepad.index });
  }

  private updateGamepads(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

    const gamepads = navigator.getGamepads();
    
    for (const gamepad of gamepads) {
      if (!gamepad) continue;
      
      this.gamepads.set(gamepad.index, gamepad);
      
      const buttonStates = this.gamepadButtonStates.get(gamepad.index);
      const buttonsDown = this.gamepadButtonsDown.get(gamepad.index);
      const buttonsUp = this.gamepadButtonsUp.get(gamepad.index);
      
      if (!buttonStates || !buttonsDown || !buttonsUp) continue;
      
      buttonsDown.clear();
      buttonsUp.clear();
      
      for (let i = 0; i < gamepad.buttons.length; i++) {
        const pressed = gamepad.buttons[i].pressed;
        const wasPressed = buttonStates.get(i) || false;
        
        if (pressed && !wasPressed) {
          buttonsDown.add(i);
          this.emit('gamepad:button:down', { gamepadIndex: gamepad.index, button: i });
        } else if (!pressed && wasPressed) {
          buttonsUp.add(i);
          this.emit('gamepad:button:up', { gamepadIndex: gamepad.index, button: i });
        }
        
        buttonStates.set(i, pressed);
      }
    }
  }

  /**
   * Clear all input states
   */
  clear(): void {
    this.keys.clear();
    this.keysDown.clear();
    this.keysUp.clear();
    this.mouseButtons.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsUp.clear();
    this.mouseDelta = new Vector2();
    this.mouseWheel = new Vector2();
    this.touches.clear();
    this.touchesStarted = [];
    this.touchesEnded = [];
  }
}

export default InputManager;
