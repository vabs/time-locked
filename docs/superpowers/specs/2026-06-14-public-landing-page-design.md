# Public Landing Page Design

## Goal

Create a professional public landing page for signed-out visitors so the website explains Time Locked before asking for authentication. Signed-in users should continue to land directly on their dashboard.

## Current Behavior

`frontend/src/App.tsx` wraps the whole router in Clerk's `SignedIn` component and renders `RedirectToSignIn` for every signed-out visitor. This means `/` immediately redirects to Clerk instead of showing product context.

## Target Behavior

- Signed-out visitors at `/` see a public landing page.
- Signed-in visitors at `/` see the existing dashboard.
- Signed-out visitors who open app-only routes (`/new`, `/history`, `/settings`, `/decisions/:id`) are redirected to Clerk sign-in.
- Signed-in visitors can use app-only routes normally.
- Unknown routes resolve to `/`, where auth state determines whether the visitor sees the landing page or dashboard.

## Landing Page Content

The landing page should explain the project clearly and credibly:

- Time Locked is a decision journal that adds deliberate friction before action.
- The core loop is: write the decision, choose a lock duration, capture thoughts while time passes, and record the final outcome.
- The product is useful because many poor decisions happen quickly; waiting creates space for better judgment.
- Features to highlight: decision timers, notes during the waiting period, pause/resume, stopped decisions as archive, outcomes, tags, history, installable PWA, and push notifications.

## Visual Direction

The page should feel like a focused productivity product, not a generic SaaS template:

- Restrained, editorial layout with high information quality.
- Professional typography, compact sections, and strong spacing discipline.
- Avoid decorative gradient blobs, fake dashboards, cartoon visuals, or vague AI-style marketing copy.
- Use lucide icons where they add scanability.
- Use the existing Tailwind tokens and avoid introducing a new design system.

## Architecture

Add a new `LandingPage` component under `frontend/src/pages/LandingPage.tsx`. Keep route/auth orchestration in `frontend/src/App.tsx` by introducing small route wrapper components for public home and protected app routes.

`LandingPage` should depend only on React, Clerk auth actions, React Router if needed, and lucide icons. It should not call authenticated APIs.

## Testing

Add focused tests for route behavior:

- Signed-out `/` renders the landing page rather than redirecting to sign-in.
- Signed-in `/` renders the dashboard route.
- Signed-out protected routes render Clerk sign-in redirect behavior.

If the project does not already have a frontend test runner, add the smallest practical Vitest + Testing Library setup needed for these routing tests.

## Out of Scope

- Multi-page marketing site.
- Pricing, testimonials, analytics, newsletter capture, or SEO metadata beyond the existing app shell.
- Backend changes.
