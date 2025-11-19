# Excalidraw Codebase Summary

## Overview

Excalidraw is organized as a **monorepo** using Yarn workspaces, with a clear separation between the core library, supporting packages, and the web application. The architecture follows a layered dependency model where lower-level packages provide primitives for higher-level functionality.

## Repository Structure

```
excalidraw/
├── packages/                      # Core packages (npm publishable)
│   ├── excalidraw/               # Main React component library
│   ├── common/                   # Shared utilities and constants
│   ├── element/                  # Element-related logic
│   ├── math/                     # Mathematical operations
│   └── utils/                    # Utility functions
├── excalidraw-app/               # Web application (excalidraw.com)
├── examples/                     # Integration examples
│   ├── with-nextjs/             # Next.js integration example
│   └── with-script-in-browser/  # Vanilla JS example
├── scripts/                      # Build and release scripts
├── public/                       # Static assets
├── dev-docs/                     # Developer documentation
├── docs/                         # Project documentation
└── .github/                      # GitHub workflows and configs
```

## Package Dependency Graph

```
@excalidraw/common (base layer)
    ↑
    └── @excalidraw/math
            ↑
            └── @excalidraw/element
                    ↑
                    ├── @excalidraw/utils
                    └── @excalidraw/excalidraw
                            ↑
                            └── excalidraw-app
```

## Core Packages

### 1. `@excalidraw/common` (v0.18.0)

**Purpose:** Foundation layer providing shared utilities, constants, and types used across all packages.

**Key Exports:**
- `constants.ts` - Application-wide constants (dimensions, defaults, limits)
- `colors.ts` - Color palette and color utilities
- `utils.ts` - General utility functions (debounce, throttle, deep clone, etc.)
- `keys.ts` - Keyboard event utilities
- `points.ts` - Point/coordinate helpers
- `emitter.ts` - Event emitter pattern
- `visualdebug.ts` - Visual debugging utilities
- `editorInterface.ts` - Editor interface abstractions
- `font-metadata.ts` - Font configuration and metadata
- `binary-heap.ts`, `queue.ts` - Data structures
- `promise-pool.ts` - Concurrent promise execution

**Dependencies:** None (base layer)

**Location:** `packages/common/src/`

**Build Output:** ESM modules in `dist/`

### 2. `@excalidraw/math` (v0.18.0)

**Purpose:** Mathematical primitives and operations for 2D geometry, vectors, and spatial calculations.

**Key Exports:**
- `angle.ts` - Angle calculations and conversions
- `curve.ts` - Bezier curves and path calculations
- `ellipse.ts` - Ellipse geometry operations
- `line.ts` - Line segment operations
- `point.ts` - Point operations (distance, midpoint, rotation)
- `polygon.ts` - Polygon utilities
- `rectangle.ts` - Rectangle operations
- `segment.ts` - Line segment intersections
- `triangle.ts` - Triangle geometry
- `vector.ts` - Vector mathematics (add, subtract, scale, normalize)
- `range.ts` - Numeric range utilities

**Dependencies:** `@excalidraw/common`

**Location:** `packages/math/src/`

**Use Cases:**
- Element bounds calculations
- Collision detection
- Transform operations (rotate, scale, translate)
- Snapping and alignment

### 3. `@excalidraw/element` (v0.18.0)

**Purpose:** Element data models, manipulation logic, and operations. The core domain logic for all drawable elements.

**Key Exports:**
- Element operations: `mutateElement`, `newElement`, `bumpVersion`
- Selection: `getSelectedElements`, `isElementSelected`
- Bounds: `getElementBounds`, `getCommonBounds`
- Collision: `elementOverlapsWithFrame`, `isElementInsideBBox`
- Binding: Arrow-to-shape binding logic
- Text: `textElement.ts`, `textMeasurements.ts`, `textWrapping.ts`
- Shapes: `shape.ts` - Path generation for rendering
- Transforms: `transformHandles.ts`, `resizeElements.ts`
- Groups: `groups.ts` - Element grouping logic
- Frames: `frame.ts` - Frame container logic
- Z-index: `zindex.ts` - Element layering
- Type guards: `typeChecks.ts` - Element type checking
- Linear elements: `linearElementEditor.ts` - Arrow/line editing
- Elbow arrows: `elbowArrow.ts` - Right-angle arrow routing
- Scene: `Scene.ts` - Element collection management

