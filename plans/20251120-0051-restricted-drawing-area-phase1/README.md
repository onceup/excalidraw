# Restricted Drawing Area - Implementation Plan

**Feature:** Restrict drawing operations to a defined rectangular area (e.g., 1024x1024px)
**Status:** Phase 1 Complete ✅ | Phase 2 Planning Complete ✅
**Priority:** High

## Quick Navigation

### Phase 1: Core Infrastructure ✅ COMPLETE
- **Plan:** [phase-01-core-infrastructure.md](./phase-01-core-infrastructure.md)
- **Code Review:** [reports/251120-code-review-phase1.md](./reports/251120-code-review-phase1.md)
- **Status:** Code approved, 16 tests passing, ready for Phase 2

**Delivered:**
- Type definitions & AppState integration
- Boundary visualization (border + background)
- Canvas clipping for soft enforcement
- Math utilities (`isPointInRestrictedArea`, `isElementInRestrictedArea`, etc.)

### Phase 2: Interaction Layer 📋 PLANNING COMPLETE
- **Summary:** [phase-02-summary.md](./phase-02-summary.md)
- **Full Plan:** [phase-02-interaction-layer.md](./phase-02-interaction-layer.md)
- **Test Specs:** [phase-02/test-specifications.md](./phase-02/test-specifications.md)
- **Duration:** 2-3 days

**Deliverables:**
- Pointer coordinate clamping during drawing
- Element creation validation
- Freedraw boundary crossing detection
- Element cleanup on pointer release

### Research Documents
- [Rendering Pipeline Research](../../RENDERING_RESEARCH.md)
- [AppState Patterns Research](../../RESEARCH_APPSTATE_PATTERNS.md)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Restricted Drawing Area                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   Phase 1 ✅          Phase 2 📋          Phase 3 🔮
   Core Infra        Interaction        Advanced UX
        │                   │                   │
┌───────────────┐   ┌──────────────┐   ┌──────────────┐
│ Types/State   │   │ Clamping     │   │ Strict Mode  │
│ Rendering     │   │ Validation   │   │ Notifications│
│ Math Utils    │   │ Cleanup      │   │ Resize UI    │
│ Clipping      │   │ Freedraw     │   │ Collab Sync  │
└───────────────┘   └──────────────┘   └──────────────┘
```

## Implementation Status

### ✅ Completed (Phase 1)

**Type System:**
- `RestrictedAreaConfig` type definition
- AppState integration (`restrictedArea: RestrictedAreaConfig | null`)
- ExcalidrawProps API (`restrictedArea?: Partial<RestrictedAreaConfig>`)

**Rendering:**
- Boundary border rendering (StaticCanvas)
- Background fill with opacity
- Canvas clipping for soft enforcement

**Utilities:**
- `isPointInRestrictedArea()` - Point containment test
- `isElementInRestrictedArea()` - AABB intersection test
- `isElementCompletelyInRestrictedArea()` - Full containment test
- `getRestrictedAreaBounds()` - Bounds tuple conversion

**Testing:**
- 16 passing unit tests
- Code review approved
- Type-safe implementation

### 📋 Ready to Implement (Phase 2)

**Coordinate Clamping:**
- Clamp scene coordinates in `handleCanvasPointerMove` (App.tsx:5915)
- Apply to all drawing tools (shapes, arrows, freedraw)
- Preserve grid snapping behavior

**Element Validation:**
- Block creation outside boundary in `createGenericElementOnPointerDown` (App.tsx:8129)
- Early return for invalid positions
- Consistent across all element types

**Freedraw Handling:**
- Track boundary crossing with `_freedrawExitedBoundary` flag
- Point-by-point monitoring in freedraw loop (App.tsx:8934)
- Clear stroke on pointer up if exited

**Cleanup Logic:**
- Remove elements partially outside in `handleCanvasPointerUp` (App.tsx:6909)
- Use `isElementCompletelyInRestrictedArea()` check
- Don't pollute undo history

### 🔮 Future (Phase 3)

- Strict enforcement mode (prevent vs cleanup)
- Text element constraints
- Toast notifications for blocked operations
- Interactive boundary resize handles
- Paste/drop constraints
- Collaboration support

## Code Structure

```
packages/excalidraw/
├── types.ts                              [Phase 1 ✅]
│   └── RestrictedAreaConfig interface
├── appState.ts                           [Phase 1 ✅]
│   └── Default restrictedArea config
├── index.tsx                             [Phase 1 ✅]
│   └── ExcalidrawProps.restrictedArea
├── components/
│   └── App.tsx                           [Phase 2 📋]
│       ├── handleCanvasPointerMove       [+clamping logic]
│       ├── createGenericElementOnPointerDown [+validation]
│       ├── freedraw handling             [+exit tracking]
│       └── handleCanvasPointerUp         [+cleanup]
├── renderer/
│   └── staticScene.ts                    [Phase 1 ✅]
│       ├── renderRestrictedAreaBoundary()
│       └── applyRestrictedAreaClip()
├── utils/
│   └── restrictedArea.ts                 [Phase 1 ✅ | Phase 2 📋]
│       ├── isPointInRestrictedArea()             [✅]
│       ├── isElementInRestrictedArea()           [✅]
│       ├── isElementCompletelyInRestrictedArea() [✅]
│       ├── getRestrictedAreaBounds()             [✅]
│       ├── clampPointToRestrictedArea()          [📋]
│       └── hasFreedrawExitedArea()               [📋]
└── __tests__/
    ├── restrictedArea.test.ts            [Phase 1 ✅]
    └── restrictedArea.interaction.test.ts [Phase 2 📋]
