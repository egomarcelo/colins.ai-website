/* =========================
DENDRITE GROWTH SIMULATION
Solid-State Battery Digital Twin Visualization
Canvas 2D implementation with interactive sliders
=========================== */

// Configuration constants
const DENDRITE_CONFIG = {
  // Canvas dimensions
  CANVAS_HEIGHT: 400,
  
  // Layer proportions (of canvas height)
  ANODE_HEIGHT_RATIO: 0.4,
  ELECTROLYTE_HEIGHT_RATIO: 0.6,
  METRICS_HEIGHT_RATIO: 0,
  
  // Colors - Light theme (COMSOL/Ansys style)
  COLOR_ANODE_TOP: '#E8E8EC',      // Light silver
  COLOR_ANODE_BOTTOM: '#A8A8B0',   // Darker silver/grey
  COLOR_ELECTROLYTE: '#B8D4E8',    // Light blue ceramic
  COLOR_ELECTROLYTE_PATTERN: 'rgba(255, 255, 255, 0.3)', // Geometric pattern overlay
  COLOR_INTERFACE: '#6B7280',       // Grey interface line
  COLOR_VOID: '#1a1a2e',            // Dark void color
  COLOR_DENDRITE: '#C0C0C8',        // Metallic silver for dendrite
  COLOR_DENDRITE_TIP: '#F0F0F5',    // Bright tip
  
  // Heatmap colors (current density)
  COLOR_HEAT_LOW: '#3B82F6',        // Blue (low current)
  COLOR_HEAT_MED: '#F59E0B',        // Orange
  COLOR_HEAT_HIGH: '#EF4444',       // Red (high current)
  COLOR_HEAT_CRITICAL: '#FFFFFF',   // White (critical)
  
  // Background
  COLOR_BACKGROUND: '#F9FAFB',
  COLOR_PANEL_BG: '#FFFFFF',
  COLOR_PANEL_BORDER: '#E5E7EB',
  COLOR_TEXT: '#1F2937',
  COLOR_TEXT_SECONDARY: '#6B7280',
  
  // Risk gauge colors
  COLOR_RISK_SAFE: '#22C55E',
  COLOR_RISK_WARNING: '#F59E0B',
  COLOR_RISK_DANGER: '#EF4444',
  
  // Animation
  TRANSITION_DURATION: 800,         // ms for smooth transitions
  MOBILE_CYCLE_DURATION: 5000,      // ms per state on mobile
  
  // Physics parameters
  PRESSURE_MIN: 2,
  PRESSURE_MAX: 20,
  PRESSURE_DEFAULT: 10,
  ROUGHNESS_MIN: 0.1,
  ROUGHNESS_MAX: 5.0,
  ROUGHNESS_DEFAULT: 1.0,
  
  // Dendrite growth thresholds
  VOID_THRESHOLD_PRESSURE: 8,       // Below this, voids form
  DENDRITE_THRESHOLD_PRESSURE: 6,   // Below this, dendrite grows rapidly
};

// Utility functions
const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * DendriteSimulation Class
 * Main class for the solid-state battery visualization
 */
class DendriteSimulation {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;
    
    // Current parameter values
    this.pressure = DENDRITE_CONFIG.PRESSURE_DEFAULT;
    this.roughness = DENDRITE_CONFIG.ROUGHNESS_DEFAULT;
    
    // Animated values (for smooth transitions)
    this.animatedPressure = this.pressure;
    this.animatedRoughness = this.roughness;
    
    // Derived physics values
    this.voidFraction = 0;
    this.dendritePenetration = 0;
    this.riskLevel = 0;
    this.currentDensityMap = [];
    
    // Interface geometry (will be generated based on roughness)
    this.interfacePoints = [];
    this.lithiumBottom = [];
    
    // Animation state
    this.animationId = null;
    this.lastFrameTime = 0;
    this.isTransitioning = false;
    this.transitionStartTime = 0;
    this.transitionStartPressure = 0;
    this.transitionStartRoughness = 0;
    this.transitionTargetPressure = 0;
    this.transitionTargetRoughness = 0;
    
    // Mobile auto-cycle
    this.isMobile = window.innerWidth < 768;
    this.mobileState = 'low'; // 'low' or 'high'
    this.lastCycleTime = 0;
    
    // Annotation state
    this.activeAnnotations = [];
    
    // UI elements
    this.pressureSlider = null;
    this.roughnessSlider = null;
    this.pressureValue = null;
    this.roughnessValue = null;
    this.penetrationDisplay = null;
    this.riskGauge = null;
    
