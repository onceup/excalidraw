# Excalidraw System Architecture

## Architecture Overview

Excalidraw follows a **layered monorepo architecture** with clear separation of concerns, immutable data patterns, and a React-based rendering system. The architecture prioritizes:

- **Type Safety** - TypeScript throughout with strict mode
- **Immutability** - Data flows one direction, mutations create new objects
- **Modularity** - Clean package boundaries with explicit dependencies
- **Performance** - Canvas-based rendering with optimizations
- **Extensibility** - Plugin hooks and customization points

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     excalidraw-app                          │
│  (Web Application - excalidraw.com)                         │
│  - Collaboration (Firebase, WebRTC)                         │
│  - PWA Features (Service Worker)                            │
│  - Analytics & Telemetry                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ uses
┌─────────────────────▼───────────────────────────────────────┐
│              @excalidraw/excalidraw                         │
│  (Main React Component Library)                             │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │  Components  │  │   Actions   │  │   Renderer   │       │
│  │  (UI Layer)  │  │  (Commands) │  │   (Canvas)   │       │
│  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘       │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │              Scene & State Management                 │  │
│  │  (Jotai atoms, Scene class, AppState)                 │  │
│  └────────────────────────┬──────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ uses
        ┌───────────────────┼────────────────────┐
        │                   │                    │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│ @excalidraw/   │  │ @excalidraw/   │  │ @excalidraw/   │
│    element     │  │     utils      │  │     common     │
│  (Domain Logic)│  │  (Export/File) │  │  (Base Utils)  │
└───────┬────────┘  └────────────────┘  └────────────────┘
        │ uses
┌───────▼────────┐
│ @excalidraw/   │
│     math       │
│  (2D Geometry) │
└────────────────┘
```

## Layer Responsibilities

### Layer 1: Foundation (`@excalidraw/common`, `@excalidraw/math`)

**Purpose:** Provide pure, framework-agnostic utilities and mathematical primitives.

**Characteristics:**
- Zero dependencies on other Excalidraw packages
- No React dependencies
- Pure functions only
- Highly testable and reusable

**Key Modules:**

**@excalidraw/common:**
- Constants (dimensions, limits, defaults)
- Color utilities and palettes
- Keyboard event handling
- Throttle/debounce utilities
- Event emitter pattern
- Data structures (binary heap, queue)
- Coordinate transformations

**@excalidraw/math:**
- 2D geometry (points, vectors, angles)
- Shape operations (rectangles, ellipses, polygons)
- Collision detection primitives
- Curve mathematics (Bezier)
- Line segment intersections
- Triangle and polygon utilities

### Layer 2: Domain Logic (`@excalidraw/element`)

**Purpose:** Core business logic for element operations, independent of rendering.

**Characteristics:**
- Depends on math and common layers
- No React or rendering code
- Immutable element operations
- Type-safe element models

**Key Concepts:**

**Element Model:**
```typescript
type ExcalidrawElement = {
  id: string;
  type: "rectangle" | "ellipse" | "diamond" | "arrow" | "line" | "text" | ...;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: Radians;
  version: number;         // Incremented on each change
  versionNonce: number;    // Random value for conflict resolution
  index: FractionalIndex;  // Ordering in collaboration scenarios
  // ... styling properties
  isDeleted: boolean;
  locked: boolean;
  // ... relationships
  groupIds: readonly GroupId[];
  frameId: string | null;
  boundElements: readonly BoundElement[] | null;
};
```

**Core Operations:**
- `mutateElement()` - Immutable element updates
- `newElement()` - Element creation with defaults
- `bumpVersion()` - Version increment for collaboration
- Element selection, bounds, collision detection
- Arrow-to-shape binding logic
- Text measurements and wrapping
- Group and frame operations
- Z-index management

**Scene Class:**
The `Scene` class manages the element collection:
```typescript
class Scene {
  private elements: readonly OrderedExcalidrawElement[];
  private elementsMap: SceneElementsMap;
  private nonDeletedElements: readonly NonDeletedExcalidrawElement[];
  private selectedElementsCache: Map<...>;

