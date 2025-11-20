# Excalidraw AppState Management Patterns - Phase 1 Research

## 1. AppState Structure Patterns

### Default State Initialization
**File**: `packages/excalidraw/appState.ts:22-131`

```typescript
export const getDefaultAppState = (): Omit<
  AppState,
  "offsetTop" | "offsetLeft" | "width" | "height"
> => {
  return {
    // ~100+ properties with sensible defaults
    frameRendering: { enabled: true, clip: true, name: true, outline: true },
    // ... others
  };
};
```

**Key Pattern**:
- Defaults omit layout-dependent properties (offsets, dimensions)
- Nested configs as objects (e.g., `frameRendering`)
- Return type excludes unmeasurable props

### Complex Nested Configuration
**Example - Frame Rendering** (line 298-303 in types.ts):
```typescript
frameRendering: {
  enabled: boolean;
  name: boolean;
  outline: boolean;
  clip: boolean;  // Soft enforcement pattern already exists!
};
```

**Pattern**: Nested boolean flags for feature toggles. PERFECT TEMPLATE for restricted area.

### State Persistence Config
**File**: `appState.ts:137-233`

```typescript
const APP_STATE_STORAGE_CONF = {
  frameRendering: { browser: false, export: false, server: false },
  // ... per-property persistence rules
};
```

**Pattern**: Three-tier persistence (browser/export/server) defined per property. Useful for deciding if `restrictedArea` config persists.

## 2. Props API Patterns

### Props Flow to AppState
**File**: `packages/excalidraw/index.tsx` (ExcalidrawProps interface, line 538-632)

Current props that map to AppState:
```typescript
export interface ExcalidrawProps {
  viewModeEnabled?: boolean;  // → appState.viewModeEnabled
  zenModeEnabled?: boolean;   // → appState.zenModeEnabled
  gridModeEnabled?: boolean;  // → appState.gridModeEnabled
  theme?: Theme;              // → appState.theme
  name?: string;              // → appState.name
  // ... UIOptions for canvas actions, tools
}
```

**Pattern**: Optional props that override defaults. Props merged during App initialization.

### Props Merging During Init
**File**: `components/App.tsx:2345, 2392-2411`

```typescript
// Props override during initialization
scene.appState = {
  ...scene.appState,
  theme: this.props.theme || scene.appState.theme,  // props win
  openSidebar: scene.appState?.openSidebar || this.state.openSidebar,
  // ... selective override, not full replace
};
```

**Pattern**: Props act as override layer. Spread operator merges with restored state selectively. No prop validation shown—defaults are trusted.

### UIOptions Pattern
**File**: `index.tsx:65-74`

```typescript
const UIOptions: AppProps["UIOptions"] = {
  ...props.UIOptions,
  canvasActions: {
    ...DEFAULT_UI_OPTIONS.canvasActions,
    ...canvasActions,  // deep merge
  },
};
```

**Pattern**: UIOptions uses deep merge for nested config. Memoization via `areEqual` (line 160-215).

## 3. State Updates

### Immutable Update Pattern
**File**: `components/App.tsx:3665-3676`

```typescript
this.setState((prevState) => {
  const next = typeof opts === "function" ? opts(prevState.frameRendering) : opts;
  return {
    frameRendering: {
      enabled: next?.enabled ?? prevState.frameRendering.enabled,
      clip: next?.clip ?? prevState.frameRendering.clip,  // selective update
      name: next?.name ?? prevState.frameRendering.name,
      outline: next?.outline ?? prevState.frameRendering.outline,
    },
  };
});
```

**Pattern**: Function-based setState with optional config. Nullish coalesce preserves existing values.

### State Merging on Scene Load
**File**: `data/restore.ts:727-806`

