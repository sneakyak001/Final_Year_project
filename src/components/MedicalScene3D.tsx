import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Floating torus knot — represents complex medical data pathways
function TorusKnotMesh() {
    const meshRef = useRef<THREE.Mesh>(null);
    const mat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1d4ed8',
        emissive: '#0284c7',
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.9,
        wireframe: false,
    }), []);

    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * 0.18;
            meshRef.current.rotation.y += delta * 0.12;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
            <mesh ref={meshRef} material={mat} scale={0.9}>
                <torusKnotGeometry args={[1, 0.28, 128, 16, 2, 3]} />
            </mesh>
        </Float>
    );
}

// Orbiting ring system
function OrbitalRings() {
    const ring1 = useRef<THREE.Mesh>(null);
    const ring2 = useRef<THREE.Mesh>(null);
    const ring3 = useRef<THREE.Mesh>(null);

    useFrame((_, delta) => {
        if (ring1.current) ring1.current.rotation.z += delta * 0.3;
        if (ring2.current) ring2.current.rotation.x += delta * 0.2;
        if (ring3.current) ring3.current.rotation.y += delta * 0.15;
    });

    const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#38bdf8', emissive: '#0369a1', emissiveIntensity: 0.6,
        roughness: 0.05, metalness: 1, transparent: true, opacity: 0.7,
    }), []);

    return (
        <group>
            <mesh ref={ring1} material={ringMat} rotation={[Math.PI / 4, 0, 0]}>
                <torusGeometry args={[2.2, 0.04, 16, 100]} />
            </mesh>
            <mesh ref={ring2} material={ringMat} rotation={[0, Math.PI / 3, Math.PI / 6]}>
                <torusGeometry args={[2.8, 0.03, 16, 100]} />
            </mesh>
            <mesh ref={ring3} material={ringMat} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
                <torusGeometry args={[3.4, 0.025, 16, 100]} />
            </mesh>
        </group>
    );
}

// Icosahedron wireframe
function WireIcosa() {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.1;
            meshRef.current.rotation.z += delta * 0.07;
        }
    });
    return (
        <Float speed={0.8} floatIntensity={0.3}>
            <mesh ref={meshRef} scale={4.5}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial
                    color="#6366f1" emissive="#4f46e5" emissiveIntensity={0.3}
                    wireframe transparent opacity={0.12}
                />
            </mesh>
        </Float>
    );
}

export function MedicalScene3D() {
    return (
        <>
            <ambientLight intensity={0.3} />
            <pointLight position={[5, 5, 5]} intensity={4} color="#38bdf8" distance={30} />
            <pointLight position={[-5, -5, 3]} intensity={3} color="#818cf8" distance={25} />
            <WireIcosa />
            <OrbitalRings />
            <TorusKnotMesh />
        </>
    );
}
