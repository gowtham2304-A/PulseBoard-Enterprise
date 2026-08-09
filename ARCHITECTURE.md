# PulseBoard Enterprise Architecture

## 1. Developer Git Client vs. Source-Control Server Architecture

PulseBoard Enterprise automatically analyzes software-development activity and updates project board tasks based on actual engineering work.

### Key Principle: Server-Level Integration

PulseBoard integrates with **Source Control Repositories / Servers** (e.g. GitHub, GitLab, Bitbucket, Azure Repos, Gerrit), **NOT** with individual developer Git GUI clients (e.g. TortoiseGit, GitKraken, SourceTree, VS Code, CLI Git).

- **Git Client**: Local desktop/terminal applications used by developers to stage, commit, and push code changes.
- **Source-Control Server**: Central server hosting the authoritative repository state, pull requests, and push event streams.
- **PulseBoard Integration**: Integrates directly with the source control server via REST APIs, Webhooks, or a future lightweight **PulseBoard Local Agent**. The developer's choice of Git client is completely transparent and irrelevant to PulseBoard.

---

## 2. Source Control Provider Abstraction Layer

PulseBoard's core task management engine and AI reviewer operate in total isolation from specific source control APIs.

```
                      PulseBoard Core
                             │
              Source Control Abstraction Layer
                             │
     ┌───────────────────────┼───────────────────────┐
     │                       │                       │
GitHubProvider         GitLabProvider         BitbucketProvider
(Current MVP)             (Future)                (Future)
     │                       │                       │
     └───────────────────────┼───────────────────────┘
                             │
                   NormalizedChangeEvent
                             │
                   PulseBoard Pipeline
                             │
                     AIAnalyzer (Gemini)
                             │
                     Task Board Updates
```

---

## 3. The Three-Layer Architecture

### Layer A: Provider Integration Layer
- **Responsibilities**: Authentication, HTTP REST API communications, Webhook listener endpoints, provider-specific response parsing and error handling.
- **Implementation**: `GitHubClient` and `GitHubProvider` located in `server/integrations/github/`.

### Layer B: Normalization Layer
- **Responsibilities**: Converts provider-specific raw payload formats into PulseBoard's strict internal `NormalizedChangeEvent`.
- **Implementation**: `provider.normalizeChange(rawChange, rawDetails)`.

### Layer C: PulseBoard Processing Layer
- **Responsibilities**: Task fetching from store, AI analysis orchestration, status transitions (`in_progress`, `review`, `done`, `reconsideration`), confidence calculation, database task & activity updates.
- **Implementation**: `PulseBoardPipeline` in `server/pipeline.js`.

---

## 4. Normalized Change Event Schema (`NormalizedChangeEvent`)

Internal PulseBoard contract consumed by the processing pipeline, AI analyzer, and database:

```typescript
interface NormalizedChangeEvent {
  provider: string; // "github" | "gitlab" | "bitbucket" | "azure_repos" | "gerrit" | "pulseboard_agent"
  repository: {
    id: string; // Unique repository identifier (e.g. "org/repo-name")
    name: string; // Repository name (e.g. "repo-name")
    url: string; // Repository web URL
  };
  change: {
    id: string; // Unique change identifier (SHA for Git, Change-ID for Gerrit)
    message: string; // Raw commit / change message
    author: {
      name: string; // Author name
      email: string; // Author email
    };
    timestamp: string; // ISO-8601 timestamp string
  };
  changes: Array<{
    path: string; // File relative path (e.g., "src/app.js")
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number; // Lines added
    deletions: number; // Lines deleted
    patch: string; // Unified diff snippet for the specific file
  }>;
  rawDiff?: string; // Aggregated diff snippet for LLM analysis
}
```

---

## 5. SourceControlProvider Interface

All provider implementations extend `SourceControlProvider` (`server/integrations/base.provider.js`):

- `getName()`: Returns provider string identifier (`'github'`, `'gitlab'`).
- `fetchChanges()`: Fetches recent commits/changes from repository server.
- `fetchChangeDetails(changeId)`: Fetches modified files and diff patches for a specific change ID.
- `normalizeChange(rawChange, rawDetails)`: Converts raw API data into `NormalizedChangeEvent`.

---

## 6. Decoupled AI Analyzer Interface

The AI analysis pipeline is isolated behind an `AIAnalyzer` interface (`server/analyzer/base.analyzer.js`).

- **Current Implementation**: `GeminiAnalyzer` (`server/analyzer/gemini.analyzer.js`) uses `@google/generative-ai` with Google Gemini 1.5 Flash, falling back to a pure Code AST & Content Structural Engine if no API key is set.
- **Future AI Models**: Can be swapped to Anthropic Claude, OpenAI GPT-4, or a PulseBoard Custom Fine-Tuned Model without modifying provider code or database pipelines.

---

## 7. Future Extension Strategy

### Implemented Providers (GitHub & GitLab)

1. **GitHub Provider**: `server/integrations/github/github.provider.js` (`SOURCE_CONTROL_PROVIDER=github`)
2. **GitLab Provider**: `server/integrations/gitlab/gitlab.provider.js` (`SOURCE_CONTROL_PROVIDER=gitlab`)

Both providers are registered in `server/providers/factory.js`. Adding a new provider (e.g. Bitbucket or Azure Repos) follows the exact same 2-file creation + factory registration pattern without modifying any core pipeline code.

### PulseBoard Agent Integration for Private / Firewalled Repositories

For self-hosted Git repositories (e.g., GitLab Self-Managed, Bitbucket Server, local bare Git repos behind enterprise firewalls):

1. A lightweight **PulseBoard Agent** daemon runs locally alongside the firewalled repository.
2. The agent monitors git push hooks (`post-receive` / `post-commit`).
3. The agent packages local commit diffs into PulseBoard's `NormalizedChangeEvent` schema.
4. The agent pushes the payload over HTTPS to PulseBoard's central `/api/agent/event` endpoint.
5. PulseBoard processes the event through the exact same processing pipeline.
