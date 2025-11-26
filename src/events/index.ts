/**
 * NextGen Game Engine - Event System
 * High-performance event emitter with type safety
 */

export type EventCallback<T = unknown> = (data: T) => void;

export interface EventSubscription {
  unsubscribe(): void;
}

/**
 * Type-safe event emitter for decoupled communication
 */
export class EventEmitter<TEvents = Record<string, unknown>> {
  private listeners: Map<keyof TEvents, Set<EventCallback<unknown>>> = new Map();
  private onceListeners: Map<keyof TEvents, Set<EventCallback<unknown>>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    return {
      unsubscribe: () => {
        this.off(event, callback);
      }
    };
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): EventSubscription {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(callback as EventCallback<unknown>);

    return {
      unsubscribe: () => {
        this.onceListeners.get(event)?.delete(callback as EventCallback<unknown>);
      }
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): void {
    this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
    this.onceListeners.get(event)?.delete(callback as EventCallback<unknown>);
  }

  /**
   * Emit an event
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    // Call regular listeners
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${String(event)}:`, error);
      }
    });

    // Call once listeners and remove them
    const onceCallbacks = this.onceListeners.get(event);
    if (onceCallbacks) {
      onceCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in once event listener for ${String(event)}:`, error);
        }
      });
      this.onceListeners.delete(event);
    }
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: keyof TEvents): void {
    if (event !== undefined) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: keyof TEvents): number {
    const regularCount = this.listeners.get(event)?.size || 0;
    const onceCount = this.onceListeners.get(event)?.size || 0;
    return regularCount + onceCount;
  }

  /**
   * Check if an event has listeners
   */
  hasListeners(event: keyof TEvents): boolean {
    return this.listenerCount(event) > 0;
  }
}

/**
 * Global event bus for cross-system communication
 */
export class EventBus extends EventEmitter<Record<string, unknown>> {
  private static instance: EventBus;

  private constructor() {
    super();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  static reset(): void {
    if (EventBus.instance) {
      EventBus.instance.removeAllListeners();
    }
    EventBus.instance = new EventBus();
  }
}

/**
 * Standard engine events
 */
export interface EngineEvents {
  'engine:start': void;
  'engine:stop': void;
  'engine:pause': void;
  'engine:resume': void;
  'engine:update': { deltaTime: number; totalTime: number };
  'engine:fixedUpdate': { fixedDeltaTime: number };
  'engine:render': { deltaTime: number };
  'scene:load': { sceneName: string };
  'scene:unload': { sceneName: string };
  'entity:created': { entityId: number };
  'entity:destroyed': { entityId: number };
  'component:added': { entityId: number; componentType: string };
  'component:removed': { entityId: number; componentType: string };
}
