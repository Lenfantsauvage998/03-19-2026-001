const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageBreak, LevelFormat, ExternalHyperlink
} = require('docx');
const fs = require('fs');

// ─── Colour palette ──────────────────────────────────────────────────────────
const C = {
  purple:   '7C5CFC',
  purple2:  'A78BFA',
  dark:     '0E0F15',
  mid:      '6B6D7E',
  border:   'E2E4F0',
  bg:       'F7F7FC',
  bgPurple: 'EDE9FF',
  black:    '1A1A2E',
  white:    'FFFFFF',
  green:    '16A34A',
  amber:    'B45309',
  red:      'DC2626',
};

// ─── Border helpers ───────────────────────────────────────────────────────────
const hairline = (color = C.border) => ({ style: BorderStyle.SINGLE, size: 1, color });
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' });
const allBorders = (color = C.border) => ({ top: hairline(color), bottom: hairline(color), left: hairline(color), right: hairline(color) });
const noAllBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() });

// ─── Text helpers ─────────────────────────────────────────────────────────────
const t = (text, opts = {}) => new TextRun({ text, font: 'Arial', size: opts.size || 22, ...opts });
const bold = (text, opts = {}) => t(text, { bold: true, ...opts });
const accent = (text, opts = {}) => t(text, { color: C.purple, bold: true, ...opts });
const muted = (text, opts = {}) => t(text, { color: C.mid, ...opts });
const code = (text) => new TextRun({ text, font: 'Courier New', size: 18, color: C.purple, highlight: 'yellow' });

// ─── Paragraph helpers ────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: C.black })],
  spacing: { before: 400, after: 160 },
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: C.purple })],
  spacing: { before: 320, after: 120 },
});
const h3 = (text) => new Paragraph({
  children: [new TextRun({ text, font: 'Arial', size: 22, bold: true, color: C.black })],
  spacing: { before: 200, after: 80 },
});
const p = (...runs) => new Paragraph({ children: runs, spacing: { before: 0, after: 120 } });
const gap = (size = 120) => new Paragraph({ children: [t('')], spacing: { before: 0, after: size } });
const bullet = (text, indent = 0) => new Paragraph({
  numbering: { reference: 'bullets', level: indent },
  children: [t(text, { size: 20 })],
  spacing: { before: 40, after: 40 },
});
const numberedItem = (text, indent = 0) => new Paragraph({
  numbering: { reference: 'numbers', level: indent },
  children: [t(text, { size: 20 })],
  spacing: { before: 40, after: 40 },
});
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const divider = () => new Paragraph({
  children: [t('')],
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border } },
  spacing: { before: 160, after: 160 },
});
const codeLine = (text) => new Paragraph({
  children: [new TextRun({ text, font: 'Courier New', size: 18, color: C.purple })],
  shading: { fill: 'F3F0FF', type: ShadingType.CLEAR },
  indent: { left: 360 },
  spacing: { before: 40, after: 40 },
});

// ─── Chip/badge cell ──────────────────────────────────────────────────────────
const chipCell = (label, color, bgColor, w = 1500) => new TableCell({
  borders: noAllBorders(),
  width: { size: w, type: WidthType.DXA },
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: label, font: 'Arial', size: 16, bold: true, color })],
    shading: { fill: bgColor, type: ShadingType.CLEAR },
  })],
});

// ─── Info card (shaded box) ───────────────────────────────────────────────────
const infoCard = (title, lines, fill = C.bgPurple) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  rows: [new TableRow({
    children: [new TableCell({
      borders: noAllBorders(),
      margins: { top: 200, bottom: 200, left: 280, right: 280 },
      shading: { fill, type: ShadingType.CLEAR },
      children: [
        new Paragraph({ children: [bold(title, { color: C.purple })], spacing: { before: 0, after: 80 } }),
        ...lines.map(l => new Paragraph({ children: [t(l, { size: 20 })], spacing: { before: 0, after: 40 } })),
      ],
    })],
  })],
});

