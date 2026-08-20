import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
} from 'three'
import { pinPulse, type PinSpec } from '../pins'

/**
 * 지구본 위의 핀 층.
 *
 * 12개뿐이라 메시를 하나씩 만들어도 되지만, 한 덩어리 `Points`에 셰이더로
 * 그리면 맥동을 GPU에서 처리할 수 있어 매 프레임 자바스크립트가 12개
 * 오브젝트를 건드리지 않아도 된다. 무인으로 며칠 도는 화면에서는 이런
 * 것들이 쌓인다.
 */
export class PinLayer {
  readonly group = new Group()

  #points: Points | null = null
  #material: ShaderMaterial | null = null
  #specs: readonly PinSpec[] = []

  setPins(specs: readonly PinSpec[]): void {
    this.dispose()
    this.#specs = specs
    if (specs.length === 0) return

    const positions = new Float32Array(specs.length * 3)
    const colors = new Float32Array(specs.length * 3)
    const pulses = new Float32Array(specs.length)

    specs.forEach((spec, i) => {
      const [x, y, z] = spec.position
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      colors[i * 3] = ((spec.color >> 16) & 0xff) / 255
      colors[i * 3 + 1] = ((spec.color >> 8) & 0xff) / 255
      colors[i * 3 + 2] = (spec.color & 0xff) / 255
    })

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('pinColor', new BufferAttribute(colors, 3))
    geometry.setAttribute('pulse', new BufferAttribute(pulses, 1))

    this.#material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uScale: { value: 260 } },
      vertexShader: `
        attribute vec3 pinColor;
        attribute float pulse;
        varying vec3 vColor;
        varying float vPulse;
        uniform float uScale;
        void main() {
          vColor = pinColor;
          vPulse = pulse;
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          // 맥동이 셀 때 굵어진다. 원근도 반영해 뒤쪽 핀이 작아진다.
          gl_PointSize = (4.0 + pulse * 9.0) * (uScale / -view.z);
          gl_Position = projectionMatrix * view;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vPulse;
        void main() {
          // 가운데가 단단하고 밖으로 번지는 점. 사각형으로 보이지 않게 한다.
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.06, d);
          float halo = smoothstep(0.5, 0.0, d) * 0.55 * vPulse;
          gl_FragColor = vec4(vColor, clamp(core * 0.9 + halo, 0.0, 1.0));
        }
      `,
    })

    this.#points = new Points(geometry, this.#material)
    this.group.add(this.#points)
  }

  /** 매 프레임 맥동만 갱신한다. 지오메트리는 다시 만들지 않는다. */
  frame(t: number): void {
    const points = this.#points
    if (!points) return
    const attribute = points.geometry.getAttribute('pulse') as BufferAttribute
    for (let i = 0; i < this.#specs.length; i += 1) {
      attribute.setX(i, pinPulse(this.#specs[i]!.severity, t))
    }
    attribute.needsUpdate = true
  }

  dispose(): void {
    if (this.#points) {
      this.group.remove(this.#points)
      this.#points.geometry.dispose()
      this.#points = null
    }
    this.#material?.dispose()
    this.#material = null
    this.#specs = []
  }
}
