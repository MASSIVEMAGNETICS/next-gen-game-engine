/**
 * ECS Tests
 */

import { Entity, World, BaseSystem, Component } from '../src/ecs';
import { Transform2D, Velocity2D, Sprite } from '../src/ecs/components';

describe('Entity', () => {
  beforeEach(() => {
    Entity.resetIdCounter();
  });

  describe('constructor', () => {
    it('should create entity with auto-generated name', () => {
      const entity = new Entity();
      expect(entity.name).toBe('Entity_0');
    });

    it('should create entity with custom name', () => {
      const entity = new Entity('Player');
      expect(entity.name).toBe('Player');
    });

    it('should assign unique IDs', () => {
      const e1 = new Entity();
      const e2 = new Entity();
      expect(e1.id).toBe(0);
      expect(e2.id).toBe(1);
    });
  });

  describe('components', () => {
    it('should add components', () => {
      const entity = new Entity();
      const transform = new Transform2D();
      entity.addComponent(transform);
      expect(entity.hasComponent('Transform2D')).toBe(true);
    });

    it('should get components', () => {
      const entity = new Entity();
      const transform = new Transform2D();
      entity.addComponent(transform);
      const retrieved = entity.getComponent<Transform2D>('Transform2D');
      expect(retrieved).toBe(transform);
    });

    it('should return undefined for missing components', () => {
      const entity = new Entity();
      expect(entity.getComponent('NonExistent')).toBeUndefined();
    });

    it('should remove components', () => {
      const entity = new Entity();
      entity.addComponent(new Transform2D());
      entity.removeComponent('Transform2D');
      expect(entity.hasComponent('Transform2D')).toBe(false);
    });

    it('should get all component types', () => {
      const entity = new Entity();
      entity.addComponent(new Transform2D());
      entity.addComponent(new Velocity2D());
      const types = entity.getComponentTypes();
      expect(types).toContain('Transform2D');
      expect(types).toContain('Velocity2D');
    });
  });

  describe('tags', () => {
    it('should add tags', () => {
      const entity = new Entity();
      entity.addTag('player');
      expect(entity.hasTag('player')).toBe(true);
    });

    it('should remove tags', () => {
      const entity = new Entity();
      entity.addTag('player');
      entity.removeTag('player');
      expect(entity.hasTag('player')).toBe(false);
    });
  });

  describe('enabled', () => {
    it('should be enabled by default', () => {
      const entity = new Entity();
      expect(entity.enabled).toBe(true);
    });

    it('should allow disabling', () => {
      const entity = new Entity();
      entity.enabled = false;
      expect(entity.enabled).toBe(false);
    });
  });
});

