import * as THREE from 'three';
import { scene, camera, renderer, resizeRenderer, createLights, initOrbitControls, getOrbitControls } from './scene.js';
import { createScenery } from './entities/scenery.js';
import { createWaterfall, updateWaterfall } from './entities/waterfall.js';
import { initControls } from './systems/controls.js';
import { initGame, updateGame } from './systems/game.js';
import { initDevTools } from './systems/dev.js';
import * as TWEEN from 'tween';

// --- SCENE SETUP ---
const scenery = createScenery();
scene.add(scenery);
const waterfall = createWaterfall();
scene.add(waterfall);
createLights(scene);

// --- INITIALIZE SYSTEMS ---
initDevTools(scene);
initGame();
initControls(scene, camera);

// --- RENDERER & RESIZE ---
import { mountRenderer } from './scene.js';
mountRenderer(document.getElementById('game-container'));
window.addEventListener('resize', resizeRenderer);

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate); 
    
    const controls = getOrbitControls();
    if (controls?.enabled) {
        controls.update();
    }

    updateWaterfall(waterfall);
    updateGame();
    TWEEN.update(performance.now()); // drive tween-based animations with timestamp

    renderer.render(scene, camera);
}

// Start the animation loop
animate();

/* Tap To Play overlay interaction */
const overlay = document.getElementById('tap-start-overlay');
const exitBtn = document.getElementById('exit-fs-btn');
let NO_FULLSCREEN = false;
function triggerFsHint(){ exitBtn?.classList.remove('fs-stealth'); exitBtn?.classList.add('fs-intro'); setTimeout(()=>{ exitBtn?.classList.remove('fs-intro'); exitBtn?.classList.add('fs-stealth'); },3000); }

async function requestAnyFullscreen(el) {
  const rfs = el?.requestFullscreen?.bind(el) || el?.webkitRequestFullscreen?.bind(el) || el?.msRequestFullscreen?.bind(el);
  if (rfs) { try { await rfs({ navigationUI: 'hide' }); return true; } catch { try { await rfs(); return true; } catch {} } }
  return false;
}
function isFs() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function isIOS() {
  const ua = navigator.userAgent || '';
  return /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function enterImmersiveFallback() {
  document.documentElement.classList.add('app-immersive');
  document.body.classList.add('app-immersive');
  document.getElementById('game-container')?.classList.add('app-immersive');
  document.getElementById('ui-container')?.classList.add('app-immersive');
  setTimeout(()=>{ try { window.scrollTo(0,1); } catch {} }, 50);
  exitBtn?.classList.remove('hidden');
  triggerFsHint();
}
async function tryLockOrientation() {
  try { await screen.orientation?.lock?.('landscape'); } catch {}
}
const tryFS = async () => {
  if (NO_FULLSCREEN) return;
  if (isIOS() || (!document.fullscreenEnabled && !document.webkitFullscreenEnabled)) {
    enterImmersiveFallback(); return;
  }
  const targets = [
    document.documentElement,
    document.body,
    document.getElementById('game-container'),
    renderer?.domElement
  ].filter(Boolean);
  for (const t of targets) { if (await requestAnyFullscreen(t)) break; }
  if (!isFs()) enterImmersiveFallback(); /* else tryLockOrientation(); */
};
const dismissOverlay = async () => {
  if (!NO_FULLSCREEN) await tryFS();
  overlay?.classList.add('hidden');
};
overlay?.addEventListener('click', dismissOverlay, { once: true });
overlay?.addEventListener('touchstart', (e)=>{ e.preventDefault(); dismissOverlay(); }, { once: true, passive: false });
overlay?.addEventListener('pointerup', dismissOverlay, { once: true });
window.addEventListener('fullscreenchange', () => {
  if (isFs()) {
    document.documentElement.classList.remove('app-immersive');
    document.body.classList.remove('app-immersive');
    document.getElementById('game-container')?.classList.remove('app-immersive');
    document.getElementById('ui-container')?.classList.remove('app-immersive');
    exitBtn?.classList.remove('hidden');
    triggerFsHint();
  } else {
    NO_FULLSCREEN = true;
    exitBtn?.classList.add('hidden');
    document.documentElement.classList.remove('app-immersive');
    document.body.classList.remove('app-immersive');
    document.getElementById('game-container')?.classList.remove('app-immersive');
    document.getElementById('ui-container')?.classList.remove('app-immersive');
  }
});
window.addEventListener('orientationchange', () => { if (!isFs()) setTimeout(tryFS, 50); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !isFs() && !NO_FULLSCREEN) setTimeout(tryFS, 50); });

/* Exit fullscreen button logic */
async function exitAnyFullscreen() {
  try { await document.exitFullscreen?.(); } catch {}
  try { await document.webkitExitFullscreen?.(); } catch {}
}
exitBtn?.addEventListener('click', async () => {
  NO_FULLSCREEN = true;
  overlay?.classList.add('hidden');
  exitBtn?.classList.remove('fs-intro','fs-stealth');
  if (isFs()) await exitAnyFullscreen();
  document.documentElement.classList.remove('app-immersive');
  document.body.classList.remove('app-immersive');
  document.getElementById('game-container')?.classList.remove('app-immersive');
  document.getElementById('ui-container')?.classList.remove('app-immersive');
  exitBtn?.classList.add('hidden');
});