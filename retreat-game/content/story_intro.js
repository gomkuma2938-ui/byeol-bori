// [완벽 복원] 불필요한 로직을 모두 제거하고, 표준 아키텍처를 따름
import animateText from './text-animator.js';

export default function init() {
    animateText('.fade-up-container');
    return { 
        destroy: () => {} 
    };
}