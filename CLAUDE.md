# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DFG Finance OS is a personal finance dashboard PWA (Progressive Web App) built as a **monolithic single-file app** (`daniel_finance_v6.html`). It is Spanish-language, PIN-protected, and integrates with Supabase for data persistence.

## Running the App

No build step. No package manager. No dependencies to install.

- **Local:** Open `daniel_finance_v6.html` directly in a browser
- **Production:** Deploy to any static host with HTTPS (required for PWA/Service Worker)
- Chart.js is loaded via CDN; Supabase client is loaded via CDN

## Architecture

### Single-File Structure

All HTML, CSS, and JavaScript live in `daniel_finance_v6.html` (~1859 lines). There is no build pipeline, no module bundler, and no framework.

### State Management

A global `DB` object is the single source of truth for all financial data:
- `DB.all` — all transactions
- `DB.income` / `DB.expenses` / `DB.real_exp` — filtered subsets
- `DB.balances` — monthly balance snapshots
- `DB.monthly` — aggregated monthly data (income, expenses, savings)
- `DB.curBal` — current net worth

On data load, transactions are grouped by month, charts are rebuilt, and all sections re-render via direct DOM manipulation.

### Supabase Integration

Data is persisted in Supabase (PostgreSQL). Two tables:
- `transactions` — all financial transactions
- `monthly_balance` — month-by-month historical snapshots

Helper functions `sbPost`, `sbDelete`, `sbGet` wrap Supabase API calls. No SDK install needed — CDN loaded.

### Balance Calculation Logic

- `SNAPSHOT_DATE` (currently March 14, 2026) divides historical vs. live data
- Historical balances before snapshot come from `monthly_balance` table
- Post-snapshot balance is calculated live from diary entries

### Authentication

PIN-based auth using SHA-256. The PIN hash is stored in the `PIN_HASH` constant. Authentication flag stored in `sessionStorage.dfg_auth`. Default PIN: `2612`.

To change PIN: hash the new 4-digit PIN with SHA-256 and replace `PIN_HASH` in the file.

### App Sections

| Section | Description |
|---|---|
| Home | Net worth KPIs, progress to $50M goal |
| 01 Overview | Monthly net worth chart, salary/Affirm timeline |
| 02 Flujo | Cash flow: income vs. expenses vs. savings |
| 03 Gastos | Spending by category, top transactions |
| 04 Proyección | Goal projection with 3 scenarios, adjustable APY/target sliders |
| 05 Diario | Live transaction entry with Supabase sync |
| 06 Mes Perfecto | Real vs. optimal spending, financial score, counterfactual analysis |
| 07 Portafolios | Monte Carlo simulation (Conservative / Moderate / Aggressive) |
| Calculadora | Compound interest calculator |
| Insights | Dynamic spending/savings insights |

### Key Implementation Details

- **Monte Carlo** uses Box-Muller transform for normally-distributed random numbers
- **Counterfactual analysis** computes net worth if spending always matched the $232K/month optimal
- **Percentile bands** P10/P50/P90 shown in portfolio projections
- **CSV export** available for transaction history
- **Offline support** via `sw.js` Service Worker (cache-first for static assets, network-first for Supabase/Fonts)

## GitHub Actions

- `.github/workflows/claude.yml` — responds to `@claude` mentions in issues and PRs
- `.github/workflows/claude-code-review.yml` — automatic code review on PR open/sync

## PWA

- `manifest.json` — app manifest (name: "DFG Finance OS", lang: `es`, dark theme)
- `sw.js` — Service Worker with cache name `dfg-v6`; caches HTML, manifest, icons
- `icon-192.png` / `icon-512.png` — maskable PWA icons
