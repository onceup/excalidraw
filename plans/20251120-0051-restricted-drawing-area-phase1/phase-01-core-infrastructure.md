# Phase 1: Core Infrastructure - Restricted Drawing Area

## Context Links

- [Main Plan](./plan.md)
- [AppState Patterns Research](./research/RESEARCH_APPSTATE_PATTERNS.md)
- [Rendering Pipeline Research](./research/RENDERING_RESEARCH.md)

## Overview

**Date:** 2025-11-20 **Priority:** High **Status:** Code Review Complete - Approved with Minor Suggestions **Estimated Duration:** 2-3 days **Actual Duration:** ~2 days

Implement foundational infrastructure for restricted drawing area feature:

- Type definitions and AppState integration
- Production-ready props API
- Visual boundary rendering (border + background)
- Canvas clipping for soft enforcement
- Geometry utilities for boundary checking

## Key Insights from Research

1. **AppState Pattern:** `frameRendering` is perfect template - nested config with `enabled`, `clip` flags
2. **Rendering Architecture:** Multi-canvas (static for persistent UI, interactive for overlays)
3. **Clipping Implementation:** `frameClip()` in staticScene.ts:116-140 - proven pattern to reuse
4. **Injection Points:**
   - Line 258 (after grid): Boundary visualization
   - Line 300-317 (element loop): Per-element clipping
5. **Math Utilities:** Have `rectangleIntersectRectangle`, `pointInsideBounds`, `getElementBounds` ready
6. **Props Merging:** Follow UIOptions deep merge pattern for nested configs

## Requirements

### Functional Requirements

1. **FR1:** Configurable restricted area via props (x, y, width, height)
2. **FR2:** Visual boundary rendering with customizable style
3. **FR3:** Soft enforcement - allow drawing outside, clip at render
4. **FR4:** Boundary checking utilities for point/element containment
5. **FR5:** Backward compatible (opt-in feature, null by default)

### Non-Functional Requirements

1. **NFR1:** Type-safe TypeScript throughout
2. **NFR2:** Performance: <1ms overhead per frame for boundary checks
3. **NFR3:** Maintain 60fps with 1000+ elements
4. **NFR4:** Follow existing Excalidraw code patterns
5. **NFR5:** Comprehensive test coverage (>80%)

## Architecture

### Type System

```typescript
// packages/excalidraw/types.ts

export type RestrictedAreaConfig = {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  showBoundary: boolean;
  boundaryStyle: {
    strokeColor: string;
    strokeWidth: number;
    backgroundColor: string | null;
    opacity: number;
  };
  enforcement: "soft"; // Phase 1: only soft mode
};

// Add to AppState
export interface AppState {
  // ... existing props
  restrictedArea: RestrictedAreaConfig | null;
}

// Add to ExcalidrawProps
export interface ExcalidrawProps {
  // ... existing props
  restrictedArea?: Partial<RestrictedAreaConfig> | null;
}
```

### Default Values

```typescript
// packages/excalidraw/appState.ts

const DEFAULT_RESTRICTED_AREA: RestrictedAreaConfig = {
  enabled: true,
  x: 0,
  y: 0,
  width: 1024,
  height: 1024,
  showBoundary: true,
  boundaryStyle: {
    strokeColor: "#6965db", // Excalidraw brand color
    strokeWidth: 2,
    backgroundColor: null, // Transparent by default
    opacity: 0.1,
  },
  enforcement: "soft",
};
```

### Rendering Strategy

**Boundary Visualization (Static Canvas):**

```typescript
// In staticScene.ts after grid rendering (line ~258)

if (appState.restrictedArea?.enabled && appState.restrictedArea.showBoundary) {
  renderRestrictedAreaBoundary(context, appState.restrictedArea, appState);
}
```

**Per-Element Clipping (Static Canvas):**

