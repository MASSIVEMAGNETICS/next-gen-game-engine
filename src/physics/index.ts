/**
 * NextGen Game Engine - Physics System
 * 2D Physics engine with collision detection and response
 */

import { Vector2 } from '../math';
import { EventEmitter } from '../events';
import { World, Entity, BaseSystem } from '../ecs';
import { Transform2D, Velocity2D, RigidBody2D, BoxCollider2D, CircleCollider2D, Collider2D } from '../ecs/components';

/**
 * Physics events
 */
export interface PhysicsEvents {
  'collision:enter': CollisionInfo;
  'collision:stay': CollisionInfo;
  'collision:exit': CollisionInfo;
  'trigger:enter': CollisionInfo;
  'trigger:exit': CollisionInfo;
}

/**
 * Collision information
 */
export interface CollisionInfo {
  entityA: Entity;
  entityB: Entity;
  point: Vector2;
  normal: Vector2;
  penetration: number;
}

/**
 * AABB for broad phase collision detection
 */
export interface AABB {
  min: Vector2;
  max: Vector2;
}

/**
 * Physics configuration
 */
export interface PhysicsConfig {
  gravity: Vector2;
  fixedTimestep: number;
  velocityIterations: number;
  positionIterations: number;
  maxVelocity: number;
  sleepThreshold: number;
}

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: new Vector2(0, 9.81),
  fixedTimestep: 1 / 60,
  velocityIterations: 8,
  positionIterations: 3,
  maxVelocity: 1000,
  sleepThreshold: 0.01
};

/**
 * Physics World - manages physics simulation
 */
export class PhysicsWorld extends EventEmitter<PhysicsEvents> {
  private config: PhysicsConfig;
  private accumulator: number = 0;
  private activeCollisions: Map<string, CollisionInfo> = new Map();
  private layers: Map<number, Set<number>> = new Map();

  constructor(config: Partial<PhysicsConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupDefaultLayers();
  }

  private setupDefaultLayers(): void {
    // Default: all layers collide with all layers
    for (let i = 0; i < 32; i++) {
      this.layers.set(i, new Set([...Array(32).keys()]));
    }
  }

  setLayerCollision(layer1: number, layer2: number, collide: boolean): void {
    const l1 = this.layers.get(layer1);
    const l2 = this.layers.get(layer2);
    
    if (l1 && l2) {
      if (collide) {
        l1.add(layer2);
        l2.add(layer1);
      } else {
        l1.delete(layer2);
        l2.delete(layer1);
      }
    }
  }

  canLayersCollide(layer1: number, layer2: number): boolean {
    return this.layers.get(layer1)?.has(layer2) || false;
  }

  get gravity(): Vector2 {
    return this.config.gravity.clone();
  }

  set gravity(value: Vector2) {
    this.config.gravity = value;
  }

  get fixedTimestep(): number {
    return this.config.fixedTimestep;
  }

  /**
   * Step the physics simulation
   */
  step(deltaTime: number, entities: Entity[]): void {
    this.accumulator += deltaTime;
    
    while (this.accumulator >= this.config.fixedTimestep) {
      this.fixedStep(this.config.fixedTimestep, entities);
      this.accumulator -= this.config.fixedTimestep;
    }
  }

