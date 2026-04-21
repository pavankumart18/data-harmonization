// ============================================================
//  Data Harmonization Tower — Main Application
// ============================================================

// ── Application State ────────────────────────────────────
const state = {
  currentPage: 'landing',
  activeDataset: 'sku',
  uploadDone: false,
  uploadStageIndex: -1,
  uploadProgress: 0,
  transitioning: false,
  transitionMessage: '',
  transitionTarget: null,
  expandedMappingField: null,
  mappingApprovals: {},
  exceptionAccepted: {},
  goldenDashboardSearch: '',
  selectedIssueRow: null,
  selectedFileKey: null,
  autoMapped: false,
  issues: null,
  activeIssueTab: 'normalization',
  selectedIssueId: null,
  selectedRecordId: null,
  searchQuery: '',
  isGolden: true,
  heatmapSelected: null,
  pageHelpOpen: false,
};

// ── Page Descriptions ────────────────────────────────────
const PAGE_INTROS = {
  raw: { title: 'Stage 1 — Ingest & Profile', desc: 'We start by ingesting raw supplier feeds from 4 regions. The system auto-scans every column for missing values, format inconsistencies, language mismatches, and naming conflicts. The heatmap below visualizes data quality across all 64 records — <strong>red means broken, green means clean</strong>.' },
  mapping: { title: 'Stage 2 — Schema Unification', desc: 'Each supplier uses different column names in different languages. Here, AI maps every source column to a single canonical schema. "anwendung" (German), "anvandning" (Swedish), and "application" (English) all resolve to one standardized field.' },
  workbench: { title: 'Stage 3 — AI Self-Healing', desc: 'The engine detects 5 categories of data issues and proposes fixes with confidence scores. <strong>Normalization</strong> resolves synonyms. <strong>Matching</strong> links records across catalogs. <strong>Enrichment</strong> fills missing fields. <strong>Validation</strong> corrects formats. Every fix requires human approval.' },
  golden: { title: 'Stage 4 — Golden Master Catalog', desc: '64 messy source records have been deduplicated into <strong>6 canonical golden records</strong>. Each one traces its lineage back to 3 source files. Multi-region pricing is normalized. This is the single source of truth.' },
  search: { title: 'Stage 5 — Business Impact', desc: 'The proof is in the search. With raw data, a scientist searching "CD20" gets 4 confusing, fragmented results in 3 languages. With golden records, they get <strong>2 clean canonical products</strong> with unified pricing. <em>20% of searches previously returned zero results — that\'s €340K in lost pipeline.</em>' },
};

function renderPageIntro() {
  const intro = PAGE_INTRO_OVERRIDES[state.currentPage] || PAGE_INTROS[state.currentPage];
  if (!intro) return '';
  return `<div class="page-intro"><div class="page-intro-badge">${intro.title}</div><p>${intro.desc}</p></div>`;
}

const PAGE_HELP_DETAILS = {
  raw: {
    title: 'Raw Data Overview',
    summary: 'This page shows the source files exactly as they arrived from suppliers. Nothing is cleaned or merged yet, so everyone can see the real starting point.',
    sections: [
      {
        title: 'What you can do here',
        items: [
          'See how many source files, rows, and data issues came in.',
          'Open any source file card to inspect its columns, loaded rows in this demo, and quality score.',
          'Use the heatmap to quickly spot missing values and risky columns.'
        ]
      },
      {
        title: 'How to read this page',
        items: [
          'Red means a serious problem that likely needs fixing.',
          'Amber means a warning or medium risk.',
          'Green means the value looks healthy.',
          'The lower detail panel appears after you select a file.'
        ]
      },
      {
        title: 'Main actions',
        items: [
          '"What this page does" opens this guide.',
          '"Begin Canonicalization" moves to the next step where different column names are mapped into one standard structure.',
          'Click a source file card to view that file in more detail.'
        ]
      }
    ]
  },
  mapping: {
    title: 'Canonicalization',
    summary: 'This page converts many supplier-specific column names into one common schema so the data can be compared and merged later.',
    sections: [
      {
        title: 'What you can do here',
        items: [
          'Review the standard fields that every clean record should follow.',
          'See how AI matches source columns from different files to the same canonical field.',
          'Use confidence scores to spot mappings that may need human review.'
        ]
      },
      {
        title: 'How to read this page',
        items: [
          'The left card is the target structure we want to end up with.',
          'The right card shows which source columns map into that structure.',
          'Fields marked REQ are the most important fields to fill.'
        ]
      },
      {
        title: 'Main actions',
        items: [
          '"Auto-Map" asks AI to suggest the best source-to-field matches.',
          '"Proceed to Self-Healing" moves to the step where record values are fixed, normalized, and enriched.',
          'This page is mainly for structure alignment before value cleanup starts.'
        ]
      }
    ]
  },
  workbench: {
    title: 'Self-Healing Workbench',
    summary: 'This page is where AI suggests fixes and a person reviews them before the system creates final clean records.',
    sections: [
      {
        title: 'What you can do here',
        items: [
          'Pick an issue type on the left, such as normalization or validation.',
          'Select one issue to compare the raw version with the proposed fixed version.',
          'Read the AI reasoning and decide whether the suggestion looks correct.'
        ]
      },
      {
        title: 'How to use this page',
        items: [
          'The left column helps you find open issues.',
          'The middle column shows the before and after data side by side.',
          'The right column explains why AI made that recommendation.'
        ]
      },
      {
        title: 'Main actions',
        items: [
          '"Fix All High-Confidence" accepts the safest suggestions in bulk.',
          '"Accept Suggestion" approves the currently selected fix.',
          '"Generate Golden Records" turns approved fixes into the final clean master dataset.'
        ]
      }
    ]
  },
  golden: {
    title: 'Golden Dataset',
    summary: 'This page shows the final clean master catalog. It is the version teams should trust after duplicates, naming conflicts, and missing values are resolved.',
    sections: [
      {
        title: 'What you can do here',
        items: [
          'See the final set of canonical records after cleanup and deduplication.',
          'Understand the reduction from many source records to fewer trusted golden records.',
          'Click one record to trace where it came from.'
        ]
      },
      {
        title: 'How to read this page',
        items: [
          'The table on the left is the master catalog people search and report from.',
          'The lineage panel on the right shows which source records were merged into the selected record.',
          'The stats at the top summarize deduplication and supplier coverage.'
        ]
      },
      {
        title: 'Main actions',
        items: [
          '"Test Search Impact" moves to the business view that compares search before and after harmonization.',
          'Click a row in the master catalog to open its lineage trace.',
          'This page answers the question: what does the final trusted data look like?'
        ]
      }
    ]
  },
  search: {
    title: 'Search Impact',
    summary: 'This page shows why the cleanup work matters to the business by comparing messy raw search results with clean harmonized results.',
    sections: [
      {
        title: 'What you can do here',
        items: [
          'Type a search term and compare what users would see before and after harmonization.',
          'Switch between Raw Data and Golden Records to show the difference clearly.',
          'Use suggested queries like cd20, elisa, and tnf alpha for quick examples.'
        ]
      },
      {
        title: 'How to read this page',
        items: [
          'Raw results can be fragmented, duplicated, or missing.',
          'Golden results are cleaner and combine key product details in one place.',
          'The revenue card at the top explains the business cost of poor search quality.'
        ]
      },
      {
        title: 'Main actions',
        items: [
          '"Raw Data" shows the messy search experience before harmonization.',
          '"Golden Records" shows the improved search experience after cleanup.',
          'This page helps non-technical teams understand the practical value of the project.'
        ]
      }
    ]
  }
};

function renderPageHelpButton() {
  return `<button class="btn btn-outline page-help-trigger" onclick="openPageHelp()" aria-expanded="${state.pageHelpOpen ? 'true' : 'false'}" aria-controls="page-help-panel">
    ${icon('info')} What this page does
  </button>`;
}

function renderPageHeaderActions(actionsHtml = '') {
  return `<div class="page-header-actions">${actionsHtml}${renderPageHelpButton()}</div>`;
}

