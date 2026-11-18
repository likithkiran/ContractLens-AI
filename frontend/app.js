// ContractLens AI — Unified Ecosystem Frontend Application
// Integrates all 9 Ideas + Hackathon Edge Simulators into ONE cohesive platform

const state = {
  samples: [],
  currentAnalysis: null,
  selectedFile: null,
  selectedDomain: 'auto',
  userRole: 'auto',
  jurisdiction: 'india',
  jurisdictionAudit: null,
  language: 'en',
  speechRate: 1,
  selectedVoiceUri: 'auto',
  isSpeaking: false,
  explanationDepth: 'simple',
  activeFilter: 'all',
  selectedFindingIds: new Set(),
  lastRedlineResult: null,
  whatIfActiveIds: new Set(),
  sparring: { clauseId: null, difficulty: 'tough', leverage: 35, turnNumber: 1, messages: [], wonClauseIds: new Set() },
  emailTone: 'collaborative',
  chatHistory: [],
  glossaryTerms: [],
  activeGlossaryId: 'indemnity',
  eli5Mode: false,
  selectedReaderText: '',
  mockSite: 'gig',
  lastAnalyzePayload: null,
  expandedFindingIds: new Set(),
  vaultItems: [],
  vaultSearch: '',
  vaultFilter: 'all',
  compareDocs: [
    { id: 'doc-1', title: 'Document A', text: '', fileName: null, status: 'idle', statusMsg: 'Drop a file or paste text' },
    { id: 'doc-2', title: 'Document B', text: '', fileName: null, status: 'idle', statusMsg: 'Drop a file or paste text' }
  ],
  llmConfig: {
    provider: sessionStorage.getItem('cl_llm_provider') || 'local',
    apiKey: sessionStorage.getItem('cl_llm_apikey') || ''
  }
};

const $ = (id) => document.getElementById(id);

const ICONS = {
  rental: '<svg class="ico-sm" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3.5 9.5L10 4l6.5 5.5V16a1 1 0 01-1 1h-11a1 1 0 01-1-1V9.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  loan: '<svg class="ico-sm" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3 9h14" stroke="currentColor" stroke-width="1.7"/></svg>',
  employment: '<svg class="ico-sm" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="6.5" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M7.5 6.5V5a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 0112.5 5v1.5" stroke="currentColor" stroke-width="1.7"/></svg>',
  chevron: '<svg class="ico-sm" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copy: '<svg class="ico-sm" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 13H4a1.5 1.5 0 01-1.5-1.5v-7A1.5 1.5 0 014 3h7a1.5 1.5 0 011.5 1.5V5" stroke="currentColor" stroke-width="1.6"/></svg>',
  trophy: '<svg class="ico-lg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 11-12 0V4zM6 6H4a2 2 0 000 4h2M18 6h2a2 2 0 010 4h-2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  fees: '<svg class="ico" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.7"/><path d="M10 6v8M7.5 8.5c0-1 1.1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.4-2.5 1.6-2.5.6-2.5 1.6 1.1 1.5 2.5 1.5 2.5-.5 2.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  clock: '<svg class="ico" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.7"/><path d="M10 6v4.5l3 1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  shield: '<svg class="ico" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2.5L4 5v5c0 4.1 2.6 7.5 6 8.5 3.4-1 6-4.4 6-8.5V5l-6-2.5z" stroke="currentColor" stroke-width="1.7"/></svg>',
  docEmpty: '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true"><rect x="9" y="6" width="26" height="32" rx="5" stroke="currentColor" stroke-width="2"/><path d="M15 15h14M15 21h14M15 27h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};

function scoreColorHex(score) {
  if (score >= 80) return 'var(--safe)';
  if (score >= 60) return 'var(--blue)';
  if (score >= 40) return 'var(--medium)';
  return 'var(--critical)';
}

function buildMiniRingSvg(score, size = 32) {
  const r = size * 0.39;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const col = scoreColorHex(score);
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${size > 40 ? 4.5 : 3.5}"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${col}" stroke-width="${size > 40 ? 4.5 : 3.5}" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" transform="rotate(-90 ${cx} ${cx})"/>
    <text x="${cx}" y="${cx + (size > 40 ? 4.5 : 3.5)}" text-anchor="middle" font-size="${size > 40 ? 12.5 : 9.5}" font-weight="800" fill="var(--ink)">${score}</text>
  </svg>`;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSimpleMarkdown(text = '') {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^&gt;\s*(.+)$/gm, '<blockquote style="margin:6px 0;padding:5px 9px;border-left:3px solid var(--accent);background:var(--bg);border-radius:0 6px 6px 0;">$1</blockquote>');
}

function formatMoney(num = 0, currency = null) {
  const cur = currency || state.currentAnalysis?.currency || '₹';
  const rounded = Math.round(Number(num) || 0);
  return cur === '₹' ? '₹' + rounded.toLocaleString('en-IN') : '$' + rounded.toLocaleString('en-US');
}

function formatRelativeTime(iso) {
  if (!iso) return 'just now';
  const diff = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

let toastTimer = null;
function showToast(msg) {
  const el = $('toast');
  const txt = $('toastText');
  if (txt) txt.textContent = msg;
  else el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3400);
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ==================== NAVIGATION ====================
function switchView(viewName) {
  stopVoiceBriefing();
  hideSelectionPopover();
  document.querySelectorAll('.nav-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  ['viewUpload', 'viewWorkspace', 'viewCompare', 'viewDeadlines', 'viewTranslator', 'viewEcosystem', 'viewHistory'].forEach((id) => {
    $(id).classList.add('hidden');
  });

  if (viewName === 'analyze') {
    $(state.currentAnalysis ? 'viewWorkspace' : 'viewUpload').classList.remove('hidden');
  } else if (viewName === 'whatif') {
    if (state.currentAnalysis) {
      $('viewWorkspace').classList.remove('hidden');
      setActiveIntelTab('whatif');
    } else if (state.samples.length > 0) {
      const s = state.samples[0];
      analyzePayload({ title: s.title, text: s.text, contractType: s.category, jurisdiction: 'india', initialTab: 'whatif' });
    } else {
      $('viewUpload').classList.remove('hidden');
      showToast('Upload or select a contract first to run What-If simulations.');
    }
  } else if (viewName === 'compare') {
    $('viewCompare').classList.remove('hidden');
    renderCompareDocCards();
  } else if (viewName === 'deadlines') {
    $('viewDeadlines').classList.remove('hidden');
    loadDeadlinesView();
  } else if (viewName === 'translator') {
    $('viewTranslator').classList.remove('hidden');
    loadGlossaryView();
  } else if (viewName === 'ecosystem') {
    $('viewEcosystem').classList.remove('hidden');
    renderMockBrowserSite(state.mockSite);
  } else if (viewName === 'history') {
    $('viewHistory').classList.remove('hidden');
    loadHistoryView();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showUploadStudio() {
  state.currentAnalysis = null;
  switchView('analyze');
}

// ==================== PIPELINE LOADER ====================
async function runWithPipelineAnimation(asyncTask) {
  const overlay = $('analyzingOverlay');
  const steps = [...document.querySelectorAll('#pipelineSteps li')];
  const bar = $('scanProgressBar');
  const pct = $('scanPercentLabel');
  steps.forEach((li, i) => {
    li.classList.remove('active', 'done');
    if (i === 0) li.classList.add('active');
  });
  if (bar) bar.style.width = '18%';
  if (pct) pct.textContent = '18%';
  overlay.classList.remove('hidden');

  let step = 0;
  const pctStages = [18, 46, 74, 92];
  const timer = setInterval(() => {
    if (step < steps.length - 1) {
      steps[step].classList.remove('active');
      steps[step].classList.add('done');
      step++;
      steps[step].classList.add('active');
      if (bar) bar.style.width = `${pctStages[step]}%`;
      if (pct) pct.textContent = `${pctStages[step]}%`;
    }
  }, 200);

  try {
    const [result] = await Promise.all([asyncTask(), new Promise((r) => setTimeout(r, 760))]);
    steps.forEach((li) => {
      li.classList.remove('active');
      li.classList.add('done');
    });
    if (bar) bar.style.width = '100%';
    if (pct) pct.textContent = '100%';
    await new Promise((r) => setTimeout(r, 120));
    return result;
  } finally {
    clearInterval(timer);
    overlay.classList.add('hidden');
  }
}

// ==================== SAMPLES & UPLOAD STUDIO ====================
async function loadSamples() {
  try {
    const { samples } = await apiFetch('/api/samples');
    state.samples = samples || [];
    const container = $('sampleCardsContainer');
    container.innerHTML = state.samples
      .map(
        (s) => `
      <button type="button" class="sample-card" data-sample-id="${escapeHtml(s.id)}">
        <div class="sample-card-top">
          <span class="sample-badge ${escapeHtml(s.category)}">${ICONS[s.category] || ICONS.shield}${escapeHtml(s.badge)}</span>
          <span class="sample-run-hint">Analyze →</span>
        </div>
        <strong>${escapeHtml(s.title)}</strong>
        <span class="sample-sub">${escapeHtml(s.subtitle)}</span>
      </button>`
      )
      .join('');

    container.querySelectorAll('.sample-card').forEach((card) => {
      card.addEventListener('click', () => {
        const s = state.samples.find((x) => x.id === card.dataset.sampleId);
        if (!s) return;
        const autoJur = s.currency === '₹' ? 'india' : 'california';
        $('uploadJurisdictionSelect').value = autoJur;
        analyzePayload({ title: s.title, text: s.text, contractType: s.category, jurisdiction: autoJur });
      });
    });
  } catch (err) {
    console.error(err);
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Could not read file.'));
    r.readAsDataURL(file);
  });
}

async function handleFileSelection(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showUploadError('File exceeds 10MB limit.');
    return;
  }
  hideUploadError();
  const base64 = await readFileAsBase64(file);
  state.selectedFile = { fileName: file.name, contentBase64: base64 };
  const ext = (file.name.split('.').pop() || 'FILE').toUpperCase();
  const kb = Math.max(1, Math.round(file.size / 1024));
  const domainLabel = state.selectedDomain === 'auto' ? 'Auto-Detect' : state.selectedDomain.toUpperCase();
  $('selectedFileName').textContent = file.name;
  if ($('selectedFileMeta')) {
    $('selectedFileMeta').textContent = `${ext} · ${kb} KB · Type: ${domainLabel}`;
  }
  $('selectedFileChip').classList.remove('hidden');
  if (!$('contractTitleInput').value.trim()) {
    $('contractTitleInput').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  }
  if (/\.(txt|md)$/i.test(file.name)) {
    $('contractTextInput').value = await file.text();
    updateWordCounter();
  }
  showToast(`Loaded "${file.name}"`);
}

function clearSelectedFile() {
  state.selectedFile = null;
  $('fileInput').value = '';
  $('selectedFileChip').classList.add('hidden');
}

function showUploadError(msg, retryFn = null) {
  const el = $('uploadError');
  el.innerHTML = `<div class="error-retry-row"><span>${escapeHtml(msg)}</span>${retryFn ? '<button type="button" class="btn-outline sm-btn" id="uploadRetryBtn">Retry</button>' : ''}</div>`;
  el.classList.remove('hidden');
  if (retryFn) $('uploadRetryBtn')?.addEventListener('click', retryFn);
}
function hideUploadError() {
  $('uploadError').classList.add('hidden');
}
function updateWordCounter() {
  const t = $('contractTextInput').value.trim();
  $('charCounter').textContent = `${(t ? t.split(/\s+/).length : 0).toLocaleString()} words`;
}

// ==================== CORE ANALYSIS ====================
async function analyzePayload(payload) {
  const { title, text, fileName, contentBase64, contractType, jurisdiction, initialTab } = payload;
  state.lastAnalyzePayload = payload;
  hideUploadError();
  state.jurisdiction = jurisdiction || $('uploadJurisdictionSelect').value || 'india';
  const normalizedType = contractType === 'gig' ? 'employment' : contractType || (state.selectedDomain === 'gig' ? 'employment' : state.selectedDomain);
  $('workspaceSkeleton')?.classList.remove('hidden');
  try {
    const data = await runWithPipelineAnimation(() =>
      apiFetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          title,
          text,
          fileName,
          contentBase64,
          contractType: normalizedType,
          userRole: state.userRole,
          jurisdiction: state.jurisdiction,
          llmConfig: state.llmConfig
        })
      })
    );
    openAnalysisInWorkspace(data.analysis, initialTab || 'findings');
    updateNavBadges(data.stats);
    showToast(`Safety Score: ${data.analysis.safetyScore}/100 · ${data.analysis.counts.total} risks verified`);
  } catch (err) {
    showUploadError(`We couldn't analyze this document. ${err.message}`, () => analyzePayload(payload));
  } finally {
    $('workspaceSkeleton')?.classList.add('hidden');
  }
}

// ==================== WORKSPACE RENDER (RESULT SCREEN) ====================
async function openAnalysisInWorkspace(analysis, initialTab = 'findings') {
  stopVoiceBriefing();
  state.currentAnalysis = analysis;
  state.activeFilter = 'all';
  state.emailTone = 'collaborative';
  state.language = 'en';
  state.expandedFindingIds = new Set(); // Collapse clause details by default
  $('wsLangSelect').value = 'en';
  $('localizedBriefBanner').classList.add('hidden');
  $('readerExplainDrawer').classList.add('hidden');
  if ($('wsAnalysisDate')) {
    const dt = analysis.analyzedAt ? new Date(analysis.analyzedAt) : new Date();
    $('wsAnalysisDate').textContent = `Analyzed ${dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · ${analysis.contractType?.label || 'Contract'}`;
  }

  state.selectedFindingIds = new Set(
    analysis.findings.filter((f) => f.trafficLight === 'red' || f.severity === 'critical').map((f) => f.id)
  );
  if (state.selectedFindingIds.size === 0 && analysis.findings.length > 0) {
    state.selectedFindingIds.add(analysis.findings[0].id);
  }

  $('wsTitle').textContent = analysis.title;
  $('wsDomainBadge').textContent = analysis.contractType.label;
  $('wsEngineBadge').textContent = analysis.engine;
  const vStats = analysis.verificationStats;
  const riskScoreVal = typeof analysis.overall_risk_score === 'number' ? analysis.overall_risk_score : Math.max(0, 100 - analysis.safetyScore);
  const highCnt = analysis.counts.high ?? analysis.counts.critical ?? analysis.trafficLightCounts.red ?? 0;
  const medCnt = analysis.counts.medium ?? analysis.trafficLightCounts.yellow ?? 0;
  const lowCnt = analysis.counts.low ?? analysis.trafficLightCounts.green ?? 0;

  $('wsMetaLine').textContent = `${analysis.wordCount.toLocaleString()} words · ${analysis.estimatedPages} pages${vStats ? ` · ${vStats.clausesAnalyzed} clauses (${vStats.verifiedFindings} verified quotes)` : ''}`;
  $('wsPagesBadge').textContent = `${analysis.estimatedPages} pages · ${analysis.smartDashboard.clausesNeedingAttention} flagged`;
  if ($('wsSecondaryRiskLine')) {
    $('wsSecondaryRiskLine').textContent = `Risk Index (secondary): ${riskScoreVal}/100 · ${highCnt} High, ${medCnt} Medium, ${lowCnt} Low`;
  }

  // Sticky Summary Bar
  if ($('stickyScoreRing')) $('stickyScoreRing').innerHTML = buildMiniRingSvg(analysis.safetyScore, 32);
  if ($('stickySafetyLabel')) $('stickySafetyLabel').textContent = `Safety ${analysis.safetyScore}/100 (${analysis.grade})`;
  if ($('stickyRiskSub')) $('stickyRiskSub').textContent = `Risk ${riskScoreVal}/100`;
  if ($('stickyRiskCounts')) {
    $('stickyRiskCounts').innerHTML = `
      <span class="tl-pill red"><i class="tl-dot red"></i>${highCnt} High</span>
      <span class="tl-pill yellow"><i class="tl-dot yellow"></i>${medCnt} Med</span>
      <span class="tl-pill green"><i class="tl-dot green"></i>${lowCnt} Low</span>`;
  }

  state.jurisdiction = analysis.jurisdictionAudit?.jurisdiction?.id || state.jurisdiction;
  $('wsJurisdictionSelect').value = state.jurisdiction;
  state.jurisdictionAudit = analysis.jurisdictionAudit;
  updateLegalityPill();

  const activeRoleId = analysis.beforeYouSign?.role?.id || 'tenant';
  state.userRole = activeRoleId;
  if ($('wsRoleSelect')) $('wsRoleSelect').value = activeRoleId;
  populateVoiceOptions();
  renderRiskDnaAndMapTab(analysis);

  // Animated Score Gauge + Verdict + Inline SVG Risk Distribution
  renderScoreGauge(analysis.safetyScore, analysis.grade, analysis.verdictTone);
  renderRiskDistribution(analysis);
  const verdictEl = $('wsVerdict');
  verdictEl.textContent = analysis.verdict;
  verdictEl.className = `verdict-title ${analysis.verdictTone}`;
  $('wsExecutiveSummary').textContent = analysis.executiveSummary;

  $('trafficLightStrip').innerHTML = `
    <span class="tl-pill red"><i class="tl-dot red"></i>${analysis.trafficLightCounts.red} High Risk</span>
    <span class="tl-pill yellow"><i class="tl-dot yellow"></i>${analysis.trafficLightCounts.yellow} Attention</span>
    <span class="tl-pill green"><i class="tl-dot green"></i>${analysis.trafficLightCounts.green} Standard</span>
  `;

  // 3 Colored KPI Tiles (Hidden Fees, Renewal & Deadlines, Financial Exposure) with icons & sparklines
  const feeCount = (analysis.findings || []).filter((f) => f.dashboardGroup === 'fees' || /fee|deposit|penalt|deduct|apr/i.test(f.category + f.title)).length;
  const deadlineCount = (analysis.extractedReminders || []).length || (analysis.findings || []).filter((f) => /renew|notice|lock|term/i.test(f.category + f.title)).length;
  const exposureNum = analysis.financialExposure?.totalAtRisk || 0;
  const spark = (vals) => `<div class="spark-bars" aria-hidden="true">${vals.map((h) => `<i style="height:${h}%"></i>`).join('')}</div>`;

  $('smartDashboardBuckets').innerHTML = `
    <div class="bucket-card red">
      <div class="bucket-head">
        <div class="kpi-label">Hidden Fees &amp; Penalties</div>
        <span class="bucket-icon">${ICONS.fees}</span>
      </div>
      <div class="bucket-num">${feeCount} <span class="tiny muted" style="font-weight:600;">clauses</span></div>
      <div class="tiny muted">Deposit deductions, hidden fees, or exit penalties</div>
      ${spark([30, 55, 45, 78, 62, Math.min(100, 28 + feeCount * 16)])}
    </div>
    <div class="bucket-card yellow">
      <div class="bucket-head">
        <div class="kpi-label">Renewal &amp; Deadlines</div>
        <span class="bucket-icon">${ICONS.clock}</span>
      </div>
      <div class="bucket-num">${deadlineCount} <span class="tiny muted" style="font-weight:600;">dates</span></div>
      <div class="tiny muted">Auto-renewals, notice cutoffs, and lock-in windows</div>
      ${spark([25, 42, 60, 52, 72, Math.min(100, 32 + deadlineCount * 12)])}
    </div>
    <div class="bucket-card accent">
      <div class="bucket-head">
        <div class="kpi-label">Financial Exposure</div>
        <span class="bucket-icon">${ICONS.shield}</span>
      </div>
      <div class="bucket-num">${escapeHtml(formatMoney(exposureNum, analysis.currency))}</div>
      <div class="tiny muted">Estimated downside if penalized or exited early</div>
      ${spark([20, 38, 54, 68, 84, exposureNum > 0 ? 96 : 24])}
    </div>`;

  $('tabFindingsCount').textContent = analysis.counts.total;

  setDocMode('reader');
  renderHeroDnaRadar(analysis);
  renderRiskRadar(analysis);
  renderPaginatedSmartReader(analysis);
  renderTrafficSections(analysis);
  renderTop3Fixes(analysis);
  renderFindingsList();
  renderQuestionsList(analysis);
  refreshNegotiationEmail();
  refreshAutoRedline();
  initWhatIfSimulator(analysis);
  initSparringArena(analysis);
  initChatForAnalysis(analysis);

  setActiveIntelTab(initialTab || 'findings');
  switchView('analyze');
  requestAnimationFrame(updateTabSlider);
}

