// /content/puzzle_click_cycle.js (플레이 모드 레이어 순서가 수정된 최종본)

export default class ClickCycleEngine {
    constructor(config) {
        this.config = config;
        this.onComplete = config.onComplete;
        this.canvas = document.getElementById(config.canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.bgImageElement = document.getElementById(config.backgroundId);
        this.resultContainer = document.getElementById(config.resultContainerId);
        this.resultTextarea = document.getElementById(config.resultTextareaId);
        this.copyBtn = document.getElementById(config.copyBtnId);
        this.questionEl = document.getElementById(config.questionId);
        this.submitBtn = document.getElementById(config.submitBtnId);

        if (config.resetBtnId) {
            this.resetBtn = document.getElementById(config.resetBtnId);
        } else {
            this.resetBtn = null;
        }

        // ★★★★★ [수정 1] 실패 횟수를 세는 변수를 엔진에 직접 추가합니다. ★★★★★
        this.failureCount = 0;

        this.PROXIMITY_THRESHOLD = 20;

        this.determineMode();
        this.setupLayers();

        this.currentState = new Map();
        this.isReady = false;
        this.imageCache = new Map();
        this.currentPolygon = [];
        this.extractedHotspots = [];
        this.bound = {
            resizeHandler: this.handleResize.bind(this),
            handleClick: this.handleClick.bind(this),
            handleSubmit: this.handleSubmit.bind(this),
            handleReset: this.handleReset.bind(this),
            copyToClipboard: this.copyToClipboard.bind(this),
            resetCurrentPolygon: this.resetCurrentPolygon.bind(this),
        };

        this.init();
    }
    
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // [핵심 수정] 플레이 모드와 추출 모드에 따라 레이어 순서를 동적으로 변경합니다.
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    setupLayers() {
        // 'fill' 타입의 플레이 모드일 때만 캔버스를 이미지 뒤로 보냅니다.
        if (this.mode === 'play' && this.config.engineType === 'fill') {
            this.canvas.style.zIndex = '0';      // 색상 채우기용 캔버스 (아래)
            this.bgImageElement.style.zIndex = '1'; // 구멍 뚫린 배경 이미지 (위)
        } else {
            // 좌표 추출 모드거나 'image' 타입 퍼즐일 경우, 캔버스가 위에 있어야 합니다.
            this.canvas.style.zIndex = '1';
            this.bgImageElement.style.zIndex = '0';
        }
    }

    updateUIForMode() {
        if (this.mode === 'extract') {
            this.questionEl.innerHTML = "<strong>[좌표 추출 모드]</strong><br>클릭으로 점을 찍고, 시작점을 다시 클릭하여 영역을 확정하세요.";
            this.submitBtn.textContent = '코드 생성';
            
            if (this.resetBtn) {
                this.resetBtn.style.display = 'none';
            }

            const parentElement = this.submitBtn.parentElement;

            const resetCurrentBtn = document.createElement('button');
            resetCurrentBtn.id = 'reset-current-shape-btn';
            resetCurrentBtn.className = 'btn-primary';
            resetCurrentBtn.textContent = '현재 영역 리셋';
            resetCurrentBtn.onclick = this.bound.resetCurrentPolygon;
            
            const undoBtn = document.createElement('button');
            undoBtn.id = 'undo-last-btn';
            undoBtn.className = 'btn-primary';
            undoBtn.textContent = '마지막 점/영역 취소';
            undoBtn.onclick = this.bound.handleReset;

            parentElement.insertBefore(resetCurrentBtn, this.submitBtn);
            parentElement.insertBefore(undoBtn, resetCurrentBtn);

        } else {
            this.initPlayMode();
        }
    }
    
    handleExtractClick(pos) {
        const originalX = Math.round(pos.x / this.scale);
        const originalY = Math.round(pos.y / this.scale);

        if (this.currentPolygon.length > 2) {
            const firstPoint = this.currentPolygon[0];
            const distance = Math.sqrt(Math.pow(firstPoint.x - originalX, 2) + Math.pow(firstPoint.y - originalY, 2));

            if (distance < this.PROXIMITY_THRESHOLD / this.scale) { // scale 값을 고려
                this.finalizeCurrentPolygon();
                return;
            }
        }

        this.currentPolygon.push({ x: originalX, y: originalY });
        this.redrawCanvas();
    }

    finalizeCurrentPolygon() {
        if (this.currentPolygon.length < 3) {
            this.resetCurrentPolygon();
            return;
        }
        const id = prompt('이 영역의 ID를 입력하세요 (예: A, B, C):');
        if (id) {
            this.extractedHotspots.push({ id: id, coords: this.currentPolygon });
        }
        this.currentPolygon = [];
        this.redrawCanvas();
    }

    resetCurrentPolygon() {
        this.currentPolygon = [];
        this.redrawCanvas();
    }
    
    destroy() {
        const wrapper = this.canvas.parentElement;
        if (wrapper) {
            wrapper.removeEventListener('click', this.bound.handleClick);
        }
        this.submitBtn.removeEventListener('click', this.bound.handleSubmit);

        if (this.resetBtn) {
            this.resetBtn.removeEventListener('click', this.bound.handleReset);
        }
        if (this.copyBtn) {
            this.copyBtn.removeEventListener('click', this.bound.copyToClipboard);
        }
        window.removeEventListener('resize', this.bound.resizeHandler);
        
        document.getElementById('reset-current-shape-btn')?.remove();
        document.getElementById('undo-last-btn')?.remove();
    }

    // --- 이하 다른 함수들은 이전과 동일합니다 ---

    determineMode() {
        const hotspots = this.config.hotspots;
        if (Array.isArray(hotspots) && hotspots.length > 0) {
            this.mode = 'play';
        } else {
            this.mode = 'extract';
        }
        console.log(`[ClickCycleEngine] 'hotspots' 데이터: ${Array.isArray(hotspots) ? `배열(${hotspots.length}개)` : '없음'}. 최종 모드: ${this.mode}`);
    }

    async init() {
        this.updateUIForMode();
        this.addEventListeners();
        await new Promise(resolve => {
            if (this.bgImageElement.complete && this.bgImageElement.naturalWidth > 0) {
                return resolve();
            }
            this.bgImageElement.onload = resolve;
            this.bgImageElement.onerror = () => alert('배경 이미지 로딩 실패');
        });
        this.isBgImageLoaded = true;
        this.handleResize();
        this.isReady = true;
    }
    
    addEventListeners() {
        const wrapper = this.canvas.parentElement;
        wrapper.addEventListener('click', this.bound.handleClick);
        this.submitBtn.addEventListener('click', this.bound.handleSubmit);
        
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', this.bound.handleReset);
        }
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', this.bound.copyToClipboard);
        }
        window.addEventListener('resize', this.bound.resizeHandler);
    }
    
    initPlayMode() {
        if (this.config.engineType === 'image') {
            if (!this.config.initialStates) {
                return console.error("[ClickCycleEngine] 'image' 모드에서는 'initialStates' 설정이 반드시 필요합니다.");
            }
            this.config.initialStates.forEach((stateUrl, id) => {
                this.currentState.set(id, stateUrl);
            });
        } else { 
            this.config.hotspots.forEach(spot => {
                this.currentState.set(spot.id, this.config.states[0]);
            });
        }
        this.preloadImages();
    }

    async preloadImages() {
        const imageUrls = new Set();
        if (this.config.initialStates) {
            this.config.initialStates.forEach(url => imageUrls.add(url));
        }
        if (this.config.states) {
            this.config.states.forEach(state => {
                if (typeof state === 'string' && state.includes('/')) imageUrls.add(state);
            });
        }

        const promises = Array.from(imageUrls).map(url => {
            return new Promise((resolve) => {
                if (this.imageCache.has(url)) return resolve();
                const img = new Image();
                img.onload = () => {
                    this.imageCache.set(url, img);
                    resolve();
                };
                img.onerror = () => {
                     console.error(`이미지 로드 실패: ${url}`);
                     resolve();
                }
                img.src = url;
            });
        });

        await Promise.all(promises);
        this.redrawCanvas();
    }
    
    handleClick(event) {
        if (!this.isReady) return;
        const pos = this.getCoords(event);
        if (this.mode === 'extract') {
            this.handleExtractClick(pos);
        } else {
            this.handlePlayClick(pos);
        }
    }

    handlePlayClick(pos) {
        const point = { x: pos.x, y: pos.y };

        for (const spot of this.config.hotspots) {
            const scaledCoords = spot.coords.map(p => ({ x: p.x * this.scale, y: p.y * this.scale }));

            if (this.isPointInPolygon(point, scaledCoords)) {
                const currentVal = this.currentState.get(spot.id);
                let nextVal;

                if (this.config.engineType === 'image') {
                    const cycleStates = this.config.states;
                    const currentIndex = cycleStates.indexOf(currentVal);

                    if (currentIndex === -1) {
                        nextVal = cycleStates[0];
                    } else {
                        const nextIndex = (currentIndex + 1) % cycleStates.length;
                        nextVal = cycleStates[nextIndex];
                    }
                } else { 
                    const cycleStates = this.config.states;
                    const currentIndex = cycleStates.indexOf(currentVal);
                    const nextIndex = (currentIndex + 1) % cycleStates.length;
                    nextVal = cycleStates[nextIndex];
                }
                
                this.currentState.set(spot.id, nextVal);
                this.redrawCanvas();
                break;
            }
        }
    }
    
    handleReset() {
        if (this.mode === 'extract') {
            if (this.currentPolygon.length > 0) {
                this.currentPolygon.pop();
            } 
            else if (this.extractedHotspots.length > 0) {
                this.extractedHotspots.pop();
            }
        } else {
            this.initPlayMode();
        }
        this.redrawCanvas();
    }

    handleSubmit() {
        if (this.mode === 'extract') {
            this.showResult();
        } else {
            // 정답 여부 판단 (기존 로직과 동일)
            const isCorrect = Array.from(this.config.solution.entries()).every(
                ([id, correctState]) => {
                    let currentHotspotState = this.currentState.get(id);
                    if (!currentHotspotState && this.config.engineType === 'fill') {
                        currentHotspotState = this.config.states[0];
                    }
                    return currentHotspotState === correctState;
                }
            );
            
            // --- 엔진이 직접 실패를 처리하는 로직 ---
            if (isCorrect) {
                // 정답이면 성공 콜백 호출
                this.onComplete(true);
            } else {
                // 오답이면 횟수 증가 및 분기 처리
                this.failureCount++;
                if (this.failureCount >= 2) {
                    // 2번 틀렸으면 실패 콜백 호출
                    this.onComplete(false);
                } else {
                    // 기회가 남았으면 알림창만 표시
                    alert(`틀렸습니다. 다시 생각해보세요. (남은 기회: ${2 - this.failureCount}번)`);
                }
            }
        }
    }
    
    showResult() {
        let output = `hotspots: [\n`;
        this.extractedHotspots.forEach(spot => {
            output += `    { id: '${spot.id}', coords: [`;
            output += spot.coords.map(p => `{x:${p.x},y:${p.y}}`).join(',');
            output += `] },\n`;
        });
        output += `]`;
        this.resultTextarea.value = output;
        this.canvas.parentElement.style.display = 'none';
        this.questionEl.style.display = 'none';
        
        if (this.resetBtn) {
            this.resetBtn.style.display = 'none';
        }
        
        this.submitBtn.style.display = 'none';
        document.getElementById('reset-current-shape-btn')?.remove();
        document.getElementById('undo-last-btn')?.remove();
        this.resultContainer.style.display = 'block';
    }

    copyToClipboard() {
        navigator.clipboard.writeText(this.resultTextarea.value).then(() => {
            alert("클립보드에 복사되었습니다! JS 파일의 puzzleConfig에 붙여넣으세요.");
        });
    }

    handleResize() {
        if (!this.isBgImageLoaded) return;
        requestAnimationFrame(() => {
            const rect = this.bgImageElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.canvas.style.width = `${rect.width}px`;
            this.canvas.style.height = `${rect.height}px`;
            this.ctx.scale(dpr, dpr);
            this.scale = rect.width / this.bgImageElement.naturalWidth;
            this.redrawCanvas();
        });
    }

    redrawCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.ctx.save();
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        if (this.mode === 'extract') {
            this.extractedHotspots.forEach(spot => this.drawPolygon(spot.coords, `rgba(0, 255, 0, 0.5)`));
            this.drawPolygon(this.currentPolygon, `rgba(255, 255, 0, 0.7)`, true);
        } else if (this.mode === 'play') {
            if (this.config.engineType === 'image') {
                this.config.hotspots.forEach(spot => {
                    const imageUrl = this.currentState.get(spot.id);
                    this.drawImageForHotspot(spot, imageUrl);
                });
            } else { 
                this.config.hotspots.forEach(spot => {
                    const color = this.currentState.get(spot.id);
                    if (color && color !== 'transparent') this.drawPolygon(spot.coords, color);
                });
            }
        }
    }
    
    drawImageForHotspot(spot, imageUrl) {
        if (!imageUrl || !this.imageCache.has(imageUrl)) return;

        const img = this.imageCache.get(imageUrl);
        const scaledCoords = spot.coords.map(p => ({ x: p.x * this.scale, y: p.y * this.scale }));

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(scaledCoords[0].x, scaledCoords[0].y);
        for (let i = 1; i < scaledCoords.length; i++) {
            this.ctx.lineTo(scaledCoords[i].x, scaledCoords[i].y);
        }
        this.ctx.closePath();
        this.ctx.clip();

        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    drawPolygon(coords, color, isDrawing = false) {
        if (!coords || coords.length === 0) return;
        const scaledCoords = coords.map(p => ({ x: p.x * this.scale, y: p.y * this.scale }));
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(scaledCoords[0].x, scaledCoords[0].y);
        for (let i = 1; i < scaledCoords.length; i++) {
            this.ctx.lineTo(scaledCoords[i].x, scaledCoords[i].y);
        }
        if (!isDrawing) this.ctx.closePath();
        this.ctx.fill();
        if (isDrawing) {
            scaledCoords.forEach(p => {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
                this.ctx.fillStyle = 'red';
                this.ctx.fill();
            });
        }
    }

    getCoords(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    isPointInPolygon(point, polygon) {
        let isInside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) isInside = !isInside;
        }
        return isInside;
    }
}