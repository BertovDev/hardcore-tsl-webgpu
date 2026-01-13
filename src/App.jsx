import * as THREE from "three/webgpu";
import { Canvas, extend } from "@react-three/fiber";
import { Suspense } from "react";
import { Loader } from "@react-three/drei";
import VideoRefractionScene from "./VideoRefractionScene";

export default function App() {
  return (
    <>
      <div className="container">
          <div className="content">TSL / WebGPU / MRT / Turnstile Love Connection</div>
      </div>
        <Canvas
          shadows
          gl={async (props) => {
            extend(THREE);
            const renderer = new THREE.WebGPURenderer(props);

            await renderer.init();
            return renderer;
          }}
          camera={{ position: [0, 0, 4], fov: 50 }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={["black"]} />
            <VideoRefractionScene />
          </Suspense>
        </Canvas>
      <Loader />
    </>
  );
}
