import type { AppState } from "../types";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { ElementsMap } from "@excalidraw/element/types";
import { getElementBounds } from "@excalidraw/element";

type RestrictedAreaConfig = NonNullable<AppState["restrictedArea"]>;
type Point = { x: number; y: number };

/**
 * Check if a point is inside the restricted area
 */
export const isPointInRestrictedArea = (
  point: Point,
  area: RestrictedAreaConfig,
): boolean => {
  return (
    point.x >= area.x &&
    point.x <= area.x + area.width &&
    point.y >= area.y &&
    point.y <= area.y + area.height
  );
};

/**
 * Check if an element intersects with the restricted area (AABB test)
 * Returns true if any part of the element overlaps with the restricted area
 */
export const isElementInRestrictedArea = (
  element: ExcalidrawElement,
  area: RestrictedAreaConfig,
  elementsMap: ElementsMap,
): boolean => {
  const bounds = getElementBounds(element, elementsMap);
  const [minX, minY, maxX, maxY] = bounds;

  // AABB intersection test
  return !(
    maxX < area.x ||
    minX > area.x + area.width ||
    maxY < area.y ||
    minY > area.y + area.height
  );
};

/**
 * Check if element is completely inside restricted area
 */
export const isElementCompletelyInRestrictedArea = (
  element: ExcalidrawElement,
  area: RestrictedAreaConfig,
  elementsMap: ElementsMap,
): boolean => {
  const bounds = getElementBounds(element, elementsMap);
  const [minX, minY, maxX, maxY] = bounds;

  return (
    minX >= area.x &&
    maxX <= area.x + area.width &&
    minY >= area.y &&
    maxY <= area.y + area.height
  );
};

/**
 * Convert RestrictedAreaConfig to Bounds tuple [minX, minY, maxX, maxY]
 */
export const getRestrictedAreaBounds = (
  area: RestrictedAreaConfig,
): readonly [number, number, number, number] => {
  return [area.x, area.y, area.x + area.width, area.y + area.height] as const;
};

/**
 * Clamp a point's coordinates to the restricted area bounds
 * @returns Clamped point (new object, original unchanged)
 */
export const clampPointToRestrictedArea = (
  point: Point,
  area: RestrictedAreaConfig,
): Point => {
  return {
    x: Math.max(area.x, Math.min(point.x, area.x + area.width)),
    y: Math.max(area.y, Math.min(point.y, area.y + area.height)),
  };
};

/**
 * Check if restricting is enabled and should be enforced
 */
export const shouldEnforceRestriction = (
  restrictedArea: AppState["restrictedArea"],
): restrictedArea is RestrictedAreaConfig => {
  return restrictedArea !== null && restrictedArea.enabled;
};

/**
 * Calculate clamped drag offset to keep element within restricted area
 * @param element - Element being dragged
 * @param dragOffsetX - Proposed X offset
 * @param dragOffsetY - Proposed Y offset
 * @param area - Restricted area config
 * @param elementsMap - Map of all elements
 * @returns Clamped offset {x, y}
 */
export const clampDragOffsetToRestrictedArea = (
  element: ExcalidrawElement,
  dragOffsetX: number,
  dragOffsetY: number,
  area: RestrictedAreaConfig,
  elementsMap: ElementsMap,
): Point => {
  const bounds = getElementBounds(element, elementsMap);
  const [minX, minY, maxX, maxY] = bounds;

  // Calculate new position after drag
  const newMinX = minX + dragOffsetX;
  const newMinY = minY + dragOffsetY;
  const newMaxX = maxX + dragOffsetX;
  const newMaxY = maxY + dragOffsetY;

  // Clamp to ensure element stays within bounds
  let clampedOffsetX = dragOffsetX;
  let clampedOffsetY = dragOffsetY;

  // Check left boundary
  if (newMinX < area.x) {
    clampedOffsetX = area.x - minX;
  }
  // Check right boundary
  else if (newMaxX > area.x + area.width) {
    clampedOffsetX = area.x + area.width - maxX;
  }

  // Check top boundary
  if (newMinY < area.y) {
    clampedOffsetY = area.y - minY;
  }
  // Check bottom boundary
  else if (newMaxY > area.y + area.height) {
    clampedOffsetY = area.y + area.height - maxY;
  }

  return { x: clampedOffsetX, y: clampedOffsetY };
};

/**
 * Trim freedraw points to stay within restricted area
 * Removes points outside boundary and adds intersection points at edges
 * @param points - Array of freedraw points (relative to element x,y)
 * @param elementX - Element's absolute X position
 * @param elementY - Element's absolute Y position
 * @param area - Restricted area config
 * @returns Trimmed points array
 */
export const trimFreedrawPointsToRestrictedArea = (
  points: readonly Point[],
  elementX: number,
  elementY: number,
  area: RestrictedAreaConfig,
): Point[] => {
  if (points.length === 0) {
    return [];
  }

  const trimmedPoints: Point[] = [];
  const areaMinX = area.x;
  const areaMinY = area.y;
  const areaMaxX = area.x + area.width;
  const areaMaxY = area.y + area.height;

  // Helper to check if absolute point is inside area
  const isInside = (absX: number, absY: number): boolean => {
    return (
      absX >= areaMinX &&
      absX <= areaMaxX &&
      absY >= areaMinY &&
      absY <= areaMaxY
    );
  };

  // Helper to calculate line-rectangle intersection
  const getIntersection = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): Point | null => {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) {
      return null;
    }

    let tMin = 0;
    let tMax = 1;

    // Check intersection with all 4 edges
    const checks = [
      { value: areaMinX, delta: dx, start: x1 }, // left
      { value: areaMaxX, delta: dx, start: x1 }, // right
      { value: areaMinY, delta: dy, start: y1 }, // top
      { value: areaMaxY, delta: dy, start: y1 }, // bottom
    ];

    for (const check of checks) {
      if (check.delta === 0) {
        if (check.start < check.value || check.start > check.value) {
          continue;
        }
      } else {
        const t = (check.value - check.start) / check.delta;
        if (check.delta > 0) {
          tMin = Math.max(tMin, t);
        } else {
          tMax = Math.min(tMax, t);
        }
      }
    }

    if (tMin > tMax) {
      return null;
    }

    // Return the intersection point closest to the segment start
    const t = tMin > 0 ? tMin : tMax;
    return {
      x: x1 + t * dx - elementX,
      y: y1 + t * dy - elementY,
    };
  };

  // Process each segment
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const absX = elementX + point.x;
    const absY = elementY + point.y;
    const pointInside = isInside(absX, absY);

    if (i === 0) {
      // First point
      if (pointInside) {
        trimmedPoints.push(point);
      }
    } else {
      const prevPoint = points[i - 1];
      const prevAbsX = elementX + prevPoint.x;
      const prevAbsY = elementY + prevPoint.y;
      const prevInside = isInside(prevAbsX, prevAbsY);

      if (prevInside && pointInside) {
        // Both inside - keep point
        trimmedPoints.push(point);
      } else if (prevInside && !pointInside) {
        // Exiting boundary - add intersection point
        const intersection = getIntersection(prevAbsX, prevAbsY, absX, absY);
        if (intersection) {
          trimmedPoints.push(intersection);
        }
      } else if (!prevInside && pointInside) {
        // Entering boundary - add intersection then point
        const intersection = getIntersection(prevAbsX, prevAbsY, absX, absY);
        if (intersection) {
          trimmedPoints.push(intersection);
        }
        trimmedPoints.push(point);
      }
      // Both outside - skip
    }
  }

  return trimmedPoints;
};
