# Phase 2: Interaction Layer - Restricted Drawing Area

## Context Links

- [Phase 1: Core Infrastructure](./phase-01-core-infrastructure.md) ✅ Complete
- [Phase 1 Code Review](./reports/251120-code-review-phase1.md)
- [Rendering Research](../../RENDERING_RESEARCH.md)
- [AppState Patterns Research](../../RESEARCH_APPSTATE_PATTERNS.md)

## Overview

**Date:** 2025-11-20
**Priority:** High
**Status:** Planning
**Dependencies:** Phase 1 Complete (type system, rendering, math utils)
**Estimated Duration:** 2-3 days

Implement interaction layer to restrict drawing operations within defined boundary:
- Pointer coordinate clamping during active drawing
- Element creation constraint enforcement
- Freedraw boundary crossing detection
- Resize/move operation constraints
- Clear elements that exit boundary on pointer release

## Key Insights from Codebase Research

### Pointer Event Flow Architecture

**Entry Points (App.tsx):**
```
handleCanvasPointerDown (line 6480)
  ↓
pointerDownState initialization
  ↓
handleCanvasPointerMove (line 5824)
  ↓
onPointerMoveFromPointerDownHandler (line 8292)
  ↓
handleCanvasPointerUp (line 6909)
```

**Scene Coordinate Conversion:**
- `viewportCoordsToSceneCoords(event, this.state)` - Used ~30 times in App.tsx
- Converts viewport (clientX, clientY) → scene coords (accounting for zoom/scroll)
- Line 5915: `const scenePointer = viewportCoordsToSceneCoords(event, this.state);`

**Critical Injection Points:**
1. **Line 5915** (`handleCanvasPointerMove`): Scene pointer calculated - CLAMP HERE
2. **Line 8133-8139** (`createGenericElementOnPointerDown`): Grid-snapped coords - VALIDATE HERE
3. **Line 8934-8963** (freedraw point addition): Point-by-point building - CHECK BOUNDARY HERE
4. **Line 8964-9020** (linear element update): Arrow/line dragging - CLAMP COORDS HERE
5. **Line 10827-10926** (`maybeDragNewGenericElement`): Generic shape resize - CONSTRAIN HERE

### Element Creation Patterns

**Generic Elements (rectangles, ellipses, diamonds):**
```typescript
// Line 8129: createGenericElementOnPointerDown
const [gridX, gridY] = getGridPoint(pointerDownState.origin.x, pointerDownState.origin.y, ...);
const element = newElement({ type: elementType, x: gridX, y: gridY, ... });
this.scene.insertElement(element);
this.setState({ newElement: element });
```

**Freedraw Elements:**
```typescript
// Line 8934-8963: Point-by-point building in handleCanvasPointerMove
if (newElement.type === "freedraw") {
  const dx = pointerCoords.x - newElement.x;
  const dy = pointerCoords.y - newElement.y;
  this.scene.mutateElement(newElement, {
    points: [...points, pointFrom<LocalPoint>(dx, dy)],
    pressures: [...pressures, event.pressure]
  });
}
```

**Linear Elements (arrows, lines):**
```typescript
// Line 8964-9020: Two-point update pattern
if (isLinearElement(newElement)) {
  let dx = gridX - newElement.x;
  let dy = gridY - newElement.y;
  if (points.length === 1) {
    // Add second point
  } else if (points.length === 2) {
    // Update last point during drag
  }
}
```

### PointerDownState Structure

Key properties accessed during interaction:
```typescript
pointerDownState.origin        // { x, y } - initial pointer position
pointerDownState.lastCoords    // { x, y } - last recorded position
pointerDownState.drag.offset   // Drag offset for selected elements
pointerDownState.drag.hasOccurred // Has drag started?
```

### State Management Patterns

**Element Lifecycle:**
1. **Creation**: `this.scene.insertElement(element)` + `setState({ newElement: element })`
2. **Update**: `this.scene.mutateElement(element, updates, { informMutation, isDragging })`
3. **Finalization**: `setState({ newElement: null })` on pointer up (lines 6550, 9454, 10301)

