// ─────────────────────────────────────────────────────────────────────────────
// HEIST — Hierarchical Zoom Animation
// Illustrates: Spatial Cell Graph → Gene Regulatory Network → Cross-Level Message Passing
// Vanilla JS · Canvas 2D · Zero dependencies
// ─────────────────────────────────────────────────────────────────────────────

export function initHEISTAnimation(container, opts = {}) {
  // ── Options ──────────────────────────────────────────────────────────────
  const O = {
    width: opts.width || 1200,
    height: opts.height || 700,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    accentColor: opts.accentColor || '#00d4ff',
    ...opts,
  };

  // ── DOM Setup ────────────────────────────────────────────────────────────
  const wrap = typeof container === 'string' ? document.querySelector(container) : container;
  if (!wrap) return null;

  wrap.style.position = 'relative';

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  wrap.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, cW, cH; // logical and canvas sizes

  function resize() {
    const rect = wrap.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    cW = W * O.pixelRatio;
    cH = H * O.pixelRatio;
    canvas.width = cW;
    canvas.height = cH;
    ctx.setTransform(O.pixelRatio, 0, 0, O.pixelRatio, 0, 0);
  }
  resize();

  // ── Metrics Panel (DOM overlay) ──────────────────────────────────────────
  const panel = document.createElement('div');
  panel.className = 'heist-panel';
  Object.assign(panel.style, {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    width: '310px',
    background: 'rgba(8,10,18,0.88)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '22px 24px',
    fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
    fontSize: '11.5px',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: '1.6',
    zIndex: '10',
    pointerEvents: 'none',
    userSelect: 'none',
  });
  wrap.appendChild(panel);


  // ── Utilities ────────────────────────────────────────────────────────────
  const PI2 = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ease = {
    inOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ── Color Palette ────────────────────────────────────────────────────────
  const COLORS = {
    bg: '#060810',
    tumor: { fill: '#1a3a5c', glow: '#2d7dc4', nucleus: '#4a9de8', rim: 'rgba(45,125,196,0.25)', label: 'Tumor' },
    immune: { fill: '#4a3520', glow: '#d4883a', nucleus: '#f5a543', rim: 'rgba(212,136,58,0.25)', label: 'Immune' },
    stromal: { fill: '#1a3a2a', glow: '#3aad6b', nucleus: '#52d88a', rim: 'rgba(58,173,107,0.25)', label: 'Stromal' },
    edge: 'rgba(100,180,255,0.08)',
    edgePulse: 'rgba(100,180,255,0.35)',
    scanBeam: '#00d4ff',
    gene: { fill: '#1c2844', glow: '#5b8fd4', bright: '#8ab8f0' },
    tf: { fill: '#3d2a10', glow: '#f59e0b', bright: '#fbbf24' },
    geneEdge: 'rgba(91,143,212,0.12)',
    tfEdge: 'rgba(245,158,11,0.22)',
    signalIn: '#00d4ff',
    signalOut: '#f59e0b',
  };

  const CELL_TYPES = ['tumor', 'immune', 'stromal'];

  // ── Generate Tissue Cells ────────────────────────────────────────────────
  const cells = [];
  const CELL_COUNT = 56;
  const MARGIN = 80;

  // Cluster centers
  const clusters = [
    { x: W * 0.32, y: H * 0.38, type: 'tumor', r: W * 0.18, count: 18 },
    { x: W * 0.62, y: H * 0.52, type: 'tumor', r: W * 0.14, count: 12 },
    { x: W * 0.18, y: H * 0.65, type: 'immune', r: W * 0.13, count: 8 },
    { x: W * 0.78, y: H * 0.30, type: 'immune', r: W * 0.11, count: 6 },
    { x: W * 0.48, y: H * 0.22, type: 'stromal', r: W * 0.15, count: 7 },
    { x: W * 0.55, y: H * 0.78, type: 'stromal', r: W * 0.12, count: 5 },
  ];

  // Wobble path control points for cell outline
  function makeWobble(cx, cy, baseR, nPts = 10) {
    const pts = [];
    for (let i = 0; i < nPts; i++) {
      const angle = (PI2 / nPts) * i;
      const wobble = baseR * rand(0.88, 1.12);
      pts.push({
        x: cx + Math.cos(angle) * wobble,
        y: cy + Math.sin(angle) * wobble,
        phase: rand(0, PI2),
        amp: baseR * rand(0.01, 0.03),
        speed: rand(0.3, 0.8),
      });
    }
    return pts;
  }

  clusters.forEach((cl) => {
    for (let i = 0; i < cl.count; i++) {
      const angle = rand(0, PI2);
      const rr = rand(0, cl.r) * Math.sqrt(Math.random()); // uniform disk
      const x = clamp(cl.x + Math.cos(angle) * rr, MARGIN, W - MARGIN);
      const y = clamp(cl.y + Math.sin(angle) * rr, MARGIN, H - MARGIN);
      const baseR = rand(16, 28);
      cells.push({
        x, y,
        baseR,
        type: cl.type,
        wobble: makeWobble(x, y, baseR),
        nucleusOff: { x: rand(-3, 3), y: rand(-3, 3) },
        nucleusR: baseR * rand(0.32, 0.42),
        pulsePhase: rand(0, PI2),
        pulseSpeed: rand(0.4, 0.9),
      });
    }
  });

  // ── Spatial Edges (k-nearest + distance threshold) ───────────────────────
  const spatialEdges = [];
  const EDGE_DIST = 110;
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const d = dist(cells[i], cells[j]);
      if (d < EDGE_DIST) {
        spatialEdges.push({ i, j, d, pulsePhase: rand(0, PI2) });
      }
    }
  }

  // ── Spotlight Cell (pick a tumor cell near center) ───────────────────────
  let spotlightIdx = 0;
  let bestDist = Infinity;
  cells.forEach((c, idx) => {
    if (c.type === 'tumor') {
      const d = dist(c, { x: W * 0.42, y: H * 0.42 });
      if (d < bestDist) { bestDist = d; spotlightIdx = idx; }
    }
  });
  const spotCell = cells[spotlightIdx];

  // ── GRN (Gene Regulatory Network) inside spotlight cell ──────────────────
  const grnNodes = [];
  const grnEdges = [];
  const GENE_COUNT = 22;
  const TF_COUNT = 4;
  const GENE_NAMES = [
    'VEGFA', 'TP53', 'MYC', 'BRCA1', 'EGFR', 'CDH1', 'PTEN', 'AKT1',
    'MAPK1', 'JAK2', 'STAT3', 'FOXP3', 'CD274', 'IL6', 'TNF', 'KRAS',
    'BCL2', 'NOTCH1', 'WNT5A', 'HIF1A', 'SOX2', 'CTLA4',
  ];
  const TF_NAMES = ['NF-κB', 'STAT3', 'HIF1α', 'MYC'];

  // Place genes in a multi-ring layout: TFs inner, genes in outer rings
  const grnR = 135; // radius of GRN area

  // TFs in a tight inner ring
  for (let i = 0; i < TF_COUNT; i++) {
    const angle = (PI2 / TF_COUNT) * i + PI2 / 8; // offset for visual variety
    const r = rand(28, 48);
    grnNodes.push({
      lx: Math.cos(angle) * r,
      ly: Math.sin(angle) * r,
      isTF: true,
      name: TF_NAMES[i],
      expression: rand(0.7, 1.0),
      w: rand(10, 13),
      h: rand(10, 13),
      activateT: -1,
      pulsePhase: rand(0, PI2),
    });
  }
  // Genes: golden-angle spiral for organic fill
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < GENE_COUNT; i++) {
    const angle = goldenAngle * (i + TF_COUNT) + rand(-0.12, 0.12);
    const frac = (i + 1) / GENE_COUNT;
    const r = 40 + frac * (grnR * 0.78 - 40) + rand(-8, 8);
    grnNodes.push({
      lx: Math.cos(angle) * r,
      ly: Math.sin(angle) * r,
      isTF: false,
      name: GENE_NAMES[i],
      expression: rand(0.15, 1.0),
      w: rand(7, 10),
      h: rand(3.5, 5),
      activateT: -1,
      pulsePhase: rand(0, PI2),
    });
  }

  // GRN edges: TFs → genes (regulatory), and some co-expression among genes
  const tfIndices = grnNodes.map((n, i) => n.isTF ? i : -1).filter((i) => i >= 0);
  const geneIndices = grnNodes.map((n, i) => !n.isTF ? i : -1).filter((i) => i >= 0);
  tfIndices.forEach((tfi) => {
    const targets = randInt(3, 5);
    const picked = new Set();
    for (let t = 0; t < targets; t++) {
      let gi;
      do { gi = geneIndices[randInt(0, geneIndices.length - 1)]; } while (picked.has(gi));
      picked.add(gi);
      grnEdges.push({ from: tfi, to: gi, isTF: true });
    }
  });
  // Co-expression edges
  for (let i = 0; i < 14; i++) {
    const a = geneIndices[randInt(0, geneIndices.length - 1)];
    let b;
    do { b = geneIndices[randInt(0, geneIndices.length - 1)]; } while (b === a);
    grnEdges.push({ from: a, to: b, isTF: false });
  }

  // ── Neighboring cells for cross-level signals ────────────────────────────
  const neighbors = [];
  spatialEdges.forEach((e) => {
    if (e.i === spotlightIdx) neighbors.push(cells[e.j]);
    if (e.j === spotlightIdx) neighbors.push(cells[e.i]);
  });

  // ── Signal Particles ─────────────────────────────────────────────────────
  const MAX_SIGNALS = 60;
  const signals = [];

  function spawnSignal(sx, sy, tx, ty, color, speed, delay = 0) {
    signals.push({
      sx, sy, tx, ty, color, speed,
      t: -delay,
      alive: true,
      trail: [],
    });
  }

  // ── Animation State ──────────────────────────────────────────────────────
  let phase = 1;
  let phaseTime = 0;
  const PHASE_DUR = [0, 9.5, 10.0, 14.0]; // seconds per phase (phase 0 unused)
  let time = 0;
  let running = true;
  let scanX = -100;

  // Zoom state
  let zoomProgress = 0; // 0 = tissue view, 1 = fully zoomed
  let zoomCx = spotCell.x;
  let zoomCy = spotCell.y;

  // Cross-level wave timing
  let waveTimer = 0;
  const WAVE_INTERVAL = 3.5;
  let waveDir = 'in'; // 'in' or 'out'

  // Metrics
  const metrics = {
    cellCoherence: { value: 0, target: 0.94, label: 'Cell Embedding Coherence' },
    grnScore: { value: 0, target: 0.87, label: 'GRN Activation Score' },
    microDiv: { value: 0, target: 0.71, label: 'Microenvironment Diversity' },
    cellType: { value: 0, target: 0.96, label: 'Predicted Cell Type Conf.' },
    activeTFs: { value: 0, target: 4, label: 'Active Transcription Factors' },
    imputedGenes: { value: 0, target: 18, label: 'Imputed Gene Expressions' },
  };

  // ── Drawing Helpers ──────────────────────────────────────────────────────

  function drawWobblyCell(cell, alpha = 1, scale = 1) {
    const col = COLORS[cell.type];
    const pts = cell.wobble;
    const n = pts.length;

    // Animate wobble
    const animPts = pts.map((p) => ({
      x: p.x + Math.sin(time * p.speed + p.phase) * p.amp,
      y: p.y + Math.cos(time * p.speed * 0.7 + p.phase) * p.amp,
    }));

    // Membrane glow (outer)
    const pulse = 0.5 + 0.5 * Math.sin(time * cell.pulseSpeed + cell.pulsePhase);
    const glowR = cell.baseR * scale * 1.6;
    const grad = ctx.createRadialGradient(cell.x, cell.y, cell.baseR * scale * 0.3, cell.x, cell.y, glowR);
    grad.addColorStop(0, col.fill + hexAlpha(alpha * 0.6));
    grad.addColorStop(0.6, col.fill + hexAlpha(alpha * 0.25));
    grad.addColorStop(1, col.fill + '00');

    ctx.beginPath();
    ctx.arc(cell.x, cell.y, glowR, 0, PI2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Cell body — smooth closed curve through wobble points
    ctx.beginPath();
    // Use midpoints to create a smooth catmull-rom-like path
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const firstMid = mid(animPts[0], animPts[1]);
    ctx.moveTo(firstMid.x, firstMid.y);
    for (let i = 1; i < n; i++) {
      const curr = animPts[i];
      const next = animPts[(i + 1) % n];
      const m = mid(curr, next);
      ctx.quadraticCurveTo(curr.x, curr.y, m.x, m.y);
    }
    // Close: last segment back to firstMid
    ctx.quadraticCurveTo(animPts[0].x, animPts[0].y, firstMid.x, firstMid.y);
    ctx.closePath();

    // Fill body
    const bodyGrad = ctx.createRadialGradient(
      cell.x, cell.y, 0,
      cell.x, cell.y, cell.baseR * scale
    );
    bodyGrad.addColorStop(0, col.fill + hexAlpha(alpha * 0.85));
    bodyGrad.addColorStop(0.75, col.fill + hexAlpha(alpha * 0.6));
    bodyGrad.addColorStop(1, col.glow + hexAlpha(alpha * (0.2 + pulse * 0.12)));
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Rim highlight
    ctx.strokeStyle = col.glow + hexAlpha(alpha * (0.15 + pulse * 0.1));
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Nucleus
    const nx = cell.x + cell.nucleusOff.x * scale;
    const ny = cell.y + cell.nucleusOff.y * scale;
    const nr = cell.nucleusR * scale;
    const nGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    nGrad.addColorStop(0, col.nucleus + hexAlpha(alpha * 0.9));
    nGrad.addColorStop(1, col.nucleus + hexAlpha(alpha * 0.15));
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, PI2);
    ctx.fillStyle = nGrad;
    ctx.fill();
  }

  function hexAlpha(a) {
    return Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, '0');
  }

  function drawSpatialEdge(e, alpha = 1) {
    const a = cells[e.i];
    const b = cells[e.j];
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.2 + e.pulsePhase);
    const baseAlpha = alpha * (0.06 + pulse * 0.06);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(100,180,255,${baseAlpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function drawScanBeam(x) {
    const grad = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
    grad.addColorStop(0, 'rgba(0,212,255,0)');
    grad.addColorStop(0.4, 'rgba(0,212,255,0.06)');
    grad.addColorStop(0.5, 'rgba(0,212,255,0.12)');
    grad.addColorStop(0.6, 'rgba(0,212,255,0.06)');
    grad.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 40, 0, 80, H);
  }

  // Gene node (capsule shape)
  function drawGeneNode(node, cx, cy, scale, alpha, highlight = 0) {
    const x = cx + node.lx * scale;
    const y = cy + node.ly * scale;
    const w = node.w * scale;
    const h = node.h * scale;
    const expr = node.expression;
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.5 + node.pulsePhase);

    const glow = expr * (0.4 + pulse * 0.2) + highlight * 0.5;

    if (node.isTF) {
      // Diamond shape for TFs
      const s = w * 1.1;
      const tfGrad = ctx.createRadialGradient(x, y, 0, x, y, s * 1.5);
      tfGrad.addColorStop(0, COLORS.tf.bright + hexAlpha(alpha * glow * 1.2));
      tfGrad.addColorStop(0.5, COLORS.tf.glow + hexAlpha(alpha * glow * 0.6));
      tfGrad.addColorStop(1, COLORS.tf.glow + '00');
      ctx.beginPath();
      ctx.arc(x, y, s * 1.5, 0, PI2);
      ctx.fillStyle = tfGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s, y);
      ctx.closePath();
      ctx.fillStyle = COLORS.tf.fill + hexAlpha(alpha * 0.9);
      ctx.fill();
      ctx.strokeStyle = COLORS.tf.glow + hexAlpha(alpha * (0.5 + glow * 0.3));
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Inner bright diamond
      const si = s * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y - si);
      ctx.lineTo(x + si, y);
      ctx.lineTo(x, y + si);
      ctx.lineTo(x - si, y);
      ctx.closePath();
      ctx.fillStyle = COLORS.tf.bright + hexAlpha(alpha * glow);
      ctx.fill();
    } else {
      // Capsule/oval shape for genes
      const geneGrad = ctx.createRadialGradient(x, y, 0, x, y, w * 1.8);
      geneGrad.addColorStop(0, COLORS.gene.bright + hexAlpha(alpha * glow * 0.8));
      geneGrad.addColorStop(0.5, COLORS.gene.glow + hexAlpha(alpha * glow * 0.3));
      geneGrad.addColorStop(1, COLORS.gene.glow + '00');
      ctx.beginPath();
      ctx.arc(x, y, w * 1.8, 0, PI2);
      ctx.fillStyle = geneGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, PI2);
      ctx.fillStyle = COLORS.gene.fill + hexAlpha(alpha * (0.6 + expr * 0.3));
      ctx.fill();
      ctx.strokeStyle = COLORS.gene.glow + hexAlpha(alpha * (0.2 + glow * 0.35));
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    return { x, y, w, h };
  }

  // GRN edge
  function drawGRNEdge(edge, cx, cy, scale, alpha) {
    const from = grnNodes[edge.from];
    const to = grnNodes[edge.to];
    const fx = cx + from.lx * scale;
    const fy = cy + from.ly * scale;
    const tx = cx + to.lx * scale;
    const ty = cy + to.ly * scale;

    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = edge.isTF ? COLORS.tfEdge : COLORS.geneEdge;
    ctx.lineWidth = edge.isTF ? 1.0 : 0.6;
    ctx.stroke();

    // Arrow for TF edges
    if (edge.isTF) {
      const ang = Math.atan2(ty - fy, tx - fx);
      const arrLen = 5 * scale;
      const ax = tx - Math.cos(ang) * (grnNodes[edge.to].w * scale + 2);
      const ay = ty - Math.sin(ang) * (grnNodes[edge.to].w * scale + 2);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - Math.cos(ang - 0.4) * arrLen, ay - Math.sin(ang - 0.4) * arrLen);
      ctx.lineTo(ax - Math.cos(ang + 0.4) * arrLen, ay - Math.sin(ang + 0.4) * arrLen);
      ctx.closePath();
      ctx.fillStyle = COLORS.tf.glow + hexAlpha(alpha * 0.4);
      ctx.fill();
    }
  }

  // Signal particle
  function drawSignal(sig) {
    if (sig.t < 0 || sig.t > 1 || !sig.alive) return;
    const t = ease.inOut(sig.t);
    const x = lerp(sig.sx, sig.tx, t);
    const y = lerp(sig.sy, sig.ty, t);
    const r = 3;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    grad.addColorStop(0, sig.color + 'cc');
    grad.addColorStop(0.5, sig.color + '44');
    grad.addColorStop(1, sig.color + '00');
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, PI2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, PI2);
    ctx.fillStyle = sig.color;
    ctx.fill();

    // Trail
    sig.trail.push({ x, y });
    if (sig.trail.length > 8) sig.trail.shift();
    if (sig.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(sig.trail[0].x, sig.trail[0].y);
      for (let i = 1; i < sig.trail.length; i++) {
        ctx.lineTo(sig.trail[i].x, sig.trail[i].y);
      }
      ctx.strokeStyle = sig.color + '33';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ── Phase Logic ──────────────────────────────────────────────────────────

  function updatePhase(dt) {
    phaseTime += dt;

    if (phase === 1 && phaseTime > PHASE_DUR[1]) {
      phase = 2;
      phaseTime = 0;
    } else if (phase === 2 && phaseTime > PHASE_DUR[2]) {
      phase = 3;
      phaseTime = 0;
      waveTimer = 0;
      waveDir = 'in';
    } else if (phase === 3 && phaseTime > PHASE_DUR[3]) {
      // Loop back to phase 1
      phase = 1;
      phaseTime = 0;
      zoomProgress = 0;
      scanX = -100;
      waveTimer = 0;
      signals.length = 0;
      Object.values(metrics).forEach((m) => (m.value = 0));
    }

    // Zoom progress
    if (phase === 1) {
      zoomProgress = 0;
    } else if (phase === 2) {
      zoomProgress = ease.inOut(clamp(phaseTime / 2.8, 0, 1));
    } else {
      zoomProgress = 1;
    }
  }

  // ── Metrics Update ───────────────────────────────────────────────────────

  function updateMetrics(dt) {
    const speed = phase === 3 ? 0.4 : 0.2;

    if (phase >= 1) {
      metrics.cellCoherence.value = lerp(metrics.cellCoherence.value, metrics.cellCoherence.target, dt * speed);
      metrics.microDiv.value = lerp(metrics.microDiv.value, metrics.microDiv.target, dt * speed);
    }
    if (phase >= 2) {
      metrics.grnScore.value = lerp(metrics.grnScore.value, metrics.grnScore.target, dt * speed);
      metrics.cellType.value = lerp(metrics.cellType.value, metrics.cellType.target, dt * speed);
    }
    if (phase >= 3) {
      metrics.activeTFs.value = lerp(metrics.activeTFs.value, metrics.activeTFs.target, dt * speed * 0.6);
      metrics.imputedGenes.value = lerp(metrics.imputedGenes.value, metrics.imputedGenes.target, dt * speed * 0.5);
    }
  }

  const PHASE_DESCS = {
    1: 'Encoding spatial cell graphs with nested gene co-expression networks',
    2: 'Expanding intracellular gene regulatory network.',
    3: 'Mapping Gene Regulatory Network',
  };
  const PHASE_DESC_DELAY = 2.5; // seconds before description appears in panel

  function renderPanel() {
    const phaseTexts = {
      1: 'Mapping spatial cell neighborhood. ' + cells.length + ' cells detected, 3 cell types identified',
      2: 'Zooming into Cell ' + spotlightIdx + ' & loading gene regulatory network',
      3: waveDir === 'in'
        ? 'Cross-level integration: spatial context modulating gene expression'
        : 'Reverse aggregation: gene programs updating cell embedding',
    };

    let html = `<div style="color:${O.accentColor};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:10px;opacity:0.7">Phase ${phase}/3</div>`;
    html += `<div style="margin-bottom:6px;font-size:10.5px;color:rgba(255,255,255,0.45);line-height:1.5">${phaseTexts[phase]}</div>`;
    if (phaseTime > PHASE_DESC_DELAY) {
      const descAlpha = Math.min((phaseTime - PHASE_DESC_DELAY) / 1.5, 1);
      html += `<div style="margin-bottom:10px;font-size:10px;color:rgba(255,255,255,${(0.35 * descAlpha).toFixed(2)});line-height:1.5;border-left:2px solid ${O.accentColor}44;padding-left:8px;">${PHASE_DESCS[phase]}</div>`;
    } else {
      html += `<div style="margin-bottom:10px;"></div>`;
    }
    html += `<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:12px;">`;

    const show = (m, digits = 2, suffix = '', isInt = false) => {
      const v = isInt ? Math.round(m.value) : m.value.toFixed(digits);
      const pct = clamp(m.value / m.target, 0, 1);
      const barColor = pct > 0.8 ? '#3aad6b' : pct > 0.4 ? '#d4883a' : 'rgba(255,255,255,0.15)';
      return `<div style="margin-bottom:9px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:rgba(255,255,255,0.5)">${m.label}</span>
          <span style="color:rgba(255,255,255,0.85)">${v}${suffix}</span>
        </div>
        <div style="height:2px;background:rgba(255,255,255,0.06);border-radius:1px;overflow:hidden">
          <div style="height:100%;width:${pct * 100}%;background:${barColor};border-radius:1px;transition:width 0.3s"></div>
        </div>
      </div>`;
    };

    html += show(metrics.cellCoherence);
    html += show(metrics.grnScore);
    html += show(metrics.microDiv);
    html += show(metrics.cellType, 2, '%', false);
    if (phase >= 3) {
      html += show(metrics.activeTFs, 0, '', true);
      html += show(metrics.imputedGenes, 0, '', true);
    }
    html += '</div>';

    // Legend
    html += `<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;font-size:10px;">`;
    html += `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLORS.tumor.glow};margin-right:4px"></span>Tumor</span>`;
    html += `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLORS.immune.glow};margin-right:4px"></span>Immune</span>`;
    html += `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COLORS.stromal.glow};margin-right:4px"></span>Stromal</span>`;
    if (phase >= 2) {
      html += `<span><span style="display:inline-block;width:8px;height:8px;background:${COLORS.tf.glow};transform:rotate(45deg);margin-right:4px"></span>TF</span>`;
      html += `<span><span style="display:inline-block;width:8px;height:5px;border-radius:3px;background:${COLORS.gene.glow};margin-right:4px"></span>Gene</span>`;
    }
    html += `</div>`;

    panel.innerHTML = html;
  }

  // ── Cross-Level Signal Spawning ──────────────────────────────────────────

  function spawnWave() {
    const grnCxWorld = lerp(spotCell.x, W * 0.50, zoomProgress);
    const grnCyWorld = lerp(spotCell.y, H * 0.50, zoomProgress);
    const grnScale = lerp(0.01, 1.0, zoomProgress);

    if (waveDir === 'in') {
      // Signals from neighbors → into genes
      neighbors.forEach((nb, ni) => {
        const delay = ni * 0.12;
        // Source: neighbor cell position (approximate in zoomed view)
        const nbScreenX = lerp(nb.x, grnCxWorld + (nb.x - spotCell.x) * 0.3, zoomProgress);
        const nbScreenY = lerp(nb.y, grnCyWorld + (nb.y - spotCell.y) * 0.3, zoomProgress);

        // Target: random gene node(s) inside GRN
        const targetGene = grnNodes[randInt(0, grnNodes.length - 1)];
        const tx = grnCxWorld + targetGene.lx * grnScale;
        const ty = grnCyWorld + targetGene.ly * grnScale;

        spawnSignal(nbScreenX, nbScreenY, tx, ty, COLORS.signalIn, rand(0.3, 0.55), delay);
        targetGene.activateT = time + delay + 1.5;
      });
    } else {
      // Signals from genes → outward to cell boundary
      tfIndices.forEach((tfi, ti) => {
        const tf = grnNodes[tfi];
        const sx = grnCxWorld + tf.lx * grnScale;
        const sy = grnCyWorld + tf.ly * grnScale;

        // Target: cell boundary direction (various angles)
        for (let k = 0; k < 2; k++) {
          const ang = rand(0, PI2);
          const outR = grnR * grnScale + 40;
          const tx = grnCxWorld + Math.cos(ang) * outR;
          const ty = grnCyWorld + Math.sin(ang) * outR;
          spawnSignal(sx, sy, tx, ty, COLORS.signalOut, rand(0.25, 0.45), ti * 0.1 + k * 0.15);
        }
      });
    }
  }

  // ── Main Render ──────────────────────────────────────────────────────────

  function render(dt) {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle radial vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.7);
    vig.addColorStop(0, 'rgba(10,14,30,0)');
    vig.addColorStop(1, 'rgba(2,3,8,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // ── Calculate zoomed view coords ───────────────────────────────────────
    const grnCxWorld = lerp(spotCell.x, W * 0.50, zoomProgress);
    const grnCyWorld = lerp(spotCell.y, H * 0.50, zoomProgress);
    const grnScale = lerp(0.01, 1.0, zoomProgress);
    const tissueAlpha = lerp(1, 0.15, clamp(zoomProgress * 1.5, 0, 1));
    const grnAlpha = clamp((zoomProgress - 0.2) / 0.6, 0, 1);

    // ── Phase 1 & Background: Tissue Landscape ────────────────────────────

    // Spatial edges
    spatialEdges.forEach((e) => drawSpatialEdge(e, tissueAlpha));

    // Scan beam (Phase 1 only)
    if (phase === 1) {
      scanX += dt * 140;
      if (scanX > W + 100) scanX = -100;
      drawScanBeam(scanX);
    }

    // Draw all cells
    cells.forEach((cell) => {
      drawWobblyCell(cell, tissueAlpha);
    });

    // ── Phase 2 & 3: Zoomed GRN ──────────────────────────────────────────

    if (zoomProgress > 0.05) {
      // Zoomed cell membrane — wobbly double membrane with cytoplasm fill
      const membraneR = grnR * grnScale + 30;

      // Cytoplasm fill (inner glow)
      const cytoGrad = ctx.createRadialGradient(grnCxWorld, grnCyWorld, 0, grnCxWorld, grnCyWorld, membraneR);
      cytoGrad.addColorStop(0, 'rgba(14,22,40,' + (grnAlpha * 0.35) + ')');
      cytoGrad.addColorStop(0.6, 'rgba(18,30,55,' + (grnAlpha * 0.2) + ')');
      cytoGrad.addColorStop(0.9, 'rgba(26,58,92,' + (grnAlpha * 0.12) + ')');
      cytoGrad.addColorStop(1, 'rgba(26,58,92,0)');
      ctx.beginPath();
      ctx.arc(grnCxWorld, grnCyWorld, membraneR, 0, PI2);
      ctx.fillStyle = cytoGrad;
      ctx.fill();

      // Outer membrane (wobbly)
      const memPts = 16;
      ctx.beginPath();
      const memWobble = [];
      for (let i = 0; i < memPts; i++) {
        const ang = (PI2 / memPts) * i;
        const wobR = membraneR * (1 + 0.035 * Math.sin(time * 0.6 + ang * 3.2 + i));
        memWobble.push({
          x: grnCxWorld + Math.cos(ang) * wobR,
          y: grnCyWorld + Math.sin(ang) * wobR,
        });
      }
      const memMid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const firstMW = memMid(memWobble[0], memWobble[1]);
      ctx.moveTo(firstMW.x, firstMW.y);
      for (let i = 1; i < memPts; i++) {
        const mw = memMid(memWobble[i], memWobble[(i + 1) % memPts]);
        ctx.quadraticCurveTo(memWobble[i].x, memWobble[i].y, mw.x, mw.y);
      }
      ctx.quadraticCurveTo(memWobble[0].x, memWobble[0].y, firstMW.x, firstMW.y);
      ctx.closePath();
      ctx.strokeStyle = `rgba(45,125,196,${grnAlpha * 0.22})`;
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Inner membrane (slightly smaller, lighter)
      ctx.beginPath();
      const innerScale = 0.94;
      const firstMWi = { x: grnCxWorld + (firstMW.x - grnCxWorld) * innerScale, y: grnCyWorld + (firstMW.y - grnCyWorld) * innerScale };
      ctx.moveTo(firstMWi.x, firstMWi.y);
      for (let i = 1; i < memPts; i++) {
        const mw = memMid(memWobble[i], memWobble[(i + 1) % memPts]);
        const cp = { x: grnCxWorld + (memWobble[i].x - grnCxWorld) * innerScale, y: grnCyWorld + (memWobble[i].y - grnCyWorld) * innerScale };
        const ep = { x: grnCxWorld + (mw.x - grnCxWorld) * innerScale, y: grnCyWorld + (mw.y - grnCyWorld) * innerScale };
        ctx.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
      }
      const cp0 = { x: grnCxWorld + (memWobble[0].x - grnCxWorld) * innerScale, y: grnCyWorld + (memWobble[0].y - grnCyWorld) * innerScale };
      ctx.quadraticCurveTo(cp0.x, cp0.y, firstMWi.x, firstMWi.y);
      ctx.closePath();
      ctx.strokeStyle = `rgba(45,125,196,${grnAlpha * 0.10})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Nucleus in zoomed view (off-center, larger)
      if (grnScale > 0.3) {
        const znx = grnCxWorld - 5 * grnScale;
        const zny = grnCyWorld + 8 * grnScale;
        const znr = 18 * grnScale;
        const znGrad = ctx.createRadialGradient(znx, zny, 0, znx, zny, znr);
        znGrad.addColorStop(0, 'rgba(74,157,232,' + (grnAlpha * 0.25) + ')');
        znGrad.addColorStop(0.7, 'rgba(45,125,196,' + (grnAlpha * 0.1) + ')');
        znGrad.addColorStop(1, 'rgba(45,125,196,0)');
        ctx.beginPath();
        ctx.arc(znx, zny, znr, 0, PI2);
        ctx.fillStyle = znGrad;
        ctx.fill();
        ctx.strokeStyle = `rgba(74,157,232,${grnAlpha * 0.12})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // GRN edges
      grnEdges.forEach((e) => drawGRNEdge(e, grnCxWorld, grnCyWorld, grnScale, grnAlpha));

      // GRN nodes
      grnNodes.forEach((node) => {
        const highlight = (node.activateT > 0 && time < node.activateT + 1.0)
          ? clamp(1 - (time - node.activateT) / 1.0, 0, 1) : 0;
        drawGeneNode(node, grnCxWorld, grnCyWorld, grnScale, grnAlpha, highlight);
      });

      // Gene labels for TFs when zoomed enough
      if (grnAlpha > 0.5) {
        ctx.font = `${9 * grnAlpha}px "SF Mono", "Fira Code", monospace`;
        ctx.textAlign = 'center';
        grnNodes.forEach((node) => {
          if (node.isTF || node.expression > 0.75) {
            const x = grnCxWorld + node.lx * grnScale;
            const y = grnCyWorld + node.ly * grnScale - (node.isTF ? 16 : 10) * grnScale;
            ctx.fillStyle = node.isTF
              ? COLORS.tf.glow + hexAlpha(grnAlpha * 0.7)
              : COLORS.gene.glow + hexAlpha(grnAlpha * 0.45);
            ctx.fillText(node.name, x, y);
          }
        });
      }

      // Connecting lines from spotlight cell to zoomed view
      if (zoomProgress > 0.1 && zoomProgress < 0.95) {
        const lineAlpha = Math.sin(zoomProgress * Math.PI) * 0.2;
        ctx.beginPath();
        ctx.moveTo(spotCell.x, spotCell.y);
        ctx.lineTo(grnCxWorld, grnCyWorld);
        ctx.strokeStyle = O.accentColor + hexAlpha(lineAlpha);
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── Phase 3: Cross-Level Signals ─────────────────────────────────────

    if (phase === 3) {
      waveTimer += dt;
      if (waveTimer > WAVE_INTERVAL) {
        waveTimer = 0;
        spawnWave();
        waveDir = waveDir === 'in' ? 'out' : 'in';
      }

      // Update & draw signals
      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.t += dt * s.speed;
        if (s.t > 1.2) {
          signals.splice(i, 1);
          continue;
        }
        drawSignal(s);
      }

      // Draw neighbor connection lines (faded)
      neighbors.forEach((nb) => {
        const nbScreenX = lerp(nb.x, grnCxWorld + (nb.x - spotCell.x) * 0.3, zoomProgress);
        const nbScreenY = lerp(nb.y, grnCyWorld + (nb.y - spotCell.y) * 0.3, zoomProgress);

        ctx.beginPath();
        ctx.moveTo(nbScreenX, nbScreenY);
        ctx.lineTo(grnCxWorld, grnCyWorld);
        ctx.strokeStyle = 'rgba(0,212,255,0.06)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });
    }

    // ── Title ─────────────────────────────────────────────────────────────
    ctx.font = '10px "SF Mono", "Fira Code", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText('Cell Signalling & Gene Regulatory Network', 20, 28);

    // Subtle grid dots (very faint, contributes to scientific feel)
    const gridSpacing = 40;
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let gx = gridSpacing; gx < W; gx += gridSpacing) {
      for (let gy = gridSpacing; gy < H; gy += gridSpacing) {
        ctx.fillRect(gx, gy, 1, 1);
      }
    }
  }

  // ── Animation Loop ───────────────────────────────────────────────────────
  let lastT = performance.now();
  let panelTimer = 0;

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    time += dt;

    updatePhase(dt);
    updateMetrics(dt);

    panelTimer += dt;
    if (panelTimer > 0.25) {
      panelTimer = 0;
      renderPanel();
    }

    render(dt);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // ── Resize Observer ──────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    resize();
    // Recalculate cluster positions based on new size
    // (For simplicity, we keep initial positions — works well with CSS constraints)
  });
  ro.observe(wrap);

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    destroy() {
      running = false;
      ro.disconnect();
      canvas.remove();
      panel.remove();
    },
    reset() {
      phase = 1;
      phaseTime = 0;
      zoomProgress = 0;
      scanX = -100;
      waveTimer = 0;
      signals.length = 0;
      Object.values(metrics).forEach((m) => (m.value = 0));
    },
    getPhase: () => phase,
  };
}

// Auto-initialization
let heistAnimationInstance = null;

function initHeistAnimationAuto() {
  const container = document.getElementById('heist-animation-container');
  if (container && !heistAnimationInstance) {
    heistAnimationInstance = initHEISTAnimation(container);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeistAnimationAuto);
} else {
  initHeistAnimationAuto();
}

setTimeout(initHeistAnimationAuto, 100);