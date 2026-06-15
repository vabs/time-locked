import type { Decision, Tag } from "../db/schema.js";

interface DecisionTagRow {
  decisionId: string;
  tag: Tag;
}

interface DecisionNoteCountRow {
  decisionId: string;
  noteCount: number;
}

export function buildDecisionListItems({
  decisions,
  tagRows,
  noteCountRows,
}: {
  decisions: Decision[];
  tagRows: DecisionTagRow[];
  noteCountRows: DecisionNoteCountRow[];
}) {
  const tagsByDecisionId = new Map<string, Tag[]>();
  for (const row of tagRows) {
    const decisionTags = tagsByDecisionId.get(row.decisionId) ?? [];
    decisionTags.push(row.tag);
    tagsByDecisionId.set(row.decisionId, decisionTags);
  }

  const noteCountsByDecisionId = new Map(
    noteCountRows.map((row) => [row.decisionId, Number(row.noteCount)])
  );

  return decisions.map((decision) => ({
    ...decision,
    tags: tagsByDecisionId.get(decision.id) ?? [],
    noteCount: noteCountsByDecisionId.get(decision.id) ?? 0,
  }));
}
