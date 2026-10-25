"use client";

import { useEffect, useRef } from "react";
import {
  AnimationMixer,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { MAX_ZOOM, MIN_ZOOM, type ModelAction } from "@/features/pokemon/models3d";

const gltfCache = new Map<string, Promise<GLTF>>();
let loader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (!loader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath("/draco/");
    loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
  }
  return loader;
}

/** Parsed models are cached per URL and cloned per viewer, so one download serves every canvas. */
function loadGltf(url: string): Promise<GLTF> {
  let p = gltfCache.get(url);
  if (!p) {
    p = getLoader().loadAsync(url);
    gltfCache.set(url, p);
    p.catch(() => gltfCache.delete(url));
  }
  return p;
}

export interface ModelViewerProps {
  url: string;
  /** 1 = faces right (left-hand fighter), -1 = faces left. */
  facing: 1 | -1;
  action: ModelAction;
  interactive: boolean;
  sway: boolean;
  /** Decorative motion allowed (idle bob, auto-rotate, eased poses). */
  animate: boolean;
  /** Wheel / pinch zoom (only meaningful when `interactive`). */
  zoomable?: boolean;
  /** Requested zoom factor (1 = default framing). Changes are applied; user zoom is reported via `onZoom`. */
  zoom?: number;
  onZoom?: (zoom: number) => void;
  onReady: () => void;
  onError: () => void;
}

interface Target {
  yaw: number;
  pitch: number;
  roll: number;
  lift: number;
  scale: number;
  flash: number;
}

function targetFor(action: ModelAction, facing: number, interactive: boolean, t: number, animate: boolean): Target {
  const base = interactive ? 0.3 : 0.55;
  const bob = animate ? Math.sin(t * 1.7) * 0.015 : 0;
  switch (action) {
    case "attack":
      return { yaw: facing * 1.05, pitch: -0.14, roll: 0, lift: 0, scale: 1.07, flash: 0 };
    case "status":
      return { yaw: facing * base, pitch: -0.05, roll: 0, lift: 0.09, scale: 1.04, flash: 0 };
    case "hit":
      return { yaw: -facing * 0.12, pitch: 0.24, roll: facing * 0.06, lift: 0, scale: 0.97, flash: 1 };
    case "faint":
      return { yaw: facing * 0.4, pitch: 0, roll: -facing * 1.45, lift: -0.3, scale: 0.95, flash: 0 };
    case "win":
      return { yaw: 0, pitch: -0.05, roll: 0, lift: 0.05, scale: 1.06, flash: 0 };
    default:
      return { yaw: facing * base, pitch: 0, roll: 0, lift: bob, scale: 1, flash: 0 };
  }
}

