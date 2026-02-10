export default class WaterJugPuzzle {
    constructor(config) {
        // ... (이 부분은 변경 없습니다) ...
        this.config = { jugElements: [], capacities: [], initialState: [], winCondition: (state) => false, onComplete: () => {}, submitBtnId: null, resetBtnId: null, selectedClass: 'selected' };
        Object.assign(this.config, config);
        this.currentState = [...this.config.initialState];
        this.selectedJugIndex = null;
        this.isAnimating = false;
        this.failureCount = 0;
        this.bound = { handleJugClick: this.handleJugClick.bind(this), reset: this.reset.bind(this), handleSubmit: this.handleSubmit.bind(this) };
        this.jugClickHandlers = [];
        this.init();
    }

    init() {
        // ... (이 부분은 변경 없습니다) ...
        this.config.jugElements = Array.from(document.querySelectorAll('.jug'));
        this.config.jugElements.forEach((jug, index) => {
            const handler = () => this.bound.handleJugClick(index);
            this.jugClickHandlers[index] = handler;
            jug.addEventListener('click', handler);
        });
        if (this.config.submitBtnId) {
            const submitBtn = document.getElementById(this.config.submitBtnId);
            if (submitBtn) submitBtn.addEventListener('click', this.bound.handleSubmit);
        }
        if (this.config.resetBtnId) {
            const resetBtn = document.getElementById(this.config.resetBtnId);
            if (resetBtn) resetBtn.addEventListener('click', this.bound.reset);
        }
        this.updateDisplay();
    }

    destroy() {
        // ... (이 부분은 변경 없습니다) ...
        this.config.jugElements.forEach((jug, index) => { if (this.jugClickHandlers[index]) { jug.removeEventListener('click', this.jugClickHandlers[index]); } });
        if (this.config.submitBtnId) { const submitBtn = document.getElementById(this.config.submitBtnId); if (submitBtn) submitBtn.removeEventListener('click', this.bound.handleSubmit); }
        if (this.config.resetBtnId) { const resetBtn = document.getElementById(this.config.resetBtnId); if (resetBtn) resetBtn.removeEventListener('click', this.bound.reset); }
    }
    
    handleJugClick(clickedIndex) {
        // ... (이 부분은 변경 없습니다) ...
        if (this.isAnimating) return;

        if (this.selectedJugIndex === null) {
            if (this.currentState[clickedIndex] === 0) return;
            this.selectedJugIndex = clickedIndex;
            this.config.jugElements[clickedIndex].classList.add(this.config.selectedClass);
        } else {
            const fromIndex = this.selectedJugIndex;
            const fromEl = this.config.jugElements[fromIndex];
            const toEl = this.config.jugElements[clickedIndex];

            this.selectedJugIndex = null;
            
            if (fromIndex !== clickedIndex) {
                const fromRect = fromEl.getBoundingClientRect();
                const toRect = toEl.getBoundingClientRect();

                fromEl.classList.remove(this.config.selectedClass);
                
                this.animatePour(fromIndex, clickedIndex, fromRect, toRect);
            } else {
                fromEl.classList.remove(this.config.selectedClass);
            }
        }
    }

    async animatePour(fromIndex, toIndex, fromRect, toRect) {
        this.isAnimating = true;
        const fromEl = this.config.jugElements[fromIndex];
        // ★★★★★ 수정된 부분 1: 부모 요소를 제어하기 위해 변수 추가 ★★★★★
        const fromUnitEl = fromEl.parentElement;
        
        const isPouringRight = fromRect.left < toRect.left;
        let dx;
        if (isPouringRight) { dx = toRect.left - fromRect.right + 10; } 
        else { dx = toRect.right - fromRect.left - 10; }

        let dyUp;
        if (fromRect.top < toRect.top) {
            dyUp = -30; 
        } 
        else {
            dyUp = (toRect.top - fromRect.top) - 30;
        }

        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        
        // ★★★★★ 수정된 부분 1: 따르는 컵의 부모(.jug-unit)에 클래스를 추가하여 z-index를 높임 ★★★★★
        fromUnitEl.classList.add('is-pouring-unit');
        fromEl.classList.add('is-pouring');

        try {
            fromEl.style.transform = `translateY(${dyUp}px)`;
            await wait(300);
            fromEl.style.transform = `translate(${dx}px, ${dyUp}px)`;
            await wait(400);
            const tiltAngle = isPouringRight ? 70 : -70;
            fromEl.style.transform += ` rotate(${tiltAngle}deg)`;
            await wait(400);

            this.pour(fromIndex, toIndex);
            this.updateDisplay();
            await wait(600);
            
            // ★★★★★ 수정된 부분 2: 복귀 애니메이션을 단순화하여 부드럽게 만듦 ★★★★★
            // 1. 회전만 풀어줌
            fromEl.style.transform = `translate(${dx}px, ${dyUp}px)`;
            await wait(400);

            // 2. transform을 초기화하여 원래 위치로 한번에 복귀 (CSS transition이 부드럽게 처리)
            fromEl.style.transform = '';
            // CSS transition 시간(0.4s)만큼 기다려줌
            await wait(400);

        } finally {
            // ★★★★★ 수정된 부분 1: 애니메이션이 끝나면 모든 클래스와 스타일을 확실히 제거 ★★★★★
            fromEl.style.transform = ''; // 만약의 경우를 대비해 transform 초기화
            fromEl.classList.remove('is-pouring');
            fromUnitEl.classList.remove('is-pouring-unit');
            this.isAnimating = false;
        }
    }
    
    handleSubmit() {
        if (this.isAnimating) return;

        if (this.config.winCondition(this.currentState)) {
            this.config.onComplete(true);
        } else {
            this.failureCount++;
            this.reset(); 
            // ★★★★★★★★★★★★★★★★★

            if (this.failureCount >= 2) {
                this.config.onComplete(false);
            } else {
                alert(`틀렸습니다. 다시 생각해보세요. (남은 기회: ${2 - this.failureCount}번)`);
            }
        }
    }

    pour(fromIndex, toIndex) {
        // ... (이 부분은 변경 없습니다) ...
        const spaceAvailable = this.config.capacities[toIndex] - this.currentState[toIndex];
        const amountToPour = Math.min(this.currentState[fromIndex], spaceAvailable);
        if (amountToPour > 0) {
            this.currentState[fromIndex] -= amountToPour;
            this.currentState[toIndex] += amountToPour;
        }
    }

    updateDisplay() {
        // ... (이 부분은 변경 없습니다) ...
        this.config.jugElements.forEach((jug, index) => {
            const display = jug.querySelector('span');
            if (display) display.textContent = this.currentState[index];
            const liquidEl = jug.querySelector('.jug-liquid');
            if (liquidEl) {
                const percentage = this.config.capacities[index] > 0 ? (this.currentState[index] / this.config.capacities[index]) * 100 : 0;
                liquidEl.style.height = `${percentage}%`;
            }
        });
    }

    reset() {
        // ... (이 부분은 변경 없습니다) ...
        if (this.isAnimating) return;
        this.currentState = [...this.config.initialState];
        if (this.selectedJugIndex !== null) {
            this.config.jugElements[this.selectedJugIndex].classList.remove(this.config.selectedClass);
            this.selectedJugIndex = null;
        }
        
        this.config.jugElements.forEach(jug => {
            jug.style.transform = '';
        });

        this.updateDisplay();
    }
}