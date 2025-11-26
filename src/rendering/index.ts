/**
 * NextGen Game Engine - Rendering System
 * Abstract rendering interface supporting multiple backends
 */

import { Vector2, Vector3, Matrix4 } from '../math';

/**
 * Color representation
 */
export class Color {
  constructor(
    public r: number = 1,
    public g: number = 1,
    public b: number = 1,
    public a: number = 1
  ) {}

  static readonly WHITE = new Color(1, 1, 1, 1);
  static readonly BLACK = new Color(0, 0, 0, 1);
  static readonly RED = new Color(1, 0, 0, 1);
  static readonly GREEN = new Color(0, 1, 0, 1);
  static readonly BLUE = new Color(0, 0, 1, 1);
  static readonly YELLOW = new Color(1, 1, 0, 1);
  static readonly CYAN = new Color(0, 1, 1, 1);
  static readonly MAGENTA = new Color(1, 0, 1, 1);
  static readonly TRANSPARENT = new Color(0, 0, 0, 0);

  static fromHex(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
    if (result) {
      return new Color(
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
        result[4] ? parseInt(result[4], 16) / 255 : 1
      );
    }
    return new Color();
  }

  toHex(): string {
    const r = Math.round(this.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(this.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(this.b * 255).toString(16).padStart(2, '0');
    const a = Math.round(this.a * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }

  toArray(): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a];
  }

  lerp(other: Color, t: number): Color {
    return new Color(
      this.r + (other.r - this.r) * t,
      this.g + (other.g - this.g) * t,
      this.b + (other.b - this.b) * t,
      this.a + (other.a - this.a) * t
    );
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }
}

/**
 * Texture data structure
 */
export interface Texture {
  id: string;
  width: number;
  height: number;
  data: ImageData | HTMLImageElement | HTMLCanvasElement | null;
  handle?: unknown; // Platform-specific texture handle
}

/**
 * Shader program interface
 */
export interface Shader {
  id: string;
  vertexSource: string;
  fragmentSource: string;
  handle?: unknown;
}

/**
 * Vertex data structure
 */
export interface Vertex {
  position: Vector3;
  uv?: Vector2;
  color?: Color;
  normal?: Vector3;
}

/**
 * Mesh data structure
 */
export interface Mesh {
  id: string;
  vertices: Vertex[];
  indices: number[];
  handle?: unknown;
}

/**
 * Render command types
 */
export enum RenderCommandType {
  Clear = 'clear',
  DrawSprite = 'drawSprite',
  DrawRect = 'drawRect',
  DrawCircle = 'drawCircle',
  DrawLine = 'drawLine',
  DrawText = 'drawText',
  DrawMesh = 'drawMesh',
  SetTransform = 'setTransform',
  PushTransform = 'pushTransform',
  PopTransform = 'popTransform'
}

/**
 * Render command base
 */
export interface RenderCommand {
  type: RenderCommandType;
  layer: number;
}

export interface ClearCommand extends RenderCommand {
  type: RenderCommandType.Clear;
  color: Color;
}

export interface DrawSpriteCommand extends RenderCommand {
  type: RenderCommandType.DrawSprite;
  textureId: string;
  position: Vector2;
  width: number;
  height: number;
  rotation: number;
  color: Color;
  flipX: boolean;
  flipY: boolean;
  sourceRect?: { x: number; y: number; width: number; height: number };
}

export interface DrawRectCommand extends RenderCommand {
  type: RenderCommandType.DrawRect;
  position: Vector2;
  width: number;
  height: number;
  color: Color;
  filled: boolean;
  lineWidth?: number;
}

export interface DrawCircleCommand extends RenderCommand {
  type: RenderCommandType.DrawCircle;
  position: Vector2;
  radius: number;
  color: Color;
  filled: boolean;
  lineWidth?: number;
}

export interface DrawLineCommand extends RenderCommand {
  type: RenderCommandType.DrawLine;
  start: Vector2;
  end: Vector2;
  color: Color;
  lineWidth: number;
}

export interface DrawTextCommand extends RenderCommand {
  type: RenderCommandType.DrawText;
  text: string;
  position: Vector2;
  font: string;
  fontSize: number;
  color: Color;
  align?: 'left' | 'center' | 'right';
}

/**
 * Abstract renderer interface
 */
export interface Renderer {
  readonly width: number;
  readonly height: number;

