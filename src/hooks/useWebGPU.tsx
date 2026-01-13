import { useThree } from "@react-three/fiber";
import { WebGPURenderer } from "three/webgpu";

export default function useWebGPU() {
  const gl = useThree((state) => state.gl);
  
  // The gl from useThree should already be the WebGPURenderer
  // since you're creating it in the Canvas gl prop
  return gl instanceof WebGPURenderer ? gl : null;
}