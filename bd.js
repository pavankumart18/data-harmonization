// ============================================================
//  Installed Base & Receivables - Scenario 4
//  Loaded last. Everything on screen comes from a pipeline run
//  (pipeline/bd_pipeline.py): public/bd/<run_id>/*.json over HTTP,
//  or the bundled copy in bd_data.js when no server is available.
//  Pages: Sources -> Map -> Review -> Golden -> Impact
// ============================================================

const BD_OUTPUTS = ['source_profiles', 'source_rows', 'dq_rules', 'dq_findings', 'canonical_schema', 'mapping_proposals',
  'match_candidates', 'relationships', 'er_graph', 'execution_log', 'review_queue', 'review_decisions', 'golden_entities',
  'golden_lineage', 'ar_exposure', 'executive_summary'];
const BD_STEPS = [
  { page: 'raw', label: 'Sources', icon: 'database' },
  { page: 'mapping', label: 'Map', icon: 'layers' },
  { page: 'workbench', label: 'Review', icon: 'checkSquare' },
  { page: 'golden', label: 'Golden', icon: 'shield' },
  { page: 'search', label: 'Impact', icon: 'barChart' },
];
const BD_QUEUES = [
  { id: 'normalization', label: 'Normalization' },
  { id: 'identity', label: 'Identity matching' },
  { id: 'relationship', label: 'Relationship reconciliation' },
  { id: 'unresolved', label: 'Unresolved fields' },
];
const BD_POSITIVE = ['Accept standard form', 'Edit', 'Same entity', 'Approve edge', 'Pick alternative', 'Confirm value'];
const BD_NEGATIVE = ['Reject', 'Different entities'];
const BD_LABEL = 'Illustrative BD-style demo data';

const bd = {
  data: null, status: 'idle', source: null, sourceNote: '', error: '',
  decisions: {}, log: [], mapState: {}, applied: false,
};

function bdResetUi() {
  Object.assign(bd, {
    srcSel: null, srcTab: 'profile', rowQuery: '', ruleFilter: null, showAllRows: false,
    mapSel: null, mapEdit: null, erOpen: false, erSel: null, erView: { x: 0, y: 0, k: 1 }, sqlOpen: false, sqlSel: null,
    applying: false, applyStep: -1,
    queue: 'identity', reviewSel: null, reviewQuery: '', reviewSev: 'all', reviewStatus: 'all', reviewRules: null, editValue: null, showAllRowsReview: false,
    goldenSel: 'GF-001', goldenTab: 'crosswalk', goldenAsset: null,
    impactCat: null, impactFac: null, impactInv: null,
    full: {}, chainSel: null, caseOpen: null, storyAsset: null, storyEvent: null, exploreAr: false, cdeSel: null, cdeAll: false, cdeHow: false, support: false,
  });
}
bdResetUi();

