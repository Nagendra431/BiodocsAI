# 🏥 BioDocsAI – AI-Powered Medical Research & Document Platform

<p align="center">
  An AI-powered platform for medical document editing, intelligent research, and presentation generation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" />
</p>

## 📌 Overview

**BioDocsAI** is a full-stack AI-powered application designed to simplify medical research, document creation, and information management.

The platform combines AI-assisted research, multi-agent workflows, medical document editing, and presentation generation into a unified workspace.

It aims to make complex research and document workflows more accessible, organized, and efficient.

## ✨ Key Features

### 🔬 AI-Powered Medical Research
- AI-assisted research paper generation.
- Deep research using multiple research sources.
- Multi-agent research architecture.
- PubMed integration for medical literature discovery.
- Citation tracking and bibliography generation.

### 📝 Intelligent Document Editor
- Rich-text document editing.
- AI Medical Assistant.
- Generate research papers and case studies.
- Improve existing content and add citations.
- Save, download, and manage documents.

### 📊 AI Presentation Generation
- AI-powered presentation creation.
- Research source selection.
- Web, PubMed, and arXiv research integration.
- Editable presentation content and layouts.
- Presentation export capabilities.

### 📁 Document Management
- Centralized files dashboard.
- Save and retrieve generated documents.
- Search and manage saved files.
- Download and edit documents.

### 🤖 AI Integrations
- OpenAI-compatible AI providers.
- Cerebras integration.
- LangChain-based research workflows.
- Tavily-powered web research integration.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js 15, React 19 |
| Programming Language | TypeScript |
| Styling | Tailwind CSS |
| Database ORM | Prisma |
| Database / Storage | PostgreSQL, Supabase integrations |
| Authentication | NextAuth.js |
| AI Integration | AI SDK, OpenAI-compatible providers |
| AI Research | LangChain, Cerebras, Tavily |
| Rich Text Editor | Plate.js |
| UI Components | Radix UI |
| Animations | Framer Motion |
| State Management | Zustand |
| Version Control | Git, GitHub |

## 🏗️ Project Structure

```text
BioDocsAI/
├── migrations/       # Database migrations
├── prisma/           # Prisma database schema
├── public/           # Static assets
├── scripts/          # Setup and utility scripts
├── src/
│   ├── app/           # Application pages and API routes
│   ├── components/   # Reusable UI components
│   ├── lib/           # AI, research and application services
│   ├── states/        # Application state management
│   └── ...            # Supporting application modules
├── package.json
├── pnpm-lock.yaml
├── next.config.js
└── tsconfig.json
```

## ⚙️ Getting Started

### Prerequisites

- Node.js
- pnpm
- Required database configuration
- API credentials for the AI and research services you intend to use

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Nagendra431/BiodocsAI.git
cd BiodocsAI
```

**2. Install dependencies**

```bash
pnpm install
```

**3. Configure environment variables**

Create a `.env` file using the project's environment template and configure the required database, authentication, AI provider, and storage credentials.

Do not commit API keys or private credentials.

**4. Set up the database**

```bash
pnpm db:push
```

**5. Start the development server**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For detailed configuration, refer to [SETUP_GUIDE.md](SETUP_GUIDE.md).

## 📚 Technical Highlights

- Designed a multi-agent research workflow for generating structured research reports.
- Integrated PubMed literature search using NCBI E-utilities.
- Implemented multi-source research selection across Web, PubMed, and arXiv.
- Built AI-assisted document editing and content improvement workflows.
- Developed document persistence and file management capabilities.
- Integrated document and presentation export functionality.

## 🎯 Project Objective

To explore the practical application of Generative AI, multi-agent systems, and full-stack web development in medical research and document management.

## 👨‍💻 Developer

**M. Nagendra Prasad**

- GitHub: [@Nagendra431](https://github.com/Nagendra431)
- Project: [BioDocsAI](https://github.com/Nagendra431/BiodocsAI)

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ using Next.js, TypeScript and AI technologies.
</p>