```typescript
// In element rendering loop (line ~300-317)

context.save();

if (appState.restrictedArea?.enabled &&
    appState.restrictedArea.enforcement === "soft") {
  applyRestrictedAreaClip(context, appState.restrictedArea, appState);
}

renderElement(element, ...);

context.restore();
```

### Math Utilities

```typescript
// packages/excalidraw/utils/restrictedArea.ts (NEW FILE)

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

export const getRestrictedAreaBounds = (area: RestrictedAreaConfig): Bounds => {
  return [area.x, area.y, area.x + area.width, area.y + area.height];
};
```

## Related Code Files

### Files to Modify

1. **packages/excalidraw/types.ts** (lines ~50-150)

   - Add `RestrictedAreaConfig` type
   - Add to `AppState` interface
   - Add to `ExcalidrawProps` interface

2. **packages/excalidraw/appState.ts** (lines ~20-100)

   - Add default `restrictedArea` config
   - Add to `getDefaultAppState()`

3. **packages/excalidraw/index.tsx** (lines ~400-500)

   - Add props forwarding to App component

4. **packages/excalidraw/components/App.tsx** (lines ~1000-1200)

   - Merge props into AppState (like UIOptions pattern)

5. **packages/excalidraw/renderer/staticScene.ts**

   - Line ~258: Add boundary rendering function call
   - Line ~300-317: Add clipping logic to element loop
   - Add helper functions at bottom of file

6. **packages/excalidraw/renderer/types.ts** (if needed)
   - Add `restrictedArea` to `StaticCanvasAppState` type

### Files to Create

1. **packages/excalidraw/utils/restrictedArea.ts** (NEW)

   - Boundary checking utilities
   - Helper functions for geometry

2. **packages/excalidraw/**tests**/restrictedArea.test.ts** (NEW)

   - Unit tests for utilities

3. **packages/excalidraw/**tests**/restrictedAreaRendering.test.tsx** (NEW)
   - Integration tests for rendering

## Implementation Steps

### Step 1: Type Definitions (30 min)

**File:** `packages/excalidraw/types.ts`

```typescript
// Add after existing type definitions

export type RestrictedAreaBoundaryStyle = {
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string | null;
  opacity: number;
};

export type RestrictedAreaConfig = {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  showBoundary: boolean;
  boundaryStyle: RestrictedAreaBoundaryStyle;
  enforcement: "soft";
};

// Find AppState interface and add:
export interface AppState {
  // ... existing properties ...
  restrictedArea: RestrictedAreaConfig | null;
}

// Find ExcalidrawProps interface and add:
export interface ExcalidrawProps {
  // ... existing properties ...
  /**
   * Restrict drawing to a specific area on the canvas.
   * When enabled, elements outside the boundary will be clipped during rendering.
   * @default null (unrestricted)
   */
  restrictedArea?: Partial<RestrictedAreaConfig> | null;
}
```

### Step 2: Default State (15 min)

**File:** `packages/excalidraw/appState.ts`

```typescript
// Add default config constant
export const DEFAULT_RESTRICTED_AREA: RestrictedAreaConfig = {
  enabled: true,
  x: 0,
  y: 0,
  width: 1024,
  height: 1024,
  showBoundary: true,
  boundaryStyle: {
    strokeColor: "#6965db",
    strokeWidth: 2,
    backgroundColor: null,
    opacity: 0.1,
  },
  enforcement: "soft",
};

// In getDefaultAppState() function, add:
export const getDefaultAppState = (): Omit<
  AppState,
  "offsetTop" | "offsetLeft"
> => ({
  // ... existing properties ...
  restrictedArea: null, // Disabled by default
});
```

### Step 3: Props API (20 min)

**File:** `packages/excalidraw/index.tsx`

Find where props are passed to App component and add:

```typescript
<App
  // ... existing props
  restrictedArea={this.props.restrictedArea}
/>
```

**File:** `packages/excalidraw/components/App.tsx`

In props interface at top:

```typescript
type AppProps = {
  // ... existing props
  restrictedArea?: Partial<RestrictedAreaConfig> | null;
};
```

In component initialization (componentDidMount or similar):

```typescript
// Merge restrictedArea prop into AppState
if (this.props.restrictedArea) {
  this.setState({
    restrictedArea: {
      ...DEFAULT_RESTRICTED_AREA,
      ...this.props.restrictedArea,
      boundaryStyle: {
        ...DEFAULT_RESTRICTED_AREA.boundaryStyle,
        ...this.props.restrictedArea.boundaryStyle,
      },
    },
  });
}
```

### Step 4: Math Utilities (45 min)

**File:** `packages/excalidraw/utils/restrictedArea.ts` (NEW)

```typescript
import type { Point, Bounds } from "../types";
import type { RestrictedAreaConfig } from "../types";
import type { ExcalidrawElement, ElementsMap } from "../element/types";
import { getElementBounds } from "../element/bounds";

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
 * Convert RestrictedAreaConfig to Bounds tuple
 */
export const getRestrictedAreaBounds = (area: RestrictedAreaConfig): Bounds => {
  return [area.x, area.y, area.x + area.width, area.y + area.height] as const;
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
```

### Step 5: Boundary Rendering (60 min)

**File:** `packages/excalidraw/renderer/staticScene.ts`

Add helper function near top or bottom of file:

```typescript
import type { RestrictedAreaConfig, StaticCanvasAppState } from "../types";

/**
 * Render the restricted area boundary on the canvas
 */
const renderRestrictedAreaBoundary = (
  context: CanvasRenderingContext2D,
  area: RestrictedAreaConfig,
  appState: StaticCanvasAppState,
) => {
  const { x, y, width, height, boundaryStyle } = area;
  const { scrollX, scrollY, zoom } = appState;

  context.save();

  // Apply viewport transform
  const scaledX = x + scrollX;
  const scaledY = y + scrollY;

  // Render background fill if specified
  if (boundaryStyle.backgroundColor) {
    context.fillStyle = boundaryStyle.backgroundColor;
    context.globalAlpha = boundaryStyle.opacity;
    context.fillRect(scaledX, scaledY, width, height);
    context.globalAlpha = 1;
  }

  // Render border
  context.strokeStyle = boundaryStyle.strokeColor;
  context.lineWidth = boundaryStyle.strokeWidth / zoom.value; // Zoom-aware
  context.setLineDash([10 / zoom.value, 5 / zoom.value]); // Dashed line
  context.strokeRect(scaledX, scaledY, width, height);
  context.setLineDash([]); // Reset

  context.restore();
};
```

Insert call in main rendering function (after grid, ~line 258):

```typescript
export const renderStaticScene = (
  renderConfig: StaticCanvasRenderConfig,
  appState: StaticCanvasAppState,
) => {
  // ... existing code ...

  // Stroke grid
  if (renderConfig.renderGrid) {
    strokeGrid(/* ... */);
  }

  // NEW: Render restricted area boundary
  if (
    appState.restrictedArea?.enabled &&
    appState.restrictedArea.showBoundary
  ) {
    renderRestrictedAreaBoundary(context, appState.restrictedArea, appState);
  }

  // Continue with element rendering...
};
```

### Step 6: Canvas Clipping (60 min)

**File:** `packages/excalidraw/renderer/staticScene.ts`

Add clipping helper function:

```typescript
/**
 * Apply restricted area clipping (similar to frameClip pattern)
 */
const applyRestrictedAreaClip = (
  context: CanvasRenderingContext2D,
  area: RestrictedAreaConfig,
  appState: StaticCanvasAppState,
) => {
  const { x, y, width, height } = area;
  const { scrollX, scrollY } = appState;

  context.translate(x + scrollX, y + scrollY);
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  context.translate(-(x + scrollX), -(y + scrollY));
};
```

Modify element rendering loop (around line 300-317):

