// /content/puzzle_swap.js

export class SwapPuzzleEngine {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.gridSize = config.gridSize;
        this.pieces = config.pieces;
        this.renderPiece = config.renderPiece;
        this.checkWinCondition = config.checkWinCondition;
        this.gridState = [...config.initialState];
        this.fixedPieces = config.fixedPieces || [];
        this.selectedCellIndex = null;
        this.onComplete = null;
        this.isAnimating = false; // 애니메이션 중복 실행 방지 플래그
        this.boundHandleCellClick = this.handleCellClick.bind(this);
    }

    init(onCompleteCallback) {
        this.onComplete = onCompleteCallback;
        this.container.style.display = 'grid';
        this.container.style.gridTemplateColumns = `repeat(${this.gridSize.cols}, 1fr)`;
        // [핵심 수정] 복제본의 absolute 위치 기준을 잡기 위해 relative 속성 추가
        this.container.style.position = 'relative'; 
        this.render();
    }
    
    render() {
        this.container.innerHTML = ''; 
        
        this.gridState.forEach((pieceId, index) => {
            const cell = document.createElement('div');
            cell.className = 'puzzle-cell';
            cell.dataset.index = index;
            const pieceData = this.pieces.find(p => p.id === pieceId);
            if (pieceData) {
                this.renderPiece(cell, pieceData);
            }
            if (this.fixedPieces.includes(index)) {
                cell.classList.add('fixed');
            } else {
                cell.addEventListener('click', this.boundHandleCellClick);
            }
            if (this.selectedCellIndex === index) {
                cell.classList.add('selected');
            }
            this.container.appendChild(cell);
        });
    }

    handleCellClick(e) {
        if (this.isAnimating) return;
        
        const clickedIndex = parseInt(e.currentTarget.dataset.index);

        if (this.selectedCellIndex === null) {
            this.selectedCellIndex = clickedIndex;
            this.render();
        } else {
            const previouslySelectedIndex = this.selectedCellIndex;
            this.selectedCellIndex = null;

            if (previouslySelectedIndex !== clickedIndex) {
                this.animateSwap(previouslySelectedIndex, clickedIndex);
            } else {
                this.render();
            }
        }
    }

    // [수정] 슬라이딩 애니메이션을 복제본(clone)을 이용하여 부드럽게 개선
    animateSwap(indexA, indexB) {
        this.isAnimating = true;
    
        const cellA = this.container.querySelector(`[data-index="${indexA}"]`);
        const cellB = this.container.querySelector(`[data-index="${indexB}"]`);
        
        const contentA = cellA.querySelector('.star-container');
        const contentB = cellB.querySelector('.star-container');
    
        const containerRect = this.container.getBoundingClientRect();
        const rectA = cellA.getBoundingClientRect();
        const rectB = cellB.getBoundingClientRect();
    
        // 1. 복제본 생성 (빈칸일 경우 빈 div 생성)
        const cloneA = contentA ? contentA.cloneNode(true) : document.createElement('div');
        const cloneB = contentB ? contentB.cloneNode(true) : document.createElement('div');
        
        // 2. 복제본에 절대 위치 스타일 적용
        cloneA.style.position = 'absolute';
        cloneA.style.top = `${rectA.top - containerRect.top}px`;
        cloneA.style.left = `${rectA.left - containerRect.left}px`;
        cloneA.style.width = `${rectA.width}px`;
        cloneA.style.height = `${rectA.height}px`;
        cloneA.style.zIndex = 1000; // 다른 모든 요소 위에 보이도록 설정
        
        cloneB.style.position = 'absolute';
        cloneB.style.top = `${rectB.top - containerRect.top}px`;
        cloneB.style.left = `${rectB.left - containerRect.left}px`;
        cloneB.style.width = `${rectB.width}px`;
        cloneB.style.height = `${rectB.height}px`;
        cloneB.style.zIndex = 1000;
    
        // 3. 컨테이너에 복제본 추가 및 원본 숨기기
        this.container.appendChild(cloneA);
        this.container.appendChild(cloneB);
        if (contentA) contentA.style.visibility = 'hidden';
        if (contentB) contentB.style.visibility = 'hidden';
    
        // 4. 복제본에 transform을 적용하여 애니메이션 실행
        requestAnimationFrame(() => {
            cloneA.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            cloneB.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            
            const deltaX = rectA.left - rectB.left;
            const deltaY = rectA.top - rectB.top;
    
            cloneA.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;
            cloneB.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        });
    
        // 5. 애니메이션 종료 후 처리
        setTimeout(() => {
            cloneA.remove();
            cloneB.remove();
    
            this.swapPieces(indexA, indexB);
    
            // 그리드를 다시 렌더링하면 숨겨졌던 원본이 새 위치에 정상적으로 나타남
            this.render();
            
            this.isAnimating = false;
        }, 300); // CSS transition 시간과 일치
    }
    
    swapPieces(indexA, indexB) {
        [this.gridState[indexA], this.gridState[indexB]] = [this.gridState[indexB], this.gridState[indexA]];
    }
    checkSolution() {
        const pieceMap = new Map(this.pieces.map(p => [p.id, p.stars.length]));
        const starCounts = this.gridState.map(id => pieceMap.get(id));
        const targetSum = 3;
        for (let i = 0; i < 3; i++) {
            const rowSum = starCounts[i*3] + starCounts[i*3+1] + starCounts[i*3+2];
            const colSum = starCounts[i] + starCounts[i+3] + starCounts[i+6];
            if (rowSum !== targetSum || colSum !== targetSum) return false;
        }
        return true;
    }
    destroy() {
        Array.from(this.container.children).forEach(cell => {
            cell.removeEventListener('click', this.boundHandleCellClick);
        });
        console.log("SwapPuzzleEngine의 이벤트 리스너를 모두 제거했습니다.");
    }
}