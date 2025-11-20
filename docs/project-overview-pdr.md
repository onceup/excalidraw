# Excalidraw - Project Overview & Product Development Requirements

## Project Vision

Excalidraw is an open-source virtual whiteboard for creating hand-drawn style diagrams and illustrations. The project aims to provide a collaborative, end-to-end encrypted canvas experience that combines the expressiveness of hand-drawn sketches with the power of digital tools.

### Mission Statement

To democratize visual thinking and collaboration by providing a free, open-source, privacy-focused whiteboard that feels natural and intuitive, enabling individuals and teams to express ideas visually without technical barriers.

## Product Development Requirements (PDR)

### 1. Core Product Goals

**Primary Objectives:**

- Provide a production-ready React component library (`@excalidraw/excalidraw`) for embedding in third-party applications
- Deliver a fully-featured web application (excalidraw.com) demonstrating the library's capabilities
- Maintain hand-drawn aesthetic that differentiates from traditional diagramming tools
- Enable real-time collaboration with privacy-first architecture (end-to-end encryption)
- Support offline-first workflows with local data persistence

**Success Metrics:**

- npm package downloads and integration adoption
- Active users on excalidraw.com
- Community contributions and ecosystem growth
- Performance benchmarks (render time, collaboration latency)
- Accessibility compliance (WCAG standards)

### 2. Functional Requirements

#### 2.1 Drawing & Editing

**Must Have:**

- Core shape primitives: rectangle, circle, diamond, ellipse, line, arrow, free-draw
- Text elements with multiple font families (Virgil, Excalifont, Helvetica, Nunito, etc.)
- Arrow binding to connect shapes
- Labeled arrows for annotations
- Eraser tool for selective deletion
- Hand-drawn styling with roughjs rendering
- Infinite canvas with pan and zoom
- Undo/redo with complete history management
- Element selection, transformation (move, resize, rotate)
- Multi-element selection and group operations
- Copy/paste with clipboard integration
- Keyboard shortcuts for power users

**Should Have:**

- Advanced shapes (frames, embeddable content)
- Shape libraries for reusable templates
- Snapping and alignment guides
- Grid view for precision
- Element locking to prevent accidental edits
- Element z-index management
- Text wrapping and formatting
- Image embedding and manipulation
- Animation support (recent addition)

**Nice to Have:**

- Advanced path editing
- Custom shape creation
- Mermaid diagram conversion
- AI-powered diagram generation
- Text-to-diagram conversion

#### 2.2 Collaboration Features

**Must Have (excalidraw.com):**

- Real-time multiplayer editing
- End-to-end encryption for privacy
- Shareable links with read-only mode
- Presence indicators (cursors, user avatars)
- Conflict resolution for concurrent edits

**Should Have:**

- Collaborative cursors with user identification
- Comments and annotations
- Version history
- Permissions management

#### 2.3 Import/Export

**Must Have:**

- Export to PNG with transparent backgrounds
- Export to SVG for scalability
- Export to clipboard for quick sharing
- Native .excalidraw JSON format
- Import from .excalidraw files
- Import images into canvas

**Should Have:**

- Export to PDF
- Batch export
- Export selected elements only
- Import from various image formats
- Library import/export

#### 2.4 Customization & Extensibility

**Must Have:**

- Theme support (light/dark mode)
- Localization (i18n) for multiple languages
- UI customization options via props
- Custom font support
- Programmable API for integrators

**Should Have:**

- Plugin system for extensions
- Custom render hooks
- Event system for integrations
- Headless mode for server-side rendering

### 3. Non-Functional Requirements

#### 3.1 Performance

**Requirements:**

- Initial load time < 2 seconds on 3G connection
- Render 1000+ elements at 60fps
- Canvas operations (pan, zoom) feel instant (<16ms frame time)
- Collaboration latency < 200ms for most operations
- Bundle size < 1MB (gzipped) for core library

**Optimization Strategies:**

- Code splitting and lazy loading
- Canvas rendering optimizations (dirty rectangles, offscreen rendering)
- Worker threads for heavy computations
- Efficient data structures (spatial indexing)
- Memoization for expensive operations

#### 3.2 Accessibility

**Requirements:**

- WCAG 2.1 Level AA compliance
- Keyboard navigation for all operations
- Screen reader support
- High contrast mode
- Customizable font sizes
- Focus indicators
- ARIA labels and semantic HTML

#### 3.3 Browser Compatibility

**Supported Browsers:**

- Chrome/Edge >= 70
- Firefox (latest)
- Safari >= 12
- Mobile browsers (iOS Safari, Chrome Mobile)

**Not Supported:**

- Internet Explorer
- Opera Mini
- KaiOS <= 2.5

#### 3.4 Security & Privacy

**Requirements:**

- End-to-end encryption for collaboration (excalidraw.com)
- No server-side data persistence without explicit user action
- CSP (Content Security Policy) compliance
- Input sanitization to prevent XSS
- Secure WebSocket connections for collaboration
- HTTPS-only for production deployments

#### 3.5 Data Persistence

**Local Storage:**

- Autosave to browser storage (IndexedDB)
- Recovery from unexpected closures
- Version migration for schema changes

**Cloud Storage (excalidraw.com):**

- Firebase integration for shareable links
- Encrypted storage for collaborative sessions
- Configurable retention policies