**Deletion Pattern:**
```typescript
// Line 6541-6547: Discard short freedraw on touch
this.updateScene({
  elements: this.scene.getElementsIncludingDeleted()
    .filter((el) => el.id !== element.id),
  appState: { newElement: null, ... }
});
```

## Requirements

### Functional Requirements

**FR1: Pointer Coordinate Clamping**
- Clamp scene coordinates to restricted area during active drawing
- Apply to all tools: freedraw, arrows, lines, shapes
- Preserve grid snapping behavior after clamping

**FR2: Element Creation Validation**
- Prevent element creation if initial point outside boundary
- Show visual feedback (cursor change or warning)
- Revert to selection tool if creation blocked

**FR3: Freedraw Boundary Crossing Detection**
- Monitor point-by-point freedraw building
- Detect when stroke exits restricted area
- Clear freedraw element on pointer release if exited boundary
- Maintain existing touch-screen multi-finger handling (line 6535-6569)

**FR4: Resize/Move Constraints**
- Constrain drag operations to keep elements inside boundary
- Prevent resizing beyond boundary edges
- Handle rotated elements correctly (use AABB for simplicity)

**FR5: Element Cleanup on Pointer Up**
- Check if element exited boundary during interaction
- Remove element if any part is outside boundary (strict mode)
- Preserve element if completely inside (partial overlap allowed in soft mode)

### Non-Functional Requirements

**NFR1: Performance**
- Clamping logic: <0.1ms per pointer event (60fps = 16.6ms budget)
- Boundary check: <0.5ms per element on pointer up
- No noticeable lag during freedraw (runs on every pointermove)

**NFR2: Backward Compatibility**
- Feature disabled by default (`restrictedArea: null`)
- No changes to existing drawing behavior when disabled
- All existing tests continue passing

**NFR3: Code Quality**
- Type-safe coordinate transformations
- Reuse existing math utilities (`isPointInRestrictedArea`, etc.)
- Follow existing error handling patterns

## Architecture

### Design Decisions

**Decision 1: Clamping Strategy**
- **Chosen**: Clamp at scene coordinate level (after viewport conversion)
- **Rationale**: Single point of truth, works across all tools
- **Alternative**: Clamp per-tool (rejected - duplication, inconsistent behavior)

**Decision 2: Freedraw Handling**
- **Chosen**: Boundary crossing detection + cleanup on pointer up
- **Rationale**: Allows partial drawing, matches user requirement ("clear on release")
- **Alternative**: Point-level clamping (rejected - creates jagged edges at boundary)
- **Alternative**: Terminate freedraw on exit (rejected - frustrating UX)

**Decision 3: Enforcement Mode**
- **Phase 2 Scope**: Soft enforcement only (clip at render, allow creation)
- **Phase 3**: Add strict enforcement (prevent creation outside boundary)
- **Rationale**: Progressive disclosure, validate soft mode first

**Decision 4: Element Validation Timing**
- **During drag**: Allow temporary boundary violations (performance)
- **On pointer up**: Validate final element position, remove if outside
- **Rationale**: Smoother interaction, single cleanup pass

### Coordinate Clamping Helper

```typescript
// NEW: packages/excalidraw/utils/restrictedArea.ts (extend existing file)

/**
 * Clamp scene coordinates to restricted area bounds
 */
export const clampPointToRestrictedArea = (
  point: Point,
  area: RestrictedAreaConfig,
): Point => {
  return {
    x: Math.max(area.x, Math.min(area.x + area.width, point.x)),
    y: Math.max(area.y, Math.min(area.y + area.height, point.y)),
  };
};

/**
 * Check if freedraw stroke has exited restricted area
 * Returns true if ANY point in stroke is outside boundary
 */
export const hasFreedrawExitedArea = (
  element: ExcalidrawFreeDrawElement,
  area: RestrictedAreaConfig,
): boolean => {
  for (const [dx, dy] of element.points) {
    const absX = element.x + dx;
    const absY = element.y + dy;
    if (!isPointInRestrictedArea({ x: absX, y: absY }, area)) {
      return true;
    }
  }
  return false;
};
```

### Interaction Hooks Architecture

