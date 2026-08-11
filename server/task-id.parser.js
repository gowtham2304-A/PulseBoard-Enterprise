/**
 * Central Task ID Parser for PulseBoard.
 * Parses explicit task keys/IDs from commit messages (e.g. [PLS-953]).
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

  // Matches [PLS-953], [PLS-101], [task-123], or legacy [PB-...] bracketed tags
  const match = trimmed.match(/\[(PLS-\d+|PLS-[a-zA-Z0-9_-]+|task-[a-zA-Z0-9_-]+|PB-[a-zA-Z0-9_-]+)\]/i);

  if (!match) {
    return {
      hasTaskId: false,
      taskId: null,
      cleanMessage: trimmed,
      rawTag: null
    };
  }

  const rawTag = match[0]; // e.g. "[PLS-953]"
  let extractedId = match[1].trim(); // e.g. "PLS-953"

  // Strip legacy PB- prefix if present
  if (/^PB-/i.test(extractedId)) {
    extractedId = extractedId.replace(/^PB-/i, '');
  }

  if (!extractedId) {
    return {
      hasTaskId: false,
      taskId: null,
      cleanMessage: trimmed,
      rawTag: null
    };
  }

  // Remove bracketed tag from commit message to produce cleanMessage for AI analysis
  const cleanMessage = trimmed
    .replace(rawTag, '')
    .replace(/^\s*:\s*/, '') // Clean leftover leading colon if any (e.g. "[PLS-953]: feat" -> "feat")
    .replace(/\s+/g, ' ')
    .trim();

  return {
    hasTaskId: true,
    taskId: extractedId,
    cleanMessage: cleanMessage || trimmed,
    rawTag
  };
}
