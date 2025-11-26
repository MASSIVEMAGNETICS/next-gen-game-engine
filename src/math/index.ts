/**
 * NextGen Game Engine - Math Library
 * High-performance vector and matrix operations
 */

/**
 * 2D Vector class with SIMD-style optimizations
 */
export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  static readonly ZERO = new Vector2(0, 0);
  static readonly ONE = new Vector2(1, 1);
  static readonly UP = new Vector2(0, -1);
  static readonly DOWN = new Vector2(0, 1);
  static readonly LEFT = new Vector2(-1, 0);
  static readonly RIGHT = new Vector2(1, 0);

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  subtract(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector2 {
    if (scalar === 0) throw new Error('Division by zero');
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  cross(v: Vector2): number {
    return this.x * v.y - this.y * v.x;
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) return new Vector2(0, 0);
    return this.divide(mag);
  }

  distance(v: Vector2): number {
    return this.subtract(v).magnitude();
  }

  distanceSquared(v: Vector2): number {
    return this.subtract(v).magnitudeSquared();
  }

  lerp(v: Vector2, t: number): Vector2 {
    return new Vector2(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t
    );
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  rotate(angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  equals(v: Vector2, epsilon: number = 0.0001): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  static fromArray(arr: [number, number]): Vector2 {
    return new Vector2(arr[0], arr[1]);
  }

  static fromAngle(angle: number, length: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
  }
}

/**
 * 3D Vector class for 3D game development
 */
export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  static readonly ZERO = new Vector3(0, 0, 0);
  static readonly ONE = new Vector3(1, 1, 1);
  static readonly UP = new Vector3(0, 1, 0);
  static readonly DOWN = new Vector3(0, -1, 0);
  static readonly LEFT = new Vector3(-1, 0, 0);
  static readonly RIGHT = new Vector3(1, 0, 0);
  static readonly FORWARD = new Vector3(0, 0, 1);
  static readonly BACK = new Vector3(0, 0, -1);

  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiply(scalar: number): Vector3 {
    return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  divide(scalar: number): Vector3 {
    if (scalar === 0) throw new Error('Division by zero');
    return new Vector3(this.x / scalar, this.y / scalar, this.z / scalar);
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): Vector3 {
    const mag = this.magnitude();
    if (mag === 0) return new Vector3(0, 0, 0);
    return this.divide(mag);
  }

  distance(v: Vector3): number {
    return this.subtract(v).magnitude();
  }

  lerp(v: Vector3, t: number): Vector3 {
    return new Vector3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  equals(v: Vector3, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon
    );
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  static fromArray(arr: [number, number, number]): Vector3 {
    return new Vector3(arr[0], arr[1], arr[2]);
  }
}

/**
 * 4x4 Matrix for 3D transformations
 */
export class Matrix4 {
  public elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }

  identity(): Matrix4 {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8] = 0; e[12] = 0;
    e[1] = 0; e[5] = 1; e[9] = 0; e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }

  multiply(m: Matrix4): Matrix4 {
    const ae = this.elements;
    const be = m.elements;
    const te = new Float32Array(16);

    const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
    const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
    const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
    const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

    const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
    const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
    const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
    const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

    const result = new Matrix4();
    result.elements = te;
    return result;
  }

  translate(v: Vector3): Matrix4 {
    const te = this.elements;
    te[12] += v.x;
    te[13] += v.y;
    te[14] += v.z;
    return this;
  }

  scale(v: Vector3): Matrix4 {
    const te = this.elements;
    te[0] *= v.x; te[4] *= v.y; te[8] *= v.z;
    te[1] *= v.x; te[5] *= v.y; te[9] *= v.z;
    te[2] *= v.x; te[6] *= v.y; te[10] *= v.z;
    te[3] *= v.x; te[7] *= v.y; te[11] *= v.z;
    return this;
  }

  rotateX(angle: number): Matrix4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const te = this.elements;

    const a12 = te[4], a22 = te[5], a32 = te[6], a42 = te[7];
    const a13 = te[8], a23 = te[9], a33 = te[10], a43 = te[11];

    te[4] = a12 * c + a13 * s;
    te[5] = a22 * c + a23 * s;
    te[6] = a32 * c + a33 * s;
    te[7] = a42 * c + a43 * s;
    te[8] = a13 * c - a12 * s;
    te[9] = a23 * c - a22 * s;
    te[10] = a33 * c - a32 * s;
    te[11] = a43 * c - a42 * s;

    return this;
  }

  rotateY(angle: number): Matrix4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const te = this.elements;

    const a11 = te[0], a21 = te[1], a31 = te[2], a41 = te[3];
    const a13 = te[8], a23 = te[9], a33 = te[10], a43 = te[11];

    te[0] = a11 * c - a13 * s;
    te[1] = a21 * c - a23 * s;
    te[2] = a31 * c - a33 * s;
    te[3] = a41 * c - a43 * s;
    te[8] = a11 * s + a13 * c;
    te[9] = a21 * s + a23 * c;
    te[10] = a31 * s + a33 * c;
    te[11] = a41 * s + a43 * c;

    return this;
  }

  rotateZ(angle: number): Matrix4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const te = this.elements;

    const a11 = te[0], a21 = te[1], a31 = te[2], a41 = te[3];
    const a12 = te[4], a22 = te[5], a32 = te[6], a42 = te[7];

    te[0] = a11 * c + a12 * s;
    te[1] = a21 * c + a22 * s;
    te[2] = a31 * c + a32 * s;
    te[3] = a41 * c + a42 * s;
    te[4] = a12 * c - a11 * s;
    te[5] = a22 * c - a21 * s;
    te[6] = a32 * c - a31 * s;
    te[7] = a42 * c - a41 * s;

    return this;
  }

  static perspective(fov: number, aspect: number, near: number, far: number): Matrix4 {
    const m = new Matrix4();
    const te = m.elements;
    const tanHalfFov = Math.tan(fov / 2);

    te[0] = 1 / (aspect * tanHalfFov);
    te[5] = 1 / tanHalfFov;
    te[10] = -(far + near) / (far - near);
    te[11] = -1;
    te[14] = -(2 * far * near) / (far - near);
    te[15] = 0;

    return m;
  }

  static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
    const m = new Matrix4();
    const te = m.elements;

    const w = 1.0 / (right - left);
    const h = 1.0 / (top - bottom);
    const p = 1.0 / (far - near);

    te[0] = 2 * w;
    te[5] = 2 * h;
    te[10] = -2 * p;
    te[12] = -(right + left) * w;
    te[13] = -(top + bottom) * h;
    te[14] = -(far + near) * p;

    return m;
  }

  static lookAt(eye: Vector3, target: Vector3, up: Vector3): Matrix4 {
    const m = new Matrix4();
    const te = m.elements;

    const z = eye.subtract(target).normalize();
    const x = up.cross(z).normalize();
    const y = z.cross(x);

    te[0] = x.x; te[4] = x.y; te[8] = x.z;
    te[1] = y.x; te[5] = y.y; te[9] = y.z;
    te[2] = z.x; te[6] = z.y; te[10] = z.z;
    te[12] = -x.dot(eye);
    te[13] = -y.dot(eye);
    te[14] = -z.dot(eye);

    return m;
  }

  clone(): Matrix4 {
    const m = new Matrix4();
    m.elements = new Float32Array(this.elements);
    return m;
  }
}

