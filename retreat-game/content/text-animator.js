// /content/text-animator.js (최종 수정본)

export default function animateText(containerSelector, onComplete) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn(`애니메이션 컨테이너(${containerSelector})를 찾을 수 없습니다.`);
        if (onComplete) onComplete();
        return;
    }

    const lines = container.querySelectorAll('[class*="line"]');
    const button = container.querySelector('button');
    const animationDuration = 800; // CSS에 정의된 애니메이션 시간(ms)과 일치

    if (button) {
        button.disabled = true;
        // cursor 스타일은 CSS에서 :disabled 상태로 제어하므로 JS에서 제거합니다.
        // button.style.cursor = 'wait'; 
    }
    
    if (lines.length === 0) {
        if (button) {
            button.disabled = false;
        }
        if (onComplete) onComplete();
        return;
    }

    lines.forEach((line, index) => {
        // 각 라인이 순차적으로 나타나도록 타이머 설정
        setTimeout(() => {
            line.classList.add('show');
            
            // [핵심 수정] 마지막 라인 애니메이션이 "시작"되었는지 확인
            if (index === lines.length - 1) {
                
                // 마지막 라인의 애니메이션이 "끝날 때까지" (800ms) 기다린 후 버튼 활성화
                setTimeout(() => {
                    if (button) {
                        button.disabled = false;
                    }
                    if (onComplete) {
                        onComplete();
                    }
                }, animationDuration);
            }
        }, 100 + (index * 300)); // 0.3초 간격으로 다음 라인 애니메이션 시작
    });
}