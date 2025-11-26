/**
 * NextGen Game Engine - Entity Component System (ECS)
 * High-performance, data-oriented ECS architecture
 */

import { EventEmitter } from '../events';

/**
 * Base component interface
 */
export interface Component {
  readonly type: string;
}

/**
 * Component factory function type
 */
export type ComponentFactory<T extends Component> = () => T;

/**
 * Entity ID type
 */
export type EntityId = number;

/**
 * Entity class representing a game object
 */
export class Entity {
  private static nextId = 0;
  public readonly id: EntityId;
  private components: Map<string, Component> = new Map();
  private _enabled: boolean = true;
  private _name: string;
  public tags: Set<string> = new Set();

  constructor(name: string = `Entity_${Entity.nextId}`) {
    this.id = Entity.nextId++;
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  addComponent<T extends Component>(component: T): T {
    this.components.set(component.type, component);
    return component;
  }

  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  removeComponent(type: string): boolean {
    return this.components.delete(type);
  }

  getComponents(): Component[] {
    return Array.from(this.components.values());
  }

  getComponentTypes(): string[] {
    return Array.from(this.components.keys());
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  addTag(tag: string): void {
    this.tags.add(tag);
  }

  removeTag(tag: string): void {
    this.tags.delete(tag);
  }

  static resetIdCounter(): void {
    Entity.nextId = 0;
  }
}

/**
 * System interface for processing entities
 */
export interface System {
  readonly name: string;
  readonly priority: number;
  readonly requiredComponents: string[];

  init?(world: World): void;
  update(entities: Entity[], deltaTime: number): void;
  fixedUpdate?(entities: Entity[], fixedDeltaTime: number): void;
  destroy?(): void;
}

/**
 * Abstract base class for systems
 */
export abstract class BaseSystem implements System {
  abstract readonly name: string;
  abstract readonly requiredComponents: string[];
  priority: number = 0;

  init?(_world: World): void {}
  abstract update(entities: Entity[], deltaTime: number): void;
  fixedUpdate?(_entities: Entity[], _fixedDeltaTime: number): void {}
  destroy?(): void {}
}

/**
 * World events
 */
interface WorldEvents {
  'entity:created': { entity: Entity };
  'entity:destroyed': { entity: Entity };
  'component:added': { entity: Entity; component: Component };
  'component:removed': { entity: Entity; componentType: string };
  'system:added': { system: System };
  'system:removed': { system: System };
}

/**
 * World class - manages all entities and systems
 */
export class World extends EventEmitter<WorldEvents> {
  private entities: Map<EntityId, Entity> = new Map();
  private systems: System[] = [];
  private entityQueries: Map<string, Set<EntityId>> = new Map();
  private _paused: boolean = false;

  get paused(): boolean {
    return this._paused;
  }

  set paused(value: boolean) {
    this._paused = value;
  }

  /**
   * Create a new entity
   */
  createEntity(name?: string): Entity {
    const entity = new Entity(name);
    this.entities.set(entity.id, entity);
    this.emit('entity:created', { entity });
    return entity;
  }

  /**
   * Destroy an entity
   */
  destroyEntity(entityOrId: Entity | EntityId): boolean {
    const id = typeof entityOrId === 'number' ? entityOrId : entityOrId.id;
    const entity = this.entities.get(id);
    if (entity) {
      // Remove from all queries
      this.entityQueries.forEach(query => query.delete(id));
      this.entities.delete(id);
      this.emit('entity:destroyed', { entity });
      return true;
    }
    return false;
  }

  /**
   * Get an entity by ID
   */
  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get entity count
   */
  getEntityCount(): number {
    return this.entities.size;
  }

  /**
   * Add a component to an entity
   */
  addComponent<T extends Component>(entity: Entity, component: T): T {
    entity.addComponent(component);
    this.updateEntityQueries(entity);
    this.emit('component:added', { entity, component });
    return component;
  }

  /**
   * Remove a component from an entity
   */
  removeComponent(entity: Entity, componentType: string): boolean {
    const removed = entity.removeComponent(componentType);
    if (removed) {
      this.updateEntityQueries(entity);
      this.emit('component:removed', { entity, componentType });
    }
    return removed;
  }

  /**
   * Add a system
   */
  addSystem(system: System): void {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
    
    // Create query key
    const queryKey = this.getQueryKey(system.requiredComponents);
    if (!this.entityQueries.has(queryKey)) {
      this.entityQueries.set(queryKey, new Set());
      this.refreshQuery(queryKey, system.requiredComponents);
    }

    if (system.init) {
      system.init(this);
    }

    this.emit('system:added', { system });
  }

  /**
   * Remove a system
   */
  removeSystem(system: System): boolean {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
      if (system.destroy) {
        system.destroy();
      }
      this.emit('system:removed', { system });
      return true;
    }
    return false;
  }

  /**
   * Get a system by name
   */
  getSystem<T extends System>(name: string): T | undefined {
    return this.systems.find(s => s.name === name) as T | undefined;
  }

  /**
   * Update all systems
   */
  update(deltaTime: number): void {
    if (this._paused) return;

    for (const system of this.systems) {
      const entities = this.queryEntities(system.requiredComponents);
      system.update(entities, deltaTime);
    }
  }

  /**
   * Fixed update all systems
   */
  fixedUpdate(fixedDeltaTime: number): void {
    if (this._paused) return;

    for (const system of this.systems) {
      if (system.fixedUpdate) {
        const entities = this.queryEntities(system.requiredComponents);
        system.fixedUpdate(entities, fixedDeltaTime);
      }
    }
  }

  /**
   * Query entities with specific components
   */
  queryEntities(componentTypes: string[]): Entity[] {
    const queryKey = this.getQueryKey(componentTypes);
    const entityIds = this.entityQueries.get(queryKey);
    
    if (entityIds) {
      return Array.from(entityIds)
        .map(id => this.entities.get(id)!)
        .filter(entity => entity && entity.enabled);
    }

    // Create new query
    this.entityQueries.set(queryKey, new Set());
    this.refreshQuery(queryKey, componentTypes);
    return this.queryEntities(componentTypes);
  }

  /**
   * Query entities by tag
   */
  queryEntitiesByTag(tag: string): Entity[] {
    return Array.from(this.entities.values())
      .filter(entity => entity.enabled && entity.hasTag(tag));
  }

  /**
   * Query entities by name
   */
  findEntityByName(name: string): Entity | undefined {
    return Array.from(this.entities.values())
      .find(entity => entity.name === name);
  }

  /**
   * Clear all entities and systems
   */
  clear(): void {
    for (const system of this.systems) {
      if (system.destroy) {
        system.destroy();
      }
    }
    this.systems = [];
    this.entities.clear();
    this.entityQueries.clear();
    Entity.resetIdCounter();
  }

  private getQueryKey(componentTypes: string[]): string {
    return componentTypes.sort().join('|');
  }

  private refreshQuery(queryKey: string, componentTypes: string[]): void {
    const entityIds = this.entityQueries.get(queryKey)!;
    entityIds.clear();

    for (const entity of this.entities.values()) {
      if (componentTypes.every(type => entity.hasComponent(type))) {
        entityIds.add(entity.id);
      }
    }
  }

  private updateEntityQueries(entity: Entity): void {
    for (const [queryKey, entityIds] of this.entityQueries) {
      const componentTypes = queryKey.split('|');
      const hasAllComponents = componentTypes.every(type => entity.hasComponent(type));
      
      if (hasAllComponents) {
        entityIds.add(entity.id);
      } else {
        entityIds.delete(entity.id);
      }
    }
  }
}

// Re-export
export * from './components';