// ── helpers ────────────────────────────────────────────────
function bdEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function bdJs(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function bdUsd(v) { return '$' + Math.round(v || 0).toLocaleString('en-US'); }
function bdUsdK(v) { return v >= 1000 ? '$' + (v / 1000).toFixed(v >= 100000 ? 0 : 1) + 'K' : bdUsd(v); }
function bdPct(v) { return v == null ? 'n/a' : Math.round(v * 100) + '%'; }
function bdSrc(code) { return (bd.data && bd.data.source_profiles.sources.find(s => s.code === code)) || { label: code, code }; }
function bdRow(rid) { if (!bd.data) return null; const code = rid.split(':')[0]; return (bd.rowIndex[code] || {})[rid] || null; }
function bdItem(id) { return bd.rqIndex ? bd.rqIndex[id] : null; }
function bdFac(gid) { return bd.data ? bd.data.golden_entities.facilities.find(f => f.golden_id === gid) : null; }
function bdFacName(gid) { const f = bdFac(gid); return f ? f.display_name : (gid || 'unknown'); }
function bdShort(name) { return String(name || '').replace(/^Ascension St\. Vincent /, 'St. Vincent ').replace(' - Main Campus', ''); }
function bdSev(s) { return `<span class="sev ${bdEsc(s)}">${bdEsc(s)}</span>`; }
function bdConf(c) { const cls = c >= 0.9 ? '' : c >= 0.6 ? 'warn' : 'bad'; return `<span class="bd-conf"><span class="bd-fill ${cls}"><i style="width:${Math.round(c * 100)}%"></i></span>${Math.round(c * 100)}%</span>`; }
function bdRagBar(label, q) {
  if (!q) return '';
  const st = q.status === 'n/a' ? 'na' : q.status;
  let txt, w;
  if (label === 'Linkability') { txt = `${q.linked}/${q.eligible}`; w = q.rate == null ? 0 : q.rate * 100; }
  else if (q.status === 'n/a') { txt = 'no rules'; w = 100; }
  else { txt = `${q.eligible - q.failing}/${q.eligible}`; w = q.eligible ? (q.eligible - q.failing) / q.eligible * 100 : 100; }
  return `<div class="rag-bar" title="${label}: ${q.status}${q.basis ? ' - ' + bdEsc(q.basis) : ''}">${label} <b>${txt}</b><div class="t"><div class="f ${st}" style="width:${Math.max(w, 4)}%"></div></div></div>`;
}
function bdFmtVal(v) {
  if (v == null || v === '') return '<span class="bd-cell-blank">blank</span>';
  if (Array.isArray(v)) return v.length ? `<ul class="bd-evidence">${v.map(x => `<li>${bdFmtVal(x)}</li>`).join('')}</ul>` : '<span class="bd-cell-blank">none</span>';
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `<div><span class="bd-note">${bdEsc(k.replace(/_/g, ' '))}:</span> ${bdEsc(x == null ? 'blank' : x)}</div>`).join('');
  return bdEsc(v);
}
function bdHighlightSql(sql) {
  return bdEsc(sql).split('\n').map(line => {
    if (/^\s*--/.test(line)) return `<span class="cm">${line}</span>`;
    return line.replace(/'[^']*'/g, m => `<span class="st">${m}</span>`)
      .replace(/\b(SELECT|FROM|LEFT JOIN|JOIN|ON|WHERE|AND|OR|AS|WITH|UNION ALL|CASE|WHEN|THEN|ELSE|END|GROUP BY|ORDER BY|IS NOT NULL|IS NULL|NOT|BETWEEN|IN|DISTINCT|coalesce|count|min|string_agg|bool_or|TRY_CAST|ILIKE|date_diff|getvariable|replace|split_part|upper|trim|substr|strpos|lower)\b/g, '<span class="kw">$1</span>');
  }).join('\n');
}
function bdDownload(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function bdDistinctAr(items) {
  const ids = new Set(); items.forEach(x => (x.downstream.open_invoices || []).forEach(i => ids.add(i)));
  return bd.data.ar_exposure.invoices.filter(i => ids.has(i.invoice)).reduce((s, i) => s + i.open_usd, 0);
}
function bdToast(msg) { if (typeof showToast === 'function') showToast(msg); }

// ── loading + validation (manifest blocks mismatched generations) ──
function bdValidate(files) {
  const m = files && files.manifest;
  if (!m) return 'manifest missing';
  if (String(m.schema_version || '').split('.')[0] !== '1') return `unsupported schema ${m.schema_version}`;
  for (const k of BD_OUTPUTS) {
    const f = files[k];
    if (!f) return `${k}.json missing`;
    if (f.run_id !== m.run_id || f.input_hash !== m.input_hash || f.schema_version !== m.schema_version) return `${k}.json is from run ${f.run_id}, manifest is ${m.run_id}`;
  }
  const checks = [
    [Array.isArray(files.source_profiles.sources) && files.source_profiles.sources.length === 10, 'source_profiles: expected 10 sources'],
    [files.source_rows.sources && Object.keys(files.source_rows.sources).length === 10, 'source_rows: expected 10 files'],
    [Array.isArray(files.review_queue.items), 'review_queue: items missing'],
    [Array.isArray(files.ar_exposure.invoices) && files.ar_exposure.totals, 'ar_exposure: invoices/totals missing'],
    [Array.isArray(files.er_graph.nodes) && Array.isArray(files.er_graph.edges), 'er_graph: nodes/edges missing'],
    [Array.isArray(files.golden_entities.facilities), 'golden_entities: facilities missing'],
  ];
  const bad = checks.find(c => !c[0]);
  return bad ? bad[1] : null;
}
async function bdFetchRun() {
  const get = async url => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${url} HTTP ${r.status}`); return r.json(); };
  const latest = await get('public/bd/latest.json');
  const base = 'public/bd/' + latest.path;
  const files = { manifest: await get(base + 'manifest.json') };
  if (files.manifest.run_id !== latest.run_id) throw new Error('latest.json and manifest disagree on run_id');
  await Promise.all(BD_OUTPUTS.map(async k => { files[k] = await get(base + k + '.json'); }));
  return files;
}
async function bdLoad() {
  if (bd.status === 'loading') return;
  bd.status = 'loading';
  renderAll();
  let reason = '';
  if (location.protocol.startsWith('http')) {
    try {
      const f = await bdFetchRun();
      const err = bdValidate(f);
      if (err) throw new Error(err);
      bdUse(f, 'http', `public/bd/${f.manifest.run_id}/`);
      return;
    } catch (e) { reason = e.message; }
  } else {
    reason = 'page opened from disk';
  }
  const b = window.BD_BUNDLE;
  const err = b ? bdValidate(b) : 'bd_data.js not loaded';
  if (!err) { bdUse(b, 'bundle', reason); return; }
  bd.status = 'error';
  bd.error = `Live run: ${reason || 'not attempted'}. Bundled run: ${err}.`;
  renderAll();
}
function bdUse(files, source, note) {
  bd.data = files; bd.source = source; bd.sourceNote = note; bd.status = 'ready';
  bd.rowIndex = {};
  Object.entries(files.source_rows.sources).forEach(([code, s]) => { bd.rowIndex[code] = {}; s.rows.forEach(r => { bd.rowIndex[code][r._rid] = r; }); });
  bd.rqIndex = {}; files.review_queue.items.forEach(x => { bd.rqIndex[x.review_id] = x; });
  bd.findingsByRid = {};
  files.dq_findings.findings.forEach(f => { (bd.findingsByRid[f.source_row_id] = bd.findingsByRid[f.source_row_id] || []).push(f); });
  bd.ruleIndex = {}; files.dq_rules.rules.forEach(r => { bd.ruleIndex[r.rule_id] = r; });
  bdRestore();
  renderAll();
}
function bdStoreKey(kind) { return `bd-${kind}:${bd.data.manifest.run_id}`; }
function bdRestore() {
  try {
    const s = JSON.parse(localStorage.getItem(bdStoreKey('state')) || 'null');
    if (s) { bd.decisions = s.decisions || {}; bd.log = s.log || []; bd.mapState = s.mapState || {}; bd.applied = !!s.applied; }
    else { bd.decisions = {}; bd.log = []; bd.mapState = {}; bd.applied = false; }
  } catch (e) { bd.decisions = {}; bd.log = []; bd.mapState = {}; bd.applied = false; }
}
function bdPersist() {
  try { localStorage.setItem(bdStoreKey('state'), JSON.stringify({ decisions: bd.decisions, log: bd.log, mapState: bd.mapState, applied: bd.applied })); } catch (e) { /* private mode: state lives for this tab only */ }
}

// ── decisions ──────────────────────────────────────────────
function bdDec(id) { return bd.decisions[id] || null; }
function bdDecClass(d) { if (!d) return ''; if (BD_POSITIVE.includes(d.decision)) return 'done'; if (BD_NEGATIVE.includes(d.decision)) return 'rej'; return 'defer'; }
function bdIsOpen(item) { const d = bdDec(item.review_id); return !d || bdDecClass(d) === 'defer'; }
function bdDecide(id, decision, value) {
  const item = bdItem(id);
  if (!item) return;
  const noteEl = document.getElementById('bd-note');
  const at = new Date().toISOString();
  const entry = { review_id: id, decision, value: value === undefined ? item.proposed_value : value, note: noteEl ? noteEl.value : '', at,
    rule_id: item.rule_id, rule_version: item.rule_version, confidence: item.confidence, original_value: item.old_value };
  bd.decisions[id] = entry;
  bd.log.push(Object.assign({ action: 'decide' }, entry));
  bd.editValue = null;
  bdPersist();
  renderAll();
}
function bdDecideEdited(id) {
  const el = document.getElementById('bd-edit');
  bdDecide(id, 'Edit', el ? el.value : bd.editValue);
}
function bdDecidePick(id) {
  const el = document.getElementById('bd-pick');
  bdDecide(id, 'Pick alternative', el ? el.value : null);
}
function bdUndo(id) {
  const prev = bd.decisions[id];
  if (!prev) return;
  delete bd.decisions[id];
  bd.log.push({ action: 'undo', review_id: id, undone: prev.decision, at: new Date().toISOString() });
  bdPersist();
  renderAll();
}
function bdBulkAccept() {
  const items = bdQueueItems().filter(x => !bdDec(x.review_id) && x.confidence >= 0.9);
  items.forEach(x => {
    const decision = x.decisions[0];
    const entry = { review_id: x.review_id, decision, value: x.proposed_value, note: 'bulk: confidence >= 0.90', at: new Date().toISOString(),
      rule_id: x.rule_id, rule_version: x.rule_version, confidence: x.confidence, original_value: x.old_value };
    bd.decisions[x.review_id] = entry;
    bd.log.push(Object.assign({ action: 'decide' }, entry));
  });
  bdPersist();
  bdToast(`${items.length} high-confidence item${items.length === 1 ? '' : 's'} accepted`);
  renderAll();
}
function bdExportDecisions() {
  const m = bd.data.manifest;
  const payload = { run_id: m.run_id, schema_version: m.schema_version, input_hash: m.input_hash, generated_at: new Date().toISOString(),
    label: 'Simulation - reviewer decisions recorded in the demo; nothing was written to source systems',
    decisions: Object.values(bd.decisions), history: bd.log };
  bdDownload('review_decisions.json', JSON.stringify(payload, null, 1));
}
function bdImportDecisions(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.run_id !== bd.data.manifest.run_id) { bdToast(`Not imported: file is for run ${data.run_id}, this run is ${bd.data.manifest.run_id}`); return; }
      const known = (data.decisions || []).filter(x => bdItem(x.review_id));
      bd.decisions = {}; known.forEach(x => { bd.decisions[x.review_id] = x; });
      bd.log = Array.isArray(data.history) ? data.history : known.map(x => Object.assign({ action: 'decide' }, x));
      bd.applied = true;
      bdPersist();
      bdToast(`${known.length} decisions imported`);
      renderAll();
    } catch (e) { bdToast('Not imported: file is not valid JSON'); }
  };
  reader.readAsText(file);
  input.value = '';
}
function bdResetDecisions() {
  bd.decisions = {}; bd.log = []; bd.mapState = {};
  bdPersist();
  bdToast('Decisions cleared for this run');
  renderAll();
}

// ── chrome: nav, pipeline, run bar, help ──────────────────
const _bdPrevNav = renderNav;
renderNav = function () {
  if (state.activeDataset !== 'bd' || state.currentPage === 'landing' || state.currentPage === 'upload') return _bdPrevNav();
  const nav = BD_STEPS.map((s, i) => `<button class="nav-link ${state.currentPage === s.page ? 'active' : ''}" onclick="navigateTo('${s.page}')">${icon(s.icon)} ${i + 1} ${s.label}</button>`).join('');
  const badge = `<span class="badge badge-cyan" style="cursor:pointer;margin-left:0.5rem;font-size:0.5625rem" onclick="navigateTo('landing')">INSTALLED BASE Dataset &#10005;</span>`;
  const demoBtn = `<button class="btn btn-demo" style="margin-left:auto" onclick="startDemo()">${demoRunning ? icon('crosshair') + ' Stop' : icon('activity') + ' &#9656; Run Demo'}</button>`;
  document.getElementById('header-nav').innerHTML = nav + badge + demoBtn;
  const brand = document.querySelector('.header-brand');
  if (brand) { brand.style.cursor = 'pointer'; brand.onclick = () => navigateTo('landing'); }
};

const _bdPrevPipeline = renderPipeline;
renderPipeline = function () {
  if (state.activeDataset !== 'bd' || state.currentPage === 'landing' || state.currentPage === 'upload' || state.transitioning) return _bdPrevPipeline();
  const idx = BD_STEPS.findIndex(s => s.page === state.currentPage);
  document.getElementById('pipeline').innerHTML = `<div class="pipeline-progress">${BD_STEPS.map((s, i) => {
    const cls = i === idx ? 'active' : i < idx ? 'completed' : '';
    return `<button class="pipeline-step ${cls}" onclick="navigateTo('${s.page}')"><span class="step-num">${i < idx ? '&#10003;' : i + 1}</span> ${s.label}</button>${i < BD_STEPS.length - 1 ? '<div class="pipeline-connector"></div>' : ''}`;
  }).join('')}</div>`;
};

function bdRunBar() {
  const m = bd.data.manifest;
  const src = bd.source === 'http'
    ? `<span class="bd-chip ok" title="All ${BD_OUTPUTS.length} outputs carry run ${m.run_id} and input hash ${m.input_hash.slice(0, 12)}">Live run ${bdEsc(bd.sourceNote)} &middot; validated</span>`
    : `<span class="bd-chip warn" title="${bdEsc(bd.sourceNote)}">Bundled copy of the run (${bdEsc(bd.sourceNote)})</span>`;
  const back = bd.full[state.currentPage] ? `<button class="btn btn-bd-outline btn-sm" onclick="bdSetFull('${state.currentPage}', false)">&larr; Back to summary</button>` : '';
  return `<div class="bd-runbar">${back}<span class="bd-label">${BD_LABEL}</span><span class="bd-chip">Run ${bdEsc(m.run_id)}</span><span class="bd-chip">As of ${bdEsc(m.as_of)}</span>${src}<span class="bd-chip">Pipeline validation: ${m.validation.passed ? 'all ' + m.validation.checks.length + ' checks passed' : 'FAILED'}</span></div>`;
}
function bdHead(title, sub, actions = '') {
  return `<div class="bd-head"><div><h1 class="bd-title">${title}</h1><div class="bd-sub">${sub}</div></div><div class="bd-head-actions">${actions}${renderPageHelpButton()}</div></div>`;
}
function bdNext(note, page, label) {
  return `<div class="bd-next"><div class="bd-note">${note}</div>${page ? `<button class="btn btn-bd" onclick="navigateTo('${page}');window.scrollTo({top:0,behavior:'smooth'})">${label} ${icon('arrowRight')}</button>` : ''}</div>`;
}

const BD_HELP = {
  raw: { title: 'What did we receive?', summary: 'The ten operational extracts exactly as delivered, profiled before anything is changed.', sections: [
    { title: 'Reading the bars', items: ['Each file has four bars: completeness, validity, consistency and linkability.', 'Numbers are passing rows over rows the rule applies to. A blank optional field is not a defect.', 'Red = materially inconsistent or invalid; amber = incomplete or needs review; green = no material failures. Thresholds are listed under the table.'] },
    { title: 'Drilling in', items: ['Click a file for its profile, raw rows and full issue register.', '"See affected rows" filters the raw rows to the rows a rule flagged and highlights the field.'] }] },
  mapping: { title: 'How do the systems connect?', summary: 'Proposed mappings from source columns to one canonical model, with the joins, confidence and SQL behind each.', sections: [
    { title: 'What you can do', items: ['Click a mapping to see transformation steps, join condition, samples and exceptions.', 'Approve, reject or edit each proposal.', 'Open the relationship diagram or the SQL drawer at any time.'] },
    { title: 'Apply mappings', items: ['Replays the versioned pipeline run over the unchanged raw snapshot and creates review proposals.', 'Nothing is written back to SAP, Salesforce or Reltio.'] }] },
  workbench: { title: 'Which fixes need review?', summary: 'Grouped proposals that need a person: normalization, identity matches, relationship conflicts and unresolved fields.', sections: [
    { title: 'Each item shows', items: ['Why it was flagged, the original rows side by side, old and proposed values, evidence, rule, confidence and owner.', 'Downstream orders, invoices and open AR that the decision touches.'] },
    { title: 'Decisions', items: ['Every decision is time-stamped and can be undone.', 'Decisions stay in this browser for this run; export review_decisions.json to share or replay them through the pipeline.'] }] },
  golden: { title: 'What does the combined view tell us?', summary: 'The connected customer, facility, asset, contract, order and invoice view, built only from native joins, high-confidence matches and approved decisions.', sections: [
    { title: 'Publishing rule', items: ['Solid links are native or approved; dashed links are candidates waiting for review.', 'Conflicts stay visible as open issues instead of being forced into a complete graph.'] }] },
  search: { title: 'What may matter for receivables?', summary: 'Open AR touched by broken or unproven relationships, counted once per invoice.', sections: [
    { title: 'Careful wording', items: ['"Associated with an identified issue" means the join path shows a problem. It is not an amount recoverable or a proven loss.', 'Collection notes the extracts cannot corroborate are shown separately.'] }] },
};
const _bdPrevHelp = renderPageHelpPanel;
renderPageHelpPanel = function () {
  if (state.activeDataset !== 'bd') return _bdPrevHelp();
  if (!state.pageHelpOpen) return '';
  const help = BD_HELP[state.currentPage];
  if (!help) return '';
  return `<div class="page-help-layer"><button type="button" class="page-help-backdrop" onclick="closePageHelp()" aria-label="Close page help"></button>
    <aside id="page-help-panel" class="page-help-panel" role="dialog" aria-modal="true" aria-labelledby="page-help-title">
      <div class="page-help-header"><div><span class="badge badge-cyan">${icon('info', 'icon-sm')} Page guide</span><h2 id="page-help-title">${help.title}</h2><p>${help.summary}</p></div>
      <button type="button" class="btn btn-outline page-help-close" onclick="closePageHelp()">Close</button></div>
      <div class="page-help-sections">${help.sections.map(s => `<section class="page-help-section"><h3>${s.title}</h3><ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul></section>`).join('')}</div>
    </aside></div>`;
};

// ════════════════════════════════════════════════════════════
//  1 · SOURCES
// ════════════════════════════════════════════════════════════
function bdSelectSource(code) { bd.srcSel = bd.srcSel === code ? null : code; bd.srcTab = 'profile'; bd.ruleFilter = null; bd.rowQuery = ''; bd.showAllRows = false; renderAll(); if (bd.srcSel) setTimeout(() => { const el = document.getElementById('bd-src-detail'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }
function bdSrcTab(t) { bd.srcTab = t; renderAll(); }
function bdSeeRows(rule) { bd.ruleFilter = rule; bd.srcTab = 'rows'; bd.showAllRows = true; renderAll(); }
function bdSetRowQuery(v) {
  bd.rowQuery = v;
  const body = document.getElementById('bd-rows-body');
  if (body) { body.innerHTML = bdRowsTable(bd.srcSel); const el = document.getElementById('bd-row-q'); if (el) { el.focus(); el.setSelectionRange(v.length, v.length); } }
}

function bdRenderSourcesFull() {
  const D = bd.data;
  const P = D.source_profiles.sources;
  const T = D.source_profiles.rag_thresholds;
  const findings = D.dq_findings.findings;
  const material = findings.filter(f => f.severity === 'high' || f.severity === 'medium').length;
  const status = c => P.filter(p => p.overall_status === c).length;
  const rows = P.map(p => {
    const q = p.quality;
    const fc = findings.filter(f => f.source === p.code);
    const high = fc.filter(f => f.severity === 'high').length;
    return `<tr class="clickable ${bd.srcSel === p.code ? 'sel' : ''}" onclick="bdSelectSource('${p.code}')" tabindex="0" onkeydown="if(event.key==='Enter')bdSelectSource('${p.code}')">
      <td><span class="rag ${p.overall_status}"></span></td>
      <td><div style="font-weight:700;color:var(--text-primary)">${p.code} ${bdEsc(p.label)}</div><div class="bd-note">${bdEsc(p.system)} &middot; key ${bdEsc(p.native_key)}</div></td>
      <td class="num">${p.record_count}</td>
      <td class="bd-mono">${p.refresh_date || '<span class="bd-cell-blank">n/a</span>'}</td>
      <td><div class="rag-bars">${bdRagBar('Completeness', q.completeness)}${bdRagBar('Validity', q.validity)}${bdRagBar('Consistency', q.consistency)}${bdRagBar('Linkability', q.linkability)}</div></td>
      <td class="num">${fc.length}${high ? `<div class="bd-note" style="color:var(--rag-red)">${high} high</div>` : ''}</td>
    </tr>`;
  }).join('');
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdHead('What did we receive?', 'Ten operational extracts, profiled exactly as delivered. Rates are shown as passing rows over the rows each rule applies to - no blanket "bad data %".')}
    <div class="bd-kpis" id="bd-src-kpis">
      <div class="bd-kpi"><div class="v">${P.length}</div><div class="l">Source extracts</div><div class="s">Reltio, SAP/JDE, Salesforce, install base, service, AR</div></div>
      <div class="bd-kpi"><div class="v">${P.reduce((s, p) => s + p.record_count, 0)}</div><div class="l">Records profiled</div><div class="s">${P.reduce((s, p) => s + p.column_count, 0)} columns</div></div>
      <div class="bd-kpi"><div class="v">${D.dq_rules.rules.length}</div><div class="l">Documented rules</div><div class="s">${D.dq_rules.ruleset_version}</div></div>
      <div class="bd-kpi warn"><div class="v">${material}</div><div class="l">Material findings</div><div class="s">high or medium severity, of ${findings.length} total</div></div>
      <div class="bd-kpi"><div class="v"><span style="color:var(--rag-red)">${status('red')}</span> / <span style="color:var(--rag-amber)">${status('amber')}</span> / <span style="color:var(--rag-green)">${status('green')}</span></div><div class="l">Files red / amber / green</div><div class="s">worst dimension per file</div></div>
    </div>
    <div class="bd-panel" id="bd-src-table">
      <div class="bd-panel-h"><h2>What is wrong with each source?</h2><span class="bd-hint">Click a file for columns, raw rows and every issue</span></div>
      <div class="table-wrapper"><table class="bd-table">
        <thead><tr><th></th><th>File</th><th class="num">Records</th><th>Latest date</th><th>Quality by dimension (passing / applicable)</th><th class="num">Findings</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      <div class="bd-panel-b bd-note">Red: a high-severity rule fails on &ge;${T.red_high_severity_rate * 100}% of applicable rows, or medium/high rules fail on &ge;${T.red_fail_rate * 100}%. Amber: any non-informational finding. Linkability: share of rows that resolve to a golden entity (green at 100%, amber from ${T.link_amber * 100}%). Thresholds are demo-configurable.</div>
    </div>
    ${bd.srcSel ? bdRenderSourceDetail(bd.srcSel) : ''}
    ${bdNext('Profiling only observes. Next, the mapping step proposes how these systems connect - with the joins, confidence and SQL behind each proposal.', 'mapping', 'Map the systems')}
    ${renderPageHelpPanel()}
  </div>`;
}

function bdRenderSourceDetail(code) {
  const D = bd.data;
  const p = D.source_profiles.sources.find(s => s.code === code);
  const rules = D.dq_rules.rules.filter(r => r.files.includes(code));
  const fc = D.dq_findings.findings.filter(f => f.source === code);
  const tabs = [['profile', 'Overview & profile'], ['rows', `Raw rows`, p.record_count], ['issues', 'Issue register', rules.length]];
  let body = '';
  if (bd.srcTab === 'profile') {
    body = `<div class="bd-panel-b">
      <div class="bd-meta">
        <div><span>Records</span>${p.record_count}</div><div><span>Latest ${bdEsc(p.refresh_field || 'date')}</span>${p.refresh_date || 'not available'}</div>
        <div><span>Native key</span><span class="bd-mono" style="text-transform:none;letter-spacing:0;font-size:0.8125rem;color:var(--text-primary)">${bdEsc(p.native_key)}</span></div>
        <div><span>Likely grain</span>${bdEsc(p.grain)}</div><div><span>Source owner</span>${bdEsc(p.owner)}</div>
      </div>
      <div class="bd-scroll"><table class="bd-table"><thead><tr><th>Field</th><th>Type</th><th>Populated</th><th class="num">Unique</th><th>Top values</th></tr></thead><tbody>
      ${p.fields.map(f => {
        const r = f.eligible ? f.populated / f.eligible : 0;
        return `<tr><td class="bd-mono" style="color:var(--text-primary)">${bdEsc(f.field)}</td><td>${f.type}</td>
          <td><div style="display:flex;align-items:center;gap:0.5rem"><span class="bd-fill ${r < 0.75 ? 'bad' : r < 1 ? 'warn' : ''}" style="width:70px"><i style="width:${r * 100}%"></i></span><span class="num">${f.populated} / ${f.eligible}</span></div></td>
          <td class="num">${f.unique}</td>
          <td class="bd-note">${f.top_values.map(t => `${bdEsc(t.value.length > 34 ? t.value.slice(0, 32) + '...' : t.value)} <b>&times;${t.count}</b>`).join(' &middot; ')}</td></tr>`;
      }).join('')}</tbody></table></div></div>`;
  } else if (bd.srcTab === 'rows') {
    const rule = bd.ruleFilter ? bd.ruleIndex[bd.ruleFilter] : null;
    body = `<div class="bd-panel-b">
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.75rem">
        <input id="bd-row-q" class="bd-input" placeholder="Filter rows (any value)..." value="${bdEsc(bd.rowQuery)}" oninput="bdSetRowQuery(this.value)">
        ${rule ? `<span class="badge badge-amber">Affected by ${bdEsc(rule.rule_id)}: ${bdEsc(rule.title)} <button class="btn btn-ghost btn-sm" style="padding:0 0.2rem" onclick="bd.ruleFilter=null;renderAll()" aria-label="Clear rule filter">&#10005;</button></span>` : ''}
        <span class="bd-note">Cells with a finding are tinted red; the filtered rule's field in amber. Originals are never edited.</span>
      </div>
      <div id="bd-rows-body">${bdRowsTable(code)}</div></div>`;
  } else {
    body = `<div class="bd-scroll"><table class="bd-table"><thead><tr><th>Rule</th><th>Class</th><th>Check</th><th>Severity</th><th class="num">Affected / applicable</th><th>Example rows</th><th>Interpretation</th><th></th></tr></thead><tbody>
      ${rules.map(r => {
        const aff = (r.affected_by_file || {})[code] || 0;
        const elig = (r.eligible_by_file || {})[code] || 0;
        const ex = fc.filter(f => f.rule_id === r.rule_id).slice(0, 4).map(f => f.native_key || f.source_row_id);
        return `<tr><td class="bd-mono" style="color:var(--text-primary)">${r.rule_id}</td><td>${r.class}</td><td>${bdEsc(r.title)}<div class="bd-note">applies to: ${bdEsc(r.applicability)}</div></td>
          <td>${bdSev(r.severity)}</td><td class="num" style="color:${aff ? 'var(--text-primary)' : 'var(--rag-green)'};font-weight:600">${aff} / ${elig}</td>
          <td class="bd-mono">${ex.map(bdEsc).join('<br>') || '-'}</td><td class="bd-note" style="max-width:20rem">${bdEsc(r.interpretation)}</td>
          <td>${aff ? `<button class="btn btn-bd-outline btn-sm" onclick="bdSeeRows('${r.rule_id}')">See affected rows</button>` : '<span class="rag green">pass</span>'}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }
  return `<div class="bd-panel" id="bd-src-detail">
    <div class="bd-panel-h"><h2>${p.code} ${bdEsc(p.label)} <span class="rag ${p.overall_status}" style="margin-left:0.5rem">${p.overall_status}</span></h2>
      <button class="btn btn-ghost btn-sm" onclick="bdSelectSource('${code}')">Close &#10005;</button></div>
    <div class="bd-panel-b" style="border-bottom:1px solid var(--border-subtle)"><div class="rag-bars">${bdRagBar('Completeness', p.quality.completeness)}${bdRagBar('Validity', p.quality.validity)}${bdRagBar('Consistency', p.quality.consistency)}${bdRagBar('Linkability', p.quality.linkability)}</div>
      <div class="bd-note" style="margin-top:0.5rem">Passing rows over rows each rule applies to. Red: a high-severity rule fails on &ge;${D.source_profiles.rag_thresholds.red_high_severity_rate * 100}% of applicable rows, or medium/high rules on &ge;${D.source_profiles.rag_thresholds.red_fail_rate * 100}%. Optional blanks are not counted as defects.</div></div>
    <div class="bd-tabs" role="tablist">${tabs.map(([k, l, n]) => `<button class="bd-tab ${bd.srcTab === k ? 'on' : ''}" role="tab" aria-selected="${bd.srcTab === k}" onclick="bdSrcTab('${k}')">${l}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>
    ${body}</div>`;
}

function bdRowsTable(code) {
  const S = bd.data.source_rows.sources[code];
  const q = (bd.rowQuery || '').toLowerCase().trim();
  let rows = S.rows;
  let focusFields = new Set();
  if (bd.ruleFilter) {
    const fs = bd.data.dq_findings.findings.filter(f => f.rule_id === bd.ruleFilter && f.source === code);
    const ids = new Set(fs.map(f => f.source_row_id));
    fs.forEach(f => String(f.field).split(' / ').forEach(x => focusFields.add(x.trim())));
    rows = rows.filter(r => ids.has(r._rid));
  }
  if (q) rows = rows.filter(r => S.columns.some(c => String(r[c] || '').toLowerCase().includes(q)));
  const total = rows.length;
  const shown = bd.showAllRows || q ? rows : rows.slice(0, 25);
  const body = shown.map(r => {
    const fs = bd.findingsByRid[r._rid] || [];
    const bad = new Set(); fs.forEach(f => String(f.field).split(' / ').forEach(x => bad.add(x.trim())));
    return `<tr><td class="bd-mono" style="color:var(--text-tertiary)">${r._rid}</td>${S.columns.map(c => {
      const v = r[c];
      const cls = focusFields.has(c) ? 'bd-cell-focus' : bad.has(c) ? 'bd-cell-bad' : '';
      const tip = fs.filter(f => String(f.field).split(' / ').includes(c)).map(f => `${f.rule_id}: ${f.evidence || f.expected}`).join(' | ');
      return `<td class="${cls}" ${tip ? `title="${bdEsc(tip)}"` : ''}>${v === '' || v == null ? '<span class="bd-cell-blank">blank</span>' : bdEsc(v)}</td>`;
    }).join('')}</tr>`;
  }).join('');
  return `<div class="bd-scroll tall"><table class="bd-table"><thead><tr><th>Row</th>${S.columns.map(c => `<th>${bdEsc(c)}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${S.columns.length + 1}" class="bd-empty">No rows match.</td></tr>`}</tbody></table></div>
    <div class="bd-note" style="margin-top:0.5rem">${shown.length} of ${total} row${total === 1 ? '' : 's'} shown${total > shown.length ? ` &middot; <button class="btn btn-ghost btn-sm" onclick="bd.showAllRows=true;renderAll()">Show all ${total}</button>` : ''}</div>`;
}

// ════════════════════════════════════════════════════════════
//  2 · MAP  (+ ER modal, SQL drawer, apply run)
// ════════════════════════════════════════════════════════════
function bdSelectMap(id) { bd.mapSel = bd.mapSel === id ? null : id; bd.mapEdit = null; renderAll(); }
function bdMapStatus(id, status) {
  const prev = bd.mapState[id] || {};
  bd.mapState[id] = Object.assign({}, prev, { status, at: new Date().toISOString() });
  if (status !== 'edited') bd.mapEdit = null;
  bdPersist(); renderAll();
}
function bdMapSaveEdit(id) {
  const el = document.getElementById('bd-map-edit');
  bd.mapState[id] = { status: 'edited', join: el ? el.value : '', at: new Date().toISOString() };
  bd.mapEdit = null; bdPersist(); renderAll();
}
function bdOpenSql(file) { bd.sqlOpen = true; bd.sqlSel = file || bd.sqlSel || bd.data.execution_log.statements[0].sql_file; renderAll(); }
function bdCloseOverlay() { bd.sqlOpen = false; bd.erOpen = false; renderAll(); }
function bdOpenEr() { bd.erOpen = true; bd.erView = { x: 0, y: 0, k: 1 }; renderAll(); setTimeout(() => { const c = document.getElementById('bd-er-canvas'); if (c) c.focus(); }, 50); }

function bdRenderMapFull() {
  const D = bd.data;
  const M = D.mapping_proposals.mappings;
  const ents = D.canonical_schema.entities;
  const native = M.filter(m => /native/.test(m.method)).length;
  const avg = M.reduce((s, m) => s + m.confidence, 0) / M.length;
  const decided = Object.values(bd.mapState).filter(x => x.status).length;
  const rows = M.map(m => {
    const st = bd.mapState[m.mapping_id];
    const sel = bd.mapSel === m.mapping_id;
    return `<tr class="clickable ${sel ? 'sel' : ''}" onclick="bdSelectMap('${m.mapping_id}')" tabindex="0" onkeydown="if(event.key==='Enter')bdSelectMap('${m.mapping_id}')">
      <td class="bd-mono" style="color:var(--text-primary);font-weight:600">${m.field}</td>
      <td>${bdEsc(m.method)}</td>
      <td><div class="bd-chips">${m.sources.slice(0, 4).map(s => `<span class="bd-src-chip">${bdEsc(s)}</span>`).join('')}${m.sources.length > 4 ? `<span class="bd-note">+${m.sources.length - 4}</span>` : ''}</div></td>
      <td>${bdConf(m.confidence)}</td>
      <td class="bd-note">${bdEsc(m.coverage)}</td>
      <td class="num">${m.exceptions ? `<span style="color:var(--rag-amber);font-weight:700">${m.exceptions}</span>` : '<span style="color:var(--rag-green)">0</span>'}</td>
      <td>${st ? `<span class="bd-status ${st.status === 'approved' ? 'done' : st.status === 'rejected' ? 'rej' : 'defer'}">${st.status}</span>` : '<span class="bd-status">proposed</span>'}</td>
    </tr>${sel ? `<tr><td colspan="7" style="background:var(--surface-subtle);padding:1rem">${bdMapDetail(m)}</td></tr>` : ''}`;
  }).join('');
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdHead('How do the systems connect?', 'Each canonical field lists its candidate source columns, transformation, join condition and measured confidence. Name similarity alone never creates a confirmed join.',
      `<button class="btn btn-bd-outline" onclick="bdOpenEr()">${icon('gitMerge')} View relationship diagram</button>
       <button class="btn btn-bd-outline" onclick="bdOpenSql()">${icon('fileText')} View transformation SQL</button>
       <button class="btn btn-bd" id="bd-apply-btn" onclick="bdApply()" ${bd.applying ? 'disabled' : ''}>${icon('zap')} ${bd.applied ? 'Re-apply mappings' : 'Apply mappings'}</button>`)}
    ${bd.applying || bd.applyStep >= 0 ? bdApplyPanel() : ''}
    <div class="bd-kpis">
      <div class="bd-kpi"><div class="v">${ents.length}</div><div class="l">Canonical entities</div><div class="s">roles modeled as relationships</div></div>
      <div class="bd-kpi"><div class="v">${M.length}</div><div class="l">Mapping proposals</div><div class="s">${native} native joins, ${M.length - native} inferred / derived</div></div>
      <div class="bd-kpi accent"><div class="v">${bdPct(avg)}</div><div class="l">Mean measured confidence</div><div class="s">coverage-based, per mapping</div></div>
      <div class="bd-kpi"><div class="v">${decided} / ${M.length}</div><div class="l">Proposals reviewed</div><div class="s">approve, edit or reject below</div></div>
    </div>
    <div class="bd-panel">
      <div class="bd-panel-h"><h2>Canonical model</h2><span class="bd-hint">Grains and native keys kept from each source</span></div>
      <div class="bd-panel-b" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:0.6rem">
        ${ents.map(e => `<div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.5rem 0.65rem"><div style="font-weight:700;font-size:0.8125rem;color:var(--text-primary)">${bdEsc(e.label)}</div><div class="bd-note">${bdEsc(e.grain)}</div><div class="bd-mono" style="color:var(--text-tertiary);margin-top:0.2rem">${e.native_keys.map(bdEsc).join(' &middot; ')}</div></div>`).join('')}
      </div>
    </div>
    <div class="bd-panel" id="bd-map-table">
      <div class="bd-panel-h"><h2>Field map</h2><span class="bd-hint">Click a field to explain the mapping with its evidence</span></div>
      <div class="table-wrapper"><table class="bd-table"><thead><tr><th>Canonical field</th><th>Method</th><th>Source columns</th><th>Confidence</th><th>Coverage</th><th class="num">Exceptions</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
    ${bdNext(bd.applied ? `Run ${D.manifest.run_id} applied: ${D.review_queue.items.length} review proposals are waiting.` : 'Apply the mappings to evaluate joins, classify findings and create the review proposals.',
      bd.applied ? 'workbench' : null, 'Review proposals')}
    ${!bd.applied ? `<div style="display:flex;justify-content:flex-end;margin-top:-0.5rem"><button class="btn btn-bd" onclick="bdApply()" ${bd.applying ? 'disabled' : ''}>${icon('zap')} Apply mappings</button></div>` : ''}
    ${renderPageHelpPanel()}
  </div>`;
}

function bdMapDetail(m) {
  const st = bd.mapState[m.mapping_id] || {};
  const ex = m.exceptions ? `<button class="btn btn-bd-outline btn-sm" onclick="event.stopPropagation();bdShowRuleExceptions('${m.exception_rule}')">See ${m.exceptions} exception${m.exceptions === 1 ? '' : 's'}</button>` : '';
  return `<div onclick="event.stopPropagation()">
    <div class="bd-grid2">
      <div>
        <div class="bd-h3">Source columns</div><div class="bd-chips">${m.sources.map(s => `<span class="bd-src-chip">${bdEsc(s)}</span>`).join('')}</div>
        <div class="bd-h3">Transformation steps</div><ol class="bd-steps">${m.transform.map(t => `<li>${bdEsc(t)}</li>`).join('')}</ol>
        <div class="bd-h3">Join condition</div><div class="bd-join">${bdEsc(st.status === 'edited' && st.join ? st.join : m.join)}</div>
        ${st.status === 'edited' ? `<div class="bd-note" style="margin-top:0.3rem">Edited proposal (original: ${bdEsc(m.join)})</div>` : ''}
      </div>
      <div>
        <div class="bd-h3">Why this mapping</div><div class="bd-callout">${bdEsc(m.rationale)}</div>
        <div class="bd-h3">Measured</div>
        <div class="bd-meta" style="margin-bottom:0.5rem"><div><span>Confidence</span>${bdConf(m.confidence)}</div><div><span>Coverage</span>${bdEsc(m.coverage)}</div><div><span>Exception rule</span><span class="bd-mono">${bdEsc(m.exception_rule)}</span></div></div>
        ${m.samples && m.samples.length ? `<div class="bd-h3">Sample before / after</div><table class="bd-table"><thead><tr><th>Before</th><th>After</th><th>Row</th></tr></thead><tbody>${m.samples.map(s => `<tr><td class="bd-old" style="text-decoration:none">${bdEsc(s.before)}</td><td class="bd-new">${bdEsc(s.after)}${s.score != null ? ` <span class="bd-note">(${Math.round(s.score * 100)}%)</span>` : ''}</td><td class="bd-mono">${bdEsc(s.source)}</td></tr>`).join('')}</tbody></table>` : ''}
      </div>
    </div>
    ${bd.mapEdit === m.mapping_id ? `<div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap"><input id="bd-map-edit" class="bd-input" style="flex:1" value="${bdEsc(st.join || m.join)}"><button class="btn btn-bd btn-sm" onclick="bdMapSaveEdit('${m.mapping_id}')">Save proposal</button><button class="btn btn-ghost btn-sm" onclick="bd.mapEdit=null;renderAll()">Cancel</button></div>` : ''}
    <div class="bd-decide" style="margin-top:0.85rem">
      <button class="btn btn-bd btn-sm" onclick="bdMapStatus('${m.mapping_id}','approved')">${icon('checkCircle2')} Approve</button>
      <button class="btn btn-bd-outline btn-sm" onclick="bd.mapEdit='${m.mapping_id}';renderAll()">Edit proposal</button>
      <button class="btn btn-outline btn-sm" onclick="bdMapStatus('${m.mapping_id}','rejected')">Reject</button>
      ${m.sql_file ? `<button class="btn btn-ghost btn-sm" onclick="bdOpenSql('${m.sql_file}')">${icon('fileText')} SQL: ${m.sql_file}</button>` : ''}
      ${ex}
      ${st.status ? `<span class="bd-history">${st.status} ${new Date(st.at).toLocaleString()} &middot; <button class="btn btn-ghost btn-sm" onclick="delete bd.mapState['${m.mapping_id}'];bdPersist();renderAll()">Undo</button></span>` : ''}
    </div></div>`;
}

function bdShowRuleExceptions(rule) {
  const items = bd.data.review_queue.items.filter(x => x.rule_id === rule);
  if (items.length && bd.applied) {
    bd.reviewRules = [rule]; bd.queue = items[0].queue; bd.reviewSel = items[0].review_id; bd.sqlOpen = false;
    navigateTo('workbench');
  } else {
    const f = bd.data.dq_findings.findings.find(x => x.rule_id === rule);
    bd.sqlOpen = false;
    if (f) { bd.srcSel = f.source; bd.srcTab = 'rows'; bd.ruleFilter = rule; bd.showAllRows = true; navigateTo('raw'); setTimeout(() => { const el = document.getElementById('bd-src-detail'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 80); }
    else bdToast(`No exceptions recorded for ${rule}`);
  }
}

let _bdApplyTimer = null;
function bdApply() {
  if (bd.applying) return;
  bd.applying = true; bd.applyStep = 0;
  renderAll();
  const n = bd.data.execution_log.statements.length;
  clearInterval(_bdApplyTimer);
  _bdApplyTimer = setInterval(() => {
    bd.applyStep++;
    if (bd.applyStep >= n + 1) {
      clearInterval(_bdApplyTimer);
      bd.applying = false; bd.applied = true; bdPersist();
    }
    const el = document.getElementById('bd-apply-panel');
    if (el) el.outerHTML = bdApplyPanel(); else renderAll();
    if (!bd.applying) renderAll();
  }, 260);
}
function bdApplyPanel() {
  const L = bd.data.execution_log.statements;
  const done = !bd.applying && bd.applyStep >= L.length;
  const rq = bd.data.review_queue.items;
  const q = {}; rq.forEach(x => { q[x.queue] = (q[x.queue] || 0) + 1; });
  return `<div class="bd-panel" id="bd-apply-panel">
    <div class="bd-panel-h"><h2>${done ? `Run ${bd.data.manifest.run_id} applied` : 'Applying mappings...'}</h2><span class="bd-hint">Replays the versioned DuckDB run over the unchanged raw snapshot (input ${bd.data.manifest.input_hash.slice(0, 12)})</span></div>
    <div class="bd-panel-b bd-run">
      ${L.map((s, i) => `<div class="bd-run-line ${i < bd.applyStep ? 'done' : i === bd.applyStep && bd.applying ? 'active' : ''}">
        <span>${i < bd.applyStep ? '&#10003;' : i === bd.applyStep && bd.applying ? '&#9656;' : '&middot;'}</span>
        <span>${bdEsc(s.sql_file)}</span><span class="hide-sm">&rarr; ${bdEsc(s.output_table)}</span><span style="text-align:right">${s.row_count} rows</span><span class="hide-sm" style="color:var(--text-tertiary)">${s.checksum}</span></div>`).join('')}
      ${done ? `<div class="bd-callout" style="margin-top:0.75rem;font-family:var(--font-sans)">${bd.data.dq_findings.findings.length} findings classified, ${bd.data.match_candidates.candidates.length} match candidates scored, ${rq.length} review proposals created (${BD_QUEUES.map(x => `${q[x.id] || 0} ${x.label.toLowerCase()}`).join(', ')}). Nothing has been written to SAP, Salesforce or Reltio.
        <div style="margin-top:0.6rem"><button class="btn btn-bd btn-sm" onclick="navigateTo('workbench')">Review proposals ${icon('arrowRight')}</button></div></div>` : ''}
    </div></div>`;
}

// ── ER diagram modal ───────────────────────────────────────
const BD_ER_STYLE = {
  native: { stroke: '#0f766e', dash: '', w: 2 },
  inferred: { stroke: '#6366f1', dash: '7 5', w: 2 },
  conflict: { stroke: '#dc2626', dash: '2 5', w: 2.6 },
  unresolved: { stroke: '#94a3b8', dash: '', w: 2 },
};
const BD_NODE_W = 196, BD_NODE_H = 82;
function bdEdgeGeom(e, nodes, idx, pairCount) {
  const a = nodes[e.source], b = nodes[e.target];
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const off = pairCount > 1 ? (idx - (pairCount - 1) / 2) * 46 : 0;
  const mx = (a.x + b.x) / 2 - dy / len * off, my = (a.y + b.y) / 2 + dx / len * off;
  const clip = (p, q) => {
    const vx = q.x - p.x, vy = q.y - p.y;
    const t = Math.min((BD_NODE_W / 2 + 4) / Math.abs(vx || 1e-6), (BD_NODE_H / 2 + 4) / Math.abs(vy || 1e-6), 1);
    return { x: p.x + vx * t, y: p.y + vy * t };
  };
  const s = clip(a, { x: mx, y: my }), t = clip(b, { x: mx, y: my });
  return { d: `M${s.x},${s.y} Q${mx},${my} ${t.x},${t.y}`, lx: (s.x + 2 * mx + t.x) / 4, ly: (s.y + 2 * my + t.y) / 4 };
}
function bdRenderEr() {
  const G = bd.data.er_graph;
  const nodes = {}; G.nodes.forEach(n => { nodes[n.id] = { ...n, x: n.x + 110, y: n.y + 60 }; });
  const pairs = {};
  G.edges.forEach(e => { const k = [e.source, e.target].sort().join('-'); (pairs[k] = pairs[k] || []).push(e.id); });
  const edges = G.edges.map(e => {
    const k = [e.source, e.target].sort().join('-');
    const g = bdEdgeGeom(e, nodes, pairs[k].indexOf(e.id), pairs[k].length);
    const st = BD_ER_STYLE[e.type];
    const sel = bd.erSel === e.id;
    return `<g class="bd-er-edge ${sel ? 'sel' : ''}" tabindex="0" role="button" aria-label="${bdEsc(e.label)}: ${e.type}" onclick="bdErSelect('${e.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();bdErSelect('${e.id}')}">
      <path class="hit" d="${g.d}"/><path class="vis" d="${g.d}" fill="none" stroke="${st.stroke}" stroke-width="${st.w}" stroke-dasharray="${st.dash}" marker-end="url(#bd-arrow-${e.type})"/>
      <g transform="translate(${g.lx},${g.ly})"><rect x="-52" y="-10" width="104" height="20" rx="5" fill="#fff" stroke="${st.stroke}" stroke-opacity="0.35"/>
      <text text-anchor="middle" y="4" font-size="10" fill="#334155">${e.matched}&#10003; ${e.review ? e.review + '? ' : ''}${e.unresolved ? e.unresolved + '&#8709;' : ''}</text></g></g>`;
  }).join('');
  const nodeSvg = Object.values(nodes).map(n => {
    const sel = bd.erSel === 'N' + n.id;
    return `<g class="bd-er-node ${sel ? 'sel' : ''}" tabindex="0" role="button" aria-label="${bdEsc(n.label)}" transform="translate(${n.x - BD_NODE_W / 2},${n.y - BD_NODE_H / 2})" onclick="bdErSelect('N${n.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();bdErSelect('N${n.id}')}">
      <rect class="box" width="${BD_NODE_W}" height="${BD_NODE_H}" rx="9" fill="#fff" stroke="#cbd5e1"/>
      <rect width="${BD_NODE_W}" height="22" rx="9" fill="rgba(15,118,110,0.1)"/><rect y="12" width="${BD_NODE_W}" height="10" fill="rgba(15,118,110,0.1)"/>
      <text x="10" y="15" font-size="11" font-weight="700" fill="#0f172a">${n.id} ${bdEsc(n.label)}</text>
      <text x="10" y="38" font-size="9.5" fill="#475569">${bdEsc(n.system)} &#183; ${n.records} rows</text>
      <text x="10" y="54" font-size="9.5" fill="#0f766e" font-family="ui-monospace,monospace">key: ${bdEsc(n.key.length > 30 ? n.key.slice(0, 29) + '...' : n.key)}</text>
      <text x="10" y="70" font-size="9" fill="#64748b">${bdEsc(n.grain.length > 36 ? n.grain.slice(0, 35) + '...' : n.grain)}</text></g>`;
  }).join('');
  const markers = Object.entries(BD_ER_STYLE).map(([k, s]) => `<marker id="bd-arrow-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${s.stroke}"/></marker>`).join('');
  const v = bd.erView;
  return `<div class="bd-layer" role="dialog" aria-modal="true" aria-labelledby="bd-er-title">
    <button class="bd-scrim" aria-label="Close diagram" onclick="bdCloseOverlay()"></button>
    <div class="bd-modal">
      <div class="bd-drawer-h"><div><h2 id="bd-er-title" style="margin:0;font-size:1.0625rem">Relationship diagram</h2><div class="bd-note">Ten source entities, their grain and native keys, and every proposed edge with row counts. Click an edge or node for evidence. Drag to pan, scroll or +/- to zoom.</div></div>
        <button class="btn btn-outline" onclick="bdCloseOverlay()">Close</button></div>
      <div class="bd-er-body">
        <div class="bd-er-canvas" id="bd-er-canvas" tabindex="0" aria-label="Relationship diagram canvas; arrow keys pan, plus and minus zoom" onkeydown="bdErKey(event)">
          <div class="bd-er-tools"><button class="btn btn-outline btn-sm" onclick="bdErZoom(1.2)" aria-label="Zoom in">+</button><button class="btn btn-outline btn-sm" onclick="bdErZoom(1/1.2)" aria-label="Zoom out">&minus;</button><button class="btn btn-outline btn-sm" onclick="bdErReset()">Reset</button></div>
          <svg viewBox="0 0 1340 700" id="bd-er-svg"><defs>${markers}</defs><g id="bd-er-world" transform="translate(${v.x},${v.y}) scale(${v.k})">${edges}${nodeSvg}</g></svg>
          <div class="bd-er-legend">${Object.entries(BD_ER_STYLE).map(([k, s]) => `<span><svg viewBox="0 0 28 8"><line x1="0" y1="4" x2="28" y2="4" stroke="${s.stroke}" stroke-width="${s.w}" stroke-dasharray="${s.dash}"/></svg>${G.legend[k]}</span>`).join('')}<span>&#10003; matched &middot; ? in review &middot; &#8709; unresolved</span></div>
        </div>
        <div class="bd-er-side">${bdErSide()}</div>
      </div>
    </div></div>`;
}
function bdErSide() {
  const G = bd.data.er_graph;
  if (!bd.erSel) return `<div class="bd-h3">Evidence</div><p class="bd-note">Select an edge to see the join columns, evidence and affected row counts, or a node for its grain and key.</p>
    <div class="bd-h3">Edges by type</div>${Object.keys(BD_ER_STYLE).map(k => `<div style="display:flex;justify-content:space-between;font-size:0.8125rem;padding:0.2rem 0"><span>${G.legend[k]}</span><b>${G.edges.filter(e => e.type === k).length}</b></div>`).join('')}`;
  if (bd.erSel[0] === 'N') {
    const n = G.nodes.find(x => x.id === bd.erSel.slice(1));
    const es = G.edges.filter(e => e.source === n.id || e.target === n.id);
    return `<div class="bd-h3">Entity</div><h3 style="margin:0 0 0.4rem;font-size:0.9375rem">${n.id} ${bdEsc(n.label)}</h3>
      <div class="bd-meta"><div><span>System</span>${bdEsc(n.system)}</div><div><span>Rows</span>${n.records}</div><div><span>Native key</span><span class="bd-mono" style="text-transform:none;letter-spacing:0">${bdEsc(n.key)}</span></div><div><span>Grain</span>${bdEsc(n.grain)}</div></div>
      <div class="bd-h3">Edges</div>${es.map(e => `<button class="btn btn-ghost btn-sm" style="display:block;text-align:left;width:100%" onclick="bdErSelect('${e.id}')">${e.id} ${bdEsc(e.label)} <span class="bd-note">(${e.type})</span></button>`).join('')}
      <button class="btn btn-bd-outline btn-sm" style="margin-top:0.75rem" onclick="bd.erOpen=false;bdSelectSource('${n.id}');navigateTo('raw')">Open source profile</button>`;
  }
  const e = G.edges.find(x => x.id === bd.erSel);
  const st = BD_ER_STYLE[e.type];
  const src = G.nodes.find(x => x.id === e.source), tgt = G.nodes.find(x => x.id === e.target);
  const total = e.matched + e.review + e.unresolved;
  return `<div class="bd-h3">Edge ${e.id}</div><h3 style="margin:0 0 0.3rem;font-size:0.9375rem">${bdEsc(e.label)}</h3>
    <div style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.75rem;margin-bottom:0.6rem"><svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="${st.stroke}" stroke-width="${st.w}" stroke-dasharray="${st.dash}"/></svg>${G.legend[e.type]}</div>
    <div class="bd-meta"><div><span>From</span>${e.source} ${bdEsc(src.label)}</div><div><span>To</span>${e.target} ${bdEsc(tgt.label)}</div></div>
    <div class="bd-h3">Join</div><div class="bd-join">${bdEsc(e.join)}</div>
    <div class="bd-h3">Columns</div><div class="bd-chips">${e.columns.map(c => `<span class="bd-src-chip">${bdEsc(c)}</span>`).join('')}</div>
    <div class="bd-h3">Affected rows</div>
    <div class="bd-stack" style="height:14px">${[[e.matched, '#0f766e'], [e.review, '#d97706'], [e.unresolved, '#94a3b8']].map(([n, c]) => n ? `<i style="width:${n / Math.max(total, 1) * 100}%;background:${c}"></i>` : '').join('')}</div>
    <div class="bd-legend"><span style="--c:#0f766e">${e.matched} matched</span><span style="--c:#d97706">${e.review} review / conflict</span><span style="--c:#94a3b8">${e.unresolved} unresolved</span></div>
    <div class="bd-h3">Evidence</div><div class="bd-callout">${bdEsc(e.evidence)}</div>`;
}
function bdErSelect(id) { bd.erSel = bd.erSel === id ? null : id; bdRenderOverlay(); setTimeout(() => { const el = document.querySelector(`#bd-overlay [onclick="bdErSelect('${id}')"]`); if (el && el.focus) el.focus(); }, 0); }
function bdErApply() { const w = document.getElementById('bd-er-world'); if (w) w.setAttribute('transform', `translate(${bd.erView.x},${bd.erView.y}) scale(${bd.erView.k})`); }
function bdErZoom(f) { const v = bd.erView; const k = Math.max(0.5, Math.min(2.5, v.k * f)); v.x = 670 - (670 - v.x) * k / v.k; v.y = 350 - (350 - v.y) * k / v.k; v.k = k; bdErApply(); }
function bdErReset() { bd.erView = { x: 0, y: 0, k: 1 }; bdErApply(); }
function bdErKey(ev) {
  const step = 40;
  const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
  if (map[ev.key] && ev.target.id === 'bd-er-canvas') { ev.preventDefault(); bd.erView.x += map[ev.key][0]; bd.erView.y += map[ev.key][1]; bdErApply(); }
  else if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); bdErZoom(1.2); }
  else if (ev.key === '-') { ev.preventDefault(); bdErZoom(1 / 1.2); }
}
function bdErWire() {
  const c = document.getElementById('bd-er-canvas');
  const svg = document.getElementById('bd-er-svg');
  if (!c || !svg || c.dataset.wired) return;
  c.dataset.wired = '1';
  let drag = null;
  const scale = () => 1340 / svg.getBoundingClientRect().width;
  c.addEventListener('mousedown', e => { if (e.target.closest('.bd-er-edge,.bd-er-node,button')) return; drag = { x: e.clientX, y: e.clientY, vx: bd.erView.x, vy: bd.erView.y }; c.classList.add('dragging'); });
  window.addEventListener('mousemove', e => { if (!drag) return; const s = scale(); bd.erView.x = drag.vx + (e.clientX - drag.x) * s; bd.erView.y = drag.vy + (e.clientY - drag.y) * s; bdErApply(); });
  window.addEventListener('mouseup', () => { drag = null; c.classList.remove('dragging'); });
  c.addEventListener('wheel', e => { e.preventDefault(); bdErZoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
}

// ── SQL drawer ─────────────────────────────────────────────
function bdCopySql() {
  const text = bd.data.execution_log.sql[bd.sqlSel];
  const done = () => bdToast('SQL copied');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => bdCopyFallback(text, done));
  else bdCopyFallback(text, done);
}
function bdCopyFallback(text, done) {
  const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
  try { document.execCommand('copy'); done(); } catch (e) { bdToast('Copy not available in this browser'); }
  t.remove();
}
function bdRenderSqlDrawer() {
  const L = bd.data.execution_log;
  const s = L.statements.find(x => x.sql_file === bd.sqlSel) || L.statements[0];
  const exc = bd.data.dq_findings.findings.filter(f => s.exception_rules.includes(f.rule_id));
  return `<div class="bd-layer" role="dialog" aria-modal="true" aria-labelledby="bd-sql-title">
    <button class="bd-scrim" aria-label="Close SQL drawer" onclick="bdCloseOverlay()"></button>
    <aside class="bd-drawer">
      <div class="bd-drawer-h"><div><h2 id="bd-sql-title" style="margin:0;font-size:1.0625rem">Transformation SQL</h2><div class="bd-note">Executed and checksummed by the pipeline for run ${bdEsc(bd.data.manifest.run_id)}.</div></div><button class="btn btn-outline" onclick="bdCloseOverlay()">Close</button></div>
      <div class="bd-drawer-b">
        <select class="bd-input" style="width:100%;margin-bottom:0.85rem" onchange="bd.sqlSel=this.value;bdRenderOverlay()" aria-label="Choose SQL statement">${L.statements.map(x => `<option value="${x.sql_file}" ${x.sql_file === s.sql_file ? 'selected' : ''}>${x.sql_file} &rarr; ${x.output_table} (${x.row_count} rows)</option>`).join('')}</select>
        <div class="bd-meta">
          <div><span>Dialect</span>${s.dialect}</div><div><span>Generated</span>${new Date(bd.data.manifest.generated_at).toLocaleString()}</div>
          <div><span>Status</span>${s.status === 'ok' ? '<span class="rag green">executed</span>' : '<span class="rag red">failed</span>'}</div><div><span>Rows / checksum</span>${s.row_count} &middot; <span class="bd-mono">${s.checksum}</span></div>
          <div><span>Rule IDs</span><span class="bd-mono">${s.rule_ids.join(', ')}</span></div><div><span>Input tables</span><span class="bd-mono">${s.input_tables.join(', ')}</span></div>
          ${Object.keys(s.parameters).length ? `<div><span>Parameters</span><span class="bd-mono">as_of = ${bd.data.manifest.as_of}</span></div>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem"><div class="bd-h3" style="margin:0">Statement</div><button class="btn btn-bd-outline btn-sm" onclick="bdCopySql()">Copy SQL</button></div>
        <pre class="bd-code">${bdHighlightSql(L.sql[s.sql_file])}</pre>
        <div class="bd-h3">Output columns</div><div class="bd-chips">${s.output_columns.map(c => `<span class="bd-src-chip">${bdEsc(c)}</span>`).join('')}</div>
        <div class="bd-h3">Sample results (first ${s.sample.length})</div>
        <div class="table-wrapper"><table class="bd-table"><thead><tr>${s.output_columns.map(c => `<th>${bdEsc(c)}</th>`).join('')}</tr></thead><tbody>${s.sample.map(r => `<tr>${s.output_columns.map(c => `<td class="bd-mono">${r[c] == null ? '<span class="bd-cell-blank">null</span>' : bdEsc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="bd-h3">Exceptions from this query</div>
        <p class="bd-note">${exc.length} row-level finding${exc.length === 1 ? '' : 's'} under ${s.exception_rules.map(r => `<span class="bd-mono">${r}</span>`).join(', ')}.</p>
        <div class="bd-decide">${s.exception_rules.map(r => { const n = exc.filter(f => f.rule_id === r).length; return n ? `<button class="btn btn-bd-outline btn-sm" onclick="bdShowRuleExceptions('${r}')">Show ${n} &times; ${r}</button>` : `<span class="bd-note">${r}: none</span>`; }).join('')}</div>
        <p class="bd-note" style="margin-top:1rem">SQL is shown as executed by DuckDB in the offline pipeline. Copy it to re-run against the same extracts; Databricks SQL needs only the getvariable() parameter swapped.</p>
      </div>
    </aside></div>`;
}

// ════════════════════════════════════════════════════════════
//  3 · REVIEW
// ════════════════════════════════════════════════════════════
function bdQueueItems(queue) {
  const qid = queue || bd.queue;
  const q = (bd.reviewQuery || '').toLowerCase();
  return bd.data.review_queue.items.filter(x => x.queue === qid
    && (!bd.reviewRules || bd.reviewRules.includes(x.rule_id))
    && (bd.reviewSev === 'all' || x.severity === bd.reviewSev)
    && (bd.reviewStatus === 'all' || (bd.reviewStatus === 'open' ? bdIsOpen(x) : !bdIsOpen(x)))
    && (!q || (x.title + ' ' + x.review_id + ' ' + x.issue_type).toLowerCase().includes(q)));
}
function bdSetQueue(q) { bd.queue = q; const first = bdQueueItems(q)[0]; bd.reviewSel = first ? first.review_id : null; bd.editValue = null; renderAll(); }
function bdSelectItem(id) { bd.reviewSel = id; bd.editValue = null; bd.showAllRowsReview = false; renderAll(); }
function bdSetReviewQuery(v) { bd.reviewQuery = v; const el = document.getElementById('bd-q-list'); if (el) el.innerHTML = bdQueueList(); }

function bdRenderReviewFull() {
  const D = bd.data;
  const all = D.review_queue.items;
  if (!bd.applied) {
    return `<div class="page active bd-page">${bdRunBar()}${bdHead('Which fixes need review?', 'Proposals appear once the mappings have been applied to the raw snapshot.')}
      <div class="bd-panel"><div class="bd-empty">${icon('layers', 'icon-xl')}<div style="margin-top:0.5rem">The mapping run has not been applied in this session.</div>
      <button class="btn btn-bd" onclick="navigateTo('mapping');setTimeout(bdApply,150)">${icon('zap')} Apply mappings</button></div></div>${renderPageHelpPanel()}</div>`;
  }
  const decided = all.filter(x => bdDec(x.review_id)).length;
  const sel = bdItem(bd.reviewSel) && bdItem(bd.reviewSel).queue === bd.queue ? bdItem(bd.reviewSel) : bdQueueItems()[0];
  if (sel) bd.reviewSel = sel.review_id;
  const tabs = BD_QUEUES.map(q => {
    const items = all.filter(x => x.queue === q.id);
    const open = items.filter(bdIsOpen).length;
    return `<button class="bd-tab ${bd.queue === q.id ? 'on' : ''}" role="tab" aria-selected="${bd.queue === q.id}" onclick="bdSetQueue('${q.id}')">${q.label}<span class="n">${open} open / ${items.length}</span></button>`;
  }).join('');
  const highConf = bdQueueItems().filter(x => !bdDec(x.review_id) && x.confidence >= 0.9).length;
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdHead('Which fixes need review?', 'Grouped proposals with the evidence behind them. Decisions are recorded here as a simulation - the original CSVs and source systems are never changed.',
      `<button class="btn btn-bd-outline" onclick="bdExportDecisions()">Export decisions</button>
       <label class="btn btn-bd-outline" style="cursor:pointer">Import decisions<input type="file" accept=".json,application/json" style="display:none" onchange="bdImportDecisions(this)"></label>
       <button class="btn btn-ghost" onclick="bdResetDecisions()">Reset</button>`)}
    <div class="bd-kpis" id="bd-review-kpis">
      <div class="bd-kpi"><div class="v">${all.length}</div><div class="l">Review items</div><div class="s">${D.dq_findings.findings.length} findings grouped</div></div>
      <div class="bd-kpi accent"><div class="v">${decided}</div><div class="l">Decided</div><div class="s">${all.length - decided} waiting</div></div>
      <div class="bd-kpi bad"><div class="v">${all.filter(x => x.severity === 'high' && bdIsOpen(x)).length}</div><div class="l">High severity open</div></div>
      <div class="bd-kpi warn"><div class="v">${bdUsdK(bdDistinctAr(all.filter(bdIsOpen)))}</div><div class="l">Open AR behind open items</div><div class="s">distinct invoices, of ${bdUsdK(D.ar_exposure.totals.open_usd)} open</div></div>
    </div>
    <div class="bd-panel">
      <div class="bd-tabs" role="tablist">${tabs}</div>
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;padding:0.75rem 1.1rem;border-bottom:1px solid var(--border-subtle)">
        <input class="bd-input" placeholder="Search items..." value="${bdEsc(bd.reviewQuery)}" oninput="bdSetReviewQuery(this.value)" aria-label="Search review items">
        <select class="bd-input" onchange="bd.reviewSev=this.value;renderAll()" aria-label="Severity filter">${['all', 'high', 'medium', 'low'].map(s => `<option value="${s}" ${bd.reviewSev === s ? 'selected' : ''}>${s === 'all' ? 'All severities' : s}</option>`).join('')}</select>
        <select class="bd-input" onchange="bd.reviewStatus=this.value;renderAll()" aria-label="Status filter">${[['all', 'All statuses'], ['open', 'Open'], ['decided', 'Decided']].map(([v, l]) => `<option value="${v}" ${bd.reviewStatus === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${bd.reviewRules ? `<span class="badge badge-amber">Rule ${bd.reviewRules.join(', ')} <button class="btn btn-ghost btn-sm" style="padding:0 0.2rem" onclick="bd.reviewRules=null;renderAll()" aria-label="Clear rule filter">&#10005;</button></span>` : ''}
        <button class="btn btn-bd-outline btn-sm" style="margin-left:auto" onclick="bdBulkAccept()" ${highConf ? '' : 'disabled'}>Accept ${highConf} open item${highConf === 1 ? '' : 's'} &ge; 90% confidence</button>
      </div>
      <div class="bd-grid-side" style="gap:0">
        <div id="bd-q-list" class="bd-q-list" style="border-right:1px solid var(--border-subtle)">${bdQueueList()}</div>
        <div id="bd-review-detail" style="padding:1rem 1.1rem;min-width:0">${sel ? bdReviewDetail(sel) : '<div class="bd-empty">No items match the filters.</div>'}</div>
      </div>
    </div>
    ${bdNext('Approved matches and edges flow into the golden view; rejected ones stay separate and pending ones remain visible as candidates.', 'golden', 'See the combined view')}
    ${renderPageHelpPanel()}
  </div>`;
}

function bdQueueList() {
  const items = bdQueueItems();
  if (!items.length) return '<div class="bd-empty">No items match.</div>';
  return items.map(x => {
    const d = bdDec(x.review_id);
    return `<button class="bd-q-item ${bd.reviewSel === x.review_id ? 'sel' : ''}" onclick="bdSelectItem('${x.review_id}')">
      <div class="t">${bdEsc(x.title)}</div>
      <div class="m"><span class="bd-mono">${x.review_id}</span>${bdSev(x.severity)}<span>${Math.round(x.confidence * 100)}%</span>
      ${x.downstream.open_ar_usd ? `<span style="color:var(--rag-amber);font-weight:600">${bdUsdK(x.downstream.open_ar_usd)} AR</span>` : ''}
      <span class="bd-status ${bdDecClass(d)}">${d ? bdEsc(d.decision) : 'pending'}</span></div></button>`;
  }).join('');
}

function bdRowCards(rids, item) {
  const rows = rids.map(r => bdRow(r)).filter(Boolean);
  if (!rows.length) return '';
  const byFile = {};
  rows.forEach(r => { const c = r._rid.split(':')[0]; (byFile[c] = byFile[c] || []).push(r); });
  const limit = bd.showAllRowsReview ? 999 : 4;
  let out = '';
  Object.entries(byFile).forEach(([code, rs]) => {
    const cols = bd.data.source_rows.sources[code].columns;
    const label = bdSrc(code).label;
    if (rs.length <= 3) {
      const diff = new Set(cols.filter(c => rs.length > 1 && new Set(rs.map(r => r[c])).size > 1));
      out += `<div class="bd-h3">${code} ${bdEsc(label)}</div><div class="bd-side-by-side">${rs.map(r => `<div class="bd-rowcard"><h4><span>${bdEsc(r[cols[0]])}</span><span class="bd-mono" style="color:var(--text-tertiary)">${r._rid}</span></h4><table>${cols.map(c => `<tr class="${diff.has(c) ? 'diff' : ''}"><td>${bdEsc(c)}</td><td>${r[c] === '' ? '<span class="bd-cell-blank">blank</span>' : bdEsc(r[c])}</td></tr>`).join('')}</table></div>`).join('')}</div>`;
    } else {
      const shown = rs.slice(0, limit);
      const keyCols = cols.slice(0, 9);
      out += `<div class="bd-h3">${code} ${bdEsc(label)} &middot; ${rs.length} rows</div><div class="table-wrapper"><table class="bd-table"><thead><tr><th>Row</th>${keyCols.map(c => `<th>${bdEsc(c)}</th>`).join('')}</tr></thead><tbody>${shown.map(r => {
        const bad = new Set((bd.findingsByRid[r._rid] || []).filter(f => f.rule_id === item.rule_id).map(f => f.field));
        return `<tr><td class="bd-mono">${r._rid}</td>${keyCols.map(c => `<td class="${bad.has(c) ? 'bd-cell-focus' : ''}">${r[c] === '' ? '<span class="bd-cell-blank">blank</span>' : bdEsc(r[c])}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table></div>${rs.length > shown.length ? `<button class="btn btn-ghost btn-sm" onclick="bd.showAllRowsReview=true;renderAll()">Show all ${rs.length} rows</button>` : ''}`;
    }
  });
  return out;
}

function bdReviewDetail(x) {
  const d = bdDec(x.review_id);
  const pairs = x.pairs ? `<table class="bd-table"><thead><tr><th>Record</th><th>Field</th><th>Original</th><th>Proposed</th>${x.pairs[0].score != null ? '<th class="num">Score</th>' : ''}</tr></thead><tbody>${x.pairs.map(p => `<tr><td class="bd-mono">${bdEsc(p.key)}<div class="bd-note">${p.rid}</div></td><td class="bd-mono">${bdEsc(p.field)}</td><td><span class="bd-old">${bdEsc(p.old) || '<i>blank</i>'}</span></td><td><span class="bd-new">${bdEsc(p.new == null ? 'unknown' : p.new)}</span></td>${p.score != null ? `<td class="num">${Math.round(p.score * 100)}%</td>` : ''}</tr>`).join('')}</tbody></table>`
    : `<div class="bd-grid2"><div><div class="bd-h3">Original</div><div class="bd-old" style="text-decoration:none;color:var(--text-primary)">${bdFmtVal(x.old_value)}</div></div><div><div class="bd-h3">Proposed</div><div class="bd-new">${bdFmtVal(x.proposed_value)}</div></div></div>`;
  const ds = x.downstream || {};
  const dep = x.depends_on ? bdItem(x.depends_on) : null;
  const decisionUi = d
    ? `<div class="bd-callout"><b>${bdEsc(d.decision)}</b>${d.value != null && typeof d.value !== 'object' && d.decision !== 'Same entity' ? ` &rarr; <span class="bd-mono">${bdEsc(d.value)}</span>` : ''} &middot; ${new Date(d.at).toLocaleString()}${d.note ? `<div class="bd-note">Note: ${bdEsc(d.note)}</div>` : ''}
        <div style="margin-top:0.5rem"><button class="btn btn-outline btn-sm" onclick="bdUndo('${x.review_id}')">Undo decision</button></div></div>`
    : `<input id="bd-note" class="bd-input" style="width:100%;margin-bottom:0.5rem" placeholder="Optional reviewer note">
       ${x.decisions.includes('Edit') ? `<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem"><input id="bd-edit" class="bd-input" style="flex:1" value="${bdEsc(typeof x.proposed_value === 'string' ? x.proposed_value : JSON.stringify(x.proposed_value))}" aria-label="Edited value"><button class="btn btn-bd-outline btn-sm" onclick="bdDecideEdited('${x.review_id}')">Save edit</button></div>` : ''}
       ${x.alternatives ? `<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem"><select id="bd-pick" class="bd-input" style="flex:1" aria-label="Alternative">${x.alternatives.map(a => `<option value="${a.golden_facility_id}">${bdEsc(a.label)}</option>`).join('')}</select><button class="btn btn-bd-outline btn-sm" onclick="bdDecidePick('${x.review_id}')">Pick alternative</button></div>` : ''}
       <div class="bd-decide">${x.decisions.filter(o => o !== 'Edit' && o !== 'Pick alternative').map((o, i) => `<button class="btn ${i === 0 ? 'btn-bd' : 'btn-outline'} btn-sm" onclick="bdDecide('${x.review_id}','${bdJs(o)}')">${bdEsc(o)}</button>`).join('')}</div>`;
  const hist = bd.log.filter(h => h.review_id === x.review_id);
  return `<div>
    <div style="display:flex;justify-content:space-between;gap:0.75rem;align-items:flex-start;flex-wrap:wrap">
      <div><div class="bd-mono" style="color:var(--text-tertiary)">${x.review_id} &middot; ${bdEsc(x.entity_type)} &middot; ${bdEsc(x.issue_type)}</div><h2 style="margin:0.2rem 0 0;font-size:1.0625rem;color:var(--text-primary)">${bdEsc(x.title)}</h2></div>
      <span class="bd-status ${bdDecClass(d)}" style="font-size:0.6875rem">${d ? bdEsc(d.decision) : 'pending'}</span>
    </div>
    <div class="bd-meta" style="margin-top:0.75rem">
      <div><span>Confidence</span>${bdConf(x.confidence)}</div><div><span>Severity</span>${bdSev(x.severity)}</div>
      <div><span>Rule / version</span><span class="bd-mono">${bdEsc(x.rule_id)} &middot; ${bdEsc(x.rule_version)}</span></div><div><span>Owner</span>${bdEsc(x.owner)}</div>
    </div>
    <div class="bd-callout warn"><b>Why flagged:</b> ${bdEsc(x.why_flagged)}</div>
    ${dep ? `<div class="bd-callout" style="margin-top:0.5rem">Depends on <button class="btn btn-ghost btn-sm" onclick="bdSelectItem('${dep.review_id}');bd.queue='${dep.queue}';renderAll()">${dep.review_id}</button> (${bdDec(dep.review_id) ? bdEsc(bdDec(dep.review_id).decision) : 'pending'}). Confirm only if that merge is approved.</div>` : ''}
    <div class="bd-h3">Original vs proposed</div>${pairs}
    <div class="bd-h3">Evidence</div><ul class="bd-evidence">${x.evidence.map(e => `<li>${bdEsc(e)}</li>`).join('')}</ul>
    ${x.timeline ? `<div class="bd-h3">Asset evidence timeline</div><ul class="bd-timeline">${x.timeline.map(t => `<li class="${t.facility && x.proposed_value && t.facility === x.proposed_value.golden_facility_id ? 'warn' : ''}"><span class="d">${t.date || 'undated'}</span> &middot; ${bdEsc(t.type.replace(/_/g, ' '))} &middot; ${bdEsc(t.evidence_source)}<div>${bdEsc(t.text || 'no location')} &rarr; <b>${bdEsc(bdShort(bdFacName(t.facility)))}</b> <span class="bd-mono bd-note">${t.rid}</span></div></li>`).join('')}</ul>` : ''}
    <div class="bd-h3">Original rows${x.source_row_ids.length > 1 ? ' side by side' : ''}</div>${bdRowCards(x.source_row_ids, x)}
    <div class="bd-h3">Downstream records affected</div>
    <div class="bd-meta"><div><span>Orders</span>${(ds.orders || []).length}</div><div><span>Invoices</span>${(ds.invoices || []).length}</div><div><span>Open invoices</span>${(ds.open_invoices || []).length ? ds.open_invoices.map(bdEsc).join(', ') : 'none'}</div><div><span>Open AR touched</span>${bdUsd(ds.open_ar_usd)}</div></div>
    <div class="bd-h3">Decision</div>${decisionUi}
    ${hist.length ? `<div class="bd-h3">History</div><div class="bd-history">${hist.map(h => `<div>${new Date(h.at).toLocaleString()} &middot; ${h.action === 'undo' ? 'undid ' + bdEsc(h.undone) : bdEsc(h.decision)}</div>`).join('')}</div>` : ''}
  </div>`;
}

// ════════════════════════════════════════════════════════════
//  4 · GOLDEN
// ════════════════════════════════════════════════════════════
function bdXwalkStatus(x) {
  if (x.status !== 'review') return x.status === 'auto' ? 'matched' : 'native';
  const d = x.review_item ? bdDec(x.review_item) : null;
  if (!d) return 'candidate';
  if (BD_POSITIVE.includes(d.decision)) return 'approved';
  if (BD_NEGATIVE.includes(d.decision)) return 'separate';
  return 'deferred';
}
function bdAssetItems(assetId) { return bd.data.review_queue.items.filter(x => x.asset_id === assetId || (x.assets || []).includes(assetId)); }
function bdAssetPlacement(a) {
  const loc = bdAssetItems(a.asset_id).find(x => x.issue_type === 'asset location');
  if (!loc) return { facility: a.proposed_facility, status: a.location_status === 'unknown' ? 'unknown' : 'published', item: null };
  const d = bdDec(loc.review_id);
  if (!d) return { facility: a.ib_facility, status: 'conflict', candidate: loc.proposed_value.golden_facility_id, item: loc };
  if (d.decision === 'Approve edge') return { facility: loc.proposed_value.golden_facility_id, status: 'approved', item: loc };
  if (d.decision === 'Pick alternative') return { facility: d.value || a.ib_facility, status: 'approved', item: loc };
  return { facility: a.ib_facility, status: 'investigating', item: loc };
}
function bdAssetOwner(a) {
  if (a.owner_status === 'native') return { value: a.owner_raw, status: 'native' };
  const it = bdAssetItems(a.asset_id).find(x => x.issue_type === 'owner ERP number');
  const d = it ? bdDec(it.review_id) : null;
  if (d && BD_POSITIVE.includes(d.decision)) return { value: d.value || a.owner_proposed, status: 'confirmed', item: it };
  if (d) return { value: null, status: 'left unknown', item: it };
  return { value: a.owner_proposed, status: a.owner_proposed ? 'proposed' : 'unknown', item: it };
}
function bdSelectFac(gid) { bd.goldenSel = gid; bd.goldenAsset = null; renderAll(); }
function bdGoldenTab(t) { bd.goldenTab = t; renderAll(); }
function bdSelectAsset(id) { bd.goldenAsset = bd.goldenAsset === id ? null : id; bd.goldenTab = 'assets'; renderAll(); setTimeout(() => { const el = document.getElementById('bd-asset-detail'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60); }

function bdRenderGoldenFull() {
  const G = bd.data.golden_entities;
  const P = G.party;
  const facs = G.facilities;
  const assetsAt = gid => G.assets.filter(a => bdAssetPlacement(a).facility === gid);
  const list = facs.map(f => {
    const open = f.open_issues.filter(id => bdItem(id) && bdIsOpen(bdItem(id))).length;
    return `<button class="bd-fac ${bd.goldenSel === f.golden_id ? 'sel' : ''}" onclick="bdSelectFac('${f.golden_id}')">
      <div class="n">${bdEsc(bdShort(f.display_name))}</div>
      <div class="c"><span>${f.golden_id}</span><span>${assetsAt(f.golden_id).length} assets</span><span>${f.counts.orders} orders</span>${f.open_ar_usd ? `<span style="color:var(--rag-amber)">${bdUsdK(f.open_ar_usd)} open AR</span>` : ''}${open ? `<span style="color:var(--rag-red)">${open} open issues</span>` : '<span style="color:var(--rag-green)">no open issues</span>'}</div></button>`;
  }).join('');
  const f = bdFac(bd.goldenSel) || facs[0];
  const partyRefs = P.source_refs.map(r => {
    const it = (P.open_issues || [])[0];
    const d = r.status === 'review' && it ? bdDec(it) : null;
    const st = r.status === 'native' ? 'native' : d ? (BD_POSITIVE.includes(d.decision) ? 'approved' : BD_NEGATIVE.includes(d.decision) ? 'separate' : 'deferred') : 'candidate';
    return `<span class="bd-src-chip" title="${bdEsc(r.name)}">${bdEsc(r.system || 'Reltio')} ${bdEsc(r.native_id)} &middot; ${st}</span>`;
  }).join(' ');
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdHead('What does the combined view tell us?', `${bdEsc(G.publish_rule)}`)}
    <div class="bd-panel" id="bd-party"><div class="bd-panel-b" style="display:flex;gap:1.25rem;flex-wrap:wrap;align-items:center">
      <div><div class="bd-note">Enterprise party ${P.golden_id}</div><div style="font-weight:800;font-size:1.0625rem;color:var(--text-primary)">${bdEsc(P.dba_name)} &middot; ${bdEsc(P.legal_name)}</div><div class="bd-note">${bdEsc(P.address)} &middot; ${bdEsc(P.payment_terms)} &middot; ${bdEsc(P.classification)}</div></div>
      <div class="bd-chips" style="margin-left:auto">${partyRefs}</div>
    </div></div>
    <div class="bd-grid-side">
      <div class="bd-panel" style="margin:0"><div class="bd-panel-h"><h2>Facilities</h2><span class="bd-hint">${facs.length} golden</span></div><div class="bd-fac-list">${list}</div></div>
      <div style="min-width:0">${bdFacilityView(f)}</div>
    </div>
    ${bdNext('The connected view keeps original IDs and unresolved gaps. Next: which open receivables sit on the relationships that are broken or unproven.', 'search', 'See business impact')}
    ${renderPageHelpPanel()}
  </div>`;
}

function bdFacilityView(f) {
  const G = bd.data.golden_entities;
  const assets = G.assets.filter(a => bdAssetPlacement(a).facility === f.golden_id || (bdAssetPlacement(a).candidate === f.golden_id));
  const placedHere = assets.filter(a => bdAssetPlacement(a).facility === f.golden_id);
  const incoming = assets.filter(a => bdAssetPlacement(a).candidate === f.golden_id);
  const conflicts = placedHere.filter(a => bdAssetPlacement(a).status === 'conflict');
  const contracts = G.contracts.filter(c => c.facility === f.golden_id);
  const contacts = G.contacts.filter(c => c.facility === f.golden_id);
  const orders = G.orders.filter(o => o.facility === f.golden_id);
  const inv = bd.data.ar_exposure.invoices.filter(i => i.facility === f.golden_id);
  const openInv = inv.filter(i => i.open_usd > 0);
  const openIssues = f.open_issues.map(bdItem).filter(Boolean);
  // hub diagram
  const left = f.crosswalk;
  const rowH = 38, top = 18;
  const H = Math.max(left.length * rowH + top * 2, 5 * 58 + top * 2);
  const cy = H / 2;
  const styleFor = st => ({ native: ['#0f766e', ''], matched: ['#0f766e', ''], approved: ['#0f766e', ''], candidate: ['#d97706', '6 4'], deferred: ['#94a3b8', '6 4'], separate: ['#dc2626', '2 4'] }[st]);
  const leftSvg = left.map((x, i) => {
    const y = top + i * rowH + rowH / 2;
    const st = bdXwalkStatus(x);
    const [c, dash] = styleFor(st);
    const label = `${x.table === 'sap_accounts' ? (x.system || 'ERP').replace('_', ' ') : x.table === 'reltio' ? 'Reltio' : 'Salesforce'} ${x.native_id}`;
    return `<g class="node" tabindex="0" role="button" onclick="bdGoldenTab('crosswalk')" onkeydown="if(event.key==='Enter')bdGoldenTab('crosswalk')"><path d="M262,${y} C320,${y} 330,${cy} 380,${cy}" fill="none" stroke="${c}" stroke-width="1.8" stroke-dasharray="${dash}"/>
      <rect x="8" y="${y - 14}" width="254" height="28" rx="6" fill="#fff" stroke="${c}" stroke-opacity="0.6"/>
      <text x="16" y="${y + 4}" font-size="10.5" fill="#0f172a">${bdEsc(label)}${x.role ? ' &#183; ' + bdEsc(x.role.split('|')[0].replace('_', '-').toLowerCase()) : ''}</text>
      <text x="254" y="${y + 4}" font-size="9" text-anchor="end" fill="${c}">${st}</text></g>`;
  }).join('');
  const right = [
    ['assets', `Assets`, `${placedHere.length} placed${conflicts.length ? ` · ${conflicts.length} location conflict` : ''}${incoming.length ? ` · ${incoming.length} incoming?` : ''}`, conflicts.length || incoming.length],
    ['contracts', 'Contracts', `${contracts.length} linked · ${contracts.filter(c => c.status !== 'Active').length} not active`, contracts.some(c => c.status !== 'Active')],
    ['contracts', 'Contacts', `${contacts.length} linked`, false],
    ['orders', 'Orders', `${orders.length} via sold-to`, orders.some(o => o.open_issues.length)],
    ['orders', 'Invoices', `${openInv.length} open · ${bdUsdK(openInv.reduce((s, i) => s + i.open_usd, 0))}`, openInv.some(i => i.association === 'structural')],
  ];
  const rightSvg = right.map(([tab, l, sub, warn], i) => {
    const y = top + i * ((H - top * 2) / right.length) + (H - top * 2) / right.length / 2;
    const c = warn ? '#d97706' : '#94a3b8';
    return `<g class="node" tabindex="0" role="button" onclick="bdGoldenTab('${tab}')" onkeydown="if(event.key==='Enter')bdGoldenTab('${tab}')"><path d="M540,${cy} C590,${cy} 600,${y} 640,${y}" fill="none" stroke="${c}" stroke-width="1.6"/>
      <rect x="640" y="${y - 20}" width="250" height="40" rx="7" fill="#fff" stroke="${c}"/>
      <text x="652" y="${y - 3}" font-size="11.5" font-weight="700" fill="#0f172a">${l}</text><text x="652" y="${y + 12}" font-size="10" fill="${warn ? '#92400e' : '#64748b'}">${bdEsc(sub)}</text></g>`;
  }).join('');
  const hub = `<svg viewBox="0 0 900 ${H}" role="img" aria-label="Connected view for ${bdEsc(f.display_name)}">${leftSvg}${rightSvg}
    <rect x="380" y="${cy - 42}" width="160" height="84" rx="12" fill="#0f766e"/><text x="460" y="${cy - 16}" text-anchor="middle" font-size="10" fill="#ccfbf1">${f.golden_id}</text>
    <text x="460" y="${cy + 2}" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff">${bdEsc(bdShort(f.display_name))}</text>
    <text x="460" y="${cy + 20}" text-anchor="middle" font-size="9.5" fill="#ccfbf1">${bdEsc(f.erp_systems.join(' + ').replace(/_/g, ' '))}</text></svg>`;
  const tabs = [['crosswalk', 'Crosswalk & lineage', f.crosswalk.length], ['assets', 'Assets', placedHere.length], ['contracts', 'Contracts & contacts', contracts.length + contacts.length], ['orders', 'Orders & invoices', orders.length], ['issues', 'Open issues', openIssues.filter(bdIsOpen).length]];
  let body = '';
  if (bd.goldenTab === 'crosswalk') {
    const L = bd.data.golden_lineage.facilities[f.golden_id];
    body = `<div class="table-wrapper"><table class="bd-table"><thead><tr><th>Source record</th><th>System / role</th><th>Original name</th><th>Original address</th><th>Score</th><th>Status</th></tr></thead><tbody>
      ${f.crosswalk.map(x => { const st = bdXwalkStatus(x); return `<tr><td class="bd-mono">${bdEsc(x.native_id)}<div class="bd-note">${x.rid}</div></td><td>${bdEsc(x.system)}${x.role ? `<div class="bd-note">${bdEsc(x.role)}</div>` : ''}</td><td>${bdEsc(x.name)}</td><td>${bdEsc(x.address) || '<span class="bd-cell-blank">blank</span>'}</td><td>${bdConf(x.score)}</td>
        <td><span class="bd-status ${['native', 'matched', 'approved'].includes(st) ? 'done' : st === 'separate' ? 'rej' : 'defer'}">${st}</span>${x.review_item ? ` <button class="btn btn-ghost btn-sm" onclick="bdGoReview('${x.review_item}')">${x.review_item}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="bd-panel-b"><div class="bd-h3">Lineage: how each golden value was chosen</div>
      ${['display_name', 'address', 'dhc_id', 'payment_terms'].map(k => `<div style="margin-bottom:0.75rem"><div style="font-size:0.8125rem"><b class="bd-mono">${k}</b> = <span class="bd-new">${bdEsc(L[k].selected || 'unknown')}</span> <span class="bd-note">&middot; ${bdEsc(L[k].rule)}</span></div>
        <div class="bd-chips" style="margin-top:0.3rem">${L[k].values.map(v => `<span class="bd-src-chip" title="rank ${v.rank} &middot; ${bdEsc(v.column)}" style="${v.value === L[k].selected ? 'border-color:var(--bd);color:var(--bd-dark)' : ''}">${v.rid} ${bdEsc(v.value || 'blank')}</span>`).join('') || '<span class="bd-note">no source values</span>'}</div></div>`).join('')}
      ${f.name_variants.length ? `<div class="bd-h3">Names typed for this facility across systems</div><div class="bd-chips">${f.name_variants.map(v => `<span class="bd-src-chip">${bdEsc(v.value)} &times;${v.count}</span>`).join('')}</div>` : ''}</div>`;
  } else if (bd.goldenTab === 'assets') {
    const rows = [...placedHere, ...incoming].map(a => {
      const p = bdAssetPlacement(a), o = bdAssetOwner(a);
      const here = p.facility === f.golden_id;
      return `<tr class="clickable ${bd.goldenAsset === a.asset_id ? 'sel' : ''}" onclick="bdSelectAsset('${a.asset_id}')"><td class="bd-mono" style="color:var(--text-primary)">${a.asset_id}</td><td class="bd-mono">${bdEsc(a.serial)}${a.serial !== a.serial_normalized ? `<div class="bd-new">${a.serial_normalized}</div>` : ''}</td><td>${a.product_family}</td>
        <td>${here ? '' : `<span class="bd-note">at ${bdEsc(bdShort(bdFacName(p.facility)))} &rarr; </span>`}<span class="bd-status ${p.status === 'published' || p.status === 'approved' ? 'done' : p.status === 'conflict' ? 'rej' : 'defer'}">${here ? p.status : 'candidate move here'}</span>${p.status === 'conflict' ? ` <span class="bd-note">${Math.round(a.location_confidence * 100)}% for ${bdEsc(bdShort(bdFacName(p.candidate)))}</span>` : ''}</td>
        <td class="bd-mono">${bdEsc(o.value || '-')} <span class="bd-status ${o.status === 'native' || o.status === 'confirmed' ? 'done' : 'defer'}">${o.status}</span></td><td class="bd-mono">${a.warranty_end}</td><td class="num">${a.orders.length}</td></tr>`;
    }).join('');
    const sel = bd.goldenAsset ? G.assets.find(a => a.asset_id === bd.goldenAsset) : null;
    body = `<div class="bd-scroll"><table class="bd-table"><thead><tr><th>Asset</th><th>Serial</th><th>Family</th><th>Location</th><th>Owner account</th><th>Warranty end</th><th class="num">Orders</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="bd-empty">No assets</td></tr>'}</tbody></table></div>${sel ? bdAssetDetail(sel) : '<div class="bd-panel-b bd-note">Click an asset for its evidence timeline.</div>'}`;
  } else if (bd.goldenTab === 'contracts') {
    body = `<div class="table-wrapper"><table class="bd-table"><thead><tr><th>Contract</th><th>Covers</th><th>Level</th><th>Term</th><th>Status</th><th>PO req.</th><th>Issues</th></tr></thead><tbody>
      ${contracts.map(c => `<tr><td class="bd-mono">${c.contract_id}</td><td>${bdEsc(c.schedule)}</td><td>${c.level}</td><td class="bd-mono">${c.term_begin} &rarr; ${c.term_end || '<span style="color:var(--rag-red)">missing</span>'}</td><td><span class="bd-status ${c.status === 'Active' ? 'done' : 'rej'}">${c.status}</span></td><td>${c.po_required}</td><td>${c.open_issues.map(i => `<button class="btn btn-ghost btn-sm" onclick="bdGoReview('${i}')">${i}</button>`).join('') || '-'}</td></tr>`).join('') || '<tr><td colspan="7" class="bd-empty">No contracts linked - see unresolved contract items</td></tr>'}</tbody></table></div>
      <div class="bd-panel-b"><div class="bd-h3">Contacts (${contacts.length})</div><div class="table-wrapper"><table class="bd-table"><thead><tr><th>Contact ID</th><th>Name</th><th>Role</th><th>Department</th><th>Email</th><th>Status</th></tr></thead><tbody>${contacts.map(c => `<tr><td class="bd-mono">${c.contact_id.slice(-6)}</td><td>${bdEsc(c.name)}</td><td>${bdEsc(c.type)}</td><td>${bdEsc(c.department)}</td><td>${bdEsc(c.email) || '<span class="bd-cell-blank">blank</span>'}</td><td>${c.status}</td></tr>`).join('')}</tbody></table></div></div>`;
  } else if (bd.goldenTab === 'orders') {
    body = `<div class="bd-scroll"><table class="bd-table"><thead><tr><th>Order</th><th>Date</th><th>Type</th><th>Material</th><th>Asset</th><th>Contract</th><th>Invoice</th><th class="num">Open</th><th>Issues</th></tr></thead><tbody>
      ${orders.map(o => { const i = inv.find(v => v.order === o.order_id); return `<tr><td class="bd-mono">${o.order_id}<div class="bd-note">${o.client.replace('_', ' ')}</div></td><td class="bd-mono">${o.date}</td><td>${o.type}</td><td class="bd-mono">${o.material}</td>
        <td class="bd-mono">${o.asset_id || '-'}${o.asset_link && o.asset_link !== 'consistent' ? `<div class="bd-note" style="color:var(--rag-red)">${o.asset_link.replace(/_/g, ' ')}</div>` : ''}</td>
        <td class="bd-mono">${o.contract || '-'}${o.entitlement && o.entitlement !== 'covered' ? `<div class="bd-note" style="color:var(--rag-red)">${o.entitlement.replace(/_/g, ' ')}</div>` : ''}</td><td class="bd-mono">${o.invoice || '-'}</td>
        <td class="num">${i && i.open_usd ? bdUsd(i.open_usd) : '-'}</td><td>${o.open_issues.map(x => `<button class="btn btn-ghost btn-sm" onclick="bdGoReview('${x}')">${x}</button>`).join('') || '-'}</td></tr>`; }).join('')}</tbody></table></div>`;
  } else {
    body = `<div class="bd-panel-b">${openIssues.length ? openIssues.map(x => { const d = bdDec(x.review_id); return `<div style="display:flex;gap:0.6rem;align-items:center;padding:0.45rem 0;border-bottom:1px solid var(--border-subtle);flex-wrap:wrap"><span class="bd-status ${bdDecClass(d)}">${d ? bdEsc(d.decision) : 'pending'}</span><span class="bd-mono">${x.review_id}</span>${bdSev(x.severity)}<span style="flex:1;min-width:12rem">${bdEsc(x.title)}</span><button class="btn btn-bd-outline btn-sm" onclick="bdGoReview('${x.review_id}')">Open in Review</button></div>`; }).join('') : '<div class="bd-empty">No open issues for this facility.</div>'}</div>`;
  }
  return `<div class="bd-panel" id="bd-fac-view" style="margin:0">
    <div class="bd-panel-h"><div><h2>${bdEsc(f.display_name)}</h2><div class="bd-note">${bdEsc(f.address || '')} &middot; DHC ${bdEsc(f.dhc_id || 'unknown')} &middot; ${bdEsc(f.payment_terms || '')} &middot; sold-to ${f.sold_to} &middot; payer ${f.payer}</div></div>
      <div class="bd-hint">${openIssues.filter(bdIsOpen).length} open issue${openIssues.filter(bdIsOpen).length === 1 ? '' : 's'}</div></div>
    <div class="bd-panel-b bd-hub">${hub}
      <div class="bd-legend" style="margin-top:0.5rem"><span style="--c:#0f766e">native / matched / approved</span><span style="--c:#d97706">candidate awaiting review</span><span style="--c:#dc2626">kept separate</span><span style="--c:#94a3b8">deferred</span></div></div>
    <div class="bd-tabs" role="tablist">${tabs.map(([k, l, n]) => `<button class="bd-tab ${bd.goldenTab === k ? 'on' : ''}" role="tab" aria-selected="${bd.goldenTab === k}" onclick="bdGoldenTab('${k}')">${l}<span class="n">${n}</span></button>`).join('')}</div>
    ${body}</div>`;
}

function bdAssetDetail(a) {
  const p = bdAssetPlacement(a), o = bdAssetOwner(a);
  const items = bdAssetItems(a.asset_id);
  const inv = bd.data.ar_exposure.invoices.filter(i => a.orders.includes(i.order));
  return `<div class="bd-panel-b" id="bd-asset-detail" style="border-top:1px solid var(--border)">
    <div class="bd-grid2">
      <div><div class="bd-h3">${a.asset_id} evidence timeline</div><ul class="bd-timeline">${a.timeline.map(t => `<li class="${t.facility && p.candidate && t.facility === p.candidate ? 'warn' : ''}"><span class="d">${t.date || 'undated'}</span> &middot; ${bdEsc(t.type.replace(/_/g, ' '))} <span class="bd-note">(${bdEsc(t.evidence_source)})</span><div>${bdEsc(t.text || 'no location given')} &rarr; <b>${bdEsc(bdShort(bdFacName(t.facility)))}</b> <span class="bd-mono bd-note">${t.rid}</span></div></li>`).join('')}</ul></div>
      <div><div class="bd-h3">Golden values</div>
        <div class="bd-meta"><div><span>Published site</span>${bdEsc(bdShort(bdFacName(p.facility)))} (${p.status})</div><div><span>Owner</span>${bdEsc(o.value || 'unknown')} (${o.status})</div><div><span>Serial</span><span class="bd-mono">${bdEsc(a.serial_normalized)}</span></div><div><span>UDI</span><span class="bd-mono">${bdEsc(a.udi || 'missing')}</span></div></div>
        ${a.location_evidence.length ? `<div class="bd-h3">Location reasoning</div><ul class="bd-evidence">${a.location_evidence.map(e => `<li>${bdEsc(e)}</li>`).join('')}</ul>` : ''}
        ${inv.length ? `<div class="bd-h3">Orders &rarr; invoices</div>${inv.map(i => `<div style="font-size:0.8125rem">${i.order} &rarr; ${i.invoice} &middot; ${i.open_usd ? `<b style="color:var(--rag-amber)">${bdUsd(i.open_usd)} open</b>` : 'paid'}</div>`).join('')}` : ''}
        ${items.length ? `<div class="bd-h3">Review items</div>${items.map(x => { const d = bdDec(x.review_id); return `<div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem"><span class="bd-status ${bdDecClass(d)}">${d ? bdEsc(d.decision) : 'pending'}</span><button class="btn btn-ghost btn-sm" onclick="bdGoReview('${x.review_id}')">${x.review_id}</button><span class="bd-note">${bdEsc(x.issue_type)}</span></div>`; }).join('')}` : ''}
      </div></div></div>`;
}
function bdGoReview(id) {
  const it = bdItem(id);
  if (!it) return;
  bd.applied = true; bdPersist();
  bd.queue = it.queue; bd.reviewSel = id; bd.reviewRules = null; bd.reviewSev = 'all'; bd.reviewStatus = 'all'; bd.reviewQuery = '';
  bd.full.workbench = true;
  navigateTo('workbench'); window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ════════════════════════════════════════════════════════════
//  5 · IMPACT
// ════════════════════════════════════════════════════════════
const BD_CAT_COLOR = { asset_relationship: '#dc2626', entitlement: '#d97706', system_mismatch: '#7c3aed', identifier_defect: '#0891b2', payer_gap: '#0f766e', missing_link: '#94a3b8', note_only: '#cbd5e1' };
function bdSetImpactCat(c) { bd.impactCat = bd.impactCat === c ? null : c; bd.impactInv = null; renderAll(); }
function bdSetImpactFac(g) { bd.impactFac = bd.impactFac === g ? null : g; bd.impactInv = null; renderAll(); }
function bdSelectInv(id) { bd.impactInv = bd.impactInv === id ? null : id; renderAll(); }

function bdRenderImpactFull() {
  const D = bd.data;
  const A = D.ar_exposure, T = A.totals, E = D.executive_summary;
  const items = D.review_queue.items;
  const decided = items.filter(x => bdDec(x.review_id));
  const openItems = items.filter(bdIsOpen);
  const idItems = items.filter(x => x.queue === 'identity');
  const sameEntity = idItems.filter(x => (bdDec(x.review_id) || {}).decision === 'Same entity').length;
  const cm = {}; E.change_metrics.forEach(m => { cm[m.id] = Object.assign({}, m); });
  const approvedLinks = D.match_candidates.candidates.filter(c => c.status === 'review' && c.review_item && (bdDec(c.review_item) || {}).decision === 'Same entity').length;
  cm.crm_mdm_links.after += approvedLinks;
  const ownerConfirmed = items.filter(x => x.issue_type === 'owner ERP number' && bdDec(x.review_id) && BD_POSITIVE.includes(bdDec(x.review_id).decision)).reduce((s, x) => s + (x.assets || []).length, 0);
  cm.asset_owner.after += ownerConfirmed;
  const change = Object.values(cm).map(m => `<div class="bd-kpi"><div class="v">${m.before} &rarr; <span style="color:var(--bd-dark)">${m.after}</span><span style="font-size:0.8125rem;color:var(--text-tertiary);font-weight:600"> / ${m.total}</span></div><div class="l">${bdEsc(m.label)}</div><div class="s">${bdEsc(m.basis)}</div></div>`).join('');

  // concentration
  const P = D.source_profiles.sources;
  const byFile = P.map(p => ({ code: p.code, label: p.label, n: D.dq_findings.findings.filter(f => f.source === p.code && (f.severity === 'high' || f.severity === 'medium')).length, st: p.overall_status })).sort((a, b) => b.n - a.n);
  const maxF = Math.max(...byFile.map(x => x.n), 1);
  const byRule = D.dq_rules.rules.filter(r => r.severity === 'high' || r.severity === 'medium').filter(r => r.affected).sort((a, b) => b.affected - a.affected).slice(0, 7);
  const maxR = Math.max(...byRule.map(r => r.affected), 1);
  const byEdge = D.er_graph.edges.map(e => ({ e, n: e.review + e.unresolved })).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 6);
  const maxE = Math.max(...byEdge.map(x => x.n), 1);
  const ragC = { red: '#dc2626', amber: '#d97706', green: '#059669', 'n/a': '#cbd5e1' };

  // AR
  const cats = A.by_category.filter(c => c.open_usd_primary > 0);
  const stack = cats.map(c => `<i style="width:${c.open_usd_primary / T.open_usd * 100}%;background:${BD_CAT_COLOR[c.category]}" title="${bdEsc(c.label)}: ${bdUsd(c.open_usd_primary)}"></i>`).join('');
  const maxAging = Math.max(...A.aging.map(a => a.open_usd), 1);
  let inv = A.invoices.filter(i => i.open_usd > 0);
  if (bd.impactCat) inv = inv.filter(i => i.primary_category === bd.impactCat);
  if (bd.impactFac) inv = inv.filter(i => i.facility === bd.impactFac);
  inv.sort((a, b) => b.open_usd - a.open_usd);
  const invRows = inv.map(i => {
    const ri = i.review_items.map(bdItem).filter(Boolean);
    const done = ri.filter(x => !bdIsOpen(x)).length;
    const sel = bd.impactInv === i.invoice;
    return `<tr class="clickable ${sel ? 'sel' : ''}" onclick="bdSelectInv('${i.invoice}')"><td class="bd-mono" style="color:var(--text-primary)">${i.invoice}</td><td>${bdEsc(bdShort(i.facility_name))}</td><td class="bd-mono">${i.order}</td><td class="bd-mono">${i.asset_id || '-'}</td>
      <td class="num" style="font-weight:700;color:var(--text-primary)">${bdUsd(i.open_usd)}</td><td>${i.aging_bucket}</td>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${BD_CAT_COLOR[i.primary_category] || '#e2e8f0'};margin-right:0.35rem"></span>${bdEsc((A.category_labels[i.primary_category] || 'No issue identified'))}${i.categories.length > 1 ? `<div class="bd-note">+${i.categories.length - 1} more</div>` : ''}</td>
      <td>${ri.length ? `<span class="bd-status ${done === ri.length ? 'done' : ''}">${done}/${ri.length} decided</span>` : '<span class="bd-note">no review item</span>'}</td></tr>
      ${sel ? `<tr><td colspan="8" style="background:var(--surface-subtle);padding:0.85rem 1rem">${bdInvoicePath(i)}</td></tr>` : ''}`;
  }).join('');

  // owners
  const owners = {};
  items.forEach(x => { const o = owners[x.owner] = owners[x.owner] || { open: 0, total: 0, ar: 0, items: [] }; o.total++; if (bdIsOpen(x)) { o.open++; o.items.push(x); } });
  Object.values(owners).forEach(o => { o.ar = bdDistinctAr(o.items); });
  const ownerRows = Object.entries(owners).sort((a, b) => b[1].ar - a[1].ar || b[1].open - a[1].open).map(([name, o]) => `<tr><td style="font-weight:600;color:var(--text-primary)">${bdEsc(name)}</td><td class="num">${o.open} / ${o.total}</td><td class="num">${o.ar ? bdUsd(o.ar) : '-'}</td>
    <td>${o.items.slice(0, 3).map(x => `<div><button class="btn btn-ghost btn-sm" style="padding:0.05rem 0.2rem" onclick="bdGoReview('${x.review_id}')">${x.review_id}</button> ${bdEsc(x.title)}</div>`).join('') || '<span style="color:var(--rag-green)">all decided</span>'}</td></tr>`).join('');

  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdHead('What may matter for receivables?', bdEsc(E.headline))}
    <div class="bd-callout warn" style="margin-bottom:1.25rem">${bdEsc(A.caveat)} Each invoice is counted once (${bdEsc(A.count_logic.split('. ')[1] || '')}).</div>

    <div class="bd-panel" id="bd-impact-change"><div class="bd-panel-h"><h2>1 &middot; What changed after review</h2><span class="bd-hint">${decided.length} of ${items.length} items decided &middot; ${openItems.length} open (${openItems.filter(x => x.severity === 'high').length} high) &middot; ${sameEntity} of ${idItems.length} duplicates confirmed</span></div>
      <div class="bd-panel-b"><div class="bd-kpis" style="margin:0">${change}</div></div></div>

    <div class="bd-panel"><div class="bd-panel-h"><h2>2 &middot; Where the problems are concentrated</h2><span class="bd-hint">high + medium findings; review and unresolved edges</span></div>
      <div class="bd-panel-b bd-grid2" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
        <div><div class="bd-h3">By system</div>${byFile.map(x => `<div class="bd-hbar clickable" onclick="bdSelectSource('${x.code}');navigateTo('raw')" title="${x.n} findings, ${x.st}"><span class="lab">${x.code} ${bdEsc(x.label)}</span><span class="trk"><i style="width:${x.n / maxF * 100}%;background:${ragC[x.st]}"></i></span><span class="val">${x.n}</span></div>`).join('')}</div>
        <div><div class="bd-h3">By field / rule</div>${byRule.map(r => `<div class="bd-hbar" title="${bdEsc(r.title)}"><span class="lab"><span class="bd-mono">${r.rule_id}</span> ${bdEsc(r.fields.join(', '))}</span><span class="trk"><i style="width:${r.affected / maxR * 100}%;background:${r.severity === 'high' ? '#dc2626' : '#d97706'}"></i></span><span class="val">${r.affected}</span></div>`).join('')}</div>
        <div><div class="bd-h3">By relationship</div>${byEdge.map(x => `<div class="bd-hbar clickable" onclick="bdOpenEr();bd.erSel='${x.e.id}';bdRenderOverlay()" title="${bdEsc(x.e.evidence)}"><span class="lab">${bdEsc(x.e.label)}</span><span class="trk"><i style="width:${x.e.review / maxE * 100}%;background:#d97706"></i><i style="width:${x.e.unresolved / maxE * 100}%;background:#94a3b8"></i></span><span class="val">${x.n}</span></div>`).join('')}<div class="bd-legend" style="margin-top:0.4rem"><span style="--c:#d97706">review / conflict</span><span style="--c:#94a3b8">unresolved</span></div></div>
      </div></div>

    <div class="bd-panel" id="bd-impact-ar"><div class="bd-panel-h"><h2>3 &middot; What may matter: open AR on impacted joins</h2><span class="bd-hint">as of ${A.as_of}</span></div>
      <div class="bd-panel-b">
        <div class="bd-kpis">
          <div class="bd-kpi"><div class="v">${bdUsd(T.open_usd)}</div><div class="l">Open AR</div><div class="s">${T.open_invoices} invoices with an open amount</div></div>
          <div class="bd-kpi bad"><div class="v">${bdUsd(T.associated_usd)}</div><div class="l">Associated with an identified issue</div><div class="s">${T.associated_invoices} invoices &middot; ${bdPct(T.associated_usd / T.open_usd)} of open AR</div></div>
          <div class="bd-kpi warn"><div class="v">${bdUsd(T.note_only_usd + T.missing_link_usd)}</div><div class="l">Flagged in notes, not corroborated</div><div class="s">${bdUsd(T.missing_link_usd)} missing link &middot; ${bdUsd(T.note_only_usd)} note only</div></div>
          <div class="bd-kpi"><div class="v">${bdUsd(T.no_issue_usd)}</div><div class="l">No issue found</div><div class="s">${A.exclusions.length} zero-balance 'Open' invoices excluded</div></div>
        </div>
        <div class="bd-grid2">
          <div><div class="bd-h3">Open AR by primary issue (click to filter)</div><div class="bd-stack">${stack}</div>
            ${cats.map(c => `<div class="bd-hbar clickable ${bd.impactCat === c.category ? 'on' : ''}" onclick="bdSetImpactCat('${c.category}')"><span class="lab"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${BD_CAT_COLOR[c.category]};margin-right:0.35rem"></span>${bdEsc(c.label)}</span><span class="trk"><i style="width:${c.open_usd_primary / T.open_usd * 100}%;background:${BD_CAT_COLOR[c.category]}"></i></span><span class="val">${bdUsdK(c.open_usd_primary)}</span></div>`).join('')}
            <div class="bd-note" style="margin-top:0.4rem">${A.by_category.filter(c => c.invoices_any > c.invoices_primary).map(c => `${bdEsc(c.label)} also touches ${c.invoices_any - c.invoices_primary} invoice(s) counted elsewhere`).join(' &middot; ')}</div></div>
          <div><div class="bd-h3">Aging (associated vs other open AR)</div>
            ${A.aging.map(a => `<div class="bd-hbar" title="${a.invoices} invoices"><span class="lab">${a.bucket} days</span><span class="trk"><i style="width:${a.associated_usd / maxAging * 100}%;background:#dc2626"></i><i style="width:${(a.open_usd - a.associated_usd) / maxAging * 100}%;background:#cbd5e1"></i></span><span class="val">${bdUsdK(a.open_usd)}</span></div>`).join('')}
            <div class="bd-legend" style="margin-top:0.4rem"><span style="--c:#dc2626">associated with an issue</span><span style="--c:#cbd5e1">other open AR</span></div>
            <div class="bd-h3">By facility (click to filter)</div>
            ${A.by_facility.filter(x => x.open_usd).map(x => `<div class="bd-hbar clickable ${bd.impactFac === x.golden_facility_id ? 'on' : ''}" onclick="bdSetImpactFac('${x.golden_facility_id}')"><span class="lab">${bdEsc(bdShort(x.name))}</span><span class="trk"><i style="width:${x.associated_usd / maxAging * 100}%;background:#dc2626"></i><i style="width:${(x.open_usd - x.associated_usd) / maxAging * 100}%;background:#cbd5e1"></i></span><span class="val">${bdUsdK(x.open_usd)}</span></div>`).join('')}
          </div>
        </div>
        <div class="bd-h3" style="margin-top:1.25rem">Invoice drilldown ${bd.impactCat || bd.impactFac ? `<button class="btn btn-ghost btn-sm" onclick="bd.impactCat=null;bd.impactFac=null;renderAll()">Clear filters &#10005;</button>` : ''}</div>
        <div class="bd-scroll"><table class="bd-table"><thead><tr><th>Invoice</th><th>Facility</th><th>Order</th><th>Asset</th><th class="num">Open</th><th>Aging</th><th>Primary issue</th><th>Review</th></tr></thead><tbody>${invRows}</tbody>
          <tfoot><tr><td colspan="4" style="font-weight:700">${inv.length} invoice${inv.length === 1 ? '' : 's'}</td><td class="num" style="font-weight:800">${bdUsd(inv.reduce((s, i) => s + i.open_usd, 0))}</td><td colspan="3"></td></tr></tfoot></table></div>
      </div></div>

    <div class="bd-panel" id="bd-impact-next"><div class="bd-panel-h"><h2>4 &middot; What to do next</h2><span class="bd-hint">source owners and the corrections waiting on them (live)</span></div>
      <div class="table-wrapper"><table class="bd-table"><thead><tr><th>Owner</th><th class="num">Open / total items</th><th class="num">Open AR behind open items</th><th>Next corrections</th></tr></thead><tbody>${ownerRows}</tbody></table></div>
      <div class="bd-panel-b bd-note">${E.claims.map(c => `<div>&middot; ${bdEsc(c.text)}</div>`).join('')}</div></div>
    ${bdNext(`${BD_LABEL}. Figures are computed from the delivered extracts by run ${D.manifest.run_id}; decisions are a simulation stored in this browser.`, null, '')}
    ${renderPageHelpPanel()}
  </div>`;
}

function bdInvoicePath(i) {
  const o = bd.data.golden_entities.orders.find(x => x.order_id === i.order) || {};
  const a = i.asset_id ? bd.data.golden_entities.assets.find(x => x.asset_id === i.asset_id) : null;
  const bad = c => i.categories.includes(c) ? 'bad' : '';
  const ri = i.review_items.map(bdItem).filter(Boolean);
  return `<div class="bd-path">
      <div class="s ${bad('payer_gap')}"><b>Invoice</b>${i.invoice} &middot; ${bdUsd(i.open_usd)} open &middot; payer ${bdEsc(i.payer || 'blank')}</div>&rarr;
      <div class="s ${bad('system_mismatch')}"><b>Order</b>${i.order} &middot; ${bdEsc(o.type || '')} &middot; ${bdEsc((o.client || '').replace('_', ' '))}</div>&rarr;
      <div class="s ${bad('asset_relationship') || bad('identifier_defect') || bad('missing_link')}"><b>Asset</b>${a ? `${a.asset_id} (${bdEsc(a.serial)})` : 'no serial on order'}</div>&rarr;
      <div class="s ${bad('entitlement')}"><b>Contract</b>${bdEsc(o.contract || 'none linked')}${o.entitlement && o.entitlement !== 'covered' ? ' &middot; ' + o.entitlement.replace(/_/g, ' ') : ''}</div>&rarr;
      <div class="s"><b>Facility</b>${bdEsc(bdShort(i.facility_name))}</div></div>
    <div class="bd-grid2" style="margin-top:0.75rem">
      <div><div class="bd-h3">Evidence</div><ul class="bd-evidence">${i.evidence.map(e => `<li>${bdEsc(e)}</li>`).join('')}</ul>${i.collection_note ? `<div class="bd-note">Collection note: "${bdEsc(i.collection_note)}"</div>` : ''}</div>
      <div><div class="bd-h3">Linked review items</div>${ri.length ? ri.map(x => { const d = bdDec(x.review_id); return `<div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem;flex-wrap:wrap"><span class="bd-status ${bdDecClass(d)}">${d ? bdEsc(d.decision) : 'pending'}</span><button class="btn btn-ghost btn-sm" onclick="bdGoReview('${x.review_id}')">${x.review_id}</button><span class="bd-note">${bdEsc(x.title)}</span></div>`; }).join('') : '<div class="bd-note">None - this invoice is flagged only by its collection note.</div>'}
        <div class="bd-note" style="margin-top:0.4rem">Source rows: <span class="bd-mono">${i.rid}${i.order_rid ? ', ' + i.order_rid : ''}${a ? ', ' + a.rid : ''}</span></div></div></div>`;
}

// ════════════════════════════════════════════════════════════
//  Routing, overlay, landing card, upload, demo
// ════════════════════════════════════════════════════════════
function bdPage() {
  if (bd.status === 'error') return `<div class="page active bd-page"><div class="bd-panel"><div class="bd-empty">${icon('alertTriangle', 'icon-xl')}<div style="margin-top:0.5rem;font-weight:700;color:var(--text-primary)">The run could not be loaded</div><div class="bd-note" style="max-width:36rem;margin:0.4rem auto">${bdEsc(bd.error)}</div><div class="bd-note">Regenerate with: <span class="bd-mono">uv run pipeline/bd_pipeline.py generate --input 282_BD_MMS_Rebuilt_Raw_Source_Data.zip --output public/bd</span></div><button class="btn btn-bd" onclick="bd.status='idle';bdLoad()">Try again</button></div></div></div>`;
  if (!bd.data) { if (bd.status === 'idle') setTimeout(bdLoad, 0); return `<div class="bd-loading"><div class="bd-spin"></div><div>Loading run and validating the manifest...</div></div>`; }
  const full = bd.full[state.currentPage];
  switch (state.currentPage) {
    case 'raw': return full ? bdRenderSourcesFull() : bdRenderSources();
    case 'mapping': return full ? bdRenderMapFull() : bdRenderMap();
    case 'workbench': return full ? bdRenderReviewFull() : bdRenderReview();
    case 'golden': return full ? bdRenderGoldenFull() : bdRenderGolden();
    case 'search': return full ? bdRenderImpactFull() : bdRenderImpact();
    default: return bdRenderSources();
  }
}
function bdRenderOverlay() {
  let el = document.getElementById('bd-overlay');
  if (!el) { el = document.createElement('div'); el.id = 'bd-overlay'; document.body.appendChild(el); }
  const show = state.activeDataset === 'bd' && bd.data && !['landing', 'upload'].includes(state.currentPage);
  el.innerHTML = show && bd.erOpen ? bdRenderEr() : show && bd.sqlOpen ? bdRenderSqlDrawer() : '';
  if (show && bd.erOpen) bdErWire();
}
const _bdPrevRenderPage = renderPage;
renderPage = function () {
  if (state.activeDataset !== 'bd' || ['landing', 'upload'].includes(state.currentPage) || state.transitioning) {
    _bdPrevRenderPage();
    bdRenderOverlay();
    return;
  }
  document.getElementById('main-content').innerHTML = bdPage();
  bdRenderOverlay();
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.activeDataset === 'bd' && (bd.erOpen || bd.sqlOpen)) bdCloseOverlay();
});

const _bdPrevSelect = selectDataset;
selectDataset = function (ds) {
  if (ds === 'bd') { bdResetUi(); if (!bd.data && bd.status !== 'loading') bdLoad(); }
  _bdPrevSelect(ds);
};

function bdBundleStats() {
  const b = window.BD_BUNDLE;
  if (!b) return null;
  const P = b.source_profiles.sources;
  return { files: P.length, records: P.reduce((s, p) => s + p.record_count, 0), findings: b.dq_findings.findings.length,
    rules: b.dq_rules.rules.length, review: b.review_queue.items.length, assoc: b.ar_exposure.totals.associated_usd, open: b.ar_exposure.totals.open_usd };
}
UPLOAD_STAGES.bd = (() => {
  const s = bdBundleStats();
  return [
    { msg: 'Reading 10 extracts from the delivered zip (Reltio, SAP/JDE, Salesforce)...', pct: 14 },
    { msg: 'Reading install base, movements, field service, orders and billing...', pct: 30 },
    { msg: 'Checking the run manifest and input hash...', pct: 46 },
    { msg: `Profiling ${s ? s.records : ''} records against ${s ? s.rules : ''} documented rules...`, pct: 62 },
    { msg: `${s ? s.findings : ''} findings recorded with row-level evidence...`, pct: 80 },
    { msg: `Ready - ${s ? s.files : 10} sources profiled`, pct: 100 },
  ];
})();

function renderBDLandingCard() {
  const s = bdBundleStats();
  const C = '#0f766e';
  const metrics = s ? [
    { v: String(s.records), l: 'Source Records', c: C },
    { v: String(s.findings), l: 'Findings', c: 'var(--amber)' },
    { v: bdUsdK(s.assoc), l: 'Open AR at Risk', c: 'var(--danger)' },
  ] : [{ v: '10', l: 'Source Extracts', c: C }, { v: '5', l: 'Screens', c: C }, { v: '-', l: 'Run not built', c: 'var(--amber)' }];
  return `<div onclick="selectDataset('bd')" style="cursor:pointer;border:1px solid rgba(15,118,110,0.24);background:linear-gradient(145deg,rgba(15,118,110,0.08) 0%,rgba(255,255,255,0.98) 72%);border-radius:var(--radius-lg);overflow:hidden;transition:transform 0.2s,box-shadow 0.2s;box-shadow:var(--shadow-md)" onmouseenter="this.style.transform='translateY(-5px)';this.style.boxShadow='0 20px 50px rgba(15,118,110,0.16)'" onmouseleave="this.style.transform='';this.style.boxShadow='var(--shadow-md)'">
    <div style="padding:0.4rem 1rem;background:rgba(15,118,110,0.08);border-bottom:1px solid rgba(15,118,110,0.16);display:flex;align-items:center;gap:0.5rem">
      <span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.6rem;font-weight:800;color:${C};text-transform:uppercase;letter-spacing:0.1em">${icon('shield', 'icon-xs')} Scenario 4 &middot; Medical Technology</span>
      <span class="badge badge-cyan" style="font-size:0.5rem;margin-left:auto">INSTALLED BASE + AR</span>
    </div>
    <div style="padding:1.75rem">
      <div style="display:flex;align-items:flex-start;gap:1rem;margin-bottom:1rem">
        <div style="width:3.25rem;height:3.25rem;border-radius:0.875rem;background:rgba(15,118,110,0.1);border:1px solid rgba(15,118,110,0.24);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${C}">${icon('activity', 'icon-xl')}</div>
        <div><h2 style="font-size:1.1875rem;font-weight:800;color:var(--text-primary);margin-bottom:0.2rem">Installed Base &amp; Receivables</h2>
        <p style="color:var(--text-tertiary);font-size:0.8125rem">10 extracts &rarr; connected customer, asset and invoice view</p></div>
      </div>
      <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.65;margin-bottom:1.25rem">Dispensing cabinets and infusion pumps move between hospitals, but the install base, MDM, ERP and CRM each tell a different story. The pipeline profiles every extract, proposes evidence-backed joins, routes the doubtful ones to reviewers, and shows <strong style="color:var(--text-primary)">which open invoices sit on broken relationships</strong>.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.625rem;padding:0.875rem 0;border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);margin-bottom:1.25rem">
        ${metrics.map(m => `<div style="text-align:center"><div style="font-size:1.375rem;font-weight:900;color:${m.c};line-height:1">${m.v}</div><div style="font-size:0.6rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;margin-top:0.2rem">${m.l}</div></div>`).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:0.35rem">
        ${[['Reltio MDM + SAP / JDE customer accounts', 'CSV', 'rgba(15,118,110,0.75)'], ['Salesforce accounts, contacts, contracts', 'CSV', 'rgba(15,118,110,0.75)'], ['Install base, movements, field service', 'CSV', 'rgba(245,158,11,0.76)'], ['SAP sales orders + billing & receivables', 'CSV', 'rgba(8,145,178,0.78)']].map(([t, f, c]) => `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--text-tertiary)"><span style="color:${c};flex-shrink:0">${icon('fileText', 'icon-xs')}</span>${t}<span style="margin-left:auto;font-size:0.6rem;font-weight:700;color:var(--text-secondary);background:var(--surface-muted);border:1px solid var(--border-subtle);padding:0.1rem 0.4rem;border-radius:4px">${f}</span></div>`).join('')}
      </div>
    </div>
    <div style="padding:0.875rem 1.75rem;background:rgba(15,118,110,0.06);border-top:1px solid rgba(15,118,110,0.14);display:flex;align-items:center;justify-content:space-between">
      <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.875rem;font-weight:700;color:${C}">${icon('zap', 'icon-xs')} Start Installed Base Demo</span>
      <div style="display:flex;align-items:center;gap:0.25rem;color:${C}">${icon('arrowRight', 'icon-sm')}</div>
    </div>
  </div>`;
}

const _bdPrevScript = getActiveDemoScript;
getActiveDemoScript = function () { return state.activeDataset === 'bd' ? BD_DEMO_SCRIPT : _bdPrevScript(); };
const _bdPrevStartDemo = startDemo;
startDemo = function () {
  if (state.activeDataset === 'bd' && !demoRunning) { bd.erOpen = false; bd.sqlOpen = false; bd.srcSel = null; bd.mapSel = null; }
  _bdPrevStartDemo();
};

// ════════════════════════════════════════════════════════════
//  STORY VIEWS (default) - Simplification PRD
//  Each page answers one question; the technical views above stay
//  reachable through "Inspect mapping", "See evidence", "Explore AR"...
// ════════════════════════════════════════════════════════════
function bdSetFull(page, on) { bd.full[page] = on; renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function bdStoryHead(title, sub, actions) {
  return `<div class="bd-head"><div><h1 class="bd-title">${title}</h1><div class="bd-sub">${sub}</div></div><div class="bd-head-actions">${actions || ''}${renderPageHelpButton()}</div></div>`;
}
function bdPlural(n, one, many) { return `${n} ${n === 1 ? one : (many || one + 's')}`; }
const BD_RULE_PLAIN = {
  'C-06-OWNER': 'Assets with no owner ERP account', 'F-ASSET-LOC': 'Assets whose location evidence conflicts',
  'B-ORDER-LOC': 'Orders tied to a facility the asset has left', 'B-ENTITLE-01': 'Orders billed on an expired or open-ended contract',
  'C-10-PAYER': 'Invoices with no payer account', 'C-09-PAYER': 'Orders with no payer', 'V-SERIAL': 'Serials typed with the letter O for zero',
  'U-DUP-ENTITY': 'Duplicate facility records', 'C-05-ACCT': 'Contracts with no customer account', 'B-PO-01': 'Orders missing a PO their contract requires',
  'S-NAME': 'Facility names typed inconsistently', 'C-09-SERIAL': 'Device orders with no serial', 'C-08-IDS': 'Service visits that name no device',
  'S-ORDER-SYS': 'Orders booked in a different ERP than the account', 'C-06-UDI': 'Assets with no UDI', 'C-03-ACCT': 'Contacts with no account',
  'R-01-PARENT': 'Facility points at a missing parent', 'R-02-PARENT': 'ERP role points at a missing parent', 'C-02-PARENT': 'ERP roles with no parent',
  'U-02-NATIVE': 'Same ERP customer number in two systems', 'R-09-ASSET': 'Order serials that match only after cleanup', 'C-01-PARENT': 'Facility profiles with no parent',
};
function bdPlain(ruleId) { return BD_RULE_PLAIN[ruleId] || (bd.ruleIndex[ruleId] || {}).title || ruleId; }

// ── 1 · Sources: "Where are the data breaks?" ─────────────
function bdProblemAreas() {
  const R = bd.ruleIndex, A = bd.data.ar_exposure.totals;
  const aff = id => (R[id] || {}).affected || 0, elig = id => (R[id] || {}).eligible || 0;
  return [
    { id: 'ib', title: 'Installed base & ownership', n: aff('C-06-OWNER'), of: elig('C-06-OWNER'), what: 'assets have no owner account',
      so: `They can't be tied to the account that is billed; ${bdPlural(aff('F-ASSET-LOC'), 'more asset has', 'more assets have')} conflicting location evidence.`, src: '06', rule: 'C-06-OWNER' },
    { id: 'oc', title: 'Orders & contracts', n: aff('B-ENTITLE-01'), of: elig('B-ENTITLE-01'), what: 'covered orders bill on an expired or open-ended contract',
      so: `${bdPlural(aff('C-05-ACCT'), 'contract has', 'contracts have')} no customer account, so their orders show no entitlement at all.`, src: '09', rule: 'B-ENTITLE-01' },
    { id: 'bp', title: 'Billing & payer', n: A.associated_invoices, of: A.open_invoices, what: 'open invoices sit on a broken relationship',
      so: `${bdPlural(aff('C-10-PAYER'), 'invoice has', 'invoices have')} no payer account, so collections can't be routed.`, src: '10', rule: 'C-10-PAYER' },
  ];
}
function bdOpenArea(src, rule) { bd.srcSel = src; bd.srcTab = 'rows'; bd.ruleFilter = rule; bd.showAllRows = true; renderAll(); setTimeout(() => { const el = document.getElementById('bd-src-detail'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }

function bdRenderSources() {
  const D = bd.data;
  const P = D.source_profiles.sources;
  const F = D.dq_findings.findings;
  const att = { red: ['Needs attention', 'red'], amber: ['Review', 'amber'], green: ['OK', 'green'] };
  const top = D.dq_rules.rules.filter(r => r.affected && (r.severity === 'high' || r.severity === 'medium'))
    .sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1) || b.affected - a.affected || a.rule_id.localeCompare(b.rule_id)).slice(0, 6);
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdStoryHead('Where are the data breaks?', 'Ten source extracts; start with issues that affect relationships and receivables.',
      `<button class="btn btn-bd-outline" onclick="bdSetFull('raw', true)">All findings</button>`)}
    <div class="bd-story-cards" id="bd-areas">
      ${bdProblemAreas().map(a => `<button class="bd-area" onclick="bdOpenArea('${a.src}','${a.rule}')">
        <div class="k">${a.title}</div>
        <div class="v">${a.n}<span> of ${a.of}</span></div>
        <div class="w">${a.what}</div>
        <div class="c">${a.so}</div>
        <div class="go">See evidence ${icon('arrowRight')}</div></button>`).join('')}
    </div>
    <div class="bd-grid2 bd-story-split">
      <div class="bd-panel" style="margin:0"><div class="bd-panel-h"><h2>Sources</h2><span class="bd-hint">click for profile, rows and issues</span></div>
        <table class="bd-table"><thead><tr><th>Extract</th><th class="num">Records</th><th>Attention</th><th class="num">Material findings</th></tr></thead><tbody>
        ${P.map(p => { const n = F.filter(f => f.source === p.code && (f.severity === 'high' || f.severity === 'medium')).length; const [l, c] = att[p.overall_status] || ['-', 'na'];
          return `<tr class="clickable ${bd.srcSel === p.code ? 'sel' : ''}" tabindex="0" onclick="bdSelectSource('${p.code}')" onkeydown="if(event.key==='Enter')bdSelectSource('${p.code}')"><td><b style="color:var(--text-primary)">${bdEsc(p.label)}</b><div class="bd-note">${bdEsc(p.system)}</div></td><td class="num">${p.record_count}</td><td><span class="rag ${c}">${l}</span></td><td class="num">${n}</td></tr>`; }).join('')}
        </tbody></table></div>
      <div class="bd-panel" style="margin:0" id="bd-top-issues"><div class="bd-panel-h"><h2>Top issues</h2><span class="bd-hint">high severity first</span></div>
        <div class="bd-panel-b">${top.map((r, i) => { const code = Object.keys(r.affected_by_file)[0];
          return `<button class="bd-issue-row" onclick="bdOpenArea('${code}','${r.rule_id}')"><span class="rk">${i + 1}</span><span class="t">${bdEsc(bdPlain(r.rule_id))}<span class="bd-note"> &middot; ${bdEsc(bdSrc(code).label)}</span></span>${bdSev(r.severity)}<span class="n">${r.affected}</span></button>`; }).join('')}</div></div>
    </div>
    ${bd.srcSel ? bdRenderSourceDetail(bd.srcSel) : ''}
    ${bdNext('Profiling only observes; nothing has been changed. Next: which relationships these gaps break.', 'mapping', 'What relationships break?')}
    ${renderPageHelpPanel()}
  </div>`;
}

// ── 2 · Connections: "What relationships break?" ──────────
function bdChain() {
  const D = bd.data, R = bd.ruleIndex;
  const E = id => D.er_graph.edges.find(e => e.id === id) || { matched: 0, review: 0, unresolved: 0 };
  const aff = id => (R[id] || {}).affected || 0;
  const inv = D.ar_exposure.invoices.filter(i => i.open_usd > 0);
  const ar = cats => { const xs = inv.filter(i => i.categories.some(c => cats.includes(c))); return { usd: xs.reduce((s, i) => s + i.open_usd, 0), n: xs.length }; };
  return [
    { id: 'cf', from: 'Customer', to: 'Facility', ok: E('E01').matched + E('E02').matched, okL: 'MDM / CRM records tied to a facility',
      review: E('E01').review + E('E02').review, reviewL: 'duplicate facility records', unresolved: aff('R-01-PARENT') + aff('R-02-PARENT') + aff('C-02-PARENT'), unresolvedL: 'broken parent links',
      edges: ['E01', 'E02'], ar: ar([]), headline: 'Facility recorded more than once' },
    { id: 'fa', from: 'Facility', to: 'Asset', ok: E('E12').matched, okL: 'assets with an owner account',
      review: aff('F-ASSET-LOC'), reviewL: 'assets with conflicting location', unresolved: E('E12').unresolved, unresolvedL: 'assets with no owner account',
      edges: ['E12', 'E13'], ar: ar([]), headline: 'Assets with no owner account' },
    { id: 'ao', from: 'Asset', to: 'Order', ok: Math.max(E('E10').matched - E('E11').review, 0), okL: 'orders consistent with the asset site',
      review: E('E11').review, reviewL: 'orders tied to a site the asset left', unresolved: aff('C-09-SERIAL'), unresolvedL: 'device orders with no serial',
      edges: ['E10', 'E11'], ar: ar(['asset_relationship', 'identifier_defect']), headline: 'Orders tied to a site the asset has left' },
    { id: 'oc', from: 'Order', to: 'Contract', ok: E('E14').matched, okL: 'orders covered by an active contract',
      review: E('E14').review, reviewL: 'orders on an expired / open-ended contract', unresolved: E('E14').unresolved, unresolvedL: 'orders with no linked contract',
      edges: ['E14', 'E04'], ar: ar(['entitlement']), headline: 'Orders billed on an expired or open-ended contract' },
    { id: 'ci', from: 'Contract', to: 'Invoice', ok: E('E05').matched - E('E07').unresolved, okL: 'invoices with order and payer',
      review: aff('S-ORDER-SYS'), reviewL: 'orders booked in the wrong ERP', unresolved: E('E07').unresolved, unresolvedL: 'invoices with no payer',
      edges: ['E05', 'E07', 'E06'], ar: ar(['payer_gap', 'system_mismatch']), headline: 'Invoices with no payer, or booked in the wrong ERP' },
  ];
}
function bdSelectLink(id) { bd.chainSel = bd.chainSel === id ? null : id; renderAll(); }
function bdRenderMap() {
  const D = bd.data;
  const chain = bdChain();
  const breaks = chain.filter(l => l.review + l.unresolved > 0)
    .sort((a, b) => b.ar.usd - a.ar.usd || (b.review + b.unresolved) - (a.review + a.unresolved) || a.id.localeCompare(b.id)).slice(0, 3);
  const sel = chain.find(l => l.id === bd.chainSel);
  const pill = (n, cls, l) => `<span class="bd-pill ${cls}" title="${bdEsc(l)}">${n}</span>`;
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdStoryHead('What relationships break?', 'Customer to invoice, one chain. Each link shows what joins cleanly, what needs review and what cannot be resolved.',
      `<button class="btn btn-bd-outline" onclick="bdOpenEr()">${icon('gitMerge')} Relationship diagram</button>
       <button class="btn btn-bd-outline" onclick="bdSetFull('mapping', true)">Inspect mapping</button>
       <button class="btn btn-bd" id="bd-apply-btn" onclick="bdApply()" ${bd.applying ? 'disabled' : ''}>${icon('zap')} ${bd.applied ? 'Re-apply mappings' : 'Apply mappings'}</button>`)}
    ${bd.applying || bd.applyStep >= 0 ? bdApplyPanel() : ''}
    <div class="bd-panel" id="bd-chain"><div class="bd-panel-b">
      <div class="bd-chain">${chain.map(l => `<button class="bd-link ${bd.chainSel === l.id ? 'sel' : ''}" onclick="bdSelectLink('${l.id}')" aria-pressed="${bd.chainSel === l.id}">
        <div class="ends"><span>${l.from}</span>${icon('arrowRight')}<span>${l.to}</span></div>
        <div class="pills">${pill(l.ok, 'ok', l.okL)}${pill(l.review, 'rev', l.reviewL)}${pill(l.unresolved, 'unr', l.unresolvedL)}</div>
        <div class="bd-note">${l.review + l.unresolved ? bdEsc(l.review ? l.reviewL : l.unresolvedL) : 'joins cleanly'}</div></button>`).join('')}</div>
      <div class="bd-legend" style="margin-top:0.75rem"><span style="--c:#0f766e">joins on a native key or approved match</span><span style="--c:#d97706">needs review / conflicting</span><span style="--c:#94a3b8">unresolved</span></div>
      ${sel ? bdLinkDetail(sel) : ''}
    </div></div>
    <div class="bd-panel" id="bd-breaks"><div class="bd-panel-h"><h2>Biggest breaks</h2><span class="bd-hint">ranked by open AR on the affected invoices, then volume</span></div>
      <div class="bd-panel-b">${breaks.map((l, i) => `<button class="bd-issue-row" onclick="bdSelectLink('${l.id}')"><span class="rk">${i + 1}</span><span class="t">${bdEsc(l.headline)}<span class="bd-note"> &middot; ${l.from} &rarr; ${l.to}</span></span>
        <span class="bd-note">${l.review ? `${l.review} ${bdEsc(l.reviewL)}` : ''}${l.review && l.unresolved ? ' &middot; ' : ''}${l.unresolved ? `${l.unresolved} ${bdEsc(l.unresolvedL)}` : ''}</span>
        <span class="n">${l.ar.usd ? bdUsdK(l.ar.usd) + ' AR' : '&nbsp;'}</span></button>`).join('')}</div></div>
    ${bdNext(bd.applied ? `${bdPlural(D.review_queue.items.length, 'proposal is', 'proposals are')} ready for review.` : 'Apply the mappings to turn these breaks into review proposals. Nothing is written back to the source systems.',
      bd.applied ? 'workbench' : null, 'Where is judgment needed?')}
    ${!bd.applied ? `<div style="display:flex;justify-content:flex-end;margin-top:-0.5rem"><button class="btn btn-bd" onclick="bdApply()" ${bd.applying ? 'disabled' : ''}>${icon('zap')} Apply mappings</button></div>` : ''}
    ${renderPageHelpPanel()}
  </div>`;
}
function bdLinkDetail(l) {
  const E = bd.data.er_graph.edges;
  return `<div class="bd-link-detail">
    <div class="bd-meta"><div><span>Joins</span>${l.ok} ${bdEsc(l.okL)}</div><div><span>Needs review</span>${l.review} ${bdEsc(l.reviewL)}</div><div><span>Unresolved</span>${l.unresolved} ${bdEsc(l.unresolvedL)}</div><div><span>Open AR on affected invoices</span>${l.ar.usd ? `${bdUsd(l.ar.usd)} (${bdPlural(l.ar.n, 'invoice')})` : 'No linked AR in this snapshot'}</div></div>
    <div class="bd-h3">Source joins behind this link</div>
    ${l.edges.map(id => { const e = E.find(x => x.id === id); if (!e) return ''; const st = BD_ER_STYLE[e.type];
      return `<div class="bd-edge-row"><svg width="28" height="8" aria-hidden="true"><line x1="0" y1="4" x2="28" y2="4" stroke="${st.stroke}" stroke-width="${st.w}" stroke-dasharray="${st.dash}"/></svg><b>${bdEsc(e.label)}</b><span class="bd-note">${bdEsc(e.evidence)}</span><button class="btn btn-ghost btn-sm" onclick="bdOpenEr();bd.erSel='${e.id}';bdRenderOverlay()">Show in diagram</button></div>`; }).join('')}
  </div>`;
}

// ── 3 · Review: "Where is judgment needed?" ───────────────
function bdCuratedCases() {
  const items = bd.data.review_queue.items;
  const sev = x => ({ high: 0, medium: 1, low: 2 }[x.severity] ?? 3);
  const order = (a, b) => (b.downstream.open_ar_usd || 0) - (a.downstream.open_ar_usd || 0) || sev(a) - sev(b) || b.confidence - a.confidence || a.review_id.localeCompare(b.review_id);
  const want = [
    { label: 'Facility identity', test: x => x.queue === 'identity' && x.entity_type === 'facility' },
    { label: 'Asset moved / facility mismatch', test: x => x.issue_type === 'asset location' },
    { label: 'Contract entitlement conflict', test: x => x.issue_type === 'entitlement' },
  ];
  const picked = [];
  want.forEach(w => { const c = items.filter(w.test).filter(x => !picked.some(p => p.item === x)).sort(order)[0]; if (c) picked.push({ label: w.label, item: c }); });
  items.slice().sort((a, b) => sev(a) - sev(b) || order(a, b)).forEach(x => { if (picked.length < 3 && !picked.some(p => p.item === x)) picked.push({ label: 'Next highest priority', item: x }); });
  return picked;
}
function bdToggleCase(id) { bd.caseOpen = bd.caseOpen === id ? null : id; renderAll(); if (bd.caseOpen) setTimeout(() => { const el = document.getElementById('bd-case-detail'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }
function bdProposedText(x) {
  const v = x.proposed_value;
  if (v == null || v === '') return x.decisions[0];
  if (typeof v === 'string') return `${x.decisions[0]}: ${v}`;
  if (Array.isArray(v)) return `${x.decisions[0]} (${v.length} values)`;
  if (v.merge_into) return `Merge into ${v.merge_into} (${bdShort(v.display_name)})`;
  if (v.proposed_site) return `${v.recommendation === 'move' ? 'Move to' : 'Investigate before moving to'} ${bdShort(v.proposed_site)}`;
  if (v.golden_party) return `One enterprise party ${v.golden_party}`;
  return x.decisions[0];
}
function bdRenderReview() {
  const D = bd.data;
  const all = D.review_queue.items;
  if (!bd.applied) {
    return `<div class="page active bd-page">${bdRunBar()}${bdStoryHead('Where is judgment needed?', 'Proposals appear once the mappings have been applied to the raw snapshot.')}
      <div class="bd-panel"><div class="bd-empty">${icon('layers', 'icon-xl')}<div style="margin-top:0.5rem">The mapping run has not been applied in this session.</div>
      <button class="btn btn-bd" onclick="navigateTo('mapping');setTimeout(bdApply,150)">${icon('zap')} Apply mappings</button></div></div>${renderPageHelpPanel()}</div>`;
  }
  const open = all.filter(bdIsOpen).length;
  const cases = bdCuratedCases();
  const sel = cases.find(c => c.item.review_id === bd.caseOpen);
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdStoryHead('Where is judgment needed?', 'Three representative cases. Each fix stays a proposal until a reviewer decides; every decision can be undone.',
      `<span class="bd-counter" id="bd-review-counter"><b>${open}</b> open &middot; <b>${all.length - open}</b> decided</span>
       <button class="btn btn-bd-outline" onclick="bdSetFull('workbench', true)">Open full review queue</button>`)}
    <div class="bd-story-cards" id="bd-cases">
      ${cases.map(({ label, item: x }) => { const d = bdDec(x.review_id); const ds = x.downstream || {};
        return `<div class="bd-case ${bd.caseOpen === x.review_id ? 'sel' : ''}">
          <div class="k">${bdEsc(label)}</div>
          <div class="t">${bdEsc(x.title)}</div>
          <div class="p">${bdEsc(x.why_flagged)}</div>
          <div class="e">${icon('info')} ${bdEsc(x.evidence[0] || '')}</div>
          <div class="bd-meta" style="margin:0.6rem 0"><div><span>Affected</span>${bdEsc(x.entity_type)} &middot; ${bdPlural(x.source_row_ids.length, 'source row')}</div><div><span>Impact</span>${ds.open_ar_usd ? `${bdUsd(ds.open_ar_usd)} open on ${bdPlural((ds.open_invoices || []).length, 'invoice')}` : (ds.orders || []).length ? bdPlural(ds.orders.length, 'order') : 'No linked AR in this snapshot'}</div></div>
          <div class="pr"><span class="bd-note">Proposed:</span> ${bdEsc(bdProposedText(x))}</div>
          <div class="ft"><span class="bd-status ${bdDecClass(d)}">${d ? bdEsc(d.decision) : 'Open'}</span>
            ${d ? `<button class="btn btn-ghost btn-sm" onclick="bdUndo('${x.review_id}')">Undo</button>`
              : x.decisions.filter(o => o !== 'Edit' && o !== 'Pick alternative').map((o, i) => `<button class="btn ${i === 0 ? 'btn-bd' : 'btn-outline'} btn-sm" onclick="bdDecide('${x.review_id}','${bdJs(o)}')">${bdEsc(o)}</button>`).join('')}
            <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="bdToggleCase('${x.review_id}')" aria-expanded="${bd.caseOpen === x.review_id}">${bd.caseOpen === x.review_id ? 'Hide evidence' : 'See evidence'}</button></div>
        </div>`; }).join('')}
    </div>
    ${sel ? `<div class="bd-panel" id="bd-case-detail"><div class="bd-panel-b">${bdReviewDetail(sel.item)}</div></div>` : ''}
    ${bdNext(`${all.length - cases.length > 0 ? `${all.length - cases.length} more proposals sit in the full queue (normalization, identity, relationships, unresolved fields).` : ''} Decisions persist for this run and export as review_decisions.json.`, 'golden', 'What does a trusted view show?')}
    ${renderPageHelpPanel()}
  </div>`;
}

// ── 4 · Connected view: one asset, dated evidence ─────────
function bdStoryAssets() {
  return bd.data.golden_entities.assets.filter(a => a.location_status === 'conflict' || a.moved_on)
    .sort((a, b) => (b.location_status === 'conflict') - (a.location_status === 'conflict') || a.asset_id.localeCompare(b.asset_id));
}
function bdDefaultStoryAsset() {
  const A = bd.data.golden_entities.assets;
  if (A.some(a => a.asset_id === 'EA-00003')) return 'EA-00003';
  const inv = bd.data.ar_exposure.invoices;
  const arOf = id => inv.filter(i => i.asset_id === id).reduce((s, i) => s + i.open_usd, 0);
  const c = A.filter(a => a.location_status === 'conflict').sort((a, b) => arOf(b.asset_id) - arOf(a.asset_id) || a.asset_id.localeCompare(b.asset_id))[0];
  return (c || A[0]).asset_id;
}
function bdAssetEvents(a) {
  const kind = { install_base: 'Install base confirmed', movement_install: 'Installed', movement_asset_move: 'Moved', service_visit: 'Field service' };
  const ev = a.timeline.map(t => ({ date: t.date, kind: kind[t.type] || t.type, fac: t.facility, source: t.evidence_source, rid: t.rid, text: t.text || 'no location given' }));
  const G = bd.data.golden_entities;
  a.orders.forEach(so => {
    const o = G.orders.find(x => x.order_id === so); if (!o) return;
    ev.push({ date: o.date, kind: 'Order', fac: o.facility, source: `SAP sales order ${so} (sold-to ${o.sold_to})`, rid: o.rid, text: `${o.type} - ${bdUsd(o.value_usd)}` });
    const i = bd.data.ar_exposure.invoices.find(x => x.order === so);
    if (i) ev.push({ date: i.billing_date, kind: i.open_usd ? 'Invoice open' : 'Invoice paid', fac: i.facility, source: `SAP billing ${i.invoice}`, rid: i.rid, text: i.open_usd ? `${bdUsd(i.open_usd)} open, ${i.aging_bucket} days` : 'paid', open: i.open_usd });
  });
  return ev.sort((x, y) => (x.date || '').localeCompare(y.date || '') || x.kind.localeCompare(y.kind));
}
function bdStoryFacts(a) {
  const p = bdAssetPlacement(a);
  const tl = a.timeline;
  const ib = tl.find(t => t.type === 'install_base');
  const move = tl.filter(t => t.type === 'movement_asset_move').slice(-1)[0];
  const cand = p.candidate || (p.item && p.item.proposed_value.golden_facility_id) || a.proposed_facility;
  const svc = move ? tl.filter(t => t.type === 'service_visit' && t.date >= move.date && t.facility === cand) : [];
  const inv = bd.data.ar_exposure.invoices.filter(i => i.asset_id === a.asset_id && i.open_usd > 0);
  const priorInv = inv.filter(i => i.facility === a.ib_facility);
  const d = p.item ? bdDec(p.item.review_id) : null;
  const invTxt = priorInv.length ? `${bdPlural(priorInv.length, 'open invoice')} (${bdUsd(priorInv.reduce((s, i) => s + i.open_usd, 0))}: ${priorInv.map(i => i.invoice).join(', ')})` : null;
  let disputed, next;
  if (!move) {
    disputed = `No relocation recorded; ${a.asset_id} stays at ${bdShort(bdFacName(p.facility))}.`;
    next = 'No location correction needed for this asset.';
  } else if (!p.item) {
    disputed = `Moved to ${bdShort(bdFacName(move.facility))} on ${move.date}; the install base already agrees.`;
    next = inv.length ? `Proposed next correction: investigate whether ${bdPlural(inv.length, 'open invoice')} billed before the move should follow the asset.` : 'No open invoices on this asset in this snapshot.';
  } else if (!d) {
    disputed = `Disputed: the install base places ${a.asset_id} at ${bdShort(bdFacName(a.ib_facility))}${ib ? ` (confirmed ${ib.date})` : ''}, while a ${move.evidence_source.toLowerCase()} on ${move.date}${svc.length ? ` and ${bdPlural(svc.length, 'later service visit')}` : ''} place it at ${bdShort(bdFacName(cand))}. The current site is unresolved.`;
    next = `Proposed next correction: review ${p.item.review_id} to confirm the location${invTxt ? `; until then investigate ${invTxt} still billed to ${bdShort(bdFacName(a.ib_facility))}` : ''}.`;
  } else if (p.status === 'approved') {
    disputed = `A reviewer approved ${a.asset_id} at ${bdShort(bdFacName(p.facility))} on ${new Date(d.at).toLocaleDateString()}; the install base record itself is unchanged until its owner corrects it.`;
    next = invTxt && p.facility !== a.ib_facility ? `Proposed next correction: ask AR to investigate ${invTxt} still tied to ${bdShort(bdFacName(a.ib_facility))}.` : 'Proposed next correction: update the install base site in the source system.';
  } else {
    disputed = `Location under investigation (${d.decision.toLowerCase()}); the install base site ${bdShort(bdFacName(a.ib_facility))} remains the published value.`;
    next = 'Proposed next correction: field service to verify the device on site before any billing change.';
  }
  return { p, cand, move, d, disputed, next, inv };
}
function bdSetStoryAsset(id) { bd.storyAsset = id; bd.storyEvent = null; renderAll(); }
function bdRenderGolden() {
  const G = bd.data.golden_entities;
  const id = bd.storyAsset || bdDefaultStoryAsset();
  const a = G.assets.find(x => x.asset_id === id);
  const f = bdStoryFacts(a);
  const ev = bdAssetEvents(a);
  const evSel = bd.storyEvent != null ? ev[bd.storyEvent] : null;
  const confirmed = f.p.status === 'approved';
  const facCls = fac => fac && fac === f.cand && f.cand !== a.ib_facility ? 'cand' : '';
  const edgeRow = (from, to, kind, note) => `<div class="bd-edge-row"><svg width="28" height="8" aria-hidden="true"><line x1="0" y1="4" x2="28" y2="4" stroke="${kind === 'candidate' ? '#d97706' : kind === 'superseded' ? '#94a3b8' : '#0f766e'}" stroke-width="2" stroke-dasharray="${kind === 'candidate' ? '6 4' : kind === 'superseded' ? '2 4' : ''}"/></svg><b>${bdEsc(from)} &rarr; ${bdEsc(to)}</b><span class="bd-status ${kind === 'confirmed' ? 'done' : kind === 'native' ? '' : 'defer'}">${kind}</span><span class="bd-note">${bdEsc(note)}</span></div>`;
  const orders = a.orders.map(so => G.orders.find(o => o.order_id === so)).filter(Boolean);
  const stat = confirmed ? ['done', 'location approved'] : f.p.status === 'conflict' ? ['defer', 'location disputed'] : f.p.status === 'investigating' ? ['defer', 'under investigation'] : ['', 'location consistent'];
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdStoryHead('What does a trusted view show?', 'One device, every dated piece of evidence, and only approved relationships shown as confirmed.',
      `<label class="bd-note" for="bd-asset-pick">Asset</label><select id="bd-asset-pick" class="bd-input" onchange="bdSetStoryAsset(this.value)">${bdStoryAssets().map(x => `<option value="${x.asset_id}" ${x.asset_id === id ? 'selected' : ''}>${x.asset_id} ${x.location_status === 'conflict' ? '(disputed)' : '(moved)'}</option>`).join('')}</select>
       <button class="btn btn-bd-outline" onclick="bdSetFull('golden', true)">Browse facilities & master records</button>`)}
    <div class="bd-panel" id="bd-story">
      <div class="bd-panel-h"><h2>${a.asset_id} &middot; ${bdEsc(a.product_family)} &middot; <span class="bd-mono">${bdEsc(a.serial_normalized)}</span></h2>
        <span class="bd-status ${stat[0]}">${stat[1]}</span></div>
      <div class="bd-panel-b">
        <div class="bd-hline" role="list">${ev.map((e, i) => `<button role="listitem" class="bd-hstep ${facCls(e.fac)} ${e.open ? 'open' : ''} ${bd.storyEvent === i ? 'sel' : ''}" onclick="bd.storyEvent=${bd.storyEvent === i ? 'null' : i};renderAll()" title="${bdEsc(e.source)} - ${e.rid}" aria-pressed="${bd.storyEvent === i}">
          <span class="dot"></span><span class="d">${e.date || 'undated'}</span><span class="k">${bdEsc(e.kind)}</span><span class="f">${bdEsc(bdShort(bdFacName(e.fac)))}</span></button>`).join('')}</div>
        ${evSel ? `<div class="bd-callout" style="margin-top:0.6rem"><b>${bdEsc(evSel.kind)}</b> &middot; ${evSel.date} &middot; ${bdEsc(evSel.source)} &middot; <span class="bd-mono">${evSel.rid}</span><div>${bdEsc(evSel.text)} &rarr; ${bdEsc(bdFacName(evSel.fac))}</div></div>` : '<div class="bd-note" style="margin-top:0.4rem">Select a step for its source record. Amber steps point at the candidate site.</div>'}
        <div class="bd-callout warn" style="margin-top:1rem">${bdEsc(f.disputed)}</div>
        <div class="bd-next-fix">${icon('arrowRight')} <span>${bdEsc(f.next)}</span>${f.p.item ? ` <button class="btn btn-ghost btn-sm" onclick="bdGoReview('${f.p.item.review_id}')">Open ${f.p.item.review_id}</button>` : ''}</div>
        <div class="bd-h3">Relationships</div>
        ${edgeRow(a.asset_id, bdShort(bdFacName(a.ib_facility)), confirmed && f.p.facility !== a.ib_facility ? 'superseded' : 'native', `install base (${a.ib_basis || 'no basis'})`)}
        ${f.cand && f.cand !== a.ib_facility ? edgeRow(a.asset_id, bdShort(bdFacName(f.cand)), confirmed && f.p.facility === f.cand ? 'confirmed' : 'candidate', confirmed && f.p.facility === f.cand ? 'approved by reviewer' : `${Math.round(a.location_confidence * 100)}% from movement and service evidence - not approved`) : ''}
        ${orders.map(o => edgeRow(o.order_id, bdShort(bdFacName(o.facility)), 'native', `sold-to ${o.sold_to}${o.invoice ? ' / ' + o.invoice : ''}`)).join('')}
      </div></div>
    ${bdNext('Only native joins and reviewer-approved links are shown as confirmed; candidates stay dashed. Next: what BD should act on.', 'search', 'What should BD act on?')}
    ${renderPageHelpPanel()}
  </div>`;
}

// ── 5 · Impact: AR first, CDE backlog second ──────────────
// Rule-to-CDE mapping (documented in README). Ranking: linked open AR desc, open high-severity
// review items desc, broken relationships desc, open items desc, CDE id.
const BD_CDE_CONFIG = [
  { cde_id: 'CDE-01', label: 'Owning ERP customer / account', rules: ['C-06-OWNER', 'R-06-OWNER'], review_types: ['owner ERP number'], edges: ['E12'], ar_categories: [],
    consequence: 'Asset cannot be tied to the account that is billed' },
  { cde_id: 'CDE-02', label: 'Asset → current facility', rules: ['F-ASSET-LOC', 'C-06-SITE', 'C-07-DEST'], review_types: ['asset location', 'movement destination'], edges: ['E13', 'E11'], ar_categories: ['asset_relationship'],
    consequence: 'Billing and service follow a site the asset may have left' },
  { cde_id: 'CDE-03', label: 'Order → facility (sold-to)', rules: ['B-ORDER-LOC', 'S-ORDER-SYS', 'S-ORDER-ROLE', 'C-09-SHIPTO'], review_types: ['order system'], edges: ['E06', 'E11'], ar_categories: ['asset_relationship', 'system_mismatch'],
    consequence: 'Orders billed to the wrong facility or ERP' },
  { cde_id: 'CDE-04', label: 'Contract / entitlement', rules: ['B-ENTITLE-01', 'B-PO-01', 'C-05-ACCT', 'C-05-END', 'R-05-ACCT'], review_types: ['entitlement', 'contract account'], edges: ['E04', 'E14'], ar_categories: ['entitlement'],
    consequence: 'Billing runs on expired, open-ended or unlinked contracts' },
  { cde_id: 'CDE-05', label: 'Invoice payer / customer', rules: ['C-10-PAYER', 'C-09-PAYER', 'B-PAYER-01', 'V-AR-STATUS'], review_types: ['invoice payer', 'payer conflict (note only)', 'status / amount disagreement'], edges: ['E07'], ar_categories: ['payer_gap'],
    consequence: 'Collections cannot be routed to a payer' },
  { cde_id: 'CDE-06', label: 'Canonical facility identity / name', rules: ['U-DUP-ENTITY', 'S-NAME', 'S-ADDR', 'U-02-NATIVE', 'R-01-PARENT', 'R-02-PARENT', 'C-01-PARENT', 'C-02-PARENT', 'C-01-DHC', 'C-04-STREET'],
    review_types: ['same-entity candidate', 'facility match', 'same native ID in two ERPs', 'name variants', 'hierarchy parent', 'healthcare ID'], edges: ['E01', 'E02'], ar_categories: [],
    consequence: 'The same hospital counted as several customers' },
  { cde_id: 'CDE-07', label: 'Asset serial & UDI', rules: ['V-SERIAL', 'C-06-UDI', 'R-07-ASSET', 'R-08-ASSET', 'R-09-ASSET', 'C-07-IDS', 'C-08-IDS', 'C-09-SERIAL'], review_types: ['serial format', 'service device'], edges: ['E08', 'E09', 'E10'], ar_categories: ['identifier_defect'],
    consequence: 'Orders, scans and service cannot find the device' },
];
const BD_CDE_RANKING = 'Order: (1) distinct evidence-supported linked open AR, descending; (2) open high-severity review items; (3) relationships with review or unresolved rows; (4) open review items; (5) CDE id. A triage order, not a claim of recoverability. No weighted score is used.';
function bdCdeBacklog() {
  const D = bd.data;
  const F = D.dq_findings.findings, items = D.review_queue.items;
  const inv = D.ar_exposure.invoices.filter(i => i.open_usd > 0);
  const rows = BD_CDE_CONFIG.map(c => {
    const fs = F.filter(f => c.rules.includes(f.rule_id) && f.severity !== 'info');
    const rids = [...new Set(fs.map(f => f.source_row_id))];
    const files = [...new Set(fs.map(f => f.source))];
    const denominator = files.length === 1 ? D.source_profiles.sources.find(p => p.code === files[0]).record_count : null;
    const revs = items.filter(x => c.review_types.includes(x.issue_type));
    const open = revs.filter(bdIsOpen);
    const arInv = inv.filter(i => i.categories.some(k => c.ar_categories.includes(k)));
    const edges = c.edges.map(id => D.er_graph.edges.find(e => e.id === id)).filter(Boolean);
    const owners = {}; revs.forEach(x => { owners[x.owner] = (owners[x.owner] || 0) + 1; });
    const owner = Object.entries(owners).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return Object.assign({}, c, {
      related_rules: [...new Set(fs.map(f => f.rule_id))], reviews: revs.map(x => x.review_id), affected_count: rids.length, denominator, files, rids,
      linked_open_ar_usd: arInv.reduce((s, i) => s + i.open_usd, 0), linked_invoices: arInv.map(i => i.invoice),
      unresolved_high_count: open.filter(x => x.severity === 'high').length, unresolved_total: open.length,
      critical_relationships: edges.filter(e => e.review + e.unresolved > 0).length, edge_list: edges,
      proposed_owner: owner ? owner[0] : null,
      status: !revs.length ? 'No review items' : !open.length ? 'Decided' : open.length < revs.length ? 'In review' : 'Open',
    });
  }).filter(r => r.affected_count || r.reviews.length);
  rows.sort((a, b) => b.linked_open_ar_usd - a.linked_open_ar_usd || b.unresolved_high_count - a.unresolved_high_count
    || b.critical_relationships - a.critical_relationships || b.unresolved_total - a.unresolved_total || a.cde_id.localeCompare(b.cde_id));
  rows.forEach((r, i) => {
    r.priority_rank = i + 1;
    r.reasons = r.linked_open_ar_usd ? (i === 0 ? 'Highest linked open AR' : `Linked open AR ${bdUsdK(r.linked_open_ar_usd)}`)
      : r.unresolved_high_count ? `${bdPlural(r.unresolved_high_count, 'high-severity item')} open`
      : r.critical_relationships ? `Breaks ${bdPlural(r.critical_relationships, 'relationship')}`
      : r.unresolved_total ? `${bdPlural(r.unresolved_total, 'item')} open` : 'All review items decided';
  });
  return rows;
}
function bdPickBucket(cat) { bd.impactCat = bd.impactCat === cat ? null : cat; bd.exploreAr = true; bd.impactInv = null; renderAll(); setTimeout(() => { const el = document.getElementById('bd-explore-ar'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }
function bdRenderImpact() {
  const D = bd.data, A = D.ar_exposure, T = A.totals;
  const struct = A.by_category.filter(c => c.structural && c.open_usd_primary > 0).sort((a, b) => b.open_usd_primary - a.open_usd_primary);
  const buckets = struct.slice(0, 3), rest = struct.slice(3);
  const restUsd = rest.reduce((s, c) => s + c.open_usd_primary, 0);
  const assoc = A.invoices.filter(i => i.open_usd > 0 && i.association === 'structural');
  const assocDecided = assoc.filter(i => { const r = i.review_items.map(bdItem).filter(Boolean); return r.length && r.every(x => !bdIsOpen(x)); }).length;
  const uncorr = T.note_only_usd + T.missing_link_usd;
  const uncorrN = A.invoices.filter(i => i.open_usd > 0 && (i.association === 'note_only' || i.association === 'missing_link')).length;
  const cdes = bdCdeBacklog();
  const shown = bd.cdeAll ? cdes : cdes.slice(0, 5);
  return `<div class="page active bd-page">
    ${bdRunBar()}
    ${bdStoryHead('What should BD act on?', 'Receivables to investigate first, then where MDM should focus.',
      `<button class="btn btn-bd-outline" onclick="bdSetFull('search', true)">Supporting analysis</button>`)}
    <div class="bd-panel" id="bd-ar-hero"><div class="bd-panel-h"><h2>Receivables to investigate</h2><span class="bd-hint">as of ${A.as_of}</span></div>
      <div class="bd-panel-b bd-ar-grid">
        <div class="bd-hero">
          <div class="l">Open AR associated with a data issue</div>
          <div class="v">${bdUsd(T.associated_usd)}</div>
          <div class="s">of ${bdUsd(T.open_usd)} open AR &middot; ${bdPlural(T.associated_invoices, 'invoice')} &middot; ${bdPct(T.associated_usd / T.open_usd)}</div>
          <div class="bd-note" style="margin-top:0.6rem">Associated with a data issue; not a proven loss or recoverable amount. Each invoice counted once.</div>
          <div class="bd-note" style="margin-top:0.35rem">${assocDecided} of ${assoc.length} of these invoices have every linked review item decided.</div>
        </div>
        <div>
          ${buckets.map(c => `<button class="bd-bucket ${bd.impactCat === c.category ? 'on' : ''}" onclick="bdPickBucket('${c.category}')">
            <span class="sw" style="background:${BD_CAT_COLOR[c.category]}"></span><span class="t">${bdEsc(c.label)}<span class="bd-note"> &middot; ${bdPlural(c.invoices_primary, 'invoice')}</span></span>
            <span class="trk"><i style="width:${c.open_usd_primary / T.associated_usd * 100}%;background:${BD_CAT_COLOR[c.category]}"></i></span><span class="v">${bdUsd(c.open_usd_primary)}</span></button>`).join('')}
          ${rest.length ? `<div class="bd-note" style="padding:0.3rem 0.5rem">+ ${bdUsd(restUsd)} in ${bdPlural(rest.length, 'other category', 'other categories')} (${rest.map(c => bdEsc(c.label.toLowerCase())).join(', ')})</div>` : ''}
          <div class="bd-uncorr"><b>${bdUsd(uncorr)}</b> on ${bdPlural(uncorrN, 'invoice')} is flagged only by collection notes the extracts cannot corroborate - kept separate, not counted above.</div>
          <button class="btn btn-bd-outline btn-sm" style="margin-top:0.6rem" onclick="bd.exploreAr=!bd.exploreAr;renderAll()" aria-expanded="${bd.exploreAr}">${bd.exploreAr ? 'Hide AR detail' : 'Explore AR'}</button>
        </div>
      </div>
      ${bd.exploreAr ? bdExploreAr() : ''}
    </div>
    <div class="bd-panel" id="bd-cde"><div class="bd-panel-h"><h2>Where MDM should focus next</h2>
      <button class="btn btn-ghost btn-sm" onclick="bd.cdeHow=!bd.cdeHow;renderAll()" aria-expanded="${bd.cdeHow}" title="${bdEsc(BD_CDE_RANKING)}">How ranked</button></div>
      ${bd.cdeHow ? `<div class="bd-panel-b bd-note" style="border-bottom:1px solid var(--border-subtle)">${bdEsc(BD_CDE_RANKING)} Owners are initial steward suggestions from the review items, not confirmed accountability. Linked AR per row counts distinct invoices; rows are not additive because one invoice can touch several CDEs.</div>` : ''}
      <div class="table-wrapper"><table class="bd-table bd-cde-table"><thead><tr><th>#</th><th>CDE / relationship</th><th>Issue &amp; affected scope</th><th>Business consequence</th><th>Proposed owner</th><th>Status</th><th></th></tr></thead><tbody>
      ${shown.map(r => `<tr class="clickable ${bd.cdeSel === r.cde_id ? 'sel' : ''}" onclick="bd.cdeSel=bd.cdeSel==='${r.cde_id}'?null:'${r.cde_id}';renderAll()">
        <td class="num" style="font-weight:800;color:var(--text-primary)">${r.priority_rank}</td>
        <td><b style="color:var(--text-primary)">${bdEsc(r.label)}</b><div class="bd-note">${bdEsc(r.reasons)}</div></td>
        <td>${r.denominator ? `${r.affected_count} of ${r.denominator} records` : `${bdPlural(r.affected_count, 'record')} across ${bdPlural(r.files.length, 'extract')}`}<div class="bd-note">${bdPlural(r.related_rules.length, 'rule')} &middot; ${bdPlural(r.unresolved_total, 'open item')}${r.unresolved_high_count ? ` (${r.unresolved_high_count} high)` : ''}</div></td>
        <td>${r.linked_open_ar_usd ? `<b style="color:var(--rag-red)">${bdUsd(r.linked_open_ar_usd)}</b> open AR on ${bdPlural(r.linked_invoices.length, 'invoice')}` : '<span class="bd-note">No linked AR in this snapshot</span>'}<div class="bd-note">${bdEsc(r.consequence)}</div></td>
        <td>${r.proposed_owner ? `${bdEsc(r.proposed_owner)}<div class="bd-note">suggested steward</div>` : '<span style="color:var(--rag-amber)">Owner to assign</span>'}</td>
        <td><span class="bd-status ${r.status === 'Decided' ? 'done' : r.status === 'In review' ? 'defer' : ''}">${r.status}</span></td>
        <td><button class="btn btn-bd-outline btn-sm" onclick="event.stopPropagation();bd.cdeSel='${r.cde_id}';renderAll()">Review</button></td></tr>
        ${bd.cdeSel === r.cde_id ? `<tr><td colspan="7" style="background:var(--surface-subtle);padding:0.9rem 1rem">${bdCdeDetail(r)}</td></tr>` : ''}`).join('')}
      </tbody></table></div>
      ${cdes.length > 5 ? `<div class="bd-panel-b"><button class="btn btn-ghost btn-sm" onclick="bd.cdeAll=!bd.cdeAll;renderAll()">${bd.cdeAll ? 'Show top 5' : `View all CDEs (${cdes.length})`}</button></div>` : ''}
    </div>
    ${bdNext(`${BD_LABEL}. Figures come from run ${D.manifest.run_id} and the current review state; review decisions never collect cash on their own.`, null, '')}
    ${renderPageHelpPanel()}
  </div>`;
}
function bdCdeDetail(r) {
  const R = bd.ruleIndex;
  const items = r.reviews.map(bdItem).filter(Boolean);
  const inv = bd.data.ar_exposure.invoices.filter(i => r.linked_invoices.includes(i.invoice));
  return `<div class="bd-grid2">
    <div><div class="bd-h3">Rules</div>${r.related_rules.map(id => `<div style="font-size:0.8125rem;margin-bottom:0.2rem"><span class="bd-mono">${id}</span> ${bdEsc(bdPlain(id))} <span class="bd-note">&middot; ${(R[id] || {}).affected || 0} rows</span></div>`).join('')}
      <div class="bd-h3">Review items</div>${items.length ? items.map(x => { const d = bdDec(x.review_id); return `<div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.3rem;flex-wrap:wrap"><span class="bd-status ${bdDecClass(d)}">${d ? bdEsc(d.decision) : 'open'}</span><button class="btn btn-ghost btn-sm" onclick="bdGoReview('${x.review_id}')">${x.review_id}</button><span class="bd-note">${bdEsc(x.title)}</span></div>`; }).join('') : '<div class="bd-note">No review items for this CDE.</div>'}
      <div class="bd-h3">Source rows</div><div class="bd-mono bd-note">${r.rids.slice(0, 12).join(', ')}${r.rids.length > 12 ? ` +${r.rids.length - 12} more` : ''}</div></div>
    <div><div class="bd-h3">Relationship evidence</div>${r.edge_list.map(e => `<div style="font-size:0.8125rem;margin-bottom:0.3rem"><b>${bdEsc(e.label)}</b> <span class="bd-note">${e.matched} joined &middot; ${e.review} review &middot; ${e.unresolved} unresolved &middot; ${bdEsc(e.evidence)}</span></div>`).join('')}
      <div class="bd-h3">Scoped open AR (distinct invoices)</div>${inv.length ? inv.map(i => `<div style="font-size:0.8125rem">${i.invoice} &middot; ${bdUsd(i.open_usd)} &middot; ${bdEsc(bdShort(i.facility_name))} &middot; ${i.aging_bucket}</div>`).join('') + `<div style="font-weight:700;margin-top:0.3rem">${bdUsd(r.linked_open_ar_usd)}</div>` : '<div class="bd-note">No linked AR in this snapshot.</div>'}</div></div>`;
}
function bdExploreAr() {
  const A = bd.data.ar_exposure;
  const maxAging = Math.max(...A.aging.map(a => a.open_usd), 1);
  let inv = A.invoices.filter(i => i.open_usd > 0);
  if (bd.impactCat) inv = inv.filter(i => i.primary_category === bd.impactCat);
  if (bd.impactFac) inv = inv.filter(i => i.facility === bd.impactFac);
  inv.sort((a, b) => b.open_usd - a.open_usd);
  return `<div class="bd-panel-b" id="bd-explore-ar" style="border-top:1px solid var(--border)">
    <div class="bd-grid2">
      <div><div class="bd-h3">Aging (associated vs other open AR)</div>
        ${A.aging.map(a => `<div class="bd-hbar" title="${bdPlural(a.invoices, 'invoice')}"><span class="lab">${a.bucket} days</span><span class="trk"><i style="width:${a.associated_usd / maxAging * 100}%;background:#dc2626"></i><i style="width:${(a.open_usd - a.associated_usd) / maxAging * 100}%;background:#cbd5e1"></i></span><span class="val">${bdUsdK(a.open_usd)}</span></div>`).join('')}
        <div class="bd-legend" style="margin-top:0.4rem"><span style="--c:#dc2626">associated with an issue</span><span style="--c:#cbd5e1">other open AR</span></div></div>
      <div><div class="bd-h3">By facility (click to filter)</div>
        ${A.by_facility.filter(x => x.open_usd).map(x => `<div class="bd-hbar clickable ${bd.impactFac === x.golden_facility_id ? 'on' : ''}" onclick="bdSetImpactFac('${x.golden_facility_id}')"><span class="lab">${bdEsc(bdShort(x.name))}</span><span class="trk"><i style="width:${x.associated_usd / maxAging * 100}%;background:#dc2626"></i><i style="width:${(x.open_usd - x.associated_usd) / maxAging * 100}%;background:#cbd5e1"></i></span><span class="val">${bdUsdK(x.open_usd)}</span></div>`).join('')}</div>
    </div>
    <div class="bd-h3" style="margin-top:1rem">Invoices ${bd.impactCat ? `&middot; ${bdEsc(A.category_labels[bd.impactCat])}` : ''} ${bd.impactCat || bd.impactFac ? `<button class="btn btn-ghost btn-sm" onclick="bd.impactCat=null;bd.impactFac=null;renderAll()">Clear filters &#10005;</button>` : ''}</div>
    <div class="bd-scroll"><table class="bd-table"><thead><tr><th>Invoice</th><th>Facility</th><th>Order</th><th>Asset</th><th class="num">Open</th><th>Aging</th><th>Primary issue</th><th>Review</th></tr></thead><tbody>
      ${inv.map(i => { const ri = i.review_items.map(bdItem).filter(Boolean); const done = ri.filter(x => !bdIsOpen(x)).length; const sel = bd.impactInv === i.invoice;
        return `<tr class="clickable ${sel ? 'sel' : ''}" onclick="bdSelectInv('${i.invoice}')"><td class="bd-mono" style="color:var(--text-primary)">${i.invoice}</td><td>${bdEsc(bdShort(i.facility_name))}</td><td class="bd-mono">${i.order}</td><td class="bd-mono">${i.asset_id || '-'}</td>
          <td class="num" style="font-weight:700;color:var(--text-primary)">${bdUsd(i.open_usd)}</td><td>${i.aging_bucket}</td>
          <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${BD_CAT_COLOR[i.primary_category] || '#e2e8f0'};margin-right:0.35rem"></span>${bdEsc(A.category_labels[i.primary_category] || 'No issue identified')}${i.categories.length > 1 ? `<div class="bd-note">also: ${i.categories.slice(1).map(c => bdEsc(A.category_labels[c])).join('; ')}</div>` : ''}</td>
          <td>${ri.length ? `<span class="bd-status ${done === ri.length ? 'done' : ''}">${done}/${ri.length} decided</span>` : '<span class="bd-note">note only</span>'}</td></tr>
          ${sel ? `<tr><td colspan="8" style="background:var(--surface-subtle);padding:0.85rem 1rem">${bdInvoicePath(i)}</td></tr>` : ''}`; }).join('')}</tbody>
      <tfoot><tr><td colspan="4" style="font-weight:700">${bdPlural(inv.length, 'invoice')}</td><td class="num" style="font-weight:800">${bdUsd(inv.reduce((s, i) => s + i.open_usd, 0))}</td><td colspan="3"></td></tr></tfoot></table></div>
  </div>`;
}

// ── guided demo: 7 stops, narration built from the active run ──
function bdDemoScript() {
  if (!bd.data) return [];
  const R = bd.ruleIndex, T = bd.data.ar_exposure.totals;
  const aff = id => (R[id] || {}).affected || 0, elig = id => (R[id] || {}).eligible || 0;
  const cases = bdCuratedCases();
  const idCase = cases.find(c => c.item.queue === 'identity') || cases[0];
  const asset = bdDefaultStoryAsset();
  const top = bdChain().filter(l => l.review + l.unresolved).sort((a, b) => b.ar.usd - a.ar.usd)[0];
  const cde = bdCdeBacklog()[0];
  const prep = () => { bd.full = {}; bd.srcSel = null; bd.chainSel = null; bd.caseOpen = null; bd.exploreAr = false; bd.cdeSel = null; bd.erOpen = false; bd.sqlOpen = false; bd.storyEvent = null; };
  return [
    { page: 'raw', highlight: '#bd-areas', action: () => { prep(); renderAll(); },
      narration: `Ten source extracts, ${bd.data.source_profiles.sources.reduce((s, p) => s + p.record_count, 0)} records. Three problem areas are worth investigating: <strong>installed-base ownership, orders and contracts, billing and payer</strong>.`, stepLabel: 'Stop 1 of 7 - Where are the data breaks?', duration: 14000 },
    { page: 'raw', highlight: '#bd-src-detail', action: () => { prep(); bdOpenArea('06', 'C-06-OWNER'); },
      narration: `<strong>${aff('C-06-OWNER')} of ${elig('C-06-OWNER')} installed assets</strong> carry no owner account. That breaks the link from device to billed customer - not just an empty cell.`, stepLabel: 'Stop 2 of 7 - A relationship defect', duration: 14000 },
    { page: 'mapping', highlight: '#bd-chain', action: () => { prep(); bd.chainSel = top ? top.id : null; renderAll(); if (!bd.applied) bdApply(); },
      narration: `Customer to invoice, one chain. The biggest break: <strong>${bdEsc(top ? top.headline.toLowerCase() : 'none')}</strong>${top && top.ar.usd ? `, touching ${bdUsd(top.ar.usd)} of open AR` : ''}. Candidates and conflicts are never shown as joins.`, stepLabel: 'Stop 3 of 7 - What relationships break?', duration: 15000 },
    { page: 'workbench', highlight: '#bd-cases', action: () => { prep(); bd.applied = true; bdPersist(); bd.caseOpen = idCase ? idCase.item.review_id : null; renderAll(); },
      narration: `A reviewer decides each uncertain link. Here: <strong>${bdEsc(idCase ? idCase.item.title : '')}</strong> - both records side by side, with the contradiction. Nothing is approved until a person approves it.`, stepLabel: 'Stop 4 of 7 - Where is judgment needed?', duration: 15000 },
    { page: 'golden', highlight: '#bd-story', action: () => { prep(); bd.storyAsset = asset; renderAll(); },
      narration: `One device, dated evidence: <strong>${asset}</strong> installed, moved, serviced, ordered and billed. The disputed location stays a candidate until reviewed.`, stepLabel: 'Stop 5 of 7 - What does a trusted view show?', duration: 15000 },
    { page: 'search', highlight: '#bd-ar-hero', action: () => { prep(); renderAll(); },
      narration: `<strong>${bdUsd(T.associated_usd)} of ${bdUsd(T.open_usd)}</strong> open AR is associated with a data issue - each invoice counted once. Not a proven loss or a recoverable amount; uncorroborated notes are kept apart.`, stepLabel: 'Stop 6 of 7 - Receivables to investigate', duration: 15000 },
    { page: 'search', highlight: '#bd-cde', action: () => { prep(); renderAll(); setTimeout(() => { const el = document.getElementById('bd-cde'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200); },
      narration: `Where MDM should focus next: <strong>${bdEsc(cde ? cde.label : '')}</strong> ranks first (${bdEsc(cde ? cde.reasons.toLowerCase() : '')}). Owners are suggested stewards until accountability is assigned.`, stepLabel: 'Stop 7 of 7 - Where MDM should focus', duration: 15000 },
  ];
}
let BD_DEMO_SCRIPT = [];
getActiveDemoScript = function () { if (state.activeDataset === 'bd') { BD_DEMO_SCRIPT = bdDemoScript(); return BD_DEMO_SCRIPT; } return _bdPrevScript(); };
function bdPauseDemo() {
  if (!demoRunning) return;
  const btn = document.getElementById('bd-pause');
  if (bd.demoPaused) { bd.demoPaused = false; if (btn) btn.textContent = 'Pause'; demoTimer = setTimeout(() => advanceDemo(), 4000); }
  else { bd.demoPaused = true; clearTimeout(demoTimer); if (btn) btn.textContent = 'Resume'; }
}
const _bdPrevShowNarrator = showNarrator;
showNarrator = function () {
  _bdPrevShowNarrator();
  const ctl = document.querySelector('#narrator-bar .narrator-controls');
  if (ctl && state.activeDataset === 'bd' && !document.getElementById('bd-pause')) {
    const b = document.createElement('button'); b.id = 'bd-pause'; b.className = 'btn btn-outline'; b.style.fontSize = '0.75rem'; b.textContent = bd.demoPaused ? 'Resume' : 'Pause'; b.onclick = bdPauseDemo;
    ctl.insertBefore(b, ctl.firstChild);
  }
};
const _bdPrevAdvance = advanceDemo;
advanceDemo = function () { bd.demoPaused = false; const b = document.getElementById('bd-pause'); if (b) b.textContent = 'Pause'; _bdPrevAdvance(); };
