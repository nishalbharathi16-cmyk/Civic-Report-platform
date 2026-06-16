# Community Issue Tracker — PRD Generator

A Node.js project that generates a polished **Product Requirements Document (PRD)** Word (`.docx`) file for **Community Issue Tracker v2.0** — an AI-powered civic reporting platform with built-in AI image authenticity detection.

## What it produces

Running this project generates a multi-section Word document with:

- Cover page with project metadata table
- Executive Summary
- Problem Statement & Key Innovation (AI image authenticity)
- Three User Personas (Citizen, Municipality Officer, Super Admin)
- AI Agent Build Strategy (v0.dev / Bolt.new prompting guide)
- AI Image Detection — Core Feature (flow, states, APIs, sample requests/responses)
- Feature Requirements (Citizen Portal / Admin Dashboard / Super Admin Panel)
- Step-by-step User Flows for all three roles
- Technical Architecture (tech stack, ASCII diagram, data schemas, API endpoints)
- Team Roles + 12-hour Sprint Plan
- Demo Script for judges
- Risks & Mitigations
- Future Scope

The document uses a custom blue/grey color palette, styled tables, code blocks, section boxes, bullet/numbered lists, and divider rules — all built via the [`docx`](https://www.npmjs.com/package/docx) library.

## Project layout

```
community-issue-tracker-prd/
├── package.json          # npm manifest — declares the docx dependency
├── generate-prd.js       # The script that builds the .docx file
├── README.md             # This file
└── node_modules/         # Installed dependencies (after `npm install`)
```

## Requirements

- Node.js 16+ (tested on Node 18 / 20)
- npm

## Setup

```bash
cd community-issue-tracker-prd
npm install
```

This installs the `docx` library (v8.x).

## Generate the document

```bash
npm start
# or
node generate-prd.js
```

By default, the `.docx` file is written to:

```
/home/z/my-project/download/Community_Issue_Tracker_PRD_v2.docx
```

You can override the output directory by setting the `OUTPUT_DIR` environment variable:

```bash
OUTPUT_DIR=./out node generate-prd.js
```

The script will create the directory if it does not already exist.

## Customizing

The script is organized into clearly-labeled sections inside the `sections[0].children` array of the `Document` constructor. Helper functions at the top of the file make it easy to extend:

| Helper | Purpose |
|--------|---------|
| `h1(text)` | Top-level section heading with blue accent bar |
| `h2(text)` / `h3(text)` | Sub-headings |
| `para(text, opts)` | Body paragraph |
| `bullet(text)` / `numbered(text)` | List items |
| `tbl(headers, rows, colWidths, headerFill?)` | Styled table with alternating row shading |
| `sectionBox(emoji, title, subtitle)` | Highlighted callout box for sub-sections |
| `code(text)` | Monospace code line with light-grey background |
| `badge(text, fillColor, textColor?)` | Inline colored badge |
| `divider()` | Horizontal rule |
| `gap(n?)` | Vertical spacing paragraph |

Colors are centralized in the `C` object near the top of the file — change them once to retheme the entire document.

## Tech stack used by this generator

- **Node.js** — runtime
- **docx** — programmatic `.docx` generation (no Word required)

## License

MIT
