import * as THREE from "three/webgpu";
import {
  pass,
  mrt,
  output,
  velocity,
  uniform,
  texture,
  uv,
  vec4,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { motionBlur } from "three/addons/tsl/display/MotionBlur.js";
import { useThree, useFrame, extend } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useVideoTexture } from "@react-three/drei";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { Fn } from "three/src/nodes/TSL.js";

extend({ MeshBasicNodeMaterial });

export function WebGPURenderTargets({
  bloomStrength = 0.15,
  bloomRadius = 0.1,
  bloomThreshold = 0,
  motionBlurAmount = 1,
  enableMotionBlur = false,
}) {
  const { gl: renderer, scene, camera, size } = useThree();
  const postProcessingRef = useRef(null);
  const textureNodeRef = useRef(null);
  const materialRef = useRef < MeshBasicNodeMaterial > null;

  const videoTexture = useVideoTexture("/video.mp4");
  const quadRef = useRef(null);

  useEffect(() => {
    if (!renderer || !scene || !camera) return;

    // Create scene pass with filters
    const scenePass = pass(scene, camera, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    scenePass.setMRT(
      mrt({
        output: output, // whats is output in screen
        velocity: velocity,
      })
    );

    const scenePassColor = scenePass.getTextureNode("output");
    const scenePassVelocity = scenePass.getTextureNode("velocity");

    const videoTextureNode = texture(videoTexture, uv());

    const blurAmount = uniform(motionBlurAmount);
    const velocityScaled = scenePassVelocity.mul(blurAmount);
    const afterMotionBlur = enableMotionBlur
      ? motionBlur(videoTextureNode, velocityScaled)
      : videoTextureNode;

    const bloomPass = bloom(
      afterMotionBlur,
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    const withBloom = afterMotionBlur.add(bloomPass);

    const finalOutput = withBloom;
    textureNodeRef.current = finalOutput;

    const postProcessing = new THREE.PostProcessing(renderer);
    postProcessing.outputNode = scenePassColor;
    postProcessingRef.current = postProcessing;

    if (postProcessingRef.current.setSize) {
      postProcessingRef.current.setSize(size.width, size.height);
      postProcessingRef.current.needsUpdate = true;
    }

    return () => {
      postProcessingRef.current = null;
    };
  }, [
    renderer,
    scene,
    camera,
    size,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    motionBlurAmount,
    enableMotionBlur,
  ]);

  useEffect(() => {
      const mat = new MeshBasicNodeMaterial();
      console.log(textureNodeRef.current);
      mat.colorNode = Fn(() => {
        return vec4(1, 0, 0, 1);
      })();
      materialRef.current = mat;
  }, [materialRef.current]);

  useFrame(({ gl }) => {
    if (postProcessingRef.current) {
      gl.clear();
      postProcessingRef.current.render();
    }
  }, 1);

  return (
    <>
      <mesh ref={quadRef} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <primitive material={materialRef.current} attach="material" />
      </mesh>
    </>
  );
}