**Dependencies:** `@excalidraw/common`, `@excalidraw/math`

**Location:** `packages/element/src/`

**Element Types:**
- Rectangle, Ellipse, Diamond
- Arrow, Line (linear elements)
- Free-draw paths
- Text
- Image
- Frame (container)
- Embeddable content

### 4. `@excalidraw/utils` (v0.1.2)

**Purpose:** Higher-level utility functions for export, import, and specialized operations.

**Key Exports:**
- `export.ts` - Export to PNG, SVG, clipboard
- `withinBounds.ts` - Spatial query utilities
- Font utilities (embedded in utils)
- File operations
- Image processing

**Dependencies:** Various (roughjs, pako, browser-fs-access, etc.)

**Location:** `packages/utils/src/`

### 5. `@excalidraw/excalidraw` (v0.18.0)

**Purpose:** Main React component library. The primary integration point for embedding Excalidraw.

**Key Exports:**
- `<Excalidraw />` - Main React component
- `<Sidebar />`, `<Footer />`, `<MainMenu />` - UI components
- `<WelcomeScreen />`, `<Button />` - Sub-components
- API functions: `exportToCanvas`, `exportToBlob`, `exportToSvg`
- Data operations: `restore`, `reconcileElements`, `serializeAsJSON`
- Library functions: `loadFromBlob`, `loadLibraryFromBlob`
- Hooks: `useEditorInterface`, `useHandleLibrary`
- Constants: `FONT_FAMILY`, `THEME`, `MIME_TYPES`

**Key Directories:**
- `components/` - React components (Actions, App, ColorPicker, etc.)
- `actions/` - User actions (drawing, selection, export, etc.)
- `data/` - Data serialization, restore, blob handling
- `scene/` - Scene rendering and management
- `renderer/` - Canvas rendering logic
- `hooks/` - React hooks
- `fonts/` - Font assets and loaders
- `locales/` - i18n translation files
- `css/` - Styles (SCSS)

**Dependencies:**
- `@excalidraw/common`
- `@excalidraw/element`
- `@excalidraw/math`
- External: React, Jotai, roughjs, perfect-freehand, Radix UI

**Location:** `packages/excalidraw/`

**Entry Point:** `index.tsx`

## Web Application

### `excalidraw-app/`

**Purpose:** Full-featured web application hosted at excalidraw.com. Demonstrates the library's capabilities and adds collaboration features.

**Key Files:**
- `App.tsx` - Main application component (365KB, highly complex)
- `index.tsx` - Entry point
- `app-jotai.ts` - Jotai state management setup
- `collab/` - Real-time collaboration logic
- `components/` - App-specific components
- `data/` - Firebase integration
- `share/` - Shareable link generation
- `vite.config.mts` - Vite build configuration

**Additional Features (vs library):**
- Real-time collaboration (WebRTC/Firebase)
- End-to-end encryption
- Shareable links
- PWA support
- Cloud persistence
- Analytics
- Custom stats

**Entry Point:** `index.tsx`

**Build System:** Vite with plugins (PWA, SVGR, EJS)

## Examples

### `examples/with-nextjs/`

Demonstrates integration with Next.js framework. Shows server-side rendering considerations and proper setup.

### `examples/with-script-in-browser/`

Vanilla JavaScript example using UMD bundle via script tag. Simplest integration method.

## Build System

### Package Build (esbuild)

**Scripts:**
- `buildPackage.js` - Builds `@excalidraw/excalidraw` package
- `buildBase.js` - Builds base packages (common, math, element)
- `buildUtils.js` - Builds utils package

**Process:**
1. Clean dist directory
2. Bundle with esbuild (dev + prod)
3. Generate TypeScript definitions (`tsc`)
4. Output ESM modules

