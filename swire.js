// ============================================================
//  Repeat Order Intelligence — Scenario 3 Renderers (Beverage Distribution)
//  Loaded after app.js; overrides pages when activeDataset === 'swire'
// ============================================================

const SWIRE_RED = '#dc2626';

// ── Page intro / storyline / help overrides ───────────────
const _swirePrevPageIntro = renderPageIntro;
renderPageIntro = function() {
  if (state.activeDataset !== 'swire') return _swirePrevPageIntro();
  const intro = SWIRE_PAGE_INTROS[state.currentPage];
  if (!intro) return '';
  return `<div class="page-intro"><div class="page-intro-badge">${intro.title}</div><p>${intro.desc}</p></div>`;
};

const _swirePrevStoryline = renderStorylineCard;
renderStorylineCard = function() {
  if (state.activeDataset !== 'swire') return _swirePrevStoryline();
  const story = SWIRE_STORYLINES[state.currentPage];
  if (!story) return '';
  return `<div class="card storyline-card">
    <div class="card-header">
      <div class="card-title card-title-lg">How This Step Works</div>
      <div class="card-description">${story.intro}</div>
    </div>
    <div class="card-content"><div class="storyline-grid">
      ${story.steps.map(step => `<div class="storyline-step"><div class="storyline-step-label">${step.label}</div><p>${step.text}</p></div>`).join('')}
    </div></div>
  </div>`;
};

const _swirePrevHelpPanel = renderPageHelpPanel;
renderPageHelpPanel = function() {
  if (state.activeDataset !== 'swire') return _swirePrevHelpPanel();
  if (!state.pageHelpOpen) return '';
  const help = SWIRE_PAGE_HELP[state.currentPage];
  if (!help) return '';
  return `<div class="page-help-layer">
    <button type="button" class="page-help-backdrop" onclick="closePageHelp()" aria-label="Close page help"></button>
    <aside id="page-help-panel" class="page-help-panel" role="dialog" aria-modal="true" aria-labelledby="page-help-title">
      <div class="page-help-header">
        <div>
          <span class="badge badge-red">${icon('info','icon-sm')} Simple English guide</span>
          <h2 id="page-help-title">${help.title}</h2>
          <p>${help.summary}</p>
        </div>
        <button type="button" class="btn btn-outline page-help-close" onclick="closePageHelp()">Close</button>
      </div>
      <div class="page-help-sections">
        ${help.sections.map(section => `<section class="page-help-section"><h3>${section.title}</h3><ul>${section.items.map(item => `<li>${item}</li>`).join('')}</ul></section>`).join('')}
      </div>
    </aside>
  </div>`;
};

// ── Source domain flow strip (Stage 1) ────────────────────
function renderSwireSourceDomains() {
  const domains = [
    { label: 'Customer / Outlet', files: 'ERP outlet master · CRM outlet list', icon: 'database', issues: '13 issues' },
    { label: 'Order History', files: '120k order transactions', icon: 'fileText', issues: '6 issues' },
    { label: 'SKU / Inventory', files: 'SKU master · DC snapshots', icon: 'layers', issues: '10 issues' },
    { label: 'Route / Delivery', files: 'TMS plan · POD · territory · promo', icon: 'gitMerge', issues: '22 issues' },
  ];
  return `<div class="card" style="margin-bottom:1.5rem"><div class="card-content" style="padding:1.125rem 1.375rem">
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.875rem">
      <span style="color:${SWIRE_RED}">${icon('gitMerge','icon-sm')}</span>
      <span style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary)">Four Source Domains Feed the Tower</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr) auto;gap:0.625rem;align-items:stretch">
      ${domains.map(d => `<div style="background:rgba(220,38,38,0.04);border:1px solid rgba(220,38,38,0.16);border-radius:var(--radius);padding:0.75rem 0.875rem">
        <div style="display:flex;align-items:center;gap:0.4rem;color:${SWIRE_RED};margin-bottom:0.3rem">${icon(d.icon,'icon-xs')}<span style="font-size:0.75rem;font-weight:700;color:var(--text-primary)">${d.label}</span></div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);line-height:1.4">${d.files}</div>
        <div style="margin-top:0.375rem"><span class="badge badge-amber" style="font-size:0.5625rem">${d.issues}</span></div>
      </div>`).join('')}
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.25rem;padding:0 0.5rem">
        <span style="color:${SWIRE_RED}">${icon('arrowRight','icon-sm')}</span>
        <div style="font-size:0.625rem;font-weight:700;color:var(--text-secondary);text-align:center;line-height:1.3">Golden<br>Outlet-SKU<br>Dataset</div>
      </div>
    </div>
  </div></div>`;
}

