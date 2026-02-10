/**
 * 페이지 내의 특정 영역에서 {{NAME}} 표식을 찾아 플레이어 이름으로 교체합니다.
 * @param {string} containerSelector - 이름을 교체할 범위를 지정하는 CSS 선택자 (예: '.story-content-wrapper')
 */
export default function replacePlayerName(containerSelector) {
    // 1. localStorage에서 플레이어 이름을 가져옵니다.
    const name = localStorage.getItem('player_name') || "익명의 박사";

    // 2. 이름을 교체할 영역(부모 요소)을 선택합니다.
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`'${containerSelector}' 요소를 찾을 수 없습니다.`);
        return; // 영역이 없으면 함수를 즉시 종료
    }

    // 3. 정규식을 사용하여 {{NAME}} 이라는 표식을 모두 찾아냅니다. (대소문자 무시)
    // 'g' 플래그는 영역 내의 모든 {{NAME}}을 찾으라는 의미입니다.
    const placeholderRegex = /\{\{NAME\}\}/g;

    // 4. 부모 요소의 전체 HTML을 대상으로 이름 교체를 한 번에 실행합니다.
    // 이렇게 하면 <p> 태그, <h2> 태그 등 모든 자식 요소를 한 번에 처리할 수 있습니다.
    container.innerHTML = container.innerHTML.replaceAll(placeholderRegex, name);
}