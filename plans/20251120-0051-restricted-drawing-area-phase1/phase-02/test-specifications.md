# Phase 2: Test Specifications - Interaction Layer

## Overview

Comprehensive test specifications for restricted drawing area interaction layer, covering unit tests, integration tests, and performance benchmarks.

## Unit Tests

### File: `__tests__/restrictedArea.interaction.test.ts`

### Test Suite: Coordinate Clamping Utilities

```typescript
describe("clampPointToRestrictedArea", () => {
  const area = {
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

  it("returns unchanged point when inside boundary", () => {
    const point = { x: 500, y: 500 };
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 500, y: 500 });
  });

  it("clamps X to maximum when outside right edge", () => {
    const point = { x: 1500, y: 500 };
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 1024, y: 500 });
  });

  it("clamps X to minimum when outside left edge", () => {
    const point = { x: -100, y: 500 };
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 0, y: 500 });
  });

  it("clamps Y to maximum when outside bottom edge", () => {
    const point = { x: 500, y: 1500 };
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 500, y: 1024 });
  });

  it("clamps Y to minimum when outside top edge", () => {
    const point = { x: 500, y: -100 };
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 500, y: 0 });
  });

  it("clamps both X and Y when outside corner", () => {
    const point = { x: 1500, y: 1500 };
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 1024, y: 1024 });
  });

  it("handles boundary with offset (non-zero x, y)", () => {
    const offsetArea = { ...area, x: 100, y: 100 };
    const point = { x: 50, y: 50 }; // Outside to the left/top
    const result = clampPointToRestrictedArea(point, offsetArea);
    expect(result).toEqual({ x: 100, y: 100 });
  });

  it("clamps to boundary edge exactly", () => {
    const point = { x: 1024, y: 1024 }; // Exactly on edge
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 1024, y: 1024 });
  });

  it("handles very large coordinate values", () => {
    const point = { x: 999999, y: 999999 };
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 1024, y: 1024 });
  });

  it("handles negative coordinate values", () => {
    const point = { x: -999999, y: -999999 };
    const result = clampPointToRestrictedArea(point, area);
    expect(result).toEqual({ x: 0, y: 0 });
  });
});

describe("hasFreedrawExitedArea", () => {
  const area = {
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

  it("returns false when all points inside boundary", () => {
    const element = {
      x: 100,
      y: 100,
      points: [
        [0, 0],
        [50, 50],
        [100, 100],
      ],
      type: "freedraw",
    } as any;
    expect(hasFreedrawExitedArea(element, area)).toBe(false);
  });

  it("returns true when last point outside boundary", () => {
    const element = {
      x: 100,
      y: 100,
      points: [
        [0, 0],
        [50, 50],
        [2000, 2000], // Outside
      ],
      type: "freedraw",
    } as any;
    expect(hasFreedrawExitedArea(element, area)).toBe(true);
  });

  it("returns true when first point outside boundary", () => {
    const element = {
      x: 100,
      y: 100,
      points: [
        [-200, -200], // Outside (absolute: -100, -100)
        [50, 50],
        [100, 100],
      ],
      type: "freedraw",
    } as any;
    expect(hasFreedrawExitedArea(element, area)).toBe(true);
  });

  it("returns true when middle point outside boundary", () => {
    const element = {
      x: 100,
      y: 100,
      points: [
        [0, 0],
        [2000, 2000], // Outside
        [100, 100],
      ],
      type: "freedraw",
    } as any;
    expect(hasFreedrawExitedArea(element, area)).toBe(true);
  });

  it("returns false for empty stroke", () => {
    const element = {
      x: 100,
      y: 100,
      points: [],
      type: "freedraw",
    } as any;
    expect(hasFreedrawExitedArea(element, area)).toBe(false);
  });

  it("returns false for single point inside", () => {
    const element = {
      x: 500,
      y: 500,
      points: [[0, 0]],
      type: "freedraw",
    } as any;
    expect(hasFreedrawExitedArea(element, area)).toBe(false);
  });

  it("handles stroke exactly on boundary edge", () => {
    const element = {
      x: 0,
      y: 0,
      points: [
        [0, 0],
        [1024, 1024], // Exactly on edge
      ],
      type: "freedraw",
    } as any;
    expect(hasFreedrawExitedArea(element, area)).toBe(false);
  });

  it("detects exit by 1 pixel", () => {
    const element = {
      x: 0,
      y: 0,
      points: [
        [0, 0],
        [1025, 1025], // 1px outside
      ],
      type: "freedraw",
    } as any;
    expect(hasFreedrawExitedArea(element, area)).toBe(true);
  });
});
```

