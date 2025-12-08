/* =========================
FRAUD GRAPH NEURAL NETWORK VISUALIZATION
Vanilla JS + Canvas implementation
Visualizes fraud detection through graph neural networks
=========================== */

// Configuration constants
const CONFIG = {
  // Node counts
  TOTAL_NODES: 500,
  HIGH_RISK_RATIO: 0.05,
  MULE_CLUSTERS: 3,
  NODES_PER_CLUSTER_MIN: 8,
  NODES_PER_CLUSTER_MAX: 14,

  // Visual
  NODE_RADIUS: 3,
  NODE_RADIUS_HUB: 5,
  EDGE_WIDTH: 0.5,
  EDGE_WIDTH_HIGHLIGHT: 1.5,

  // Colors
  COLOR_NODE_LOW_RISK: 'rgba(255, 255, 255, 0.85)',
  COLOR_NODE_HIGH_RISK: '#ff3b5c',
  COLOR_NODE_HIGH_RISK_GLOW: 'rgba(255, 59, 92, 0.6)',
  COLOR_EDGE_NORMAL: 'rgba(255, 255, 255, 0.12)',
  COLOR_EDGE_HIGH_RISK: 'rgba(255, 59, 92, 0.75)',
  COLOR_BACKGROUND: '#0a0a0f',
  COLOR_METADATA_BG: 'rgba(0, 0, 0, 0.9)',
  COLOR_METADATA_BORDER: 'rgba(255, 255, 255, 0.1)',
  COLOR_METADATA_TEXT: '#ffffff',
  COLOR_METADATA_LABEL: 'rgba(255, 255, 255, 0.5)',

  // Animation
  ZOOM_LEVEL: 2,
  ZOOM_DURATION: 800,
  IDLE_SPEED: 0.35,
  PULSE_SPEED: 0.002,

  // Edge flash animation (simulating transactions)
  EDGE_FLASH_PROBABILITY: 0.0001, // Chance per frame for an edge to start flashing
  EDGE_FLASH_DURATION: 400, // Duration of flash in ms
  COLOR_EDGE_FLASH: 'rgba(255, 255, 255, 0.9)',
  COLOR_EDGE_FLASH_HIGH_RISK: 'rgba(255, 120, 140, 0.95)',

  // Interaction
  HOVER_RADIUS: 15,

  // ATO Threshold
  ATO_THRESHOLD: 0.12,
};

