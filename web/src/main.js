import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as bodyPix from '@tensorflow-models/body-pix';
import './styles.css';

const ANIMALS = {
  capybara: {
    label: '카피바라',
    base: '#9a7b57',
    accent: '#70543c',
    ear: '#ae8d6d',
    muzzle: '#d4b796',
    nose: '#594433',
    stripe: '#7b5d41',
    belly: '#c79d73',
    tail: '#7f6d56',
  },
  cat: {
    label: '고양이',
    base: '#a99578',
    accent: '#5b4d40',
    ear: '#c0ad94',
    muzzle: '#d8ccb7',
    nose: '#b97898',
    stripe: '#5d5143',
    belly: '#dacbb4',
    tail: '#5b4d40',
  },
  hamster: {
    label: '햄스터',
    base: '#aa9f82',
    accent: '#7d6f5d',
    ear: '#cdc1aa',
    muzzle: '#eadfcf',
    nose: '#7c5b5e',
    stripe: '#8f816a',
    belly: '#e5d7bf',
    tail: '#746457',
  },
  polar_bear: {
    label: '백곰',
    base: '#efefeb',
    accent: '#b8c0cb',
    ear: '#fafaf8',
    muzzle: '#f7f7f3',
    nose: '#6c7687',
    stripe: '#d7dde7',
    belly: '#ffffff',
    tail: '#cbd2de',
  },
  jindo: {
    label: '진돗개',
    base: '#dfc7a3',
    accent: '#9b7c5e',
    ear: '#d5b891',
    muzzle: '#f1e4d3',
    nose: '#3f3a3a',
    stripe: '#9b7c5e',
    belly: '#f0dfc6',
    tail: '#916f4d',
  },
  tiger: {
    label: '호랑이',
    base: '#ff9f2f',
    accent: '#1b1b1b',
    ear: '#ffbb68',
    muzzle: '#ffd7a6',
    nose: '#232323',
    stripe: '#1a1a1a',
    belly: '#ffe3bd',
    tail: '#1a1a1a',
  },
};

const ORDER = ['capybara', 'cat', 'hamster', 'polar_bear', 'jindo', 'tiger'];

const state = {
  animalKey: 'cat',
  stream: null,
  segmenter: null,
  running: false,
  busy: false,
  lastSegmentation: null,
  previewMode: true,
  previewFrame: 0,
  lastMode: '미리보기',
};

let previewLoopActive = false;

const app = document.createElement('div');
app.className = 'app';
app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div class="title-row">
        <div>
          <h1>BeAnimal Web</h1>
          <p class="sub">웹캠에서 사람을 실시간으로 분리하고, 몸 전체를 동물 실루엣으로 재구성하는 ML 기반 동물화 데모입니다. 얼굴 스티커가 아니라 피사체 전체를 바꾸는 쪽으로 다시 만들었습니다.</p>
        </div>
        <div class="badges">
          <div class="badge"><strong>카메라</strong> <span id="cameraState">미리보기</span></div>
          <div class="badge"><strong>모드</strong> <span id="modeState">대기</span></div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="toolbar">
        <div class="group" id="animalButtons" aria-label="동물 선택"></div>
        <div class="group">
          <button class="btn primary" id="startCameraBtn">카메라 시작</button>
          <button class="btn ghost" id="previewBtn">미리보기 켜기</button>
          <button class="btn" id="snapshotBtn" disabled>사진 저장</button>
        </div>
      </div>
    </section>

    <section class="main-grid">
      <section class="stage panel" aria-label="카메라 미리보기">
        <video id="video" playsinline muted autoplay></video>
        <canvas id="canvas"></canvas>
        <div class="hint" id="hintBox">
          <strong>사용 방법:</strong> 카메라 시작을 누르면 실시간 사람 세그멘테이션이 동작합니다.
          <br />현재는 미리보기 모드라서 버튼만 눌러도 동물화 효과를 확인할 수 있습니다.
        </div>
      </section>

      <aside class="panel stack">
        <div class="stat">
          <div class="k">현재 동물</div>
          <div class="v" id="currentAnimal">고양이</div>
        </div>
        <div class="stat">
          <div class="k">상태</div>
          <div class="v" id="statusText">미리보기 모드입니다. 사람 실루엣을 동물화하는 효과를 먼저 보여줍니다.</div>
        </div>
        <div class="stat">
          <div class="k">핵심 설명</div>
          <div class="v">몸만 덮는 오버레이가 아니라, 사람 마스크를 분리해서 전체 실루엣을 동물처럼 다시 칠합니다. 움직이면 세그멘테이션도 함께 따라갑니다.</div>
        </div>
        <div class="stat">
          <div class="k">지원 동물</div>
          <div class="list note">
            <div>카피바라 / 고양이 / 햄스터</div>
            <div>백곰 / 진돗개 / 호랑이</div>
          </div>
        </div>
      </aside>
    </section>

    <div class="footer">Vercel 정적 호스팅에서 바로 열 수 있는 ML 기반 웹앱입니다. 카메라 권한이 있으면 실시간 모드로 전환됩니다.</div>
  </main>