function renderHeroDnaRadar(analysis) {
  const svgWrap = $('heroDnaRadarSvg');
  const barsWrap = $('heroDnaMiniBars');
  const badge = $('heroDnaBandBadge');
  const dna = analysis?.riskDNA;
  if (!svgWrap || !dna?.dimensions?.length) return;

  const dims = dna.dimensions.slice(0, 7);
  const shortLabels = ['FINANCIAL', 'RENEWAL', 'PENALTY', 'LIABILITY', 'LOCK-IN', 'DEADLINES', 'AMBIGUITY'];
  const n = dims.length;
  const cx = 110;
  const cy = 104;
  const maxR = 68;

  const pt = (idx, radius) => {
    const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const rings = [0.25, 0.5, 0.75, 1]
    .map((scale) => {
      const pts = dims.map((_, i) => pt(i, maxR * scale).map((v) => v.toFixed(1)).join(',')).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
    })
    .join('');

  const spokes = dims
    .map((_, i) => {
      const [x, y] = pt(i, maxR);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
    })
    .join('');

  const polyPoints = dims
    .map((d, i) => pt(i, Math.max(10, (d.score / 100) * maxR)).map((v) => v.toFixed(1)).join(','))
    .join(' ');

  const dots = dims
    .map((d, i) => {
      const [x, y] = pt(i, Math.max(10, (d.score / 100) * maxR));
      const col = d.score >= 70 ? 'var(--critical)' : d.score >= 45 ? 'var(--medium)' : 'var(--safe)';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.8" fill="${col}" stroke="var(--surface)" stroke-width="1.5"><title>${escapeHtml(d.label)}: ${d.score}/100</title></circle>`;
    })
    .join('');

  const labels = dims
    .map((d, i) => {
      const [x, y] = pt(i, maxR + 18);
      const anchor = Math.abs(x - cx) < 10 ? 'middle' : x > cx ? 'start' : 'end';
      return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${anchor}" font-size="8.2" font-weight="800" fill="var(--muted)">${shortLabels[i] || d.label.slice(0, 9).toUpperCase()}</text>`;
    })
    .join('');

  svgWrap.innerHTML = `
    <svg viewBox="0 0 220 208" width="216" height="204" role="img" aria-label="7-axis Contract Risk DNA radar chart">
      ${rings}
      ${spokes}
      <polygon points="${polyPoints}" fill="var(--accent)" fill-opacity="0.18" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
      ${labels}
    </svg>`;

  if (badge) {
    badge.textContent = dna.overallBand || 'ATTENTION REQUIRED';
    badge.className = `sev-pill ${dna.overallRisk >= 60 ? 'critical' : dna.overallRisk >= 35 ? 'medium' : 'safe'}`;
  }
  if (barsWrap) {
    barsWrap.innerHTML = dims
      .map((d, i) => {
        const col = d.score >= 70 ? 'var(--critical)' : d.score >= 45 ? 'var(--medium)' : 'var(--safe)';
        return `
        <div class="dna-row">
          <div class="dna-head"><span>${escapeHtml(d.label || shortLabels[i])}</span><span class="tabular" style="color:${col};font-family:var(--font-mono);">${d.score}/100</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${d.score}%;background:${col};"></div></div>
        </div>`;
      })
      .join('');
  }
}

function renderRiskRadar(analysis) {
  const sec = $('riskRadarSection');
  const grid = $('riskRadarGrid');
  if (!sec || !grid) return;

  const rankOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const topIssues = [...(analysis.findings || [])]
    .sort((a, b) => (rankOrder[a.severity] ?? 2) - (rankOrder[b.severity] ?? 2))
    .slice(0, 3);

  if (!topIssues.length) {
    sec.classList.add('hidden');
    return;
  }

  sec.classList.remove('hidden');
  grid.innerHTML = topIssues
    .map((f) => {
      const riskLabel = f.risk_level || (f.trafficLight === 'red' ? 'High' : 'Medium');
      return `
      <article class="radar-issue-card ${escapeHtml(f.trafficLight)}">
        <div class="section-row-between">
          <span class="tl-pill ${escapeHtml(f.trafficLight)}"><i class="tl-dot ${escapeHtml(f.trafficLight)}"></i>${escapeHtml(riskLabel.toUpperCase())} RISK</span>
          <span class="cat-tag">Page ${f.page}</span>
        </div>
        <h4>${escapeHtml(f.title)}</h4>
        <p class="tiny" style="color:var(--ink-secondary);">${escapeHtml(f.plainEnglish || f.simple_explanation)}</p>
        <p class="tiny muted"><strong>Why it matters:</strong> ${escapeHtml(f.why_it_matters || f.whyItMatters)}</p>
        <div class="radar-issue-footer">
          <span class="tiny muted">${escapeHtml(f.clause_id || 'Verified Clause')}</span>
          <button type="button" class="btn-outline sm-btn radar-view-clause-btn" data-id="${escapeHtml(f.id)}">View Clause →</button>
        </div>
      </article>`;
    })
    .join('');

  grid.querySelectorAll('.radar-view-clause-btn').forEach((btn) =>
    btn.addEventListener('click', () => focusFindingById(btn.dataset.id, { scrollCard: true, scrollDoc: true }))
  );
}

function renderScoreGauge(score, grade, tone) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const targetOffset = circ - (score / 100) * circ;
  const color = { critical: 'var(--critical)', warning: 'var(--medium)', info: 'var(--blue)', safe: 'var(--safe)' }[tone] || 'var(--accent)';
  const riskIndex = Math.max(0, 100 - score);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('scoreGaugeWrap').innerHTML = `
    <svg viewBox="0 0 112 112" width="112" height="112" role="img" aria-label="Safety Score ${score} out of 100, Grade ${escapeHtml(grade)}">
      <circle cx="56" cy="56" r="${r}" fill="none" stroke="var(--border)" stroke-width="9" />
      <circle id="gaugeArcCircle" cx="56" cy="56" r="${r}" fill="none" stroke="${color}" stroke-width="9"
        stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${reducedMotion ? targetOffset.toFixed(1) : circ.toFixed(1)}"
        transform="rotate(-90 56 56)" style="transition:stroke-dashoffset 0.72s cubic-bezier(0.22,1,0.36,1);" />
      <text id="gaugeScoreNum" x="56" y="51" text-anchor="middle" font-size="27" font-weight="800" fill="var(--ink)">${reducedMotion ? score : 0}</text>
      <text x="56" y="67" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--muted)">SAFETY</text>
      <text x="56" y="81" text-anchor="middle" font-size="10.5" font-weight="800" fill="${color}">GRADE ${escapeHtml(grade)}</text>
    </svg>
    <div id="scoreGaugeTooltip" class="gauge-tooltip" role="tooltip">
      <strong>Safety Score: ${score}/100</strong> (higher = safer)<br/>
      Calculated deterministically from verified clauses using a smooth risk curve (High = 20 pts, Medium = 8 pts, Low = 3 pts).<br/>
      <span class="muted">Secondary Risk Index: ${riskIndex}/100</span>
    </div>`;

  if (!reducedMotion) {
    requestAnimationFrame(() => {
      const arc = $('gaugeArcCircle');
      if (arc) arc.style.strokeDashoffset = targetOffset.toFixed(1);
    });
    const numEl = $('gaugeScoreNum');
    const start = performance.now();
    const dur = 520;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      if (numEl) numEl.textContent = String(Math.round(score * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

function renderRiskDistribution(analysis) {
  const el = $('riskDistStrip');
  if (!el) return;
  const red = analysis.trafficLightCounts?.red || 0;
  const yellow = analysis.trafficLightCounts?.yellow || 0;
  const green = analysis.trafficLightCounts?.green || 0;
  const total = Math.max(1, red + yellow + green);
  const pRed = (red / total) * 100;
  const pYellow = (yellow / total) * 100;
  const pGreen = (green / total) * 100;

  const r = 20;
  const circ = 2 * Math.PI * r;
  const lenRed = (pRed / 100) * circ;
  const lenYellow = (pYellow / 100) * circ;
  const lenGreen = (pGreen / 100) * circ;

  el.innerHTML = `
    <div class="risk-donut-wrap" aria-hidden="true">
      <svg viewBox="0 0 52 52" width="52" height="52">
        <circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--bg-subtle)" stroke-width="7"/>
        <circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--critical)" stroke-width="7" stroke-dasharray="${lenRed.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 26 26)"/>
        <circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--medium)" stroke-width="7" stroke-dasharray="${lenYellow.toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="${(-lenRed).toFixed(1)}" transform="rotate(-90 26 26)"/>
        <circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--safe)" stroke-width="7" stroke-dasharray="${lenGreen.toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="${(-(lenRed + lenYellow)).toFixed(1)}" transform="rotate(-90 26 26)"/>
      </svg>
    </div>
    <div class="risk-stacked-col">
      <div class="section-row-between">
        <span class="kpi-label">Clause Risk Distribution</span>
        <span class="tiny muted tabular">${red} High · ${yellow} Med · ${green} Standard</span>
      </div>
      <div class="stacked-bar" role="img" aria-label="${red} High risk, ${yellow} Medium attention, ${green} Standard clauses">
        <div class="stacked-seg red" style="width:${pRed.toFixed(1)}%"></div>
        <div class="stacked-seg yellow" style="width:${pYellow.toFixed(1)}%"></div>
        <div class="stacked-seg green" style="width:${pGreen.toFixed(1)}%"></div>
      </div>
    </div>`;
}

function renderTop3Fixes(analysis) {
  const el = $('top3FixesCard');
  if (!el) return;
  const rankOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const top3 = [...(analysis.findings || [])]
    .sort((a, b) => (rankOrder[a.severity] ?? 2) - (rankOrder[b.severity] ?? 2))
    .slice(0, 3);

  if (!top3.length) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="section-row-between">
      <div>
        <span class="sev-pill critical">Priority Action</span>
        <h4 style="margin-top:4px;">Top ${top3.length} Things to Fix Before Signing</h4>
      </div>
      <button type="button" class="btn-outline sm-btn" id="draftTop3Btn">Draft Message for All ${top3.length}</button>
    </div>
    <div class="top3-list">
      ${top3
        .map(
          (f, i) => `
        <button type="button" class="top3-item" data-top3-id="${escapeHtml(f.id)}">
          <span class="top3-num">${i + 1}</span>
          <span class="top3-body">
            <strong>${escapeHtml(f.title)}</strong>
            <span>${escapeHtml(f.question_to_ask || f.question || f.plainEnglish)}</span>
          </span>
          <span class="tiny" style="color:var(--accent);font-weight:700;white-space:nowrap;">Inspect →</span>
        </button>`
        )
        .join('')}
    </div>`;

  el.querySelectorAll('[data-top3-id]').forEach((btn) =>
    btn.addEventListener('click', () => focusFindingById(btn.dataset.top3Id, { scrollCard: true, scrollDoc: true }))
  );
  $('draftTop3Btn')?.addEventListener('click', () =>
    openDraftMessageModal({ title: `Draft Message — Top ${top3.length} Fixes`, findings: top3 })
  );
}

// ==================== IDEA 3: INTERACTIVE SMART PDF READER + FLOATING EXPLAIN ====================
function buildHighlightedHtmlForSlice(fullText, sliceStart, sliceEnd, findings) {
  const relevant = findings
    .filter((f) => f.end > sliceStart && f.start < sliceEnd)
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  let html = '';
  let cursor = sliceStart;
  for (const f of relevant) {
    const s = Math.max(f.start, cursor);
    const e = Math.min(f.end, sliceEnd);
    if (s >= e) continue;
    if (s > cursor) html += escapeHtml(fullText.slice(cursor, s));
    html += `<mark class="risk-mark tl-${escapeHtml(f.trafficLight)}" data-finding-id="${escapeHtml(f.id)}" title="${escapeHtml(f.title)}">${escapeHtml(
      fullText.slice(s, e)
    )}</mark>`;
    cursor = e;
  }
  if (cursor < sliceEnd) html += escapeHtml(fullText.slice(cursor, sliceEnd));
  return html;
}

function renderPaginatedSmartReader(analysis) {
  const sections = analysis.trafficLightSections || [];
  const pagesMap = new Map();
  for (const sec of sections) {
    const p = sec.page || 1;
    if (!pagesMap.has(p)) pagesMap.set(p, []);
    pagesMap.get(p).push(sec);
  }

  const totalPages = pagesMap.size || 1;
  const pagesHtml = [...pagesMap.entries()]
    .map(([pageNum, secs]) => {
      const pStart = secs[0].start;
      const pEnd = secs[secs.length - 1].end;
      const bodyHtml = buildHighlightedHtmlForSlice(analysis.originalText, pStart, pEnd, analysis.findings || []);
      return `
      <div class="pdf-page-sheet" data-page="${pageNum}">
        <div class="pdf-page-header">
          <span>📄 ${escapeHtml(analysis.title.slice(0, 48))}</span>
          <span>Page ${pageNum} of ${totalPages} · Select any text to Explain with AI</span>
        </div>
        <div>${bodyHtml}</div>
      </div>`;
    })
    .join('');

  const container = $('annotatedDocBody');
  container.innerHTML = pagesHtml;

  container.querySelectorAll('mark.risk-mark').forEach((m) => {
    m.addEventListener('click', () => focusFindingById(m.dataset.findingId, { scrollCard: true, scrollDoc: false }));
  });
}

function renderTrafficSections(analysis) {
  $('plainEnglishDocBody').innerHTML = (analysis.trafficLightSections || [])
    .map((sec) => {
      const label = sec.trafficLight === 'red' ? '🔴 Red · High Risk' : sec.trafficLight === 'yellow' ? '🟡 Yellow · Needs Attention' : '🟢 Green · Normal / Informational';
      return `
      <div class="plain-sec-card tl-${escapeHtml(sec.trafficLight)}">
        <div class="plain-sec-head">
          <strong>${escapeHtml(sec.title)} <span class="tiny muted">(Page ${sec.page})</span></strong>
          <span class="tl-pill ${escapeHtml(sec.trafficLight)}">${label}</span>
        </div>
        <p class="plain-sec-body"><strong>Simple explanation:</strong> ${escapeHtml(sec.plainSummary)}</p>
        <p class="tiny muted" style="margin-bottom:5px;"><strong>Why it matters:</strong> ${escapeHtml(sec.whyItMatters)}</p>
        <div class="plain-sec-hint">Ask: ${escapeHtml(sec.actionHint)}</div>
      </div>`;
    })
    .join('');
}

function hideSelectionPopover() {
  $('selectionPopover').classList.add('hidden');
}

async function explainTextInReader(text) {
  hideSelectionPopover();
  const drawer = $('readerExplainDrawer');
  const content = $('readerExplainContent');
  drawer.classList.remove('hidden');
  content.innerHTML = '<div class="tiny muted">Analyzing selected sentence with ContractLens AI...</div>';

  try {
    const { explanation } = await apiFetch('/api/explain', {
      method: 'POST',
      body: JSON.stringify({ text, contextMode: 'pdf_reader' })
    });

    const termsHtml = explanation.detectedTerms?.length
      ? `<div style="margin-top:7px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;">
           <span class="tiny muted">Legal terms detected:</span>
           ${explanation.detectedTerms.map((t) => `<button type="button" class="cite-pill open-term-btn" data-term-id="${escapeHtml(t.id)}">📖 ${escapeHtml(t.term)}</button>`).join('')}
         </div>`
      : '';

    $('drawerExplainTitle').textContent = `Explain with AI — ${explanation.label}`;
    content.innerHTML = `
      <div class="detail-callout quote" style="margin-bottom:8px;">
        <div class="detail-head"><span>Original Clause</span></div>
        <div>"${escapeHtml(explanation.excerpt)}"</div>
      </div>
      <div style="margin-bottom:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <span class="tl-pill ${escapeHtml(explanation.trafficLight)}"><i class="tl-dot ${escapeHtml(explanation.trafficLight)}"></i>${explanation.trafficLight.toUpperCase()} RISK LEVEL</span>
      </div>
      <p style="margin-bottom:6px;"><strong>Simple Meaning:</strong> ${escapeHtml(explanation.simpleMeaning)}</p>
      <p style="margin-bottom:6px;"><strong>Why It Matters:</strong> ${escapeHtml(explanation.whyYouShouldCheck || explanation.whatIsUnclear)}</p>
      <p style="margin-bottom:6px;"><strong>Question to Ask:</strong> "${escapeHtml((explanation.askBeforeAgreeing || [])[0] || 'Can we clarify and cap this obligation in writing?')}"</p>
      <div class="detail-callout negotiate" style="margin-bottom:6px;">
        <div class="detail-head"><span>Negotiation Point</span></div>
        <div>${escapeHtml(explanation.negotiationTip || 'Request clear written limits, advance notice, and mutual rights before signing.')}</div>
      </div>
      ${termsHtml}
    `;

    content.querySelectorAll('.open-term-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeGlossaryId = btn.dataset.termId;
        switchView('translator');
      });
    });
  } catch (err) {
    content.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
  }
}

function setDocMode(mode) {
  document.querySelectorAll('#docModeToggle .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.docMode === mode));
  $('annotatedDocBody').classList.toggle('hidden', mode !== 'reader');
  $('readerHelperBar').classList.toggle('hidden', mode !== 'reader');
  $('plainEnglishDocBody').classList.toggle('hidden', mode !== 'traffic');
  $('autoRedlineBody').classList.toggle('hidden', mode !== 'redline');
  if (mode === 'redline') refreshAutoRedline();
}

function focusFindingById(findingId, { scrollCard = true, scrollDoc = true } = {}) {
  setDocMode('reader');
  state.expandedFindingIds.add(findingId);

  document.querySelectorAll('mark.risk-mark').forEach((m) => m.classList.remove('active'));
  const mark = document.querySelector(`mark.risk-mark[data-finding-id="${CSS.escape(findingId)}"]`);
  if (mark) {
    mark.classList.add('active');
    if (scrollDoc) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (scrollCard) {
    setActiveIntelTab('findings');
    if (state.activeFilter !== 'all') {
      state.activeFilter = 'all';
    }
    renderFindingsList();
  } else {
    const existingCard = document.querySelector(`.finding-card[data-finding-id="${CSS.escape(findingId)}"]`);
    if (existingCard) {
      existingCard.classList.add('expanded');
      existingCard.querySelector('.finding-summary-btn')?.setAttribute('aria-expanded', 'true');
    }
  }
  document.querySelectorAll('.finding-card').forEach((c) => c.classList.remove('focused'));
  const card = document.querySelector(`.finding-card[data-finding-id="${CSS.escape(findingId)}"]`);
  if (card) {
    card.classList.add('focused');
    if (scrollCard) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ==================== RIGHT PANE: COLLAPSIBLE CLAUSES ====================
function renderFindingsList() {
  const analysis = state.currentAnalysis;
  if (!analysis) return;
  const lawMap = new Map((state.jurisdictionAudit?.clauses || []).map((c) => [c.findingId, c]));

  document.querySelectorAll('#findingFilterBar .filter-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.filter === state.activeFilter);
  });

  const filtered = analysis.findings.filter((f) => {
    if (state.activeFilter === 'all') return true;
    if (state.activeFilter === 'red') return f.trafficLight === 'red';
    if (state.activeFilter === 'yellow') return f.trafficLight === 'yellow';
    if (state.activeFilter === 'fees') return f.dashboardGroup === 'fees';
    if (state.activeFilter === 'illegal') {
      const l = lawMap.get(f.id);
      return l && (l.status === 'likely_illegal' || l.status === 'restricted');
    }
    return true;
  });

  const listEl = $('findingsList');
  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state">
      ${ICONS.docEmpty}
      <strong>No clauses match this filter</strong>
      <span>Switch back to view all verified clauses in this contract.</span>
      <button type="button" class="btn-outline sm-btn" id="resetFilterEmptyBtn">Show All Clauses</button>
    </div>`;
    $('resetFilterEmptyBtn')?.addEventListener('click', () => {
      state.activeFilter = 'all';
      renderFindingsList();
    });
    return;
  }

  listEl.innerHTML = filtered
    .map((f) => {
      const checked = state.selectedFindingIds.has(f.id) ? 'checked' : '';
      const isExpanded = state.expandedFindingIds.has(f.id);
      const law = lawMap.get(f.id);
      const lawHtml = law
        ? `<div class="statute-box ${escapeHtml(law.status)}">
             <div class="statute-top"><span class="statute-badge">${escapeHtml(law.badge)}</span><span class="statute-cite">${escapeHtml(law.citation)}</span></div>
             <div>${escapeHtml(law.note)}</div>
           </div>`
        : '';

      const depthText = f.explanationLevels?.[state.explanationDepth] || f.plainEnglish;
      const confPct = typeof f.confidence === 'number' ? `${Math.round(f.confidence * 100)}% conf.` : '';
      const riskLabel = f.risk_level || (f.trafficLight === 'red' ? 'High' : 'Medium');
      const whyText = f.why_it_matters || f.whyItMatters || '';
      const askText = f.question_to_ask || f.question || '';
      const negText = f.negotiation_suggestion || f.fairRedline || '';

      const legalNoteHtml = f.legal_note
        ? `<div class="legal-note-box">
             <div class="legal-note-head">
               <strong>Legal note: ${escapeHtml(f.legal_note.law_name)}</strong>
               <span class="verify-pill">${escapeHtml(f.legal_note.verification_label || 'Verify before relying')}</span>
             </div>
             <div>${escapeHtml(f.legal_note.generally_covers)}</div>
           </div>`
        : '';

      return `
      <article class="finding-card tl-${escapeHtml(f.trafficLight)} ${isExpanded ? 'expanded' : ''}" data-finding-id="${escapeHtml(f.id)}">
        <button type="button" class="finding-summary-btn" data-toggle-id="${escapeHtml(f.id)}" aria-expanded="${isExpanded ? 'true' : 'false'}">
          <div class="finding-summary-main">
            <div class="finding-badges">
              <span class="tl-pill ${escapeHtml(f.trafficLight)}"><i class="tl-dot ${escapeHtml(f.trafficLight)}"></i>${escapeHtml(riskLabel.toUpperCase())} RISK</span>
              ${f.clause_id ? `<span class="cat-tag">${escapeHtml(f.clause_id)}</span>` : ''}
              <span class="cat-tag">Page ${f.page}</span>
              ${confPct ? `<span class="cat-tag">${escapeHtml(confPct)}</span>` : ''}
              ${f.verified_in_source ? '<span class="sev-pill safe">Verified Quote</span>' : ''}
            </div>
            <div class="finding-title">${escapeHtml(f.title)}</div>
            <div class="finding-oneliner">${escapeHtml(depthText)}</div>
          </div>
          <span class="finding-chevron" aria-hidden="true">${ICONS.chevron}</span>
        </button>

        <div class="finding-details">
          ${legalNoteHtml}
          ${lawHtml}

          <div class="detail-callout quote">
            <div class="detail-head">
              <span>Original Quote (Page ${f.page})</span>
              <button type="button" class="mini-copy-btn" data-copy-label="Quote" data-copy-text="${escapeHtml(f.excerpt)}">${ICONS.copy} Copy</button>
            </div>
            <div>"${escapeHtml(f.excerpt)}"</div>
          </div>

          <div class="detail-callout why">
            <div class="detail-head">
              <span>Why It Matters</span>
              <button type="button" class="mini-copy-btn" data-copy-label="Explanation" data-copy-text="${escapeHtml(whyText)}">${ICONS.copy} Copy</button>
            </div>
            <div>${escapeHtml(whyText)}</div>
          </div>

          <div class="detail-callout ask">
            <div class="detail-head">
              <span>Question to Ask</span>
              <button type="button" class="mini-copy-btn" data-copy-label="Question" data-copy-text="${escapeHtml(askText)}">${ICONS.copy} Copy</button>
            </div>
            <div>"${escapeHtml(askText)}"</div>
          </div>

          <div class="detail-callout negotiate">
            <div class="detail-head">
              <span>Suggested Negotiation / Fair Wording</span>
              <button type="button" class="mini-copy-btn" data-copy-label="Negotiation wording" data-copy-text="${escapeHtml(negText)}">${ICONS.copy} Copy</button>
            </div>
            <div>${escapeHtml(negText)}</div>
          </div>

          <div class="finding-footer">
            <label class="check-label"><input type="checkbox" class="clause-select-cb" data-finding-id="${escapeHtml(f.id)}" ${checked} /> Auto-Fix &amp; Include in Email</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="jump-link draft-finding-btn" data-finding-id="${escapeHtml(f.id)}">Draft message to other party</button>
              <button type="button" class="jump-link spar-clause-btn" data-spar-id="${escapeHtml(f.id)}">Spar</button>
              <button type="button" class="jump-link" data-jump-id="${escapeHtml(f.id)}">Locate Page ${f.page} →</button>
            </div>
          </div>
        </div>
      </article>`;
    })
    .join('');

  listEl.querySelectorAll('.finding-summary-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggleId;
      const card = btn.closest('.finding-card');
      const nowOpen = !state.expandedFindingIds.has(id);
      if (nowOpen) {
        state.expandedFindingIds.add(id);
        card.classList.add('expanded');
        btn.setAttribute('aria-expanded', 'true');
        focusFindingById(id, { scrollCard: false, scrollDoc: true });
      } else {
        state.expandedFindingIds.delete(id);
        card.classList.remove('expanded');
        btn.setAttribute('aria-expanded', 'false');
      }
    })
  );

  listEl.querySelectorAll('.draft-finding-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const f = analysis.findings.find((x) => x.id === btn.dataset.findingId);
      if (f) openDraftMessageModal({ title: `Draft Message — ${f.title}`, findings: [f] });
    })
  );

  listEl.querySelectorAll('[data-jump-id]').forEach((el) =>
    el.addEventListener('click', () => focusFindingById(el.dataset.jumpId, { scrollCard: false, scrollDoc: true }))
  );
  listEl.querySelectorAll('.spar-clause-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      $('sparringClauseSelect').value = btn.dataset.sparId;
      setActiveIntelTab('sparring');
      startSparringRound();
    })
  );
  listEl.querySelectorAll('.mini-copy-btn').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(btn.dataset.copyText || '');
      showToast(`${btn.dataset.copyLabel || 'Text'} copied to clipboard`);
    })
  );
  listEl.querySelectorAll('.clause-select-cb').forEach((cb) =>
    cb.addEventListener('change', () => {
      if (cb.checked) state.selectedFindingIds.add(cb.dataset.findingId);
      else state.selectedFindingIds.delete(cb.dataset.findingId);
      refreshNegotiationEmail();
      refreshAutoRedline();
    })
  );
}