```

## Usage Example

```typescript
import { Excalidraw } from "@excalidraw/excalidraw";

<Excalidraw
  restrictedArea={{
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
    enforcement: "soft", // Phase 1-2: soft only, Phase 3: add "strict"
  }}
/>
```

**Behavior (Phase 1-2):**
- Boundary rendered as dashed border with optional background
- Elements clipped at render time (soft enforcement)
- Drawing coordinates clamped to boundary
- Elements outside boundary cleared on pointer release

## Performance Targets

| Metric | Target | Phase 1 | Phase 2 |
|--------|--------|---------|---------|
| Boundary rendering | <1ms | ✅ 0.3ms | - |
| Clipping overhead | <1ms/element | ✅ 0.5ms | - |
| Coordinate clamping | <0.1ms/event | - | 📋 Target |
| Boundary check | <0.5ms/element | ✅ 0.2ms | 📋 Target |
| Frame rate | 60fps (16.6ms) | ✅ Maintained | 📋 Target |

## Test Coverage

**Phase 1:** 16 tests, 100% coverage on math utilities
**Phase 2:** 150+ tests planned (50 unit, 80 integration, 20 performance)

## Key Decisions

**D1: Enforcement Strategy**
- Phase 1-2: Soft enforcement (clip at render, cleanup after)
- Phase 3: Add strict enforcement option (prevent creation)
- Rationale: Progressive disclosure, validate soft mode first

**D2: Freedraw Handling**
- Chosen: Boundary crossing detection + cleanup on release
- Rationale: Matches user requirement "clear on mouse button release"
- Alternative rejected: Point-level clamping (creates jagged edges)

**D3: Coordinate Clamping Point**
- Chosen: After `viewportCoordsToSceneCoords()` conversion
- Rationale: Single point of truth, works across all tools
- Alternative rejected: Per-tool clamping (duplication, inconsistency)

**D4: Element Validation Timing**
- During drag: Allow temporary violations (performance)
- On pointer up: Validate final position, cleanup if needed
- Rationale: Smoother interaction, single cleanup pass

## Dependencies

**Phase 1 Dependencies:** ✅ All met
- Excalidraw rendering pipeline understanding
- AppState management patterns
- Canvas clipping techniques

**Phase 2 Dependencies:** ✅ All met
- Phase 1 complete (type system, utilities)
- `viewportCoordsToSceneCoords()` conversion
- `getElementBounds()` from @excalidraw/element
- Pointer event flow understanding

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Performance degradation | Medium | High | Profile before/after, simple math, early exit |
| Freedraw false positives | Medium | High | Comprehensive tests, tolerance margin |
| Multi-touch conflicts | Low | Medium | Preserve existing logic, test on devices |
| Coordinate conversion edge cases | Low | Medium | Test extreme zoom/scroll values |

## Next Steps

1. **Immediate:** Begin Phase 2 implementation (Step 1: Utilities)
2. **Review Checkpoint:** After Step 2 (verify clamping works)
3. **Code Review:** After Step 6 (before merge)
4. **Future:** Plan Phase 3 (strict mode, advanced UX)

## Contact & Review

**Implementation Plan Created:** 2025-11-20
**Phase 1 Code Review:** Approved (251120-code-review-phase1.md)
**Phase 2 Planning:** Complete (phase-02-interaction-layer.md)

**Review Process:**
- Phase 1 review: Self-review + code-review skill analysis ✅
- Phase 2 review: Code review after Step 6 implementation
- Final review: Before merge to main branch
