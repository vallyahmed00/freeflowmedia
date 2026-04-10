import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows, PresentationControls } from '@react-three/drei';
import { useRef, useMemo } from 'react';
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

function FloatingShapes({ isMobile }) {
  // Reduce complexity on mobile
  const shapes = useMemo(() => {
    if (isMobile) {
      return (
        <>
          <AbstractShape position={[0, 0, 0]} scale={1.5} materialColor="#9333EA" roughness={0.3} type="torus" />
        </>
      );
    }
    return (
      <>
        <AbstractShape position={[-2, 1, 0]} scale={2} materialColor="#27272A" roughness={0.1} type="octahedron" />
        <AbstractShape position={[2, -1, -2]} scale={1.5} materialColor="#9333EA" roughness={0.3} type="torus" />
        <AbstractShape position={[0, -2.5, 1]} scale={1.2} materialColor="#C084FC" roughness={0.4} type="box" />
      </>
    );
  }, [isMobile]);

  return (
    <>
      <ambientLight intensity={isMobile ? 0.3 : 0.5} />
      <directionalLight position={[10, 10, 5]} intensity={isMobile ? 1 : 1.5} />
      <pointLight position={[-10, -10, -5]} color="#9333EA" intensity={isMobile ? 1 : 2} />
      <pointLight position={[10, -10, 5]} color="#C084FC" intensity={isMobile ? 1 : 2} />

      {!isMobile && (
        <PresentationControls
          global
          config={{ mass: 2, tension: 500 }}
          snap={{ mass: 4, tension: 1500 }}
          rotation={[0, 0.3, 0]}
          polar={[-Math.PI / 3, Math.PI / 3]}
          azimuth={[-Math.PI / 1.4, Math.PI / 2]}
        >
          {shapes}
        </PresentationControls>
      )}
      {isMobile && shapes}

      <ContactShadows position={[0, -3.5, 0]} opacity={0.4} scale={20} blur={2} far={4} />
      <Environment preset="city" />
    </>
  );
}

export default function ThreeBackground() {
  // Detect mobile device
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Skip 3D on very old devices
  if (isMobile && window.innerWidth < 480) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none', background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.15) 0%, rgba(10,10,10,0.95) 100%)' }} />
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, pointerEvents: 'none' }}>
      <div className="three-bg-overlay" />
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        style={{ pointerEvents: 'auto' }}
        dpr={isMobile ? [1, 1.5] : [1, 2]} // Limit pixel ratio on mobile
        performance={{ min: 0.5 }} // Allow performance scaling
        gl={{ antialias: !isMobile, powerPreference: 'high-performance' }}
      >
        <FloatingShapes isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
