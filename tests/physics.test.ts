/**
 * Physics System Tests
 */

import { PhysicsWorld, CollisionInfo } from '../src/physics';
import { Entity, World } from '../src/ecs';
import { Transform2D, Velocity2D, BoxCollider2D, CircleCollider2D, RigidBody2D } from '../src/ecs/components';
import { Vector2 } from '../src/math';

describe('PhysicsWorld', () => {
  let physics: PhysicsWorld;
  let world: World;

  beforeEach(() => {
    Entity.resetIdCounter();
    physics = new PhysicsWorld({
      gravity: new Vector2(0, 100),
      fixedTimestep: 1 / 60
    });
    world = new World();
  });

  describe('configuration', () => {
    it('should set gravity', () => {
      physics.gravity = new Vector2(0, -9.81);
      expect(physics.gravity.y).toBe(-9.81);
    });

    it('should have fixed timestep', () => {
      expect(physics.fixedTimestep).toBeCloseTo(1 / 60);
    });
  });

  describe('layer collision', () => {
    it('should allow layer collision by default', () => {
      expect(physics.canLayersCollide(0, 1)).toBe(true);
    });

    it('should disable layer collision', () => {
      physics.setLayerCollision(0, 1, false);
      expect(physics.canLayersCollide(0, 1)).toBe(false);
    });

    it('should re-enable layer collision', () => {
      physics.setLayerCollision(0, 1, false);
      physics.setLayerCollision(0, 1, true);
      expect(physics.canLayersCollide(0, 1)).toBe(true);
    });
  });

  describe('circle collision', () => {
    it('should detect circle vs circle collision', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, new Transform2D(new Vector2(0, 0)));
      world.addComponent(e1, new Velocity2D());
      world.addComponent(e1, new CircleCollider2D(10));

      const e2 = world.createEntity();
      world.addComponent(e2, new Transform2D(new Vector2(15, 0)));
      world.addComponent(e2, new Velocity2D());
      world.addComponent(e2, new CircleCollider2D(10));

      let collision: CollisionInfo | null = null;
      physics.on('collision:enter', (info) => {
        collision = info;
      });

      physics.step(1 / 60, world.getAllEntities());

      expect(collision).not.toBeNull();
    });

    it('should not detect collision when circles are far apart', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, new Transform2D(new Vector2(0, 0)));
      world.addComponent(e1, new Velocity2D());
      world.addComponent(e1, new CircleCollider2D(10));

      const e2 = world.createEntity();
      world.addComponent(e2, new Transform2D(new Vector2(100, 0)));
      world.addComponent(e2, new Velocity2D());
      world.addComponent(e2, new CircleCollider2D(10));

      let collision: CollisionInfo | null = null;
      physics.on('collision:enter', (info) => {
        collision = info;
      });

      physics.step(1 / 60, world.getAllEntities());

      expect(collision).toBeNull();
    });
  });

  describe('box collision', () => {
    it('should detect box vs box collision', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, new Transform2D(new Vector2(0, 0)));
      world.addComponent(e1, new Velocity2D());
      world.addComponent(e1, new BoxCollider2D(20, 20));

      const e2 = world.createEntity();
      world.addComponent(e2, new Transform2D(new Vector2(15, 0)));
      world.addComponent(e2, new Velocity2D());
      world.addComponent(e2, new BoxCollider2D(20, 20));

      let collision: CollisionInfo | null = null;
      physics.on('collision:enter', (info) => {
        collision = info;
      });

      physics.step(1 / 60, world.getAllEntities());

      expect(collision).not.toBeNull();
    });
  });

  describe('triggers', () => {
    it('should emit trigger events for trigger colliders', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, new Transform2D(new Vector2(0, 0)));
      world.addComponent(e1, new Velocity2D());
      const collider1 = new CircleCollider2D(10);
      collider1.isTrigger = true;
      world.addComponent(e1, collider1);

      const e2 = world.createEntity();
      world.addComponent(e2, new Transform2D(new Vector2(5, 0)));
      world.addComponent(e2, new Velocity2D());
      world.addComponent(e2, new CircleCollider2D(10));

      let triggerEntered = false;
      physics.on('trigger:enter', () => {
        triggerEntered = true;
      });

      physics.step(1 / 60, world.getAllEntities());

      expect(triggerEntered).toBe(true);
    });
  });

  describe('gravity', () => {
    it('should apply gravity to entities', () => {
      const entity = world.createEntity();
      const transform = new Transform2D(new Vector2(0, 0));
      const velocity = new Velocity2D();
      world.addComponent(entity, transform);
      world.addComponent(entity, velocity);
      world.addComponent(entity, new RigidBody2D(1, 0, 0, 1));
      world.addComponent(entity, new CircleCollider2D(10));

      // Step multiple times
      for (let i = 0; i < 10; i++) {
        physics.step(1 / 60, world.getAllEntities());
      }

      // Velocity should have increased due to gravity
      expect(velocity.linear.y).toBeGreaterThan(0);
    });

    it('should not apply gravity to kinematic bodies', () => {
      const entity = world.createEntity();
      const velocity = new Velocity2D();
      world.addComponent(entity, new Transform2D(new Vector2(0, 0)));
      world.addComponent(entity, velocity);
      const rb = new RigidBody2D();
      rb.isKinematic = true;
      world.addComponent(entity, rb);
      world.addComponent(entity, new CircleCollider2D(10));

      physics.step(1 / 60, world.getAllEntities());

      expect(velocity.linear.y).toBe(0);
    });
  });

  describe('raycast', () => {
    it('should detect ray hitting circle', () => {
      const entity = world.createEntity();
      world.addComponent(entity, new Transform2D(new Vector2(50, 0)));
      world.addComponent(entity, new CircleCollider2D(10));

      const hit = physics.raycast(
        new Vector2(0, 0),
        new Vector2(1, 0),
        100,
        world.getAllEntities()
      );

      expect(hit).not.toBeNull();
      expect(hit?.entity).toBe(entity);
    });

    it('should detect ray hitting box', () => {
      const entity = world.createEntity();
      world.addComponent(entity, new Transform2D(new Vector2(50, 0)));
      world.addComponent(entity, new BoxCollider2D(20, 20));

      const hit = physics.raycast(
        new Vector2(0, 0),
        new Vector2(1, 0),
        100,
        world.getAllEntities()
      );

      expect(hit).not.toBeNull();
      expect(hit?.entity).toBe(entity);
    });

    it('should return null when ray misses', () => {
      const entity = world.createEntity();
      world.addComponent(entity, new Transform2D(new Vector2(50, 100)));
      world.addComponent(entity, new CircleCollider2D(10));

      const hit = physics.raycast(
        new Vector2(0, 0),
        new Vector2(1, 0),
        100,
        world.getAllEntities()
      );

      expect(hit).toBeNull();
    });

    it('should return closest hit', () => {
      const e1 = world.createEntity('Far');
      world.addComponent(e1, new Transform2D(new Vector2(80, 0)));
      world.addComponent(e1, new CircleCollider2D(10));

      const e2 = world.createEntity('Close');
      world.addComponent(e2, new Transform2D(new Vector2(30, 0)));
      world.addComponent(e2, new CircleCollider2D(10));

      const hit = physics.raycast(
        new Vector2(0, 0),
        new Vector2(1, 0),
        100,
        world.getAllEntities()
      );

      expect(hit?.entity.name).toBe('Close');
    });
  });
});