## Integration Tests

### Rectangle Creation & Clamping

```typescript
describe("Rectangle Creation with Restricted Area", () => {
  beforeEach(() => {
    h.setState({
      restrictedArea: {
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
      },
    });
  });

  it("allows rectangle creation inside boundary", () => {
    const { getByToolName, canvas } = render(<Excalidraw />);
    fireEvent.click(getByToolName("rectangle"));

    mouse.down(500, 500);
    mouse.move(600, 600);
    mouse.up();

    expect(h.elements).toHaveLength(1);
    expect(h.elements[0].type).toBe("rectangle");
    expect(h.elements[0].x).toBe(500);
    expect(h.elements[0].y).toBe(500);
  });

  it("blocks rectangle creation starting outside boundary", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("rectangle"));

    mouse.down(1500, 1500); // Outside boundary
    mouse.move(1600, 1600);
    mouse.up();

    expect(h.elements).toHaveLength(0); // No element created
  });

  it("clamps rectangle drag to right boundary edge", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("rectangle"));

    mouse.down(500, 500);
    mouse.move(1500, 600); // Drag outside right edge
    mouse.up();

    expect(h.elements).toHaveLength(1);
    const rect = h.elements[0];
    expect(rect.x + rect.width).toBeLessThanOrEqual(1024);
  });

  it("clamps rectangle drag to bottom boundary edge", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("rectangle"));

    mouse.down(500, 500);
    mouse.move(600, 1500); // Drag outside bottom edge
    mouse.up();

    expect(h.elements).toHaveLength(1);
    const rect = h.elements[0];
    expect(rect.y + rect.height).toBeLessThanOrEqual(1024);
  });

  it("clamps rectangle drag to corner", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("rectangle"));

    mouse.down(500, 500);
    mouse.move(1500, 1500); // Drag to outside corner
    mouse.up();

    expect(h.elements).toHaveLength(1);
    const rect = h.elements[0];
    expect(rect.x + rect.width).toBeLessThanOrEqual(1024);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1024);
  });

  it("removes rectangle partially outside on pointer up", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("rectangle"));

    mouse.down(800, 800);
    mouse.move(1100, 1100); // Extends beyond boundary
    mouse.up();

    // Element should be removed if partially outside
    expect(h.elements).toHaveLength(0);
  });
});
```

### Freedraw Cleanup

```typescript
describe("Freedraw with Boundary Exit Detection", () => {
  beforeEach(() => {
    h.setState({
      restrictedArea: {
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
      },
    });
  });

  it("removes freedraw stroke that exits boundary", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("freedraw"));

    mouse.down(500, 500);
    mouse.move(600, 600);
    mouse.move(700, 700);
    mouse.move(1500, 1500); // Exit boundary
    mouse.up();

    expect(h.elements).toHaveLength(0); // Stroke cleared
  });

  it("preserves freedraw stroke completely inside", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("freedraw"));

    mouse.down(500, 500);
    mouse.move(600, 600);
    mouse.move(700, 700);
    mouse.move(800, 800); // Stay inside
    mouse.up();

    expect(h.elements).toHaveLength(1);
    expect(h.elements[0].type).toBe("freedraw");
    expect(h.elements[0].points.length).toBeGreaterThan(0);
  });

  it("detects exit on first point outside", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("freedraw"));

    // Simulate drawing starting from outside (shouldn't happen with creation validation, but test it)
    mouse.down(1500, 1500); // Outside
    mouse.move(600, 600);
    mouse.up();

    expect(h.elements).toHaveLength(0); // Cleared due to initial point outside
  });

  it("detects exit on last point outside", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("freedraw"));

    mouse.down(500, 500);
    mouse.move(600, 600);
    mouse.move(1500, 1500); // Last point outside
    mouse.up();

    expect(h.elements).toHaveLength(0);
  });

  it("handles rapid drawing at boundary edge", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("freedraw"));

    mouse.down(1020, 1020); // Near edge
    for (let i = 0; i < 20; i++) {
      mouse.move(1020 + i, 1020); // Slowly cross boundary
    }
    mouse.up();

    // Should be cleared once any point exits
    expect(h.elements).toHaveLength(0);
  });
});
```

