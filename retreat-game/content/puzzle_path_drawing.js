// ========================================================================
// [puzzle_path_drawing.js] 원본 기능 전체 복원 및 최종 수정본
// 이 코드로 파일 전체를 덮어쓰세요.
// ========================================================================
export default class NodePathPuzzle {
    constructor(config) {
        this.config = {
            nodeRadius: 35,
            ...config
        };
        this.canvas = document.getElementById(config.canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.image = document.getElementById(config.imageId);
        this.resetBtn = document.getElementById(config.resetBtnId);
        this.submitBtn = document.getElementById(config.submitBtnId);
        this.resultContainer = document.getElementById(config.resultContainerId);
        this.resultTextarea = document.getElementById(config.resultTextareaId);
        this.copyBtn = document.getElementById(config.copyBtnId);
        this.questionEl = document.getElementById(config.questionId);
    
        this.determineMode();
    
        this.nodes = [];
        this.edges = new Set();
        this.userPath = [];
        this.scale = 1;
        this.isDrawing = false;
        this.failureCount = 0;
        this.extractedNodes = [];
        this.extractedEdges = [];
        this.selectedNodeForEdge = null;
        this.isReady = false;
        this.touchStartPos = null;
    
        // [핵심 복원] 모든 이벤트 핸들러의 'this'가 클래스 인스턴스를 가리키도록 바인딩합니다.
        // 이 부분이 없어서 'getCoords' 함수를 찾지 못하는 오류가 발생했습니다.
        this.bound = {
            resizeHandler: this.handleResize.bind(this),
            handleTap: this.handleTap.bind(this),
            handleTouchStart: this.handleTouchStart.bind(this),
            handleTouchEnd: this.handleTouchEnd.bind(this),
            startDrag: this.startDrag.bind(this),
            drag: this.drag.bind(this),
            stopDrag: this.stopDrag.bind(this),
            reset: this.reset.bind(this),
            handleSubmit: this.handleSubmit.bind(this),
            copyToClipboard: this.copyToClipboard.bind(this)
        };
    
        this.init();
    }
    
        determineMode() {
            const { nodes, edges, correctPath } = this.config;
            if (!nodes || nodes.length === 0) this.mode = 'extract_nodes';
            else if (!edges || edges.length === 0) this.mode = 'extract_edges';
            else if (!correctPath || correctPath.length === 0) this.mode = 'extract_answer';
            else this.mode = 'play';
        }
    
        init() {
            this.updateUIForMode();
            this.addEventListeners();
            
            const onImageReady = () => {
                console.log("이미지 준비 완료. 퍼즐을 시작합니다.");
                if (this.mode !== 'extract_nodes') {
                    this.nodes = this.config.nodes.map(node => ({
                        ...node,
                        originalX: node.x,
                        originalY: node.y
                    }));
                }
                if (this.mode === 'extract_answer' || this.mode === 'play' || this.mode === 'extract_edges') {
                    this.edges = this.createEdgeSet(this.config.edges);
                }
                
                this.handleResize();
                
                this.isReady = true;
            };
        
            if (this.image.complete && this.image.naturalWidth > 0) {
                onImageReady();
            } else {
                this.image.onload = onImageReady;
                this.image.onerror = () => alert('[오류] 이미지 로딩 실패');
            }
        }
        
        // [핵심 수정] 반응형 캔버스를 다루는 가장 안정적인 최종 로직으로 교체
        handleResize() {
            if (!this.image.complete || this.image.naturalWidth === 0) return;
    
            requestAnimationFrame(() => {
                const container = this.canvas.parentElement;
                if (!container) return;
    
                // 배경 이미지의 실제 렌더링된 크기를 가져옴
                const rect = this.image.getBoundingClientRect();
                const size = { width: rect.width, height: rect.height };
    
                if (size.width === 0 || size.height === 0) return;
    
                const dpr = window.devicePixelRatio || 1;
                this.canvas.width = size.width * dpr;
                this.canvas.height = size.height * dpr;
                this.canvas.style.width = `${size.width}px`;
                this.canvas.style.height = `${size.height}px`;
                this.ctx.scale(dpr, dpr);
    
                this.scale = size.width / this.image.naturalWidth;
                
                const rescaleCoords = (node) => {
                    node.x = node.originalX * this.scale;
                    node.y = node.originalY * this.scale;
                };
    
                if (this.nodes && this.nodes.length > 0) {
                    this.nodes.forEach(rescaleCoords);
                }
                if (this.extractedNodes && this.extractedNodes.length > 0) {
                    this.extractedNodes.forEach(rescaleCoords);
                }
            
                this.drawAll();
            });
        }
    
        addEventListeners() {
            // [핵심 수정] 반드시 this.bound에 미리 바인딩된 함수를 사용해야 합니다.
            if (this.mode === 'extract_nodes' || this.mode === 'extract_edges') {
                this.canvas.addEventListener('click', this.bound.handleTap);
                this.canvas.addEventListener('touchstart', this.bound.handleTouchStart);
                this.canvas.addEventListener('touchend', this.bound.handleTouchEnd);
            } else {
                this.canvas.addEventListener('mousedown', this.bound.startDrag);
                this.canvas.addEventListener('mousemove', this.bound.drag);
                this.canvas.addEventListener('mouseup', this.bound.stopDrag);
                this.canvas.addEventListener('mouseleave', this.bound.stopDrag);
                this.canvas.addEventListener('touchstart', this.bound.startDrag, { passive: false });
                this.canvas.addEventListener('touchmove', this.bound.drag, { passive: false });
                this.canvas.addEventListener('touchend', this.bound.stopDrag);
            }
            this.resetBtn.addEventListener('click', this.bound.reset);
            this.submitBtn.addEventListener('click', this.bound.handleSubmit);
            if (this.copyBtn) this.copyBtn.addEventListener('click', this.bound.copyToClipboard);
            window.addEventListener('resize', this.bound.resizeHandler);
        }
        
        destroy() {
            // [수정] this.bound를 사용해 추가했던 리스너와 정확히 동일한 함수를 제거합니다.
            this.canvas.removeEventListener('click', this.bound.handleTap);
            this.canvas.removeEventListener('touchstart', this.bound.handleTouchStart);
            this.canvas.removeEventListener('touchend', this.bound.handleTouchEnd);
            this.canvas.removeEventListener('mousedown', this.bound.startDrag);
            this.canvas.removeEventListener('mousemove', this.bound.drag);
            this.canvas.removeEventListener('mouseup', this.bound.stopDrag);
            this.canvas.removeEventListener('mouseleave', this.bound.stopDrag);
            this.canvas.removeEventListener('touchstart', this.bound.startDrag);
            this.canvas.removeEventListener('touchmove', this.bound.drag);
            this.canvas.removeEventListener('touchend', this.bound.stopDrag);
            this.resetBtn.removeEventListener('click', this.bound.reset);
            this.submitBtn.removeEventListener('click', this.bound.handleSubmit);
            if (this.copyBtn) this.copyBtn.removeEventListener('click', this.bound.copyToClipboard);
            window.removeEventListener('resize', this.bound.resizeHandler);
        }
    
        handleTouchStart(e) {
            if (e.touches.length === 1) this.touchStartPos = this.getCoords(e);
        }
        
        handleTouchEnd(e) {
            if (!this.touchStartPos || e.changedTouches.length !== 1) return;
            
            const endPos = this.getCoords(e); 
            const distance = Math.hypot(endPos.x - this.touchStartPos.x, endPos.y - this.touchStartPos.y);
        
            if (distance < 10) { // 짧은 터치(탭)으로 간주
                e.preventDefault();
                this.processTap(this.touchStartPos);
            }
            this.touchStartPos = null;
        }
    
        handleTap(e) {
            this.processTap(this.getCoords(e));
        }
    
        processTap(pos) {
            if (!this.isReady) {
                console.log("아직 준비되지 않았습니다. (이미지 로딩 확인 필요)");
                return;
            }
        
            if (this.mode === 'extract_nodes') {
                const originalX = Math.round(pos.x / this.scale);
                const originalY = Math.round(pos.y / this.scale);
                
                // 수정: prompt 대신 자동 ID 부여 (추출 속도 향상)
                const nodeId = `node${this.extractedNodes.length + 1}`;
                const newNode = { id: nodeId, originalX, originalY };
                
                newNode.x = pos.x; // 현재 화면 좌표 저장
                newNode.y = pos.y;
                
                this.extractedNodes.push(newNode);
                console.log("노드 추가됨:", newNode);
                
            } else if (this.mode === 'extract_edges') {
                const clickedNode = this.getClickedNode(pos.x, pos.y);
                if (!clickedNode) return;
                
                if (!this.selectedNodeForEdge) {
                    this.selectedNodeForEdge = clickedNode;
                } else {
                    if (this.selectedNodeForEdge.id === clickedNode.id) {
                        this.selectedNodeForEdge = null; // 선택 취소
                    } else {
                        const edge = [this.selectedNodeForEdge.id, clickedNode.id].sort();
                        const edgeKey = edge.join('-');
                        const edgeIndex = this.extractedEdges.findIndex(e => e.join('-') === edgeKey);
                        
                        if (edgeIndex > -1) this.extractedEdges.splice(edgeIndex, 1);
                        else this.extractedEdges.push(edge);
                        
                        this.selectedNodeForEdge = null;
                    }
                }
            }
            this.drawAll();
        }
    
        startDrag(e) {
            if (!this.isReady) return;
            e.preventDefault();
            const pos = this.getCoords(e);
            const startNode = this.getClickedNode(pos.x, pos.y);
            if (!startNode) return;
        
            const lastNodeId = this.userPath.length > 0 ? this.userPath[this.userPath.length - 1] : null;
        
            // [핵심 수정 1] 드래그 재개 로직 복원
            // 경로가 비어있거나, 경로의 마지막 노드를 다시 클릭했을 때만 그리기를 시작/재개합니다.
            if (!lastNodeId || startNode.id === lastNodeId) {
                this.isDrawing = true;
                // 경로가 비어있을 때만 시작 노드를 추가합니다 (재개 시 중복 추가 방지).
                if (!lastNodeId) {
                    this.userPath = [startNode.id];
                }
            }
        }
    
        drag(e) {
            if (!this.isDrawing) return;
            e.preventDefault();
            const pos = this.getCoords(e);
            
            // 임시선을 먼저 그립니다.
            this.drawAll(pos); 
        
            const currentNode = this.getClickedNode(pos.x, pos.y);
            if (!currentNode) return;
            
            const lastNodeId = this.userPath[this.userPath.length - 1];
        
            // [핵심 수정 2] 경로 추가 및 삭제 로직 복원
            if (currentNode.id !== lastNodeId) {
                // Case 1: 새로운 노드로 이동 (경로 추가)
                // - 아직 경로에 없고, 마지막 노드와 연결되어 있어야 함
                if (!this.userPath.includes(currentNode.id) && this.areNodesConnected(lastNodeId, currentNode.id)) {
                    this.userPath.push(currentNode.id);
                } 
                // Case 2: 이전 노드로 되돌아감 (경로 삭제)
                // - 현재 노드가 경로의 뒤에서 두 번째 노드와 일치하면 마지막 노드를 제거
                else if (this.userPath.length > 1 && currentNode.id === this.userPath[this.userPath.length - 2]) {
                    this.userPath.pop();
                }
            }
            // 마지막으로 한 번 더 그려서 최종 상태를 반영합니다.
            this.drawAll(pos);
        }
    
        stopDrag() {
            if (!this.isDrawing) return;
            this.isDrawing = false;
    
            // 사용자가 선을 모두 지우고 시작점에서 손을 뗐을 경우,
            // 경로를 완전히 비워서 다른 시작점에서 새로 시작할 수 있도록 합니다.
            if (this.userPath.length === 1) {
                this.userPath = [];
            }
    
            this.drawAll();
        }
    
        getCoords(e) {
            const rect = this.canvas.getBoundingClientRect();
            let x, y;
    
            if (e.touches && e.touches.length > 0) {
                // 일반적인 터치 이벤트 (touchstart, touchmove)
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else if (e.changedTouches && e.changedTouches.length > 0) {
                // 터치가 끝나는 이벤트 (touchend)
                x = e.changedTouches[0].clientX - rect.left;
                y = e.changedTouches[0].clientY - rect.top;
            } else {
                // 마우스 이벤트
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }
            return { x, y };
        }    
        
        getClickedNode(x, y) {
            const nodesToSearch = (this.mode === 'extract_nodes') ? this.extractedNodes : this.nodes;
            
            // [핵심 수정] 클릭 가능 반경을 별도로 설정합니다. 없으면 기존 nodeRadius를 사용합니다.
            const clickableRadius = this.config.clickableRadius || this.config.nodeRadius;
        
            for (const node of nodesToSearch) {
                const distance = Math.hypot(x - node.x, y - node.y);
                
                // 시각적 반지름 대신, 더 넓은 클릭 가능 반경으로 검사합니다.
                if (distance < clickableRadius * this.scale) {
                    return node;
                }
            }
            return null; 
        }
    
        // [핵심 수정] 그리기는 캔버스 위에서만 이뤄지도록 단순화
        drawAll(mousePos = null) {
            if (!this.isReady) return;
    
            // [추가] 고해상도 처리를 위해 dpr 값 가져오기
            const dpr = window.devicePixelRatio || 1;
    
            // [추가] 그리기 전 캔버스 변형 상태 저장
            this.ctx.save();
            // [추가] 모든 변형(scale 등) 초기화
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
            // 이제 깨끗한 좌표계에서 clearRect 실행
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
            // [추가] 변형 상태 복원 (이제부터 모든 그리기는 scale이 적용된 좌표를 사용)
            this.ctx.restore();
        
            if (this.mode === 'extract_nodes') {
                this.extractedNodes.forEach(node => this.drawNode(node, 'red'));
            } else if (this.mode === 'extract_edges') {
                this.nodes.forEach(node => this.drawNode(node, 'yellow', this.selectedNodeForEdge && this.selectedNodeForEdge.id === node.id));
                this.extractedEdges.forEach(edge => this.drawEdge(edge, 'blue'));
            } else { // play, extract_answer 모드
                this.drawUserPath();
                if (this.isDrawing && mousePos) this.drawTemporaryLine(mousePos);
            }
        }
    
        drawNode(node, color, isSelected = false) {
            this.ctx.beginPath();
            // '15'를 this.config.nodeRadius로 변경합니다.
            this.ctx.arc(node.x, node.y, this.config.nodeRadius * this.scale, 0, 2 * Math.PI);
            this.ctx.fillStyle = `rgba(${color === 'red' ? '255,0,0' : '255,255,0'}, 0.5)`;
            this.ctx.fill();
            if (isSelected) {
                this.ctx.strokeStyle = 'cyan';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
        }
        
        drawEdge(edge, color) {
            const nodeA = this.nodes.find(n => n.id === edge[0]);
            const nodeB = this.nodes.find(n => n.id === edge[1]);
            if (!nodeA || !nodeB) return;
            this.ctx.beginPath();
            this.ctx.moveTo(nodeA.x, nodeA.y);
            this.ctx.lineTo(nodeB.x, nodeB.y);
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 5;
            this.ctx.stroke();
        }
        
        drawUserPath() {
            if (this.userPath.length < 2) return;
            const pathNodes = this.userPath.map(id => this.nodes.find(n => n.id === id));
            if (pathNodes.some(n => !n)) return;
            this.ctx.beginPath();
            this.ctx.moveTo(pathNodes[0].x, pathNodes[0].y);
            for (let i = 1; i < pathNodes.length; i++) this.ctx.lineTo(pathNodes[i].x, pathNodes[i].y);
            this.ctx.strokeStyle = this.config.lineColor || 'rgba(200, 50, 50, 0.8)';
            this.ctx.lineWidth = this.config.lineWidth || 12;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
        }
        
        drawTemporaryLine(mousePos) {
            const lastNodeId = this.userPath[this.userPath.length - 1];
            if (!lastNodeId) return;
            const lastNode = this.nodes.find(n => n.id === lastNodeId);
            this.ctx.beginPath();
            this.ctx.moveTo(lastNode.x, lastNode.y);
            this.ctx.lineTo(mousePos.x, mousePos.y);
            this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            this.ctx.lineWidth = 5;
            this.ctx.setLineDash([5, 10]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    
        updateUIForMode() {
            let questionText = '', submitText = '결정하기', resetText = '다시';
            switch(this.mode) {
                case 'extract_nodes': questionText = "<strong>[1단계: 좌표 설정]</strong><br>이미지의 각 지점을 클릭하여 노드를 추가하세요."; submitText = '좌표 추출 완료'; resetText = '마지막 지점 취소'; break;
                case 'extract_edges': questionText = "<strong>[2단계: 경로 설정]</strong><br>연결 가능한 두 지점을 순서대로 클릭하여 길을 만드세요."; submitText = '경로 확정'; resetText = '선택 취소'; break;
                case 'extract_answer': questionText = "<strong>[3단계: 정답 입력]</strong><br>정답 경로를 드래그하세요."; submitText = '정답 확정'; resetText = '다시 그리기'; break;
                case 'play': resetText = '다시 그리기'; break; // 플레이 모드에서는 기본 질문을 사용
            }
            if (this.questionEl && questionText) this.questionEl.innerHTML = questionText;
            if (this.submitBtn) this.submitBtn.textContent = submitText;
            if (this.resetBtn) this.resetBtn.textContent = resetText;
        }
        
        handleSubmit() {
            if (this.mode === 'extract_nodes') this.showResult('nodes', this.extractedNodes.map(n => ({ id: n.id, x: n.originalX, y: n.originalY })));
            else if (this.mode === 'extract_edges') this.showResult('edges', this.extractedEdges);
            else if (this.mode === 'extract_answer') this.showResult('correctPath', this.userPath);
            else this.checkAnswer();
        }
        
        showResult(key, data) {
            let output = `${key}: [\n`;
            if (key === 'nodes') {
                data.forEach(n => { output += `    { id: '${n.id}', x: ${n.x}, y: ${n.y} },\n`; });
            } else if (key === 'edges') {
                data.forEach(e => { output += `    ['${e[0]}', '${e[1]}'],\n`; });
            } else {
                output += `    '${data.join("', '")}'\n`;
            }
            output += "]";
            
            // 텍스트 영역에 값 넣기
            if(this.resultTextarea) this.resultTextarea.value = output;
        
            // [핵심] HTML 구조의 주요 클래스들을 찾아 숨기기
            const header = document.querySelector('.mission-header');
            const content = document.querySelector('.mission-content');
            const footer = document.querySelector('.mission-footer');
        
            if (header) header.style.display = 'none';
            if (content) content.style.display = 'none';
            if (footer) footer.style.display = 'none';
        
            // 결과창 보여주기
            if(this.resultContainer) {
                this.resultContainer.style.display = 'block';
            }
            
            console.log(output); // 만약 화면에 안나오면 F12(콘솔)에서도 확인 가능
            alert(`${key} 추출 완료.`);
        }
    
        reset() {
            if (this.mode === 'extract_nodes') this.extractedNodes.pop();
            else if (this.mode === 'extract_edges') this.selectedNodeForEdge = null;
            else this.userPath = [];
            this.drawAll();
        }
        
        checkAnswer() {
            if (this.userPath.length === 0) return this.handleFailure("경로를 그려주세요.");
    
            const startNodeIds = this.config.startNodeIds || [];
            const startPoint = this.userPath[0];
            const endPoint = this.userPath[this.userPath.length - 1];
            
            const isEndpointValid = startNodeIds.length === 0 || 
                                   (startNodeIds.includes(startPoint) && startNodeIds.includes(endPoint) && startPoint !== endPoint);
    
            if (!isEndpointValid) return this.handleFailure(`경로는 지정된 시작점과 끝점에서 시작하고 끝나야 합니다.`);
            
            const correctPath = this.config.correctPath;
            if (this.userPath.length !== correctPath.length) return this.handleFailure("이것보다 더 긴 길이 있습니다!");
    
            const reversedCorrectPath = [...correctPath].reverse();
            const isCorrectForward = JSON.stringify(this.userPath) === JSON.stringify(correctPath);
            const isCorrectBackward = JSON.stringify(this.userPath) === JSON.stringify(reversedCorrectPath);
    
            if (isCorrectForward || isCorrectBackward) {
                if (this.config.onComplete) this.config.onComplete(true);
            } else {
                this.handleFailure("경로가 올바르지 않습니다!");
            }
        }
        
        copyToClipboard() {
            if (!this.resultTextarea) return;
            navigator.clipboard.writeText(this.resultTextarea.value).then(() => {
                alert("클립보드에 복사되었습니다!");
            }).catch(() => {
                alert("복사에 실패했습니다.");
            });
        }
        
        handleFailure(message) {
            this.failureCount++; 
            if (this.failureCount >= 2) {
                if (this.config.onComplete) this.config.onComplete(false);
            } else {
                alert(`틀렸습니다. 다시 생각해보세요. (남은 기회: ${2 - this.failureCount}번)`);
                this.reset();
            }
        }
    
        areNodesConnected(nodeIdA, nodeIdB) {
            const edgeKey = [nodeIdA, nodeIdB].sort().join('-');
            return this.edges.has(edgeKey);
        }
    
        createEdgeSet(edges) {
            const edgeSet = new Set();
            if(edges) edges.forEach(edge => {
                edgeSet.add(edge.slice().sort().join('-'));
            });
            return edgeSet;
        }
    }