// /content/puzzle_line_drawing.js (표준 반응형으로 업그레이드된 최종 버전)
export default class LinePuzzleEngine {
    constructor(config) {
        this.config = config;
        this.canvas = document.getElementById('puzzle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.questionEl = document.getElementById('puzzle-question');
        this.submitBtn = document.getElementById('puzzle-submit-btn');
        this.resultContainer = document.getElementById('extraction-result');
        this.resultTextarea = document.getElementById('result-textarea');
        this.copyBtn = document.getElementById('copy-btn');

        this.image = new Image();
        this.lines = [];
        this.selectedStake = null;
        this.stakes = [];
        this.scale = 1;

        this.mode = 'play';
        if (Array.isArray(config.stakes) && config.stakes.length === 0) {
            this.mode = 'extract_stakes';
        } else if (Array.isArray(config.correctLines) && config.correctLines.length === 0) {
            this.mode = 'extract_answer';
        }

        this.failureCount = 0;
        this.firstPoint = null;
        this.extractedData = [];
        this.touchStartPos = null;

        this.boundHandleClick = this.handleCanvasClick.bind(this);
        this.boundHandleKeydown = this.handleKeydown.bind(this);
        this.boundSubmit = this.handleSubmit.bind(this);
        this.boundCopyToClipboard = this.copyToClipboard.bind(this);
        this.boundResize = this.setupCanvas.bind(this);
        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);

        this.init();
    }

    init() {
        this.canvas.addEventListener('click', this.boundHandleClick);
        this.canvas.addEventListener('touchstart', this.boundHandleTouchStart);
        this.canvas.addEventListener('touchend', this.boundHandleTouchEnd);
        window.addEventListener('resize', this.boundResize);
        if (this.submitBtn) this.submitBtn.addEventListener('click', this.boundSubmit);

        if (this.mode.startsWith('extract')) {
            document.addEventListener('keydown', this.boundHandleKeydown);
            if (this.copyBtn) this.copyBtn.addEventListener('click', this.boundCopyToClipboard);
        }

        this.image.onload = () => {
            this.setupCanvas();
        };
        this.image.src = this.config.backgroundImage;
    }

    setupCanvas() {
        requestAnimationFrame(() => {
            const container = this.canvas.parentElement;
            if (!container) return;
    
            const containerRect = container.getBoundingClientRect();
            const naturalWidth = this.image.naturalWidth || 1000;
            const naturalHeight = this.image.naturalHeight || 1000;
            const imgRatio = naturalWidth / naturalHeight;
            const containerRatio = containerRect.width / containerRect.height;
    
            let size;
            if (imgRatio < containerRatio) {
                size = { height: containerRect.height, width: containerRect.height * imgRatio };
            } else {
                size = { width: containerRect.width, height: containerRect.width / imgRatio };
            }
    
            if (size.width === 0) return;
    
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = size.width * dpr;
            this.canvas.height = size.height * dpr;
    
            // ★★★★★ [핵심 수정] 캔버스를 중앙에 배치하기 위한 좌표 계산 ★★★★★
            const offsetX = (containerRect.width - size.width) / 2;
            this.canvas.style.left = `${offsetX}px`;
    
            this.canvas.style.width = `${size.width}px`;
            this.canvas.style.height = `${size.height}px`;
            this.ctx.scale(dpr, dpr);
    
            this.scale = size.width / naturalWidth;
    
            this.recalculatePositions();
            this.draw();
        });
    }

    recalculatePositions() {
        if (this.mode !== 'extract_stakes') {
            this.stakes = this.config.stakes.map(stake => ({
                x: (stake.x + stake.width / 2) * this.scale,
                y: (stake.y + stake.height / 2) * this.scale,
                width: stake.width * this.scale,
                height: stake.height * this.scale
            }));
        }
    }

    draw() {
        if (!this.ctx || !this.image.complete) return;
        const displayWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const displayHeight = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, displayWidth, displayHeight);
        this.ctx.drawImage(this.image, 0, 0, displayWidth, displayHeight);

