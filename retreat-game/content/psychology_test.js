// [최종 완성본] 모든 데이터 복원 및 애니메이션 충돌 문제를 근본적으로 해결한 코드
const questions = [
    { q: "당신은 청년부의 리더가 되었습니다.<br>가장 먼저 하고 싶은 일은?", a: "체계적인 목표와 실행 계획을 세운다.", b: "우리의 영적 방향성을 위해<br>깊이 기도한다.", c: "모든 부원이 친해지도록<br>교제 시간을 마련한다." },
    { q: "당신이 기도할 때,<br>주로 어떤 내용으로 기도드리나요?", a: "하나님의 뜻을 이룰 지혜와<br>구체적인 계획을 구한다.", b: "함께해주신 은혜에 감사하며,<br>주님을 찬양한다.", c: "주변 사람들의 아픔과 필요를 위해<br>중보기도 한다." },
    { q: "설교를 들은 후,<br>마음에 가장 강하게 남는 것은?", a: "이번 주에 실천해야 할 구체적인 목록.", b: "말씀에 대한 새로운 영적인 깨달음.", c: "이웃을 더 사랑해야겠다는<br>따뜻한 마음." },
    { q: "정말 힘든 문제에 부딪혔을 때,<br>당신의 첫 반응은?", a: "상황을 객관적으로 분석하고<br>가장 효율적인 해결 방법을 찾는다.", b: "이 상황에 대한 하나님의 뜻을 알기 위해<br>골방으로 들어간다.", c: "신뢰하는 사람들에게 연락해<br>함께 기도하며 위로와 지지를 얻는다." },
    { q: "교회에서 봉사를 한다면,<br>어느 부서에서 일하고 싶나요?", a: "효율적인 운영을 돕는 팀<br>(재정부, 관리부)", b: "예배의 영성을 깊게 하는 팀<br>(찬양팀, 안내팀)", c: "사람들을 직접 만나고 돌보는 팀<br>(새가족부, 교육부)" },
    { q: "성경 인물 중,<br>당신의 '롤모델'은 누구인가요?", a: "치밀한 계획으로 성벽을 재건한 지도자<br>< 느헤미야 >", b: "어떤 상황에서도 찬양을 잃지 않았던 왕<br>< 다윗 >", c: "온유함으로 백성의 짐을 진 선지자<br>< 모세 >" },
    { q: "누군가에게 선물을 해야 합니다.<br>무엇을 선물할까요?", a: "상대방에게 가장 실용적이고<br>필요한 것을 선물한다.", b: "관계의 의미를 더하거나,<br>신앙에 도움이 되는 것을 선물한다.", c: "마음을 알아주는 따뜻하고<br>감성적인 선물을 한다." },
    { q: "자유로운 주말, 어떻게 보내야<br>가장 '잘 쉬었다'고 느끼나요?", a: "자기계발 등 생산적인 활동으로<br>시간을 보낸다.", b: "혼자 조용히 묵상하며<br>하나님과 깊이 교제한다.", c: "사랑하는 사람들과 만나<br>진솔한 대화를 나눈다." },
    { q: "우리 청년부가 최고가 되었으면 하는 부분은 무엇인가요?", a: "세상에 선한 영향력을 끼치는 체계적인 사역.", b: "누구도 흉내 낼 수 없는 깊고 뜨거운 영성.", c: "누구든 와서 쉴 수 있는<br>따뜻한 사랑의 공동체." },
    { q: "두 명의 청년이<br>심각한 갈등을 겪고 있습니다.<br>이 상황에서 당신은 어떻게 하겠습니까?", a: "갈등의 원인을 분석하고,<br>구체적인 해결책을 제시한다.", b: "인간적인 해결보다,<br>먼저 기도로 하나님의 지혜를 구한다.", c: "누가 맞는지 따지기보다,<br>양쪽의 이야기를 들어주고 공감해준다." },
    { q: "여정의 마지막, 아기 예수께 드릴<br>단 하나의 예물만 가져갈 수 있다면<br>무엇을 택하겠습니까?", a: "나의 가장 귀한 소유와 재능", b: "나의 가장 순전한 예배와 찬양", c: "낮은 곳에서 주님을 섬기는 겸손과 헌신" }
];

