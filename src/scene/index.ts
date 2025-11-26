/**
 * NextGen Game Engine - Scene Management System
 * Handles scene loading, transitions, and management
 */

import { EventEmitter } from '../events';
import { World, Entity } from '../ecs';

/**
 * Scene events
 */
export interface SceneEvents {
  'scene:create': { name: string };
  'scene:load': { name: string };
  'scene:unload': { name: string };
  'scene:transition:start': { from: string | null; to: string };
  'scene:transition:end': { from: string | null; to: string };
  'scene:pause': { name: string };
  'scene:resume': { name: string };
}

/**
 * Scene interface
 */
export interface Scene {
  readonly name: string;
  readonly world: World;
  
  init?(): void | Promise<void>;
  preload?(): void | Promise<void>;
  create?(): void | Promise<void>;
  update?(deltaTime: number): void;
  fixedUpdate?(fixedDeltaTime: number): void;
  render?(deltaTime: number): void;
  pause?(): void;
  resume?(): void;
  destroy?(): void | Promise<void>;
}

/**
 * Scene configuration
 */
export interface SceneConfig {
  name: string;
  preload?: () => void | Promise<void>;
  create?: (world: World) => void | Promise<void>;
  update?: (world: World, deltaTime: number) => void;
  fixedUpdate?: (world: World, fixedDeltaTime: number) => void;
  render?: (world: World, deltaTime: number) => void;
  destroy?: (world: World) => void | Promise<void>;
}

/**
 * Transition types
 */
export enum TransitionType {
  None = 'none',
  Fade = 'fade',
  Slide = 'slide',
  Zoom = 'zoom',
  Custom = 'custom'
}

/**
 * Transition configuration
 */
export interface TransitionConfig {
  type: TransitionType;
  duration: number;
  easing?: (t: number) => number;
  direction?: 'left' | 'right' | 'up' | 'down';
  custom?: (progress: number, fromScene: Scene | null, toScene: Scene | null) => void;
}

/**
 * Default transition config
 */
const DEFAULT_TRANSITION: TransitionConfig = {
  type: TransitionType.None,
  duration: 0
};

/**
 * Basic Scene implementation
 */
export class BasicScene implements Scene {
  readonly name: string;
  readonly world: World;
  private _config: SceneConfig;

  constructor(config: SceneConfig) {
    this.name = config.name;
    this.world = new World();
    this._config = config;
  }

  async preload(): Promise<void> {
    if (this._config.preload) {
      await this._config.preload();
    }
  }

  async create(): Promise<void> {
    if (this._config.create) {
      await this._config.create(this.world);
    }
  }

  update(deltaTime: number): void {
    if (this._config.update) {
      this._config.update(this.world, deltaTime);
    }
    this.world.update(deltaTime);
  }

  fixedUpdate(fixedDeltaTime: number): void {
    if (this._config.fixedUpdate) {
      this._config.fixedUpdate(this.world, fixedDeltaTime);
    }
    this.world.fixedUpdate(fixedDeltaTime);
  }

  render(deltaTime: number): void {
    if (this._config.render) {
      this._config.render(this.world, deltaTime);
    }
  }

  async destroy(): Promise<void> {
    if (this._config.destroy) {
      await this._config.destroy(this.world);
    }
    this.world.clear();
  }
}

/**
 * Scene Manager - handles scene lifecycle and transitions
 */
export class SceneManager extends EventEmitter<SceneEvents> {
  private scenes: Map<string, Scene> = new Map();
  private sceneFactories: Map<string, () => Scene | Promise<Scene>> = new Map();
  private activeScene: Scene | null = null;
  private nextScene: Scene | null = null;
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionConfig: TransitionConfig = DEFAULT_TRANSITION;
  private transitionStartTime: number = 0;
  private _paused: boolean = false;

  get currentScene(): Scene | null {
    return this.activeScene;
  }

  get currentSceneName(): string | null {
    return this.activeScene?.name || null;
  }

  get isPaused(): boolean {
    return this._paused;
  }

  get transitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * Register a scene factory
   */
  register(name: string, factory: () => Scene | Promise<Scene>): void {
    this.sceneFactories.set(name, factory);
  }

  /**
   * Register a scene from config
   */
  registerScene(config: SceneConfig): void {
    this.register(config.name, () => new BasicScene(config));
  }

  /**
   * Unregister a scene
   */
  unregister(name: string): void {
    this.sceneFactories.delete(name);
    
    // Also remove cached scene
    const scene = this.scenes.get(name);
    if (scene && scene !== this.activeScene) {
      this.scenes.delete(name);
    }
  }

  /**
   * Check if a scene is registered
   */
  isRegistered(name: string): boolean {
    return this.sceneFactories.has(name);
  }

  /**
   * Get registered scene names
   */
  getRegisteredScenes(): string[] {
    return Array.from(this.sceneFactories.keys());
  }

  /**
   * Load and switch to a scene
   */
  async loadScene(name: string, transition: Partial<TransitionConfig> = {}): Promise<void> {
    if (this.isTransitioning) {
      console.warn('Cannot load scene while transitioning');
      return;
    }

    const factory = this.sceneFactories.get(name);
    if (!factory) {
      throw new Error(`Scene not registered: ${name}`);
    }

    const transitionConfig: TransitionConfig = { ...DEFAULT_TRANSITION, ...transition };

    // Create or get cached scene
    let scene = this.scenes.get(name);
    if (!scene) {
      scene = await factory();
      this.scenes.set(name, scene);
      this.emit('scene:create', { name });
    }

    // Initialize and preload the scene
    if (scene.init) {
      await scene.init();
    }
    if (scene.preload) {
      await scene.preload();
    }
    if (scene.create) {
      await scene.create();
    }

    // Handle transition
    if (transitionConfig.type !== TransitionType.None && transitionConfig.duration > 0) {
      await this.performTransition(scene, transitionConfig);
    } else {
      await this.switchScene(scene);
    }
  }

