# Excalidraw Rendering Pipeline Research
## Restricted Area Visualization & Canvas Clipping Implementation

---

## 1. MULTI-CANVAS ARCHITECTURE

### Canvas Organization
Excalidraw uses **two separate HTML5 canvases**:

- **StaticCanvas** (`packages/excalidraw/components/canvases/StaticCanvas.tsx`)
  - Renders elements, grid, and persistent content
  - Updated when `sceneNonce` changes (element mutations)
  - Rendered at `scale` (device pixel ratio)
  - Memoized with shallow comparison to prevent unnecessary re-renders

- **InteractiveCanvas** (`packages/excalidraw/components/canvases/InteractiveCanvas.tsx`)
  - Renders UI overlays: selections, handles, binding highlights, snap lines
  - Runs continuous animation loop via `AnimationController.start()`
  - Rendered via `requestAnimationFrame()` for smooth interactions
  - Independent of element mutations

### Rendering Responsibilities
```
StaticCanvas renders:
├─ Grid (strokeGrid)
├─ Elements (renderElement)
├─ Bound text
├─ Link icons
└─ Frame boundaries (optional clipping)

InteractiveCanvas renders:
├─ Selection boxes
├─ Transform handles
├─ Remote cursors
├─ Binding highlights
├─ Snap lines
└─ Scrollbars
```

**Injection Point for Boundaries**: StaticCanvas (persistent, always visible)

---

## 2. CANVAS CLIPPING IMPLEMENTATION

### Existing Frame Clipping Pattern
Excalidraw has **production-ready frame clipping** (`staticScene.ts:116-140`):

```typescript
export const frameClip = (
  frame: ExcalidrawFrameLikeElement,
  context: CanvasRenderingContext2D,
  renderConfig: StaticCanvasRenderConfig,
  appState: StaticCanvasAppState,
) => {
  // 1. Translate to frame origin (account for scroll)
  context.translate(frame.x + appState.scrollX, frame.y + appState.scrollY);

  // 2. Define clip path (supports rounded corners)
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(0, 0, frame.width, frame.height,
                      FRAME_STYLE.radius / appState.zoom.value);
  } else {
    context.rect(0, 0, frame.width, frame.height);
  }

  // 3. Apply clipping
  context.clip();

  // 4. Reverse translation to maintain coordinates
  context.translate(-(frame.x + appState.scrollX),
                    -(frame.y + appState.scrollY));
};
```

### Usage Pattern
Applied **conditionally** before rendering elements:

```typescript
if (frameId && appState.frameRendering.enabled &&
    appState.frameRendering.clip) {
  const frame = getTargetFrame(element, elementsMap, appState);
  if (frame && shouldApplyFrameClip(element, frame, appState,
                                     elementsMap, inFrameGroupsMap)) {
    frameClip(frame, context, renderConfig, appState);
  }
}

context.save();
// ... element rendering ...
context.restore();
```

### Key Points
- **State Management**: `context.save()` / `context.restore()` isolate each element
- **Coordinate Transform**: Translate before clip, reverse after
- **Rounding**: Uses native `roundRect()` with fallback to `rect()`
- **Performance**: Applied per-element, not globally

### For Restricted Areas
```typescript
// Apply similar pattern to boundary clipping
context.save();
restrictedAreaClip(boundary, context, appState);
// Render elements inside boundary
context.restore();
```

---

## 3. RENDERING HOOKS & LIFECYCLE

### Render Entry Points

#### StaticCanvas (`StaticCanvas.tsx:59-71`)
```typescript
useEffect(() => {
  renderStaticScene({
    canvas, rc, scale, elementsMap, allElementsMap,
    visibleElements, appState, renderConfig
  }, isRenderThrottlingEnabled());  // throttle param
});
```
- Runs **every render** (can be throttled to RAF)
- Triggered by: props comparison (sceneNonce, elementsMap, zoom)

