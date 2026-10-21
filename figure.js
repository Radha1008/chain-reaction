// © 2026 Radha Prabhakaran. All rights reserved. See LICENSE.
// Chain Reaction: the little line-drawn people. One drawing style, a few cast
// members: the guide (shirt and tie), the attacker (hooded, face in shadow so
// it reads as no one in particular, with a laptop) and the
// three fictional targets. Targets have a mood: calm, worried or happy.
// Shared by the Analysis tour and the attacker sim.

(function (root) {
  "use strict";

  const EYES = `<circle class="f-eye" cx="25.8" cy="21.4" r="1.35"/><circle class="f-eye" cx="34.2" cy="21.4" r="1.35"/>`;
  const MOUTH = {
    calm: `<path class="f-mouth" d="M27 26.4 Q30 28 33 26.4"/>`,
    happy: `<path class="f-mouth" d="M26.4 25.8 Q30 29.4 33.6 25.8"/>`,
    worried: `<path class="f-mouth" d="M27 27.8 Q30 25.6 33 27.8"/><path class="f-brow" d="M23.8 18.4 L27.4 17.5 M36.2 18.4 L32.6 17.5"/>`,
  };
  const HEAD = `<circle class="f-head" cx="30" cy="20" r="11.6"/>`;
  const SHORT_HAIR = `<path class="f-hair" d="M18.5 18.4 Q18.2 7.8 30 7.8 Q41.4 7.8 41.6 17 Q37 12.4 27.8 14 Q22 15 18.5 18.4 Z"/>`;

  // Shared stick body (guide, Justin): torso, arms from the shoulder, legs.
  const BODY = `
    <path class="f-line" d="M30 31.6 L30 57"/>
    <path class="f-line d-arm d-arm-l" d="M30 38 L19.5 49.5"/>
    <path class="f-line d-arm d-arm-r" d="M30 38 L40.5 49.5"/>
    <path class="f-line d-leg d-leg-l" d="M30 57 L23.5 74"/>
    <path class="f-line d-leg d-leg-r" d="M30 57 L36.5 74"/>`;

  // A-line dress for Sue and Simone.
  const DRESS_BODY = `
    <path class="f-line" d="M30 31.6 L30 37"/>
    <path class="f-dress" d="M27 36.4 L33 36.4 L37.2 57 L22.8 57 Z"/>
    <path class="f-line d-arm d-arm-l" d="M28 38.4 L19.5 49.5"/>
    <path class="f-line d-arm d-arm-r" d="M32 38.4 L40.5 49.5"/>
    <path class="f-line d-leg d-leg-l" d="M26.6 57 L25.4 74"/>
    <path class="f-line d-leg d-leg-r" d="M33.4 57 L34.6 74"/>`;

  const CAST = {
    guide: () => HEAD + SHORT_HAIR + EYES + MOUTH.happy + BODY +
      `<path class="f-collar" d="M27 32.4 L30 35.4 L33 32.4"/><path class="f-tie" d="M30 35.4 L28.6 43 L30 46.2 L31.4 43 Z"/>`,

    attacker: () => `
      <path class="f-hoodie" d="M19.4 36.6 Q30 31.6 40.6 36.6 L41 56 L19 56 Z"/>
      <path class="f-hood" d="M16.6 30.4 Q14.8 5.6 30 5.2 Q45.2 5.6 43.4 30.4 Q37.4 35 30 35 Q22.6 35 16.6 30.4 Z"/>
      <circle class="f-shadow" cx="30" cy="20.4" r="10.2"/>
      <path class="f-eye-x" d="M24.6 21 L28 21 M32 21 L35.4 21"/>
      <path class="f-line" d="M27.7 34.8 L27.3 39 M32.3 34.8 L32.7 39"/>
      <path class="f-line" d="M20.6 39 L23.2 49.2 M39.4 39 L36.8 49.2"/>
      <rect class="f-laptop" x="21.6" y="40.6" width="16.8" height="9.6" rx="1.2"/>
      <path class="f-screen" d="M24.2 43.6 L31 43.6 M24.2 46.4 L28.6 46.4"/>
      <path class="f-line" d="M19.8 50.6 L40.2 50.6"/>
      <path class="f-line d-leg d-leg-l" d="M25.5 56 L24.5 74"/>
      <path class="f-line d-leg d-leg-r" d="M34.5 56 L35.5 74"/>`,

    // Sue: shoulder-length bob with a side fringe.
    sue: (m) => `
      <path class="f-hair" d="M17.2 29.6 Q14.4 7 30 6.8 Q45.6 7 42.8 29.6 L39.2 29.6 Q41 19 34.6 13.8 Q27 18.6 19.6 18.4 Q19 24 20.8 29.6 Z"/>
      ${HEAD.replace('r="11.6"', 'r="10.8"')}
      <path class="f-hair" d="M19.4 18.6 Q21 10 30 9.6 Q38.6 10 40.6 17.6 Q35 12.6 28.6 15.2 Q23.6 17.4 19.4 18.6 Z"/>
      ${EYES}${MOUTH[m]}${DRESS_BODY}`,

    // Simone: neat bun on top.
    simone: (m) => `
      <circle class="f-hair" cx="30" cy="6.6" r="4.6"/>
      ${HEAD}
      <path class="f-hair" d="M18.6 19 Q18.4 8.6 30 8.4 Q41.6 8.6 41.4 19 Q36.4 13.4 30 13.6 Q23.6 13.4 18.6 19 Z"/>
      ${EYES}${MOUTH[m]}${DRESS_BODY}`,

    // Justin: short hair and holiday sunglasses.
    justin: (m) => HEAD + SHORT_HAIR + `
      <path class="f-shades" d="M22.4 19.2 L28.4 19.2 L28 23 Q25.4 24.4 22.8 23 Z M31.6 19.2 L37.6 19.2 L37.2 23 Q34.6 24.4 32 23 Z"/>
      <path class="f-line" d="M28.4 20 L31.6 20"/>${MOUTH[m]}${BODY}`,
  };

  root.CRFigure = function (who, mood) {
    const draw = CAST[who] || CAST.guide;
    return `<svg class="cr-fig ${who} ${mood || ""}" viewBox="0 0 60 78" aria-hidden="true">${draw(mood || "calm")}</svg>`;
  };
})(window);
