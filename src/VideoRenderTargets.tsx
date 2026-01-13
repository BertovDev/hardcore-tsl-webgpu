import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { useVideoTexture, useTexture } from "@react-three/drei";
import {
  pass,
  texture,
  screenUV,
  Fn,
  positionLocal,
  uniform,
  vec2,
} from "three/tsl";

type Props = {
  lensesGroupRef: React.RefObject<THREE.Mesh | null>; // Group containing all Lens meshes
  videoPlaneRef: React.RefObject<THREE.Mesh | null>; // The "Main Scene" plane with video
};

export default function VideoRenderTargets({
  lensesGroupRef,
  videoPlaneRef,
}: Props) {
  const gl = useThree((state) => state.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const videoTexture = useVideoTexture("/video.mp4");
  const noiseTexture = useTexture("/noise.png");

  const postProcessingRef = useRef<THREE.PostProcessing | null>(null);
  const rtPassRef = useRef<THREE.PassNode | null>(null);
  const rtPostProcessingRef = useRef<THREE.PostProcessing | null>(null);

  useEffect(() => {
    if (!gl || !lensesGroupRef.current || !videoPlaneRef.current) return;

    // 1. Setup Video Plane Material
    const videoMat = new THREE.MeshBasicNodeMaterial();
    videoMat.colorNode = texture(videoTexture as any);
    videoPlaneRef.current.material = videoMat;

    // Set explicit layers: Video on 0 (default), Lens on 1
    videoPlaneRef.current.layers.set(1);

    // Apply layers to all lenses
    lensesGroupRef.current.layers.set(0);

    // 2. Setup Render Target (Pass) - Renders Layer 0 only (by default camera sees 0)
    // We create a specific camera view for the RT if needed, but we can just manipulate the main camera in useFrame.
    const rtPass = pass(scene, camera);
    rtPass.setMRT(null);
    rtPassRef.current = rtPass;

    const rtTexture = rtPass.getTextureNode();

    // Setup RT PostProcessing
    const rtPostProcessing = new THREE.PostProcessing(gl);
    rtPostProcessing.outputNode = rtTexture;
    rtPostProcessingRef.current = rtPostProcessing;

    // Apply material to all lenses
    lensesGroupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const uDrag = uniform(0);
        obj.userData.uDrag = uDrag;

        const lensMat = new THREE.MeshBasicNodeMaterial();

        const uvOffset = Fn(() => {
          const noise = texture(noiseTexture).rgb;
          return noise.mul(uDrag).mul(0.02);
        })();

        lensMat.colorNode = Fn(() => {
          const uv = screenUV.add(uvOffset);
          const color = texture(rtTexture as any, uv);

          return color;
        })();

        lensMat.positionNode = Fn(() => {
          const pos = positionLocal;
          return pos;
        })();

        obj.material = lensMat;
      }
    });

    // 4. Setup Main Output - Renders Scene (Layer 0 + 1)
    const mainPostProcessing = new THREE.PostProcessing(gl);
    const mainPass = pass(scene, camera);
    mainPostProcessing.outputNode = mainPass.getTextureNode();
    postProcessingRef.current = mainPostProcessing;

    return () => {
      postProcessingRef.current = null;
      rtPostProcessingRef.current = null;
    };
  }, [gl, scene, camera, videoTexture]);

  useFrame(() => {
    if (!gl || !rtPostProcessingRef.current || !postProcessingRef.current)
      return;
    if (!lensesGroupRef.current || !videoPlaneRef.current) return;

    // STEP A: Render Scene (Video Plane) to Render Target
    // Configure Camera to see only Layer 0 (Video Plane)
    camera.layers.set(1);

    // Ensure lenses are hidden if they were on layer 0 (they are on layer 1 but safer to be sure camera mask works)
    // The camera mask handles it.

    // We don't need to clear screen here as we are rendering to texture/offscreen mostly,
    // but if PostProcessing blits, it might touch screen.
    // However, we rely on the pass updating the rtTexture.
    rtPostProcessingRef.current.render();

    // STEP B: Render Main Scene (Lens Plane ONLY) to Screen
    // Configure Camera to see ONLY Layer 1 (Lens)
    camera.layers.set(0);

    // Now render to screen
    gl.clear();
    postProcessingRef.current.render();

    // Restore camera state if needed (though we rewrite it next frame)
    // Keeping it as is is fine.
  });

  return null;
}