/**
 * Quaternion for rotation representation
 */
export class Quaternion {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}

  static readonly IDENTITY = new Quaternion(0, 0, 0, 1);

  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
    );
  }

  normalize(): Quaternion {
    const mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (mag === 0) return new Quaternion(0, 0, 0, 1);
    return new Quaternion(this.x / mag, this.y / mag, this.z / mag, this.w / mag);
  }

  conjugate(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }

  rotateVector(v: Vector3): Vector3 {
    const qv = new Quaternion(v.x, v.y, v.z, 0);
    const result = this.multiply(qv).multiply(this.conjugate());
    return new Vector3(result.x, result.y, result.z);
  }

  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const normalizedAxis = axis.normalize();
    return new Quaternion(
      normalizedAxis.x * s,
      normalizedAxis.y * s,
      normalizedAxis.z * s,
      Math.cos(halfAngle)
    );
  }

  static fromEuler(x: number, y: number, z: number): Quaternion {
    const c1 = Math.cos(x / 2);
    const c2 = Math.cos(y / 2);
    const c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2);
    const s2 = Math.sin(y / 2);
    const s3 = Math.sin(z / 2);

    return new Quaternion(
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3
    );
  }

  toMatrix4(): Matrix4 {
    const m = new Matrix4();
    const te = m.elements;

    const x2 = this.x + this.x, y2 = this.y + this.y, z2 = this.z + this.z;
    const xx = this.x * x2, xy = this.x * y2, xz = this.x * z2;
    const yy = this.y * y2, yz = this.y * z2, zz = this.z * z2;
    const wx = this.w * x2, wy = this.w * y2, wz = this.w * z2;

    te[0] = 1 - (yy + zz);
    te[1] = xy + wz;
    te[2] = xz - wy;

    te[4] = xy - wz;
    te[5] = 1 - (xx + zz);
    te[6] = yz + wx;

    te[8] = xz + wy;
    te[9] = yz - wx;
    te[10] = 1 - (xx + yy);

    return m;
  }

  slerp(q: Quaternion, t: number): Quaternion {
    let cosHalfTheta = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;

    if (cosHalfTheta < 0) {
      q = new Quaternion(-q.x, -q.y, -q.z, -q.w);
      cosHalfTheta = -cosHalfTheta;
    }

    if (cosHalfTheta >= 1.0) {
      return new Quaternion(this.x, this.y, this.z, this.w);
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
      return new Quaternion(
        this.x * 0.5 + q.x * 0.5,
        this.y * 0.5 + q.y * 0.5,
        this.z * 0.5 + q.z * 0.5,
        this.w * 0.5 + q.w * 0.5
      );
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quaternion(
      this.x * ratioA + q.x * ratioB,
      this.y * ratioA + q.y * ratioB,
      this.z * ratioA + q.z * ratioB,
      this.w * ratioA + q.w * ratioB
    );
  }

  clone(): Quaternion {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }
}

/**
 * Math utility functions
 */
export class MathUtils {
  static readonly DEG2RAD = Math.PI / 180;
  static readonly RAD2DEG = 180 / Math.PI;

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  static smootherstep(edge0: number, edge1: number, x: number): number {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  static randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(MathUtils.randomRange(min, max + 1));
  }

  static isPowerOfTwo(value: number): boolean {
    return (value & (value - 1)) === 0 && value > 0;
  }

  static nextPowerOfTwo(value: number): number {
    value--;
    value |= value >> 1;
    value |= value >> 2;
    value |= value >> 4;
    value |= value >> 8;
    value |= value >> 16;
    value++;
    return value;
  }

  static degToRad(degrees: number): number {
    return degrees * MathUtils.DEG2RAD;
  }

  static radToDeg(radians: number): number {
    return radians * MathUtils.RAD2DEG;
  }
}
