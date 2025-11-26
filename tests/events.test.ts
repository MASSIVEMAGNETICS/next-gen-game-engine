/**
 * Event System Tests
 */

import { EventEmitter, EventBus } from '../src/events';

describe('EventEmitter', () => {
  let emitter: EventEmitter<{ test: string; data: { value: number } }>;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on', () => {
    it('should subscribe to events', () => {
      const callback = jest.fn();
      emitter.on('test', callback);
      emitter.emit('test', 'hello');
      expect(callback).toHaveBeenCalledWith('hello');
    });

    it('should allow multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      emitter.emit('test', 'hello');
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should return subscription with unsubscribe', () => {
      const callback = jest.fn();
      const subscription = emitter.on('test', callback);
      subscription.unsubscribe();
      emitter.emit('test', 'hello');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only fire once', () => {
      const callback = jest.fn();
      emitter.once('test', callback);
      emitter.emit('test', 'first');
      emitter.emit('test', 'second');
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });
  });

  describe('off', () => {
    it('should unsubscribe from events', () => {
      const callback = jest.fn();
      emitter.on('test', callback);
      emitter.off('test', callback);
      emitter.emit('test', 'hello');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should emit events with data', () => {
      const callback = jest.fn();
      emitter.on('data', callback);
      emitter.emit('data', { value: 42 });
      expect(callback).toHaveBeenCalledWith({ value: 42 });
    });

    it('should handle errors in callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const goodCallback = jest.fn();
      
      emitter.on('test', errorCallback);
      emitter.on('test', goodCallback);
      
      // Should not throw
      expect(() => emitter.emit('test', 'hello')).not.toThrow();
      
      // Both callbacks should have been called
      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      emitter.on('test', callback1);
      emitter.on('data', callback2);
      
      emitter.removeAllListeners('test');
      emitter.emit('test', 'hello');
      emitter.emit('data', { value: 1 });
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      emitter.on('test', callback1);
      emitter.on('data', callback2);
      
      emitter.removeAllListeners();
      emitter.emit('test', 'hello');
      emitter.emit('data', { value: 1 });
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('should return correct listener count', () => {
      expect(emitter.listenerCount('test')).toBe(0);
      
      emitter.on('test', () => {});
      expect(emitter.listenerCount('test')).toBe(1);
      
      emitter.once('test', () => {});
      expect(emitter.listenerCount('test')).toBe(2);
    });
  });

  describe('hasListeners', () => {
    it('should return true if event has listeners', () => {
      expect(emitter.hasListeners('test')).toBe(false);
      emitter.on('test', () => {});
      expect(emitter.hasListeners('test')).toBe(true);
    });
  });
});

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.reset();
  });

  it('should be a singleton', () => {
    const bus1 = EventBus.getInstance();
    const bus2 = EventBus.getInstance();
    expect(bus1).toBe(bus2);
  });

  it('should reset properly', () => {
    const bus1 = EventBus.getInstance();
    const callback = jest.fn();
    bus1.on('test', callback);
    
    EventBus.reset();
    const bus2 = EventBus.getInstance();
    bus2.emit('test', 'hello');
    
    expect(callback).not.toHaveBeenCalled();
  });
});