```typescript
// In renderStaticScene, element loop
visibleElements.forEach((element) => {
  context.save();

  // NEW: Apply restricted area clipping for soft enforcement
  if (
    appState.restrictedArea?.enabled &&
    appState.restrictedArea.enforcement === "soft" &&
    element.frameId === null // Don't double-clip framed elements
  ) {
    applyRestrictedAreaClip(context, appState.restrictedArea, appState);
  }

  // Existing frame clipping logic
  if (
    element.frameId &&
    appState.frameRendering.enabled &&
    appState.frameRendering.clip
  ) {
    // ... existing frameClip logic
  }

  // Render element
  renderElement(element, elementsMap /* ... */);

  context.restore();
});
```

### Step 7: Update Types Export (10 min)

**File:** `packages/excalidraw/renderer/types.ts`

Ensure `StaticCanvasAppState` includes `restrictedArea`:

```typescript
export type StaticCanvasAppState = {
  // ... existing props
  restrictedArea: RestrictedAreaConfig | null;
};
```

### Step 8: Unit Tests (60 min)

**File:** `packages/excalidraw/__tests__/restrictedArea.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import {
  isPointInRestrictedArea,
  isElementInRestrictedArea,
  getRestrictedAreaBounds,
  isElementCompletelyInRestrictedArea,
} from "../utils/restrictedArea";
import type { RestrictedAreaConfig } from "../types";
import { API } from "../tests/helpers/api";

describe("restrictedArea utilities", () => {
  const testArea: RestrictedAreaConfig = {
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

    it("should return false for point outside area", () => {
      expect(isPointInRestrictedArea({ x: 1500, y: 500 }, testArea)).toBe(
        false,
      );
      expect(isPointInRestrictedArea({ x: 500, y: 1500 }, testArea)).toBe(
        false,
      );
      expect(isPointInRestrictedArea({ x: -100, y: 500 }, testArea)).toBe(
        false,
      );
    });

    it("should return true for point on boundary", () => {
      expect(isPointInRestrictedArea({ x: 0, y: 0 }, testArea)).toBe(true);
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
  });

  describe("getRestrictedAreaBounds", () => {
    it("should return correct bounds tuple", () => {
      const bounds = getRestrictedAreaBounds(testArea);
      expect(bounds).toEqual([0, 0, 1024, 1024]);
    });
  });

  describe("isElementCompletelyInRestrictedArea", () => {
    it("should return true only when element is fully inside", () => {
      const insideRect = API.createElement({
        type: "rectangle",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      });

      const overlappingRect = API.createElement({
        type: "rectangle",
        x: 900,
        y: 900,
        width: 300,
        height: 300,
      });

      expect(
        isElementCompletelyInRestrictedArea(insideRect, testArea, new Map()),
      ).toBe(true);
      expect(
        isElementCompletelyInRestrictedArea(
          overlappingRect,
          testArea,
          new Map(),
        ),
      ).toBe(false);
    });
  });
});
```

### Step 9: Integration Tests (45 min)

**File:** `packages/excalidraw/__tests__/restrictedAreaRendering.test.tsx` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import { render } from "../tests/test-utils";
import { Excalidraw } from "../index";
import type { RestrictedAreaConfig } from "../types";
import { API } from "../tests/helpers/api";