#### InteractiveCanvas (`InteractiveCanvas.tsx:169-193`)
```typescript
AnimationController.start<InteractiveSceneRenderAnimationState>(
  INTERACTIVE_SCENE_ANIMATION_KEY,
  ({ deltaTime, state }) => {
    const nextAnimationState = renderInteractiveScene({
      ...rendererParams, deltaTime, animationState: state
    }).animationState;
    return nextAnimationState;  // return undefined to stop loop
  }
);
```
- Runs **continuous loop** via `requestAnimationFrame()`
- `deltaTime` available for frame-rate independent animations
- Returns animation state to continue or `undefined` to stop

### Render Order (staticScene.ts:212-460)

```
1. bootstrapCanvas() - Setup context (scale, bg color)
2. context.scale(zoom.value)
3. strokeGrid() - Render background grid
4. visibleElements.forEach() - Render each element:
   a. context.save()
   b. [frameClip] - Apply clipping if inside frame
   c. renderElement() - Main element rendering
   d. [Render bound text]
   e. context.restore()
5. [Render link icons] - Final decorative layer
```

**Injection Point for Boundary Rendering**:
- **Option A (Early)**: After grid, before elements
- **Option B (Late)**: After elements, before link icons
- **Option C (Per-element)**: With frame clipping (soft enforcement)

---

## 4. PERFORMANCE OPTIMIZATION

### Dirty Rectangle Detection
❌ **Not implemented** - Full canvas redraws on every change
- Mitigated by throttling and selective element rendering

### Rendering Throttling

#### Static Scene Throttling (`staticScene.ts:464-469`)
```typescript
const renderStaticSceneThrottled = throttleRAF(
  (config: StaticSceneRenderConfig) => {
    _renderStaticScene(config);
  },
  { trailing: true }  // ensures final state renders
);

export const renderStaticScene = (
  renderConfig: StaticSceneRenderConfig,
  throttle?: boolean
) => {
  if (throttle) {
    renderStaticSceneThrottled(renderConfig);
  } else {
    _renderStaticScene(renderConfig);
  }
};
```
- Calls: `throttleRAF()` from `@excalidraw/common`
- Behavior: Max 1 render per RAF frame (~16.6ms @ 60fps)
- Trailing enabled: ensures mutations render before next interaction

#### Animation Loop Control (`animation.ts:32-39`)
```typescript
if (isRenderThrottlingEnabled()) {
  requestAnimationFrame(AnimationController.tick);
} else {
  setTimeout(AnimationController.tick, 0);  // async loop
}
```
- Respects user preference: `isRenderThrottlingEnabled()`
- Default: RAF (60fps target)
- Fallback: setTimeout (uncapped, but deferred)

### Element Visibility Filtering
`Renderer.ts:27-67` - **Critical optimization**

```typescript
const visibleElements = elementsMap
  .filter(el => isElementInViewport(
    el, width, height,
    { zoom, offsetLeft, offsetTop, scrollX, scrollY },
    elementsMap
  ));
```
- Only renders elements in viewport bounds
- Handles nested elements (frames, groups) correctly
- Reduces draw calls from 1000+ to relevant subset

### Canvas State Isolation
```typescript
// Each element rendering:
context.save();    // Snapshot: fill, stroke, clip, transform
// Modify context (translate, scale, clip)
context.restore(); // Restore to previous state
```
- Prevents state leakage between elements
- Enables independent clipping per element
- ~20-30% overhead vs global state

### Caching Strategies
- **Link Icon Canvas Cache** (`staticScene.ts:144-211`)
  - Off-screen canvas caches rendered icons
  - Invalidates only when zoom changes
  - Reduces text rendering overhead

---

## 5. CODE EXAMPLES: BOUNDARY RENDERING

### Pattern 1: Global Boundary Overlay (Simple)
```typescript
// Add after grid rendering, before elements
// staticScene.ts:247-258

if (appState.restrictedArea) {
  context.save();

  context.strokeStyle = '#ff0000';
  context.lineWidth = 2 / appState.zoom.value;
  context.setLineDash([5, 5]);

  const { x, y, width, height } = appState.restrictedArea;
  context.strokeRect(
    x + appState.scrollX,
    y + appState.scrollY,
    width,
    height
  );

  // Semi-transparent background
  context.fillStyle = 'rgba(255, 0, 0, 0.05)';
  context.fillRect(
    x + appState.scrollX,
    y + appState.scrollY,
    width,
    height
  );

  context.restore();
}
```