  replaceAllElements(elements: ExcalidrawElement[]): void;
  getElement(id: string): ExcalidrawElement | null;
  getNonDeletedElements(): readonly NonDeletedExcalidrawElement[];
  getSelectedElements(opts): NonDeletedExcalidrawElement[];
}
```

**Fractional Indexing:**
Elements use fractional indexes for stable ordering in collaborative scenarios:
```typescript
type FractionalIndex = string & { _brand: "fractionalIndex" };

// Allows insertion between elements without reordering
// Example: "a0", "a1", "a2" → insert between "a1" and "a2" = "a1V"
```

### Layer 3: Utilities (`@excalidraw/utils`)

**Purpose:** Higher-level utilities for file operations, export, and specialized functionality.

**Key Functions:**
- `exportToCanvas()` - Render to offscreen canvas
- `exportToBlob()` - Export as PNG/SVG blob
- `exportToSvg()` - Generate SVG representation
- Bounds checking and spatial queries
- Font loading and embedding

### Layer 4: Main Library (`@excalidraw/excalidraw`)

**Purpose:** React component library with UI, state management, and rendering.

**Architecture Components:**

#### State Management (Jotai)

Excalidraw uses **Jotai** for atomic state management:

```typescript
// Isolated Jotai store
const jotai = createIsolation();
export const editorJotaiStore = createStore();

// Example atoms (simplified)
const selectedElementIdsAtom = atom<readonly string[]>([]);
const activeToolAtom = atom<ToolType>("selection");
const viewModeEnabledAtom = atom<boolean>(false);
```

**AppState Structure:**
```typescript
type AppState = {
  // Selection
  selectedElementIds: readonly string[];
  selectedGroupIds: readonly string[];

  // Tool & Mode
  activeTool: {
    type: ToolType;
    locked: boolean;
  };
  viewModeEnabled: boolean;
  zenModeEnabled: boolean;
  gridModeEnabled: boolean;

  // View
  zoom: Zoom;
  scrollX: number;
  scrollY: number;

  // UI State
  openDialog: DialogType | null;
  openSidebar: SidebarName | null;
  openPopup: "elementType" | "elementBackground" | null;

  // Editing State
  editingElement: string | null;
  draggingElement: string | null;
  resizingElement: string | null;

  // Collaboration
  collaborators: Map<string, Collaborator>;

  // ... many more properties
};
```

#### Component Hierarchy

```
<Excalidraw>                              # Main component export
  └─ <EditorJotaiProvider>               # Jotai context
      └─ <InitializeApp>                  # Initialization wrapper
          └─ <App>                        # Core application component
              ├─ <LayerUI>                # UI overlay layer
              │   ├─ <Actions>            # Toolbar
              │   ├─ <MainMenu>           # Menu system
              │   ├─ <ColorPicker>        # Style controls
              │   ├─ <LibraryMenu>        # Shape library
              │   └─ <Footer>             # Bottom bar
              ├─ <Canvas>                 # Main drawing canvas
              │   ├─ Interactive layer    # For editing
              │   └─ Static layer         # For viewing
              └─ <Dialogs>                # Modal dialogs
```

#### Rendering Pipeline

**Multi-Canvas Architecture:**

Excalidraw uses multiple canvas layers for performance:

```
┌─────────────────────────────────────┐
│  Canvas Container                   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Static Canvas (background)    │ │ ← Infrequently updated
│  │ - Non-selected elements       │ │ ← Cached rendering
│  │ - Background grid             │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Interactive Canvas (overlay)  │ │ ← Updated frequently
│  │ - Selected elements           │ │ ← During interactions
│  │ - Handles & controls          │ │
│  │ - Selection box               │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Offscreen Canvas (export)     │ │ ← For export operations
│  │ - Clean rendering             │ │ ← No UI elements
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Rendering Flow:**