// Idea 5: "Ask My Contract" Conversational AI
function initChatForAnalysis(analysis) {
  state.chatHistory = [
    {
      role: 'assistant',
      text: `I've read **${analysis.title}** (${analysis.estimatedPages} pages). Ask me anything—I'll point straight to the exact section and tell you what to clarify before signing.`,
      relevantSection: null,
      clarify: null,
      citedFindings: []
    }
  ];

  const prompts = [
    'Can they increase my payment?',
    'What happens if I cancel?',
    'Can money be deducted from me?',
    'What are the 3 biggest risks?',
    'Which clauses should I negotiate?',
    'Explain Section 8.'
  ];

  $('chatSuggestions').innerHTML = prompts.map((q) => `<button type="button" class="chat-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('');
  $('chatSuggestions').querySelectorAll('.chat-chip').forEach((c) => c.addEventListener('click', () => sendChatMessage(c.dataset.q)));
  renderChatMessages();
}

function renderChatMessages() {
  const box = $('chatMessages');
  const fMap = new Map((state.currentAnalysis?.findings || []).map((f) => [f.id, f]));
  box.innerHTML = state.chatHistory
    .map((m) => {
      const cites = (m.citedFindings || [])
        .map((id) => fMap.get(id))
        .filter(Boolean)
        .map((f) => `<button type="button" class="cite-pill" data-cite-id="${escapeHtml(f.id)}">↗ ${escapeHtml(f.sectionTitle)} (Page ${f.page})</button>`)
        .join('');
      const metaHtml =
        m.relevantSection || m.clarify
          ? `<div class="chat-meta-strip">
               ${m.relevantSection ? `<div><strong>Relevant section:</strong> ${escapeHtml(m.relevantSection)}</div>` : ''}
               ${m.clarify ? `<div><strong>You should clarify:</strong> ${escapeHtml(m.clarify)}</div>` : ''}
             </div>`
          : '';
      return `<div class="chat-bubble ${escapeHtml(m.role)}"><div>${formatSimpleMarkdown(m.text)}</div>${metaHtml}${cites ? `<div class="chat-citations">${cites}</div>` : ''}</div>`;
    })
    .join('');

  box.querySelectorAll('.cite-pill').forEach((p) => p.addEventListener('click', () => focusFindingById(p.dataset.citeId, { scrollCard: false, scrollDoc: true })));
  box.scrollTop = box.scrollHeight;
}

async function sendChatMessage(qText) {
  const q = (qText || '').trim();
  if (!q || !state.currentAnalysis) return;
  state.chatHistory.push({ role: 'user', text: q, citedFindings: [] });
  renderChatMessages();
  $('chatInput').value = '';
  $('chatSendBtn').disabled = true;

  try {
    const reply = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ analysis: state.currentAnalysis, question: q, llmConfig: state.llmConfig })
    });
    state.chatHistory.push({
      role: 'assistant',
      text: reply.answer,
      relevantSection: reply.relevantSection,
      clarify: reply.clarify,
      citedFindings: reply.citedFindings || []
    });
  } catch (err) {
    state.chatHistory.push({ role: 'assistant', text: `Error: ${err.message}`, citedFindings: [] });
  } finally {
    $('chatSendBtn').disabled = false;
    renderChatMessages();
  }
}

// Auto-Redline, What-If, Sparring, Jurisdiction, Voice Briefing
async function refreshJurisdictionAudit() {
  if (!state.currentAnalysis) return;
  const { jurisdictionAudit } = await apiFetch('/api/jurisdiction', {
    method: 'POST',
    body: JSON.stringify({ analysis: state.currentAnalysis, jurisdiction: state.jurisdiction })
  });
  state.jurisdictionAudit = jurisdictionAudit;
  updateLegalityPill();
  renderFindingsList();
}

function updateLegalityPill() {
  const audit = state.jurisdictionAudit;
  const pill = $('legalityAlertPill');
  if (!audit) return;
  if (audit.illegalCount > 0) {
    pill.textContent = `🚨 ${audit.illegalCount} Clause${audit.illegalCount > 1 ? 's' : ''} Likely Void / Illegal in ${audit.jurisdiction.label.split(' ')[0]}`;
    pill.className = 'legality-alert-pill';
  } else if (audit.restrictedCount > 0) {
    pill.textContent = `⚠️ ${audit.restrictedCount} Statutorily Restricted`;
    pill.className = 'legality-alert-pill';
  } else {
    pill.textContent = `✓ Checked (${audit.jurisdiction.label.split(' ')[0]})`;
    pill.className = 'legality-alert-pill safe';
  }
}

const SPEECH_LANG_MAP = {
  en: 'en-US', hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', es: 'es-ES', fr: 'fr-FR'
};

function populateVoiceOptions() {
  const sel = $('wsVoiceSelect');
  if (!sel || !('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices() || [];
  const targetPrefix = state.language;
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(targetPrefix));
  const others = voices.filter((v) => !v.lang.toLowerCase().startsWith(targetPrefix)).slice(0, 12);

  sel.innerHTML =
    `<option value="auto">Auto (${targetPrefix.toUpperCase()} Voice)</option>` +
    matching.map((v) => `<option value="${escapeHtml(v.voiceURI)}">★ ${escapeHtml(v.name)} (${escapeHtml(v.lang)})</option>`).join('') +
    (others.length ? `<optgroup label="Other Installed Voices">${others.map((v) => `<option value="${escapeHtml(v.voiceURI)}">${escapeHtml(v.name)} (${escapeHtml(v.lang)})</option>`).join('')}</optgroup>` : '');

  if (matching.length > 0 && state.selectedVoiceUri === 'auto') {
    sel.value = 'auto';
  }
}

function speakTextInSelectedLanguage(text, speechLangOverride = null) {
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis not supported in this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const targetLang = speechLangOverride || SPEECH_LANG_MAP[state.language] || 'en-US';
  u.lang = targetLang;
  u.rate = Number(state.speechRate) || 1;

  const voices = window.speechSynthesis.getVoices() || [];
  if (state.selectedVoiceUri && state.selectedVoiceUri !== 'auto') {
    const picked = voices.find((v) => v.voiceURI === state.selectedVoiceUri);
    if (picked) u.voice = picked;
  } else {
    const autoMatch = voices.find((v) => v.lang.toLowerCase().startsWith(state.language));
    if (autoMatch) u.voice = autoMatch;
  }

  u.onstart = () => {
    state.isSpeaking = true;
    $('voiceBriefBtn')?.classList.add('playing');
    if ($('voiceBriefLabel')) $('voiceBriefLabel').textContent = 'Stop Audio';
  };
  u.onend = () => stopVoiceBriefing();
  u.onerror = () => stopVoiceBriefing();
  window.speechSynthesis.speak(u);
}

async function loadLocalizedBriefing(lang, topic = 'briefing') {
  if (!state.currentAnalysis) return null;
  const { briefing } = await apiFetch('/api/briefing', {
    method: 'POST',
    body: JSON.stringify({ analysis: state.currentAnalysis, lang, topic })
  });
  $('localizedHeading').textContent = `${briefing.heading}`;
  $('localizedText').textContent = briefing.spokenBriefing;
  $('localizedBriefBanner').classList.remove('hidden');
  return briefing;
}

function stopVoiceBriefing() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  state.isSpeaking = false;
  $('voiceBriefBtn')?.classList.remove('playing');
  if ($('voiceBriefLabel')) $('voiceBriefLabel').textContent = '🎙️ Play Audio';
}

async function toggleVoiceBriefing() {
  if (state.isSpeaking) { stopVoiceBriefing(); return; }
  const b = await loadLocalizedBriefing(state.language, 'briefing');
  if (!b) return;
  speakTextInSelectedLanguage(b.spokenBriefing, b.speechLang);
}

async function triggerVoiceAskCommand() {
  if (!state.currentAnalysis) return;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  const runVoiceTopic = async (spokenQuery) => {
    setActiveIntelTab('chat');
    await sendChatMessage(spokenQuery);
    const topic = /cancel|exit|leave|terminat/i.test(spokenQuery) ? 'cancel' : 'briefing';
    const b = await loadLocalizedBriefing(state.language, topic);
    if (b) {
      speakTextInSelectedLanguage(b.spokenBriefing, b.speechLang);
      if (b.jumpToFindingId) focusFindingById(b.jumpToFindingId, { scrollCard: false, scrollDoc: true });
    }
  };

  if (SpeechRec) {
    try {
      const rec = new SpeechRec();
      rec.lang = SPEECH_LANG_MAP[state.language] || 'en-US';
      rec.interimResults = false;
      showToast(`🎤 Listening in ${$('wsLangSelect').options[$('wsLangSelect').selectedIndex].text}... Speak now!`);
      rec.onresult = (ev) => {
        const transcript = ev.results?.[0]?.[0]?.transcript || 'What happens if I cancel this agreement?';
        showToast(`Heard: "${transcript}"`);
        runVoiceTopic(transcript);
      };
      rec.onerror = () => runVoiceTopic('What happens if I cancel this agreement?');
      rec.start();
      return;
    } catch {
      // Fallback to instant voice command demo
    }
  }
  showToast('🎤 Voice Demo: "What happens if I cancel this agreement?"');
  await runVoiceTopic('What happens if I cancel this agreement?');
}

// ==================== RISK DNA, BEFORE YOU SIGN, COMBINED CLAUSES, MISSING INFO & MAP ====================
function renderRiskDnaAndMapTab(analysis) {
  if (!analysis) return;

  // Before You Sign Decision Support Screen (#8 & #9)
  const bys = analysis.beforeYouSign;
  if (bys) {
    const secondaryRisk = Math.max(0, 100 - bys.readinessScore);
    const decisionState = bys.readinessScore >= 75 ? 'ready' : bys.readinessScore >= 45 ? 'review' : 'attention';
    const decisionTitle = bys.readinessScore >= 75 ? 'Ready to Review' : 'Review Before Signing';
    const decisionSub =
      bys.readinessScore >= 75
        ? 'Important conditions appear relatively balanced. Still double-check dates, numbers, and any custom addenda.'
        : 'Potentially risky conditions or unclear terms were detected. Ask for written clarification and negotiate key points before accepting.';
    const negPoints = (analysis.findings || []).slice(0, 4).map((f) => `${f.title}: ${f.negotiation_suggestion || f.fairRedline}`);

    $('beforeYouSignCard').innerHTML = `
      <div class="bys-top">
        <div>
          <span class="badge-accent">BEFORE YOU SIGN · ${escapeHtml(bys.role.label)} Perspective</span>
          <h3 style="margin-top:4px;">Contract Readiness Score <span class="tiny muted" style="font-weight:500;">(higher = safer)</span></h3>
        </div>
        <div style="text-align:right;">
          <div class="bys-score">${bys.readinessScore}/100</div>
          <div class="tiny muted">Risk Index: ${secondaryRisk}/100</div>
        </div>
      </div>
      <p class="tiny muted">${escapeHtml(bys.perspectiveNote)}</p>

      <div class="bys-trio">
        <div class="bys-trio-box safe">
          <strong>${bys.greenCount}</strong>
          <span>✓ What looks normal</span>
        </div>
        <div class="bys-trio-box warn">
          <strong>${bys.yellowCount}</strong>
          <span>⚠ What needs clarification</span>
        </div>
        <div class="bys-trio-box red">
          <strong>${bys.redCount}</strong>
          <span>🔴 What deserves serious attention</span>
        </div>
      </div>

      <div>
        <div class="kpi-label" style="margin-bottom:5px;">Questions You Should Ask</div>
        <ol class="bys-questions">${bys.topQuestions.map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ol>
      </div>

      ${
        negPoints.length
          ? `<div>
               <div class="kpi-label" style="margin-bottom:5px;">Suggested Negotiation Points</div>
               <ul class="bys-questions">${negPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
             </div>`
          : ''
      }

      <div class="bys-decision-card ${decisionState}">
        <div>
          <span class="sev-pill ${decisionState === 'ready' ? 'safe' : decisionState === 'attention' ? 'critical' : 'medium'}">${decisionTitle}</span>
          <p class="tiny" style="margin-top:6px;color:var(--ink-secondary);">${decisionSub}</p>
        </div>
        <button type="button" class="btn-primary sm-btn" id="bysDraftMsgBtn">Draft Negotiation Message</button>
      </div>
      <div class="tiny muted" style="border-top:1px solid var(--border);padding-top:8px;">${escapeHtml(bys.disclaimer)}</div>
    `;

    $('bysDraftMsgBtn')?.addEventListener('click', () => {
      const selected = analysis.findings.filter((f) => state.selectedFindingIds.has(f.id));
      openDraftMessageModal({ title: `Draft Message — ${analysis.title}`, findings: selected.length ? selected : analysis.findings });
    });
  }

  // Contract Risk DNA (#3)
  const dna = analysis.riskDNA;
  if (dna) {
    $('riskDnaOverallBadge').textContent = `${dna.overallRisk}/100 — ${dna.overallBand}`;
    $('riskDnaBars').innerHTML = dna.dimensions
      .map((d) => {
        const col = d.score >= 70 ? 'var(--critical)' : d.score >= 45 ? 'var(--medium)' : 'var(--safe)';
        return `
        <div class="dna-row">
          <div class="dna-head"><span>${escapeHtml(d.label)}</span><span style="color:${col};font-family:var(--font-mono);">${d.score}/100</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${d.score}%;background:${col};"></div></div>
        </div>`;
      })
      .join('');
  }

  // Combined Clause Risks (#5)
  const combos = analysis.combinedClauseRisks || [];
  $('combinedClausesList').innerHTML = combos.length
    ? combos
        .map(
          (c) => `
      <div class="combined-card">
        <strong>⚠️ COMBINED CLAUSE RISK: ${escapeHtml(c.title)}</strong>
        <div class="combined-pair">
          <button type="button" class="cite-pill jump-combo-btn" data-id="${escapeHtml(c.clauseA.id)}">Clause A: ${escapeHtml(c.clauseA.title)} (p.${c.clauseA.page})</button>
          <strong>+</strong>
          <button type="button" class="cite-pill jump-combo-btn" data-id="${escapeHtml(c.clauseB.id)}">Clause B: ${escapeHtml(c.clauseB.title)} (p.${c.clauseB.page})</button>
        </div>
        <p>${escapeHtml(c.relationship)}</p>
      </div>`
        )
        .join('')
    : '<div class="tiny muted">No compounding clause interactions detected.</div>';

  $('combinedClausesList').querySelectorAll('.jump-combo-btn').forEach((b) =>
    b.addEventListener('click', () => focusFindingById(b.dataset.id, { scrollCard: false, scrollDoc: true }))
  );

  // Missing Protections Checklist (Step 1)
  const mpEl = $('missingProtectionsList');
  if (mpEl) {
    const mp = analysis.missing_protections || [];
    mpEl.innerHTML = mp.length
      ? mp
          .map(
            (m) => `
        <div class="missing-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
            <strong>${escapeHtml(m.title)}</strong>
            <span class="sev-pill ${m.status === 'contradicted' ? 'critical' : 'medium'}">${m.status === 'contradicted' ? 'Contradicted' : 'Missing'}</span>
          </div>
          <div class="tiny muted">${escapeHtml(m.why_it_matters)}</div>
          <div class="tiny" style="color:var(--safe);font-weight:600;">Suggested protection: ${escapeHtml(m.suggested_clause)}</div>
          <div class="tiny" style="color:var(--accent);font-weight:600;">Ask: "${escapeHtml(m.question_to_ask)}"</div>
        </div>`
          )
          .join('')
      : '<div class="tiny" style="color:var(--safe);font-weight:700;">✓ All standard key protections for this contract type are present!</div>';
  }

  // Missing Information Detector (#6)
  const missing = analysis.missingInformation || [];
  $('missingInfoList').innerHTML = missing.length
    ? missing
        .map(
          (m) => `
      <div class="missing-card">
        <strong>${escapeHtml(m.label)}</strong>
        <div class="tiny muted">${escapeHtml(m.issue)}</div>
        <div class="tiny" style="color:var(--accent);font-weight:600;">Ask: "${escapeHtml(m.ask)}"</div>
      </div>`
        )
        .join('')
    : '<div class="tiny muted">No major missing definitions flagged.</div>';

  // Interactive Legal Clause Relationship Map (#14)
  const mapData = analysis.clauseRelationshipMap;
  if (mapData?.nodes?.length) {
    const chainEl = $('relationshipMapNodes');
    chainEl.innerHTML = mapData.nodes
      .map(
        (n, idx) =>
          `<button type="button" class="rel-node-btn ${escapeHtml(n.riskTone)} ${idx === 0 ? 'active' : ''}" data-node-id="${escapeHtml(n.id)}">${escapeHtml(n.icon)} ${escapeHtml(n.label)} (${n.count})</button>` +
          (idx < mapData.nodes.length - 1 ? '<span class="rel-arrow">↕</span>' : '')
      )
      .join('');

    const showNode = (nodeId) => {
      chainEl.querySelectorAll('.rel-node-btn').forEach((b) => b.classList.toggle('active', b.dataset.nodeId === nodeId));
      const node = mapData.nodes.find((x) => x.id === nodeId) || mapData.nodes[0];
      const detail = $('relationshipNodeDetail');
      detail.innerHTML = node.clauses.length
        ? `<div class="kpi-label" style="margin-bottom:4px;">What this clause connects to</div><strong>${escapeHtml(node.label)} — ${node.clauses.length} Linked Clause(s)</strong>` +
          node.clauses
            .map(
              (c) => `<div><button type="button" class="cite-pill jump-map-btn" data-id="${escapeHtml(c.id)}">Page ${c.page}: ${escapeHtml(c.title)}</button><div class="tiny muted" style="margin-top:2px;">${escapeHtml(c.plainEnglish)}</div></div>`
            )
            .join('')
        : `<div class="kpi-label" style="margin-bottom:4px;">What this clause connects to</div><strong>${escapeHtml(node.label)}</strong><div class="tiny muted">No high-risk clauses linked directly to this node.</div>`;

      detail.querySelectorAll('.jump-map-btn').forEach((b) =>
        b.addEventListener('click', () => focusFindingById(b.dataset.id, { scrollCard: false, scrollDoc: true }))
      );
    };

    chainEl.querySelectorAll('.rel-node-btn').forEach((b) => b.addEventListener('click', () => showNode(b.dataset.nodeId)));
    const firstRisky = mapData.nodes.find((n) => n.count > 0) || mapData.nodes[0];
    showNode(firstRisky.id);
  }
}

async function refreshRolePerspective(newRole) {
  if (!state.currentAnalysis) return;
  state.userRole = newRole;
  const { beforeYouSign } = await apiFetch('/api/role-perspective', {
    method: 'POST',
    body: JSON.stringify({ analysis: state.currentAnalysis, userRole: newRole })
  });
  state.currentAnalysis.beforeYouSign = beforeYouSign;
  renderRiskDnaAndMapTab(state.currentAnalysis);
  showToast(`Perspective updated: ${beforeYouSign.role.icon} ${beforeYouSign.role.label}`);
}

async function runHypotheticalScenario(questionText) {
  if (!state.currentAnalysis || !questionText.trim()) return;
  const out = $('scenarioFlowOutput');
  out.classList.remove('hidden');
  out.innerHTML = '<div class="tiny muted">Simulating contract scenario flow...</div>';
  try {
    const { scenario } = await apiFetch('/api/scenario', {
      method: 'POST',
      body: JSON.stringify({ analysis: state.currentAnalysis, question: questionText })
    });
    out.innerHTML = scenario.steps
      .map(
        (st, i) =>
          `<div class="flow-step ${escapeHtml(st.tone)}"><strong>${escapeHtml(st.stage)}:</strong> ${escapeHtml(st.detail)}</div>` +
          (i < scenario.steps.length - 1 ? '<div class="flow-arrow">↓</div>' : '')
      )
      .join('');
  } catch (err) {
    out.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
  }
}

async function runVersionHistoryDemo() {
  const out = $('versionHistoryOutput');
  out.innerHTML = '<div class="tiny muted">Comparing Version 1 → Version 2 → Version 3...</div>';
  const versions = [
    {
      label: 'Version 1 (Initial Offer)',
      text: 'Monthly Rent is ₹10,000. Security deposit of ₹20,000 refunded within 21 days. Notice period is 1 month written notice. Late fee is ₹500. Renewal is Manual.'
    },
    {
      label: 'Version 2 (Landlord Revision)',
      text: 'Monthly Rent is ₹12,000. Security deposit of ₹30,000 retained subject to adjustment for wear and tear and other obligations, returned within 90 days after vacating. Notice period is 3 months. Late fee is ₹1,000 plus ₹200 per delayed day.'
    },
    {
      label: 'Version 3 (Final Aggressive Draft)',
      text: 'Monthly Rent is ₹12,000 plus ₹2,500 mandatory monthly amenity fee. Security deposit of ₹30,000 retained for wear and tear and other obligations, returned within 90 days after vacating. Unless Tenant gives 90 days notice via registered post, this Agreement shall automatically renew for 12 months with a 15% increase. Early termination results in automatic forfeiture of the entire security deposit.'
    }
  ];

  const { history } = await apiFetch('/api/versions', {
    method: 'POST',
    body: JSON.stringify({ versions })
  });

  out.innerHTML = history.versions
    .map((v, i) => {
      const tr = i > 0 ? history.transitions[i - 1] : null;
      return `
      <div class="version-step-card">
        <div class="section-row-between">
          <strong>${escapeHtml(v.title)}</strong>
          <span class="tl-pill ${v.safetyScore < 50 ? 'red' : v.safetyScore < 75 ? 'yellow' : 'green'}">${v.safetyScore}/100 (${escapeHtml(v.grade)})</span>
        </div>
        <div class="tiny muted">🔴 ${v.redCount} Red · 🟡 ${v.yellowCount} Yellow · Exposure: ${escapeHtml(v.exposure)}</div>
        ${
          tr
            ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);font-size:12px;">
                 <strong>Important changes from ${escapeHtml(tr.from)}:</strong>
                 <div style="color:${tr.scoreDelta < 0 ? 'var(--critical)' : 'var(--safe)'};font-weight:700;">Score ${tr.scoreDelta >= 0 ? '+' : ''}${tr.scoreDelta} pts</div>
                 ${tr.addedRisks.length ? `<div>⚠️ Added: ${tr.addedRisks.map(escapeHtml).join(', ')}</div>` : ''}
                 ${tr.removedRisks.length ? `<div>✓ Removed: ${tr.removedRisks.map(escapeHtml).join(', ')}</div>` : ''}
               </div>`
            : '<div class="tiny muted">Baseline version</div>'
        }
      </div>`;
    })
    .join('');
}

