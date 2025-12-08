/* =========================================
   DIGITAL TWIN AUTOMATION LOGIC
   Handles Desktop (unchanged) + Mobile (step-by-step)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Check if mobile or desktop
        if (window.innerWidth < 768) {
            startMobileSimulationLoop();
        } else {
            startDesktopSimulationLoop();
        }
        
        // Handle resize
        let currentMode = window.innerWidth < 768 ? 'mobile' : 'desktop';
        window.addEventListener('resize', () => {
            const newMode = window.innerWidth < 768 ? 'mobile' : 'desktop';
            if (newMode !== currentMode) {
                currentMode = newMode;
                location.reload(); // Simplest way to restart correct loop
            }
        });
    }, 1500);
});

// Track current asset type
let currentAssetType = 'pump';

// =========================================
// DESKTOP SIMULATION (UNCHANGED FROM ORIGINAL)
// =========================================
async function startDesktopSimulationLoop() {
    const pumpViewer = document.getElementById('spline-viewer-pump');
    const motorViewer = document.getElementById('desktop-svg-motor');
    const assetTitle = document.getElementById('asset-title');
    const processingIndicator = document.getElementById('processing-indicator');
    const serverActivity = document.getElementById('server-activity');
    const pumpMetricsContainer = document.getElementById('pump-metrics');
    const motorMetricsContainer = document.getElementById('motor-metrics');

    let isMotor = false;
    currentAssetType = 'pump';
    
    if (assetTitle) {
        assetTitle.innerText = getTranslation('about.assetTitle.pump');
    }

    if (pumpViewer) {
        pumpViewer.style.opacity = "1";
        pumpViewer.style.visibility = "visible";
    }
    if (motorViewer) {
        motorViewer.style.opacity = "0";
        motorViewer.style.visibility = "hidden";
    }    
    
    if (pumpMetricsContainer) pumpMetricsContainer.classList.remove('hidden');
    if (motorMetricsContainer) motorMetricsContainer.classList.add('hidden');

    await wait(1000);

    while (true) {
        triggerWaveAnimation();
        await wait(1000);
        
        showProcessingIndicator(processingIndicator);
        await wait(800);
        
        triggerDataFlow();
        await wait(1200);
        
        showServerActivity(serverActivity);
        await wait(600);

        showVerticalLine();
        await wait(800);

        if (currentAssetType === 'pump') {
            showPumpMetric(1);
            drawPumpCharts();
            await wait(3500);
            showPumpMetric(2);
            drawBEPChart();
            await wait(3500);
            showPumpMetric(3);
            await wait(3500);
            showPumpMetric(4);
            drawImpellerHeatmap();
            await wait(3500);
            showPumpMetric(5);
            await wait(3500);
        } else {
            showMotorMetric(1);
            await wait(3500);
            showMotorMetric(2);
            drawRotorBarChart();
            await wait(3500);
            showMotorMetric(3);
            drawMotorEfficiencyChart();
            await wait(3500);
            showMotorMetric(4);
            await wait(3500);
            showMotorMetric(5);
            drawTorqueGauge();
            await wait(3500);
        }

        hideAllMetrics();
        stopAllAnimations();
        hideProcessingIndicator(processingIndicator);
        hideServerActivity(serverActivity);
        hideVerticalLine();
        await wait(1000);

        isMotor = !isMotor;
        currentAssetType = isMotor ? 'motor' : 'pump';

        if (assetTitle) {
            assetTitle.innerText = isMotor 
                ? getTranslation('about.assetTitle.motor') 
                : getTranslation('about.assetTitle.pump');
        }

        if (isMotor) {
            if (pumpMetricsContainer) pumpMetricsContainer.classList.add('hidden');
            if (motorMetricsContainer) motorMetricsContainer.classList.remove('hidden');
        } else {
            if (motorMetricsContainer) motorMetricsContainer.classList.add('hidden');
            if (pumpMetricsContainer) pumpMetricsContainer.classList.remove('hidden');
        }

        if (isMotor) {
            if (pumpViewer) pumpViewer.style.opacity = "0";
            await wait(600);
            if (pumpViewer) pumpViewer.style.visibility = "hidden";
            if (motorViewer) {
                motorViewer.style.visibility = "visible";
                motorViewer.style.opacity = "1";
            }
        } else {
            if (motorViewer) motorViewer.style.opacity = "0";  
            await wait(600);
            if (motorViewer) motorViewer.style.visibility = "hidden";
            if (pumpViewer) {
                pumpViewer.style.visibility = "visible";
                pumpViewer.style.opacity = "1";
            }
        }

        await wait(600);
    }
}

// =========================================
// MOBILE SIMULATION (NEW - STEP BY STEP)
// =========================================
async function startMobileSimulationLoop() {
    const mobileAssetTitle = document.getElementById('mobile-asset-title');
    const mobilePumpViewer = document.getElementById('mobile-svg-pump');
    const mobileMotorViewer = document.getElementById('mobile-svg-motor');
    const mobileStep1 = document.getElementById('mobile-step-1');
    const mobileStep2 = document.getElementById('mobile-step-2');
    const mobileStep3 = document.getElementById('mobile-step-3');
    const mobilePumpMetrics = document.getElementById('mobile-pump-metrics');
    const mobileMotorMetrics = document.getElementById('mobile-motor-metrics');

    let isMotor = false;
    currentAssetType = 'pump';
    
    // Initialize
    if (mobileAssetTitle) {
        mobileAssetTitle.innerText = getTranslation('about.assetTitle.pump');
    }

    await wait(1000);

    while (true) {
        // ========== STEP 1: Show 3D Model with Waves ==========
        showMobileStep(1);
        triggerMobileWaveAnimation();
        await wait(4000);
        stopMobileWaveAnimation();

        // ========== STEP 2: Show Jetson + Server ==========
        showMobileStep(2);
        await wait(3500);

        // ========== STEP 3: Show Metrics One by One ==========
        showMobileStep(3);
        
        if (currentAssetType === 'pump') {
            if (mobilePumpMetrics) mobilePumpMetrics.classList.remove('hidden');
            if (mobileMotorMetrics) mobileMotorMetrics.classList.add('hidden');
            
            await showMobileMetricsSequence('pump');
        } else {
            if (mobileMotorMetrics) mobileMotorMetrics.classList.remove('hidden');
            if (mobilePumpMetrics) mobilePumpMetrics.classList.add('hidden');
            
            await showMobileMetricsSequence('motor');
        }

        // Clean up before switching
        hideAllMobileMetrics();
        await wait(1000);

        // ========== SWITCH ASSET TYPE ==========
        isMotor = !isMotor;
        currentAssetType = isMotor ? 'motor' : 'pump';

        // Update title
        if (mobileAssetTitle) {
            mobileAssetTitle.innerText = isMotor 
                ? getTranslation('about.assetTitle.motor')
                : getTranslation('about.assetTitle.pump');
        }

        // Swap SVG images
        if (isMotor) {
            if (mobilePumpViewer) {
                mobilePumpViewer.classList.add('opacity-0', 'hidden');
            }
            if (mobileMotorViewer) {
                mobileMotorViewer.classList.remove('opacity-0', 'hidden');
            }
        } else {
            if (mobileMotorViewer) {
                mobileMotorViewer.classList.add('opacity-0', 'hidden');
            }
            if (mobilePumpViewer) {
                mobilePumpViewer.classList.remove('opacity-0', 'hidden');
            }
        }

        await wait(500);
    }
}

function showMobileStep(stepNumber) {
    const step1 = document.getElementById('mobile-step-1');
    const step2 = document.getElementById('mobile-step-2');
    const step3 = document.getElementById('mobile-step-3');

    // Hide all steps
    [step1, step2, step3].forEach(step => {
        if (step) step.classList.add('hidden');
    });

    // Show requested step
    const targetStep = document.getElementById(`mobile-step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.remove('hidden');
    }
}

async function showMobileMetricsSequence(type) {
    const metricCount = 5;
    const container = document.getElementById(`mobile-${type}-metrics`);
    
    if (!container) return;
    
    // Generate mobile metric cards dynamically if not present
    for (let i = 1; i <= metricCount; i++) {
        let metricEl = document.getElementById(`mobile-${type}-metric-${i}`);
        
        if (!metricEl) {
            // Clone from desktop metrics if mobile version doesn't exist
            const desktopMetric = document.getElementById(`${type}-metric-${i}`);
            if (desktopMetric) {
                metricEl = desktopMetric.cloneNode(true);
                metricEl.id = `mobile-${type}-metric-${i}`;
                metricEl.classList.remove('pump-metric', 'motor-metric');
                metricEl.classList.add(`mobile-${type}-metric`);
                // Remove the left connector dot for mobile
                const connector = metricEl.querySelector('.absolute.-left-\\[20px\\]');
                if (connector) connector.remove();
                container.appendChild(metricEl);
            }
        }
        
        // Show metric
        if (metricEl) {
            hideAllMobileMetrics();
            metricEl.classList.remove('hidden');
            metricEl.classList.add('flex', 'mobile-animate-fade-in-slide');

            // Trigger cavitation bar animation for pump metric 1
            if (type === 'pump' && i === 1) {
                const bar = metricEl.querySelector('.cavitation-bar');
                if (bar) {
                    bar.classList.remove('animate');
                    bar.style.width = '0%';
                    void bar.offsetWidth; // Force reflow
                    bar.classList.add('animate');
                }
            }
            
            // Draw charts if needed
            if (type === 'pump' && i === 2) drawMobileBEPChart();
            if (type === 'pump' && i === 4) drawMobileImpellerHeatmap();
            if (type === 'motor' && i === 2) drawMobileRotorBarChart();
            if (type === 'motor' && i === 3) drawMobileMotorEfficiencyChart();
            if (type === 'motor' && i === 5) drawMobileTorqueGauge();
            
            await wait(3000);
        }
    }
}

function hideAllMobileMetrics() {
    const allMobileMetrics = document.querySelectorAll('[id^="mobile-pump-metric-"], [id^="mobile-motor-metric-"]');
    allMobileMetrics.forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('flex', 'mobile-animate-fade-in-slide');
    });
}

function triggerMobileWaveAnimation() {
    const waves = document.querySelectorAll('.mobile-wave-arc');
    waves.forEach(w => {
        w.classList.remove('animating');
        void w.offsetWidth;
        w.classList.add('animating');
    });
}

function stopMobileWaveAnimation() {
    const waves = document.querySelectorAll('.mobile-wave-arc');
    waves.forEach(w => w.classList.remove('animating'));
}

// =========================================
// MOBILE CHART DRAWING FUNCTIONS
// =========================================
function drawMobileBEPChart() {
    const canvas = document.getElementById('mobileBepCanvas') || 
                   document.querySelector('#mobile-pump-metric-2 canvas');
    if (!canvas) return;
    drawBEPChartOnCanvas(canvas);
}

function drawMobileImpellerHeatmap() {
    const canvas = document.getElementById('mobileImpellerCanvas') ||
                   document.querySelector('#mobile-pump-metric-4 canvas');
    if (!canvas) return;
    drawImpellerHeatmapOnCanvas(canvas);
}

function drawMobileRotorBarChart() {
    const canvas = document.getElementById('mobileRotorBarCanvas') ||
                   document.querySelector('#mobile-motor-metric-2 canvas');
    if (!canvas) return;
    drawRotorBarChartOnCanvas(canvas);
}

function drawMobileMotorEfficiencyChart() {
    const canvas = document.getElementById('mobileMotorEfficiencyCanvas') ||
                   document.querySelector('#mobile-motor-metric-3 canvas');
    if (!canvas) return;
    drawMotorEfficiencyChartOnCanvas(canvas);
}

function drawMobileTorqueGauge() {
    const canvas = document.getElementById('mobileTorqueGaugeCanvas') ||
                   document.querySelector('#mobile-motor-metric-5 canvas');
    if (!canvas) return;
    drawTorqueGaugeOnCanvas(canvas);
}

// =========================================
// TRANSLATION HELPER
// =========================================
function getTranslation(key) {
    // Use the global i18n instance if available
    if (window.i18n && typeof window.i18n.t === 'function') {
        return window.i18n.t(key);
    }
    
    // Fallback to default English if i18n not ready
    const fallbacks = {
        'about.assetTitle.pump': 'Centrifugal Pump Digital Twin',
        'about.assetTitle.motor': 'Electric Motor Digital Twin'
    };
    return fallbacks[key] || key;
}

// =========================================
// HELPER FUNCTIONS (same as original)
// =========================================
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showVerticalLine() {
    const line = document.getElementById('vertical-line');
    if (line) line.style.height = 'calc(100% - 165px)';
}

function hideVerticalLine() {
    const line = document.getElementById('vertical-line');
    if (line) line.style.height = '0';
}

function showPumpMetric(id) {
    hideAllPumpMetrics();
    const el = document.getElementById(`pump-metric-${id}`);
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('flex', 'animate-fade-in-slide');
        if (id === 1) {
            const bar = el.querySelector('.cavitation-bar');
            if (bar) {
                bar.classList.remove('animate');
                void bar.offsetWidth;
                bar.classList.add('animate');
            }
        }
    }
}

function hideAllPumpMetrics() {
    const metrics = document.querySelectorAll('.pump-metric');
    metrics.forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('flex', 'animate-fade-in-slide');
    });
}

function showMotorMetric(id) {
    hideAllMotorMetrics();
    const el = document.getElementById(`motor-metric-${id}`);
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('flex', 'animate-fade-in-slide');
    }
}

function hideAllMotorMetrics() {
    const metrics = document.querySelectorAll('.motor-metric');
    metrics.forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('flex', 'animate-fade-in-slide');
    });
}

function hideAllMetrics() {
    hideAllPumpMetrics();
    hideAllMotorMetrics();
}

function triggerWaveAnimation() {
    const waves = document.querySelectorAll('.wave-arc');
    waves.forEach(w => {
        w.classList.remove('animating');
        void w.offsetWidth;
        w.classList.add('animating');
    });
}

function triggerDataFlow() {
    const path = document.getElementById('data-path-line');
    const packet = document.querySelector('.data-packet');
    if (path) path.classList.add('active');
    if (packet) packet.classList.add('active');
}

function stopAllAnimations() {
    const waves = document.querySelectorAll('.wave-arc');
    waves.forEach(w => w.classList.remove('animating'));
    const path = document.getElementById('data-path-line');
    const packet = document.querySelector('.data-packet');
    if (path) path.classList.remove('active');
    if (packet) packet.classList.remove('active');
}

function showProcessingIndicator(el) {
    if (el) {
        el.classList.remove('opacity-0', 'scale-0');
        el.classList.add('opacity-100', 'scale-100');
    }
}

function hideProcessingIndicator(el) {
    if (el) {
        el.classList.remove('opacity-100', 'scale-100');
        el.classList.add('opacity-0', 'scale-0');
    }
}

function showServerActivity(el) {
    if (el) {
        el.classList.remove('opacity-0', 'scale-0');
        el.classList.add('opacity-100', 'scale-100');
    }
}

function hideServerActivity(el) {
    if (el) {
        el.classList.remove('opacity-100', 'scale-100');
        el.classList.add('opacity-0', 'scale-0');
    }
}

// =========================================
// CHART DRAWING FUNCTIONS (Reusable)
// =========================================
function drawBEPChartOnCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (height / 4) * i);
        ctx.lineTo(width, (height / 4) * i);
        ctx.stroke();
    }
    
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.beginPath();
    ctx.moveTo(width * 0.35, height);
    ctx.lineTo(width * 0.35, 25);
    ctx.lineTo(width * 0.55, 25);
    ctx.lineTo(width * 0.55, height);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(20, height - 10);
    
    const peakX = width * 0.45;
    const peakY = 15;
    
    ctx.quadraticCurveTo(peakX * 0.5, height - 20, peakX, peakY);
    ctx.quadraticCurveTo(peakX * 1.3, height - 30, width - 20, height - 15);
    ctx.stroke();
    
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('BEP', peakX - 10, peakY - 14);
    
    const opX = peakX + 45;
    const opY = 32;
    
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(opX, opY, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(peakX + 8, peakY + 5);
    ctx.lineTo(opX - 8, opY - 3);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#ef4444';
    ctx.font = '9px monospace';
    ctx.fillText('Current', opX - 15, opY + 18);
}

function drawImpellerHeatmapOnCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.clearRect(0, 0, width, height);
    
    const numBlades = 6;
    const innerRadius = 12;
    const outerRadius = 40;
    
    for (let i = 0; i < numBlades; i++) {
        const angle = (i / numBlades) * Math.PI * 2 - Math.PI / 2;
        const nextAngle = ((i + 1) / numBlades) * Math.PI * 2 - Math.PI / 2;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
        gradient.addColorStop(0.5, 'rgba(234, 179, 8, 0.8)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.9)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * innerRadius, centerY + Math.sin(angle) * innerRadius);
        ctx.lineTo(centerX + Math.cos(angle) * outerRadius, centerY + Math.sin(angle) * outerRadius);
        ctx.arc(centerX, centerY, outerRadius, angle, nextAngle);
        ctx.lineTo(centerX + Math.cos(nextAngle) * innerRadius, centerY + Math.sin(nextAngle) * innerRadius);
        ctx.arc(centerX, centerY, innerRadius, nextAngle, angle, true);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
}

function drawRotorBarChartOnCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const totalBars = 28;
    const barWidth = (width - 20) / totalBars;
    const barHeight = height - 20;
    
    const barHealth = [];
    for (let i = 0; i < totalBars; i++) {
        if (i === 8 || i === 19) {
            barHealth.push('degraded');
        } else {
            barHealth.push('healthy');
        }
    }
    
    barHealth.forEach((health, i) => {
        const x = 10 + i * barWidth;
        const h = health === 'healthy' ? barHeight : barHeight * 0.7;
        const y = (height - h) / 2;
        
        if (health === 'healthy') {
            ctx.fillStyle = '#22c55e';
        } else {
            ctx.fillStyle = '#eab308';
        }
        
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barWidth - 2, h, [2, 2, 0, 0]);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x + 2, y, (barWidth - 4) / 2, h);
    });
    
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 5, width - 16, height - 10);
}

function drawMotorEfficiencyChartOnCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (height / 4) * i);
        ctx.lineTo(width, (height / 4) * i);
        ctx.stroke();
    }
    
    ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
    ctx.fillRect(width * 0.75, 0, width * 0.25, height);
    
    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.font = '8px sans-serif';
    ctx.fillText('Optimal', width * 0.80, 12);
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(20, height - 15);
    ctx.bezierCurveTo(width * 0.2, height - 20, width * 0.4, 20, width * 0.6, 18);
    ctx.bezierCurveTo(width * 0.75, 15, width * 0.85, 18, width - 20, 25);
    ctx.stroke();
    
    const opX = width * 0.82;
    const opY = 16;
    
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(opX, height - 5);
    ctx.lineTo(opX, opY + 8);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(opX, opY, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.beginPath();
    ctx.arc(opX, opY, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('82%', opX - 10, opY - 12);
}

function drawTorqueGaugeOnCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height - 5;
    const radius = 45;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.stroke();
    
    const segments = [
        { start: 0, end: 0.5, color: '#22c55e' },
        { start: 0.5, end: 0.75, color: '#eab308' },
        { start: 0.75, end: 0.9, color: '#f97316' },
        { start: 0.9, end: 1, color: '#ef4444' }
    ];
    
    segments.forEach(seg => {
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI + (seg.start * Math.PI), Math.PI + (seg.end * Math.PI));
        ctx.stroke();
    });
    
    const value = 0.85;
    const needleAngle = Math.PI + (value * Math.PI);
    
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(needleAngle) * (radius - 10), centerY + Math.sin(needleAngle) * (radius - 10));
    ctx.stroke();
    
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
}

// Wrapper functions for desktop charts
function drawPumpCharts() {}

function drawBEPChart() {
    const canvas = document.getElementById('bepCanvas');
    if (canvas) drawBEPChartOnCanvas(canvas);
}

function drawImpellerHeatmap() {
    const canvas = document.getElementById('impellerCanvas');
    if (canvas) drawImpellerHeatmapOnCanvas(canvas);
}

function drawRotorBarChart() {
    const canvas = document.getElementById('rotorBarCanvas');
    if (canvas) drawRotorBarChartOnCanvas(canvas);
}

function drawMotorEfficiencyChart() {
    const canvas = document.getElementById('motorEfficiencyCanvas');
    if (canvas) drawMotorEfficiencyChartOnCanvas(canvas);
}

function drawTorqueGauge() {
    const canvas = document.getElementById('torqueGaugeCanvas');
    if (canvas) drawTorqueGaugeOnCanvas(canvas);
}