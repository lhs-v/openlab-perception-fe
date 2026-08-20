import { z } from 'zod'

export const CAMERA_IDS = ['livingroom', 'entry', 'bedroom', 'rvc'] as const
export const cameraIdSchema = z.enum(CAMERA_IDS)
export type CameraId = z.infer<typeof cameraIdSchema>

export const modalitySchema = z.enum(['video', 'audio', 'sensor'])
export type Modality = z.infer<typeof modalitySchema>

export const SENSOR_KINDS = [
  'temperature', 'smoke', 'co', 'humidity', 'motion',
  'door', 'window', 'gas', 'water', 'lux', 'sound_db',
] as const
export const sensorKindSchema = z.enum(SENSOR_KINDS)
export type SensorKind = z.infer<typeof sensorKindSchema>

const timeMs = z.number().int().nonnegative()
/** 다른 레이어가 refs로 가리키는 식별자 */
const id = z.string().min(1)
/** 식별자가 아닌 짧은 문자열. source·trigger처럼 참조 그래프에 참여하지 않는다 */
const nonEmptyString = z.string().min(1)
const unitInterval = z.number().min(0).max(1)

export const l1EventSchema = z.object({
  id,
  t: timeMs,
  modality: modalitySchema,
  source: nonEmptyString,
  trigger: nonEmptyString,
  confidence: unitInterval.optional(),
})
export type L1Event = z.infer<typeof l1EventSchema>

export const l2DescriptionSchema = z.object({
  id,
  t: timeMs,
  refs: z.array(id).min(1),
  modality: modalitySchema,
  source: nonEmptyString,
  text: z.string().min(1),
})
export type L2Description = z.infer<typeof l2DescriptionSchema>

export const l3ContextSchema = z.object({
  id,
  t: timeMs,
  refs: z.array(id).min(1),
  text: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
})
export type L3Context = z.infer<typeof l3ContextSchema>

export const l4IntentSchema = z.object({
  id,
  t: timeMs,
  refs: z.array(id).min(1),
  intervene: z.boolean(),
  rationale: z.string().min(1),
  actions: z.array(z.string().min(1)).optional(),
  confidence: unitInterval.optional(),
})
export type L4Intent = z.infer<typeof l4IntentSchema>

export const rvcPathPointSchema = z.object({
  t: timeMs,
  x: unitInterval,
  y: unitInterval,
  heading: z.number(),
})
export type RvcPathPoint = z.infer<typeof rvcPathPointSchema>

export const cameraConfigSchema = z.object({
  label: z.string().min(1),
  path: z.array(rvcPathPointSchema).optional(),
})
export type CameraConfig = z.infer<typeof cameraConfigSchema>

export const sensorSchema = z.object({
  id,
  kind: sensorKindSchema,
  label: z.string().min(1),
  unit: z.string(),
  room: z.string().min(1),
  track: z.array(z.object({ t: timeMs, v: z.number() })).min(1),
  alarmAbove: z.number().optional(),
  alarmBelow: z.number().optional(),
})
export type Sensor = z.infer<typeof sensorSchema>

export const audioEventSchema = z.object({
  t: timeMs,
  label: z.string().min(1),
  peak: unitInterval,
})
export type AudioEvent = z.infer<typeof audioEventSchema>

export const localeSchema = z.object({
  city: z.string().min(1),
  country: z.string().length(2),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tz: z.string().min(1),
  localTimeLabel: z.string().min(1),
})
export type ScenarioLocale = z.infer<typeof localeSchema>

export const scenarioSchema = z.object({
  id,
  provisional: z.boolean(),
  title: z.string().min(1),
  summary: z.string().min(1),
  /**
   * 지구본 핀 위에 띄우는 한 글자. 무슨 일인지 간접적으로 알리는 용도이고,
   * 없으면 핀만 뜬다. 시나리오가 스스로 말하게 두는 편이, 지구본이 별도
   * 매핑표를 들고 시나리오마다 두 곳을 고치는 것보다 낫다.
   */
  icon: z.string().min(1).max(8).optional(),
  severity: z.enum(['critical', 'normal']),
  durationMs: z.number().int().positive(),
  locale: localeSchema,
  cameras: z.object({
    livingroom: cameraConfigSchema,
    entry: cameraConfigSchema,
    bedroom: cameraConfigSchema,
    rvc: cameraConfigSchema,
  }),
  sensors: z.array(sensorSchema),
  audio: z.object({ events: z.array(audioEventSchema) }),
  reasoning: z.object({
    l1: z.array(l1EventSchema),
    l2: z.array(l2DescriptionSchema),
    l3: z.array(l3ContextSchema),
    l4: l4IntentSchema,
  }),
})
export type Scenario = z.infer<typeof scenarioSchema>
