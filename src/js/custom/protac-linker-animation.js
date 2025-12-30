/* =========================
PROTAC LINKER GNN VISUALIZATION v3
Chemistry-accurate visualization for medicinal chemists
Features: JQ1-Thalidomide case study, rejection phases, solvent channel, vector alignment
=========================== */

const CONFIG = {
  COLOR_BACKGROUND: '#0a0a0f',
  COLOR_WARHEAD: '#f59e0b',
  COLOR_WARHEAD_GLOW: 'rgba(245, 158, 11, 0.2)',
  COLOR_E3_LIGASE: '#8b5cf6',
  COLOR_E3_LIGASE_GLOW: 'rgba(139, 92, 246, 0.2)',
  COLOR_LINKER: '#06b6d4',
  COLOR_LINKER_GLOW: 'rgba(6, 182, 212, 0.25)',
  COLOR_BOND: '#06b6d4',
  COLOR_SUCCESS: '#10b981',
  COLOR_SUCCESS_GLOW: 'rgba(16, 185, 129, 0.25)',
  COLOR_REJECT: '#ef4444',
  COLOR_REJECT_GLOW: 'rgba(239, 68, 68, 0.3)',
  COLOR_GHOST: 'rgba(255, 255, 255, 0.15)',
  COLOR_GHOST_STROKE: 'rgba(255, 255, 255, 0.25)',
  COLOR_CHANNEL_WALL: 'rgba(139, 92, 246, 0.08)',
  COLOR_CHANNEL_EDGE: 'rgba(139, 92, 246, 0.2)',
  COLOR_VECTOR: '#fbbf24',
  COLOR_TEXT_PRIMARY: '#ffffff',
  COLOR_TEXT_SECONDARY: 'rgba(255, 255, 255, 0.6)',
  COLOR_TEXT_MUTED: 'rgba(255, 255, 255, 0.4)',
  COLOR_PANEL_BG: 'rgba(0, 0, 0, 0.75)',
  COLOR_PANEL_BORDER: 'rgba(255, 255, 255, 0.1)',

  // Timing (ms)
  PHASE_GHOST_APPEAR: 1200,
  PHASE_GHOST_REJECT: 1000,
  PHASE_FRAGMENT_ALIGN: 1000,
  PHASE_FRAGMENT_SNAP: 800,
  PHASE_FRAGMENT_PAUSE: 1200,
  PHASE_FINAL_CONNECTION: 1400,
  PHASE_STABILIZATION: 2400,
  PHASE_COMPLETE_HOLD: 4400,

  PULSE_SPEED: 0.002,
  CHANNEL_WAVE_SPEED: 0.0008,
};

// Fragment library with Enamine-style catalog IDs and reaction compatibility
const FRAGMENT_LIBRARY = [
  { 
    name: 'Piperazine', 
    catalogId: 'EN300-19477', 
    reaction: 'Amide Coupling',
    type: 'saturated', 
    atoms: 6, 
    rigidity: 'rigid',
    mw: 86,
    reason: 'Rigid scaffold, low entropy'
  },
  { 
    name: '1,4-Phenylene', 
    catalogId: 'EN300-00982', 
    reaction: 'Suzuki Coupling',
    type: 'aromatic', 
    atoms: 6, 
    rigidity: 'rigid',
    mw: 76,
    reason: 'Aromatic rigidity'
  },
  { 
    name: 'Triazole', 
    catalogId: 'EN300-21567', 
    reaction: 'Click Chemistry',
    type: 'heteroaromatic', 
    atoms: 5, 
    rigidity: 'rigid',
    mw: 69,
    reason: 'Click product, rigid'
  },
  { 
    name: 'Piperidine', 
    catalogId: 'EN300-19436', 
    reaction: 'Reductive Amination',
    type: 'saturated', 
    atoms: 6, 
    rigidity: 'semi-rigid',
    mw: 85,
    reason: 'Chair conformation'
  },
  { 
    name: 'Spirocycle', 
    catalogId: 'EN300-87234', 
    reaction: 'Amide Coupling',
    type: 'spiro', 
    atoms: 8, 
    rigidity: 'very-rigid',
    mw: 124,
    reason: 'Conformational lock'
  },
];

// Rejected fragment types (floppy, high entropy)
const REJECTED_FRAGMENTS = [
  { name: 'PEG₃ Chain', reasonKey: 'entropyHigh', type: 'flexible' },
  { name: 'Alkyl Chain', reasonKey: 'stericClash', type: 'flexible' },
  { name: 'Long Ether', reasonKey: 'poorRigidity', type: 'flexible' },
];

// Utility functions
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * ProtacLinkerAnimation v3
 * Chemistry-accurate visualization
 */
class ProtacLinkerAnimation {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    this.time = 0;
    this.animationId = null;
    this.lastFrameTime = 0;

