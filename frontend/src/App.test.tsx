import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

let signedIn = false;
type ClerkChildren = { children: ReactNode };

vi.mock("@clerk/clerk-react", () => {
  return {
    SignedIn: ({ children }: ClerkChildren) => (signedIn ? <>{children}</> : null),
    SignedOut: ({ children }: ClerkChildren) => (!signedIn ? <>{children}</> : null),
    RedirectToSignIn: () => <div data-testid="sign-in-redirect">Redirect to sign in</div>,
    SignInButton: ({ children }: ClerkChildren) => <>{children}</>,
    SignUpButton: ({ children }: ClerkChildren) => <>{children}</>,
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