// ── Data quality heatmap for Swire files ──────────────────
function renderSwireHeatmap() {
  const keys = Object.keys(SWIRE_FILES);
  return `<div style="display:flex;flex-direction:column;gap:0.375rem">
    ${keys.map(key => {
      const f = SWIRE_FILES[key];
      const cells = f.data.map((row, ri) => {
        const rowIssues = (f.issues||[]).filter(i => i.row === ri || (i.rows && i.rows.includes(ri)));
        const hasMissing = row.some(c => !c || String(c).trim() === '');
        const status = rowIssues.some(i => i.severity === 'high') ? 'critical'
          : rowIssues.length ? 'warning' : hasMissing ? 'missing' : 'clean';
        const color = status === 'critical' ? 'rgba(239,68,68,0.85)' : status === 'warning' ? 'rgba(245,158,11,0.8)' : status === 'missing' ? 'rgba(100,116,139,0.55)' : 'rgba(16,185,129,0.65)';
        return `<div title="${displaySwireFileName(key)} — row ${ri+1}: ${status}" onclick="selectFile('${key}')" style="cursor:pointer;width:14px;height:14px;border-radius:3px;background:${color};transition:transform 0.1s" onmouseenter="this.style.transform='scale(1.35)'" onmouseleave="this.style.transform=''"></div>`;
      }).join('');
      const highCnt = (f.issues||[]).filter(i => i.severity === 'high').length;
      return `<div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:200px;flex-shrink:0;font-size:0.6875rem;color:var(--text-secondary);font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer" onclick="selectFile('${key}')" title="${key}">${displaySwireFileName(key)}</div>
        <div style="display:flex;gap:3px;flex-wrap:wrap">${cells}</div>
        <div style="margin-left:auto;flex-shrink:0">${highCnt > 0 ? `<span class="badge badge-red" style="font-size:0.5625rem">${highCnt} critical</span>` : `<span class="badge badge-emerald" style="font-size:0.5625rem">clean</span>`}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function displaySwireFileName(key) {
  const acronyms = { erp: 'ERP', crm: 'CRM', tms: 'TMS', sku: 'SKU', pod: 'POD' };
  return key.replace(/\.(csv|xlsx)$/,'').replace(/^raw_/,'').split('_')
    .map(w => acronyms[w] || w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
}

// ── Stage 1 — Raw data page ───────────────────────────────
const _swirePrevRawPage = renderRawPage;
renderRawPage = function() {
  if (state.activeDataset !== 'swire') return _swirePrevRawPage();
  const files = SWIRE_FILES;
  const fileKeys = Object.keys(files);
  const loadedRows = getSwireSampleRowCount();
  const sourceRows = fileKeys.reduce((s,k) => s + files[k].rows, 0);
  const allIssues = getSwireIssueCount();
  const highIssues = getSwireCriticalCount();

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Raw Operational Data</h1><p class="page-subtitle">Nine files from the systems the bottler already runs — every duplicate outlet, mixed unit, and stale flag exposed.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" style="background:linear-gradient(135deg,${SWIRE_RED},#b91c1c)" onclick="navigateWithTransition('mapping','canonicalization')">Begin Canonicalization ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}
    <div class="stats-grid">
      <div class="stat-tile accent"><div class="stat-label">Source Files</div><div class="stat-value accent">${fileKeys.length}</div><div class="stat-delta">4 source domains, 6 DCs</div></div>
      <div class="stat-tile cyan"><div class="stat-label">Loaded Demo Records</div><div class="stat-value cyan">${loadedRows}</div><div class="stat-delta">representing ${sourceRows.toLocaleString()} source rows</div></div>
      <div class="stat-tile red"><div class="stat-label">Issues Detected</div><div class="stat-value red">${allIssues}</div><div class="stat-delta negative">${highIssues} critical</div></div>
      <div class="stat-tile amber"><div class="stat-label">Avg Quality Score</div><div class="stat-value amber">${SWIRE_IMPACT.quality_before}%</div><div class="stat-delta negative">outlet + SKU duplication drives it</div></div>
    </div>

    ${renderSwireSourceDomains()}

    <div style="background:rgba(220,38,38,0.05);border:1px solid rgba(220,38,38,0.22);border-radius:var(--radius-lg);padding:1.25rem 1.5rem;margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.625rem">
        <span style="color:${SWIRE_RED}">${icon('alertCircle','icon-sm')}</span>
        <span style="font-size:0.9375rem;font-weight:700;color:${SWIRE_RED}">Fragmentation Detected — Repeat-Order Patterns Are Invisible</span>
      </div>
      <p style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.6;margin-bottom:1rem">The same outlets and SKUs live under different IDs across ERP, CRM, TMS, and the promo file. Until they are matched, no system can tell what an outlet normally reorders — so reps rebuild every order by hand.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.625rem">
        ${[
          { name: 'Walmart Sandy UT', variants: ['Walmart #1482','Wal-Mart 1482','WM Supercenter 1482'], note: '2 ERP customer IDs + duplicate TMS stop', sev: 'red' },
          { name: 'Coca-Cola Zero Sugar 12pk', variants: ['KOZ12PK','KO-2044','CZ 12/12'], note: 'Legacy + new SKU, inventory split & negative', sev: 'red' },
          { name: 'Route R27', variants: ['R27','SLC-27','SaltLake_027'], note: '3 route IDs for one truck run', sev: 'amber' },
          { name: 'Delivery windows', variants: ['Morning','6-10','06:00 AM - 10:00 AM'], note: '5 formats + blanks in 2 systems', sev: 'amber' },
        ].map(c => `<div style="background:rgba(${c.sev==='red'?'239,68,68':'245,158,11'},0.07);border:1px solid rgba(${c.sev==='red'?'239,68,68':'245,158,11'},0.22);border-radius:var(--radius-sm);padding:0.75rem">
          <div style="font-size:0.75rem;font-weight:700;color:var(--${c.sev});margin-bottom:0.375rem">${c.name} — ${c.variants.length} variants</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.1875rem;margin-bottom:0.375rem">
            ${c.variants.map(v=>`<span style="font-size:0.5625rem;background:rgba(${c.sev==='red'?'239,68,68':'245,158,11'},0.1);border:1px solid rgba(${c.sev==='red'?'239,68,68':'245,158,11'},0.2);border-radius:3px;padding:0.125rem 0.3125rem;color:var(--${c.sev})">${v}</span>`).join('')}
          </div>
          <div style="font-size:0.6875rem;color:var(--text-tertiary)">${c.note}</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:2rem"><div class="card-header"><div class="card-header-row"><div><div class="card-title card-title-lg">Data Quality Heatmap</div><div class="card-description">Each cell is one loaded demo row. Red = critical issue, Amber = warning, Grey = missing values, Green = clean. Click a row to open the file.</div></div><span class="badge badge-red" style="font-size:0.625rem">LIVE ANALYSIS</span></div></div><div class="card-content compact">${renderSwireHeatmap()}</div></div>

    <h2 style="color:var(--text-primary);margin-bottom:1rem;font-size:1.125rem">Source Files</h2>
    <div class="source-files-grid">
      ${fileKeys.map(key => {
        const f = files[key];
        const iss = f.issues || [];
        const high = iss.filter(i=>i.severity==='high').length;
        const q = Math.max(55, 100 - high*9 - (iss.length-high)*4);
        return `<div class="source-file-card ${state.selectedFileKey===key?'selected':''}" onclick="selectFile('${key}')">
          <div class="source-file-icon ${f.type}">${f.type.toUpperCase()}</div>
          <div class="source-file-name">${displaySwireFileName(key)}</div>
          <div class="source-file-meta"><span>${f.data.length} loaded</span><span>${f.rows.toLocaleString()} source</span><span>${f.source}</span></div>
          <div style="margin-top:0.75rem">
            <div class="quality-bar"><div class="quality-bar-fill ${q>=80?'high':q>=65?'medium':'low'}" style="width:${q}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:0.6875rem">
              <span style="color:var(--text-tertiary)">Quality</span>
              <span style="color:${q>=80?'var(--emerald)':q>=65?'var(--amber)':'var(--red)'};font-weight:700">${q}%</span>
            </div>
          </div>
          ${high > 0 ? `<div style="margin-top:0.5rem"><span class="badge badge-red">${icon('alertCircle','icon-sm')} ${high} critical</span></div>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${state.selectedFileKey && files[state.selectedFileKey] ? renderSwireFileDetail(files[state.selectedFileKey], state.selectedFileKey) : `<div class="card" style="padding:3rem;text-align:center;color:var(--text-muted)"><p>Select a source file above to inspect every loaded row with problem cells highlighted.</p></div>`}
    ${renderPageHelpPanel()}
  </div>`;
};

function renderSwireFileDetail(file, key) {
  const fileIssues = file.issues || [];
  const highCnt = fileIssues.filter(i => i.severity === 'high').length;
  const medCnt = fileIssues.filter(i => i.severity === 'medium').length;
  return `<div style="animation:fadeInUp 0.3s ease-out;margin-top:1.5rem" id="file-issues-section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.125rem">
      <div>
        <h2 style="color:var(--text-primary);font-size:1.125rem;font-weight:700">${displaySwireFileName(key)}</h2>
        <p style="color:var(--text-tertiary);font-size:0.8125rem;margin-top:0.25rem">${file.description}</p>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <span class="badge badge-surface">${file.data.length} rows loaded</span>
        ${highCnt > 0 ? `<span class="badge badge-red">${highCnt} critical</span>` : ''}
        ${medCnt > 0 ? `<span class="badge badge-amber">${medCnt} warnings</span>` : ''}
      </div>
    </div>
    <div class="data-section-header">${icon('eye','icon-sm')} Data Preview — problem cells highlighted</div>
    <div class="raw-table-scroll heal-animation" id="swire-file-table" style="margin-bottom:1.25rem;max-height:340px;overflow:auto">
      <table><thead><tr>${file.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${file.data.map((row, ri) => {
        const rowIssues = fileIssues.filter(i => i.row === ri || (i.rows && i.rows.includes(ri)));
        return `<tr id="swire-row-${ri}" class="${rowIssues.length ? 'row-messy' : ''}">${row.map((cell, ci) => {
          const colName = file.headers[ci];
          const cellIssue = rowIssues.find(i => i.col === colName);
          const cls = cellIssue ? (cellIssue.severity === 'high' ? 'cell-messy' : 'cell-warning') : (!cell ? 'cell-missing' : '');
          return `<td class="${cls}" ${cellIssue ? `title="${cellIssue.desc.replace(/"/g,'&quot;')}"` : ''}>${cell || '<em>-</em>'}</td>`;
        }).join('')}</tr>`;
      }).join('')}</tbody></table>
    </div>
    <div class="data-section-header">${icon('alertCircle','icon-sm')} Data Issues (${fileIssues.length})</div>
    <div class="issues-list" style="margin-bottom:1rem">
      ${fileIssues.map(iss => {
        const firstRow = typeof iss.row === 'number' ? iss.row : (iss.rows && iss.rows.length ? iss.rows[0] : null);
        return `<div class="issue-chip ${firstRow !== null ? 'issue-chip-clickable' : ''}" ${firstRow !== null ? `onclick="swireScrollToRow(${firstRow})"` : ''} style="cursor:${firstRow !== null ? 'pointer' : 'default'}">
        <span class="${iss.severity==='high'?'issue-icon-red':iss.severity==='medium'?'issue-icon-amber':'issue-icon-accent'}">${icon(iss.severity==='high'?'alertCircle':iss.severity==='medium'?'alertTriangle':'info')}</span>
        <div style="flex:1"><span style="color:var(--text-primary);font-weight:500">${iss.col}</span> <span class="badge badge-surface badge-mono" style="margin-left:0.25rem">${iss.type}</span> <span class="badge ${iss.severity==='high'?'badge-red':iss.severity==='medium'?'badge-amber':'badge-accent'}" style="font-size:0.5625rem;margin-left:0.25rem">${iss.severity}</span><br><span style="color:var(--text-secondary);font-size:0.8125rem">${iss.desc}</span></div>
        ${firstRow !== null ? `<span style="flex-shrink:0;color:var(--text-muted);font-size:0.6875rem;align-self:center">row ${firstRow+1} ${icon('chevronRight','icon-sm')}</span>` : ''}
      </div>`;}).join('')}
    </div>
  </div>`;
}

function swireScrollToRow(ri) {
  const tbl = document.getElementById('swire-file-table');
  const row = document.getElementById(`swire-row-${ri}`);
  if (tbl && row) {
    tbl.scrollTop = Math.max(0, row.offsetTop - tbl.offsetTop - 60);
    row.style.transition = 'background 0.3s';
    const orig = row.style.background;
    row.style.background = 'rgba(220,38,38,0.12)';
    setTimeout(() => { row.style.background = orig; }, 1200);
  }
}

// ── Stage 3 — Merge cluster strip in the workbench ────────
function renderSwireMergeClusters() {
  const srcColors = { ERP:'rgba(220,38,38,0.75)', CRM:'rgba(5,150,105,0.75)', TMS:'rgba(8,145,178,0.78)', SKU:'rgba(99,102,241,0.75)', ORD:'rgba(245,158,11,0.8)', PRM:'rgba(168,85,247,0.75)' };
  return `<div class="swire-cluster-strip" style="margin-bottom:1.5rem">
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
      <span style="color:${SWIRE_RED}">${icon('gitMerge','icon-sm')}</span>
      <span style="font-size:0.9375rem;font-weight:700;color:var(--text-primary)">Deduplication &amp; Merge Queue</span>
      <span class="badge badge-red" style="font-size:0.5625rem">${SWIRE_MERGE_CLUSTERS.length} clusters</span>
      <span style="font-size:0.75rem;color:var(--text-tertiary);margin-left:0.25rem">Outlet and SKU records about to collapse into golden identities — click a cluster to open its exception.</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:0.75rem">
      ${SWIRE_MERGE_CLUSTERS.map(c => {
        const resolved = (state.issues || []).find(i => i.id === c.issueId && i.resolved);
        return `<div onclick="swireOpenCluster('${c.issueId}')" style="cursor:pointer;background:var(--bg-card);border:1px solid ${resolved ? 'rgba(16,185,129,0.35)' : 'var(--border-primary)'};border-radius:var(--radius-lg);padding:0.875rem 1rem;transition:transform 0.15s,box-shadow 0.15s" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-md)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
          <span class="badge ${c.kind==='Outlet'?'badge-red':'badge-accent'}" style="font-size:0.5rem">${c.kind}</span>
          <span style="font-size:0.8125rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-bottom:0.5rem">
          ${c.members.map(m => `<span style="display:inline-flex;align-items:center;gap:0.25rem;font-size:0.5625rem;border:1px solid var(--border-subtle);border-radius:3px;padding:0.125rem 0.3125rem;color:var(--text-secondary)"><span style="width:6px;height:6px;border-radius:50%;background:${srcColors[m.src]||'var(--text-muted)'}"></span>${m.id}</span>`).join('')}
        </div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);line-height:1.45;margin-bottom:0.5rem">${c.why}</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:0.6875rem;color:var(--text-tertiary)">→ <strong style="color:var(--text-secondary)">${c.golden}</strong></span>
          ${resolved ? `<span class="badge badge-emerald" style="font-size:0.5625rem">✓ Merged</span>` : `<span style="font-size:0.6875rem;font-weight:700;color:${c.confidence>=93?'var(--emerald)':'var(--amber)'}">${c.confidence}%</span>`}
        </div>
      </div>`;}).join('')}
    </div>
  </div>`;
}

function swireOpenCluster(issueId) {
  const issues = getActiveHarmonizationIssues();
  const iss = issues.find(i => i.id === issueId);
  if (iss) { state.activeIssueTab = iss.type; state.selectedIssueId = issueId; renderAll(); }
}

const _swirePrevWorkbench = renderWorkbenchPage;
renderWorkbenchPage = function() {
  const html = _swirePrevWorkbench();
  if (state.activeDataset !== 'swire') return html;
  return html.replace('<div class="workbench-layout">', renderSwireMergeClusters() + '<div class="workbench-layout">');
};

// ── Stage 4 — Golden Outlet-SKU records ───────────────────
const SWIRE_ACTION_STYLE = {
  'Auto-prefill':   { color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  'Sales review':   { color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  'Do not suggest': { color: 'var(--red)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  'Data fix needed':{ color: 'var(--text-secondary)', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
};

function renderSwireGoldenTable() {
  const q = state.goldenDashboardSearch.toLowerCase().trim();
  const records = SWIRE_GOLDEN_RECORDS.filter(r => !q ||
    r.canonical_name.toLowerCase().includes(q) || r.sku_name.toLowerCase().includes(q) ||
    r.brand.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) ||
    r.recommendation_action.toLowerCase().includes(q) || r.route_id.toLowerCase().includes(q));
  if (!records.length) return `<div class="empty-state" style="padding:2.5rem 0"><p>No golden records match "${state.goldenDashboardSearch}".</p></div>`;
  return `<div class="table-wrapper"><table><thead><tr><th>ID</th><th>Outlet × SKU</th><th>Channel</th><th>Avg / 8wk</th><th>Suggested Next</th><th>Confidence</th><th>Action</th><th>Route / DC</th><th></th></tr></thead><tbody>
    ${records.map(r => {
      const a = SWIRE_ACTION_STYLE[r.recommendation_action] || SWIRE_ACTION_STYLE['Sales review'];
      const confColor = r.repeat_order_confidence >= 90 ? 'var(--emerald)' : r.repeat_order_confidence >= 70 ? 'var(--amber)' : 'var(--red)';
      return `<tr class="${state.selectedRecordId===r.id?'selected':''}" style="cursor:pointer" onclick="selectRecord('${r.id}')">
        <td class="td-mono">${r.id}</td>
        <td class="td-primary">${r.canonical_name}<br><span style="font-size:0.6875rem;color:var(--text-tertiary)">${r.sku_name}</span></td>
        <td><span class="badge badge-surface">${r.channel}</span></td>
        <td><strong style="color:var(--text-primary)">${r.avg_qty_cases_8w} cs</strong><br><span style="font-size:0.625rem;color:var(--text-tertiary)">${r.order_frequency}</span></td>
        <td>${r.suggested_next_qty_cases > 0 ? `<strong style="color:var(--emerald)">${r.suggested_next_qty_cases} cs</strong><br><span style="font-size:0.625rem;color:var(--text-tertiary)">${r.next_delivery}</span>` : `<span style="color:var(--text-muted)">—</span>`}</td>
        <td><div style="display:flex;align-items:center;gap:0.4rem"><div class="progress-bar" style="width:44px"><div class="progress-bar-fill" style="width:${r.repeat_order_confidence}%;background:${confColor}"></div></div><span style="font-size:0.75rem;font-weight:700;color:${confColor}">${r.repeat_order_confidence}</span></div></td>
        <td><span style="display:inline-block;font-size:0.625rem;font-weight:700;color:${a.color};background:${a.bg};border:1px solid ${a.border};border-radius:999px;padding:0.2rem 0.55rem;white-space:nowrap">${r.recommendation_action}</span></td>
        <td><span style="font-size:0.75rem;color:var(--text-secondary)">${r.route_id}</span><br><span style="font-size:0.625rem;color:var(--text-tertiary)">${r.dc.replace(' Distribution Center',' DC')}</span></td>
        <td><span style="color:var(--text-muted);display:inline-block;transition:transform 0.15s;${state.selectedRecordId===r.id?'transform:rotate(90deg)':''}">${icon('chevronRight')}</span></td>
      </tr>`;
    }).join('')}
  </tbody></table></div>`;
}

function startSwirePush() {
  if (state.swirePushState === 'pushing') return;
  state.swirePushState = 'pushing';
  showToast(`Publishing ${getSwireGoldenRecordCount()} golden Outlet-SKU records to the rep ordering app…`);
  setTimeout(() => {
    state.swirePushState = 'done';
    showToast(`✓ Published — ${SWIRE_IMPACT.auto_prefill_candidates.toLocaleString()} auto-prefill candidates live · ${SWIRE_IMPACT.sales_review_needed.toLocaleString()} queued for sales review`);
    renderAll();
  }, 2200);
}

const _swirePrevGolden = renderGoldenPage;
renderGoldenPage = function() {
  if (state.activeDataset !== 'swire') return _swirePrevGolden();
  const records = SWIRE_GOLDEN_RECORDS;
  const sel = records.find(r => r.id === state.selectedRecordId);
  const actions = ['Auto-prefill','Sales review','Do not suggest','Data fix needed'];
  const counts = Object.fromEntries(actions.map(a => [a, records.filter(r => r.recommendation_action === a).length]));

  const pushBanner = state.swirePushState === 'done'
    ? `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-lg);padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:0.875rem"><span style="font-size:1.5rem">✓</span>
          <div><div style="font-weight:700;color:var(--emerald)">Published to Rep Ordering App</div>
          <div style="font-size:0.8125rem;color:var(--text-secondary)">${SWIRE_IMPACT.auto_prefill_candidates.toLocaleString()} auto-prefill candidates live · ${SWIRE_IMPACT.sales_review_needed.toLocaleString()} in the sales review queue · ${SWIRE_IMPACT.data_fix_needed.toLocaleString()} sent to data stewardship</div></div>
        </div><span class="badge badge-emerald">Published just now</span>
      </div>`
    : `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:space-between">
        <div><div style="font-weight:600;color:var(--text-primary);margin-bottom:0.25rem">Golden Outlet-SKU dataset ready to publish</div>
        <div style="font-size:0.8125rem;color:var(--text-secondary)">Push repeat-order recommendations to the rep ordering app — reps see prefilled orders with confidence and lineage, and keep final control</div></div>
        <button class="btn btn-primary" style="flex-shrink:0;background:linear-gradient(135deg,${SWIRE_RED},#b91c1c);white-space:nowrap" onclick="startSwirePush()">${icon('zap')} Publish to Rep App</button>
      </div>`;

  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Golden Outlet-SKU Records</h1><p class="page-subtitle">One trusted repeat-order row per outlet and SKU — quantity, cadence, confidence, action, and full lineage.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" style="background:linear-gradient(135deg,${SWIRE_RED},#b91c1c)" onclick="navigateWithTransition('search','search-impact')">See Business Impact ${icon('arrowRight')}</button>`)}
    </div>
    ${renderStorylineCard()}

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.875rem;margin-bottom:1.5rem">
      <div style="background:linear-gradient(135deg,rgba(220,38,38,0.1),rgba(220,38,38,0.03));border:1px solid rgba(220,38,38,0.28);border-radius:var(--radius-lg);padding:1.375rem;text-align:center">
        <div style="font-size:2rem;font-weight:900;color:${SWIRE_RED};letter-spacing:-0.02em">${SWIRE_IMPACT.raw_outlets.toLocaleString()} → ${SWIRE_IMPACT.golden_outlets.toLocaleString()}</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Raw Records → Golden Outlets</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.25rem">${SWIRE_IMPACT.duplicate_reduction_pct}% duplicate reduction</div>
      </div>
      <div style="background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(99,102,241,0.03));border:1px solid rgba(99,102,241,0.3);border-radius:var(--radius-lg);padding:1.375rem;text-align:center">
        <div style="font-size:2rem;font-weight:900;color:var(--accent);letter-spacing:-0.02em">${(SWIRE_IMPACT.repeat_patterns/1000).toFixed(1)}K</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Stable Outlet × SKU Patterns</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.25rem">distilled from ${(SWIRE_IMPACT.order_rows/1000).toFixed(0)}K order rows</div>
      </div>
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04));border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-lg);padding:1.375rem;text-align:center">
        <div style="font-size:2rem;font-weight:900;color:var(--emerald);letter-spacing:-0.02em">${SWIRE_IMPACT.auto_prefill_pct}%</div>
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-primary);margin-top:0.25rem">Safe to Auto-Prefill</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary);margin-top:0.25rem">${SWIRE_IMPACT.sales_review_pct}% sales review · ${SWIRE_IMPACT.do_not_suggest_pct}% held back</div>
      </div>
    </div>

    <div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1.125rem 1.375rem;margin-bottom:1.5rem">
      <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary);margin-bottom:0.875rem">Recommended Action Mix — Loaded Golden Records</div>
      <div style="display:flex;flex-direction:column;gap:0.625rem">
        ${actions.map(a => {
          const s = SWIRE_ACTION_STYLE[a];
          const cnt = counts[a];
          const pct = Math.round((cnt / records.length) * 100);
          return `<div style="display:flex;align-items:center;gap:0.875rem">
            <div style="width:130px;font-size:0.75rem;color:var(--text-secondary);text-align:right;flex-shrink:0">${a}</div>
            <div style="flex:1;height:16px;background:var(--surface-muted);border-radius:3px;overflow:hidden"><div style="height:100%;background:${s.color};opacity:0.75;border-radius:3px;width:${pct}%;transition:width 0.9s ease-out"></div></div>
            <div style="width:110px;font-size:0.75rem;font-weight:700;color:${s.color}">${cnt} record${cnt!==1?'s':''} · ${pct}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${pushBanner}

    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header">
        <div class="card-header-row">
          <div class="card-title card-title-lg">Repeat-Order Intelligence Table</div>
          <div style="position:relative;width:220px">
            <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text-muted)">${icon('search','icon-sm')}</span>
            <input type="text" value="${state.goldenDashboardSearch}" oninput="setGoldenSearch(this.value)" placeholder="Search outlet, SKU, action…" style="width:100%;padding:0.375rem 0.75rem 0.375rem 2rem;font-size:0.8125rem;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);outline:none;font-family:var(--font-sans)" />
          </div>
        </div>
        <div class="card-description">Golden Outlet × SKU rows with typical quantity, next suggested order, and the recommended action</div>
      </div>
      <div class="card-content no-padding" id="golden-search-results">${renderSwireGoldenTable()}</div>
    </div>

    <div class="card"><div class="card-header"><div class="card-title card-title-lg" style="display:flex;align-items:center;gap:0.5rem"><span style="color:${SWIRE_RED}">${icon('gitCommit','icon-lg')}</span> Lineage Trace</div><div class="card-description">${sel ? `Provenance of ${sel.canonical_name} × ${sel.sku_name}` : 'Select a record to trace it back to ERP, CRM, TMS, inventory, and POD'}</div></div>
      <div class="card-content">
        ${sel ? `<div style="animation:fadeInRight 0.25s ease-out">
          <div style="margin-bottom:1.25rem;display:flex;flex-wrap:wrap;align-items:flex-start;gap:1.5rem">
            <div style="flex:1;min-width:260px">
              <h3 style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:0.375rem">${sel.canonical_name} × ${sel.sku_name}</h3>
              <div style="display:flex;flex-wrap:wrap;gap:0.375rem;margin-bottom:0.75rem">
                <span class="badge badge-emerald">${icon('shield','icon-sm')} Golden Record</span>
                <span class="badge badge-surface badge-mono">${sel.id}</span>
                <span class="badge badge-surface">${sel.outlet_id} · ${sel.sku_id}</span>
                <span class="badge badge-amber">match ${sel.match_confidence}%</span>
              </div>
              ${sel.source_variants && sel.source_variants.length ? `<div><div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:0.375rem">Source Variants Unified</div>
              <div style="display:flex;flex-wrap:wrap;gap:0.25rem">${sel.source_variants.map(v=>`<span class="sample-tag" style="color:var(--red);border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.05)">${v}</span>`).join('')}</div>
              <div style="margin-top:0.375rem;font-size:0.75rem;color:var(--emerald)">↓ All resolve to: <strong>${sel.canonical_name} × ${sel.sku_name}</strong></div></div>` : ''}
              <div style="margin-top:0.875rem;background:rgba(220,38,38,0.04);border:1px solid rgba(220,38,38,0.14);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.8125rem;color:var(--text-secondary);line-height:1.55"><strong style="color:var(--text-primary)">Why this action:</strong> ${sel.reason}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;min-width:230px">
              <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-sm);padding:0.75rem;text-align:center">
                <div style="font-size:1.25rem;font-weight:800;color:var(--emerald)">${sel.suggested_next_qty_cases > 0 ? sel.suggested_next_qty_cases + ' cs' : 'Hold'}</div>
                <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary)">Suggested Next</div>
              </div>
              <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:var(--radius-sm);padding:0.75rem;text-align:center">
                <div style="font-size:1.25rem;font-weight:800;color:var(--amber)">${sel.repeat_order_confidence}%</div>
                <div style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary)">Repeat Confidence</div>
              </div>
              <div style="grid-column:1/-1;background:var(--surface-muted);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:0.75rem;font-size:0.6875rem;color:var(--text-secondary);line-height:1.6">
                <div><strong>Route:</strong> ${sel.route_id} · ${sel.dc}</div>
                <div><strong>Delivery:</strong> ${sel.delivery_day} · ${sel.delivery_window}</div>
                <div><strong>Rep:</strong> ${sel.sales_rep}</div>
                <div><strong>Inventory:</strong> ${sel.inventory_status}</div>
              </div>
            </div>
          </div>
          <div class="lineage-timeline">${sel._lineage.map(t => `<div class="lineage-item"><span class="lineage-dot lineage-dot-indigo"></span><div class="lineage-source"><span class="source-name">${t.source}</span><span class="source-id">${t.id}</span></div><p class="lineage-reasoning">${t.note}</p></div>`).join('')}
            <div class="lineage-item"><span class="lineage-dot lineage-dot-emerald"></span><div class="lineage-resolution"><h4>${icon('fileCheck')} Final Resolution</h4><p>Merged ${sel._lineage.length} source threads into one golden Outlet-SKU record — action: <strong>${sel.recommendation_action}</strong>.</p></div></div>
          </div>
        </div>` : `<div class="empty-state" style="padding:2rem 0"><div class="empty-state-icon">${icon('search','icon-2xl')}</div><p>Select a record to view lineage</p></div>`}
      </div>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
};

const _swirePrevGoldenTable = renderGoldenTable;
renderGoldenTable = function() {
  if (state.activeDataset !== 'swire') return _swirePrevGoldenTable();
  return renderSwireGoldenTable();
};

// ── Stage 5 — Search / business impact ────────────────────
function setSwireSearchQuery(q) {
  state.searchQuery = q;
  const el = document.getElementById('swire-search-results');
  if (el) el.innerHTML = renderSwireSplitResults(q.toLowerCase().trim());
  else renderAll();
}

function renderSwireSplitResults(q) {
  const key = Object.keys(SWIRE_SEARCH_DATA).find(k => q.includes(k) || k.includes(q)) || (q ? null : 'walmart');
  const hit = key ? SWIRE_SEARCH_DATA[key] : null;
  if (!hit) return `<div class="card"><div class="card-content"><div class="empty-state" style="padding:2rem 0"><div class="empty-state-icon">${icon('search','icon-2xl')}</div><p>No hero example matches "${q}". Try walmart, maverik, smiths, coke zero, sprite, or dasani.</p></div></div></div>`;
  const goldens = hit.goldenIds.map(id => SWIRE_GOLDEN_RECORDS.find(r => r.id === id)).filter(Boolean);
  return `<div style="background:rgba(220,38,38,0.05);border:1px solid rgba(220,38,38,0.18);border-radius:var(--radius);padding:0.75rem 1.125rem;margin-bottom:1rem;font-size:0.8125rem;color:var(--text-secondary)"><strong style="color:${SWIRE_RED}">${hit.headline}</strong></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;align-items:start">
    <div class="card">
      <div class="card-header"><div class="card-header-row"><div class="card-title" style="display:flex;align-items:center;gap:0.5rem"><span class="dot dot-red"></span> Before — Raw Systems</div><span class="badge badge-red" style="font-size:0.5625rem">${hit.raw.length} fragments</span></div><div class="card-description">What a rep or analyst finds today, spread across systems</div></div>
      <div class="card-content" style="display:flex;flex-direction:column;gap:0.625rem">
        ${hit.raw.map(r => `<div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-sm);padding:0.75rem 0.875rem">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">
            <span class="badge badge-surface" style="font-size:0.5625rem">${r.source}</span>
            <span class="badge badge-surface badge-mono" style="font-size:0.5625rem">${r.id}</span>
          </div>
          <div style="font-size:0.8125rem;font-weight:600;color:var(--text-primary)">${r.name}</div>
          ${r.issues.length ? `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.375rem">${r.issues.map(i=>`<span style="font-size:0.5625rem;color:var(--red);background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);border-radius:3px;padding:0.125rem 0.375rem">${i}</span>`).join('')}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-header-row"><div class="card-title" style="display:flex;align-items:center;gap:0.5rem"><span class="dot dot-green"></span> After — Golden Outlet-SKU</div><span class="badge badge-emerald" style="font-size:0.5625rem">${goldens.length} golden record${goldens.length!==1?'s':''}</span></div><div class="card-description">One identity, one recommendation, full lineage</div></div>
      <div class="card-content" style="display:flex;flex-direction:column;gap:0.75rem">
        ${goldens.map(g => {
          const a = SWIRE_ACTION_STYLE[g.recommendation_action];
          return `<div style="background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius);padding:0.875rem 1rem">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.375rem">
            <div style="font-size:0.875rem;font-weight:700;color:var(--text-primary)">${g.canonical_name}</div>
            <span style="display:inline-block;font-size:0.5625rem;font-weight:700;color:${a.color};background:${a.bg};border:1px solid ${a.border};border-radius:999px;padding:0.15rem 0.5rem;white-space:nowrap">${g.recommendation_action}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem">${g.sku_name}</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.375rem;margin-bottom:0.5rem">
            ${[
              { v: g.suggested_next_qty_cases > 0 ? g.suggested_next_qty_cases + ' cs' : 'Hold', l: 'Next Order' },
              { v: g.repeat_order_confidence + '%', l: 'Confidence' },
              { v: g.route_id, l: 'Route' },
              { v: g.delivery_day.split(' / ')[0], l: 'Day' },
            ].map(m => `<div style="text-align:center;background:var(--surface-muted);border-radius:var(--radius-sm);padding:0.375rem 0.25rem"><div style="font-size:0.8125rem;font-weight:800;color:var(--text-primary)">${m.v}</div><div style="font-size:0.5rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary)">${m.l}</div></div>`).join('')}
          </div>
          <div style="font-size:0.6875rem;color:var(--text-tertiary);line-height:1.5">${g.reason}</div>
          <button class="btn btn-outline" style="margin-top:0.55rem;font-size:0.6875rem;padding:0.3rem 0.75rem" onclick="swireViewLineage('${g.id}')">${icon('gitCommit','icon-sm')} View lineage</button>
        </div>`;}).join('')}
      </div>
    </div>
  </div>`;
}

function swireViewLineage(id) {
  state.selectedRecordId = id;
  state.currentPage = 'golden';
  renderAll();
  setTimeout(() => { const el = document.querySelector('.lineage-timeline'); if (el) el.scrollIntoView({ behavior:'smooth', block:'center' }); }, 150);
}

const _swirePrevSearchPage = renderSearchPage;
renderSearchPage = function() {
  if (state.activeDataset !== 'swire') return _swirePrevSearchPage();
  const q = state.searchQuery || 'walmart';
  const suggestions = ['walmart','maverik','smiths','coke zero','sprite','dasani'];
  const I = SWIRE_IMPACT;
  const tiles = [
    { v: `${I.raw_outlets.toLocaleString()} → ${I.golden_outlets.toLocaleString()}`, l: 'Outlet Records Deduplicated', s: `${I.duplicate_reduction_pct}% duplicate reduction`, c: SWIRE_RED },
    { v: `${I.matched_orders_before_pct}% → ${I.matched_orders_after_pct}%`, l: 'Orders Matched to a Golden Outlet', s: 'sold-to orphans + POD gaps resolved', c: 'var(--emerald)' },
    { v: `${(I.repeat_patterns/1000).toFixed(1)}K`, l: 'Repeat-Order Patterns Found', s: `from ${(I.order_rows/1000).toFixed(0)}K raw order rows`, c: 'var(--accent)' },
    { v: `${I.rep_hours_saved_weekly} hrs`, l: 'Rep Time Saved / Week', s: 'no more rebuilding standing orders', c: 'var(--amber)' },
  ];
  return `<div class="page active">
    ${renderPageIntro()}
    <div class="page-header">
      <div><h1>Repeat-Order Impact</h1><p class="page-subtitle">The same search, before and after the golden Outlet-SKU dataset — plus the portfolio-level business math.</p></div>
      ${renderPageHeaderActions(`<button class="btn btn-primary" style="background:linear-gradient(135deg,${SWIRE_RED},#b91c1c)" onclick="startSwirePush()">${icon('zap')} Publish to Rep App</button>`)}
    </div>
    ${renderStorylineCard()}

    <div class="swire-impact-tiles" style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.875rem;margin-bottom:1rem">
      ${tiles.map(t => `<div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1.125rem;text-align:center">
        <div style="font-size:1.375rem;font-weight:900;color:${t.c};letter-spacing:-0.02em;white-space:nowrap">${t.v}</div>
        <div style="font-size:0.6875rem;font-weight:700;color:var(--text-primary);margin-top:0.3rem">${t.l}</div>
        <div style="font-size:0.625rem;color:var(--text-tertiary);margin-top:0.15rem">${t.s}</div>
      </div>`).join('')}
    </div>

    <div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:1.125rem 1.375rem;margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <div style="font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-tertiary)">Portfolio Action Split — ${(I.repeat_patterns/1000).toFixed(1)}K Outlet × SKU Patterns</div>
        <div style="font-size:0.6875rem;color:var(--text-tertiary)">Reps keep control: automation only where the pattern is stable</div>
      </div>
      <div style="display:flex;height:26px;border-radius:6px;overflow:hidden;margin-bottom:0.5rem">
        <div style="width:${I.auto_prefill_pct}%;background:var(--emerald);opacity:0.85" title="Auto-prefill ${I.auto_prefill_pct}%"></div>
        <div style="width:${I.sales_review_pct}%;background:var(--amber);opacity:0.85" title="Sales review ${I.sales_review_pct}%"></div>
        <div style="width:${I.do_not_suggest_pct}%;background:var(--red);opacity:0.7" title="Do not suggest ${I.do_not_suggest_pct}%"></div>
      </div>
      <div style="display:flex;gap:1.25rem;flex-wrap:wrap;font-size:0.75rem;color:var(--text-secondary)">
        <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--emerald);margin-right:0.3rem"></span><strong>${I.auto_prefill_pct}% Auto-prefill</strong> — ${I.auto_prefill_candidates.toLocaleString()} pairs, stable weekly patterns</span>
        <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--amber);margin-right:0.3rem"></span><strong>${I.sales_review_pct}% Sales review</strong> — ${I.sales_review_needed.toLocaleString()} pairs with inferred fields or moderate variability</span>
        <span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--red);margin-right:0.3rem"></span><strong>${I.do_not_suggest_pct}% Held back</strong> — irregular demand, promo-sensitive, or data gaps (${I.data_fix_needed.toLocaleString()} need a data fix)</span>
      </div>
    </div>

    <div class="card" style="margin-bottom:1.5rem"><div class="card-content">
      <div style="position:relative;margin-bottom:0.75rem">
        <span style="position:absolute;left:0.875rem;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none">${icon('search')}</span>
        <input id="swire-search-input" type="text" value="${q}" oninput="setSwireSearchQuery(this.value)"
          placeholder="Search outlets or SKUs — try 'walmart', 'coke zero', 'sprite'…"
          style="width:100%;padding:0.75rem 1rem 0.75rem 2.5rem;font-size:0.9375rem;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);outline:none;font-family:var(--font-sans)"/>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
        <span style="font-size:0.75rem;color:var(--text-tertiary)">Hero examples:</span>
        ${suggestions.map(s=>`<button style="cursor:pointer;background:transparent;border:1px solid var(--border-subtle);color:var(--text-secondary);border-radius:var(--radius-sm);padding:0.2rem 0.625rem;font-size:0.75rem;font-family:var(--font-sans)" onclick="setSwireSearchQuery('${s}')">"${s}"</button>`).join('')}
      </div>
    </div></div>

    <div id="swire-search-results">${renderSwireSplitResults(q.toLowerCase().trim())}</div>

    <div style="margin-top:1.5rem;background:linear-gradient(135deg,rgba(220,38,38,0.06),rgba(220,38,38,0.02));border:1px solid rgba(220,38,38,0.2);border-radius:var(--radius-lg);padding:1.25rem 1.5rem">
      <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.5rem"><span style="color:${SWIRE_RED}">${icon('sparkles','icon-sm')}</span><span style="font-size:0.9375rem;font-weight:700;color:var(--text-primary)">The takeaway</span></div>
      <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.65;margin:0">No WMS or platform transformation required. Connecting the customer, order, SKU, route, and inventory data the bottler already has — and resolving the messy joins with human-approved matching — produces a golden Outlet-SKU dataset that automates repeat ordering where it is safe, targets sales attention where it is needed, and makes fill-rate and OTIF metrics explainable end to end.</p>
    </div>
    ${renderPageHelpPanel()}
  </div>`;
};
