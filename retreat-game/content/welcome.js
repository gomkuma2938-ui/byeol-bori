// [최종 수정] 리더님의 text-animator.js를 사용하도록 완벽 복원
import animateText from './text-animator.js';

export default function init() {
    // [핵심] 범용 컨테이너를 대상으로 리더님의 애니메이터를 실행
    animateText('.fade-up-container');

    return { 
        destroy: () => {} 
    };
}