  private fixedStep(dt: number, entities: Entity[]): void {
    // Apply forces and integrate velocities
    for (const entity of entities) {
      const transform = entity.getComponent<Transform2D>('Transform2D');
      const velocity = entity.getComponent<Velocity2D>('Velocity2D');
      const rigidBody = entity.getComponent<RigidBody2D>('RigidBody2D');
      
      if (!transform || !velocity) continue;
      if (rigidBody?.isKinematic) continue;

      // Apply gravity
      if (rigidBody) {
        const gravityForce = this.config.gravity.multiply(rigidBody.gravityScale);
        velocity.linear = velocity.linear.add(gravityForce.multiply(dt));
        
        // Apply drag
        velocity.linear = velocity.linear.multiply(1 - rigidBody.drag * dt);
        if (!rigidBody.freezeRotation) {
          velocity.angular *= (1 - rigidBody.angularDrag * dt);
        }
      }

      // Clamp velocity
      const speed = velocity.linear.magnitude();
      if (speed > this.config.maxVelocity) {
        velocity.linear = velocity.linear.normalize().multiply(this.config.maxVelocity);
      }
    }

    // Broad phase collision detection
    const pairs = this.broadPhase(entities);

    // Narrow phase collision detection and resolution
    const currentCollisions = new Map<string, CollisionInfo>();
    
    for (const [entityA, entityB] of pairs) {
      const collision = this.narrowPhase(entityA, entityB);
      
      if (collision) {
        const key = this.getCollisionKey(entityA.id, entityB.id);
        currentCollisions.set(key, collision);
        
        const colliderA = this.getCollider(entityA);
        const colliderB = this.getCollider(entityB);
        
        const isTrigger = colliderA?.isTrigger || colliderB?.isTrigger;
        
        if (this.activeCollisions.has(key)) {
          if (!isTrigger) {
            this.emit('collision:stay', collision);
          }
        } else {
          if (isTrigger) {
            this.emit('trigger:enter', collision);
          } else {
            this.emit('collision:enter', collision);
          }
        }

        // Resolve collision (only for non-triggers)
        if (!isTrigger) {
          this.resolveCollision(collision, dt);
        }
      }
    }

    // Check for collision exits
    for (const [key, collision] of this.activeCollisions) {
      if (!currentCollisions.has(key)) {
        const colliderA = this.getCollider(collision.entityA);
        const colliderB = this.getCollider(collision.entityB);
        const isTrigger = colliderA?.isTrigger || colliderB?.isTrigger;
        
        if (isTrigger) {
          this.emit('trigger:exit', collision);
        } else {
          this.emit('collision:exit', collision);
        }
      }
    }

    this.activeCollisions = currentCollisions;

    // Integrate positions
    for (const entity of entities) {
      const transform = entity.getComponent<Transform2D>('Transform2D');
      const velocity = entity.getComponent<Velocity2D>('Velocity2D');
      const rigidBody = entity.getComponent<RigidBody2D>('RigidBody2D');
      
      if (!transform || !velocity) continue;
      if (rigidBody?.isKinematic) continue;

      transform.position = transform.position.add(velocity.linear.multiply(dt));
      
      if (!rigidBody?.freezeRotation) {
        transform.rotation += velocity.angular * dt;
      }
    }
  }

  private getCollider(entity: Entity): Collider2D | undefined {
    return (
      entity.getComponent<BoxCollider2D>('BoxCollider2D') ||
      entity.getComponent<CircleCollider2D>('CircleCollider2D')
    );
  }

  private broadPhase(entities: Entity[]): [Entity, Entity][] {
    const pairs: [Entity, Entity][] = [];
    const aabbs: Map<Entity, AABB> = new Map();

    // Calculate AABBs
    for (const entity of entities) {
      const aabb = this.calculateAABB(entity);
      if (aabb) {
        aabbs.set(entity, aabb);
      }
    }

    // Simple O(n²) broad phase - could be optimized with spatial partitioning
    const entityList = Array.from(aabbs.keys());
    for (let i = 0; i < entityList.length; i++) {
      for (let j = i + 1; j < entityList.length; j++) {
        const entityA = entityList[i];
        const entityB = entityList[j];
        const aabbA = aabbs.get(entityA)!;
        const aabbB = aabbs.get(entityB)!;

        // Check layer collision
        const colliderA = this.getCollider(entityA);
        const colliderB = this.getCollider(entityB);
        
        if (colliderA && colliderB) {
          if (!this.canLayersCollide(colliderA.layer, colliderB.layer)) continue;
          if ((colliderA.mask & (1 << colliderB.layer)) === 0) continue;
          if ((colliderB.mask & (1 << colliderA.layer)) === 0) continue;
        }

        if (this.aabbOverlap(aabbA, aabbB)) {
          pairs.push([entityA, entityB]);
        }
      }
    }

    return pairs;
  }

