import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows, PresentationControls } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function AbstractShape({ position, scale, materialColor, roughness, type }) {
  const meshRef = useRef();

  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} position={position} scale={scale}>
        {type === 'torus' && <torusGeometry args={[0.7, 0.2, 16, 100]} />}
        {type === 'octahedron' && <octahedronGeometry args={[1, 0]} />}
        {type === 'box' && <boxGeometry args={[1, 1, 1]} />}
        <meshStandardMaterial 
          color={materialColor} 
          roughness={roughness}
          metalness={0.8}
          envMapIntensity={1}
          wireframe={type === 'box'}
        />
      </mesh>
    </Float>
  );
}

function FloatingShapes() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <pointLight position={[-10, -10, -5]} color="#9333EA" intensity={2} />
      <pointLight position={[10, -10, 5]} color="#C084FC" intensity={2} />

      <PresentationControls
        global
        config={{ mass: 2, tension: 500 }}
        snap={{ mass: 4, tension: 1500 }}
        rotation={[0, 0.3, 0]}
        polar={[-Math.PI / 3, Math.PI / 3]}
        azimuth={[-Math.PI / 1.4, Math.PI / 2]}
      >
        <AbstractShape position={[-2, 1, 0]} scale={2} materialColor="#27272A" roughness={0.1} type="octahedron" />
        <AbstractShape position={[2, -1, -2]} scale={1.5} materialColor="#9333EA" roughness={0.3} type="torus" />
        <AbstractShape position={[0, -2.5, 1]} scale={1.2} materialColor="#C084FC" roughness={0.4} type="box" />
      </PresentationControls>

      <ContactShadows position={[0, -3.5, 0]} opacity={0.4} scale={20} blur={2} far={4} />
      <Environment preset="city" />
    </>
  );
}

export default function ThreeBackground() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}>
      <div className="three-bg-overlay" />
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} style={{ pointerEvents: 'auto' }}>
        <FloatingShapes />
      </Canvas>
    </div>
  );
}