**Outputs:**
- `dist/dev/index.js` - Development bundle
- `dist/prod/index.js` - Production bundle (minified)
- `dist/types/` - TypeScript definitions

### App Build (Vite)

**Configuration:** `excalidraw-app/vite.config.mts`

**Plugins:**
- `@vitejs/plugin-react` - React Fast Refresh
- `vite-plugin-svgr` - SVG as React components
- `vite-plugin-pwa` - Progressive Web App
- `vite-plugin-ejs` - EJS templating
- `vite-plugin-checker` - TypeScript checking

**Environment Variables:**
- `.env.development` - Development config
- `.env.production` - Production config

## Testing Infrastructure

### Vitest Configuration

**File:** `vitest.config.mts`

**Key Settings:**
- Test environment: jsdom
- Global test utilities
- Coverage thresholds: 60% lines, 70% branches
- Path aliases for packages
- Setup file: `setupTests.ts`

**Coverage Thresholds:**
- Lines: 60%
- Branches: 70%
- Functions: 63%
- Statements: 60%

**Test Commands:**
- `yarn test` - Run tests in watch mode
- `yarn test:update` - Update snapshots
- `yarn test:coverage` - Generate coverage report

### Testing Tools

- Vitest - Test runner
- @testing-library/react - React component testing
- @testing-library/jest-dom - DOM assertions
- vitest-canvas-mock - Canvas API mocking
- fake-indexeddb - IndexedDB mocking

## TypeScript Configuration

### Root `tsconfig.json`

**Key Settings:**
- Target: ESNext
- Module: ESNext
- Strict mode enabled
- JSX: react-jsx
- Path aliases for all packages

**Path Aliases:**
```typescript
{
  "@excalidraw/common": ["./packages/common/src/index.ts"],
  "@excalidraw/common/*": ["./packages/common/src/*"],
  "@excalidraw/element": ["./packages/element/src/index.ts"],
  "@excalidraw/element/*": ["./packages/element/src/*"],
  "@excalidraw/excalidraw": ["./packages/excalidraw/index.tsx"],
  "@excalidraw/excalidraw/*": ["./packages/excalidraw/*"],
  "@excalidraw/math": ["./packages/math/src/index.ts"],
  "@excalidraw/math/*": ["./packages/math/src/*"],
  "@excalidraw/utils": ["./packages/utils/src/index.ts"],
  "@excalidraw/utils/*": ["./packages/utils/src/*"]
}
```

## State Management

### Jotai

**Primary State Library:** Excalidraw uses Jotai for atomic state management.

**Key State Atoms:**
- Editor state (selection, tool, mode)
- App state (theme, view settings)
- Collaboration state (users, cursors)
- UI state (dialogs, panels)

**Files:**
- `packages/excalidraw/editor-jotai.ts` - Editor store
- `excalidraw-app/app-jotai.ts` - App store

## Internationalization (i18n)

**Location:** `packages/excalidraw/locales/`

**Format:** JSON files per language

**Supported Languages:** 50+ languages including:
- en (English - default)
- es (Spanish)
- fr (French)
- de (German)
- ja (Japanese)
- zh-CN (Chinese Simplified)
- And many more...

**Implementation:** `i18n.ts` provides translation utilities

## Key Entry Points

### For Library Consumers

**npm Install:**
```bash
npm install react react-dom @excalidraw/excalidraw
```

**Import:**
```typescript
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
```

**Entry File:** `packages/excalidraw/index.tsx`

### For Contributors

**Development:**
```bash
yarn install          # Install dependencies
yarn start           # Start dev server (port 3000)
yarn test           # Run tests
yarn test:typecheck # TypeScript validation
yarn fix            # Auto-fix lint/format issues
```

**Entry Files:**
- App: `excalidraw-app/index.tsx`
- Library: `packages/excalidraw/index.tsx`

## Build Outputs

### npm Package (`@excalidraw/excalidraw`)

