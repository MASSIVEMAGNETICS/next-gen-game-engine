/**
 * NextGen Game Engine - Asset Management System
 * Handles loading, caching, and management of game assets
 */

import { EventEmitter } from '../events';

/**
 * Asset types
 */
export enum AssetType {
  Texture = 'texture',
  Audio = 'audio',
  JSON = 'json',
  Text = 'text',
  Binary = 'binary',
  Font = 'font'
}

/**
 * Asset state
 */
export enum AssetState {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error'
}

/**
 * Asset metadata
 */
export interface AssetMetadata {
  id: string;
  type: AssetType;
  url: string;
  state: AssetState;
  data: unknown;
  error?: Error;
  size?: number;
  loadTime?: number;
}

/**
 * Asset events
 */
export interface AssetEvents {
  'asset:loading': { id: string; type: AssetType };
  'asset:loaded': { id: string; type: AssetType; asset: AssetMetadata };
  'asset:error': { id: string; type: AssetType; error: Error };
  'asset:unloaded': { id: string };
  'bundle:progress': { loaded: number; total: number; percentage: number };
  'bundle:complete': { assets: AssetMetadata[] };
  'bundle:error': { errors: Array<{ id: string; error: Error }> };
}

/**
 * Asset loading options
 */
export interface LoadOptions {
  priority?: number;
  retries?: number;
  timeout?: number;
  cache?: boolean;
}

/**
 * Asset bundle definition
 */
export interface AssetBundle {
  name: string;
  assets: Array<{
    id: string;
    type: AssetType;
    url: string;
    options?: LoadOptions;
  }>;
}

/**
 * Asset Manager - handles all asset loading and management
 */
export class AssetManager extends EventEmitter<AssetEvents> {
  private assets: Map<string, AssetMetadata> = new Map();
  private loadingQueue: Map<string, Promise<AssetMetadata>> = new Map();
  private cacheEnabled: boolean = true;
  private basePath: string = '';
  private defaultTimeout: number = 30000;
  private defaultRetries: number = 3;

  constructor(config?: { basePath?: string; cacheEnabled?: boolean; timeout?: number }) {
    super();
    if (config) {
      this.basePath = config.basePath ?? '';
      this.cacheEnabled = config.cacheEnabled ?? true;
      this.defaultTimeout = config.timeout ?? 30000;
    }
  }

  /**
   * Set base path for all asset URLs
   */
  setBasePath(path: string): void {
    this.basePath = path.endsWith('/') ? path : `${path}/`;
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
  }