/** Real-time WebGL viewer for a glTF Pokémon model (three.js, lazily loaded). */
export function ModelViewer(props: ModelViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });

  const { url, interactive, zoomable = false } = props;

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let raf = 0;
    let visible = true;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.dataset.testid = "pokemon-webgl";
    container.appendChild(canvas);

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.05, 50);
    scene.add(new HemisphereLight(0xffffff, 0x6b7a99, 1.9));
    const key = new DirectionalLight(0xfff1dc, 2.6);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rim = new DirectionalLight(0x8fb4ff, 1.4);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    const pivot = new Group();
    scene.add(pivot);

    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
    });
    io.observe(container);

    let controls: OrbitControls | null = null;
    if (interactive) {
      controls = new OrbitControls(camera, canvas);
      controls.enablePan = false;
      controls.enableZoom = zoomable;
      controls.zoomSpeed = 0.8;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minPolarAngle = Math.PI / 3.2;
      controls.maxPolarAngle = Math.PI / 1.75;
      controls.autoRotateSpeed = 1.6;
      canvas.style.touchAction = zoomable ? "none" : "pan-y";
      canvas.style.cursor = "grab";
      canvas.tabIndex = 0;
      canvas.setAttribute("aria-label", "3D model. Use arrow keys or drag to rotate.");
      controls.listenToKeyEvents(canvas);
      controls.addEventListener("start", () => {
        if (controls) controls.autoRotate = false;
        clearTimeout(resumeTimer);
        canvas.style.cursor = "grabbing";
      });
      controls.addEventListener("end", () => {
        canvas.style.cursor = "grab";
        resumeTimer = setTimeout(() => {
          if (controls && live.current.sway && live.current.animate) controls.autoRotate = true;
        }, 3500);
      });
    }

    const clock = new Clock();
    let mixer: AnimationMixer | null = null;
    const materials: MeshStandardMaterial[] = [];
    const owned: Material[] = [];
    const state = { yaw: props.facing * 2.6, pitch: 0, roll: 0, lift: 0, scale: 1, flash: 0 };
    let ready = false;
    let baseDist = 0;
    let lastProp = props.zoom ?? 1;
    let lastReported = 1;

    loadGltf(url)
      .then((gltf) => {
        if (disposed) return;
        const root = cloneSkinned(gltf.scene);
        root.traverse((o) => {
          const mesh = o as Mesh;
          if (!mesh.isMesh) return;
          mesh.frustumCulled = false;
          const clones = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
            const c = m.clone();
            owned.push(c);
            if ((c as MeshStandardMaterial).emissive) {
              const std = c as MeshStandardMaterial;
              std.userData.baseEmissive = std.emissive.clone();
              materials.push(std);
            }
            return c;
          });
          mesh.material = Array.isArray(mesh.material) ? clones : clones[0];
        });

        // Pose the skeleton first so the bounds reflect the visible, animated mesh.
        if (gltf.animations.length) {
          mixer = new AnimationMixer(root);
          const clip = gltf.animations.find((a) => /idle|wait|stand|loop/i.test(a.name)) ?? gltf.animations[0];
          mixer.clipAction(clip).play();
          mixer.update(0);
        }
        root.updateMatrixWorld(true);

        // Normalise: centre on the origin and scale so the larger of width/height is one unit.
        const box = new Box3().setFromObject(root, true);
        const centre = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3());
        const s = 1 / Math.max(size.x, size.y, 1e-6);
        root.position.sub(centre);
        const holder = new Group();
        holder.add(root);
        holder.scale.setScalar(s);
        pivot.add(holder);

        const half = Math.tan((camera.fov * Math.PI) / 360);
        const dist = (0.5 * 1.18) / half + (size.z * s) / 2;
        camera.position.set(0, 0.04, dist);
        camera.lookAt(0, 0, 0);
        baseDist = camera.position.length();
        if (controls) {
          controls.minDistance = baseDist / MAX_ZOOM;
          controls.maxDistance = baseDist / MIN_ZOOM;
          const initial = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, live.current.zoom ?? 1));
          camera.position.setLength(baseDist / initial);
          lastReported = initial;
        }
        controls?.update();

        ready = true;
        live.current.onReady();
      })
      .catch(() => {
        if (!disposed) live.current.onError();
      });

    const flashColor = new Color(0xff2a2a);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (!ready || !visible || document.hidden) return;
      const p = live.current;
      const t = clock.elapsedTime;
      mixer?.update(dt);

      if (controls) {
        if (p.sway && p.animate && p.action === "idle" && !controls.autoRotate && resumeTimer === undefined) controls.autoRotate = true;
        if (zoomable && baseDist > 0) {
          const current = baseDist / camera.position.length();
          const requested = p.zoom ?? 1;
          if (requested !== lastProp) {
            // Zoom requested from outside (buttons / keyboard).
            lastProp = requested;
            if (Math.abs(requested - current) > 0.01) {
              camera.position.setLength(baseDist / Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, requested)));
            }
          } else if (Math.abs(current - lastReported) > 0.01) {
            // Zoom changed by wheel / pinch: report it.
            lastReported = current;
            p.onZoom?.(Number(current.toFixed(2)));
          }
        }
        controls.update();
      }

      const target = targetFor(p.action, p.facing, p.interactive, t, p.animate);
      const k = 1 - Math.exp(-dt * (p.animate ? 8 : 40));
      if (p.action === "win") {
        state.yaw += dt * (p.animate ? 1.7 : 0);
      } else {
        // Take the shortest way round so entry/turn animations never spin the long way.
        let d = target.yaw - state.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        state.yaw += d * k;
      }
      state.pitch += (target.pitch - state.pitch) * k;
      state.roll += (target.roll - state.roll) * k;
      state.lift += (target.lift - state.lift) * k;
      state.scale += (target.scale - state.scale) * k;
      state.flash += (target.flash - state.flash) * Math.min(1, k * 1.5);

      pivot.rotation.set(state.pitch, state.yaw, state.roll);
      pivot.position.y = state.lift;
      pivot.scale.setScalar(state.scale);
      for (const m of materials) {
        const base = m.userData.baseEmissive as Color;
        m.emissive.copy(base).lerp(flashColor, state.flash * 0.55);
      }
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      ro.disconnect();
      io.disconnect();
      controls?.dispose();
      mixer?.stopAllAction();
      owned.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
    // Scene is (re)built only when the model or interaction mode changes; live props flow through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, interactive, zoomable]);

  return <div ref={host} className="absolute inset-0" aria-hidden />;
}