```
1. State Change (via action or collaboration)
   ↓
2. Scene.replaceAllElements() or mutateElement()
   ↓
3. Scene triggers callbacks
   ↓
4. React re-renders <App>
   ↓
5. Render pipeline determines what to redraw
   ├─ Full redraw? → Render static canvas
   └─ Interaction? → Render interactive canvas only
   ↓
6. Canvas rendering:
   ├─ Clear canvas
   ├─ Apply viewport transform (zoom, pan)
   ├─ Render elements using roughjs
   ├─ Render selection UI
   └─ Render collaboration cursors
```

**Rendering Optimization Techniques:**

1. **Dirty Rectangle Optimization:** Only redraw changed regions
2. **Element Caching:** Cache generated roughjs paths
3. **Offscreen Rendering:** Export uses separate canvas
4. **Layer Separation:** Static/interactive split reduces redraws
5. **Request Animation Frame:** Throttle rendering to browser refresh rate

**Element Rendering (roughjs):**

```typescript
// Simplified rendering flow
function renderElement(
  element: ExcalidrawElement,
  rc: RoughCanvas,
  context: CanvasRenderingContext2D
) {
  const generator = rough.generator();

  switch (element.type) {
    case "rectangle":
      const shape = generator.rectangle(
        element.x,
        element.y,
        element.width,
        element.height,
        {
          roughness: element.roughness,
          stroke: element.strokeColor,
          fill: element.backgroundColor,
          fillStyle: element.fillStyle,
          strokeWidth: element.strokeWidth,
          seed: element.seed  // Deterministic randomness
        }
      );
      rc.draw(shape);
      break;
    // ... other element types
  }
}
```

#### Action System

Actions are the primary way to modify state:

```typescript
// Action definition
type Action = {
  name: string;
  label: string;
  keywords?: string[];
  icon?: JSX.Element;
  viewMode: boolean;  // Available in view mode?
  perform: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    formData: any,
    app: App
  ) => {
    elements?: ExcalidrawElement[];
    appState?: Partial<AppState>;
    commitToHistory: boolean;
  };
  predicate?: (elements, appState, app) => boolean;
  keyTest?: (event: KeyboardEvent) => boolean;
  PanelComponent?: React.ComponentType;
};

// Example action
export const actionDeleteSelected: Action = {
  name: "deleteSelected",
  label: "Delete",
  keywords: ["remove", "discard"],
  icon: TrashIcon,
  viewMode: false,
  perform: (elements, appState) => {
    return {
      elements: elements.map(el =>
        appState.selectedElementIds.includes(el.id)
          ? { ...el, isDeleted: true }
          : el
      ),
      appState: {
        selectedElementIds: [],
      },
      commitToHistory: true,
    };
  },
  keyTest: (e) => e.key === "Delete" || e.key === "Backspace",
};
```

### Layer 5: Application (`excalidraw-app`)

**Purpose:** Full-featured web application with collaboration and cloud features.

**Additional Features:**
- Real-time collaboration via Firebase
- End-to-end encryption
- Shareable links
- PWA capabilities
- Analytics integration

**Collaboration Architecture:**

```
┌─────────────┐         WebSocket/WebRTC        ┌─────────────┐
│   Client A  │ ←─────────────────────────────→ │   Client B  │
└──────┬──────┘                                  └──────┬──────┘
       │                                                │
       │ Encrypted                          Encrypted  │
       │ Updates                            Updates    │
       │                                                │
       ▼                                                ▼
┌──────────────────────────────────────────────────────────────┐
│                     Firebase Realtime DB                      │
│  (Encrypted element data, presence, cursors)                 │
└──────────────────────────────────────────────────────────────┘
```

**Reconciliation Strategy:**

