/**
 * PhaseTwoConstruction - Molecular Glue Construction Animation
 * Vanilla JavaScript implementation (no React dependencies)
 * 
 * Usage:
 *   const animation = new PhaseTwoConstruction('container-id');
 *   animation.start();
 *   // To stop: animation.stop();
 */

class PhaseTwoConstruction {
  // ============================================
  // CONFIGURATION
  // ============================================
  static CONFIG = {
    BG_COLOR: '#0a0a0f',
    
    // Atom colors (realistic CPK-style)
    NITROGEN_COLOR: '#4a9eff',
    OXYGEN_COLOR: '#ff6b6b',
    CARBON_COLOR: 'rgba(180, 180, 180, 0.95)',
    HYDROGEN_COLOR: 'rgba(255, 255, 255, 0.6)',
    SULFUR_COLOR: '#f0e040',
    CHLORINE_COLOR: '#90EE90',
    FLUORINE_COLOR: '#90EE90',
    
    // UI Colors
    COLOR_SUCCESS: '#10b981',
    COLOR_REJECT: '#ef4444',
    COLOR_GHOST: 'rgba(255, 255, 255, 0.15)',
    COLOR_GHOST_STROKE: 'rgba(255, 255, 255, 0.25)',
    COLOR_GLUE_GLOW: 'rgba(0, 212, 255, 0.4)',
    COLOR_ACCENT: '#00d4ff',
    COLOR_INTERFACE: 'rgba(16, 185, 129, 0.4)',
    
    // Grid colors
    GRID_LINE: 'rgba(255, 255, 255, 0.03)',
    
    // Panel colors
    COLOR_PANEL_BG: 'rgba(0, 0, 0, 0.75)',
    COLOR_PANEL_BORDER: 'rgba(255, 255, 255, 0.1)',
    COLOR_TEXT_PRIMARY: '#ffffff',
    COLOR_TEXT_SECONDARY: 'rgba(255, 255, 255, 0.6)',
    COLOR_TEXT_MUTED: 'rgba(255, 255, 255, 0.4)',
    
    // Layout
    LEFT_PANEL_RATIO: 0.38,
    
    // Timing (ms)
    PHASE_SCAN_DURATION: 2000,
    PHASE_GHOST_APPEAR: 1000,
    PHASE_GHOST_REJECT: 1800,
    PHASE_FRAGMENT_ALIGN: 800,
    PHASE_FRAGMENT_SNAP: 700,
    PHASE_FRAGMENT_PAUSE: 1000,
    PHASE_INTERFACE_FORM: 1800,
    PHASE_STABILIZATION: 2200,
    PHASE_COMPLETE_HOLD: 3500,
  };

  // ============================================
  // COMPACT MOLECULAR GLUE STRUCTURE
  // ============================================
  static COMPLETE_GLUE_MOLECULE = {
    atoms: [
      // Glutarimide ring (6-membered imide) - Core scaffold - FRAGMENT 0
      { element: 'C', x: 0, y: 0, z: 0, fragment: 0 },
      { element: 'C', x: 1.0, y: 0.6, z: 0.05, fragment: 0 },
      { element: 'C', x: 1.0, y: 1.8, z: 0.08, fragment: 0 },
      { element: 'N', x: 0, y: 2.4, z: 0.05, fragment: 0 },
      { element: 'C', x: -1.0, y: 1.8, z: 0.02, fragment: 0 },
      { element: 'C', x: -1.0, y: 0.6, z: -0.02, fragment: 0 },
      { element: 'O', x: 1.8, y: -0.2, z: 0.1, fragment: 0 },
      { element: 'O', x: -1.8, y: -0.2, z: -0.05, fragment: 0 },
      
      // Phthalimide/Isoindolinone (fused to glutarimide) - FRAGMENT 1
      { element: 'C', x: 0, y: 3.6, z: 0.06, fragment: 1 },
      { element: 'C', x: -1.0, y: 4.3, z: 0.08, fragment: 1 },
      { element: 'C', x: -1.0, y: 5.5, z: 0.1, fragment: 1 },
      { element: 'C', x: 0.1, y: 6.2, z: 0.1, fragment: 1 },
      { element: 'C', x: 1.2, y: 5.5, z: 0.08, fragment: 1 },
      { element: 'C', x: 1.2, y: 4.3, z: 0.05, fragment: 1 },
      { element: 'C', x: 2.2, y: 3.4, z: 0.02, fragment: 1 },
      { element: 'O', x: 3.3, y: 3.6, z: 0, fragment: 1 },
      { element: 'N', x: 1.8, y: 2.3, z: 0, fragment: 1 },
      
      // Phenyl decoration - FRAGMENT 2
      { element: 'C', x: -2.2, y: 6.2, z: 0.12, fragment: 2 },
      { element: 'C', x: -2.3, y: 7.4, z: 0.14, fragment: 2 },
      { element: 'C', x: -3.5, y: 8.0, z: 0.15, fragment: 2 },
      { element: 'C', x: -4.6, y: 7.4, z: 0.14, fragment: 2 },
      { element: 'C', x: -4.5, y: 6.2, z: 0.12, fragment: 2 },
      { element: 'C', x: -3.3, y: 5.6, z: 0.11, fragment: 2 },
      
      // Amino group - FRAGMENT 3
      { element: 'N', x: -5.8, y: 8.0, z: 0.15, fragment: 3 },
    ],
    
    bonds: [
      // Glutarimide ring (fragment 0)
      { from: 0, to: 1, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 },
      { from: 3, to: 4, order: 1 },
      { from: 4, to: 5, order: 1 },
      { from: 5, to: 0, order: 1 },
      { from: 0, to: 6, order: 2 },
      { from: 5, to: 7, order: 2 },
      
      // Glutarimide N to phthalimide bridge
      { from: 3, to: 8, order: 1 },
      
      // Phthalimide benzene ring (fragment 1)
      { from: 8, to: 9, order: 2 },
      { from: 9, to: 10, order: 1 },
      { from: 10, to: 11, order: 2 },
      { from: 11, to: 12, order: 1 },
      { from: 12, to: 13, order: 2 },
      { from: 13, to: 8, order: 1 },
      // Phthalimide lactam
      { from: 13, to: 14, order: 1 },
      { from: 14, to: 15, order: 2 },
      { from: 14, to: 16, order: 1 },
      { from: 16, to: 2, order: 1 },
      
      // Phthalimide to phenyl (fragment 1 to 2)
      { from: 10, to: 17, order: 1 },
      
      // Phenyl ring (fragment 2)
      { from: 17, to: 18, order: 2 },
      { from: 18, to: 19, order: 1 },
      { from: 19, to: 20, order: 2 },
      { from: 20, to: 21, order: 1 },
      { from: 21, to: 22, order: 2 },
      { from: 22, to: 17, order: 1 },
      
      // Phenyl to amino (fragment 2 to 3)
      { from: 20, to: 23, order: 1 },
    ],
  };

