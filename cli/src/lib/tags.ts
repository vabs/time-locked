export interface CliTag {
  id: string;
  name: string;
}

export function resolveTagIds(inputs: string[], tags: CliTag[]): string[] {
  return inputs.map((input) => resolveTagId(input, tags));
}

function resolveTagId(input: string, tags: CliTag[]): string {
  const direct = tags.find((tag) => tag.id === input);
  if (direct) return direct.id;

  const byName = tags.filter((tag) => tag.name === input);
  if (byName.length === 1) return byName[0].id;

  if (byName.length > 1) {
    throw new Error(`Tag "${input}" is ambiguous. Use the tag ID.`);
  }

  const available = [...new Set(tags.map((tag) => tag.name))].sort().join(", ");
  throw new Error(`Unknown tag "${input}". Available tags: ${available}`);
}
