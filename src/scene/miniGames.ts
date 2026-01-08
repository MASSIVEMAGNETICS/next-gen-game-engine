import { Engine } from '../core';
import { BaseSystem, Entity, World } from '../ecs';
import { Transform2D, Velocity2D } from '../ecs/components';
import { Color } from '../rendering';
import { InputManager, KeyCode } from '../input';
import { Vector2, MathUtils } from '../math';
import { SceneConfig } from './index';

export interface MiniGameRegistration {
  name: string;
  description: string;
  goal: string;
  sceneName: string;
  systemName: string;
}

interface MiniGameDefinition {
  meta: MiniGameRegistration;
  config: SceneConfig;
}

class NeonRunnerSystem extends BaseSystem {
  readonly name = 'NeonRunnerSystem';
  readonly requiredComponents = ['Transform2D', 'Velocity2D'];

  readonly state = {
    distance: 0,
    energy: 1,
    cleared: 0
  };

  private readonly baseSpeed = 90;
  private readonly boostSpeed = 160;
  private readonly obstacleSpeed = 95;
  private readonly laneWidth: number;

  get startingSpeed(): number {
    return this.baseSpeed;
  }

  get obstacleDrift(): number {
    return this.obstacleSpeed;
  }

  constructor(private readonly input: InputManager, arenaWidth: number) {
    super();
    this.laneWidth = arenaWidth;
  }

  update(entities: Entity[], deltaTime: number): void {
    let furthestObstacle = -Infinity;

    for (const entity of entities) {
      const transform = entity.getComponent<Transform2D>('Transform2D');
      const velocity = entity.getComponent<Velocity2D>('Velocity2D');
      if (!transform || !velocity) continue;

      if (entity.hasTag('player')) {
        const boosting = this.input.isKeyHeld(KeyCode.Space) && this.state.energy > 0.15;
        const targetSpeed = boosting ? this.boostSpeed : this.baseSpeed;
        const acceleration = (targetSpeed - velocity.linear.x) * 4;

        velocity.linear.x += acceleration * deltaTime;
        transform.position = transform.position.add(velocity.linear.multiply(deltaTime));

        this.state.distance = Math.max(this.state.distance, transform.position.x + this.laneWidth / 2);
        const energyChange = boosting ? -0.6 * deltaTime : 0.45 * deltaTime;
        this.state.energy = MathUtils.clamp(this.state.energy + energyChange, 0, 1.25);
      } else if (entity.hasTag('obstacle')) {
        velocity.linear.x = -this.obstacleSpeed;
        transform.position = transform.position.add(velocity.linear.multiply(deltaTime));
        furthestObstacle = Math.max(furthestObstacle, transform.position.x);

        if (transform.position.x < -this.laneWidth / 2) {
          transform.position.x = (isFinite(furthestObstacle) ? furthestObstacle : this.laneWidth / 2) + 80;
          this.state.cleared++;
        }
      }
    }
  }
}

class OrbitalRescueSystem extends BaseSystem {
  readonly name = 'OrbitalRescueSystem';
  readonly requiredComponents = ['Transform2D'];

  readonly state = {
    rescued: 0,
    orbitAngle: 0,
    targetAngle: Math.PI / 2
  };

  private readonly turnSpeed = 2.25;
  private readonly passiveSpin = 0.9;

  constructor(
    private readonly input: InputManager,
    private readonly center: Vector2,
    private readonly radius: number
  ) {
    super();
  }

  update(entities: Entity[], deltaTime: number): void {
    const turnInput =
      (this.input.isKeyHeld(KeyCode.D) || this.input.isKeyHeld(KeyCode.ArrowRight) ? 1 : 0) -
      (this.input.isKeyHeld(KeyCode.A) || this.input.isKeyHeld(KeyCode.ArrowLeft) ? 1 : 0);

    this.state.orbitAngle += (this.passiveSpin + turnInput * this.turnSpeed) * deltaTime;
    this.state.orbitAngle %= Math.PI * 2;

    this.state.targetAngle = (this.state.targetAngle + deltaTime * 0.3) % (Math.PI * 2);

    let rescuer: Entity | undefined;
    let capsule: Entity | undefined;

    for (const entity of entities) {
      if (entity.hasTag('rescuer')) rescuer = entity;
      if (entity.hasTag('capsule')) capsule = entity;
    }

    const rescuerTransform = rescuer?.getComponent<Transform2D>('Transform2D');
    if (rescuerTransform) {
      rescuerTransform.position = this.center.add(
        new Vector2(
          Math.cos(this.state.orbitAngle) * this.radius,
          Math.sin(this.state.orbitAngle) * this.radius
        )
      );
    }

    const capsuleTransform = capsule?.getComponent<Transform2D>('Transform2D');
    if (capsuleTransform) {
      capsuleTransform.position = this.center.add(
        new Vector2(
          Math.cos(this.state.targetAngle) * this.radius,
          Math.sin(this.state.targetAngle) * this.radius
        )
      );
    }

    const angleDifference = Math.abs(Math.atan2(
      Math.sin(this.state.orbitAngle - this.state.targetAngle),
      Math.cos(this.state.orbitAngle - this.state.targetAngle)
    ));

    if (angleDifference < 0.12) {
      this.state.rescued++;
      this.state.targetAngle = (this.state.targetAngle + 2 + this.state.rescued * 0.05) % (Math.PI * 2);
    }
  }
}