// Utility functions
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const distance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
const randomRange = (min, max) => Math.random() * (max - min) + min;
const generateAccountId = () => `ACC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

/**
 * FraudGraphNetwork Class
 * Main class for the fraud detection visualization
 */
class FraudGraphNetwork {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;

    // Network data
    this.nodes = [];
    this.edges = [];
    this.muleClusters = [];

    // Interaction state
    this.hoveredNode = null;
    this.hoveredEdge = null;
    this.selectedNode = null; // For mobile tap-to-zoom

    // Transform state (zoom only, no pan)
    this.transform = {
      x: 0,
      y: 0,
      scale: 1,
      targetScale: 1,
      targetX: 0,
      targetY: 0,
      zoomProgress: 0,
      isZooming: false,
      focusedCluster: null,
    };

    // Touch state
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Animation
    this.time = 0;
    this.animationId = null;
    this.lastFrameTime = 0;

    this.init();
  }

  /**
   * Initialize the visualization
   */
  init() {
    this.createCanvas();
    this.setupEventListeners();
    this.handleResize();
    this.generateNetworkData();
    this.startAnimation();

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('languageChanged', () => this.updateLegendText());
    setTimeout(() => this.updateLegendText(), 100);
  }

  /**
   * Create canvas element and add to container
   */
  createCanvas() {
    // Create wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'fraud-graph-wrapper';
    this.wrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 500px;
      background: ${CONFIG.COLOR_BACKGROUND};
      border-radius: 16px;
      overflow: hidden;
      touch-action: none;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    `;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      cursor: default;
    `;

    // Create instructions overlay
    this.instructions = document.createElement('div');
    this.instructions.className = 'fraud-graph-instructions';
    this.instructions.style.cssText = `
      position: absolute;
      bottom: 16px;
      left: 16px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      pointer-events: none;
      user-select: none;
    `;

    // Create legend
    this.legend = document.createElement('div');
    this.legend.className = 'fraud-graph-legend';
    this.legend.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      pointer-events: none;
      user-select: none;
    `;
    this.legend.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ff3b5c; box-shadow: 0 0 8px rgba(255,59,92,0.6);"></div>
        <span style="color: rgba(255,255,255,0.5);">${window.i18n?.t('banking.graph.legend') || 'High Risk. Tap to explore'}</span>
      </div>
    `;

    // Assemble
    this.wrapper.appendChild(this.canvas);
    this.wrapper.appendChild(this.instructions);
    this.wrapper.appendChild(this.legend);
    this.container.appendChild(this.wrapper);

    this.ctx = this.canvas.getContext('2d');
  }

  /**
  * Update legend text with current translation
  */
  updateLegendText() {
    const legendSpan = this.legend.querySelector('span');
    if (legendSpan) {
      legendSpan.textContent = window.i18n?.t('banking.graph.legend') || 'High Risk. Tap to explore';
    }
  }

  /**
   * Handle container resize
   */
  handleResize() {
    const rect = this.wrapper.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    // Set canvas size with device pixel ratio
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    // Regenerate network if dimensions changed significantly
    if (this.nodes.length > 0) {
      this.generateNetworkData();
    }

    // Reset transform to center
    this.resetTransform();
  }

  /**
   * Reset transform to centered view
   */
  resetTransform() {
    this.transform.x = 0;
    this.transform.y = 0;
    this.transform.scale = 1;
    this.transform.targetX = 0;
    this.transform.targetY = 0;
    this.transform.targetScale = 1;
  }

  /**
   * Generate the network topology
   */
  generateNetworkData() {
    this.nodes = [];
    this.edges = [];
    this.muleClusters = [];

    // Reduce padding on mobile for fuller coverage
    const padding = this.isMobile ? 20 : 40;
    const topPadding = this.isMobile ? 80 : padding;
    const effectiveWidth = this.width - padding * 2;
    const effectiveHeight = this.height - padding - topPadding;

    // Create mule clusters (complex web structure)
    const clusterPositions = [
      { x: this.width * 0.2, y: this.height * 0.35 },
      { x: this.width * 0.8, y: this.height * 0.35 },
      { x: this.width * 0.35, y: this.height * 0.7 },
    ];

    for (let c = 0; c < CONFIG.MULE_CLUSTERS; c++) {
      const clusterNodeCount = Math.floor(
        randomRange(CONFIG.NODES_PER_CLUSTER_MIN, CONFIG.NODES_PER_CLUSTER_MAX + 1)
      );
      const clusterCenter = clusterPositions[c];
      const clusterNodes = [];

      // Create all nodes in the cluster with complex web positions
      for (let i = 0; i < clusterNodeCount; i++) {
        // Distribute nodes in a roughly circular pattern with randomness
        const angle = (i / clusterNodeCount) * Math.PI * 2 + randomRange(-0.5, 0.5);
        const dist = randomRange(30, 130);
        
        const node = {
          id: this.nodes.length,
          x: clusterCenter.x + Math.cos(angle) * dist + randomRange(-35, 35),
          y: clusterCenter.y + Math.sin(angle) * dist + randomRange(-35, 35),
          baseX: clusterCenter.x + Math.cos(angle) * dist,
          baseY: clusterCenter.y + Math.sin(angle) * dist,
          vx: randomRange(-0.2, 0.2),
          vy: randomRange(-0.2, 0.2),
          radius: i === 0 ? CONFIG.NODE_RADIUS_HUB : CONFIG.NODE_RADIUS, // First node slightly larger
          riskScore: randomRange(0.78, 0.99),
          accountId: generateAccountId(),
          isHighRisk: true,
          isHub: i === 0,
          clusterId: c,
          pulseOffset: Math.random() * Math.PI * 2,
        };
        
        // Ensure baseX/baseY are set correctly
        node.baseX = node.x;
        node.baseY = node.y;
        
        this.nodes.push(node);
        clusterNodes.push(node);
      }

      // Create complex web connections within the cluster
      // Each node connects to multiple other nodes (not just to a hub)
      for (let i = 0; i < clusterNodes.length; i++) {
        const node = clusterNodes[i];
        // Connect to 2-4 random other nodes in the cluster
        const connectionCount = Math.floor(randomRange(2, 5));
        const availableTargets = clusterNodes.filter((n, idx) => idx !== i);
        
        // Shuffle and pick connections
        const shuffled = availableTargets.sort(() => Math.random() - 0.5);
        const targets = shuffled.slice(0, Math.min(connectionCount, shuffled.length));
        
        for (const target of targets) {
          // Check if edge already exists
          const edgeExists = this.edges.some(
            (e) =>
              (e.source === node.id && e.target === target.id) ||
              (e.source === target.id && e.target === node.id)
          );

          if (!edgeExists) {
            this.edges.push({
              source: node.id,
              target: target.id,
              isHighRisk: true,
              atoRisk: randomRange(0.05, 0.18),
              clusterId: c,
              flashProgress: 0, // For flash animation
              isFlashing: false,
            });
          }
        }
      }

      // Add some cross-connections between nearby nodes for more web complexity
      for (let i = 0; i < clusterNodes.length; i++) {
        for (let j = i + 2; j < clusterNodes.length; j++) {
          if (Math.random() < 0.8) {
            const edgeExists = this.edges.some(
              (e) =>
                (e.source === clusterNodes[i].id && e.target === clusterNodes[j].id) ||
                (e.source === clusterNodes[j].id && e.target === clusterNodes[i].id)
            );
            if (!edgeExists) {
              this.edges.push({
                source: clusterNodes[i].id,
                target: clusterNodes[j].id,
                isHighRisk: true,
                atoRisk: randomRange(0.06, 0.16),
                clusterId: c,
                flashProgress: 0,
                isFlashing: false,
              });
            }
          }
        }
      }

      // Add innocent nodes within the cluster area (to demonstrate false positive reduction)
      // These are LOW-RISK nodes that happen to be near the mule network
      const innocentCount = Math.floor(randomRange(3, 6));
      for (let inn = 0; inn < innocentCount; inn++) {
        const innocentAngle = Math.random() * Math.PI * 2;
        const innocentDist = randomRange(40, 120); // Start further out
        
        let innX = clusterCenter.x + Math.cos(innocentAngle) * innocentDist + randomRange(-25, 25);
        let innY = clusterCenter.y + Math.sin(innocentAngle) * innocentDist + randomRange(-25, 25);
        
        // Check if too close to any high-risk node (especially hubs)
        const tooCloseToHighRisk = clusterNodes.some(hrNode => {
          const minDist = hrNode.isHub ? 35 : 20; // Larger buffer for hub nodes
          return distance(innX, innY, hrNode.x, hrNode.y) < minDist;
        });
        
        // Skip this innocent node if it overlaps with high-risk nodes
        if (tooCloseToHighRisk) {
          continue;
        }
        
        const innocentNode = {
          id: this.nodes.length,
          x: innX,
          y: innY,
          baseX: innX,
          baseY: innY,
          vx: randomRange(-0.15, 0.15),
          vy: randomRange(-0.15, 0.15),
          radius: CONFIG.NODE_RADIUS,
          riskScore: randomRange(0.05, 0.25), // Low risk score
          accountId: null,
          isHighRisk: false, // NOT part of the mule network
          isHub: false,
          clusterId: null, // No cluster - innocent
          pulseOffset: Math.random() * Math.PI * 2,
          isInnocentNearCluster: true, // Flag for identification
        };
        
        this.nodes.push(innocentNode);
        
        // Connect innocent node to 1-2 nearby low-risk nodes OR other innocents
        // (they have legitimate connections, just happen to be near fraud)
      }

      // Add distant "satellite" nodes - these represent hidden connections
      // that GNNs can detect but traditional systems would miss
      const satelliteCount = Math.floor(randomRange(2, 4));
      for (let s = 0; s < satelliteCount; s++) {
        // Position satellites far from cluster center but within safe bounds
        const satelliteAngle = Math.random() * Math.PI * 2;
        
        // Calculate max safe distance based on cluster position and canvas edges
        const maxDistToLeft = clusterCenter.x - padding - 30;
        const maxDistToRight = this.width - padding - 30 - clusterCenter.x;
        const maxDistToTop = clusterCenter.y - padding - 30;
        const maxDistToBottom = this.height - padding - 30 - clusterCenter.y;
        
        // Limit satellite distance based on direction
        const dirX = Math.cos(satelliteAngle);
        const dirY = Math.sin(satelliteAngle);
        
        let maxSafeDist = 250;
        if (dirX < 0) maxSafeDist = Math.min(maxSafeDist, maxDistToLeft / Math.abs(dirX));
        if (dirX > 0) maxSafeDist = Math.min(maxSafeDist, maxDistToRight / dirX);
        if (dirY < 0) maxSafeDist = Math.min(maxSafeDist, maxDistToTop / Math.abs(dirY));
        if (dirY > 0) maxSafeDist = Math.min(maxSafeDist, maxDistToBottom / dirY);
        
        // Ensure minimum distance but cap at safe maximum
        const satelliteDist = randomRange(80, Math.max(100, Math.min(maxSafeDist, 200)));
        
        let satX = clusterCenter.x + dirX * satelliteDist;
        let satY = clusterCenter.y + dirY * satelliteDist;
        
        // Final safety clamp with generous margins
        satX = Math.max(padding + 40, Math.min(this.width - padding - 40, satX));
        satY = Math.max(padding + 40, Math.min(this.height - padding - 40, satY));
        
        const satelliteNode = {
          id: this.nodes.length,
          x: satX,
          y: satY,
          baseX: satX,
          baseY: satY,
          vx: randomRange(-0.15, 0.15),
          vy: randomRange(-0.15, 0.15),
          radius: CONFIG.NODE_RADIUS,
          riskScore: randomRange(0.72, 0.94),
          accountId: generateAccountId(),
          isHighRisk: true,
          isHub: false,
          clusterId: c,
          pulseOffset: Math.random() * Math.PI * 2,
          isSatellite: true, // Flag for distant node
        };
        
        this.nodes.push(satelliteNode);
        clusterNodes.push(satelliteNode);
        
        // Connect satellite to 1-3 nodes in the main cluster
        const connectionsToMain = Math.floor(randomRange(1, 4));
        const mainClusterNodes = clusterNodes.filter(n => !n.isSatellite);
        const shuffledMain = mainClusterNodes.sort(() => Math.random() - 0.5);
        
        for (let m = 0; m < Math.min(connectionsToMain, shuffledMain.length); m++) {
          this.edges.push({
            source: satelliteNode.id,
            target: shuffledMain[m].id,
            isHighRisk: true,
            atoRisk: randomRange(0.04, 0.14),
            clusterId: c,
            flashProgress: 0,
            isFlashing: false,
          });
        }
      }

      this.muleClusters.push(clusterNodes);
    }

    // Calculate how many low-risk nodes we need
    const highRiskCount = this.nodes.length;
    const lowRiskCount = CONFIG.TOTAL_NODES - highRiskCount;

    // Create low-risk nodes with even distribution
    const gridCols = Math.ceil(Math.sqrt(lowRiskCount * (effectiveWidth / effectiveHeight)));
    const gridRows = Math.ceil(lowRiskCount / gridCols);
    const cellWidth = effectiveWidth / gridCols;
    const cellHeight = effectiveHeight / gridRows;

    let createdLowRisk = 0;
    for (let i = 0; i < lowRiskCount * 1.3 && createdLowRisk < lowRiskCount; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const baseX = padding + col * cellWidth + cellWidth / 2;
      const baseY = padding + row * cellHeight + cellHeight / 2;

      // Add jitter to avoid grid look
      const jitterX = randomRange(-cellWidth * 0.4, cellWidth * 0.4);
      const jitterY = randomRange(-cellHeight * 0.4, cellHeight * 0.4);

      const nodeX = baseX + jitterX;
      const nodeY = baseY + jitterY;

      // Skip if too close to a cluster center
      const tooCloseToCluster = clusterPositions.some(
        (cp) => distance(nodeX, nodeY, cp.x, cp.y) < 35
      );

      if (tooCloseToCluster) continue;

      // Skip if outside bounds
      if (nodeX < padding || nodeX > this.width - padding || 
          nodeY < padding || nodeY > this.height - padding) continue;

      const lowRiskNode = {
        id: this.nodes.length,
        x: nodeX,
        y: nodeY,
        baseX: nodeX,
        baseY: nodeY,
        vx: randomRange(-0.15, 0.15),
        vy: randomRange(-0.15, 0.15),
        radius: CONFIG.NODE_RADIUS,
        riskScore: randomRange(0.02, 0.35),
        accountId: null,
        isHighRisk: false,
        isHub: false,
        clusterId: null,
        pulseOffset: Math.random() * Math.PI * 2,
      };
      this.nodes.push(lowRiskNode);
      createdLowRisk++;
    }

    // Create many more edges between low-risk nodes for density
    const lowRiskNodes = this.nodes.filter((n) => !n.isHighRisk);
    for (let i = 0; i < lowRiskNodes.length; i++) {
      const node = lowRiskNodes[i];
      // More connections per node for denser network
      const connectionCount = Math.floor(randomRange(2, 6));

      const nearbyNodes = lowRiskNodes.filter(
        (n) => n.id !== node.id && distance(node.x, node.y, n.x, n.y) < 120
      );

      // Sort by distance and take closest ones
      nearbyNodes.sort((a, b) => 
        distance(node.x, node.y, a.x, a.y) - distance(node.x, node.y, b.x, b.y)
      );

      const targets = nearbyNodes.slice(0, connectionCount);

      for (const target of targets) {
        const edgeExists = this.edges.some(
          (e) =>
            (e.source === node.id && e.target === target.id) ||
            (e.source === target.id && e.target === node.id)
        );

        if (!edgeExists) {
          this.edges.push({
            source: node.id,
            target: target.id,
            isHighRisk: false,
            atoRisk: null,
            clusterId: null,
            flashProgress: 0,
            isFlashing: false,
          });
        }
      }
    }

    // Add some random long-range connections for small-world effect
    for (let i = 0; i < lowRiskNodes.length * 0.12; i++) {
      const nodeA = lowRiskNodes[Math.floor(Math.random() * lowRiskNodes.length)];
      const nodeB = lowRiskNodes[Math.floor(Math.random() * lowRiskNodes.length)];
      
      if (nodeA && nodeB && nodeA.id !== nodeB.id) {
        const edgeExists = this.edges.some(
          (e) =>
            (e.source === nodeA.id && e.target === nodeB.id) ||
            (e.source === nodeB.id && e.target === nodeA.id)
        );

        if (!edgeExists) {
          this.edges.push({
            source: nodeA.id,
            target: nodeB.id,
            isHighRisk: false,
            atoRisk: null,
            clusterId: null,
            flashProgress: 0,
            isFlashing: false,
          });
        }
      }
    }

    // Add some connections between low-risk and high-risk nodes (false connections)
    const highRiskNodes = this.nodes.filter((n) => n.isHighRisk);
    for (let i = 0; i < 25; i++) {
      const lowRisk = lowRiskNodes[Math.floor(Math.random() * lowRiskNodes.length)];
      const highRisk = highRiskNodes[Math.floor(Math.random() * highRiskNodes.length)];

      if (lowRisk && highRisk && distance(lowRisk.x, lowRisk.y, highRisk.x, highRisk.y) < 150) {
        this.edges.push({
          source: lowRisk.id,
          target: highRisk.id,
          isHighRisk: false,
          atoRisk: null,
          clusterId: null,
          flashProgress: 0,
          isFlashing: false,
        });
      }
    }

    // Add extra-long-range connections within each mule network
    // These represent deeply hidden relationships that only GNNs can find
    for (const clusterNodes of this.muleClusters) {
      if (clusterNodes.length >= 2) {
        // Find the two nodes furthest apart in this cluster
        let maxDist = 0;
        let nodeA = null;
        let nodeB = null;
        
        for (let i = 0; i < clusterNodes.length; i++) {
          for (let j = i + 1; j < clusterNodes.length; j++) {
            const d = distance(clusterNodes[i].x, clusterNodes[i].y, 
                              clusterNodes[j].x, clusterNodes[j].y);
            if (d > maxDist) {
              maxDist = d;
              nodeA = clusterNodes[i];
              nodeB = clusterNodes[j];
            }
          }
        }
        
        // Ensure these distant nodes are connected (if not already)
        if (nodeA && nodeB) {
          const edgeExists = this.edges.some(
            (e) =>
              (e.source === nodeA.id && e.target === nodeB.id) ||
              (e.source === nodeB.id && e.target === nodeA.id)
          );
          
          if (!edgeExists) {
            this.edges.push({
              source: nodeA.id,
              target: nodeB.id,
              isHighRisk: true,
              atoRisk: randomRange(0.03, 0.11), // Lower probability - hard to detect
              clusterId: nodeA.clusterId,
              flashProgress: 0,
              isFlashing: false,
            });
          }
        }
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.isMobile) {
      // Mobile: tap to zoom, tap elsewhere to reset
      this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
      this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    } else {
      // Desktop: hover to zoom
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
      this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  screenToCanvas(screenX, screenY) {
    return {
      x: (screenX - this.transform.x) / this.transform.scale,
      y: (screenY - this.transform.y) / this.transform.scale,
    };
  }

  /**
   * Find node at position
   */
  findNodeAtPosition(x, y) {
    const canvasPos = this.screenToCanvas(x, y);
    const hoverRadius = CONFIG.HOVER_RADIUS / this.transform.scale;

    // Check nodes in reverse order (top nodes first)
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dist = distance(canvasPos.x, canvasPos.y, node.x, node.y);
      if (dist < hoverRadius) {
        return node;
      }
    }
    return null;
  }

  /**
   * Find edge at position
   */
  findEdgeAtPosition(x, y) {
    if (this.hoveredNode) return null;

    const canvasPos = this.screenToCanvas(x, y);
    const threshold = 8 / this.transform.scale;

    for (const edge of this.edges) {
      const sourceNode = this.nodes[edge.source];
      const targetNode = this.nodes[edge.target];

      // Point to line distance calculation
      const A = canvasPos.x - sourceNode.x;
      const B = canvasPos.y - sourceNode.y;
      const C = targetNode.x - sourceNode.x;
      const D = targetNode.y - sourceNode.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;
      if (param < 0) {
        xx = sourceNode.x;
        yy = sourceNode.y;
      } else if (param > 1) {
        xx = targetNode.x;
        yy = targetNode.y;
      } else {
        xx = sourceNode.x + param * C;
        yy = sourceNode.y + param * D;
      }

      const dist = distance(canvasPos.x, canvasPos.y, xx, yy);
      if (dist < threshold && edge.atoRisk !== null) {
        return edge;
      }
    }
    return null;
  }

  /**
   * Find the closest mule network cluster to a position
   */
  findClosestCluster(x, y) {
    let closestNode = null;
    let closestDist = Infinity;

    // Find the closest high-risk node (which determines the cluster)
    for (const node of this.nodes) {
      if (node.isHighRisk) {
        const dist = distance(x, y, node.x, node.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestNode = node;
        }
      }
    }

    return closestNode;
  }

  /**
   * Zoom to a high-risk cluster
   */
  zoomToCluster(node) {
    this.transform.isZooming = true;
    this.transform.zoomProgress = 0;
    this.transform.focusedCluster = node.clusterId;
    this.transform.targetScale = CONFIG.ZOOM_LEVEL;
    
    // Calculate cluster center (centroid of all nodes in the cluster)
    const clusterNodes = this.nodes.filter(n => n.clusterId === node.clusterId);
    let centerX = node.x;
    let centerY = node.y;
    
    if (clusterNodes.length > 0) {
      const sumX = clusterNodes.reduce((sum, n) => sum + n.x, 0);
      const sumY = clusterNodes.reduce((sum, n) => sum + n.y, 0);
      centerX = sumX / clusterNodes.length;
      centerY = sumY / clusterNodes.length;
    }
    
    this.transform.targetX = this.width / 2 - centerX * CONFIG.ZOOM_LEVEL;
    this.transform.targetY = this.height / 2 - centerY * CONFIG.ZOOM_LEVEL;
  }

  /**
   * Zoom out to full view
   */
  zoomOut() {
    this.transform.isZooming = true;
    this.transform.zoomProgress = 0;
    this.transform.focusedCluster = null;
    this.transform.targetScale = 1;
    this.transform.targetX = 0;
    this.transform.targetY = 0;
    this.selectedNode = null;
  }

  /**
   * Mouse move handler (desktop)
   */
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = this.findNodeAtPosition(x, y);
    const edge = node ? null : this.findEdgeAtPosition(x, y);

    this.hoveredNode = node;
    this.hoveredEdge = edge;

    // Update cursor style
    if (node && node.isHighRisk) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  /**
   * Mouse leave handler (desktop)
   */
  handleMouseLeave() {
    this.hoveredNode = null;
    this.hoveredEdge = null;
    this.canvas.style.cursor = 'default';
  }

  /**
  }* Click handler (desktop) - click to zoom in/out
  */
  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If already zoomed in, any click zooms out
    if (this.transform.focusedCluster !== null) {
      this.zoomOut();
      this.hoveredNode = null;
      this.hoveredEdge = null;
      return;
    }

    // Not zoomed: find and zoom to closest mule network
    const canvasPos = this.screenToCanvas(x, y);
    const closestCluster = this.findClosestCluster(canvasPos.x, canvasPos.y);
    
    if (closestCluster) {
      this.zoomToCluster(closestCluster);
    }
  }

  /**
   * Touch start handler (mobile)
   */
    handleTouchStart(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // If already zoomed in, any tap zooms out
      if (this.transform.focusedCluster !== null) {
        this.zoomOut();
        this.hoveredNode = null;
        this.hoveredEdge = null;
        return;
      }

      // Not zoomed: find and zoom to closest mule network
      const canvasPos = this.screenToCanvas(x, y);
      const closestCluster = this.findClosestCluster(canvasPos.x, canvasPos.y);
      
      if (closestCluster) {
        this.zoomToCluster(closestCluster);
      }
    }
  }

  /**
   * Touch end handler (mobile)
   */
  handleTouchEnd(e) {
    // Keep the hovered state if we're zoomed in
    if (this.transform.focusedCluster === null) {
      // Clear hover after a delay if not zoomed
      setTimeout(() => {
        if (this.transform.focusedCluster === null) {
          this.hoveredNode = null;
        }
      }, 2000);
    }
  }

  /**
   * Start the animation loop
   */
  startAnimation() {
    this.lastFrameTime = performance.now();
    this.animate();
  }

  /**
   * Animation loop
   */
  animate() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Update state
   */
  update(deltaTime) {
    this.time += 1;

    // Update zoom animation
    if (this.transform.isZooming) {
      this.transform.zoomProgress += deltaTime / CONFIG.ZOOM_DURATION;
      if (this.transform.zoomProgress >= 1) {
        this.transform.zoomProgress = 1;
        this.transform.isZooming = false;
      }

      const t = easeInOutCubic(this.transform.zoomProgress);
      this.transform.scale = lerp(this.transform.scale, this.transform.targetScale, t);
      this.transform.x = lerp(this.transform.x, this.transform.targetX, t);
      this.transform.y = lerp(this.transform.y, this.transform.targetY, t);
    }

    // Update node positions (idle animation)
    for (const node of this.nodes) {
      // Gentle floating
      node.x += node.vx * CONFIG.IDLE_SPEED;
      node.y += node.vy * CONFIG.IDLE_SPEED;

      // Bounce back towards base position
      const dx = node.baseX - node.x;
      const dy = node.baseY - node.y;
      node.vx += dx * 0.008;
      node.vy += dy * 0.008;

      // Add some random movement
      node.vx += (Math.random() - 0.5) * 0.05;
      node.vy += (Math.random() - 0.5) * 0.05;

      // Damping
      node.vx *= 0.98;
      node.vy *= 0.98;

      // Clamp max velocity to prevent runaway
      const maxVel = 1.5;
      node.vx = Math.max(-maxVel, Math.min(maxVel, node.vx));
      node.vy = Math.max(-maxVel, Math.min(maxVel, node.vy));
    }

    // Update edge flash animations (simulating transactions)
    for (const edge of this.edges) {
      // Initialize flash state if not present
      if (edge.flashProgress === undefined) {
        edge.flashProgress = 0;
        edge.isFlashing = false;
      }
      
      // Update ongoing flashes
      if (edge.isFlashing) {
        edge.flashProgress += deltaTime / CONFIG.EDGE_FLASH_DURATION;
        if (edge.flashProgress >= 1) {
          edge.flashProgress = 0;
          edge.isFlashing = false;
        }
      }
      
      // Randomly trigger new flashes
      if (!edge.isFlashing && Math.random() < CONFIG.EDGE_FLASH_PROBABILITY) {
        edge.isFlashing = true;
        edge.flashProgress = 0;
      }
    }
  }

  /**
   * Get node opacity based on focus state
   */
  getNodeOpacity(node) {
    if (this.transform.focusedCluster === null) return 1;
    if (node.clusterId === this.transform.focusedCluster) return 1;
    return 0.08;
  }

  /**
   * Get edge opacity based on focus state
   */
  getEdgeOpacity(edge) {
    if (this.transform.focusedCluster === null) return 1;
    if (edge.clusterId === this.transform.focusedCluster) return 1;
    return 0.03;
  }

  /**
   * Render the visualization
   */
  render() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = CONFIG.COLOR_BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply transform
    ctx.save();
    ctx.translate(this.transform.x, this.transform.y);
    ctx.scale(this.transform.scale, this.transform.scale);

    // Draw edges
    this.renderEdges(ctx);

    // Draw nodes
    this.renderNodes(ctx);

    ctx.restore();

    // Draw metadata tooltips (in screen space)
    this.renderMetadata(ctx);
  }

  /**
   * Render all edges
   */
  renderEdges(ctx) {
    for (const edge of this.edges) {
      const sourceNode = this.nodes[edge.source];
      const targetNode = this.nodes[edge.target];
      const opacity = this.getEdgeOpacity(edge);

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);

      // Calculate flash intensity (peaks in middle of animation) - reduced by half
      let flashIntensity = 0;
      if (edge.isFlashing) {
        // Sine curve for smooth flash: 0 -> 1 -> 0, then halved
        flashIntensity = Math.sin(edge.flashProgress * Math.PI) * 0.5;
      }

      const isZoomedOnThisCluster = this.transform.focusedCluster === edge.clusterId;

      if (flashIntensity > 0) {
        // Flashing state
        if (edge.isHighRisk) {
          // High-risk edge flashes red
          ctx.strokeStyle = CONFIG.COLOR_EDGE_FLASH_HIGH_RISK;
          ctx.lineWidth = CONFIG.EDGE_WIDTH + flashIntensity * 0.75;
          ctx.shadowColor = CONFIG.COLOR_NODE_HIGH_RISK_GLOW;
          ctx.shadowBlur = isZoomedOnThisCluster ? (2 + flashIntensity * 3) : (flashIntensity * 4);
          ctx.globalAlpha = isZoomedOnThisCluster ? opacity * 0.6 : opacity * 0.5;
        } else {
          // Normal edge flashes white
          ctx.strokeStyle = CONFIG.COLOR_EDGE_FLASH;
          ctx.lineWidth = CONFIG.EDGE_WIDTH + flashIntensity * 0.6;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx.shadowBlur = flashIntensity * 4;
          ctx.globalAlpha = opacity * (0.5 + flashIntensity * 0.25);
        }
      } else {
        // Not flashing - all edges look the same (white/normal)
        ctx.strokeStyle = CONFIG.COLOR_EDGE_NORMAL;
        ctx.lineWidth = CONFIG.EDGE_WIDTH;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = opacity * 0.5; // 20% brighter (was 0.4)
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Render all nodes
   */
  renderNodes(ctx) {
    for (const node of this.nodes) {
      const opacity = this.getNodeOpacity(node);
      const pulse = Math.sin(this.time * CONFIG.PULSE_SPEED + node.pulseOffset) * 0.3 + 0.7;

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * (node.isHub ? 1.3 : 1), 0, Math.PI * 2);

      if (
        node.isHighRisk &&
        (this.transform.focusedCluster === node.clusterId || this.transform.focusedCluster === null)
      ) {
        // High-risk node with glow
        const glowIntensity = this.transform.focusedCluster === node.clusterId ? 1 : 0.5;
        ctx.fillStyle = CONFIG.COLOR_NODE_HIGH_RISK;
        ctx.shadowColor = CONFIG.COLOR_NODE_HIGH_RISK_GLOW;
        ctx.shadowBlur = 12 * pulse * glowIntensity;
        ctx.globalAlpha = opacity;
      } else {
        ctx.fillStyle = CONFIG.COLOR_NODE_LOW_RISK;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = opacity * pulse;
      }

      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Render metadata tooltips
   */
  renderMetadata(ctx) {
    if (this.hoveredNode && this.transform.scale > 1.5) {
      const screenX = this.hoveredNode.x * this.transform.scale + this.transform.x;
      const screenY = this.hoveredNode.y * this.transform.scale + this.transform.y;
      this.renderNodeMetadata(ctx, this.hoveredNode, screenX, screenY);
    }

    if (this.hoveredEdge && this.transform.scale > 1.5) {
      const sourceNode = this.nodes[this.hoveredEdge.source];
      const targetNode = this.nodes[this.hoveredEdge.target];
      const midX = ((sourceNode.x + targetNode.x) / 2) * this.transform.scale + this.transform.x;
      const midY = ((sourceNode.y + targetNode.y) / 2) * this.transform.scale + this.transform.y;
      this.renderEdgeMetadata(ctx, this.hoveredEdge, midX, midY);
    }
  }

  /**
   * Render node metadata tooltip
   */
  renderNodeMetadata(ctx, node, x, y) {
    const padding = 12;
    const lineHeight = 22;

    ctx.font = '13px "SF Mono", "Fira Code", "Consolas", monospace';

    const riskLabel = window.i18n?.t('banking.graph.riskScore') || 'Risk Score';
    const accountLabel = window.i18n?.t('banking.graph.account') || 'Account';
    const lines = node.isHighRisk
      ? [`${riskLabel}: ${node.riskScore.toFixed(2)}`, `${accountLabel}: ${node.accountId}`]
      : [`${riskLabel}: ${node.riskScore.toFixed(2)}`];

    const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2 + 10;
    const height = lines.length * lineHeight + padding * 2;

    // Position tooltip
    let tooltipX = x + 20;
    let tooltipY = y - height / 2;

    // Keep within bounds
    if (tooltipX + maxWidth > this.width) tooltipX = x - maxWidth - 20;
    if (tooltipY < 10) tooltipY = 10;
    if (tooltipY + height > this.height - 10) tooltipY = this.height - height - 10;

    // Draw background
    ctx.fillStyle = CONFIG.COLOR_METADATA_BG;
    ctx.beginPath();
    this.roundRect(ctx, tooltipX, tooltipY, maxWidth, height, 8);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = node.isHighRisk ? CONFIG.COLOR_NODE_HIGH_RISK : CONFIG.COLOR_METADATA_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw text
    ctx.textBaseline = 'middle';

    lines.forEach((line, i) => {
      const parts = line.split(': ');
      const labelWidth = ctx.measureText(parts[0] + ': ').width;

      // Label
      ctx.fillStyle = CONFIG.COLOR_METADATA_LABEL;
      ctx.fillText(
        parts[0] + ': ',
        tooltipX + padding,
        tooltipY + padding + lineHeight * i + lineHeight / 2
      );

      // Value
      ctx.fillStyle = node.isHighRisk && i === 0 ? CONFIG.COLOR_NODE_HIGH_RISK : CONFIG.COLOR_METADATA_TEXT;
      ctx.fillText(
        parts[1],
        tooltipX + padding + labelWidth,
        tooltipY + padding + lineHeight * i + lineHeight / 2
      );
    });
  }

  /**
   * Render edge metadata tooltip
   */
  renderEdgeMetadata(ctx, edge, x, y) {
    const padding = 12;
    const text = `P(Link(u,v)) = ${edge.atoRisk.toFixed(2)} < ${CONFIG.ATO_THRESHOLD}`;
    const isAboveThreshold = edge.atoRisk >= CONFIG.ATO_THRESHOLD;

    ctx.font = '12px "SF Mono", "Fira Code", "Consolas", monospace';
    const width = ctx.measureText(text).width + padding * 2;
    const height = 32;

    // Position
    let tooltipX = x - width / 2;
    let tooltipY = y - height - 15;

    if (tooltipY < 10) tooltipY = y + 15;

    // Draw background
    ctx.fillStyle = CONFIG.COLOR_METADATA_BG;
    ctx.beginPath();
    this.roundRect(ctx, tooltipX, tooltipY, width, height, 6);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isAboveThreshold ? CONFIG.COLOR_NODE_HIGH_RISK : 'rgba(100, 200, 100, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw text
    ctx.fillStyle = isAboveThreshold ? CONFIG.COLOR_NODE_HIGH_RISK : '#64c864';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, tooltipY + height / 2);
    ctx.textAlign = 'left';
  }

  /**
   * Draw rounded rectangle (polyfill for older browsers)
   */
  roundRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      // Fallback for browsers without roundRect
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
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

// Initialize when DOM is ready
function initFraudGraph() {
  const container = document.getElementById('fraud-graph-container');
  if (!container) return;
  window.fraudGraphNetwork = new FraudGraphNetwork(container);
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFraudGraph);
} else {
  initFraudGraph();
}

// Export for module usage
export { FraudGraphNetwork, initFraudGraph };