/**
 * NextGen Game Engine - Core Engine
 * Main engine class that ties all systems together
 */

import { EventEmitter, EventBus, EngineEvents } from '../events';
import { World, Entity, System, Component } from '../ecs';
import { InputManager, KeyCode, MouseButton } from '../input';
import { Renderer, Canvas2DRenderer, HeadlessRenderer, Color } from '../rendering';
import { PhysicsWorld, PhysicsSystem, PhysicsConfig } from '../physics';
import { AudioManager } from '../audio';
import { AssetManager, AssetType } from '../assets';
import { SceneManager, Scene } from '../scene';
import { Vector2, Vector3, Matrix4, Quaternion, MathUtils } from '../math';

/**
 * Engine configuration
 */
export interface EngineConfig {
  width: number;
  height: number;
  canvas?: HTMLCanvasElement | null;
  backgroundColor?: Color;
  targetFPS?: number;
  fixedTimestep?: number;
  maxDeltaTime?: number;
  antialias?: boolean;
  pixelRatio?: number;
  physics?: Partial<PhysicsConfig>;
  debug?: boolean;
  headless?: boolean;
}

/**
 * Default engine configuration
 */
const DEFAULT_CONFIG: Required<EngineConfig> = {
  width: 800,
  height: 600,
  canvas: null,
  backgroundColor: new Color(0.1, 0.1, 0.1, 1),
  targetFPS: 60,
  fixedTimestep: 1 / 60,
  maxDeltaTime: 0.1,
  antialias: true,
  pixelRatio: 1,
  physics: {},
  debug: false,
  headless: false
};

/**
 * Engine state
 */
export enum EngineState {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  Running = 'running',
  Paused = 'paused',
  Stopped = 'stopped'
}

/**
 * Engine statistics
 */
export interface EngineStats {
  fps: number;
  frameTime: number;
  updateTime: number;
  renderTime: number;
  entityCount: number;
  drawCalls: number;
}

/**
 * NextGen Game Engine
 * A modern, high-performance game engine
 */
export class Engine extends EventEmitter<EngineEvents> {
  // Core systems
  public readonly input: InputManager;
  public readonly renderer: Renderer;
  public readonly audio: AudioManager;
  public readonly assets: AssetManager;
  public readonly scenes: SceneManager;
  public readonly eventBus: EventBus;

  // Configuration
  private config: Required<EngineConfig>;

  // State
  private _state: EngineState = EngineState.Uninitialized;
  private _running: boolean = false;
  private _paused: boolean = false;

  // Timing
  private lastTime: number = 0;
  private accumulator: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private animationFrameId: number = 0;

  // Stats
  private _stats: EngineStats = {
    fps: 0,
    frameTime: 0,
    updateTime: 0,
    renderTime: 0,
    entityCount: 0,
    drawCalls: 0
  };

  // Physics
  private physicsWorld: PhysicsWorld;

  // Global world for simple games
  private _world: World;

  constructor(config: Partial<EngineConfig> = {}) {
    super();

    // Merge config
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<EngineConfig>;
    if (config.backgroundColor) {
      this.config.backgroundColor = config.backgroundColor;
    }
    if (config.physics) {
      this.config.physics = config.physics;
    }

    // Initialize core systems
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.assets = new AssetManager();
    this.scenes = new SceneManager();
    this.eventBus = EventBus.getInstance();
    this._world = new World();

    // Initialize renderer
    if (this.config.headless) {
      this.renderer = new HeadlessRenderer();
    } else {
      this.renderer = new Canvas2DRenderer();
    }

    // Initialize physics
    this.physicsWorld = new PhysicsWorld({
      gravity: new Vector2(0, 9.81 * 100),
      fixedTimestep: this.config.fixedTimestep,
      ...this.config.physics
    });
  }

  /**
   * Get engine state
   */
  get state(): EngineState {
    return this._state;
  }

  /**
   * Get engine stats
   */
  get stats(): EngineStats {
    return { ...this._stats };
  }

  /**
   * Get global world
   */
  get world(): World {
    return this._world;
  }

  /**
   * Get physics world
   */
  get physics(): PhysicsWorld {
    return this.physicsWorld;
  }

  /**
   * Get if engine is running
   */
  get running(): boolean {
    return this._running;
  }

  /**
   * Get if engine is paused
   */
  get paused(): boolean {
    return this._paused;
  }

  /**
   * Get canvas width
   */
  get width(): number {
    return this.config.width;
  }

  /**
   * Get canvas height
   */
  get height(): number {
    return this.config.height;
  }