        if (this.mode === 'extract_stakes') {
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.4)";
            this.extractedData.forEach(s => this.ctx.fillRect(s.x * this.scale, s.y * this.scale, s.width * this.scale, s.height * this.scale));
            if (this.firstPoint) {
                this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
                this.ctx.beginPath();
                this.ctx.arc(this.firstPoint.x, this.firstPoint.y, 5, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        } else {
            this.ctx.strokeStyle = this.config.lineColor || 'red';
            this.ctx.lineWidth = (this.config.lineWidth || 5) * this.scale;
            this.ctx.lineCap = 'round';
            this.lines.forEach(line => {
                const start = this.stakes[line[0]];
                const end = this.stakes[line[1]];
                this.ctx.beginPath();
                this.ctx.moveTo(start.x, start.y);
                this.ctx.lineTo(end.x, end.y);
                this.ctx.stroke();
            });
            if (this.selectedStake !== null) {
                const stake = this.stakes[this.selectedStake];
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
                this.ctx.beginPath();
                const radius = Math.min(stake.width, stake.height) / 2 * 0.8;
                this.ctx.arc(stake.x, stake.y, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    handleTouchStart(event) {
        if (event.touches.length === 1) {
            this.touchStartPos = this.getCanvasPos(event);
        }
    }

    handleTouchEnd(event) {
        if (!this.touchStartPos || event.changedTouches.length !== 1) return;
        const touchEndPos = this.getCanvasPos(event.changedTouches[0]);
        const distance = Math.hypot(touchEndPos.x - this.touchStartPos.x, touchEndPos.y - this.touchStartPos.y);
        if (distance < 10) {
            event.preventDefault();
            this.processTap(touchEndPos.x, touchEndPos.y);
        }
        this.touchStartPos = null;
    }

    handleCanvasClick(event) {
        const pos = this.getCanvasPos(event);
        this.processTap(pos.x, pos.y);
    }

    processTap(tapX, tapY) {
        if (this.mode === 'extract_stakes') {
            // 수정: 캔버스의 CSS 실제 출력 너비(clientWidth)를 기준으로 계산
            const reverseScale = this.image.naturalWidth / this.canvas.clientWidth;
            
            if (!this.firstPoint) {
                this.firstPoint = { x: tapX, y: tapY };
            } else {
                const startX = Math.min(this.firstPoint.x, tapX);
                const startY = Math.min(this.firstPoint.y, tapY);
                const endX = Math.max(this.firstPoint.x, tapX);
                const endY = Math.max(this.firstPoint.y, tapY);
                const stakeRect = {
                    x: Math.round(startX * reverseScale),
                    y: Math.round(startY * reverseScale),
                    width: Math.round((endX - startX) * reverseScale),
                    height: Math.round((endY - startY) * reverseScale)
                };
                this.extractedData.push(stakeRect);
                this.firstPoint = null;
            }
        } else {
            for (let i = this.lines.length - 1; i >= 0; i--) {
                const line = this.lines[i];
                const start = this.stakes[line[0]];
                const end = this.stakes[line[1]];
                if (this.distToSegment({ x: tapX, y: tapY }, start, end) < 20) {
                    this.lines.splice(i, 1);
                    this.selectedStake = null;
                    this.draw();
                    return;
                }
            }
            for (let i = 0; i < this.stakes.length; i++) {
                const stake = this.stakes[i];
                if (tapX >= stake.x - stake.width / 2 && tapX <= stake.x + stake.width / 2 &&
                    tapY >= stake.y - stake.height / 2 && tapY <= stake.y + stake.height / 2) {
                    if (this.selectedStake === null) {
                        this.selectedStake = i;
                    } else {
                        if (this.selectedStake !== i) {
                            const newLine = [Math.min(this.selectedStake, i), Math.max(this.selectedStake, i)];
                            if (!this.lines.some(l => l[0] === newLine[0] && l[1] === newLine[1])) {
                                this.lines.push(newLine);
                            }
                            if (this.lines.length > this.config.maxLines) {
                                this.lines.shift();
                            }
                        }
                        this.selectedStake = null;
                    }
                    this.draw();
                    return;
                }
            }
        }
        this.draw();
    }

    handleSubmit() {
        if (this.mode.startsWith('extract')) {
            this.showResult(this.mode === 'extract_stakes' ? 'stakes' : 'correctLines', this.mode === 'extract_stakes' ? this.extractedData : this.lines);
        } else {
            this.checkAnswer();
        }
    }

    showResult(key, data) {
        let output = `${key}: [\n`;
        if (key === 'stakes') {
            data.forEach(s => { output += `    { x: ${s.x}, y: ${s.y}, width: ${s.width}, height: ${s.height} },\n`; });
        } else if (key === 'correctLines') {
            data.forEach(line => { output += `    [${line[0]}, ${line[1]}],\n`; });
        }
        output += "]";
    
        if (this.resultTextarea) this.resultTextarea.value = output;
    
        // ★ 수정 포인트: 개별 요소가 아니라 레이아웃 박스 자체를 숨깁니다.
        const header = document.querySelector('.mission-header');
        const content = document.querySelector('.mission-content');
        const footer = document.querySelector('.mission-footer');
    
        if (header) header.style.display = 'none';
        if (content) content.style.display = 'none';
        if (footer) footer.style.display = 'none';
    
        // 결과창 표시
        if (this.resultContainer) {
            this.resultContainer.style.display = 'block';
            // 결과창이 상단에 딱 붙도록 스타일 조정 (선택사항)
            this.resultContainer.style.marginTop = '0'; 
        }
        
        alert(`${key} 추출 완료.`);
    }

    checkAnswer() {
        if (this.lines.length === 0) {
            alert("먼저 문제를 풀어주세요.");
            return;
        }
        if (this.lines.length !== this.config.correctLines.length) {
            this.handleIncorrect();
            return;
        }
        const userLines = this.lines.map(line => line.slice().sort((a, b) => a - b));
        const correctLines = this.config.correctLines.map(line => line.slice().sort((a, b) => a - b));
        const isCorrect = userLines.every(userLine =>
            correctLines.some(correctLine =>
                userLine[0] === correctLine[0] && userLine[1] === correctLine[1]
            )
        );
        if (isCorrect) {
            if (this.config.onComplete) {
                this.config.onComplete(true);
            }
        } else {
            this.handleIncorrect();
        }
    }

    handleIncorrect() {
        this.failureCount++;
        if (this.failureCount >= 2) {
            if (this.config.onComplete) {
                this.config.onComplete(false);
            }
        } else {
            alert(`틀렸습니다. 다시 생각해보세요. (남은 기회: ${2 - this.failureCount}번)`);
            this.lines = [];
            this.draw();
        }
    }

    copyToClipboard() {
        if (this.resultTextarea) {
            this.resultTextarea.select();
            document.execCommand('copy');
            alert("좌표가 클립보드에 복사되었습니다!");
        }
    }

    handleKeydown(event) {
        if (event.key.toLowerCase() === 'u') {
            if (this.firstPoint) {
                this.firstPoint = null;
            } else if (this.extractedData.length > 0) {
                this.extractedData.pop();
            }
            this.draw();
        }
    }

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 == 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = v.x + t * (w.x - v.x);
        const projY = v.y + t * (w.y - v.y);
        return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
    }

    destroy() {
        this.canvas.removeEventListener('click', this.boundHandleClick);
        this.canvas.removeEventListener('touchstart', this.boundHandleTouchStart);
        this.canvas.removeEventListener('touchend', this.boundHandleTouchEnd);
        window.removeEventListener('resize', this.boundResize);
        if (this.submitBtn) this.submitBtn.removeEventListener('click', this.boundSubmit);
        if (this.mode.startsWith('extract')) {
            document.removeEventListener('keydown', this.boundHandleKeydown);
            if (this.copyBtn) this.copyBtn.removeEventListener('click', this.boundCopyToClipboard);
        }
    }
}