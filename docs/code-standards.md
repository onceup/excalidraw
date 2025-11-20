# Excalidraw Code Standards

## Overview

This document defines the coding standards, conventions, and best practices for contributing to Excalidraw. These standards ensure consistency, maintainability, and high quality across the codebase.

## Directory Structure Conventions

### Monorepo Organization

```
excalidraw/
├── packages/                    # Core npm packages
│   ├── common/                 # Base utilities (no dependencies)
│   ├── math/                   # Math operations (depends on common)
│   ├── element/                # Element logic (depends on math, common)
│   ├── utils/                  # Utilities (depends on common)
│   └── excalidraw/             # Main package (depends on all)
├── excalidraw-app/             # Web application
├── examples/                   # Integration examples
│   ├── with-nextjs/
│   └── with-script-in-browser/
├── scripts/                    # Build and release scripts
└── docs/                       # Project documentation
```

### Package Structure

Each package follows a consistent structure:

```
packages/<package-name>/
├── src/                        # Source code
│   ├── index.ts               # Main entry point (exports)
│   ├── types.ts               # Type definitions
│   ├── *.ts                   # Implementation files
│   └── __tests__/             # Co-located tests (if needed)
├── package.json               # Package configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # Package documentation
```

### Component Structure (excalidraw package)

```
packages/excalidraw/
├── components/                # React components
│   ├── App.tsx               # Main application component
│   ├── Button.tsx            # Reusable components
│   ├── ColorPicker/          # Complex components as directories
│   │   ├── ColorPicker.tsx
│   │   ├── ColorPicker.scss
│   │   └── index.tsx
│   └── icons.tsx             # Icon components
├── actions/                  # User action handlers
├── data/                     # Data operations (import/export)
├── scene/                    # Scene management
├── renderer/                 # Canvas rendering
├── hooks/                    # React hooks
├── css/                      # Global styles
└── locales/                  # i18n translations
```

## File Naming Conventions

### General Rules

- Use **camelCase** for TypeScript/JavaScript files: `myComponent.ts`, `userHelpers.ts`
- Use **PascalCase** for React components: `Button.tsx`, `ColorPicker.tsx`
- Use **lowercase** for CSS/SCSS: `app.scss`, `button.scss`
- Use **kebab-case** for directories with multiple words: `color-picker/`, `main-menu/`
- Use descriptive names that clearly indicate purpose

### File Type Suffixes

- `.tsx` - React components (JSX)
- `.ts` - TypeScript modules
- `.scss` - Styles
- `.test.ts` or `.test.tsx` - Test files (co-located with implementation)
- `.d.ts` - Type declaration files

### Examples

**Good:**

```
components/ColorPicker/ColorPicker.tsx
components/ColorPicker/ColorPicker.scss
hooks/useCallbackRefState.ts
data/restore.ts
types.ts
```

**Avoid:**

```
components/color_picker.tsx        # Use PascalCase for components
hooks/use-callback-ref-state.ts    # Use camelCase for non-components
Data.ts                            # Too generic
util.ts                            # Too vague, be specific
```

## TypeScript Standards

### Type Safety

**Always use strict TypeScript:**

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Type Definitions

**Prefer types over interfaces for simple structures:**

```typescript
// Good - Types for simple structures
export type Point = {
  x: number;
  y: number;
};

export type Theme = "light" | "dark";

// Good - Interfaces for extensible objects
export interface ExcalidrawAPI {
  readyPromise: Promise<void>;
  updateScene: (sceneData: SceneData) => void;
  resetScene: () => void;
}
```

### Branded Types for Type Safety

Use branded types for values that shouldn't be interchangeable:

```typescript
// Prevents mixing up different string types
export type FileId = string & { _brand: "FileId" };
export type GroupId = string & { _brand: "GroupId" };
export type FractionalIndex = string & { _brand: "fractionalIndex" };
export type FontString = string & { _brand: "fontString" };
export type SocketId = string & { _brand: "SocketId" };
```

### Discriminated Unions

Use discriminated unions for element types and similar variants:

```typescript
type ExcalidrawElement =
  | ExcalidrawRectangleElement
  | ExcalidrawEllipseElement
  | ExcalidrawDiamondElement
  | ExcalidrawLinearElement
  | ExcalidrawTextElement
  | ExcalidrawImageElement
  | ExcalidrawFrameElement;

// Each type has a discriminator property
type ExcalidrawRectangleElement = {
  type: "rectangle"; // Discriminator
  // ... other properties
};
```