**Hook Point 1: Pointer Move (Coordinate Clamping)**
```typescript
// App.tsx:5915 - handleCanvasPointerMove
private handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
  // ... existing gesture handling ...

  let scenePointer = viewportCoordsToSceneCoords(event, this.state);

  // NEW: Clamp coordinates if restricted area active during drawing
  if (
    this.state.restrictedArea?.enabled &&
    (this.state.newElement || this.state.selectedElementsAreBeingDragged)
  ) {
    scenePointer = clampPointToRestrictedArea(
      scenePointer,
      this.state.restrictedArea
    );
  }

  const { x: scenePointerX, y: scenePointerY } = scenePointer;
  // ... continue with clamped coordinates ...
};
```

**Hook Point 2: Element Creation (Initial Validation)**
```typescript
// App.tsx:8129 - createGenericElementOnPointerDown
private createGenericElementOnPointerDown = (
  elementType: ExcalidrawGenericElement["type"] | "embeddable",
  pointerDownState: PointerDownState,
): void => {
  let [gridX, gridY] = getGridPoint(
    pointerDownState.origin.x,
    pointerDownState.origin.y,
    this.lastPointerDownEvent?.[KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize(),
  );

  // NEW: Validate initial position
  if (this.state.restrictedArea?.enabled) {
    if (!isPointInRestrictedArea({ x: gridX, y: gridY }, this.state.restrictedArea)) {
      // Block element creation outside boundary
      return; // Early exit
    }
  }

  // ... existing element creation logic ...
};
```

**Hook Point 3: Freedraw Monitoring (Boundary Exit Detection)**
```typescript
// App.tsx:8934 - Freedraw point addition in onPointerMoveFromPointerDownHandler
if (newElement.type === "freedraw") {
  const dx = pointerCoords.x - newElement.x;
  const dy = pointerCoords.y - newElement.y;

  // Build points array normally (no clamping at point level)
  const points = [...newElement.points, pointFrom<LocalPoint>(dx, dy)];

  this.scene.mutateElement(newElement, { points, pressures }, ...);

  // NEW: Track if freedraw has exited (for cleanup on pointer up)
  if (this.state.restrictedArea?.enabled) {
    const hasExited = hasFreedrawExitedArea(
      { ...newElement, points } as ExcalidrawFreeDrawElement,
      this.state.restrictedArea
    );
    // Store exit state in component instance variable
    this._freedrawExitedBoundary = hasExited;
  }
}
```

**Hook Point 4: Pointer Up (Element Cleanup)**
```typescript
// App.tsx:6909 - handleCanvasPointerUp
private handleCanvasPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
  // ... existing pointer up logic ...

  const newElement = this.state.newElement;

  // NEW: Cleanup elements outside boundary
  if (
    newElement &&
    this.state.restrictedArea?.enabled &&
    this.state.restrictedArea.enforcement === "soft"
  ) {
    const shouldRemove = this.shouldRemoveElementOutsideBoundary(
      newElement,
      this.state.restrictedArea
    );

    if (shouldRemove) {
      this.updateScene({
        elements: this.scene.getElementsIncludingDeleted()
          .filter((el) => el.id !== newElement.id),
        appState: { newElement: null, suggestedBindings: [] },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      this._freedrawExitedBoundary = false;
      return; // Early exit, element removed
    }
  }

  this._freedrawExitedBoundary = false;
  // ... continue with normal finalization ...
};

// NEW: Helper method
private shouldRemoveElementOutsideBoundary(
  element: ExcalidrawElement,
  area: RestrictedAreaConfig
): boolean {
  if (element.type === "freedraw") {
    return this._freedrawExitedBoundary || false;
  }
  // For other elements, check if any part is outside
  return !isElementCompletelyInRestrictedArea(
    element,
    area,
    this.scene.getNonDeletedElementsMap()
  );
}
```

## Related Code Files

### Files to Modify

**1. `packages/excalidraw/utils/restrictedArea.ts`**
- Lines to add: ~40 (new functions)
- Add: `clampPointToRestrictedArea()`, `hasFreedrawExitedArea()`
- Impact: Core clamping logic, used by all interaction handlers

