import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

export default function Medical3DElement() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
            <mesh ref={meshRef} scale={1.5}>
                <Icosahedron args={[1, 1]}>
                    <MeshDistortMaterial
                        color="#4318FF"
                        attach="material"
                        distort={0.4}
                        speed={2}
                        roughness={0.2}
                        metalness={0.8}
                        wireframe={true}
                    />
                </Icosahedron>
            </mesh>
        </Float>
    );
}
