(function () {
  if (!window.THREE) return;

  const DEFAULT_IMAGES = [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514361892635-6a8f2c0b0d0a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80"
  ];

  const vertexShader = `
    uniform float scrollForce;
    uniform float time;
    uniform float isHovered;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normal;
      vec3 pos = position;

      float curveIntensity = scrollForce * 0.3;
      float distanceFromCenter = length(pos.xy);
      float curve = distanceFromCenter * distanceFromCenter * curveIntensity;

      float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
      float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
      float clothEffect = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;

      float flagWave = 0.0;
      if (isHovered > 0.5) {
        float wavePhase = pos.x * 3.0 + time * 8.0;
        float waveAmplitude = sin(wavePhase) * 0.1;
        float dampening = smoothstep(-0.5, 0.5, pos.x);
        flagWave = waveAmplitude * dampening;
        float secondaryWave = sin(pos.x * 5.0 + time * 12.0) * 0.03 * dampening;
        flagWave += secondaryWave;
      }

      pos.z -= (curve + clothEffect + flagWave);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D map;
    uniform float opacity;
    uniform float blurAmount;
    uniform float scrollForce;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec4 color = texture2D(map, vUv);
      if (blurAmount > 0.0) {
        vec2 texelSize = 1.0 / vec2(textureSize(map, 0));
        vec4 blurred = vec4(0.0);
        float total = 0.0;
        for (float x = -2.0; x <= 2.0; x += 1.0) {
          for (float y = -2.0; y <= 2.0; y += 1.0) {
            vec2 offset = vec2(x, y) * texelSize * blurAmount;
            float weight = 1.0 / (1.0 + length(vec2(x, y)));
            blurred += texture2D(map, vUv + offset) * weight;
            total += weight;
          }
        }
        color = blurred / total;
      }
      float curveHighlight = abs(scrollForce) * 0.05;
      color.rgb += vec3(curveHighlight * 0.1);
      gl_FragColor = vec4(color.rgb, color.a * opacity);
    }
  `;

  const shaderVertex = `
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      vec3 pos = position;
      pos.y += sin(pos.x * 10.0 + time) * 0.1 * intensity;
      pos.x += cos(pos.y * 8.0 + time * 1.5) * 0.05 * intensity;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const shaderFragment = `
    uniform float time;
    uniform float intensity;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vec2 uv = vUv;
      float noise = sin(uv.x * 20.0 + time) * cos(uv.y * 15.0 + time * 0.8);
      noise += sin(uv.x * 35.0 - time * 2.0) * cos(uv.y * 25.0 + time * 1.2) * 0.5;
      vec3 color = mix(color1, color2, noise * 0.5 + 0.5);
      color = mix(color, vec3(1.0), pow(abs(noise), 2.0) * intensity);
      float glow = 1.0 - length(uv - 0.5) * 2.0;
      glow = pow(glow, 2.0);
      gl_FragColor = vec4(color * glow, glow * 0.8);
    }
  `;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function createClothMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        map: { value: null },
        opacity: { value: 1.0 },
        blurAmount: { value: 0.0 },
        scrollForce: { value: 0.0 },
        time: { value: 0.0 },
        isHovered: { value: 0.0 }
      },
      vertexShader,
      fragmentShader
    });
  }

  function initHero(hero) {
    const canvasHost = hero.querySelector("[data-hero-canvas]");
    if (!canvasHost) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower =
      (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    let images = [];
    try {
      images = JSON.parse(hero.dataset.images || "[]");
    } catch (err) {
      images = [];
    }
    if (!images.length) images = DEFAULT_IMAGES;

    const modelUrl = hero.dataset.modelUrl || "";
    const variant = hero.dataset.heroVariant || "gallery";

    const width = canvasHost.clientWidth;
    const height = canvasHost.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
    camera.position.set(0, 0, 12.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.2 : 2));
    renderer.setSize(width, height);
    canvasHost.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const point = new THREE.PointLight(0xffffff, 0.5);
    point.position.set(5, 5, 8);
    scene.add(point);

    let materials = [];
    let planes = [];
    let scrollVelocity = 0;
    let autoPlay = !reducedMotion;
    let hovered = false;
    let bottle = null;
    let scrollProgress = 0;
    let introStart = performance.now();

    const planeCount = Math.min(images.length, lowPower ? 6 : 12);
    const depthRange = 70;
    const maxOffsetX = lowPower ? 4.2 : 6.5;
    const maxOffsetY = lowPower ? 3.2 : 5.2;

    if (variant === "shader") {
      const geometry = new THREE.PlaneGeometry(12, 12, lowPower ? 32 : 64, lowPower ? 32 : 64);
      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          intensity: { value: 1.4 },
          color1: { value: new THREE.Color("#c50000") },
          color2: { value: new THREE.Color("#ffffff") }
        },
        vertexShader: shaderVertex,
        fragmentShader: shaderFragment,
        transparent: true,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(geometry, shaderMaterial);
      plane.position.set(0, 0, -5);
      scene.add(plane);
    } else {
      const textureLoader = new THREE.TextureLoader();
      materials = Array.from({ length: planeCount }, () => createClothMaterial());
      const textures = images.slice(0, planeCount).map((src) => textureLoader.load(src));

      planes = Array.from({ length: planeCount }, (_, index) => {
        const geometry = new THREE.PlaneGeometry(2, 2, lowPower ? 16 : 32, lowPower ? 16 : 32);
        const material = materials[index];
        material.uniforms.map.value = textures[index];
        const mesh = new THREE.Mesh(geometry, material);
        const angle = (index * 2.618) % (Math.PI * 2);
        const radius = (index % 3) * 1.2;
        mesh.userData = {
          z: (depthRange / planeCount) * index,
          x: (Math.sin(angle) * radius * maxOffsetX) / 3,
          y: (Math.cos(angle) * radius * maxOffsetY) / 4
        };
        mesh.position.set(mesh.userData.x, mesh.userData.y, mesh.userData.z - depthRange / 2);
        scene.add(mesh);
        return mesh;
      });
    }

    if (modelUrl && window.THREE.GLTFLoader) {
      const loader = new THREE.GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          bottle = gltf.scene;
          bottle.scale.set(2.4, 2.4, 2.4);
          bottle.position.set(0, -1.5, 0);
          scene.add(bottle);
        },
        undefined,
        () => {}
      );
    }

    const handleWheel = (event) => {
      scrollVelocity += event.deltaY * 0.0032;
      autoPlay = false;
    };

    hero.addEventListener("wheel", handleWheel, { passive: true });
    hero.addEventListener("mouseenter", () => (hovered = true));
    hero.addEventListener("mouseleave", () => (hovered = false));

    window.addEventListener("scroll", () => {
      const rect = hero.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = (viewport - rect.top) / (rect.height + viewport);
      scrollProgress = clamp(progress, 0, 1);
    });

    const onResize = () => {
      const w = canvasHost.clientWidth;
      const h = canvasHost.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    function animate() {
      const time = performance.now() * 0.001;
      requestAnimationFrame(animate);

      if (autoPlay && !reducedMotion) {
        scrollVelocity += 0.006;
      }
      scrollVelocity *= 0.94;

      if (materials.length) {
        materials.forEach((material) => {
          material.uniforms.time.value = time;
          material.uniforms.scrollForce.value = scrollVelocity;
          material.uniforms.isHovered.value = hovered ? 1.0 : 0.0;
        });
      }

      if (planes.length) {
        planes.forEach((mesh, index) => {
          let z = mesh.userData.z + scrollVelocity * 12;
          if (z >= depthRange) z -= depthRange;
          if (z < 0) z += depthRange;
          mesh.userData.z = z;
          const worldZ = z - depthRange / 2;
          mesh.position.z = worldZ;

          const normalized = z / depthRange;
          const fadeIn = clamp((normalized - 0.02) / 0.18, 0, 1);
          const fadeOut = 1 - clamp((normalized - 0.78) / 0.14, 0, 1);
          const opacity = clamp(Math.min(fadeIn, fadeOut), 0, 1);
          const blur = clamp((Math.abs(normalized - 0.5) + scrollProgress * 0.12) * 10, 0, 10);

          const material = materials[index];
          material.uniforms.opacity.value = opacity;
          material.uniforms.blurAmount.value = blur;
        });
      }

      if (bottle) {
        bottle.rotation.y = scrollProgress * Math.PI * 2;
        bottle.rotation.x = Math.sin(time * 0.5) * 0.05;
      }

      const introProgress = clamp((performance.now() - introStart) / 1400, 0, 1);
      const introEase = 1 - Math.pow(1 - introProgress, 3);
      camera.position.z = 16 - introEase * 3.2;

      renderer.render(scene, camera);
    }

    animate();
  }

  document.querySelectorAll("[data-hero]").forEach(initHero);
})();
