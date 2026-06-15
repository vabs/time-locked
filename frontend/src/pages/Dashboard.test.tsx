import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
import type { Decision, Tag } from "@/lib/timer";

const mockGet = vi.fn();

vi.mock("@/lib/api", () => ({
  useApi: () => ({
    get: mockGet,
  }),
}));

const workTag: Tag = {
  id: "tag-work",
  userId: "user-1",
  name: "Work",
  color: "#2563eb",
  isSystem: false,
};

const personalTag: Tag = {
  id: "tag-personal",
  userId: "user-1",
  name: "Personal",
  color: "#16a34a",
  isSystem: false,
};

function decision(overrides: Partial<Decision>): Decision {
  return {
    id: "decision-1",
    title: "Decision",
    description: null,
    timerDuration: 3600,
    timerStartedAt: "2026-06-14T12:00:00.000Z",
    timerPausedAt: null,
    timeElapsedBeforePause: 0,
    status: "running",
    outcome: null,
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:00:00.000Z",
    tags: [],
    noteCount: 0,
    ...overrides,
  };
}

function setupApi() {
  const running = [
    decision({
      id: "later",
      title: "Later decision",
      timerDuration: 7200,
      tags: [workTag],
    }),
    decision({
      id: "sooner",
      title: "Sooner decision",
      timerDuration: 3600,
      timeElapsedBeforePause: 3300,
      status: "paused",
      tags: [personalTag],
    }),
  ];
  const paused: Decision[] = [];

  mockGet.mockImplementation((path: string) => {
    if (path === "/decisions?status=running") return Promise.resolve(running);
    if (path === "/decisions?status=paused") return Promise.resolve(paused);
    if (path === "/tags") return Promise.resolve([workTag, personalTag]);
    return Promise.reject(new Error(`Unexpected path: ${path}`));
  });
}

function renderDashboard(path = "/") {
  window.history.pushState({}, "", path);

  render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
}

describe("Dashboard filters and sorting", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-06-14T12:00:00.000Z"));
    mockGet.mockReset();
    setupApi();
  });

  it("loads tag and sort state from the URL", async () => {
    renderDashboard("/?tag=tag-personal&sort=timeRemaining");

    expect(await screen.findByText("Sooner decision")).toBeInTheDocument();
    expect(screen.queryByText("Later decision")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tag")).toHaveValue("tag-personal");
    expect(screen.getByLabelText("Sort")).toHaveValue("timeRemaining");
  });

  it("persists filter and sort changes in the URL", async () => {
    const user = userEvent.setup();
    renderDashboard("/");

    await screen.findByText("Later decision");
    await user.selectOptions(screen.getByLabelText("Tag"), "tag-work");
    await user.selectOptions(screen.getByLabelText("Sort"), "timeRemaining");

    expect(window.location.search).toBe("?tag=tag-work&sort=timeRemaining");
    expect(screen.getByText("Later decision")).toBeInTheDocument();
    expect(screen.queryByText("Sooner decision")).not.toBeInTheDocument();
  });

  it("orders decisions by time remaining from closest to farthest", async () => {
    const user = userEvent.setup();
    renderDashboard("/");

    await screen.findByText("Later decision");
    await user.selectOptions(screen.getByLabelText("Sort"), "timeRemaining");

    await waitFor(() => {
      const cards = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href")?.startsWith("/decisions/"));
      expect(within(cards[0]).getByText("Sooner decision")).toBeInTheDocument();
      expect(within(cards[1]).getByText("Later decision")).toBeInTheDocument();
    });
  });
});