describe('World', () => {
  let world: World;

  beforeEach(() => {
    Entity.resetIdCounter();
    world = new World();
  });

  describe('entities', () => {
    it('should create entities', () => {
      const entity = world.createEntity('TestEntity');
      expect(entity.name).toBe('TestEntity');
      expect(world.getEntityCount()).toBe(1);
    });

    it('should get entities by ID', () => {
      const entity = world.createEntity();
      const retrieved = world.getEntity(entity.id);
      expect(retrieved).toBe(entity);
    });

    it('should destroy entities', () => {
      const entity = world.createEntity();
      world.destroyEntity(entity);
      expect(world.getEntityCount()).toBe(0);
    });

    it('should emit events on entity creation', () => {
      const callback = jest.fn();
      world.on('entity:created', callback);
      world.createEntity();
      expect(callback).toHaveBeenCalled();
    });

    it('should emit events on entity destruction', () => {
      const callback = jest.fn();
      const entity = world.createEntity();
      world.on('entity:destroyed', callback);
      world.destroyEntity(entity);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('components', () => {
    it('should add components to entities', () => {
      const entity = world.createEntity();
      const transform = world.addComponent(entity, new Transform2D());
      expect(entity.getComponent('Transform2D')).toBe(transform);
    });

    it('should remove components from entities', () => {
      const entity = world.createEntity();
      world.addComponent(entity, new Transform2D());
      world.removeComponent(entity, 'Transform2D');
      expect(entity.hasComponent('Transform2D')).toBe(false);
    });

    it('should emit events on component added', () => {
      const callback = jest.fn();
      world.on('component:added', callback);
      const entity = world.createEntity();
      world.addComponent(entity, new Transform2D());
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('systems', () => {
    class TestSystem extends BaseSystem {
      name = 'TestSystem';
      requiredComponents = ['Transform2D'];
      updateCalled = 0;

      update(entities: Entity[], _deltaTime: number): void {
        this.updateCalled = entities.length;
      }
    }

    it('should add systems', () => {
      const system = new TestSystem();
      world.addSystem(system);
      expect(world.getSystem('TestSystem')).toBe(system);
    });

    it('should remove systems', () => {
      const system = new TestSystem();
      world.addSystem(system);
      world.removeSystem(system);
      expect(world.getSystem('TestSystem')).toBeUndefined();
    });

    it('should update systems with matching entities', () => {
      const system = new TestSystem();
      world.addSystem(system);
      
      const e1 = world.createEntity();
      world.addComponent(e1, new Transform2D());
      
      const e2 = world.createEntity(); // No Transform2D
      
      world.update(0.016);
      expect(system.updateCalled).toBe(1);
    });

    it('should call init on systems when added', () => {
      class InitSystem extends BaseSystem {
        name = 'InitSystem';
        requiredComponents: string[] = [];
        initCalled = false;

        init(): void {
          this.initCalled = true;
        }

        update(): void {}
      }

      const system = new InitSystem();
      world.addSystem(system);
      expect(system.initCalled).toBe(true);
    });
  });

  describe('queries', () => {
    it('should query entities by components', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, new Transform2D());
      world.addComponent(e1, new Velocity2D());

      const e2 = world.createEntity();
      world.addComponent(e2, new Transform2D());

      const withVelocity = world.queryEntities(['Transform2D', 'Velocity2D']);
      expect(withVelocity.length).toBe(1);
      expect(withVelocity[0]).toBe(e1);
    });

    it('should query entities by tag', () => {
      const e1 = world.createEntity();
      e1.addTag('player');

      const e2 = world.createEntity();
      e2.addTag('enemy');

      const players = world.queryEntitiesByTag('player');
      expect(players.length).toBe(1);
      expect(players[0]).toBe(e1);
    });

    it('should find entity by name', () => {
      world.createEntity('Player');
      world.createEntity('Enemy');

      const player = world.findEntityByName('Player');
      expect(player?.name).toBe('Player');
    });

    it('should not include disabled entities in queries', () => {
      const e1 = world.createEntity();
      world.addComponent(e1, new Transform2D());
      e1.enabled = false;

      const entities = world.queryEntities(['Transform2D']);
      expect(entities.length).toBe(0);
    });
  });

  describe('pausing', () => {
    it('should not update when paused', () => {
      class CountSystem extends BaseSystem {
        name = 'CountSystem';
        requiredComponents: string[] = [];
        count = 0;

        update(): void {
          this.count++;
        }
      }

      const system = new CountSystem();
      world.addSystem(system);
      
      world.update(0.016);
      expect(system.count).toBe(1);
      
      world.paused = true;
      world.update(0.016);
      expect(system.count).toBe(1); // Should not have incremented
      
      world.paused = false;
      world.update(0.016);
      expect(system.count).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all entities and systems', () => {
      world.createEntity();
      world.createEntity();
      
      class TestSystem extends BaseSystem {
        name = 'Test';
        requiredComponents: string[] = [];
        update(): void {}
      }
      world.addSystem(new TestSystem());

      world.clear();
      expect(world.getEntityCount()).toBe(0);
      expect(world.getSystem('Test')).toBeUndefined();
    });
  });
});