**Published Structure:**
```
dist/
├── dev/
│   ├── index.js      # Development bundle
│   └── index.css     # Styles
├── prod/
│   ├── index.js      # Production bundle (minified)
│   └── index.css     # Styles (minified)
└── types/
    └── excalidraw/   # TypeScript definitions
```

### Web App (excalidraw.com)

**Build Output:**
```
excalidraw-app/build/
├── index.html
├── assets/
│   ├── index.[hash].js
│   ├── index.[hash].css
│   └── fonts/
├── manifest.json     # PWA manifest
└── sw.js            # Service worker
```

## Critical Files & Directories

### Configuration Files

- `package.json` - Root package configuration
- `tsconfig.json` - TypeScript configuration
- `vitest.config.mts` - Test configuration
- `.eslintrc.json` - Linting rules
- `.prettierignore` - Format exclusions
- `yarn.lock` - Dependency lock file

### Documentation

- `README.md` - Main documentation
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - MIT License
- `CHANGELOG.md` - Version history (in packages/excalidraw/)
- `CLAUDE.md` - AI assistant instructions

### CI/CD

- `.github/workflows/` - GitHub Actions
- `.husky/` - Git hooks
- `scripts/release.js` - Release automation

## Performance Considerations

### Bundle Sizes

**Target:** < 1MB gzipped for main package

**Optimization Strategies:**
- Tree-shaking with ESM
- Code splitting in app
- Lazy loading for non-critical features
- Font subsetting
- Image optimization

### Runtime Performance

**Rendering:** Canvas-based with dirty rectangle optimization

**State Updates:** Jotai atoms for granular updates

**Large Scenes:** Spatial indexing for element queries

## Development Workflow

### Adding a New Feature

1. Determine which package the feature belongs to
2. Add implementation in appropriate package
3. Export from package index if public API
4. Update TypeScript types
5. Add tests
6. Update documentation
7. Test in example app

### Making Changes to Core Library

1. Work in `packages/excalidraw/`
2. Test in `excalidraw-app/` during development
3. Run `yarn test:typecheck` before committing
4. Run `yarn test:update` to ensure tests pass
5. Use `yarn fix` to auto-format

### Package Versioning

All packages are versioned together (currently 0.18.0) for simplicity.

## External Dependencies

### Key Libraries

**UI & Rendering:**
- `react` - UI framework
- `roughjs` - Hand-drawn rendering
- `perfect-freehand` - Free-draw smoothing
- `@radix-ui/*` - Accessible UI primitives

**State & Data:**
- `jotai` - State management
- `pako` - Compression
- `nanoid` - ID generation
- `fractional-indexing` - Element ordering

**Utilities:**
- `lodash.throttle`, `lodash.debounce` - Performance utilities
- `browser-fs-access` - File system access
- `clsx` - Class name composition

**Fonts & Text:**
- `fonteditor-core` - Font processing
- `harfbuzzjs` - Text shaping

## Notable Patterns

### Immutable Updates

Elements are treated as immutable. Use `mutateElement` or `newElementWith` for updates.

### Element Versioning

Each element has a `version` counter and `versionNonce` for change tracking.

### Fractional Indexing

Elements use fractional indexes for ordering, allowing insertion without reordering all elements.

### Type Safety

Extensive use of TypeScript discriminated unions for element types and type guards.

### Canvas Rendering

Offscreen canvas for exports, main canvas for editing, separate layers for different element types.

## Architecture Highlights

1. **Layered Dependencies:** Clean separation prevents circular dependencies
2. **Package Modularity:** Core logic separated from rendering and UI
3. **Type Safety:** Comprehensive TypeScript coverage
4. **Testability:** Logic separated from React components where possible
5. **Extensibility:** Plugin hooks and customization props
6. **Performance:** Optimized rendering and state management

## Getting Help

- **Documentation:** https://docs.excalidraw.com
- **Discord:** https://discord.gg/UexuTaE
- **GitHub Issues:** https://github.com/excalidraw/excalidraw/issues
- **API Docs:** Inline JSDoc comments and TypeScript definitions
