import animateText from './text-animator.js';
// 1. 방금 만든 이름 교체 함수를 import 합니다.
import replacePlayerName from './name-replacer.js'; 

export default function init(config) {
    // 2. 텍스트 애니메이션이 시작되기 *전*에 이름 교체 함수를 먼저 실행합니다.
    //    이름이 바뀔 영역의 부모 선택자('.story-content-wrapper' 또는 '.fade-up-container')를 넘겨줍니다.
    replacePlayerName('.fade-up-container');

    // [기존 코드] 이름이 모두 바뀐 상태에서 애니메이션을 실행합니다.
    animateText('.fade-up-container');

    return {
        destroy: () => {}
    };
}