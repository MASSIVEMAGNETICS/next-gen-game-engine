/**
 * NextGen Game Engine
 * A modern, high-performance, state-of-the-art game engine
 * 
 * @packageDocumentation
 * @module nextgen-game-engine
 */

// Core Engine
export { Engine, EngineConfig, EngineState, EngineStats } from './core';

// Math Library
export {
  Vector2,
  Vector3,
  Matrix4,
  Quaternion,
  MathUtils
} from './math';

// Event System
export {
  EventEmitter,
  EventBus,
  EventCallback,
  EventSubscription,
  EngineEvents
} from './events';

// Entity Component System
export {
  Entity,
  EntityId,
  Component,
  System,
  BaseSystem,
  World
} from './ecs';

// Built-in Components
export {
  Transform2D,
  Transform3D,
  Velocity2D,
  Velocity3D,
  RigidBody2D,
  Collider2D,
  BoxCollider2D,
  CircleCollider2D,
  Sprite,
  AnimatedSprite,
  Camera2D,
  AudioSource,
  Tag,
  Script,
  ScriptBehavior
} from './ecs/components';

// Input System
export {
  InputManager,
  InputAction,
  InputEvents,
  KeyCode,
  MouseButton,
  GamepadButton,
  GamepadAxis
} from './input';

// Rendering System
export {
  Renderer,
  Canvas2DRenderer,
  HeadlessRenderer,
  Color,
  Texture,
  Shader,
  Mesh,
  Vertex,
  RenderCommandType
} from './rendering';

// Physics System
export {
  PhysicsWorld,
  PhysicsSystem,
  PhysicsConfig,
  PhysicsEvents,
  CollisionInfo,
  RaycastHit,
  AABB
} from './physics';

// Audio System
export {
  AudioManager,
  AudioClip,
  AudioConfig,
  AudioEvents
} from './audio';

// Asset Management
export {
  AssetManager,
  AssetType,
  AssetState,
  AssetMetadata,
  AssetBundle,
  AssetEvents,
  LoadOptions
} from './assets';

// Scene Management
export {
  SceneManager,
  Scene,
  SceneConfig,
  BasicScene,
  SceneEvents,
  TransitionType,
  TransitionConfig,
  Easings
} from './scene';

// Mini game collection
export {
  registerMiniGamePack,
  MiniGameRegistration,
  NeonRunnerSystem,
  OrbitalRescueSystem,
  StarCollectorSystem
} from './scene/miniGames';

// Default export - the main Engine class
import { Engine } from './core';
export default Engine;
