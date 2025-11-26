# NextGen Game Engine 🎮

A modern, high-performance, state-of-the-art game engine built with TypeScript. Features a powerful Entity-Component-System (ECS) architecture, 2D/3D physics, audio management, input handling, and more.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-127%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

## ✨ Features

- **🎯 Entity-Component-System (ECS)** - Data-oriented architecture for maximum performance and flexibility
- **🧮 Math Library** - Comprehensive Vector2, Vector3, Matrix4, Quaternion operations with SIMD-style optimizations
- **⚡ Physics Engine** - Full 2D physics with collision detection, rigid body dynamics, and raycasting
- **🎨 Rendering System** - Abstract renderer interface with Canvas2D implementation
- **🔊 Audio System** - Web Audio API powered audio with spatial sound, crossfading, and effects
- **🎮 Input System** - Unified keyboard, mouse, touch, and gamepad support with action mapping
- **📦 Asset Management** - Async asset loading with caching, bundles, and progress tracking
- **🎬 Scene Management** - Scene loading, transitions, and lifecycle management
- **📢 Event System** - Type-safe event emitter for decoupled communication

## 📦 Installation

```bash
npm install next-gen-game-engine
```

## 🚀 Quick Start

```typescript
import { Engine, Entity, Transform2D, Velocity2D, Sprite, KeyCode } from 'next-gen-game-engine';

// Create engine instance
const engine = new Engine({
  width: 800,
  height: 600,
  canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
  targetFPS: 60
});

// Initialize
await engine.init();

// Create a player entity
const player = engine.world.createEntity('Player');
engine.world.addComponent(player, new Transform2D());
engine.world.addComponent(player, new Velocity2D());
engine.world.addComponent(player, new Sprite('player-texture', 32, 32));

// Start the game loop
engine.start();
```

## 🏗️ Architecture

### Entity-Component-System (ECS)

The engine uses a data-oriented ECS architecture:

```typescript
import { World, Entity, Component, BaseSystem } from 'next-gen-game-engine';

// Create a world
const world = new World();

// Create entities
const entity = world.createEntity('MyEntity');

// Add components
world.addComponent(entity, new Transform2D());
world.addComponent(entity, new Velocity2D());

// Create custom systems
class MovementSystem extends BaseSystem {
  name = 'MovementSystem';
  requiredComponents = ['Transform2D', 'Velocity2D'];

  update(entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const transform = entity.getComponent<Transform2D>('Transform2D');
      const velocity = entity.getComponent<Velocity2D>('Velocity2D');
      
      if (transform && velocity) {
        transform.position = transform.position.add(
          velocity.linear.multiply(deltaTime)
        );
      }
    }
  }
}

world.addSystem(new MovementSystem());
```

### Built-in Components

- **Transform2D/Transform3D** - Position, rotation, and scale
- **Velocity2D/Velocity3D** - Linear and angular velocity
- **RigidBody2D** - Physics properties (mass, drag, etc.)
- **BoxCollider2D/CircleCollider2D** - Collision detection
- **Sprite/AnimatedSprite** - 2D rendering
- **Camera2D** - View management
- **AudioSource** - Sound playback
- **Script** - Custom behavior

### Physics

```typescript
import { PhysicsWorld, Vector2 } from 'next-gen-game-engine';

const physics = engine.physics;

// Configure gravity
physics.gravity = new Vector2(0, 9.81 * 100);

// Listen for collisions
physics.on('collision:enter', (info) => {
  console.log('Collision between', info.entityA.name, 'and', info.entityB.name);
});

// Raycast
const hit = physics.raycast(
  new Vector2(0, 0),     // Origin
  new Vector2(1, 0),     // Direction
  100,                   // Max distance
  entities
);

if (hit) {
  console.log('Hit entity:', hit.entity.name, 'at', hit.point);
}
```

### Input System

```typescript
import { InputManager, KeyCode, MouseButton } from 'next-gen-game-engine';

const input = engine.input;

// Register actions
input.registerAction({
  name: 'jump',
  keys: [KeyCode.Space, KeyCode.W],
  gamepadButtons: [0] // A button
});

// Check input
if (input.isActionDown('jump')) {
  player.jump();
}

// Mouse position
const mousePos = input.getMousePosition();

// Gamepad
const leftStick = input.getGamepadLeftStick(0);
```

### Scene Management

```typescript
import { SceneManager, TransitionType, Easings } from 'next-gen-game-engine';

const scenes = engine.scenes;

// Register scenes
scenes.registerScene({
  name: 'menu',
  create: (world) => {
    // Create menu entities
  },
  update: (world, deltaTime) => {
    // Update menu
  }
});

scenes.registerScene({
  name: 'game',
  preload: async () => {
    // Load assets
    await engine.assets.load('player', AssetType.Texture, 'player.png');
  },
  create: (world) => {
    // Create game entities
  }
});

// Load scene with transition
await scenes.loadScene('game', {
  type: TransitionType.Fade,
  duration: 0.5,
  easing: Easings.easeInOutQuad
});
```

### Audio System

```typescript
import { AudioManager } from 'next-gen-game-engine';

const audio = engine.audio;

// Load audio
await audio.loadClip('bgm', 'music/background.mp3');
await audio.loadClip('jump', 'sounds/jump.wav');

// Play music
audio.playMusic('bgm', { volume: 0.8, loop: true });

// Play sound effects
audio.playSound('jump', { volume: 1.0, pitch: 1.0, pan: 0 });

// 2D spatial audio
const pan = audio.calculatePan2D(soundPos, listenerPos);
const volume = audio.calculateVolume2D(soundPos, listenerPos);
audio.playSound('sfx', { volume, pan });
```

