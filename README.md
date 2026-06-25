# RepoLens

**The Visual Architecture Mapper**

RepoLens is an interactive visualization and analysis tool designed to help developers, architects, and teams understand the structure and dependencies of GitHub repositories. By parsing codebases and generating interactive dependency graphs, RepoLens makes it easy to grasp complex architectures at a glance.

![RepoLens Preview](<img width="1482" height="1304" alt="image" src="https://github.com/user-attachments/assets/ca85fbc4-2465-4ad7-b1f7-80bc1ca936ad" />)
 

## Features

- **Interactive Architecture Graphs:** Visualize public or private GitHub repositories as node-edge dependency maps. Easily identify core components, bottlenecks, and dead code.
- **Deep AST Analysis:** Leverages sophisticated AST (Abstract Syntax Tree) parsing to track imports, exports, and relationships between files in real time.
- **AI-Powered Architecture Chat:** Talk to your repository. An integrated AI chatbot (powered by Google Gemini) understands your repository's structure and can answer questions about how components interact, explain complex modules, or suggest refactoring strategies.
- **Account & History Persistence:** Sign in with email or GitHub OAuth. Your past repository scans are permanently saved in a PostgreSQL database so you can revisit them anytime.
- **Comparison Mode:** Compare two versions of an architecture to track how dependencies evolve over time.
- **Export & Reports:** Generate and download PDF summaries of the repository's architecture.
- **Developer Integrations:** Connect RepoLens to your workflows via CI/CD gates, Slack Webhooks, or automated GitHub PR review comments.

## Tech Stack

RepoLens is structured as a modern monorepo using **Turborepo** and is built on the following technologies:

- **Frontend (`apps/web`):**
  - Framework: [Next.js](https://nextjs.org/) (App Router)
  - Language: TypeScript
  - Styling: Custom CSS & modern aesthetics
  - Visualization: [React Flow](https://reactflow.dev/) for interactive dependency graphing
- **Backend/Worker (`apps/worker`):**
  - Runtime: [Node.js](https://nodejs.org/) & Express
  - Task Queueing: [BullMQ](https://docs.bullmq.io/) + Redis
  - Database: PostgreSQL & [Prisma ORM](https://www.prisma.io/)
  - Analysis Engine: [ts-morph](https://ts-morph.com/) for deep TypeScript/JavaScript AST parsing
  - AI Engine: `@google/genai` (Gemini API)
- **Shared (`packages/shared`):**
  - Shared TypeScript interfaces, types, and DTOs ensuring end-to-end type safety.

## Project Structure

```text
repolens/
├── apps/
│   ├── web/         # Next.js frontend application
│   └── worker/      # Node.js analysis engine and API
├── packages/
│   └── shared/      # Shared types (RepoGraph, AuthUser, etc.)
└── package.json     # Turborepo root configuration
```

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Redis](https://redis.io/) (for BullMQ queues)
- A PostgreSQL database (e.g., local, Supabase, Neon)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sanyam2511/RepoLens.git
   cd RepoLens
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env` files in both `apps/web` and `apps/worker` referencing the `.env.example` templates.
   - **Worker:** Needs `DATABASE_URL`, `GEMINI_API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
   - **Web:** Needs the worker API endpoint URL.

4. **Database Setup:**
   Run the Prisma migrations to set up the PostgreSQL tables:
   ```bash
   cd apps/worker
   npx prisma generate
   npx prisma db push
   cd ../..
   ```

5. **Start the Development Servers:**
   Use the Turborepo command to spin up both the frontend and worker simultaneously:
   ```bash
   npm run dev
   ```
   - The Web UI will be available at: `http://localhost:3000`
   - The Worker API will be available at: `http://localhost:4000`

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request or open an issue.

## License
MIT License
