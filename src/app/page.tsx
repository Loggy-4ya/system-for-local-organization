/**
 * @file src/app/page.tsx
 * @description Ультимативна налагоджувальна 3D-сцена для інтеграції та діагностики завантаження .3mf логотипу Nexus.
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
// Додаємо OrbitControls для ручного обльоту камери навколо сцени
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface NexusPlugin {
  object: THREE.Object3D;
  update(delta: number): void;
}

/**
 * Налагоджувальний плагін логотипу з глибоким логуванням вузлів моделі.
 */
class Nexus3mfLogoPlugin implements NexusPlugin {
  public object: THREE.Group;
  private modelGroup: THREE.Group | null = null;
  private clock: THREE.Timer;
  private targetSize: number = 4.0; 

  constructor(modelPath: string) {
    this.object = new THREE.Group();
    this.clock = new THREE.Timer();
    this.load3mfModel(modelPath);
  }

  private load3mfModel(path: string): void {
    console.log(`[NexusLoader] Ініціалізація завантаження моделі за шляхом: ${path}`);
    const loader = new ThreeMFLoader();
    
    loader.load(
      path,
      (object3mf: THREE.Group) => {
        this.modelGroup = object3mf;
        
        console.log('[NexusLoader] Файл успішно розпаковано. Структура об\'єкта:', this.modelGroup);

        let meshCount = 0;

        // Ітеруємося по всьому дереву об'єктів слайсера
        this.modelGroup.traverse((child) => {
          console.log(`[NexusLoader] Знайдено вузол типу: ${child.type}, Ім'я: ${child.name}`);
          
          if (child instanceof THREE.Mesh) {
            meshCount++;
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Примусово створюємо яскравий напівпрозорий матеріал, який видно за будь-якого освітлення
            child.material = new THREE.MeshStandardMaterial({
              color: 0x0001cc,       
              emissive: 0x0a0135,    
              roughness: 1,
              metalness: 1,
              side: THREE.DoubleSide,
              transparent: true
            });
            
            console.log(`[NexusLoader] Матеріал успішно замінено для Mesh ID: ${child.id}`);
          }
        });

        console.log(`[NexusLoader] Усього знайдено та оброблено полигональних Mesh-об'єктів: ${meshCount}`);

        if (meshCount === 0) {
          console.warn('[NexusLoader] Увага! Усередині .3mf файлу не знайдено жодного Mesh об\'єкта. Перевірте експорт моделі.');
        }

        // Розрахунок просторових меж
        const box = new THREE.Box3().setFromObject(this.modelGroup);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        
        box.getCenter(center);
        box.getSize(size);
        
        console.log(`[NexusLoader] Геометричні розміри моделі: X=${size.x}, Y=${size.y}, Z=${size.z}`);
        console.log(`[NexusLoader] Обчислений центр моделі: X=${center.x}, Y=${center.y}, Z=${center.z}`);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = this.targetSize / maxDim;
        this.modelGroup.scale.setScalar(scaleFactor);
        console.log(`[NexusLoader] Застосовано коефіцієнт масштабування: ${scaleFactor}`);

        // Зсув для вирівнювання по центру сцени
        this.modelGroup.position.set(
          -center.x * scaleFactor,
          -center.y * scaleFactor,
          -center.z * scaleFactor
        );

        this.object.add(this.modelGroup);

        // Конвертація Z-up (3D-друк) → Y-up (WebGL)
        this.object.rotation.set(-Math.PI / 2, 0, 0);
        console.log('[NexusLoader] Модель успішно інтегрована та відцентрована на сцені.');
      },
      (xhr: ProgressEvent) => {
        if (xhr.total > 0) {
          console.log(`[NexusLoader] Прогрес завантаження мережею: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
        }
      },
      (error: unknown) => {
        console.error('[NexusLoader] Критична помилка під час виконання loader.load():', error);
      }
    );
  }

  public update(delta: number): void {
    this.clock.update(delta * 1000);
    if (!this.modelGroup) return;

    // Обертання моделі
    this.object.rotation.z += delta * 0.2;

    // Плавна левітація
    const elapsedTime = performance.now() * 0.001;
    this.object.position.y = Math.sin(elapsedTime * 1.0) * 0.1;
  }
}

/**
 * Головний оркестратор 3D Сцени.
 */
class NexusEngine {
  private container: HTMLDivElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock: THREE.Timer;
  private controls!: OrbitControls;
  private plugins: NexusPlugin[] = [];
  private animationFrameId: number | null = null;
  private resizeHandler: () => void;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.clock = new THREE.Timer();

    this.initCore();
    this.initLights();
    this.initHelpers(); // Включаємо сітку для діагностики координатної системи
    this.initControls();

    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);

    this.startRenderLoop();
  }

  private initCore(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d); // Трохи світліший темний синій для контрасту з повною темрявою

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 2, 10); // Відсуваємо камеру трохи далі назад

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;

    this.container.appendChild(this.renderer.domElement);
  }

  private initLights(): void {
    // Збільшуємо яскравість загального світла, щоб модель було видно навіть без направлених променів
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 5.0);
    dirLight1.position.set(5, 12, 8);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00ffcc, 50.0);
    dirLight2.position.set(-5, -5, -3);
    this.scene.add(dirLight2);
  }

  /**
   * Створення допоміжних елементів діагностики сцени.
   * @private
   */
  private initHelpers(): void {
    // Намалює горизонтальну сітку на нульовому рівні осі Y
    const gridHelper = new THREE.GridHelper(10, 20, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -2; // Опускаємо сітку під модель
    this.scene.add(gridHelper);

    // Намалює осі координат (X = червона, Y = зелена, Z = синя)
    const axesHelper = new THREE.AxesHelper(3);
    this.scene.add(axesHelper);
    console.log('[NexusEngine] Допоміжні хелпери сцени (сітка та осі) успішно додані.');
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Плавність гальмування камери
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 20;
    this.controls.minDistance = 2;
  }

  private handleResize(): void {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public registerPlugin(plugin: NexusPlugin): void {
    this.plugins.push(plugin);
    this.scene.add(plugin.object);
  }

  private startRenderLoop(): void {
    const tick = (timestamp: number) => {
      this.animationFrameId = requestAnimationFrame(tick);

      this.clock.update(timestamp);
      const delta = this.clock.getDelta();

      // Оновлюємо стан OrbitControls на кожному кадрі
      this.controls.update();

      for (const plugin of this.plugins) {
        plugin.update(delta);
      }

      this.renderer.render(this.scene, this.camera);
    };
    
    requestAnimationFrame((timestamp) => tick(timestamp));
  }

  public dispose(): void {
    window.removeEventListener('resize', this.resizeHandler);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.controls.dispose();

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export default function NexusPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new NexusEngine(containerRef.current);
    
    // Переконайся, що файл лежить у папці: public/models/logo.3mf (назва латиницею!)
    const logoPlugin = new Nexus3mfLogoPlugin('/models/logo.3mf');
    engine.registerPlugin(logoPlugin);

    return () => {
      engine.dispose();
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a0f1d]">
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ width: '100vw', height: '100vh' }}
      />
    </main>
  );
}