### 4. Technical Requirements

#### 4.1 Technology Stack

**Core Technologies:**

- React 19.x for UI components
- TypeScript 4.9.x for type safety
- Jotai for state management
- roughjs for hand-drawn rendering
- perfect-freehand for drawing tools
- Vite for build system (app)
- esbuild for package bundling

**Supporting Libraries:**

- @radix-ui for accessible UI primitives
- pako for compression
- nanoid for ID generation
- fractional-indexing for element ordering
- browser-fs-access for file operations

#### 4.2 Build & Development

**Build Targets:**

- ESM modules for npm package
- Development and production bundles
- CSS extraction with SCSS preprocessing
- Type definitions (.d.ts files)

**Development Tools:**

- Vitest for unit testing
- ESLint for code quality
- Prettier for formatting
- Husky for git hooks
- TypeScript for type checking

#### 4.3 Package Architecture

**Monorepo Structure:**

- `packages/excalidraw` - Main React component library
- `packages/common` - Shared utilities and constants
- `packages/element` - Element-related logic
- `packages/math` - Mathematical operations
- `packages/utils` - Utility functions
- `excalidraw-app` - Web application

**Dependency Rules:**

- Common layer has no dependencies on other packages
- Math depends only on common
- Element depends on common and math
- Excalidraw depends on all packages
- App depends on excalidraw package

### 5. User Personas & Use Cases

#### Primary Personas

**1. Software Developer (Integrator)**

- **Goal:** Embed Excalidraw in their application
- **Needs:** Clean API, TypeScript support, customization options
- **Use Cases:** Documentation tools, design software, educational platforms

**2. Visual Thinker (End User)**

- **Goal:** Create diagrams and wireframes quickly
- **Needs:** Intuitive UI, hand-drawn aesthetic, quick exports
- **Use Cases:** Architecture diagrams, wireframes, brainstorming, meeting notes

**3. Remote Team (Collaborators)**

- **Goal:** Collaborate on visual ideas in real-time
- **Needs:** Low latency, privacy, presence awareness
- **Use Cases:** Design reviews, sprint planning, workshops

**4. Educator/Student**

- **Goal:** Create visual learning materials or notes
- **Needs:** Simple interface, export options, offline support
- **Use Cases:** Lecture diagrams, study notes, concept maps

#### Key Use Cases

1. **Quick Sketch Creation**

   - User opens excalidraw.com
   - Draws shapes and annotations
   - Exports to PNG for sharing

2. **Collaborative Design Session**

   - User creates shareable link
   - Team joins and edits together
   - Changes sync in real-time with encryption

3. **Application Integration**

   - Developer installs npm package
   - Embeds component with custom configuration
   - Handles events and data persistence

4. **Documentation Enhancement**
   - Technical writer creates architecture diagram
   - Exports to SVG for documentation
   - Maintains .excalidraw source for future edits

### 6. Roadmap & Future Directions

#### Short-Term (Current Development)

- Animation support (recently added)
- Enhanced frame functionality
- Improved element binding visuals
- Performance optimizations for large canvases
- Accessibility improvements

#### Medium-Term

- Plugin system for extensibility
- Advanced text editing features
- Enhanced collaboration features
- Mobile app (iOS/Android)
- Template marketplace

#### Long-Term

- AI-assisted drawing and layout
- Advanced shape recognition
- Real-time voice/video integration
- Self-hosted collaboration server option
- Desktop application (Electron)

### 7. Quality Standards

**Code Quality:**

- TypeScript strict mode enabled
- ESLint with no warnings
- Prettier formatting enforced
- 60%+ code coverage for critical paths
- Pre-commit hooks for validation

**Documentation:**

- JSDoc comments for public APIs
- README files for each package
- API documentation (docs.excalidraw.com)
- Contribution guidelines
- Migration guides for breaking changes

**Testing:**

- Unit tests for business logic
- Integration tests for critical flows
- Visual regression tests for UI
- Performance benchmarks
- Accessibility audits

### 8. Constraints & Limitations

**Technical Constraints:**

- Browser canvas API limitations
- Memory constraints for very large diagrams (1000s of elements)
- WebRTC limitations for collaboration scaling
- Bundle size constraints for npm package

**Design Constraints:**

- Must maintain hand-drawn aesthetic
- Cannot compromise on privacy/encryption
- Must work offline (PWA requirement)

**Resource Constraints:**

- Open-source project with volunteer contributors
- Limited resources for comprehensive QA
- Balancing feature requests with maintenance

### 9. Success Criteria

**Launch Criteria (v1.0):**

- Core drawing features complete
- Export/import functionality working
- TypeScript definitions accurate
- Documentation published
- npm package published
- Zero critical bugs

**Ongoing Success Metrics:**

- Community engagement (GitHub stars, contributors)
- Integration examples from third parties
- Performance benchmarks maintained
- Security audit completion
- Accessibility compliance certification

## Integration Examples

Excalidraw is successfully integrated in:

- **Google Cloud** - Architecture diagrams
- **Meta** - Internal tooling
- **CodeSandbox** - Embedded editor
- **Obsidian** - Note-taking plugin
- **Replit** - Collaborative IDE
- **Notion** - Visual content blocks
- **HackerRank** - Problem visualization

This demonstrates the product's versatility and production-readiness across diverse use cases.