class StarCollectorSystem extends BaseSystem {
  readonly name = 'StarCollectorSystem';
  readonly requiredComponents = ['Transform2D'];

  readonly state = {
    collected: 0,
    missed: 0
  };

  private readonly playerX: number;
  private readonly starResetX: number;
  private readonly lanes: number[];
  private laneIndex: number = 0;
  private readonly starSpeed: number;

  constructor(private readonly input: InputManager, arenaWidth: number, arenaHeight: number) {
    super();
    this.playerX = -arenaWidth / 4;
    this.starResetX = arenaWidth / 2;
    this.lanes = [-arenaHeight / 3, 0, arenaHeight / 3];
    this.starSpeed = arenaWidth * 0.45;
  }

  update(entities: Entity[], deltaTime: number): void {
    let player: Entity | undefined;
    let star: Entity | undefined;

    for (const entity of entities) {
      if (entity.hasTag('pilot')) player = entity;
      if (entity.hasTag('star')) star = entity;
    }

    const playerTransform = player?.getComponent<Transform2D>('Transform2D');
    const starTransform = star?.getComponent<Transform2D>('Transform2D');

    if (!playerTransform || !starTransform) return;

    const vertical =
      (this.input.isKeyHeld(KeyCode.W) || this.input.isKeyHeld(KeyCode.ArrowUp) ? -1 : 0) +
      (this.input.isKeyHeld(KeyCode.S) || this.input.isKeyHeld(KeyCode.ArrowDown) ? 1 : 0);

    const targetLane = this.lanes[this.laneIndex];
    const followTarget = vertical !== 0
      ? playerTransform.position.y + vertical * 120 * deltaTime
      : targetLane;

    playerTransform.position = new Vector2(
      this.playerX,
      playerTransform.position.y + (followTarget - playerTransform.position.y) * 3 * deltaTime
    );

    starTransform.position = starTransform.position.add(new Vector2(-this.starSpeed * deltaTime, 0));

    if (starTransform.position.x <= this.playerX) {
      const aligned = Math.abs(playerTransform.position.y - starTransform.position.y) < 35;
      if (aligned) {
        this.state.collected++;
      } else {
        this.state.missed++;
      }

      this.laneIndex = (this.laneIndex + 1) % this.lanes.length;
      starTransform.position = new Vector2(this.starResetX, this.lanes[this.laneIndex]);
    }
  }
}

function createNeonRunner(engine: Engine): MiniGameDefinition {
  const system = new NeonRunnerSystem(engine.input, engine.width);

  const config: SceneConfig = {
    name: 'mini:neon-runner',
    create: (world: World) => {
      const player = world.createEntity('runner');
      player.addTag('player');
      world.addComponent(player, new Transform2D(new Vector2(-engine.width / 2 + 30, 0)));
      world.addComponent(player, new Velocity2D(new Vector2(system.startingSpeed, 0)));

      for (let i = 0; i < 3; i++) {
        const obstacle = world.createEntity(`runner-obstacle-${i}`);
        obstacle.addTag('obstacle');
        world.addComponent(obstacle, new Transform2D(new Vector2(i * 140, 0)));
        world.addComponent(obstacle, new Velocity2D(new Vector2(-system.obstacleDrift, 0)));
      }

      world.addSystem(system);
    },
    update: (world: World, deltaTime: number) => {
      world.update(deltaTime);
    },
    render: (world: World) => {
      const renderer = engine.renderer;
      const player = world.findEntityByName('runner');
      if (!player) return;

      const playerTransform = player.getComponent<Transform2D>('Transform2D');
      const playerColor = new Color(0.2, 0.9, 1, 1);
      if (playerTransform) {
        renderer.drawRect(playerTransform.position, 26, 26, playerColor, true);
      }

      const obstacles = world.queryEntitiesByTag('obstacle');
      for (const obstacle of obstacles) {
        const transform = obstacle.getComponent<Transform2D>('Transform2D');
        if (transform) {
          renderer.drawRect(transform.position, 18, 36, new Color(1, 0.35, 0.4, 1), true);
        }
      }
    },
    destroy: (world: World) => {
      world.clear();
    }
  };

  return {
    meta: {
      name: 'Neon Runner',
      description: 'Dash through an endless neon track while weaving around kinetic towers.',
      goal: 'Cover distance and clear towers without losing your momentum.',
      sceneName: config.name,
      systemName: system.name
    },
    config
  };
}