```typescript
export const restoreAppState = (
  appState: ImportedDataState["appState"],
  localAppState: Partial<AppState> | null | undefined,
): RestoredAppState => {
  // 1. Apply legacy migrations
  // 2. Coalesce: appState > localAppState > defaultAppState
  for (const [key, defaultValue] of Object.entries(defaultAppState)) {
    const suppliedValue = appState[key];
    const localValue = localAppState ? localAppState[key] : undefined;
    (nextAppState as any)[key] =
      suppliedValue !== undefined
        ? suppliedValue
        : localValue !== undefined
        ? localValue
        : defaultValue;
  }
  return nextAppState;
};
```

**Pattern**: Three-tier coalescing (supplied > local > default). Preserves backward compat via migrations. No validation—type safety via TS.

### Re-render Triggers
**File**: `types.ts:196-211` (StaticCanvasAppState)

Changes to these props trigger canvas re-renders:
```typescript
type StaticCanvasAppState = Readonly<_CommonCanvasAppState & {
  shouldCacheIgnoreZoom: AppState["shouldCacheIgnoreZoom"];
  viewBackgroundColor: AppState["viewBackgroundColor"] | null;
  gridSize: AppState["gridSize"];
  // ... exported to renderer
}>;
```

**Pattern**: Readonly types expose only necessary properties to avoid accidental mutations. Renderer observes subset.

## 4. Best Practices Identified

| Pattern | Implementation | For Restricted Area |
|---------|----------------|-------------------|
| **Nested Config** | `{ enabled, clip, name, outline }` | ✓ Use for `{ enabled, width, height, backgroundColor, borderColor, borderWidth }` |
| **Props API** | Optional boolean/number props in ExcalidrawProps | ✓ Add `restrictedDrawingArea?: { width?: number; height?: number; ... }` |
| **Type Safety** | Omit layout-dependent props from defaults; Readonly in exports | ✓ Use branded types for dimensions; export to renderer as Readonly |
| **State Merging** | Three-tier coalesce; spread operators for immutability | ✓ `restrictedArea > restoreData > null` chain |
| **Persistence** | Per-property browser/export/server config | ? Likely `{ browser: true, export: true, server: false }` (user pref, not collaborative) |
| **Updates** | Function-based setState with nullish coalesce | ✓ Implement `updateRestrictedArea(opts)` API |
| **Re-renders** | Readonly slices extracted to StaticCanvasAppState | ✓ Export to StaticCanvasAppState for rendering boundary+bg |

## 5. Recommendations

### Phase 1 Implementation Strategy

1. **Add to AppState interface** (`types.ts`):
   ```typescript
   restrictedArea: {
     enabled: boolean;
     width: number;      // 1024 default
     height: number;     // 1024 default
     backgroundColor: string;
     borderColor: string;
     borderWidth: number;
   } | null;
   ```

2. **Add to ExcalidrawProps** (`types.ts`):
   ```typescript
   restrictedDrawingArea?: {
     width?: number;
     height?: number;
     backgroundColor?: string;
     borderColor?: string;
     borderWidth?: number;
   };
   ```

3. **Initialize in appState.ts**:
   ```typescript
   restrictedArea: null,  // or enable via props only
   ```

4. **Props merge in App.tsx**:
   ```typescript
   restrictedArea: this.props.restrictedDrawingArea
     ? { enabled: true, ...this.props.restrictedDrawingArea, ... }
     : null,
   ```

5. **Restore in restore.ts**: Already covered by generic coalescing

6. **Export to renderer**:
   ```typescript
   type StaticCanvasAppState = Readonly<_CommonCanvasAppState & {
     restrictedArea: AppState["restrictedArea"];
   }>;
   ```

### Unresolved Questions
- Should restricted area be persistent (localStorage)? Current frame rendering is not.
- Should restricted area enable clipping at DOM level or canvas level (soft enforcement)?
- Should boundary rendering use frame drawing code or custom implementation?

**Files Modified**: `types.ts`, `appState.ts`, `index.tsx`, `App.tsx`, `restore.ts`, renderer files (Phase 2)

