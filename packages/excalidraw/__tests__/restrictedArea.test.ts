import { describe, it, expect } from "vitest";

import {
  isPointInRestrictedArea,
  isElementInRestrictedArea,
  getRestrictedAreaBounds,
  isElementCompletelyInRestrictedArea,
  clampPointToRestrictedArea,
  shouldEnforceRestriction,
  clampDragOffsetToRestrictedArea,
  trimFreedrawPointsToRestrictedArea,
} from "../utils/restrictedArea";

import { API } from "../tests/helpers/api";

import type { AppState } from "../types";

describe("restrictedArea utilities", () => {
  const testArea: NonNullable<AppState["restrictedArea"]> = {
    enabled: true,
    x: 0,
    y: 0,
    width: 1024,
    height: 1024,
    showBoundary: true,
    boundaryStyle: {
      strokeColor: "#000",
      strokeWidth: 2,
      backgroundColor: null,
      opacity: 0.1,
    },
    enforcement: "soft",
  };

  describe("isPointInRestrictedArea", () => {
    it("should return true for point inside area", () => {
      expect(isPointInRestrictedArea({ x: 500, y: 500 }, testArea)).toBe(true);
    });

    it("should return false for point outside area (x too large)", () => {
      expect(isPointInRestrictedArea({ x: 1500, y: 500 }, testArea)).toBe(
        false,
      );
    });

    it("should return false for point outside area (y too large)", () => {
      expect(isPointInRestrictedArea({ x: 500, y: 1500 }, testArea)).toBe(
        false,
      );
    });

    it("should return false for point outside area (negative x)", () => {
      expect(isPointInRestrictedArea({ x: -100, y: 500 }, testArea)).toBe(
        false,
      );
    });

    it("should return true for point on boundary (top-left)", () => {
      expect(isPointInRestrictedArea({ x: 0, y: 0 }, testArea)).toBe(true);
    });

    it("should return true for point on boundary (bottom-right)", () => {
      expect(isPointInRestrictedArea({ x: 1024, y: 1024 }, testArea)).toBe(
        true,
      );
    });
  });

  describe("isElementInRestrictedArea", () => {
    it("should return true for element completely inside", () => {
      const rect = API.createElement({
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      });

      expect(isElementInRestrictedArea(rect, testArea, new Map())).toBe(true);
    });

    it("should return true for element partially overlapping", () => {
      const rect = API.createElement({
        type: "rectangle",
        x: 900,
        y: 900,
        width: 300,
        height: 300,
      });

      expect(isElementInRestrictedArea(rect, testArea, new Map())).toBe(true);
    });

    it("should return false for element completely outside", () => {
      const rect = API.createElement({
        type: "rectangle",
        x: 2000,
        y: 2000,
        width: 200,
        height: 200,
      });

      expect(isElementInRestrictedArea(rect, testArea, new Map())).toBe(false);
    });

    it("should return false for element outside (left)", () => {
      const rect = API.createElement({
        type: "rectangle",
        x: -500,
        y: 500,
        width: 200,
        height: 200,
      });

      expect(isElementInRestrictedArea(rect, testArea, new Map())).toBe(false);
    });
  });

  describe("getRestrictedAreaBounds", () => {
    it("should return correct bounds tuple", () => {
      const bounds = getRestrictedAreaBounds(testArea);
      expect(bounds).toEqual([0, 0, 1024, 1024]);
    });

    it("should return correct bounds for non-zero origin", () => {
      const area: NonNullable<AppState["restrictedArea"]> = {
        ...testArea,
        x: 100,
        y: 200,
        width: 500,
        height: 600,
      };
      const bounds = getRestrictedAreaBounds(area);
      expect(bounds).toEqual([100, 200, 600, 800]);
    });
  });

  describe("isElementCompletelyInRestrictedArea", () => {
    it("should return true when element is fully inside", () => {
      const insideRect = API.createElement({
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      });

      expect(
        isElementCompletelyInRestrictedArea(insideRect, testArea, new Map()),
      ).toBe(true);
    });

    it("should return false when element overlaps boundary", () => {
      const overlappingRect = API.createElement({
        type: "rectangle",
        x: 900,
        y: 900,
        width: 300,
        height: 300,
      });

      expect(
        isElementCompletelyInRestrictedArea(
          overlappingRect,
          testArea,
          new Map(),
        ),
      ).toBe(false);
    });

    it("should return false when element is completely outside", () => {
      const outsideRect = API.createElement({
        type: "rectangle",
        x: 2000,
        y: 2000,
        width: 200,
        height: 200,
      });

      expect(
        isElementCompletelyInRestrictedArea(outsideRect, testArea, new Map()),
      ).toBe(false);
    });

    it("should return true for element touching boundary but inside", () => {
      const edgeRect = API.createElement({
        type: "rectangle",
        x: 0,
        y: 0,
        width: 1024,
        height: 1024,
      });

      expect(
        isElementCompletelyInRestrictedArea(edgeRect, testArea, new Map()),
      ).toBe(true);
    });
  });

  describe("clampPointToRestrictedArea", () => {
    it("should not modify point inside area", () => {
      const point = { x: 500, y: 500 };
      const clamped = clampPointToRestrictedArea(point, testArea);
      expect(clamped).toEqual({ x: 500, y: 500 });
    });

    it("should clamp x coordinate when too large", () => {
      const point = { x: 2000, y: 500 };
      const clamped = clampPointToRestrictedArea(point, testArea);
      expect(clamped).toEqual({ x: 1024, y: 500 });
    });

    it("should clamp y coordinate when too large", () => {
      const point = { x: 500, y: 2000 };
      const clamped = clampPointToRestrictedArea(point, testArea);
      expect(clamped).toEqual({ x: 500, y: 1024 });
    });

    it("should clamp x coordinate when negative", () => {
      const point = { x: -100, y: 500 };
      const clamped = clampPointToRestrictedArea(point, testArea);
      expect(clamped).toEqual({ x: 0, y: 500 });
    });

    it("should clamp both coordinates when both outside", () => {
      const point = { x: -50, y: 1500 };
      const clamped = clampPointToRestrictedArea(point, testArea);
      expect(clamped).toEqual({ x: 0, y: 1024 });
    });

    it("should return new object (not mutate original)", () => {
      const point = { x: 2000, y: 2000 };
      const clamped = clampPointToRestrictedArea(point, testArea);
      expect(point).toEqual({ x: 2000, y: 2000 }); // Original unchanged
      expect(clamped).toEqual({ x: 1024, y: 1024 }); // New object clamped
    });
  });

  describe("shouldEnforceRestriction", () => {
    it("should return true when enabled", () => {
      expect(shouldEnforceRestriction(testArea)).toBe(true);
    });

    it("should return false when null", () => {
      expect(shouldEnforceRestriction(null)).toBe(false);
    });

    it("should return false when disabled", () => {
      const disabledArea: NonNullable<AppState["restrictedArea"]> = {
        ...testArea,
        enabled: false,
      };
      expect(shouldEnforceRestriction(disabledArea)).toBe(false);
    });

    it("should act as type guard", () => {
      const maybeArea: AppState["restrictedArea"] = testArea;
      if (shouldEnforceRestriction(maybeArea)) {
        // TypeScript should recognize maybeArea as RestrictedAreaConfig here
        const x: number = maybeArea.x; // Should not error
        expect(x).toBe(0);
      }
    });
  });

  describe("clampDragOffsetToRestrictedArea", () => {
    it("should not clamp offset when element stays inside", () => {
      const element = API.createElement({
        type: "rectangle",
        x: 400,
        y: 400,
        width: 100,
        height: 100,
      });

      const clamped = clampDragOffsetToRestrictedArea(
        element,
        50,
        50,
        testArea,
        new Map(),
      );

      expect(clamped).toEqual({ x: 50, y: 50 });
    });

    it("should clamp x offset when dragging past right boundary", () => {
      const element = API.createElement({
        type: "rectangle",
        x: 900,
        y: 400,
        width: 100,
        height: 100,
      });

      const clamped = clampDragOffsetToRestrictedArea(
        element,
        100, // Would move to x=1000, maxX=1100 (outside 1024 boundary)
        0,
        testArea,
        new Map(),
      );

      expect(clamped.x).toBe(24); // Clamps to maxX=1024
      expect(clamped.y).toBe(0);
    });

    it("should clamp x offset when dragging past left boundary", () => {
      const element = API.createElement({
        type: "rectangle",
        x: 50,
        y: 400,
        width: 100,
        height: 100,
      });

      const clamped = clampDragOffsetToRestrictedArea(
        element,
        -100, // Would move to x=-50 (outside boundary)
        0,
        testArea,
        new Map(),
      );

      expect(clamped.x).toBe(-50); // Clamps to minX=0
      expect(clamped.y).toBe(0);
    });

    it("should clamp y offset when dragging past bottom boundary", () => {
      const element = API.createElement({
        type: "rectangle",
        x: 400,
        y: 900,
        width: 100,
        height: 100,
      });

      const clamped = clampDragOffsetToRestrictedArea(
        element,
        0,
        100, // Would move to y=1000, maxY=1100 (outside boundary)
        testArea,
        new Map(),
      );

      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(24); // Clamps to maxY=1024
    });

    it("should clamp both offsets when dragging diagonally outside", () => {
      const element = API.createElement({
        type: "rectangle",
        x: 900,
        y: 900,
        width: 100,
        height: 100,
      });

      const clamped = clampDragOffsetToRestrictedArea(
        element,
        200, // Would exceed both boundaries
        200,
        testArea,
        new Map(),
      );

      expect(clamped.x).toBe(24);
      expect(clamped.y).toBe(24);
    });

    it("should allow negative offset when moving away from boundary", () => {
      const element = API.createElement({
        type: "rectangle",
        x: 920,
        y: 920,
        width: 100,
        height: 100,
      });

      const clamped = clampDragOffsetToRestrictedArea(
        element,
        -50, // Moving inward is always allowed
        -50,
        testArea,
        new Map(),
      );

      expect(clamped).toEqual({ x: -50, y: -50 });
    });
  });

  describe("trimFreedrawPointsToRestrictedArea", () => {
    it("should keep all points when completely inside area", () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 0 },
      ];
      const elementX = 400;
      const elementY = 400;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      expect(trimmed).toEqual(points);
    });

    it("should remove points completely outside area", () => {
      const points = [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
      ];
      const elementX = 2000; // Way outside area
      const elementY = 2000;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      expect(trimmed).toEqual([]);
    });

    it("should add intersection point when line exits boundary", () => {
      const points = [
        { x: 0, y: 0 }, // Inside (at 500, 500)
        { x: 600, y: 0 }, // Outside (at 1100, 500)
      ];
      const elementX = 500;
      const elementY = 500;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      expect(trimmed.length).toBe(2);
      expect(trimmed[0]).toEqual({ x: 0, y: 0 }); // First point unchanged
      expect(trimmed[1].x).toBeCloseTo(524, 0); // Intersection at right boundary (1024 - 500)
      expect(trimmed[1].y).toBeCloseTo(0, 0);
    });

    it("should add intersection point when line enters boundary", () => {
      const points = [
        { x: 0, y: 0 }, // Inside (at 100, 500)
        { x: -200, y: 0 }, // Outside (at -100, 500)
        { x: -200, y: 200 }, // Outside (at -100, 700)
        { x: 0, y: 200 }, // Inside (at 100, 700)
      ];
      const elementX = 100;
      const elementY = 500;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      // Should have first point, exit intersection, (skip outside), entry intersection, last point
      expect(trimmed.length).toBeGreaterThanOrEqual(2);
      expect(trimmed[0]).toEqual({ x: 0, y: 0 }); // First point inside
    });

    it("should handle line crossing boundary twice", () => {
      const points = [
        { x: 0, y: 0 }, // Inside (at 512, 512)
        { x: 600, y: 0 }, // Outside (at 1112, 512)
        { x: 600, y: 600 }, // Outside (at 1112, 1112)
        { x: 0, y: 600 }, // Inside (at 512, 1112)
      ];
      const elementX = 512;
      const elementY = 512;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      // Should have: original point, exit intersection, (skip outside segments), entry intersection, final point
      expect(trimmed.length).toBeGreaterThanOrEqual(2);
      expect(trimmed[0]).toEqual({ x: 0, y: 0 }); // First point
    });

    it("should handle complex path with multiple boundary crossings", () => {
      const points = [
        { x: 0, y: 0 }, // Inside (at 100, 100)
        { x: 1000, y: 0 }, // Outside (at 1100, 100)
        { x: 1000, y: 1000 }, // Outside (at 1100, 1100)
        { x: 0, y: 1000 }, // Inside (at 100, 1100)
        { x: 0, y: 0 }, // Inside (at 100, 100)
      ];
      const elementX = 100;
      const elementY = 100;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      // Should contain intersections and inside points
      expect(trimmed.length).toBeGreaterThan(0);
      expect(trimmed[0]).toEqual({ x: 0, y: 0 });
    });

    it("should return empty array for single point outside", () => {
      const points = [{ x: 0, y: 0 }];
      const elementX = 2000;
      const elementY = 2000;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      expect(trimmed).toEqual([]);
    });

    it("should keep single point inside", () => {
      const points = [{ x: 0, y: 0 }];
      const elementX = 500;
      const elementY = 500;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      expect(trimmed).toEqual(points);
    });

    it("should handle points on boundary edges", () => {
      const points = [
        { x: -500, y: -500 }, // At (0, 0) - top-left corner
        { x: 524, y: -500 }, // At (1024, 0) - top-right corner
      ];
      const elementX = 500;
      const elementY = 500;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      expect(trimmed.length).toBeGreaterThanOrEqual(2);
    });

    it("should handle vertical line crossing horizontal boundary", () => {
      const points = [
        { x: 0, y: -600 }, // Inside (at 500, 400)
        { x: 0, y: 600 }, // Inside (at 500, 1100 - outside)
      ];
      const elementX = 500;
      const elementY = 1000;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      expect(trimmed.length).toBe(2);
      expect(trimmed[0].x).toBeCloseTo(0, 0);
      expect(trimmed[0].y).toBeCloseTo(-600, 0); // First point inside
      expect(trimmed[1].x).toBeCloseTo(0, 0);
      expect(trimmed[1].y).toBeCloseTo(24, 0); // Intersection at bottom boundary (1024 - 1000)
    });

    it("should handle horizontal line crossing vertical boundary", () => {
      const points = [
        { x: -600, y: 0 }, // Inside (at 400, 500)
        { x: 600, y: 0 }, // Outside (at 1100, 500)
      ];
      const elementX = 1000;
      const elementY = 500;

      const trimmed = trimFreedrawPointsToRestrictedArea(
        points,
        elementX,
        elementY,
        testArea,
      );

      expect(trimmed.length).toBe(2);
      expect(trimmed[0].x).toBeCloseTo(-600, 0); // First point inside
      expect(trimmed[0].y).toBeCloseTo(0, 0);
      expect(trimmed[1].x).toBeCloseTo(24, 0); // Intersection at right boundary (1024 - 1000)
      expect(trimmed[1].y).toBeCloseTo(0, 0);
    });
  });
});