async function runMemoryQuery(qText) {
  const q = (qText || '').trim();
  if (!q) return;
  const box = $('memoryResultBox');
  box.classList.remove('hidden');
  box.innerHTML = '<div class="tiny muted">Searching across all saved contracts in your Vault...</div>';
  const { memory } = await apiFetch('/api/memory', {
    method: 'POST',
    body: JSON.stringify({ question: q })
  });
  const pills = (memory.matchedContracts || [])
    .map((c) => `<button type="button" class="cite-pill open-mem-btn" data-id="${escapeHtml(c.id)}">📄 ${escapeHtml(c.title)} (${c.score}/100)</button>`)
    .join('');
  box.innerHTML = `<div>${formatSimpleMarkdown(memory.answer)}</div>${pills ? `<div class="chat-citations">${pills}</div>` : ''}`;
  box.querySelectorAll('.open-mem-btn').forEach((b) =>
    b.addEventListener('click', async () => {
      const { analysis } = await apiFetch(`/api/history/${encodeURIComponent(b.dataset.id)}`);
      openAnalysisInWorkspace(analysis);
    })
  );
}

async function refreshAutoRedline() {
  if (!state.currentAnalysis) return;
  const { redline } = await apiFetch('/api/auto-redline', {
    method: 'POST',
    body: JSON.stringify({ analysis: state.currentAnalysis, fixFindingIds: [...state.selectedFindingIds] })
  });
  state.lastRedlineResult = redline;
  $('redlineBeforeScore').textContent = `${redline.originalScore} (${redline.originalGrade})`;
  $('redlineAfterScore').textContent = `${redline.projectedScore} (${redline.projectedGrade})`;
  $('redlineDeltaPill').textContent = `+${redline.scoreGain} pts (${redline.fixedCount} fixed)`;
  $('redlineDiffCanvas').innerHTML = redline.segments
    .map((s) => (s.type === 'unchanged' ? escapeHtml(s.text) : `<span class="diff-del">${escapeHtml(s.removed)}</span><span class="diff-ins">${escapeHtml(s.inserted)}</span>`))
    .join('');
}

function initWhatIfSimulator(analysis) {
  const sc = analysis.whatIfScenarios || [];
  state.whatIfActiveIds = new Set(sc.filter((s) => s.activeByDefault).map((s) => s.id));
  renderWhatIfSimulator();
}

function renderWhatIfSimulator() {
  const scenarios = state.currentAnalysis?.whatIfScenarios || [];
  const cur = state.currentAnalysis?.currency || '₹';
  let pred = 0;
  let fair = 0;
  for (const s of scenarios) {
    if (state.whatIfActiveIds.has(s.id)) { pred += s.predatoryCost; fair += s.fairCost; }
  }
  const savings = Math.max(0, pred - fair);
  const maxVal = Math.max(1000, pred, fair);
  $('simPredatoryTotal').textContent = formatMoney(pred, cur);
  $('simFairTotal').textContent = formatMoney(fair, cur);
  $('simSavingsTotal').textContent = formatMoney(savings, cur);
  $('simBarPredatory').style.width = `${Math.min(100, Math.round((pred / maxVal) * 100))}%`;
  $('simBarFair').style.width = `${Math.min(100, Math.round((fair / maxVal) * 100))}%`;

  const list = $('whatIfScenariosList');
  list.innerHTML = scenarios
    .map((s) => {
      const on = state.whatIfActiveIds.has(s.id);
      const diff = Math.max(0, s.predatoryCost - s.fairCost);
      return `
      <div class="sim-scenario-card ${on ? 'active' : ''}" data-sim-id="${escapeHtml(s.id)}">
        <div class="sim-sc-top">
          <div class="sim-sc-title"><span>${escapeHtml(s.icon)}</span><span>${escapeHtml(s.title)}</span></div>
          <div style="display:flex;align-items:center;gap:7px;">
            <span class="sim-sc-cost ${diff === 0 ? 'zero' : ''}">${diff > 0 ? `+${formatMoney(diff, cur)}` : formatMoney(0, cur)}</span>
            <span class="sim-toggle-pill">${on ? 'ON' : 'TRY'}</span>
          </div>
        </div>
        <div class="tiny muted">${escapeHtml(s.explanation)}</div>
      </div>`;
    })
    .join('');

  list.querySelectorAll('.sim-scenario-card').forEach((c) =>
    c.addEventListener('click', () => {
      const id = c.dataset.simId;
      if (state.whatIfActiveIds.has(id)) state.whatIfActiveIds.delete(id);
      else state.whatIfActiveIds.add(id);
      renderWhatIfSimulator();
    })
  );
}

function initSparringArena(analysis) {
  const sel = $('sparringClauseSelect');
  state.sparring.wonClauseIds = new Set();
  $('concessionsWonBadge').textContent = '🏆 0 Clauses Won';
  const findings = analysis.findings || [];
  if (!findings.length) { sel.innerHTML = '<option>No risky clauses</option>'; return; }
  sel.innerHTML = findings.map((f) => `<option value="${escapeHtml(f.id)}">[${f.trafficLight.toUpperCase()}] ${escapeHtml(f.title)}</option>`).join('');
  startSparringRound();
}