  /**
   * Get full URL for an asset
   */
  private getFullUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return `${this.basePath}${url}`;
  }

  /**
   * Load a single asset
   */
  async load(id: string, type: AssetType, url: string, options: LoadOptions = {}): Promise<AssetMetadata> {
    // Check if already loaded
    const existing = this.assets.get(id);
    if (existing && existing.state === AssetState.Loaded && this.cacheEnabled && options.cache !== false) {
      return existing;
    }

    // Check if already loading
    const loading = this.loadingQueue.get(id);
    if (loading) {
      return loading;
    }

    // Create asset metadata
    const metadata: AssetMetadata = {
      id,
      type,
      url: this.getFullUrl(url),
      state: AssetState.Loading,
      data: null
    };

    this.assets.set(id, metadata);
    this.emit('asset:loading', { id, type });

    // Create loading promise
    const loadPromise = this.loadAsset(metadata, options);
    this.loadingQueue.set(id, loadPromise);

    try {
      const result = await loadPromise;
      this.loadingQueue.delete(id);
      return result;
    } catch (error) {
      this.loadingQueue.delete(id);
      throw error;
    }
  }

  private async loadAsset(metadata: AssetMetadata, options: LoadOptions): Promise<AssetMetadata> {
    const retries = options.retries ?? this.defaultRetries;
    const timeout = options.timeout ?? this.defaultTimeout;
    const startTime = Date.now();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let data: unknown;

        switch (metadata.type) {
          case AssetType.Texture:
            data = await this.loadTexture(metadata.url);
            break;
          case AssetType.Audio:
            data = await this.loadAudio(metadata.url, controller.signal);
            break;
          case AssetType.JSON:
            data = await this.loadJSON(metadata.url, controller.signal);
            break;
          case AssetType.Text:
            data = await this.loadText(metadata.url, controller.signal);
            break;
          case AssetType.Binary:
            data = await this.loadBinary(metadata.url, controller.signal);
            break;
          case AssetType.Font:
            data = await this.loadFont(metadata.id, metadata.url);
            break;
          default:
            throw new Error(`Unknown asset type: ${metadata.type}`);
        }

        clearTimeout(timeoutId);

        metadata.data = data;
        metadata.state = AssetState.Loaded;
        metadata.loadTime = Date.now() - startTime;

        this.emit('asset:loaded', { id: metadata.id, type: metadata.type, asset: metadata });
        return metadata;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    metadata.state = AssetState.Error;
    metadata.error = lastError || new Error('Unknown error');
    this.emit('asset:error', { id: metadata.id, type: metadata.type, error: metadata.error });
    throw metadata.error;
  }

  private async loadTexture(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load texture: ${url}`));
      img.src = url;
    });
  }

  private async loadAudio(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  private async loadJSON(url: string, signal: AbortSignal): Promise<unknown> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  private async loadText(url: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to load text: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  private async loadBinary(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to load binary: ${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  private async loadFont(family: string, url: string): Promise<FontFace> {
    const font = new FontFace(family, `url(${url})`);
    await font.load();
    // Add font to document.fonts if the add method exists
    if (document.fonts && typeof (document.fonts as unknown as { add?: (font: FontFace) => void }).add === 'function') {
      (document.fonts as unknown as { add: (font: FontFace) => void }).add(font);
    }
    return font;
  }

  /**
   * Load multiple assets as a bundle
   */
  async loadBundle(bundle: AssetBundle): Promise<AssetMetadata[]> {
    const results: AssetMetadata[] = [];
    const errors: Array<{ id: string; error: Error }> = [];
    const total = bundle.assets.length;
    let loaded = 0;

    const loadPromises = bundle.assets.map(async (assetDef) => {
      try {
        const result = await this.load(assetDef.id, assetDef.type, assetDef.url, assetDef.options);
        results.push(result);
        loaded++;
        this.emit('bundle:progress', { loaded, total, percentage: (loaded / total) * 100 });
        return result;
      } catch (error) {
        errors.push({ id: assetDef.id, error: error instanceof Error ? error : new Error(String(error)) });
        loaded++;
        this.emit('bundle:progress', { loaded, total, percentage: (loaded / total) * 100 });
        return null;
      }
    });

    await Promise.all(loadPromises);

    if (errors.length > 0) {
      this.emit('bundle:error', { errors });
    }

    this.emit('bundle:complete', { assets: results });
    return results;
  }

  /**
   * Get a loaded asset
   */
  get<T = unknown>(id: string): T | null {
    const metadata = this.assets.get(id);
    if (metadata && metadata.state === AssetState.Loaded) {
      return metadata.data as T;
    }
    return null;
  }

  /**
   * Get asset metadata
   */
  getMetadata(id: string): AssetMetadata | undefined {
    return this.assets.get(id);
  }

  /**
   * Check if an asset is loaded
   */
  isLoaded(id: string): boolean {
    const metadata = this.assets.get(id);
    return metadata?.state === AssetState.Loaded;
  }

  /**
   * Check if an asset is loading
   */
  isLoading(id: string): boolean {
    return this.loadingQueue.has(id);
  }

  /**
   * Unload an asset
   */
  unload(id: string): void {
    const metadata = this.assets.get(id);
    if (metadata) {
      // Clean up specific asset types
      if (metadata.type === AssetType.Texture && metadata.data instanceof HTMLImageElement) {
        metadata.data.src = '';
      }
      
      this.assets.delete(id);
      this.emit('asset:unloaded', { id });
    }
  }

  /**
   * Unload all assets
   */
  unloadAll(): void {
    for (const id of this.assets.keys()) {
      this.unload(id);
    }
  }

  /**
   * Get total number of loaded assets
   */
  getLoadedCount(): number {
    let count = 0;
    for (const metadata of this.assets.values()) {
      if (metadata.state === AssetState.Loaded) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all loaded asset IDs
   */
  getLoadedIds(): string[] {
    const ids: string[] = [];
    for (const [id, metadata] of this.assets) {
      if (metadata.state === AssetState.Loaded) {
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * Preload assets from a manifest
   */
  async preloadFromManifest(manifestUrl: string): Promise<AssetMetadata[]> {
    const manifest = await this.load('_manifest', AssetType.JSON, manifestUrl);
    const manifestData = manifest.data as { assets?: Array<{ id: string; type: AssetType; url: string }> };
    
    if (manifestData.assets) {
      return this.loadBundle({
        name: 'manifest',
        assets: manifestData.assets
      });
    }
    
    return [];
  }
}

export default AssetManager;
