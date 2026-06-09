interface VisibleTag {
  id: string;
  userId: string | null;
}

export function getAuthorizedTagIds(
  userId: string,
  requestedTagIds: string[],
  visibleTags: VisibleTag[]
): string[] {
  const uniqueRequestedIds = [...new Set(requestedTagIds)];
  const visibleIds = new Set(
    visibleTags
      .filter((tag) => tag.userId === null || tag.userId === userId)
      .map((tag) => tag.id)
  );

  if (uniqueRequestedIds.some((tagId) => !visibleIds.has(tagId))) {
    throw new Error("Invalid tag selection");
  }

  return uniqueRequestedIds;
}
