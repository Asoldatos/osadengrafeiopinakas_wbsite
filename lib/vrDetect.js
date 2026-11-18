'use client';
// Γυαλιά VR ή όχι; Ένα κινητό ΔΕΝ είναι γυαλιά VR, ακόμα κι αν ο Chrome του λέει ότι «υποστηρίζει» WebXR (λειτουργία Cardboard).
const HEADSET = /OculusBrowser|Quest|Pacific|PicoBrowser|Pico Neo|Pico 4|Wolvic|Firefox Reality|VRBrowser|Vive Browser/i;
export function isPhone() {
  const ua = navigator.userAgent; if (HEADSET.test(ua)) return false;
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}
/** true μόνο για πραγματικά γυαλιά VR (Quest, Pico…) ή υπολογιστή με συνδεδεμένο VR. */
export async function isVRHeadset() {
  if (typeof navigator === 'undefined' || isPhone()) return false;
  if (HEADSET.test(navigator.userAgent)) return true;
  try { return !!(navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr'))); } catch { return false; }
}
export const GAME_URL = '/game/xmas/index.html';
/** Πάει στο παιχνίδι στην ΙΔΙΑ καρτέλα, με ένα απαλό «χιονισμένο» σβήσιμο. */
export function goToGame(url = GAME_URL) {
  document.documentElement.classList.add('g3d-leaving');
  setTimeout(() => { window.location.href = url; }, 380);
}
export const vrSiteUrl = (from) => `${GAME_URL}?vrsite=1&from=${encodeURIComponent(from || '/')}`;