**2. `packages/excalidraw/components/App.tsx`**
- **Line 5915** (`handleCanvasPointerMove`): Add coordinate clamping (5-10 lines)
- **Line 8129** (`createGenericElementOnPointerDown`): Add initial validation (8-12 lines)
- **Line 8934-8963** (freedraw handling): Add boundary exit tracking (5-8 lines)
- **Line 6909** (`handleCanvasPointerUp`): Add element cleanup logic (15-25 lines)
- **New method** (~15 lines): `shouldRemoveElementOutsideBoundary()`
- **New instance variable**: `private _freedrawExitedBoundary = false;`

**3. `packages/excalidraw/types.ts`**
- No changes needed (Phase 1 complete)

### Files to Create

**Test Files:**
- `packages/excalidraw/__tests__/restrictedArea.interaction.test.ts` (new, ~250 lines)

### Total Impact

- Lines modified: ~80-100
- Lines added: ~290-320
- Files modified: 2
- Files created: 1

## Implementation Steps

### Step 1: Coordinate Clamping Utilities (0.5 days)

**1.1** Extend `utils/restrictedArea.ts`:
```typescript
export const clampPointToRestrictedArea = (
  point: Point,
  area: RestrictedAreaConfig,
): Point => {
  return {
    x: Math.max(area.x, Math.min(area.x + area.width, point.x)),
    y: Math.max(area.y, Math.min(area.y + area.height, point.y)),
  };
};

export const hasFreedrawExitedArea = (
  element: ExcalidrawFreeDrawElement,
  area: RestrictedAreaConfig,
): boolean => {
  // Check all points in stroke
  for (const [dx, dy] of element.points) {
    const absX = element.x + dx;
    const absY = element.y + dy;
    if (!isPointInRestrictedArea({ x: absX, y: absY }, area)) {
      return true;
    }
  }
  return false;
};
```

**1.2** Write unit tests for new utilities:
- Test clamping with various boundary positions
- Test freedraw exit detection with multi-point strokes
- Edge cases: point exactly on boundary, empty strokes

**Success Criteria:**
- All utility functions pass unit tests
- Code coverage >80%
- Type-safe, no any types

### Step 2: Pointer Coordinate Clamping (0.5 days)

**2.1** Modify `App.tsx:5915` (`handleCanvasPointerMove`):
```typescript
private handleCanvasPointerMove = (
  event: React.PointerEvent<HTMLCanvasElement>,
) => {
  // ... existing gesture/pan handling ...

  let scenePointer = viewportCoordsToSceneCoords(event, this.state);

  // Clamp coordinates during active drawing
  if (
    this.state.restrictedArea?.enabled &&
    (this.state.newElement || this.state.selectedElementsAreBeingDragged)
  ) {
    scenePointer = clampPointToRestrictedArea(
      scenePointer,
      this.state.restrictedArea
    );
  }

  const { x: scenePointerX, y: scenePointerY } = scenePointer;
  // ... continue with clamped coords ...
};
```

**2.2** Test clamping behavior:
- Draw rectangle starting inside, drag outside → should stop at boundary
- Draw arrow from inside to outside → endpoint clamped
- Verify grid snapping still works after clamping

**Success Criteria:**
- Cursor movement stops at boundary during drawing
- Grid snapping preserved
- No performance regression (measure with Chrome DevTools)

### Step 3: Element Creation Validation (0.5 days)

**3.1** Modify `App.tsx:8129` (`createGenericElementOnPointerDown`):
```typescript
private createGenericElementOnPointerDown = (
  elementType: ExcalidrawGenericElement["type"] | "embeddable",
  pointerDownState: PointerDownState,
): void => {
  let [gridX, gridY] = getGridPoint(
    pointerDownState.origin.x,
    pointerDownState.origin.y,
    this.lastPointerDownEvent?.[KEYS.CTRL_OR_CMD]
      ? null
      : this.getEffectiveGridSize(),
  );

  // Block creation outside boundary
  if (this.state.restrictedArea?.enabled) {
    if (!isPointInRestrictedArea({ x: gridX, y: gridY }, this.state.restrictedArea)) {
      // TODO Phase 3: Show toast notification
      return;
    }
  }

  // ... existing element creation ...
};
```