function createOrbitalRescue(engine: Engine): MiniGameDefinition {
  const radius = Math.min(engine.width, engine.height) * 0.35;
  const system = new OrbitalRescueSystem(engine.input, new Vector2(0, 0), radius);

  const config: SceneConfig = {
    name: 'mini:orbital-rescue',
    create: (world: World) => {
      const rescuer = world.createEntity('orbiter');
      rescuer.addTag('rescuer');
      world.addComponent(rescuer, new Transform2D(new Vector2(radius, 0)));

      const capsule = world.createEntity('capsule');
      capsule.addTag('capsule');
      world.addComponent(capsule, new Transform2D(new Vector2(radius, 0)));

      world.addSystem(system);
    },
    update: (world: World, deltaTime: number) => {
      world.update(deltaTime);
    },
    render: (world: World) => {
      const renderer = engine.renderer;
      const rescuer = world.findEntityByName('orbiter');
      const capsule = world.findEntityByName('capsule');

      if (rescuer) {
        const transform = rescuer.getComponent<Transform2D>('Transform2D');
        if (transform) {
          renderer.drawCircle(transform.position, 10, new Color(0.7, 1, 0.4, 1), true);
        }
      }

      if (capsule) {
        const transform = capsule.getComponent<Transform2D>('Transform2D');
        if (transform) {
          renderer.drawCircle(transform.position, 8, new Color(1, 0.8, 0.3, 1), true);
        }
      }
    },
    destroy: (world: World) => {
      world.clear();
    }
  };

  return {
    meta: {
      name: 'Orbital Rescue',
      description: 'Swing around a micro-planet and sync up with stranded capsules.',
      goal: 'Match the rescue angle before the capsule drifts away.',
      sceneName: config.name,
      systemName: system.name
    },
    config
  };
}

function createStarCollector(engine: Engine): MiniGameDefinition {
  const system = new StarCollectorSystem(engine.input, engine.width, engine.height);

  const config: SceneConfig = {
    name: 'mini:star-collector',
    create: (world: World) => {
      const pilot = world.createEntity('pilot');
      pilot.addTag('pilot');
      world.addComponent(pilot, new Transform2D(new Vector2(-engine.width / 4, 0)));

      const star = world.createEntity('star');
      star.addTag('star');
      world.addComponent(star, new Transform2D(new Vector2(engine.width / 2, 0)));

      world.addSystem(system);
    },
    update: (world: World, deltaTime: number) => {
      world.update(deltaTime);
    },
    render: (world: World) => {
      const renderer = engine.renderer;
      const pilot = world.findEntityByName('pilot');
      const star = world.findEntityByName('star');

      if (pilot) {
        const transform = pilot.getComponent<Transform2D>('Transform2D');
        if (transform) {
          renderer.drawRect(transform.position, 20, 32, new Color(0.3, 0.6, 1, 1), true);
        }
      }

      if (star) {
        const transform = star.getComponent<Transform2D>('Transform2D');
        if (transform) {
          renderer.drawCircle(transform.position, 9, new Color(1, 0.95, 0.2, 1), true);
        }
      }
    },
    destroy: (world: World) => {
      world.clear();
    }
  };

  return {
    meta: {
      name: 'Star Collector',
      description: 'Glide between lanes to scoop up drifting starlight.',
      goal: 'Align with passing stars before they slip by.',
      sceneName: config.name,
      systemName: system.name
    },
    config
  };
}

export function registerMiniGamePack(engine: Engine): MiniGameRegistration[] {
  const definitions = [
    createNeonRunner(engine),
    createOrbitalRescue(engine),
    createStarCollector(engine)
  ];

  for (const def of definitions) {
    engine.scenes.registerScene(def.config);
  }

  return definitions.map(def => def.meta);
}

export { NeonRunnerSystem, OrbitalRescueSystem, StarCollectorSystem };