  // Fragment metadata for Bill of Materials
  static FRAGMENT_INFO = [
    {
      name: 'Glutarimide',
      catalogId: 'MG-GLU-001',
      reaction: 'Core Scaffold',
      atomIndices: [0, 1, 2, 3, 4, 5, 6, 7],
    },
    {
      name: 'Isoindolinone',
      catalogId: 'MG-ISO-042',
      reaction: 'Amide Coupling',
      atomIndices: [8, 9, 10, 11, 12, 13, 14, 15, 16],
    },
    {
      name: 'Phenyl',
      catalogId: 'MG-PHE-018',
      reaction: 'Suzuki-Miyaura',
      atomIndices: [17, 18, 19, 20, 21, 22],
    },
    {
      name: '4-Amino',
      catalogId: 'MG-NH2-003',
      reaction: 'SnAr',
      atomIndices: [23],
    },
  ];

  // Rejected fragments
  static REJECTED_FRAGMENTS = [
    { name: 'PEG₃ Chain', reason: 'High Entropy' },
    { name: 'Alkyl Linker', reason: 'Steric Clash (Interface)' },
    { name: 'Flexible Spacer', reason: 'Poor Surface Complementarity' },
    { name: 'Long Ether', reason: 'Negative Cooperativity' },
  ];

  // ============================================
  // BINDING POCKET
  // ============================================
  static BINDING_INTERFACE = {
    crbnAtoms: [
      { id: 0, element: 'C', x: -2.8, y: 0, z: -2.5, side: 'crbn' },
      { id: 1, element: 'C', x: -2.0, y: 0.8, z: -2.2, side: 'crbn' },
      { id: 2, element: 'C', x: -1.4, y: 0.4, z: -1.6, side: 'crbn' },
      { id: 3, element: 'N', x: -1.8, y: -0.6, z: -1.8, side: 'crbn' },
      { id: 4, element: 'C', x: -2.6, y: -0.8, z: -2.4, side: 'crbn' },
      { id: 5, element: 'H', x: -1.6, y: -1.4, z: -1.5, side: 'crbn' },
      { id: 6, element: 'C', x: -3.2, y: 1.2, z: -1.5, side: 'crbn' },
      { id: 7, element: 'N', x: -3.7, y: 1.8, z: -0.8, side: 'crbn' },
      { id: 8, element: 'C', x: -3.4, y: 2.6, z: -0.3, side: 'crbn' },
      { id: 9, element: 'N', x: -2.6, y: 2.5, z: -0.6, side: 'crbn' },
      { id: 10, element: 'C', x: -2.4, y: 1.5, z: -1.3, side: 'crbn' },
      { id: 11, element: 'C', x: -3.0, y: 0.5, z: 0.8, side: 'crbn' },
      { id: 12, element: 'O', x: -3.6, y: 1.2, z: 1.4, side: 'crbn' },
      { id: 13, element: 'C', x: -2.2, y: -0.2, z: 1.2, side: 'crbn' },
      { id: 14, element: 'C', x: -3.4, y: -1.5, z: -0.5, side: 'crbn' },
      { id: 15, element: 'C', x: -4.0, y: -2.2, z: 0.3, side: 'crbn' },
      { id: 16, element: 'C', x: -3.8, y: -2.0, z: 1.5, side: 'crbn' },
      { id: 17, element: 'C', x: -3.0, y: -1.1, z: 1.9, side: 'crbn' },
      { id: 18, element: 'C', x: -2.4, y: -0.4, z: 1.1, side: 'crbn' },
      { id: 19, element: 'C', x: -0.8, y: 1.0, z: -0.8, side: 'crbn' },
      { id: 20, element: 'C', x: -0.6, y: -0.8, z: -0.6, side: 'crbn' },
    ],
    
    ikzfAtoms: [
      { id: 30, element: 'C', x: 2.4, y: -0.5, z: -1.5, side: 'ikzf' },
      { id: 31, element: 'C', x: 3.0, y: 0.3, z: -1.0, side: 'ikzf' },
      { id: 32, element: 'O', x: 3.7, y: 0.1, z: -0.3, side: 'ikzf' },
      { id: 33, element: 'N', x: 2.7, y: 1.4, z: -1.2, side: 'ikzf' },
      { id: 34, element: 'H', x: 3.0, y: 2.0, z: -0.7, side: 'ikzf' },
      { id: 35, element: 'C', x: 1.8, y: 1.8, z: -1.8, side: 'ikzf' },
      { id: 36, element: 'C', x: 1.2, y: 2.6, z: -1.2, side: 'ikzf' },
      { id: 37, element: 'O', x: 0.5, y: 3.3, z: -1.6, side: 'ikzf' },
      { id: 38, element: 'N', x: 1.4, y: 2.5, z: 0.0, side: 'ikzf' },
      { id: 39, element: 'C', x: 2.2, y: 1.8, z: 0.6, side: 'ikzf' },
      { id: 40, element: 'C', x: 2.8, y: 0.8, z: 1.2, side: 'ikzf' },
      { id: 41, element: 'C', x: 3.4, y: 0.0, z: 0.5, side: 'ikzf' },
      { id: 42, element: 'N', x: 3.2, y: -0.2, z: -0.7, side: 'ikzf' },
      { id: 43, element: 'C', x: 2.6, y: -1.8, z: -0.8, side: 'ikzf' },
      { id: 44, element: 'C', x: 3.2, y: -2.4, z: 0.0, side: 'ikzf' },
      { id: 45, element: 'O', x: 3.8, y: -3.2, z: -0.2, side: 'ikzf' },
    ],
    
    crbnBonds: [
      { from: 0, to: 1, order: 2 }, { from: 1, to: 2, order: 1 },
      { from: 2, to: 3, order: 1 }, { from: 3, to: 4, order: 1 },
      { from: 4, to: 0, order: 1 }, { from: 3, to: 5, order: 1 },
      { from: 6, to: 7, order: 1 }, { from: 7, to: 8, order: 2 },
      { from: 8, to: 9, order: 1 }, { from: 9, to: 10, order: 2 },
      { from: 10, to: 6, order: 1 }, { from: 1, to: 6, order: 1 },
      { from: 11, to: 12, order: 2 }, { from: 11, to: 13, order: 1 },
      { from: 14, to: 15, order: 2 }, { from: 15, to: 16, order: 1 },
      { from: 16, to: 17, order: 2 }, { from: 17, to: 18, order: 1 },
      { from: 18, to: 14, order: 1 }, { from: 4, to: 14, order: 1 },
      { from: 2, to: 19, order: 1 }, { from: 19, to: 20, order: 1 },
      { from: 20, to: 3, order: 1 },
    ],
    
    ikzfBonds: [
      { from: 30, to: 31, order: 1 }, { from: 31, to: 32, order: 2 },
      { from: 31, to: 33, order: 1 }, { from: 33, to: 34, order: 1 },
      { from: 33, to: 35, order: 1 }, { from: 35, to: 36, order: 1 },
      { from: 36, to: 37, order: 2 }, { from: 36, to: 38, order: 1 },
      { from: 38, to: 39, order: 1 }, { from: 39, to: 40, order: 1 },
      { from: 40, to: 41, order: 1 }, { from: 41, to: 42, order: 1 },
      { from: 42, to: 30, order: 1 }, { from: 30, to: 43, order: 1 },
      { from: 43, to: 44, order: 1 }, { from: 44, to: 45, order: 2 },
    ],
    
    pocketAtoms: [2, 3, 5, 19, 20],
    contactAtoms: [3, 5, 9, 12, 33, 34, 37, 38],
  };