  init(canvas: HTMLCanvasElement | null): void;
  destroy(): void;
  
  resize(width: number, height: number): void;
  
  beginFrame(): void;
  endFrame(): void;
  
  clear(color: Color): void;
  
  // Texture management
  loadTexture(id: string, source: string | ImageData | HTMLImageElement): Promise<Texture>;
  unloadTexture(id: string): void;
  getTexture(id: string): Texture | undefined;
  
  // Drawing commands
  drawSprite(
    textureId: string,
    position: Vector2,
    width: number,
    height: number,
    rotation?: number,
    color?: Color,
    flipX?: boolean,
    flipY?: boolean,
    sourceRect?: { x: number; y: number; width: number; height: number }
  ): void;
  
  drawRect(
    position: Vector2,
    width: number,
    height: number,
    color: Color,
    filled?: boolean,
    lineWidth?: number
  ): void;
  
  drawCircle(
    position: Vector2,
    radius: number,
    color: Color,
    filled?: boolean,
    lineWidth?: number
  ): void;
  
  drawLine(
    start: Vector2,
    end: Vector2,
    color: Color,
    lineWidth?: number
  ): void;
  
  drawText(
    text: string,
    position: Vector2,
    font: string,
    fontSize: number,
    color: Color,
    align?: 'left' | 'center' | 'right'
  ): void;
  
  // Transform stack
  setTransform(matrix: Matrix4): void;
  pushTransform(): void;
  popTransform(): void;
  resetTransform(): void;
  
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
}

/**
 * Canvas 2D Renderer implementation
 */
export class Canvas2DRenderer implements Renderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private textures: Map<string, Texture> = new Map();
  private transformStack: Matrix4[] = [];
  private _width: number = 800;
  private _height: number = 600;

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  init(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this._width = canvas.width;
      this._height = canvas.height;
    }
  }

  destroy(): void {
    this.textures.clear();
    this.transformStack = [];
    this.ctx = null;
    this.canvas = null;
  }

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  beginFrame(): void {
    this.resetTransform();
  }

  endFrame(): void {
    // Nothing to do for Canvas2D
  }

  clear(color: Color): void {
    if (!this.ctx) return;
    this.ctx.fillStyle = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
    this.ctx.fillRect(0, 0, this._width, this._height);
  }

  async loadTexture(id: string, source: string | ImageData | HTMLImageElement): Promise<Texture> {
    return new Promise((resolve, reject) => {
      if (source instanceof HTMLImageElement) {
        const texture: Texture = {
          id,
          width: source.width,
          height: source.height,
          data: source
        };
        this.textures.set(id, texture);
        resolve(texture);
      } else if (source instanceof ImageData) {
        const texture: Texture = {
          id,
          width: source.width,
          height: source.height,
          data: source
        };
        this.textures.set(id, texture);
        resolve(texture);
      } else if (typeof source === 'string') {
        const img = new Image();
        img.onload = () => {
          const texture: Texture = {
            id,
            width: img.width,
            height: img.height,
            data: img
          };
          this.textures.set(id, texture);
          resolve(texture);
        };
        img.onerror = () => reject(new Error(`Failed to load texture: ${source}`));
        img.src = source;
      } else {
        reject(new Error('Invalid texture source'));
      }
    });
  }

  unloadTexture(id: string): void {
    this.textures.delete(id);
  }

  getTexture(id: string): Texture | undefined {
    return this.textures.get(id);
  }

  drawSprite(
    textureId: string,
    position: Vector2,
    width: number,
    height: number,
    rotation: number = 0,
    color: Color = Color.WHITE,
    flipX: boolean = false,
    flipY: boolean = false,
    sourceRect?: { x: number; y: number; width: number; height: number }
  ): void {
    if (!this.ctx) return;
    
    const texture = this.textures.get(textureId);
    if (!texture || !texture.data) return;

    this.ctx.save();
    
    this.ctx.translate(position.x, position.y);
    if (rotation !== 0) {
      this.ctx.rotate(rotation);
    }
    this.ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    
    this.ctx.globalAlpha = color.a;
    
    const img = texture.data as HTMLImageElement;
    
    if (sourceRect) {
      this.ctx.drawImage(
        img,
        sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
        -width / 2, -height / 2, width, height
      );
    } else {
      this.ctx.drawImage(img, -width / 2, -height / 2, width, height);
    }
    
    this.ctx.restore();
  }

  drawRect(
    position: Vector2,
    width: number,
    height: number,
    color: Color,
    filled: boolean = true,
    lineWidth: number = 1
  ): void {
    if (!this.ctx) return;
    
    const style = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
    
    if (filled) {
      this.ctx.fillStyle = style;
      this.ctx.fillRect(position.x - width / 2, position.y - height / 2, width, height);
    } else {
      this.ctx.strokeStyle = style;
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeRect(position.x - width / 2, position.y - height / 2, width, height);
    }
  }

  drawCircle(
    position: Vector2,
    radius: number,
    color: Color,
    filled: boolean = true,
    lineWidth: number = 1
  ): void {
    if (!this.ctx) return;
    
    const style = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
    
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    
    if (filled) {
      this.ctx.fillStyle = style;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = style;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }
  }

  drawLine(
    start: Vector2,
    end: Vector2,
    color: Color,
    lineWidth: number = 1
  ): void {
    if (!this.ctx) return;
    
    this.ctx.strokeStyle = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
    this.ctx.lineWidth = lineWidth;
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }

  drawText(
    text: string,
    position: Vector2,
    font: string,
    fontSize: number,
    color: Color,
    align: 'left' | 'center' | 'right' = 'left'
  ): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${color.a})`;
    this.ctx.font = `${fontSize}px ${font}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, position.x, position.y);
  }

  setTransform(matrix: Matrix4): void {
    if (!this.ctx) return;
    
    const e = matrix.elements;
    this.ctx.setTransform(e[0], e[1], e[4], e[5], e[12], e[13]);
  }

  pushTransform(): void {
    if (!this.ctx) return;
    this.ctx.save();
  }

  popTransform(): void {
    if (!this.ctx) return;
    this.ctx.restore();
  }

  resetTransform(): void {
    if (!this.ctx) return;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  translate(x: number, y: number): void {
    if (!this.ctx) return;
    this.ctx.translate(x, y);
  }

  rotate(angle: number): void {
    if (!this.ctx) return;
    this.ctx.rotate(angle);
  }

  scale(x: number, y: number): void {
    if (!this.ctx) return;
    this.ctx.scale(x, y);
  }
}