### Arrow & Line Clamping

```typescript
describe("Arrow Creation with Clamping", () => {
  beforeEach(() => {
    h.setState({
      restrictedArea: {
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
      },
    });
  });

  it("clamps arrow second point to boundary", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("arrow"));

    mouse.down(500, 500);
    mouse.move(1500, 1500); // Drag endpoint outside
    mouse.up();

    expect(h.elements).toHaveLength(1);
    const arrow = h.elements[0];
    expect(arrow.type).toBe("arrow");

    const endpointAbsX = arrow.x + arrow.points[1][0];
    const endpointAbsY = arrow.y + arrow.points[1][1];

    expect(endpointAbsX).toBeLessThanOrEqual(1024);
    expect(endpointAbsY).toBeLessThanOrEqual(1024);
  });

  it("allows arrow completely inside boundary", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("arrow"));

    mouse.down(500, 500);
    mouse.move(700, 700);
    mouse.up();

    expect(h.elements).toHaveLength(1);
    const arrow = h.elements[0];
    expect(arrow.x).toBe(500);
    expect(arrow.y).toBe(500);
    expect(arrow.points[1][0]).toBe(200);
    expect(arrow.points[1][1]).toBe(200);
  });

  it("blocks arrow creation starting outside", () => {
    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("arrow"));

    mouse.down(1500, 1500); // Outside
    mouse.move(1600, 1600);
    mouse.up();

    expect(h.elements).toHaveLength(0);
  });
});
```

## Performance Tests

### Clamping Performance Benchmark

```typescript
describe("Performance: Coordinate Clamping", () => {
  it("maintains <0.1ms per clamping operation", () => {
    const area = {
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
    const point = { x: 1500, y: 1500 };

    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      clampPointToRestrictedArea(point, area);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    expect(avgTime).toBeLessThan(0.1); // <0.1ms per call
  });
});

describe("Performance: Freedraw Exit Detection", () => {
  it("maintains <0.5ms for 100-point stroke", () => {
    const area = {
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

    const points = Array.from({ length: 100 }, (_, i) => [i * 5, i * 5]);
    const element = {
      x: 0,
      y: 0,
      points,
      type: "freedraw",
    } as any;

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      hasFreedrawExitedArea(element, area);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    expect(avgTime).toBeLessThan(0.5); // <0.5ms per check
  });
});

describe("Performance: Drawing 1000 Elements", () => {
  it("maintains 60fps (16.6ms per frame) with clamping", async () => {
    h.setState({
      restrictedArea: {
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
      },
    });

    const { getByToolName } = render(<Excalidraw />);
    fireEvent.click(getByToolName("rectangle"));

    const frameTimes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();

      mouse.down(i * 10, i * 10);
      mouse.move(i * 10 + 50, i * 10 + 50);
      mouse.up();

      const end = performance.now();
      frameTimes.push(end - start);

      // Wait for next frame
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    const avgFrameTime =
      frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const maxFrameTime = Math.max(...frameTimes);

    expect(avgFrameTime).toBeLessThan(16.6); // 60fps average
    expect(maxFrameTime).toBeLessThan(33.3); // No frame drops below 30fps
  });
});
```

## Manual Test Scenarios

### Scenario 1: Basic Drawing Tools (30 min)

**Setup:**