### Type Guards

Implement type guards for runtime type checking:

```typescript
export const isLinearElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawLinearElement => {
  return element != null && isLinearElementType(element.type);
};

export const isTextElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawTextElement => {
  return element?.type === "text";
};
```

### Avoid `any`

**Never use `any` unless absolutely necessary:**

```typescript
// Bad
function processData(data: any) {}

// Good
function processData<T extends ExcalidrawElement>(data: T) {}

// Acceptable (when dealing with truly unknown types)
function parseJSON(input: string): unknown {
  return JSON.parse(input);
}
```

### Readonly by Default

Prefer `readonly` for data that shouldn't be mutated:

```typescript
export type ExcalidrawElement = Readonly<{
  id: string;
  x: number;
  y: number;
  // ... other properties
  boundElements: readonly BoundElement[] | null;
}>;
```

## React & Component Standards

### Component Naming

- Use PascalCase for component names
- Match filename to component name
- Export component as default or named export

```typescript
// Button.tsx
export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};

// Or as default
export default Button;
```

### Props Type Definitions

Always define props types explicitly:

```typescript
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = "primary",
  disabled = false,
}) => {
  // Implementation
};
```

### Hooks

- Use `use` prefix for custom hooks
- Co-locate hooks in `hooks/` directory
- Return tuples or objects, not arrays (unless array semantics make sense)

```typescript
// hooks/useCallbackRefState.ts
export const useCallbackRefState = <T>(): [
  T | null,
  (instance: T | null) => void,
] => {
  const [state, setState] = useState<T | null>(null);
  const callbackRef = useCallback((instance: T | null) => {
    setState(instance);
  }, []);
  return [state, callbackRef];
};
```

### Component Organization

Order component code in this sequence:

1. Imports
2. Type definitions
3. Constants
4. Helper functions
5. Component definition
6. Exports

```typescript
// 1. Imports
import React, { useState, useCallback } from "react";
import { Button } from "./Button";

// 2. Type definitions
interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

// 3. Constants
const DEFAULT_COLORS = ["#000000", "#ffffff", "#ff0000"];

// 4. Helper functions
const isValidColor = (color: string): boolean => {
  return /^#[0-9A-F]{6}$/i.test(color);
};

// 5. Component definition
export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
}) => {
  // Component implementation
};

// 6. Exports (if not inline)
export default ColorPicker;
```

### Avoid Inline Styles

Use CSS/SCSS classes instead of inline styles:

```typescript
// Bad
<div style={{ color: "red", padding: "10px" }}>Content</div>

// Good
<div className="error-message">Content</div>
```

## Naming Conventions

### Variables and Functions

- **camelCase** for variables and functions
- Descriptive names that indicate purpose
- Boolean variables should start with `is`, `has`, `should`, `can`
- Event handlers should start with `handle` or `on`

```typescript
// Variables
const userName = "John";
const selectedElements = [];
const isCollaborating = true;
const hasUnsavedChanges = false;

// Functions
function getUserName() {}
function calculateBounds() {}
function isElementSelected() {}

// Event handlers
function handleClick() {}
function onPointerDown() {}
```

### Constants

- **UPPER_SNAKE_CASE** for true constants
- **PascalCase** for enum-like objects

```typescript
// True constants
const DEFAULT_FONT_SIZE = 20;
const MAX_CANVAS_SIZE = 10000;
const INVISIBLY_SMALL_ELEMENT_SIZE = 0.1;

// Enum-like objects
const FONT_FAMILY = {
  Virgil: 1,
  Helvetica: 2,
  Cascadia: 3,
} as const;

const THEME = {
  LIGHT: "light",
  DARK: "dark",
} as const;
```

### Classes and Types

- **PascalCase** for classes, types, interfaces, enums

```typescript
class ElementCache {}

type ExcalidrawElement = {};

interface ExcalidrawAPI {}

enum ToolType {
  Selection = "selection",
  Rectangle = "rectangle",
}
```

## Function Standards

### Function Declarations

Prefer named functions for better stack traces:

```typescript
// Good
export function calculateElementBounds(element: ExcalidrawElement) {
  // Implementation
}

// Also acceptable for small utilities
export const debounce = <T extends any[]>(
  fn: (...args: T) => void,
  delay: number,
) => {
  // Implementation
};
```

### Pure Functions

Prefer pure functions (no side effects):

```typescript
// Good - Pure function
export function getElementBounds(element: ExcalidrawElement): Bounds {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

// Avoid - Mutates input
function updateElementPosition(
  element: ExcalidrawElement,
  x: number,
  y: number,
) {
  element.x = x; // Mutation!
  element.y = y;
}
```