export default function init(config) {
    let currentQuestion = 0;
    const scores = { A: 0, B: 0, C: 0 };
    const transitionTime = 400;

    // ★★★★★ [수정 1] 애니메이션 진행 상태를 관리할 변수 추가 ★★★★★
    // true이면 어떤 클릭 이벤트도 처리하지 않습니다.
    let isTransitioning = true; 

    const testView = document.getElementById('test-view');
    const nameInputView = document.getElementById('name-input-view');
    const questionTitle = document.getElementById('question-title');
    const questionText = document.getElementById('question-text');
    const optionButtons = document.querySelectorAll('.option-btn');
    const nameInput = document.getElementById('player_name_input');
    const submitNameBtn = document.getElementById('submit-name-btn');

    function updateQuestionUI() {
        const q = questions[currentQuestion];
        questionTitle.textContent = `Question. ${String(currentQuestion + 1).padStart(2, '0')}`;
        questionText.innerHTML = q.q;
        optionButtons[0].innerHTML = q.a;
        optionButtons[1].innerHTML = q.b;
        optionButtons[2].innerHTML = q.c;
    }

    function showNameInputView() {
        let maxType = 'A';
        if (scores.B > scores[maxType]) maxType = 'B';
        if (scores.C > scores[maxType]) maxType = 'C';
        localStorage.setItem('mbti_type', maxType);
    
        testView.classList.remove('is-visible');

        setTimeout(() => {
            testView.style.display = 'none';
            nameInputView.style.display = 'flex';
            
            requestAnimationFrame(() => {
                nameInputView.classList.add('is-visible');
                // 이름 입력 화면 전환이 끝나면 입력 가능 상태로 변경
                isTransitioning = false; 
            });
        }, transitionTime);
    }
    
    function transitionToNextQuestion() {
        testView.classList.remove('is-visible');
    
        setTimeout(() => {
            currentQuestion++;
            updateQuestionUI();
    
            requestAnimationFrame(() => {
                testView.classList.add('is-visible');
    
                // [수정] 나타나는 애니메이션(transitionTime)이 끝날 때까지 한 번 더 기다립니다.
                setTimeout(() => {
                    isTransitioning = false;
                    optionButtons.forEach(button => button.disabled = false);
                }, transitionTime); 
            });
    
        }, transitionTime);
    }
    
    function handleOptionClick(event) {
        // ★★★★★ [수정 2] 애니메이션 중이면 즉시 함수 종료 ★★★★★
        if (isTransitioning) return;

        // 클릭이 유효하므로, 즉시 상태를 '애니메이션 진행 중'으로 변경
        isTransitioning = true;
        
        const type = event.target.dataset.type;
        if (!type) {
            isTransitioning = false; // type이 없으면 다시 false로 원복
            return;
        }
        scores[type]++;
    
        // 시각적으로 버튼이 눌리지 않게 바로 비활성화 (기존 코드 유지)
        optionButtons.forEach(button => button.disabled = true);
    
        if (currentQuestion < questions.length - 1) {
            transitionToNextQuestion();
        } else {
            showNameInputView();
        }
    }

    function handleSubmitName() {
        // 이름 제출 시에도 중복 클릭 방지
        if (isTransitioning) return;
        isTransitioning = true;

        const playerName = nameInput.value.trim();
        if (!playerName) {
            alert('이름을 입력해주세요!');
            isTransitioning = false; // 입력이 없었으므로 다시 false로 원복
            return;
        }
        localStorage.setItem('player_name', playerName);
        window.loadContent('result.html');
    }

    optionButtons.forEach(button => button.addEventListener('click', handleOptionClick));
    submitNameBtn.addEventListener('click', handleSubmitName);

    // --- 초기 애니메이션 실행 로직 ---
    updateQuestionUI();
    optionButtons.forEach(button => button.disabled = true);

    // main.js의 페이드인(500ms)이 끝날 때까지 기다리는 부분 (기존 코드 유지)
    setTimeout(() => {
        testView.classList.add('is-visible');

        requestAnimationFrame(() => {
            testView.classList.add('enable-transition');
            nameInputView.classList.add('enable-transition');
        });
        
        // ★★★★★ [수정 4] 첫 화면이 모두 표시된 후, 입력을 최초로 허용 ★★★★★
        isTransitioning = false;
        optionButtons.forEach(button => button.disabled = false);
    }, 500);

    return {
        destroy: () => {
            optionButtons.forEach(button => button.removeEventListener('click', handleOptionClick));
            submitNameBtn.removeEventListener('click', handleSubmitName);
        }
    };
}