  // Glue blob that fills into CRBN pocket
  static GLUE_FILL_SHAPE = {
    outline: [
      { x: -0.6, y: -0.8, z: -0.8 },
      { x: 0.2, y: -0.6, z: -0.5 },
      { x: 0.5, y: 0.2, z: -0.3 },
      { x: 0.3, y: 1.0, z: -0.4 },
      { x: -0.3, y: 1.2, z: -0.6 },
      { x: -0.9, y: 0.8, z: -0.8 },
      { x: -1.1, y: 0, z: -0.9 },
      { x: -0.9, y: -0.6, z: -0.9 },
    ],
    offsetX: -1.2,
    offsetY: 0.2,
    offsetZ: -1.0,
  };

  // Translation strings (English defaults)
  static TRANSLATIONS = {
    proteinInterface: 'Protein Interface',
    glueConstruction: 'Glue Construction',
    billOfMaterials: 'Bill of Materials',
    analyzing: 'Analyzing CRBN pocket topology...',
    placingCore: 'Placing core scaffold...',
    coreAnchored: '✓ Core anchored in pocket',
    testing: (name) => `Testing ${name}...`,
    rejectHighEntropy: '✗ Rejected: High Entropy',
    rejectStericClash: '✗ Rejected: Steric Clash',
    rejectPoorSurface: '✗ Rejected: Poor Surface Complementarity',
    rejectNegativeCooperativity: '✗ Rejected: Negative Cooperativity',
    aligning: (name) => `Aligning ${name}...`,
    reactionSuccess: (reaction) => `✓ ${reaction} complete`,
    filling: 'Filling interface cavity...',
    validating: 'Validating ternary complex...',
    stable: '✓ Stable Ternary Complex',
    initializing: 'Initializing...',
    cooperativity: 'Cooperativity',
    predictedDeltaG: 'Predicted ΔG',
    interfaceBSA: 'Interface BSA',
    shapeComp: 'Shape Comp.',
  };

