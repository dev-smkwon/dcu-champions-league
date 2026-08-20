"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type BowlBall = { id: string };
type Body = { id: string; mesh: THREE.Mesh; velocity: THREE.Vector3 };

const RADIUS = 0.56;
const BOWL_RADIUS = 3.05;
const FLOOR = -2.35;

export function DrawBowl3D({ balls, shuffling, disabled, onReveal }: { balls: BowlBall[]; shuffling: boolean; disabled: boolean; onReveal: (id: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const bodiesRef = useRef<Map<string, Body>>(new Map());
  const revealRef = useRef(onReveal);
  const disabledRef = useRef(disabled);
  const shuffleUntilRef = useRef(0);
  revealRef.current = onReveal;
  disabledRef.current = disabled;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.25, 11.5);
    camera.lookAt(0, -0.15, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x061434, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(-4, 7, 6);
    key.castShadow = true;
    scene.add(key);
    const blueLight = new THREE.PointLight(0x467cff, 22, 18);
    blueLight.position.set(3, 1, 3);
    scene.add(blueLight);

    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(BOWL_RADIUS + .12, 64, 40),
      new THREE.MeshPhysicalMaterial({ color: 0x9dbaff, transparent: true, opacity: .12, roughness: .08, metalness: .12, transmission: .42, side: THREE.DoubleSide, depthWrite: false })
    );
    glass.scale.y = .88;
    scene.add(glass);
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x9ebcff, metalness: .75, roughness: .18, transparent: true, opacity: .8 });
    const topRim = new THREE.Mesh(new THREE.TorusGeometry(BOWL_RADIUS + .1, .08, 16, 80), rimMaterial);
    topRim.rotation.x = Math.PI / 2;
    topRim.scale.set(1, 1, 1);
    topRim.position.y = 0;
    scene.add(topRim);
    const baseRim = topRim.clone();
    baseRim.position.y = FLOOR - .2;
    baseRim.scale.set(.24, .24, .24);
    scene.add(baseRim);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .16, 64), new THREE.MeshStandardMaterial({ color: 0x102967, metalness: .55, roughness: .3 }));
    floor.position.y = FLOOR - .16;
    floor.receiveShadow = true;
    scene.add(floor);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hitBall = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects([...bodiesRef.current.values()].map((body) => body.mesh))[0];
    };
    const click = (event: PointerEvent) => {
      if (disabledRef.current) return;
      const hit = hitBall(event);
      if (hit) { let target: THREE.Object3D | null = hit.object; while (target && !target.userData.id) target = target.parent; if (target?.userData.id) revealRef.current(target.userData.id as string); }
    };
    const pointerMove = (event: PointerEvent) => {
      renderer.domElement.style.cursor = !disabledRef.current && hitBall(event) ? "pointer" : "default";
    };
    const pointerLeave = () => { renderer.domElement.style.cursor = "default"; };
    renderer.domElement.addEventListener("pointerup", click);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerleave", pointerLeave);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    let last = performance.now();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, .025);
      last = now;
      const bodies = [...bodiesRef.current.values()];
      const mixing = now < shuffleUntilRef.current;
      for (const body of bodies) {
        if (mixing) {
          const p = body.mesh.position;
          body.velocity.x += (-p.z * 6.2 - p.x * .7) * dt;
          body.velocity.z += (p.x * 6.2 - p.z * .7) * dt;
          body.velocity.y += (8.2 + Math.sin(now * .016 + body.mesh.id) * 5.5) * dt;
          body.mesh.rotation.x += dt * 9;
          body.mesh.rotation.y += dt * 12;
        }
        body.velocity.y -= 8.8 * dt;
        body.velocity.multiplyScalar(Math.pow(.992, dt * 60));
        body.mesh.position.addScaledVector(body.velocity, dt);
        const normalized = new THREE.Vector3(body.mesh.position.x, body.mesh.position.y / .88, body.mesh.position.z);
        const distanceFromCenter = normalized.length();
        const limit = BOWL_RADIUS - RADIUS;
        if (distanceFromCenter > limit) {
          normalized.multiplyScalar(1 / distanceFromCenter);
          body.mesh.position.set(normalized.x * limit, normalized.y * limit * .88, normalized.z * limit);
          const normal = new THREE.Vector3(normalized.x, normalized.y / .88, normalized.z).normalize();
          const outwardSpeed = body.velocity.dot(normal);
          if (outwardSpeed > 0) body.velocity.addScaledVector(normal, -1.72 * outwardSpeed);
        }
      }
      for (let a = 0; a < bodies.length; a++) for (let b = a + 1; b < bodies.length; b++) {
        const delta = bodies[b].mesh.position.clone().sub(bodies[a].mesh.position);
        const distance = delta.length();
        if (distance > 0 && distance < RADIUS * 2) {
          const normal = delta.multiplyScalar(1 / distance);
          const overlap = RADIUS * 2 - distance;
          bodies[a].mesh.position.addScaledVector(normal, -overlap / 2);
          bodies[b].mesh.position.addScaledVector(normal, overlap / 2);
          const relative = bodies[b].velocity.clone().sub(bodies[a].velocity).dot(normal);
          if (relative < 0) { const impulse = normal.multiplyScalar(relative * .88); bodies[a].velocity.add(impulse); bodies[b].velocity.sub(impulse); }
        }
      }
      camera.position.x = mixing ? Math.sin(now * .02) * .14 : THREE.MathUtils.lerp(camera.position.x, 0, .08);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerup", click);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerleave", pointerLeave);
      for (const body of bodiesRef.current.values()) body.mesh.traverse((object) => { if (!(object instanceof THREE.Mesh)) return; object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => { if (material instanceof THREE.MeshBasicMaterial) material.map?.dispose(); material.dispose(); }); });
      bodiesRef.current.clear();
      renderer.dispose();
      sceneRef.current = null;
      host.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const bodies = bodiesRef.current;
    const scene = sceneRef.current;
    if (!scene) return;
    const ids = new Set(balls.map((ball) => ball.id));
    for (const [id, body] of bodies) if (!ids.has(id)) { body.mesh.parent?.remove(body.mesh); body.mesh.traverse((object) => { if (!(object instanceof THREE.Mesh)) return; object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => { if (material instanceof THREE.MeshBasicMaterial) material.map?.dispose(); material.dispose(); }); }); bodies.delete(id); }
    balls.forEach((ball, index) => {
      if (bodies.has(ball.id)) return;
      const material = new THREE.MeshPhysicalMaterial({ color: 0x2764df, metalness: .16, roughness: .22, clearcoat: 1, clearcoatRoughness: .12 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 40, 28), material);
      const seam = new THREE.Mesh(new THREE.TorusGeometry(.485, .022, 10, 48), new THREE.MeshStandardMaterial({ color: 0x6f96ed, metalness: .7, roughness: .2 }));
      seam.rotation.x = Math.PI / 2;
      mesh.add(seam);
      const angle = index * 2.39;
      mesh.position.set(Math.cos(angle) * (1.1 + index % 2 * .65), FLOOR + RADIUS + Math.floor(index / 4) * 1.05, Math.sin(angle) * (1.1 + index % 2 * .65));
      mesh.castShadow = true;
      mesh.userData.id = ball.id;
      scene.add(mesh);
      bodies.set(ball.id, { id: ball.id, mesh, velocity: new THREE.Vector3() });
    });
  }, [balls]);

  useEffect(() => {
    if (!shuffling) return;
    shuffleUntilRef.current = performance.now() + 2200;
    for (const body of bodiesRef.current.values()) body.velocity.set((Math.random() - .5) * 7, 7 + Math.random() * 5, (Math.random() - .5) * 7);
  }, [shuffling]);

  return <div className={`draw-bowl-3d ${shuffling ? "is-mixing" : ""}`} ref={hostRef}><div className="bowl-glow"/><span className="bowl-caption">CLICK A CAPSULE TO OPEN</span></div>;
}