### Asset Management

```typescript
import { AssetManager, AssetType } from 'next-gen-game-engine';

const assets = engine.assets;

// Set base path
assets.setBasePath('/assets/');

// Load individual assets
await assets.load('player', AssetType.Texture, 'player.png');
await assets.load('config', AssetType.JSON, 'config.json');

// Load bundles
await assets.loadBundle({
  name: 'level1',
  assets: [
    { id: 'bg', type: AssetType.Texture, url: 'backgrounds/level1.png' },
    { id: 'music', type: AssetType.Audio, url: 'music/level1.mp3' }
  ]
});

// Progress tracking
assets.on('bundle:progress', ({ loaded, total, percentage }) => {
  console.log(`Loading: ${percentage}%`);
});

// Get loaded assets
const playerTexture = assets.get<HTMLImageElement>('player');
```

### Event System

```typescript
import { EventBus } from 'next-gen-game-engine';

// Global event bus
const events = EventBus.getInstance();

// Subscribe to events
events.on('player:death', (data) => {
  console.log('Player died:', data.cause);
});

// Emit events
events.emit('player:death', { cause: 'enemy' });

// One-time listener
events.once('game:start', () => {
  console.log('Game started!');
});
```

## 🎮 Example Game

```typescript
import Engine, { 
  Transform2D, 
  Velocity2D, 
  RigidBody2D, 
  CircleCollider2D,
  BaseSystem,
  KeyCode,
  Color
} from 'next-gen-game-engine';

// Custom player controller system
class PlayerControllerSystem extends BaseSystem {
  name = 'PlayerController';
  requiredComponents = ['Transform2D', 'Velocity2D'];
  priority = -50;

  private input!: InputManager;
  private speed = 200;

  init(world: World): void {
    this.input = (world as any).engine?.input;
  }

  update(entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      if (!entity.hasTag('player')) continue;

      const velocity = entity.getComponent<Velocity2D>('Velocity2D');
      if (!velocity || !this.input) continue;

      // Movement
      let moveX = 0;
      let moveY = 0;

      if (this.input.isKeyHeld(KeyCode.A)) moveX -= 1;
      if (this.input.isKeyHeld(KeyCode.D)) moveX += 1;
      if (this.input.isKeyHeld(KeyCode.W)) moveY -= 1;
      if (this.input.isKeyHeld(KeyCode.S)) moveY += 1;

      velocity.linear.x = moveX * this.speed;
      velocity.linear.y = moveY * this.speed;
    }
  }
}

// Initialize game
async function main() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  
  const engine = new Engine({
    width: 800,
    height: 600,
    canvas,
    backgroundColor: new Color(0.1, 0.1, 0.2, 1)
  });

  await engine.init();

  // Add systems
  engine.world.addSystem(new PlayerControllerSystem());

  // Create player
  const player = engine.world.createEntity('Player');
  player.addTag('player');
  engine.world.addComponent(player, new Transform2D(new Vector2(400, 300)));
  engine.world.addComponent(player, new Velocity2D());
  engine.world.addComponent(player, new RigidBody2D(1, 0.1, 0, 0)); // No gravity
  engine.world.addComponent(player, new CircleCollider2D(16));

  // Start game
  engine.start();

  // Handle window resize
  window.addEventListener('resize', () => {
    engine.resize(window.innerWidth, window.innerHeight);
  });
}

main();
```

## 📖 API Reference

### Engine

| Method | Description |
|--------|-------------|
| `init()` | Initialize the engine |
| `start()` | Start the game loop |
| `stop()` | Stop the game loop |
| `pause()` | Pause the game |
| `resume()` | Resume the game |
| `resize(width, height)` | Resize the canvas |
| `destroy()` | Clean up resources |

### World

| Method | Description |
|--------|-------------|
| `createEntity(name?)` | Create a new entity |
| `destroyEntity(entity)` | Destroy an entity |
| `addComponent(entity, component)` | Add component to entity |
| `removeComponent(entity, type)` | Remove component from entity |
| `addSystem(system)` | Add a system |
| `removeSystem(system)` | Remove a system |
| `queryEntities(componentTypes)` | Query entities by components |
| `queryEntitiesByTag(tag)` | Query entities by tag |

### Vector2

| Method | Description |
|--------|-------------|
| `add(v)` | Add vectors |
| `subtract(v)` | Subtract vectors |
| `multiply(scalar)` | Multiply by scalar |
| `dot(v)` | Dot product |
| `cross(v)` | Cross product |
| `magnitude()` | Get length |
| `normalize()` | Normalize to unit vector |
| `distance(v)` | Distance to another vector |
| `lerp(v, t)` | Linear interpolation |
| `rotate(angle)` | Rotate by angle |

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🔨 Building

```bash
# Build
npm run build

# Build in watch mode
npm run build:watch

# Type checking
npm run lint
```

## 📁 Project Structure

```
next-gen-game-engine/
├── src/
│   ├── core/           # Main engine class
│   ├── ecs/            # Entity-Component-System
│   ├── math/           # Vector, Matrix, Quaternion
│   ├── physics/        # Physics engine
│   ├── rendering/      # Renderer abstraction
│   ├── audio/          # Audio system
│   ├── input/          # Input handling
│   ├── assets/         # Asset management
│   ├── scene/          # Scene management
│   ├── events/         # Event system
│   └── index.ts        # Main exports
├── tests/              # Test files
├── dist/               # Compiled output
└── package.json
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with ❤️ using modern TypeScript and game development best practices.

