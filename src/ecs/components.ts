/**
 * NextGen Game Engine - Built-in Components
 */

import { Component } from './index';
import { Vector2, Vector3, Quaternion } from '../math';

/**
 * Transform2D component for 2D positioning
 */
export class Transform2D implements Component {
  readonly type = 'Transform2D';

  constructor(
    public position: Vector2 = new Vector2(),
    public rotation: number = 0,
    public scale: Vector2 = new Vector2(1, 1)
  ) {}

  getForward(): Vector2 {
    return new Vector2(Math.cos(this.rotation), Math.sin(this.rotation));
  }

  getRight(): Vector2 {
    return new Vector2(Math.cos(this.rotation + Math.PI / 2), Math.sin(this.rotation + Math.PI / 2));
  }

  translate(offset: Vector2): void {
    this.position = this.position.add(offset);
  }

  rotate(angle: number): void {
    this.rotation += angle;
  }

  clone(): Transform2D {
    return new Transform2D(
      this.position.clone(),
      this.rotation,
      this.scale.clone()
    );
  }
}

/**
 * Transform3D component for 3D positioning
 */
export class Transform3D implements Component {
  readonly type = 'Transform3D';

  constructor(
    public position: Vector3 = new Vector3(),
    public rotation: Quaternion = new Quaternion(),
    public scale: Vector3 = new Vector3(1, 1, 1)
  ) {}

  getForward(): Vector3 {
    return this.rotation.rotateVector(Vector3.FORWARD);
  }

  getRight(): Vector3 {
    return this.rotation.rotateVector(Vector3.RIGHT);
  }

  getUp(): Vector3 {
    return this.rotation.rotateVector(Vector3.UP);
  }

  translate(offset: Vector3): void {
    this.position = this.position.add(offset);
  }

  rotateEuler(x: number, y: number, z: number): void {
    const q = Quaternion.fromEuler(x, y, z);
    this.rotation = this.rotation.multiply(q).normalize();
  }

  lookAt(target: Vector3): void {
    const direction = target.subtract(this.position).normalize();
    const up = Vector3.UP;
    
    // Calculate rotation to look at target
    const forward = direction;
    const right = up.cross(forward).normalize();
    const newUp = forward.cross(right);

    // Convert to quaternion (simplified)
    const m00 = right.x, m01 = right.y, m02 = right.z;
    const m10 = newUp.x, m11 = newUp.y, m12 = newUp.z;
    const m20 = forward.x, m21 = forward.y, m22 = forward.z;

    const trace = m00 + m11 + m22;
    let qw: number, qx: number, qy: number, qz: number;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      qw = 0.25 / s;
      qx = (m21 - m12) * s;
      qy = (m02 - m20) * s;
      qz = (m10 - m01) * s;
    } else if (m00 > m11 && m00 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
      qw = (m21 - m12) / s;
      qx = 0.25 * s;
      qy = (m01 + m10) / s;
      qz = (m02 + m20) / s;
    } else if (m11 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
      qw = (m02 - m20) / s;
      qx = (m01 + m10) / s;
      qy = 0.25 * s;
      qz = (m12 + m21) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
      qw = (m10 - m01) / s;
      qx = (m02 + m20) / s;
      qy = (m12 + m21) / s;
      qz = 0.25 * s;
    }

    this.rotation = new Quaternion(qx, qy, qz, qw).normalize();
  }

  clone(): Transform3D {
    return new Transform3D(
      this.position.clone(),
      this.rotation.clone(),
      this.scale.clone()
    );
  }
}

/**
 * Velocity2D component for 2D physics
 */
export class Velocity2D implements Component {
  readonly type = 'Velocity2D';

  constructor(
    public linear: Vector2 = new Vector2(),
    public angular: number = 0
  ) {}

  clone(): Velocity2D {
    return new Velocity2D(this.linear.clone(), this.angular);
  }
}

/**
 * Velocity3D component for 3D physics
 */
export class Velocity3D implements Component {
  readonly type = 'Velocity3D';

  constructor(
    public linear: Vector3 = new Vector3(),
    public angular: Vector3 = new Vector3()
  ) {}

  clone(): Velocity3D {
    return new Velocity3D(this.linear.clone(), this.angular.clone());
  }
}

/**
 * RigidBody2D component for 2D physics simulation
 */
export class RigidBody2D implements Component {
  readonly type = 'RigidBody2D';