async function startSparringRound() {
  if (!state.currentAnalysis) return;
  state.sparring.clauseId = $('sparringClauseSelect').value;
  state.sparring.difficulty = $('sparringDifficultySelect').value;
  state.sparring.leverage = 35;
  state.sparring.turnNumber = 1;
  state.sparring.messages = [];
  const { sparring } = await apiFetch('/api/sparring', {
    method: 'POST',
    body: JSON.stringify({ analysis: state.currentAnalysis, clauseId: state.sparring.clauseId, difficulty: state.sparring.difficulty, userMessage: '' })
  });
  state.sparring.messages.push({ role: 'assistant', sender: `${sparring.persona.avatar} ${sparring.persona.role}`, text: sparring.opponentReply });
  renderSparringUi(sparring);
}

async function sendSparringMove(text) {
  const msg = (text || '').trim();
  if (!msg || !state.currentAnalysis) return;
  state.sparring.messages.push({ role: 'user', sender: 'You', text: msg });
  $('sparringInput').value = '';
  const { sparring } = await apiFetch('/api/sparring', {
    method: 'POST',
    body: JSON.stringify({
      analysis: state.currentAnalysis,
      clauseId: state.sparring.clauseId,
      difficulty: state.sparring.difficulty,
      userMessage: msg,
      turnNumber: state.sparring.turnNumber,
      currentLeverage: state.sparring.leverage
    })
  });
  state.sparring.leverage = sparring.leverageScore;
  state.sparring.turnNumber = sparring.turnNumber;
  state.sparring.messages.push({ role: 'assistant', sender: `${sparring.persona.avatar} ${sparring.persona.role}`, text: sparring.opponentReply });
  if (sparring.concessionStatus === 'conceded') {
    state.sparring.wonClauseIds.add(state.sparring.clauseId);
    $('concessionsWonBadge').textContent = `🏆 ${state.sparring.wonClauseIds.size} Clause${state.sparring.wonClauseIds.size === 1 ? '' : 's'} Won`;
    showToast('🏆 Concession won!');
  }
  renderSparringUi(sparring);
}

function renderSparringUi(sparring) {
  $('leverageScoreLabel').textContent = `${sparring.leverageScore} / 100`;
  const bar = $('leverageBarFill');
  bar.style.width = `${sparring.leverageScore}%`;
  bar.style.background = sparring.leverageScore >= 80 ? 'var(--safe)' : sparring.leverageScore >= 55 ? 'var(--accent)' : 'var(--high)';
  $('coachTipBox').innerHTML = `<strong>🎯 Live Coach:</strong> ${escapeHtml(sparring.coachTip)}`;

  const box = $('sparringMessages');
  box.innerHTML = state.sparring.messages
    .map((m) => `<div class="chat-bubble ${escapeHtml(m.role)}"><div style="font-size:10.5px;font-weight:700;opacity:0.8;margin-bottom:2px;">${escapeHtml(m.sender)}</div><div>${escapeHtml(m.text)}</div></div>`)
    .join('');
  box.scrollTop = box.scrollHeight;

  const moves = $('sparringSuggestedMoves');
  moves.innerHTML = (sparring.suggestedMoves || [])
    .map((m) => `<button type="button" class="pro-move-btn" data-move="${escapeHtml(m)}">💡 <strong>Pro Move:</strong> ${escapeHtml(m)}</button>`)
    .join('');
  moves.querySelectorAll('.pro-move-btn').forEach((b) => b.addEventListener('click', () => sendSparringMove(b.dataset.move)));
}

function renderQuestionsList(analysis) {
  $('questionsList').innerHTML = (analysis.questionsToAsk || [])
    .map(
      (q) => `
    <div class="question-card">
      <div class="question-card-q">${q.priority}. "${escapeHtml(q.question)}"</div>
      <div class="tiny muted">${escapeHtml(q.whyItMatters)}</div>
      <div class="question-card-bench">Market Benchmark: ${escapeHtml(q.benchmark)}</div>
    </div>`
    )
    .join('');
}

async function refreshNegotiationEmail() {
  const analysis = state.currentAnalysis;
  if (!analysis) return;
  const selected = analysis.findings.filter((f) => state.selectedFindingIds.has(f.id));
  $('selectedClausesCount').textContent = `${selected.length} clauses selected`;
  document.querySelectorAll('#emailToneSelector .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.tone === state.emailTone));
  const { email } = await apiFetch('/api/negotiate-email', {
    method: 'POST',
    body: JSON.stringify({
      title: analysis.title,
      domainType: analysis.contractType.type,
      selectedFindings: selected,
      tone: state.emailTone,
      recipientName: $('emailRecipientInput').value,
      senderName: $('emailSenderInput').value
    })
  });
  $('negotiationEmailBox').value = email;
}

function updateTabSlider() {
  const slider = $('intelTabSlider');
  const active = document.querySelector('#intelTabs .intel-tab.active');
  if (!slider || !active) return;
  slider.style.width = `${active.offsetWidth}px`;
  slider.style.transform = `translateX(${active.offsetLeft}px)`;
}

function setActiveIntelTab(tab) {
  document.querySelectorAll('#intelTabs .intel-tab').forEach((t) => {
    const isSel = t.dataset.tab === tab;
    t.classList.toggle('active', isSel);
    t.setAttribute('aria-selected', isSel ? 'true' : 'false');
    t.setAttribute('tabindex', isSel ? '0' : '-1');
  });
  document.querySelectorAll('.intel-pane .tab-panel').forEach((p) => p.classList.remove('active'));
  const map = { findings: 'panelFindings', bys: 'panelBys', dna: 'panelDna', chat: 'panelChat', whatif: 'panelWhatIf', sparring: 'panelSparring', playbook: 'panelPlaybook' };
  $(map[tab] || 'panelFindings').classList.add('active');
  requestAnimationFrame(updateTabSlider);
}

// ==================== STEP 4: DRAFT MESSAGE TO OTHER PARTY MODAL ====================
async function openDraftMessageModal({ title = 'Draft Message to the Other Party', findings = [] }) {
  const analysis = state.currentAnalysis;
  if (!analysis) return;
  $('draftModalTitle').textContent = title;
  $('draftModalTextarea').value = 'Generating draft message...';
  $('draftMessageModal').classList.remove('hidden');

  try {
    const { email } = await apiFetch('/api/negotiate-email', {
      method: 'POST',
      body: JSON.stringify({
        title: analysis.title,
        domainType: analysis.contractType.type,
        selectedFindings: findings,
        tone: state.emailTone || 'collaborative',
        recipientName: $('emailRecipientInput')?.value || '',
        senderName: $('emailSenderInput')?.value || '[Your Name]'
      })
    });
    $('draftModalTextarea').value = `[DRAFT - REVIEW BEFORE SENDING]\n\n${email}`;
  } catch (err) {
    $('draftModalTextarea').value = `Could not generate draft: ${err.message}`;
  }
}

// ==================== MULTI-DOCUMENT UPLOAD & COMPARISON (2 TO 5 DOCS) ====================
function updateCompareButtonState() {
  const readyCount = state.compareDocs.filter((d) => d.text && d.text.trim().length >= 25).length;
  const btn = $('runCompareBtn');
  const hint = $('compareReadyHint');
  if (btn) {
    btn.disabled = readyCount < 2;
    btn.textContent = readyCount >= 2 ? `Compare ${readyCount} Documents Side-by-Side` : 'Compare Documents Side-by-Side';
  }
  if (hint) {
    hint.textContent =
      readyCount >= 2
        ? `${readyCount} documents ready · Uses ${readyCount === 2 ? '/api/compare' : '/api/compare-many'} locally`
        : `Add text or upload files to at least 2 documents (${readyCount}/2 ready).`;
  }
}

function addNewCompareDocCard() {
  if (state.compareDocs.length >= 5) return;
  const nextLetter = String.fromCharCode(65 + state.compareDocs.length);
  state.compareDocs.push({
    id: `doc-${Date.now()}`,
    title: `Document ${nextLetter}`,
    text: '',
    fileName: null,
    status: 'idle',
    statusMsg: 'Drop a file or paste text'
  });
  renderCompareDocCards();
}

function renderCompareDocCards() {
  const container = $('compareDocsList');
  if (!container) return;

  const cardsHtml = state.compareDocs
    .map(
      (doc, idx) => `
    <div class="card compare-doc-card" data-doc-idx="${idx}">
      <div class="compare-card-top">
        <span class="badge-soft">Document ${idx + 1}</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="card-status-pill ${escapeHtml(doc.status)}">${escapeHtml(doc.statusMsg)}</span>
          ${
            state.compareDocs.length > 2
              ? `<button type="button" class="btn-ghost sm-btn remove-cmp-doc-btn" data-idx="${idx}" aria-label="Remove Document ${idx + 1}" style="color:var(--critical);">Remove</button>`
              : ''
          }
        </div>
      </div>
      <div class="form-group compact">
        <label for="cmpTitle-${idx}">Document Title</label>
        <input type="text" id="cmpTitle-${idx}" class="text-input sm cmp-title-input" data-idx="${idx}" value="${escapeHtml(doc.title)}" placeholder="e.g., Apartment Offer ${String.fromCharCode(65 + idx)}" />
      </div>
      <div class="compare-card-drop" data-idx="${idx}" tabindex="0" role="button" aria-label="Upload PDF, DOCX, or TXT for Document ${idx + 1}">
        <input type="file" class="cmp-file-input" data-idx="${idx}" accept=".pdf,.docx,.txt,.md,.rtf" hidden />
        Drop <strong>.PDF / .DOCX / .TXT</strong> here or <u class="link-accent">browse</u>
      </div>
      <textarea class="textarea-input cmp-text-input" data-idx="${idx}" rows="5" placeholder="Or paste contract text for Document ${idx + 1}...">${escapeHtml(doc.text)}</textarea>
    </div>`
    )
    .join('');

  const addCardHtml =
    state.compareDocs.length < 5
      ? `<button type="button" class="add-doc-card" id="gridAddCompareDocBtn" aria-label="Add another document to compare">
           <span class="add-doc-plus" aria-hidden="true">+</span>
           <strong>Add Document (${state.compareDocs.length}/5)</strong>
           <span class="tiny muted">Compare up to 5 offers side-by-side</span>
         </button>`
      : '';

  container.innerHTML = cardsHtml + addCardHtml;
  $('gridAddCompareDocBtn')?.addEventListener('click', addNewCompareDocCard);

  if ($('addCompareDocBtn')) {
    $('addCompareDocBtn').disabled = state.compareDocs.length >= 5;
    $('addCompareDocBtn').textContent =
      state.compareDocs.length >= 5 ? 'Max 5 Documents' : `+ Add Document (${state.compareDocs.length}/5)`;
  }

  container.querySelectorAll('.cmp-title-input').forEach((inp) =>
    inp.addEventListener('input', () => {
      state.compareDocs[Number(inp.dataset.idx)].title = inp.value;
    })
  );

  container.querySelectorAll('.cmp-text-input').forEach((ta) =>
    ta.addEventListener('input', () => {
      const idx = Number(ta.dataset.idx);
      state.compareDocs[idx].text = ta.value;
      const wc = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
      state.compareDocs[idx].status = wc > 5 ? 'parsed' : 'idle';
      state.compareDocs[idx].statusMsg = wc > 5 ? `Ready (${wc} words)` : 'Drop a file or paste text';
      const pill = container.querySelector(`.compare-doc-card[data-doc-idx="${idx}"] .card-status-pill`);
      if (pill) {
        pill.className = `card-status-pill ${state.compareDocs[idx].status}`;
        pill.textContent = state.compareDocs[idx].statusMsg;
      }
      updateCompareButtonState();
    })
  );

  container.querySelectorAll('.remove-cmp-doc-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (state.compareDocs.length <= 2) return;
      state.compareDocs.splice(Number(btn.dataset.idx), 1);
      renderCompareDocCards();
    })
  );

  const handleCardFile = async (idx, file) => {
    if (!file) return;
    state.compareDocs[idx].status = 'parsing';
    state.compareDocs[idx].statusMsg = `Parsing ${file.name}...`;
    renderCompareDocCards();

    try {
      const b64 = await readFileAsBase64(file);
      const parsed = await apiFetch('/api/parse-document', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, contentBase64: b64 })
      });
      state.compareDocs[idx].text = parsed.text;
      state.compareDocs[idx].fileName = parsed.fileName;
      if (/^Document [A-E]$/.test(state.compareDocs[idx].title)) {
        state.compareDocs[idx].title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      }
      state.compareDocs[idx].status = 'parsed';
      state.compareDocs[idx].statusMsg = `Parsed (${parsed.wordCount} words)`;
    } catch (err) {
      state.compareDocs[idx].status = 'failed';
      state.compareDocs[idx].statusMsg = `Failed: ${err.message.slice(0, 44)}`;
    }
    renderCompareDocCards();
  };

  container.querySelectorAll('.compare-card-drop').forEach((zone) => {
    const idx = Number(zone.dataset.idx);
    const inp = zone.querySelector('.cmp-file-input');
    zone.addEventListener('click', () => inp.click());
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer?.files?.[0]) handleCardFile(idx, e.dataTransfer.files[0]);
    });
    inp.addEventListener('change', () => {
      if (inp.files?.[0]) handleCardFile(idx, inp.files[0]);
    });
  });

  updateCompareButtonState();
}

function loadThreeOfferRentalDemo() {
  state.compareDocs = [
    {
      id: 'doc-1',
      title: 'Offer A — GreenView Residency',
      fileName: null,
      status: 'parsed',
      statusMsg: '✓ Demo Ready (54 words)',
      text: `RESIDENTIAL RENTAL AGREEMENT — GREENVIEW RESIDENCY
Monthly Rent is ₹24,000 payable on the 1st of every month with a 5-day grace period.
Security deposit of ₹48,000 shall be refunded within 21 days excluding normal wear and tear.
Notice period is 30 days written notice via email. Tenure is 12 months.
Renewal is Manual / Mutual Written Consent. Landlord covers structural, plumbing, and electrical repairs and gives 24 hours advance notice.`
    },
    {
      id: 'doc-2',
      title: 'Offer B — Metro Heights',
      fileName: null,
      status: 'parsed',
      statusMsg: '✓ Demo Ready (62 words)',
      text: `RESIDENTIAL RENTAL AGREEMENT — METRO HEIGHTS
Monthly Rent is ₹21,500 due on the 1st of every month. Tenant must pay mandatory monthly community amenity fee of ₹2,500.
Security deposit of ₹86,000 retained subject to adjustment for wear and tear, repainting, and other obligations, returned within 90 days after vacating.
Notice period is 60 days written notice. Tenure is 12 months. Late fee is ₹1,000 plus ₹200 per delayed day.
Renewal is Manual / Mutual Written Consent.`
    },
    {
      id: 'doc-3',
      title: 'Offer C — Skyline Luxury Towers',
      fileName: null,
      status: 'parsed',
      statusMsg: '✓ Demo Ready (78 words)',
      text: `RESIDENTIAL RENTAL AGREEMENT — SKYLINE LUXURY TOWERS
Monthly Rent is ₹28,000. Mandatory monthly community amenity fee of ₹3,800 plus non-refundable move-in administrative fee of ₹8,500.
Security deposit of ₹1,68,000 returned within 90 days after vacating with deductions for wear and tear and repainting.
Lock-in period of 11 months; early termination forfeits entire security deposit plus liquidated damages of ₹84,000.
Unless Tenant gives 90 days prior notice via registered post, this Agreement shall automatically renew for 12 months with a 15% increase.
Landlord may enter the Premises at any time without prior notice.`
    }
  ];
  renderCompareDocCards();
  showToast('Loaded 3-Offer Rental Demo — click Compare All Documents!');
}

function loadIndianRentalCompareDemo() {
  state.compareDocs = [
    {
      id: 'doc-1',
      title: 'Contract A — Old Rental Agreement',
      fileName: null,
      status: 'parsed',
      statusMsg: '✓ Demo Ready',
      text: `RESIDENTIAL RENTAL AGREEMENT (OLD)
Monthly Rent is ₹10,000 due on the 1st of every month with a 5-day grace period.
Security deposit of ₹20,000 shall be refunded within 21 days excluding normal wear and tear.
Notice period is 1 month written notice by email for either party.
Late fee is ₹500 after the grace period.
Renewal is Manual / Mutual Written Consent upon expiration.`
    },
    {
      id: 'doc-2',
      title: 'Contract B — New Rental Agreement',
      fileName: null,
      status: 'parsed',
      statusMsg: '✓ Demo Ready',
      text: `RESIDENTIAL RENTAL AGREEMENT (NEW)
Monthly Rent is ₹12,000 due on the 1st of every month.
Security deposit of ₹30,000 shall be retained subject to adjustment for wear and tear, repainting, and other obligations, returned within 90 days after vacating.
Notice period is 3 months written notice via registered post.
Late fee is ₹1,000 plus ₹200 per delayed day.
Unless Tenant sends notice 90 days prior, this Agreement shall automatically renew for an additional 12 months at a 15% increase.`
    }
  ];
  renderCompareDocCards();
  showToast('Loaded ₹10,000 vs ₹12,000 demo — click Compare All Documents!');
}

function buildCompareSvgChart(docs) {
  if (!docs.length) return '';
  const palette = ['#4f46e5', '#047857', '#d97706', '#be123c', '#0284c7'];
  const maxCost = Math.max(1, ...docs.map((d) => Number(d.totalEstimatedCost || d.financialExposure || 1)));

  const metrics = [
    { key: 'Safety', fn: (d) => d.safetyScore || 0 },
    { key: 'Cost Value', fn: (d) => Math.max(12, Math.round(100 - ((Number(d.totalEstimatedCost || 0) / maxCost) * 75))) },
    { key: 'Flexibility', fn: (d) => Math.max(10, 100 - (d.riskCounts?.high || 0) * 14 - (d.terms?.autoRenewal?.toLowerCase().includes('yes') ? 18 : 0)) },
    { key: 'Fairness', fn: (d) => Math.max(10, 100 - (d.riskCounts?.high || 0) * 16 - (d.riskCounts?.medium || 0) * 6) }
  ];

  const svgW = 640;
  const svgH = 210;
  const padL = 36;
  const padB = 30;
  const chartH = svgH - padB - 18;
  const groupW = (svgW - padL - 20) / metrics.length;
  const barW = Math.min(26, Math.floor((groupW - 26) / docs.length));

  const gridLines = [0, 25, 50, 75, 100]
    .map((v) => {
      const y = 14 + chartH - (v / 100) * chartH;
      return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${svgW - 10}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-dasharray="${v === 0 ? '0' : '3 3'}"/>
              <text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`;
    })
    .join('');

  const barsSvg = metrics
    .map((m, mi) => {
      const gx = padL + mi * groupW + 14;
      const bars = docs
        .map((d, di) => {
          const val = Math.max(4, Math.min(100, m.fn(d)));
          const bh = (val / 100) * chartH;
          const bx = gx + di * (barW + 4);
          const by = 14 + chartH - bh;
          return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW}" height="${bh.toFixed(1)}" rx="4" fill="${palette[di % palette.length]}"><title>${escapeHtml(d.title)} — ${m.key}: ${val}/100</title></rect>`;
        })
        .join('');
      const labelX = gx + ((docs.length * (barW + 4)) / 2) - 2;
      return `${bars}<text x="${labelX.toFixed(1)}" y="${svgH - 8}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--ink-secondary)">${m.key}</text>`;
    })
    .join('');

  const legend = docs
    .map(
      (d, i) => `<span class="chart-legend-item"><i class="chart-swatch" style="background:${palette[i % palette.length]}"></i>${escapeHtml(d.title)}</span>`
    )
    .join('');

  return `
    <div class="card compare-chart-card">
      <div class="section-row-between" style="margin-bottom:8px;flex-wrap:wrap;">
        <h3>Offer Score Profile (Safety · Cost Value · Flexibility · Fairness)</h3>
        <span class="tiny muted">Higher bar = better for signer</span>
      </div>
      <div class="chart-legend">${legend}</div>
      <div style="width:100%;overflow-x:auto;">
        <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="max-height:220px;min-width:420px;" role="img" aria-label="Grouped bar chart comparing Safety, Cost Value, Flexibility, and Fairness across documents">
          ${gridLines}${barsSvg}
        </svg>
      </div>
    </div>`;
}