### Immutable Updates

Use immutable patterns for updates:

```typescript
// Good - Returns new object
export function mutateElement<T extends ExcalidrawElement>(
  element: T,
  updates: Partial<T>,
): T {
  return { ...element, ...updates, version: element.version + 1 };
}

// Use the helper
const newElement = mutateElement(element, { x: 100, y: 200 });
```

### Function Length

Keep functions focused and short (< 50 lines ideally):

```typescript
// If a function is too long, extract helpers
function complexOperation() {
  const step1 = performStep1();
  const step2 = performStep2(step1);
  const step3 = performStep3(step2);
  return finalizeResult(step3);
}

function performStep1() {
  /* ... */
}
function performStep2(input: any) {
  /* ... */
}
function performStep3(input: any) {
  /* ... */
}
function finalizeResult(input: any) {
  /* ... */
}
```

## Import/Export Standards

### Import Order

Organize imports in this order:

1. External libraries (React, third-party)
2. Internal packages (`@excalidraw/*`)
3. Relative imports (local files)
4. Type imports
5. CSS/SCSS imports

```typescript
// 1. External libraries
import React, { useState, useEffect } from "react";
import { nanoid } from "nanoid";

// 2. Internal packages
import { DEFAULT_UI_OPTIONS } from "@excalidraw/common";
import { mutateElement } from "@excalidraw/element";
import { Point } from "@excalidraw/math";

// 3. Relative imports
import { calculateBounds } from "./bounds";
import { renderElement } from "./renderer";

// 4. Type imports (separated)
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "./types";

// 5. CSS/SCSS imports
import "./App.scss";
```

### Export Patterns

**Prefer named exports:**

```typescript
// Good - Named exports
export const Button = () => {};
export const Icon = () => {};

// Use default export only for main component of file
export default App;
```

**Barrel exports in index files:**

```typescript
// packages/element/src/index.ts
export * from "./bounds";
export * from "./collision";
export * from "./mutateElement";
export * from "./types";
```

### Path Aliases

Use configured path aliases for cleaner imports:

```typescript
// Good - Using alias
import { Point } from "@excalidraw/math";
import { ExcalidrawElement } from "@excalidraw/element/types";

// Avoid - Relative paths across packages
import { Point } from "../../math/src/point";
```

## Testing Standards

### Test File Naming

- Co-locate tests with implementation: `myModule.test.ts`
- Or use separate test directories: `__tests__/myModule.test.ts`

### Test Structure

Use descriptive test names with "should" or "when":

```typescript
describe("calculateElementBounds", () => {
  it("should return correct bounds for rectangle", () => {
    const element = createRectangle({ x: 10, y: 20, width: 100, height: 50 });
    const bounds = calculateElementBounds(element);

    expect(bounds).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it("should handle rotated elements", () => {
    // Test implementation
  });

  it("should handle negative dimensions", () => {
    // Test implementation
  });
});
```

### Test Coverage

Aim for:

- 60%+ line coverage
- 70%+ branch coverage
- 100% coverage for critical business logic

### Snapshot Testing

Use snapshots sparingly and only for UI:

```typescript
it("should render button correctly", () => {
  const { container } = render(<Button>Click me</Button>);
  expect(container).toMatchSnapshot();
});
```

## Code Quality Tools

### ESLint

Run before committing:

```bash
yarn test:code          # Check for issues
yarn fix:code          # Auto-fix issues
```

### Prettier

Format code automatically:

```bash
yarn fix:other         # Format non-code files
yarn fix              # Format everything
```

### TypeScript

Type-check before committing:

```bash
yarn test:typecheck
```

### Pre-commit Hooks

Husky runs these automatically:

- ESLint on staged files
- Prettier on staged files
- TypeScript type checking

## Comments and Documentation

### JSDoc for Public APIs

Document all exported functions:

```typescript
/**
 * Calculates the bounding box for an element.
 *
 * @param element - The element to calculate bounds for
 * @returns The bounding box with x, y, width, height
 *
 * @example
 * const bounds = getElementBounds(element);
 * console.log(bounds); // { x: 10, y: 20, width: 100, height: 50 }
 */
export function getElementBounds(element: ExcalidrawElement): Bounds {
  // Implementation
}
```

### Inline Comments

Use comments to explain "why", not "what":