    // State machine
    this.phase = 'building';
    this.subPhase = 'ghost'; // ghost, reject, align, snap, pause
    this.phaseStartTime = 0;
    this.subPhaseStartTime = 0;
    this.currentFragment = 0;
    this.totalFragments = 3;

    // Data
    this.fragments = [];
    this.selectedFragments = [];
    this.rejectedFragment = null;
    this.ghostPosition = { x: 0, y: 0 };

    // Positions
    this.warheadPos = { x: 0, y: 0 };
    this.ligasePos = { x: 0, y: 0 };
    this.channelTop = 0;
    this.channelBottom = 0;

    // Current fragment being added
    this.currentFragmentData = null;
    this.currentAlignmentAngle = 0;

    // Metrics
    this.metrics = {
      fragmentCount: 0,
      cooperativity: 0,
      deltaG: 0,
      currentReaction: '',
      currentSource: '',
    };

    // Status message
    this.statusMessage = '';
    this.statusColor = CONFIG.COLOR_LINKER;

    this.init();
  }

  init() {
    this.createCanvas();
    this.handleResize();
    this.selectRandomFragments();
    this.startAnimation();
    this.startGeneration();

    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('languageChanged', () => this.updateUI());
  }

  createCanvas() {
    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 500px;
      background: ${CONFIG.COLOR_BACKGROUND};
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      cursor: pointer;
    `;

    // Status panel (top left)
    this.statusPanel = document.createElement('div');
    this.statusPanel.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      background: ${CONFIG.COLOR_PANEL_BG};
      border: 1px solid ${CONFIG.COLOR_PANEL_BORDER};
      border-radius: 8px;
      padding: 10px 16px;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: border-color 0.3s ease;
    `;

    // Bill of Materials panel (top right)
    this.bomPanel = document.createElement('div');
    this.bomPanel.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: ${CONFIG.COLOR_PANEL_BG};
      border: 1px solid ${CONFIG.COLOR_PANEL_BORDER};
      border-radius: 8px;
      padding: 12px 16px;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 11px;
      color: ${CONFIG.COLOR_TEXT_SECONDARY};
      min-width: 200px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;

    // Legend (bottom left)
    this.legend = document.createElement('div');
    this.legend.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: flex;
      gap: 20px;
      font-size: 11px;
      font-family: "SF Mono", "Fira Code", monospace;
      color: ${CONFIG.COLOR_TEXT_MUTED};
    `;
    this.legend.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${CONFIG.COLOR_WARHEAD};"></div>
        <span>JQ1 (BRD4)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${CONFIG.COLOR_E3_LIGASE};"></div>
        <span>Thalidomide (CRBN)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${CONFIG.COLOR_LINKER};"></div>
        <span>Linker</span>
      </div>
    `;

    // Restart hint
    this.restartHint = document.createElement('div');
    this.restartHint.style.cssText = `
      position: absolute;
      bottom: 16px;
      right: 16px;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 11px;
      color: ${CONFIG.COLOR_TEXT_MUTED};
      opacity: 0;
      transition: opacity 0.5s ease;
    `;

    this.wrapper.appendChild(this.canvas);
    this.wrapper.appendChild(this.statusPanel);
    this.wrapper.appendChild(this.bomPanel);
    this.wrapper.appendChild(this.legend);
    this.wrapper.appendChild(this.restartHint);
    this.container.appendChild(this.wrapper);

    this.ctx = this.canvas.getContext('2d');

    this.canvas.addEventListener('click', () => {
      if (this.phase === 'complete') {
        this.restart();
      }
    });
  }

  handleResize() {
    const rect = this.wrapper.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    const margin = Math.min(100, this.width * 0.1);
    this.warheadPos = { x: margin + 20, y: this.height / 2 };
    this.ligasePos = { x: this.width - margin - 20, y: this.height / 2 };

    // Solvent channel boundaries
    this.channelTop = this.height / 2 - 70;
    this.channelBottom = this.height / 2 + 70;
  }

  selectRandomFragments() {
    this.selectedFragments = [];
    const shuffled = [...FRAGMENT_LIBRARY].sort(() => Math.random() - 0.5);
    for (let i = 0; i < this.totalFragments; i++) {
      this.selectedFragments.push(shuffled[i % shuffled.length]);
    }
  }

  startGeneration() {
    this.phase = 'building';
    this.subPhase = 'ghost';
    this.phaseStartTime = this.time;
    this.subPhaseStartTime = this.time;
    this.currentFragment = 0;
    this.fragments = [];
    this.metrics = {
      fragmentCount: 0,
      cooperativity: 0,
      deltaG: 0,
      currentReaction: '',
      currentSource: '',
    };
    this.restartHint.style.opacity = '0';
    this.updateUI();
  }

  restart() {
    this.totalFragments = 2 + Math.floor(Math.random() * 3);
    this.selectRandomFragments();
    this.startGeneration();
  }

  startAnimation() {
    const animate = (timestamp) => {
      const deltaTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;
      this.time += deltaTime;

      this.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  update(deltaTime) {
    const elapsed = this.time - this.phaseStartTime;
    const subElapsed = this.time - this.subPhaseStartTime;

    switch (this.phase) {
      case 'building':
        this.updateBuilding(elapsed, subElapsed);
        break;
      case 'connecting':
        this.updateConnecting(elapsed);
        break;
      case 'stabilizing':
        this.updateStabilizing(elapsed);
        break;
      case 'complete':
        break;
    }

    this.updateUI();
  }

  updateBuilding(elapsed, subElapsed) {
    const fragData = this.selectedFragments[this.currentFragment];
    if (!fragData) {
      this.phase = 'connecting';
      this.phaseStartTime = this.time;
      return;
    }

    this.currentFragmentData = fragData;

    // Calculate target position for this fragment
    const gap = this.ligasePos.x - this.warheadPos.x;
    const fragmentSpacing = gap / (this.totalFragments + 1);
    const targetX = this.warheadPos.x + fragmentSpacing * (this.currentFragment + 1);
    const targetY = this.warheadPos.y + Math.sin((this.currentFragment + 1) * 0.7) * 20;

    switch (this.subPhase) {
      case 'ghost':
        // Show rejected (floppy) fragment first
        this.rejectedFragment = REJECTED_FRAGMENTS[this.currentFragment % REJECTED_FRAGMENTS.length];
        this.ghostPosition = { x: targetX, y: targetY };
        const evaluatingLabel = window.i18n?.t('biotech.animation.status.evaluating') || 'Evaluating:';
        this.statusMessage = `${evaluatingLabel} ${this.rejectedFragment.name}...`;
        this.statusColor = CONFIG.COLOR_TEXT_SECONDARY;

        if (subElapsed > CONFIG.PHASE_GHOST_APPEAR) {
          this.subPhase = 'reject';
          this.subPhaseStartTime = this.time;
        }
        break;

      case 'reject':
        // Show rejection
        const rejectingLabel = window.i18n?.t('biotech.animation.status.rejecting') || '✗ Rejected:';
        const rejectionReason = window.i18n?.t(`biotech.animation.rejection.${this.rejectedFragment.reasonKey}`) || this.rejectedFragment.reason;
        this.statusMessage = `${rejectingLabel} ${rejectionReason}`;
        this.statusColor = CONFIG.COLOR_REJECT;
        this.statusPanel.style.borderColor = CONFIG.COLOR_REJECT;

        if (subElapsed > CONFIG.PHASE_GHOST_REJECT) {
          this.subPhase = 'align';
          this.subPhaseStartTime = this.time;
          this.statusPanel.style.borderColor = CONFIG.COLOR_PANEL_BORDER;
        }
        break;

      case 'align':
        // Show correct fragment aligning
        const aligningLabel = window.i18n?.t('biotech.animation.status.aligning') || 'Aligning:';
        this.statusMessage = `${aligningLabel} ${fragData.name}`;
        this.statusColor = CONFIG.COLOR_LINKER;
        this.currentAlignmentAngle = lerp(Math.PI / 4, 0, easeOutCubic(clamp(subElapsed / CONFIG.PHASE_FRAGMENT_ALIGN, 0, 1)));

        if (subElapsed > CONFIG.PHASE_FRAGMENT_ALIGN) {
          this.subPhase = 'snap';
          this.subPhaseStartTime = this.time;
        }
        break;

      case 'snap':
        // Snap into place
        const snapProgress = clamp(subElapsed / CONFIG.PHASE_FRAGMENT_SNAP, 0, 1);
        this.statusMessage = `✓ ${fragData.reaction}`;
        this.statusColor = CONFIG.COLOR_SUCCESS;
        this.statusPanel.style.borderColor = CONFIG.COLOR_SUCCESS;

        // Add fragment if not already added
        if (this.fragments.length === this.currentFragment) {
          this.fragments.push({
            x: targetX,
            y: targetY,
            progress: 0,
            data: fragData,
            index: this.currentFragment,
          });
        }

        // Animate progress
        this.fragments[this.currentFragment].progress = easeOutBack(snapProgress);

        if (subElapsed > CONFIG.PHASE_FRAGMENT_SNAP) {
          this.subPhase = 'pause';
          this.subPhaseStartTime = this.time;
          this.metrics.fragmentCount = this.currentFragment + 1;
          this.metrics.currentReaction = fragData.reaction;
          this.metrics.currentSource = fragData.catalogId;
          this.statusPanel.style.borderColor = CONFIG.COLOR_PANEL_BORDER;
        }
        break;

      case 'pause':
        const sourcingLabel = window.i18n?.t('biotech.animation.status.sourcing') || 'Source: Enamine';
        this.statusMessage = `${sourcingLabel} ${fragData.catalogId}`;
        this.statusColor = CONFIG.COLOR_TEXT_SECONDARY;

        if (subElapsed > CONFIG.PHASE_FRAGMENT_PAUSE) {
          this.currentFragment++;
          if (this.currentFragment >= this.totalFragments) {
            this.phase = 'connecting';
            this.phaseStartTime = this.time;
          } else {
            this.subPhase = 'ghost';
            this.subPhaseStartTime = this.time;
          }
        }
        break;
    }
  }

  updateConnecting(elapsed) {
    const progress = clamp(elapsed / CONFIG.PHASE_FINAL_CONNECTION, 0, 1);
    this.statusMessage = window.i18n?.t('biotech.animation.status.connecting') || 'Forming ternary complex...';
    this.statusColor = CONFIG.COLOR_LINKER;

    if (progress >= 1) {
      this.phase = 'stabilizing';
      this.phaseStartTime = this.time;
    }
  }

  updateStabilizing(elapsed) {
    const progress = clamp(elapsed / CONFIG.PHASE_STABILIZATION, 0, 1);

    this.metrics.cooperativity = easeOutCubic(progress);
    this.metrics.deltaG = lerp(0, -10.2, easeOutCubic(progress));

    this.statusMessage = window.i18n?.t('biotech.animation.status.validating') || 'Validating cooperativity...';
    this.statusColor = CONFIG.COLOR_SUCCESS;

    if (progress >= 1) {
      this.phase = 'complete';
      this.phaseStartTime = this.time;
      this.statusMessage = window.i18n?.t('biotech.animation.status.complete') || '✓ Stable Ternary Complex';
      this.restartHint.style.opacity = '1';

      setTimeout(() => {
        if (this.phase === 'complete') {
          this.restart();
        }
      }, CONFIG.PHASE_COMPLETE_HOLD);
    }
  }

  updateUI() {
    this.statusPanel.innerHTML = `<span style="color: ${this.statusColor};">${this.statusMessage}</span>`;

    // Bill of Materials panel
    const cooperativityText = this.metrics.cooperativity > 0
      ? `α = ${(1 + this.metrics.cooperativity * 0.8).toFixed(2)}`
      : '—';
    const deltaGText = this.metrics.deltaG < 0
      ? `${this.metrics.deltaG.toFixed(1)} kcal/mol`
      : '—';

    const bomTitle = window.i18n?.t('biotech.animation.bom') || 'Bill of Materials';
    let bomHTML = `
      <div style="margin-bottom: 10px; color: ${CONFIG.COLOR_TEXT_MUTED}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">${bomTitle}</div>
    `;

    // Show placed fragments
    for (let i = 0; i < this.fragments.length; i++) {
      const frag = this.fragments[i];
      if (frag.progress > 0.5) {
        bomHTML += `
          <div style="margin-bottom: 8px; padding: 6px 8px; background: rgba(6, 182, 212, 0.1); border-radius: 4px; border-left: 2px solid ${CONFIG.COLOR_LINKER};">
            <div style="color: ${CONFIG.COLOR_TEXT_PRIMARY}; font-size: 11px;">${frag.data.name}</div>
            <div style="color: ${CONFIG.COLOR_TEXT_MUTED}; font-size: 9px; margin-top: 2px;">${frag.data.reaction} • ${frag.data.catalogId}</div>
          </div>
        `;
      }
    }

    if (this.fragments.length === 0) {
      bomHTML += `<div style="color: ${CONFIG.COLOR_TEXT_MUTED}; font-style: italic;">Analyzing fragments...</div>`;
    }

    // Show metrics at bottom
    if (this.phase === 'stabilizing' || this.phase === 'complete') {
      const cooperativityLabel = window.i18n?.t('biotech.animation.metrics.cooperativity') || 'Cooperativity:';
      const deltaGLabel = window.i18n?.t('biotech.animation.metrics.predictedDeltaG') || 'Predicted ΔG:';

      bomHTML += `
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid ${CONFIG.COLOR_PANEL_BORDER};">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>${cooperativityLabel}</span>
            <span style="color: ${this.metrics.cooperativity > 0.5 ? CONFIG.COLOR_SUCCESS : CONFIG.COLOR_TEXT_PRIMARY};">${cooperativityText}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>${deltaGLabel}</span>
            <span style="color: ${this.metrics.deltaG < -8 ? CONFIG.COLOR_SUCCESS : CONFIG.COLOR_TEXT_PRIMARY};">${deltaGText}</span>
          </div>
        </div>
      `;
    }

    this.bomPanel.innerHTML = bomHTML;
  }

  render() {
    const ctx = this.ctx;

    ctx.fillStyle = CONFIG.COLOR_BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);

    // Render order matters
    this.renderSolventChannel(ctx);
    this.renderConnections(ctx);
    this.renderJQ1Warhead(ctx);
    this.renderThalidomideBinder(ctx);
    this.renderGhostFragment(ctx);
    this.renderLinkerFragments(ctx);
    this.renderStabilizationEffect(ctx);
  }

  renderSolventChannel(ctx) {
    const centerY = this.height / 2;
    const channelHeight = 70;
    const waveAmplitude = 15;
    const wavePhase = this.time * CONFIG.CHANNEL_WAVE_SPEED;

    ctx.save();

    // Top boundary
    ctx.beginPath();
    ctx.moveTo(this.warheadPos.x + 40, centerY - channelHeight);
    for (let x = this.warheadPos.x + 40; x <= this.ligasePos.x - 40; x += 3) {
      const progress = (x - this.warheadPos.x) / (this.ligasePos.x - this.warheadPos.x);
      const wave = Math.sin(x * 0.02 + wavePhase) * waveAmplitude;
      const bulge = Math.sin(progress * Math.PI) * 10;
      ctx.lineTo(x, centerY - channelHeight + wave - bulge);
    }
    ctx.lineTo(this.ligasePos.x - 40, 0);
    ctx.lineTo(this.warheadPos.x + 40, 0);
    ctx.closePath();

    const topGradient = ctx.createLinearGradient(0, 0, 0, centerY - channelHeight);
    topGradient.addColorStop(0, 'transparent');
    topGradient.addColorStop(1, CONFIG.COLOR_CHANNEL_WALL);
    ctx.fillStyle = topGradient;
    ctx.fill();

    // Bottom boundary
    ctx.beginPath();
    ctx.moveTo(this.warheadPos.x + 40, centerY + channelHeight);
    for (let x = this.warheadPos.x + 40; x <= this.ligasePos.x - 40; x += 3) {
      const progress = (x - this.warheadPos.x) / (this.ligasePos.x - this.warheadPos.x);
      const wave = Math.sin(x * 0.02 + wavePhase + Math.PI) * waveAmplitude;
      const bulge = Math.sin(progress * Math.PI) * 10;
      ctx.lineTo(x, centerY + channelHeight + wave + bulge);
    }
    ctx.lineTo(this.ligasePos.x - 40, this.height);
    ctx.lineTo(this.warheadPos.x + 40, this.height);
    ctx.closePath();

    const bottomGradient = ctx.createLinearGradient(0, centerY + channelHeight, 0, this.height);
    bottomGradient.addColorStop(0, CONFIG.COLOR_CHANNEL_WALL);
    bottomGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = bottomGradient;
    ctx.fill();

    // Edge lines (subtle)
    ctx.strokeStyle = CONFIG.COLOR_CHANNEL_EDGE;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Top edge line
    ctx.beginPath();
    for (let x = this.warheadPos.x + 40; x <= this.ligasePos.x - 40; x += 3) {
      const progress = (x - this.warheadPos.x) / (this.ligasePos.x - this.warheadPos.x);
      const wave = Math.sin(x * 0.02 + wavePhase) * waveAmplitude;
      const bulge = Math.sin(progress * Math.PI) * 10;
      if (x === this.warheadPos.x + 40) ctx.moveTo(x, centerY - channelHeight + wave - bulge);
      else ctx.lineTo(x, centerY - channelHeight + wave - bulge);
    }
    ctx.stroke();

    // Bottom edge line
    ctx.beginPath();
    for (let x = this.warheadPos.x + 40; x <= this.ligasePos.x - 40; x += 3) {
      const progress = (x - this.warheadPos.x) / (this.ligasePos.x - this.warheadPos.x);
      const wave = Math.sin(x * 0.02 + wavePhase + Math.PI) * waveAmplitude;
      const bulge = Math.sin(progress * Math.PI) * 10;
      if (x === this.warheadPos.x + 40) ctx.moveTo(x, centerY + channelHeight + wave + bulge);
      else ctx.lineTo(x, centerY + channelHeight + wave + bulge);
    }
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();
  }

  renderJQ1Warhead(ctx) {
    // JQ1: triazolo-benzodiazepine structure (BRD4 inhibitor)
    const x = this.warheadPos.x;
    const y = this.warheadPos.y;
    const pulse = Math.sin(this.time * CONFIG.PULSE_SPEED) * 0.08 + 0.92;
    const scale = 1.6;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Glow
    const gradient = ctx.createRadialGradient(0, 0, 15, 0, 0, 70 * pulse);
    gradient.addColorStop(0, CONFIG.COLOR_WARHEAD_GLOW);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = CONFIG.COLOR_WARHEAD;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Benzodiazepine core (7-membered ring fused to benzene)
    // Benzene ring (left)
    const benzeneX = -18;
    this.drawHexagon(ctx, benzeneX, 0, 14);

    // 7-membered ring (diazepine) - irregular heptagon
    ctx.beginPath();
    const diazePoints = [
      { x: benzeneX + 12, y: -7 },
      { x: benzeneX + 22, y: -10 },
      { x: benzeneX + 30, y: -3 },
      { x: benzeneX + 30, y: 8 },
      { x: benzeneX + 22, y: 14 },
      { x: benzeneX + 12, y: 7 },
    ];
    ctx.moveTo(diazePoints[0].x, diazePoints[0].y);
    for (let i = 1; i < diazePoints.length; i++) {
      ctx.lineTo(diazePoints[i].x, diazePoints[i].y);
    }
    ctx.stroke();

    // Triazole ring (5-membered, fused to diazepine)
    const triazoleX = benzeneX + 35;
    this.drawPentagon(ctx, triazoleX, -5, 10);

    // Thiophene (attached)
    this.drawPentagon(ctx, benzeneX - 18, 8, 8);

    // Exit vector stub (where linker attaches)
    ctx.strokeStyle = CONFIG.COLOR_VECTOR;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(benzeneX + 45, 2);
    ctx.lineTo(benzeneX + 60, 2);
    // Arrow head
    ctx.moveTo(benzeneX + 56, -2);
    ctx.lineTo(benzeneX + 60, 2);
    ctx.lineTo(benzeneX + 56, 6);
    ctx.stroke();

    ctx.restore();

    // Labels
    ctx.save();
    ctx.font = '18px "SF Mono", "Fira Code", monospace';
    ctx.fillStyle = CONFIG.COLOR_WARHEAD;
    ctx.textAlign = 'center';
    ctx.fillText('JQ1', x - 20, y + 68);
    ctx.font = '12px "SF Mono", "Fira Code", monospace';
    ctx.fillStyle = CONFIG.COLOR_TEXT_MUTED;
    ctx.fillText('(BRD4 Warhead)', x - 20, y + 84);
    ctx.restore();
  }

  renderThalidomideBinder(ctx) {
    // Thalidomide: phthalimide + glutarimide (CRBN binder)
    const x = this.ligasePos.x;
    const y = this.ligasePos.y;
    const pulse = Math.sin(this.time * CONFIG.PULSE_SPEED + 1) * 0.08 + 0.92;
    const scale = 1.6;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Glow
    const gradient = ctx.createRadialGradient(0, 0, 15, 0, 0, 70 * pulse);
    gradient.addColorStop(0, CONFIG.COLOR_E3_LIGASE_GLOW);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = CONFIG.COLOR_E3_LIGASE;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Phthalimide (benzene + 5-membered imide)
    const phthalX = 12;
    this.drawHexagon(ctx, phthalX, -2, 14);

    // 5-membered imide ring
    ctx.beginPath();
    const imidePoints = [
      { x: phthalX - 12, y: -7 },
      { x: phthalX - 20, y: -3 },
      { x: phthalX - 20, y: 6 },
      { x: phthalX - 12, y: 10 },
    ];
    ctx.moveTo(imidePoints[0].x, imidePoints[0].y);
    for (let i = 1; i < imidePoints.length; i++) {
      ctx.lineTo(imidePoints[i].x, imidePoints[i].y);
    }
    ctx.stroke();

    // Carbonyl markers (=O)
    ctx.beginPath();
    ctx.moveTo(phthalX - 24, y - 3);
    ctx.lineTo(phthalX - 28, y - 3);
    ctx.moveTo(phthalX - 24, 6);
    ctx.lineTo(phthalX - 28, 6);
    ctx.stroke();

    // Glutarimide ring (6-membered with N)
    const glutX = phthalX - 32;
    this.drawHexagon(ctx, glutX, 1, 12);

    // Exit vector stub (where linker attaches)
    ctx.strokeStyle = CONFIG.COLOR_VECTOR;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(glutX - 14, 1);
    ctx.lineTo(glutX - 26, 1);
    // Arrow head (pointing left)
    ctx.moveTo(glutX - 22, -3);
    ctx.lineTo(glutX - 26, 1);
    ctx.lineTo(glutX - 22, 5);
    ctx.stroke();

    ctx.restore();

    // Labels
    ctx.save();
    ctx.font = '18px "SF Mono", "Fira Code", monospace';
    ctx.fillStyle = CONFIG.COLOR_E3_LIGASE;
    ctx.textAlign = 'center';
    ctx.fillText('Thalidomide', x, y + 68);
    ctx.font = '12px "SF Mono", "Fira Code", monospace';
    ctx.fillStyle = CONFIG.COLOR_TEXT_MUTED;
    ctx.fillText('(CRBN Binder)', x, y +84);
    ctx.restore();
  }

  renderGhostFragment(ctx) {
    if (this.phase !== 'building') return;
    if (this.subPhase !== 'ghost' && this.subPhase !== 'reject') return;

    const elapsed = this.time - this.subPhaseStartTime;
    const x = this.ghostPosition.x;
    const y = this.ghostPosition.y;

    ctx.save();

    if (this.subPhase === 'ghost') {
      // Fade in ghost (floppy chain)
      const fadeIn = clamp(elapsed / 400, 0, 1);
      ctx.globalAlpha = fadeIn * 0.4;
      ctx.strokeStyle = CONFIG.COLOR_GHOST_STROKE;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      // Draw wavy/floppy chain (representing PEG or alkyl)
      ctx.beginPath();
      ctx.moveTo(x - 30, y);
      for (let i = 0; i < 6; i++) {
        const px = x - 30 + i * 12;
        const py = y + Math.sin(i * 1.2 + this.time * 0.003) * 12;
        ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Ghost label
      ctx.setLineDash([]);
      ctx.font = '9px "SF Mono", "Fira Code", monospace';
      ctx.fillStyle = CONFIG.COLOR_GHOST_STROKE;
      ctx.textAlign = 'center';
      ctx.fillText(this.rejectedFragment?.name || 'Flexible Chain', x, y + 35);

    } else if (this.subPhase === 'reject') {
      // Rejection animation
      const rejectProgress = clamp(elapsed / CONFIG.PHASE_GHOST_REJECT, 0, 1);
      ctx.globalAlpha = (1 - rejectProgress) * 0.5;

      // Fading ghost
      ctx.strokeStyle = CONFIG.COLOR_REJECT;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(x - 30, y);
      for (let i = 0; i < 6; i++) {
        const px = x - 30 + i * 12;
        const py = y + Math.sin(i * 1.2) * 12;
        ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Red X
      ctx.setLineDash([]);
      ctx.globalAlpha = (1 - rejectProgress * 0.5);
      ctx.strokeStyle = CONFIG.COLOR_REJECT;
      ctx.lineWidth = 3;
      const xSize = 12;
      ctx.beginPath();
      ctx.moveTo(x - xSize, y - xSize - 20);
      ctx.lineTo(x + xSize, y + xSize - 20);
      ctx.moveTo(x + xSize, y - xSize - 20);
      ctx.lineTo(x - xSize, y + xSize - 20);
      ctx.stroke();

      // Rejection reason
      ctx.globalAlpha = 1 - rejectProgress;
      ctx.font = 'bold 10px "SF Mono", "Fira Code", monospace';
      ctx.fillStyle = CONFIG.COLOR_REJECT;
      ctx.textAlign = 'center';
      const rejectionReason = this.rejectedFragment?.reasonKey
        ? (window.i18n?.t(`biotech.animation.rejection.${this.rejectedFragment.reasonKey}`) || this.rejectedFragment.reason)
        : 'Rejected';
      ctx.fillText(rejectionReason, x, y + 40);
    }

    ctx.restore();
  }

  renderLinkerFragments(ctx) {
    ctx.save();

    for (const frag of this.fragments) {
      if (frag.progress < 0.01) continue;

      const x = frag.x;
      const y = frag.y;
      const scale = easeOutCubic(frag.progress);
      const isAligning = this.subPhase === 'align' && frag.index === this.currentFragment;

      // Apply rotation during alignment phase
      ctx.save();
      ctx.translate(x, y);

      if (isAligning) {
        ctx.rotate(this.currentAlignmentAngle);
      }

      // Glow
      if (frag.progress > 0.8) {
        const glowGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
        glowGradient.addColorStop(0, CONFIG.COLOR_LINKER_GLOW);
        glowGradient.addColorStop(1, 'transparent');
        ctx.globalAlpha = frag.progress * 0.6;
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = scale;
      ctx.strokeStyle = CONFIG.COLOR_LINKER;
      ctx.lineWidth = 2;

      const size = 11 * scale;

      // Draw appropriate ring structure
      if (frag.data.type === 'aromatic' || frag.data.type === 'heteroaromatic') {
        this.drawHexagonAt(ctx, 0, 0, size);
        // Inner circle for aromaticity
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (frag.data.atoms === 5) {
        this.drawPentagonAt(ctx, 0, 0, size);
      } else if (frag.data.type === 'spiro') {
        // Two fused squares for spirocycle
        this.drawSquareAt(ctx, -size * 0.3, 0, size * 0.6);
        this.drawSquareAt(ctx, size * 0.3, 0, size * 0.6);
      } else {
        this.drawHexagonAt(ctx, 0, 0, size);
      }

      // Vector stubs on the fragment
      if (frag.progress > 0.9) {
        ctx.strokeStyle = CONFIG.COLOR_VECTOR;
        ctx.lineWidth = 2;
        // Left stub
        ctx.beginPath();
        ctx.moveTo(-size - 3, 0);
        ctx.lineTo(-size - 10, 0);
        ctx.stroke();
        // Right stub
        ctx.beginPath();
        ctx.moveTo(size + 3, 0);
        ctx.lineTo(size + 10, 0);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  renderConnections(ctx) {
    ctx.save();
    ctx.strokeStyle = CONFIG.COLOR_BOND;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Connection from warhead to first fragment
    if (this.fragments.length > 0 && this.fragments[0].progress > 0.5) {
      const firstFrag = this.fragments[0];
      ctx.globalAlpha = Math.min(1, (firstFrag.progress - 0.5) * 2);
      ctx.beginPath();
      ctx.moveTo(this.warheadPos.x + 70, this.warheadPos.y + 2);
      ctx.lineTo(firstFrag.x - 20, firstFrag.y);
      ctx.stroke();
    }

    // Connections between fragments
    for (let i = 0; i < this.fragments.length - 1; i++) {
      const frag = this.fragments[i];
      const nextFrag = this.fragments[i + 1];

      if (frag.progress >= 1 && nextFrag.progress > 0.5) {
        ctx.globalAlpha = Math.min(1, (nextFrag.progress - 0.5) * 2);
        ctx.beginPath();
        ctx.moveTo(frag.x + 20, frag.y);
        ctx.lineTo(nextFrag.x - 20, nextFrag.y);
        ctx.stroke();
      }
    }

    // Final connection to E3 ligase
    if (this.phase === 'connecting' || this.phase === 'stabilizing' || this.phase === 'complete') {
      const elapsed = this.time - this.phaseStartTime;
      let progress = 1;

      if (this.phase === 'connecting') {
        progress = clamp(elapsed / CONFIG.PHASE_FINAL_CONNECTION, 0, 1);
      }

      if (this.fragments.length > 0) {
        const lastFrag = this.fragments[this.fragments.length - 1];
        ctx.globalAlpha = easeOutCubic(progress);
        ctx.beginPath();
        ctx.moveTo(lastFrag.x + 20, lastFrag.y);
        ctx.lineTo(this.ligasePos.x - 75, this.ligasePos.y + 1);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  renderStabilizationEffect(ctx) {
    if (this.phase !== 'stabilizing' && this.phase !== 'complete') return;

    const elapsed = this.time - this.phaseStartTime;
    let progress = this.phase === 'complete' ? 1 : clamp(elapsed / CONFIG.PHASE_STABILIZATION, 0, 1);

    ctx.save();

    const centerX = (this.warheadPos.x + this.ligasePos.x) / 2;
    const centerY = this.height / 2;

    // Cooperativity glow
    if (progress > 0.3) {
      const glowProgress = (progress - 0.3) / 0.7;
      const glowRadius = 80 + glowProgress * 60;

      const successGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
      successGlow.addColorStop(0, `rgba(16, 185, 129, ${0.12 * glowProgress})`);
      successGlow.addColorStop(0.6, `rgba(16, 185, 129, ${0.06 * glowProgress})`);
      successGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = successGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Success text
    if (progress > 0.7) {
      const textProgress = (progress - 0.7) / 0.3;
      ctx.globalAlpha = easeOutCubic(textProgress);

      ctx.font = 'bold 13px "SF Mono", "Fira Code", monospace';
      ctx.fillStyle = CONFIG.COLOR_SUCCESS;
      ctx.textAlign = 'center';
      const cooperativityText = window.i18n?.t('biotech.animation.final.cooperativity') || 'Positive Cooperativity (α > 1)';
      ctx.fillText(cooperativityText, centerX, centerY + 85);

      if (this.phase === 'complete') {
        ctx.font = '11px "SF Mono", "Fira Code", monospace';
        ctx.fillStyle = CONFIG.COLOR_TEXT_SECONDARY;
        const stabilizedText = window.i18n?.t('biotech.animation.final.stabilized') || 'Ternary Complex Stabilized • 100% Synthesizable';
        ctx.fillText(stabilizedText, centerX, centerY + 102);
      }
    }

    ctx.restore();
  }

  // Drawing helpers
  drawHexagon(ctx, x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  drawHexagonAt(ctx, x, y, radius) {
    this.drawHexagon(ctx, x, y, radius);
  }

  drawPentagon(ctx, x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  drawPentagonAt(ctx, x, y, radius) {
    this.drawPentagon(ctx, x, y, radius);
  }

  drawSquareAt(ctx, x, y, size) {
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
  }
}

// Initialize
function initProtacAnimation() {
  const container = document.getElementById('protac-animation-container');
  if (!container) return;
  window.protacLinkerAnimation = new ProtacLinkerAnimation(container);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProtacAnimation);
} else {
  initProtacAnimation();
}

export { ProtacLinkerAnimation, initProtacAnimation };