  /**
   * Initialize the engine
   */
  async init(): Promise<void> {
    if (this._state !== EngineState.Uninitialized) {
      console.warn('Engine already initialized');
      return;
    }

    this._state = EngineState.Initializing;

    // Initialize renderer
    this.renderer.init(this.config.canvas);
    this.renderer.resize(this.config.width, this.config.height);

    // Initialize input
    if (!this.config.headless && typeof window !== 'undefined') {
      this.input.init(window);
    }

    // Initialize audio
    if (!this.config.headless) {
      this.audio.init();
    }

    // Add default physics system to world
    this._world.addSystem(new PhysicsSystem(this.config.physics));

    this._state = EngineState.Stopped;

    if (this.config.debug) {
      console.log('NextGen Game Engine initialized');
      console.log(`Resolution: ${this.config.width}x${this.config.height}`);
      console.log(`Target FPS: ${this.config.targetFPS}`);
    }
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this._state === EngineState.Uninitialized) {
      throw new Error('Engine not initialized. Call init() first.');
    }

    if (this._running) {
      console.warn('Engine already running');
      return;
    }

    this._running = true;
    this._paused = false;
    this._state = EngineState.Running;
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.frameCount = 0;

    this.emit('engine:start', undefined);
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (!this._running) return;

    this._running = false;
    this._state = EngineState.Stopped;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }

    this.emit('engine:stop', undefined);
  }

  /**
   * Pause the game
   */
  pause(): void {
    if (!this._running || this._paused) return;

    this._paused = true;
    this._state = EngineState.Paused;
    this.scenes.pause();
    this.emit('engine:pause', undefined);
  }

  /**
   * Resume the game
   */
  resume(): void {
    if (!this._paused) return;

    this._paused = false;
    this._state = EngineState.Running;
    this.lastTime = performance.now();
    this.scenes.resume();
    this.emit('engine:resume', undefined);
  }

  /**
   * Main game loop
   */
  private gameLoop(): void {
    if (!this._running) return;

    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Cap delta time
    deltaTime = Math.min(deltaTime, this.config.maxDeltaTime);

    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.fpsTime >= 1000) {
      this._stats.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = currentTime;
    }

    // Update stats
    this._stats.frameTime = deltaTime * 1000;

    if (!this._paused) {
      // Fixed timestep update
      this.accumulator += deltaTime;
      const fixedDeltaTime = this.config.fixedTimestep;

      const updateStart = performance.now();

      while (this.accumulator >= fixedDeltaTime) {
        this.fixedUpdate(fixedDeltaTime);
        this.accumulator -= fixedDeltaTime;
      }

      // Variable update
      this.update(deltaTime);

      this._stats.updateTime = performance.now() - updateStart;

      // Render
      const renderStart = performance.now();
      this.render(deltaTime);
      this._stats.renderTime = performance.now() - renderStart;
    }

    // Update input at end of frame
    this.input.update();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Fixed update (physics, etc.)
   */
  private fixedUpdate(fixedDeltaTime: number): void {
    this.emit('engine:fixedUpdate', { fixedDeltaTime });
    
    // Update scenes
    this.scenes.fixedUpdate(fixedDeltaTime);
    
    // Update global world
    this._world.fixedUpdate(fixedDeltaTime);
  }

  /**
   * Variable update (input, logic, etc.)
   */
  private update(deltaTime: number): void {
    const totalTime = performance.now() / 1000;
    this.emit('engine:update', { deltaTime, totalTime });
    
    // Update scenes
    this.scenes.update(deltaTime);
    
    // Update global world
    this._world.update(deltaTime);

    // Update entity count stat
    const activeScene = this.scenes.currentScene;
    if (activeScene) {
      this._stats.entityCount = activeScene.world.getEntityCount();
    } else {
      this._stats.entityCount = this._world.getEntityCount();
    }
  }

  /**
   * Render
   */
  private render(deltaTime: number): void {
    this.emit('engine:render', { deltaTime });

    // Begin frame
    this.renderer.beginFrame();
    this.renderer.clear(this.config.backgroundColor);

    // Render scenes
    this.scenes.render(deltaTime);

    // End frame
    this.renderer.endFrame();
  }

  /**
   * Resize the engine
   */
  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.renderer.resize(width, height);
  }

  /**
   * Destroy the engine and cleanup
   */
  async destroy(): Promise<void> {
    this.stop();

    // Clear scenes
    await this.scenes.clear();

    // Clear world
    this._world.clear();

    // Destroy subsystems
    this.renderer.destroy();
    this.audio.destroy();
    this.assets.unloadAll();
    this.input.clear();

    // Reset event bus
    EventBus.reset();

    this._state = EngineState.Uninitialized;

    if (this.config.debug) {
      console.log('NextGen Game Engine destroyed');
    }
  }
}

// Re-export everything for convenience
export * from '../math';
export * from '../events';
export * from '../ecs';
export * from '../ecs/components';
export * from '../input';
export * from '../rendering';
export * from '../physics';
export * from '../audio';
export * from '../assets';
export * from '../scene';

// Default export
export default Engine;
