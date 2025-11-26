/**
 * Input System Tests
 */

import { InputManager, KeyCode, MouseButton } from '../src/input';
import { Vector2 } from '../src/math';

describe('InputManager', () => {
  let input: InputManager;

  beforeEach(() => {
    input = new InputManager();
    // Initialize without DOM for testing
    input.init({} as Window);
  });

  describe('keyboard', () => {
    it('should detect key down', () => {
      input.simulateKeyDown(KeyCode.Space);
      expect(input.isKeyHeld(KeyCode.Space)).toBe(true);
      expect(input.isKeyDown(KeyCode.Space)).toBe(true);
    });

    it('should detect key up', () => {
      input.simulateKeyDown(KeyCode.Space);
      input.simulateKeyUp(KeyCode.Space);
      expect(input.isKeyHeld(KeyCode.Space)).toBe(false);
      expect(input.isKeyUp(KeyCode.Space)).toBe(true);
    });

    it('should clear frame states on update', () => {
      input.simulateKeyDown(KeyCode.Space);
      input.update();
      expect(input.isKeyDown(KeyCode.Space)).toBe(false);
      expect(input.isKeyHeld(KeyCode.Space)).toBe(true);
    });

    it('should detect any key held', () => {
      expect(input.isAnyKeyHeld()).toBe(false);
      input.simulateKeyDown(KeyCode.A);
      expect(input.isAnyKeyHeld()).toBe(true);
    });
  });

  describe('mouse', () => {
    it('should detect mouse button down', () => {
      input.simulateMouseDown(MouseButton.Left);
      expect(input.isMouseButtonHeld(MouseButton.Left)).toBe(true);
      expect(input.isMouseButtonDown(MouseButton.Left)).toBe(true);
    });

    it('should detect mouse button up', () => {
      input.simulateMouseDown(MouseButton.Left);
      input.simulateMouseUp(MouseButton.Left);
      expect(input.isMouseButtonHeld(MouseButton.Left)).toBe(false);
      expect(input.isMouseButtonUp(MouseButton.Left)).toBe(true);
    });

    it('should track mouse position', () => {
      input.simulateMouseMove(new Vector2(100, 200));
      const pos = input.getMousePosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it('should calculate mouse delta', () => {
      input.simulateMouseMove(new Vector2(100, 100));
      input.update();
      input.simulateMouseMove(new Vector2(150, 120));
      const delta = input.getMouseDelta();
      expect(delta.x).toBe(50);
      expect(delta.y).toBe(20);
    });
  });

  describe('actions', () => {
    beforeEach(() => {
      input.registerAction({
        name: 'jump',
        keys: [KeyCode.Space, KeyCode.W],
        mouseButtons: [MouseButton.Left]
      });
    });

    it('should detect action from key', () => {
      input.simulateKeyDown(KeyCode.Space);
      expect(input.isActionHeld('jump')).toBe(true);
      expect(input.isActionDown('jump')).toBe(true);
    });

    it('should detect action from mouse', () => {
      input.simulateMouseDown(MouseButton.Left);
      expect(input.isActionHeld('jump')).toBe(true);
    });

    it('should detect action up', () => {
      input.simulateKeyDown(KeyCode.Space);
      input.simulateKeyUp(KeyCode.Space);
      expect(input.isActionUp('jump')).toBe(true);
    });

    it('should return false for unregistered action', () => {
      expect(input.isActionHeld('nonexistent')).toBe(false);
    });

    it('should unregister actions', () => {
      input.simulateKeyDown(KeyCode.Space);
      input.unregisterAction('jump');
      expect(input.isActionHeld('jump')).toBe(false);
    });
  });

  describe('events', () => {
    it('should emit key down event', () => {
      const callback = jest.fn();
      input.on('key:down', callback);
      input.simulateKeyDown(KeyCode.A);
      expect(callback).toHaveBeenCalledWith({
        code: KeyCode.A,
        key: KeyCode.A,
        repeat: false
      });
    });

    it('should emit mouse move event', () => {
      const callback = jest.fn();
      input.on('mouse:move', callback);
      input.simulateMouseMove(new Vector2(50, 75));
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('enabled', () => {
    it('should not process input when disabled', () => {
      input.enabled = false;
      input.simulateKeyDown(KeyCode.Space);
      expect(input.isKeyHeld(KeyCode.Space)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all input states', () => {
      input.simulateKeyDown(KeyCode.Space);
      input.simulateMouseDown(MouseButton.Left);
      input.clear();
      expect(input.isKeyHeld(KeyCode.Space)).toBe(false);
      expect(input.isMouseButtonHeld(MouseButton.Left)).toBe(false);
    });
  });
});