  private calculateAABB(entity: Entity): AABB | null {
    const transform = entity.getComponent<Transform2D>('Transform2D');
    if (!transform) return null;

    const boxCollider = entity.getComponent<BoxCollider2D>('BoxCollider2D');
    if (boxCollider) {
      const halfWidth = (boxCollider.width / 2) * transform.scale.x;
      const halfHeight = (boxCollider.height / 2) * transform.scale.y;
      const pos = transform.position.add(boxCollider.offset);
      
      return {
        min: new Vector2(pos.x - halfWidth, pos.y - halfHeight),
        max: new Vector2(pos.x + halfWidth, pos.y + halfHeight)
      };
    }

    const circleCollider = entity.getComponent<CircleCollider2D>('CircleCollider2D');
    if (circleCollider) {
      const radius = circleCollider.radius * Math.max(transform.scale.x, transform.scale.y);
      const pos = transform.position.add(circleCollider.offset);
      
      return {
        min: new Vector2(pos.x - radius, pos.y - radius),
        max: new Vector2(pos.x + radius, pos.y + radius)
      };
    }

    return null;
  }

  private aabbOverlap(a: AABB, b: AABB): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y
    );
  }

  private narrowPhase(entityA: Entity, entityB: Entity): CollisionInfo | null {
    const transformA = entityA.getComponent<Transform2D>('Transform2D');
    const transformB = entityB.getComponent<Transform2D>('Transform2D');
    
    if (!transformA || !transformB) return null;

    // Get colliders
    const boxA = entityA.getComponent<BoxCollider2D>('BoxCollider2D');
    const boxB = entityB.getComponent<BoxCollider2D>('BoxCollider2D');
    const circleA = entityA.getComponent<CircleCollider2D>('CircleCollider2D');
    const circleB = entityB.getComponent<CircleCollider2D>('CircleCollider2D');

    // Circle vs Circle
    if (circleA && circleB) {
      return this.circleVsCircle(entityA, entityB, transformA, transformB, circleA, circleB);
    }

    // Box vs Box
    if (boxA && boxB) {
      return this.boxVsBox(entityA, entityB, transformA, transformB, boxA, boxB);
    }

    // Circle vs Box
    if (circleA && boxB) {
      return this.circleVsBox(entityA, entityB, transformA, transformB, circleA, boxB);
    }
    if (boxA && circleB) {
      const result = this.circleVsBox(entityB, entityA, transformB, transformA, circleB, boxA);
      if (result) {
        return {
          ...result,
          entityA: entityA,
          entityB: entityB,
          normal: result.normal.multiply(-1)
        };
      }
    }

    return null;
  }

  private circleVsCircle(
    entityA: Entity, entityB: Entity,
    transformA: Transform2D, transformB: Transform2D,
    circleA: CircleCollider2D, circleB: CircleCollider2D
  ): CollisionInfo | null {
    const posA = transformA.position.add(circleA.offset);
    const posB = transformB.position.add(circleB.offset);
    
    const radiusA = circleA.radius * Math.max(transformA.scale.x, transformA.scale.y);
    const radiusB = circleB.radius * Math.max(transformB.scale.x, transformB.scale.y);
    
    const delta = posB.subtract(posA);
    const distance = delta.magnitude();
    const sumRadius = radiusA + radiusB;
    
    if (distance >= sumRadius) return null;
    
    const normal = distance > 0 ? delta.normalize() : new Vector2(1, 0);
    const penetration = sumRadius - distance;
    const point = posA.add(normal.multiply(radiusA));
    
    return {
      entityA,
      entityB,
      point,
      normal,
      penetration
    };
  }

  private boxVsBox(
    entityA: Entity, entityB: Entity,
    transformA: Transform2D, transformB: Transform2D,
    boxA: BoxCollider2D, boxB: BoxCollider2D
  ): CollisionInfo | null {
    const posA = transformA.position.add(boxA.offset);
    const posB = transformB.position.add(boxB.offset);
    
    const halfWidthA = (boxA.width / 2) * transformA.scale.x;
    const halfHeightA = (boxA.height / 2) * transformA.scale.y;
    const halfWidthB = (boxB.width / 2) * transformB.scale.x;
    const halfHeightB = (boxB.height / 2) * transformB.scale.y;
    
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    
    const overlapX = halfWidthA + halfWidthB - Math.abs(dx);
    const overlapY = halfHeightA + halfHeightB - Math.abs(dy);
    
    if (overlapX <= 0 || overlapY <= 0) return null;
    
    let normal: Vector2;
    let penetration: number;
    
    if (overlapX < overlapY) {
      normal = new Vector2(dx > 0 ? 1 : -1, 0);
      penetration = overlapX;
    } else {
      normal = new Vector2(0, dy > 0 ? 1 : -1);
      penetration = overlapY;
    }
    
    const point = posA.add(normal.multiply(
      normal.x !== 0 ? halfWidthA : halfHeightA
    ));
    
    return {
      entityA,
      entityB,
      point,
      normal,
      penetration
    };
  }

  private circleVsBox(
    circleEntity: Entity, boxEntity: Entity,
    circleTransform: Transform2D, boxTransform: Transform2D,
    circle: CircleCollider2D, box: BoxCollider2D
  ): CollisionInfo | null {
    const circlePos = circleTransform.position.add(circle.offset);
    const boxPos = boxTransform.position.add(box.offset);
    
    const radius = circle.radius * Math.max(circleTransform.scale.x, circleTransform.scale.y);
    const halfWidth = (box.width / 2) * boxTransform.scale.x;
    const halfHeight = (box.height / 2) * boxTransform.scale.y;
    
    // Find closest point on box to circle center
    const closest = new Vector2(
      Math.max(boxPos.x - halfWidth, Math.min(circlePos.x, boxPos.x + halfWidth)),
      Math.max(boxPos.y - halfHeight, Math.min(circlePos.y, boxPos.y + halfHeight))
    );
    
    const delta = circlePos.subtract(closest);
    const distanceSquared = delta.magnitudeSquared();
    
    if (distanceSquared >= radius * radius) return null;
    
    const distance = Math.sqrt(distanceSquared);
    const normal = distance > 0 ? delta.normalize() : new Vector2(1, 0);
    const penetration = radius - distance;
    
    return {
      entityA: circleEntity,
      entityB: boxEntity,
      point: closest,
      normal,
      penetration
    };
  }

  private resolveCollision(collision: CollisionInfo, _dt: number): void {
    const { entityA, entityB, normal, penetration } = collision;
    
    const transformA = entityA.getComponent<Transform2D>('Transform2D');
    const transformB = entityB.getComponent<Transform2D>('Transform2D');
    const velocityA = entityA.getComponent<Velocity2D>('Velocity2D');
    const velocityB = entityB.getComponent<Velocity2D>('Velocity2D');
    const rigidBodyA = entityA.getComponent<RigidBody2D>('RigidBody2D');
    const rigidBodyB = entityB.getComponent<RigidBody2D>('RigidBody2D');
    
    if (!transformA || !transformB) return;
    
    const massA = rigidBodyA?.isKinematic ? 0 : (rigidBodyA?.inverseMass ?? 1);
    const massB = rigidBodyB?.isKinematic ? 0 : (rigidBodyB?.inverseMass ?? 1);
    const totalMass = massA + massB;
    
    if (totalMass === 0) return;
    
    // Position correction
    const correction = normal.multiply(penetration / totalMass * 0.8);
    
    if (massA > 0 && !rigidBodyA?.isKinematic) {
      transformA.position = transformA.position.subtract(correction.multiply(massA));
    }
    if (massB > 0 && !rigidBodyB?.isKinematic) {
      transformB.position = transformB.position.add(correction.multiply(massB));
    }
    
    // Velocity resolution
    if (!velocityA || !velocityB) return;
    
    const relativeVelocity = velocityB.linear.subtract(velocityA.linear);
    const velocityAlongNormal = relativeVelocity.dot(normal);
    
    if (velocityAlongNormal > 0) return; // Moving apart
    
    const restitution = 0.5; // Bounciness
    const j = -(1 + restitution) * velocityAlongNormal / totalMass;
    
    const impulse = normal.multiply(j);
    
    if (massA > 0 && !rigidBodyA?.isKinematic) {
      velocityA.linear = velocityA.linear.subtract(impulse.multiply(massA));
    }
    if (massB > 0 && !rigidBodyB?.isKinematic) {
      velocityB.linear = velocityB.linear.add(impulse.multiply(massB));
    }
  }

  private getCollisionKey(idA: number, idB: number): string {
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }

  /**
   * Raycast into the physics world
   */
  raycast(
    origin: Vector2,
    direction: Vector2,
    maxDistance: number,
    entities: Entity[],
    layerMask: number = 0xFFFFFFFF
  ): RaycastHit | null {
    const normalizedDir = direction.normalize();
    let closestHit: RaycastHit | null = null;
    let closestDistance = maxDistance;

    for (const entity of entities) {
      const transform = entity.getComponent<Transform2D>('Transform2D');
      const collider = this.getCollider(entity);
      
      if (!transform || !collider) continue;
      if ((layerMask & (1 << collider.layer)) === 0) continue;

      let hit: RaycastHit | null = null;

      if (collider instanceof CircleCollider2D) {
        hit = this.raycastCircle(origin, normalizedDir, closestDistance, transform, collider, entity);
      } else if (collider instanceof BoxCollider2D) {
        hit = this.raycastBox(origin, normalizedDir, closestDistance, transform, collider, entity);
      }

      if (hit && hit.distance < closestDistance) {
        closestHit = hit;
        closestDistance = hit.distance;
      }
    }

    return closestHit;
  }

  private raycastCircle(
    origin: Vector2,
    direction: Vector2,
    maxDistance: number,
    transform: Transform2D,
    circle: CircleCollider2D,
    entity: Entity
  ): RaycastHit | null {
    const center = transform.position.add(circle.offset);
    const radius = circle.radius * Math.max(transform.scale.x, transform.scale.y);
    
    const oc = origin.subtract(center);
    const a = direction.dot(direction);
    const b = 2 * oc.dot(direction);
    const c = oc.dot(oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return null;
    
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    
    if (t < 0 || t > maxDistance) return null;
    
    const point = origin.add(direction.multiply(t));
    const normal = point.subtract(center).normalize();
    
    return {
      entity,
      point,
      normal,
      distance: t
    };
  }

  private raycastBox(
    origin: Vector2,
    direction: Vector2,
    maxDistance: number,
    transform: Transform2D,
    box: BoxCollider2D,
    entity: Entity
  ): RaycastHit | null {
    const center = transform.position.add(box.offset);
    const halfWidth = (box.width / 2) * transform.scale.x;
    const halfHeight = (box.height / 2) * transform.scale.y;
    
    const min = center.subtract(new Vector2(halfWidth, halfHeight));
    const max = center.add(new Vector2(halfWidth, halfHeight));
    
    let tmin = (min.x - origin.x) / direction.x;
    let tmax = (max.x - origin.x) / direction.x;
    
    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
    
    let tymin = (min.y - origin.y) / direction.y;
    let tymax = (max.y - origin.y) / direction.y;
    
    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
    
    if (tmin > tymax || tymin > tmax) return null;
    
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;
    
    if (tmin < 0 || tmin > maxDistance) return null;
    
    const point = origin.add(direction.multiply(tmin));
    
    // Calculate normal
    let normal: Vector2;
    const epsilon = 0.001;
    if (Math.abs(point.x - min.x) < epsilon) normal = new Vector2(-1, 0);
    else if (Math.abs(point.x - max.x) < epsilon) normal = new Vector2(1, 0);
    else if (Math.abs(point.y - min.y) < epsilon) normal = new Vector2(0, -1);
    else normal = new Vector2(0, 1);
    
    return {
      entity,
      point,
      normal,
      distance: tmin
    };
  }
}

/**
 * Raycast hit information
 */
export interface RaycastHit {
  entity: Entity;
  point: Vector2;
  normal: Vector2;
  distance: number;
}

/**
 * Physics System for ECS integration
 */
export class PhysicsSystem extends BaseSystem {
  readonly name = 'PhysicsSystem';
  readonly requiredComponents = ['Transform2D'];
  priority = -100; // Run early
  
  private physicsWorld: PhysicsWorld;
  private world: World | null = null;

  constructor(config?: Partial<PhysicsConfig>) {
    super();
    this.physicsWorld = new PhysicsWorld(config);
  }

  get physics(): PhysicsWorld {
    return this.physicsWorld;
  }

  init(world: World): void {
    this.world = world;
  }

  update(entities: Entity[], deltaTime: number): void {
    // Filter entities that have physics components
    const physicsEntities = entities.filter(e => 
      e.hasComponent('Velocity2D') &&
      (e.hasComponent('BoxCollider2D') || e.hasComponent('CircleCollider2D'))
    );
    
    this.physicsWorld.step(deltaTime, physicsEntities);
  }

  destroy(): void {
    this.world = null;
  }
}

export default PhysicsWorld;
