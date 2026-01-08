import Engine, {
  BasicScene,
  registerMiniGamePack,
  NeonRunnerSystem,
  OrbitalRescueSystem,
  StarCollectorSystem,
  KeyCode
} from '../src';

describe('Mini game pack', () => {
  let engine: Engine;

  beforeEach(async () => {
    engine = new Engine({ width: 320, height: 240, headless: true });
    await engine.init();
  });

  it('registers multiple mini games', () => {
    const games = registerMiniGamePack(engine);

    expect(games.length).toBeGreaterThanOrEqual(3);
    expect(engine.scenes.isRegistered('mini:neon-runner')).toBe(true);
    expect(engine.scenes.isRegistered('mini:orbital-rescue')).toBe(true);
    expect(engine.scenes.isRegistered('mini:star-collector')).toBe(true);
  });

  it('advances Neon Runner state over time', async () => {
    registerMiniGamePack(engine);
    await engine.scenes.loadScene('mini:neon-runner');

    const scene = engine.scenes.currentScene as BasicScene;
    engine.scenes.update(0.5);
    engine.scenes.update(0.5);

    const system = scene.world.getSystem<NeonRunnerSystem>('NeonRunnerSystem');
    expect(system).toBeDefined();
    expect(system?.state.distance).toBeGreaterThan(0);
    expect(system?.state.cleared).toBeGreaterThan(0);
  });

  it('allows rescuing capsules in Orbital Rescue', async () => {
    registerMiniGamePack(engine);
    await engine.scenes.loadScene('mini:orbital-rescue');

    const scene = engine.scenes.currentScene as BasicScene;
    const system = scene.world.getSystem<OrbitalRescueSystem>('OrbitalRescueSystem');
    expect(system).toBeDefined();

    for (let i = 0; i < 12; i++) {
      engine.scenes.update(0.3);
    }

    expect(system?.state.rescued).toBeGreaterThan(0);
  });

  it('tracks collected and missed stars', async () => {
    registerMiniGamePack(engine);
    await engine.scenes.loadScene('mini:star-collector');

    // steer upward for the first star so we definitely interact
    (engine.input as any).handleKeyDown({ code: KeyCode.ArrowUp, key: 'ArrowUp', repeat: false } as KeyboardEvent);

    const scene = engine.scenes.currentScene as BasicScene;
    const system = scene.world.getSystem<StarCollectorSystem>('StarCollectorSystem');
    expect(system).toBeDefined();

    for (let i = 0; i < 10; i++) {
      engine.scenes.update(0.25);
    }

    expect((system?.state.collected || 0) + (system?.state.missed || 0)).toBeGreaterThan(0);
  });
});