// ─── Two-column row helper ────────────────────────────────────────────────────
const twoCol = (left, right, widths = [2800, 6560]) => new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: widths,
  rows: [new TableRow({
    children: [
      new TableCell({ borders: noAllBorders(), width: { size: widths[0], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 0, right: 160 }, children: [new Paragraph({ children: [bold(left, { color: C.purple, size: 20 })] })] }),
      new TableCell({ borders: noAllBorders(), width: { size: widths[1], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 0, right: 0 }, children: [new Paragraph({ children: [t(right, { size: 20 })] })] }),
    ],
  })],
});

// ─── Module reference table row ───────────────────────────────────────────────
const moduleRow = (num, name, desc, features, status) => {
  const statusColor = status === 'Incluido'   ? C.green
                    : status === 'Avanzado'   ? C.amber
                    : C.purple;
  const statusBg   = status === 'Incluido'   ? 'DCFCE7'
                    : status === 'Avanzado'   ? 'FEF3C7'
                    : 'EDE9FF';
  return new TableRow({
    children: [
      // #
      new TableCell({
        borders: allBorders(), width: { size: 500, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        verticalAlign: VerticalAlign.TOP,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold(num, { color: C.purple, size: 18 })] })],
      }),
      // Module name + desc
      new TableCell({
        borders: allBorders(), width: { size: 3000, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 80 },
        verticalAlign: VerticalAlign.TOP,
        children: [
          new Paragraph({ children: [bold(name, { size: 20 })] }),
          new Paragraph({ children: [t(desc, { size: 18, color: C.mid })], spacing: { before: 40, after: 0 } }),
        ],
      }),
      // Features
      new TableCell({
        borders: allBorders(), width: { size: 4360, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 80 },
        verticalAlign: VerticalAlign.TOP,
        children: features.map(f => new Paragraph({
          children: [t('· ', { color: C.purple, size: 18 }), t(f, { size: 18 })],
          spacing: { before: 20, after: 20 },
        })),
      }),
      // Status badge
      new TableCell({
        borders: allBorders(), width: { size: 1500, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        verticalAlign: VerticalAlign.TOP,
        shading: { fill: statusBg, type: ShadingType.CLEAR },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold(status, { color: statusColor, size: 18 })] })],
      }),
    ],
  });
};

// ─── Theme table row ──────────────────────────────────────────────────────────
const themeRow = (name, key, palette, display, body, mood, isHeader = false) => {
  if (isHeader) return new TableRow({
    tableHeader: true,
    children: ['Nombre', 'Key JSON', 'Color primario', 'Fuente Display', 'Fuente Cuerpo', 'Perfil de cliente'].map((h, i) => new TableCell({
      borders: allBorders(C.purple),
      shading: { fill: C.purple, type: ShadingType.CLEAR },
      width: { size: [1500,1200,1600,1500,1500,2060][i], type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 80 },
      children: [new Paragraph({ children: [bold(h, { color: C.white, size: 18 })] })],
    })),
  });
  return new TableRow({
    children: [name, key, palette, display, body, mood].map((val, i) => new TableCell({
      borders: allBorders(),
      width: { size: [1500,1200,1600,1500,1500,2060][i], type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 80 },
      children: [new Paragraph({ children: [t(val, { size: 18 })] })],
    })),
  });
};

// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT
// ═════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets',  levels: [{ level: 0, format: LevelFormat.BULLET,  text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 240 } } } }, { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 840, hanging: 240 } } } }] },
      { reference: 'numbers',  levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 300 } } } }] },
      { reference: 'numbers2', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 300 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, font: 'Arial', color: C.black }, paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: 'Arial', color: C.purple }, paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    children: [

      // ══════════════════════════════════════════════════════════════════════
      //  COVER PAGE
      // ══════════════════════════════════════════════════════════════════════
      gap(1200),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Finance OS', font: 'Arial', size: 72, bold: true, color: C.black })],
        spacing: { before: 0, after: 80 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Client Onboarding Guide', font: 'Arial', size: 48, color: C.purple })],
        spacing: { before: 0, after: 200 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Setup, personalization and module reference', font: 'Arial', size: 24, color: C.mid, italics: true })],
        spacing: { before: 0, after: 600 },
      }),
      new Table({
        width: { size: 4000, type: WidthType.DXA },
        columnWidths: [4000],
        rows: [new TableRow({ children: [new TableCell({
          borders: noAllBorders(),
          shading: { fill: C.bgPurple, type: ShadingType.CLEAR },
          margins: { top: 200, bottom: 200, left: 280, right: 280 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [bold('v1.0  ·  2026', { color: C.purple, size: 20 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [t('Confidential — Internal use only', { size: 18, color: C.mid })] }),
          ],
        })]})],
      }),
      pageBreak(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 0 — OVERVIEW
      // ══════════════════════════════════════════════════════════════════════
      h1('What is Finance OS?'),
      p(t('Finance OS is a single-file personal finance dashboard (PWA) deployed on GitHub Pages. Every customer gets their own private copy: a personalised app connected to their own Supabase database, protected by a PIN, and configurable entirely through one JSON file — no code changes required.')),
      gap(),
      infoCard('Architecture in one line', [
        'GitHub Pages (static HTML) → client.json (config) → Supabase (live data)',
        'One HTML file   ·   One JSON config   ·   One Supabase project per client',
      ]),
      gap(200),
      p(bold('What you need to deliver a new client app:')),
      bullet('30 minutes of setup time'),
      bullet('A GitHub account (free)'),
      bullet('A Supabase account (free tier is enough)'),
      bullet('The client\'s initial financial data (balances + transaction history)'),
      gap(80),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 1 — SUPABASE DATABASE
      // ══════════════════════════════════════════════════════════════════════
      h1('Step 1 — Create the Supabase Database'),
      h2('1.1  Create a new Supabase project'),
      numberedItem('Go to https://supabase.com and sign in.'),
      numberedItem('Click New Project.'),
      numberedItem('Choose a name (e.g. "finance-clientname"), pick a region close to your client, set a strong DB password and save it.'),
      numberedItem('Wait ~2 minutes for provisioning.'),
      gap(120),
      h2('1.2  Run the schema'),
      p(t('Open the Supabase '), bold('SQL Editor'), t(' (left sidebar) and paste the script below. Hit '), bold('Run'), t('. This creates the two tables the app uses:')),
      gap(80),
      infoCard('Clean schema — paste this verbatim, no client data included', [
        'transactions      — every income, expense, and transfer entry',
        'monthly_balance   — one snapshot row per month (net worth checkpoint)',
      ], 'F0FDF4'),
      gap(80),

      // SQL block
      ...[
        '-- Finance OS — Clean Schema',
        '-- Run in Supabase SQL Editor',
        '',
        'DROP TABLE IF EXISTS transactions CASCADE;',
        'DROP TABLE IF EXISTS monthly_balance CASCADE;',
        '',
        'CREATE TABLE transactions (',
        '  id          BIGSERIAL PRIMARY KEY,',
        '  created_at  TIMESTAMPTZ DEFAULT NOW(),',
        '  date        DATE        NOT NULL,',
        '  type        TEXT        NOT NULL',
        "             CHECK (type IN ('income','expense','transfer')),",
        '  amount      INTEGER     NOT NULL CHECK (amount >= 0),',
        "  category    TEXT        NOT NULL DEFAULT 'Other',",
        '  subcategory TEXT,',
        '  description TEXT,',
        "  account     TEXT        DEFAULT 'Main',",
        '  month       TEXT,',
        '  year        INTEGER',
        ');',
        '',
        'CREATE TABLE monthly_balance (',
        '  id      BIGSERIAL PRIMARY KEY,',
        '  year    INTEGER NOT NULL,',
        '  month   TEXT    NOT NULL,',
        '  balance BIGINT  NOT NULL,',
        "  account TEXT    DEFAULT 'Main',",
        '  UNIQUE(year, month)',
        ');',
        '',
        'CREATE INDEX idx_tx_date ON transactions(date DESC);',
        '',
        '-- Row Level Security (public anon read+write)',
        'ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;',
        'ALTER TABLE monthly_balance ENABLE ROW LEVEL SECURITY;',
        '',
        'CREATE POLICY "allow_all_tx"  ON transactions',
        '  FOR ALL USING (true) WITH CHECK (true);',
        'CREATE POLICY "allow_all_bal" ON monthly_balance',
        '  FOR ALL USING (true) WITH CHECK (true);',
      ].map(line => codeLine(line || ' ')),

      gap(120),
      infoCard('Field reference — transactions', [
        'date        DATE      required  — "2026-01-15"',
        'type        TEXT      required  — "income" | "expense" | "transfer"',
        'amount      INTEGER   required  — always positive (e.g. 250000 = $250K COP)',
        'category    TEXT      required  — "Income", "Food", "Shopping", "Personal", etc.',
        'subcategory TEXT      optional  — finer label inside the category',
        'description TEXT      optional  — free-text note',
        'account     TEXT      optional  — bank or wallet name (e.g. "Nu", "Rappi")',
        'month       TEXT      optional  — "January", "February" … auto-set by app',
        'year        INTEGER   optional  — 2025, 2026 … auto-set by app',
      ], 'F0FDF4'),
      gap(120),
      infoCard('Field reference — monthly_balance', [
        'year    INTEGER  required  — 2025',
        'month   TEXT     required  — "January" … "December"',
        'balance BIGINT   required  — net worth snapshot in local currency',
        'account TEXT     optional  — label for the balance source',
        '',
        'One row per month. The app uses this as the authoritative net-worth',
        'baseline. New transactions entered via the Diario module are layered on',
        'top of the last snapshot automatically.',
      ], 'F0FDF4'),
      gap(120),

      h2('1.3  Seed initial balance data'),
      p(t('Insert one '), bold('monthly_balance'), t(' row for each historical month you want to show. A minimal starting point:')),
      gap(80),
      ...[
        "INSERT INTO monthly_balance (year, month, balance, account) VALUES",
        "  (2025, 'October',  0,       'Main'),",
        "  (2025, 'November', 1500000, 'Main'),",
        "  (2025, 'December', 3200000, 'Main'),",
        "  (2026, 'January',  5800000, 'Main');",
      ].map(codeLine),
      gap(80),
      p(muted('Tip: the balance column is the total net worth at end-of-month, not just the month\'s earnings. Use the client\'s actual closing balance for each month.')),
      gap(80),

      h2('1.4  Get your API credentials'),
      p(t('In Supabase go to '), bold('Project Settings → API'), t('. You need two values:')),
      gap(80),
      twoCol('Project URL', 'https://xxxxxxxxxxxx.supabase.co', [2400, 6960]),
      twoCol('anon public key', 'eyJhbGciOiJIUzI1NiIs… (long JWT)', [2400, 6960]),
      gap(80),
      p(t('Copy both — you will paste them into the HTML file in '), bold('Step 3'), t('.')),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 2 — GITHUB
      // ══════════════════════════════════════════════════════════════════════
      h1('Step 2 — Fork the Repository'),
      numberedItem('Go to the master Finance OS repo on GitHub.'),
      numberedItem('Click Fork → Create fork. Name it something like finance-clientname.'),
      numberedItem('In the new repo go to Settings → Pages → Source: Deploy from branch → main / root → Save.'),
      numberedItem('Your app will be live at: https://yourusername.github.io/finance-clientname/'),
      gap(120),
      infoCard('One repo per client', [
        'Each client is an independent GitHub repo + Supabase project.',
        'The HTML file is identical across all clients.',
        'Only client.json and the Supabase credentials differ.',
      ]),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 3 — SUPABASE CONNECTION
      // ══════════════════════════════════════════════════════════════════════
      h1('Step 3 — Connect the App to Supabase'),
      p(t('Open '), bold('daniel_finance_v6.html'), t(' and find these two lines near the top of the '), code('<script>'), t(' block:')),
      gap(80),
      codeLine("const SB_URL = 'https://YOUR_PROJECT.supabase.co';"),
      codeLine("const SB_KEY = 'YOUR_ANON_KEY';"),
      gap(80),
      p(t('Replace both values with the credentials you copied in Step 1.4. '), bold('Save the file and commit to GitHub'), t('. The app will now read live data from the client\'s database.')),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 4 — PIN
      // ══════════════════════════════════════════════════════════════════════
      h1('Step 4 — Set the PIN'),
      p(t('The app is protected by a 4-digit PIN. The PIN is stored as a SHA-256 hash — the plain number is never in the file.')),
      gap(80),
      numberedItem('Decide the client\'s PIN (e.g. 2847).'),
      numberedItem('Go to:  https://emn178.github.io/online-tools/sha256.html'),
      numberedItem('Type the 4 digits into the input and copy the hash.'),
      numberedItem('In the HTML file find the line:'),
      gap(40),
      codeLine("const PIN_HASH = '2cec8cf0e321c284fa0c2ebef804aac1...';"),
      gap(40),
      numberedItem('Replace the hash value with the one you just generated.'),
      numberedItem('Commit the change.'),
      gap(80),
      infoCard('Security note', [
        'The anon Supabase key is public by design — it grants read/write only.',
        'The PIN adds a UI lock so casual visitors cannot see the data.',
        'For sensitive clients enable Supabase Row Level Security with auth.uid().',
      ]),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 5 — CLIENT.JSON
      // ══════════════════════════════════════════════════════════════════════
      h1('Step 5 — Personalise with client.json'),
      p(t('This is '), bold('the only file'), t(' you need to edit to brand and configure the entire app. It lives in the repo root alongside the HTML.')),

      h2('5.1  Client identity'),
      ...[
        '{',
        '  "client": {',
        '    "id":   "unique-client-slug",',
        '    "name": "María Torres",',
        '    "branding": {',
        '      "app_title":  "MT Finance OS",',
        '      "initials":   "MT",',
        '      "hero_name":  "María Torres",',
        '      "currency":   "COP",',
        '      "goal_amount": 100000000,',
        '      "goal_label": "Meta 100M",',
        '      "budget_limit":   600000,',
        '      "optimal_budget": 380000,',
        '      "theme":  "carbon"',
        '    }',
        '  },',
        '  ...',
        '}',
      ].map(codeLine),
      gap(80),
      twoCol('app_title',      'Browser tab title and footer label'),
      twoCol('initials',       'Shown on PIN screen and navbar logo'),
      twoCol('hero_name',      'Full name shown on the Home hero heading'),
      twoCol('goal_amount',    'Savings target (integer, local currency)'),
      twoCol('budget_limit',   'Monthly expense ceiling for the gastos chart'),
      twoCol('optimal_budget', 'Ideal monthly spend — drives the Predictor model'),
      twoCol('theme',          'Visual theme key — see Section 6 for all options'),
      gap(120),

      h2('5.2  Module activation'),
      p(t('Each module has an '), bold('"enabled"'), t(' flag. Set it to '), bold('false'), t(' to completely hide the module and remove it from all navigation.')),
      gap(80),
      ...[
        '"modules": {',
        '  "home":         { "enabled": true  },',
        '  "overview":     { "enabled": true  },',
        '  "gastos":       { "enabled": true  },',
        '  "diario":       { "enabled": true  },',
        '  "flujo":        { "enabled": false },',
        '  "proyeccion":   { "enabled": false },',
        '  "mes_perfecto": { "enabled": false },',
        '  "montecarlo":   { "enabled": false },',
        '  "calculator":   { "enabled": false },',
        '  "insights":     { "enabled": false },',
        '  "predictor":    { "enabled": false }',
        '}',
      ].map(codeLine),
      gap(80),
      infoCard('Module numbering is automatic', [
        'Sections are re-numbered #1, #2, #3 … in display order based on which',
        'modules are enabled. You never need to touch section numbers.',
      ]),
      gap(120),

      h2('5.3  Sub-feature toggles'),
      p(t('Inside each module you can disable specific sub-features without hiding the whole module:')),
      gap(80),
      ...[
        '"gastos": {',
        '  "enabled": true,',
        '  "features": {',
        '    "month_filter":     true,',
        '    "category_bars":    true,',
        '    "category_donut":   true,',
        '    "day_of_week_grid": false,',
        '    "top10_table":      true',
        '  }',
        '}',
      ].map(codeLine),
      gap(120),

      h2('5.4  Mobile tab bar'),
      p(t('Control which modules appear as quick-access tabs on mobile (max 6 recommended):')),
      gap(80),
      codeLine('"nav": {'),
      codeLine('  "mobile_tabs": ["home","gastos","diario","predictor"]'),
      codeLine('}'),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 6 — THEMES
      // ══════════════════════════════════════════════════════════════════════
      pageBreak(),
      h1('Step 6 — Choose a Visual Theme'),
      p(t('Set '), bold('"theme"'), t(' in the branding block to one of these keys. Each theme changes colours, backgrounds, typography, and the look of every chart.')),
      gap(120),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1500, 1200, 1600, 1500, 1500, 2060],
        rows: [
          themeRow('','','','','','', true),
          themeRow('Phantom',  '"phantom"', 'Violet #7C5CFC',   'Syne',             'JetBrains Mono',  'Tech-forward, aggressive', false),
          themeRow('Carbon',   '"carbon"',  'Gold #D4A843',     'Bebas Neue',        'IBM Plex Mono',   'Trading terminal, data-first', false),
          themeRow('Forest',   '"forest"',  'Green #1DB86A',    'Cormorant Garamond','Jost',            'ESG, long-horizon, editorial', false),
          themeRow('Solar',    '"solar"',   'Amber #E09030',    'Space Grotesk',     'Crimson Pro',     'Warm, human, approachable', false),
          themeRow('Arctic',   '"arctic"',  'Blue #1A52D4',     'Plus Jakarta Sans', 'Playfair Display','Clean, premium banking', false),
        ],
      }),
      gap(120),
      infoCard('Selecting a theme for your client', [
        'Phantom  →  developers, crypto users, high-risk tolerance',
        'Carbon   →  active traders, equity investors, data obsessives',
        'Forest   →  ESG investors, long-term savers, values-driven clients',
        'Solar    →  freelancers, young professionals, first-time savers',
        'Arctic   →  wealth management clients, conservative investors, high-net-worth',
      ]),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 7 — MODULE REFERENCE
      // ══════════════════════════════════════════════════════════════════════
      pageBreak(),
      h1('Module Reference'),
      p(t('Complete list of all 11 modules. Enable only what is relevant for each client. The section number in the UI is assigned automatically based on display order.')),
      gap(120),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [500, 3000, 4360, 1500],
        rows: [
          // Header
          new TableRow({
            tableHeader: true,
            children: ['#', 'Module / JSON key', 'Sub-features', 'Level'].map((h, i) => new TableCell({
              borders: allBorders(C.purple),
              shading: { fill: C.purple, type: ShadingType.CLEAR },
              width: { size: [500,3000,4360,1500][i], type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 80 },
              children: [new Paragraph({ children: [bold(h, { color: C.white, size: 18 })] })],
            })),
          }),
          moduleRow('01', 'Home\n"home"', 'Hero dashboard with KPI cards and net-worth progress bar.', ['kpi_networth', 'kpi_salary', 'kpi_interests', 'kpi_shopping', 'goal_progress_bar'], 'Incluido'),
          moduleRow('02', 'Overview\n"overview"', 'Net worth evolution chart and salary timeline.', ['networth_chart', 'salary_timeline (last 3)'], 'Incluido'),
          moduleRow('03', 'Gastos\n"gastos"', 'Monthly expense analysis by category with donut chart and top-10 table.', ['month_filter', 'category_bars', 'category_donut', 'monthly_limit_chart', 'day_of_week_grid', 'top10_table'], 'Incluido'),
          moduleRow('04', 'Diario\n"diario"', 'Live transaction log. Add income or expenses in real time.', ['transaction_form', 'month_summary', 'history', 'csv_export'], 'Incluido'),
          moduleRow('05', 'Flujo\n"flujo"', 'Cash flow chart and income source breakdown.', ['cashflow_chart', 'income_sources_chart', 'interest_yield_grid'], 'Incluido'),
          moduleRow('06', 'Proyección\n"proyeccion"', 'Goal calculator to project time-to-target with APY compound interest.', ['goal_slider', 'apy_slider', 'scenario_cards', 'projection_chart'], 'Avanzado'),
          moduleRow('07', 'Mes Perfecto\n"mes_perfecto"', 'Optimal month simulator — shows theoretical vs realistic perfect spend and distance to target.', ['kpi_cards', 'perfect_breakdown', 'distance_bars', 'real_vs_optimal_chart', 'score_cards', 'counterfactual'], 'Avanzado'),
          moduleRow('08', 'Calculadora\n"calculator"', 'Compound savings calculator with sliders, projection chart and milestone tracker.', ['capital_summary', 'sliders', 'projection_chart', 'yearly_bar_chart', 'milestones'], 'Avanzado'),
          moduleRow('09', 'Portafolios\n"montecarlo"', 'Monte Carlo simulation across Conservador, Moderado, and Agresivo portfolios.', ['portfolio_selector', 'sliders', 'simulation_chart', 'percentile_results', 'probability_bars'], 'Avanzado'),
          moduleRow('10', 'Insights\n"insights"', 'AI-style narrative insights: spending patterns, anomalies, and monthly score.', ['score_cards', 'counterfactual'], 'Avanzado'),
          moduleRow('11', 'Predictor\n"predictor"', 'Statistical savings predictor using weighted 3-month average + linear regression.', ['trajectory_chart', 'category_nudges', 'impact_card', 'streak_tracker'], 'Avanzado'),
        ],
      }),
      gap(120),

      infoCard('Suggested module bundles', [
        'Starter (new client, simple)    →  home + gastos + diario',
        'Growth (active saver)           →  home + overview + gastos + diario + proyeccion + predictor',
        'Full Suite (sophisticated user) →  all 11 modules enabled',
      ]),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 8 — DEPLOY CHECKLIST
      // ══════════════════════════════════════════════════════════════════════
      pageBreak(),
      h1('Step 7 — Deploy Checklist'),
      p(t('Run through this checklist before sending the app URL to the client.')),
      gap(120),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [560, 8800],
        rows: [
          // header
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ borders: allBorders(C.purple), shading: { fill: C.purple, type: ShadingType.CLEAR }, width: { size: 560, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold('✓', { color: C.white, size: 18 })] })] }),
              new TableCell({ borders: allBorders(C.purple), shading: { fill: C.purple, type: ShadingType.CLEAR }, width: { size: 8800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 80 }, children: [new Paragraph({ children: [bold('Task', { color: C.white, size: 18 })] })] }),
            ],
          }),
          ...([
            ['Database',    'Supabase project created, schema applied, no errors in SQL editor'],
            ['Data',        'monthly_balance rows seeded for all historical months'],
            ['Credentials', 'SB_URL and SB_KEY replaced in the HTML file'],
            ['PIN',         'PIN_HASH updated with the client\'s chosen PIN'],
            ['Identity',    'client.json updated: initials, hero_name, app_title, goal_amount'],
            ['Theme',       'Correct theme key set in client.json branding.theme'],
            ['Modules',     'Only relevant modules enabled in client.json'],
            ['Mobile tabs', 'nav.mobile_tabs reflects enabled modules (max 6)'],
            ['GitHub Pages','Enabled in repo Settings → Pages → main / root'],
            ['Test PIN',    'Open incognito tab, visit the URL, verify PIN works'],
            ['Test data',   'All KPIs and charts show real data, no "NaN" or blank cards'],
            ['Test mobile', 'Open on phone: tab bar correct, charts readable, forms usable'],
            ['Offline',     'Load app, disable wifi, confirm cached data still shows'],
          ].map(([cat, task]) => new TableRow({
            children: [
              new TableCell({ borders: allBorders(), width: { size: 560, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t('☐', { size: 22, color: C.purple })] })] }),
              new TableCell({ borders: allBorders(), width: { size: 8800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 80 },
                children: [new Paragraph({ children: [bold(cat + ':  ', { size: 20 }), t(task, { size: 20 })] })],
              }),
            ],
          }))),
        ],
      }),
      gap(200),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 9 — ONGOING MAINTENANCE
      // ══════════════════════════════════════════════════════════════════════
      h1('Step 8 — Ongoing Maintenance'),
      h2('Adding a new month'),
      p(t('At the start of each new month insert a '), bold('monthly_balance'), t(' row in Supabase with the closing net worth:')),
      gap(60),
      codeLine("INSERT INTO monthly_balance (year, month, balance, account)"),
      codeLine("VALUES (2026, 'April', 15200000, 'Main');"),
      gap(60),
      p(t('The app will pick it up automatically on next load — no code changes needed.')),
      gap(120),

      h2('Changing a module or feature mid-engagement'),
      p(t('Edit '), bold('client.json'), t(' only. Commit to GitHub. The app updates within seconds (Service Worker cache clears on new deploy).')),
      gap(120),

      h2('Upgrading the app'),
      p(t('When a new version of the HTML is released:')),
      bullet('Replace daniel_finance_v6.html with the new file'),
      bullet('Keep your client.json and Supabase credentials unchanged'),
      bullet('Update the cache name in sw.js (e.g. dfg-v7 → dfg-v8) so users get the fresh version'),
      gap(120),

      h2('Resetting the PIN'),
      p(t('Generate a new SHA-256 hash at https://emn178.github.io/online-tools/sha256.html and replace '), code('PIN_HASH'), t(' in the HTML file.')),
      gap(200),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      //  SECTION 10 — QUICK REFERENCE
      // ══════════════════════════════════════════════════════════════════════
      h1('Quick Reference Card'),
      gap(60),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          new TableRow({ tableHeader: true, children: ['What to change', 'Where / how'].map((h, i) => new TableCell({ borders: allBorders(C.purple), shading: { fill: C.purple, type: ShadingType.CLEAR }, width: { size: [3000,6360][i], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 80 }, children: [new Paragraph({ children: [bold(h, { color: C.white, size: 18 })] })] })) }),
          ...([
            ['Client name / initials',    'client.json → client.branding.initials / hero_name'],
            ['App title',                 'client.json → client.branding.app_title'],
            ['Theme',                     'client.json → client.branding.theme'],
            ['Savings goal',              'client.json → client.branding.goal_amount'],
            ['Budget limit',              'client.json → client.branding.budget_limit'],
            ['Turn module on / off',      'client.json → modules.[name].enabled'],
            ['Turn sub-feature on / off', 'client.json → modules.[name].features.[feature]'],
            ['Mobile tab bar',            'client.json → nav.mobile_tabs'],
            ['Supabase connection',       'HTML file → const SB_URL, const SB_KEY'],
            ['PIN',                       'HTML file → const PIN_HASH (use SHA-256 tool)'],
            ['Add monthly balance',       'Supabase SQL → INSERT INTO monthly_balance'],
            ['Add transaction',           'App Diario module (live) or Supabase SQL'],
          ].map(([what, where]) => new TableRow({ children: [
            new TableCell({ borders: allBorders(), width: { size: 3000, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 80 }, shading: { fill: C.bgPurple, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [bold(what, { size: 18, color: C.purple })] })] }),
            new TableCell({ borders: allBorders(), width: { size: 6360, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: where, font: 'Courier New', size: 18 })] })] }),
          ]})))
        ],
      }),

      gap(400),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [muted('Finance OS · Client Onboarding Guide · Confidential', { size: 18 })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('FinanceOS_Client_Onboarding_Guide.docx', buf);
  console.log('✓ Generated: FinanceOS_Client_Onboarding_Guide.docx');
});
