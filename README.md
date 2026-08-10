# ⚡ PulseBoard Enterprise — Autonomous AI Engineering Board

> **An Enterprise-Grade Autonomous Engineering Management Platform powered by Google Gemini LLM, Git Stream Polling, and Real-Time Code Diff Analysis.**

🌐 **Live Demo (Frontend)**: [https://pulse-board-enterprise-phi.vercel.app/](https://pulse-board-enterprise-phi.vercel.app/)  
⚙️ **Production Backend API**: [https://pulseboard-enterprise.onrender.com/api](https://pulseboard-enterprise.onrender.com/api)  
📦 **GitHub Repository**: [gowtham2304-A/PulseBoard-Enterprise](https://github.com/gowtham2304-A/PulseBoard-Enterprise)

---

## 💡 The Core Problem & Our Solution

In traditional software organizations, developers spend **20% to 30% of their workday manually updating Jira tickets**, dragging cards across columns, writing standup reports, and logging hours. Because developers prioritize writing code over manual record-keeping, engineering boards quickly become outdated, forcing managers to micro-manage.

**PulseBoard Enterprise** replaces manual status updates with **Autonomous AI Intelligence**:
- Developers **stay inside VS Code / Git terminal and push code** via standard `git push`.
- PulseBoard's background poller feeds raw code diffs to **Google Gemini LLM**.
- The AI autonomously analyzes functional intent, advances task columns (**TO DO ➔ IN PROGRESS ➔ IN REVIEW ➔ DONE**), flags security bypasses (**RECONSIDERATION**), and updates audit logs in real time.

---

## ✨ Core Platform Capabilities

### 📋 1. Task Requirements & Source Readiness Checklist
- Integrated Source Readiness Checklist inside every task card modal.
- Automatically tracks and verifies **6 critical input sources** before execution/AI analysis:
  1. `Git Repository Connection`
  2. `Technical Specifications`
  3. `Acceptance Criteria`
  4. `Developer Assignment`
  5. `Deadline Configuration`
  6. `Task Scope Description`
- Features interactive manual toggles with real-time **MongoDB Cloud persistence** and visual readiness progress indicators.

### 🔍 2. Section-Level Search & Multi-Dimensional Faceted Filters
- Multi-dimensional Faceted Filtering Engine integrated directly into the top navigation bar.
- Allows engineering managers to slice real-time task data across 4 dimensions simultaneously:
  - **Status Filter**: `To Do`, `In Progress`, `In Review`, `Done`, `Reconsideration`.
  - **Category Section**: `Frontend`, `Backend`, `Security`, `Database`, `Feature`.
  - **Developer Owner**: Filter by team member assignment (`Gowtham`, `Khidmat`, `Vansh`).
  - **Missing-Data Risk Flags**: `Missing Sources (< 6/6)`, `Overdue Deadlines`, `Inactive Developers (10h+)`.
- Features full-text search and a one-click **"Reset All Filters"** action button.

### 📊 3. Executive & Task-Level Audit Report Exporter
- Compliance report exporter supporting **3 export formats**:
  - **📄 PDF Audit Report**: Opens a print-formatted, styled document window ready for instant PDF saving/printing.
  - **🌐 HTML Interactive Report**: Bundles executive team velocity, completion rates, deadline tracking, source readiness, and AI reasoning.
  - **📊 CSV Spreadsheet**: Formatted tabular export for spreadsheet analysis.

### 🧠 4. Google Gemini LLM Code Diff Analyzer
- High-level functional goal matching comparing commit diffs against task descriptions.
- Distinguishes draft setup commits (`IN PROGRESS`) from fully implemented features (`DONE`).
- **Automated Security Shield**: Detects hardcoded secrets, authentication bypasses, or missing security headers, instantly shifting tasks to **`RECONSIDERATION`** with red security warning flags.

### ⏰ 5. Interactive Deadline Alert Popup Modal
- Replaces static notification banners with a high-impact modal popup.
- **For Managers**: Groups overdue/urgent tasks **by Employee Name** (`Employee: Khidmat`, `Employee: Vansh`), providing clear oversight of team bottlenecks.
- **For Developers**: Displays urgent personal deadline alerts upon switching user or logging in.

### 🔌 6. Multi-Provider Source Control (GitHub & GitLab)
- Support for both **GitHub** and **GitLab** webhooks & polling adapters.
- Custom Source Control Connection Modal to switch repository providers seamlessly.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | React 18, Vite, Tailwind CSS, Plus Jakarta Sans, Lucide Icons |
| **Backend API** | Node.js, Express.js |
| **AI Intelligence** | Google Gemini Generative AI (`@google/generative-ai`) |
| **Database** | MongoDB Atlas, Mongoose ORM |
| **Integrations** | GitHub REST API, GitLab REST API, Webhooks |
| **Deployment** | Vercel (Frontend), Render (Backend API) |

---

## 🚀 Quick Start — Local Setup Guide

### 1. Prerequisites
- Node.js (v18.x or higher)
- Git
- MongoDB Atlas Connection URI or local MongoDB instance
- Google Gemini API Key

### 2. Clone the Repository
```bash
git clone https://github.com/gowtham2304-A/PulseBoard-Enterprise.git
cd PulseBoard-Enterprise
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_google_gemini_api_key
VITE_API_BASE_URL=http://localhost:5000/api
```

### 5. Run the Application
Start both the Express backend server and Vite frontend concurrently:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:3000` (or `http://localhost:5173`)
- **Backend API**: `http://localhost:5000/api`

---

## 📁 Repository Structure

```
PulseBoard-Enterprise/
├── server/
│   ├── analyzer/         # Gemini LLM Diff Analyzer Engine
│   ├── integrations/     # GitHub & GitLab Provider Clients
│   ├── server.js         # Express Server & Route Handlers
│   ├── poller.js         # Git Commit Background Poller
│   ├── pipeline.js       # Commit Processing Pipeline
│   └── store.js          # Mongoose Schemas & Database Operations
├── src/
│   ├── components/       # Enterprise React UI Components
│   │   ├── KanbanBoard.jsx
│   │   ├── TaskCard.jsx
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── DiffViewerModal.jsx
│   │   ├── TaskSourceChecklist.jsx   # Source Readiness Checklist
│   │   ├── ReportExportModal.jsx     # Executive PDF/HTML/CSV Export
│   │   ├── DeadlineAlertModal.jsx    # Interactive Alert Popup
│   │   ├── SourceControlModal.jsx    # GitHub/GitLab Connection
│   │   └── ManagerOverviewPanel.jsx
│   ├── data/             # Team & Default Board Data
│   ├── App.jsx           # Main Container & State Coordinator
│   └── index.css         # Plus Jakarta Sans Design Tokens
├── package.json
└── README.md
```

---

## 👥 Authors & Credits

Built with ❤️ by **Gowtham** and **Khidmat**.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
