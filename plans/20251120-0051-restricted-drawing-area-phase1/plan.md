# Restricted Drawing Area - Implementation Plan

**Created:** 2025-11-20 00:51
**Status:** In Progress
**Priority:** High
**Estimated Duration:** 2-3 days

## Overview

Implement restricted drawing area feature for Excalidraw that constrains user drawing to a configurable boundary (e.g., 1024x1024px). Phase 1 focuses on core infrastructure with soft enforcement (allow drawing, clip rendering).

## User Requirements

- **Enforcement Mode:** Soft (allow draw outside, clip at render time)
- **Configuration:** Production-ready props API
- **Visual Feedback:** Full rendering (border + background)
- **Default Area:** 1024x1024px (configurable)

## Technical Approach

- **AppState Pattern:** Follow `frameRendering` structure (`{ enabled, clip, ... }`)
- **Rendering:** Multi-canvas architecture (static for boundary, clipping per-element)
- **Clipping:** Reuse `frameClip()` pattern from existing frame rendering
- **Math:** Leverage `@excalidraw/math` utilities (AABB, bounds checking)

## Phases

### Phase 1: Core Infrastructure ✓ IN PROGRESS
**File:** [phase-01-core-infrastructure.md](./phase-01-core-infrastructure.md)
**Status:** In Progress
**Duration:** 2-3 days

Deliverables:
- [x] Research & planning complete
- [ ] AppState types & props API
- [ ] Basic boundary rendering (border + background)
- [ ] Canvas clipping for soft enforcement
- [ ] AABB boundary checking utilities
- [ ] Unit tests for geometry helpers
- [ ] Integration tests for rendering
- [ ] Type checking passes

**Next:** Phase 2 - Interaction Layer (pointer clamping, element constraints)

## Research Reports

- [AppState Patterns](./research/RESEARCH_APPSTATE_PATTERNS.md) - State management, props API patterns
- [Rendering Research](./research/RENDERING_RESEARCH.md) - Multi-canvas architecture, clipping
- Math Utilities - Geometry utilities catalog (inline in phase doc)

## Success Criteria

Phase 1 complete when:
1. ✅ Configurable restricted area via props
2. ✅ Visual boundary renders on canvas (border + optional background)
3. ✅ Elements outside boundary are clipped during render (soft enforcement)
4. ✅ All tests pass (unit + integration)
5. ✅ Type checking passes
6. ✅ Code review approved

## Architecture Decisions

1. **Soft enforcement only** - YAGNI principle, implement strict mode in Phase 2 if needed
2. **Reuse frameClip pattern** - DRY principle, proven production code
3. **Static canvas for boundary** - KISS principle, persistent UI on static layer
4. **Per-element clipping** - Follows existing architecture, no global clip region

## Files Modified

- `packages/excalidraw/types.ts` - Add `RestrictedAreaConfig` type
- `packages/excalidraw/index.tsx` - Add props API
- `packages/excalidraw/appState.ts` - Initialize defaults
- `packages/excalidraw/components/App.tsx` - Props merge logic
- `packages/excalidraw/renderer/staticScene.ts` - Boundary rendering + clipping
- `packages/excalidraw/utils/restrictedArea.ts` - NEW: Boundary utilities

## Risk Assessment

**Low Risk:**
- Reusing proven patterns (frameClip, AppState structure)
- Non-breaking change (opt-in feature)
- Well-researched architecture

**Mitigations:**
- Extensive testing (unit + integration)
- Code review before merge
- Type safety throughout

---

**Ready to proceed with implementation.**
