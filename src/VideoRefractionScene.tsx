import { useRef, useState, useLayoutEffect } from "react";
import gsap from "gsap";
import * as THREE from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import VideoRenderTargets from "./VideoRenderTargets";
import { DragControls, Html } from "@react-three/drei";

function DraggableLens({
  initialPosition,
  size = [1, 1],
}: {
  initialPosition: [number, number, number];
  size?: [number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [dragging, setDragging] = useState(false);

  useFrame(() => {
    if (meshRef.current?.userData.uDrag) {
      const uDrag = meshRef.current.userData.uDrag;

      // Lerp the value
      const target = dragging ? 1 : 0;
      uDrag.value = THREE.MathUtils.lerp(uDrag.value, target, 0.1);
    }
  });

  return (
    <group onPointerOver={(e) => e.stopPropagation()}>
      <Html
        onPointerDown={(e) => e.stopPropagation()}
        onPointerOver={(e) => e.stopPropagation()}
        position={initialPosition}
        // transform
        style={{
          width: size[0] * 455 + "px",
          height: size[1] * 455 + "px",
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
          zIndex: -1000,
        }}
        scale={0.01}
      >
        <div className="video-tag">
          <div className="blur">turnstile</div>
        </div>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "10px",
            border: "0.1px solid rgba(255, 255, 255, 0.5)",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: -1000,
            fontWeight: "bold",
          }}
        ></div>
      </Html>
      <mesh
        ref={meshRef}
        position={initialPosition}
        // Add cursor style
        onPointerOver={() => (document.body.style.cursor = "grab")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
      >
        <planeGeometry args={[size[0], size[1]]} />
      </mesh>
    </group>
  );
}

export default function VideoRefractionScene() {
  const videoPlaneRef = useRef<THREE.Mesh>(null);
  const lensesGroupRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    if (lensesGroupRef.current) {
      gsap.fromTo(
        lensesGroupRef.current.scale,
        { x: 0, y: 0, z: 0 },
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.8,
          ease: "power3.inOut",
        }
      );
    }
  }, []);

  return (
    <>
      <group ref={lensesGroupRef} onPointerDown={(e) => e.stopPropagation()}>
        {/* @ts-ignore */}
        <DragControls onDrag={(e) => e.stopPropagation()}>
          <DraggableLens initialPosition={[1, 0.2, 2]} size={[1, 1]} />
        </DragControls>

        {/* @ts-ignore */}
        <DragControls onDrag={(e) => e.stopPropagation()}>
          <DraggableLens initialPosition={[-0.8, 0.3, 2]} size={[1, 0.5]} />
        </DragControls>

        {/* @ts-ignore */}
        <DragControls onDrag={(e) => e.stopPropagation()}>
          <DraggableLens initialPosition={[-0.4, -0.5, 2]} size={[1.5, 0.5]} />
        </DragControls>

        {/* @ts-ignore */}
        <DragControls onDrag={(e) => e.stopPropagation()}>
          <DraggableLens initialPosition={[0, -0.1, 2]} size={[2, 1]} />
        </DragControls>
      </group>
      {/* Video Plane - Main scene element */}

      {/* Lens Group */}

      <mesh
        onPointerDown={(e) => e.stopPropagation()} // Stop event from reaching video plane
        ref={videoPlaneRef}
        position={[0, 0, 0]}
        raycast={() => {
          null;
        }}
      >
        <planeGeometry args={[16 / 3, 9 / 3]} /> {/* 16:9 aspect ratio */}
      </mesh>

      <VideoRenderTargets
        lensesGroupRef={lensesGroupRef}
        videoPlaneRef={videoPlaneRef}
      />
    </>
  );
}