  private async switchScene(newScene: Scene): Promise<void> {
    const previousScene = this.activeScene;
    const previousName = previousScene?.name || null;

    // Unload previous scene
    if (previousScene) {
      this.emit('scene:unload', { name: previousScene.name });
      if (previousScene.destroy) {
        await previousScene.destroy();
      }
    }

    // Activate new scene
    this.activeScene = newScene;
    this.emit('scene:load', { name: newScene.name });

    // Resume if paused
    if (this._paused) {
      this._paused = false;
    }
  }

  private async performTransition(newScene: Scene, config: TransitionConfig): Promise<void> {
    this.isTransitioning = true;
    this.nextScene = newScene;
    this.transitionConfig = config;
    this.transitionProgress = 0;
    this.transitionStartTime = performance.now();

    const previousName = this.activeScene?.name || null;
    this.emit('scene:transition:start', { from: previousName, to: newScene.name });

    // Wait for transition to complete
    await new Promise<void>(resolve => {
      const checkTransition = () => {
        if (!this.isTransitioning) {
          resolve();
        } else {
          requestAnimationFrame(checkTransition);
        }
      };
      checkTransition();
    });
  }

  /**
   * Update transition (called from game loop)
   */
  updateTransition(deltaTime: number): void {
    if (!this.isTransitioning || !this.nextScene) return;

    const elapsed = performance.now() - this.transitionStartTime;
    this.transitionProgress = Math.min(1, elapsed / (this.transitionConfig.duration * 1000));

    // Apply easing
    let easedProgress = this.transitionProgress;
    if (this.transitionConfig.easing) {
      easedProgress = this.transitionConfig.easing(this.transitionProgress);
    }

    // Handle custom transition
    if (this.transitionConfig.type === TransitionType.Custom && this.transitionConfig.custom) {
      this.transitionConfig.custom(easedProgress, this.activeScene, this.nextScene);
    }

    // Complete transition
    if (this.transitionProgress >= 1) {
      this.completeTransition();
    }
  }

  private async completeTransition(): Promise<void> {
    if (!this.nextScene) return;

    const previousName = this.activeScene?.name || null;
    const newName = this.nextScene.name;

    await this.switchScene(this.nextScene);

    this.isTransitioning = false;
    this.nextScene = null;
    this.transitionProgress = 0;

    this.emit('scene:transition:end', { from: previousName, to: newName });
  }

  /**
   * Get transition progress (0-1)
   */
  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  /**
   * Restart current scene
   */
  async restartScene(): Promise<void> {
    if (!this.activeScene) return;

    const name = this.activeScene.name;
    
    // Destroy current scene
    if (this.activeScene.destroy) {
      await this.activeScene.destroy();
    }

    // Remove from cache
    this.scenes.delete(name);

    // Reload
    await this.loadScene(name);
  }

  /**
   * Pause current scene
   */
  pause(): void {
    if (this.activeScene && !this._paused) {
      this._paused = true;
      if (this.activeScene.pause) {
        this.activeScene.pause();
      }
      this.emit('scene:pause', { name: this.activeScene.name });
    }
  }

  /**
   * Resume current scene
   */
  resume(): void {
    if (this.activeScene && this._paused) {
      this._paused = false;
      if (this.activeScene.resume) {
        this.activeScene.resume();
      }
      this.emit('scene:resume', { name: this.activeScene.name });
    }
  }

  /**
   * Update current scene
   */
  update(deltaTime: number): void {
    if (this.isTransitioning) {
      this.updateTransition(deltaTime);
    }

    if (this.activeScene && !this._paused) {
      if (this.activeScene.update) {
        this.activeScene.update(deltaTime);
      }
    }
  }

  /**
   * Fixed update current scene
   */
  fixedUpdate(fixedDeltaTime: number): void {
    if (this.activeScene && !this._paused) {
      if (this.activeScene.fixedUpdate) {
        this.activeScene.fixedUpdate(fixedDeltaTime);
      }
    }
  }

  /**
   * Render current scene
   */
  render(deltaTime: number): void {
    // Render active scene
    if (this.activeScene && this.activeScene.render) {
      this.activeScene.render(deltaTime);
    }

    // Render transition effects
    if (this.isTransitioning && this.nextScene && this.nextScene.render) {
      // Next scene might need to be rendered during transition
      // depending on transition type
    }
  }

  /**
   * Clear all scenes
   */
  async clear(): Promise<void> {
    // Destroy active scene
    if (this.activeScene && this.activeScene.destroy) {
      await this.activeScene.destroy();
    }

    // Clear all cached scenes
    for (const scene of this.scenes.values()) {
      if (scene !== this.activeScene && scene.destroy) {
        await scene.destroy();
      }
    }

    this.scenes.clear();
    this.sceneFactories.clear();
    this.activeScene = null;
    this.nextScene = null;
    this.isTransitioning = false;
    this._paused = false;
  }
}

// Easing functions for transitions
export const Easings = {
  linear: (t: number): number => t,
  
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInExpo: (t: number): number => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number): number => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },
  
  easeInBack: (t: number): number => {
    const c = 1.70158;
    return t * t * ((c + 1) * t - c);
  },
  easeOutBack: (t: number): number => {
    const c = 1.70158;
    return 1 + (--t) * t * ((c + 1) * t + c);
  },
  
  easeInElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  easeOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  
  easeInBounce: (t: number): number => 1 - Easings.easeOutBounce(1 - t),
  easeOutBounce: (t: number): number => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
};

export default SceneManager;
