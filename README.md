# ContractLens AI — Understand Before You Sign

Unified AI Contract Intelligence Ecosystem for analyzing **Rental Agreements**, **Loan Agreements**, **Employment Contracts**, and **Gig-Work / Delivery Partner Terms**.

## Architecture & Folder Structure

```text
ContractLens-AI/
├── frontend/          # Unified SPA web interface + embeddable partner SDK (widget.js)
├── backend/           # Node.js HTTP server, REST API, persistence, comparison & reminder engines
├── ai/                # Core Contract Intelligence Engine (analyzer, Risk DNA, combined clauses, Q&A, translator, voice, sparring)
├── documents/         # Native PDF/DOCX/TXT parser and persistent local audit/reminder vault
├── sample_contracts/  # Realistic Indian (₹ INR) & global ($ USD) demo agreements
├── extensions/        # Loadable Chrome/Edge Manifest V3 Browser Assistant extension
├── shared/            # Shared ecosystem constants & helpers
├── tests/             # End-to-end ecosystem verification & accuracy benchmark suites
├── package.json       # Node.js (>=20) manifest — zero external npm dependencies required
└── .env.example       # Optional environment configuration
```

## Quick Start (Node.js 20+)

```bash
cd ContractLens-AI
node backend/server.js
```

Then open **http://127.0.0.1:3000** in your browser.

## Verification & Accuracy Benchmark

```bash
npm test        # Full 9-idea ecosystem verification
npm run benchmark  # Unseen fair vs. predatory contract accuracy & anti-hallucination benchmark
```

> **Note:** ContractLens AI runs on native Node.js with zero external npm or Python packages required (no `requirements.txt` needed). It provides informational decision-support analysis and does not replace professional legal advice.
