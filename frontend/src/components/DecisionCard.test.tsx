import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import DecisionCard from "./DecisionCard";
import type { Decision } from "@/lib/timer";

const baseDecision: Decision = {
  id: "decision-1",
  title: "Pick a launch date",
  description: null,
  timerDuration: 3600,
  timerStartedAt: "2026-06-14T12:00:00.000Z",
  timerPausedAt: null,
  timeElapsedBeforePause: 0,
  status: "running",
  outcome: null,
  createdAt: "2026-06-14T12:00:00.000Z",
  updatedAt: "2026-06-14T12:00:00.000Z",
};

function renderCard(decision: Decision) {
  render(
    <MemoryRouter>
      <DecisionCard decision={decision} />
    </MemoryRouter>
  );
}

describe("DecisionCard", () => {
  it("shows decision tags and note count", () => {
    renderCard({
      ...baseDecision,
      tags: [
        {
          id: "tag-1",
          userId: "user-1",
          name: "Work",
          color: "#2563eb",
          isSystem: false,
        },
      ],
      noteCount: 3,
    });

    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("3 notes added")).toBeInTheDocument();
  });

  it("shows empty metadata when no tags or notes have been added", () => {
    renderCard({ ...baseDecision, tags: [], noteCount: 0 });

    expect(screen.getByText("No tags")).toBeInTheDocument();
    expect(screen.getByText("No notes added yet")).toBeInTheDocument();
  });
});
