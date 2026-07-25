"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  FORMS,
  GLAZING,
  RETURN,
  ROOFS,
  shadeHex,
  type RoofKey,
  type Selection,
} from "./config";

/* ===========================================================================
   The extension, in three dimensions.

   Every mesh is generated from the numbers in config.ts rather than loaded from
   a model file, so the whole configurator ships as code. That is the point: an
   extension is a handful of boxes and one extruded roof profile, and generating
   them means a new option is a few numbers rather than a new asset to draw,
   export and keep in sync.

   Colour management: three enables it by default from 0.152, so
   `new THREE.Color('#8d5f4a')` already converts sRGB to the linear working
   space. Do not add `.convertSRGBToLinear()` on top - it double-darkens every
   finish.

   This module is only ever loaded on the client (`ssr: false` at the import
   site), so it may touch `document` at the top level.
   =========================================================================== */

const EAVE = 300;

/** WebGL support, worked out once. */
let webglSupport: boolean | null = null;
function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement("canvas");
    webglSupport = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function prefersReducedMotion(): boolean {
  return document.documentElement.classList.contains("reduced");
}

/**
 * Roof profile, drawn in section and extruded.
 *
 * A gable end is the triangle at each end of the ridge, so which way the roof
 * faces is decided by which axis the section is drawn across:
 *
 *   pitched - section across the width, extruded along the depth. The ridge
 *             runs front to back and the gable points at the garden, which is
 *             the shape people recognise and the one the hero draws.
 *   mono    - section across the depth, extruded along the width and turned a
 *             quarter turn, so the fall runs back to front. The high side ends
 *             up at the house and the gutter stays off the garden.
 */
function roofGeometry(
  kind: RoofKey,
  width: number,
  depth: number,
): THREE.BufferGeometry | null {
  if (kind === "flat") return null;

  const rise = ROOFS[kind].rise;
  const shape = new THREE.Shape();
  let geo: THREE.ExtrudeGeometry;

  if (kind === "pitched") {
    const half = width / 2 + EAVE;
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth + EAVE * 2,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -(depth / 2 + EAVE));
  } else {
    const half = depth / 2 + EAVE;
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    /* The quarter turn maps +x to -z, so the rise belongs on +x to end up at
       the back of the plot. */
    shape.lineTo(half, rise);
    shape.closePath();
    geo = new THREE.ExtrudeGeometry(shape, {
      depth: width + EAVE * 2,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -(width / 2 + EAVE));
    geo.rotateY(Math.PI / 2);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Procedural sky.
 *
 * Glass and slate need something to reflect. Without it the glazing renders as
 * flat grey paint and the whole thing looks like a toy.
 */
function Sky() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, "#dfe6f2");
    grad.addColorStop(0.56, "#9aa6b8");
    grad.addColorStop(1, "#4a4f5c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);
    /* Two soft highlights, so the glass reads as reflecting a sky with
       something in it rather than an even grey dome. */
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fillRect(28, 10, 66, 30);
    ctx.fillRect(168, 16, 44, 22);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }, []);

  useEffect(() => {
    const t = texture;
    return () => t?.dispose();
  }, [texture]);

  if (!texture) return null;
  return <Environment map={texture} />;
}

/**
 * A standard material whose colour eases rather than snaps.
 *
 * Changing a swatch should read as the building being re-clad, not as a
 * different building appearing. The material is reached through a ref and
 * eased inside the frame loop, which is the one place mutation belongs.
 */
function EasedMaterial({
  colour,
  roughness,
}: {
  colour: string;
  roughness: number;
}) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => new THREE.Color(colour), [colour]);

  /* Start on the first colour rather than easing up from black. */
  useEffect(() => {
    ref.current?.color.set(colour);
    // Only on mount: afterwards the frame loop owns this colour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    if (prefersReducedMotion()) {
      m.color.copy(target);
      return;
    }
    m.color.lerp(target, Math.min(1, delta * 7));
  });

  return <meshStandardMaterial ref={ref} roughness={roughness} />;
}