describe("restricted area rendering", () => {
  const restrictedArea: RestrictedAreaConfig = {
    enabled: true,
    x: 0,
    y: 0,
    width: 500,
    height: 500,
    showBoundary: true,
    boundaryStyle: {
      strokeColor: "#6965db",
      strokeWidth: 2,
      backgroundColor: "#f0f0f0",
      opacity: 0.1,
    },
    enforcement: "soft",
  };

  it("should render boundary when enabled", async () => {
    const { container } = render(
      <Excalidraw restrictedArea={restrictedArea} />,
    );

    const canvas = container.querySelector("canvas.static");
    expect(canvas).toBeTruthy();

    // Boundary should be rendered (check via snapshot or canvas context calls)
  });

  it("should not render boundary when showBoundary is false", async () => {
    const { container } = render(
      <Excalidraw
        restrictedArea={{ ...restrictedArea, showBoundary: false }}
      />,
    );

    const canvas = container.querySelector("canvas.static");
    expect(canvas).toBeTruthy();

    // Verify boundary not rendered
  });

  it("should clip elements outside restricted area", async () => {
    const h = await render(<Excalidraw restrictedArea={restrictedArea} />);

    // Create element outside restricted area
    const rect = API.createElement({
      type: "rectangle",
      x: 600,
      y: 600,
      width: 200,
      height: 200,
    });

    h.setState({
      elements: [rect],
    });

    await h.waitForCanvasIdle();

    // Element should be clipped (verify via canvas rendering)
    // This would require mocking canvas context or screenshot comparison
  });
});
```

### Step 10: Type Checking (15 min)

Run TypeScript compiler to ensure no type errors:

```bash
yarn test:typecheck
```

Fix any type errors that arise.

## Todo List

- [x] Step 1: Add type definitions to `types.ts`
- [x] Step 2: Add defaults to `appState.ts`
- [x] Step 3: Wire up props API in `index.tsx` and `App.tsx`
- [x] Step 4: Create `utils/restrictedArea.ts` with geometry helpers
- [x] Step 5: Add boundary rendering to `staticScene.ts`
- [x] Step 6: Add canvas clipping to element loop in `staticScene.ts`
- [x] Step 7: Update `StaticCanvasAppState` type
- [x] Step 8: Write unit tests for utilities (16 tests passing)
- [ ] Step 9: Write integration tests for rendering (deferred to Phase 2)
- [x] Step 10: Run type checking and fix errors (0 errors)
- [ ] Step 11: Manual testing in browser (pending)
- [x] Step 12: Code review (APPROVED with minor suggestions)

## Success Criteria

✅ Phase 1 complete when:

1. **Types:** `RestrictedAreaConfig` type defined, added to AppState and props
2. **Props API:** Can pass `restrictedArea` prop to `<Excalidraw />` component
3. **Visual Rendering:** Boundary renders on canvas with border and optional background
4. **Clipping:** Elements outside boundary are clipped during render (soft mode)
5. **Utilities:** Helper functions work correctly (tested)
6. **Tests:** All unit and integration tests pass
7. **Type Safety:** `yarn test:typecheck` passes with no errors
8. **Performance:** No noticeable FPS drop with restriction enabled
9. **Backward Compat:** Existing functionality unchanged when `restrictedArea` is null

## Risk Assessment

### Low Risk

- **Pattern Reuse:** Following proven `frameClip` pattern
- **Type Safety:** TypeScript catches errors at compile time
- **Opt-In:** Feature disabled by default, no breaking changes

### Medium Risk

- **Performance:** Canvas clipping has overhead (mitigated by save/restore pattern)
- **Testing:** Integration tests may be flaky (mitigated by comprehensive unit tests)

### Mitigations

1. Performance: Profile with 1000+ elements, optimize if needed
2. Testing: Use deterministic rendering, avoid timing-dependent tests
3. Compatibility: Extensive testing with existing features (frames, collaboration)

## Security Considerations

- **Input Validation:** Validate restrictedArea config values (width/height > 0, valid colors)
- **XSS Prevention:** Don't inject user strings into canvas (use validated colors only)
- **DoS Prevention:** Limit boundary dimensions to reasonable values (e.g., max 100000px)

## Next Steps

After Phase 1 completion:

1. **Phase 2:** Interaction layer (pointer clamping, element creation constraints)
2. **Phase 3:** Advanced features (copy/paste handling, text wrapping, smart positioning)
3. **Phase 4:** Polish (animations, accessibility, edge cases)

---

**Ready for implementation. Estimated time: 2-3 days**
