/* =========================
Initialized all js files here
=========================== */

import './js/animation/accordion';
import './js/animation/customer-success-stories';
import './js/animation/glossary';
import './js/animation/gradient-path';
import './js/animation/header';
import './js/animation/marquee';
import './js/animation/modal';
import './js/animation/sidebar';
import './js/animation/slider';
import './js/animation/svg-draw';
import './js/animation/swiper';
import './js/animation/tab';
import './js/animation/tab-filter';
import './js/common/common';
import './js/common/mobile-menu';
import './js/common/navigation-menu';
import './js/common/parallax-effect';
import './js/common/price-switcher';
import './js/common/progress';
import './js/common/reveal-elements';
import './js/common/smooth-scrolling';
import './js/utils/cookie';
import './js/utils/counter';
import './js/utils/force-theme-switcher';
import './js/utils/img-before-after-slider';
import './js/utils/leaflet';
import './js/utils/theme-switcher';
import './js/custom/digital-twin';
import './js/custom/fraud-graph-network';
import i18n from './i18n.js';

// Initialize i18n when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await i18n.init();
  } catch (error) {
  }
});