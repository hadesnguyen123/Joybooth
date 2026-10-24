import { FilesetResolver, FaceLandmarker, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

let landmarkerInstance: FaceLandmarker | null = null
let isInitializing = false
let initPromise: Promise<FaceLandmarker | null> | null = null

export interface FaceDetectionData {
  centerX: number
  centerY: number
  width: number
  height: number
  chinX: number
  chinY: number
  leftJawX: number
  leftJawY: number
  rightJawX: number
  rightJawY: number
  noseX: number
  noseY: number
}

/**
 * Khởi tạo MediaPipe FaceLandmarker 100% offline từ thư mục public/mediapipe
 */
export async function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (landmarkerInstance) return landmarkerInstance
  if (initPromise) return initPromise

  if (isInitializing) return null
  isInitializing = true

  initPromise = (async () => {
    try {
      // 1. Load WebAssembly từ file local trong public/mediapipe/wasm
      const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm')

      // 2. Load model face_landmarker.task từ public/mediapipe/models
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/mediapipe/models/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 4, // Hỗ trợ nhận diện tối đa 4 người cùng lúc trong booth
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      })

      landmarkerInstance = landmarker
      isInitializing = false
      return landmarker
    } catch (err) {
      console.warn('Cannot initialize MediaPipe FaceLandmarker offline, falling back to CDN:', err)
      try {
        // Fallback CDN nếu môi trường không load được relative path
        const cdnVision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        const landmarker = await FaceLandmarker.createFromOptions(cdnVision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 4,
        })
        landmarkerInstance = landmarker
        isInitializing = false
        return landmarker
      } catch (cdnErr) {
        console.error('Failed to load FaceLandmarker from CDN as well:', cdnErr)
        isInitializing = false
        return null
      }
    }
  })()

  return initPromise
}

/**
 * Trích xuất tọa độ trọng tâm, cằm và 2 bên xương hàm từ landmarks của từng khuôn mặt
 */
export function extractFaceData(
  result: FaceLandmarkerResult,
  mirror: boolean = true
): FaceDetectionData[] {
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    return []
  }

  const faces: FaceDetectionData[] = []

  for (const landmarks of result.faceLandmarks) {
    // MediaPipe landmark indices:
    // 1: Chóp mũi (Nose Tip)
    // 10: Giữa trán (Forehead Top)
    // 152: Điểm dưới cùng của cằm (Chin Tip)
    // 234: Xương hàm góc trái (Left Jaw Angle)
    // 454: Xương hàm góc phải (Right Jaw Angle)
    // 132: Xương gò má trái
    // 361: Xương gò má phải

    const nose = landmarks[1]
    const forehead = landmarks[10]
    const chin = landmarks[152]
    const leftJaw = landmarks[234]
    const rightJaw = landmarks[454]

    if (!nose || !chin || !leftJaw || !rightJaw || !forehead) continue

    // Tính toán bounding box
    let minX = 1, maxX = 0, minY = 1, maxY = 0
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }

    const width = maxX - minX
    const height = maxY - minY
    let centerX = (minX + maxX) / 2
    let chinX = chin.x
    let leftJawX = leftJaw.x
    let rightJawX = rightJaw.x
    let noseX = nose.x

    if (mirror) {
      centerX = 1 - centerX
      chinX = 1 - chinX
      const tempLeft = 1 - rightJawX
      rightJawX = 1 - leftJawX
      leftJawX = tempLeft
      noseX = 1 - noseX
    }

    faces.push({
      centerX,
      centerY: (minY + maxY) / 2,
      width,
      height,
      chinX,
      chinY: chin.y,
      leftJawX,
      leftJawY: leftJaw.y,
      rightJawX,
      rightJawY: rightJaw.y,
      noseX,
      noseY: nose.y,
    })
  }

  return faces
}
