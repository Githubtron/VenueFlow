import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ZoneSnapshot } from './ZoneHeatmap';

interface Stadium3DProps {
  zones: ZoneSnapshot[];
  onZoneClick?: (zoneId: string) => void;
}

const getHeatmapColor = (densityPercent: number): THREE.Color => {
  // Green -> Yellow -> Orange -> Red gradient based on density
  if (densityPercent < 25) return new THREE.Color(0x4ae176); // Green
  if (densityPercent < 50) return new THREE.Color(0x7dd74f); // Yellow-green
  if (densityPercent < 75) return new THREE.Color(0xf59e0b); // Orange
  return new THREE.Color(0xff5451); // Red
};

export function Stadium3D({ zones, onZoneClick }: Stadium3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111319);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Stadium ground
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x191b22,
      metalness: 0.3,
      roughness: 0.7,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create zone boxes
    const zonePositions = [
      // Row 0
      { pos: [-10, 0, -10], size: 3, zones: [0] },
      { pos: [-3, 0, -10], size: 3, zones: [1] },
      { pos: [4, 0, -10], size: 3, zones: [2] },
      { pos: [11, 0, -10], size: 3, zones: [3] },
      // Row 1
      { pos: [-10, 0, -3], size: 3, zones: [4] },
      { pos: [-3, 0, -3], size: 3, zones: [5] },
      { pos: [4, 0, -3], size: 3, zones: [6] },
      { pos: [11, 0, -3], size: 3, zones: [7] },
      // Row 2
      { pos: [-10, 0, 4], size: 3, zones: [8] },
      { pos: [-3, 0, 4], size: 3, zones: [9] },
      { pos: [4, 0, 4], size: 3, zones: [10] },
      { pos: [11, 0, 4], size: 3, zones: [11] },
    ];

    zones.forEach((zone, index) => {
      if (index >= zonePositions.length) return;

      const pos = zonePositions[index].pos;
      const size = zonePositions[index].size;
      const color = getHeatmapColor(zone.densityPercent);

      // Zone box
      const geometry = new THREE.BoxGeometry(size, size * 0.8, size);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.5,
        roughness: 0.5,
        emissive: color,
        emissiveIntensity: zone.densityPercent / 150,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.zoneId = zone.zoneId;

      scene.add(mesh);
      meshesRef.current.set(zone.zoneId, mesh);

      // Add outline for critical zones
      if (zone.status === 'red') {
        const outlineGeometry = new THREE.BoxGeometry(size + 0.2, size * 0.8 + 0.2, size + 0.2);
        const outlineMaterial = new THREE.MeshBasicMaterial({
          color: 0xff5451,
          wireframe: true,
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.position.copy(mesh.position);
        scene.add(outline);
      }
    });

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Rotate camera slowly
      camera.position.x = Math.sin(Date.now() * 0.0002) * 25;
      camera.position.z = Math.cos(Date.now() * 0.0002) * 25;
      camera.lookAt(0, 5, 0);

      // Pulse animation for critical zones
      zones.forEach((zone) => {
        const mesh = meshesRef.current.get(zone.zoneId);
        if (mesh && zone.status === 'red') {
          const scale = 1 + Math.sin(Date.now() * 0.005) * 0.05;
          mesh.scale.set(scale, scale, scale);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(meshesRef.current.values()));

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const zoneId = clickedMesh.userData.zoneId;
        onZoneClick?.(zoneId);
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [zones, onZoneClick]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '500px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#111319',
        border: '1px solid rgba(66, 71, 84, 0.2)',
      }}
    />
  );
}
