export default class SelectionPuzzleEngine {
    constructor(config, elements) {
        this.config = config;
        this.canvas = elements.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.submitBtn = elements.submitBtn;
        this.questionEl = elements.question;
    
        this.resultContainer = elements.resultContainer;
        this.resultTextarea = elements.resultTextarea;
        this.copyBtn = elements.copyBtn;
        
        this.backgroundImage = new Image();
        this.checkmarkImage = new Image();
    
        // [추가] 선택 모드 설정 ('single' 또는 'multiple'), 기본값은 'single'
        this.selectionMode = config.selectionMode || 'single';

        this.mode = (Array.isArray(config.locations) && config.locations.length > 0) ? 'play' : 'extract_locations';
        
        this.locations = [];
        
        // [수정] 단일/복수 선택을 모두 처리하기 위해 배열로 변경
        this.selectedIds = []; 
        
        this.failureCount = 0;
        this.scale = 1;
    
        this.extractionStep = 'center';
        this.centerPoint = null;
        this.extractedData = [];
    
        this.touchStartPos = null;
    
        this.boundHandleClick = this.handleCanvasClick.bind(this);
        this.boundSubmit = this.handleSubmit.bind(this);
        this.boundResize = this.setupCanvas.bind(this);
        this.boundCopy = this.copyToClipboard.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleKeydown = this.handleKeydown.bind(this);
        
        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    
        this.init();
    }

    async init() {
        this.canvas.addEventListener('click', this.boundHandleClick);
        this.canvas.addEventListener('touchstart', this.boundHandleTouchStart);
        this.canvas.addEventListener('touchend', this.boundHandleTouchEnd);

        this.submitBtn.addEventListener('click', this.boundSubmit);
        window.addEventListener('resize', this.boundResize);

        let bgLoaded = new Promise(resolve => this.backgroundImage.onload = resolve);
        let checkmarkLoaded = new Promise(resolve => this.checkmarkImage.onload = resolve);
        this.backgroundImage.src = this.config.backgroundImage;
        this.checkmarkImage.src = this.config.checkmarkImage;

        if (this.mode === 'extract_locations') {
            this.copyBtn.addEventListener('click', this.boundCopy);
            this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
            document.addEventListener('keydown', this.boundHandleKeydown);
            this.questionEl.innerHTML = "<strong>[좌표 추출 모드]</strong><br>1. 원의 중심 클릭 → 2. 원의 반지름 클릭 → 3. ID 입력 (※ 수정: U 키)";
            this.submitBtn.textContent = "좌표 추출 완료";
        }
        
        await Promise.all([bgLoaded, checkmarkLoaded]);
        setTimeout(() => this.setupCanvas(), 0); 
    }

    setupCanvas() {
        requestAnimationFrame(() => {
            const container = this.canvas.closest('.mission-content');
            if (!container) {
                console.error('.mission-content를 찾을 수 없습니다.');
                return;
            }

            const availableWidth = container.clientWidth;
            const availableHeight = container.clientHeight;

            const size = Math.min(availableWidth, availableHeight);
            
            if (size <= 0) return;

            const dpr = window.devicePixelRatio || 1;

            this.canvas.width = size * dpr;
            this.canvas.height = size * dpr;
            
            this.canvas.style.width = `${size}px`;
            this.canvas.style.height = `${size}px`;
            
            // ▼▼▼▼▼ [수정] 이 부분을 추가해주세요 ▼▼▼▼▼
            // 남는 공간을 계산하여 캔버스를 중앙에 배치합니다.
            const leftOffset = (availableWidth - size) / 2;
            const topOffset = (availableHeight - size) / 2;
            this.canvas.style.left = `${leftOffset}px`;
            this.canvas.style.top = `${topOffset}px`;
            // ▲▲▲▲▲ [수정] 여기까지 추가 ▲▲▲▲▲

            this.ctx.scale(dpr, dpr);
    
            this.scale = size / this.backgroundImage.naturalWidth;
    
            if (this.mode === 'play') {
                this.locations = this.config.locations.map(loc => ({
                    id: loc.id,
                    scaledX: loc.x * this.scale,
                    scaledY: loc.y * this.scale,
                    scaledRadius: loc.radius * this.scale
                }));
            }
            
            this.draw();
        });
    }

