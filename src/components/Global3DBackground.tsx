import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Enhanced particle field with connection-line effect and color cycling
export function Global3DBackground() {
    const count = 400;
    const mesh = useRef<THREE.InstancedMesh>(null);
    const light1 = useRef<THREE.PointLight>(null);
    const light2 = useRef<THREE.PointLight>(null);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const time = Math.random() * 100;
            const factor = 20 + Math.random() * 100;
            const speed = 0.003 + Math.random() / 400;
            const x = (Math.random() - 0.5) * 80;
            const y = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 40;
            temp.push({ time, factor, speed, x, y, z });
        }
        return temp;
    }, []);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        if (light1.current) {
            light1.current.position.x = Math.sin(t * 0.4) * 12;
            light1.current.position.y = Math.cos(t * 0.3) * 12;
            light1.current.position.z = Math.sin(t * 0.2) * 6;
        }
        if (light2.current) {
            light2.current.position.x = Math.cos(t * 0.3) * 10;
            light2.current.position.y = Math.sin(t * 0.4) * 10;
            light2.current.position.z = Math.cos(t * 0.5) * 8;
        }

        particles.forEach((particle, i) => {
            particle.time += particle.speed;
            const { time, factor, x, y, z } = particle;

            const xPos = x + Math.sin(time) * 3 + Math.cos(time * 0.5) * 1.5;
            const yPos = y + Math.cos(time) * 3 + Math.sin(time * 0.3) * 1.5;
            const zPos = z + Math.sin(time + factor) * 1.5;

            dummy.position.set(xPos, yPos, zPos);
            dummy.rotation.set(time * 0.15, time * 0.2, time * 0.1);
            const scale = 0.3 + Math.sin(time * 2) * 0.15;
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            mesh.current?.setMatrixAt(i, dummy.matrix);
        });

        if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <>
            <pointLight ref={light1} distance={60} intensity={3} color="#0284c7" />
            <pointLight ref={light2} distance={50} intensity={2} color="#7c3aed" />
            <ambientLight intensity={0.2} />
            <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
                <octahedronGeometry args={[0.18, 0]} />
                <meshStandardMaterial
                    color="#93c5fd"
                    emissive="#1d4ed8"
                    emissiveIntensity={0.4}
                    transparent
                    opacity={0.35}
                    roughness={0.05}
                    metalness={0.8}
                />
            </instancedMesh>
        </>
    );
}