  constructor(
    public mass: number = 1,
    public drag: number = 0,
    public angularDrag: number = 0.05,
    public gravityScale: number = 1,
    public isKinematic: boolean = false,
    public freezeRotation: boolean = false
  ) {}

  get inverseMass(): number {
    return this.mass > 0 ? 1 / this.mass : 0;
  }
}

/**
 * Collider2D base component
 */
export abstract class Collider2D implements Component {
  abstract readonly type: string;
  public offset: Vector2 = new Vector2();
  public isTrigger: boolean = false;
  public layer: number = 0;
  public mask: number = 0xFFFFFFFF;
}

/**
 * Box collider for 2D physics
 */
export class BoxCollider2D extends Collider2D {
  readonly type = 'BoxCollider2D';

  constructor(
    public width: number = 1,
    public height: number = 1
  ) {
    super();
  }
}

/**
 * Circle collider for 2D physics
 */
export class CircleCollider2D extends Collider2D {
  readonly type = 'CircleCollider2D';

  constructor(public radius: number = 0.5) {
    super();
  }
}

/**
 * Sprite component for 2D rendering
 */
export class Sprite implements Component {
  readonly type = 'Sprite';

  constructor(
    public textureId: string = '',
    public width: number = 1,
    public height: number = 1,
    public color: [number, number, number, number] = [1, 1, 1, 1],
    public flipX: boolean = false,
    public flipY: boolean = false,
    public sortingLayer: number = 0,
    public sortingOrder: number = 0
  ) {}
}

/**
 * AnimatedSprite component for sprite animations
 */
export class AnimatedSprite implements Component {
  readonly type = 'AnimatedSprite';

  public currentFrame: number = 0;
  public frameTime: number = 0;
  public isPlaying: boolean = true;
  public loop: boolean = true;

  constructor(
    public frames: string[] = [],
    public frameRate: number = 12,
    public width: number = 1,
    public height: number = 1
  ) {}

  get frameDuration(): number {
    return 1 / this.frameRate;
  }

  get currentTextureId(): string {
    return this.frames[this.currentFrame] || '';
  }
}

/**
 * Camera2D component
 */
export class Camera2D implements Component {
  readonly type = 'Camera2D';

  constructor(
    public viewportWidth: number = 800,
    public viewportHeight: number = 600,
    public zoom: number = 1,
    public backgroundColor: [number, number, number, number] = [0, 0, 0, 1]
  ) {}

  worldToScreen(worldPos: Vector2, cameraPos: Vector2): Vector2 {
    const x = (worldPos.x - cameraPos.x) * this.zoom + this.viewportWidth / 2;
    const y = (worldPos.y - cameraPos.y) * this.zoom + this.viewportHeight / 2;
    return new Vector2(x, y);
  }

  screenToWorld(screenPos: Vector2, cameraPos: Vector2): Vector2 {
    const x = (screenPos.x - this.viewportWidth / 2) / this.zoom + cameraPos.x;
    const y = (screenPos.y - this.viewportHeight / 2) / this.zoom + cameraPos.y;
    return new Vector2(x, y);
  }
}

/**
 * AudioSource component for playing sounds
 */
export class AudioSource implements Component {
  readonly type = 'AudioSource';

  constructor(
    public clipId: string = '',
    public volume: number = 1,
    public pitch: number = 1,
    public loop: boolean = false,
    public playOnAwake: boolean = false,
    public spatialBlend: number = 0 // 0 = 2D, 1 = 3D
  ) {}
}

/**
 * Tag component for entity categorization
 */
export class Tag implements Component {
  readonly type = 'Tag';

  constructor(public tags: string[] = []) {}

  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  addTag(tag: string): void {
    if (!this.hasTag(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
    }
  }
}

/**
 * Script component for custom behavior
 */
export interface ScriptBehavior {
  start?(): void;
  update?(deltaTime: number): void;
  fixedUpdate?(fixedDeltaTime: number): void;
  onDestroy?(): void;
  onCollisionEnter?(other: number): void;
  onCollisionExit?(other: number): void;
  onTriggerEnter?(other: number): void;
  onTriggerExit?(other: number): void;
}

export class Script implements Component {
  readonly type = 'Script';
  public behaviors: ScriptBehavior[] = [];

  addBehavior(behavior: ScriptBehavior): void {
    this.behaviors.push(behavior);
  }

  removeBehavior(behavior: ScriptBehavior): void {
    const index = this.behaviors.indexOf(behavior);
    if (index !== -1) {
      this.behaviors.splice(index, 1);
    }
  }
}