    draw(mousePos = null) {
        // [최종 수정] 그리기 전에 캔버스의 변형 상태를 저장합니다.
        this.ctx.save();
    
        // [최종 수정] 모든 변형(scale 등)을 초기화합니다.
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
        // [최종 수정] 이제 좌표계가 깨끗하므로, 내부 해상도 크기 그대로 명령합니다.
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        
        // [최종 수정] 초기화했던 변형 상태(scale 등)를 다시 복원합니다.
        // 이렇게 하면 이후의 그리기(체크마크, 좌표추출 등)는 정상적으로 동작합니다.
        this.ctx.restore();
    
        // --- 아래 코드는 기존과 동일합니다 ---
    
        if (this.mode === 'play' && this.selectedIds.length > 0) {
            this.selectedIds.forEach(id => {
                const loc = this.locations.find(l => l.id === id);
                if (loc) {
                    const checkmarkSize = loc.scaledRadius * 1.5;
                    this.ctx.drawImage(this.checkmarkImage, loc.scaledX - checkmarkSize / 2, loc.scaledY - checkmarkSize / 2, checkmarkSize, checkmarkSize);
                }
            });
        }
        
        if (this.mode === 'extract_locations') {
            this.ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
            this.ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";
            this.ctx.lineWidth = 2;
            this.extractedData.forEach(loc => {
                this.ctx.beginPath();
                this.ctx.arc(loc.x * this.scale, loc.y * this.scale, loc.radius * this.scale, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.stroke();
            });
    
            if (this.centerPoint) {
                this.ctx.save();
                this.ctx.fillStyle = "yellow";
                this.ctx.beginPath();
                this.ctx.arc(this.centerPoint.x, this.centerPoint.y, 5, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.restore();
    
                if (mousePos) {
                    this.ctx.save();
                    const radius = Math.hypot(mousePos.x - this.centerPoint.x, mousePos.y - this.centerPoint.y);
                    this.ctx.globalAlpha = 0.6;
                    this.ctx.fillStyle = "#00FFFF";
                    this.ctx.strokeStyle = "white";
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(this.centerPoint.x, this.centerPoint.y, radius, 0, 2 * Math.PI);
                    this.ctx.fill();
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        }
    }
    
    // --- (handleMouseMove, handleKeydown, handleTouchStart, handleTouchEnd, handleCanvasClick 는 기존과 동일) ---
    handleMouseMove(event) {
        if (this.extractionStep !== 'radius' || !this.centerPoint) return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        this.draw({ x: mouseX, y: mouseY });
    }

    handleKeydown(event) {
        if (event.key.toLowerCase() !== 'u') return;

        if (this.extractionStep === 'radius') {
            this.centerPoint = null;
            this.extractionStep = 'center';
            this.questionEl.innerHTML = "<strong>[좌표 추출 모드]</strong><br>1. 원의 중심 클릭 → 2. 원의 반지름 클릭 → 3. ID 입력 (※ 수정: U 키)";
        } else if (this.extractedData.length > 0) {
            this.extractedData.pop();
        }
        this.draw();
    }
    
    handleTouchStart(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        }
    }
    
    handleTouchEnd(event) {
        if (!this.touchStartPos || event.changedTouches.length !== 1) {
            return;
        }

        const touch = event.changedTouches[0];
        const touchEndPos = { x: touch.clientX, y: touch.clientY };
        
        const distance = Math.hypot(
            touchEndPos.x - this.touchStartPos.x,
            touchEndPos.y - this.touchStartPos.y
        );

        if (distance < 10) {
            event.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const tapX = touchEndPos.x - rect.left;
            const tapY = touchEndPos.y - rect.top;
            this.processTap(tapX, tapY);
        }
        
        this.touchStartPos = null;
    }

    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        this.processTap(clickX, clickY);
    }
    
    processTap(tapX, tapY) {
        if (this.mode === 'play') {
            const tappedLocation = this.locations.find(loc => {
                const distance = Math.hypot(tapX - loc.scaledX, tapY - loc.scaledY);
                return distance < loc.scaledRadius;
            });

            if (tappedLocation) {
                // [수정] 선택 모드에 따라 다르게 동작
                if (this.selectionMode === 'single') {
                    // 단일 선택 모드: 항상 선택된 ID를 교체
                    this.selectedIds = [tappedLocation.id];
                } else { // multiple mode
                    const index = this.selectedIds.indexOf(tappedLocation.id);
                    if (index > -1) {
                        // 복수 선택 모드: 이미 선택된 경우 제거 (토글)
                        this.selectedIds.splice(index, 1);
                    } else {
                        // 복수 선택 모드: 선택되지 않은 경우 추가
                        this.selectedIds.push(tappedLocation.id);
                    }
                }
                this.draw();
            }

        } else if (this.mode === 'extract_locations') {
            // ... (좌표 추출 로직은 동일)
            if (this.extractionStep === 'center') {
                this.centerPoint = { x: tapX, y: tapY };
                this.extractionStep = 'radius';
                this.questionEl.innerHTML = "<strong>[좌표 추출 모드]</strong><br>원의 반지름을 결정할 위치를 클릭하세요.";
                this.draw();
            } else {
                const radius = Math.hypot(tapX - this.centerPoint.x, tapY - this.centerPoint.y);
                const id = prompt("이 위치의 고유 ID를 입력하세요 (예: 'house1', 'church'):");
                
                if (id) {
                    const reverseScale = this.backgroundImage.naturalWidth / this.canvas.width;
                    this.extractedData.push({
                        id: id,
                        x: Math.round(this.centerPoint.x * reverseScale),
                        y: Math.round(this.centerPoint.y * reverseScale),
                        radius: Math.round(radius * reverseScale)
                    });
                }
                
                this.centerPoint = null;
                this.extractionStep = 'center';
                this.questionEl.innerHTML = "<strong>[좌표 추출 모드]</strong><br>1. 원의 중심 클릭 → 2. 원의 반지름 클릭 → 3. ID 입력 (※ 수정: U 키)";
                this.draw();
            }
        }
    }

    handleSubmit() {
        if (this.mode === 'extract_locations') {
            this.showResult();
        } else {
            this.checkAnswer();
        }
    }
    
    checkAnswer() {
        if (this.selectedIds.length === 0) {
            alert("먼저 선택을 해주세요.");
            return;
        }

        let isCorrect = false;
        // [수정] 정답 확인 로직을 모드에 따라 분기
        if (this.selectionMode === 'single') {
            // 단일 선택 모드: config의 correctAnswerId와 비교
            isCorrect = this.selectedIds[0] === this.config.correctAnswerId;
        } else { // multiple mode
            // 복수 선택 모드: config의 correctAnswerIds 배열과 비교 (순서 무관)
            const correctAnswers = this.config.correctAnswerIds || [];
            if (this.selectedIds.length === correctAnswers.length) {
                // 선택한 개수와 정답 개수가 같을 때, 모든 정답이 선택 목록에 포함되어 있는지 확인
                isCorrect = correctAnswers.every(id => this.selectedIds.includes(id));
            }
        }

        if (isCorrect) {
            if (this.config.onComplete) this.config.onComplete(true);
        } else {
            this.handleIncorrect();
        }
    }

    handleIncorrect() {
        this.failureCount++;
        if (this.failureCount >= 2) {
            if (this.config.onComplete) this.config.onComplete(false);
        } else {
            alert(`틀렸습니다. 다시 생각해보세요. (남은 기회: ${2 - this.failureCount}번)`);
            // [수정] 선택 배열 초기화
            this.selectedIds = [];
            this.draw();
        }
    }

    // --- (showResult, copyToClipboard, destroy 는 기존과 거의 동일) ---
    showResult() {
        let output = "locations: [\n";
        this.extractedData.forEach(loc => {
            output += `    { id: '${loc.id}', x: ${loc.x}, y: ${loc.y}, radius: ${loc.radius} },\n`;
        });
        output += "]";
        
        this.resultTextarea.value = output;
        this.canvas.parentElement.style.display = 'none';
        this.questionEl.style.display = 'none';
        this.submitBtn.style.display = 'none';
        this.resultContainer.style.display = 'block';
    }
    
    copyToClipboard() {
        this.resultTextarea.select();
        document.execCommand('copy');
        alert("좌표가 클립보드에 복사되었습니다!");
    }

    destroy() {
        console.log("SelectionPuzzleEngine을 정리합니다.");
        this.canvas.removeEventListener('click', this.boundHandleClick);
        this.submitBtn.removeEventListener('click', this.boundSubmit);
        window.removeEventListener('resize', this.boundResize);
        
        this.canvas.removeEventListener('touchstart', this.boundHandleTouchStart);
        this.canvas.removeEventListener('touchend', this.boundHandleTouchEnd);
        
        if (this.mode === 'extract_locations') {
            this.copyBtn.removeEventListener('click', this.boundCopy);
            this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
            document.removeEventListener('keydown', this.boundHandleKeydown);
        }
    }
}