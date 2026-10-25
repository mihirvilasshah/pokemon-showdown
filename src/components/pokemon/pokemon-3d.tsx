"use client";

import { Maximize2, Minimize2, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { MAX_ZOOM, MIN_ZOOM, clampZoom, type ModelAction } from "@/features/pokemon/models3d";
import { formatName } from "@/features/pokemon/mappers";
import { useMotionEnabled } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";
import type { ModelViewerProps } from "./model-viewer";
import { PokemonLayered, type Pose } from "./pokemon-layered";

export type { Pose };

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

interface Pokemon3DProps {
  id: number;
  name: string;
  /** glTF model URL; when missing or failing, the 2.5D layered renderer is used. */
  modelUrl?: string | null;
  home?: string | null;
  artwork?: string | null;
  sprite?: string | null;
  /** True for the left-hand fighter (faces right). */
  flip?: boolean;
  action?: ModelAction;
  /** Pose used only by the 2.5D fallback. */
  pose?: Pose;
  interactive?: boolean;
  sway?: boolean;
  priority?: boolean;
  showHint?: boolean;
  /** Show zoom buttons and enable wheel / pinch / keyboard zoom. */
  zoomable?: boolean;
  /** Show a button that opens the model in a full-screen viewer with zoom. */
  expandable?: boolean;
  className?: string;
  style?: CSSProperties;
}

const ZOOM_STEP = 1.25;

function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (z: number) => void }) {
  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div
      className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 text-white shadow-lg backdrop-blur"
      role="group"
      aria-label="Zoom controls"
    >
      <button type="button" className={btn} onClick={() => onZoom(zoom / ZOOM_STEP)} disabled={zoom <= MIN_ZOOM + 0.01} aria-label="Zoom out" data-testid="zoom-out">
        <ZoomOut className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums" aria-live="polite" data-testid="zoom-level">
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" className={btn} onClick={() => onZoom(zoom * ZOOM_STEP)} disabled={zoom >= MAX_ZOOM - 0.01} aria-label="Zoom in" data-testid="zoom-in">
        <ZoomIn className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" className={btn} onClick={() => onZoom(1)} aria-label="Reset zoom" data-testid="zoom-reset">
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Pokémon viewer. Loads a real glTF model into a WebGL scene (three.js, lazy-loaded) and shows
 * the 2.5D layered render while the model downloads or whenever a model is unavailable.
 */
export function Pokemon3D({
  id,
  name,
  modelUrl = null,
  home,
  artwork,
  sprite,
  flip = false,
  action = "idle",
  pose,
  interactive = false,
  sway = false,
  priority = false,
  showHint = false,
  zoomable = false,
  expandable = false,
  className,
  style,
}: Pokemon3DProps) {
  const motionOn = useMotionEnabled();
  const [Viewer, setViewer] = useState<ComponentType<ModelViewerProps> | null>(null);
  const [state, setState] = useState<{ url: string | null; status: "loading" | "ready" | "failed" }>({ url: modelUrl, status: "loading" });
  const [zoom, setZoomState] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  // Reset when a different model is requested.
  if (state.url !== modelUrl) setState({ url: modelUrl, status: "loading" });
  const status = !modelUrl ? "failed" : state.status;
  const webgl = status === "ready";

  const setZoom = useCallback((z: number) => setZoomState(clampZoom(Number.isFinite(z) ? z : 1)), []);

  useEffect(() => {
    if (!modelUrl) return;
    if (!webglAvailable()) {
      setState({ url: modelUrl, status: "failed" });
      return;
    }
    let cancelled = false;
    import("./model-viewer")
      .then((m) => {
        if (!cancelled) setViewer(() => m.ModelViewer);
      })
      .catch(() => {
        if (!cancelled) setState({ url: modelUrl, status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [modelUrl]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!zoomable) return;
    if (e.key === "+" || e.key === "=") setZoom(zoom * ZOOM_STEP);
    else if (e.key === "-" || e.key === "_") setZoom(zoom / ZOOM_STEP);
    else if (e.key === "0") setZoom(1);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={cn("relative aspect-square", className)}
      style={style}
      data-testid="pokemon-model"
      data-render={webgl ? "webgl" : "layered"}
      onKeyDown={onKeyDown}
      onWheel={zoomable && !webgl ? (e) => setZoom(zoom * (e.deltaY < 0 ? 1.1 : 0.9)) : undefined}
    >
      {!webgl && (
        <div className="absolute inset-0 origin-center transition-transform duration-200" style={{ transform: `scale(${zoom})` }}>
          <PokemonLayered
            id={id}
            name={name}
            home={home}
            artwork={artwork}
            sprite={sprite}
            flip={flip}
            pose={pose}
            interactive={interactive}
            sway={sway}
            spin={action === "win"}
            priority={priority}
            className="absolute inset-0 h-full w-full"
          />
        </div>
      )}
      {Viewer && modelUrl && status !== "failed" && (
        <div
          className={cn("absolute inset-0 transition-opacity duration-500", webgl ? "opacity-100" : "pointer-events-none opacity-0")}
          role={interactive ? "group" : undefined}
          aria-label={interactive ? `${formatName(name)} 3D model. Drag to rotate${zoomable ? ", scroll or pinch to zoom" : ""}.` : undefined}
        >
          <Viewer
            key={`${modelUrl}-${zoomable}`}
            url={modelUrl}
            facing={flip ? 1 : -1}
            action={action}
            interactive={interactive}
            sway={sway}
            animate={motionOn}
            zoomable={zoomable}
            zoom={zoom}
            onZoom={setZoom}
            onReady={() => setState({ url: modelUrl, status: "ready" })}
            onError={() => setState({ url: modelUrl, status: "failed" })}
          />
          <span className="sr-only">{formatName(name)} 3D model</span>
        </div>
      )}
      {zoomable && <ZoomControls zoom={zoom} onZoom={setZoom} />}
      {expandable && (
        <>
          <button
            type="button"
            className="absolute bottom-1 right-1 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/20 bg-surface/80 text-fg shadow backdrop-blur transition hover:bg-surface"
            onClick={() => setFullscreen(true)}
            aria-label={`View ${formatName(name)} full screen`}
            data-testid="model-expand"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
          <ModelFullscreen
            open={fullscreen}
            onClose={() => setFullscreen(false)}
            id={id}
            name={name}
            modelUrl={modelUrl}
            home={home}
            artwork={artwork}
            sprite={sprite}
            flip={flip}
          />
        </>
      )}
      {interactive && showHint && !zoomable && (
        <span className="pointer-events-none absolute inset-x-0 -bottom-5 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">
          Drag to rotate
        </span>
      )}
    </div>
  );
}

interface ModelFullscreenProps {
  open: boolean;
  onClose: () => void;
  id: number;
  name: string;
  modelUrl: string | null;
  home?: string | null;
  artwork?: string | null;
  sprite?: string | null;
  flip?: boolean;
}

/** Full-viewport viewer: large model, drag to rotate, wheel / pinch / buttons to zoom, optional browser fullscreen. */
function ModelFullscreen({ open, onClose, id, name, modelUrl, home, artwork, sprite, flip }: ModelFullscreenProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [browserFs, setBrowserFs] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  useEffect(() => {
    const onChange = () => setBrowserFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleBrowserFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await ref.current?.requestFullscreen();
    } catch {
      /* Fullscreen API unavailable or denied; the overlay already fills the viewport. */
    }
  };

  const close = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    onClose();
  };

  const iconBtn = "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 transition hover:bg-white/15";

  return (
    <dialog
      ref={ref}
      aria-label={`${formatName(name)} full screen 3D viewer`}
      onClose={(e) => {
        // React bubbles `close` through the component tree; keep it from closing a parent dialog.
        e.stopPropagation();
        close();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-white backdrop:bg-black"
      data-testid="model-fullscreen"
    >
      {open && (
        <div className="relative h-full w-full bg-[radial-gradient(70%_60%_at_50%_45%,#1d2a4a_0%,#0a0f1f_70%,#04060d_100%)]">
          <div className="absolute inset-0">
            <Pokemon3D
              id={id}
              name={name}
              modelUrl={modelUrl}
              home={home}
              artwork={artwork}
              sprite={sprite}
              flip={flip}
              interactive
              sway
              zoomable
              priority
              className="!aspect-auto h-full w-full"
            />
          </div>
          <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <h2 className="font-display text-xl font-bold drop-shadow sm:text-2xl">{formatName(name)}</h2>
            <p className="hidden text-xs text-white/70 md:block">Drag to rotate · Scroll, pinch or use + / − to zoom · 0 resets · Esc closes</p>
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleBrowserFullscreen}
                className={iconBtn}
                aria-label={browserFs ? "Exit browser full screen" : "Enter browser full screen"}
                data-testid="browser-fullscreen"
              >
                {browserFs ? <Minimize2 className="h-5 w-5" aria-hidden /> : <Maximize2 className="h-5 w-5" aria-hidden />}
              </button>
              <button type="button" onClick={close} className={iconBtn} aria-label="Close full screen viewer" data-testid="model-close">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </header>
        </div>
      )}
    </dialog>
  );
}