When receiving remote changes:
```typescript
function reconcileElements(
  localElements: ExcalidrawElement[],
  remoteElements: RemoteExcalidrawElement[],
): ExcalidrawElement[] {
  // 1. Create lookup maps
  const localMap = new Map(localElements.map(el => [el.id, el]));
  const remoteMap = new Map(remoteElements.map(el => [el.id, el]));

  // 2. Merge strategy
  const reconciled = [];

  for (const [id, remoteEl] of remoteMap) {
    const localEl = localMap.get(id);

    if (!localEl) {
      // New remote element
      reconciled.push(remoteEl);
    } else {
      // Conflict resolution based on version/versionNonce
      if (remoteEl.version > localEl.version) {
        reconciled.push(remoteEl);
      } else if (remoteEl.version === localEl.version) {
        // Use versionNonce as tiebreaker
        reconciled.push(
          remoteEl.versionNonce > localEl.versionNonce
            ? remoteEl
            : localEl
        );
      } else {
        reconciled.push(localEl);
      }
    }
  }

  // 3. Add local-only elements
  for (const [id, localEl] of localMap) {
    if (!remoteMap.has(id)) {
      reconciled.push(localEl);
    }
  }

  return reconciled;
}
```

## Data Flow Architecture

### Unidirectional Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      User Interaction                         │
│  (Mouse, Keyboard, Touch)                                     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                   Event Handler                             │
│  (Component event handler or global listener)               │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                     Action                                  │
│  action.perform(elements, appState, formData)              │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                 State Update                                │
│  - New elements array                                       │
│  - New appState object                                      │
│  - History entry (if commitToHistory: true)                │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│              Scene.replaceAllElements()                     │
│  - Updates internal caches                                  │
│  - Validates fractional indices                             │
│  - Triggers callbacks                                       │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                   React Re-render                           │
│  - Component tree updates                                   │
│  - Effect hooks run                                         │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                 Canvas Rendering                            │
│  - Clear canvas                                             │
│  - Render elements                                          │
│  - Render UI overlays                                       │
└─────────────────────────────────────────────────────────────┘
```

### Immutability Pattern

All state updates create new objects:

```typescript
// Bad - Mutation
element.x = 100;
element.y = 200;

// Good - New object
const updatedElement = {
  ...element,
  x: 100,
  y: 200,
  version: element.version + 1
};

// Best - Using helper
const updatedElement = mutateElement(element, { x: 100, y: 200 });
```

## Key Architectural Patterns

### 1. Branded Types for Type Safety

Prevents mixing incompatible string types:

```typescript
type FileId = string & { _brand: "FileId" };
type GroupId = string & { _brand: "GroupId" };

// Compile-time error if types don't match
function getFile(id: FileId) { }
const groupId: GroupId = "123";
getFile(groupId);  // ❌ Type error
```

### 2. Discriminated Unions

Type-safe element handling:

```typescript
function handleElement(element: ExcalidrawElement) {
  switch (element.type) {
    case "rectangle":
      // TypeScript knows this is ExcalidrawRectangleElement
      console.log(element.width, element.height);
      break;
    case "text":
      // TypeScript knows this is ExcalidrawTextElement
      console.log(element.text, element.fontSize);
      break;
  }
}
```

### 3. Versioning for Collaboration

Each element tracks versions for conflict resolution:

```typescript
type ExcalidrawElement = {
  version: number;        // Incremented on each change
  versionNonce: number;   // Random value regenerated on change
  updated: number;        // Timestamp in milliseconds
};

// Update increments version
function updateElement(element) {
  return {
    ...element,
    version: element.version + 1,
    versionNonce: randomInteger(),
    updated: Date.now()
  };
}
```

### 4. Observer Pattern (Scene Callbacks)

Scene notifies subscribers of changes:

```typescript
class Scene {
  private callbacks: Set<() => void> = new Set();

  addCallback(cb: () => void): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);  // Cleanup
  }

  private triggerUpdate() {
    for (const cb of this.callbacks) {
      cb();
    }
  }
}

// Usage in React
useEffect(() => {
  const unsubscribe = scene.addCallback(() => {
    forceUpdate();  // Trigger re-render
  });
  return unsubscribe;
}, [scene]);
```

### 5. Command Pattern (Actions)

Actions encapsulate operations:

```typescript
// Actions are reusable, testable, and reversible (via history)
const result = actionDeleteSelected.perform(
  elements,
  appState,
  null,
  app
);

