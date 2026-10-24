import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { getFaceLandmarker, extractFaceData, type FaceDetectionData } from '../lib/faceDetector'

export interface BeautyCameraHandle {
  captureFrame: () => string
  getVideoElement: () => HTMLVideoElement | null
  getImageElement: () => HTMLImageElement | null
  getCanvasElement: () => HTMLCanvasElement | null
}

interface BeautyCameraViewProps {
  stream?: MediaStream | null
  mjpegUrl?: string
  mirrorCamera: boolean
  slimFace: number // 0 - 100 (Thon gọn mặt V-line)
  skinSmoothing: number // 0 - 100 (Làm mịn da Bilateral)
  whiteningTone: number // 0 - 100 (Nâng tone trắng sáng)
  rosyTone: number // 0 - 100 (Trắng hồng tự nhiên)
  glowClarity: number // 0 - 100 (Sáng nét chi tiết)
  className?: string
  style?: React.CSSProperties
}

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`

const FRAGMENT_SHADER_SRC = `
precision mediump float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_slimFace;
uniform float u_skinSmooth;
uniform float u_whitening;
uniform float u_rosyTone;
uniform float u_clarity;
uniform bool u_mirror;

// ── Nhận diện khuôn mặt động MediaPipe ──
uniform int u_numFaces;
uniform vec4 u_faceBounds[4]; // (centerX, centerY, width, height)
uniform vec4 u_faceVLine[4];  // (chinX, chinY, noseX, noseY)
uniform vec4 u_faceJaw[4];    // (leftJawX, leftJawY, rightJawX, rightJawY)

varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    if (u_mirror) {
        uv.x = 1.0 - uv.x;
    }

    // ── 1. Thon Gọn Mặt V-Line Theo Tọa Độ Khuôn Mặt Thật (MediaPipe Tracking) ──
    if (u_slimFace > 0.0 && u_numFaces > 0) {
        for (int i = 0; i < 4; i++) {
            if (i >= u_numFaces) break;

            vec4 bounds = u_faceBounds[i];
            vec4 vline = u_faceVLine[i];
            float chinY = vline.y;
            float noseY = vline.w;
            float centerX = bounds.x;
            float faceW = bounds.z;
            float faceH = bounds.w;

            // Kiểm tra pixel có nằm trong vùng hàm dưới của khuôn mặt này không
            float dy = uv.y - noseY;
            float jawRange = max(chinY - noseY, 0.05);

            if (dy > 0.0 && uv.y < chinY + faceH * 0.08) {
                float yNorm = dy / jawRange; // 0 ở chóp mũi, 1 ở đáy cằm
                // Trọng số bóp hàm: cao nhất quanh góc xương hàm và gò má (0.35 - 0.85)
                float yWeight = smoothstep(0.05, 0.45, yNorm) * smoothstep(1.08, 0.82, yNorm);

                float dx = uv.x - centerX;
                float halfJawW = max(faceW * 0.52, 0.04);
                float xNorm = abs(dx) / halfJawW;

                if (xNorm < 1.0) {
                    // Warp co nhẹ nhàng về trục giữa khuôn mặt
                    float xWeight = smoothstep(1.0, 0.15, xNorm);
                    float warpFactor = (u_slimFace * 0.15) * yWeight * xWeight;
                    uv.x += dx * warpFactor;
                }
            }
        }
    }

    vec3 centerColor = texture2D(u_image, uv).rgb;

    // ── Kiểm tra mặt nạ da người (Skin Chrominance + Face Proximity) ──
    float isSkin = 0.0;
    // Chuyển sang không gian YCbCr để phát hiện màu da người
    float Cb = -0.168736 * centerColor.r - 0.331264 * centerColor.g + 0.5 * centerColor.b + 0.5;
    float Cr = 0.5 * centerColor.r - 0.418688 * centerColor.g - 0.081312 * centerColor.b + 0.5;
    bool colorIsSkin = (Cb >= 0.30 && Cb <= 0.52 && Cr >= 0.52 && Cr <= 0.72);

    if (u_numFaces > 0) {
        for (int i = 0; i < 4; i++) {
            if (i >= u_numFaces) break;
            vec4 bounds = u_faceBounds[i];
            vec2 fCenter = vec2(bounds.x, bounds.y);
            float fRad = max(bounds.z, bounds.w) * 0.65;
            float dFace = distance(uv, fCenter);
            if (dFace < fRad) {
                float prox = smoothstep(fRad, fRad * 0.8, dFace);
                if (colorIsSkin) {
                    isSkin = max(isSkin, prox);
                } else {
                    isSkin = max(isSkin, prox * 0.4);
                }
            }
        }
    } else {
        if (colorIsSkin) {
            isSkin = 1.0;
        }
    }

    // ── 2. Làm Mịn Da Bilateral Filter (Tập trung trên da người) ──
    vec3 smoothedColor = centerColor;
    if (u_skinSmooth > 0.05 && isSkin > 0.05) {
        vec3 sumColor = vec3(0.0);
        float sumWeight = 0.0;
        vec2 stepUV = vec2(1.0 / u_resolution.x, 1.0 / u_resolution.y);
        float radius = 1.0 + u_skinSmooth * 4.5;

        for (float x = -3.0; x <= 3.0; x += 1.0) {
            for (float y = -3.0; y <= 3.0; y += 1.0) {
                vec2 offset = vec2(x, y) * stepUV * (radius / 3.0);
                vec3 sampleColor = texture2D(u_image, uv + offset).rgb;

                float distSpatial = dot(vec2(x, y), vec2(x, y));
                float wSpatial = exp(-distSpatial / 9.0);

                float diff = distance(centerColor, sampleColor);
                float wRange = exp(-diff * diff / (0.012 + (1.0 - u_skinSmooth) * 0.02));

                float w = wSpatial * wRange;
                sumColor += sampleColor * w;
                sumWeight += w;
            }
        }
        vec3 skinFiltered = sumColor / max(sumWeight, 0.0001);
        smoothedColor = mix(centerColor, skinFiltered, isSkin);
    }

    // ── 3. Nâng Tone Trắng Sáng (Whitening: tập trung vào vùng da mặt) ──
    vec3 result = smoothedColor;
    if (u_whitening > 0.0) {
        float whiteEff = u_whitening * max(isSkin, 0.25);
        result = mix(result, 1.0 - (1.0 - result) * (1.0 - result), whiteEff * 0.28);
        result += vec3(whiteEff * 0.065);
    }

    // ── 4. Trắng Hồng Đào Tự Nhiên (Rosy Peach Tone) ──
    if (u_rosyTone > 0.0) {
        float rosyEff = u_rosyTone * max(isSkin, 0.35);
        result.r += rosyEff * 0.04;
        result.b += rosyEff * 0.02;
        result.g -= rosyEff * 0.015;
    }

    // ── 5. Sáng Nét Chi Tiết (Clarity / High-Pass Detail: bảo vệ mắt & tóc) ──
    if (u_clarity > 0.0) {
        vec3 detail = centerColor - smoothedColor;
        result += detail * (u_clarity * 0.45);
    }

    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}