```typescript
// Bad - Obvious
// Increment version
element.version++;

// Good - Explains reasoning
// Increment version to trigger reconciliation in collaboration
element.version++;

// Good - Explains complex logic
// Use fractional indexing to allow element insertion without
// reordering all elements in the scene
const newIndex = generateFractionalIndex(prevIndex, nextIndex);
```

### TODO Comments

Format TODOs consistently:

```typescript
// TODO: Implement undo/redo for this operation
// FIXME: This breaks when element has zero width
// HACK: Temporary workaround until upstream fix
```

## Error Handling

### Throw Meaningful Errors

```typescript
// Good
if (!element) {
  throw new Error(`Element with id ${id} not found`);
}

// Avoid
if (!element) {
  throw new Error("Error");
}
```

### Use Custom Error Types

```typescript
export class ExcalidrawError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ExcalidrawError";
  }
}

throw new ExcalidrawError("Invalid element type", "INVALID_ELEMENT_TYPE");
```

## Performance Best Practices

### Memoization

Use React.memo for expensive components:

```typescript
export const ExpensiveComponent = React.memo(
  ({ data }: Props) => {
    // Expensive rendering
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return isEqual(prevProps.data, nextProps.data);
  },
);
```

### useMemo and useCallback

Memoize expensive computations and callbacks:

```typescript
const sortedElements = useMemo(() => {
  return elements.sort((a, b) => a.index - b.index);
}, [elements]);

const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Avoid Unnecessary Re-renders

```typescript
// Use stable references
const EMPTY_ARRAY: readonly ExcalidrawElement[] = [];

function Component() {
  // Bad - Creates new array on every render
  const elements = props.elements || [];

  // Good - Uses stable reference
  const elements = props.elements || EMPTY_ARRAY;
}
```

## Accessibility Standards

### Semantic HTML

Use appropriate HTML elements:

```typescript
// Good
<button onClick={handleClick}>Submit</button>

// Bad
<div onClick={handleClick}>Submit</div>
```

### ARIA Labels

Provide labels for screen readers:

```typescript
<button
  aria-label="Delete element"
  title="Delete element"
  onClick={handleDelete}
>
  <TrashIcon />
</button>
```

### Keyboard Navigation

Support keyboard shortcuts:

```typescript
onKeyDown={(e) => {
  if (e.key === "Delete" || e.key === "Backspace") {
    handleDelete();
  }
}}
```

## Git Commit Standards

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Examples:**

```
feat: Add animation support for elements

Implements basic animation system with keyframes and timeline.
Supports opacity and position animations.

Closes #1234
```

```
fix: Canvas panning stops when hovering over frame title (#10340)

Prevents event propagation when hovering over frame titles
to allow proper frame interaction.
```

## Code Review Guidelines

### For Reviewers

- Check type safety and proper TypeScript usage
- Verify test coverage for new features
- Ensure consistent naming conventions
- Look for performance implications
- Validate accessibility considerations

### For Contributors

- Run all tests before submitting PR
- Update documentation for API changes
- Add tests for new functionality
- Follow the project's coding standards
- Keep PRs focused on single concern

## Anti-Patterns to Avoid

### 1. Mutating Props or State

```typescript
// Bad
function updateElement(element: ExcalidrawElement) {
  element.x = 100; // Mutates input
}

// Good
function updateElement(element: ExcalidrawElement): ExcalidrawElement {
  return { ...element, x: 100 };
}
```

### 2. Large God Components

Break down large components into smaller, focused ones.

### 3. Magic Numbers

```typescript
// Bad
if (element.width < 0.1) {
}

// Good
const INVISIBLY_SMALL_ELEMENT_SIZE = 0.1;
if (element.width < INVISIBLY_SMALL_ELEMENT_SIZE) {
}
```

### 4. Circular Dependencies

Structure packages to avoid circular imports. Follow the dependency hierarchy.

### 5. Over-Engineering

Keep solutions simple and focused. Don't add abstraction layers unless needed.

## Summary Checklist

Before submitting code, verify:

- [ ] TypeScript strict mode passes
- [ ] ESLint shows no warnings
- [ ] Prettier formatting applied
- [ ] Tests written and passing
- [ ] Types properly defined (no `any`)
- [ ] Functions are pure where possible
- [ ] Naming follows conventions
- [ ] Comments explain "why", not "what"
- [ ] Imports organized correctly
- [ ] Accessibility considered
- [ ] Performance implications reviewed
- [ ] Documentation updated

Following these standards ensures code quality, maintainability, and a consistent developer experience across the Excalidraw project.