async function runComparison() {
  const errEl = $('compareError');
  errEl.classList.add('hidden');
  const filled = state.compareDocs.filter((d) => d.text && d.text.trim().length >= 25);
  if (filled.length < 2) {
    errEl.innerHTML = `<div class="error-retry-row"><span>Please upload or paste at least 2 contracts (minimum ~5 words each) to compare.</span></div>`;
    errEl.classList.remove('hidden');
    return;
  }

  $('compareSkeleton')?.classList.remove('hidden');
  $('compareResultContainer').classList.add('hidden');

  try {
    // Use existing /api/compare for 2 documents and /api/compare-many for 3 to 5 documents
    const endpoint = filled.length === 2 ? '/api/compare' : '/api/compare-many';
    const bodyPayload =
      filled.length === 2
        ? {
            contractA: { title: filled[0].title, text: filled[0].text, fileName: filled[0].fileName },
            contractB: { title: filled[1].title, text: filled[1].text, fileName: filled[1].fileName },
            llmConfig: state.llmConfig
          }
        : {
            documents: filled.map((d) => ({ title: d.title, text: d.text, fileName: d.fileName })),
            llmConfig: state.llmConfig
          };

    const { comparison } = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(bodyPayload)
    });

    const docs = comparison.documents || [];
    const headerCols = docs
      .map(
        (d) =>
          `<th>${escapeHtml(d.title)}<br/><span class="tiny" style="font-weight:700;color:var(--accent);">Safety: ${d.safetyScore}/100 (${escapeHtml(d.grade)})</span><br/><span class="tiny muted">Risk: ${d.overall_risk_score}/100 · ${d.riskCounts.high}H/${d.riskCounts.medium}M/${d.riskCounts.low}L</span></th>`
      )
      .join('');

    const rowIcon = (label) => {
      if (/safety|risk/i.test(label)) return ICONS.shield;
      if (/cost|rent|deposit|fee|penalt|exposure|emi|salary/i.test(label)) return ICONS.fees;
      return ICONS.clock;
    };

    const rowsHtml = (comparison.tableRows || [])
      .map((row) => {
        const tds = row.values
          .map((val, idx) => {
            const cls = row.bestIndexes.includes(idx) ? 'cell-better' : row.worstIndexes.includes(idx) ? 'cell-worse' : '';
            return `<td class="${cls}">${escapeHtml(val)}</td>`;
          })
          .join('');
        return `<tr><td><span class="row-label-cell">${rowIcon(row.label)}${escapeHtml(row.label)}</span></td>${tds}</tr>`;
      })
      .join('');

    const warningHtml = !comparison.comparable
      ? `<div class="mismatch-warning-box"><strong>Not Directly Comparable:</strong> ${escapeHtml(comparison.warning)} Ranking has been withheld so you do not compare mismatched contracts.</div>`
      : '';

    const confPct = (lvl) => (/high/i.test(lvl) ? 88 : /med/i.test(lvl) ? 62 : 38);

    const winnerBannerHtml =
      comparison.comparable && comparison.ranking?.safest
        ? `<div class="winner-banner">
             <div class="winner-left">
               <div class="trophy-badge">${ICONS.trophy}</div>
               <div>
                 <span class="sev-pill safe">Safest Choice · Least Risky Based on Our Analysis</span>
                 <h2 style="margin-top:4px;">${escapeHtml(comparison.ranking.safest.title)}</h2>
                 <p class="tiny muted">${escapeHtml(comparison.ranking.safest.reason)}</p>
               </div>
             </div>
             <span class="cat-tag">${escapeHtml(comparison.ranking.safest.confidence)} confidence</span>
           </div>`
        : '';

    const rankingHtml =
      comparison.comparable && comparison.ranking
        ? `
      <div class="ranking-cards-grid">
        <div class="ranking-card safest">
          <div class="section-row-between"><span class="sev-pill safe">Safest</span><span class="cat-tag">${escapeHtml(comparison.ranking.safest.confidence)}</span></div>
          <h3>${escapeHtml(comparison.ranking.safest.title)}</h3>
          <div class="tiny muted">${escapeHtml(comparison.ranking.safest.reason)}</div>
          <div class="conf-meter"><span class="tiny muted">Confidence</span><div class="bar-track"><div class="bar-fill" style="width:${confPct(comparison.ranking.safest.confidence)}%;background:var(--safe);"></div></div></div>
        </div>
        <div class="ranking-card lowest">
          <div class="section-row-between"><span class="badge-accent" style="background:var(--blue-bg);color:var(--blue);border-color:var(--accent-border);">Lowest Cost</span><span class="cat-tag">${escapeHtml(comparison.ranking.lowestCost.confidence)}</span></div>
          <h3>${escapeHtml(comparison.ranking.lowestCost.title)}</h3>
          <div class="tiny muted">${escapeHtml(comparison.ranking.lowestCost.reason)}</div>
          <div class="conf-meter"><span class="tiny muted">Confidence</span><div class="bar-track"><div class="bar-fill" style="width:${confPct(comparison.ranking.lowestCost.confidence)}%;background:var(--blue);"></div></div></div>
        </div>
        <div class="ranking-card balanced">
          <div class="section-row-between"><span class="badge-accent">Most Balanced</span><span class="cat-tag">${escapeHtml(comparison.ranking.mostBalanced.confidence)}</span></div>
          <h3>${escapeHtml(comparison.ranking.mostBalanced.title)}</h3>
          <div class="tiny muted">${escapeHtml(comparison.ranking.mostBalanced.reason)}</div>
          <div class="conf-meter"><span class="tiny muted">Confidence</span><div class="bar-track"><div class="bar-fill" style="width:${confPct(comparison.ranking.mostBalanced.confidence)}%;background:var(--accent);"></div></div></div>
        </div>
      </div>`
        : '';

    const uniqueHtml = (comparison.uniqueRisksPerDocument || [])
      .map(
        (u) => `
      <div style="margin-bottom:12px;">
        <strong>${escapeHtml(u.title)} (${u.risks.length} unique)</strong>
        <div class="diff-list">${
          u.risks.length
            ? u.risks.map((r) => `<div class="diff-item newrisk"><strong>${escapeHtml(r.title)}</strong> <span class="tiny muted">(${escapeHtml(r.risk_level)})</span></div>`).join('')
            : '<div class="tiny muted">No unique risk clauses compared to the other documents.</div>'
        }</div>
      </div>`
      )
      .join('');

    const commonHtml = (comparison.commonRisks || []).length
      ? comparison.commonRisks
          .map((r) => `<div class="diff-item remaining"><strong>${escapeHtml(r.title)}</strong> <span class="tiny muted">(${escapeHtml(r.risk_level)} · Present in all documents)</span></div>`)
          .join('')
      : '<div class="tiny muted">No single risk clause appears in every document.</div>';

    const negHtml = (comparison.combinedNegotiationList || []).length
      ? comparison.combinedNegotiationList
          .map((n) => `<div class="diff-item resolved"><strong>${escapeHtml(n.targetDoc)}:</strong> ${escapeHtml(n.suggestion)}</div>`)
          .join('')
      : '<div class="tiny muted">No cross-document negotiation leverage gaps detected.</div>';

    const out = $('compareResultContainer');
    out.classList.remove('hidden');
    out.innerHTML = `
      ${warningHtml}
      ${winnerBannerHtml}
      ${rankingHtml}
      ${comparison.comparable ? buildCompareSvgChart(docs) : ''}

      <div class="card compare-table-card">
        <div class="section-row-between" style="margin-bottom:12px;flex-wrap:wrap;">
          <h3>Side-by-Side Key Terms Table</h3>
          <span class="tiny muted">Green = less concerning · Yellow = review · Red = potentially more concerning</span>
        </div>
        <div class="table-scroll-wrap">
          <table class="compare-table">
            <thead><tr><th>Key Term</th>${headerCols}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>

      ${
        comparison.comparable && comparison.ranking
          ? `<div class="ai-narrative-box">
               <span class="badge-accent" style="margin-bottom:6px;">AI Comparison Insight</span>
               <p><strong>${escapeHtml(comparison.ranking.safest.title)}</strong> appears <strong>least risky based on our analysis</strong> (${escapeHtml(comparison.ranking.safest.reason)}). For total cost, <strong>${escapeHtml(comparison.ranking.lowestCost.title)}</strong> stands out (${escapeHtml(comparison.ranking.lowestCost.reason)}). Review the combined negotiation checklist below before signing any offer.</p>
             </div>`
          : ''
      }

      <div class="multi-risk-grid">
        <div class="card">
          <h3 style="margin-bottom:10px;">Risks Unique to Each Document</h3>
          ${uniqueHtml}
        </div>
        <div class="card">
          <h3 style="margin-bottom:10px;">Risks in Every Document (${(comparison.commonRisks || []).length})</h3>
          <div class="diff-list">${commonHtml}</div>
          <h3 style="margin:18px 0 8px;">Combined Negotiation Checklist</h3>
          <div class="diff-list">${negHtml}</div>
        </div>
      </div>
    `;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    errEl.innerHTML = `<div class="error-retry-row"><span>Comparison failed: ${escapeHtml(err.message)}</span><button type="button" class="btn-outline sm-btn" id="compareRetryBtn">Retry</button></div>`;
    errEl.classList.remove('hidden');
    $('compareRetryBtn')?.addEventListener('click', runComparison);
  } finally {
    $('compareSkeleton')?.classList.add('hidden');
  }
}

// ==================== DEADLINES TIMELINE & REMINDERS ====================
function computeDaysLeftLabel(isoDate, fallbackDisplay) {
  const d = isoDate ? new Date(isoDate) : fallbackDisplay ? new Date(fallbackDisplay) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Upcoming';
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days <= 30) return `${days} days left`;
  return `In ${days} days`;
}

async function loadDeadlinesView() {
  const active = state.currentAnalysis;
  const extractedEl = $('extractedRemindersList');
  const mileBar = $('timelineMilestonesBar');

  const items = active?.extractedReminders || [];
  const findM = (rx, fallback) => items.find((r) => rx.test(`${r.type || ''} ${r.title || ''}`))?.displayDate || fallback;
  if (mileBar) {
    const milestones = [
      { label: 'Contract Start', date: findM(/start|commence|effective/i, active ? 'Effective Date' : '—'), tone: 'safe' },
      { label: 'Payment Deadline', date: findM(/pay|rent|emi|due/i, active ? '1st / Monthly' : '—'), tone: '' },
      { label: 'Notice Deadline', date: findM(/notice|lock/i, active ? 'Check Clause' : '—'), tone: 'warn' },
      { label: 'Cancellation Cutoff', date: findM(/cancel|opt|exit/i, active ? 'Before Notice' : '—'), tone: 'alert' },
      { label: 'Renewal Date', date: findM(/renew/i, active ? 'Auto-Renewal' : '—'), tone: 'alert' },
      { label: 'Contract End', date: findM(/end|expir/i, active ? 'Term End' : '—'), tone: '' }
    ];
    mileBar.innerHTML = milestones
      .map(
        (m) => `
      <div class="milestone-pill ${m.tone}">
        <span class="kpi-label">${m.label}</span>
        <strong class="tabular" style="font-size:13.2px;">${escapeHtml(m.date)}</strong>
      </div>`
      )
      .join('');
  }

  if (active && items.length) {
    const ren = items.find((r) => /renew|cancel|notice/i.test(`${r.type || ''} ${r.title || ''}`)) || items[0];
    $('heroAlertTitle').textContent = ren.title || 'Automatic renewal detected.';
    $('heroAlertBody').textContent = ren.alertMessage || 'Review the cancellation conditions before the renewal deadline.';
    $('heroAlertConsequence').textContent = ren.consequence || '';
    $('liveDeadlineAlertBanner')?.classList.remove('hidden');
  }

  if (!active) {
    $('deadlinesActiveContractLabel').textContent = 'Analyze any contract (or pick a 1-click demo) to extract its renewal & cancellation timeline.';
    extractedEl.innerHTML = `<div class="empty-state">
      ${ICONS.docEmpty}
      <strong>No contract loaded yet</strong>
      <span>Run a 1-click demo contract to automatically populate renewal cutoffs and lock-in reminders.</span>
      <button type="button" class="btn-primary sm-btn" id="deadlinesLoadDemoBtn">Analyze Bengaluru Rental Demo →</button>
    </div>`;
    $('deadlinesLoadDemoBtn')?.addEventListener('click', () => {
      const s = state.samples[0];
      if (s) analyzePayload({ title: s.title, text: s.text, contractType: s.category, jurisdiction: 'india' });
      else showUploadStudio();
    });
  } else {
    $('deadlinesActiveContractLabel').textContent = `Auto-extracted from: ${active.title}`;
    const items = active.extractedReminders || [];
    extractedEl.innerHTML = items
      .map(
        (r) => `
      <div class="reminder-card ${escapeHtml(r.urgency)}">
        <div class="reminder-card-top">
          <strong>${escapeHtml(r.title)}</strong>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <span class="days-left-chip">${escapeHtml(computeDaysLeftLabel(r.isoDate, r.displayDate))}</span>
            <span class="reminder-date-pill">${escapeHtml(r.displayDate)}</span>
          </div>
        </div>
        <p style="font-size:13.2px;">${escapeHtml(r.alertMessage)}</p>
        <p class="tiny muted"><strong>What happens if ignored:</strong> ${escapeHtml(r.consequence)}</p>
        <div class="reminder-actions">
          <button type="button" class="btn-primary sm-btn save-rem-btn" data-rem='${escapeHtml(JSON.stringify({ ...r, contractTitle: active.title }))}'>Save Reminder</button>
          <button type="button" class="btn-outline sm-btn ics-rem-btn" data-rem='${escapeHtml(JSON.stringify({ ...r, contractTitle: active.title }))}'>Add to Calendar (.ics)</button>
        </div>
      </div>`
      )
      .join('');

    extractedEl.querySelectorAll('.save-rem-btn').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const payload = JSON.parse(btn.dataset.rem);
        const { stats } = await apiFetch('/api/reminders', { method: 'POST', body: JSON.stringify(payload) });
        updateNavBadges(stats);
        showToast(`Reminder saved for ${payload.displayDate}!`);
        renderSavedReminders();
      })
    );

    extractedEl.querySelectorAll('.ics-rem-btn').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const payload = JSON.parse(btn.dataset.rem);
        const res = await fetch('/api/reminders/ics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `contractlens-${payload.type}.ics`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('Downloaded .ics calendar reminder!');
      })
    );
  }

  await renderSavedReminders();
}

async function renderSavedReminders() {
  const { reminders } = await apiFetch('/api/reminders');
  $('remindersCountBadge').textContent = reminders.length;
  const el = $('savedRemindersList');
  if (!reminders.length) {
    el.innerHTML = '<div class="empty-state">No saved reminders yet. Click "🔔 Save Reminder" on any extracted deadline!</div>';
    return;
  }
  el.innerHTML = reminders
    .map(
      (r) => `
    <div class="reminder-card ${escapeHtml(r.urgency || 'yellow')}">
      <div class="reminder-card-top">
        <strong>${escapeHtml(r.title)}</strong>
        <span class="reminder-date-pill">📅 ${escapeHtml(r.displayDate)}</span>
      </div>
      <div class="tiny muted">${escapeHtml(r.contractTitle || '')}</div>
      <p style="font-size:12.6px;">${escapeHtml(r.alertMessage)}</p>
      <div class="reminder-actions">
        <button type="button" class="btn-ghost sm-btn del-rem-btn" data-id="${escapeHtml(r.id)}" style="color:var(--critical);">Remove</button>
      </div>
    </div>`
    )
    .join('');

  el.querySelectorAll('.del-rem-btn').forEach((b) =>
    b.addEventListener('click', async () => {
      const { stats } = await apiFetch(`/api/reminders/${encodeURIComponent(b.dataset.id)}`, { method: 'DELETE' });
      updateNavBadges(stats);
      renderSavedReminders();
    })
  );
}

function triggerDemoDeadlineAlert() {
  const rem = state.currentAnalysis?.extractedReminders?.[0] || {
    title: 'Renewal deadline approaching',
    alertMessage: 'Your agreement may renew automatically on 30 December 2026. Check your cancellation or renewal conditions before the deadline.',
    consequence: 'If you do not take action before the specified date, the contract may continue under its automatic renewal conditions.'
  };
  $('heroAlertTitle').textContent = rem.title;
  $('heroAlertBody').textContent = rem.alertMessage;
  $('heroAlertConsequence').textContent = rem.consequence;
  $('liveDeadlineAlertBanner').classList.remove('hidden');
  showToast('🔔 Contract Deadline Alert triggered!');
}

// ==================== IDEA 9 (COMPULSORY): LEGAL TERMS TRANSLATOR ====================
async function loadGlossaryView(query = '') {
  const { terms } = await apiFetch('/api/glossary', {
    method: 'POST',
    body: JSON.stringify({
      contractText: state.currentAnalysis?.originalText || '',
      query
    })
  });
  state.glossaryTerms = terms;

  const coreQuick = ['Indemnity', 'Liability', 'Arbitration', 'Termination', 'Breach', 'Jurisdiction', 'Exclusivity', 'Waiver', 'Liquidated Damages'];
  $('glossaryQuickPills').innerHTML = coreQuick
    .map((t) => `<button type="button" class="filter-chip" data-quick-term="${escapeHtml(t)}">${escapeHtml(t)}</button>`)
    .join('');
  $('glossaryQuickPills').querySelectorAll('[data-quick-term]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const found = state.glossaryTerms.find((x) => x.term.toLowerCase().includes(btn.dataset.quickTerm.toLowerCase()));
      if (found) {
        state.activeGlossaryId = found.id;
        renderGlossaryGrid();
        renderGlossaryDetail(found);
      }
    })
  );

  if (!terms.find((t) => t.id === state.activeGlossaryId) && terms.length > 0) {
    state.activeGlossaryId = terms[0].id;
  }
  renderGlossaryGrid();
  const activeTerm = terms.find((t) => t.id === state.activeGlossaryId) || terms[0];
  if (activeTerm) renderGlossaryDetail(activeTerm);
}

