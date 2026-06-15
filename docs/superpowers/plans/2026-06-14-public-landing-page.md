# Public Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the signed-out root redirect with a professional public landing page while keeping authenticated app routes protected.

**Architecture:** Add a focused `LandingPage` component for signed-out visitors and move auth decisions into small route wrapper components in `App.tsx`. Use Vitest and Testing Library to verify the route behavior with mocked Clerk components.

**Tech Stack:** React 18, React Router, Clerk React, Tailwind CSS, lucide-react, Vitest, Testing Library.

---

## File Structure

- Modify `frontend/package.json` to add a `test` script and frontend test dependencies.
- Create `frontend/src/test/setup.ts` for Testing Library DOM matchers.
- Modify `frontend/vite.config.ts` to configure Vitest with jsdom.
- Create `frontend/src/App.test.tsx` for signed-in and signed-out route behavior.
- Create `frontend/src/pages/LandingPage.tsx` for public marketing/onboarding content.
- Modify `frontend/src/App.tsx` to render `LandingPage` at `/` for signed-out users and protect app-only routes.

## Task 1: Add Frontend Test Harness

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Add test dependencies and script**

Update `frontend/package.json` dev dependencies:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest run"
},
"devDependencies": {
  "@tailwindcss/typography": "^0.5.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/react": "^16.1.0",
  "@testing-library/user-event": "^14.5.2",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "@vitejs/plugin-react": "^4.0.0",
  "autoprefixer": "^10.0.0",
  "jsdom": "^25.0.1",
  "postcss": "^8.0.0",
  "tailwindcss": "^3.4.0",
  "typescript": "^5.0.0",
  "vite": "^8.0.16",
  "vite-plugin-pwa": "^0.21.0",
  "vitest": "^2.1.8"
}
```

- [ ] **Step 2: Add test setup file**

Create `frontend/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Configure Vitest**

Update `frontend/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Time Locked",
        short_name: "TimeLocked",
        description: "Lock decisions behind a timer for deliberate thinking",
        theme_color: "#4f46e5",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
```

- [ ] **Step 4: Run frontend tests**

Run: `npm test -w frontend`

Expected: Vitest starts successfully and reports no tests or existing passing tests.

## Task 2: Test Auth Routing

**Files:**
- Create: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing route tests**

Create `frontend/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

let signedIn = false;

vi.mock("@clerk/clerk-react", async () => {
  const React = await import("react");

  return {
    SignedIn: ({ children }: { children: React.ReactNode }) => (signedIn ? <>{children}</> : null),
    SignedOut: ({ children }: { children: React.ReactNode }) => (!signedIn ? <>{children}</> : null),
    RedirectToSignIn: () => <div data-testid="sign-in-redirect">Redirect to sign in</div>,
    SignInButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
    SignUpButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
    UserButton: () => <div data-testid="user-button" />,
  };
});

vi.mock("@/pages/Dashboard", () => ({
  default: () => <h1>Active Decisions</h1>,
}));

describe("App auth routing", () => {
  beforeEach(() => {
    signedIn = false;
    window.history.pushState({}, "", "/");
  });

  it("shows the public landing page at root for signed-out visitors", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /make fewer decisions in a rush/i })).toBeInTheDocument();
    expect(screen.queryByTestId("sign-in-redirect")).not.toBeInTheDocument();
  });

  it("shows the dashboard at root for signed-in visitors", () => {
    signedIn = true;

    render(<App />);

    expect(screen.getByRole("heading", { name: "Active Decisions" })).toBeInTheDocument();
  });

  it("redirects signed-out visitors from protected app routes to sign-in", () => {
    window.history.pushState({}, "", "/new");

    render(<App />);

    expect(screen.getByTestId("sign-in-redirect")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -w frontend -- App.test.tsx`

Expected: the first test fails because no public landing page exists and signed-out users still render `RedirectToSignIn`.

## Task 3: Implement Landing Page and Protected Routes

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create public landing page**

Create `frontend/src/pages/LandingPage.tsx` with polished marketing copy, Clerk sign-in/sign-up actions, and feature sections. Use only static content and no authenticated API calls.

- [ ] **Step 2: Update app routing**

Update `frontend/src/App.tsx` so `/` renders `LandingPage` for `SignedOut` and the dashboard layout for `SignedIn`. Wrap app-only routes in a `ProtectedRoute` that renders `RedirectToSignIn` when signed out.

- [ ] **Step 3: Run tests to verify GREEN**

Run: `npm test -w frontend -- App.test.tsx`

Expected: all route tests pass.

- [ ] **Step 4: Run production build**

Run: `npm run build -w frontend`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 5: Visually verify landing page**

Run: `npm run dev -w frontend -- --host 127.0.0.1`

Open the local URL in the in-app browser and verify the root page is professional, readable, responsive, and not a generic template.

## Task 4: Commit Implementation

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/App.test.tsx`
- Create: `frontend/src/pages/LandingPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Check status**

Run: `git status --short`

Expected: only the planned files are changed.

- [ ] **Step 2: Commit**

Run:

```bash
git add frontend/package.json frontend/vite.config.ts frontend/src/test/setup.ts frontend/src/App.test.tsx frontend/src/pages/LandingPage.tsx frontend/src/App.tsx docs/superpowers/plans/2026-06-14-public-landing-page.md
git commit -m "Add public landing page"
```

Expected: commit succeeds with the landing page implementation and plan.