/**
 * Headless renderer for testing/server-side
 */
export class HeadlessRenderer implements Renderer {
  private _width: number = 800;
  private _height: number = 600;
  private textures: Map<string, Texture> = new Map();
  private drawCalls: number = 0;

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get totalDrawCalls(): number {
    return this.drawCalls;
  }

  init(_canvas: HTMLCanvasElement | null): void {
    // No-op for headless
  }

  destroy(): void {
    this.textures.clear();
  }

  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
  }

  beginFrame(): void {
    this.drawCalls = 0;
  }

  endFrame(): void {
    // No-op
  }

  clear(_color: Color): void {
    this.drawCalls++;
  }

  async loadTexture(id: string, _source: string | ImageData | HTMLImageElement): Promise<Texture> {
    const texture: Texture = {
      id,
      width: 64,
      height: 64,
      data: null
    };
    this.textures.set(id, texture);
    return texture;
  }

  unloadTexture(id: string): void {
    this.textures.delete(id);
  }

  getTexture(id: string): Texture | undefined {
    return this.textures.get(id);
  }

  drawSprite(): void {
    this.drawCalls++;
  }

  drawRect(): void {
    this.drawCalls++;
  }

  drawCircle(): void {
    this.drawCalls++;
  }

  drawLine(): void {
    this.drawCalls++;
  }

  drawText(): void {
    this.drawCalls++;
  }

  setTransform(_matrix: Matrix4): void {}
  pushTransform(): void {}
  popTransform(): void {}
  resetTransform(): void {}
  translate(_x: number, _y: number): void {}
  rotate(_angle: number): void {}
  scale(_x: number, _y: number): void {}
}

export default Canvas2DRenderer;