**3.2** Test blocked creation:
- Click outside boundary → no element created
- Click inside boundary → element created normally
- Verify for all element types (rectangle, ellipse, arrow, etc.)

**Success Criteria:**
- Elements only created inside boundary
- No console errors or warnings
- State remains consistent after blocked creation

### Step 4: Freedraw Boundary Exit Detection (0.5 days)

**4.1** Add instance variable to App class:
```typescript
// App.tsx class properties
private _freedrawExitedBoundary = false;
```

**4.2** Modify freedraw handling in `App.tsx:8934`:
```typescript
if (newElement.type === "freedraw") {
  const dx = pointerCoords.x - newElement.x;
  const dy = pointerCoords.y - newElement.y;

  const points = [...newElement.points, pointFrom<LocalPoint>(dx, dy)];
  const pressures = newElement.simulatePressure
    ? newElement.pressures
    : [...newElement.pressures, event.pressure];

  this.scene.mutateElement(
    newElement,
    { points, pressures },
    { informMutation: false, isDragging: false }
  );

  // Track boundary exit
  if (this.state.restrictedArea?.enabled) {
    const hasExited = hasFreedrawExitedArea(
      { ...newElement, points } as ExcalidrawFreeDrawElement,
      this.state.restrictedArea
    );
    this._freedrawExitedBoundary = hasExited;
  }

  this.setState({ newElement });
}
```

**4.3** Test freedraw exit tracking:
- Draw stroke inside boundary → `_freedrawExitedBoundary = false`
- Draw stroke that crosses boundary → `_freedrawExitedBoundary = true`
- Verify flag resets on new stroke

**Success Criteria:**
- Exit flag accurately tracks boundary crossing
- No false positives/negatives
- Works with pressure/non-pressure strokes

### Step 5: Element Cleanup on Pointer Up (0.5 days)

**5.1** Add helper method to App class:
```typescript
private shouldRemoveElementOutsideBoundary(
  element: ExcalidrawElement,
  area: RestrictedAreaConfig
): boolean {
  if (element.type === "freedraw") {
    return this._freedrawExitedBoundary || false;
  }

  // For other elements, check if completely inside
  return !isElementCompletelyInRestrictedArea(
    element,
    area,
    this.scene.getNonDeletedElementsMap()
  );
}
```

**5.2** Modify `App.tsx:6909` (`handleCanvasPointerUp`):
```typescript
private handleCanvasPointerUp = (
  event: React.PointerEvent<HTMLCanvasElement>,
) => {
  this.removePointer(event);
  this.lastPointerUpEvent = event;

  const scenePointer = viewportCoordsToSceneCoords(
    { clientX: event.clientX, clientY: event.clientY },
    this.state,
  );

  // NEW: Cleanup elements outside boundary
  const newElement = this.state.newElement;
  if (
    newElement &&
    this.state.restrictedArea?.enabled &&
    this.state.restrictedArea.enforcement === "soft"
  ) {
    const shouldRemove = this.shouldRemoveElementOutsideBoundary(
      newElement,
      this.state.restrictedArea
    );

    if (shouldRemove) {
      this.updateScene({
        elements: this.scene.getElementsIncludingDeleted()
          .filter((el) => el.id !== newElement.id),
        appState: {
          newElement: null,
          editingTextElement: null,
          startBoundElement: null,
          suggestedBindings: [],
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      this._freedrawExitedBoundary = false;
      return;
    }
  }

  this._freedrawExitedBoundary = false;
  // ... existing pointer up logic ...
};
```

**5.3** Test cleanup behavior:
- Draw freedraw outside → cleared on release
- Draw rectangle partially outside → cleared on release
- Draw element completely inside → preserved
- Verify undo history not polluted with removed elements

**Success Criteria:**
- Elements cleared when exiting boundary
- No memory leaks (check with Chrome Memory Profiler)
- Undo/redo not affected

### Step 6: Integration Testing (0.25 days)

**6.1** Create comprehensive test suite `__tests__/restrictedArea.interaction.test.ts`:

```typescript
describe("Restricted Area - Interaction Layer", () => {
  describe("Coordinate Clamping", () => {
    it("clamps rectangle drag to boundary", async () => {
      // Setup restricted area
      // Mouse down inside, drag outside
      // Assert: element width clamped to boundary edge
    });

    it("clamps arrow endpoint to boundary", async () => {
      // Draw arrow from inside to outside
      // Assert: second point on boundary edge
    });
  });

  describe("Element Creation", () => {
    it("blocks rectangle creation outside boundary", async () => {
      // Click outside boundary with rectangle tool
      // Assert: no element created
    });

    it("allows rectangle creation inside boundary", async () => {
      // Click inside boundary
      // Assert: element created at click point
    });
  });

  describe("Freedraw Cleanup", () => {
    it("removes freedraw that exits boundary", async () => {
      // Draw stroke inside, continue outside, release
      // Assert: element removed from scene
    });

    it("preserves freedraw completely inside", async () => {
      // Draw stroke entirely inside
      // Assert: element preserved
    });
  });

  describe("Performance", () => {
    it("maintains 60fps during clamped drawing", async () => {
      // Simulate 1000 pointer move events
      // Assert: each handler completes in <16ms
    });
  });
});
```

**6.2** Run full test suite:
```bash
yarn test:update
yarn test:typecheck
```

**Success Criteria:**
- All new tests pass
- All existing tests still pass
- No TypeScript errors
- Code coverage >80% for new code

### Step 7: Manual Testing & Polish (0.25 days)

**7.1** Test all drawing tools:
- Rectangle, ellipse, diamond (generic shapes)
- Arrow, line (linear elements)
- Freedraw (with mouse, pen, touch)
- Text element (special case - skip for Phase 2)

**7.2** Test edge cases:
- Rapid drawing at boundary edge
- Multi-touch on touch devices (existing handling)
- Drawing while zoomed in/out
- Drawing while panned (scrollX/scrollY offset)

**7.3** Performance testing:
- Open Chrome DevTools Performance tab
- Record drawing session with 500+ elements
- Verify no frame drops during clamped drawing
- Check memory usage (no leaks)

**Success Criteria:**
- Smooth interaction at boundary
- No visual glitches or lag
- Consistent behavior across tools
- Clean console (no warnings/errors)

## Success Criteria

### Functional Criteria

✅ **SC1: Coordinate Clamping**
- Pointer coordinates clamped during active drawing
- Works for all drawing tools (shapes, arrows, freedraw)
- Grid snapping preserved after clamping

✅ **SC2: Element Creation Blocked**
- Cannot create elements outside boundary
- No state corruption from blocked creation
- Clean error handling (no console errors)

✅ **SC3: Freedraw Cleanup**
- Freedraw cleared on release if exited boundary
- Detection accurate (no false positives/negatives)
- Preserves strokes completely inside

✅ **SC4: Generic Shape Cleanup**
- Rectangles/ellipses/arrows cleared if partially outside
- Detection uses AABB (handles rotation correctly)
- Cleanup happens on pointer up (not during drag)

✅ **SC5: Backward Compatibility**
- Feature disabled when `restrictedArea: null`
- All existing tests pass
- No breaking changes to API

### Non-Functional Criteria

✅ **SC6: Performance**
- Clamping: <0.1ms per event
- Boundary check: <0.5ms per element
- Maintains 60fps during drawing

✅ **SC7: Code Quality**
- Type-safe (no any types)
- Follows existing patterns (matches frameClip, etc.)
- Well-commented complex logic

✅ **SC8: Test Coverage**
- Unit tests: >80% coverage
- Integration tests: All user flows covered
- Performance tests: Frame time regression detection

## Risk Assessment

### High Risks

**R1: Performance Degradation**
- **Risk**: Clamping on every pointermove slows drawing
- **Likelihood**: Medium
- **Impact**: High (breaks 60fps target)
- **Mitigation**:
  - Profile with Chrome DevTools before/after
  - Use simple math (min/max only, no sqrt/complex ops)
  - Early exit when restrictedArea disabled
  - Consider throttling for freedraw (every Nth point)