function Scene({ sel }: { sel: Selection }) {
  const form = FORMS[sel.form];
  const { width: W, depth: D, height: H } = form;
  const glazing = GLAZING[sel.glazing];

  const roofGeo = useMemo(() => roofGeometry(sel.roof, W, D), [sel.roof, W, D]);
  useEffect(() => {
    const g = roofGeo;
    return () => g?.dispose();
  }, [roofGeo]);

  /* Cladding is rougher than brick or render, and catches the light
     differently. Worth the one line. */
  const wallRoughness = sel.finishName.toLowerCase().includes("cladding")
    ? 0.95
    : 0.82;
  /* Single ply on a flat roof reads darker than slate on a pitch. */
  const roofColour = sel.roof === "flat" ? shadeHex("#474d57", -0.18) : "#474d57";

  /* Glazing sits on the front face, in the lower storey. The surround sits
     behind the glass and is slightly larger, so it reads as a frame around it;
     in front, it would simply be a dark slab covering the window. */
  const gW = W * glazing.widthRatio;
  const gH = 2200;
  const gY = gH / 2 + 150;
  const gZ = D / 2 + 40;
  const frameZ = gZ - 30;
  const mullions = glazing.leaves - 1;

  const twoStorey = sel.form === "double";
  const wrap = sel.form === "wrap";

  return (
    <>
      <Sky />

      <hemisphereLight args={[0xf4f7ff, 0x9c9484, 0.62]} />
      <directionalLight
        position={[6000, 9000, 7000]}
        intensity={0.92}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-9000}
        shadow-camera-right={9000}
        shadow-camera-top={9000}
        shadow-camera-bottom={-9000}
        shadow-camera-far={30000}
      />
      <directionalLight
        position={[-7000, 3000, 4000]}
        intensity={0.32}
        color={0xdbe6ff}
      />

      <group>
        {/* Main mass. */}
        <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[W, H, D]} />
          <EasedMaterial colour={sel.finish} roughness={wallRoughness} />
        </mesh>

        {/* Side return on a wraparound. Flat roofed whatever the main roof
            does, which is both simpler to build and what usually happens. */}
        {wrap ? (
          <>
            <mesh
              position={[
                -(W / 2) + RETURN.width / 2,
                H / 2,
                D / 2 + RETURN.depth / 2,
              ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[RETURN.width, H, RETURN.depth]} />
              <EasedMaterial colour={sel.finish} roughness={wallRoughness} />
            </mesh>
            <mesh
              position={[
                -(W / 2) + RETURN.width / 2,
                H + 90,
                D / 2 + RETURN.depth / 2,
              ]}
              castShadow
            >
              <boxGeometry
                args={[RETURN.width + 200, 180, RETURN.depth + 200]}
              />
              <meshStandardMaterial color="#c3bcae" roughness={0.7} />
            </mesh>
            {/* Glazed side door into the return. */}
            <mesh
              position={[
                -(W / 2) + RETURN.width / 2,
                1250,
                D / 2 + RETURN.depth + 30,
              ]}
            >
              <boxGeometry args={[RETURN.width * 0.6, 2100, 60]} />
              <meshPhysicalMaterial
                color="#8fb0d0"
                roughness={0.12}
                metalness={0}
                clearcoat={0.8}
                clearcoatRoughness={0.08}
                envMapIntensity={1.4}
              />
            </mesh>
          </>
        ) : null}

        {/* Roof. */}
        {roofGeo ? (
          <mesh geometry={roofGeo} position={[0, H, 0]} castShadow>
            <meshStandardMaterial color={roofColour} roughness={0.62} />
          </mesh>
        ) : (
          <>
            {/* Flat roof: a stone coping band, and the lantern that is the
                whole reason anyone chooses a flat roof. */}
            <mesh position={[0, H + 110, 0]} castShadow>
              <boxGeometry args={[W + 300, 220, D + 300]} />
              <meshStandardMaterial color="#c3bcae" roughness={0.7} />
            </mesh>
            <mesh position={[0, H + 500, 0]} castShadow>
              <boxGeometry args={[W * 0.42, 620, D * 0.46]} />
              <meshPhysicalMaterial
                color="#8fb0d0"
                roughness={0.12}
                metalness={0}
                clearcoat={0.8}
                clearcoatRoughness={0.08}
                envMapIntensity={1.4}
              />
            </mesh>
            <mesh position={[0, H + 830, 0]}>
              <boxGeometry args={[W * 0.44, 90, D * 0.48]} />
              <meshStandardMaterial
                color="#2b2f36"
                roughness={0.45}
                metalness={0.25}
              />
            </mesh>
          </>
        )}

        {/* Ground-floor glazing, with its frame and mullions. */}
        <mesh position={[0, gY, gZ]} castShadow>
          <boxGeometry args={[gW, gH, 70]} />
          <meshPhysicalMaterial
            color="#8fb0d0"
            roughness={0.12}
            metalness={0}
            clearcoat={0.8}
            clearcoatRoughness={0.08}
            envMapIntensity={1.4}
          />
        </mesh>
        <mesh position={[0, gY, frameZ]}>
          <boxGeometry args={[gW + 160, gH + 160, 60]} />
          <meshStandardMaterial
            color="#2b2f36"
            roughness={0.45}
            metalness={0.25}
          />
        </mesh>
        {Array.from({ length: mullions }, (_, i) => {
          const x = -gW / 2 + (gW / (mullions + 1)) * (i + 1);
          return (
            <mesh key={i} position={[x, gY, gZ + 40]}>
              <boxGeometry args={[70, gH, 40]} />
              <meshStandardMaterial
                color="#2b2f36"
                roughness={0.45}
                metalness={0.25}
              />
            </mesh>
          );
        })}

        {/* First-floor windows, only where there is a first floor. */}
        {twoStorey
          ? [-1, 1].map((side) => (
              <group key={side}>
                <mesh position={[side * (W * 0.24), H - 1150, gZ]}>
                  <boxGeometry args={[W * 0.3, 1400, 70]} />
                  <meshPhysicalMaterial
                    color="#8fb0d0"
                    roughness={0.12}
                    metalness={0}
                    clearcoat={0.8}
                    clearcoatRoughness={0.08}
                    envMapIntensity={1.4}
                  />
                </mesh>
                <mesh position={[side * (W * 0.24), H - 1150, frameZ]}>
                  <boxGeometry args={[W * 0.3 + 150, 1550, 60]} />
                  <meshStandardMaterial
                    color="#2b2f36"
                    roughness={0.45}
                    metalness={0.25}
                  />
                </mesh>
              </group>
            ))
          : null}
      </group>

      {/* Paving, and the plane the shadow lands on. Kept to a patio-sized
          apron: any larger and it reads as the subject rather than the ground
          the subject stands on. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 10, D / 2 + 1500]}
        receiveShadow
      >
        <planeGeometry args={[W + 1600, 2600]} />
        <meshStandardMaterial color="#8e8a82" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40000, 40000]} />
        <shadowMaterial opacity={0.2} />
      </mesh>

      <OrbitControls
        target={[0, 2100, 0]}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={Math.PI * 0.16}
        maxPolarAngle={Math.PI * 0.49}
        autoRotate={!prefersReducedMotion()}
        autoRotateSpeed={0.75}
      />
    </>
  );
}

export default function ProjectCanvas({ sel }: { sel: Selection }) {
  if (!hasWebGL()) {
    return (
      <p className="flex h-full items-center justify-center p-10 text-center text-sm text-navy-300">
        The 3D preview needs WebGL. Everything it configures is written out in
        the specification alongside.
      </p>
    );
  }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      /* Far enough back that the two-storey form still fits the frame without
         the camera moving between options. */
      camera={{ fov: 30, near: 50, far: 90000, position: [12500, 8200, 16000] }}
    >
      {/* The environment can suspend while it resolves. Without a boundary
          inside the canvas, that takes the whole scene down with it. */}
      <Suspense fallback={null}>
        <Scene sel={sel} />
      </Suspense>
    </Canvas>
  );
}
