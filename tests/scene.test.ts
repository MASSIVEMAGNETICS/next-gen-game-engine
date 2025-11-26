/**
 * Scene Management Tests
 */

import { SceneManager, BasicScene, Scene, Easings } from '../src/scene';
import { World, Entity } from '../src/ecs';

describe('SceneManager', () => {
  let sceneManager: SceneManager;

  beforeEach(() => {
    Entity.resetIdCounter();
    sceneManager = new SceneManager();
  });

  afterEach(async () => {
    await sceneManager.clear();
  });

  describe('registration', () => {
    it('should register scenes', () => {
      sceneManager.registerScene({
        name: 'test',
        create: () => {}
      });
      expect(sceneManager.isRegistered('test')).toBe(true);
    });

    it('should unregister scenes', () => {
      sceneManager.registerScene({ name: 'test', create: () => {} });
      sceneManager.unregister('test');
      expect(sceneManager.isRegistered('test')).toBe(false);
    });

    it('should get registered scene names', () => {
      sceneManager.registerScene({ name: 'scene1', create: () => {} });
      sceneManager.registerScene({ name: 'scene2', create: () => {} });
      const names = sceneManager.getRegisteredScenes();
      expect(names).toContain('scene1');
      expect(names).toContain('scene2');
    });
  });

  describe('loading', () => {
    it('should load scenes', async () => {
      let created = false;
      sceneManager.registerScene({
        name: 'test',
        create: () => { created = true; }
      });

      await sceneManager.loadScene('test');
      
      expect(created).toBe(true);
      expect(sceneManager.currentSceneName).toBe('test');
    });

    it('should throw for unregistered scenes', async () => {
      await expect(sceneManager.loadScene('nonexistent'))
        .rejects.toThrow('Scene not registered: nonexistent');
    });

    it('should emit events on load', async () => {
      const loadCallback = jest.fn();
      sceneManager.on('scene:load', loadCallback);
      
      sceneManager.registerScene({ name: 'test', create: () => {} });
      await sceneManager.loadScene('test');
      
      expect(loadCallback).toHaveBeenCalledWith({ name: 'test' });
    });

    it('should unload previous scene', async () => {
      let scene1Destroyed = false;
      sceneManager.registerScene({
        name: 'scene1',
        create: () => {},
        destroy: () => { scene1Destroyed = true; }
      });
      sceneManager.registerScene({ name: 'scene2', create: () => {} });

      await sceneManager.loadScene('scene1');
      await sceneManager.loadScene('scene2');

      expect(scene1Destroyed).toBe(true);
      expect(sceneManager.currentSceneName).toBe('scene2');
    });
  });

  describe('pausing', () => {
    it('should pause and resume', async () => {
      sceneManager.registerScene({ name: 'test', create: () => {} });
      await sceneManager.loadScene('test');

      sceneManager.pause();
      expect(sceneManager.isPaused).toBe(true);

      sceneManager.resume();
      expect(sceneManager.isPaused).toBe(false);
    });

    it('should emit events on pause/resume', async () => {
      const pauseCallback = jest.fn();
      const resumeCallback = jest.fn();
      
      sceneManager.on('scene:pause', pauseCallback);
      sceneManager.on('scene:resume', resumeCallback);
      
      sceneManager.registerScene({ name: 'test', create: () => {} });
      await sceneManager.loadScene('test');

      sceneManager.pause();
      expect(pauseCallback).toHaveBeenCalled();

      sceneManager.resume();
      expect(resumeCallback).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update current scene', async () => {
      let updateCalled = false;
      sceneManager.registerScene({
        name: 'test',
        create: () => {},
        update: () => { updateCalled = true; }
      });

      await sceneManager.loadScene('test');
      sceneManager.update(0.016);

      expect(updateCalled).toBe(true);
    });

    it('should not update when paused', async () => {
      let updateCount = 0;
      sceneManager.registerScene({
        name: 'test',
        create: () => {},
        update: () => { updateCount++; }
      });

      await sceneManager.loadScene('test');
      sceneManager.update(0.016);
      expect(updateCount).toBe(1);

      sceneManager.pause();
      sceneManager.update(0.016);
      expect(updateCount).toBe(1); // Should not have increased
    });
  });

  describe('restart', () => {
    it('should restart current scene', async () => {
      let createCount = 0;
      sceneManager.registerScene({
        name: 'test',
        create: () => { createCount++; }
      });

      await sceneManager.loadScene('test');
      expect(createCount).toBe(1);

      await sceneManager.restartScene();
      expect(createCount).toBe(2);
    });
  });
});

describe('BasicScene', () => {
  it('should create scene with world', () => {
    const scene = new BasicScene({
      name: 'test',
      create: () => {}
    });

    expect(scene.name).toBe('test');
    expect(scene.world).toBeInstanceOf(World);
  });

  it('should call lifecycle methods', async () => {
    const preloadFn = jest.fn();
    const createFn = jest.fn();
    const destroyFn = jest.fn();

    const scene = new BasicScene({
      name: 'test',
      preload: preloadFn,
      create: createFn,
      destroy: destroyFn
    });

    await scene.preload();
    expect(preloadFn).toHaveBeenCalled();

    await scene.create();
    expect(createFn).toHaveBeenCalledWith(scene.world);

    await scene.destroy();
    expect(destroyFn).toHaveBeenCalledWith(scene.world);
  });
});

describe('Easings', () => {
  describe('linear', () => {
    it('should return input value', () => {
      expect(Easings.linear(0)).toBe(0);
      expect(Easings.linear(0.5)).toBe(0.5);
      expect(Easings.linear(1)).toBe(1);
    });
  });

  describe('easeInQuad', () => {
    it('should start slow and end fast', () => {
      expect(Easings.easeInQuad(0)).toBe(0);
      expect(Easings.easeInQuad(0.5)).toBe(0.25);
      expect(Easings.easeInQuad(1)).toBe(1);
    });
  });

  describe('easeOutQuad', () => {
    it('should start fast and end slow', () => {
      expect(Easings.easeOutQuad(0)).toBe(0);
      expect(Easings.easeOutQuad(0.5)).toBe(0.75);
      expect(Easings.easeOutQuad(1)).toBe(1);
    });
  });

  describe('easeInOutQuad', () => {
    it('should ease in and out', () => {
      expect(Easings.easeInOutQuad(0)).toBe(0);
      expect(Easings.easeInOutQuad(0.5)).toBe(0.5);
      expect(Easings.easeInOutQuad(1)).toBe(1);
    });
  });

  describe('easeOutBounce', () => {
    it('should bounce at the end', () => {
      expect(Easings.easeOutBounce(0)).toBe(0);
      expect(Easings.easeOutBounce(1)).toBeCloseTo(1);
    });
  });
});