**R2: Freedraw Edge Cases**
- **Risk**: Inaccurate exit detection (false positives)
- **Likelihood**: Medium
- **Impact**: High (user frustration, lost work)
- **Mitigation**:
  - Comprehensive test suite with edge cases
  - Add tolerance margin (1-2px inside boundary)
  - User feedback: toast notification when stroke cleared
  - Future: Undo support for cleared strokes

**R3: Multi-Touch Conflicts**
- **Risk**: Breaks existing touch handling (line 6535-6569)
- **Likelihood**: Low
- **Impact**: Medium (touch users affected)
- **Mitigation**:
  - Preserve existing touch logic unchanged
  - Test on actual touch devices
  - Reset `_freedrawExitedBoundary` on touch cancel

### Medium Risks

**R4: Coordinate Conversion Edge Cases**
- **Risk**: Clamping breaks with extreme zoom/scroll
- **Likelihood**: Low
- **Impact**: Medium (visual glitches)
- **Mitigation**:
  - Test with zoom 0.1x to 10x
  - Test with large scroll offsets
  - Validate clamp coords are in scene space (not viewport)

**R5: State Synchronization**
- **Risk**: `_freedrawExitedBoundary` out of sync with state
- **Likelihood**: Low
- **Impact**: Low (single stroke affected)
- **Mitigation**:
  - Reset flag on pointer up (always)
  - Reset on tool change
  - Consider moving to state (next refactor)

## Testing Strategy

### Unit Tests (0.5 days)

**Utilities (`restrictedArea.test.ts`):**
- `clampPointToRestrictedArea()`: 10 test cases
  - Inside boundary → unchanged
  - Outside X → clamped to max/min X
  - Outside Y → clamped to max/min Y
  - Outside both → clamped to corner
- `hasFreedrawExitedArea()`: 8 test cases
  - All points inside → false
  - One point outside → true
  - First point outside → true
  - Empty stroke → false

### Integration Tests (1 day)

**Drawing Scenarios (`restrictedArea.interaction.test.ts`):**

```typescript
describe("Rectangle Creation", () => {
  it("allows creation inside boundary", () => {
    h.setState({ restrictedArea: { enabled: true, x: 0, y: 0, w: 1024, h: 1024 } });
    mouse.down(500, 500);
    mouse.move(600, 600);
    mouse.up();
    expect(h.elements).toHaveLength(1);
    expect(h.elements[0].type).toBe("rectangle");
  });

  it("blocks creation outside boundary", () => {
    h.setState({ restrictedArea: { enabled: true, x: 0, y: 0, w: 1024, h: 1024 } });
    mouse.down(1500, 1500); // Outside
    mouse.move(1600, 1600);
    mouse.up();
    expect(h.elements).toHaveLength(0); // No element created
  });

  it("clamps drag to boundary", () => {
    h.setState({ restrictedArea: { enabled: true, x: 0, y: 0, w: 1024, h: 1024 } });
    mouse.down(500, 500);
    mouse.move(1500, 1500); // Drag outside
    mouse.up();
    expect(h.elements).toHaveLength(1);
    const rect = h.elements[0];
    expect(rect.x + rect.width).toBeLessThanOrEqual(1024); // Clamped
  });
});

describe("Freedraw Cleanup", () => {
  it("removes stroke exiting boundary", () => {
    h.setState({ restrictedArea: { enabled: true, x: 0, y: 0, w: 1024, h: 1024 } });
    mouse.down(500, 500);
    mouse.move(600, 600);
    mouse.move(1500, 1500); // Exit boundary
    mouse.up();
    expect(h.elements).toHaveLength(0); // Stroke cleared
  });

  it("preserves stroke inside boundary", () => {
    h.setState({ restrictedArea: { enabled: true, x: 0, y: 0, w: 1024, h: 1024 } });
    mouse.down(500, 500);
    mouse.move(600, 600);
    mouse.move(700, 700); // Stay inside
    mouse.up();
    expect(h.elements).toHaveLength(1); // Preserved
    expect(h.elements[0].type).toBe("freedraw");
  });
});

describe("Arrow Clamping", () => {
  it("clamps second point to boundary", () => {
    h.setState({ restrictedArea: { enabled: true, x: 0, y: 0, w: 1024, h: 1024 } });
    mouse.down(500, 500);
    mouse.move(1500, 1500); // Drag endpoint outside
    mouse.up();
    expect(h.elements).toHaveLength(1);
    const arrow = h.elements[0];
    expect(arrow.points[1][0] + arrow.x).toBeLessThanOrEqual(1024);
    expect(arrow.points[1][1] + arrow.y).toBeLessThanOrEqual(1024);
  });
});
```

