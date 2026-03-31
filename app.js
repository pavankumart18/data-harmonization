// ============================================================
//  Data Harmonization Tower — Main Application
// ============================================================

// ── Application State ────────────────────────────────────
const state = {
  currentPage: 'raw',
  selectedFileKey: null,
  autoMapped: false,
  issues: null,
  activeIssueTab: 'normalization',
  selectedIssueId: null,
  selectedRecordId: null,
  searchQuery: 'cd20',
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
  const intro = PAGE_INTROS[state.currentPage];
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
          'Open any source file card to inspect its columns, sample rows, and quality score.',
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

  // Distribution: top 5 values
  const freq = {};
  values.forEach(v => { const k = v || '(empty)'; freq[k] = (freq[k]||0)+1; });
  const dist = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,5)
    .map(([val,count]) => ({ value: val, count, pct: Math.round((count/total)*100) }));

  const qualityLevel = quality >= 80 ? 'high' : quality >= 50 ? 'medium' : 'low';
  return { name: header, total, empty, filled, unique, fillRate, quality, qualityLevel, issues: colIssues, dist, samples: [...new Set(values.filter(v=>v))].slice(0,4) };
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
function selectFile(key) { state.selectedFileKey = key; renderAll(); }

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
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateTo('mapping')">Begin Canonicalization ${icon('arrowRight')}</button>`)}
    </div>
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
          <div class="source-file-name">${key}</div>
          <div class="source-file-meta"><span>${f.rows} rows</span><span>${f.headers.length} cols</span><span>${f.region}</span></div>
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
        <h2 style="color:var(--text-primary);font-size:1.25rem">${profile.key}</h2>
        <p style="color:var(--text-tertiary);font-size:0.8125rem;margin-top:0.25rem">${file.description}</p>
      </div>
      <div style="display:flex;gap:0.5rem">
        <span class="badge badge-surface">${file.rows} rows</span>
        <span class="badge badge-surface">${file.headers.length} columns</span>
        <span class="badge ${profile.avgQuality>=80?'badge-emerald':profile.avgQuality>=50?'badge-amber':'badge-red'}">${icon(profile.avgQuality>=80?'checkCircle2':'alertTriangle','icon-sm')} Quality: ${profile.avgQuality}%</span>
      </div>
    </div>
    <h3 style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:1rem">Column Profiles</h3>
    <div class="col-profiles-grid">
      ${profile.columns.map(col => renderColCard(col, profile)).join('')}
    </div>
    ${file.issues && file.issues.length > 0 ? `
    <h3 style="color:var(--text-secondary);font-size:0.875rem;margin:1.5rem 0 1rem">Detected Issues (${file.issues.length})</h3>
    <div class="issues-list">
      ${file.issues.map(iss => `<div class="issue-chip">
        <span class="${iss.severity==='high'?'issue-icon-red':iss.severity==='medium'?'issue-icon-amber':'issue-icon-accent'}">${icon(iss.severity==='high'?'alertCircle':iss.severity==='medium'?'alertTriangle':'info')}</span>
        <div><span style="color:var(--text-primary);font-weight:500">${iss.col}</span> <span class="badge badge-surface badge-mono" style="margin-left:0.25rem">${iss.type}</span><br><span style="color:var(--text-secondary)">${iss.desc}</span></div>
      </div>`).join('')}
    </div>` : ''}
    <h3 style="color:var(--text-secondary);font-size:0.875rem;margin:1.5rem 0 1rem">Raw Data Preview</h3>
    <div class="raw-table-scroll heal-animation">
      <table><thead><tr>${file.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${file.data.slice(0,8).map((row,ri) => {
        const rowIssues = (file.issues||[]).filter(i => i.row === ri || (i.rows && i.rows.includes(ri)));
        return `<tr class="${rowIssues.length?'row-messy':''}">${row.map((cell,ci) => {
          const colName = file.headers[ci];
          const cellIssue = rowIssues.find(i => i.col === colName);
          const cls = cellIssue ? (cellIssue.severity==='high'?'cell-messy':'cell-warning') : (!cell ? 'cell-missing' : '');
          return `<td class="${cls}">${cell || '<em>—</em>'}</td>`;
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
    ${col.dist.length > 0 ? `<div style="margin-top:0.75rem"><div class="dist-bars">${col.dist.slice(0,3).map(d => `<div class="dist-bar-row"><div class="dist-bar-label" title="${d.value}">${d.value.length>12?d.value.slice(0,12)+'…':d.value}</div><div class="dist-bar-track"><div class="dist-bar-fill" style="width:${d.pct}%"></div></div><div class="dist-bar-count">${d.count}</div></div>`).join('')}</div></div>` : ''}
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
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateTo('workbench')">Proceed to Self-Healing ${icon('arrowRight')}</button>`)}
    </div>
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
        <button class="btn btn-primary" onclick="navigateTo('golden')">Generate Golden Records ${icon('arrowRight')}</button>
      `)}
    </div>
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
  const totalRawRows = Object.values(RAW_FILES).reduce((s,f)=>s+f.rows,0);
  const totalGoldenRows = totalRawRows < 100 ? records.length : Math.round(totalRawRows * 0.09);
  
  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Golden Dataset</h1><p class="page-subtitle">The finalized, harmonized catalog — clean, consistent, and reliable.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateTo('search')">Test Search Impact ${icon('arrowRight')}</button>`)}
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="stat-tile emerald"><div class="stat-label">Golden Records</div><div class="stat-value emerald">${totalGoldenRows.toLocaleString()}</div></div>
      <div class="stat-tile accent"><div class="stat-label">Source Records</div><div class="stat-value accent">${totalRawRows.toLocaleString()}</div></div>
      <div class="stat-tile purple"><div class="stat-label">Dedup Ratio</div><div class="stat-value" style="color:var(--purple)">${Math.round((1 - totalGoldenRows/totalRawRows)*100)}%</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Multi-Supplier</div><div class="stat-value cyan">${Math.round(totalGoldenRows * 0.85).toLocaleString()}</div></div>
    </div>
    <div class="grid-2-1">
      <div class="card"><div class="card-header"><div class="card-title card-title-lg">Master Catalog</div><div class="card-description">Deduplicated golden records with multi-region pricing</div></div>
        <div class="card-content no-padding"><div class="table-wrapper"><table><thead><tr><th>ID</th><th>Canonical Name</th><th>Target</th><th>Application</th><th>Suppliers</th><th></th></tr></thead><tbody>
        ${records.map(r => `<tr class="${state.selectedRecordId===r.id?'selected':''}" style="cursor:pointer" onclick="selectRecord('${r.id}')">
          <td class="td-mono">${r.id}</td><td class="td-primary">${r.canonical_name}</td><td>${r.target||'—'}</td><td><span class="badge badge-surface">${r.application}</span></td>
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
    .replace(/α|Î±/g, ' alpha ')
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
  return labels.slice(0, 3);
}

function buildRawSearchRecords() {
  const configs = [
    {
      key: 'supplier_feed_us_antibodies.csv',
      source: 'US Feed',
      nameFields: ['supplier_product_name'],
      skuField: 'supplier_sku',
      extraFields: ['target', 'application', 'description'],
      issueFields: ['supplier_product_name', 'supplier_sku', 'target', 'application', 'description'],
    },
    {
      key: 'supplier_feed_eu_reagents.csv',
      source: 'EU Feed',
      nameFields: ['product_title_local', 'product_title_english'],
      skuField: 'product_code',
      extraFields: ['product_title_english', 'zielprotein', 'anwendung', 'beschreibung'],
      issueFields: ['product_title_local', 'product_title_english', 'product_code', 'zielprotein', 'anwendung', 'beschreibung'],
    },
    {
      key: 'acquisition_catalog_nordic.csv',
      source: 'Nordic',
      nameFields: ['bezeichnung'],
      skuField: 'local_sku',
      extraFields: ['anvandning', 'free_text_spec', 'supplier_ref', 'kategori'],
      issueFields: ['bezeichnung', 'local_sku', 'anvandning', 'free_text_spec', 'supplier_ref', 'kategori'],
    },
  ];

  return configs.flatMap(config => {
    const file = RAW_FILES[config.key];
    if (!file) return [];

    return file.data.map((row, rowIndex) => {
      const name = config.nameFields.map(field => getFieldValue(file, row, field)).find(Boolean) || 'Unnamed record';
      const sku = getFieldValue(file, row, config.skuField) || 'N/A';
      const issues = collectSearchIssues(file, rowIndex, config.issueFields);
      const searchValues = [
        ...config.nameFields.map(field => getFieldValue(file, row, field)),
        getFieldValue(file, row, config.skuField),
        ...config.extraFields.map(field => getFieldValue(file, row, field)),
      ];

      return {
        source: config.source,
        name,
        sku,
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
    target: record.target || '—',
    application: record.application || '—',
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
    <div class="revenue-card" style="margin-bottom:1.5rem">
      <div class="revenue-stat"><div class="rev-value">€340K</div><div class="rev-label">Lost Pipeline / Year</div></div>
      <div class="revenue-divider"></div>
      <div class="revenue-stat"><div class="rev-value">20%</div><div class="rev-label">Zero-Result Rate</div></div>
      <div class="revenue-divider"></div>
      <div class="revenue-description">
        <strong>2 out of 10</strong> customer searches returned zero results due to unharmonized data. 
        Queries like <em>"anti il6 serum elisa"</em> and <em>"cluster of differentiation 20 antibody"</em> failed because synonyms weren't mapped.
        After harmonization: <strong>0% zero-result rate</strong>.
      </div>
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
  const allRows = fileKeys.reduce((s,k) => s + RAW_FILES[k].rows, 0);
  const allIssues = allRows > 1000 ? Math.round(allRows * 0.42) : fileKeys.reduce((s,k) => s + (RAW_FILES[k].issues||[]).length, 0);
  const highIssues = allRows > 1000 ? Math.round(allIssues * 0.38) : fileKeys.reduce((s,k) => s + (RAW_FILES[k].issues||[]).filter(i=>i.severity==='high').length, 0);
  const allProfiles = fileKeys.map(k => profileFile(k));
  const avgQ = Math.round(allProfiles.reduce((s,p) => s+p.avgQuality, 0) / allProfiles.length);
  const selected = state.selectedFileKey ? profileFile(state.selectedFileKey) : null;

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Raw Data Overview</h1><p class="page-subtitle">Explore raw datasets — every inconsistency, every gap, exposed.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" onclick="navigateTo('mapping')">Begin Canonicalization ${icon('arrowRight')}</button>`)}
    </div>
    <div class="stats-grid">
      <div class="stat-tile accent"><div class="stat-label">Source Files</div><div class="stat-value accent">${fileKeys.length}</div><div class="stat-delta">across 4 regions</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Total Records</div><div class="stat-value cyan">${allRows.toLocaleString()}</div><div class="stat-delta">from ${fileKeys.length} files</div></div>
      <div class="stat-tile red"><div class="stat-label">Issues Detected</div><div class="stat-value red">${allIssues.toLocaleString()}</div><div class="stat-delta negative">${highIssues.toLocaleString()} critical</div></div>
      <div class="stat-tile amber"><div class="stat-label">Avg Quality Score</div><div class="stat-value amber">${avgQ}%</div><div class="stat-delta negative">needs harmonization</div></div>
    </div>
    <div class="card" style="margin-bottom:2rem"><div class="card-header"><div class="card-header-row"><div><div class="card-title card-title-lg">Data Quality Heatmap</div><div class="card-description">Every cell represents one data point. Red = critical issue, Amber = warning, Green = clean, Dark = missing.</div></div><span class="badge badge-red" style="font-size:0.625rem">LIVE ANALYSIS</span></div></div><div class="card-content compact">${renderChaosHeatmap()}</div></div>
    <h2 style="color:var(--text-primary);margin-bottom:1rem;font-size:1.125rem">Source Files</h2>
    <div class="source-files-grid">
      ${fileKeys.map(key => {
        const f = RAW_FILES[key];
        const ext = f.type.toUpperCase();
        const p = allProfiles.find(ap => ap.key === key);
        return `<div class="source-file-card ${state.selectedFileKey === key ? 'selected' : ''}" onclick="selectFile('${key}')">
          <div class="source-file-icon ${f.type}">${ext}</div>
          <div class="source-file-name">${key}</div>
          <div class="source-file-meta"><span>${f.rows} rows</span><span>${f.headers.length} cols</span><span>${f.region}</span></div>
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
        <button class="btn btn-primary" onclick="navigateTo('golden')">Generate Golden Records ${icon('arrowRight')}</button>
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

document.addEventListener('DOMContentLoaded', () => { renderAll(); });