### Pattern 2: Soft Enforcement with Clipping (Recommended)
```typescript
// staticScene.ts:300-317 (in element rendering loop)

const boundary = appState.restrictedArea;
if (boundary && element.id not in boundary.allowedElements) {
  context.save();

  // Clip to boundary
  context.beginPath();
  context.rect(
    boundary.x + appState.scrollX,
    boundary.y + appState.scrollY,
    boundary.width,
    boundary.height
  );
  context.clip();

  // Render element (clipped)
  renderElement(...);
  context.restore();
} else {
  renderElement(...);
}
```

### Pattern 3: Boundary as Interactive Element
```typescript
// InteractiveCanvas: render draggable boundary handles

const renderBoundaryHandles = (
  context: CanvasRenderingContext2D,
  boundary: BoundaryArea,
  appState: InteractiveCanvasAppState
) => {
  const handleSize = 8;
  const corners = [
    [boundary.x, boundary.y],                    // TL
    [boundary.x + boundary.width, boundary.y],   // TR
    [boundary.x, boundary.y + boundary.height],  // BL
    [boundary.x + boundary.width, boundary.y + boundary.height] // BR
  ];

  context.save();
  context.fillStyle = '#0066cc';

  corners.forEach(([x, y]) => {
    fillCircle(context,
      x + appState.scrollX,
      y + appState.scrollY,
      handleSize / appState.zoom.value,
      false, true
    );
  });

  context.restore();
};
```

---

## 6. INJECTION POINTS SUMMARY

| Location | File | Use Case | Priority |
|----------|------|----------|----------|
| **After Grid** | `staticScene.ts:258` | Boundary border + bg overlay | HIGH |
| **Element Loop (Before)** | `staticScene.ts:300-326` | Soft clipping enforcement | HIGH |
| **Interactive Loop** | `interactiveScene.ts:630-702` | Boundary handles/cursors | MEDIUM |
| **Animation State** | `animation.ts:44-74` | Animated boundary transitions | LOW |

---

## 7. PERFORMANCE BEST PRACTICES

### ✅ DO:
- **Cache boundary path**: Pre-compute clip path, reuse per-frame
  ```typescript
  const boundaryPath = new Path2D();
  boundaryPath.rect(x, y, w, h);
  context.clip(boundaryPath);
  ```

- **Use `context.save()`/`context.restore()`** around clipping to isolate state

- **Filter visible elements first**: Only render elements intersecting boundary
  ```typescript
  const visibleInBoundary = visibleElements.filter(el =>
    intersectsRect(el, boundary, elementsMap)
  );
  ```

- **Leverage zoom-aware scaling**: Use `appState.zoom.value` for line widths
  ```typescript
  context.lineWidth = 2 / appState.zoom.value;  // 2px at zoom=1
  ```

### ❌ DON'T:
- Draw boundary on InteractiveCanvas every frame (60fps = high overhead)
- Use global `context.clip()` without `save()`/`restore()`
- Render full element set then filter (defeats viewport optimization)
- Apply clipping per-pixel instead of per-shape (use `Path2D`)

---

## 8. UNRESOLVED QUESTIONS

1. **Boundary style preferences**: Should boundary be configurable (color, dash, opacity)?
2. **Nested boundaries**: Support multiple or nested restricted areas?
3. **Interactive editing**: Should users drag/resize boundary in UI?
4. **Persistence**: Store boundary in element JSON or app state only?
5. **Export behavior**: Include/exclude boundary in PNG/SVG exports?

---

## References

- Frame Clipping: `packages/excalidraw/renderer/staticScene.ts:116-140`
- Grid Rendering: `packages/excalidraw/renderer/staticScene.ts:45-114`
- Render Loop: `packages/excalidraw/renderer/staticScene.ts:464-484`
- Animation Controller: `packages/excalidraw/renderer/animation.ts`
- Type Definitions: `packages/excalidraw/scene/types.ts`
