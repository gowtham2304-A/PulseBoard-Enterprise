/**
 * Central Task ID Parser for PulseBoard.
 * Parses explicit [PB-<TASK_ID>] prefixes from commit messages.
 * 
 * @param {string} commitMessage - Raw commit message string
 * @returns {{ hasTaskId: boolean, taskId: string | null, cleanMessage: string, rawTag: string | null }}
 */
export function parsePulseBoardTaskId(commitMessage) {
  if (typeof commitMessage !== 'string' || !commitMessage.trim()) {
    return {
      hasTaskId: false,
      taskId: null,
      cleanMessage: typeof commitMessage === 'string' ? commitMessage : '',
      rawTag: null
    };
  }

  const trimmed = commitMessage.trim();

  // Matches [PB-<TASK_ID>] case-insensitively
  const match = trimmed.match(/\[PB-([a-zA-Z0-9_-]+)\]/i);

  if (!match) {
    return {
      hasTaskId: false,
      taskId: null,
      cleanMessage: trimmed,
      rawTag: null
    };
  }

  const rawTag = match[0]; // e.g. "[PB-1786355615318]" or "[PB-task-101]"
  const extractedId = match[1].trim(); // e.g. "1786355615318" or "task-101"

  if (!extractedId) {
    return {
      hasTaskId: false,
      taskId: null,
      cleanMessage: trimmed,
      rawTag: null
    };
  }

  // Remove [PB-...] tag from commit message to produce cleanMessage for AI analysis
  const cleanMessage = trimmed
    .replace(rawTag, '')
    .replace(/^\s*:\s*/, '') // Clean leftover leading colon if any (e.g. "[PB-123]: feat" -> "feat")
    .replace(/\s+/g, ' ')
    .trim();

  return {
    hasTaskId: true,
    taskId: extractedId,
    cleanMessage: cleanMessage || trimmed,
    rawTag
  };
}
