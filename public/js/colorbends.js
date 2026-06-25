/**
 * ColorBends – Vanilla JS (ported from React/Three.js component)
 * Animated WebGL shader background for xlnt.
 * Exposes window.ColorBends.setColors(hexArray) for dynamic color updates.
 */
(function () {
  'use strict';

  // Guard: THREE must be loaded
  if (typeof THREE === 'undefined') {
    console.error('[ColorBends] THREE.js not loaded. Background will not render.');
    return;
  }

  var MAX_COLORS = 8;

  var vertexShader = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position, 1.0);',
    '}'
  ].join('\n');

  var fragmentShader = [
    '#define MAX_COLORS ' + MAX_COLORS,
    'uniform vec2 uCanvas;',
    'uniform float uTime;',
    'uniform float uSpeed;',
    'uniform vec2 uRot;',
    'uniform int uColorCount;',
    'uniform vec3 uColors[MAX_COLORS];',
    'uniform int uTransparent;',
    'uniform float uScale;',
    'uniform float uFrequency;',
    'uniform float uWarpStrength;',
    'uniform vec2 uPointer;',
    'uniform float uMouseInfluence;',
    'uniform float uScroll;',
    'uniform float uParallax;',
    'uniform float uNoise;',
    'uniform int uIterations;',
    'uniform float uIntensity;',
    'uniform float uBandWidth;',
    'varying vec2 vUv;',
    '',
    'void main() {',
    '  float t = uTime * uSpeed;',
    '  vec2 p = vUv * 2.0 - 1.0;',
    '  p.y -= uScroll;',
    '  p += uPointer * uParallax * 0.1;',
    '  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);',
    '  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);',
    '  q /= max(uScale, 0.0001);',
    '  q /= 0.5 + 0.2 * dot(q, q);',
    '  q += 0.2 * cos(t) - 7.56;',
    '  vec2 toward = (uPointer - rp);',
    '  q += toward * uMouseInfluence * 0.2;',
    '',
    '  for (int j = 0; j < 5; j++) {',
    '    if (j >= uIterations - 1) break;',
    '    vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));',
    '    q += (rr - q) * 0.15;',
    '  }',
    '',
    '  vec3 col = vec3(0.0);',
    '  float a = 1.0;',
    '',
    '  if (uColorCount > 0) {',
    '    vec2 s = q;',
    '    vec3 sumCol = vec3(0.0);',
    '    float cover = 0.0;',
    '    for (int i = 0; i < MAX_COLORS; ++i) {',
    '      if (i >= uColorCount) break;',
    '      s -= 0.01;',
    '      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));',
    '      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);',
    '      float kBelow = clamp(uWarpStrength, 0.0, 1.0);',
    '      float kMix = pow(kBelow, 0.3);',
    '      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);',
    '      vec2 disp = (r - s) * kBelow;',
    '      vec2 warped = s + disp * gain;',
    '      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);',
    '      float m = mix(m0, m1, kMix);',
    '      float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));',
    '      sumCol += uColors[i] * w;',
    '      cover = max(cover, w);',
    '    }',
    '    col = clamp(sumCol, 0.0, 1.0);',
    '    a = uTransparent > 0 ? cover : 1.0;',
    '  } else {',
    '    vec2 s = q;',
    '    for (int k = 0; k < 3; ++k) {',
    '      s -= 0.01;',
    '      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));',
    '      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);',
    '      float kBelow = clamp(uWarpStrength, 0.0, 1.0);',
    '      float kMix = pow(kBelow, 0.3);',
    '      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);',
    '      vec2 disp = (r - s) * kBelow;',
    '      vec2 warped = s + disp * gain;',
    '      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);',
    '      float m = mix(m0, m1, kMix);',
    '      col[k] = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));',
    '    }',
    '    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;',
    '  }',
    '',
    '  col *= uIntensity;',
    '',
    '  if (uNoise > 0.0001) {',
    '    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);',
    '    col += (n - 0.5) * uNoise;',
    '    col = clamp(col, 0.0, 1.0);',
    '  }',
    '',
    '  vec3 rgb = (uTransparent > 0) ? col * a : col;',
    '  gl_FragColor = vec4(rgb, a);',
    '}'
  ].join('\n');

  // --- Hex to normalised RGB ---
  function hexToVec3(hex) {
    var h = hex.replace('#', '').trim();
    var r, g, b;
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else {
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    }
    return new THREE.Vector3(r / 255, g / 255, b / 255);
  }

  // Store material reference for dynamic updates
  var _material = null;

  // --- Public API removed since we only use default theme ---
  window.ColorBends = {};

  // --- Initialise ColorBends ---
  function initColorBends(container, opts) {
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var geometry = new THREE.PlaneGeometry(2, 2);

    var uColorsArray = [];
    for (var i = 0; i < MAX_COLORS; i++) uColorsArray.push(new THREE.Vector3(0, 0, 0));

    // Parse colours
    var parsedColors = (opts.colors || []).filter(Boolean).slice(0, MAX_COLORS).map(hexToVec3);
    for (var c = 0; c < parsedColors.length; c++) uColorsArray[c].copy(parsedColors[c]);

    var rad = (opts.rotation % 360) * Math.PI / 180;

    var material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uCanvas:         { value: new THREE.Vector2(1, 1) },
        uTime:           { value: 0 },
        uSpeed:          { value: opts.speed },
        uRot:            { value: new THREE.Vector2(Math.cos(rad), Math.sin(rad)) },
        uColorCount:     { value: parsedColors.length },
        uColors:         { value: uColorsArray },
        uTransparent:    { value: opts.transparent ? 1 : 0 },
        uScale:          { value: opts.scale },
        uFrequency:      { value: opts.frequency },
        uWarpStrength:   { value: opts.warpStrength },
        uPointer:        { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: opts.mouseInfluence },
        uScroll:         { value: 0 },
        uParallax:       { value: opts.parallax },
        uNoise:          { value: opts.noise },
        uIterations:     { value: opts.iterations },
        uIntensity:      { value: opts.intensity },
        uBandWidth:      { value: opts.bandWidth }
      },
      premultipliedAlpha: true,
      transparent: true
    });

    // Store reference for dynamic updates
    _material = material;

    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
        alpha: true
      });
    } catch (e) {
      console.error('[ColorBends] WebGL not supported:', e);
      return;
    }

    if (THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, opts.transparent ? 0 : 1);

    var canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    // --- Sizing ---
    function handleResize() {
      var w = container.clientWidth || 1;
      var h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      material.uniforms.uCanvas.value.set(w, h);
    }
    handleResize();

    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(handleResize);
      ro.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // --- Pointer tracking ---
    var pointerTarget = new THREE.Vector2(0, 0);
    var pointerCurrent = new THREE.Vector2(0, 0);
    var pointerSmooth = 8;

    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth) * 2 - 1;
      var y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointerTarget.set(x, y);
    });

    var targetScroll = 0;
    var currentScroll = 0;
    
    window.addEventListener('scroll', function() {
        // Map 100vh of scroll to 2.0 in shader space
        targetScroll = (window.scrollY / window.innerHeight) * 2.0;
    });

    // --- Animation loop ---
    var clock = new THREE.Clock();
    var rafId = null;

    function loop() {
      var dt = clock.getDelta();
      var elapsed = clock.elapsedTime;
      material.uniforms.uTime.value = elapsed;

      var deg = (opts.rotation % 360) + opts.autoRotate * elapsed;
      var r = (deg * Math.PI) / 180;
      material.uniforms.uRot.value.set(Math.cos(r), Math.sin(r));

      var amt = Math.min(1, dt * pointerSmooth);
      pointerCurrent.lerp(pointerTarget, amt);
      material.uniforms.uPointer.value.copy(pointerCurrent);
      
      currentScroll += (targetScroll - currentScroll) * amt;
      material.uniforms.uScroll.value = currentScroll;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    console.log('[ColorBends] WebGL background initialized.');
  }

  // --- Boot ---
  function boot() {
    var container = document.getElementById('colorBendsCanvas');
    if (!container) {
      console.error('[ColorBends] Container #colorBendsCanvas not found.');
      return;
    }

    // Default colors (will be overridden by script.js on theme init)
    initColorBends(container, {
      colors: ['#0033ff', '#1a1aff', '#0066cc'],
      rotation: 90,
      speed: 0.2,
      scale: 1.2,
      frequency: 1,
      warpStrength: 0.935,
      mouseInfluence: 1.9,
      noise: 0,
      parallax: 0.35,
      iterations: 1,
      intensity: 2,
      bandWidth: 1.5,
      transparent: true,
      autoRotate: 0
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