function renderPageHelpPanel() {
  if (!state.pageHelpOpen) return '';
  const help = PAGE_HELP_DETAILS[state.currentPage];
  if (!help) return '';
  return `<div class="page-help-layer">
    <button type="button" class="page-help-backdrop" onclick="closePageHelp()" aria-label="Close page help"></button>
    <aside id="page-help-panel" class="page-help-panel" role="dialog" aria-modal="true" aria-labelledby="page-help-title">
      <div class="page-help-header">
        <div>
          <span class="badge badge-accent">${icon('info','icon-sm')} Simple English guide</span>
          <h2 id="page-help-title">${help.title}</h2>
          <p>${help.summary}</p>
        </div>
        <button type="button" class="btn btn-outline page-help-close" onclick="closePageHelp()">Close</button>
      </div>
      <div class="page-help-sections">
        ${help.sections.map(section => `<section class="page-help-section">
          <h3>${section.title}</h3>
          <ul>
            ${section.items.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </section>`).join('')}
      </div>
    </aside>
  </div>`;
}

const STORYLINE_DETAILS = {
  raw: {
    intro: 'We start by showing the source files exactly as they arrived. This step is about checking the data before we change anything.',
    steps: [
      { label: 'What comes in', text: 'Supplier feeds, pricing snapshots, datasheet records, search logs, and legacy catalog rows.' },
      { label: 'Checks we run', text: 'Missing values, language mixes, format problems, unit and currency differences, encoding issues, and duplicate clues.' },
      { label: 'What goes forward', text: 'A profiled raw layer with issue lists, quality scores, and the evidence needed for cleaning and joining.' },
    ],
  },
  mapping: {
    intro: 'This step explains how different source schemas are converted into one common structure before value-level cleanup starts.',
    steps: [
      { label: 'What comes in', text: 'Columns from many source systems with different names, languages, and structures.' },
      { label: 'Work we do', text: 'Map source columns into one canonical model such as canonical_name, target, application, and reactivity.' },
      { label: 'What goes forward', text: 'A shared structure that lets the next step compare, fix, and join records correctly.' },
    ],
  },
  workbench: {
    intro: 'This is the cleaning stage where we fix values and confirm the join logic before creating the golden dataset.',
    steps: [
      { label: 'What comes in', text: 'Schema-aligned records plus issue groups found during profiling and matching.' },
      { label: 'Work we do', text: 'Normalize names, repair formats, enrich missing data, validate fields, and review record matches with human approval.' },
      { label: 'What goes forward', text: 'Approved cleaned records that are ready to be merged into final golden entities.' },
    ],
  },
  golden: {
    intro: 'This step shows how cleaned records from multiple suppliers are joined into one trusted golden dataset with full lineage.',
    steps: [
      { label: 'What comes in', text: 'Cleaned source records from all feeds after mapping and issue resolution.' },
      { label: 'Work we do', text: 'Join matching supplier rows into one canonical record, preserve supplier references, and keep lineage back to source.' },
      { label: 'What goes forward', text: 'A searchable golden dataset that teams can trust for reporting, browsing, and downstream use.' },
    ],
  },
  search: {
    intro: 'This final step proves the impact. We compare the raw search experience with the golden search experience using the full matching set shown in this demo.',
    steps: [
      { label: 'What comes in', text: 'The same user query is run against raw records and against the golden dataset.' },
      { label: 'What changes', text: 'Raw results are fragmented and inconsistent. Golden results are harmonized, joined, and easier to understand.' },
      { label: 'What this proves', text: 'Better search coverage, clearer records, and a business reason for why the harmonization pipeline matters.' },
    ],
  },
};

function renderStorylineCard() {
  const story = STORYLINE_DETAILS[state.currentPage];
  if (!story) return '';
  return `<div class="card storyline-card">
    <div class="card-header">
      <div class="card-title card-title-lg">How This Step Works</div>
      <div class="card-description">${story.intro}</div>
    </div>
    <div class="card-content">
      <div class="storyline-grid">
        ${story.steps.map(step => `<div class="storyline-step">
          <div class="storyline-step-label">${step.label}</div>
          <p>${step.text}</p>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

const PAGE_INTRO_OVERRIDES = {
  raw: {
    title: 'Stage 1 - Ingest and Profile',
    desc: 'We start by loading the incoming supplier feeds, pricing tables, search logs, datasheets, and legacy catalog extracts. The system profiles each column for missing values, format conflicts, language mismatches, encoding problems, and duplicate clues before any cleaning begins.',
  },
  mapping: {
    title: 'Stage 2 - Canonicalize the Schema',
    desc: 'Each source uses different field names and sometimes different languages. Here, AI maps those source columns into one canonical model so the next step can compare records field by field.',
  },
  workbench: {
    title: 'Stage 3 - Clean and Heal Values',
    desc: 'This is where the value-level cleanup happens. <strong>Normalization</strong> resolves synonyms, <strong>matching</strong> links records across sources, <strong>enrichment</strong> fills key gaps, and <strong>validation</strong> repairs formats before a person approves the result.',
  },
  golden: {
    title: 'Stage 4 - Build the Golden Dataset',
    desc: 'Cleaned supplier records are joined into trusted canonical entities. Supporting tables such as datasheets, pricing snapshots, and legacy references help validate and enrich the final record while lineage keeps a trace back to the source systems.',
  },
  search: {
    title: 'Stage 5 - Search Impact',
    desc: 'This page proves why the harmonization pipeline matters. We compare raw product records from the incoming systems with the cleaned golden dataset so everyone can see how joining, cleaning, and standardizing the data changes the search experience.',
  },
};

PAGE_HELP_DETAILS.raw.sections[0].items[1] = 'Open any source file card to inspect its columns, loaded rows in this demo, and quality score.';
PAGE_HELP_DETAILS.golden.summary = 'This page shows the final clean master catalog. It is the version teams should trust after supplier rows are joined, naming conflicts are resolved, and supporting data is folded into one canonical record.';
PAGE_HELP_DETAILS.search.summary = 'This page shows why the cleanup work matters by comparing raw product records with the joined golden dataset. Every matching record in this demo is shown; the view is not limited to a top-N sample.';
PAGE_HELP_DETAILS.search.sections[0].items = [
  'Type a search term and compare what users would see before and after harmonization.',
  'Leave the search box blank to show every loaded record in this demo.',
  'Switch between Raw Data and Golden Records to show the difference clearly.',
  'Use suggested queries like cd20, elisa, and tnf alpha for quick examples.',
];
PAGE_HELP_DETAILS.search.sections[1].items = [
  'Raw results can be fragmented, duplicated, or missing.',
  'Golden results are cleaner and combine key product details in one place.',
  'Every matching record is displayed here, so you do not have to explain a hidden top 5 or sample cap.',
  'The revenue card at the top explains the business cost of poor search quality.',
];
PAGE_HELP_DETAILS.search.sections[2].items[2] = 'This page helps non-technical teams understand the practical value of the project and shows every matching demo record.';

Object.assign(STORYLINE_DETAILS.raw, {
  intro: 'We start by showing the incoming files and profiling them before any cleaning happens. The file cards show the source counts, and the detail panel shows every row loaded into this demo view.',
  steps: [
    { label: 'What comes in', text: 'Supplier feeds, pricing snapshots, datasheet metadata, search logs, and legacy catalog rows.' },
    { label: 'Checks we run', text: 'Missing values, language mixes, format problems, unit and currency differences, encoding issues, and duplicate clues.' },
    { label: 'What goes forward', text: 'A profiled raw layer with issue lists, quality scores, and the evidence needed for cleaning, matching, and joining.' },
  ],
});

Object.assign(STORYLINE_DETAILS.mapping, {
  intro: 'This step converts many source schemas into one common structure so records from different systems can be compared safely.',
  steps: [
    { label: 'What comes in', text: 'Columns from supplier feeds, pricing tables, datasheets, search logs, and legacy systems with different names and languages.' },
    { label: 'Work we do', text: 'Map source columns into one canonical model such as canonical_name, target, application, reactivity, and supplier references.' },
    { label: 'What goes forward', text: 'A shared structure that lets the next step clean values, compare records, and join the right rows together.' },
  ],
});

Object.assign(STORYLINE_DETAILS.workbench, {
  intro: 'This is the cleaning stage where value-level problems are fixed and record matches are reviewed before the golden dataset is created.',
  steps: [
    { label: 'What comes in', text: 'Schema-aligned records plus issue groups found during profiling, validation, and cross-source matching.' },
    { label: 'Work we do', text: 'Normalize names, repair formats, enrich missing data, validate fields, and review candidate joins with human approval.' },
    { label: 'What goes forward', text: 'Approved cleaned records that are ready to be merged into final golden entities with clear lineage.' },
  ],
});

Object.assign(STORYLINE_DETAILS.golden, {
  intro: 'This step shows how cleaned records from multiple sources are joined into one trusted golden dataset with lineage back to the original systems.',
  steps: [
    { label: 'What comes in', text: 'Cleaned supplier product records, plus supporting references from pricing, datasheets, and legacy catalog tables.' },
    { label: 'Work we do', text: 'Join matching supplier rows into one canonical record, keep supplier lineage, and use supporting tables to validate and enrich the result.' },
    { label: 'What goes forward', text: 'A searchable golden dataset that teams can trust for reporting, browsing, analytics, and downstream use.' },
  ],
});

Object.assign(STORYLINE_DETAILS.search, {
  intro: 'This final step proves the impact. A blank search shows every loaded record in this demo, and a filtered search shows every match with no hidden top-N cap.',
  steps: [
    { label: 'What comes in', text: 'The same user query is run against raw supplier rows, legacy catalog rows, datasheet titles, and against the final golden dataset.' },
    { label: 'What changes', text: 'Raw results are fragmented and inconsistent. Golden results are harmonized, joined, deduplicated, and easier to understand.' },
    { label: 'What this proves', text: 'Better search coverage, clearer records, and a visible business reason for why the harmonization pipeline matters.' },
  ],
});

// ── Profiling Engine ─────────────────────────────────────
function profileColumn(file, colIndex) {
  const header = file.headers[colIndex];
  const values = file.data.map(r => r[colIndex]);
  const total = values.length;
  const empty = values.filter(v => !v || v.trim() === '').length;
  const filled = total - empty;
  const unique = new Set(values.filter(v => v && v.trim() !== '')).size;
  const fillRate = Math.round((filled / total) * 100);
  const colIssues = (file.issues || []).filter(i => i.col === header);
  const issueCount = colIssues.length;
  let quality = fillRate;
  if (issueCount >= 2) quality = Math.max(quality - 25, 10);
  else if (issueCount === 1) quality = Math.max(quality - 12, 20);

  // Distribution across all loaded values
  const freq = {};
  values.forEach(v => { const k = v || '(empty)'; freq[k] = (freq[k]||0)+1; });
  const dist = Object.entries(freq).sort((a,b) => b[1]-a[1])
    .map(([val,count]) => ({ value: val, count, pct: Math.round((count/total)*100) }));

  const qualityLevel = quality >= 80 ? 'high' : quality >= 50 ? 'medium' : 'low';
  return { name: header, total, empty, filled, unique, fillRate, quality, qualityLevel, issues: colIssues, dist };
}

function profileFile(fileKey) {
  const file = RAW_FILES[fileKey];
  if (!file) return null;
  const cols = file.headers.map((_, i) => profileColumn(file, i));
  const avgQuality = Math.round(cols.reduce((s,c) => s+c.quality, 0) / cols.length);
  const totalIssues = file.issues ? file.issues.length : 0;
  const highIssues = file.issues ? file.issues.filter(i => i.severity === 'high').length : 0;
  return { ...file, columns: cols, avgQuality, totalIssues, highIssues, key: fileKey };
}

// ── Navigation ───────────────────────────────────────────
function openPageHelp() { if (!state.pageHelpOpen) { state.pageHelpOpen = true; renderAll(); } }
function closePageHelp() { if (state.pageHelpOpen) { state.pageHelpOpen = false; renderAll(); } }
function navigateTo(page) { state.currentPage = page; state.pageHelpOpen = false; renderAll(); }

// ── Render ───────────────────────────────────────────────
function renderAll() {
  renderNav();
  renderPipeline();
  renderPage();
}

function renderNav() {
  const navItems = [
    { name: 'Raw Data', page: 'raw', icon: 'eye' },
    { name: 'Canonicalization', page: 'mapping', icon: 'layers' },
    { name: 'Harmonization', page: 'workbench', icon: 'zap' },
    { name: 'Golden Records', page: 'golden', icon: 'shield' },
    { name: 'Search Impact', page: 'search', icon: 'search' },
  ];
  document.getElementById('header-nav').innerHTML = navItems.map(item => `
    <button class="nav-link ${state.currentPage === item.page ? 'active' : ''}" onclick="navigateTo('${item.page}')">
      ${icon(item.icon)} ${item.name}
    </button>
  `).join('');
}

function renderPipeline() {
  const steps = [
    { page: 'raw', label: 'Raw Data Overview', num: '1' },
    { page: 'mapping', label: 'Canonicalization', num: '2' },
    { page: 'workbench', label: 'Self-Healing', num: '3' },
    { page: 'golden', label: 'Golden Dataset', num: '4' },
    { page: 'search', label: 'Search Impact', num: '5' },
  ];
  const pages = steps.map(s => s.page);
  const currentIdx = pages.indexOf(state.currentPage);
  document.getElementById('pipeline').innerHTML = `<div class="pipeline-progress">${steps.map((s, i) => {
    const cls = i === currentIdx ? 'active' : i < currentIdx ? 'completed' : '';
    const connector = i < steps.length - 1 ? '<div class="pipeline-connector"></div>' : '';
    return `<button class="pipeline-step ${cls}" onclick="navigateTo('${s.page}')">
      <span class="step-num">${i < currentIdx ? '✓' : s.num}</span> ${s.label}
    </button>${connector}`;
  }).join('')}</div>`;
}

function renderPage() {
  const main = document.getElementById('main-content');
  switch (state.currentPage) {
    case 'raw':       main.innerHTML = renderRawPage(); break;
    case 'mapping':   main.innerHTML = renderMappingPage(); break;
    case 'workbench': main.innerHTML = renderWorkbenchPage(); break;
    case 'golden':    main.innerHTML = renderGoldenPage(); break;
    case 'search':    main.innerHTML = renderSearchPage(); break;
  }
}

// ════════════════════════════════════════════════════════════
//  PAGE 1: RAW DATA OVERVIEW
// ════════════════════════════════════════════════════════════
function selectFile(key) {
  state.selectedFileKey = key;
  renderAll();
  setTimeout(() => {
    const issSection = document.getElementById('file-issues-section');
    if (issSection) issSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

function renderRawPage() {
  const fileKeys = Object.keys(RAW_FILES);
  const allIssues = fileKeys.reduce((s,k) => s + (RAW_FILES[k].issues||[]).length, 0);
  const allRows = fileKeys.reduce((s,k) => s + RAW_FILES[k].rows, 0);
  const highIssues = fileKeys.reduce((s,k) => s + (RAW_FILES[k].issues||[]).filter(i=>i.severity==='high').length, 0);
  const allProfiles = fileKeys.map(k => profileFile(k));
  const avgQ = Math.round(allProfiles.reduce((s,p) => s+p.avgQuality, 0) / allProfiles.length);
  const selected = state.selectedFileKey ? profileFile(state.selectedFileKey) : null;

  return `<div class="page active">
    <div class="page-header">
      <div><h1>Raw Data Overview</h1><p class="page-subtitle">Explore raw datasets — every inconsistency, every gap, exposed.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateWithTransition('mapping','canonicalization')">Begin Canonicalization ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}
    <div class="stats-grid">
      <div class="stat-tile accent"><div class="stat-label">Source Files</div><div class="stat-value accent">${fileKeys.length}</div><div class="stat-delta">across 4 regions</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Total Records</div><div class="stat-value cyan">${allRows}</div><div class="stat-delta">from ${fileKeys.length} files</div></div>
      <div class="stat-tile red"><div class="stat-label">Issues Detected</div><div class="stat-value red">${allIssues}</div><div class="stat-delta negative">${highIssues} critical</div></div>
      <div class="stat-tile amber"><div class="stat-label">Avg Quality Score</div><div class="stat-value amber">${avgQ}%</div><div class="stat-delta negative">needs harmonization</div></div>
    </div>
    <h2 style="color:var(--text-primary);margin-bottom:1rem;font-size:1.125rem">Source Files</h2>
    <div class="source-files-grid">
      ${fileKeys.map(key => {
        const f = RAW_FILES[key];
        const ext = f.type.toUpperCase();
        const p = allProfiles.find(ap => ap.key === key);
        return `<div class="source-file-card ${state.selectedFileKey === key ? 'selected' : ''}" onclick="selectFile('${key}')">
          <div class="source-file-icon ${f.type}">${ext}</div>
          <div class="source-file-name">${displayFileName(key)}</div>
          <div class="source-file-meta"><span>${f.data.length} loaded</span><span>${f.rows.toLocaleString()} source</span><span>${f.region}</span></div>
          <div style="margin-top:0.75rem">
            <div class="quality-bar"><div class="quality-bar-fill ${p.avgQuality>=80?'high':p.avgQuality>=50?'medium':'low'}" style="width:${p.avgQuality}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:0.6875rem">
              <span style="color:var(--text-tertiary)">Quality</span>
              <span style="color:${p.avgQuality>=80?'var(--emerald)':p.avgQuality>=50?'var(--amber)':'var(--red)'};font-weight:700">${p.avgQuality}%</span>
            </div>
          </div>
          ${(f.issues||[]).filter(i=>i.severity==='high').length > 0 ? `<div style="margin-top:0.5rem"><span class="badge badge-red">${icon('alertCircle','icon-sm')} ${(f.issues||[]).filter(i=>i.severity==='high').length} critical</span></div>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${selected ? renderFileDetail(selected) : `<div class="card" style="padding:3rem;text-align:center;color:var(--text-muted)"><p>Select a source file above to inspect its columns, quality metrics, and raw data</p></div>`}
    ${renderPageHelpPanel()}
  </div>`;
}

function renderFileDetail(profile) {
  const file = RAW_FILES[profile.key];
  return `<div style="animation:fadeInUp 0.3s ease-out">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
      <div>
        <h2 style="color:var(--text-primary);font-size:1.25rem">${displayFileName(profile.key)}</h2>
        <p style="color:var(--text-tertiary);font-size:0.8125rem;margin-top:0.25rem">${file.description}</p>
      </div>
      <div style="display:flex;gap:0.5rem">
        <span class="badge badge-surface">${file.data.length} loaded rows</span>
        <span class="badge badge-surface">${file.rows.toLocaleString()} source rows</span>
        <span class="badge badge-surface">${file.headers.length} columns</span>
        <span class="badge ${profile.avgQuality>=80?'badge-emerald':profile.avgQuality>=50?'badge-amber':'badge-red'}">${icon(profile.avgQuality>=80?'checkCircle2':'alertTriangle','icon-sm')} Quality: ${profile.avgQuality}%</span>
      </div>
    </div>
    <h3 style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:1rem">Column Profiles</h3>
    <div class="col-profiles-grid">
      ${profile.columns.map(col => renderColCard(col, profile)).join('')}
    </div>
    ${file.issues && file.issues.length > 0 ? `
    <h3 id="file-issues-section" style="color:var(--text-secondary);font-size:0.875rem;margin:1.5rem 0 1rem">Detected Issues (${file.issues.length})</h3>
    <div class="issues-list">
      ${file.issues.map(iss => `<div class="issue-chip">
        <span class="${iss.severity==='high'?'issue-icon-red':iss.severity==='medium'?'issue-icon-amber':'issue-icon-accent'}">${icon(iss.severity==='high'?'alertCircle':iss.severity==='medium'?'alertTriangle':'info')}</span>
        <div><span style="color:var(--text-primary);font-weight:500">${iss.col}</span> <span class="badge badge-surface badge-mono" style="margin-left:0.25rem">${iss.type}</span><br><span style="color:var(--text-secondary)">${iss.desc}</span></div>
      </div>`).join('')}
    </div>` : ''}
    <h3 style="color:var(--text-secondary);font-size:0.875rem;margin:1.5rem 0 0.375rem">Loaded Raw Records (${file.data.length})</h3>
    <p style="color:var(--text-tertiary);font-size:0.75rem;margin-bottom:1rem">Every row loaded into this demo for this source file is shown below.</p>
    <div class="raw-table-scroll heal-animation">
      <table><thead><tr>${file.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${file.data.map((row,ri) => {
        const rowIssues = (file.issues||[]).filter(i => i.row === ri || (i.rows && i.rows.includes(ri)));
        return `<tr class="${rowIssues.length?'row-messy':''}">${row.map((cell,ci) => {
          const colName = file.headers[ci];
          const cellIssue = rowIssues.find(i => i.col === colName);
          const cls = cellIssue ? (cellIssue.severity==='high'?'cell-messy':'cell-warning') : (!cell ? 'cell-missing' : '');
          return `<td class="${cls}">${cell || '<em>-</em>'}</td>`;
        }).join('')}</tr>`;
      }).join('')}</tbody></table>
    </div>
  </div>`;
}

function renderColCard(col, profile) {
  return `<div class="col-profile-card quality-${col.qualityLevel}">
    <div class="col-card-header">
      <div><div class="col-card-name">${col.name}</div><div class="col-card-type">${col.unique} unique values</div></div>
      <div class="col-card-quality-num ${col.qualityLevel}">${col.quality}%</div>
    </div>
    <div class="quality-bar"><div class="quality-bar-fill ${col.qualityLevel}" style="width:${col.quality}%"></div></div>
    <div class="mini-stats">
      <div class="mini-stat"><div class="mini-stat-value">${col.filled}</div><div class="mini-stat-label">Filled</div></div>
      <div class="mini-stat"><div class="mini-stat-value" ${col.empty>0?'style="color:var(--red)"':''}>${col.empty}</div><div class="mini-stat-label">Empty</div></div>
      <div class="mini-stat"><div class="mini-stat-value">${col.fillRate}%</div><div class="mini-stat-label">Fill</div></div>
    </div>
    ${col.issues.length > 0 ? `<div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.25rem">${col.issues.map(i => `<span class="badge ${i.severity==='high'?'badge-red':'badge-amber'}">${i.type}</span>`).join('')}</div>` : ''}
    ${col.dist.length > 0 ? `<div style="margin-top:0.75rem"><div class="dist-bars">${col.dist.map(d => `<div class="dist-bar-row"><div class="dist-bar-label" title="${d.value}">${d.value.length>12?d.value.slice(0,12)+'...':d.value}</div><div class="dist-bar-track"><div class="dist-bar-fill" style="width:${d.pct}%"></div></div><div class="dist-bar-count">${d.count}</div></div>`).join('')}</div></div>` : ''}
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  PAGE 2: CANONICALIZATION
// ════════════════════════════════════════════════════════════
function toggleAutoMap() { state.autoMapped = true; renderAll(); }

function renderMappingPage() {
  const fields = [
    { name: 'canonical_name', type: 'string', required: true },
    { name: 'target', type: 'string', required: true },
    { name: 'host_species', type: 'string', required: false },
    { name: 'reactivity', type: 'string', required: true },
    { name: 'application', type: 'string', required: true },
    { name: 'clone', type: 'string', required: false },
    { name: 'conjugate', type: 'string', required: false },
    { name: 'category', type: 'enum', required: true },
  ];
  const mappings = [
    { canonical: 'canonical_name', sources: ['supplier_product_name (US)','product_title_english (EU)','bezeichnung (Nordic)'], confidence: 0.92 },
    { canonical: 'target', sources: ['target (US)','zielprotein (EU)','—inferred— (Nordic)'], confidence: 0.85 },
    { canonical: 'application', sources: ['application (US)','anwendung (EU)','anvandning (Nordic)'], confidence: 0.78 },
    { canonical: 'reactivity', sources: ['reactivity (US)','spezies (EU)','reaktivitet (Nordic)'], confidence: 0.82 },
  ];

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Canonicalization</h1><p class="page-subtitle">Standardize disparate schemas into one golden canonical model.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateWithTransition('workbench','self-healing')">Proceed to Self-Healing ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}
    <div class="grid-1-3">
      <div class="card"><div class="card-header"><div class="card-header-row"><div class="card-title card-title-lg">Canonical Schema</div><button class="btn btn-ghost btn-icon">${icon('plus')}</button></div><div class="card-description">Universal schema for harmonized records</div></div>
        <div class="card-content no-padding">${fields.map(f => `<div class="canonical-item"><div><div class="item-name">${f.name}${f.required?'<span class="badge badge-red" style="margin-left:0.5rem;font-size:0.5625rem">REQ</span>':''}</div><div class="item-type">${f.type}</div></div><button class="btn btn-ghost btn-icon btn-delete">${icon('trash2')}</button></div>`).join('')}</div>
      </div>
      <div class="card"><div class="card-header"><div class="card-header-row"><div><div class="card-title card-title-lg">Source → Canonical Mapping</div><div class="card-description">AI-suggested column mappings across ${Object.keys(RAW_FILES).length} source files</div></div><button class="btn btn-accent" onclick="toggleAutoMap()">${icon('wand2')} Auto-Map</button></div></div>
        <div class="card-content no-padding"><div class="table-wrapper"><table><thead><tr><th>Canonical Field</th><th>Source Columns</th><th>Confidence</th></tr></thead><tbody>
        ${state.autoMapped ? mappings.map(m => `<tr><td class="td-primary">${m.canonical}</td><td>${m.sources.map(s => `<span class="sample-tag">${s}</span>`).join(' ')}</td><td><div style="display:flex;align-items:center;gap:0.5rem"><div class="progress-bar"><div class="progress-bar-fill" style="width:${m.confidence*100}%"></div></div><span style="font-size:0.75rem;color:var(--text-tertiary);width:2rem">${Math.round(m.confidence*100)}%</span></div></td></tr>`).join('') : `<tr><td colspan="3" style="padding:3rem;text-align:center;color:var(--text-muted)">Click <strong>Auto-Map</strong> to generate AI-suggested mappings</td></tr>`}
        </tbody></table></div></div>
      </div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  PAGE 3: HARMONIZATION / SELF-HEALING WORKBENCH
// ════════════════════════════════════════════════════════════
const issueTypeIcons = { normalization:'checkSquare', matching:'gitMerge', enrichment:'sparkles', validation:'alertTriangle' };
const issueTypeColors = { normalization:'badge-accent', matching:'badge-purple', enrichment:'badge-emerald', validation:'badge-amber' };

function setIssueTab(t) { state.activeIssueTab = t; state.selectedIssueId = null; renderAll(); }
function selectIssue(id) { state.selectedIssueId = id; renderAll(); }
function resolveIssue(id) { const iss = getIssues(); const i = iss.find(x=>x.id===id); if(i) i.resolved=true; state.selectedIssueId=null; renderAll(); }
function fixAllHigh() { getIssues().forEach(i => { if(i.confidence>0.9) i.resolved=true; }); state.selectedIssueId=null; renderAll(); }
function getIssues() { if(!state.issues) state.issues = JSON.parse(JSON.stringify(HARMONIZATION_ISSUES)); return state.issues; }

function renderWorkbenchPage() {
  const issues = getIssues();
  const filtered = issues.filter(i => i.type === state.activeIssueTab);
  const selected = issues.find(i => i.id === state.selectedIssueId);
  const types = ['normalization','matching','enrichment','validation'];

  return `<div class="page active">
    <div class="page-header">
      <div><h1>Self-Healing Workbench</h1><p class="page-subtitle">AI-driven resolution of data inconsistencies with human-in-the-loop verification.</p></div>
      ${renderPageHeaderActions(`
        <button class="btn btn-emerald-outline" onclick="fixAllHigh()">${icon('checkCircle2')} Fix All High-Confidence</button>
        <button class="btn btn-primary" onclick="navigateWithTransition('golden','golden-records')">Generate Golden Records ${icon('arrowRight')}</button>
      `)}
    </div>
    ${renderStorylineCard()}
    <div class="workbench-layout">
      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">Issue Navigator</div></div>
        <div style="padding:0.75rem 1rem 0"><div class="tabs-nav">${types.map(t => {
          const cnt = issues.filter(i=>i.type===t&&!i.resolved).length;
          return `<button class="tab-btn ${state.activeIssueTab===t?'active':''}" onclick="setIssueTab('${t}')" title="${t}">${icon(issueTypeIcons[t])} ${t.slice(0,4)}${cnt>0?`<span class="tab-badge">${cnt}</span>`:''}</button>`;
        }).join('')}</div></div>
        <div class="card-content" style="overflow-y:auto">${filtered.length===0?`<div class="empty-state"><p>No issues in this category.</p></div>`:filtered.map(iss => `<div class="issue-chip ${iss.resolved?'resolved':''} ${state.selectedIssueId===iss.id?'selected':''}" onclick="selectIssue('${iss.id}')">
          <span class="${iss.confidence>0.9?'issue-icon-emerald':'issue-icon-amber'}">${icon(issueTypeIcons[iss.type])}</span>
          <div><div style="color:var(--text-primary);font-weight:500;${iss.resolved?'text-decoration:line-through;opacity:0.6':''}">${iss.description}</div><div style="margin-top:0.25rem;font-size:0.6875rem;color:var(--text-tertiary)">Conf: ${Math.round(iss.confidence*100)}% ${iss.resolved?'✓ Resolved':''}</div></div>
        </div>`).join('')}</div>
      </div></div>
      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">Workspace</div></div>
        <div class="card-content">${selected ? `<div><h2 style="font-size:1.125rem;color:var(--text-primary);margin-bottom:0.5rem">${selected.description}</h2>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"><span class="badge ${issueTypeColors[selected.type]}">${selected.type}</span><span class="confidence-inline">${icon('sparkles')} AI Confidence: <strong>${Math.round(selected.confidence*100)}%</strong></span></div>
          <div class="diff-grid"><div><div class="diff-label"><span class="dot dot-red"></span> Before (Raw)</div><div class="diff-block-before"><pre>${JSON.stringify(selected.before,null,2)}</pre></div></div><div><div class="diff-label"><span class="dot dot-green"></span> After (Healed)</div><div class="diff-block-after"><pre>${JSON.stringify(selected.after,null,2)}</pre></div></div></div></div>` : `<div class="empty-state" style="height:100%"><div class="empty-state-icon">${icon('zap','icon-2xl')}</div><p>Select an issue to review AI-suggested resolution</p></div>`}</div>
      </div></div>
      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">AI Reasoning</div></div>
        <div class="card-content" style="display:flex;flex-direction:column;justify-content:space-between;flex:1">${selected ? `<div><div class="reasoning-box"><p>${selected.reasoning}</p></div><div class="action-required"><h4>Human Verification</h4><p>Review the transformation. Accept or edit manually.</p></div></div>
          <div class="reasoning-actions"><button class="btn btn-primary" onclick="resolveIssue('${selected.id}')" ${selected.resolved?'disabled':''}>${selected.resolved?'✓ Resolved':'Accept Suggestion'}</button><button class="btn btn-outline" ${selected.resolved?'disabled':''}>Edit Manually</button></div>` : `<div class="empty-state" style="height:100%"><p style="font-size:0.8125rem">Reasoning appears when an issue is selected.</p></div>`}</div>
      </div></div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  PAGE 4: GOLDEN RECORDS
// ════════════════════════════════════════════════════════════
function selectRecord(id) { state.selectedRecordId = id; renderAll(); }

function renderGoldenPage() {
  const records = GOLDEN_RECORDS;
  const sel = records.find(r => r.id === state.selectedRecordId);
  const rawProductRows = buildRawSearchRecords().length;
  const totalGoldenRows = records.length;
  const mergeReduction = rawProductRows > 0 ? Math.round((1 - totalGoldenRows / rawProductRows) * 100) : 0;
  const multiSupplierRows = records.filter(record => record.suppliers.length > 1).length;
  
  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Golden Dataset</h1><p class="page-subtitle">The finalized, harmonized catalog — clean, consistent, and reliable.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateWithTransition('search','search-impact')">Test Search Impact ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="stat-tile emerald"><div class="stat-label">Golden Records</div><div class="stat-value emerald">${totalGoldenRows.toLocaleString()}</div></div>
      <div class="stat-tile accent"><div class="stat-label">Loaded Raw Product Records</div><div class="stat-value accent">${rawProductRows.toLocaleString()}</div></div>
      <div class="stat-tile purple"><div class="stat-label">Merge Reduction</div><div class="stat-value" style="color:var(--purple)">${mergeReduction}%</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Multi-Supplier Records</div><div class="stat-value cyan">${multiSupplierRows.toLocaleString()}</div></div>
    </div>
    <p style="color:var(--text-tertiary);font-size:0.8125rem;margin:-0.75rem 0 1.5rem">The Golden page is based on the loaded product records in this demo. Search logs, pricing tables, and other support files stay in the raw layer for checking, enrichment, and business impact.</p>
    <div class="grid-2-1">
      <div class="card"><div class="card-header"><div class="card-title card-title-lg">Master Catalog</div><div class="card-description">Joined canonical records created from the raw product rows loaded in this demo</div></div>
        <div class="card-content no-padding"><div class="table-wrapper"><table><thead><tr><th>ID</th><th>Canonical Name</th><th>Target</th><th>Application</th><th>Suppliers</th><th></th></tr></thead><tbody>
        ${records.map(r => `<tr class="${state.selectedRecordId===r.id?'selected':''}" style="cursor:pointer" onclick="selectRecord('${r.id}')">
          <td class="td-mono">${r.id}</td><td class="td-primary">${r.canonical_name}</td><td>${r.target||'-'}</td><td><span class="badge badge-surface">${r.application}</span></td>
          <td><span class="badge badge-accent">${r.suppliers.length} suppliers</span></td>
          <td><span style="color:var(--text-muted);display:inline-block;transition:transform 0.15s;${state.selectedRecordId===r.id?'transform:rotate(90deg)':''}">${icon('chevronRight')}</span></td>
        </tr>`).join('')}
        </tbody></table></div></div>
      </div>
      <div class="card" style="display:flex;flex-direction:column"><div class="card-header"><div class="card-title card-title-lg" style="display:flex;align-items:center;gap:0.5rem"><span style="color:var(--accent)">${icon('gitCommit','icon-lg')}</span> Lineage Trace</div><div class="card-description">Provenance of the selected golden record</div></div>
        <div class="card-content" style="flex:1">${sel ? `<div style="animation:fadeInRight 0.25s ease-out">
          <div style="margin-bottom:1.25rem"><h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.5rem">${sel.canonical_name}</h3>
            <div style="display:flex;flex-wrap:wrap;gap:0.375rem"><span class="badge badge-emerald">${icon('shield','icon-sm')} Golden Record</span><span class="badge badge-surface badge-mono">${sel.id}</span></div></div>
          <div class="lineage-timeline">${sel._lineage.map(t => `<div class="lineage-item"><span class="lineage-dot lineage-dot-indigo"></span><div class="lineage-source"><span class="source-name">${t.source}</span><span class="source-id">${t.id}</span></div><p class="lineage-reasoning">${t.note}</p></div>`).join('')}
            <div class="lineage-item"><span class="lineage-dot lineage-dot-emerald"></span><div class="lineage-resolution"><h4>${icon('fileCheck')} Final Resolution</h4><p>Merged ${sel._lineage.length} source records into single canonical entity.</p></div></div>
          </div></div>` : `<div class="empty-state" style="height:100%;padding:2rem 0"><div class="empty-state-icon">${icon('search','icon-2xl')}</div><p>Select a record to view lineage</p></div>`}</div>
      </div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  PAGE 5: SEARCH IMPACT
// ════════════════════════════════════════════════════════════
function setSearchQuery(v) { 
  state.searchQuery = v; 
  const input = document.querySelector('.search-input');
  if (input && input.value !== v) input.value = v;
  const container = document.getElementById('search-results-container');
  if (container) container.innerHTML = renderSearchResults();
  else renderAll();
}
function setSearchMode(g) { state.isGolden = g; renderAll(); }

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/α/g, ' alpha ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildSearchShape(value) {
  const normalized = normalizeSearchValue(value);
  return {
    normalized,
    compact: normalized.replace(/\s+/g, ''),
    tokens: normalized.split(/\s+/).filter(Boolean),
  };
}

function matchesSearchQuery(query, values) {
  const q = buildSearchShape(query);
  if (q.compact.length < 2) return false;
  const haystack = buildSearchShape(values.filter(Boolean).join(' '));
  return haystack.compact.includes(q.compact) || q.tokens.every(token => haystack.normalized.includes(token));
}

function getFieldValue(file, row, field) {
  const idx = file.headers.indexOf(field);
  return idx >= 0 ? (row[idx] || '') : '';
}

function summarizeSearchIssue(issue) {
  if (!issue) return '';
  const issueLabels = {
    abbreviation: 'Abbreviation issue',
    encoding: 'Encoding issue',
    format: 'Format mismatch',
    language: 'Mixed language',
    missing: issue.col ? `Missing ${issue.col}` : 'Missing data',
    normalization: 'Normalization issue',
    synonym: 'Synonym mismatch',
    vocabulary: 'Vocabulary mismatch',
  };
  return issueLabels[issue.type] || issue.type.replace(/-/g, ' ');
}

function collectSearchIssues(file, rowIndex, relevantFields) {
  const labels = [];
  (file.issues || []).forEach(issue => {
    if (issue.col && relevantFields.length > 0 && !relevantFields.includes(issue.col)) return;
    const rowScoped = issue.row !== undefined || (issue.rows && issue.rows.length);
    if (rowScoped && issue.row !== rowIndex && !(issue.rows || []).includes(rowIndex)) return;
    const label = summarizeSearchIssue(issue);
    if (label && !labels.includes(label)) labels.push(label);
  });
  return labels;
}

function buildRawSearchRecords() {
  const configs = [
    {
      key: 'supplier_feed_us_antibodies.csv',
      source: 'US Feed',
      nameFields: ['supplier_product_name'],
      recordField: 'supplier_sku',
      extraFields: ['target', 'application', 'description'],
      issueFields: ['supplier_product_name', 'supplier_sku', 'target', 'application', 'description'],
    },
    {
      key: 'supplier_feed_eu_reagents.csv',
      source: 'EU Feed',
      nameFields: ['product_title_local', 'product_title_english'],
      recordField: 'product_code',
      extraFields: ['product_title_english', 'zielprotein', 'anwendung', 'beschreibung'],
      issueFields: ['product_title_local', 'product_title_english', 'product_code', 'zielprotein', 'anwendung', 'beschreibung'],
    },
    {
      key: 'acquisition_catalog_nordic.csv',
      source: 'Nordic Catalog',
      nameFields: ['bezeichnung'],
      recordField: 'local_sku',
      extraFields: ['anvandning', 'free_text_spec', 'supplier_ref', 'kategori'],
      issueFields: ['bezeichnung', 'local_sku', 'anvandning', 'free_text_spec', 'supplier_ref', 'kategori'],
    },
    {
      key: 'supplier_datasheets.json',
      source: 'Datasheets',
      nameFields: ['title'],
      recordField: 'supplier_sku',
      extraFields: ['intended_use', 'sample_type', 'regulatory_text'],
      issueFields: ['title', 'intended_use', 'regulatory_text'],
    },
    {
      key: 'internal_master_catalog_legacy.xlsx',
      source: 'Legacy PIM',
      nameFields: ['display_name'],
      recordField: 'internal_product_id',
      extraFields: ['legacy_item_code', 'application_normalized', 'species_normalized', 'target_normalized', 'brand_name', 'primary_supplier_sku'],
      issueFields: ['display_name', 'application_normalized', 'target_normalized', 'category_l1'],
    },
  ];

  return configs.flatMap(config => {
    const file = RAW_FILES[config.key];
    if (!file) return [];

    return file.data.map((row, rowIndex) => {
      const name = config.nameFields.map(field => getFieldValue(file, row, field)).find(Boolean) || 'Unnamed record';
      const recordId = getFieldValue(file, row, config.recordField) || 'N/A';
      const issues = collectSearchIssues(file, rowIndex, config.issueFields);
      const searchValues = [
        ...config.nameFields.map(field => getFieldValue(file, row, field)),
        getFieldValue(file, row, config.recordField),
        ...config.extraFields.map(field => getFieldValue(file, row, field)),
      ];

      return {
        source: config.source,
        name,
        recordId,
        issues,
        searchValues,
      };
    });
  });
}

function formatCurrencyValue(currency, amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  const numeric = Number(amount);
  const value = Number.isFinite(numeric) ? String(numeric) : String(amount);
  return `${currency} ${value}`;
}

function buildGoldenSearchRecords() {
  return GOLDEN_RECORDS.map(record => ({
    name: record.canonical_name,
    id: record.id,
    target: record.target || '-',
    application: record.application || '-',
    suppliers: record.suppliers.length,
    prices: Object.entries(record.currencies || {}).map(([currency, amount]) => formatCurrencyValue(currency, amount)).join(' / '),
    searchValues: [
      record.id,
      record.canonical_name,
      record.target,
      record.application,
      record.clone,
      record.conjugate,
      record.category,
      ...(record.suppliers || []),
    ],
  }));
}

function findSearchComparison(query) {
  const normalized = normalizeSearchValue(query);
  return SEARCH_COMPARISONS.find(item => {
    if (matchesSearchQuery(query, [item.query])) return true;
    if (matchesSearchQuery(item.query, [query])) return true;
    return normalized.includes('tnf') && item.query === 'elisa';
  });
}

function renderSearchResults() {
  const q = state.searchQuery.toLowerCase();
  const results = q.length > 1 ? SEARCH_COMPARISONS.filter(s => s.query.includes(q) || q.includes(s.query) || (q.includes('tnf') && s.query==='elisa')) : [];
  return results.length > 0 ? results.map(r => `<div style="margin-bottom:2rem;animation:fadeInUp 0.3s ease-out">
      ${state.isGolden ? `<h3 style="color:var(--emerald);font-size:0.875rem;margin-bottom:1rem;display:flex;align-items:center;"><span>${icon('checkCircle2','icon-sm')} ${(r.golden_count || r.golden.length).toLocaleString()} clean results — ${r.improvement}</span></h3>
        <div class="search-results-grid">${r.golden.map(g => `<div class="result-card is-golden">
          <div class="result-card-header golden-header"><div class="result-title">${g.name}</div><span class="badge badge-accent">${icon('sparkles','icon-sm')} Harmonized</span></div>
          <div class="result-card-body"><div class="result-fields">
            <div class="result-field"><div class="field-label">ID</div><div class="field-value">${g.id}</div></div>
            <div class="result-field"><div class="field-label">Target</div><div class="field-value">${g.target || '—'}</div></div>
            <div class="result-field"><div class="field-label">Application</div><div class="field-value">${g.application}</div></div>
            <div class="result-field"><div class="field-label">Suppliers</div><div class="field-value">${g.suppliers} sources</div></div>
            <div class="result-field" style="grid-column:span 2"><div class="field-label">Multi-Region Pricing</div><div class="field-value">${g.prices}</div></div>
          </div></div>
        </div>`).join('')}</div>`
      : `<h3 style="color:var(--red);font-size:0.875rem;margin-bottom:1rem;display:flex;align-items:center;"><span>${icon('alertCircle','icon-sm')} ${(r.raw_count || r.raw.length).toLocaleString()} fragmented results — inconsistent naming & formats</span></h3>
        <div class="search-results-grid">${r.raw.map(raw => `<div class="result-card is-raw">
          <div class="result-card-header raw-header"><div class="result-title">${raw.name}</div><span class="badge badge-surface">${raw.source}</span></div>
          <div class="result-card-body"><div class="result-fields">
            <div class="result-field"><div class="field-label">SKU</div><div class="field-value">${raw.sku}</div></div>
            <div class="result-field"><div class="field-label">Issues</div><div style="display:flex;flex-wrap:wrap;gap:0.25rem">${raw.issues.map(i => `<span class="badge badge-red">${i}</span>`).join('')}</div></div>
          </div></div>
        </div>`).join('')}</div>`}
    </div>`).join('') : q.length > 1 ? `<div class="empty-state"><p>No results for "${state.searchQuery}". Try "cd20" or "elisa".</p></div>` : `<div class="empty-state"><div class="empty-state-icon">${icon('search','icon-2xl')}</div><p>Type to search (try "cd20" or "elisa")</p></div>`;
}

renderSearchResults = function() {
  const query = state.searchQuery.trim();
  if (query.length <= 1) {
    return `<div class="empty-state"><div class="empty-state-icon">${icon('search','icon-2xl')}</div><p>Type to search (try "cd20" or "elisa")</p></div>`;
  }

  const rawResults = buildRawSearchRecords()
    .filter(record => matchesSearchQuery(query, record.searchValues))
    .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));

  const goldenResults = buildGoldenSearchRecords()
    .filter(record => matchesSearchQuery(query, record.searchValues))
    .sort((a, b) => a.name.localeCompare(b.name));

  const comparison = findSearchComparison(query);
  const improvementText = comparison ? comparison.improvement : 'Showing every matching record in this demo dataset.';
  const activeResults = state.isGolden ? goldenResults : rawResults;

  if (activeResults.length === 0) {
    return `<div class="empty-state"><p>No results for "${state.searchQuery}". Try "cd20", "elisa", or "tnf alpha".</p></div>`;
  }

  return `<div style="margin-bottom:2rem;animation:fadeInUp 0.3s ease-out">
      ${state.isGolden ? `<h3 style="color:var(--emerald);font-size:0.875rem;margin-bottom:1rem;display:flex;align-items:center;"><span>${icon('checkCircle2','icon-sm')} ${goldenResults.length.toLocaleString()} clean results â€” ${improvementText}</span></h3>
        <div class="search-results-grid">${goldenResults.map(g => `<div class="result-card is-golden">
          <div class="result-card-header golden-header"><div class="result-title">${g.name}</div><span class="badge badge-accent">${icon('sparkles','icon-sm')} Harmonized</span></div>
          <div class="result-card-body"><div class="result-fields">
            <div class="result-field"><div class="field-label">ID</div><div class="field-value">${g.id}</div></div>
            <div class="result-field"><div class="field-label">Target</div><div class="field-value">${g.target || 'â€”'}</div></div>
            <div class="result-field"><div class="field-label">Application</div><div class="field-value">${g.application}</div></div>
            <div class="result-field"><div class="field-label">Suppliers</div><div class="field-value">${g.suppliers} sources</div></div>
            <div class="result-field" style="grid-column:span 2"><div class="field-label">Multi-Region Pricing</div><div class="field-value">${g.prices}</div></div>
          </div></div>
        </div>`).join('')}</div>`
      : `<h3 style="color:var(--red);font-size:0.875rem;margin-bottom:1rem;display:flex;align-items:center;"><span>${icon('alertCircle','icon-sm')} ${rawResults.length.toLocaleString()} fragmented results â€” Showing every matching record in this demo dataset.</span></h3>
        <div class="search-results-grid">${rawResults.map(raw => `<div class="result-card is-raw">
          <div class="result-card-header raw-header"><div class="result-title">${raw.name}</div><span class="badge badge-surface">${raw.source}</span></div>
          <div class="result-card-body"><div class="result-fields">
            <div class="result-field"><div class="field-label">SKU</div><div class="field-value">${raw.sku}</div></div>
            <div class="result-field"><div class="field-label">Issues</div><div style="display:flex;flex-wrap:wrap;gap:0.25rem">${raw.issues.length > 0 ? raw.issues.map(i => `<span class="badge badge-red">${i}</span>`).join('') : `<span class="badge badge-surface">No flagged issue</span>`}</div></div>
          </div></div>
        </div>`).join('')}</div>`}
    </div>`;
}

function renderSearchPage() {
  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Search Impact</h1><p class="page-subtitle">Compare search results: raw messy data vs clean golden records.</p></div>
      ${renderPageHeaderActions()}
    </div>
    <div class="card" style="margin-bottom:1.5rem"><div class="card-content">
      <div class="search-bar-wrapper">
        <div class="search-input-wrapper">${icon('search','icon-lg')}<input type="text" class="search-input" value="${state.searchQuery}" oninput="setSearchQuery(this.value)" placeholder="Search the catalog (e.g., cd20, elisa)..." /></div>
        <div class="search-toggle"><button class="search-toggle-btn ${!state.isGolden?'active-raw':''}" onclick="setSearchMode(false)">${icon('eye')} Raw Data</button><button class="search-toggle-btn ${state.isGolden?'active-golden':''}" onclick="setSearchMode(true)">${icon('sparkles')} Golden Records</button></div>
      </div>
      <div style="margin-top:0.75rem;display:flex;gap:0.5rem;align-items:center;">
        <span style="font-size:0.75rem;color:var(--text-tertiary)">Suggested Queries:</span>
        <button class="badge badge-surface" style="cursor:pointer;border:1px solid var(--border-subtle);background:transparent;color:var(--text-secondary)" onclick="setSearchQuery('cd20')">"cd20"</button>
        <button class="badge badge-surface" style="cursor:pointer;border:1px solid var(--border-subtle);background:transparent;color:var(--text-secondary)" onclick="setSearchQuery('elisa')">"elisa"</button>
        <button class="badge badge-surface" style="cursor:pointer;border:1px solid var(--border-subtle);background:transparent;color:var(--text-secondary)" onclick="setSearchQuery('tnf')">"tnf alpha"</button>
      </div>
    </div></div>
    <div id="search-results-container">${renderSearchResults()}</div>
    ${renderPageHelpPanel()}
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  CHAOS HEATMAP — Visual data quality grid with tooltips
// ════════════════════════════════════════════════════════════
function escAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function buildHeatCells() {
  const cells = [];
  Object.keys(RAW_FILES).forEach(key => {
    const f = RAW_FILES[key];
    const shortFile = key.replace('supplier_feed_','').replace('acquisition_catalog_','').replace('.csv','').replace('.json','');
    f.data.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const col = f.headers[ci];
        const colIssues = (f.issues||[]).filter(i => i.col === col);
        const val = cell || '';
        const valShort = val.length > 20 ? val.slice(0,20)+'…' : (val || '(empty)');
        let cls, reason;
        if (!cell || cell.trim() === '') {
          cls = 'q-missing'; reason = 'Missing / empty value';
        } else if (colIssues.some(i => i.severity === 'high')) {
          cls = 'q-bad'; reason = colIssues.find(i=>i.severity==='high').desc;
        } else if (colIssues.length > 0) {
          cls = 'q-warn'; reason = colIssues[0].desc;
        } else {
          cls = 'q-good'; reason = 'Clean — no issues detected';
        }
        cells.push({ cls, fileKey: key, file: shortFile, col, val, valShort, reason, row: ri, issues: colIssues, region: f.region });
      });
    });
  });
  return cells;
}

let _heatCells = null;
function getHeatCells() { if (!_heatCells) _heatCells = buildHeatCells(); return _heatCells; }

function renderChaosHeatmap() {
  const cells = getHeatCells();
  return `<div class="chaos-heatmap">${cells.map((c, idx) =>
    `<div class="chaos-cell ${c.cls}" data-idx="${idx}" data-file="${escAttr(c.file)}" data-col="${escAttr(c.col)}" data-val="${escAttr(c.valShort)}" data-reason="${escAttr(c.reason)}" onmouseenter="showHeatTip(event,this)" onmouseleave="hideHeatTip()" onclick="clickHeatCell(${idx})"></div>`
  ).join('')}</div><div id="heat-tooltip" class="heat-tooltip"></div>
  ${state.heatmapSelected !== null ? renderHeatDetail(state.heatmapSelected) : ''}`;
}

function clickHeatCell(idx) {
  state.heatmapSelected = idx;
  const container = document.querySelector('.card-content.compact');
  if (container) container.innerHTML = renderChaosHeatmap();
  setTimeout(() => {
    const detail = document.getElementById('heat-detail');
    if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

function renderHeatDetail(idx) {
  const cells = getHeatCells();
  const c = cells[idx];
  if (!c) return '';
  const qualLabel = c.cls === 'q-bad' ? '❌ Critical Issue' : c.cls === 'q-warn' ? '⚠️ Warning' : c.cls === 'q-missing' ? '⬛ Missing Data' : '✅ Clean';
  const qualCls = c.cls === 'q-bad' ? 'red' : c.cls === 'q-warn' ? 'amber' : c.cls === 'q-missing' ? 'text-muted' : 'emerald';
  return `<div id="heat-detail" class="heat-detail" style="animation:fadeInUp 0.3s ease-out">
    <button class="heat-detail-close" onclick="state.heatmapSelected=null;renderAll();">✕</button>
    <div class="heat-detail-grid">
      <div><div class="heat-detail-label">Source File</div><div class="heat-detail-value">${c.fileKey}</div></div>
      <div><div class="heat-detail-label">Column</div><div class="heat-detail-value" style="font-family:var(--font-mono)">${c.col}</div></div>
      <div><div class="heat-detail-label">Row</div><div class="heat-detail-value">${c.row + 1}</div></div>
      <div><div class="heat-detail-label">Region</div><div class="heat-detail-value">${c.region}</div></div>
      <div style="grid-column:span 2"><div class="heat-detail-label">Raw Value</div><div class="heat-detail-value" style="font-family:var(--font-mono);color:var(--text-accent)">${c.val || '<em>(empty)</em>'}</div></div>
      <div style="grid-column:span 2"><div class="heat-detail-label">Quality Status</div><div class="heat-detail-value" style="color:var(--${qualCls})">${qualLabel}</div></div>
      <div style="grid-column:span 4"><div class="heat-detail-label">Reason</div><div class="heat-detail-value">${c.reason}</div></div>
      ${c.issues.length > 0 ? `<div style="grid-column:span 4"><div class="heat-detail-label">All Issues on This Column (${c.issues.length})</div>${c.issues.map(i => `<div class="heat-detail-issue"><span class="badge ${i.severity==='high'?'badge-red':'badge-amber'}">${i.severity}</span> <span class="badge badge-surface badge-mono">${i.type}</span> ${i.desc}</div>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

function showHeatTip(e, el) {
  const tip = document.getElementById('heat-tooltip');
  if (!tip) return;
  const file = el.dataset.file, col = el.dataset.col, val = el.dataset.val, reason = el.dataset.reason;
  const cls = el.classList.contains('q-bad') ? 'tip-bad' : el.classList.contains('q-warn') ? 'tip-warn' : el.classList.contains('q-missing') ? 'tip-missing' : 'tip-good';
  tip.className = 'heat-tooltip visible ' + cls;
  tip.innerHTML = `<div class="tip-header">${file} › ${col}</div><div class="tip-value">${val}</div><div class="tip-reason">${reason}</div><div class="tip-click">Click for full details</div>`;
  const rect = el.getBoundingClientRect();
  tip.style.left = Math.min(rect.left + rect.width/2, window.innerWidth - 160) + 'px';
  tip.style.top = (rect.top - 8) + 'px';
}

function hideHeatTip() {
  const tip = document.getElementById('heat-tooltip');
  if (tip) tip.classList.remove('visible');
}

// ════════════════════════════════════════════════════════════
//  ANIMATED HEAL MORPH — For workbench workspace
// ════════════════════════════════════════════════════════════
function renderHealMorph(selected) {
  if (!selected) return '';
  const morphs = selected.type === 'normalization' && selected.before.values
    ? selected.before.values.map(v => ({ before: v, after: selected.after.canonical }))
    : [];
  if (morphs.length === 0) return '';
  return `<div style="margin-top:1.25rem"><div class="card-title-section" style="margin-bottom:0.75rem">Live Transformation</div>
    <div class="heal-morph-container" id="morph-container">${morphs.map((m, i) =>
      `<div class="heal-morph-item" id="morph-${i}"><span class="morph-before">${m.before}</span><span class="morph-arrow">→</span><span class="morph-after">${m.after}</span></div>`
    ).join('')}</div></div>`;
}

function triggerHealAnimation() {
  const items = document.querySelectorAll('.heal-morph-item');
  items.forEach((item, i) => {
    setTimeout(() => item.classList.add('healed'), 400 + i * 350);
  });
}

// ════════════════════════════════════════════════════════════
//  AUTO-DEMO ENGINE
// ════════════════════════════════════════════════════════════
let demoTimer = null;
let demoStepIndex = -1;
let demoRunning = false;

function startDemo() {
  if (demoRunning) { stopDemo(); return; }
  demoRunning = true;
  demoStepIndex = -1;
  document.body.classList.add('demo-active');
  state.selectedFileKey = null;
  state.autoMapped = false;
  state.issues = null;
  state.activeIssueTab = 'normalization';
  state.selectedIssueId = null;
  state.selectedRecordId = null;
  state.searchQuery = 'cd20';
  state.isGolden = true;
  state.heatmapSelected = null;
  state.pageHelpOpen = false;
  renderAll();
  showNarrator();
  advanceDemo();
}

function stopDemo() {
  demoRunning = false;
  demoStepIndex = -1;
  if (demoTimer) clearTimeout(demoTimer);
  demoTimer = null;
  document.body.classList.remove('demo-active');
  removeHighlights();
  hideNarrator();
  state.pageHelpOpen = false;
  renderAll();
}

function skipDemo() {
  if (!demoRunning) return;
  if (demoTimer) clearTimeout(demoTimer);
  advanceDemo();
}

function advanceDemo() {
  if (!demoRunning) return;
  removeHighlights();
  demoStepIndex++;
  if (demoStepIndex >= DEMO_SCRIPT.length) { stopDemo(); return; }
  const step = DEMO_SCRIPT[demoStepIndex];
  state.currentPage = step.page;
  state.pageHelpOpen = false;
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showNarrator();
  const speed = 0.6; // 60% of original = faster
  if (step.action) {
    setTimeout(() => {
      if (!demoRunning) return;
      step.action();
      showNarrator();
      updateNarrator(step);
      triggerPostActions(step);
    }, 300);
  } else {
    updateNarrator(step);
    triggerPostActions(step);
  }
  const pct = Math.round(((demoStepIndex + 1) / DEMO_SCRIPT.length) * 100);
  setTimeout(() => {
    const bar = document.getElementById('narrator-progress-fill');
    if (bar) bar.style.width = pct + '%';
  }, 100);
  demoTimer = setTimeout(() => advanceDemo(), step.duration * speed);
}

function triggerPostActions(step) {
  setTimeout(() => triggerHealAnimation(), 600);
  // Highlight relevant elements
  if (step && step.highlight) {
    setTimeout(() => highlightEl(step.highlight), 500);
  }
}

function highlightEl(selector) {
  removeHighlights();
  try {
    const els = document.querySelectorAll(selector);
    els.forEach(el => el.classList.add('demo-highlight'));
  } catch(e) {}
}

function removeHighlights() {
  document.querySelectorAll('.demo-highlight').forEach(el => el.classList.remove('demo-highlight'));
}

function showNarrator() {
  let bar = document.getElementById('narrator-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'narrator-bar';
    bar.className = 'narrator-bar';
    bar.innerHTML = `<div class="narrator-inner">
      <div class="narrator-icon">${icon('sparkles')}</div>
      <div style="flex:1"><div class="narrator-step-label" id="narrator-step-label"></div><div class="narrator-text" id="narrator-text"></div><div class="narrator-progress"><div class="narrator-progress-fill" id="narrator-progress-fill"></div></div></div>
      <div class="narrator-controls"><button class="btn btn-outline" onclick="skipDemo()" style="font-size:0.75rem">${icon('arrowRight')} Next</button><button class="btn btn-stop" onclick="stopDemo()">${icon('crosshair')} Stop</button></div>
    </div>`;
    document.body.appendChild(bar);
  }
  requestAnimationFrame(() => bar.classList.add('visible'));
}

function hideNarrator() {
  const bar = document.getElementById('narrator-bar');
  if (bar) { bar.classList.remove('visible'); setTimeout(() => bar.remove(), 500); }
}

function updateNarrator(step) {
  const label = document.getElementById('narrator-step-label');
  const text = document.getElementById('narrator-text');
  if (label) label.textContent = step.stepLabel;
  if (text) { text.style.opacity = '0'; setTimeout(() => { text.innerHTML = step.narration; text.style.opacity = '1'; text.style.transition = 'opacity 0.4s'; }, 150); }
}

// ── Override renderNav to include demo button ────────────
const _origRenderNav = renderNav;
renderNav = function() {
  const navItems = [
    { name: 'Raw Data', page: 'raw', icon: 'eye' },
    { name: 'Canonicalization', page: 'mapping', icon: 'layers' },
    { name: 'Harmonization', page: 'workbench', icon: 'zap' },
    { name: 'Golden Records', page: 'golden', icon: 'shield' },
    { name: 'Search Impact', page: 'search', icon: 'search' },
  ];
  document.getElementById('header-nav').innerHTML = navItems.map(item => `
    <button class="nav-link ${state.currentPage === item.page ? 'active' : ''}" onclick="navigateTo('${item.page}')">
      ${icon(item.icon)} ${item.name}
    </button>
  `).join('') + `<button class="btn btn-demo" style="margin-left:auto" onclick="startDemo()">${demoRunning ? icon('crosshair')+' Stop' : icon('activity')+' ▶ Run Demo'}</button>`;
};

// ── Override renderRawPage to include chaos heatmap ──────
const _origRenderRawPage = renderRawPage;
renderRawPage = function() {
  const fileKeys = Object.keys(RAW_FILES);
  const loadedRows = fileKeys.reduce((s,k) => s + RAW_FILES[k].data.length, 0);
  const sourceRows = fileKeys.reduce((s,k) => s + RAW_FILES[k].rows, 0);
  const allIssues = fileKeys.reduce((s,k) => s + (RAW_FILES[k].issues||[]).length, 0);
  const highIssues = fileKeys.reduce((s,k) => s + (RAW_FILES[k].issues||[]).filter(i=>i.severity==='high').length, 0);
  const allProfiles = fileKeys.map(k => profileFile(k));
  const avgQ = Math.round(allProfiles.reduce((s,p) => s+p.avgQuality, 0) / allProfiles.length);
  const selected = state.selectedFileKey ? profileFile(state.selectedFileKey) : null;

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Raw Data Overview</h1><p class="page-subtitle">Explore raw datasets — every inconsistency, every gap, exposed.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateWithTransition('mapping','canonicalization')">Begin Canonicalization ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}
    <div class="stats-grid">
      <div class="stat-tile accent"><div class="stat-label">Source Files</div><div class="stat-value accent">${fileKeys.length}</div><div class="stat-delta">across 4 regions</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Loaded Demo Records</div><div class="stat-value cyan">${loadedRows.toLocaleString()}</div><div class="stat-delta">representing ${sourceRows.toLocaleString()} source rows</div></div>
      <div class="stat-tile red"><div class="stat-label">Loaded Issues</div><div class="stat-value red">${allIssues.toLocaleString()}</div><div class="stat-delta negative">${highIssues.toLocaleString()} critical</div></div>
      <div class="stat-tile amber"><div class="stat-label">Avg Quality Score</div><div class="stat-value amber">${avgQ}%</div><div class="stat-delta negative">within the loaded demo scope</div></div>
    </div>
    <p style="color:var(--text-tertiary);font-size:0.8125rem;margin:-0.75rem 0 1.5rem">This page covers all 7 incoming files in the walkthrough. Some rows are product records that later join into the Golden dataset, while others are support tables used for validation, pricing, lineage, and search impact.</p>
    <div class="card" style="margin-bottom:2rem"><div class="card-header"><div class="card-header-row"><div><div class="card-title card-title-lg">Data Quality Heatmap</div><div class="card-description">Each cell shown here is one loaded demo value. Red = critical issue, Amber = warning, Green = clean, Dark = missing.</div></div><span class="badge badge-red" style="font-size:0.625rem">LIVE ANALYSIS</span></div></div><div class="card-content compact">${renderChaosHeatmap()}</div></div>
    <h2 style="color:var(--text-primary);margin-bottom:1rem;font-size:1.125rem">Source Files</h2>
    <div class="source-files-grid">
      ${fileKeys.map(key => {
        const f = RAW_FILES[key];
        const ext = f.type.toUpperCase();
        const p = allProfiles.find(ap => ap.key === key);
        return `<div class="source-file-card ${state.selectedFileKey === key ? 'selected' : ''}" onclick="selectFile('${key}')">
          <div class="source-file-icon ${f.type}">${ext}</div>
          <div class="source-file-name">${displayFileName(key)}</div>
          <div class="source-file-meta"><span>${f.data.length} loaded</span><span>${f.rows.toLocaleString()} source</span><span>${f.region}</span></div>
          <div style="margin-top:0.75rem">
            <div class="quality-bar"><div class="quality-bar-fill ${p.avgQuality>=80?'high':p.avgQuality>=50?'medium':'low'}" style="width:${p.avgQuality}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:0.6875rem">
              <span style="color:var(--text-tertiary)">Quality</span>
              <span style="color:${p.avgQuality>=80?'var(--emerald)':p.avgQuality>=50?'var(--amber)':'var(--red)'};font-weight:700">${p.avgQuality}%</span>
            </div>
          </div>
          ${(f.issues||[]).filter(i=>i.severity==='high').length > 0 ? `<div style="margin-top:0.5rem"><span class="badge badge-red">${icon('alertCircle','icon-sm')} ${(f.issues||[]).filter(i=>i.severity==='high').length} critical</span></div>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${selected ? renderFileDetail(selected) : `<div class="card" style="padding:3rem;text-align:center;color:var(--text-muted)"><p>Select a source file above to inspect its columns, checks, and every loaded row in this demo.</p></div>`}
    ${renderPageHelpPanel()}
  </div>`;
};

// ── Override workbench to add heal morphs ────────────────
const _origRenderWorkbench = renderWorkbenchPage;
renderWorkbenchPage = function() {
  const issues = getIssues();
  const filtered = issues.filter(i => i.type === state.activeIssueTab);
  const selected = issues.find(i => i.id === state.selectedIssueId);
  const types = ['normalization','matching','enrichment','validation'];

  const issueFullNames = { normalization:'Normalize', matching:'Match', enrichment:'Enrich', validation:'Validate' };

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Self-Healing Workbench</h1><p class="page-subtitle">AI-driven resolution of data inconsistencies with human-in-the-loop verification.</p></div>
      ${renderPageHeaderActions(`
        <button class="btn btn-emerald-outline" onclick="fixAllHigh()">${icon('checkCircle2')} Fix All High-Confidence</button>
        <button class="btn btn-primary" onclick="navigateWithTransition('golden','golden-records')">Generate Golden Records ${icon('arrowRight')}</button>
      `)}
    </div>
    <div class="workbench-layout">
      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">Issue Navigator</div></div>
        <div style="padding:0.75rem 1rem 0"><div class="tabs-nav">${types.map(t => {
          const cnt = issues.filter(i=>i.type===t&&!i.resolved).length;
          return `<button class="tab-btn ${state.activeIssueTab===t?'active':''}" onclick="setIssueTab('${t}')" title="${t}">${icon(issueTypeIcons[t])} ${issueFullNames[t]}${cnt>0?`<span class="tab-badge">${cnt}</span>`:''}</button>`;
        }).join('')}</div></div>
        <div class="card-content" style="overflow-y:auto">${filtered.length===0?`<div class="empty-state"><p>No issues in this category.</p></div>`:filtered.map(iss => `<div class="issue-chip ${iss.resolved?'resolved':''} ${state.selectedIssueId===iss.id?'selected':''}" onclick="selectIssue('${iss.id}')">
          <span class="${iss.confidence>0.9?'issue-icon-emerald':'issue-icon-amber'}">${icon(issueTypeIcons[iss.type])}</span>
          <div><div style="color:var(--text-primary);font-weight:500;${iss.resolved?'text-decoration:line-through;opacity:0.6':''}">${iss.description}</div><div style="margin-top:0.25rem;font-size:0.6875rem;color:var(--text-tertiary)">Conf: ${Math.round(iss.confidence*100)}% ${iss.resolved?'✓ Resolved':''}</div></div>
        </div>`).join('')}</div>
      </div></div>
      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">Workspace</div></div>
        <div class="card-content">${selected ? `<div><h2 style="font-size:1.125rem;color:var(--text-primary);margin-bottom:0.5rem">${selected.description}</h2>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem"><span class="badge ${issueTypeColors[selected.type]}">${selected.type}</span><span class="confidence-inline">${icon('sparkles')} AI Confidence: <strong>${Math.round(selected.confidence*100)}%</strong></span></div>
          <div class="diff-grid"><div><div class="diff-label"><span class="dot dot-red"></span> Before (Raw)</div><div class="diff-block-before"><pre>${JSON.stringify(selected.before,null,2)}</pre></div></div><div><div class="diff-label"><span class="dot dot-green"></span> After (Healed)</div><div class="diff-block-after"><pre>${JSON.stringify(selected.after,null,2)}</pre></div></div></div>
          ${renderHealMorph(selected)}</div>` : `<div class="empty-state" style="height:100%"><div class="empty-state-icon">${icon('zap','icon-2xl')}</div><p>Select an issue to review AI-suggested resolution</p></div>`}</div>
      </div></div>
      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">AI Reasoning</div></div>
        <div class="card-content" style="display:flex;flex-direction:column;justify-content:space-between;flex:1">${selected ? `<div><div class="reasoning-box"><p>${selected.reasoning}</p></div><div class="action-required"><h4>Human Verification</h4><p>Review the transformation. Accept or edit manually.</p></div></div>
          <div class="reasoning-actions"><button class="btn btn-primary" onclick="resolveIssue('${selected.id}')" ${selected.resolved?'disabled':''}>${selected.resolved?'✓ Resolved':'Accept Suggestion'}</button><button class="btn btn-outline" ${selected.resolved?'disabled':''}>Edit Manually</button></div>` : `<div class="empty-state" style="height:100%"><p style="font-size:0.8125rem">Reasoning appears when an issue is selected.</p></div>`}</div>
      </div></div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
};

// ── Trigger heal animation after page render ─────────────
// Final story alignment overrides
renderGoldenPage = function() {
  const records = GOLDEN_RECORDS;
  const sel = records.find(r => r.id === state.selectedRecordId);
  const rawProductRows = buildRawSearchRecords().length;
  const totalGoldenRows = records.length;
  const mergeReduction = rawProductRows > 0 ? Math.round((1 - totalGoldenRows / rawProductRows) * 100) : 0;
  const multiSupplierRows = records.filter(record => record.suppliers.length > 1).length;

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Golden Dataset</h1><p class="page-subtitle">The final joined catalog: clean, traceable, and ready for search.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateWithTransition('search','search-impact')">Test Search Impact ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="stat-tile emerald"><div class="stat-label">Golden Records</div><div class="stat-value emerald">${totalGoldenRows.toLocaleString()}</div></div>
      <div class="stat-tile accent"><div class="stat-label">Loaded Raw Product Records</div><div class="stat-value accent">${rawProductRows.toLocaleString()}</div></div>
      <div class="stat-tile purple"><div class="stat-label">Merge Reduction</div><div class="stat-value" style="color:var(--purple)">${mergeReduction}%</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Multi-Supplier Records</div><div class="stat-value cyan">${multiSupplierRows.toLocaleString()}</div></div>
    </div>
    <p style="color:var(--text-tertiary);font-size:0.8125rem;margin:-0.75rem 0 1.5rem">The Golden page is based on the loaded product records in this demo. Search logs, pricing tables, and other support files stay in the raw layer for checking, enrichment, and business impact.</p>
    <div class="grid-2-1">
      <div class="card"><div class="card-header"><div class="card-title card-title-lg">Master Catalog</div><div class="card-description">Joined canonical records created from the raw product rows loaded in this demo</div></div>
        <div class="card-content no-padding"><div class="table-wrapper"><table><thead><tr><th>ID</th><th>Canonical Name</th><th>Target</th><th>Application</th><th>Suppliers</th><th></th></tr></thead><tbody>
        ${records.map(r => `<tr class="${state.selectedRecordId===r.id?'selected':''}" style="cursor:pointer" onclick="selectRecord('${r.id}')">
          <td class="td-mono">${r.id}</td><td class="td-primary">${r.canonical_name}</td><td>${r.target||'-'}</td><td><span class="badge badge-surface">${r.application || '-'}</span></td>
          <td><span class="badge badge-accent">${r.suppliers.length} suppliers</span></td>
          <td><span style="color:var(--text-muted);display:inline-block;transition:transform 0.15s;${state.selectedRecordId===r.id?'transform:rotate(90deg)':''}">${icon('chevronRight')}</span></td>
        </tr>`).join('')}
        </tbody></table></div></div>
      </div>
      <div class="card" style="display:flex;flex-direction:column"><div class="card-header"><div class="card-title card-title-lg" style="display:flex;align-items:center;gap:0.5rem"><span style="color:var(--accent)">${icon('gitCommit','icon-lg')}</span> Lineage Trace</div><div class="card-description">Where each selected golden record came from</div></div>
        <div class="card-content" style="flex:1">${sel ? `<div style="animation:fadeInRight 0.25s ease-out">
          <div style="margin-bottom:1.25rem"><h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.5rem">${sel.canonical_name}</h3>
            <div style="display:flex;flex-wrap:wrap;gap:0.375rem"><span class="badge badge-emerald">${icon('shield','icon-sm')} Golden Record</span><span class="badge badge-surface badge-mono">${sel.id}</span></div></div>
          <div class="lineage-timeline">${sel._lineage.map(t => `<div class="lineage-item"><span class="lineage-dot lineage-dot-indigo"></span><div class="lineage-source"><span class="source-name">${t.source}</span><span class="source-id">${t.id}</span></div><p class="lineage-reasoning">${t.note}</p></div>`).join('')}
            <div class="lineage-item"><span class="lineage-dot lineage-dot-emerald"></span><div class="lineage-resolution"><h4>${icon('fileCheck')} Final Resolution</h4><p>Merged ${sel._lineage.length} source records into one canonical entity.</p></div></div>
          </div></div>` : `<div class="empty-state" style="height:100%;padding:2rem 0"><div class="empty-state-icon">${icon('search','icon-2xl')}</div><p>Select a record to view lineage</p></div>`}</div>
      </div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
};

renderSearchResults = function() {
  const query = state.searchQuery.trim();
  const rawUniverse = buildRawSearchRecords()
    .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source) || a.recordId.localeCompare(b.recordId));
  const goldenUniverse = buildGoldenSearchRecords()
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const rawResults = query ? rawUniverse.filter(record => matchesSearchQuery(query, record.searchValues)) : rawUniverse;
  const goldenResults = query ? goldenUniverse.filter(record => matchesSearchQuery(query, record.searchValues)) : goldenUniverse;
  const comparison = query ? findSearchComparison(query) : null;
  const activeResults = state.isGolden ? goldenResults : rawResults;

  if (activeResults.length === 0) {
    return `<div class="empty-state"><p>No results for "${state.searchQuery}". Try "cd20", "elisa", or "tnf alpha".</p></div>`;
  }

  const scopeLabel = query ? 'Filtered by current search' : 'Showing all loaded records';
  const rawSummary = query
    ? 'Every matching raw record is shown here. Nothing is hidden behind a top-N cap.'
    : 'These are the raw supplier, datasheet, and legacy records before cleaning and joining.';
  const goldenSummary = query
    ? (comparison ? comparison.improvement : 'Every matching golden record is shown here.')
    : 'These are the harmonized records created after cleaning, matching, and joining the raw product feeds.';

  return `<div style="margin-bottom:2rem;animation:fadeInUp 0.3s ease-out">
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem">
        <span class="badge badge-surface">Raw matches: ${rawResults.length.toLocaleString()}</span>
        <span class="badge badge-surface">Golden matches: ${goldenResults.length.toLocaleString()}</span>
        <span class="badge ${state.isGolden ? 'badge-accent' : 'badge-red'}">${scopeLabel}</span>
      </div>
      ${state.isGolden ? `<h3 style="color:var(--emerald);font-size:0.875rem;margin-bottom:1rem;display:flex;align-items:center;"><span>${icon('checkCircle2','icon-sm')} ${goldenResults.length.toLocaleString()} golden results - ${goldenSummary}</span></h3>
        <div class="search-results-grid">${goldenResults.map(g => `<div class="result-card is-golden">
          <div class="result-card-header golden-header"><div class="result-title">${g.name}</div><span class="badge badge-accent">${icon('sparkles','icon-sm')} Harmonized</span></div>
          <div class="result-card-body"><div class="result-fields">
            <div class="result-field"><div class="field-label">ID</div><div class="field-value">${g.id}</div></div>
            <div class="result-field"><div class="field-label">Target</div><div class="field-value">${g.target || '-'}</div></div>
            <div class="result-field"><div class="field-label">Application</div><div class="field-value">${g.application}</div></div>
            <div class="result-field"><div class="field-label">Suppliers</div><div class="field-value">${g.suppliers} sources</div></div>
            <div class="result-field" style="grid-column:span 2"><div class="field-label">Multi-Region Pricing</div><div class="field-value">${g.prices}</div></div>
          </div></div>
        </div>`).join('')}</div>`
      : `<h3 style="color:var(--red);font-size:0.875rem;margin-bottom:1rem;display:flex;align-items:center;"><span>${icon('alertCircle','icon-sm')} ${rawResults.length.toLocaleString()} raw results - ${rawSummary}</span></h3>
        <div class="search-results-grid">${rawResults.map(raw => `<div class="result-card is-raw">
          <div class="result-card-header raw-header"><div class="result-title">${raw.name}</div><span class="badge badge-surface">${raw.source}</span></div>
          <div class="result-card-body"><div class="result-fields">
            <div class="result-field"><div class="field-label">Source ID</div><div class="field-value">${raw.recordId}</div></div>
            <div class="result-field"><div class="field-label">Issues</div><div style="display:flex;flex-wrap:wrap;gap:0.25rem">${raw.issues.length > 0 ? raw.issues.map(i => `<span class="badge badge-red">${i}</span>`).join('') : `<span class="badge badge-surface">No flagged issue</span>`}</div></div>
          </div></div>
        </div>`).join('')}</div>`}
    </div>`;
};

renderSearchPage = function() {
  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Search Impact</h1><p class="page-subtitle">Show the difference between raw search and the joined golden dataset.</p></div>
      ${renderPageHeaderActions()}
    </div>
    ${renderStorylineCard()}
    <div class="card" style="margin-bottom:1.5rem"><div class="card-content">
      <div class="search-bar-wrapper">
        <div class="search-input-wrapper">${icon('search','icon-lg')}<input type="text" class="search-input" value="${state.searchQuery}" oninput="setSearchQuery(this.value)" placeholder="Search the demo catalog or leave blank to show everything..." /></div>
        <div class="search-toggle"><button class="search-toggle-btn ${!state.isGolden?'active-raw':''}" onclick="setSearchMode(false)">${icon('eye')} Raw Data</button><button class="search-toggle-btn ${state.isGolden?'active-golden':''}" onclick="setSearchMode(true)">${icon('sparkles')} Golden Records</button></div>
      </div>
      <div style="margin-top:0.75rem;display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
        <span style="font-size:0.75rem;color:var(--text-tertiary)">Suggested Queries:</span>
        <button class="badge badge-surface" style="cursor:pointer;border:1px solid var(--border-subtle);background:transparent;color:var(--text-secondary)" onclick="setSearchQuery('cd20')">"cd20"</button>
        <button class="badge badge-surface" style="cursor:pointer;border:1px solid var(--border-subtle);background:transparent;color:var(--text-secondary)" onclick="setSearchQuery('elisa')">"elisa"</button>
        <button class="badge badge-surface" style="cursor:pointer;border:1px solid var(--border-subtle);background:transparent;color:var(--text-secondary)" onclick="setSearchQuery('tnf alpha')">"tnf alpha"</button>
      </div>
      <p style="margin-top:0.75rem;color:var(--text-tertiary);font-size:0.75rem">Leave the search box blank to show every raw or golden record loaded in this demo.</p>
    </div></div>
    <div id="search-results-container">${renderSearchResults()}</div>
    ${renderPageHelpPanel()}
  </div>`;
};

const _origRenderPage = renderPage;
renderPage = function() {
  _origRenderPage();
  if (state.currentPage === 'workbench' && state.selectedIssueId) {
    setTimeout(() => triggerHealAnimation(), 600);
  }
};

// ── Init ─────────────────────────────────────────────────
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.pageHelpOpen) {
    closePageHelp();
  }
});

// ============================================================
//  RAJAN FEEDBACK — FULL DEMO ENHANCEMENTS
// ============================================================

// ── Dataset helpers ──────────────────────────────────────
function getActiveFiles() { return state.activeDataset === 'crm' ? CRM_FILES : RAW_FILES; }
function getActiveGoldenRecords() { return state.activeDataset === 'crm' ? CRM_GOLDEN_RECORDS : GOLDEN_RECORDS; }
function getActiveHarmonizationIssues() {
  if (!state.issues) {
    state.issues = JSON.parse(JSON.stringify(state.activeDataset === 'crm' ? CRM_HARMONIZATION_ISSUES : HARMONIZATION_ISSUES));
  }
  return state.issues;
}

// ── Select dataset and go to upload ──────────────────────
function selectDataset(ds) {
  state.activeDataset = ds;
  state.uploadDone = false; state.uploadStageIndex = -1; state.uploadProgress = 0;
  state.selectedFileKey = null; state.autoMapped = false; state.issues = null;
  state.mappingApprovals = {}; state.exceptionAccepted = {}; state.expandedMappingField = null;
  state.goldenDashboardSearch = ''; state.selectedRecordId = null;
  state.currentPage = 'upload';
  renderAll();
}

// ── Upload page stages ────────────────────────────────────
const UPLOAD_STAGES = {
  sku: [
    { msg: 'Parsing column headers…', pct: 14 },
    { msg: 'Scanning 4 source files…', pct: 28 },
    { msg: 'Detecting schema variants…', pct: 44 },
    { msg: 'Running quality profiler…', pct: 60 },
    { msg: 'Flagging 22 data issues…', pct: 76 },
    { msg: 'Building quality heatmap…', pct: 90 },
    { msg: 'Ready — 64 records loaded', pct: 100 },
  ],
  crm: [
    { msg: 'Parsing Salesforce CRM export…', pct: 14 },
    { msg: 'Parsing NetSuite contract billing…', pct: 28 },
    { msg: 'Parsing ProductTelemetry usage data…', pct: 44 },
    { msg: 'Detecting duplicate district account names…', pct: 60 },
    { msg: 'Running NCES district ID cross-reference…', pct: 76 },
    { msg: 'Flagging 23 harmonization issues…', pct: 90 },
    { msg: 'Ready — 35 district records loaded', pct: 100 },
  ],
};
let _uploadInterval = null;
function startSampleLoad() {
  if (_uploadInterval) clearInterval(_uploadInterval);
  const stages = UPLOAD_STAGES[state.activeDataset];
  state.uploadStageIndex = 0;
  state.uploadProgress = stages[0].pct;
  renderAll();
  let idx = 1;
  _uploadInterval = setInterval(() => {
    if (idx >= stages.length) {
      state.uploadStageIndex = stages.length - 1;
      state.uploadProgress = 100;
      state.uploadDone = true;
      clearInterval(_uploadInterval); _uploadInterval = null;
      renderAll(); return;
    }
    state.uploadStageIndex = idx;
    state.uploadProgress = stages[idx].pct;
    idx++;
    renderAll();
  }, 480);
}

// ── Transition helpers ────────────────────────────────────
function _getTransitionConfig(msgKey) {
  const isCRM = state.activeDataset === 'crm';
  const c = {
    'self-healing': {
      title: 'Running Entity Resolution Pipeline…', icon: 'zap',
      msgs: isCRM
        ? ['Submitting canonical field mapping…','Initializing Jaro-Winkler similarity engine…','Clustering duplicate district account names…','Cross-referencing NCES district IDs…','Generating merge proposals…']
        : ['Submitting canonical mapping…','Initializing AI Self-Healing Engine…','Detecting normalization conflicts…','Cross-referencing entity matches…','Generating correction proposals…'],
    },
    'canonicalization': {
      title: 'Beginning Canonicalization…', icon: 'layers',
      msgs: isCRM
        ? ['Parsing Salesforce CRM schema…','Parsing NetSuite billing schema…','Parsing ProductTelemetry schema…','Running AI field alignment across 3 systems…','Canonical schema ready…']
        : ['Parsing source file schemas…','Detecting column name variants across suppliers…','Running multilingual field alignment…','AI mapping fields to canonical model…','Building confidence scores…'],
    },
    'search-impact': {
      title: 'Preparing Revenue Impact Analysis…', icon: 'search',
      msgs: isCRM
        ? ['Indexing 8 golden district accounts…','Running pre-harmonization entity queries…','Benchmarking ARR attribution accuracy…','Computing district match improvement…','Impact analysis ready…']
        : ['Indexing golden records…','Computing search baseline metrics…','Running pre-harmonization query set…','Benchmarking recall improvement…','Analysis ready…'],
    },
    'golden-records': {
      title: 'Generating Golden Records…', icon: 'shield',
      msgs: isCRM
        ? ['Applying accepted entity merges…','Aggregating ARR per canonical district…','Computing open pipeline totals…','Building source lineage traces…','Generating golden account records…']
        : ['Applying approved corrections…','Deduplicating matched records…','Normalizing canonical fields…','Building lineage traces…','Generating golden records…'],
    },
  };
  return c[msgKey] || c['golden-records'];
}

function _buildTransitionSteps(msgs, currentStep) {
  const isCRM = state.activeDataset === 'crm';
  const ac = isCRM ? '#10b981' : '#6366f1';
  const acVar = isCRM ? 'var(--emerald)' : 'var(--accent)';
  return msgs.map((m, i) => {
    const done = i < currentStep;
    const active = i === currentStep;
    const circle = done
      ? `background:${ac};color:#000;font-size:0.75rem;font-weight:800;border:none`
      : active
      ? `border:2px solid ${ac};color:${ac};font-size:0.8125rem;font-weight:700`
      : `border:2px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.22);font-size:0.8125rem`;
    return `<div style="display:flex;align-items:center;gap:0.875rem;padding:0.5625rem 0;${i < msgs.length-1 ? 'border-bottom:1px solid rgba(255,255,255,0.045)' : ''}">
      <div style="width:1.875rem;height:1.875rem;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.3s;${circle}">
        ${done ? '✓' : i + 1}
      </div>
      <span style="font-size:0.875rem;font-weight:${active ? 600 : 400};color:${done ? acVar : active ? 'var(--text-primary)' : 'rgba(255,255,255,0.28)'};transition:color 0.3s">
        ${m}${active ? `<span style="margin-left:0.25rem;letter-spacing:0.12em;color:${acVar};animation:blink 1.1s ease-in-out infinite">···</span>` : ''}
      </span>
    </div>`;
  }).join('');
}

// ── Transition screen ─────────────────────────────────────
function navigateWithTransition(targetPage, msgKey) {
  if (state.transitioning) return;
  state.transitioning = true;
  state.transitionMessage = msgKey;
  state.transitionTarget = targetPage;
  state.transitionStep = 0;
  if (targetPage !== 'workbench') state.issues = null;
  renderAll();

  const cfg = _getTransitionConfig(msgKey);
  const total = cfg.msgs.length;
  const stepMs = Math.floor(1900 / total);
  let stepCount = 0;
  const _iv = setInterval(() => {
    stepCount++;
    state.transitionStep = stepCount;
    const pct = Math.min(Math.round((stepCount / total) * 100), 88);
    const stepsEl = document.getElementById('ts-steps');
    const barEl   = document.getElementById('ts-bar');
    const pctEl   = document.getElementById('ts-pct');
    if (stepsEl) stepsEl.innerHTML = _buildTransitionSteps(cfg.msgs, stepCount);
    if (barEl)   barEl.style.width = pct + '%';
    if (pctEl)   pctEl.textContent  = pct + '%';
    if (stepCount >= total) clearInterval(_iv);
  }, stepMs);

  setTimeout(() => {
    clearInterval(_iv);
    state.transitioning = false; state.transitionMessage = ''; state.transitionTarget = null;
    state.transitionStep = 0;
    state.currentPage = targetPage;
    renderAll();
  }, 2400);
}

// ── Mapping: expand field + approvals ────────────────────
function toggleMappingField(name) {
  state.expandedMappingField = state.expandedMappingField === name ? null : name;
  renderAll();
}
function setMappingApproval(name, status) {
  state.mappingApprovals[name] = status;
  renderAll();
}

// ── Exception: accept / re-run ────────────────────────────
function acceptException(id) {
  state.exceptionAccepted[id] = true;
  const issues = getActiveHarmonizationIssues();
  const iss = issues.find(i => i.id === id);
  if (iss) iss.resolved = true;
  renderAll();
}
function reRunWithRules() {
  const issues = getActiveHarmonizationIssues();
  issues.forEach(i => { if (i.confidence >= 0.9) i.resolved = true; });
  renderAll();
}

// ── Golden dashboard search ───────────────────────────────
function setGoldenSearch(q) {
  state.goldenDashboardSearch = q;
  const el = document.getElementById('golden-search-results');
  if (el) el.innerHTML = renderGoldenTable();
  else renderAll();
}

// ── Issue row scroll ──────────────────────────────────────
function selectIssueAndScroll(id) {
  selectIssue(id);
  setTimeout(() => {
    const tbl = document.querySelector('.raw-table-scroll');
    const highlighted = document.querySelector('tr.issue-scroll-target');
    if (tbl && highlighted) {
      tbl.scrollTop = highlighted.offsetTop - tbl.offsetTop - 60;
    }
  }, 150);
}

// ════════════════════════════════════════════════════════════
//  LANDING PAGE
// ════════════════════════════════════════════════════════════
function renderLandingPage() {
  const pipelineSteps = [
    { icon: 'uploadCloud', label: 'Ingest', desc: 'Load raw files', num: '1' },
    { icon: 'layers',      label: 'Canonicalize', desc: 'Unify schema', num: '2' },
    { icon: 'wand2',       label: 'Self-Heal', desc: 'AI fixes issues', num: '3' },
    { icon: 'shield',      label: 'Golden Record', desc: 'Trusted master', num: '4' },
    { icon: 'barChart',    label: 'Business Impact', desc: 'Before vs. After', num: '5' },
  ];

  const pipelineHtml = pipelineSteps.map((s, i) => `
    <div style="display:flex;align-items:center;gap:0;flex:1;min-width:0">
      <div style="display:flex;flex-direction:column;align-items:center;gap:0.3rem;flex:1;min-width:0">
        <div style="position:relative;width:2.75rem;height:2.75rem">
          <div style="width:2.75rem;height:2.75rem;border-radius:50%;background:linear-gradient(135deg,rgba(99,102,241,0.18),rgba(99,102,241,0.06));border:1px solid rgba(99,102,241,0.35);display:flex;align-items:center;justify-content:center;color:var(--accent)">${icon(s.icon,'icon-sm')}</div>
          <div style="position:absolute;top:-4px;right:-4px;width:1.1rem;height:1.1rem;border-radius:50%;background:var(--accent);color:#fff;font-size:0.5rem;font-weight:900;display:flex;align-items:center;justify-content:center;letter-spacing:0">${s.num}</div>
        </div>
        <div style="font-size:0.6875rem;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.04em">${s.label}</div>
        <div style="font-size:0.625rem;color:var(--text-tertiary);text-align:center;line-height:1.3">${s.desc}</div>
      </div>
      ${i < pipelineSteps.length - 1 ? `<div style="flex:0 0 auto;display:flex;align-items:center;padding-bottom:1.5rem;color:rgba(99,102,241,0.45)">${icon('chevronRight','icon-sm')}</div>` : ''}
    </div>
  `).join('');

  const problemItems = [
    { ico: 'alertCircle',   text: 'Duplicate records across systems' },
    { ico: 'alertTriangle', text: 'Hidden revenue in phantom accounts' },
    { ico: 'search',        text: 'Zero-result searches (20% of queries)' },
    { ico: 'trash2',        text: 'Manual cleanup — weeks of analyst time' },
  ];
  const solutionItems = [
    { ico: 'checkCircle2', text: 'Single trusted golden record per entity' },
    { ico: 'shield',       text: 'Full ARR visibility, zero phantom splits' },
    { ico: 'sparkles',     text: '100% search recall — AI synonym resolution' },
    { ico: 'zap',          text: 'Auto-healed in minutes, not weeks' },
  ];

  const problemHtml  = problemItems.map(p => `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.8rem;color:rgba(239,68,68,0.75)"><span style="flex-shrink:0;color:var(--danger)">${icon(p.ico,'icon-xs')}</span><span style="color:var(--text-secondary)">${p.text}</span></div>`).join('');
  const solutionHtml = solutionItems.map(s => `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.8rem;"><span style="flex-shrink:0;color:var(--emerald)">${icon(s.ico,'icon-xs')}</span><span style="color:var(--text-secondary)">${s.text}</span></div>`).join('');

  const metricsHtml = [
    { val: '99',   unit: '', label: 'Raw Source Records', color: 'var(--text-tertiary)', bg: 'rgba(255,255,255,0.04)' },
    { val: '→',    unit: '', label: '',                   color: 'var(--text-tertiary)', bg: 'transparent' },
    { val: '14',   unit: '', label: 'Golden Records',     color: 'var(--accent)',        bg: 'rgba(99,102,241,0.08)' },
    { val: '91%',  unit: '', label: 'Dedup Ratio',        color: 'var(--emerald)',       bg: 'rgba(16,185,129,0.08)' },
    { val: '$463K',unit: '', label: 'ARR Recovered',      color: 'var(--amber)',         bg: 'rgba(245,158,11,0.08)' },
    { val: '<2min',unit: '', label: 'Time to Golden',     color: 'var(--text-primary)',  bg: 'rgba(255,255,255,0.04)' },
  ].map(m => m.label
    ? `<div style="flex:1;text-align:center;padding:0.625rem 0.5rem;background:${m.bg};border-radius:var(--radius)"><div style="font-size:1.25rem;font-weight:900;color:${m.color};line-height:1;letter-spacing:-0.03em">${m.val}</div><div style="font-size:0.6rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.06em;margin-top:0.2rem">${m.label}</div></div>`
    : `<div style="display:flex;align-items:center;padding:0 0.25rem;color:var(--text-tertiary);font-size:1rem;font-weight:300">${m.val}</div>`
  ).join('');

  return `<div class="page active" style="max-width:72rem;margin:0 auto">

    <!-- Hero -->
    <div style="text-align:center;padding:3rem 1rem 1.75rem;position:relative">
      <div style="display:inline-flex;align-items:center;gap:0.5rem;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:999px;padding:0.3rem 0.875rem;margin-bottom:1.5rem">
        <div style="width:0.5rem;height:0.5rem;border-radius:50%;background:var(--accent);animation:pulse 2s ease-in-out infinite"></div>
        <span style="font-size:0.6875rem;font-weight:700;color:var(--accent);letter-spacing:0.08em;text-transform:uppercase">Live Demo · Data Harmonization Tower</span>
      </div>
      <h1 style="font-size:clamp(2rem,4vw,3rem);font-weight:900;letter-spacing:-0.04em;line-height:1.1;margin-bottom:0.875rem">
        <span style="background:linear-gradient(135deg,#f1f5f9 30%,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Your data says Houston ISD<br>is 8 different customers.</span>
      </h1>
      <p style="color:var(--text-secondary);font-size:1rem;max-width:44rem;margin:0 auto 1.5rem;line-height:1.65">It isn't. Pick a scenario below to watch <strong style="color:var(--text-primary)">Data Harmonization Tower</strong> ingest messy source files, resolve conflicts with AI, and produce a single trusted golden record — in under 2 minutes.</p>

      <!-- Key Metrics Strip -->
      <div style="display:flex;align-items:stretch;gap:0.375rem;max-width:38rem;margin:0 auto 2rem;padding:0.75rem;background:rgba(15,23,42,0.7);border:1px solid var(--border-subtle);border-radius:var(--radius-lg)">
        ${metricsHtml}
      </div>

      <!-- Pipeline Strip -->
      <div style="display:flex;align-items:flex-start;justify-content:center;gap:0;max-width:38rem;margin:0 auto;padding:1.25rem 1.5rem;background:rgba(15,23,42,0.6);border:1px solid var(--border-subtle);border-radius:var(--radius-lg)">
        ${pipelineHtml}
      </div>
    </div>

    <!-- Problem / Solution Banner -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:2rem;background:var(--border-subtle)">
      <div style="background:rgba(239,68,68,0.05);padding:1.25rem 1.5rem">
        <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.875rem">
          <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);display:flex;align-items:center;justify-content:center;color:var(--danger);flex-shrink:0">${icon('alertTriangle','icon-xs')}</div>
          <div style="font-size:0.6875rem;font-weight:800;color:var(--danger);text-transform:uppercase;letter-spacing:0.08em">Without Harmonization</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem">${problemHtml}</div>
      </div>
      <div style="background:rgba(16,185,129,0.05);padding:1.25rem 1.5rem">
        <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.875rem">
          <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);display:flex;align-items:center;justify-content:center;color:var(--emerald);flex-shrink:0">${icon('checkCircle2','icon-xs')}</div>
          <div style="font-size:0.6875rem;font-weight:800;color:var(--emerald);text-transform:uppercase;letter-spacing:0.08em">After Harmonization</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem">${solutionHtml}</div>
      </div>
    </div>

    <!-- Dataset Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.5rem;margin-bottom:2rem">

      <!-- SKU Card -->
      <div onclick="selectDataset('sku')" style="cursor:pointer;border:1px solid rgba(99,102,241,0.3);background:linear-gradient(145deg,rgba(99,102,241,0.07) 0%,rgba(15,23,42,0) 60%);border-radius:var(--radius-lg);overflow:hidden;transition:transform 0.2s,box-shadow 0.2s" onmouseenter="this.style.transform='translateY(-5px)';this.style.boxShadow='0 20px 50px rgba(99,102,241,0.22)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
        <div style="padding:0.4rem 1rem;background:rgba(99,102,241,0.1);border-bottom:1px solid rgba(99,102,241,0.18);display:flex;align-items:center;gap:0.5rem">
          <span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.6rem;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em">${icon('layers','icon-xs')} Scenario 1 · Life Sciences</span>
          <span class="badge badge-accent" style="font-size:0.5rem;margin-left:auto">CATALOG</span>
        </div>
        <div style="padding:1.75rem">
          <div style="display:flex;align-items:flex-start;gap:1rem;margin-bottom:1rem">
            <div style="width:3.25rem;height:3.25rem;border-radius:0.875rem;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--accent)">${icon('database','icon-xl')}</div>
            <div>
              <h2 style="font-size:1.1875rem;font-weight:800;color:var(--text-primary);margin-bottom:0.2rem">SKU / Product Catalog</h2>
              <p style="color:var(--text-tertiary);font-size:0.8125rem">4 supplier feeds → 1 golden catalog</p>
            </div>
          </div>
          <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.65;margin-bottom:1.25rem">Four supplier feeds across US, EU, and Nordic regions collide on the same antibodies and reagents — but with different SKU codes, spellings, and units. Watch the Tower deduplicate and unify them.</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.625rem;padding:0.875rem 0;border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);margin-bottom:1.25rem">
            ${[{v:'64',l:'Source Records',c:'var(--accent)',i:'fileText'},{v:'6',l:'Golden Records',c:'var(--accent)',i:'fileCheck'},{v:'5',l:'Issue Types',c:'var(--amber)',i:'alertTriangle'}].map(s => `<div style="text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:0.25rem;margin-bottom:0.15rem"><span style="font-size:1.375rem;font-weight:900;color:${s.c};line-height:1">${s.v}</span></div><div style="font-size:0.6rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em">${s.l}</div></div>`).join('')}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.35rem">
            ${[
              {src:'US Antibodies Feed',fmt:'CSV',clr:'rgba(99,102,241,0.7)'},
              {src:'EU Reagents Feed',fmt:'CSV',clr:'rgba(99,102,241,0.7)'},
              {src:'Nordic Acquisition Catalog',fmt:'CSV',clr:'rgba(99,102,241,0.7)'},
              {src:'Contract Billing',fmt:'NetSuite',clr:'rgba(245,158,11,0.7)'},
            ].map(s => `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--text-tertiary)"><span style="color:${s.clr};flex-shrink:0">${icon('fileText','icon-xs')}</span>${s.src}<span style="margin-left:auto;font-size:0.6rem;font-weight:700;color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.06);padding:0.1rem 0.4rem;border-radius:4px">${s.fmt}</span></div>`).join('')}
          </div>
        </div>
        <div style="padding:0.875rem 1.75rem;background:rgba(99,102,241,0.07);border-top:1px solid rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:space-between">
          <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.875rem;font-weight:700;color:var(--accent)">${icon('zap','icon-xs')} Start SKU Demo</span>
          <div style="display:flex;align-items:center;gap:0.25rem;color:var(--accent)">${icon('arrowRight','icon-sm')}</div>
        </div>
      </div>

      <!-- CRM Card -->
      <div onclick="selectDataset('crm')" style="cursor:pointer;border:1px solid rgba(16,185,129,0.3);background:linear-gradient(145deg,rgba(16,185,129,0.07) 0%,rgba(15,23,42,0) 60%);border-radius:var(--radius-lg);overflow:hidden;transition:transform 0.2s,box-shadow 0.2s" onmouseenter="this.style.transform='translateY(-5px)';this.style.boxShadow='0 20px 50px rgba(16,185,129,0.22)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
        <div style="padding:0.4rem 1rem;background:rgba(16,185,129,0.1);border-bottom:1px solid rgba(16,185,129,0.18);display:flex;align-items:center;gap:0.5rem">
          <span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.6rem;font-weight:800;color:var(--emerald);text-transform:uppercase;letter-spacing:0.1em">${icon('gitMerge','icon-xs')} Scenario 2 · Education CRM</span>
          <span class="badge badge-emerald" style="font-size:0.5rem;margin-left:auto">CRM</span>
        </div>
        <div style="padding:1.75rem">
          <div style="display:flex;align-items:flex-start;gap:1rem;margin-bottom:1rem">
            <div style="width:3.25rem;height:3.25rem;border-radius:0.875rem;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--emerald)">${icon('gitMerge','icon-xl')}</div>
            <div>
              <h2 style="font-size:1.1875rem;font-weight:800;color:var(--text-primary);margin-bottom:0.2rem">Imagine Learning / CRM</h2>
              <p style="color:var(--text-tertiary);font-size:0.8125rem">8 duplicates → 1 golden district record</p>
            </div>
          </div>
          <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.65;margin-bottom:1.25rem">Six reps entered <strong style="color:var(--text-primary)">Houston ISD</strong> eight different ways across Salesforce, NetSuite, and product telemetry. Result: <strong style="color:var(--amber)">$463K in ARR</strong> scattered across phantom accounts that no one could find.</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.625rem;padding:0.875rem 0;border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);margin-bottom:1.25rem">
            ${[{v:'35',l:'Source Records',c:'var(--emerald)'},{v:'8',l:'District Dupes',c:'var(--danger)'},{v:'$463K',l:'Unified ARR',c:'var(--amber)'}].map(s => `<div style="text-align:center"><div style="font-size:1.375rem;font-weight:900;color:${s.c};line-height:1">${s.v}</div><div style="font-size:0.6rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;margin-top:0.2rem">${s.l}</div></div>`).join('')}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.35rem">
            ${[
              {src:'Salesforce CRM Export',fmt:'CSV',clr:'rgba(16,185,129,0.7)'},
              {src:'Contract Billing — NetSuite',fmt:'CSV',clr:'rgba(16,185,129,0.7)'},
              {src:'ProductTelemetry Usage',fmt:'CSV',clr:'rgba(16,185,129,0.7)'},
            ].map(s => `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--text-tertiary)"><span style="color:${s.clr};flex-shrink:0">${icon('fileText','icon-xs')}</span>${s.src}<span style="margin-left:auto;font-size:0.6rem;font-weight:700;color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.06);padding:0.1rem 0.4rem;border-radius:4px">${s.fmt}</span></div>`).join('')}
          </div>
        </div>
        <div style="padding:0.875rem 1.75rem;background:rgba(16,185,129,0.07);border-top:1px solid rgba(16,185,129,0.15);display:flex;align-items:center;justify-content:space-between">
          <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.875rem;font-weight:700;color:var(--emerald)">${icon('zap','icon-xs')} Start CRM Demo</span>
          <div style="display:flex;align-items:center;gap:0.25rem;color:var(--emerald)">${icon('arrowRight','icon-sm')}</div>
        </div>
      </div>

    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  UPLOAD PAGE
// ════════════════════════════════════════════════════════════
function renderUploadPage() {
  const stages = UPLOAD_STAGES[state.activeDataset];
  const isCRM = state.activeDataset === 'crm';
  const isLoading = state.uploadStageIndex >= 0 && !state.uploadDone;
  const isDone = state.uploadDone;
  const datasetLabel = isCRM ? 'Salesforce / CRM' : 'SKU / Product';
  const accentColor = isCRM ? 'var(--emerald)' : 'var(--accent)';
  const badgeCls = isCRM ? 'badge-emerald' : 'badge-accent';

  return `<div class="page active" style="max-width:52rem;margin:0 auto;padding-top:1.5rem">
    <button onclick="navigateTo('landing')" style="display:inline-flex;align-items:center;gap:0.375rem;font-size:0.8125rem;color:var(--text-tertiary);background:none;border:none;cursor:pointer;margin-bottom:1.5rem;padding:0.25rem 0">${icon('arrowLeft','icon-sm')} Back to dataset selection</button>
    <div style="text-align:center;margin-bottom:2rem">
      <span class="badge ${badgeCls}" style="margin-bottom:0.75rem;display:inline-block">${datasetLabel} Dataset</span>
      <h1 style="font-size:1.875rem;font-weight:900;color:var(--text-primary);letter-spacing:-0.03em;margin-bottom:0.5rem">Load Your Data</h1>
      <p style="color:var(--text-secondary);font-size:0.9375rem">Upload your files or use the built-in sample dataset to start the demo</p>
    </div>
    <div class="card" style="margin-bottom:1.5rem"><div class="card-content">
      <div class="upload-zone" style="${isLoading||isDone?'opacity:0.6;pointer-events:none':''}">
        <div class="upload-icon-circle" style="background:${isCRM?'rgba(16,185,129,0.12)':'var(--accent-glow)'};color:${accentColor}">${icon('upload','icon-xl')}</div>
        <h3>Drag & drop your files here</h3>
        <p class="upload-subtitle">Supports CSV, XLSX, JSON — or use the sample data below</p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-outline" onclick="alert('File upload simulated — using sample data for this demo')" ${isLoading||isDone?'disabled':''}>
            ${icon('upload')} Upload Files
          </button>
          <button class="btn btn-primary" onclick="startSampleLoad()" ${isLoading||isDone?'disabled':''}
            style="${isCRM?'background:linear-gradient(135deg,var(--emerald),#059669);box-shadow:0 0 20px rgba(16,185,129,0.2)':''}">
            ${icon('database')} Use Sample Data
          </button>
        </div>
      </div>
    </div></div>

    ${isLoading || isDone ? `<div class="card" style="margin-bottom:1.5rem"><div class="card-content">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
        <div style="width:2.25rem;height:2.25rem;border-radius:9999px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${isDone ? `<span style="color:var(--emerald);font-size:1rem;font-weight:700">✓</span>` : `<div style="width:1rem;height:1rem;border:2px solid ${accentColor};border-top-color:transparent;border-radius:9999px;animation:spin 0.75s linear infinite"></div>`}
        </div>
        <div style="flex:1">
          <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary);margin-bottom:0.5rem">${isDone ? 'Data loaded successfully' : 'Processing data…'}</div>
          <div style="background:rgba(255,255,255,0.06);border-radius:9999px;height:6px;overflow:hidden">
            <div style="height:100%;background:linear-gradient(90deg,${accentColor},${isCRM?'#34d399':'#818cf8'});border-radius:9999px;transition:width 0.5s ease;width:${state.uploadProgress}%"></div>
          </div>
        </div>
        <div style="font-size:0.9375rem;font-weight:700;color:${accentColor};width:2.75rem;text-align:right">${state.uploadProgress}%</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0">
        ${stages.slice(0, Math.min(state.uploadStageIndex+1, stages.length)).map((s,i) => {
          const done = i < state.uploadStageIndex || isDone;
          const active = i === state.uploadStageIndex && !isDone;
          const ac = isCRM ? '#10b981' : '#6366f1';
          const acVar = isCRM ? 'var(--emerald)' : 'var(--accent)';
          const circle = done
            ? `background:${ac};color:#000;font-size:0.6875rem;font-weight:800`
            : active
            ? `border:2px solid ${ac};color:${ac};font-size:0.75rem;font-weight:700`
            : `border:2px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.25);font-size:0.75rem`;
          return `<div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;${i<stages.length-1?'border-bottom:1px solid rgba(255,255,255,0.04)':''}">
            <div style="width:1.625rem;height:1.625rem;border-radius:9999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;${circle}">
              ${done ? '✓' : i+1}
            </div>
            <span style="font-size:0.8125rem;font-weight:${active?600:400};color:${done?acVar:active?'var(--text-primary)':'rgba(255,255,255,0.3)'}">
              ${s.msg}${active?`<span style="margin-left:0.25rem;letter-spacing:0.1em;color:${acVar};animation:blink 1.1s ease-in-out infinite">···</span>`:''}
            </span>
          </div>`;
        }).join('')}
      </div>
    </div></div>` : ''}

    ${isDone ? `<div style="display:flex;justify-content:center;padding-bottom:2rem">
      <button class="btn btn-primary" style="padding:0.875rem 2.5rem;font-size:1rem;${isCRM?'background:linear-gradient(135deg,var(--emerald),#059669);box-shadow:0 0 20px rgba(16,185,129,0.2)':''}" onclick="navigateTo('raw')">
        ${icon('eye')} Explore Raw Data ${icon('arrowRight')}
      </button>
    </div>` : ''}
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  TRANSITION SCREEN
// ════════════════════════════════════════════════════════════
function renderTransitionScreen() {
  const isCRM = state.activeDataset === 'crm';
  const cfg = _getTransitionConfig(state.transitionMessage);
  const acVar = isCRM ? 'var(--emerald)' : 'var(--accent)';
  const acGrad = isCRM ? '#34d399' : '#818cf8';
  const currentStep = state.transitionStep || 0;
  const pct = Math.min(Math.round((currentStep / cfg.msgs.length) * 100), 88);
  const iconMap = { zap: 'zap', layers: 'layers', search: 'search', shield: 'shield', database: 'database' };
  const ic = iconMap[cfg.icon] || 'database';

  return `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:2rem">
    <div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:2.25rem 2.5rem 2rem;width:100%;max-width:490px;animation:fadeInUp 0.35s ease-out;box-shadow:0 40px 80px rgba(0,0,0,0.5)">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.875rem">
        <div style="width:3rem;height:3rem;border-radius:0.75rem;background:linear-gradient(135deg,${acVar},${acGrad});display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 8px 20px rgba(0,0,0,0.3)">
          ${icon(ic)}
        </div>
        <div>
          <div style="font-size:1.0625rem;font-weight:700;color:var(--text-primary);line-height:1.3">${cfg.title}</div>
          <div style="font-size:0.8125rem;color:var(--text-tertiary);margin-top:0.125rem">Executing pipeline — do not navigate away</div>
        </div>
      </div>
      <div style="margin-bottom:1.625rem">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;margin-bottom:0.5rem">
          <span style="color:var(--text-tertiary)">Pipeline progress</span>
          <span id="ts-pct" style="color:${acVar};font-weight:700">${pct}%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:9999px;overflow:hidden">
          <div id="ts-bar" style="height:100%;background:linear-gradient(90deg,${acVar},${acGrad});border-radius:9999px;width:${pct}%;transition:width 0.42s ease"></div>
        </div>
      </div>
      <div id="ts-steps">
        ${_buildTransitionSteps(cfg.msgs, currentStep)}
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  ENHANCED CANONICAL MAPPING PAGE
// ════════════════════════════════════════════════════════════
renderMappingPage = function() {
  const isCRM = state.activeDataset === 'crm';
  const fields = isCRM ? CRM_CANONICAL_FIELDS : [
    { name: 'canonical_name', type: 'string', required: true,
      source: 'supplier_product_name (US) + product_title_english (EU) + bezeichnung (Nordic)',
      logic: 'BY item description used as primary label; SAP material description used as fallback where BY row is absent. Longest, most complete name wins.',
      samples: ['Anti-CD20 Monoclonal Antibody, Clone 2H7, FITC','Anti-CD3 Antibody, Clone UCHT1, FITC','Human TNF-alpha ELISA Kit'] },
    { name: 'target', type: 'string', required: true,
      source: 'target (US) + zielprotein (EU) + —inferred— (Nordic)',
      logic: 'US "target" field is preferred. EU "zielprotein" used as fallback. Nordic column absent — inferred from free_text_spec using NER model.',
      samples: ['CD20','CD3','TNF-alpha','GAPDH'] },
    { name: 'application', type: 'string', required: true,
      source: 'application (US) + anwendung (EU) + anvandning (Nordic)',
      logic: '"FC" / "Flow Cytometry" / "FACS" / "Durchflusszytometrie" / "Flodescytometri" all resolve to "Flow Cytometry" via synonym map.',
      samples: ['Flow Cytometry','ELISA','Western Blot','Protein Quantification'] },
    { name: 'reactivity', type: 'string', required: true,
      source: 'reactivity (US) + spezies (EU) + reaktivitet (Nordic)',
      logic: '"Mensch" (DE), "Homme" (FR), "Manniska" (SE), "Hu" all resolve to "Human". Multi-species joined with semicolons.',
      samples: ['Human','Human, Mouse','Human; Rat'] },
    { name: 'host_species', type: 'string', required: false,
      source: 'host_species (US) + —inferred from product title— (EU/Nordic)',
      logic: 'US source has explicit field. EU and Nordic sources lack it — parsed from product title using regex (e.g. "Rabbit polyklonal" → "Rabbit").',
      samples: ['Mouse','Rabbit',''] },
    { name: 'clone', type: 'string', required: false,
      source: 'clone (US) + —parsed from description— (EU/Nordic)',
      logic: 'US source has dedicated clone field. EU/Nordic: extracted from description field using regex pattern for clone identifiers (e.g. "Klon 2H7" → "2H7").',
      samples: ['2H7','UCHT1',''] },
    { name: 'category', type: 'enum', required: true,
      source: 'Derived from product title + application field across all sources',
      logic: 'Rule-based classifier: contains "ELISA Kit" → "ELISA Kit"; contains "Antibody/Antikropp/Antikorper" → "Antibody"; contains "Assay Kit" → "Assay Kit".',
      samples: ['Antibody','ELISA Kit','Assay Kit','Recombinant Protein'] },
    { name: 'conjugate', type: 'string', required: false,
      source: 'conjugate (US) + —parsed from title— (EU/Nordic)',
      logic: '"Fitc" / "FITC" normalized to "FITC". "HRP", "PE" preserved as-is. "No conjugate" / "Unconjugated" → empty string.',
      samples: ['FITC','PE','HRP',''] },
  ];
  const mappings = isCRM
    ? CRM_CANONICAL_FIELDS.map(f => ({
        canonical: f.name, sources: f.source.split('+').map(s => s.trim()),
        confidence: f.name === 'canonical_account_name' ? 0.94 : f.name === 'total_arr_usd' ? 0.99 : f.name === 'legal_name' ? 0.91 : f.name === 'products_active' ? 0.97 : 0.88,
      }))
    : [
        { canonical: 'canonical_name', sources: ['supplier_product_name (US)','product_title_english (EU)','bezeichnung (Nordic)'], confidence: 0.92 },
        { canonical: 'target', sources: ['target (US)','zielprotein (EU)','—inferred— (Nordic)'], confidence: 0.85 },
        { canonical: 'application', sources: ['application (US)','anwendung (EU)','anvandning (Nordic)'], confidence: 0.78 },
        { canonical: 'reactivity', sources: ['reactivity (US)','spezies (EU)','reaktivitet (Nordic)'], confidence: 0.82 },
        { canonical: 'host_species', sources: ['host_species (US)','—parsed from title— (EU/Nordic)'], confidence: 0.76 },
        { canonical: 'clone', sources: ['clone (US)','—parsed from description—'], confidence: 0.81 },
        { canonical: 'category', sources: ['—derived from title + application—'], confidence: 0.88 },
      ];

  const approvedCount = Object.values(state.mappingApprovals).filter(v => v === 'approved').length;
  const autoApproved = mappings.filter(m => m.confidence >= 0.9 && !state.mappingApprovals[m.canonical]).length;

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Canonicalization</h1><p class="page-subtitle">${isCRM ? 'Map CRM source fields to canonical account schema.' : 'Standardize disparate schemas into one golden canonical model.'}</p></div>
      ${renderPageHeaderActions(`
        <button class="btn btn-accent" onclick="toggleAutoMap()">${icon('wand2')} Auto-Map</button>
        <button class="btn btn-primary" onclick="navigateWithTransition('workbench','self-healing')">Proceed to Self-Healing ${icon('arrowRight')}</button>
      `)}
    </div>
    ${renderStorylineCard()}

    ${state.autoMapped ? `<div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius);padding:0.875rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem">
      <span style="color:var(--emerald)">${icon('checkCircle2')}</span>
      <span style="font-size:0.875rem;color:var(--text-secondary)"><strong style="color:var(--emerald)">${autoApproved} mappings auto-approved</strong> (confidence ≥ 90%). Review and approve remaining ${mappings.length - autoApproved - approvedCount} mappings below.</span>
    </div>` : ''}

    <div class="grid-1-3">
      <div class="card">
        <div class="card-header"><div class="card-header-row"><div class="card-title card-title-lg">Canonical Schema</div></div><div class="card-description">${isCRM ? 'Target schema for harmonized CRM records' : 'Universal schema for harmonized records'}</div></div>
        <div class="card-content no-padding">
          ${fields.map(f => {
            const isExp = state.expandedMappingField === f.name;
            const approval = state.mappingApprovals[f.name] || (mappings.find(m=>m.canonical===f.name)?.confidence >= 0.9 && state.autoMapped ? 'auto' : null);
            return `<div style="border-bottom:1px solid var(--border-subtle)">
              <div class="canonical-item" style="cursor:pointer" onclick="toggleMappingField('${f.name}')">
                <div>
                  <div class="item-name" style="display:flex;align-items:center;gap:0.375rem">
                    <span style="color:var(--text-accent);font-size:0.75rem">${isExp ? '▼' : '▶'}</span>
                    ${f.name}
                    ${f.required ? '<span class="badge badge-red" style="margin-left:0.25rem;font-size:0.5rem">REQ</span>' : ''}
                  </div>
                  <div class="item-type">${f.type}</div>
                </div>
                ${approval === 'approved' || approval === 'auto' ? `<span class="badge badge-emerald" style="font-size:0.5625rem">✓ ${approval==='auto'?'Auto-':''}Approved</span>`
                  : approval === 'rejected' ? `<span class="badge badge-red" style="font-size:0.5625rem">✗ Rejected</span>`
                  : `<span class="badge badge-surface" style="font-size:0.5625rem">Pending</span>`}
              </div>
              ${isExp ? `<div style="padding:0.875rem 1.25rem;background:rgba(99,102,241,0.04);border-top:1px solid var(--border-subtle)">
                <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.375rem">Source</div>
                <div style="font-size:0.8125rem;color:var(--text-secondary);font-family:var(--font-mono);margin-bottom:0.875rem">${f.source}</div>
                <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.375rem">Mapping Logic</div>
                <div style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.55;margin-bottom:0.875rem">${f.logic}</div>
                <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.375rem">Sample Values</div>
                <div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-bottom:0.875rem">${f.samples.map(s => `<span class="sample-tag">${s||'(empty)'}</span>`).join('')}</div>
                <div style="display:flex;gap:0.375rem">
                  <button class="btn btn-emerald-outline" style="flex:1;font-size:0.75rem" onclick="event.stopPropagation();setMappingApproval('${f.name}','approved')">${icon('checkCircle2','icon-sm')} Approve</button>
                  <button class="btn" style="flex:1;font-size:0.75rem;background:var(--red-glow);color:var(--red);border-color:rgba(239,68,68,0.2)" onclick="event.stopPropagation();setMappingApproval('${f.name}','rejected')">${icon('xCircle','icon-sm')} Reject</button>
                  <button class="btn btn-outline" style="font-size:0.75rem" onclick="event.stopPropagation();setMappingApproval('${f.name}','skipped')">Skip</button>
                </div>
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-header-row">
            <div><div class="card-title card-title-lg">Source → Canonical Mapping</div><div class="card-description">AI-suggested column mappings with confidence scores</div></div>
            <button class="btn btn-accent" onclick="toggleAutoMap()">${icon('wand2')} Auto-Map</button>
          </div>
        </div>
        <div class="card-content no-padding">
          ${state.autoMapped ? `<div class="table-wrapper"><table><thead><tr><th>Canonical Field</th><th>Source Columns</th><th>Confidence</th><th>Status</th></tr></thead><tbody>
            ${mappings.map(m => {
              const conf = Math.round(m.confidence * 100);
              const confColor = conf >= 90 ? 'var(--emerald)' : conf >= 80 ? 'var(--amber)' : 'var(--red)';
              const approval = state.mappingApprovals[m.canonical] || (conf >= 90 && state.autoMapped ? 'auto' : null);
              return `<tr>
                <td class="td-primary" style="cursor:pointer;color:var(--text-accent)" onclick="toggleMappingField('${m.canonical}')">${icon('chevronRight','icon-sm')} ${m.canonical}</td>
                <td>${m.sources.map(s => `<span class="sample-tag">${s}</span>`).join(' ')}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:0.5rem">
                    <div class="progress-bar" style="width:50px"><div class="progress-bar-fill" style="width:${conf}%;background:${confColor}"></div></div>
                    <span style="font-size:0.75rem;font-weight:700;color:${confColor}">${conf}%</span>
                  </div>
                </td>
                <td>${approval==='approved'||approval==='auto' ? `<span class="badge badge-emerald" style="font-size:0.5625rem">✓ ${approval==='auto'?'Auto-':''}Approved</span>`
                     : approval==='rejected' ? `<span class="badge badge-red" style="font-size:0.5625rem">✗ Rejected</span>`
                     : `<div style="display:flex;gap:0.25rem">
                          <button class="btn btn-emerald-outline" style="padding:0.25rem 0.5rem;font-size:0.625rem" onclick="setMappingApproval('${m.canonical}','approved')">✓</button>
                          <button class="btn" style="padding:0.25rem 0.5rem;font-size:0.625rem;background:var(--red-glow);color:var(--red);border-color:rgba(239,68,68,0.2)" onclick="setMappingApproval('${m.canonical}','rejected')">✗</button>
                          <button class="btn btn-outline" style="padding:0.25rem 0.5rem;font-size:0.625rem" onclick="setMappingApproval('${m.canonical}','skipped')">–</button>
                        </div>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody></table></div>` : `<div class="empty-state" style="min-height:300px"><div class="empty-state-icon">${icon('wand2','icon-2xl')}</div><p>Click <strong>Auto-Map</strong> to generate AI-suggested mappings</p></div>`}
        </div>
      </div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
};

// ════════════════════════════════════════════════════════════
//  ENHANCED WORKBENCH — Exception queue + re-run
// ════════════════════════════════════════════════════════════
renderWorkbenchPage = function() {
  const issues = getActiveHarmonizationIssues();
  const types = state.activeDataset === 'crm'
    ? ['normalization','matching','enrichment','validation']
    : ['normalization','matching','enrichment','validation'];
  const filtered = issues.filter(i => i.type === state.activeIssueTab);
  const selected = issues.find(i => i.id === state.selectedIssueId);
  const issueFullNames = { normalization:'Normalize', matching:'Match', enrichment:'Enrich', validation:'Validate' };
  const totalUnresolved = issues.filter(i => !i.resolved).length;
  const allResolved = totalUnresolved === 0;
  const isCRM = state.activeDataset === 'crm';

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Self-Healing Workbench</h1>
        <p class="page-subtitle">${isCRM ? 'AI-driven entity resolution and deduplication with human-in-the-loop approval.' : 'AI-driven resolution of data inconsistencies with human-in-the-loop verification.'}</p>
      </div>
      ${renderPageHeaderActions(`
        <button class="btn btn-emerald-outline" onclick="reRunWithRules()">${icon('refreshCw')} Re-run with Rules</button>
        <button class="btn btn-primary" onclick="navigateWithTransition('golden','golden-records')">Generate Golden Records ${icon('arrowRight')}</button>
      `)}
    </div>

    ${totalUnresolved > 0 ? `<div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25);border-radius:var(--radius);padding:0.875rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem">
      <span style="color:var(--amber)">${icon('alertTriangle')}</span>
      <span style="font-size:0.875rem;color:var(--text-secondary)"><strong style="color:var(--amber)">${totalUnresolved} exception${totalUnresolved!==1?'s':''} detected</strong> — review and accept each solution, or use Re-run to auto-resolve high-confidence items.</span>
    </div>` : `<div style="background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius);padding:0.875rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem">
      <span style="color:var(--emerald)">${icon('checkCircle2')}</span>
      <span style="font-size:0.875rem;color:var(--text-secondary)"><strong style="color:var(--emerald)">All exceptions resolved.</strong> Click "Generate Golden Records" to proceed.</span>
    </div>`}

    ${state.activeDataset === 'crm' ? renderCRMEntityClusters() : ''}
    <div class="workbench-layout">
      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">Exception Queue</div></div>
        <div style="padding:0.75rem 1rem 0"><div class="tabs-nav">${types.map(t => {
          const cnt = issues.filter(i=>i.type===t&&!i.resolved).length;
          return `<button class="tab-btn ${state.activeIssueTab===t?'active':''}" onclick="setIssueTab('${t}')" title="${t}">${icon(issueTypeIcons[t])} ${issueFullNames[t]}${cnt>0?`<span class="tab-badge">${cnt}</span>`:''}</button>`;
        }).join('')}</div></div>
        <div class="card-content" style="overflow-y:auto">${filtered.length===0
          ? `<div class="empty-state"><p>No issues in this category.</p></div>`
          : filtered.map(iss => `<div class="issue-chip ${iss.resolved?'resolved':''} ${state.selectedIssueId===iss.id?'selected':''}" onclick="selectIssue('${iss.id}')">
              <span class="${iss.confidence>0.9?'issue-icon-emerald':iss.confidence>0.8?'issue-icon-amber':'issue-icon-red'}">${icon(issueTypeIcons[iss.type])}</span>
              <div style="flex:1">
                <div style="color:var(--text-primary);font-weight:500;font-size:0.8125rem;${iss.resolved?'text-decoration:line-through;opacity:0.6':''}">${iss.description}</div>
                <div style="margin-top:0.25rem;display:flex;align-items:center;gap:0.5rem">
                  <span style="font-size:0.6875rem;color:var(--text-tertiary)">Conf: <strong style="color:${iss.confidence>0.9?'var(--emerald)':iss.confidence>0.8?'var(--amber)':'var(--red)'}">${Math.round(iss.confidence*100)}%</strong></span>
                  ${iss.resolved ? `<span class="badge badge-emerald" style="font-size:0.5rem">✓ Resolved</span>` : ''}
                </div>
                ${!iss.resolved ? `<button class="btn btn-emerald-outline" style="margin-top:0.5rem;padding:0.25rem 0.625rem;font-size:0.6875rem" onclick="event.stopPropagation();acceptException('${iss.id}')">${icon('checkCircle2','icon-sm')} Accept Solution</button>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div></div>

      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">Workspace</div></div>
        <div class="card-content">${selected ? `<div>
          <h2 style="font-size:1.125rem;color:var(--text-primary);margin-bottom:0.5rem">${selected.description}</h2>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
            <span class="badge ${issueTypeColors[selected.type]}">${selected.type}</span>
            <span class="confidence-inline">${icon('sparkles')} Confidence: <strong>${Math.round(selected.confidence*100)}%</strong></span>
            ${selected.resolved ? `<span class="badge badge-emerald">✓ Resolved</span>` : ''}
          </div>
          <div class="diff-grid">
            <div><div class="diff-label"><span class="dot dot-red"></span> Before (Raw)</div><div class="diff-block-before"><pre>${JSON.stringify(selected.before,null,2)}</pre></div></div>
            <div><div class="diff-label"><span class="dot dot-green"></span> After (Healed)</div><div class="diff-block-after"><pre>${JSON.stringify(selected.after,null,2)}</pre></div></div>
          </div>
          ${renderHealMorph(selected)}
        </div>` : `<div class="empty-state" style="height:100%"><div class="empty-state-icon">${icon('zap','icon-2xl')}</div><p>Select an exception to review the AI-suggested resolution</p></div>`}
        </div>
      </div></div>

      <div class="workbench-col"><div class="card"><div class="card-header"><div class="card-title-section">AI Reasoning</div></div>
        <div class="card-content" style="display:flex;flex-direction:column;justify-content:space-between;flex:1">
          ${selected ? `<div>
            <div class="reasoning-box"><p>${selected.reasoning}</p></div>
            <div class="action-required" style="margin-top:1rem"><h4>Human Verification</h4><p>Review the transformation. Accept or edit manually.</p></div>
          </div>
          <div class="reasoning-actions">
            <button class="btn btn-primary" onclick="acceptException('${selected.id}')" ${selected.resolved?'disabled':''}>${selected.resolved?'✓ Resolved':'Accept Solution'}</button>
            <button class="btn btn-outline" ${selected.resolved?'disabled':''}>Edit Manually</button>
            <button class="btn btn-ghost" onclick="reRunWithRules()" style="font-size:0.75rem">${icon('refreshCw','icon-sm')} Re-run with Rules</button>
          </div>` : `<div class="empty-state" style="height:100%"><p style="font-size:0.8125rem">Reasoning appears when an exception is selected.</p></div>`}
        </div>
      </div></div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
};

// ════════════════════════════════════════════════════════════
//  ENHANCED GOLDEN RECORDS — Dashboard with search, charts, hover
// ════════════════════════════════════════════════════════════
function renderGoldenTable() {
  const records = getActiveGoldenRecords();
  const q = state.goldenDashboardSearch.toLowerCase().trim();
  const filtered = q ? records.filter(r =>
    r.canonical_name.toLowerCase().includes(q) ||
    (r.target||'').toLowerCase().includes(q) ||
    (r.application||'').toLowerCase().includes(q) ||
    (r.id||'').toLowerCase().includes(q) ||
    (r.industry||'').toLowerCase().includes(q)
  ) : records;
  const isCRM = state.activeDataset === 'crm';

  if (isCRM) {
    return `<div class="table-wrapper"><table><thead><tr><th>ID</th><th>Account</th><th>Industry</th><th>Products Active</th><th>Total ARR</th><th>Open Pipeline</th><th>Sources</th><th></th></tr></thead><tbody>
      ${filtered.map(r => `<tr class="${state.selectedRecordId===r.id?'selected':''}" style="cursor:pointer" onclick="selectRecord('${r.id}')">
        <td class="td-mono">${r.id}</td>
        <td class="td-primary">${r.canonical_name}<br><span style="font-size:0.6875rem;color:var(--text-tertiary)">${r.legal_name}</span></td>
        <td><span class="badge badge-surface">${r.industry||'-'}</span></td>
        <td><span style="font-size:0.75rem;color:var(--text-secondary)">${r.application||'-'}</span></td>
        <td><strong style="color:var(--emerald)">$${(r.total_arr/1000).toFixed(0)}K</strong>
          <div style="margin-top:0.25rem;height:4px;background:rgba(255,255,255,0.06);border-radius:9999px;width:80px"><div style="height:100%;background:var(--emerald);border-radius:9999px;width:${Math.round((r.total_arr/220000)*100)}%"></div></div>
        </td>
        <td><span style="color:var(--amber)">$${(r.open_pipeline/1000).toFixed(0)}K</span></td>
        <td><span class="badge badge-accent">${r.suppliers.length} src</span></td>
        <td><span style="color:var(--text-muted);display:inline-block;transition:transform 0.15s;${state.selectedRecordId===r.id?'transform:rotate(90deg)':''}">${icon('chevronRight')}</span></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  }
  return `<div class="table-wrapper"><table><thead><tr><th>ID</th><th>Canonical Name</th><th>Target</th><th>Application</th><th>Suppliers</th><th></th></tr></thead><tbody>
    ${filtered.map(r => `<tr class="${state.selectedRecordId===r.id?'selected':''}" style="cursor:pointer" onclick="selectRecord('${r.id}')">
      <td class="td-mono">${r.id}</td><td class="td-primary">${r.canonical_name}</td><td>${r.target||'-'}</td>
      <td><span class="badge badge-surface">${r.application||'-'}</span></td>
      <td><span class="badge badge-accent">${r.suppliers.length} suppliers</span></td>
      <td><span style="color:var(--text-muted);display:inline-block;transition:transform 0.15s;${state.selectedRecordId===r.id?'transform:rotate(90deg)':''}">${icon('chevronRight')}</span></td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

renderGoldenPage = function() {
  const records = getActiveGoldenRecords();
  const sel = records.find(r => r.id === state.selectedRecordId);
  const isCRM = state.activeDataset === 'crm';
  const rawCount = isCRM
    ? Object.values(CRM_FILES).reduce((s,f) => s + f.data.length, 0)
    : buildRawSearchRecords().length;
  const totalGolden = records.length;
  const mergeReduction = rawCount > 0 ? Math.round((1 - totalGolden / rawCount) * 100) : 0;
  const multiSrc = records.filter(r => r.suppliers.length > 1).length;

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Golden ${isCRM?'Account':'Product'} Records</h1>
        <p class="page-subtitle">${isCRM ? 'Canonical customer accounts — deduplicated, enriched, and ready for revenue intelligence.' : 'The finalized, harmonized catalog — clean, consistent, and reliable.'}</p>
      </div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateWithTransition('search','search-impact')">Test Search Impact ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}

    ${isCRM ? `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.875rem;margin-bottom:1.5rem">
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04));border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-lg);padding:1.375rem;text-align:center">
        <div style="font-size:2rem;font-weight:900;color:var(--emerald);letter-spacing:-0.02em">$${(records.reduce((s,r)=>s+r.total_arr,0)/1000).toFixed(0)}K</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Total ARR — Now Attributed</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.25rem">${rawCount} source records unified</div>
      </div>
      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.03));border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-lg);padding:1.375rem;text-align:center">
        <div style="font-size:2rem;font-weight:900;color:var(--amber);letter-spacing:-0.02em">$463K</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Previously Hidden ARR</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.25rem">From Houston ISD fragmentation alone</div>
      </div>
      <div style="background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(99,102,241,0.03));border:1px solid rgba(99,102,241,0.3);border-radius:var(--radius-lg);padding:1.375rem;text-align:center">
        <div style="font-size:2rem;font-weight:900;color:var(--accent);letter-spacing:-0.02em">${mergeReduction}%</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Deduplication Rate</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.25rem">${rawCount} records → ${totalGolden} canonical districts</div>
      </div>
    </div>` : ''}

    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <div class="stat-tile emerald"><div class="stat-label">Golden ${isCRM?'Accounts':'Records'}</div><div class="stat-value emerald">${totalGolden}</div></div>
      <div class="stat-tile accent"><div class="stat-label">Raw ${isCRM?'Account Records':'Product Records'}</div><div class="stat-value accent">${rawCount}</div></div>
      <div class="stat-tile purple"><div class="stat-label">Merge Reduction</div><div class="stat-value" style="color:var(--purple)">${mergeReduction}%</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Multi-Source Records</div><div class="stat-value cyan">${multiSrc}</div></div>
      ${isCRM ? `<div class="stat-tile amber"><div class="stat-label">Open Pipeline</div><div class="stat-value amber">$${(records.reduce((s,r)=>s+r.open_pipeline,0)/1000).toFixed(0)}K</div></div>
      <div class="stat-tile emerald"><div class="stat-label">Active Products</div><div class="stat-value emerald">${records.reduce((s,r)=>s+(r.products_active?r.products_active.length:0),0)}</div></div>` : ''}
    </div>

    ${isCRM ? `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1.125rem 1.375rem;margin-bottom:1.5rem">
      <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary);margin-bottom:0.875rem">ARR Attribution — Before vs After Harmonization</div>
      <div style="display:flex;flex-direction:column;gap:0.625rem">
        ${records.map(r => `<div style="display:flex;align-items:center;gap:0.875rem">
          <div style="width:148px;font-size:0.75rem;color:var(--text-secondary);text-align:right;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${r.canonical_name}">${r.canonical_name}</div>
          <div style="flex:1;height:16px;background:rgba(255,255,255,0.04);border-radius:3px;overflow:hidden;position:relative">
            <div style="height:100%;background:linear-gradient(90deg,var(--emerald),#34d399);border-radius:3px;width:${Math.min(Math.round((r.total_arr/200000)*100),100)}%;transition:width 0.9s ease-out"></div>
          </div>
          <div style="width:52px;font-size:0.75rem;font-weight:700;color:var(--emerald);text-align:right">$${(r.total_arr/1000).toFixed(0)}K</div>
          <div style="width:5rem;flex-shrink:0"><span class="badge badge-surface" style="font-size:0.5rem">${r.source_variants.length} variants → 1</span></div>
        </div>`).join('')}
      </div>
    </div>` : ''}

    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header">
        <div class="card-header-row">
          <div class="card-title card-title-lg">Master ${isCRM?'Account':'Product'} Catalog</div>
          <div style="position:relative;width:220px">
            <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text-muted)">${icon('search','icon-sm')}</span>
            <input type="text" value="${state.goldenDashboardSearch}" oninput="setGoldenSearch(this.value)" placeholder="Search records…" style="width:100%;padding:0.375rem 0.75rem 0.375rem 2rem;font-size:0.8125rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);outline:none;font-family:var(--font-sans)" />
          </div>
        </div>
        <div class="card-description">${isCRM ? 'Canonical accounts from deduplicated CRM, billing, and deal records' : 'Joined canonical records from all source feeds'}</div>
      </div>
      <div class="card-content no-padding" id="golden-search-results">${renderGoldenTable()}</div>
    </div>

    <div class="card"><div class="card-header"><div class="card-title card-title-lg" style="display:flex;align-items:center;gap:0.5rem"><span style="color:var(--accent)">${icon('gitCommit','icon-lg')}</span> Lineage Trace</div><div class="card-description">${sel ? `Provenance of "${sel.canonical_name}"` : 'Select a record to trace its source lineage'}</div></div>
      <div class="card-content">
        ${sel ? `<div style="animation:fadeInRight 0.25s ease-out">
          <div style="margin-bottom:1.25rem;display:flex;flex-wrap:wrap;align-items:flex-start;gap:1.5rem">
            <div style="flex:1">
              <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.375rem">${sel.canonical_name}</h3>
              <div style="display:flex;flex-wrap:wrap;gap:0.375rem">
                <span class="badge badge-emerald">${icon('shield','icon-sm')} Golden Record</span>
                <span class="badge badge-surface badge-mono">${sel.id}</span>
                ${isCRM && sel.source_variants ? `<span class="badge badge-amber">${sel.source_variants.length} name variants merged</span>` : ''}
              </div>
              ${isCRM && sel.source_variants ? `<div style="margin-top:0.875rem"><div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.375rem">Source Name Variants Unified</div>
              <div style="display:flex;flex-wrap:wrap;gap:0.25rem">${sel.source_variants.map(v=>`<span class="sample-tag" style="color:var(--red);border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.05)">${v}</span>`).join('')}</div>
              <div style="margin-top:0.375rem;font-size:0.75rem;color:var(--emerald)">↓ All resolve to: <strong>${sel.canonical_name}</strong></div></div>` : ''}
            </div>
            ${isCRM ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;min-width:200px">
              <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-sm);padding:0.75rem;text-align:center">
                <div style="font-size:1.25rem;font-weight:800;color:var(--emerald)">$${(sel.total_arr/1000).toFixed(0)}K</div>
                <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary)">Total ARR</div>
              </div>
              <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:var(--radius-sm);padding:0.75rem;text-align:center">
                <div style="font-size:1.25rem;font-weight:800;color:var(--amber)">$${(sel.open_pipeline/1000).toFixed(0)}K</div>
                <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary)">Open Pipeline</div>
              </div>
            </div>` : ''}
          </div>
          <div class="lineage-timeline">${sel._lineage.map(t => `<div class="lineage-item"><span class="lineage-dot lineage-dot-indigo"></span><div class="lineage-source"><span class="source-name">${t.source}</span><span class="source-id">${t.id}</span></div><p class="lineage-reasoning">${t.note}</p></div>`).join('')}
            <div class="lineage-item"><span class="lineage-dot lineage-dot-emerald"></span><div class="lineage-resolution"><h4>${icon('fileCheck')} Final Resolution</h4><p>Merged ${sel._lineage.length} source records into one canonical ${isCRM?'account':'entity'}.</p></div></div>
          </div>
        </div>` : `<div class="empty-state" style="padding:2rem 0"><div class="empty-state-icon">${icon('search','icon-2xl')}</div><p>Select a record to view lineage</p></div>`}
      </div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
};

// ════════════════════════════════════════════════════════════
//  NAV / PIPELINE / PAGE OVERRIDES
// ════════════════════════════════════════════════════════════
renderNav = function() {
  const isCRM = state.activeDataset === 'crm';
  const isLandingOrUpload = state.currentPage === 'landing' || state.currentPage === 'upload';
  const flowPages = ['raw','mapping','workbench','golden','search'];
  const navItems = flowPages.map((page, i) => ({
    page, name: ['Raw Data','Canonicalization','Harmonization','Golden Records','Search Impact'][i],
    icon: ['eye','layers','zap','shield','search'][i]
  }));
  const navHtml = (isLandingOrUpload ? [] : navItems).map(item =>
    `<button class="nav-link ${state.currentPage===item.page?'active':''}" onclick="navigateTo('${item.page}')">${icon(item.icon)} ${item.name}</button>`
  ).join('');

  const datasetBadge = !isLandingOrUpload ? `<span class="badge ${isCRM?'badge-emerald':'badge-accent'}" style="cursor:pointer;margin-left:0.5rem;font-size:0.5625rem" onclick="navigateTo('landing')">${isCRM?'CRM':'SKU'} Dataset ✕</span>` : '';
  const demoBtn = !isLandingOrUpload ? `<button class="btn btn-demo" style="margin-left:auto" onclick="startDemo()">${demoRunning?icon('crosshair')+' Stop':icon('activity')+' ▶ Run Demo'}</button>` : '';

  document.getElementById('header-nav').innerHTML = navHtml + datasetBadge + demoBtn;
  const brand = document.querySelector('.header-brand');
  if (brand) { brand.style.cursor = 'pointer'; brand.title = 'Go to home'; brand.onclick = () => navigateTo('landing'); }
};

renderPipeline = function() {
  if (state.currentPage === 'landing' || state.currentPage === 'upload' || state.transitioning) {
    document.getElementById('pipeline').innerHTML = '';
    return;
  }
  const steps = [
    { page: 'raw', label: 'Raw Data', num: '1' },
    { page: 'mapping', label: 'Canonicalization', num: '2' },
    { page: 'workbench', label: 'Self-Healing', num: '3' },
    { page: 'golden', label: 'Golden Records', num: '4' },
    { page: 'search', label: 'Search Impact', num: '5' },
  ];
  const pages = steps.map(s => s.page);
  const currentIdx = pages.indexOf(state.currentPage);
  document.getElementById('pipeline').innerHTML = `<div class="pipeline-progress">${steps.map((s,i) => {
    const cls = i===currentIdx?'active':i<currentIdx?'completed':'';
    const connector = i<steps.length-1?`<div class="pipeline-connector ${i<currentIdx?'pulsing':''}"></div>`:'';
    return `<button class="pipeline-step ${cls}" onclick="navigateTo('${s.page}')"><span class="step-num">${i<currentIdx?'✓':s.num}</span> ${s.label}</button>${connector}`;
  }).join('')}</div>`;
};

renderPage = function() {
  const main = document.getElementById('main-content');
  if (state.transitioning) { main.innerHTML = renderTransitionScreen(); return; }
  switch (state.currentPage) {
    case 'landing': main.innerHTML = renderLandingPage(); break;
    case 'upload':  main.innerHTML = renderUploadPage(); break;
    case 'raw':       main.innerHTML = renderRawPage(); break;
    case 'mapping':   main.innerHTML = renderMappingPage(); break;
    case 'workbench': main.innerHTML = renderWorkbenchPage(); break;
    case 'golden':    main.innerHTML = renderGoldenPage(); break;
    case 'search':    main.innerHTML = renderSearchPage(); break;
  }
  if (state.currentPage === 'workbench' && state.selectedIssueId) {
    setTimeout(() => triggerHealAnimation(), 600);
  }
};

// ── also fix selectFile for CRM ──────────────────────────
const _origSelectFile = selectFile;
selectFile = function(key) {
  const files = getActiveFiles();
  if (files[key]) {
    state.selectedFileKey = key;
    renderAll();
    setTimeout(() => {
      const issSection = document.getElementById('file-issues-section');
      if (issSection) issSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  } else { _origSelectFile(key); }
};

// ── override renderRawPage for CRM dataset ───────────────
const _prevRenderRawPage = renderRawPage;
renderRawPage = function() {
  if (state.activeDataset !== 'crm') return _prevRenderRawPage();
  const files = CRM_FILES;
  const fileKeys = Object.keys(files);
  const allIssues = fileKeys.reduce((s,k) => s+(files[k].issues||[]).length, 0);
  const allRows = fileKeys.reduce((s,k) => s+files[k].data.length, 0);
  const highIssues = fileKeys.reduce((s,k) => s+(files[k].issues||[]).filter(i=>i.severity==='high').length, 0);
  const avgQ = 48; // CRM data is messier

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Raw CRM Data Overview</h1><p class="page-subtitle">Explore the three source feeds — every duplicate entity and naming variant exposed.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateWithTransition('mapping','canonicalization')">Begin Canonicalization ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}
    <div class="stats-grid">
      <div class="stat-tile accent"><div class="stat-label">Source Files</div><div class="stat-value accent">${fileKeys.length}</div><div class="stat-delta">3 CRM systems</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Account Records</div><div class="stat-value cyan">${allRows}</div><div class="stat-delta">across all sources</div></div>
      <div class="stat-tile red"><div class="stat-label">Issues Detected</div><div class="stat-value red">${allIssues}</div><div class="stat-delta negative">${highIssues} critical</div></div>
      <div class="stat-tile amber"><div class="stat-label">Avg Quality Score</div><div class="stat-value amber">${avgQ}%</div><div class="stat-delta negative">entity duplication primary issue</div></div>
    </div>
    <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.22);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.625rem">
        ${icon('alertCircle','icon-sm')}
        <span style="font-size:0.9375rem;font-weight:700;color:var(--red)">Account Fragmentation Detected — $463K ARR Cannot Be Attributed</span>
      </div>
      <p style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.6;margin-bottom:1rem">The same K-12 school districts appear under different names in each of the 3 source systems. Renewal risk, expansion opportunity, and product health are all invisible until these accounts are unified.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:0.625rem">
        ${[
          { name:'Houston ISD', variants:['Houston ISD','HOUSTON MATH PROGRAM','Houston Public Schools','Houston Federal Programs','Houston ISD - Supplemental','HOUSTON CREDIT RECOVERY'], arr:'$463K', severity:'red' },
          { name:'Riverview ISD', variants:['Riverview ISD','RIVERVIEW CREDIT RECOVERY','Riverview ISD - Credit Recovery','Riverview Public Schools','Riverview ISD Billing'], arr:'$436K', severity:'red' },
          { name:'Oak Valley SD', variants:['Oak Valley ISD','Oak Valley School District','OAK VALLEY CREDIT RECOVERY'], arr:'$189K', severity:'amber' },
          { name:'Pine Hills ISD', variants:['Pine Hills ISD','PINE_HILLS_LITERACY_PILOT','Pine Hills'], arr:'$124K', severity:'amber' },
        ].map(c => `<div style="background:rgba(${c.severity==='red'?'239,68,68':'245,158,11'},0.07);border:1px solid rgba(${c.severity==='red'?'239,68,68':'245,158,11'},0.22);border-radius:var(--radius-sm);padding:0.75rem">
          <div style="font-size:0.75rem;font-weight:700;color:var(--${c.severity});margin-bottom:0.375rem">${c.name} — ${c.variants.length} variants</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.1875rem;margin-bottom:0.375rem">
            ${c.variants.slice(0,3).map(v=>`<span style="font-size:0.5625rem;background:rgba(${c.severity==='red'?'239,68,68':'245,158,11'},0.1);border:1px solid rgba(${c.severity==='red'?'239,68,68':'245,158,11'},0.2);border-radius:3px;padding:0.125rem 0.3125rem;color:var(--${c.severity})">${v}</span>`).join('')}
            ${c.variants.length>3?`<span style="font-size:0.5625rem;color:var(--text-muted);padding:0.125rem 0.25rem">+${c.variants.length-3} more</span>`:''}
          </div>
          <div style="font-size:0.6875rem;color:var(--text-tertiary)">${c.arr} ARR split across records</div>
        </div>`).join('')}
      </div>
    </div>
    <h2 style="color:var(--text-primary);margin-bottom:1rem;font-size:1.125rem">Source Files</h2>
    <div class="source-files-grid">
      ${fileKeys.map(key => {
        const f = files[key];
        const q = key === 'contract_billing.csv' ? 38 : key === 'product_usage.csv' ? 45 : 52;
        const fileStory = {
          'salesforce_crm.csv':   '4 duplicate clusters · $463K hidden ARR',
          'product_usage.csv':    'All-caps export artifacts · 3 at-risk districts masked',
          'contract_billing.csv': '3 billing names for Houston ISD · $347K unattributed',
        }[key] || '';
        return `<div class="source-file-card ${state.selectedFileKey===key?'selected':''}" onclick="selectFile('${key}')">
          <div class="source-file-icon ${f.type}">${f.type.toUpperCase()}</div>
          <div class="source-file-name">${displayFileName(key)}</div>
          <div class="source-file-meta"><span>${f.data.length} loaded</span><span>${f.rows.toLocaleString()} source</span><span>${f.region}</span></div>
          ${fileStory ? `<div style="font-size:0.6875rem;color:var(--amber);margin-top:0.375rem;line-height:1.4">${fileStory}</div>` : ''}
          <div style="margin-top:0.75rem">
            <div class="quality-bar"><div class="quality-bar-fill low" style="width:${q}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:0.6875rem">
              <span style="color:var(--text-tertiary)">Quality</span>
              <span style="color:var(--red);font-weight:700">${q}%</span>
            </div>
          </div>
          <div style="margin-top:0.5rem"><span class="badge badge-red">${icon('alertCircle','icon-sm')} ${(f.issues||[]).filter(i=>i.severity==='high').length} critical</span></div>
        </div>`;
      }).join('')}
    </div>
    ${state.selectedFileKey && files[state.selectedFileKey] ? renderCRMFileDetail(files[state.selectedFileKey], state.selectedFileKey) : `<div class="card" style="padding:3rem;text-align:center;color:var(--text-muted)"><p>Select a source file above to inspect its records and detected issues</p></div>`}
    ${renderPageHelpPanel()}
  </div>`;
};

function renderCRMFileDetail(file, key) {
  const fileIssues = file.issues || [];
  const aiInsights = {
    'salesforce_crm.csv': [
      { text: '<strong>4 duplicate account clusters</strong> detected for Houston ISD — $463K ARR fragmented across 4 records. Consolidation would reveal enterprise-tier district.' },
      { text: '<strong>Segment casing issue</strong>: "charter network" (lowercase) appears 1× vs "Charter Network" 18× — will break GROUP BY queries in Salesforce reports.' },
    ],
    'product_usage.csv': [
      { text: '<strong>All-caps variants</strong> detected: "HOUSTON MATH PROGRAM", "RIVERVIEW CREDIT RECOVERY" — likely export artifacts from ProductTelemetry system.' },
      { text: '<strong>3 at-risk districts</strong> with usage_health_score below 50 (Oak Valley Credit Recovery: 33, Pine Hills ISD: 29) — intervention flags suppressed by data fragmentation.' },
    ],
    'contract_billing.csv': [
      { text: '<strong>Product abbreviation "PL"</strong> in 2 records cannot be matched to product catalog without cross-reference to "Professional Learning" family.' },
      { text: '<strong>3 billing names for Houston ISD</strong>: "Houston Public Schools", "Houston Federal Programs", "Houston ISD" — $347K in invoices cannot be attributed to district without deduplication.' },
    ],
  };
  const insights = aiInsights[key] || [];
  const highCnt = fileIssues.filter(i=>i.severity==='high').length;
  const medCnt  = fileIssues.filter(i=>i.severity==='medium').length;
  return `<div style="animation:fadeInUp 0.3s ease-out;margin-top:1.5rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.125rem">
      <div>
        <h2 style="color:var(--text-primary);font-size:1.125rem;font-weight:700">${displayFileName(key)}</h2>
        <p style="color:var(--text-tertiary);font-size:0.8125rem;margin-top:0.25rem">${file.description}</p>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <span class="badge badge-surface">${file.data.length} rows</span>
        ${highCnt > 0 ? `<span class="badge badge-red">${highCnt} critical</span>` : ''}
        ${medCnt  > 0 ? `<span class="badge badge-amber">${medCnt} warnings</span>` : ''}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:1.25rem;align-items:start;min-width:0">
      <!-- LEFT: data table + issues -->
      <div style="min-width:0;overflow:hidden">
        <div class="data-section-header">${icon('eye','icon-sm')} Data Preview</div>
        <div class="raw-table-scroll heal-animation" style="margin-bottom:1.25rem;max-height:320px;overflow-y:auto">
          <table><thead><tr>${file.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${file.data.map((row,ri) => {
            const rowIssues = fileIssues.filter(i => i.row===ri||(i.rows&&i.rows.includes(ri)));
            return `<tr class="${rowIssues.length?'row-messy':''}">${row.map((cell,ci) => {
              const colName = file.headers[ci];
              const cellIssue = rowIssues.find(i => i.col===colName);
              const cls = cellIssue?(cellIssue.severity==='high'?'cell-messy':'cell-warning'):(!cell?'cell-missing':'');
              return `<td class="${cls}">${cell||'<em>-</em>'}</td>`;
            }).join('')}</tr>`;
          }).join('')}</tbody></table>
        </div>

        ${fileIssues.length > 0 ? `<div id="file-issues-section" class="data-section-header">${icon('alertCircle','icon-sm')} Data Issues (${fileIssues.length})</div>
        <div class="issues-list" style="margin-bottom:1rem">
          ${fileIssues.map((iss, issIdx) => `<div class="issue-chip issue-chip-clickable" onclick="openIssueModal('${key}', ${issIdx})">
            <span class="${iss.severity==='high'?'issue-icon-red':iss.severity==='medium'?'issue-icon-amber':'issue-icon-accent'}">${icon(iss.severity==='high'?'alertCircle':iss.severity==='medium'?'alertTriangle':'info')}</span>
            <div style="flex:1"><span style="color:var(--text-primary);font-weight:500">${iss.col}</span> <span class="badge badge-surface badge-mono" style="margin-left:0.25rem">${iss.type}</span> <span class="badge ${iss.severity==='high'?'badge-red':iss.severity==='medium'?'badge-amber':'badge-accent'}" style="font-size:0.5625rem;margin-left:0.25rem">${iss.severity}</span><br><span style="color:var(--text-secondary);font-size:0.8125rem">${iss.desc}</span></div>
            <div style="display:flex;gap:0.375rem;flex-shrink:0">
              <button class="btn-send-rules" onclick="event.stopPropagation();sendToRules('${key}',${issIdx})">📋 Rules</button>
              <span style="color:var(--text-tertiary);font-size:0.75rem;align-self:center">→</span>
            </div>
          </div>`).join('')}
        </div>` : ''}
      </div>

      <!-- RIGHT: AI analysis panel + column profiles -->
      <div style="position:sticky;top:5rem;min-width:0;overflow:hidden;word-break:break-word">
        ${insights.length > 0 ? `<div class="ai-panel" style="margin-bottom:1rem">
          <div class="ai-panel-header">${icon('sparkles','icon-sm')} AI Analysis</div>
          ${insights.map(ins => `<div class="ai-insight">${ins.text}</div>`).join('')}
        </div>` : ''}
        <div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius);padding:0.875rem">
          <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary);margin-bottom:0.625rem">Column Health</div>
          <div style="display:flex;flex-direction:column;gap:0.375rem">
            ${file.headers.map(h => {
              const colIssues = fileIssues.filter(i => i.col === h);
              const hasHigh = colIssues.some(i => i.severity==='high');
              const hasMed = colIssues.some(i => i.severity==='medium');
              const dot = hasHigh ? '#ef4444' : hasMed ? '#f59e0b' : '#10b981';
              const label = hasHigh ? 'Critical' : hasMed ? 'Warning' : 'Clean';
              return `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                <span style="font-size:0.6875rem;font-family:var(--font-mono);color:var(--text-secondary)">${h}</span>
                <span style="font-size:0.5625rem;color:${dot};display:flex;align-items:center;gap:0.25rem"><span style="width:6px;height:6px;border-radius:9999px;background:${dot};display:inline-block"></span>${label}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  DISPLAY FILE NAME HELPER
// ════════════════════════════════════════════════════════════
const _FILE_DISPLAY_NAMES = {
  'salesforce_crm.csv':          'Salesforce CRM',
  'product_usage.csv':           'ProductTelemetry',
  'contract_billing.csv':        'Contract Billing (NetSuite)',
  'supplier_feed_us_antibodies.csv':  'US Antibodies Feed',
  'supplier_feed_eu_reagents.csv':    'EU Reagents Feed',
  'acquisition_catalog_nordic.csv':   'Nordic Acquisition Catalog',
};
function displayFileName(key) {
  return _FILE_DISPLAY_NAMES[key] || key.replace(/\.(csv|json|xlsx|xls)$/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ════════════════════════════════════════════════════════════
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--bg-elevated);border:1px solid var(--border-accent);color:var(--text-primary);padding:0.75rem 1.25rem;border-radius:var(--radius);font-size:0.875rem;z-index:10000;opacity:0;transition:opacity 0.3s;pointer-events:none';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ════════════════════════════════════════════════════════════
//  ISSUE MODAL
// ════════════════════════════════════════════════════════════
state.issueModalOpen = false;
state.issueModalData = null;

function openIssueModal(fileKey, issueIndex) {
  const files = getActiveFiles();
  const file = files[fileKey];
  if (!file) return;
  const issue = file.issues[issueIndex];
  state.issueModalOpen = true;
  state.issueModalData = { fileKey, issue, file };
  renderAll();
}

function closeIssueModal() {
  state.issueModalOpen = false;
  state.issueModalData = null;
  renderAll();
}

function renderIssueModal() {
  if (!state.issueModalOpen || !state.issueModalData) return '';
  const { fileKey, issue, file } = state.issueModalData;
  const affectedRows = issue.rows || (issue.row !== undefined ? [issue.row] : []);

  return `<div class="modal-overlay" onclick="closeIssueModal()">
    <div class="modal-panel" onclick="event.stopPropagation()">
      <div class="modal-header">
        <div>
          <span class="badge ${issue.severity==='high'?'badge-red':issue.severity==='medium'?'badge-amber':'badge-accent'}">${issue.severity} severity</span>
          <h2 style="color:var(--text-primary);font-size:1.125rem;margin-top:0.5rem">${issue.col} — ${issue.type}</h2>
          <p style="color:var(--text-secondary);font-size:0.875rem;margin-top:0.25rem">${issue.desc}</p>
        </div>
        <button class="btn btn-outline" onclick="closeIssueModal()">✕ Close</button>
      </div>
      <div style="padding:1rem 1.5rem">
        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary);margin-bottom:0.75rem">
          ${affectedRows.length > 0 ? `Highlighting ${affectedRows.length} affected row${affectedRows.length!==1?'s':''} in data table` : 'Column-level issue — affects all rows'}
        </div>
        <div class="raw-table-scroll" style="max-height:400px">
          <table>
            <thead><tr>${file.headers.map(h => `<th ${h===issue.col?'style="background:rgba(245,158,11,0.15);color:var(--amber)"':''}>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${file.data.map((row, ri) => {
                const isAffected = affectedRows.includes(ri) || (affectedRows.length===0 && file.headers.indexOf(issue.col) >= 0);
                return `<tr class="${isAffected?'row-messy':''}">
                  ${row.map((cell, ci) => {
                    const isIssueCol = file.headers[ci] === issue.col;
                    const cls = isIssueCol && isAffected ? (issue.severity==='high'?'cell-messy':'cell-warning') : (!cell ? 'cell-missing' : '');
                    return `<td class="${cls}" style="${isAffected&&isIssueCol?'position:relative':''}">${cell || '<em>-</em>'}</td>`;
                  }).join('')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:1rem;display:flex;gap:0.75rem">
          <button class="btn btn-primary" onclick="sendToRules('${fileKey}', ${file.issues.indexOf(issue)});closeIssueModal()">📋 Send to Rules</button>
          <button class="btn btn-outline" onclick="closeIssueModal()">Close</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  CRM ENTITY CLUSTER VISUALIZATION
// ════════════════════════════════════════════════════════════
if (!state.crmClusterApprovals) state.crmClusterApprovals = {};

const CRM_ENTITY_CLUSTERS = [
  { id:'hous', canonical:'Houston ISD', confidence:97, arr:'$463K', segments:['Enterprise','Title I'],
    variants:['Houston ISD','Houston ISD - Supplemental','Houston Public Schools','Houston Federal Programs','HOUSTON MATH PROGRAM','HOUSTON CREDIT RECOVERY'],
    sources:['Salesforce CRM','NetSuite','ProductTelemetry'], products:['Imagine Math','Imagine LL','Twig Science'] },
  { id:'rive', canonical:'Riverview ISD', confidence:94, arr:'$436K', segments:['Mid-Market'],
    variants:['Riverview ISD','Riverview ISD - Credit Recovery','Riverview Public Schools','RIVERVIEW CREDIT RECOVERY','Riverview ISD Billing'],
    sources:['Salesforce CRM','NetSuite','ProductTelemetry'], products:['Imagine Math','StudySync'] },
  { id:'oakv', canonical:'Oak Valley School District', confidence:91, arr:'$189K', segments:['SMB'],
    variants:['Oak Valley ISD','Oak Valley School District','OAK VALLEY CREDIT RECOVERY'],
    sources:['Salesforce CRM','ProductTelemetry'], products:['Imagine LL'] },
  { id:'pine', canonical:'Pine Hills ISD', confidence:88, arr:'$124K', segments:['SMB'],
    variants:['Pine Hills ISD','PINE_HILLS_LITERACY_PILOT','Pine Hills'],
    sources:['Salesforce CRM','NetSuite'], products:['Imagine LL PD'] },
];

function approveCRMCluster(id) {
  state.crmClusterApprovals[id] = 'approved';
  showToast('Merge approved — cluster will be resolved in Golden Records');
  renderAll();
}
function rejectCRMCluster(id) {
  state.crmClusterApprovals[id] = 'rejected';
  renderAll();
}

function renderCRMEntityClusters() {
  const approved = CRM_ENTITY_CLUSTERS.filter(c => state.crmClusterApprovals[c.id] === 'approved').length;
  const pending = CRM_ENTITY_CLUSTERS.filter(c => !state.crmClusterApprovals[c.id]).length;
  return `<div style="margin-bottom:1.75rem">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.875rem">
      <div>
        <div style="font-size:1rem;font-weight:700;color:var(--text-primary)">${icon('layers','icon-sm')} Entity Resolution Queue</div>
        <div style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.125rem">AI has identified ${CRM_ENTITY_CLUSTERS.length} duplicate district clusters across 3 systems. Approve each merge to resolve.</div>
      </div>
      <div style="display:flex;gap:0.5rem;flex-shrink:0">
        ${approved > 0 ? `<span class="badge badge-emerald">${approved} approved</span>` : ''}
        ${pending > 0 ? `<span class="badge badge-amber">${pending} pending review</span>` : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:0.875rem">
      ${CRM_ENTITY_CLUSTERS.map(c => {
        const status = state.crmClusterApprovals[c.id];
        const isApproved = status === 'approved';
        const isRejected = status === 'rejected';
        const borderColor = isApproved ? 'rgba(16,185,129,0.35)' : isRejected ? 'rgba(239,68,68,0.25)' : 'var(--border-primary)';
        const bgColor = isApproved ? 'rgba(16,185,129,0.04)' : isRejected ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)';
        const confColor = c.confidence >= 95 ? 'var(--emerald)' : c.confidence >= 90 ? 'var(--amber)' : 'var(--red)';
        return `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:var(--radius);padding:1rem;transition:all 0.3s">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.625rem">
            <div>
              <div style="font-size:0.875rem;font-weight:700;color:var(--text-primary)">${c.canonical}</div>
              <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">${c.variants.length} records → 1 golden account · ${c.arr} ARR</div>
            </div>
            ${isApproved ? `<span class="badge badge-emerald">✓ Merged</span>`
              : isRejected ? `<span class="badge badge-red">✗ Skipped</span>`
              : `<span class="badge badge-surface" style="color:${confColor};border-color:${confColor}">${c.confidence}% match</span>`}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.1875rem;margin-bottom:0.625rem">
            ${c.variants.slice(0,4).map(v=>`<span style="font-size:0.5625rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);border-radius:3px;padding:0.1rem 0.3rem;color:var(--red)">${v}</span>`).join('')}
            ${c.variants.length>4?`<span style="font-size:0.5625rem;color:var(--text-muted)">+${c.variants.length-4}</span>`:''}
          </div>
          <div style="display:flex;gap:0.25rem;margin-bottom:0.625rem;flex-wrap:wrap">
            ${c.sources.map(s=>`<span style="font-size:0.5625rem;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:3px;padding:0.1rem 0.375rem;color:var(--accent)">${s}</span>`).join('')}
          </div>
          ${!status ? `<div style="display:flex;gap:0.375rem;margin-top:0.5rem">
            <button class="btn btn-emerald-outline" style="flex:1;font-size:0.6875rem;padding:0.3rem 0.5rem" onclick="approveCRMCluster('${c.id}')">✓ Approve Merge</button>
            <button class="btn btn-outline" style="font-size:0.6875rem;padding:0.3rem 0.5rem" onclick="rejectCRMCluster('${c.id}')">✗ Skip</button>
          </div>` : isApproved ? `<div style="font-size:0.75rem;color:var(--emerald);margin-top:0.375rem">✓ Will resolve to: <strong>${c.canonical}</strong></div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  RULES ENGINE
// ════════════════════════════════════════════════════════════
if (!state.activeRulesTab) state.activeRulesTab = 'user';
if (!state.rules) state.rules = (typeof RULES_DATA !== 'undefined') ? JSON.parse(JSON.stringify(RULES_DATA)) : { user: [], ai: [], pending: [] };

function sendToRules(fileKey, issueIndex) {
  const files = getActiveFiles();
  const file = files[fileKey];
  const issue = file ? file.issues[issueIndex] : null;
  if (!issue) return;
  if (!state.rules) state.rules = (typeof RULES_DATA !== 'undefined') ? JSON.parse(JSON.stringify(RULES_DATA)) : { user: [], ai: [], pending: [] };
  const newRule = {
    id: 'rule-user-' + Date.now(),
    name: `Fix: ${issue.col} ${issue.type}`,
    description: issue.desc,
    type: issue.type,
    severity: issue.severity,
    source: fileKey,
    status: 'ready_to_apply',
    createdFrom: `Sent from issue in ${displayFileName(fileKey)}`
  };
  state.rules.pending.push(newRule);
  showToast('Issue sent to Rules Engine — review in Pending Rules');
  renderAll();
}

function approveAIRule(ruleId) {
  if (!state.rules) return;
  const rule = state.rules.ai.find(r => r.id === ruleId);
  if (rule) {
    rule.status = 'approved';
    const userRule = { ...rule, created: new Date().toISOString().slice(0,10), appliedCount: 0, status: 'active', createdFrom: 'Approved from AI suggestion' };
    state.rules.user.push(userRule);
    state.rules.ai = state.rules.ai.filter(r => r.id !== ruleId);
  }
  renderAll();
}

function applyPendingRule(ruleId) {
  if (!state.rules) return;
  const rule = state.rules.pending.find(r => r.id === ruleId);
  if (rule) {
    rule.status = 'applied';
    const userRule = { ...rule, created: new Date().toISOString().slice(0,10), appliedCount: 0, status: 'active', createdFrom: rule.createdFrom || 'Applied from pending' };
    state.rules.user.push(userRule);
    state.rules.pending = state.rules.pending.filter(r => r.id !== ruleId);
  }
  renderAll();
}

function setRulesTab(tab) {
  state.activeRulesTab = tab;
  renderAll();
}

function renderRulesEngine() {
  const rules = state.rules || (typeof RULES_DATA !== 'undefined' ? RULES_DATA : { user: [], ai: [], pending: [] });
  const activeTab = state.activeRulesTab || 'user';
  const tabRules = rules[activeTab] || [];
  const totalActive = rules.user.filter(r => r.status === 'active').length;
  const totalPending = (rules.ai.length + rules.pending.length);

  return `<div class="card" style="margin-bottom:1.5rem">
    <div class="card-header">
      <div class="card-header-row">
        <div>
          <div class="card-title card-title-lg">Data Governance Rules Engine</div>
          <div class="card-description">Rules are automatically applied to prevent recurring data quality issues</div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <span class="badge badge-emerald">${totalActive} active rules</span>
          ${totalPending > 0 ? `<span class="badge badge-amber">${totalPending} pending review</span>` : ''}
        </div>
      </div>
    </div>
    <div class="card-content">
      <div class="tabs-nav" style="margin-bottom:1rem">
        <button class="tab-btn ${activeTab==='user'?'active':''}" onclick="setRulesTab('user')">👤 User Rules <span class="tab-badge">${rules.user.length}</span></button>
        <button class="tab-btn ${activeTab==='ai'?'active':''}" onclick="setRulesTab('ai')">🤖 AI Suggested <span class="tab-badge">${rules.ai.length}</span></button>
        <button class="tab-btn ${activeTab==='pending'?'active':''}" onclick="setRulesTab('pending')">⏳ Pending <span class="tab-badge">${rules.pending.length}</span></button>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.625rem">
        ${tabRules.length === 0 ? '<div class="empty-state" style="padding:2rem"><p>No rules in this category</p></div>' :
          tabRules.map(rule => `<div class="issue-chip" style="border-color:${rule.status==='active'?'rgba(16,185,129,0.25)':rule.status==='pending_review'?'rgba(245,158,11,0.25)':'rgba(99,102,241,0.25)'}">
            <span style="color:${rule.status==='active'?'var(--emerald)':rule.status==='pending_review'?'var(--amber)':'var(--accent)'}">
              ${rule.status==='active'?'✓':rule.status==='pending_review'?'?':'▸'}
            </span>
            <div style="flex:1">
              <div style="color:var(--text-primary);font-weight:600;font-size:0.8125rem">${rule.name}</div>
              <div style="color:var(--text-secondary);font-size:0.75rem;margin-top:0.125rem">${rule.description}</div>
              <div style="display:flex;gap:0.5rem;margin-top:0.375rem;flex-wrap:wrap">
                <span class="badge badge-surface badge-mono">${rule.type}</span>
                ${rule.appliedCount !== undefined ? `<span style="font-size:0.625rem;color:var(--text-tertiary)">Applied ${rule.appliedCount}× times</span>` : ''}
                ${rule.confidence ? `<span style="font-size:0.625rem;color:var(--emerald)">AI confidence: ${Math.round(rule.confidence*100)}%</span>` : ''}
                ${rule.createdFrom ? `<span style="font-size:0.625rem;color:var(--text-tertiary)">${rule.createdFrom}</span>` : ''}
                ${rule.suggestedFrom ? `<span style="font-size:0.625rem;color:var(--text-tertiary)">From: ${rule.suggestedFrom}</span>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:0.375rem;flex-shrink:0">
              ${activeTab==='ai' ? `<button class="btn btn-emerald-outline" style="padding:0.25rem 0.625rem;font-size:0.6875rem" onclick="approveAIRule('${rule.id}')">✓ Approve</button>` : ''}
              ${activeTab==='pending' ? `<button class="btn btn-emerald-outline" style="padding:0.25rem 0.625rem;font-size:0.6875rem" onclick="applyPendingRule('${rule.id}')">▶ Apply</button>` : ''}
              ${activeTab==='user' ? `<span class="badge badge-emerald" style="font-size:0.5625rem;align-self:center">Active</span>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  OVERRIDE renderPage TO INCLUDE MODAL
// ════════════════════════════════════════════════════════════
const _prevRenderPage2 = renderPage;
renderPage = function() {
  _prevRenderPage2();
  // Render issue modal overlay if open
  if (state.issueModalOpen) {
    let modalContainer = document.getElementById('issue-modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'issue-modal-container';
      document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = renderIssueModal();
  } else {
    const modalContainer = document.getElementById('issue-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
  }
};

// ════════════════════════════════════════════════════════════
//  OVERRIDE renderWorkbenchPage TO ADD RULES ENGINE FOR CRM
// ════════════════════════════════════════════════════════════
const _prevRenderWorkbenchForRules = renderWorkbenchPage;
renderWorkbenchPage = function() {
  const html = _prevRenderWorkbenchForRules();
  if (state.activeDataset === 'crm') {
    // Inject rules engine before the last closing div (the page wrapper)
    const lastIdx = html.lastIndexOf('</div>');
    if (lastIdx !== -1) {
      return html.slice(0, lastIdx) + `<div class="rules-section">${renderRulesEngine()}</div>` + html.slice(lastIdx);
    }
  }
  return html;
};

// ════════════════════════════════════════════════════════════
//  ESCAPE KEYDOWN FOR ISSUE MODAL
// ════════════════════════════════════════════════════════════
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.issueModalOpen) {
    closeIssueModal();
  }
});

// ════════════════════════════════════════════════════════════
//  CRM SOURCE NETWORK GRAPH
// ════════════════════════════════════════════════════════════
function renderCRMSourceNetwork() {
  const nodes = [
    { name:'Salesforce CRM',         sub:'420 account records',  y:28,  color:'#6366f1', status:'connected', issues:12 },
    { name:'ProductTelemetry',       sub:'342 usage records',    y:100, color:'#8b5cf6', status:'connected', issues:8  },
    { name:'Contract Billing',       sub:'234 billing records',  y:172, color:'#a78bfa', status:'warning',   issues:7  },
  ];
  const paths = nodes.map((n,i) => {
    const cy = n.y + 22;
    const mid = 370;
    return `<path d="M 193 ${cy} C 270 ${cy} 290 100 ${mid-42} 100"
      stroke="${n.status==='warning'?'rgba(245,158,11,0.55)':'rgba(99,102,241,0.5)'}"
      stroke-width="1.5" fill="none" stroke-dasharray="6 3"
      style="animation:dashFlow 2.2s linear infinite ${(i*0.55).toFixed(1)}s"/>`;
  }).join('');

  const srcNodes = nodes.map((n,i) => `
    <rect x="4" y="${n.y}" width="186" height="46" rx="7"
      fill="rgba(99,102,241,0.07)" stroke="${n.status==='warning'?'rgba(245,158,11,0.35)':'rgba(99,102,241,0.28)'}"
      style="animation:fadeInUp 0.4s ${(i*0.12).toFixed(2)}s both"/>
    <circle cx="20" cy="${n.y+23}" r="5" fill="${n.status==='warning'?'#f59e0b':'#10b981'}"/>
    <text x="32" y="${n.y+17}" fill="#f9fafb" font-size="11.5" font-weight="600" font-family="Inter,system-ui,sans-serif">${n.name}</text>
    <text x="32" y="${n.y+31}" fill="rgba(255,255,255,0.42)" font-size="9.5" font-family="Inter,system-ui,sans-serif">${n.sub}</text>
    <text x="182" y="${n.y+17}" fill="${n.status==='warning'?'#f59e0b':'#10b981'}" font-size="9" font-family="Inter,system-ui,sans-serif" text-anchor="end">${n.status==='warning'?'⚠ Warning':'● Live'}</text>
    <text x="182" y="${n.y+31}" fill="rgba(255,255,255,0.32)" font-size="8.5" font-family="Inter,system-ui,sans-serif" text-anchor="end">${n.issues} issues</text>`).join('');

  return `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;margin-bottom:1.5rem;overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
      <div>
        <div style="font-size:0.9375rem;font-weight:700;color:var(--text-primary)">Source Network</div>
        <div style="font-size:0.8125rem;color:var(--text-tertiary);margin-top:0.125rem">3 systems connected · 996 raw records ingested · Last synced <strong style="color:var(--text-secondary)">4 min ago</strong></div>
      </div>
      <span class="badge badge-emerald" style="animation:pulse-ring 2s ease-in-out infinite">● Live</span>
    </div>
    <svg viewBox="0 0 720 210" style="width:100%;max-height:210px" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="outGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#34d399" stop-opacity="0.9"/>
        </linearGradient>
      </defs>

      ${paths}

      <!-- Output arrow -->
      <path d="M 412 100 L 525 100"
        stroke="url(#outGrad)" stroke-width="2" fill="none"
        marker-end="url(#arrowOut)" style="animation:fadeInUp 0.6s 0.5s both"/>
      <defs>
        <marker id="arrowOut" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="#10b981" opacity="0.8"/>
        </marker>
      </defs>

      ${srcNodes}

      <!-- Central tower -->
      <circle cx="370" cy="100" r="42" fill="rgba(16,185,129,0.07)" stroke="rgba(16,185,129,0.35)" stroke-width="1.5"/>
      <circle cx="370" cy="100" r="30" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.45)" stroke-width="1"/>
      <circle cx="370" cy="100" r="46" fill="none" stroke="rgba(16,185,129,0.18)" stroke-width="1" style="animation:pulse-ring 2.5s ease-in-out infinite"/>
      <text x="370" y="95"  fill="#10b981" font-size="9.5" font-weight="700" font-family="Inter,system-ui,sans-serif" text-anchor="middle">DATA</text>
      <text x="370" y="108" fill="#10b981" font-size="9.5" font-weight="700" font-family="Inter,system-ui,sans-serif" text-anchor="middle">TOWER</text>

      <!-- Output node -->
      <rect x="528" y="70" width="186" height="62" rx="9"
        fill="rgba(16,185,129,0.09)" stroke="rgba(16,185,129,0.4)" stroke-width="1.5"
        style="animation:fadeInUp 0.5s 0.4s both"/>
      <text x="621" y="96"  fill="#10b981" font-size="13" font-weight="800" font-family="Inter,system-ui,sans-serif" text-anchor="middle">8 Golden</text>
      <text x="621" y="113" fill="#10b981" font-size="13" font-weight="800" font-family="Inter,system-ui,sans-serif" text-anchor="middle">Districts</text>
      <text x="621" y="126" fill="rgba(255,255,255,0.4)" font-size="9.5" font-family="Inter,system-ui,sans-serif" text-anchor="middle">$1.2M ARR attributed</text>
    </svg>
  </div>`;
}

// Inject network graph into CRM raw page
const _prevCRMRawForNetwork = renderRawPage;
renderRawPage = function() {
  if (state.activeDataset !== 'crm') return _prevCRMRawForNetwork();
  const html = _prevCRMRawForNetwork();
  // inject after renderStorylineCard output (after first </div> following stats-grid section start)
  return html.replace(
    '<div class="stats-grid">',
    renderCRMSourceNetwork() + '<div class="stats-grid">'
  );
};

// ════════════════════════════════════════════════════════════
//  CRM SEARCH PAGE — BEFORE / AFTER SPLIT VIEW
// ════════════════════════════════════════════════════════════
const CRM_RAW_SEARCH_DATA = {
  houston: [
    { name:'Houston ISD',              source:'Salesforce CRM',    id:'SF-001-TX',  arr:null,   issue:'No ARR total — split across 4 records',     severity:'high'   },
    { name:'Houston ISD - Supplemental',source:'Salesforce CRM',  id:'SF-002-TX',  arr:null,   issue:'Duplicate — not linked to parent account',   severity:'high'   },
    { name:'Houston ISD - Title I',    source:'Salesforce CRM',    id:'SF-003-TX',  arr:null,   issue:'Sub-account · ARR suppressed from reports',  severity:'high'   },
    { name:'HOUSTON MATH PROGRAM',     source:'ProductTelemetry',  id:'PT-HTX-001', arr:null,   issue:'All-caps export artifact · cannot match CRM', severity:'high'  },
    { name:'HOUSTON CREDIT RECOVERY',  source:'ProductTelemetry',  id:'PT-HTX-002', arr:null,   issue:'Cannot match to any CRM account',            severity:'high'   },
    { name:'HOUSTON SUMMER PROGRAM',   source:'ProductTelemetry',  id:'PT-HTX-003', arr:null,   issue:'Unmatched · not in golden scope',            severity:'medium'  },
    { name:'Houston Public Schools',   source:'Contract Billing',  id:'CB-HTX-001', arr:'$142K',issue:'Name mismatch vs Salesforce account',        severity:'medium'  },
    { name:'Houston Federal Programs', source:'Contract Billing',  id:'CB-HTX-002', arr:'$321K',issue:'Not linked to district · ARR unattributed',  severity:'high'   },
  ],
  riverview: [
    { name:'Riverview ISD',                 source:'Salesforce CRM',   id:'SF-RV-001', arr:null,   issue:'No total ARR — split across 3 records', severity:'high'   },
    { name:'Riverview ISD - Credit Recovery',source:'Salesforce CRM',  id:'SF-RV-002', arr:null,   issue:'Sub-account · treated as separate deal', severity:'high'  },
    { name:'Riverview Public Schools',      source:'Salesforce CRM',   id:'SF-RV-003', arr:null,   issue:'Name variant · duplicate',              severity:'medium'  },
    { name:'RIVERVIEW CREDIT RECOVERY',     source:'ProductTelemetry', id:'PT-RV-001', arr:null,   issue:'All-caps artifact · unmatched',          severity:'high'   },
    { name:'Riverview ISD Billing',         source:'Contract Billing', id:'CB-RV-001', arr:'$436K',issue:'$436K ARR not linked to CRM account',   severity:'high'   },
  ],
  'oak valley': [
    { name:'Oak Valley ISD',              source:'Salesforce CRM',   id:'SF-OV-001', arr:null,   issue:'Name mismatch with billing',   severity:'medium' },
    { name:'Oak Valley School District',  source:'Contract Billing', id:'CB-OV-001', arr:'$189K', issue:'Different legal suffix — not linked', severity:'high' },
    { name:'OAK VALLEY CREDIT RECOVERY',  source:'ProductTelemetry', id:'PT-OV-001', arr:null,   issue:'All-caps · unmatched record',  severity:'medium' },
  ],
};

const CRM_GOLDEN_SEARCH_DATA = {
  houston:      { id:'GC0001', name:'Houston ISD', arr:463000, pipeline:89000, products:['Imagine Math','Imagine Language & Literacy','Twig Science','Courseware','StudySync','Imagine PD'], variants:8, enrollment:195000, segment:'Enterprise', region:'South', renewal:'Oct 2026', health:78 },
  riverview:    { id:'GC0002', name:'Riverview ISD', arr:218000, pipeline:45000, products:['Imagine Math','StudySync'], variants:5, enrollment:22000, segment:'Mid-Market', region:'Southwest', renewal:'Jul 2026', health:82 },
  'oak valley': { id:'GC0003', name:'Oak Valley School District', arr:189000, pipeline:28000, products:['Imagine Language & Literacy'], variants:3, enrollment:14000, segment:'SMB', region:'West', renewal:'Mar 2027', health:71 },
};

function setCRMSearchQuery(q) {
  state.searchQuery = q;
  const el = document.getElementById('crm-search-input');
  if (el) el.value = q;
  const container = document.getElementById('crm-search-results');
  if (container) container.innerHTML = renderCRMSplitResults(q.toLowerCase().trim());
  else renderAll();
}

function renderCRMSplitResults(q) {
  const rawKey = Object.keys(CRM_RAW_SEARCH_DATA).find(k => q.includes(k) || k.includes(q)) || (q ? null : 'houston');
  const goldKey = Object.keys(CRM_GOLDEN_SEARCH_DATA).find(k => q.includes(k) || k.includes(q)) || (q ? null : 'houston');
  const rawResults = rawKey ? CRM_RAW_SEARCH_DATA[rawKey] : [];
  const golden     = goldKey ? CRM_GOLDEN_SEARCH_DATA[goldKey] : null;

  if (!q && !rawKey) return `<div style="text-align:center;padding:3rem;color:var(--text-muted)"><p>Type a district name to see the before/after comparison</p></div>`;

  const leftPanel = rawResults.length === 0
    ? `<div style="padding:2rem;text-align:center;color:var(--text-muted)">No raw results for "${q}"</div>`
    : rawResults.map(r => `<div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.18);border-radius:var(--radius-sm);padding:0.75rem 1rem;margin-bottom:0.5rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;margin-bottom:0.375rem">
          <span style="font-size:0.875rem;font-weight:600;color:var(--text-primary)">${r.name}</span>
          <span style="font-size:0.5625rem;background:rgba(${r.severity==='high'?'239,68,68':'245,158,11'},0.12);border:1px solid rgba(${r.severity==='high'?'239,68,68':'245,158,11'},0.25);color:var(--${r.severity==='high'?'red':'amber'});border-radius:3px;padding:0.1rem 0.35rem;white-space:nowrap;flex-shrink:0">${r.severity}</span>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.25rem">
          <span style="font-size:0.6875rem;color:var(--text-tertiary);font-family:var(--font-mono)">${r.id}</span>
          <span class="badge badge-surface" style="font-size:0.5625rem">${r.source}</span>
          ${r.arr ? `<span style="font-size:0.6875rem;color:var(--emerald);font-weight:600">${r.arr}</span>` : '<span style="font-size:0.6875rem;color:var(--text-muted)">ARR: unknown</span>'}
        </div>
        <div style="font-size:0.75rem;color:var(--red)">⚠ ${r.issue}</div>
      </div>`).join('');

  const rightPanel = !golden
    ? `<div style="padding:2rem;text-align:center;color:var(--text-muted)">No golden record for "${q}"</div>`
    : `<div style="background:rgba(16,185,129,0.07);border:2px solid rgba(16,185,129,0.35);border-radius:var(--radius);padding:1.125rem 1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.875rem">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">
              <span class="badge badge-emerald" style="font-size:0.625rem">⭐ Golden Record</span>
              <span style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text-muted)">${golden.id}</span>
            </div>
            <div style="font-size:1.0625rem;font-weight:800;color:var(--text-primary)">${golden.name}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.125rem">${golden.segment} · ${golden.region} · ${golden.enrollment.toLocaleString()} students</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.375rem;font-weight:900;color:var(--emerald)">$${(golden.arr/1000).toFixed(0)}K</div>
            <div style="font-size:0.6875rem;color:var(--text-tertiary)">Total ARR</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.625rem;margin-bottom:0.875rem">
          <div style="background:rgba(255,255,255,0.04);border-radius:var(--radius-sm);padding:0.625rem">
            <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-bottom:0.25rem">Open Pipeline</div>
            <div style="font-size:1rem;font-weight:700;color:var(--amber)">$${(golden.pipeline/1000).toFixed(0)}K</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:var(--radius-sm);padding:0.625rem">
            <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-bottom:0.25rem">Health Score</div>
            <div style="font-size:1rem;font-weight:700;color:${golden.health>=80?'var(--emerald)':golden.health>=60?'var(--amber)':'var(--red)'}">${golden.health}/100</div>
          </div>
        </div>
        <div style="margin-bottom:0.75rem">
          <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.375rem">Active Products (${golden.products.length})</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.25rem">${golden.products.map(p=>`<span class="badge badge-surface" style="font-size:0.625rem">${p}</span>`).join('')}</div>
        </div>
        <div style="margin-bottom:0.75rem">
          <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.25rem">Source Variants Unified (${golden.variants})</div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">${rawResults.slice(0,4).map(r=>r.name).join(' · ')}${golden.variants>4?' · …':''}</div>
          <div style="font-size:0.75rem;color:var(--emerald);margin-top:0.125rem">↳ All unified into: <strong>${golden.name}</strong></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:0.625rem;border-top:1px solid rgba(16,185,129,0.15)">
          <span style="font-size:0.75rem;color:var(--text-tertiary)">Renewal: <strong style="color:var(--text-secondary)">${golden.renewal}</strong></span>
          <button class="btn btn-emerald-outline" style="font-size:0.6875rem;padding:0.25rem 0.75rem" onclick="startCRMSync()">Sync to Salesforce →</button>
        </div>
      </div>`;

  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;animation:fadeInUp 0.3s ease-out">
    <div>
      <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.75rem;padding:0.625rem 0.875rem;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm)">
        <span style="color:var(--red);font-size:1.125rem">✗</span>
        <div>
          <div style="font-size:0.8125rem;font-weight:700;color:var(--red)">Before Harmonization</div>
          <div style="font-size:0.6875rem;color:var(--text-tertiary)">${rawResults.length} fragmented records · ARR unattributable</div>
        </div>
      </div>
      ${leftPanel}
    </div>
    <div>
      <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.75rem;padding:0.625rem 0.875rem;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.25);border-radius:var(--radius-sm)">
        <span style="color:var(--emerald);font-size:1.125rem">✓</span>
        <div>
          <div style="font-size:0.8125rem;font-weight:700;color:var(--emerald)">After Harmonization</div>
          <div style="font-size:0.6875rem;color:var(--text-tertiary)">1 canonical record · $${golden?(golden.arr/1000).toFixed(0)+'K ARR attributed':'?'}</div>
        </div>
      </div>
      ${rightPanel}
    </div>
  </div>`;
}

function renderCRMSearchPage() {
  const q = state.searchQuery || 'houston';
  const suggestions = ['houston','riverview','oak valley','pine hills'];
  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div>
        <h1>Revenue Intelligence Search</h1>
        <p class="page-subtitle">See exactly what breaks before harmonization — and what's fixed after.</p>
      </div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" style="background:linear-gradient(135deg,var(--emerald),#059669);box-shadow:0 0 20px rgba(16,185,129,0.2)" onclick="startCRMSync()">${icon('refreshCw')} Sync to Salesforce</button>`)}
    </div>
    ${renderStorylineCard()}

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.875rem;margin-bottom:1.5rem">
      <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.22);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
        <div style="font-size:1.75rem;font-weight:900;color:var(--red)">8×</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Houston ISD Fragments</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">Before harmonization</div>
      </div>
      <div style="background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.22);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
        <div style="font-size:1.75rem;font-weight:900;color:var(--accent)">3</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">At-Risk Districts Found</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">Health score below 70</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:1.5rem"><div class="card-content">
      <div style="position:relative;margin-bottom:0.75rem">
        <span style="position:absolute;left:0.875rem;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none">${icon('search')}</span>
        <input id="crm-search-input" type="text" value="${q}" oninput="setCRMSearchQuery(this.value)"
          placeholder="Search districts — try 'houston', 'riverview', 'oak valley'…"
          style="width:100%;padding:0.75rem 1rem 0.75rem 2.5rem;font-size:0.9375rem;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);outline:none;font-family:var(--font-sans)"/>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
        <span style="font-size:0.75rem;color:var(--text-tertiary)">Suggested:</span>
        ${suggestions.map(s=>`<button style="cursor:pointer;background:transparent;border:1px solid var(--border-subtle);color:var(--text-secondary);border-radius:var(--radius-sm);padding:0.2rem 0.625rem;font-size:0.75rem;font-family:var(--font-sans)" onclick="setCRMSearchQuery('${s}')">"${s}"</button>`).join('')}
      </div>
    </div></div>

    <div id="crm-search-results">${renderCRMSplitResults(q.toLowerCase().trim())}</div>
    ${renderPageHelpPanel()}
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  SYNC TO SALESFORCE
// ════════════════════════════════════════════════════════════
if (!state.crmSyncState) state.crmSyncState = null;

function startCRMSync() {
  if (state.crmSyncState === 'syncing') return;
  state.crmSyncState = 'syncing';
  showToast('Syncing 8 golden districts to Salesforce…');
  const bar = document.getElementById('crm-sync-bar');
  if (bar) { bar.style.display = 'flex'; }
  setTimeout(() => {
    state.crmSyncState = 'done';
    showToast('✓ Sync complete — 8 districts · 47 accounts updated · $463K ARR attributed in Salesforce');
    renderAll();
  }, 2200);
}

// Override renderSearchPage for CRM
const _prevRenderSearchForCRM = renderSearchPage;
renderSearchPage = function() {
  if (state.activeDataset !== 'crm') return _prevRenderSearchForCRM();
  return renderCRMSearchPage();
};

// Inject "Sync to Salesforce" banner into CRM golden records page
const _prevRenderGoldenForSync = renderGoldenPage;
renderGoldenPage = function() {
  const html = _prevRenderGoldenForSync();
  if (state.activeDataset !== 'crm') return html;
  const syncBanner = state.crmSyncState === 'done'
    ? `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-lg);padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:0.875rem">
          <span style="font-size:1.5rem">✓</span>
          <div>
            <div style="font-weight:700;color:var(--emerald)">Sync Complete</div>
            <div style="font-size:0.8125rem;color:var(--text-secondary)">8 golden districts · 47 Salesforce accounts updated · $463K ARR now attributed in CRM</div>
          </div>
        </div>
        <span class="badge badge-emerald">Last synced just now</span>
      </div>`
    : `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:600;color:var(--text-primary);margin-bottom:0.25rem">Golden records ready to sync</div>
          <div style="font-size:0.8125rem;color:var(--text-secondary)">Push all 8 canonical districts back to Salesforce — 47 accounts will be updated and $463K ARR attributed</div>
        </div>
        <button class="btn btn-primary" style="flex-shrink:0;background:linear-gradient(135deg,#0ea5e9,#6366f1);white-space:nowrap" onclick="startCRMSync()">${icon('refreshCw')} Sync to Salesforce</button>
      </div>`;
  return html.replace('<div class="card" style="margin-bottom:1.5rem">\n      <div class="card-header">', syncBanner + '<div class="card" style="margin-bottom:1.5rem">\n      <div class="card-header">');
};

// ════════════════════════════════════════════════════════════
//  SKU / PRODUCT CATALOG — SCENARIO 1 PREMIUM FLOWS
// ════════════════════════════════════════════════════════════

// ── 1. Source Network Graph ──────────────────────────────
function renderSKUSourceNetwork() {
  const nodes = [
    { name:'US Antibodies Feed',   sub:'12 sampled · 4,320 total',  y:18,  color:'#6366f1', status:'connected', issues:10 },
    { name:'EU Reagents Feed',     sub:'10 sampled · 2,850 total',  y:82,  color:'#8b5cf6', status:'warning',   issues:6  },
    { name:'Nordic Acquisition',   sub:'8 sampled · 1,440 total',   y:146, color:'#a78bfa', status:'warning',   issues:6  },
    { name:'Legacy PIM (XLSX)',    sub:'8 sampled · 5,000 total',   y:210, color:'#c4b5fd', status:'connected', issues:3  },
  ];
  const paths = nodes.map((n,i) => {
    const cy = n.y + 22;
    return `<path d="M 193 ${cy} C 270 ${cy} 290 126 328 126"
      stroke="${n.status==='warning'?'rgba(245,158,11,0.55)':'rgba(99,102,241,0.5)'}"
      stroke-width="1.5" fill="none" stroke-dasharray="6 3"
      style="animation:dashFlow 2.2s linear infinite ${(i*0.45).toFixed(1)}s"/>`;
  }).join('');

  const srcNodes = nodes.map((n,i) => `
    <rect x="4" y="${n.y}" width="186" height="46" rx="7"
      fill="rgba(99,102,241,0.07)" stroke="${n.status==='warning'?'rgba(245,158,11,0.35)':'rgba(99,102,241,0.28)'}"
      style="animation:fadeInUp 0.4s ${(i*0.12).toFixed(2)}s both"/>
    <circle cx="20" cy="${n.y+23}" r="5" fill="${n.status==='warning'?'#f59e0b':'#10b981'}"/>
    <text x="32" y="${n.y+17}" fill="#f9fafb" font-size="11" font-weight="600" font-family="Inter,system-ui,sans-serif">${n.name}</text>
    <text x="32" y="${n.y+31}" fill="rgba(255,255,255,0.42)" font-size="9" font-family="Inter,system-ui,sans-serif">${n.sub}</text>
    <text x="182" y="${n.y+17}" fill="${n.status==='warning'?'#f59e0b':'#10b981'}" font-size="9" font-family="Inter,system-ui,sans-serif" text-anchor="end">${n.status==='warning'?'⚠ Warning':'● Live'}</text>
    <text x="182" y="${n.y+31}" fill="rgba(255,255,255,0.32)" font-size="8.5" font-family="Inter,system-ui,sans-serif" text-anchor="end">${n.issues} issues</text>`).join('');

  return `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;margin-bottom:1.5rem;overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
      <div>
        <div style="font-size:0.9375rem;font-weight:700;color:var(--text-primary)">Source Network</div>
        <div style="font-size:0.8125rem;color:var(--text-tertiary);margin-top:0.125rem">4 feeds connected · 13,610 raw records ingested · Last synced <strong style="color:var(--text-secondary)">2 min ago</strong></div>
      </div>
      <span class="badge badge-accent" style="animation:pulse-ring 2s ease-in-out infinite">● Live</span>
    </div>
    <svg viewBox="0 0 720 258" style="width:100%;max-height:258px" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="skuOutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#818cf8" stop-opacity="0.9"/>
        </linearGradient>
        <marker id="skuArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="#6366f1" opacity="0.8"/>
        </marker>
      </defs>

      ${paths}

      <!-- Output arrow -->
      <path d="M 410 126 L 525 126"
        stroke="url(#skuOutGrad)" stroke-width="2" fill="none"
        marker-end="url(#skuArrow)" style="animation:fadeInUp 0.6s 0.5s both"/>

      ${srcNodes}

      <!-- Central tower -->
      <circle cx="370" cy="126" r="42" fill="rgba(99,102,241,0.07)" stroke="rgba(99,102,241,0.35)" stroke-width="1.5"/>
      <circle cx="370" cy="126" r="30" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.45)" stroke-width="1"/>
      <circle cx="370" cy="126" r="46" fill="none" stroke="rgba(99,102,241,0.18)" stroke-width="1" style="animation:pulse-ring 2.5s ease-in-out infinite"/>
      <text x="370" y="121" fill="#818cf8" font-size="9.5" font-weight="700" font-family="Inter,system-ui,sans-serif" text-anchor="middle">DATA</text>
      <text x="370" y="134" fill="#818cf8" font-size="9.5" font-weight="700" font-family="Inter,system-ui,sans-serif" text-anchor="middle">TOWER</text>

      <!-- Output node -->
      <rect x="528" y="92" width="186" height="70" rx="9"
        fill="rgba(99,102,241,0.09)" stroke="rgba(99,102,241,0.4)" stroke-width="1.5"
        style="animation:fadeInUp 0.5s 0.4s both"/>
      <text x="621" y="118"  fill="#818cf8" font-size="13" font-weight="800" font-family="Inter,system-ui,sans-serif" text-anchor="middle">6 Golden SKUs</text>
      <text x="621" y="134" fill="#818cf8" font-size="11" font-weight="700" font-family="Inter,system-ui,sans-serif" text-anchor="middle">91% dedup ratio</text>
      <text x="621" y="150" fill="rgba(255,255,255,0.4)" font-size="9.5" font-family="Inter,system-ui,sans-serif" text-anchor="middle">38 SKUs → 6 canonical products</text>
    </svg>
  </div>`;
}

// Inject network graph into SKU raw page
const _prevSKURawForNetwork = renderRawPage;
renderRawPage = function() {
  if (state.activeDataset === 'crm') return _prevSKURawForNetwork();
  const html = _prevSKURawForNetwork();
  return html.replace('<div class="stats-grid">', renderSKUSourceNetwork() + '<div class="stats-grid">');
};

// ── 2. SKU Product Cluster Merging ───────────────────────
if (!state.skuClusterApprovals) state.skuClusterApprovals = {};

const SKU_PRODUCT_CLUSTERS = [
  { id:'cd20fitc', canonical:'Anti-CD20 Antibody, Clone 2H7, FITC', confidence:97, goldenId:'EB-0001', category:'Antibody',
    variants:['BA-100245 (BioAxis US)','EL-7782 (EuroLab EU)','NB-44321 (NordBio SE)','BA 100245 XL (large pack)'],
    matchBasis:'Clone 2H7 + Target CD20 + Conjugate FITC',
    sources:['US Feed','EU Feed','Nordic Feed'],
    issues:['SKU format: "BA 100245 XL" (spaces)','Target: "CD-20" vs "CD20"','"Fitc" vs "FITC" casing'] },
  { id:'cd20pe',   canonical:'Anti-CD20 Antibody, Clone 2H7, PE',   confidence:95, goldenId:'EB-0003', category:'Antibody',
    variants:['BA-100246 (BioAxis US)','EL-7783 (EuroLab EU)','NB-44322 (NordBio SE)'],
    matchBasis:'Clone 2H7 + Target CD20 + Conjugate PE',
    sources:['US Feed','EU Feed','Nordic Feed'],
    issues:['Price format: "402,00" EUR comma decimal','Language: "FACS" vs "Flow Cytometry"'] },
  { id:'cd3fitc',  canonical:'Anti-CD3 Antibody, Clone UCHT1, FITC', confidence:94, goldenId:'EB-0004', category:'Antibody',
    variants:['IP-CD3-FITC-100 (ImmunoPeak US)','EL-CD3-FITC (EuroLab FR)','NB-30010 (NordBio SE)'],
    matchBasis:'Clone UCHT1 + Target CD3 + Conjugate FITC',
    sources:['US Feed','EU Feed','Nordic Feed'],
    issues:['Language: "Cytometrie en flux" (FR)','Species: "Manniska" (SE) → Human'] },
  { id:'gapdh',    canonical:'Anti-GAPDH Polyclonal Antibody, Rabbit', confidence:93, goldenId:'EB-0006', category:'Antibody',
    variants:['LV-GAPDH-RB-100 (LabVeritas US)','BG-GAPDH-100 (BioGnostics EU)','ND-7001 (NordBio DK)'],
    matchBasis:'Target GAPDH + Host Rabbit + Application WB',
    sources:['US Feed','EU Feed','Nordic Feed'],
    issues:['Currency: DKK not normalized','Language: "antistof" (DK) → antibody'] },
  { id:'tnfelisa',  canonical:'Human TNF-alpha ELISA Kit (96 wells)', confidence:91, goldenId:'EB-0008', category:'ELISA Kit',
    variants:['CN-TNF-ELISA-96 (CytoNova US)','NA-TNF-96 (NordAssay EU)','NB-51020 (NordBio SE)'],
    matchBasis:'Target TNF-alpha + Format 96-well ELISA + HRP detection',
    sources:['US Feed','EU Feed','Nordic Feed'],
    issues:['Target: "TNFα" (unicode) vs "TNF-alpha" ASCII','Size: "1 x 96 wells" vs "96 brunnar"'] },
];

function approveSKUCluster(id) {
  state.skuClusterApprovals[id] = 'approved';
  showToast('Merge approved — product cluster will resolve into golden record');
  renderAll();
}
function rejectSKUCluster(id) {
  state.skuClusterApprovals[id] = 'rejected';
  renderAll();
}

function renderSKUProductClusters() {
  const approved = SKU_PRODUCT_CLUSTERS.filter(c => state.skuClusterApprovals[c.id] === 'approved').length;
  const pending = SKU_PRODUCT_CLUSTERS.filter(c => !state.skuClusterApprovals[c.id]).length;
  return `<div style="margin-bottom:1.75rem">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.875rem">
      <div>
        <div style="font-size:1rem;font-weight:700;color:var(--text-primary)">${icon('layers','icon-sm')} Product Deduplication Queue</div>
        <div style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.125rem">AI matched ${SKU_PRODUCT_CLUSTERS.length} product clusters across 3 regional feeds. Approve each merge to create a golden SKU.</div>
      </div>
      <div style="display:flex;gap:0.5rem;flex-shrink:0">
        ${approved > 0 ? `<span class="badge badge-accent">${approved} approved</span>` : ''}
        ${pending > 0 ? `<span class="badge badge-amber">${pending} pending review</span>` : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:0.875rem">
      ${SKU_PRODUCT_CLUSTERS.map(c => {
        const status = state.skuClusterApprovals[c.id];
        const isApproved = status === 'approved';
        const isRejected = status === 'rejected';
        const borderColor = isApproved ? 'rgba(99,102,241,0.4)' : isRejected ? 'rgba(239,68,68,0.25)' : 'var(--border-primary)';
        const bgColor = isApproved ? 'rgba(99,102,241,0.06)' : isRejected ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)';
        const confColor = c.confidence >= 95 ? 'var(--emerald)' : c.confidence >= 90 ? 'var(--amber)' : 'var(--red)';
        return `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:var(--radius);padding:1rem;transition:all 0.3s">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.625rem">
            <div style="flex:1;min-width:0">
              <div style="font-size:0.8125rem;font-weight:700;color:var(--text-primary);margin-bottom:0.125rem;line-height:1.3">${c.canonical}</div>
              <div style="font-size:0.6875rem;color:var(--text-tertiary)">${c.variants.length} SKUs → 1 golden · ${c.category}</div>
            </div>
            <div style="flex-shrink:0;margin-left:0.5rem">
              ${isApproved ? `<span class="badge badge-accent">✓ Merged</span>`
                : isRejected ? `<span class="badge badge-red">✗ Skipped</span>`
                : `<span class="badge badge-surface" style="color:${confColor};border-color:${confColor}">${c.confidence}% match</span>`}
            </div>
          </div>
          <div style="font-size:0.6875rem;color:var(--text-muted);margin-bottom:0.375rem;font-family:var(--font-mono)">Match: ${c.matchBasis}</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.1875rem;margin-bottom:0.5rem">
            ${c.variants.map(v=>`<span style="font-size:0.5625rem;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);border-radius:3px;padding:0.1rem 0.3rem;color:var(--red)">${v}</span>`).join('')}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.2rem;margin-bottom:0.5rem">
            ${c.issues.map(iss=>`<div style="font-size:0.6rem;color:var(--amber);display:flex;align-items:flex-start;gap:0.25rem"><span>⚠</span><span>${iss}</span></div>`).join('')}
          </div>
          <div style="display:flex;gap:0.25rem;margin-bottom:0.5rem;flex-wrap:wrap">
            ${c.sources.map(s=>`<span style="font-size:0.5625rem;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:3px;padding:0.1rem 0.375rem;color:var(--accent)">${s}</span>`).join('')}
          </div>
          ${!status ? `<div style="display:flex;gap:0.375rem;margin-top:0.5rem">
            <button class="btn btn-outline" style="flex:1;font-size:0.6875rem;padding:0.3rem 0.5rem;border-color:var(--accent);color:var(--accent)" onclick="approveSKUCluster('${c.id}')">✓ Approve Merge</button>
            <button class="btn btn-outline" style="font-size:0.6875rem;padding:0.3rem 0.5rem" onclick="rejectSKUCluster('${c.id}')">✗ Skip</button>
          </div>` : isApproved ? `<div style="font-size:0.75rem;color:var(--accent);margin-top:0.375rem">✓ Will resolve to: <strong>${c.goldenId}</strong></div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// Inject cluster UI + visual diff into SKU workbench page
const _prevSKUWorkbench = renderWorkbenchPage;
renderWorkbenchPage = function() {
  const html = _prevSKUWorkbench();
  if (state.activeDataset === 'crm') return html;
  let result = html.replace('<div class="workbench-layout">', renderSKUProductClusters() + '<div class="workbench-layout">');

  // Replace JSON diff-grid with visual diff
  if (state.selectedIssueId) {
    const issues = getActiveHarmonizationIssues();
    const selected = issues.find(i => i.id === state.selectedIssueId);
    if (selected) {
      const diffStart = result.indexOf('<div class="diff-grid">');
      if (diffStart !== -1) {
        let depth = 0, i = diffStart;
        while (i < result.length) {
          if (result.slice(i, i + 4) === '<div') depth++;
          if (result.slice(i, i + 6) === '</div>') { depth--; if (depth === 0) { result = result.slice(0, diffStart) + renderSKUIssueDiff(selected) + result.slice(i + 6); break; } }
          i++;
        }
      }
    }
  }
  return result;
};

// ── 3. SKU Split Search Page ──────────────────────────────
const SKU_RAW_SEARCH_DATA = {
  'cd20': [
    { sku:'BA-100245',      name:'Anti-CD20 Monoclonal Antibody',   source:'US Feed',      price:null,  issue:'Application: "FC" — not matching "Flow Cytometry" searches',          severity:'high'   },
    { sku:'BA 100245 XL',   name:'Anti CD20 mAb',                   source:'US Feed',      price:null,  issue:'SKU has spaces. Target is "CD-20" — hyphen mismatch. Duplicate of BA-100245', severity:'high' },
    { sku:'EL-7782',        name:'Anti-CD20 Antikorper',             source:'EU Feed',      price:null,  issue:'German name — won\'t match English searches. Missing target field.',   severity:'high'   },
    { sku:'EL-7783',        name:'Anti-CD20 Antikorper PE',          source:'EU Feed',      price:null,  issue:'Price "402,00" comma decimal. "FACS" synonym unresolved.',            severity:'medium' },
    { sku:'NB-44321',       name:'CD20 antikropp FITC',              source:'Nordic Feed',  price:null,  issue:'Swedish product name. Cross-ref "BA100245" missing hyphens.',         severity:'high'   },
    { sku:'NB-44322',       name:'CD20 antikropp PE',                source:'Nordic Feed',  price:null,  issue:'Swedish. Currency SEK not normalized.',                              severity:'medium' },
    { sku:'EB-0001 (PIM)',  name:'CD20 Antibody Human FC',           source:'Legacy PIM',   price:null,  issue:'Display name not canonical. Completeness score 72% — missing fields.', severity:'medium' },
    { sku:'EB-0002 (PIM)',  name:'Anti CD20 (Human) Flow Cytometry', source:'Legacy PIM',   price:null,  issue:'Created from German feed. Category missing. Target "CD-20" with hyphen.', severity:'high' },
  ],
  'tnf': [
    { sku:'CN-TNF-ELISA-96',    name:'TNF-alpha ELISA Kit',       source:'US Feed',     price:'$520', issue:'Target "TNF-alpha" vs "TNFα" unicode variant — split search results',  severity:'high'   },
    { sku:'CN-TNF-ELISA-96-DX', name:'TNF alpha ELISA Kit',       source:'US Feed',     price:'$548', issue:'DX = Diagnostic use — should be separate from RUO catalog',           severity:'medium' },
    { sku:'NA-TNF-96',          name:'TNF-alpha ELISA Kit',       source:'EU Feed',     price:null,   issue:'Price "495,00" comma decimal. Size "1 x 96 wells" not normalized.',    severity:'medium' },
    { sku:'NB-51020',           name:'TNF alfa ELISA kit',        source:'Nordic Feed', price:null,   issue:'Swedish "alfa" vs "alpha". Size "96 brunnar" (Swedish for wells).',   severity:'high'   },
  ],
  'elisa': [
    { sku:'CN-TNF-ELISA-96', name:'TNF-alpha ELISA Kit',        source:'US Feed',    price:'$520', issue:'RUO vs DX variant conflict. Application field mismatch.',              severity:'medium' },
    { sku:'NA-IL6-96',       name:'IL-6 ELISA Kit',             source:'EU Feed',    price:null,   issue:'Price comma decimal. Lead time "2 Wochen" German.',                    severity:'medium' },
    { sku:'NA-TNF-96',       name:'TNF-alpha ELISA Kit',        source:'EU Feed',    price:null,   issue:'"1 x 96 wells" vs "96 Tests" — inconsistent size format.',             severity:'medium' },
    { sku:'NB-51010',        name:'IL6 ELISA-kit',              source:'Nordic Feed',price:null,   issue:'"IL6" missing hyphen vs "IL-6". "brunnar" (SE) not normalized.',       severity:'high'   },
    { sku:'NB-51020',        name:'TNF alfa ELISA kit',         source:'Nordic Feed',price:null,   issue:'Swedish "alfa". Currency SEK.',                                         severity:'high'   },
  ],
  'anti il6': [
    { sku:'—', name:'(No results)', source:'Raw Catalog', price:null, issue:'Zero results — "IL-6" not indexed because EU feed uses "IL6" and Nordic uses "IL6 ELISA-kit". Hyphen inconsistency causes 100% miss rate.', severity:'high' },
  ],
  'cluster of differentiation 20': [
    { sku:'—', name:'(No results)', source:'Raw Catalog', price:null, issue:'Zero results — "CD20" is the canonical synonym for "cluster of differentiation 20" but the synonym mapping is absent in raw catalog. Biopharma researchers use this full term.', severity:'high' },
  ],
};

const SKU_GOLDEN_SEARCH_DATA = {
  'cd20':    { id:'EB-0001/EB-0003', name:'Anti-CD20 Antibody, Clone 2H7', target:'CD20', application:'Flow Cytometry', category:'Antibody', variants:8, suppliers:['BioAxis','EuroLab','NordBio Sweden'], currencies:{USD:449,EUR:389.50,SEK:410}, availability:'In Stock', citations:12, ruo:true, goldenCount:2, canonicalSkus:['EB-0001 (FITC)','EB-0003 (PE)'] },
  'tnf':     { id:'EB-0008', name:'Human TNF-alpha ELISA Kit (96 wells)', target:'TNF-alpha', application:'ELISA', category:'ELISA Kit', variants:4, suppliers:['CytoNova','NordAssay','NordBio Sweden'], currencies:{USD:520,EUR:495,SEK:535}, availability:'In Stock', citations:18, ruo:true, goldenCount:1, canonicalSkus:['EB-0008'] },
  'elisa':   { id:'EB-0008/EB-0010', name:'ELISA Kits — 2 golden records', target:'TNF-alpha · IL-6', application:'ELISA', category:'ELISA Kit', variants:5, suppliers:['CytoNova','NordAssay'], currencies:{USD:520,EUR:495}, availability:'In Stock', citations:18, ruo:true, goldenCount:2, canonicalSkus:['EB-0008 TNF-alpha','EB-0010 IL-6'] },
  'anti il6':{ id:'EB-0010', name:'Human IL-6 ELISA Kit (96 wells)', target:'IL-6', application:'ELISA', category:'ELISA Kit', variants:3, suppliers:['NordAssay','NordBio Sweden'], currencies:{EUR:520,SEK:565}, availability:'In Stock', citations:9, ruo:true, goldenCount:1, canonicalSkus:['EB-0010'] },
  'cluster of differentiation 20': { id:'EB-0001/EB-0003', name:'Anti-CD20 Antibody, Clone 2H7', target:'CD20', application:'Flow Cytometry', category:'Antibody', variants:8, suppliers:['BioAxis','EuroLab','NordBio Sweden'], currencies:{USD:449,EUR:389.50,SEK:410}, availability:'In Stock', citations:12, ruo:true, goldenCount:2, canonicalSkus:['EB-0001 (FITC)','EB-0003 (PE)'] },
};

function setSKUSearchQuery(q) {
  state.searchQuery = q;
  const el = document.getElementById('sku-search-input');
  if (el) el.value = q;
  const container = document.getElementById('sku-search-results');
  if (container) container.innerHTML = renderSKUSplitResults(q.toLowerCase().trim());
  else renderAll();
}

function renderSKUSplitResults(q) {
  const rawKey = Object.keys(SKU_RAW_SEARCH_DATA).find(k => q.includes(k) || k.includes(q)) || (q ? null : 'cd20');
  const goldKey = Object.keys(SKU_GOLDEN_SEARCH_DATA).find(k => q.includes(k) || k.includes(q)) || (q ? null : 'cd20');
  const rawResults = rawKey ? SKU_RAW_SEARCH_DATA[rawKey] : [];
  const golden = goldKey ? SKU_GOLDEN_SEARCH_DATA[goldKey] : null;

  if (!q && !rawKey) return `<div style="text-align:center;padding:3rem;color:var(--text-muted)"><p>Type a product or target to see the before/after comparison</p></div>`;

  const isZeroResult = rawResults.length === 1 && rawResults[0].sku === '—';

  const leftPanel = rawResults.length === 0
    ? `<div style="padding:2rem;text-align:center;color:var(--text-muted)">No raw results for "${q}"</div>`
    : rawResults.map(r => `<div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.18);border-radius:var(--radius-sm);padding:0.75rem 1rem;margin-bottom:0.5rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;margin-bottom:0.375rem">
          <span style="font-size:0.875rem;font-weight:600;color:var(--text-primary)">${r.name}</span>
          <span style="font-size:0.5625rem;background:rgba(${r.severity==='high'?'239,68,68':'245,158,11'},0.12);border:1px solid rgba(${r.severity==='high'?'239,68,68':'245,158,11'},0.25);color:var(--${r.severity==='high'?'red':'amber'});border-radius:3px;padding:0.1rem 0.35rem;white-space:nowrap;flex-shrink:0">${r.severity}</span>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.25rem">
          <span style="font-size:0.6875rem;color:var(--text-tertiary);font-family:var(--font-mono)">${r.sku}</span>
          <span class="badge badge-surface" style="font-size:0.5625rem">${r.source}</span>
          ${r.price ? `<span style="font-size:0.6875rem;color:var(--accent);font-weight:600">${r.price}</span>` : '<span style="font-size:0.6875rem;color:var(--text-muted)">Price: not normalized</span>'}
        </div>
        <div style="font-size:0.75rem;color:var(--red)">⚠ ${r.issue}</div>
      </div>`).join('');

  const rightPanel = !golden
    ? `<div style="padding:2rem;text-align:center;color:var(--text-muted)">No golden record for "${q}"</div>`
    : `<div style="background:rgba(99,102,241,0.07);border:2px solid rgba(99,102,241,0.35);border-radius:var(--radius);padding:1.125rem 1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.875rem">
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">
              <span class="badge badge-accent" style="font-size:0.625rem">⭐ Golden Record</span>
              <span style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text-muted)">${golden.id}</span>
            </div>
            <div style="font-size:1rem;font-weight:800;color:var(--text-primary);line-height:1.3">${golden.name}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.125rem">${golden.category} · ${golden.application} · ${golden.citations} citations</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:0.75rem">
            <div style="font-size:1.25rem;font-weight:900;color:var(--accent)">${golden.goldenCount} SKU${golden.goldenCount>1?'s':''}</div>
            <div style="font-size:0.6875rem;color:var(--text-tertiary)">canonical records</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.625rem;margin-bottom:0.875rem">
          <div style="background:rgba(255,255,255,0.04);border-radius:var(--radius-sm);padding:0.625rem">
            <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-bottom:0.25rem">Multi-Currency Pricing</div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--accent)">${Object.entries(golden.currencies).map(([c,v])=>`${c} ${v}`).join(' · ')}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:var(--radius-sm);padding:0.625rem">
            <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-bottom:0.25rem">Availability</div>
            <div style="font-size:0.875rem;font-weight:700;color:var(--emerald)">${golden.availability}</div>
          </div>
        </div>
        <div style="margin-bottom:0.75rem">
          <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.375rem">Golden SKUs (${golden.canonicalSkus.length})</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.25rem">${golden.canonicalSkus.map(s=>`<span class="badge badge-accent" style="font-size:0.625rem">${s}</span>`).join('')}</div>
        </div>
        <div style="margin-bottom:0.75rem">
          <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.25rem">Suppliers (${golden.suppliers.length} regions)</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.25rem">${golden.suppliers.map(s=>`<span class="badge badge-surface" style="font-size:0.625rem">${s}</span>`).join('')}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:0.625rem;border-top:1px solid rgba(99,102,241,0.15)">
          <span style="font-size:0.75rem;color:var(--text-tertiary)">${golden.variants} source variants unified</span>
          <button class="btn btn-outline" style="font-size:0.6875rem;padding:0.25rem 0.75rem;border-color:var(--accent);color:var(--accent)" onclick="startSKUExport()">Export to PIM →</button>
        </div>
      </div>`;

  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;animation:fadeInUp 0.3s ease-out">
    <div>
      <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.75rem;padding:0.625rem 0.875rem;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm)">
        <span style="color:var(--red);font-size:1.125rem">✗</span>
        <div>
          <div style="font-size:0.8125rem;font-weight:700;color:var(--red)">Before Harmonization</div>
          <div style="font-size:0.6875rem;color:var(--text-tertiary)">${isZeroResult ? '0 results — search completely fails' : `${rawResults.length} fragmented records · no canonical pricing`}</div>
        </div>
      </div>
      ${leftPanel}
    </div>
    <div>
      <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.75rem;padding:0.625rem 0.875rem;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.25);border-radius:var(--radius-sm)">
        <span style="color:var(--accent);font-size:1.125rem">✓</span>
        <div>
          <div style="font-size:0.8125rem;font-weight:700;color:var(--accent)">After Harmonization</div>
          <div style="font-size:0.6875rem;color:var(--text-tertiary)">${golden ? `${golden.goldenCount} canonical SKU${golden.goldenCount>1?'s':''} · multi-region pricing · 100% recall` : '—'}</div>
        </div>
      </div>
      ${rightPanel}
    </div>
  </div>`;
}

function renderSKUSearchPage() {
  const q = state.searchQuery || 'cd20';
  const suggestions = ['cd20','tnf','elisa','anti il6','cluster of differentiation 20'];
  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div>
        <h1>Catalog Search Impact</h1>
        <p class="page-subtitle">See exactly which queries fail on raw data — and how golden records fix them.</p>
      </div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" style="background:linear-gradient(135deg,var(--accent),#4f46e5);box-shadow:0 0 20px rgba(99,102,241,0.25)" onclick="startSKUExport()">${icon('upload')} Export to PIM / ERP</button>`)}
    </div>
    ${renderStorylineCard()}

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.875rem;margin-bottom:1.5rem">
      <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.22);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
        <div style="font-size:1.75rem;font-weight:900;color:var(--red)">2</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Zero-Result Queries</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">Before harmonization</div>
      </div>
      <div style="background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.22);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
        <div style="font-size:1.75rem;font-weight:900;color:var(--accent)">91%</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Dedup Ratio</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">38 raw → 6 golden SKUs</div>
      </div>
      <div style="background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.22);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
        <div style="font-size:1.75rem;font-weight:900;color:var(--emerald)">7</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Language Variants</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">EN / DE / FR / SE / DK resolved</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:1.5rem"><div class="card-content">
      <div style="position:relative;margin-bottom:0.75rem">
        <span style="position:absolute;left:0.875rem;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none">${icon('search')}</span>
        <input id="sku-search-input" type="text" value="${q}" oninput="setSKUSearchQuery(this.value)"
          placeholder="Search products — try 'cd20', 'tnf', 'elisa', 'anti il6', or 'cluster of differentiation 20'…"
          style="width:100%;padding:0.75rem 1rem 0.75rem 2.5rem;font-size:0.9375rem;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);outline:none;font-family:var(--font-sans)"/>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
        <span style="font-size:0.75rem;color:var(--text-tertiary)">Try:</span>
        ${suggestions.map(s=>`<button style="cursor:pointer;background:transparent;border:1px solid var(--border-subtle);color:var(--text-secondary);border-radius:var(--radius-sm);padding:0.2rem 0.625rem;font-size:0.75rem;font-family:var(--font-sans)" onclick="setSKUSearchQuery('${s}')">"${s}"</button>`).join('')}
      </div>
    </div></div>

    <div id="sku-search-results">${renderSKUSplitResults(q.toLowerCase().trim())}</div>
    ${renderPageHelpPanel()}
  </div>`;
}

// Override renderSearchPage for SKU
const _prevRenderSearchForSKU = renderSearchPage;
renderSearchPage = function() {
  if (state.activeDataset === 'crm') return _prevRenderSearchForSKU();
  return renderSKUSearchPage();
};

// ── 4. Export to PIM / ERP ───────────────────────────────
if (!state.skuExportState) state.skuExportState = null;

function startSKUExport() {
  if (state.skuExportState === 'exporting') return;
  state.skuExportState = 'exporting';
  showToast('Exporting 6 golden SKUs to PIM / ERP…');
  setTimeout(() => {
    state.skuExportState = 'done';
    showToast('✓ Export complete — 6 canonical SKUs · 4 regional price lists · 7 language variants mapped');
    renderAll();
  }, 2200);
}

// Inject export banner into SKU golden records page
const _prevRenderGoldenForSKU = renderGoldenPage;
renderGoldenPage = function() {
  const html = _prevRenderGoldenForSKU();
  if (state.activeDataset === 'crm') return html;
  const exportBanner = state.skuExportState === 'done'
    ? `<div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);border-radius:var(--radius-lg);padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:0.875rem">
          <span style="font-size:1.5rem">✓</span>
          <div>
            <div style="font-weight:700;color:var(--accent)">Export Complete</div>
            <div style="font-size:0.8125rem;color:var(--text-secondary)">6 golden SKUs · 4 regional price lists · 7 language variants fully mapped to PIM canonical schema</div>
          </div>
        </div>
        <span class="badge badge-accent">Exported just now</span>
      </div>`
    : `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:600;color:var(--text-primary);margin-bottom:0.25rem">Golden catalog ready to export</div>
          <div style="font-size:0.8125rem;color:var(--text-secondary)">Push 6 canonical SKUs to your PIM or ERP — multi-currency pricing and all language variants included</div>
        </div>
        <button class="btn btn-primary" style="flex-shrink:0;background:linear-gradient(135deg,var(--accent),#4f46e5);white-space:nowrap" onclick="startSKUExport()">${icon('upload')} Export to PIM / ERP</button>
      </div>`;
  return html.replace('<div class="card" style="margin-bottom:1.5rem">\n      <div class="card-header">', exportBanner + '<div class="card" style="margin-bottom:1.5rem">\n      <div class="card-header">');
};

// ════════════════════════════════════════════════════════════
//  SKU SCENARIO 1 — PREMIUM VISUAL UPGRADE
// ════════════════════════════════════════════════════════════

// ── Per-file AI Insights ─────────────────────────────────
const SKU_FILE_AI_INSIGHTS = {
  'supplier_feed_us_antibodies.csv': [
    { text: '<strong>3 SKUs represent the same Anti-CD20 Clone 2H7 FITC product</strong>: BA-100245, "BA 100245 XL" (spaces in SKU), and legacy EB-0001 — all map to one canonical golden record. Without harmonization a scientist sees 3 separate products and misses the consolidated pricing.' },
    { text: '<strong>Application field has 4 synonyms across 12 rows</strong>: "FC", "FACS", "Flow", "Flow Cytometry". A researcher searching "Flow Cytometry" currently misses 75% of matching antibodies in this feed alone.' },
  ],
  'supplier_feed_eu_reagents.csv': [
    { text: '<strong>Trilingual species field</strong>: "Mensch" (DE), "Homme" (FR), and "Human" (EN) in the same spezies column. European comma decimal "389,50" will parse as the integer 38950 in any standard ETL — a 100× price inflation bug.' },
    { text: '<strong>5 records resolve to 3 golden SKUs</strong> — but only after fixing German/French field languages, filling 4 empty zielprotein (target protein) entries, and converting comma-decimal prices to standard float.' },
  ],
  'acquisition_catalog_nordic.csv': [
    { text: '<strong>"Manniska" (Swedish for "Human") in row 5</strong> breaks every species-level product filter. "brunnar" (SE: wells) in the storlek column makes size normalization impossible without a translation map.' },
    { text: '<strong>Mixed SEK and DKK currencies</strong>: 7 records in SEK, 2 in DKK — cannot compute unified price tiers without currency conversion. Cross-reference "BA100245" (no hyphens) will silently fail to match "BA-100245" in lookup joins.' },
  ],
  'internal_master_catalog_legacy.xlsx': [
    { text: '<strong>Category taxonomy conflict</strong>: "Reagents" and "Immunology Reagents" overlap — breaks all taxonomy-based faceted search. EB-0001 and EB-0002 represent the same product with completeness scores of 72% vs 51%, creating duplicate master records.' },
    { text: '<strong>Excel float artifacts</strong>: created_year shows "2021.0", legacy_item_code shows "1001.0". Row EB-0002 completeness 51% — missing application_normalized and category_l2/l3 fields that downstream reporting depends on.' },
  ],
  'customer_search_logs.csv': [
    { text: '<strong>2 of 10 searches returned zero results</strong>: "anti il6 serum elisa" and "cluster of differentiation 20 antibody" — both products exist in the catalog but not under these naming patterns. This is the direct search revenue gap.' },
    { text: '<strong>Multilingual queries in the log</strong>: "cytometrie en flux" (French) and "flodescytometri" (Swedish) from EU/Nordic users — these only resolve after the canonical application field is unified across all feeds.' },
  ],
  'pricing_and_inventory_snapshot.csv': [
    { text: '<strong>4 status vocabularies for availability</strong>: "Lagernd" (DE), "Available" (SE), "In Stock" (EN), "2 Wochen" (DE: 2-week lead time) — none are filterable together without normalization. Filtering for "in stock" returns 0 EU or Nordic records.' },
    { text: '<strong>EB-0001, EB-0003, EB-0006 appear from 2+ suppliers</strong> each — duplicate pricing rows that cannot be deduplicated until the canonical golden SKU is established. Three active currencies: USD, EUR, SEK.' },
  ],
  'supplier_datasheets.json': [
    { text: '<strong>5 variants of "RUO" regulatory text</strong>: "For research use only.", "RUO only", "RUO", "Research use only", "CE-IVD…" — uncontrolled regulatory metadata creates compliance risk when reports are generated by product family.' },
    { text: '<strong>ds_003 references "BA 100245 XL"</strong> (spaces in SKU) — will not match any canonical lookup without SKU normalization. Only 4 of 12 datasheets have citation counts above 5, which affects downstream product ranking.' },
  ],
};

// ── Rich SKU file detail (two-column, AI-powered) ─────────
const _origSKURenderFileDetail = renderFileDetail;
renderFileDetail = function(profile) {
  if (state.activeDataset !== 'sku') return _origSKURenderFileDetail(profile);
  const file = RAW_FILES[profile.key];
  if (!file) return _origSKURenderFileDetail(profile);
  return renderSKUFileDetailPanel(file, profile.key);
};

function renderSKUFileDetailPanel(file, key) {
  const fileIssues = file.issues || [];
  const insights = SKU_FILE_AI_INSIGHTS[key] || [];
  const highCnt = fileIssues.filter(i => i.severity === 'high').length;
  const medCnt  = fileIssues.filter(i => i.severity === 'medium').length;

  return `<div style="animation:fadeInUp 0.3s ease-out;margin-top:1.5rem">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.125rem">
      <div>
        <h2 style="color:var(--text-primary);font-size:1.125rem;font-weight:700">${displayFileName(key)}</h2>
        <p style="color:var(--text-tertiary);font-size:0.8125rem;margin-top:0.25rem">${file.description}</p>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <span class="badge badge-surface">${file.data.length} rows</span>
        ${highCnt > 0 ? `<span class="badge badge-red">${highCnt} critical</span>` : ''}
        ${medCnt  > 0 ? `<span class="badge badge-amber">${medCnt} warnings</span>` : ''}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 280px;gap:1.25rem;align-items:start;min-width:0">
      <!-- LEFT: data table + issues -->
      <div style="min-width:0;overflow:hidden">
        <div class="data-section-header">${icon('eye','icon-sm')} Data Preview</div>
        <div class="raw-table-scroll heal-animation" style="margin-bottom:1.25rem;max-height:300px;overflow-x:auto;overflow-y:auto">
          <table><thead><tr>${file.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${file.data.map((row, ri) => {
            const rowIssues = fileIssues.filter(i => i.row === ri || (i.rows && i.rows.includes(ri)));
            return `<tr class="${rowIssues.length ? 'row-messy' : ''}">${row.map((cell, ci) => {
              const colName = file.headers[ci];
              const cellIssue = rowIssues.find(i => i.col === colName);
              const cls = cellIssue ? (cellIssue.severity === 'high' ? 'cell-messy' : 'cell-warning') : (!cell ? 'cell-missing' : '');
              return `<td class="${cls}">${cell || '<em>-</em>'}</td>`;
            }).join('')}</tr>`;
          }).join('')}</tbody></table>
        </div>

        ${fileIssues.length > 0 ? `
        <div id="file-issues-section" class="data-section-header">${icon('alertCircle','icon-sm')} Data Issues (${fileIssues.length})</div>
        <div class="issues-list" style="margin-bottom:1rem">
          ${fileIssues.map((iss, issIdx) => `<div class="issue-chip issue-chip-clickable" onclick="openIssueModal('${key}', ${issIdx})">
            <span class="${iss.severity==='high'?'issue-icon-red':iss.severity==='medium'?'issue-icon-amber':'issue-icon-accent'}">${icon(iss.severity==='high'?'alertCircle':iss.severity==='medium'?'alertTriangle':'info')}</span>
            <div style="flex:1"><span style="color:var(--text-primary);font-weight:500">${iss.col}</span> <span class="badge badge-surface badge-mono" style="margin-left:0.25rem">${iss.type}</span> <span class="badge ${iss.severity==='high'?'badge-red':iss.severity==='medium'?'badge-amber':'badge-accent'}" style="font-size:0.5625rem;margin-left:0.25rem">${iss.severity}</span><br><span style="color:var(--text-secondary);font-size:0.8125rem">${iss.desc}</span></div>
            <div style="display:flex;gap:0.375rem;flex-shrink:0">
              <button class="btn-send-rules" onclick="event.stopPropagation();sendToRules('${key}',${issIdx})">📋 Rules</button>
              <span style="color:var(--text-tertiary);font-size:0.75rem;align-self:center">→</span>
            </div>
          </div>`).join('')}
        </div>` : ''}
      </div>

      <!-- RIGHT: AI analysis + column health -->
      <div style="position:sticky;top:5rem;min-width:0;overflow:hidden;word-break:break-word">
        ${insights.length > 0 ? `<div class="ai-panel" style="margin-bottom:1rem">
          <div class="ai-panel-header">${icon('sparkles','icon-sm')} AI Analysis</div>
          ${insights.map(ins => `<div class="ai-insight">${ins.text}</div>`).join('')}
        </div>` : ''}
        <div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius);padding:0.875rem">
          <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary);margin-bottom:0.625rem">Column Health</div>
          <div style="display:flex;flex-direction:column;gap:0.375rem">
            ${file.headers.map(h => {
              const colIssues = fileIssues.filter(i => i.col === h);
              const hasHigh = colIssues.some(i => i.severity === 'high');
              const hasMed  = colIssues.some(i => i.severity === 'medium');
              const dot   = hasHigh ? '#ef4444' : hasMed ? '#f59e0b' : '#10b981';
              const label = hasHigh ? 'Critical' : hasMed ? 'Warning' : 'Clean';
              return `<div style="display:flex;align-items:center;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                <span style="font-size:0.6875rem;font-family:var(--font-mono);color:var(--text-secondary)">${h}</span>
                <span style="font-size:0.5625rem;color:${dot};display:flex;align-items:center;gap:0.25rem"><span style="width:6px;height:6px;border-radius:9999px;background:${dot};display:inline-block"></span>${label}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Visual Issue Diff ─────────────────────────────────────
function renderSKUIssueDiff(issue) {
  if (issue.id === 'h1') {
    const variants = issue.before.values || [];
    const srcMap = { 'FC':'US Feed','FACS':'EU Feed','Flow':'US Feed','Flow Cytometry':'US Feed','Durchflusszytometrie':'EU Feed (DE)','Cytometrie en flux':'EU Feed (FR)','Flodescytometri':'Nordic Feed (SE)' };
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <div class="diff-label"><span class="dot dot-red"></span> Before (Raw) — ${variants.length} unresolved synonyms</div>
        <div class="diff-block-before" style="padding:1rem">
          <div style="display:flex;flex-direction:column;gap:0.5rem">
            ${variants.map(v => `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm);padding:0.4rem 0.75rem">
              <span style="font-family:var(--font-mono);font-size:0.8125rem;color:var(--red);font-weight:600">${v}</span>
              <span style="font-size:0.6rem;color:var(--text-muted);background:rgba(255,255,255,0.06);border-radius:3px;padding:0.1rem 0.35rem">${srcMap[v] || 'Source Feed'}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="diff-label"><span class="dot dot-green"></span> After (Healed) — unified canonical value</div>
        <div class="diff-block-after" style="padding:1rem;display:flex;flex-direction:column;gap:0.75rem">
          <div style="background:rgba(16,185,129,0.1);border:2px solid rgba(16,185,129,0.4);border-radius:var(--radius);padding:0.875rem 1.25rem;text-align:center">
            <div style="font-size:1.125rem;font-weight:800;color:var(--emerald)">Flow Cytometry</div>
            <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:0.25rem">Canonical application value</div>
          </div>
          <div style="background:rgba(16,185,129,0.05);border-radius:var(--radius-sm);padding:0.75rem">
            <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-bottom:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">All ${variants.length} variants now map to →</div>
            ${variants.map(v => `<div style="font-size:0.75rem;color:var(--text-secondary);display:flex;gap:0.5rem;padding:0.125rem 0"><span style="color:var(--red)">${v}</span><span style="color:var(--text-muted)">→</span><span style="color:var(--emerald);font-weight:600">Flow Cytometry</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  if (issue.id === 'h2') {
    const records = issue.before.records || [];
    const srcColors = { '(US)':'var(--accent)', '(EU)':'#f59e0b', '(Nordic)':'var(--emerald)' };
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <div class="diff-label"><span class="dot dot-red"></span> Before — ${records.length} fragmented catalog entries</div>
        <div class="diff-block-before" style="padding:1rem">
          <div style="display:flex;flex-direction:column;gap:0.625rem">
            ${records.map((r, i) => {
              const names = ['Anti-CD20 Monoclonal Antibody','Anti-CD20 Antikorper','CD20 antikropp FITC'];
              const prices = ['$449 USD','€389.50 EUR','410 SEK'];
              const regions = ['🇺🇸 US','🇩🇪 EU','🇸🇪 Nordic'];
              const color = Object.entries(srcColors).find(([k]) => r.includes(k));
              return `<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm);padding:0.625rem 0.875rem">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
                  <span style="font-size:0.6875rem;font-weight:700;color:var(--text-primary)">${names[i] || r}</span>
                  <span style="font-size:0.5625rem;color:${color?color[1]:'var(--text-muted)'}">${regions[i]}</span>
                </div>
                <div style="font-size:0.6875rem;color:var(--text-muted);font-family:var(--font-mono)">${r}</div>
                <div style="font-size:0.6875rem;color:var(--amber);margin-top:0.25rem">${prices[i]} · treated as separate product</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="diff-label"><span class="dot dot-green"></span> After — 1 canonical golden record</div>
        <div class="diff-block-after" style="padding:1rem">
          <div style="background:rgba(99,102,241,0.08);border:2px solid rgba(99,102,241,0.4);border-radius:var(--radius);padding:1rem">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
              <span class="badge badge-accent" style="font-size:0.5625rem">⭐ Golden Record</span>
              <span style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text-muted)">${issue.after.golden_id}</span>
            </div>
            <div style="font-size:0.9375rem;font-weight:800;color:var(--text-primary);margin-bottom:0.625rem">${issue.after.name}</div>
            <div style="display:flex;flex-direction:column;gap:0.25rem">
              <div style="font-size:0.75rem;color:var(--text-secondary)">🇺🇸 USD 449 · 🇩🇪 EUR 389.50 · 🇸🇪 SEK 410</div>
              <div style="font-size:0.75rem;color:var(--emerald);font-weight:600">3 suppliers · In Stock · Clone 2H7 · FITC</div>
              <div style="font-size:0.6875rem;color:var(--text-muted);margin-top:0.25rem">↳ Merged from ${records.length} source records</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  if (issue.id === 'h3') {
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <div class="diff-label"><span class="dot dot-red"></span> Before — target protein missing</div>
        <div class="diff-block-before" style="padding:1rem">
          <div style="background:rgba(239,68,68,0.05);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.8125rem">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
              <span class="badge badge-surface" style="font-size:0.5625rem">EL-7782 · EU Feed</span>
            </div>
            ${[['product_title_local','Anti-CD20 Antikorper',''],['anwendung','Durchflusszytometrie',''],['zielprotein','(empty)','cell-messy'],['preis_eur','389,50','cell-warning'],['spezies','Mensch','cell-warning']].map(([col, val, cls]) =>
              `<div style="display:flex;gap:0.75rem;padding:0.25rem 0;border-bottom:1px solid rgba(255,255,255,0.04);align-items:center">
                <span style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text-tertiary);min-width:7rem">${col}</span>
                <span style="font-size:0.8125rem;${cls==='cell-messy'?'color:var(--red);font-weight:600':cls==='cell-warning'?'color:var(--amber)':'color:var(--text-secondary)'}">${val}</span>
                ${cls === 'cell-messy' ? '<span style="font-size:0.6rem;background:rgba(239,68,68,0.15);color:var(--red);border-radius:3px;padding:0.1rem 0.35rem;margin-left:auto">MISSING</span>' : ''}
              </div>`
            ).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="diff-label"><span class="dot dot-green"></span> After — target enriched from product title</div>
        <div class="diff-block-after" style="padding:1rem">
          <div style="background:rgba(16,185,129,0.05);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.8125rem">
            ${[['product_title_local','Anti-CD20 Antikorper',''],['anwendung','Flow Cytometry','healed'],['zielprotein','CD20','healed'],['preis_eur','389.50','healed'],['spezies','Human','healed']].map(([col, val, cls]) =>
              `<div style="display:flex;gap:0.75rem;padding:0.25rem 0;border-bottom:1px solid rgba(255,255,255,0.04);align-items:center">
                <span style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text-tertiary);min-width:7rem">${col}</span>
                <span style="font-size:0.8125rem;${cls==='healed'?'color:var(--emerald);font-weight:600':'color:var(--text-secondary)'}">${val}</span>
                ${cls === 'healed' ? '<span style="font-size:0.6rem;background:rgba(16,185,129,0.15);color:var(--emerald);border-radius:3px;padding:0.1rem 0.35rem;margin-left:auto">HEALED</span>' : ''}
              </div>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  if (issue.id === 'h4') {
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <div class="diff-label"><span class="dot dot-red"></span> Before — European comma decimal</div>
        <div class="diff-block-before" style="padding:1rem">
          <div style="text-align:center;padding:1.5rem 0">
            <div style="font-size:2.5rem;font-weight:900;color:var(--red);font-family:var(--font-mono)">"389,50"</div>
            <div style="font-size:0.8125rem;color:var(--text-tertiary);margin-top:0.5rem">Parsed as: string · or integer 38950</div>
          </div>
          <div style="background:rgba(239,68,68,0.07);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.8125rem;color:var(--text-secondary)">
            <strong style="color:var(--red)">Impact:</strong> If parsed as integer, €389.50 becomes €38,950 — a 100× pricing error. If parsed as string, all price aggregation breaks silently.
          </div>
        </div>
      </div>
      <div>
        <div class="diff-label"><span class="dot dot-green"></span> After — standard float</div>
        <div class="diff-block-after" style="padding:1rem">
          <div style="text-align:center;padding:1.5rem 0">
            <div style="font-size:2.5rem;font-weight:900;color:var(--emerald);font-family:var(--font-mono)">389.50</div>
            <div style="font-size:0.8125rem;color:var(--text-tertiary);margin-top:0.5rem">Parsed as: float 389.50 (€)</div>
          </div>
          <div style="background:rgba(16,185,129,0.07);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.8125rem;color:var(--text-secondary)">
            <strong style="color:var(--emerald)">Method:</strong> Detected country_market=DE → European locale → replaced comma with period. Confirmed: same product in US feed priced at $449 → EUR conversion validates ~€389.
          </div>
        </div>
      </div>
    </div>`;
  }

  if (issue.id === 'h5') {
    const variants = issue.before.values || [];
    const flags = { Human:'🇬🇧', Hu:'🇬🇧 abbrev', Mensch:'🇩🇪 DE', Homme:'🇫🇷 FR', Manniska:'🇸🇪 SE', human:'lowercase' };
    return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <div class="diff-label"><span class="dot dot-red"></span> Before — ${variants.length} language variants</div>
        <div class="diff-block-before" style="padding:1rem">
          <div style="display:flex;flex-direction:column;gap:0.4rem">
            ${variants.map(v => `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.18);border-radius:var(--radius-sm);padding:0.4rem 0.75rem">
              <span style="font-family:var(--font-mono);font-size:0.875rem;color:var(--red);font-weight:600">${v}</span>
              <span style="font-size:0.6rem;color:var(--text-muted);background:rgba(255,255,255,0.06);border-radius:3px;padding:0.1rem 0.35rem">${flags[v] || 'variant'}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="diff-label"><span class="dot dot-green"></span> After — single canonical species</div>
        <div class="diff-block-after" style="padding:1rem;display:flex;flex-direction:column;gap:0.75rem">
          <div style="background:rgba(16,185,129,0.1);border:2px solid rgba(16,185,129,0.4);border-radius:var(--radius);padding:0.875rem 1.25rem;text-align:center">
            <div style="font-size:1.125rem;font-weight:800;color:var(--emerald)">Human</div>
            <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:0.25rem">Canonical reactivity / species value</div>
          </div>
          <div style="background:rgba(16,185,129,0.05);border-radius:var(--radius-sm);padding:0.75rem">
            <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-bottom:0.375rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Language detection results</div>
            ${variants.map(v => `<div style="font-size:0.75rem;display:flex;gap:0.5rem;padding:0.1rem 0"><span style="color:var(--red);font-family:var(--font-mono)">${v}</span><span style="color:var(--text-muted)">→</span><span style="color:var(--emerald);font-weight:600">Human</span><span style="color:var(--text-muted);font-size:0.6rem;margin-left:auto">${flags[v]||''}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  // Fallback: structured cards instead of JSON
  const beforeEntries = Object.entries(issue.before);
  const afterEntries = Object.entries(issue.after);
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
    <div>
      <div class="diff-label"><span class="dot dot-red"></span> Before (Raw)</div>
      <div class="diff-block-before" style="padding:1rem">
        ${beforeEntries.map(([k, v]) => `<div style="display:flex;gap:0.75rem;padding:0.375rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <span style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text-tertiary);min-width:6rem;flex-shrink:0">${k}</span>
          <span style="font-size:0.8125rem;color:var(--red);font-weight:500;word-break:break-all">${Array.isArray(v) ? v.join(', ') : String(v)}</span>
        </div>`).join('')}
      </div>
    </div>
    <div>
      <div class="diff-label"><span class="dot dot-green"></span> After (Healed)</div>
      <div class="diff-block-after" style="padding:1rem">
        ${afterEntries.map(([k, v]) => `<div style="display:flex;gap:0.75rem;padding:0.375rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <span style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text-tertiary);min-width:6rem;flex-shrink:0">${k}</span>
          <span style="font-size:0.8125rem;color:var(--emerald);font-weight:500;word-break:break-all">${Array.isArray(v) ? v.join(', ') : String(v)}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── SKU Golden Records — Hero Stats ──────────────────────
const _prevRenderGoldenForSKUStats = renderGoldenPage;
renderGoldenPage = function() {
  const html = _prevRenderGoldenForSKUStats();
  if (state.activeDataset === 'crm') return html;
  const heroCards = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.875rem;margin-bottom:1.5rem">
    <div style="background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.25);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
      <div style="font-size:1.875rem;font-weight:900;color:var(--accent)">6</div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Golden SKUs</div>
      <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">From 38 raw source records</div>
    </div>
    <div style="background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.25);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
      <div style="font-size:1.875rem;font-weight:900;color:var(--emerald)">91%</div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Dedup Ratio</div>
      <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">38 raw → 6 canonical SKUs</div>
    </div>
    <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
      <div style="font-size:1.875rem;font-weight:900;color:var(--amber)">3</div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Currencies Unified</div>
      <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">USD · EUR · SEK / DKK</div>
    </div>
    <div style="background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.25);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
      <div style="font-size:1.875rem;font-weight:900;color:var(--purple)">7</div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Language Variants</div>
      <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.125rem">EN · DE · FR · SE · DK resolved</div>
    </div>
  </div>`;
  return html.replace('<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">', heroCards + '<div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">');
};

document.addEventListener('DOMContentLoaded', () => { renderAll(); });