### Performance Tests

**Benchmark Script:**
```typescript
it("maintains <0.1ms clamping overhead", () => {
  const area = { enabled: true, x: 0, y: 0, width: 1024, height: 1024 };
  const point = { x: 1500, y: 1500 };

  const start = performance.now();
  for (let i = 0; i < 10000; i++) {
    clampPointToRestrictedArea(point, area);
  }
  const end = performance.now();

  const avgTime = (end - start) / 10000;
  expect(avgTime).toBeLessThan(0.1); // <0.1ms per call
});
```

### Manual Test Plan

**Session 1: Drawing Tools (30 min)**
1. Enable restricted area (1024x1024)
2. Test each tool: rectangle, ellipse, diamond, arrow, line, freedraw
3. For each tool:
   - Draw completely inside → should work normally
   - Start inside, drag outside → should clamp
   - Start outside → should block (or clamp immediately)
4. Record any visual glitches, lag, or unexpected behavior

**Session 2: Edge Cases (30 min)**
1. Test with different zoom levels (0.1x, 1x, 5x, 10x)
2. Test with canvas panned (large scrollX/scrollY offsets)
3. Test rapid drawing at boundary edge
4. Test on touch device (if available)
5. Test freedraw with pen/stylus (pressure sensitivity)

**Session 3: Performance (15 min)**
1. Open Chrome DevTools → Performance tab
2. Record session: draw 100 freedraw strokes
3. Analyze frame times (should be <16.6ms)
4. Check memory usage (no leaks)
5. Compare with restricted area disabled (baseline)

## Unresolved Questions

1. **User Feedback**: Should we show toast notification when element cleared? (Answer: Yes, add in Phase 3)
2. **Undo Behavior**: Should cleared elements be undoable? (Answer: No for Phase 2, revisit in Phase 3)
3. **Text Elements**: How to handle text creation outside boundary? (Answer: Skip for Phase 2, handle in Phase 3)
4. **Paste/Drop**: Should pasted elements be constrained? (Answer: Yes, but defer to Phase 3)
5. **Selection Drag**: Should dragging selection be constrained? (Answer: Yes, but current implementation allows it - revisit in Phase 3)

## Dependencies & Blockers

**Dependencies:**
- ✅ Phase 1 Complete: Type system, rendering, math utilities
- ✅ `isPointInRestrictedArea()` utility function
- ✅ `isElementCompletelyInRestrictedArea()` utility function
- ✅ `getElementBounds()` from @excalidraw/element

**Blockers:**
- None identified

## Next Steps (Phase 3)

After Phase 2 completion:

1. **Strict Enforcement Mode**
   - Add `enforcement: "strict"` mode
   - Prevent ANY drawing outside boundary (vs cleanup after)
   - Visual feedback (cursor change, toast notifications)

2. **Advanced Constraints**
   - Text element handling
   - Paste/drop constraints
   - Selection drag constraints
   - Multi-element operations

3. **UX Enhancements**
   - Boundary resize handles (interactive editing)
   - Toast notifications for blocked/cleared operations
   - Undo support for cleared elements
   - Boundary style presets

4. **Collaboration Support**
   - Sync restricted area config across clients
   - Handle remote cursor clamping
   - Conflict resolution for boundary changes

---

**Total Estimated Effort:** 2-3 days
**Priority Tasks:** Steps 1-5 (core functionality)
**Optional Polish:** Step 7 (manual testing can be iterative)

**Review Checkpoints:**
- After Step 2: Verify clamping works for basic shapes
- After Step 4: Verify freedraw cleanup works correctly
- After Step 6: Full code review before merge