// Result can be stored in history for undo/redo
history.push({
  elements: previousElements,
  appState: previousAppState
});
```

### 6. Factory Pattern (Element Creation)

Consistent element creation with defaults:

```typescript
function newElement<T extends ElementType>(
  type: T,
  x: number,
  y: number,
  width: number,
  height: number,
  opts?: Partial<ExcalidrawElement>
): Element<T> {
  return {
    id: nanoid(),
    type,
    x, y, width, height,
    angle: 0,
    strokeColor: DEFAULT_STROKE_COLOR,
    backgroundColor: "transparent",
    fillStyle: "hachure",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    seed: randomInteger(),
    version: 1,
    versionNonce: randomInteger(),
    isDeleted: false,
    // ... more defaults
    ...opts  // Override with provided options
  };
}
```

## Performance Optimization Strategies

### 1. Canvas Rendering Optimizations

**Dirty Rectangle Tracking:**
```typescript
// Only redraw changed regions
const dirtyRect = getBoundingBox(changedElements);
context.clearRect(dirtyRect.x, dirtyRect.y, dirtyRect.width, dirtyRect.height);
```

**Layer Separation:**
- Static canvas: Rarely changing elements
- Interactive canvas: Selection, handles, gestures

**Element Caching:**
```typescript
// Cache generated roughjs shapes
const shapeCache = new Map<ElementId, Drawable>();

function getOrCreateShape(element: ExcalidrawElement) {
  const cacheKey = `${element.id}-${element.version}`;
  if (shapeCache.has(cacheKey)) {
    return shapeCache.get(cacheKey);
  }
  const shape = generateShape(element);
  shapeCache.set(cacheKey, shape);
  return shape;
}
```

### 2. React Optimization

**Memoization:**
```typescript
const ExpensiveComponent = React.memo(Component, arePropsEqual);

const memoizedValue = useMemo(() => {
  return expensiveComputation(data);
}, [data]);

const memoizedCallback = useCallback(() => {
  doSomething(data);
}, [data]);
```

**Stable References:**
```typescript
// Avoid creating new objects/arrays in render
const EMPTY_ARRAY: readonly ExcalidrawElement[] = [];

function Component({ elements }: Props) {
  const els = elements || EMPTY_ARRAY;  // Stable reference
}
```

### 3. State Management Optimization

**Jotai Atoms:**
- Granular updates - only affected components re-render
- Derived atoms for computed values
- Lazy evaluation

**Selection Caching:**
```typescript
// Scene caches selected elements based on selectedElementIds
private selectedElementsCache: {
  selectedElementIds: Set<string>;
  result: NonDeletedExcalidrawElement[];
};

getSelectedElements(ids: Set<string>) {
  if (this.selectedElementsCache.selectedElementIds === ids) {
    return this.selectedElementsCache.result;
  }
  // Compute and cache
  const result = this.computeSelectedElements(ids);
  this.selectedElementsCache = { selectedElementIds: ids, result };
  return result;
}
```

### 4. Spatial Indexing

For collision detection and element queries on large scenes:

```typescript
// Quadtree or R-tree for spatial queries
function elementsInViewport(viewport: Bounds): ExcalidrawElement[] {
  return spatialIndex.query(viewport);
}
```

## Security Architecture

### 1. Input Sanitization

All user input is sanitized to prevent XSS:

```typescript
import { sanitizeUrl } from "@braintree/sanitize-url";

function sanitizeLink(url: string): string {
  return sanitizeUrl(normalizeLink(url));
}
```

### 2. End-to-End Encryption (excalidraw.com)

```
┌─────────┐                    ┌─────────┐
│ Client  │                    │ Server  │
└────┬────┘                    └────┬────┘
     │                              │
     │ 1. Generate encryption key   │
     │    (client-side only)        │
     │                              │
     │ 2. Encrypt element data      │
     │    with key                  │
     │                              │
     │ 3. Send encrypted data ────→ │
     │                              │
     │                              │ 4. Store encrypted
     │                              │    (cannot decrypt)
     │                              │
     │ 5. Share link with key ─────→│ Other Client
     │    (key in URL fragment)     │