`;

document.body.appendChild(app);

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const animalButtons = document.getElementById('animalButtons');
const startCameraBtn = document.getElementById('startCameraBtn');
const previewBtn = document.getElementById('previewBtn');
const snapshotBtn = document.getElementById('snapshotBtn');
const cameraState = document.getElementById('cameraState');
const modeState = document.getElementById('modeState');
const currentAnimal = document.getElementById('currentAnimal');
const statusText = document.getElementById('statusText');
const hintBox = document.getElementById('hintBox');

function setStatus(message) {
  statusText.textContent = message;
}

function setMode(text) {
  modeState.textContent = text;
}

function syncCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function resizeSourceVideo() {
  if (!video.videoWidth || !video.videoHeight) return;
}

function setAnimal(key) {
  state.animalKey = key;
  currentAnimal.textContent = ANIMALS[key].label;
  document.querySelectorAll('[data-animal]').forEach((btn) => btn.classList.toggle('active', btn.dataset.animal === key));
  setStatus(`${ANIMALS[key].label} 동물화를 선택했습니다.`);
  if (state.lastSegmentation || state.previewMode) render();
}

function buildAnimalButtons() {
  for (const key of ORDER) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.dataset.animal = key;
    btn.textContent = ANIMALS[key].label;
    btn.addEventListener('click', () => setAnimal(key));
    animalButtons.appendChild(btn);
  }
}

function createPreviewSegmentation(width, height, t) {
  const data = new Uint8Array(width * height);
  const cx = width * (0.5 + Math.sin(t * 0.0008) * 0.03);
  const headY = height * 0.23;
  const torsoY = height * 0.48;
  const legY = height * 0.76;

  const ellipses = [
    { x: cx, y: headY, rx: width * 0.11, ry: height * 0.13 },
    { x: cx, y: torsoY, rx: width * 0.19, ry: height * 0.27 },
    { x: cx - width * 0.13, y: torsoY + height * 0.04, rx: width * 0.055, ry: height * 0.17 },
    { x: cx + width * 0.13, y: torsoY + height * 0.04, rx: width * 0.055, ry: height * 0.17 },
    { x: cx - width * 0.07, y: legY, rx: width * 0.055, ry: height * 0.2 },
    { x: cx + width * 0.07, y: legY, rx: width * 0.055, ry: height * 0.2 },
    { x: cx - width * 0.23, y: torsoY + height * 0.11, rx: width * 0.08, ry: height * 0.035 },
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = false;
      for (const e of ellipses) {
        const dx = (x - e.x) / e.rx;
        const dy = (y - e.y) / e.ry;
        if (dx * dx + dy * dy <= 1) {
          hit = true;
          break;
        }
      }
      if (hit) data[y * width + x] = 1;
    }
  }

  return { width, height, data };
}

function segmentationBounds(segmentation) {
  const { width, height, data } = segmentation;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!data[y * width + x]) continue;
      count += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!count) {
    return { x: width * 0.25, y: height * 0.18, w: width * 0.5, h: height * 0.72 };
  }

  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

function buildMaskCanvas(segmentation) {
  const { width, height, data } = segmentation;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  const imageData = maskCtx.createImageData(width, height);

  for (let i = 0; i < data.length; i += 1) {
    const value = data[i] ? 255 : 0;
    imageData.data[i * 4 + 3] = value;
    if (value) {
      imageData.data[i * 4 + 0] = 255;
      imageData.data[i * 4 + 1] = 255;
      imageData.data[i * 4 + 2] = 255;
    }
  }

  maskCtx.putImageData(imageData, 0, 0);
  return maskCanvas;
}

function drawAnimalDetails(bounds, style, time) {
  const { x, y, w, h } = bounds;
  const cx = x + w / 2;
  const headY = y + h * 0.15;
  const faceY = y + h * 0.34;
  const bodyY = y + h * 0.58;
  const legY = y + h * 0.88;
  const earLift = Math.max(14, h * 0.14);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 3;

  // 귀
  ctx.fillStyle = style.ear;
  if (state.animalKey === 'cat' || state.animalKey === 'jindo' || state.animalKey === 'tiger') {
    const leftEar = [
      [cx - w * 0.18, headY + h * 0.02],
      [cx - w * 0.29, headY - earLift],
      [cx - w * 0.06, headY + h * 0.06],
    ];
    const rightEar = [
      [cx + w * 0.06, headY + h * 0.06],
      [cx + w * 0.29, headY - earLift],
      [cx + w * 0.18, headY + h * 0.02],
    ];
    for (const ear of [leftEar, rightEar]) {
      ctx.beginPath();
      ctx.moveTo(ear[0][0], ear[0][1]);
      ctx.lineTo(ear[1][0], ear[1][1]);
      ctx.lineTo(ear[2][0], ear[2][1]);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.18, headY + h * 0.02, w * 0.07, h * 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.18, headY + h * 0.02, w * 0.07, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 얼굴/주둥이
  ctx.fillStyle = style.muzzle;
  ctx.beginPath();
  ctx.ellipse(cx, faceY, w * 0.22, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = style.base;
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.24, w * 0.26, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸통
  const bodyGradient = ctx.createLinearGradient(x, y, x + w, y + h);
  bodyGradient.addColorStop(0, style.base);
  bodyGradient.addColorStop(0.55, style.belly);
  bodyGradient.addColorStop(1, style.accent);
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(cx, bodyY, w * 0.34, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // 팔다리
  ctx.fillStyle = style.base;
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.22, bodyY + h * 0.02, w * 0.07, h * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + w * 0.22, bodyY + h * 0.02, w * 0.07, h * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(cx - w * 0.1, legY, w * 0.08, h * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + w * 0.1, legY, w * 0.08, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 꼬리
  ctx.strokeStyle = style.tail;
  ctx.lineWidth = Math.max(10, w * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.33, bodyY + h * 0.02);
  ctx.quadraticCurveTo(cx + w * 0.45, bodyY - h * 0.02, cx + w * 0.52, bodyY + h * 0.1);
  ctx.stroke();

  // 얼굴 디테일
  const eyeY = y + h * 0.29;
  const eyeDx = w * 0.1;
  const eyeR = Math.max(4, Math.min(w, h) * 0.045);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx - eyeDx, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(cx + eyeDx, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(cx - eyeDx, eyeY, eyeR * 0.55, 0, Math.PI * 2);
  ctx.arc(cx + eyeDx, eyeY, eyeR * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = style.nose;
  ctx.beginPath();
  ctx.arc(cx, faceY + h * 0.06, Math.max(3, w * 0.025), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = style.accent;
  ctx.lineWidth = Math.max(1.8, w * 0.008);
  ctx.beginPath();
  ctx.moveTo(cx, faceY + h * 0.06);
  ctx.lineTo(cx - w * 0.05, faceY + h * 0.12);
  ctx.moveTo(cx, faceY + h * 0.06);
  ctx.lineTo(cx + w * 0.05, faceY + h * 0.12);
  ctx.stroke();

  // 줄무늬 / 텍스처
  if (state.animalKey === 'tiger') {
    ctx.strokeStyle = style.stripe;
    ctx.lineWidth = Math.max(2, w * 0.015);
    for (const dx of [-0.18, -0.05, 0.08, 0.21]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * w, y + h * 0.1);
      ctx.lineTo(cx + (dx + 0.05) * w, y + h * 0.2);
      ctx.stroke();
    }
  } else if (state.animalKey === 'jindo') {
    ctx.strokeStyle = style.stripe;
    ctx.lineWidth = Math.max(1.8, w * 0.012);
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.52, w * 0.22, h * 0.12, 0, Math.PI, 0);
    ctx.stroke();
  } else if (state.animalKey === 'capybara') {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(cx - w * 0.09, faceY + h * 0.1, w * 0.18, h * 0.05);
  }

  ctx.restore();

  // 약한 움직임 강조 링
  ctx.save();
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.28)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  ctx.restore();
}

function drawBackdrop(width, height, t) {
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#020617');
  grad.addColorStop(0.5, '#0b1326');
  grad.addColorStop(1, '#11213b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#67e8f9';
  ctx.beginPath();
  ctx.arc(width * (0.2 + Math.sin(t * 0.0015) * 0.03), height * 0.18, Math.min(width, height) * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(width * (0.78 + Math.cos(t * 0.0013) * 0.02), height * 0.22, Math.min(width, height) * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render(segmentation, sourceType = 'preview') {
  syncCanvasSize();
  const width = canvas.width;
  const height = canvas.height;
  const now = performance.now();
  const t = state.previewFrame + now;

  ctx.clearRect(0, 0, width, height);
  drawBackdrop(width, height, t);

  if (!segmentation) {
    ctx.save();
    ctx.fillStyle = 'rgba(248,250,252,0.92)';
    ctx.font = `${14 * Math.max(1, window.devicePixelRatio || 1)}px ui-sans-serif, system-ui`;
    ctx.fillText('미리보기 모드: 카메라를 켜면 실시간 세그멘테이션이 적용됩니다.', 24 * (window.devicePixelRatio || 1), 52 * (window.devicePixelRatio || 1));
    ctx.restore();
    return;
  }

  const maskCanvas = buildMaskCanvas(segmentation);

  // 실루엣 마스크를 먼저 배치합니다.
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(maskCanvas, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-in';

  const style = ANIMALS[state.animalKey];
  const bodyGradient = ctx.createLinearGradient(0, 0, width, height);
  bodyGradient.addColorStop(0, style.base);
  bodyGradient.addColorStop(0.55, style.belly);
  bodyGradient.addColorStop(1, style.accent);
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 가장자리와 질감
  const bounds = segmentationBounds(segmentation);
  drawAnimalDetails(bounds, style, t);

  // 본체의 흐름감을 조금 더 추가합니다.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = style.stripe;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bounds.x + bounds.w * 0.18, bounds.y + bounds.h * 0.56);
  ctx.quadraticCurveTo(bounds.x + bounds.w * 0.5, bounds.y + bounds.h * 0.64, bounds.x + bounds.w * 0.82, bounds.y + bounds.h * 0.5);
  ctx.stroke();
  ctx.restore();

  if (sourceType === 'camera') {
    setMode('실시간');
    setStatus(`얼굴과 몸을 ${style.base === '#ff9f2f' ? '호랑이' : ANIMALS[state.animalKey].label} 스타일로 재구성 중입니다.`);
  } else {
    setMode('미리보기');
    setStatus('미리보기 모드입니다. 카메라를 켜면 실제 웹캠 화면이 같은 방식으로 동물화됩니다.');
  }
}

async function ensureSegmenter() {
  if (state.segmenter) return state.segmenter;
  setMode('모델 로딩');
  setStatus('사람 세그멘테이션 모델을 불러오는 중입니다...');
  await tf.setBackend('webgl');
  await tf.ready();
  state.segmenter = await bodyPix.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2,
  });
  setMode('대기');
  return state.segmenter;
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('이 브라우저는 카메라 API를 지원하지 않습니다.');
    }
    if (state.running) {
      stopCamera();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    state.stream = stream;
    video.srcObject = stream;
    await video.play();
    state.running = true;
    state.previewMode = false;
    cameraState.textContent = '켜짐';
    startCameraBtn.textContent = '카메라 끄기';
    snapshotBtn.disabled = false;
    hintBox.style.display = 'none';
    setStatus('카메라 연결 완료. 사람을 인식해서 동물화 중입니다.');
    await ensureSegmenter();
    detectLoop();
  } catch (error) {
    cameraState.textContent = '실패';
    setStatus(error.message || '카메라를 시작하지 못했습니다. 미리보기 모드로 계속 보여드립니다.');
    state.previewMode = true;
    state.running = false;
    cameraState.textContent = '미리보기';
    startCameraBtn.textContent = '카메라 시작';
    snapshotBtn.disabled = true;
    startPreviewLoop();
    console.error(error);
  }
}

function stopCamera() {
  state.running = false;
  state.previewMode = true;
  if (state.stream) {
    for (const track of state.stream.getTracks()) track.stop();
  }
  state.stream = null;
  video.srcObject = null;
  cameraState.textContent = '미리보기';
  startCameraBtn.textContent = '카메라 시작';
  snapshotBtn.disabled = true;
  hintBox.style.display = 'block';
  setStatus('미리보기 모드로 돌아왔습니다.');
  startPreviewLoop();
}

async function detectLoop() {
  if (!state.running) return;
  if (!state.segmenter) {
    await ensureSegmenter();
  }
  if (!state.busy && video.readyState >= 2) {
    state.busy = true;
    try {
      const segmentation = await state.segmenter.segmentPerson(video, {
        internalResolution: 'medium',
        segmentationThreshold: 0.75,
      });
      state.lastSegmentation = segmentation;
      render(segmentation, 'camera');
    } catch (error) {
      console.warn(error);
      setStatus('세그멘테이션에 잠깐 실패했습니다. 다시 시도합니다.');
    } finally {
      state.busy = false;
    }
  }
  requestAnimationFrame(detectLoop);
}

function startPreviewLoop() {
  if (previewLoopActive || state.running) return;
  previewLoopActive = true;

  const step = () => {
    if (state.running) {
      previewLoopActive = false;
      return;
    }
    state.previewFrame += 16;
    const previewSegmentation = createPreviewSegmentation(
      Math.max(240, Math.round(canvas.getBoundingClientRect().width)),
      Math.max(180, Math.round(canvas.getBoundingClientRect().height)),
      state.previewFrame,
    );
    render(previewSegmentation, 'preview');
    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function snapshot() {
  const link = document.createElement('a');
  link.download = `beanimal-${state.animalKey}-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function setPreviewMode(on) {
  state.previewMode = on;
  if (on) {
    cameraState.textContent = '미리보기';
    startCameraBtn.textContent = '카메라 시작';
    snapshotBtn.disabled = true;
    hintBox.style.display = 'block';
    setStatus('미리보기 모드입니다. 버튼만 눌러도 실루엣 동물화를 확인할 수 있습니다.');
    startPreviewLoop();
  }
}

buildAnimalButtons();
setAnimal('cat');
setPreviewMode(true);
startPreviewLoop();

startCameraBtn.addEventListener('click', startCamera);
previewBtn.addEventListener('click', () => setPreviewMode(true));
snapshotBtn.addEventListener('click', snapshot);

window.addEventListener('resize', () => {
  syncCanvasSize();
  if (state.running && state.lastSegmentation) {
    render(state.lastSegmentation, 'camera');
  } else {
    startPreviewLoop();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  const idx = Number.parseInt(event.key, 10);
  if (Number.isInteger(idx) && idx >= 1 && idx <= ORDER.length) {
    setAnimal(ORDER[idx - 1]);
  }
  if (event.key.toLowerCase() === 'c') startCamera();
  if (event.key.toLowerCase() === 's') snapshot();
});

window.__beanimal = {
  state,
  setAnimal,
  renderPreview: startPreviewLoop,
  setPreviewMode,
  startCamera,
  stopCamera,
  snapshot,
};
