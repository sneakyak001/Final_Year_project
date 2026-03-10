import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function DnaBackground() {
    const groupRef = useRef<THREE.Group>(null);
    const numPairs = 60;
    const radius = 3;
    const height = 20;
    const spacing = height / numPairs;

    const helixGeom = useMemo(() => new THREE.SphereGeometry(0.28, 16, 16), []);
    const rungGeom = useMemo(() => new THREE.CylinderGeometry(0.04, 0.04, radius * 2, 6), []);

    const matA = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.8,
        roughness: 0.1, metalness: 0.5
    }), []);
    const matB = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#818cf8', emissive: '#4f46e5', emissiveIntensity: 0.8,
        roughness: 0.1, metalness: 0.5
    }), []);
    const matRung = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#e2e8f0', transparent: true, opacity: 0.18, roughness: 0.5
    }), []);

    const pairs = useMemo(() => {
        const arr = [];
        for (let i = 0; i < numPairs; i++) {
            const y = -height / 2 + i * spacing;
            const angle = i * 0.45;
            arr.push({ y, angle });
        }
        return arr;
    }, []);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.25;
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.6;
            // Gentle breathing scale
            const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
            groupRef.current.scale.setScalar(breathe);
        }
    });

    return (
        <group ref={groupRef}>
            <pointLight position={[8, 0, 5]} intensity={3} color="#38bdf8" distance={30} />
            <pointLight position={[-8, 0, -5]} intensity={2} color="#818cf8" distance={30} />
            <ambientLight intensity={0.3} />
            {pairs.map(({ y, angle }, i) => {
                const xA = Math.cos(angle) * radius;
                const zA = Math.sin(angle) * radius;
                const xB = Math.cos(angle + Math.PI) * radius;
                const zB = Math.sin(angle + Math.PI) * radius;
                return (
                    <group key={i}>
                        <mesh geometry={helixGeom} material={matA} position={[xA, y, zA]} />
                        <mesh geometry={helixGeom} material={matB} position={[xB, y, zB]} />
                        <mesh geometry={rungGeom} material={matRung}
                            position={[0, y, 0]} rotation={[Math.PI / 2, 0, -angle]} />
                    </group>
                );
            })}
        </group>
    );
}
