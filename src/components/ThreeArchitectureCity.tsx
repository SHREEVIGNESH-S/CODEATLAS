import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArchitectureGraph, CodeNode, CodeEdge, NodeType } from '../types/codeatlas';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Layers,
  Sparkles,
  Cpu,
  ShieldAlert,
  MessageSquareCode,
  Eye,
  Info,
  Compass,
  ArrowRight,
  ExternalLink,
  Play
} from 'lucide-react';

interface ThreeArchitectureCityProps {
  graph: ArchitectureGraph;
  selectedNode: CodeNode | null;
  onSelectNode: (node: CodeNode | null) => void;
  onAskTutorAboutNode: (node: CodeNode) => void;
  onAnalyzeImpactOfNode: (node: CodeNode) => void;
  onSwitchTo2D?: () => void;
}

export type ConnectionFilter = 'all' | 'imports' | 'calls' | 'inherits' | 'external';
export type EntityFilter = 'all' | 'module' | 'file' | 'class' | 'function' | 'dependency';

export const ThreeArchitectureCity: React.FC<ThreeArchitectureCityProps> = ({
  graph,
  selectedNode,
  onSelectNode,
  onAskTutorAboutNode,
  onAnalyzeImpactOfNode,
  onSwitchTo2D
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [hoveredNode, setHoveredNode] = useState<CodeNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<CodeEdge | null>(null);
  const [isOpeningCinematic, setIsOpeningCinematic] = useState(true);
  const [openingProgress, setOpeningProgress] = useState(0);

  // References for Three.js camera control & picking
  const cameraFocusTargetRef = useRef<THREE.Vector3 | null>(null);
  const resetCameraRef = useRef<() => void>(() => {});
  const focusNodeRef = useRef<(nodeId: string) => void>(() => {});

  // Spatial Layout mapping for nodes in 3D City
  const spatialLayout = useMemo(() => {
    const layout = new Map<string, { position: THREE.Vector3; scale: THREE.Vector3; color: number }>();

    // 1. Group files by module
    const modules = graph.nodes.filter((n) => n.type === 'module');
    const files = graph.nodes.filter((n) => n.type === 'file');
    const classes = graph.nodes.filter((n) => n.type === 'class');
    const functions = graph.nodes.filter((n) => n.type === 'function');
    const externals = graph.nodes.filter((n) => n.type === 'dependency');

    // Layout modules in a circular city district arrangement
    const modCount = Math.max(modules.length, 1);
    const districtRadius = 8.5;

    modules.forEach((mod, idx) => {
      const angle = (idx / modCount) * Math.PI * 2;
      const x = Math.cos(angle) * districtRadius;
      const z = Math.sin(angle) * districtRadius;
      const y = 1.6;

      layout.set(mod.id, {
        position: new THREE.Vector3(x, y, z),
        scale: new THREE.Vector3(2.2, 3.2, 2.2),
        color: 0x2563EB // Electric blue
      });
    });

    // Layout files around their parent modules
    files.forEach((file) => {
      const parentModId = `mod::${file.parentModule || 'core'}`;
      const modPos = layout.get(parentModId)?.position || new THREE.Vector3(0, 0, 0);

      // Hash-based offset for stable deterministic clustering
      const hash = Math.abs(file.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
      const subAngle = (hash % 12) * (Math.PI / 6);
      const subRadius = 2.8 + (hash % 3) * 0.8;
      const fx = modPos.x + Math.cos(subAngle) * subRadius;
      const fz = modPos.z + Math.sin(subAngle) * subRadius;
      const fy = 0.8;

      layout.set(file.id, {
        position: new THREE.Vector3(fx, fy, fz),
        scale: new THREE.Vector3(1.3, 1.6, 1.3),
        color: 0x3B82F6 // Blue tier
      });
    });

    // Layout classes near files
    classes.forEach((cls) => {
      const fileId = `file::${cls.path}`;
      const filePos = layout.get(fileId)?.position || new THREE.Vector3(0, 0, 0);
      const hash = Math.abs(cls.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
      const cx = filePos.x + (hash % 2 === 0 ? 1.0 : -1.0);
      const cz = filePos.z + (hash % 3 === 0 ? 1.0 : -1.0);
      const cy = 1.9;

      layout.set(cls.id, {
        position: new THREE.Vector3(cx, cy, cz),
        scale: new THREE.Vector3(0.9, 1.2, 0.9),
        color: 0x10B981 // Emerald class
      });
    });

    // Layout functions as glowing quantum pods elevated above files/classes
    functions.forEach((fn) => {
      const fileId = `file::${fn.path}`;
      const filePos = layout.get(fileId)?.position || new THREE.Vector3(0, 0, 0);
      const hash = Math.abs(fn.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
      const angle = (hash % 8) * (Math.PI / 4);
      const r = 1.4 + (hash % 4) * 0.4;
      const px = filePos.x + Math.cos(angle) * r;
      const pz = filePos.z + Math.sin(angle) * r;
      const py = 2.4 + (hash % 5) * 0.35;

      layout.set(fn.id, {
        position: new THREE.Vector3(px, py, pz),
        scale: new THREE.Vector3(0.55, 0.55, 0.55),
        color: 0x06B6D4 // Cyan glowing pod
      });
    });

    // Layout external dependencies on an outer celestial orbit
    const extCount = Math.max(externals.length, 1);
    const orbitRadius = 15.0;
    externals.forEach((ext, idx) => {
      const angle = (idx / extCount) * Math.PI * 2 + Math.PI / 4;
      const ex = Math.cos(angle) * orbitRadius;
      const ez = Math.sin(angle) * orbitRadius;
      const ey = 3.5 + Math.sin(idx) * 1.2;

      layout.set(ext.id, {
        position: new THREE.Vector3(ex, ey, ez),
        scale: new THREE.Vector3(1.2, 1.2, 1.2),
        color: 0x8B5CF6 // Violet beacon
      });
    });

    return layout;
  }, [graph.nodes]);

  // Three.js Scene Setup & Animation Lifecycle
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 700;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC);
    scene.fog = new THREE.FogExp2(0xF8FAFC, 0.018);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    const initialCamPos = new THREE.Vector3(18, 16, 24);
    camera.position.copy(initialCamPos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio 3-Point Lighting
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 3.2);
    keyLight.position.set(15, 25, 20);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xEEF5FF, 2.0);
    fillLight.position.set(-20, 15, -15);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0xF8FAFC, 0xCBD5E1, 1.4);
    scene.add(hemiLight);

    // Ground City Foundation Plane & Grid
    const gridHelper = new THREE.GridHelper(50, 50, 0x93C5FD, 0xE2E8F0);
    gridHelper.position.y = -0.02;
    scene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xF8FAFC,
      roughness: 0.8,
      metalness: 0.1
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = !isSoftwareGl;
    scene.add(groundMesh);

    // Root World Group
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Mesh maps for raycasting & animation
    const nodeMeshMap = new Map<string, THREE.Mesh>();
    const nodeMetaMap = new Map<THREE.Mesh, CodeNode>();
    const edgeCurves: Array<{ curve: THREE.QuadraticBezierCurve3; edge: CodeEdge; particles: THREE.Points }> = [];

    // Materials Library (PBR Glass & Polished Metals)
    const moduleMat = new THREE.MeshPhysicalMaterial({
      color: 0xEEF5FF,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.85,
      transmission: isSoftwareGl ? 0 : 0.6,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const fileMat = new THREE.MeshPhysicalMaterial({
      color: 0xF1F5F9,
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9,
      clearcoat: 0.8
    });

    const classMat = new THREE.MeshStandardMaterial({
      color: 0x10B981,
      roughness: 0.25,
      metalness: 0.6,
      emissive: 0x059669,
      emissiveIntensity: 0.3
    });

    const functionMat = new THREE.MeshStandardMaterial({
      color: 0x22D3EE,
      roughness: 0.15,
      metalness: 0.7,
      emissive: 0x06B6D4,
      emissiveIntensity: 0.8
    });

    const externalMat = new THREE.MeshStandardMaterial({
      color: 0x8B5CF6,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x7C3AED,
      emissiveIntensity: 0.5
    });

    // Build 3D Entities
    graph.nodes.forEach((node) => {
      const spatial = spatialLayout.get(node.id);
      if (!spatial) return;

      let geo: THREE.BufferGeometry;
      let mat: THREE.Material = fileMat;

      if (node.type === 'module') {
        geo = new THREE.BoxGeometry(spatial.scale.x, spatial.scale.y, spatial.scale.z);
        mat = moduleMat.clone();
        (mat as THREE.MeshPhysicalMaterial).color.set(0xE0F2FE);
      } else if (node.type === 'file') {
        geo = new THREE.BoxGeometry(spatial.scale.x, spatial.scale.y, spatial.scale.z);
        mat = fileMat.clone();
      } else if (node.type === 'class') {
        geo = new THREE.CylinderGeometry(spatial.scale.x * 0.5, spatial.scale.x * 0.6, spatial.scale.y, 8);
        mat = classMat;
      } else if (node.type === 'function') {
        geo = new THREE.OctahedronGeometry(spatial.scale.x * 0.5, 1);
        mat = functionMat;
      } else {
        // Dependency
        geo = new THREE.DodecahedronGeometry(spatial.scale.x * 0.6);
        mat = externalMat;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(spatial.position);
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;

      // Base footprint ring for grounding
      const ringGeo = new THREE.RingGeometry(spatial.scale.x * 0.45, spatial.scale.x * 0.6, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: spatial.color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(spatial.position.x, 0.01, spatial.position.z);
      worldGroup.add(ringMesh);

      worldGroup.add(mesh);
      nodeMeshMap.set(node.id, mesh);
      nodeMetaMap.set(mesh, node);
    });

    // Build 3D Curved Relationship Pathways & Particle Streams
    graph.edges.forEach((edge) => {
      const srcPos = spatialLayout.get(edge.source)?.position;
      const tgtPos = spatialLayout.get(edge.target)?.position;
      if (!srcPos || !tgtPos) return;

      // Calculate arched curve
      const midPoint = new THREE.Vector3()
        .addVectors(srcPos, tgtPos)
        .multiplyScalar(0.5);
      const dist = srcPos.distanceTo(tgtPos);
      midPoint.y += Math.min(dist * 0.35, 4.0);

      const curve = new THREE.QuadraticBezierCurve3(
        srcPos.clone(),
        midPoint.clone(),
        tgtPos.clone()
      );
      const points = curve.getPoints(isSoftwareGl ? 20 : 40);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

      // Color mapping by edge type
      let edgeColor = 0x3B82F6; // default blue imports
      if (edge.type === 'calls') edgeColor = 0x06B6D4; // cyan calls
      if (edge.type === 'inherits') edgeColor = 0x10B981; // emerald inherits
      if (edge.type === 'api' || edge.label === 'external') edgeColor = 0x8B5CF6; // violet

      const lineMat = new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: 0.45,
        linewidth: 1.5
      });
      const lineMesh = new THREE.Line(lineGeo, lineMat);
      worldGroup.add(lineMesh);

      // Energy stream particle along the curve
      const particleCount = isSoftwareGl ? 3 : 6;
      const particlePos = new Float32Array(particleCount * 3);
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

      const particleMat = new THREE.PointsMaterial({
        size: 0.22,
        color: edgeColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      worldGroup.add(particles);

      edgeCurves.push({ curve, edge, particles });
    });

    // Orbit Controls (Pure Mathematical Implementation for Smoothness)
    let isMouseDown = false;
    let isRightMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    let targetRotX = 0.55;
    let targetRotY = 0.75;
    let currentRotX = 0.55;
    let currentRotY = 0.75;

    let targetCamDist = 26;
    let currentCamDist = 26;
    const targetLookAt = new THREE.Vector3(0, 2, 0);
    const currentLookAt = new THREE.Vector3(0, 2, 0);

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      if (e.button === 0) isMouseDown = true;
      if (e.button === 2) isRightMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isMouseDown) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        targetRotY += dx * 0.006;
        targetRotX = Math.max(0.1, Math.min(Math.PI / 2.1, targetRotX + dy * 0.006));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else if (isRightMouseDown) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        const panSpeed = 0.025;
        targetLookAt.x -= dx * panSpeed;
        targetLookAt.z -= dy * panSpeed;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onMouseUp = () => {
      isMouseDown = false;
      isRightMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      targetCamDist = Math.max(6, Math.min(60, targetCamDist + e.deltaY * 0.02));
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    // Raycasting for interactive selection & hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(nodeMetaMap.keys());
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const hitNode = nodeMetaMap.get(hitMesh);
        if (hitNode) {
          onSelectNode(hitNode);
          targetLookAt.copy(hitMesh.position);
          targetCamDist = 12;
        }
      }
    };

    const onPointerMoveHover = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(nodeMetaMap.keys());
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const hitNode = nodeMetaMap.get(hitMesh);
        setHoveredNode(hitNode || null);
      } else {
        setHoveredNode(null);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('click', onPointerClick);
    window.addEventListener('mousemove', onPointerMoveHover);
    window.addEventListener('contextmenu', onContextMenu);

    // Camera Reset Exposure
    resetCameraRef.current = () => {
      targetRotX = 0.55;
      targetRotY = 0.75;
      targetCamDist = 26;
      targetLookAt.set(0, 2, 0);
    };

    focusNodeRef.current = (nodeId: string) => {
      const targetPos = spatialLayout.get(nodeId)?.position;
      if (targetPos) {
        targetLookAt.copy(targetPos);
        targetCamDist = 10;
        targetRotX = 0.45;
      }
    };

    // Cinematic Opening Progress & Animation Loop
    let animId = 0;
    let startTime = performance.now();
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      // Opening sequence progress (0 to 1 over 2.4s)
      const cinematicDuration = 2.4;
      const progress = Math.min(1.0, elapsed / cinematicDuration);
      setOpeningProgress(progress);
      if (progress >= 1.0) {
        setIsOpeningCinematic(false);
      }

      // Smooth camera interpolation
      currentRotX = THREE.MathUtils.damp(currentRotX, targetRotX, 4, delta);
      currentRotY = THREE.MathUtils.damp(currentRotY, targetRotY, 4, delta);
      currentCamDist = THREE.MathUtils.damp(currentCamDist, targetCamDist, 4, delta);
      currentLookAt.lerp(targetLookAt, 4 * delta);

      // Compute camera position from spherical coordinates
      const camY = Math.sin(currentRotX) * currentCamDist;
      const horizontalDist = Math.cos(currentRotX) * currentCamDist;
      const camX = Math.sin(currentRotY) * horizontalDist;
      const camZ = Math.cos(currentRotY) * horizontalDist;

      camera.position.set(currentLookAt.x + camX, currentLookAt.y + camY, currentLookAt.z + camZ);
      camera.lookAt(currentLookAt);

      // Animate flowing particle energy along connection pathways
      edgeCurves.forEach(({ curve, particles }) => {
        const positions = particles.geometry.attributes.position.array as Float32Array;
        const pCount = positions.length / 3;
        for (let i = 0; i < pCount; i++) {
          const t = ((elapsed * 0.45 + i / pCount) % 1.0);
          const clampedT = Math.max(0.001, Math.min(0.999, t));
          const pt = curve.getPoint(clampedT);
          if (pt) {
            positions[i * 3] = pt.x;
            positions[i * 3 + 1] = pt.y;
            positions[i * 3 + 2] = pt.z;
          }
        }
        particles.geometry.attributes.position.needsUpdate = true;
      });

      // Opening emergence animation: scale objects up progressively
      if (progress < 1.0) {
        const ease = 1 - Math.pow(1 - progress, 3);
        worldGroup.scale.set(ease, ease, ease);
        worldGroup.rotation.y = (1 - ease) * 0.5;
      } else {
        worldGroup.scale.set(1, 1, 1);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('click', onPointerClick);
      window.removeEventListener('mousemove', onPointerMoveHover);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      moduleMat.dispose();
      fileMat.dispose();
      classMat.dispose();
      functionMat.dispose();
      externalMat.dispose();
      gridHelper.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [graph, spatialLayout]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Filtered nodes based on search
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return graph.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.path.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 6);
  }, [graph.nodes, searchTerm]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm bg-[#F8FAFC] select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[780px]'
      }`}
    >
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Top Control HUD */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
        
        {/* Left: Mode Title & Search */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Living Software Universe</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded">
                  3D City
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                {graph.stats.modules} Modules • {graph.stats.files} Files • {graph.stats.functions} Functions
              </div>
            </div>
          </div>

          {/* Quick Search in 3D */}
          <div className="relative">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Find in 3D city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm w-48 sm:w-60"
              />
            </div>

            {/* Live Search Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 mt-1.5 w-64 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 z-30">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => {
                      onSelectNode(res);
                      focusNodeRef.current(res.id);
                      setSearchTerm('');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="truncate">
                      <span className="font-bold text-slate-900">{res.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({res.type})</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Camera & View Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onSwitchTo2D && (
            <button
              onClick={onSwitchTo2D}
              className="px-3 py-2 bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>2D Flow View</span>
            </button>
          )}

          <button
            onClick={() => resetCameraRef.current()}
            className="p-2 bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 rounded-xl border border-slate-200 shadow-sm transition cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white/90 backdrop-blur-md hover:bg-white text-slate-700 rounded-xl border border-slate-200 shadow-sm transition cursor-pointer"
            title="Toggle Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Floating Bottom Left: 3D City Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-md text-xs space-y-1.5 pointer-events-auto z-20 max-w-xs hidden sm:block">
        <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          City Hierarchy Legend
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-600" />
            <span className="text-slate-700 font-medium">Core Modules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-300" />
            <span className="text-slate-700 font-medium">Source Files</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-slate-700 font-medium">Classes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-700 font-medium">Functions</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-700 font-medium">External Orbit Dependencies</span>
          </div>
        </div>
      </div>

      {/* Hover Tooltip Float */}
      {hoveredNode && !selectedNode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3.5 py-2 rounded-xl text-xs backdrop-blur-md pointer-events-none z-20 shadow-lg flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500">
            {hoveredNode.type}
          </span>
          <span className="font-bold">{hoveredNode.name}</span>
          <span className="text-slate-400 text-[11px]">({hoveredNode.path})</span>
        </div>
      )}

      {/* Floating Intelligent Detail Glass Panel (Right Drawer) */}
      {selectedNode && (
        <div className="absolute right-4 top-16 bottom-4 w-80 sm:w-96 bg-white/95 backdrop-blur-lg border border-slate-200/90 rounded-2xl shadow-2xl z-30 flex flex-col p-5 overflow-y-auto pointer-events-auto">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                {selectedNode.type}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {selectedNode.layer} Layer
              </span>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Title & Path */}
          <div className="mt-4">
            <h3 className="text-lg font-bold text-[#101828] break-all">{selectedNode.name}</h3>
            <p className="text-xs font-mono text-slate-500 mt-1">
              {selectedNode.path} (L{selectedNode.lineStart} - L{selectedNode.lineEnd})
            </p>
            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              {selectedNode.description}
            </p>
          </div>

          {/* Function Signature & Parameters (When selecting function) */}
          {selectedNode.type === 'function' && (
            <div className="mt-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1.5">
              <div className="font-bold text-blue-900 flex items-center justify-between">
                <span>Function Signature</span>
                <span className="text-[10px] font-mono text-blue-600">→ {selectedNode.returnType || 'void'}</span>
              </div>
              <div className="font-mono text-slate-700">
                {selectedNode.name}(
                {selectedNode.parameters?.join(', ') || ''}
                )
              </div>
            </div>
          )}

          {/* Callers & Callees (When selecting function) */}
          {selectedNode.type === 'function' && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Callers ({selectedNode.callers?.length || 0})</div>
                <div className="text-xs font-medium text-slate-800 mt-1 truncate">
                  {selectedNode.callers?.join(', ') || 'Root invocation'}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400">Calls ({selectedNode.callees?.length || 0})</div>
                <div className="text-xs font-medium text-slate-800 mt-1 truncate">
                  {selectedNode.callees?.join(', ') || 'Terminal leaf'}
                </div>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Complexity</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {selectedNode.metrics.cyclomatic} ({selectedNode.complexity})
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Lines</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {selectedNode.metrics.lines}
              </div>
            </div>
          </div>

          {/* Source Code Snippet */}
          {selectedNode.codeSnippet && (
            <div className="mt-4">
              <div className="text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Code Excerpt</span>
                <span className="text-[10px] font-mono text-slate-400">AST Source</span>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-44 border border-slate-800">
                {selectedNode.codeSnippet}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={() => onAskTutorAboutNode(selectedNode)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <MessageSquareCode className="w-4 h-4" />
              Ask AI Code Tutor About This Node
            </button>

            <button
              onClick={() => onAnalyzeImpactOfNode(selectedNode)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Analyze Change Impact
            </button>
          </div>

        </div>
      )}

      {/* Cinematic Opening Overlay Banner */}
      {isOpeningCinematic && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center pointer-events-none z-40 transition-opacity duration-700">
          <div className="bg-white/95 px-6 py-4 rounded-2xl border border-blue-200 shadow-xl flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <div>
              <div className="text-xs font-bold text-slate-900">
                Materializing 3D Living Software Universe...
              </div>
              <div className="text-[10px] text-slate-500">
                Building module towers, tiered floor classes & illuminated quantum pods
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