`

export const BeautyCameraView = forwardRef<BeautyCameraHandle, BeautyCameraViewProps>(
  (
    {
      stream,
      mjpegUrl,
      mirrorCamera,
      slimFace,
      skinSmoothing,
      whiteningTone,
      rosyTone,
      glowClarity,
      className,
      style,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const glRef = useRef<WebGLRenderingContext | null>(null)
    const programRef = useRef<WebGLProgram | null>(null)
    const textureRef = useRef<WebGLTexture | null>(null)
    const animIdRef = useRef<number | null>(null)
    const renderDirectRef = useRef<(() => boolean) | null>(null)

    // Expose capture frame API to parent component with zero-black-screen guarantee
    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        // 1. Kích hoạt render đồng bộ 1 frame mới nhất vào buffer WebGL
        if (renderDirectRef.current) {
          renderDirectRef.current()
        }

        const gl = glRef.current
        const canvas = canvasRef.current

        // Kiểm tra xem buffer WebGL có thực sự chứa pixel hình ảnh (không bị đen do swapchain)
        let isWebGlBufferValid = false
        if (gl && canvas && canvas.width > 0 && canvas.height > 0) {
          try {
            gl.flush()
            gl.finish()

            // Lấy mẫu điểm ảnh ở trung tâm và hai bên
            const pCenter = new Uint8Array(4)
            gl.readPixels(
              Math.floor(canvas.width / 2),
              Math.floor(canvas.height / 2),
              1,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pCenter
            )

            // Nếu pixel trung tâm không phải màu đen tuyền (R + G + B > 8)
            if (pCenter[0] + pCenter[1] + pCenter[2] > 8) {
              isWebGlBufferValid = true
            } else {
              const pLeft = new Uint8Array(4)
              const pRight = new Uint8Array(4)
              gl.readPixels(
                Math.floor(canvas.width * 0.3),
                Math.floor(canvas.height * 0.5),
                1,
                1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pLeft
              )
              gl.readPixels(
                Math.floor(canvas.width * 0.7),
                Math.floor(canvas.height * 0.5),
                1,
                1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pRight
              )
              if (
                pLeft[0] + pLeft[1] + pLeft[2] > 8 ||
                pRight[0] + pRight[1] + pRight[2] > 8
              ) {
                isWebGlBufferValid = true
              }
            }

            if (isWebGlBufferValid) {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.98)
              if (dataUrl && dataUrl.length > 1000 && !dataUrl.startsWith('data:,')) {
                return dataUrl
              }
            }
          } catch (err) {
            console.warn('WebGL readPixels/toDataURL error:', err)
          }
        }

        // 2. Chụp trực tiếp từ Canon EDSDK MJPEG Image stream nếu đang kích hoạt
        if (mjpegUrl && imgRef.current && (imgRef.current.naturalWidth > 0 || imgRef.current.width > 0)) {
          try {
            const img = imgRef.current
            const w = img.naturalWidth || 1920
            const h = img.naturalHeight || 1080
            const off = document.createElement('canvas')
            off.width = w
            off.height = h
            const ctx = off.getContext('2d')
            if (ctx) {
              const filters: string[] = []
              if (whiteningTone > 0) {
                filters.push(`brightness(${(1 + (whiteningTone / 100) * 0.12).toFixed(3)})`)
              }
              if (skinSmoothing > 0) {
                filters.push(`blur(${(skinSmoothing * 0.005).toFixed(2)}px)`)
              }
              if (rosyTone > 0) {
                filters.push(`saturate(${(1 + (rosyTone / 100) * 0.15).toFixed(3)}) hue-rotate(-${(rosyTone * 0.08).toFixed(1)}deg)`)
              }
              if (filters.length > 0) {
                ctx.filter = filters.join(' ')
              }

              if (mirrorCamera) {
                ctx.translate(w, 0)
                ctx.scale(-1, 1)
              }
              if (slimFace > 0) {
                const scaleXFactor = 1 - (slimFace / 100) * 0.055
                const scaleYFactor = 1 + (slimFace / 100) * 0.015
                const cx = w / 2
                const cy = h / 2
                ctx.translate(cx, cy)
                ctx.scale(scaleXFactor, scaleYFactor)
                ctx.translate(-cx, -cy)
              }

              ctx.drawImage(img, 0, 0, w, h)
              const mjpegDataUrl = off.toDataURL('image/jpeg', 0.98)
              if (mjpegDataUrl && mjpegDataUrl.length > 1000) {
                return mjpegDataUrl
              }
            }
          } catch (mjpegErr) {
            console.warn('MJPEG 2D capture error:', mjpegErr)
          }
        }

        // 3. Dự phòng tuyệt đối 100%: Chụp trực tiếp từ HTMLVideoElement bằng Canvas 2D
        const video = videoRef.current
        if (video && (video.videoWidth > 0 || video.readyState >= 2)) {
          try {
            const w = video.videoWidth || 1920
            const h = video.videoHeight || 1080
            const off = document.createElement('canvas')
            off.width = w
            off.height = h
            const ctx = off.getContext('2d')
            if (ctx) {
              // Áp dụng bộ lọc làm đẹp trực tiếp trên 2D context
              const filters: string[] = []
              if (whiteningTone > 0) {
                filters.push(`brightness(${(1 + (whiteningTone / 100) * 0.12).toFixed(3)})`)
              }
              if (skinSmoothing > 0) {
                filters.push(`blur(${(skinSmoothing * 0.005).toFixed(2)}px)`)
              }
              if (rosyTone > 0) {
                filters.push(`saturate(${(1 + (rosyTone / 100) * 0.15).toFixed(3)}) hue-rotate(-${(rosyTone * 0.08).toFixed(1)}deg)`)
              }
              if (filters.length > 0) {
                ctx.filter = filters.join(' ')
              }

              if (mirrorCamera) {
                ctx.translate(w, 0)
                ctx.scale(-1, 1)
              }
              if (slimFace > 0) {
                const scaleXFactor = 1 - (slimFace / 100) * 0.055
                const scaleYFactor = 1 + (slimFace / 100) * 0.015
                const cx = w / 2
                const cy = h / 2
                ctx.translate(cx, cy)
                ctx.scale(scaleXFactor, scaleYFactor)
                ctx.translate(-cx, -cy)
              }

              if (mjpegUrl && imgRef.current) {
                ctx.drawImage(imgRef.current, 0, 0, w, h)
              } else if (video) {
                ctx.drawImage(video, 0, 0, w, h)
              }
              const fallbackUrl = off.toDataURL('image/jpeg', 0.98)
              if (fallbackUrl && fallbackUrl.length > 1000) {
                return fallbackUrl
              }
            }
          } catch (fallbackErr) {
            console.warn('Fallback 2D capture error:', fallbackErr)
          }
        }

        return ''
      },
      getVideoElement: () => videoRef.current,
      getImageElement: () => imgRef.current,
      getCanvasElement: () => canvasRef.current,
    }))

    // Gán stream cho video ngầm khi dùng webcam
    useEffect(() => {
      const video = videoRef.current
      if (!video) return

      if (stream && !mjpegUrl) {
        video.srcObject = stream
        const playVideo = () => {
          video.play().catch((err) => console.warn('Video play error:', err))
        }
        video.addEventListener('loadedmetadata', playVideo, { once: true })
        video.addEventListener('canplay', playVideo, { once: true })
        playVideo()
      } else {
        video.srcObject = null
      }
    }, [stream, mjpegUrl])

    // Khởi tạo WebGL Pipeline với preserveDrawingBuffer = true (BẮT BUỘC để toDataURL không bị đen)
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const glOptions: WebGLContextAttributes = {
        preserveDrawingBuffer: true,
        alpha: false,
        premultipliedAlpha: false,
        antialias: false,
      }

      const gl = (canvas.getContext('webgl2', glOptions) ||
        canvas.getContext('webgl', glOptions)) as WebGLRenderingContext | null

      if (!gl) {
        console.warn('WebGL not supported for Beauty Camera')
        return
      }
      glRef.current = gl

      // Compile Shaders
      function createShader(type: number, source: string): WebGLShader | null {
        if (!gl) return null
        const shader = gl.createShader(type)
        if (!shader) return null
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('Shader compile failed:', gl.getShaderInfoLog(shader))
          gl.deleteShader(shader)
          return null
        }
        return shader
      }

      const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC)
      const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC)
      if (!vs || !fs) return

      const program = gl.createProgram()
      if (!program) return
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link failed:', gl.getProgramInfoLog(program))
        return
      }
      programRef.current = program
      gl.useProgram(program)

      // Quads: Full viewport coordinates
      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ])
      const posBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
      const posLoc = gl.getAttribLocation(program, 'a_position')
      gl.enableVertexAttribArray(posLoc)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

      // Texture UV coordinates (flipped Y for WebGL texture orientation)
      const texCoords = new Float32Array([
        0, 1,
        1, 1,
        0, 0,
        0, 0,
        1, 1,
        1, 0,
      ])
      const texBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)
      const texLoc = gl.getAttribLocation(program, 'a_texCoord')
      gl.enableVertexAttribArray(texLoc)
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0)

      // Texture setup
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      textureRef.current = texture

      return () => {
        if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
        if (texture) gl.deleteTexture(texture)
        if (program) gl.deleteProgram(program)
      }
    }, [])

    const detectedFacesRef = useRef<FaceDetectionData[]>([])
    const lastDetectTimeRef = useRef<number>(0)
    const isDetectingRef = useRef<boolean>(false)

    // Khởi tạo MediaPipe Face Landmarker ngầm từ file offline
    useEffect(() => {
      getFaceLandmarker().then((landmarker) => {
        if (landmarker) {
          console.log('✨ MediaPipe Face Landmarker đã sẵn sàng (Offline GPU)')
        }
      })
    }, [])

    // Real-time 60 FPS Render Loop
    useEffect(() => {
      const gl = glRef.current
      const program = programRef.current
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!gl || !program || !video || !canvas) return

      const uResolution = gl.getUniformLocation(program, 'u_resolution')
      const uSlimFace = gl.getUniformLocation(program, 'u_slimFace')
      const uSkinSmooth = gl.getUniformLocation(program, 'u_skinSmooth')
      const uWhitening = gl.getUniformLocation(program, 'u_whitening')
      const uRosyTone = gl.getUniformLocation(program, 'u_rosyTone')
      const uClarity = gl.getUniformLocation(program, 'u_clarity')
      const uMirror = gl.getUniformLocation(program, 'u_mirror')

      // Uniforms cho nhận diện khuôn mặt động MediaPipe
      const uNumFaces = gl.getUniformLocation(program, 'u_numFaces')
      const uFaceBounds = gl.getUniformLocation(program, 'u_faceBounds')
      const uFaceVLine = gl.getUniformLocation(program, 'u_faceVLine')
      const uFaceJaw = gl.getUniformLocation(program, 'u_faceJaw')

      let isRunning = true

      function doRender() {
        if (!gl || !program || !canvas) return false
        const isMjpeg = Boolean(mjpegUrl && imgRef.current)
        const video = videoRef.current
        const img = imgRef.current

        let mediaSource: TexImageSource | null = null
        let srcW = 1920
        let srcH = 1080

        if (isMjpeg && img) {
          if (img.naturalWidth <= 0) return false
          mediaSource = img
          srcW = img.naturalWidth
          srcH = img.naturalHeight
        } else if (video) {
          if (video.readyState < video.HAVE_CURRENT_DATA) {
            if (video.paused && stream) {
              video.play().catch(() => {})
            }
            return false
          }
          mediaSource = video
          srcW = video.videoWidth || 1920
          srcH = video.videoHeight || 1080
        }

        if (!mediaSource) return false

        if (canvas.width !== srcW || canvas.height !== srcH) {
          canvas.width = srcW
          canvas.height = srcH
          gl.viewport(0, 0, canvas.width, canvas.height)
        }

        gl.useProgram(program)

        // Cập nhật Uniforms tham số làm đẹp
        gl.uniform2f(uResolution, canvas.width, canvas.height)
        gl.uniform1f(uSlimFace, (slimFace || 0) / 100.0)
        gl.uniform1f(uSkinSmooth, (skinSmoothing || 0) / 100.0)
        gl.uniform1f(uWhitening, (whiteningTone || 0) / 100.0)
        gl.uniform1f(uRosyTone, (rosyTone || 0) / 100.0)
        gl.uniform1f(uClarity, (glowClarity || 0) / 100.0)
        gl.uniform1i(uMirror, mirrorCamera ? 1 : 0)

        // Cập nhật tọa độ khuôn mặt MediaPipe phát hiện được
        const faces = detectedFacesRef.current
        const count = Math.min(faces.length, 4)
        gl.uniform1i(uNumFaces, count)

        if (count > 0) {
          const boundsData = new Float32Array(16)
          const vlineData = new Float32Array(16)
          const jawData = new Float32Array(16)

          for (let i = 0; i < count; i++) {
            const f = faces[i]
            boundsData[i * 4 + 0] = f.centerX
            boundsData[i * 4 + 1] = f.centerY
            boundsData[i * 4 + 2] = f.width
            boundsData[i * 4 + 3] = f.height

            vlineData[i * 4 + 0] = f.chinX
            vlineData[i * 4 + 1] = f.chinY
            vlineData[i * 4 + 2] = f.noseX
            vlineData[i * 4 + 3] = f.noseY

            jawData[i * 4 + 0] = f.leftJawX
            jawData[i * 4 + 1] = f.leftJawY
            jawData[i * 4 + 2] = f.rightJawX
            jawData[i * 4 + 3] = f.rightJawY
          }

          gl.uniform4fv(uFaceBounds, boundsData)
          gl.uniform4fv(uFaceVLine, vlineData)
          gl.uniform4fv(uFaceJaw, jawData)
        }

        // Nạp khung hình video/image vào WebGL Texture
        gl.bindTexture(gl.TEXTURE_2D, textureRef.current)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mediaSource)

        // Render Shader Quad
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        return true
      }

      renderDirectRef.current = doRender

      function renderLoop() {
        if (!isRunning) return

        // Nhận diện khuôn mặt với MediaPipe ở ~25-30 FPS để tối ưu CPU/GPU
        const now = performance.now()
        if (!isDetectingRef.current && now - lastDetectTimeRef.current >= 33) {
          lastDetectTimeRef.current = now
          isDetectingRef.current = true
          getFaceLandmarker()
            .then((landmarker) => {
              if (landmarker && videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const results = landmarker.detectForVideo(videoRef.current, now)
                  detectedFacesRef.current = extractFaceData(results, false)
                } catch {
                  // Bỏ qua nếu frame chưa sẵn sàng
                } finally {
                  isDetectingRef.current = false
                }
              } else {
                isDetectingRef.current = false
              }
            })
            .catch(() => {
              isDetectingRef.current = false
            })
        }

        doRender()
        animIdRef.current = requestAnimationFrame(renderLoop)
      }

      animIdRef.current = requestAnimationFrame(renderLoop)

      return () => {
        isRunning = false
        if (animIdRef.current) {
          cancelAnimationFrame(animIdRef.current)
          animIdRef.current = null
        }
      }
    }, [stream, mjpegUrl, mirrorCamera, slimFace, skinSmoothing, whiteningTone, rosyTone, glowClarity])

    // Tính toán CSS filter cho MJPEG Image stream (Tối ưu độ nét và màu sắc)
    const mjpegFilters: string[] = []
    
    // 1. Áp dụng ma trận làm nét cạnh viền (Convolution Sharpening) để triệt tiêu hoàn toàn mờ nội suy
    if (glowClarity > 50) {
      mjpegFilters.push('url(#canon-sharpen-crisp)')
    } else {
      mjpegFilters.push('url(#canon-sharpen-medium)')
    }

    if (whiteningTone > 0) mjpegFilters.push(`brightness(${(1 + (whiteningTone / 100) * 0.10).toFixed(3)})`)
    if (glowClarity > 0) {
      mjpegFilters.push(`contrast(${(1.03 + (glowClarity / 100) * 0.12).toFixed(3)})`)
    } else {
      mjpegFilters.push('contrast(1.04)') // Tăng nhẹ độ tương phản viền chống mờ nội suy upscale
    }
    if (rosyTone > 0) mjpegFilters.push(`saturate(${(1 + (rosyTone / 100) * 0.12).toFixed(3)}) hue-rotate(-${(rosyTone * 0.06).toFixed(1)}deg)`)
    const mjpegFilterStyle = mjpegFilters.length > 0 ? mjpegFilters.join(' ') : 'none'

    return (
      <div
        className={`beauty-camera-container ${className || ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#000',
          ...style,
        }}
      >
        {/* Bộ lọc ma trận chập tăng cường độ sắc nét cạnh (GPU Convolution Sharpening) */}
        <svg
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <defs>
            <filter id="canon-sharpen-medium" colorInterpolationFilters="sRGB">
              <feConvolveMatrix
                order="3 3"
                preserveAlpha="true"
                kernelMatrix="
                   0   -0.35   0
                 -0.35  2.4  -0.35
                   0   -0.35   0"
              />
            </filter>
            <filter id="canon-sharpen-crisp" colorInterpolationFilters="sRGB">
              <feConvolveMatrix
                order="3 3"
                preserveAlpha="true"
                kernelMatrix="
                   0   -0.55   0
                 -0.55  3.2  -0.55
                   0   -0.55   0"
              />
            </filter>
          </defs>
        </svg>

        {/* Hiển thị trực tiếp luồng Canon EDSDK MJPEG độ phân giải cao hoặc WebGL Canvas cho Webcam */}
        {mjpegUrl ? (
          <img
            ref={imgRef}
            src={mjpegUrl}
            alt="Canon EDSDK LiveView"
            crossOrigin="anonymous"
            className="camera-preview-element"
            onError={(_e) => {
              // Tự động kết nối lại sau 1.2s nếu luồng bị ngắt tạm thời
              setTimeout(() => {
                if (imgRef.current && mjpegUrl) {
                  imgRef.current.src = `${mjpegUrl}?retry=${Date.now()}`
                }
              }, 1200)
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: mirrorCamera ? 'scaleX(-1)' : 'none',
              filter: mjpegFilterStyle,
              imageRendering: '-webkit-optimize-contrast' as any,
              display: 'block',
              zIndex: 1,
            }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 1,
                height: 1,
                opacity: 0.01,
                pointerEvents: 'none',
                zIndex: -999,
              }}
            />
            {/* WebGL Real-time Shader Output Canvas */}
            <canvas
              ref={canvasRef}
              className="camera-preview-element"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </>
        )}
      </div>
    )
  }
)

BeautyCameraView.displayName = 'BeautyCameraView'