    this.init();
  }
  
  /**
   * Initialize the visualization
   */
  init() {
    this.createUI();
    this.setupEventListeners();
    this.handleResize();
    this.generateInterfaceGeometry();
    this.startAnimation();
    
    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('languageChanged', () => this.updateTranslations());
    setTimeout(() => this.updateTranslations(), 100);
  }
  
  /**
   * Create the complete UI structure
   */
  createUI() {
    // Main wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dendrite-simulation-wrapper';
    this.wrapper.style.cssText = `
      position: relative;
      width: 100%;
      background: ${DENDRITE_CONFIG.COLOR_BACKGROUND};
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid ${DENDRITE_CONFIG.COLOR_PANEL_BORDER};
    `;
    
    // Create layout container
    const layoutContainer = document.createElement('div');
    layoutContainer.className = 'dendrite-layout';
    layoutContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 100%;
    `;
    
    // Desktop: side-by-side layout
    // Mobile: stacked layout
    if (!this.isMobile) {
      layoutContainer.style.cssText += `
        @media (min-width: 768px) {
          flex-direction: row;
        }
      `;
    }
    
    // Left panel: Controls (desktop only)
    if (!this.isMobile) {
      this.controlPanel = this.createControlPanel();
      layoutContainer.appendChild(this.controlPanel);
    }
    
    // Right panel: Canvas visualization
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'dendrite-canvas-container';
    this.canvasContainer.style.cssText = `
      flex: 1;
      position: relative;
      min-height: ${DENDRITE_CONFIG.CANVAS_HEIGHT}px;
    `;
    
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;
    this.canvasContainer.appendChild(this.canvas);
    
    // Create metrics overlay
    this.metricsOverlay = this.createMetricsOverlay();
    this.canvasContainer.appendChild(this.metricsOverlay);
    
    // Create annotations container
    this.annotationsContainer = document.createElement('div');
    this.annotationsContainer.className = 'dendrite-annotations';
    this.annotationsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      overflow: hidden;
    `;
    this.canvasContainer.appendChild(this.annotationsContainer);
    
    layoutContainer.appendChild(this.canvasContainer);
    
    // Mobile: Add state indicator
    if (this.isMobile) {
      this.mobileIndicator = this.createMobileIndicator();
      this.canvasContainer.appendChild(this.mobileIndicator);
    }
    
    this.wrapper.appendChild(layoutContainer);
    this.container.appendChild(this.wrapper);
    
    this.ctx = this.canvas.getContext('2d');
  }
  
  /**
   * Create the control panel with sliders
   */
  createControlPanel() {
    const panel = document.createElement('div');
    panel.className = 'dendrite-control-panel';
    panel.style.cssText = `
      width: 280px;
      min-width: 280px;
      padding: 24px;
      background: ${DENDRITE_CONFIG.COLOR_PANEL_BG};
      border-right: 1px solid ${DENDRITE_CONFIG.COLOR_PANEL_BORDER};
      display: flex;
      flex-direction: column;
      gap: 24px;
    `;
    
    // Title
    const title = document.createElement('div');
    title.style.cssText = `
      padding-top: 8px;
      margin-bottom: 8px;
    `;
    title.innerHTML = `
      <h4 class="text-sm font-bold uppercase tracking-wide text-secondary dark:text-secondary-light mb-1" 
          data-i18n="deeptech.simulation.controlTitle">Manufacturing Parameters</h4>
      <p class="text-xs text-secondary/60 dark:text-secondary-light/60" 
         data-i18n="deeptech.simulation.controlSubtitle">Adjust to simulate cell behavior</p>
    `;
    panel.appendChild(title);
    
    // Pressure slider
    const pressureControl = this.createSliderControl(
      'pressure',
      'deeptech.simulation.pressure',
      'Stack Pressure',
      'F<sub>ext</sub>',
      'MPa',
      DENDRITE_CONFIG.PRESSURE_MIN,
      DENDRITE_CONFIG.PRESSURE_MAX,
      DENDRITE_CONFIG.PRESSURE_DEFAULT,
      0.5
    );
    panel.appendChild(pressureControl);
    
    // Roughness slider
    const roughnessControl = this.createSliderControl(
      'roughness',
      'deeptech.simulation.roughness',
      'Surface Roughness',
      'Δ',
      'μm',
      DENDRITE_CONFIG.ROUGHNESS_MIN,
      DENDRITE_CONFIG.ROUGHNESS_MAX,
      DENDRITE_CONFIG.ROUGHNESS_DEFAULT,
      0.1
    );
    panel.appendChild(roughnessControl);
    
    return panel;
  }
  
  /**
   * Create a slider control with label and value display
   */
  createSliderControl(id, i18nKey, label, symbol, unit, min, max, defaultVal, step) {
    const container = document.createElement('div');
    container.className = `slider-control slider-${id}`;
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 12px;
    `;
    
    // Label row
    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    `;
    
    const labelEl = document.createElement('label');
    labelEl.className = 'text-sm font-medium text-secondary dark:text-secondary-light';
    
    const labelText = document.createElement('span');
    labelText.setAttribute('data-i18n', `${i18nKey}.label`);
    labelText.textContent = label;
    
    const symbolSpan = document.createElement('span');
    symbolSpan.className = 'text-xs text-secondary/50 ml-1';
    symbolSpan.innerHTML = `(${symbol})`;
    
    labelEl.appendChild(labelText);
    labelEl.appendChild(symbolSpan);
    
    const valueEl = document.createElement('span');
    valueEl.className = `slider-value-${id}`;
    valueEl.style.cssText = `
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      font-size: 14px;
      font-weight: 600;
      color: #3B82F6;
    `;
    valueEl.textContent = `${defaultVal.toFixed(1)} ${unit}`;
    
    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    container.appendChild(labelRow);
    
    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `dendrite-${id}-slider`;
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = defaultVal;
    slider.style.cssText = `
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((defaultVal - min) / (max - min)) * 100}%, #E5E7EB ${((defaultVal - min) / (max - min)) * 100}%, #E5E7EB 100%);
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
    `;
    
    // Custom slider thumb styles
    const style = document.createElement('style');
    style.textContent = `
      #dendrite-${id}-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3B82F6;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: transform 0.15s ease;
      }
      #dendrite-${id}-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      #dendrite-${id}-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3B82F6;
        cursor: pointer;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);
    
    container.appendChild(slider);
    
    // Range labels
    const rangeLabels = document.createElement('div');
    rangeLabels.style.cssText = `
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: ${DENDRITE_CONFIG.COLOR_TEXT_SECONDARY};
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    `;
    rangeLabels.innerHTML = `
      <span>${min} ${unit}</span>
      <span>${max} ${unit}</span>
    `;
    container.appendChild(rangeLabels);
    
    // Store references
    if (id === 'pressure') {
      this.pressureSlider = slider;
      this.pressureValue = valueEl;
    } else {
      this.roughnessSlider = slider;
      this.roughnessValue = valueEl;
    }
    
    return container;
  }
  
  /**
   * Create metrics overlay (penetration & risk gauge)
   */
  createMetricsOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'dendrite-metrics-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
    
    // Penetration metric
    const penetrationCard = document.createElement('div');
    penetrationCard.className = 'metric-card penetration-card';
    penetrationCard.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid ${DENDRITE_CONFIG.COLOR_PANEL_BORDER};
      border-radius: 12px;
      padding: 12px 16px;
      min-width: 140px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;
    penetrationCard.innerHTML = `
      <div class="text-[10px] font-semibold uppercase tracking-wide text-secondary/60 mb-1" 
           data-i18n="deeptech.simulation.penetration">Dendrite Penetration</div>
      <div class="penetration-value text-2xl font-bold text-secondary" style="font-family: 'SF Mono', monospace;">0%</div>
    `;
    this.penetrationDisplay = penetrationCard.querySelector('.penetration-value');
    overlay.appendChild(penetrationCard);
    
    // Risk gauge
    const riskCard = document.createElement('div');
    riskCard.className = 'metric-card risk-card';
    riskCard.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid ${DENDRITE_CONFIG.COLOR_PANEL_BORDER};
      border-radius: 12px;
      padding: 12px 16px;
      min-width: 140px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;
    riskCard.innerHTML = `
      <div class="text-[10px] font-semibold uppercase tracking-wide text-secondary/60 mb-2" 
           data-i18n="deeptech.simulation.failureRisk">Failure Risk</div>
      <div class="risk-gauge-container" style="position: relative; height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden;">
        <div class="risk-gauge-fill" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: ${DENDRITE_CONFIG.COLOR_RISK_SAFE}; border-radius: 4px; transition: all 0.3s ease;"></div>
      </div>
      <div class="risk-label text-xs font-semibold mt-1" style="color: ${DENDRITE_CONFIG.COLOR_RISK_SAFE};" data-i18n="deeptech.simulation.riskLow">Low Risk</div>
    `;
    this.riskGauge = riskCard.querySelector('.risk-gauge-fill');
    this.riskLabel = riskCard.querySelector('.risk-label');
    overlay.appendChild(riskCard);
    
    return overlay;
  }
  
  /**
   * Create mobile state indicator
   */
  createMobileIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'mobile-state-indicator';
    indicator.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid ${DENDRITE_CONFIG.COLOR_PANEL_BORDER};
      border-radius: 20px;
      padding: 8px 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;
    
    indicator.innerHTML = `
      <div class="state-dot state-low" style="width: 10px; height: 10px; border-radius: 50%; background: ${DENDRITE_CONFIG.COLOR_RISK_DANGER}; opacity: 1; transition: opacity 0.3s;"></div>
      <span class="state-text text-xs font-medium text-secondary" data-i18n="deeptech.simulation.stateLow">Low Pressure (2 MPa)</span>
      <div class="state-dot state-high" style="width: 10px; height: 10px; border-radius: 50%; background: ${DENDRITE_CONFIG.COLOR_RISK_SAFE}; opacity: 0.3; transition: opacity 0.3s;"></div>
    `;
    
    this.mobileStateDots = {
      low: indicator.querySelector('.state-low'),
      high: indicator.querySelector('.state-high'),
      text: indicator.querySelector('.state-text')
    };
    
    return indicator;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.isMobile) {
      // Desktop slider events
      if (this.pressureSlider) {
        this.pressureSlider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          this.setTargetPressure(value);
          this.updateSliderVisual(this.pressureSlider, value, DENDRITE_CONFIG.PRESSURE_MIN, DENDRITE_CONFIG.PRESSURE_MAX);
          this.pressureValue.textContent = `${value.toFixed(1)} MPa`;
        });
      }
      
      if (this.roughnessSlider) {
        this.roughnessSlider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          this.setTargetRoughness(value);
          this.updateSliderVisual(this.roughnessSlider, value, DENDRITE_CONFIG.ROUGHNESS_MIN, DENDRITE_CONFIG.ROUGHNESS_MAX);
          this.roughnessValue.textContent = `${value.toFixed(1)} μm`;
        });
      }
    }
    
    // Handle resize for mobile detection
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      if (wasMobile !== this.isMobile) {
        // Rebuild UI on mode change
        location.reload();
      }
    });
  }
  
  /**
   * Update slider visual (track fill)
   */
  updateSliderVisual(slider, value, min, max) {
    const percent = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percent}%, #E5E7EB ${percent}%, #E5E7EB 100%)`;
  }
  
  /**
   * Set target pressure with animation
   */
  setTargetPressure(value) {
    this.transitionStartPressure = this.animatedPressure;
    this.transitionTargetPressure = value;
    this.transitionStartRoughness = this.animatedRoughness;
    this.transitionTargetRoughness = this.roughness;
    this.transitionStartTime = performance.now();
    this.isTransitioning = true;
    this.pressure = value;
  }
  
  /**
   * Set target roughness with animation
   */
  setTargetRoughness(value) {
    this.transitionStartPressure = this.animatedPressure;
    this.transitionTargetPressure = this.pressure;
    this.transitionStartRoughness = this.animatedRoughness;
    this.transitionTargetRoughness = value;
    this.transitionStartTime = performance.now();
    this.isTransitioning = true;
    this.roughness = value;
    this.generateInterfaceGeometry();
  }
  
  /**
   * Handle resize
   */
  handleResize() {
    const rect = this.canvasContainer.getBoundingClientRect();
    this.width = rect.width;
    this.height = Math.max(rect.height, DENDRITE_CONFIG.CANVAS_HEIGHT);
    
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(this.dpr, this.dpr);
    
    this.generateInterfaceGeometry();
  }
  
  /**
   * Generate interface geometry based on roughness
   */
  generateInterfaceGeometry() {
    const interfaceY = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
    const numPoints = Math.floor(this.width / 4);
    
    this.interfacePoints = [];
    this.lithiumBottom = [];
    
    // Roughness affects amplitude of interface variation
    const roughnessNormalized = (this.roughness - DENDRITE_CONFIG.ROUGHNESS_MIN) / 
                                (DENDRITE_CONFIG.ROUGHNESS_MAX - DENDRITE_CONFIG.ROUGHNESS_MIN);
    const amplitude = roughnessNormalized * 25; // Max 25px variation
    
    // Generate rough interface
    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * this.width;
      
      // Multiple frequency components for realistic roughness
      const noise1 = Math.sin(i * 0.3) * amplitude * 0.5;
      const noise2 = Math.sin(i * 0.7 + 1.5) * amplitude * 0.3;
      const noise3 = Math.sin(i * 1.2 + 3.0) * amplitude * 0.2;
      
      const y = interfaceY + noise1 + noise2 + noise3;
      
      this.interfacePoints.push({ x, y, baseY: y });
    }
    
    // Initialize lithium bottom (will be modified by pressure)
    this.lithiumBottom = this.interfacePoints.map(p => ({ ...p }));
  }
  
  /**
   * Calculate physics state based on current parameters
   */
  calculatePhysicsState() {
    const pressure = this.animatedPressure;
    const roughness = this.animatedRoughness;
    
    // Normalize values
    const pressureNorm = (pressure - DENDRITE_CONFIG.PRESSURE_MIN) / 
                         (DENDRITE_CONFIG.PRESSURE_MAX - DENDRITE_CONFIG.PRESSURE_MIN);
    const roughnessNorm = (roughness - DENDRITE_CONFIG.ROUGHNESS_MIN) / 
                          (DENDRITE_CONFIG.ROUGHNESS_MAX - DENDRITE_CONFIG.ROUGHNESS_MIN);
    
    // Void fraction: increases at low pressure, especially with high roughness
    // Based on Persson's Contact Theory
    const voidThreshold = (DENDRITE_CONFIG.VOID_THRESHOLD_PRESSURE - DENDRITE_CONFIG.PRESSURE_MIN) / 
                          (DENDRITE_CONFIG.PRESSURE_MAX - DENDRITE_CONFIG.PRESSURE_MIN);
    if (pressureNorm < voidThreshold) {
      const voidFactor = 1 - (pressureNorm / voidThreshold);
      this.voidFraction = voidFactor * (0.3 + roughnessNorm * 0.5);
    } else {
      this.voidFraction = 0;
    }
    
    // Dendrite penetration: grows at low pressure and high roughness
    const dendriteThreshold = (DENDRITE_CONFIG.DENDRITE_THRESHOLD_PRESSURE - DENDRITE_CONFIG.PRESSURE_MIN) / 
                              (DENDRITE_CONFIG.PRESSURE_MAX - DENDRITE_CONFIG.PRESSURE_MIN);
    if (pressureNorm < dendriteThreshold) {
      const growthFactor = 1 - (pressureNorm / dendriteThreshold);
      this.dendritePenetration = growthFactor * (0.4 + roughnessNorm * 0.6);
    } else {
      this.dendritePenetration = Math.max(0, this.dendritePenetration - 0.02); // Slowly recede
    }
    this.dendritePenetration = clamp(this.dendritePenetration, 0, 1);
    
    // Risk level: combination of void and dendrite factors
    this.riskLevel = Math.max(this.voidFraction, this.dendritePenetration) * 100;
    
    // Update lithium deformation based on pressure (viscoplastic flow)
    this.updateLithiumDeformation(pressureNorm);
    
    // Update current density map for heatmap
    this.updateCurrentDensityMap(roughnessNorm, pressureNorm);
  }
  
  /**
   * Update lithium bottom deformation based on pressure
   */
  updateLithiumDeformation(pressureNorm) {
    const interfaceY = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
    
    for (let i = 0; i < this.interfacePoints.length; i++) {
      const interfacePoint = this.interfacePoints[i];
      
      // At high pressure, lithium flows down to fill gaps (viscoplastic)
      // At low pressure, it pulls back creating voids
      const gapAtInterface = interfacePoint.y - interfaceY;
      
      if (pressureNorm > 0.5) {
        // High pressure: lithium fills the interface
        const fillFactor = (pressureNorm - 0.5) * 2; // 0 to 1 for pressure 0.5 to 1
        this.lithiumBottom[i].y = lerp(interfaceY, interfacePoint.y, fillFactor);
      } else {
        // Low pressure: voids form (lithium doesn't reach interface at low points)
        const voidFactor = 1 - (pressureNorm * 2); // 1 to 0 for pressure 0 to 0.5
        const voidDepth = Math.max(0, gapAtInterface) * voidFactor * 0.8;
        this.lithiumBottom[i].y = interfaceY - voidDepth * 0.5;
      }
    }
  }
  
  /**
   * Update current density map for heatmap visualization
   */
  updateCurrentDensityMap(roughnessNorm, pressureNorm) {
    this.currentDensityMap = [];
    
    // Current focuses at asperities (peaks) when pressure is low
    // and roughness is high
    const focusingFactor = (1 - pressureNorm) * roughnessNorm;
    
    for (let i = 0; i < this.interfacePoints.length; i++) {
      const point = this.interfacePoints[i];
      const interfaceY = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
      
      // Points below average interface = peaks = high current density
      const deviation = interfaceY - point.y;
      const normalizedDeviation = deviation / 25; // Normalize by max amplitude
      
      // Current density increases at peaks
      let currentDensity = 0.3; // Base current
      if (normalizedDeviation > 0) {
        currentDensity += normalizedDeviation * focusingFactor * 0.7;
      }
      
      this.currentDensityMap.push(clamp(currentDensity, 0, 1));
    }
  }
  
  /**
   * Start animation loop
   */
  startAnimation() {
    const animate = (timestamp) => {
      const deltaTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;
      
      // Mobile auto-cycle
      if (this.isMobile) {
        this.updateMobileCycle(timestamp);
      }
      
      // Update animated values with smooth transitions
      this.updateTransitions(timestamp);
      
      // Calculate physics state
      this.calculatePhysicsState();
      
      // Update annotations
      this.updateAnnotations();
      
      // Update metrics displays
      this.updateMetricsDisplay();
      
      // Render
      this.render();
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }
  
  /**
   * Update mobile auto-cycle
   */
  updateMobileCycle(timestamp) {
    if (timestamp - this.lastCycleTime > DENDRITE_CONFIG.MOBILE_CYCLE_DURATION) {
      this.lastCycleTime = timestamp;
      
      // Toggle state
      if (this.mobileState === 'low') {
        this.mobileState = 'high';
        this.setTargetPressure(18);
        this.setTargetRoughness(0.5);
        
        // Update indicator
        if (this.mobileStateDots) {
          this.mobileStateDots.low.style.opacity = '0.3';
          this.mobileStateDots.high.style.opacity = '1';
          this.mobileStateDots.text.setAttribute('data-i18n', 'deeptech.simulation.stateHigh');
          this.mobileStateDots.text.textContent = window.i18n?.t('deeptech.simulation.stateHigh') || 'High Pressure (18 MPa)';
        }
      } else {
        this.mobileState = 'low';
        this.setTargetPressure(3);
        this.setTargetRoughness(4.0);
        
        // Update indicator
        if (this.mobileStateDots) {
          this.mobileStateDots.low.style.opacity = '1';
          this.mobileStateDots.high.style.opacity = '0.3';
          this.mobileStateDots.text.setAttribute('data-i18n', 'deeptech.simulation.stateLow');
          this.mobileStateDots.text.textContent = window.i18n?.t('deeptech.simulation.stateLow') || 'Low Pressure (3 MPa)';
        }
      }
    }
  }
  
  /**
   * Update smooth transitions
   */
  updateTransitions(timestamp) {
    if (this.isTransitioning) {
      const elapsed = timestamp - this.transitionStartTime;
      const progress = Math.min(elapsed / DENDRITE_CONFIG.TRANSITION_DURATION, 1);
      const eased = easeInOutCubic(progress);
      
      this.animatedPressure = lerp(this.transitionStartPressure, this.transitionTargetPressure, eased);
      this.animatedRoughness = lerp(this.transitionStartRoughness, this.transitionTargetRoughness, eased);
      
      if (progress >= 1) {
        this.isTransitioning = false;
        this.animatedPressure = this.transitionTargetPressure;
        this.animatedRoughness = this.transitionTargetRoughness;
      }
      
      // Regenerate interface if roughness changed
      if (Math.abs(this.animatedRoughness - this.roughness) > 0.01) {
        // Interpolate interface geometry
        const roughnessNorm = (this.animatedRoughness - DENDRITE_CONFIG.ROUGHNESS_MIN) / 
                              (DENDRITE_CONFIG.ROUGHNESS_MAX - DENDRITE_CONFIG.ROUGHNESS_MIN);
        const amplitude = roughnessNorm * 25;
        const interfaceY = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
        
        for (let i = 0; i < this.interfacePoints.length; i++) {
          const noise1 = Math.sin(i * 0.3) * amplitude * 0.5;
          const noise2 = Math.sin(i * 0.7 + 1.5) * amplitude * 0.3;
          const noise3 = Math.sin(i * 1.2 + 3.0) * amplitude * 0.2;
          this.interfacePoints[i].y = interfaceY + noise1 + noise2 + noise3;
        }
      }
    } else {
      this.animatedPressure = this.pressure;
      this.animatedRoughness = this.roughness;
    }
  }
  
  /**
   * Update physics annotations
   */
  updateAnnotations() {
    const pressureNorm = (this.animatedPressure - DENDRITE_CONFIG.PRESSURE_MIN) / 
                         (DENDRITE_CONFIG.PRESSURE_MAX - DENDRITE_CONFIG.PRESSURE_MIN);
    
    // Determine which annotations should be visible
    const showVoid = this.voidFraction > 0.05;
    const showDendrite = this.dendritePenetration > 0.1;
    const showFlow = pressureNorm > 0.6;
    
    // Create or update void annotation
    this.updateSingleAnnotation(
      'void',
      showVoid,
      this.width * 0.25,
      this.height * 0.28,
      'deeptech.simulation.annotationVoid',
      "Persson's Contact Theory: Void Formation",
      'warning'
    );
    
    // Create or update dendrite annotation
    this.updateSingleAnnotation(
      'dendrite',
      showDendrite,
      this.width * 0.55,
      this.height * 0.50,
      'deeptech.simulation.annotationDendrite',
      'Lightning Rod Effect: Current Focusing',
      'danger'
    );
    
    // Create or update flow annotation
    this.updateSingleAnnotation(
      'flow',
      showFlow,
      this.width * 0.75,
      this.height * 0.28,
      'deeptech.simulation.annotationFlow',
      'J2-Viscoplasticity: Li Creep Active',
      'success'
    );
  }

  updateSingleAnnotation(id, shouldShow, x, y, i18nKey, defaultText, type) {
    let annotation = this.annotationsContainer.querySelector(`[data-annotation-id="${id}"]`);
    
    if (shouldShow) {
      if (!annotation) {
        // Create new annotation
        annotation = document.createElement('div');
        annotation.setAttribute('data-annotation-id', id);
        annotation.className = `annotation annotation-${type}`;
        
        const colors = {
          warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
          danger: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
          success: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
          info: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }
        };
        
        const color = colors[type] || colors.info;
        
        annotation.style.cssText = `
          position: absolute;
          transform: translate(-50%, -50%);
          background: ${color.bg};
          border: 1px solid ${color.border};
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 10px;
          font-weight: 500;
          color: ${color.text};
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          pointer-events: none;
          transition: opacity 0.3s ease, left 0.2s ease, top 0.2s ease;
          opacity: 0;
        `;
        
        annotation.setAttribute('data-i18n', i18nKey);
        annotation.textContent = window.i18n?.t(i18nKey) || defaultText;
        
        this.annotationsContainer.appendChild(annotation);
        
        // Force reflow then fade in
        annotation.offsetHeight;
      }
      
      // Update position and show
      annotation.style.left = `${x}px`;
      annotation.style.top = `${y}px`;
      annotation.style.opacity = '1';
      
    } else if (annotation) {
      // Hide annotation
      annotation.style.opacity = '0';
    }
  }
  
  /**
   * Update metrics display
   */
  updateMetricsDisplay() {
    // Update penetration
    if (this.penetrationDisplay) {
      const penetrationPercent = Math.round(this.dendritePenetration * 100);
      this.penetrationDisplay.textContent = `${penetrationPercent}%`;
      
      // Color based on penetration
      if (penetrationPercent > 60) {
        this.penetrationDisplay.style.color = DENDRITE_CONFIG.COLOR_RISK_DANGER;
      } else if (penetrationPercent > 30) {
        this.penetrationDisplay.style.color = DENDRITE_CONFIG.COLOR_RISK_WARNING;
      } else {
        this.penetrationDisplay.style.color = DENDRITE_CONFIG.COLOR_TEXT;
      }
    }
    
    // Update risk gauge
    if (this.riskGauge && this.riskLabel) {
      this.riskGauge.style.width = `${this.riskLevel}%`;
      
      if (this.riskLevel > 60) {
        this.riskGauge.style.background = DENDRITE_CONFIG.COLOR_RISK_DANGER;
        this.riskLabel.style.color = DENDRITE_CONFIG.COLOR_RISK_DANGER;
        this.riskLabel.textContent = window.i18n?.t('deeptech.simulation.riskHigh') || 'High Risk';
      } else if (this.riskLevel > 30) {
        this.riskGauge.style.background = DENDRITE_CONFIG.COLOR_RISK_WARNING;
        this.riskLabel.style.color = DENDRITE_CONFIG.COLOR_RISK_WARNING;
        this.riskLabel.textContent = window.i18n?.t('deeptech.simulation.riskMedium') || 'Medium Risk';
      } else {
        this.riskGauge.style.background = DENDRITE_CONFIG.COLOR_RISK_SAFE;
        this.riskLabel.style.color = DENDRITE_CONFIG.COLOR_RISK_SAFE;
        this.riskLabel.textContent = window.i18n?.t('deeptech.simulation.riskLow') || 'Low Risk';
      }
    }
  }
  
  /**
   * Main render function
   */
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw background
    ctx.fillStyle = DENDRITE_CONFIG.COLOR_BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw layers
    this.drawElectrolyteLayer(ctx);
    this.drawAnodeLayer(ctx);
    this.drawInterface(ctx);
    this.drawVoids(ctx);
    this.drawCurrentDensityHeatmap(ctx);
    this.drawDendrite(ctx);
    this.drawLabels(ctx);
  }
  
  /**
   * Draw the ceramic electrolyte layer (LLZO)
   */
  drawElectrolyteLayer(ctx) {
    const interfaceY = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
    const electrolyteHeight = this.height * DENDRITE_CONFIG.ELECTROLYTE_HEIGHT_RATIO;
    
    // Main electrolyte fill
    ctx.fillStyle = DENDRITE_CONFIG.COLOR_ELECTROLYTE;
    ctx.fillRect(0, interfaceY, this.width, electrolyteHeight);
    
    // Geometric pattern overlay (crystal structure hint)
    ctx.strokeStyle = DENDRITE_CONFIG.COLOR_ELECTROLYTE_PATTERN;
    ctx.lineWidth = 1;
    
    const gridSize = 20;
    for (let x = 0; x < this.width; x += gridSize) {
      for (let y = interfaceY; y < interfaceY + electrolyteHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + gridSize, y + gridSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + gridSize, y);
        ctx.lineTo(x, y + gridSize);
        ctx.stroke();
      }
    }
  }
  
  /**
   * Draw the lithium anode layer
   */
  drawAnodeLayer(ctx) {
    const anodeHeight = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
    
    // Gradient for metallic look
    const gradient = ctx.createLinearGradient(0, 0, 0, anodeHeight);
    gradient.addColorStop(0, DENDRITE_CONFIG.COLOR_ANODE_TOP);
    gradient.addColorStop(1, DENDRITE_CONFIG.COLOR_ANODE_BOTTOM);
    
    // Draw anode with deformed bottom edge
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.width, 0);
    ctx.lineTo(this.width, anodeHeight);
    
    // Follow lithium bottom edge
    for (let i = this.lithiumBottom.length - 1; i >= 0; i--) {
      ctx.lineTo(this.lithiumBottom[i].x, this.lithiumBottom[i].y);
    }
    
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  
  /**
   * Draw the interface line
   */
  drawInterface(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.interfacePoints[0].x, this.interfacePoints[0].y);
    
    for (let i = 1; i < this.interfacePoints.length; i++) {
      ctx.lineTo(this.interfacePoints[i].x, this.interfacePoints[i].y);
    }
    
    ctx.strokeStyle = DENDRITE_CONFIG.COLOR_INTERFACE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  /**
   * Draw void regions
   */
  drawVoids(ctx) {
    if (this.voidFraction < 0.05) return;
    
    const interfaceY = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
    
    ctx.fillStyle = DENDRITE_CONFIG.COLOR_VOID;
    
    // Draw voids at gaps between lithium and interface
    for (let i = 0; i < this.interfacePoints.length - 1; i++) {
      const ip1 = this.interfacePoints[i];
      const ip2 = this.interfacePoints[i + 1];
      const lb1 = this.lithiumBottom[i];
      const lb2 = this.lithiumBottom[i + 1];
      
      // Only draw void if there's a gap
      if (lb1.y < ip1.y || lb2.y < ip2.y) {
        ctx.beginPath();
        ctx.moveTo(lb1.x, lb1.y);
        ctx.lineTo(lb2.x, lb2.y);
        ctx.lineTo(ip2.x, ip2.y);
        ctx.lineTo(ip1.x, ip1.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  
  /**
   * Draw current density heatmap at interface
   */
  drawCurrentDensityHeatmap(ctx) {
    const heatmapHeight = 15;
    
    for (let i = 0; i < this.interfacePoints.length - 1; i++) {
      const point = this.interfacePoints[i];
      const nextPoint = this.interfacePoints[i + 1];
      const density = this.currentDensityMap[i] || 0;
      
      // Skip low density areas
      if (density < 0.35) continue;
      
      // Interpolate color based on density
      let color;
      if (density > 0.8) {
        color = DENDRITE_CONFIG.COLOR_HEAT_CRITICAL;
      } else if (density > 0.6) {
        color = DENDRITE_CONFIG.COLOR_HEAT_HIGH;
      } else if (density > 0.45) {
        color = DENDRITE_CONFIG.COLOR_HEAT_MED;
      } else {
        color = DENDRITE_CONFIG.COLOR_HEAT_LOW;
      }
      
      // Draw gradient glow at high-density points
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, heatmapHeight * density
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(point.x, point.y, heatmapHeight * density, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = density * 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  
  /**
   * Draw the dendrite (sharp needle)
   */
  drawDendrite(ctx) {
    if (this.dendritePenetration < 0.05) return;
    
    const interfaceY = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
    const electrolyteHeight = this.height * DENDRITE_CONFIG.ELECTROLYTE_HEIGHT_RATIO;
    const maxPenetration = electrolyteHeight * 0.85;
    
    // Find the point with highest current density (where dendrite nucleates)
    let maxDensityIndex = 0;
    let maxDensity = 0;
    for (let i = 0; i < this.currentDensityMap.length; i++) {
      if (this.currentDensityMap[i] > maxDensity) {
        maxDensity = this.currentDensityMap[i];
        maxDensityIndex = i;
      }
    }
    
    // Fallback to center if no clear hotspot
    if (maxDensity < 0.4) {
      maxDensityIndex = Math.floor(this.interfacePoints.length / 2);
    }
    
    const nucleationPoint = this.interfacePoints[maxDensityIndex];
    const dendriteX = nucleationPoint.x;
    const dendriteStartY = nucleationPoint.y;
    const dendriteEndY = dendriteStartY + (maxPenetration * this.dendritePenetration);
    
    // Draw sharp needle dendrite
    const baseWidth = 8 + this.dendritePenetration * 4;
    
    // Dendrite body gradient
    const gradient = ctx.createLinearGradient(dendriteX, dendriteStartY, dendriteX, dendriteEndY);
    gradient.addColorStop(0, DENDRITE_CONFIG.COLOR_DENDRITE);
    gradient.addColorStop(0.8, DENDRITE_CONFIG.COLOR_DENDRITE);
    gradient.addColorStop(1, DENDRITE_CONFIG.COLOR_DENDRITE_TIP);
    
    ctx.beginPath();
    ctx.moveTo(dendriteX - baseWidth / 2, dendriteStartY);
    ctx.lineTo(dendriteX + baseWidth / 2, dendriteStartY);
    ctx.lineTo(dendriteX + 1, dendriteEndY); // Sharp tip
    ctx.lineTo(dendriteX - 1, dendriteEndY);
    ctx.closePath();
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Bright tip glow
    const tipGlow = ctx.createRadialGradient(
      dendriteX, dendriteEndY, 0,
      dendriteX, dendriteEndY, 10
    );
    tipGlow.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    tipGlow.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(dendriteX, dendriteEndY, 10, 0, Math.PI * 2);
    ctx.fillStyle = tipGlow;
    ctx.fill();
    
    // Edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dendriteX - baseWidth / 2 + 1, dendriteStartY);
    ctx.lineTo(dendriteX, dendriteEndY);
    ctx.stroke();
  }
  
  /**
   * Draw layer labels
   */
  drawLabels(ctx) {
    const anodeHeight = this.height * DENDRITE_CONFIG.ANODE_HEIGHT_RATIO;
    const interfaceY = anodeHeight;
    const electrolyteHeight = this.height * DENDRITE_CONFIG.ELECTROLYTE_HEIGHT_RATIO;
    
    ctx.font = '12px "SF Mono", "Fira Code", "Consolas", monospace';
    ctx.textAlign = 'left';
    
    // Anode label
    ctx.fillStyle = DENDRITE_CONFIG.COLOR_TEXT;
    ctx.fillText(window.i18n?.t('deeptech.simulation.labelAnode') || 'Li Metal Anode', 16, anodeHeight / 2);
    
    // Electrolyte label
    ctx.fillStyle = '#0369A1';
    ctx.fillText(window.i18n?.t('deeptech.simulation.labelElectrolyte') || 'LLZO Ceramic Electrolyte', 16, interfaceY + electrolyteHeight / 2);
    
    // Coordinate system indicator
    ctx.fillStyle = DENDRITE_CONFIG.COLOR_TEXT_SECONDARY;
    ctx.font = '10px "SF Mono", "Fira Code", "Consolas", monospace';
    ctx.fillText('r →', this.width - 50, this.height - 20);
    ctx.fillText('z ↓', this.width - 30, this.height - 35);
  }
  
  /**
   * Update translations
   */
  updateTranslations() {
    // Update all i18n elements
    const elements = this.wrapper.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (window.i18n && window.i18n.t) {
        const translation = window.i18n.t(key);
        if (translation && translation !== key) {
          el.textContent = translation;
        }
      }
    });
  }
  
  /**
   * Destroy the visualization
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
  }
}

// Add CSS for annotation animation
const style = document.createElement('style');
style.textContent = `
  @keyframes annotationFadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
  
  .dendrite-simulation-wrapper {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  
  @media (min-width: 768px) {
    .dendrite-layout {
      flex-direction: row !important;
    }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
function initDendriteSimulation() {
  const container = document.getElementById('dendrite-simulation-container');
  if (!container) return;
  window.dendriteSimulation = new DendriteSimulation(container);
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDendriteSimulation);
} else {
  initDendriteSimulation();
}

// Export for module usage
export { DendriteSimulation, initDendriteSimulation };