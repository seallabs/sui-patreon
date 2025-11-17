## Before Coding

**MUST** ask clarifying questions before implementation.

**MUST** learn @docs/sui/move.md if require coding for Move language / smartcontracts.

**MUST** learn @docs/sui/suins.md if require coding for SuiNS.

**MUST** learn @docs/sui/zkLogin.md if require coding for zkLogin.

**MUST** learn @docs/sui/seal.md if require coding for Seal.

**MUST** learn @docs/sui/walrus.md if require coding for Walrus.

**SHOULD** draft and confirm approach for complex work before coding.

**SHOULD** list pros/cons if multiple approaches exist.

---

## SOLID Principles

**MUST** follow SOLID in all code:

- **Single Responsibility**: One class/function = one reason to change
- **Open/Closed**: Extend via composition/interfaces, not modification
- **Liskov Substitution**: Subtypes must honor base contracts
- **Interface Segregation**: Focused interfaces, no unused dependencies
- **Dependency Inversion**: Inject dependencies, depend on abstractions

**MUST NOT** create classes when functions suffice.

**MUST** inject dependencies, **MUST NOT** instantiate them directly.

**SHOULD** use composition over inheritance.

---

## Test-Driven Development

**MUST** follow TDD workflow:
1. Write failing test
2. Implement minimum code to pass
3. Refactor
4. Run full test suite

**MUST** write tests for:
- All new functionality
- Bug fixes (regression tests)
- Edge cases and error conditions

**MUST NOT** commit without passing tests.

---

## Code Quality

**MUST** run before committing:
```bash
npm test          # Full test suite
npm run lint      # Linting
npm run typecheck # Type checking
npm run format    # Code formatting
```

**MUST** use existing domain vocabulary in naming.

**MUST** write self-documenting code with clear names.

**SHOULD** prefer simple, composable, testable functions.

**MUST NOT** break existing features.

---

## Frontend Changes

**MUST** use Playwright MCP to verify frontend implementation.

**MUST** test:
- User flows end-to-end
- Responsive design across viewports
- Accessibility (ARIA labels, keyboard navigation)
- Loading states and error handling

**SHOULD** create Playwright tests for critical user paths.

---

## New Technology Protocol

**MUST** search for documentation BEFORE implementing:
- Official docs and API reference
- Common usage patterns
- Example implementations
- Known limitations

**MUST NOT** start coding with unfamiliar tech without research.

---

## Tech Stack

### Languages & Frameworks
- [Add your stack: e.g., TypeScript, React, Spring Boot, Rust]

### Testing
- Unit: [e.g., Jest, JUnit]
- E2E: Playwright
- Integration: [e.g., Testcontainers]

### Tools
- Build: [e.g., npm, gradle]
- Lint: [e.g., ESLint, Clippy]
- Format: [e.g., Prettier, rustfmt]

---

## Project Structure

```
/src
  /components   # UI components
  /features     # Feature modules
  /services     # Business logic
  /interfaces   # Contracts/abstractions
  /utils        # Shared utilities
/tests
  /unit
  /integration
  /e2e          # Playwright tests
```

---

## Commands

```bash
npm run dev           # Start dev server
npm test              # Run all tests
npm run lint          # Lint code
npm run typecheck     # Check types
npm run format        # Format code
npm run build         # Production build
npx playwright test   # E2E tests
```

---

## Workflow

### Implementation
1. Ask clarifying questions
2. Research new tech (search docs first)
3. Write failing test (TDD)
4. Implement minimum code
5. Verify: tests + lint + typecheck
6. Playwright verification (frontend)
7. Refactor
8. Self-review against checklist

### Bug Fix
1. Create failing test reproducing bug
2. Fix implementation
3. Verify test passes + no regression
4. Run full test suite