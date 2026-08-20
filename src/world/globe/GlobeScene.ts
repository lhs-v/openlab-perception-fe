import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  WebGLRenderer,
} from 'three'
import { FIELD_OF_VIEW, HALO_SCALE, REST_DISTANCE } from '../dive'
import type { Dot } from '../dots'
import type { PinSpec } from '../pins'
import { PinLayer } from './pinLayer'

export const GLOBE_RADIUS = 1

/** 자전 속도(라디안/초). 한 바퀴에 약 4분 — 눈에 띄되 어지럽지 않다. */
const SPIN_RATE = 0.026

export type GlobeSceneOptions = {
  canvas: HTMLCanvasElement
  dots: readonly Dot[]
  /** 품질 등급이 정하는 픽셀 비율 상한 */
  maxPixelRatio?: number
}

/**
 * 지구본 씬 하나.
 *
 * three.js에 닿는 코드는 이 파일 안에 가둔다. 바깥(`GlobeCanvas`, `World`)은
 * three.js를 import하지 않으므로, 다른 코드베이스로 옮길 때 렌더러를 통째로
 * 갈아끼워도 나머지가 그대로 산다.
 *
 * 스스로 돌지 않는다 — 계획 1의 `Clock`과 같은 이유로 `frame(now)`를 밖에서
 * 부른다. 그래야 품질 모니터가 같은 시각을 보고, 테스트가 시간을 통제할 수 있다.
 */
export class GlobeScene {
  #renderer: WebGLRenderer
  #scene = new Scene()
  #camera: PerspectiveCamera
  #globe = new Group()
  #points: Points | null = null
  #halo: Mesh | null = null
  /** 색은 안 쓰고 깊이만 쓰는 구. 지구 뒤편을 가린다 */
  #occluder: Mesh | null = null
  #pins = new PinLayer()
  /** 하강이 카메라를 잡고 있는 동안의 자세. null이면 자유 자전. */
  #pose: { spinY: number; distance: number } | null = null
  #maxPixelRatio: number
  #width = 1
  #height = 1
  #lastNow: number | null = null
  #disposed = false