function renderGlossaryGrid() {
  const grid = $('glossaryCardsGrid');
  grid.innerHTML = state.glossaryTerms
    .map(
      (t) => `
    <button type="button" class="glossary-card ${t.id === state.activeGlossaryId ? 'active' : ''} ${t.inThisContract?.found ? 'in-doc' : ''}" data-term-id="${escapeHtml(t.id)}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <span class="tl-pill ${escapeHtml(t.riskLevel)}">${t.riskLevel === 'red' ? 'High Risk' : t.riskLevel === 'yellow' ? 'Watch' : 'Standard'}</span>
        ${t.inThisContract?.found ? '<span class="badge-soft">In Your Contract</span>' : ''}
      </div>
      <strong style="font-size:14.2px;">${escapeHtml(t.term)}</strong>
      <span class="tiny muted">${escapeHtml(t.category)}</span>
    </button>`
    )
    .join('');

  grid.querySelectorAll('.glossary-card').forEach((card) =>
    card.addEventListener('click', () => {
      state.activeGlossaryId = card.dataset.termId;
      renderGlossaryGrid();
      const term = state.glossaryTerms.find((x) => x.id === state.activeGlossaryId);
      if (term) renderGlossaryDetail(term);
    })
  );
}

function renderGlossaryDetail(t) {
  const meaning = state.eli5Mode ? t.eli5 : t.simpleMeaning;
  const modeLabel = state.eli5Mode ? '🧒 Explained Like You’re New to Contracts' : 'Simple Meaning';
  const inDoc = t.inThisContract;

  $('glossaryDetailPane').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <span class="badge-accent">${escapeHtml(t.category)}</span>
      <span class="tl-pill ${escapeHtml(t.riskLevel)}">${t.riskLevel.toUpperCase()} ATTENTION</span>
    </div>
    <h2 style="font-size:21px;">${escapeHtml(t.term)}</h2>
    <div>
      <div class="kpi-label" style="margin-bottom:4px;">${modeLabel}</div>
      <p style="font-size:14px;line-height:1.6;">${escapeHtml(meaning)}</p>
    </div>
    <div class="in-contract-box">
      <div class="kpi-label" style="margin-bottom:4px;color:var(--accent);">📄 In This Contract ${state.currentAnalysis ? `(${escapeHtml(state.currentAnalysis.title.slice(0, 32))}...)` : ''}</div>
      ${inDoc?.found && inDoc.quote ? `<div class="finding-quote" style="margin:6px 0;">"${escapeHtml(inDoc.quote)}"</div>` : ''}
      <p>${escapeHtml(inDoc?.contractImpact || 'Load a contract in Analyzer & Reader to see exact clause matches here.')}</p>
    </div>
    <div>
      <div class="kpi-label" style="margin-bottom:4px;">Why It Matters</div>
      <p class="tiny muted" style="font-size:13.2px;">${escapeHtml(t.watchOut)}</p>
    </div>
    <div class="detail-callout quote" style="margin:0;">
      <div class="detail-head"><span>Example</span></div>
      <div>${escapeHtml(t.example || `In practice, a "${t.term}" clause may shift extra cost or responsibility onto you unless clear written limits are added.`)}</div>
    </div>
    <div class="detail-callout negotiate" style="margin:0;">
      <div class="detail-head"><span>Ask Before Signing</span></div>
      <div>"${escapeHtml(t.questionToAsk)}"</div>
    </div>`;
}

// ==================== IDEAS 2 & 4: LIVE ECOSYSTEM LAB (EXTENSION + PARTNER WIDGET) ====================
const MOCK_WEBSITES = {
  gig: {
    url: 'https://partners.quickdash.in/onboarding/delivery-agreement',
    heading: 'QuickDash Delivery Partner Agreement — Live Web Portal',
    clauses: [
      {
        title: 'Payment & Deductions',
        text: 'The platform reserves the right to adjust incentives, deduct applicable charges, or modify compensation policies at its discretion without prior notice.'
      },
      {
        title: 'Exclusivity & Mandatory Peak Hours',
        text: 'Partner is an independent contractor waiving overtime and health benefits, yet agrees to strict exclusivity and may not perform work for any other delivery app (Blinkit, Rapido, Swiggy) during mandatory peak hours.'
      },
      {
        title: 'Account Deactivation & Indemnity',
        text: 'Platform may permanently deactivate Partner immediately without notice or payment for pending incentives. Partner agrees to indemnify Platform without any cap on liability.'
      }
    ]
  },
  rental: {
    url: 'https://nestfinder.in/bengaluru/indiranagar-2bhk-lease-terms',
    heading: 'NestFinder Rental Portal — Digital Lease Checkout',
    clauses: [
      {
        title: 'Security Deposit Adjustment',
        text: 'The security deposit shall be retained subject to adjustment for damages, unpaid dues, wear and tear, repainting, and other obligations at Landlord’s sole discretion, returned within 90 days.'
      },
      {
        title: 'Automatic Renewal & Escalation',
        text: 'Unless Tenant delivers notice via registered post 90 days prior to expiration, this Agreement shall automatically renew for 12 months with a 15% rent increase.'
      }
    ]
  },
  loan: {
    url: 'https://fastrupee.in/personal-loan/sanction-terms',
    heading: 'FastRupee FinTech — Online Loan Sanction Terms',
    clauses: [
      {
        title: 'Origination Fee & Daily Compounding APR',
        text: 'An upfront 9% Origination Fee shall be deducted directly from loan proceeds before disbursement while 38.5% APR compounded daily applies on the full principal.'
      },
      {
        title: 'Cross-Default & Prepayment Penalty',
        text: 'Prepayment prior to 24 installments incurs a 6% foreclosure penalty plus 6 months unearned interest. Default on any unrelated credit card triggers Cross-Default acceleration.'
      }
    ]
  }
};

function renderMockBrowserSite(siteKey) {
  state.mockSite = siteKey;
  const site = MOCK_WEBSITES[siteKey] || MOCK_WEBSITES.gig;
  $('mockBrowserUrl').textContent = site.url;
  document.querySelectorAll('.browser-page-switcher .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.mockSite === siteKey));

  const container = $('mockWebpageContent');
  container.innerHTML = `
    <div>
      <span class="badge-soft">Simulated External Webpage</span>
      <h3 style="margin-top:6px;">${escapeHtml(site.heading)}</h3>
      <p class="tiny muted">Click <strong>Explain this</strong> or <strong>Check risks</strong> below to trigger the ContractLens Browser Assistant beside the page.</p>
    </div>
    ${site.clauses
      .map(
        (c, i) => `
      <div class="mock-clause-block">
        <strong>${escapeHtml(c.title)}</strong>
        <p style="margin-top:5px;font-size:13.2px;color:var(--ink-secondary);" id="mockClauseTxt-${i}">"${escapeHtml(c.text)}"</p>
        <div class="mock-clause-actions">
          <button type="button" class="btn-primary sm-btn ext-explain-clause-btn" data-idx="${i}">Understand This with ContractLens AI</button>
          <button type="button" class="btn-outline sm-btn ext-risk-clause-btn" data-idx="${i}">Check Risks</button>
          <button type="button" class="btn-ghost sm-btn ext-ask-clause-btn" data-idx="${i}">Ask AI</button>
        </div>
      </div>`
      )
      .join('')}`;

  const runClauseExplain = async (idx) => {
    const clause = site.clauses[idx];
    const out = $('extAssistantOutput');
    out.innerHTML = '<div class="ext-result-card">Analyzing selected paragraph with ContractLens AI...</div>';
    const { explanation } = await apiFetch('/api/explain', {
      method: 'POST',
      body: JSON.stringify({ text: clause.text, contextMode: 'browser_extension' })
    });
    out.innerHTML = `
      <div class="ext-result-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="tl-pill ${escapeHtml(explanation.trafficLight)}">${explanation.trafficLight.toUpperCase()} RISK</span>
          <span class="tiny muted">${escapeHtml(clause.title)}</span>
        </div>
        <p><strong>AI Explanation:</strong> ${escapeHtml(explanation.simpleMeaning)}</p>
        <p><strong>Why you should check:</strong> ${escapeHtml(explanation.whyYouShouldCheck)}</p>
        <p><strong>What is unclear:</strong> ${escapeHtml(explanation.whatIsUnclear)}</p>
        <div style="background:var(--bg);padding:9px;border-radius:8px;">
          <strong>Ask before agreeing:</strong>
          <ul style="margin:4px 0 0 16px;padding:0;">${(explanation.askBeforeAgreeing || []).map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ul>
        </div>
      </div>`;
  };

  container.querySelectorAll('.ext-explain-clause-btn, .ext-risk-clause-btn, .ext-ask-clause-btn').forEach((btn) =>
    btn.addEventListener('click', () => runClauseExplain(Number(btn.dataset.idx)))
  );
}

async function scanMockFullPage() {
  const site = MOCK_WEBSITES[state.mockSite] || MOCK_WEBSITES.gig;
  const fullText = site.clauses.map((c) => `${c.title}\n${c.text}`).join('\n\n');
  const out = $('extAssistantOutput');
  out.innerHTML = '<div class="ext-result-card">Scanning entire webpage for hidden fees &amp; contract traps...</div>';
  const { analysis } = await apiFetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ title: site.heading, text: fullText, jurisdiction: 'india' })
  });
  out.innerHTML = `
    <div class="ext-result-card">
      <strong>Full Webpage Scan Complete</strong>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <span class="tl-pill red">Safety Score: ${analysis.safetyScore}/100 (${escapeHtml(analysis.grade)})</span>
        <span class="cat-tag">Risk: ${Math.max(0, 100 - analysis.safetyScore)}/100</span>
        <span class="tl-pill red">🔴 ${analysis.trafficLightCounts.red} Red</span>
        <span class="tl-pill yellow">🟡 ${analysis.trafficLightCounts.yellow} Yellow</span>
      </div>
      <p class="tiny">${escapeHtml(analysis.executiveSummary)}</p>
      <button type="button" class="btn-primary sm-btn" id="openScannedInMainBtn">Open Full Report in ContractLens →</button>
    </div>`;
  $('openScannedInMainBtn').addEventListener('click', () => openAnalysisInWorkspace(analysis));
}

async function runPartnerWidgetDemo(targetKey) {
  const clauseText = targetKey === 'gig' ? $('partnerGigClauseText').textContent : $('partnerLoanClauseText').textContent;
  const slot = targetKey === 'gig' ? $('widgetResultGig') : $('widgetResultLoan');
  slot.classList.remove('hidden');
  slot.innerHTML = '<div class="tiny muted">ContractLens Widget analyzing terms...</div>';

  const { explanation } = await apiFetch('/api/explain', {
    method: 'POST',
    body: JSON.stringify({ text: clauseText, contextMode: 'partner_widget' })
  });

  slot.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <strong style="color:var(--accent);">✨ ContractLens Embedded Insight</strong>
      <span class="tl-pill ${escapeHtml(explanation.trafficLight)}">${explanation.trafficLight.toUpperCase()} RISK</span>
    </div>
    <div><strong>What does this mean?</strong> ${escapeHtml(explanation.simpleMeaning)}</div>
    <div><strong>Can this affect my income / wallet?</strong> ${escapeHtml(explanation.affectsIncomeOrWallet)}</div>
    <div><strong>Are there any deductions?</strong> ${escapeHtml(explanation.deductionsRisk)}</div>
    <div><strong>What should I clarify before accepting?</strong> ${(explanation.askBeforeAgreeing || [])[0] || ''}</div>`;
}

// ==================== HISTORY VAULT ====================
function updateNavBadges(stats) {
  if (!stats) return;
  if (typeof stats.totalAudits === 'number') $('historyCountBadge').textContent = stats.totalAudits;
  if (typeof stats.totalReminders === 'number') $('remindersCountBadge').textContent = stats.totalReminders;
}

async function loadHistoryView() {
  const { history, stats } = await apiFetch('/api/history');
  state.vaultItems = history || [];
  updateNavBadges(stats);

  $('historyStatsGrid').innerHTML = `
    <div class="card"><div class="kpi-label">Contracts Audited</div><div class="kpi-big-num">${stats.totalAudits}</div></div>
    <div class="card"><div class="kpi-label">Risks Caught</div><div class="kpi-big-num danger-num">${stats.totalRisksFlagged}</div></div>
    <div class="card"><div class="kpi-label">Saved Reminders</div><div class="kpi-big-num accent-num">${stats.totalReminders}</div></div>
    <div class="card"><div class="kpi-label">Avg. Safety Score</div><div class="kpi-big-num">${stats.avgSafetyScore !== null ? `${stats.avgSafetyScore}/100` : '—'}</div></div>
  `;

  renderVaultGrid();
}

function renderVaultGrid() {
  const list = $('historyListContainer');
  if (!list) return;

  const q = (state.vaultSearch || '').trim().toLowerCase();
  const f = state.vaultFilter || 'all';
  const filtered = state.vaultItems.filter((item) => {
    const typeKey = item.contractType?.type || '';
    if (f === 'highrisk' && item.safetyScore >= 50) return false;
    if (f !== 'all' && f !== 'highrisk' && typeKey !== f) return false;
    if (q) {
      const hay = `${item.title || ''} ${item.contractType?.label || ''} ${item.verdict || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      ${ICONS.docEmpty}
      <strong>${state.vaultItems.length ? 'No contracts match your search or filter' : 'Your Contract Vault is empty'}</strong>
      <span>${state.vaultItems.length ? 'Try clearing the filter to see all saved contracts.' : 'Analyze any contract or 1-click demo to store it safely on this device.'}</span>
      <button type="button" class="btn-primary sm-btn" id="vaultEmptyCtaBtn">${state.vaultItems.length ? 'Reset Filters' : '+ Analyze a Contract'}</button>
    </div>`;
    $('vaultEmptyCtaBtn')?.addEventListener('click', () => {
      if (state.vaultItems.length) {
        state.vaultSearch = '';
        state.vaultFilter = 'all';
        if ($('vaultSearchInput')) $('vaultSearchInput').value = '';
        document.querySelectorAll('#vaultFilterBar .filter-chip').forEach((c) => c.classList.toggle('active', c.dataset.vaultFilter === 'all'));
        renderVaultGrid();
      } else {
        showUploadStudio();
      }
    });
    return;
  }

  list.innerHTML = filtered
    .map(
      (item) => {
        const statusTone = item.safetyScore >= 75 ? 'safe' : item.safetyScore >= 50 ? 'medium' : 'critical';
        const statusLabel = item.safetyScore >= 75 ? 'Ready to Review' : item.safetyScore >= 50 ? 'Needs Clarification' : 'Attention Required';
        const analyzedDate = item.analyzedAt ? new Date(item.analyzedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
        const renewalLabel = item.renewalDate || (item.trafficLightCounts?.red > 2 ? 'Check Renewal Window' : 'Standard Term');
        return `
    <div class="card history-card">
      <div class="history-card-top">
        <div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span class="domain-pill">${escapeHtml(item.contractType?.label || 'Contract')}</span>
            <span class="sev-pill ${statusTone}">${statusLabel}</span>
          </div>
          <h3 style="font-size:15.5px;margin-top:7px;">${escapeHtml(item.title)}</h3>
          <p class="tiny muted">${escapeHtml(item.verdict)}</p>
        </div>
        <div class="vault-ring-wrap" title="Safety Score ${item.safetyScore}/100 (Grade ${escapeHtml(item.grade)})">${buildMiniRingSvg(item.safetyScore, 52)}</div>
      </div>
      <div class="vault-card-meta-grid">
        <div><strong>Analyzed:</strong> ${escapeHtml(analyzedDate)}</div>
        <div><strong>Renewal:</strong> ${escapeHtml(renewalLabel)}</div>
        <div><strong>Safety:</strong> ${item.safetyScore}/100 (Risk ${Math.max(0, 100 - item.safetyScore)})</div>
        <div><strong>Exposure:</strong> ${formatMoney(item.financialExposure, item.currency)}</div>
      </div>
      <div class="vault-actions-row">
        <button type="button" class="btn-primary sm-btn open-audit-btn" data-id="${escapeHtml(item.id)}">Open</button>
        <button type="button" class="btn-outline sm-btn cmp-audit-btn" data-id="${escapeHtml(item.id)}">Compare</button>
        <button type="button" class="btn-outline sm-btn ask-audit-btn" data-id="${escapeHtml(item.id)}">Ask AI</button>
        <button type="button" class="btn-outline sm-btn risks-audit-btn" data-id="${escapeHtml(item.id)}">View Risks</button>
        <button type="button" class="btn-ghost sm-btn del-audit-btn" data-id="${escapeHtml(item.id)}" style="color:var(--critical);margin-left:auto;">Delete</button>
      </div>
    </div>`;
      }
    )
    .join('');

  const openVaultDoc = async (id, tab = 'findings') => {
    const { analysis } = await apiFetch(`/api/history/${encodeURIComponent(id)}`);
    openAnalysisInWorkspace(analysis, tab);
  };
  list.querySelectorAll('.open-audit-btn').forEach((b) => b.addEventListener('click', () => openVaultDoc(b.dataset.id, 'findings')));
  list.querySelectorAll('.ask-audit-btn').forEach((b) => b.addEventListener('click', () => openVaultDoc(b.dataset.id, 'chat')));
  list.querySelectorAll('.risks-audit-btn').forEach((b) => b.addEventListener('click', () => openVaultDoc(b.dataset.id, 'bys')));
  list.querySelectorAll('.cmp-audit-btn').forEach((b) =>
    b.addEventListener('click', async () => {
      const { analysis } = await apiFetch(`/api/history/${encodeURIComponent(b.dataset.id)}`);
      state.compareDocs[0] = {
        id: 'doc-1',
        title: analysis.title,
        text: analysis.originalText,
        fileName: analysis.fileName || null,
        status: 'parsed',
        statusMsg: `Loaded (${analysis.wordCount} words)`
      };
      switchView('compare');
      renderCompareDocCards();
    })
  );
  list.querySelectorAll('.del-audit-btn').forEach((b) =>
    b.addEventListener('click', async () => {
      await apiFetch(`/api/history/${encodeURIComponent(b.dataset.id)}`, { method: 'DELETE' });
      showToast('Removed from Vault');
      loadHistoryView();
    })
  );
}

// ==================== THEME, SETTINGS & EVENTS ====================
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('cl_theme', t);
  $('themeIconSun').classList.toggle('hidden', t !== 'dark');
  $('themeIconMoon').classList.toggle('hidden', t === 'dark');
}

function updateEnginePill() {
  const labels = { local: 'ContractLens NLP', gemini: 'Hybrid + Gemini', openai: 'Hybrid + OpenAI' };
  $('engineBadgeText').textContent = labels[state.llmConfig.provider] || 'ContractLens NLP';
}

function bindEvents() {
  $('brandHomeBtn').addEventListener('click', showUploadStudio);
  document.querySelectorAll('.nav-pill').forEach((p) => p.addEventListener('click', () => switchView(p.dataset.view)));
  document.querySelectorAll('[data-jump-view]').forEach((b) =>
    b.addEventListener('click', () => {
      switchView(b.dataset.jumpView);
      if (b.dataset.jumpView === 'compare') loadIndianRentalCompareDemo();
    })
  );

  $('backToUploadBtn').addEventListener('click', showUploadStudio);
  $('historyNewScanBtn').addEventListener('click', showUploadStudio);
  $('jumpToDeadlinesBtn').addEventListener('click', () => switchView('deadlines'));
  $('themeToggleBtn').addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

  document.querySelectorAll('#domainSelector .seg-btn').forEach((b) =>
    b.addEventListener('click', () => {
      state.selectedDomain = b.dataset.domain;
      document.querySelectorAll('#domainSelector .seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    })
  );

  // Dropzone
  const dz = $('dropzone');
  const fi = $('fileInput');
  dz.addEventListener('click', (e) => { if (e.target.id !== 'clearFileBtn') fi.click(); });
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer?.files?.[0]) handleFileSelection(e.dataTransfer.files[0]); });
  fi.addEventListener('change', () => { if (fi.files?.[0]) handleFileSelection(fi.files[0]); });
  $('clearFileBtn').addEventListener('click', (e) => { e.stopPropagation(); clearSelectedFile(); });
  $('contractTextInput').addEventListener('input', updateWordCounter);

  $('analyzeBtn').addEventListener('click', () => {
    const pasted = $('contractTextInput').value.trim();
    if (!pasted && !state.selectedFile) { showUploadError('Upload a contract file, paste text, or click a 1-click demo on the right.'); return; }
    analyzePayload({
      title: $('contractTitleInput').value.trim(),
      text: pasted || undefined,
      fileName: state.selectedFile?.fileName,
      contentBase64: !pasted ? state.selectedFile?.contentBase64 : undefined,
      contractType: state.selectedDomain,
      jurisdiction: $('uploadJurisdictionSelect').value
    });
  });

  // Idea 3: Mouse Text Selection Popover inside Smart PDF Reader!
  $('annotatedDocBody').addEventListener('mouseup', (e) => {
    const sel = window.getSelection()?.toString().trim() || '';
    if (sel.length < 10) { hideSelectionPopover(); return; }
    state.selectedReaderText = sel;
    const pop = $('selectionPopover');
    pop.style.top = `${Math.max(70, e.clientY - 48)}px`;
    pop.style.left = `${Math.max(16, Math.min(window.innerWidth - 270, e.clientX - 90))}px`;
    pop.classList.remove('hidden');
  });
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#selectionPopover') && !e.target.closest('#annotatedDocBody')) hideSelectionPopover();
  });
  $('popExplainBtn').addEventListener('click', () => explainTextInReader(state.selectedReaderText));
  $('popDefineBtn').addEventListener('click', async () => {
    hideSelectionPopover();
    const { translation } = await apiFetch('/api/glossary', {
      method: 'POST',
      body: JSON.stringify({ term: state.selectedReaderText.slice(0, 40), contractText: state.currentAnalysis?.originalText || '' })
    });
    state.activeGlossaryId = translation.id;
    switchView('translator');
    setTimeout(() => renderGlossaryDetail(translation), 80);
  });
  $('closeExplainDrawerBtn').addEventListener('click', () => $('readerExplainDrawer').classList.add('hidden'));
  $('demoSelectSentenceBtn').addEventListener('click', () => {
    const sampleExcerpt =
      state.currentAnalysis?.findings?.[0]?.excerpt ||
      'The security deposit shall be retained subject to adjustment for damages, unpaid dues, and other obligations.';
    explainTextInReader(sampleExcerpt);
  });

  // Hero Primary & Secondary CTAs + Feature Capability Pills
  $('heroAnalyzeCtaBtn')?.addEventListener('click', () => {
    const pasted = $('contractTextInput')?.value.trim();
    if (pasted || state.selectedFile) {
      $('analyzeBtn')?.click();
    } else {
      $('uploadStudioAnchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('dropzone')?.focus();
    }
  });
  $('heroExploreCtaBtn')?.addEventListener('click', () => {
    const s = state.samples[0];
    if (s) analyzePayload({ title: s.title, text: s.text, contractType: s.category, jurisdiction: 'india' });
    else $('uploadStudioAnchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.querySelectorAll('.feature-pill').forEach((pill) =>
    pill.addEventListener('click', () => {
      const cap = pill.dataset.cap;
      if (cap === 'compare') { switchView('compare'); loadThreeOfferRentalDemo(); runComparison(); }
      else if (cap === 'translator') switchView('translator');
      else if (cap === 'deadlines') switchView('deadlines');
      else if (cap === 'whatif') switchView('whatif');
      else if (cap === 'chat' && state.samples[0]) {
        const s = state.samples[0];
        analyzePayload({ title: s.title, text: s.text, contractType: s.category, jurisdiction: 'india', initialTab: 'chat' });
      } else {
        $('uploadStudioAnchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    })
  );

  // Selection Popover extra actions: Check Risk & Ask AI
  $('popRiskBtn')?.addEventListener('click', () => explainTextInReader(state.selectedReaderText));
  $('popAskBtn')?.addEventListener('click', () => {
    hideSelectionPopover();
    setActiveIntelTab('chat');
    if (state.selectedReaderText) {
      sendChatMessage(`Explain the risks in this clause: "${state.selectedReaderText.slice(0, 180)}"`);
    }
  });

  // Home 1-click "Compare these 3 samples" demo & Role Select
  $('homeCompare3DemoBtn')?.addEventListener('click', () => {
    switchView('compare');
    loadThreeOfferRentalDemo();
    runComparison();
  });
  $('uploadRoleSelect')?.addEventListener('change', (e) => { state.userRole = e.target.value; });
  $('toastCloseBtn')?.addEventListener('click', () => $('toast')?.classList.add('hidden'));

  // Keyboard Escape closes Drawer & Settings Modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('draftMessageModal')?.classList.add('hidden');
      $('settingsModal')?.classList.add('hidden');
      hideSelectionPopover();
    }
  });
  $('draftMessageModal')?.addEventListener('click', (e) => {
    if (e.target === $('draftMessageModal')) $('draftMessageModal').classList.add('hidden');
  });
  $('settingsModal')?.addEventListener('click', (e) => {
    if (e.target === $('settingsModal')) $('settingsModal').classList.add('hidden');
  });

  // Vault Search & Filter Chips
  $('vaultSearchInput')?.addEventListener('input', (e) => {
    state.vaultSearch = e.target.value;
    renderVaultGrid();
  });
  document.querySelectorAll('#vaultFilterBar .filter-chip').forEach((chip) =>
    chip.addEventListener('click', () => {
      state.vaultFilter = chip.dataset.vaultFilter;
      document.querySelectorAll('#vaultFilterBar .filter-chip').forEach((c) => c.classList.toggle('active', c === chip));
      renderVaultGrid();
    })
  );

  // Command strip: Role + Jurisdiction + 8-Language Flexible Voice Assistant
  document.querySelectorAll('#uploadRoleSelector .role-pill').forEach((b) =>
    b.addEventListener('click', () => {
      state.userRole = b.dataset.role;
      document.querySelectorAll('#uploadRoleSelector .role-pill').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    })
  );
  $('wsRoleSelect')?.addEventListener('change', (e) => refreshRolePerspective(e.target.value));
  $('wsJurisdictionSelect').addEventListener('change', (e) => { state.jurisdiction = e.target.value; refreshJurisdictionAudit(); });
  $('wsLangSelect').addEventListener('change', async (e) => {
    stopVoiceBriefing();
    state.language = e.target.value;
    state.selectedVoiceUri = 'auto';
    populateVoiceOptions();
    await loadLocalizedBriefing(state.language);
    showToast(`Audio & briefing switched to ${e.target.options[e.target.selectedIndex].text}`);
  });
  $('wsVoiceSelect')?.addEventListener('change', (e) => { state.selectedVoiceUri = e.target.value; });
  $('wsSpeechRateSelect')?.addEventListener('change', (e) => { state.speechRate = Number(e.target.value) || 1; });
  $('voiceBriefBtn').addEventListener('click', toggleVoiceBriefing);
  $('voiceAskMicBtn')?.addEventListener('click', triggerVoiceAskCommand);
  $('closeLocalizedBtn').addEventListener('click', () => $('localizedBriefBanner').classList.add('hidden'));

  // 4-Level AI Explanation Depth Switcher (#24)
  document.querySelectorAll('#explanationDepthSelector .seg-btn').forEach((b) =>
    b.addEventListener('click', () => {
      state.explanationDepth = b.dataset.depth;
      document.querySelectorAll('#explanationDepthSelector .seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      renderFindingsList();
    })
  );

  // Custom "What Can Go Wrong?" Scenario Flow (#7)
  document.querySelectorAll('#scenarioQuickPills .chat-chip').forEach((c) =>
    c.addEventListener('click', () => {
      $('scenarioInput').value = c.dataset.scen;
      runHypotheticalScenario(c.dataset.scen);
    })
  );
  $('scenarioForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    runHypotheticalScenario($('scenarioInput').value);
  });

  // Version History (#13), Contract Memory (#22), Privacy Clear (#23)
  $('runVersionHistoryDemoBtn')?.addEventListener('click', runVersionHistoryDemo);
  document.querySelectorAll('#memoryQuickPills .chat-chip').forEach((c) =>
    c.addEventListener('click', () => {
      $('memoryInput').value = c.dataset.mem;
      runMemoryQuery(c.dataset.mem);
    })
  );
  $('memoryForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    runMemoryQuery($('memoryInput').value);
  });
  $('clearAllPrivacyBtn')?.addEventListener('click', async () => {
    const { stats } = await apiFetch('/api/privacy/clear', { method: 'POST' });
    state.currentAnalysis = null;
    updateNavBadges(stats);
    loadHistoryView();
    $('memoryResultBox')?.classList.add('hidden');
    showToast('🔒 All saved contracts, reminders & session data cleared.');
  });

  // Reader modes & Auto-Redline
  document.querySelectorAll('#docModeToggle .seg-btn').forEach((b) => b.addEventListener('click', () => setDocMode(b.dataset.docMode)));
  $('fixAllClausesBtn').addEventListener('click', () => {
    if (!state.currentAnalysis) return;
    state.selectedFindingIds = new Set(state.currentAnalysis.findings.map((f) => f.id));
    renderFindingsList();
    refreshNegotiationEmail();
    refreshAutoRedline();
    showToast('✨ All risks auto-rewritten to fair wording!');
  });
  $('copyCleanContractBtn').addEventListener('click', async () => {
    if (state.lastRedlineResult) { await navigator.clipboard.writeText(state.lastRedlineResult.cleanContractText); showToast('Clean rewritten contract copied!'); }
  });
  $('downloadCleanContractBtn').addEventListener('click', () => {
    if (!state.lastRedlineResult) return;
    const blob = new Blob([state.lastRedlineResult.cleanContractText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'contractlens-clean-redline.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Right pane keyboard-operable tabs & filters
  const intelTabBtns = [...document.querySelectorAll('#intelTabs .intel-tab')];
  intelTabBtns.forEach((t, idx) => {
    t.addEventListener('click', () => setActiveIntelTab(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = (idx + 1) % intelTabBtns.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + intelTabBtns.length) % intelTabBtns.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = intelTabBtns.length - 1;
      if (next !== null) {
        e.preventDefault();
        setActiveIntelTab(intelTabBtns[next].dataset.tab);
        intelTabBtns[next].focus();
      }
    });
  });
  window.addEventListener('resize', () => requestAnimationFrame(updateTabSlider));
  document.querySelectorAll('#findingFilterBar .filter-chip').forEach((c) => c.addEventListener('click', () => { state.activeFilter = c.dataset.filter; renderFindingsList(); }));

  // Chat & Sparring & Playbook
  $('chatForm').addEventListener('submit', (e) => { e.preventDefault(); sendChatMessage($('chatInput').value); });
  $('sparringClauseSelect').addEventListener('change', startSparringRound);
  $('sparringDifficultySelect').addEventListener('change', startSparringRound);
  $('sparringForm').addEventListener('submit', (e) => { e.preventDefault(); sendSparringMove($('sparringInput').value); });

  document.querySelectorAll('#emailToneSelector .seg-btn').forEach((b) => b.addEventListener('click', () => { state.emailTone = b.dataset.tone; refreshNegotiationEmail(); }));
  $('emailRecipientInput').addEventListener('input', refreshNegotiationEmail);
  $('emailSenderInput').addEventListener('input', refreshNegotiationEmail);
  $('copyEmailBtn').addEventListener('click', async () => { await navigator.clipboard.writeText($('negotiationEmailBox').value); showToast('Email copied!'); });
  $('downloadEmailBtn').addEventListener('click', () => {
    const blob = new Blob([$('negotiationEmailBox').value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'contractlens-negotiation.txt'; a.click(); URL.revokeObjectURL(a.href);
  });

  $('exportReportBtn').addEventListener('click', () => window.print());
  $('draftWholeContractBtn')?.addEventListener('click', () => {
    if (!state.currentAnalysis) return;
    const selected = state.currentAnalysis.findings.filter((f) => state.selectedFindingIds.has(f.id));
    openDraftMessageModal({
      title: `Draft Message — ${state.currentAnalysis.title}`,
      findings: selected.length ? selected : state.currentAnalysis.findings
    });
  });
  const closeDraftMod = () => $('draftMessageModal')?.classList.add('hidden');
  $('closeDraftModalBtn')?.addEventListener('click', closeDraftMod);
  $('cancelDraftModalBtn')?.addEventListener('click', closeDraftMod);
  $('copyDraftModalBtn')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText($('draftModalTextarea').value);
    showToast('Draft message copied — remember to review before sending!');
  });

  $('sendToCompareBtn').addEventListener('click', () => {
    if (state.currentAnalysis) {
      state.compareDocs[0] = {
        id: 'doc-1',
        title: state.currentAnalysis.title,
        text: state.currentAnalysis.originalText,
        fileName: state.currentAnalysis.fileName || null,
        status: 'parsed',
        statusMsg: `✓ Loaded (${state.currentAnalysis.wordCount} words)`
      };
    }
    switchView('compare');
    renderCompareDocCards();
  });

  // Compare view (2-5 multi-document cards)
  $('loadThreeOfferDemoBtn')?.addEventListener('click', () => {
    loadThreeOfferRentalDemo();
    runComparison();
  });
  $('loadIndianCompareDemoBtn')?.addEventListener('click', () => {
    loadIndianRentalCompareDemo();
    runComparison();
  });
  $('addCompareDocBtn')?.addEventListener('click', addNewCompareDocCard);
  $('runCompareBtn').addEventListener('click', runComparison);

  // Deadlines view
  $('testAlertBtn').addEventListener('click', triggerDemoDeadlineAlert);
  $('closeHeroAlertBtn').addEventListener('click', () => $('liveDeadlineAlertBanner').classList.add('hidden'));

  // Legal Translator (Idea 9)
  $('eli5Toggle').addEventListener('change', (e) => {
    state.eli5Mode = e.target.checked;
    const active = state.glossaryTerms.find((x) => x.id === state.activeGlossaryId);
    if (active) renderGlossaryDetail(active);
    showToast(state.eli5Mode ? '🧒 Beginner (ELI5) Mode ON' : 'Standard Plain-English Mode ON');
  });
  $('glossarySearchInput').addEventListener('input', (e) => loadGlossaryView(e.target.value));

  // Ecosystem Lab (Ideas 2 & 4)
  document.querySelectorAll('#ecosystemSubTabs .seg-btn').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('#ecosystemSubTabs .seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      $('ecoExtensionView').classList.toggle('hidden', b.dataset.eco !== 'extension');
      $('ecoWidgetView').classList.toggle('hidden', b.dataset.eco !== 'widget');
    })
  );
  document.querySelectorAll('.browser-page-switcher .seg-btn').forEach((b) => b.addEventListener('click', () => renderMockBrowserSite(b.dataset.mockSite)));
  $('extScanFullPageBtn').addEventListener('click', scanMockFullPage);
  document.querySelectorAll('.understand-ai-btn').forEach((b) => b.addEventListener('click', () => runPartnerWidgetDemo(b.dataset.widgetTarget)));
  $('copySdkBtn').addEventListener('click', async () => { await navigator.clipboard.writeText($('sdkCodeSnippet').textContent); showToast('1-Line Partner SDK copied!'); });

  // Settings Modal
  const toggleKey = () => $('apiKeyGroup').classList.toggle('hidden', $('llmProviderSelect').value === 'local');
  $('openSettingsBtn').addEventListener('click', () => { $('llmProviderSelect').value = state.llmConfig.provider; $('llmApiKeyInput').value = state.llmConfig.apiKey; toggleKey(); $('settingsModal').classList.remove('hidden'); });
  $('llmProviderSelect').addEventListener('change', toggleKey);
  const closeMod = () => $('settingsModal').classList.add('hidden');
  $('closeSettingsBtn').addEventListener('click', closeMod);
  $('cancelSettingsBtn').addEventListener('click', closeMod);
  $('saveSettingsBtn').addEventListener('click', () => {
    state.llmConfig.provider = $('llmProviderSelect').value;
    state.llmConfig.apiKey = $('llmApiKeyInput').value.trim();
    sessionStorage.setItem('cl_llm_provider', state.llmConfig.provider);
    sessionStorage.setItem('cl_llm_apikey', state.llmConfig.apiKey);
    updateEnginePill();
    closeMod();
    showToast('Engine settings saved');
  });
}

async function init() {
  applyTheme(localStorage.getItem('cl_theme') || 'light');
  updateEnginePill();
  if ($('sdkCodeSnippet')) {
    $('sdkCodeSnippet').textContent = `<div data-contractlens-clause>Your agreement terms here...</div>\n<script src="${window.location.origin}/widget.js"></script>`;
  }
  bindEvents();
  if ('speechSynthesis' in window) {
    populateVoiceOptions();
    window.speechSynthesis.onvoiceschanged = populateVoiceOptions;
  }
  await loadSamples();
  try {
    const { stats } = await apiFetch('/api/health');
    updateNavBadges(stats);
  } catch {
    // ignore
  }
}

init();