```

The encryption key never leaves the client and is not sent to the server.

### 3. Content Security Policy

Strict CSP headers prevent inline scripts and unauthorized resource loading.

## Testing Architecture

### Unit Tests

- Test pure functions in isolation
- Mock external dependencies
- Located in `*.test.ts` files

### Integration Tests

- Test component interactions
- Use React Testing Library
- Mock canvas context

### E2E Tests (Future)

- Test full user workflows
- Use Playwright or Cypress

## Extension Points & Customization

### 1. Props-Based Customization

```typescript
<Excalidraw
  initialData={{ elements, appState }}
  onChange={(elements, appState) => {}}
  UIOptions={{
    canvasActions: {
      loadScene: false,
      export: { saveFileToDisk: false },
    }
  }}
  renderTopRightUI={() => <CustomToolbar />}
  validateEmbeddable={(url) => customValidation(url)}
/>
```

### 2. Excalidraw API

```typescript
const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI>();

<Excalidraw excalidrawAPI={(api) => setExcalidrawAPI(api)} />

// Later
excalidrawAPI.updateScene({ elements: newElements });
excalidrawAPI.scrollToContent();
excalidrawAPI.resetScene();
```

### 3. Custom Actions

Inject custom actions into the command palette or toolbar.

### 4. Plugin System (Future)

Planned plugin architecture for extending functionality.

## Deployment Architecture (excalidraw.com)

```
┌─────────────┐
│   Vercel    │  CDN & Static Hosting
│   (Edge)    │  - Vite build output
└──────┬──────┘  - Service Worker (PWA)
       │         - Assets (fonts, icons)
       │
       ▼
┌──────────────┐
│   Firebase   │  Backend Services
│  (Realtime   │  - Collaboration data (encrypted)
│   Database)  │  - Shareable links
└──────────────┘  - Presence system
```

## Key Architectural Decisions

### 1. Monorepo Structure

**Decision:** Use Yarn workspaces monorepo
**Rationale:** Shared code, coordinated versioning, easier refactoring
**Trade-off:** Slightly more complex setup vs. clearer dependencies

### 2. Canvas-Based Rendering

**Decision:** Use HTML5 Canvas instead of SVG
**Rationale:** Better performance for large scenes, fine control over rendering
**Trade-off:** More complex implementation vs. superior performance

### 3. Jotai for State Management

**Decision:** Use Jotai instead of Redux/Context
**Rationale:** Atomic updates, better performance, less boilerplate
**Trade-off:** Smaller ecosystem vs. better developer experience

### 4. Immutable Data Patterns

**Decision:** Treat all data as immutable
**Rationale:** Predictable state updates, easier collaboration reconciliation
**Trade-off:** More object creation vs. easier debugging and time-travel

### 5. TypeScript Strict Mode

**Decision:** Enable strict TypeScript
**Rationale:** Catch errors at compile time, better IDE support
**Trade-off:** More type annotations vs. fewer runtime errors

### 6. roughjs for Hand-Drawn Aesthetic

**Decision:** Use roughjs library
**Rationale:** Unique visual identity, differentiates from competitors
**Trade-off:** Additional bundle size vs. distinctive style

## Future Architecture Considerations

1. **Plugin System** - Extensible architecture for third-party features
2. **WebAssembly** - Performance-critical operations (text shaping, collision)
3. **Web Workers** - Offload heavy computations
4. **Shared Worker** - Cross-tab collaboration
5. **IndexedDB** - Better local persistence strategy
6. **CRDTs** - Improved collaboration conflict resolution

## Summary

Excalidraw's architecture prioritizes:
- **Type safety** through TypeScript
- **Performance** through canvas rendering and optimization
- **Maintainability** through clean layering and immutability
- **Extensibility** through props and API surface
- **Collaboration** through versioning and reconciliation
- **Privacy** through end-to-end encryption

The layered monorepo structure ensures clean dependencies, while the React + Jotai combination provides efficient UI updates. The immutable data patterns make collaboration reconciliation straightforward, and the canvas-based rendering delivers excellent performance even with thousands of elements.