  // ============================================
  // CONSTRUCTOR
  // ============================================
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`PhaseTwoConstruction: Container with id "${containerId}" not found`);
      return;
    }
    
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.isRunning = false;
    
    // Animation state
    this.state = {
      time: 0,
      lastTimestamp: 0,
      phase: 'scanning',
      subPhase: 'analyze',
      phaseStartTime: 0,
      subPhaseStartTime: 0,
      currentFragment: 0,
      totalFragments: 4,
      visibleFragments: [],
      scanProgress: 0,
      pocketHighlight: 0,
      glueFillProgress: 0,
      buildProgress: 0,
      rejectedFragment: null,
      metrics: {
        fragmentCount: 0,
        cooperativity: 0,
        deltaG: 0,
        bsa: 0,
        shapeComp: 0,
      },
      statusMessage: '',
      statusColor: PhaseTwoConstruction.CONFIG.COLOR_ACCENT,
    };
    
    // UI elements
    this.statusPanel = null;
    this.bomPanel = null;
    
    this._init();
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  static clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  static easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  static getAtomColor(element) {
    const CONFIG = PhaseTwoConstruction.CONFIG;
    switch (element) {
      case 'N': return CONFIG.NITROGEN_COLOR;
      case 'O': return CONFIG.OXYGEN_COLOR;
      case 'S': return CONFIG.SULFUR_COLOR;
      case 'H': return CONFIG.HYDROGEN_COLOR;
      case 'Cl': return CONFIG.CHLORINE_COLOR;
      case 'F': return CONFIG.FLUORINE_COLOR;
      default: return CONFIG.CARBON_COLOR;
    }
  }

  static getAtomRadius(element) {
    switch (element) {
      case 'H': return 3;
      case 'O': return 6;
      case 'N': return 5.5;
      case 'S': return 7;
      case 'F': return 5;
      default: return 5;
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  _init() {
    const CONFIG = PhaseTwoConstruction.CONFIG;
    
    // Set up container styles
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '470px';
    this.container.style.overflow = 'hidden';
    this.container.style.background = CONFIG.BG_COLOR;
    this.container.style.borderRadius = '16px';
    this.container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5)';
    
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    // Create status panel
    this._createStatusPanel();
    
    // Create Bill of Materials panel
    this._createBOMPanel();
    
    // Handle resize
    this._handleResize();
    this._resizeHandler = () => this._handleResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _createStatusPanel() {
    const CONFIG = PhaseTwoConstruction.CONFIG;
    
    this.statusPanel = document.createElement('div');
    this.statusPanel.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      padding: 10px 16px;
      border-radius: 8px;
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 12px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background: ${CONFIG.COLOR_PANEL_BG};
      border: 1px solid ${CONFIG.COLOR_PANEL_BORDER};
      max-width: 280px;
      transition: all 0.3s ease;
      color: ${CONFIG.COLOR_ACCENT};
    `;
    this.statusPanel.textContent = PhaseTwoConstruction.TRANSLATIONS.initializing;
    this.container.appendChild(this.statusPanel);
  }

  _createBOMPanel() {
    const CONFIG = PhaseTwoConstruction.CONFIG;
    const T = PhaseTwoConstruction.TRANSLATIONS;
    
    this.bomPanel = document.createElement('div');
    this.bomPanel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: "SF Mono", "Fira Code", monospace;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background: ${CONFIG.COLOR_PANEL_BG};
      border: 1px solid ${CONFIG.COLOR_PANEL_BORDER};
      min-width: 234px;
      font-size: 10.8px;
      transform: scale(1.0);
      transform-origin: top right;
    `;
    
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 10px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${CONFIG.COLOR_TEXT_MUTED};
    `;
    header.textContent = T.billOfMaterials;
    this.bomPanel.appendChild(header);
    
    // Fragments container
    this.bomFragments = document.createElement('div');
    this.bomPanel.appendChild(this.bomFragments);
    
    // Metrics container (hidden initially)
    this.bomMetrics = document.createElement('div');
    this.bomMetrics.style.cssText = `
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid ${CONFIG.COLOR_PANEL_BORDER};
      display: none;
    `;
    this.bomPanel.appendChild(this.bomMetrics);
    
    this.container.appendChild(this.bomPanel);
  }

  _handleResize() {
    if (!this.canvas || !this.container) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  // ============================================
  // UI UPDATES
  // ============================================
  _updateStatusPanel(message, color) {
    const CONFIG = PhaseTwoConstruction.CONFIG;
    this.statusPanel.textContent = message;
    this.statusPanel.style.color = color;
    
    // Update border color based on status
    if (color === CONFIG.COLOR_REJECT) {
      this.statusPanel.style.borderColor = CONFIG.COLOR_REJECT;
    } else if (color === CONFIG.COLOR_SUCCESS) {
      this.statusPanel.style.borderColor = CONFIG.COLOR_SUCCESS;
    } else {
      this.statusPanel.style.borderColor = CONFIG.COLOR_PANEL_BORDER;
    }
  }

  _updateBOMPanel() {
    const CONFIG = PhaseTwoConstruction.CONFIG;
    const FRAGMENT_INFO = PhaseTwoConstruction.FRAGMENT_INFO;
    const T = PhaseTwoConstruction.TRANSLATIONS;
    
    // Clear and rebuild fragments
    this.bomFragments.innerHTML = '';
    
    if (this.state.visibleFragments.length === 0) {
      const analyzing = document.createElement('div');
      analyzing.style.cssText = `font-style: italic; color: ${CONFIG.COLOR_TEXT_MUTED};`;
      analyzing.textContent = 'Analyzing interface...';
      this.bomFragments.appendChild(analyzing);
    } else {
      this.state.visibleFragments.forEach((fragIdx) => {
        const frag = FRAGMENT_INFO[fragIdx];
        if (!frag) return;
        
        const isBase = fragIdx === 0;
        const item = document.createElement('div');
        item.style.cssText = `
          margin-bottom: 6px;
          padding: 6px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: ${isBase ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 212, 255, 0.1)'};
          border-left: 2px solid ${isBase ? CONFIG.COLOR_SUCCESS : CONFIG.COLOR_ACCENT};
        `;
        
        const name = document.createElement('span');
        name.style.cssText = `font-size: 10px; font-weight: 500; color: ${CONFIG.COLOR_TEXT_PRIMARY};`;
        name.textContent = `${frag.name}:`;
        
        const details = document.createElement('span');
        details.style.cssText = `font-size: 9px; color: ${CONFIG.COLOR_TEXT_MUTED};`;
        details.textContent = `${frag.reaction} • ${frag.catalogId}`;
        
        item.appendChild(name);
        item.appendChild(details);
        this.bomFragments.appendChild(item);
      });
    }
    
    // Update metrics
    const { phase, metrics } = this.state;
    if (phase === 'stabilizing' || phase === 'complete') {
      this.bomMetrics.style.display = 'block';
      
      const cooperativityText = metrics.cooperativity > 0
        ? `α = ${(1 + metrics.cooperativity * 0.6).toFixed(2)}`
        : '—';
      const deltaGText = metrics.deltaG < 0
        ? `${metrics.deltaG.toFixed(1)} kcal/mol`
        : '—';
      const bsaText = metrics.bsa > 0
        ? `${Math.round(metrics.bsa)} Å²`
        : '—';
      const shapeCompText = metrics.shapeComp > 0
        ? metrics.shapeComp.toFixed(2)
        : '—';
      
      this.bomMetrics.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: ${CONFIG.COLOR_TEXT_SECONDARY}">${T.cooperativity}:</span>
          <span style="color: ${metrics.cooperativity > 0.5 ? CONFIG.COLOR_SUCCESS : CONFIG.COLOR_TEXT_PRIMARY}">${cooperativityText}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: ${CONFIG.COLOR_TEXT_SECONDARY}">${T.predictedDeltaG}:</span>
          <span style="color: ${metrics.deltaG < -8 ? CONFIG.COLOR_SUCCESS : CONFIG.COLOR_TEXT_PRIMARY}">${deltaGText}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: ${CONFIG.COLOR_TEXT_SECONDARY}">${T.interfaceBSA}:</span>
          <span style="color: ${metrics.bsa > 800 ? CONFIG.COLOR_SUCCESS : CONFIG.COLOR_TEXT_PRIMARY}">${bsaText}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: ${CONFIG.COLOR_TEXT_SECONDARY}">${T.shapeComp}:</span>
          <span style="color: ${metrics.shapeComp > 0.85 ? CONFIG.COLOR_SUCCESS : CONFIG.COLOR_TEXT_PRIMARY}">${shapeCompText}</span>
        </div>
      `;
    } else {
      this.bomMetrics.style.display = 'none';
    }
  }

  // ============================================
  // DRAWING FUNCTIONS
  // ============================================
  _draw3DGrid(width, height, time) {
    const ctx = this.ctx;
    const CONFIG = PhaseTwoConstruction.CONFIG;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const gridSize = Math.max(width, height) * 0.95;
    const gridLines = 16;
    const spacing = gridSize / gridLines;
    
    const rotY = Math.sin(time * 0.00015) * 0.08;
    const rotX = 0.32 + Math.cos(time * 0.0001) * 0.03;
    const isoAngleX = 0.5;
    const isoAngleY = 0.85;
    
    const transformGridPoint = (x, y, z) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      
      let x1 = x * cosY - z * sinY;
      let z1 = x * sinY + z * cosY;
      let y1 = y * cosX - z1 * sinX;
      let z2 = y * sinX + z1 * cosX;
      
      const projX = x1 * isoAngleY - z2 * isoAngleY * 0.5;
      const projY = y1 + x1 * isoAngleX * 0.3 + z2 * isoAngleX * 0.3;
      
      return { x: centerX + projX, y: centerY + projY };
    };
    
    const halfGrid = gridSize / 2;
    
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = CONFIG.GRID_LINE;
    ctx.lineWidth = 0.5;
    
    const zBack = -halfGrid * 0.5;
    for (let i = 0; i <= gridLines; i++) {
      const y = -halfGrid + i * spacing;
      const p1 = transformGridPoint(-halfGrid, y, zBack);
      const p2 = transformGridPoint(halfGrid, y, zBack);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let i = 0; i <= gridLines; i++) {
      const x = -halfGrid + i * spacing;
      const p1 = transformGridPoint(x, -halfGrid, zBack);
      const p2 = transformGridPoint(x, halfGrid, zBack);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    
    const yFloor = halfGrid * 0.6;
    for (let i = 0; i <= gridLines; i++) {
      const z = -halfGrid * 0.5 + i * spacing * 0.7;
      const p1 = transformGridPoint(-halfGrid, yFloor, z);
      const p2 = transformGridPoint(halfGrid, yFloor, z);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let i = 0; i <= gridLines; i++) {
      const x = -halfGrid + i * spacing;
      const p1 = transformGridPoint(x, yFloor, -halfGrid * 0.5);
      const p2 = transformGridPoint(x, yFloor, halfGrid * 0.3);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  _drawBindingInterface(centerX, centerY, scale, opacity, time, scanProgress, pocketHighlight, contactGlow, glueFillProgress) {
    if (opacity <= 0) return;
    
    const ctx = this.ctx;
    const CONFIG = PhaseTwoConstruction.CONFIG;
    const BINDING_INTERFACE = PhaseTwoConstruction.BINDING_INTERFACE;
    const GLUE_FILL_SHAPE = PhaseTwoConstruction.GLUE_FILL_SHAPE;
    const easeOutCubic = PhaseTwoConstruction.easeOutCubic;
    
    ctx.save();
    ctx.globalAlpha = opacity;
    
    const rotY = Math.sin(time * 0.0002) * 0.2;
    const rotX = 0.3 + Math.cos(time * 0.00015) * 0.1;
    
    const transform3D = (x, y, z) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      
      const depthScale = 1 + z2 * 0.12;
      
      return {
        x: centerX + x1 * scale * depthScale,
        y: centerY + y1 * scale * depthScale,
        z: z2,
        scale: depthScale,
        normalizedZ: (z2 + 3) / 6,
      };
    };
    
    // Draw protein side
    const drawSide = (atoms, bonds, tint, label, labelX, isCRBN) => {
      bonds.forEach((bond) => {
        const fromAtom = atoms.find(a => a.id === bond.from);
        const toAtom = atoms.find(a => a.id === bond.to);
        if (!fromAtom || !toAtom) return;
        
        const p1 = transform3D(fromAtom.x, fromAtom.y, fromAtom.z);
        const p2 = transform3D(toAtom.x, toAtom.y, toAtom.z);
        
        const avgNormZ = (p1.normalizedZ + p2.normalizedZ) / 2;
        const depthOpacity = 0.25 + avgNormZ * 0.5;
        
        const isPocketBond = isCRBN && 
          (BINDING_INTERFACE.pocketAtoms.includes(bond.from) || 
           BINDING_INTERFACE.pocketAtoms.includes(bond.to));
        
        if (isPocketBond && pocketHighlight > 0 && glueFillProgress < 0.3) {
          ctx.strokeStyle = `rgba(0, 212, 255, ${0.5 * depthOpacity * pocketHighlight * (1 - glueFillProgress * 3)})`;
          ctx.shadowColor = CONFIG.COLOR_ACCENT;
          ctx.shadowBlur = 8 * pocketHighlight;
        } else {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * depthOpacity})`;
          ctx.shadowBlur = 0;
        }
        
        ctx.lineCap = 'round';
        ctx.lineWidth = bond.order === 2 ? 1.5 : 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
      
      const sortedAtoms = [...atoms].sort((a, b) => (a.z || 0) - (b.z || 0));
      
      sortedAtoms.forEach((atom) => {
        const p = transform3D(atom.x, atom.y, atom.z);
        const baseRadius = PhaseTwoConstruction.getAtomRadius(atom.element);
        const radius = baseRadius * p.scale * 0.9;
        const depthOpacity = 0.35 + p.normalizedZ * 0.65;
        
        const isContactAtom = BINDING_INTERFACE.contactAtoms.includes(atom.id);
        const isPocketAtom = isCRBN && BINDING_INTERFACE.pocketAtoms.includes(atom.id);
        
        ctx.globalAlpha = opacity * depthOpacity;
        
        const gradient = ctx.createRadialGradient(
          p.x - radius * 0.35, p.y - radius * 0.35, 0,
          p.x, p.y, radius
        );
        
        const baseColor = PhaseTwoConstruction.getAtomColor(atom.element);
        
        if (isContactAtom && contactGlow > 0) {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          gradient.addColorStop(0.3, CONFIG.COLOR_ACCENT);
          gradient.addColorStop(0.7, 'rgba(0, 150, 200, 0.9)');
          gradient.addColorStop(1, 'rgba(0, 80, 120, 0.8)');
          ctx.shadowColor = CONFIG.COLOR_ACCENT;
          ctx.shadowBlur = 12 * contactGlow;
        } else if (isPocketAtom && pocketHighlight > 0 && glueFillProgress < 0.3) {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          gradient.addColorStop(0.35, baseColor);
          gradient.addColorStop(0.7, `rgba(0, 100, 150, ${0.5 * pocketHighlight})`);
          gradient.addColorStop(1, 'rgba(20, 60, 80, 0.7)');
          ctx.shadowColor = CONFIG.COLOR_ACCENT;
          ctx.shadowBlur = 6 * pocketHighlight;
        } else {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          gradient.addColorStop(0.35, baseColor);
          gradient.addColorStop(0.75, 'rgba(80, 80, 80, 0.8)');
          gradient.addColorStop(1, 'rgba(30, 30, 30, 0.85)');
          ctx.shadowBlur = 0;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      
      ctx.globalAlpha = opacity * 0.7;
      ctx.font = 'bold 10px "SF Mono", "Fira Code", monospace';
      ctx.fillStyle = tint;
      ctx.textAlign = 'center';
      ctx.fillText(label, centerX + labelX, centerY + scale * 4.5);
    };
    
    drawSide(BINDING_INTERFACE.crbnAtoms, BINDING_INTERFACE.crbnBonds, '#60a5fa', 'CRBN', -scale * 1.5, true);
    drawSide(BINDING_INTERFACE.ikzfAtoms, BINDING_INTERFACE.ikzfBonds, '#fb923c', 'IKZF1', scale * 1.8, false);
    
    // Draw glue blob filling into CRBN pocket
    if (glueFillProgress > 0) {
      const fillEase = easeOutCubic(Math.min(1, glueFillProgress));
      
      const transformedOutline = GLUE_FILL_SHAPE.outline.map(p => {
        const wobble = Math.sin(time * 0.002 + p.x * 2) * 0.02 * fillEase;
        return transform3D(
          p.x + GLUE_FILL_SHAPE.offsetX + wobble,
          p.y + GLUE_FILL_SHAPE.offsetY,
          p.z + GLUE_FILL_SHAPE.offsetZ
        );
      });
      
      // Glow
      ctx.globalAlpha = glueFillProgress * 0.6;
      ctx.shadowColor = CONFIG.COLOR_ACCENT;
      ctx.shadowBlur = 15;
      ctx.fillStyle = CONFIG.COLOR_ACCENT;
      
      ctx.beginPath();
      transformedOutline.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      
      // Main blob
      ctx.shadowBlur = 0;
      ctx.globalAlpha = glueFillProgress * 0.9;
      
      const blobCenter = transform3D(
        GLUE_FILL_SHAPE.offsetX,
        GLUE_FILL_SHAPE.offsetY,
        GLUE_FILL_SHAPE.offsetZ
      );
      const gradient = ctx.createRadialGradient(
        blobCenter.x - 8, blobCenter.y - 8, 0,
        blobCenter.x, blobCenter.y, scale * 1.5
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.15, 'rgba(150, 230, 255, 0.9)');
      gradient.addColorStop(0.4, CONFIG.COLOR_ACCENT);
      gradient.addColorStop(0.7, 'rgba(0, 150, 200, 0.85)');
      gradient.addColorStop(1, 'rgba(0, 80, 120, 0.8)');
      
      ctx.fillStyle = gradient;
      
      // Smooth bezier blob
      ctx.beginPath();
      const pts = transformedOutline;
      ctx.moveTo(pts[0].x, pts[0].y);
      
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[(i - 1 + pts.length) % pts.length];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        const p3 = pts[(i + 2) % pts.length];
        
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.globalAlpha = glueFillProgress * 0.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Label
      if (glueFillProgress > 0.6) {
        ctx.globalAlpha = (glueFillProgress - 0.6) * 2.5 * 0.8;
        ctx.fillStyle = CONFIG.COLOR_ACCENT;
        ctx.font = 'bold 8px "SF Mono", monospace';
        ctx.shadowColor = CONFIG.COLOR_ACCENT;
        ctx.shadowBlur = 4;
        ctx.textAlign = 'center';
        ctx.fillText('Glue', blobCenter.x, blobCenter.y + scale * 2);
        ctx.shadowBlur = 0;
      }
    }
    
    // Scanning effect
    if (scanProgress > 0 && scanProgress < 1) {
      ctx.globalAlpha = opacity * (1 - scanProgress) * 0.5;
      ctx.strokeStyle = CONFIG.COLOR_ACCENT;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -time * 0.03;
      
      const scanRadius = scale * 2.5 * scanProgress;
      const pocketCenterX = centerX - scale * 1.2;
      ctx.beginPath();
      ctx.arc(pocketCenterX, centerY, scanRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }

  _drawPocketAnalysis(centerX, centerY, scale, progress, time) {
    if (progress <= 0) return;
    
    const ctx = this.ctx;
    const CONFIG = PhaseTwoConstruction.CONFIG;
    
    ctx.save();
    
    const rotY = Math.sin(time * 0.0002) * 0.2;
    const rotX = 0.3 + Math.cos(time * 0.00015) * 0.1;
    
    const transform3D = (x, y, z) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      
      return {
        x: centerX + x1 * scale,
        y: centerY + y1 * scale,
      };
    };
    
    // Scan lines over CRBN pocket
    ctx.globalAlpha = progress * 0.3;
    ctx.strokeStyle = CONFIG.COLOR_ACCENT;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -time * 0.015;
    
    for (let i = -3; i <= 3; i++) {
      const y = i * 0.5;
      const p1 = transform3D(-3.5, y, -1);
      const p2 = transform3D(-0.5, y, -1);
      ctx.globalAlpha = progress * 0.25 * (1 - Math.abs(i) / 4);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Data readout
    ctx.globalAlpha = progress * 0.85;
    ctx.fillStyle = CONFIG.COLOR_ACCENT;
    ctx.font = 'bold 9px "SF Mono", "Fira Code", monospace';
    ctx.textAlign = 'left';
    
    const data = [
      { text: 'CRBN Pocket: 285Å³', y: -3.0 },
      { text: 'Depth: 6.4Å', y: -2.3 },
      { text: 'Target: IKZF1', y: -1.6 },
    ];
    
    data.forEach((item, i) => {
      const p = transform3D(-4.8, item.y, 0);
      const flicker = 0.85 + Math.sin(time * 0.006 + i * 2) * 0.15;
      ctx.globalAlpha = progress * 0.8 * flicker;
      ctx.fillText(item.text, p.x, p.y);
    });
    
    ctx.restore();
  }

  _drawGlueMolecule(centerX, centerY, scale, visibleFragments, time, buildProgress) {
    if (visibleFragments.length === 0) return;
    
    const ctx = this.ctx;
    const CONFIG = PhaseTwoConstruction.CONFIG;
    const COMPLETE_GLUE_MOLECULE = PhaseTwoConstruction.COMPLETE_GLUE_MOLECULE;
    const FRAGMENT_INFO = PhaseTwoConstruction.FRAGMENT_INFO;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    const rotY = Math.sin(time * 0.00018) * 0.1;
    const rotX = Math.cos(time * 0.00012) * 0.08;
    
    const transform3D = (lx, ly, lz) => {
      const cx = lx - 0.5;
      const cy = ly - 3.5;
      
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      
      const x1 = cx * cosY - (lz || 0) * sinY;
      const z1 = cx * sinY + (lz || 0) * cosY;
      const y1 = cy * cosX - z1 * sinX;
      const z2 = cy * sinX + z1 * cosX;
      
      return { 
        x: x1 * scale, 
        y: y1 * scale,
        z: z2,
        depthOpacity: 0.75 + z2 * 0.1,
      };
    };
    
    const visibleAtomIndices = new Set();
    visibleFragments.forEach(fragIdx => {
      const frag = FRAGMENT_INFO[fragIdx];
      if (frag) {
        frag.atomIndices.forEach(idx => visibleAtomIndices.add(idx));
      }
    });
    
    const newestFragment = visibleFragments.length > 0 ? visibleFragments[visibleFragments.length - 1] : -1;
    const newestAtomIndices = new Set();
    if (newestFragment >= 0 && FRAGMENT_INFO[newestFragment]) {
      FRAGMENT_INFO[newestFragment].atomIndices.forEach(idx => newestAtomIndices.add(idx));
    }
    
    // Draw bonds
    COMPLETE_GLUE_MOLECULE.bonds.forEach((bond) => {
      if (!visibleAtomIndices.has(bond.from) || !visibleAtomIndices.has(bond.to)) return;
      
      const fromAtom = COMPLETE_GLUE_MOLECULE.atoms[bond.from];
      const toAtom = COMPLETE_GLUE_MOLECULE.atoms[bond.to];
      const p1 = transform3D(fromAtom.x, fromAtom.y, fromAtom.z || 0);
      const p2 = transform3D(toAtom.x, toAtom.y, toAtom.z || 0);
      
      const isNewBond = newestAtomIndices.has(bond.from) && newestAtomIndices.has(bond.to);
      const bondOpacity = (p1.depthOpacity + p2.depthOpacity) / 2;
      
      ctx.lineCap = 'round';
      
      if (isNewBond && buildProgress < 0.9) {
        ctx.shadowColor = CONFIG.COLOR_GLUE_GLOW;
        ctx.shadowBlur = 8 * (1 - buildProgress);
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.6 * bondOpacity})`;
      } else {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.4 * bondOpacity})`;
      }
      
      ctx.lineWidth = bond.order === 2 ? 2 : 2.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * bondOpacity})`;
      ctx.lineWidth = bond.order === 2 ? 1.2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });
    
    // Draw atoms
    const visibleAtoms = COMPLETE_GLUE_MOLECULE.atoms
      .map((atom, idx) => ({ ...atom, index: idx }))
      .filter(atom => visibleAtomIndices.has(atom.index))
      .sort((a, b) => (a.z || 0) - (b.z || 0));
    
    visibleAtoms.forEach((atom) => {
      const p = transform3D(atom.x, atom.y, atom.z || 0);
      const baseRadius = PhaseTwoConstruction.getAtomRadius(atom.element);
      const radius = baseRadius * (scale / 9);
      const color = PhaseTwoConstruction.getAtomColor(atom.element);
      
      const isNewAtom = newestAtomIndices.has(atom.index);
      
      if (isNewAtom && buildProgress < 0.9) {
        ctx.shadowColor = CONFIG.COLOR_ACCENT;
        ctx.shadowBlur = 10 * (1 - buildProgress);
      } else {
        ctx.shadowBlur = 0;
      }
      
      const gradient = ctx.createRadialGradient(
        p.x - radius * 0.3, p.y - radius * 0.3, 0,
        p.x, p.y, radius
      );
      
      if (isNewAtom && buildProgress < 0.9) {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        gradient.addColorStop(0.25, CONFIG.COLOR_ACCENT);
        gradient.addColorStop(0.55, color);
        gradient.addColorStop(1, 'rgba(50, 50, 50, 0.85)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.35, color);
        gradient.addColorStop(0.7, 'rgba(80, 80, 80, 0.8)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0.85)');
      }
      
      ctx.globalAlpha = p.depthOpacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isNewAtom && buildProgress < 0.9 
        ? 'rgba(0, 212, 255, 0.6)' 
        : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    
    ctx.restore();
  }

  // ============================================
  // ANIMATION LOGIC
  // ============================================
  _resetAnimation() {
    this.state.phase = 'scanning';
    this.state.subPhase = 'analyze';
    this.state.phaseStartTime = this.state.time;
    this.state.subPhaseStartTime = this.state.time;
    this.state.currentFragment = 0;
    this.state.visibleFragments = [];
    this.state.scanProgress = 0;
    this.state.pocketHighlight = 0;
    this.state.glueFillProgress = 0;
    this.state.buildProgress = 0;
    this.state.metrics = {
      fragmentCount: 0,
      cooperativity: 0,
      deltaG: 0,
      bsa: 0,
      shapeComp: 0,
    };
  }

  _getRejectMessage(reason) {
    const T = PhaseTwoConstruction.TRANSLATIONS;
    switch (reason) {
      case 'High Entropy': return T.rejectHighEntropy;
      case 'Steric Clash (Interface)': return T.rejectStericClash;
      case 'Poor Surface Complementarity': return T.rejectPoorSurface;
      case 'Negative Cooperativity': return T.rejectNegativeCooperativity;
      default: return `✗ Rejected: ${reason}`;
    }
  }

  _animate(timestamp) {
    if (!this.isRunning) return;
    
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const CONFIG = PhaseTwoConstruction.CONFIG;
    const FRAGMENT_INFO = PhaseTwoConstruction.FRAGMENT_INFO;
    const REJECTED_FRAGMENTS = PhaseTwoConstruction.REJECTED_FRAGMENTS;
    const T = PhaseTwoConstruction.TRANSLATIONS;
    const { lerp, clamp, easeOutCubic, easeInOutCubic } = PhaseTwoConstruction;
    
    const state = this.state;
    const deltaTime = timestamp - (state.lastTimestamp || timestamp);
    state.lastTimestamp = timestamp;
    state.time += deltaTime;
    
    const dividerX = width * CONFIG.LEFT_PANEL_RATIO;
    const leftCenterX = dividerX / 2;
    const leftCenterY = height / 2 + 15;
    const rightCenterX = dividerX + (width - dividerX) * 0.30;
    const rightCenterY = height / 2 - 20;
    
    const leftScale = Math.min(dividerX, height) * 0.095;
    const rightScale = 11;
    
    const elapsed = state.time - state.phaseStartTime;
    const subElapsed = state.time - state.subPhaseStartTime;
    
    // Phase logic
    if (state.phase === 'scanning') {
      state.scanProgress = easeInOutCubic(clamp(elapsed / CONFIG.PHASE_SCAN_DURATION, 0, 1));
      state.pocketHighlight = state.scanProgress;
      state.statusMessage = T.analyzing;
      state.statusColor = CONFIG.COLOR_ACCENT;

      if (elapsed > CONFIG.PHASE_SCAN_DURATION) {
        state.phase = 'building';
        state.subPhase = 'addBase';
        state.phaseStartTime = state.time;
        state.subPhaseStartTime = state.time;
      }
    } else if (state.phase === 'building') {
      state.pocketHighlight = 1;

      if (state.subPhase === 'addBase') {
        state.statusMessage = T.placingCore;
        state.statusColor = CONFIG.COLOR_ACCENT;

        const baseProgress = clamp(subElapsed / CONFIG.PHASE_FRAGMENT_SNAP, 0, 1);

        if (baseProgress > 0.1 && !state.visibleFragments.includes(0)) {
          state.visibleFragments = [0];
        }

        state.buildProgress = baseProgress;

        if (subElapsed > CONFIG.PHASE_FRAGMENT_SNAP + 400) {
          state.statusMessage = T.coreAnchored;
          state.statusColor = CONFIG.COLOR_SUCCESS;
          state.metrics.fragmentCount = 1;
          state.subPhase = 'ghost';
          state.subPhaseStartTime = state.time;
          state.currentFragment = 1;
        }
      } else {
        const fragInfo = FRAGMENT_INFO[state.currentFragment];

        if (!fragInfo || state.currentFragment >= state.totalFragments) {
          state.phase = 'filling';
          state.phaseStartTime = state.time;
        } else {
          switch (state.subPhase) {
            case 'ghost':
              state.rejectedFragment = REJECTED_FRAGMENTS[(state.currentFragment - 1) % REJECTED_FRAGMENTS.length];
              state.statusMessage = T.testing(state.rejectedFragment.name);
              state.statusColor = CONFIG.COLOR_TEXT_SECONDARY;

              if (subElapsed > CONFIG.PHASE_GHOST_APPEAR) {
                state.subPhase = 'reject';
                state.subPhaseStartTime = state.time;
              }
              break;

            case 'reject':
              state.statusMessage = this._getRejectMessage(state.rejectedFragment.reason);
              state.statusColor = CONFIG.COLOR_REJECT;

              if (subElapsed > CONFIG.PHASE_GHOST_REJECT) {
                state.subPhase = 'align';
                state.subPhaseStartTime = state.time;
              }
              break;

            case 'align':
              state.statusMessage = T.aligning(fragInfo.name);
              state.statusColor = CONFIG.COLOR_ACCENT;

              if (subElapsed > CONFIG.PHASE_FRAGMENT_ALIGN) {
                state.subPhase = 'snap';
                state.subPhaseStartTime = state.time;
              }
              break;

            case 'snap': {
              state.statusMessage = T.reactionSuccess(fragInfo.reaction);
              state.statusColor = CONFIG.COLOR_SUCCESS;

              const snapProgress = clamp(subElapsed / CONFIG.PHASE_FRAGMENT_SNAP, 0, 1);

              if (snapProgress > 0.1 && !state.visibleFragments.includes(state.currentFragment)) {
                state.visibleFragments = [...state.visibleFragments, state.currentFragment];
              }

              state.buildProgress = snapProgress;

              if (subElapsed > CONFIG.PHASE_FRAGMENT_SNAP) {
                state.subPhase = 'pause';
                state.subPhaseStartTime = state.time;
                state.metrics.fragmentCount = state.currentFragment + 1;
              }
              break;
            }

            case 'pause':
              state.statusMessage = `Enamine ${fragInfo.catalogId}`;
              state.statusColor = CONFIG.COLOR_TEXT_SECONDARY;

              if (subElapsed > CONFIG.PHASE_FRAGMENT_PAUSE) {
                state.currentFragment++;
                if (state.currentFragment >= state.totalFragments) {
                  state.phase = 'filling';
                  state.phaseStartTime = state.time;
                } else {
                  state.subPhase = 'ghost';
                  state.subPhaseStartTime = state.time;
                }
              }
              break;
          }
        }
      }
    } else if (state.phase === 'filling') {
      state.statusMessage = T.filling;
      state.statusColor = CONFIG.COLOR_ACCENT;
      state.glueFillProgress = easeOutCubic(clamp(elapsed / CONFIG.PHASE_INTERFACE_FORM, 0, 1));

      if (elapsed >= CONFIG.PHASE_INTERFACE_FORM) {
        state.phase = 'stabilizing';
        state.phaseStartTime = state.time;
      }
    } else if (state.phase === 'stabilizing') {
      const progress = clamp(elapsed / CONFIG.PHASE_STABILIZATION, 0, 1);
      state.glueFillProgress = 1;
      state.metrics.cooperativity = easeOutCubic(progress);
      state.metrics.deltaG = lerp(0, -9.8, easeOutCubic(progress));
      state.metrics.bsa = lerp(0, 847, easeOutCubic(progress));
      state.metrics.shapeComp = lerp(0, 0.92, easeOutCubic(progress));
      state.statusMessage = T.validating;
      state.statusColor = CONFIG.COLOR_SUCCESS;

      if (progress >= 1) {
        state.phase = 'complete';
        state.phaseStartTime = state.time;
        state.statusMessage = T.stable;
      }
    } else if (state.phase === 'complete') {
      state.glueFillProgress = 1;
      if (elapsed > CONFIG.PHASE_COMPLETE_HOLD) {
        this._resetAnimation();
      }
    }
    
    // Update UI
    this._updateStatusPanel(state.statusMessage, state.statusColor);
    this._updateBOMPanel();
    
    // RENDER
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, width, height);
    
    this._draw3DGrid(width, height, state.time);
    
    // Divider
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dividerX, 60);
    ctx.lineTo(dividerX, height - 80);
    ctx.stroke();
    ctx.restore();
    
    // LEFT: Binding Interface
    const contactGlow = (state.phase === 'filling' || state.phase === 'stabilizing' || state.phase === 'complete') 
      ? Math.min(1, state.glueFillProgress * 1.5) : 0;
    
    this._drawBindingInterface(leftCenterX, leftCenterY, leftScale, 1, state.time, 
      state.scanProgress, state.pocketHighlight, contactGlow, state.glueFillProgress);
    
    if (state.scanProgress > 0.3 && state.phase === 'scanning') {
      this._drawPocketAnalysis(leftCenterX, leftCenterY, leftScale, 
        (state.scanProgress - 0.3) / 0.7, state.time);
    }
    
    ctx.save();
    ctx.font = '10px "SF Mono", "Fira Code", monospace';
    ctx.fillStyle = CONFIG.COLOR_TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(T.proteinInterface, leftCenterX, height - 45);
    ctx.restore();

    // RIGHT: Glue Construction
    if (state.visibleFragments.length > 0) {
      this._drawGlueMolecule(rightCenterX, rightCenterY, rightScale,
        state.visibleFragments, state.time, state.buildProgress || 1);
    }

    ctx.save();
    ctx.font = '10px "SF Mono", "Fira Code", monospace';
    ctx.fillStyle = CONFIG.COLOR_TEXT_MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(T.glueConstruction, rightCenterX, height - 45);
    ctx.restore();
    
    this.animationId = requestAnimationFrame((ts) => this._animate(ts));
  }

  // ============================================
  // PUBLIC API
  // ============================================
  start() {
    if (this.isRunning || !this.container) return;
    
    this.isRunning = true;
    this.state.phaseStartTime = 0;
    this.state.subPhaseStartTime = 0;
    this.state.time = 0;
    this.state.lastTimestamp = 0;
    this._resetAnimation();
    this.animationId = requestAnimationFrame((ts) => this._animate(ts));
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy() {
    this.stop();
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// ============================================
// AUTO-INITIALIZATION FOR ES MODULES
// ============================================
// Store instance globally for potential external access
let protacAnimationInstance = null;

function initProtacAnimation() {
  const container = document.getElementById('protac-animation-container');
  if (container && !protacAnimationInstance) {
    protacAnimationInstance = new PhaseTwoConstruction('protac-animation-container');
    protacAnimationInstance.start();
    console.log('PROTAC Linker Animation initialized');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProtacAnimation);
} else {
  // DOM is already ready
  initProtacAnimation();
}

// Also try to initialize after a short delay (for dynamically loaded content)
setTimeout(initProtacAnimation, 100);

// Export for ES modules
export { PhaseTwoConstruction, protacAnimationInstance };
export default PhaseTwoConstruction;