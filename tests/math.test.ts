/**
 * Math Library Tests
 */

import { Vector2, Vector3, Matrix4, Quaternion, MathUtils } from '../src/math';

describe('Vector2', () => {
  describe('constructor', () => {
    it('should create a zero vector by default', () => {
      const v = new Vector2();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should create a vector with given values', () => {
      const v = new Vector2(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });
  });

  describe('static constants', () => {
    it('should have correct ZERO vector', () => {
      expect(Vector2.ZERO.x).toBe(0);
      expect(Vector2.ZERO.y).toBe(0);
    });

    it('should have correct ONE vector', () => {
      expect(Vector2.ONE.x).toBe(1);
      expect(Vector2.ONE.y).toBe(1);
    });
  });

  describe('add', () => {
    it('should add two vectors correctly', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      const result = v1.add(v2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });
  });

  describe('subtract', () => {
    it('should subtract two vectors correctly', () => {
      const v1 = new Vector2(5, 7);
      const v2 = new Vector2(2, 3);
      const result = v1.subtract(v2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });
  });

  describe('multiply', () => {
    it('should multiply vector by scalar', () => {
      const v = new Vector2(2, 3);
      const result = v.multiply(3);
      expect(result.x).toBe(6);
      expect(result.y).toBe(9);
    });
  });

  describe('divide', () => {
    it('should divide vector by scalar', () => {
      const v = new Vector2(6, 9);
      const result = v.divide(3);
      expect(result.x).toBe(2);
      expect(result.y).toBe(3);
    });

    it('should throw on division by zero', () => {
      const v = new Vector2(1, 1);
      expect(() => v.divide(0)).toThrow('Division by zero');
    });
  });

  describe('dot', () => {
    it('should calculate dot product correctly', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      expect(v1.dot(v2)).toBe(11);
    });
  });

  describe('magnitude', () => {
    it('should calculate magnitude correctly', () => {
      const v = new Vector2(3, 4);
      expect(v.magnitude()).toBe(5);
    });
  });

  describe('normalize', () => {
    it('should normalize a vector', () => {
      const v = new Vector2(3, 4);
      const normalized = v.normalize();
      expect(normalized.magnitude()).toBeCloseTo(1);
    });

    it('should return zero vector when normalizing zero vector', () => {
      const v = new Vector2(0, 0);
      const normalized = v.normalize();
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });
  });

  describe('distance', () => {
    it('should calculate distance between vectors', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(3, 4);
      expect(v1.distance(v2)).toBe(5);
    });
  });

  describe('lerp', () => {
    it('should interpolate between vectors', () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(10, 10);
      const result = v1.lerp(v2, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
    });
  });

  describe('equals', () => {
    it('should return true for equal vectors', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(1, 2);
      expect(v1.equals(v2)).toBe(true);
    });

    it('should return false for different vectors', () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      expect(v1.equals(v2)).toBe(false);
    });
  });

  describe('rotate', () => {
    it('should rotate vector correctly', () => {
      const v = new Vector2(1, 0);
      const rotated = v.rotate(Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });
  });
});

describe('Vector3', () => {
  describe('constructor', () => {
    it('should create a zero vector by default', () => {
      const v = new Vector3();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });

    it('should create a vector with given values', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });
  });

  describe('cross', () => {
    it('should calculate cross product correctly', () => {
      const v1 = new Vector3(1, 0, 0);
      const v2 = new Vector3(0, 1, 0);
      const result = v1.cross(v2);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(1);
    });
  });

  describe('dot', () => {
    it('should calculate dot product correctly', () => {
      const v1 = new Vector3(1, 2, 3);
      const v2 = new Vector3(4, 5, 6);
      expect(v1.dot(v2)).toBe(32);
    });
  });
});

describe('Matrix4', () => {
  describe('identity', () => {
    it('should create identity matrix', () => {
      const m = new Matrix4();
      const e = m.elements;
      expect(e[0]).toBe(1);
      expect(e[5]).toBe(1);
      expect(e[10]).toBe(1);
      expect(e[15]).toBe(1);
    });
  });

  describe('multiply', () => {
    it('should multiply identity by itself', () => {
      const m1 = new Matrix4();
      const m2 = new Matrix4();
      const result = m1.multiply(m2);
      expect(result.elements[0]).toBe(1);
      expect(result.elements[15]).toBe(1);
    });
  });

  describe('translate', () => {
    it('should translate correctly', () => {
      const m = new Matrix4();
      m.translate(new Vector3(1, 2, 3));
      expect(m.elements[12]).toBe(1);
      expect(m.elements[13]).toBe(2);
      expect(m.elements[14]).toBe(3);
    });
  });
});

describe('Quaternion', () => {
  describe('constructor', () => {
    it('should create identity quaternion by default', () => {
      const q = new Quaternion();
      expect(q.x).toBe(0);
      expect(q.y).toBe(0);
      expect(q.z).toBe(0);
      expect(q.w).toBe(1);
    });
  });

  describe('normalize', () => {
    it('should normalize quaternion', () => {
      const q = new Quaternion(1, 2, 3, 4);
      const normalized = q.normalize();
      const mag = Math.sqrt(normalized.x ** 2 + normalized.y ** 2 + normalized.z ** 2 + normalized.w ** 2);
      expect(mag).toBeCloseTo(1);
    });
  });

  describe('fromAxisAngle', () => {
    it('should create quaternion from axis angle', () => {
      const q = Quaternion.fromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
      expect(q.y).toBeCloseTo(Math.sin(Math.PI / 4));
      expect(q.w).toBeCloseTo(Math.cos(Math.PI / 4));
    });
  });
});

describe('MathUtils', () => {
  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(MathUtils.clamp(5, 0, 10)).toBe(5);
      expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
      expect(MathUtils.clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate correctly', () => {
      expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
      expect(MathUtils.lerp(0, 10, 0)).toBe(0);
      expect(MathUtils.lerp(0, 10, 1)).toBe(10);
    });
  });

  describe('degToRad/radToDeg', () => {
    it('should convert degrees to radians', () => {
      expect(MathUtils.degToRad(180)).toBeCloseTo(Math.PI);
    });

    it('should convert radians to degrees', () => {
      expect(MathUtils.radToDeg(Math.PI)).toBeCloseTo(180);
    });
  });

  describe('isPowerOfTwo', () => {
    it('should identify powers of two', () => {
      expect(MathUtils.isPowerOfTwo(1)).toBe(true);
      expect(MathUtils.isPowerOfTwo(2)).toBe(true);
      expect(MathUtils.isPowerOfTwo(4)).toBe(true);
      expect(MathUtils.isPowerOfTwo(3)).toBe(false);
      expect(MathUtils.isPowerOfTwo(5)).toBe(false);
    });
  });
});