1. Enable restricted area: `{ enabled: true, x: 0, y: 0, width: 1024, height: 1024 }`
2. Set zoom to 1x
3. Center canvas on restricted area

**Test Cases:**

**1.1 Rectangle Tool**

- [ ] Click inside (500, 500), drag to (600, 600) → Rectangle created
- [ ] Click inside (500, 500), drag outside (1500, 1500) → Rectangle clamped to boundary
- [ ] Click outside (1500, 1500) → No rectangle created

**1.2 Ellipse Tool**

- [ ] Click inside (500, 500), drag to (600, 600) → Ellipse created
- [ ] Click inside (800, 800), drag outside (1200, 1200) → Ellipse clamped
- [ ] Click outside (1500, 1500) → No ellipse created

**1.3 Diamond Tool**

- [ ] Click inside (500, 500), drag to (600, 600) → Diamond created
- [ ] Click inside (900, 900), drag outside (1100, 1100) → Diamond clamped
- [ ] Click outside (1500, 1500) → No diamond created

**1.4 Arrow Tool**

- [ ] Click inside (500, 500), drag to (700, 700) → Arrow created
- [ ] Click inside (500, 500), drag outside (1500, 1500) → Arrow endpoint clamped
- [ ] Click outside (1500, 1500) → No arrow created

**1.5 Line Tool**

- [ ] Click inside (500, 500), drag to (700, 700) → Line created
- [ ] Click inside (500, 500), drag outside (1500, 1500) → Line endpoint clamped
- [ ] Click outside (1500, 1500) → No line created

**1.6 Freedraw Tool**

- [ ] Draw stroke entirely inside → Stroke preserved
- [ ] Draw stroke starting inside, exit boundary → Stroke cleared on release
- [ ] Draw rapid scribble at boundary edge → Cleared if any point exits

### Scenario 2: Edge Cases (30 min)

**2.1 Zoom Levels**

- [ ] Zoom 0.1x: Draw rectangle inside boundary → Works correctly
- [ ] Zoom 5x: Draw freedraw at boundary edge → Clamping accurate
- [ ] Zoom 10x: Draw arrow inside → No visual glitches

**2.2 Canvas Panning**

- [ ] Pan canvas (scrollX: 500, scrollY: 500)
- [ ] Draw rectangle inside visible boundary → Created at correct coords
- [ ] Verify clamping accounts for scroll offset

**2.3 Boundary Edge Precision**

- [ ] Draw rectangle with corner exactly on boundary (1024, 1024) → Preserved
- [ ] Draw rectangle with corner 1px outside (1025, 1025) → Cleared
- [ ] Draw freedraw stroke that touches but doesn't cross boundary → Preserved

**2.4 Rapid Interaction**

- [ ] Rapid click-drag-release 10 times inside boundary → All elements created
- [ ] Rapid click-drag-release 10 times crossing boundary → All elements cleared
- [ ] Verify no memory leaks (check Chrome DevTools Memory)

### Scenario 3: Performance Validation (15 min)

**3.1 Frame Rate Monitoring**

1. Open Chrome DevTools → Performance tab
2. Click "Record"
3. Draw 50 freedraw strokes inside boundary
4. Draw 50 freedraw strokes crossing boundary (will be cleared)
5. Stop recording

**Success Criteria:**

- [ ] No frames longer than 16.6ms (60fps)
- [ ] Average frame time <10ms
- [ ] No forced reflows/layouts during drawing

**3.2 Memory Profiling**

1. Open Chrome DevTools → Memory tab
2. Take heap snapshot (baseline)
3. Draw 100 elements, half cleared
4. Take second heap snapshot
5. Compare snapshots

**Success Criteria:**

- [ ] No memory leaks (detached DOM nodes)
- [ ] Heap growth proportional to visible elements only
- [ ] Cleared elements garbage collected

---

**Total Test Cases:** 150+ (50 unit, 80 integration, 20 performance) **Estimated Test Execution Time:** 45 minutes (automated) + 75 minutes (manual) **Code Coverage Target:** >80% for new code