  constructor(options: GlobeSceneOptions) {
    this.#maxPixelRatio = options.maxPixelRatio ?? 2

    this.#renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: false,
      alpha: true,
    })
    this.#renderer.setClearColor(0x000000, 0)

    this.#camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 100)
    this.#camera.position.set(0, 0, REST_DISTANCE)

    // 살짝 기울여야 극이 정면으로 오지 않아 구처럼 읽힌다
    this.#globe.rotation.z = 0.41
    this.#buildOccluder()
    this.#globe.add(this.#pins.group)
    this.#scene.add(this.#globe)

    this.#buildHalo()
    this.setDots(options.dots)
  }

  /** 지구본 위의 집들. 12개뿐이라 통째로 갈아끼운다. */
  setPins(specs: readonly PinSpec[]): void {
    if (this.#disposed) return
    this.#pins.setPins(specs)
  }

  /**
   * 하강 중 카메라 자세를 밖에서 잡는다. `null`을 주면 지금 각도에서
   * 자유 자전으로 돌아간다 — 원래 각도로 되돌리지 않는 것이 중요하다.
   * 되돌리면 시나리오에서 나올 때 지구가 홱 튄다.
   */
  setPose(pose: { spinY: number; distance: number } | null): void {
    if (this.#disposed) return
    this.#pose = pose
    if (pose) {
      this.#globe.rotation.y = pose.spinY
      this.#camera.position.z = pose.distance
    }
  }

  /** 품질 등급이 내려가면 점을 줄여 다시 만든다. */
  setDots(dots: readonly Dot[]): void {
    if (this.#disposed) return
    this.#disposePoints()

    const positions = new Float32Array(dots.length * 3)
    for (let i = 0; i < dots.length; i += 1) {
      const [x, y, z] = dots[i]!.position
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))

    const material = new PointsMaterial({
      color: new Color(0x2f6ea8),
      size: 0.011,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })

    this.#points = new Points(geometry, material)
    this.#globe.add(this.#points)
  }

  resize(width: number, height: number): void {
    if (this.#disposed) return
    this.#width = Math.max(1, width)
    this.#height = Math.max(1, height)
    this.#applySize()
  }

  /** 품질 등급이 픽셀 비율을 낮출 때. 즉시 반영한다. */
  setMaxPixelRatio(ratio: number): void {
    if (this.#disposed) return
    this.#maxPixelRatio = ratio
    this.#applySize()
  }

  /** 외부 구동. 앱에서는 rAF가, 테스트에서는 직접 부른다. */
  frame(now: number): void {
    if (this.#disposed) return
    if (this.#lastNow !== null && this.#pose === null) {
      const elapsed = (now - this.#lastNow) / 1000
      // 시계가 뒤로 가거나 탭이 오래 멈췄던 프레임은 건너뛴다.
      // 안 그러면 복귀하는 순간 지구가 홱 돌아간다.
      if (elapsed > 0 && elapsed < 1) this.#globe.rotation.y += SPIN_RATE * elapsed
    }
    this.#lastNow = now
    this.#pins.frame(now)
    this.#renderer.render(this.#scene, this.#camera)
  }

  /** 지금 화면에 보이는 자전 각도(라디안). 하강이 여기서 이어받는다. */
  get spin(): number {
    return this.#globe.rotation.y
  }

  /** 지금 카메라 거리. 하강이 여기서 이어받는다. */
  get distance(): number {
    return this.#camera.position.z
  }

  /** three.js가 붙들고 있는 자원 수. 무인 구동 누수를 e2e에서 확인하는 데 쓴다. */
  get info(): { geometries: number; textures: number; programs: number } {
    return {
      geometries: this.#renderer.info.memory.geometries,
      textures: this.#renderer.info.memory.textures,
      programs: this.#renderer.info.programs?.length ?? 0,
    }
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true

    this.#disposePoints()
    this.#pins.dispose()

    if (this.#occluder) {
      this.#globe.remove(this.#occluder)
      this.#occluder.geometry.dispose()
      ;(this.#occluder.material as MeshBasicMaterial).dispose()
      this.#occluder = null
    }

    if (this.#halo) {
      this.#scene.remove(this.#halo)
      this.#halo.geometry.dispose()
      ;(this.#halo.material as ShaderMaterial).dispose()
      this.#halo = null
    }

    this.#scene.clear()
    this.#renderer.dispose()
  }

  #applySize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, this.#maxPixelRatio)
    this.#renderer.setPixelRatio(ratio)
    this.#renderer.setSize(this.#width, this.#height, false)
    this.#camera.aspect = this.#width / this.#height
    this.#camera.updateProjectionMatrix()
  }

  #disposePoints(): void {
    if (!this.#points) return
    this.#globe.remove(this.#points)
    this.#points.geometry.dispose()
    ;(this.#points.material as PointsMaterial).dispose()
    this.#points = null
  }

  /**
   * 지구를 불투명하게 만드는 장치.
   *
   * 육지 점도 핀도 깊이를 쓰지 않으므로, 이게 없으면 지구 뒤편의 점과 핀이
   * 앞면 위에 그대로 겹쳐 그려진다. 그러면 자전해도 뒤로 넘어가는 것이
   * 없어서 핀들이 지구에 붙어 있지 않고 화면에 고정된 것처럼 보인다.
   *
   * 색은 쓰지 않고 깊이 버퍼만 채운다. 반지름을 살짝 줄여 표면의 점들이
   * 자기 자신에게 가려지지 않게 한다.
   */
  #buildOccluder(): void {
    const geometry = new SphereGeometry(GLOBE_RADIUS * 0.985, 48, 48)
    const material = new MeshBasicMaterial({ colorWrite: false })
    this.#occluder = new Mesh(geometry, material)
    // 불투명 물체가 먼저 그려져야 깊이가 채워진 뒤 점들이 시험된다
    this.#occluder.renderOrder = -1
    this.#globe.add(this.#occluder)
  }

  #buildHalo(): void {
    const geometry = new SphereGeometry(GLOBE_RADIUS * HALO_SCALE, 48, 48)
    const material = new ShaderMaterial({
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: BackSide,
      uniforms: { uColor: { value: new Color(0x4ea1ff) } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormal;
        void main() {
          // 가장자리로 갈수록 밝아지는 림. 안티에일리어싱을 끈 탓에 생기는
          // 계단현상을 이 그라데이션이 가려준다.
          float rim = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
          gl_FragColor = vec4(uColor, clamp(rim, 0.0, 1.0) * 0.55);
        }
      `,
    })

    this.#halo = new Mesh(geometry, material)
    this.#scene.add(this.#halo)
  }
}
