// main.js (디버그 페이지 진입 기능이 복원된 최종본)

// ========================================================================
// [핵심 수정] 푸시 알림 관련 함수
// ========================================================================
let isContentLoading = false;

async function initializePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('푸시 알림이 이 브라우저에서 지원되지 않습니다.');
        return;
    }
    try {
        const registration = await navigator.serviceWorker.register('/retreat-game/service-worker.js');
        await navigator.serviceWorker.ready;
        console.log('서비스 워커 활성화 완료.');
        await subscribeUser(registration);
    } catch (error) {
        console.error('서비스 워커 또는 구독 중 오류:', error);
    }
}

async function subscribeUser(registration) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('알림 권한이 허용되지 않았습니다.');
        return;
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
        console.log('이미 구독된 사용자입니다.');
        await sendSubscriptionToServer(existingSubscription);
        return;
    }

    const vapidPublicKey = 'BCv1p089IbPbj45y-BTFokAB2lLMHbKc56HKKkVeoSBozJrTHd5M8TrFah8j42SG-37HWnqF_w7LqaFwsPr0DaA';

    try {
        const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey
        });
        console.log('새로운 브라우저 구독 정보 생성 완료:', newSubscription);
        await sendSubscriptionToServer(newSubscription);
    } catch (error) {
        console.error('구독 정보 생성 실패:', error);
    }
}

async function sendSubscriptionToServer(subscription) {
    try {
        console.log('구독 정보를 Firebase로 전송 시도...');
        await fetch('https://us-central1-star-game-971a5.cloudfunctions.net/saveSubscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
        });
        console.log('구독 정보를 Firebase에 성공적으로 전송했습니다.');
    } catch (error) {
        console.error('Firebase로 구독 정보 전송 중 오류 발생:', error);
    }
}

// ========================================================================
// --- 1. 전역 함수 선언 및 초기화 ---
// ========================================================================

window.loadContent = loadContent;
window.startGame = startGame;

window.requestNotificationAndStartTest = async function() {
    try {
        await initializePushNotifications();
    } catch (error) {
        console.error("알림 기능에 오류가 있었지만, 게임은 계속 진행합니다:", error);
    }
    window.loadContent('psychology_test.html');
}

window.startFirstMission = startFirstMission;
window.missionCleared = missionCleared;
window.missionFailed = missionFailed;
window.loadNewMission = loadNewMission;


// ========================================================================
// [추가] 힌트 시스템 전역 UI 요소 및 로직
// ========================================================================
const hintUi = {
    container: document.getElementById('global-hint-ui'),
    countSpan: document.getElementById('global-hint-count'),
    modalContainer: document.getElementById('global-modal-container'),
    modalText: document.getElementById('global-modal-text')
};

// ========================================================================
// [추가] 메모 시스템 전역 UI 요소 및 로직
// ========================================================================
const memoUi = {
    layer: document.getElementById('global-memo-layer'),
    canvas: document.getElementById('memo-canvas'),
    openBtn: document.getElementById('global-memo-ui'),
    closeBtn: document.getElementById('memo-close-btn'),
    clearBtn: document.getElementById('memo-clear-btn'), // [수정] 지우기 버튼 추가
    ctx: null,
    isDrawing: false,
};

let usedHintsForCurrentMission = new Set(); // 현재 미션에서 힌트를 봤는지 기록

function showModal() {
    const hintText = currentModule?.config?.hintText;
    if (!hintText) {
        alert("이 문제에는 제공되는 힌트가 없습니다.");
        return;
    }

    const isRecallMode = currentModule.config.title === '여정 회상하기';
    const isDebugMode = !!sessionStorage.getItem('debug_mode');

    // 디버그 또는 다시보기 모드에서는 힌트를 무제한으로 사용
    if (isRecallMode || isDebugMode) {
        hintUi.modalText.innerHTML = hintText;
        hintUi.modalContainer.style.display = 'flex';
        setTimeout(() => hintUi.modalContainer.classList.add('show'), 10);
        return;
    }
    
    // --- [핵심 수정] 힌트 사용 가능 여부 확인 로직 변경 ---
    const currentHints = parseInt(localStorage.getItem('hint_count') || '0');
    const isAlreadyUsed = usedHintsForCurrentMission.has(currentModule.config.title);

    // 조건: 힌트가 0개이고, 이번 미션에서 힌트를 본 적도 없다면 사용 불가
    if (currentHints <= 0 && !isAlreadyUsed) {
        alert("힌트를 모두 사용했습니다.");
        return;
    }

    // 이전에 힌트를 보지 않았다면 (처음 보는 경우), 횟수를 차감하고 기록
    if (!isAlreadyUsed) {
        localStorage.setItem('hint_count', (currentHints - 1).toString());
        usedHintsForCurrentMission.add(currentModule.config.title);
        updateHintUI(); // 횟수 차감 후 즉시 UI 업데이트
    }

    // 힌트 모달 표시 (정상적으로 횟수를 차감했거나, 이미 봐서 다시 보는 경우)
    hintUi.modalText.innerHTML = hintText;
    hintUi.modalContainer.style.display = 'flex';
    setTimeout(() => hintUi.modalContainer.classList.add('show'), 10);
}

function closeModal() {
    hintUi.modalContainer.classList.remove('show');
    // 애니메이션이 끝난 후 display를 none으로 변경
    setTimeout(() => {
        hintUi.modalContainer.style.display = 'none';
    }, 300); // CSS transition 시간과 동일하게 설정
}

function updateHintUI() {
    // [최종 수정] currentModule이 존재하고, 파일명에 'mission'이 포함되며, 힌트 텍스트가 있을 때만 힌트 아이콘을 보여줍니다.
    const isMissionPageWithHint = currentModule &&
                                  currentModule.fileName &&
                                  currentModule.fileName.includes('mission') &&
                                  currentModule.config.hintText;

    if (isMissionPageWithHint) {
        hintUi.container.classList.add('show');

        const isRecallMode = currentModule.config.title === '여정 회상하기';
        const isDebugMode = !!sessionStorage.getItem('debug_mode');

        if (isRecallMode || isDebugMode) {
            hintUi.countSpan.textContent = '';
            hintUi.container.classList.remove('disabled');
            return;
        }

        const currentHints = parseInt(localStorage.getItem('hint_count') || '0');
        hintUi.countSpan.textContent = currentHints;

        if (currentHints <= 0) {
            hintUi.container.classList.add('disabled');
        } else {
            hintUi.container.classList.remove('disabled');
        }
    } else {
        hintUi.container.classList.remove('show');
    }
}

function updateMemoUI() {
    const isMissionPage = currentModule && currentModule.fileName && currentModule.fileName.includes('mission');

    if (isMissionPage) {
        // [수정] style.display 대신 .show 클래스를 추가합니다.
        memoUi.openBtn.classList.add('show');
    } else {
        // [수정] style.display 대신 .show 클래스를 제거합니다.
        memoUi.openBtn.classList.remove('show');
    }
}

hintUi.container.addEventListener('click', showModal);
hintUi.modalContainer.addEventListener('click', (event) => {
    // 모달의 어두운 배경 부분을 클릭했을 때도 닫히도록 설정
    if (event.target === hintUi.modalContainer) {
        closeModal();
    }
});

let currentModule = null;

import initPsychologyTest from './content/psychology_test.js';

function setupMemoCanvas() {
    const canvas = memoUi.canvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    memoUi.ctx = canvas.getContext('2d');
    memoUi.ctx.scale(dpr, dpr);
    memoUi.ctx.strokeStyle = 'red';
    memoUi.ctx.lineWidth = 4;
    memoUi.ctx.lineCap = 'round';
    memoUi.ctx.lineJoin = 'round';
}

function getTouchPos(canvas, touchEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: touchEvent.touches[0].clientX - rect.left,
        y: touchEvent.touches[0].clientY - rect.top
    };
}

function startDrawing(e) {
    e.preventDefault();
    memoUi.isDrawing = true;
    const pos = e.type === 'touchstart' ? getTouchPos(memoUi.canvas, e) : { x: e.offsetX, y: e.offsetY };
    memoUi.ctx.beginPath();
    memoUi.ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
    if (!memoUi.isDrawing) return;
    e.preventDefault();
    const pos = e.type === 'touchmove' ? getTouchPos(memoUi.canvas, e) : { x: e.offsetX, y: e.offsetY };
    memoUi.ctx.lineTo(pos.x, pos.y);
    memoUi.ctx.stroke();
}

function stopDrawing() {
    if (!memoUi.isDrawing) return;
    memoUi.isDrawing = false;
    memoUi.ctx.closePath();
    // 현재 문제의 메모 내용 저장
    if (currentModule && currentModule.config.title) {
        sessionStorage.setItem(`memo_${currentModule.config.title}`, memoUi.canvas.toDataURL());
    }
}

function openMemo() {
    memoUi.layer.style.display = 'block';
    setupMemoCanvas(); 

    // [핵심] <body>에 클래스를 추가하여 '메모장이 열렸음' 상태를 알립니다.
    document.body.classList.add('memo-is-open');

    // 현재 문제에 저장된 메모가 있으면 불러오기
    if (currentModule && currentModule.config.title) {
        const savedMemo = sessionStorage.getItem(`memo_${currentModule.config.title}`);
        if (savedMemo) {
            const img = new Image();
            img.onload = () => {
                memoUi.ctx.drawImage(img, 0, 0, memoUi.canvas.width / (window.devicePixelRatio || 1), memoUi.canvas.height / (window.devicePixelRatio || 1));
            };
            img.src = savedMemo;
        }
    }
    
    // 부드럽게 나타나는 효과
    setTimeout(() => memoUi.layer.classList.add('show'), 10);
}

function closeMemo() {
    // [핵심] <body>에서 클래스를 제거하여 '메모장이 닫혔음' 상태를 알립니다.
    document.body.classList.remove('memo-is-open');

    memoUi.layer.classList.remove('show');
    setTimeout(() => {
        memoUi.layer.style.display = 'none';
    }, 300);
}

function clearMemoCanvas() {
    // 1. [핵심] 캔버스의 그리기 정보(context)가 있는지 먼저 확인합니다.
    if (memoUi.ctx) {
        const canvas = memoUi.canvas;
        // 캔버스를 깨끗하게 지웁니다.
        memoUi.ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        console.error('메모 캔버스 정보를 찾을 수 없어 지우기 명령을 실행할 수 없습니다.');
        return;
    }

    // 2. 저장된 메모 데이터도 함께 삭제합니다.
    if (currentModule && currentModule.config.title) {
        sessionStorage.removeItem(`memo_${currentModule.config.title}`);
    }
}

// [수정] 이벤트 리스너 등록 부분을 더 안전한 코드로 변경합니다.
// 각 버튼이 실제로 존재하는지 확인한 후, 클릭 이벤트를 연결합니다.
if (memoUi.openBtn) {
    memoUi.openBtn.addEventListener('click', openMemo);
}
if (memoUi.closeBtn) {
    memoUi.closeBtn.addEventListener('click', closeMemo);
}
if (memoUi.clearBtn) {
    memoUi.clearBtn.addEventListener('click', clearMemoCanvas);
}

// 메모 기능 이벤트 리스너 등록
memoUi.openBtn.addEventListener('click', openMemo);
memoUi.closeBtn.addEventListener('click', closeMemo);
memoUi.canvas.addEventListener('mousedown', startDrawing);
memoUi.canvas.addEventListener('mousemove', draw);
memoUi.canvas.addEventListener('mouseup', stopDrawing);
memoUi.canvas.addEventListener('mouseleave', stopDrawing); // 캔버스 밖으로 나가도 중지
// 터치 이벤트 지원
memoUi.canvas.addEventListener('touchstart', startDrawing);
memoUi.canvas.addEventListener('touchmove', draw);
memoUi.canvas.addEventListener('touchend', stopDrawing);

// ========================================================================
// [최종본] 가장 단순하고 안정적인 초기 로딩 로직
// ========================================================================

window.onload = function() {
    // 페이지가 로드될 때 실행되는 기본 로직 (단순한 초기 버전과 동일)
    sessionStorage.removeItem('debug_mode');
    const searchParams = new URLSearchParams(window.location.search);
    const missionToTest = searchParams.get('mission');
    const hash = window.location.hash;

    if (hash && hash.startsWith('#phase=')) {
        handlePhaseTransition(parseInt(hash.substring('#phase='.length)));
    } else if (missionToTest) {
        sessionStorage.setItem('debug_mode', missionToTest);
        localStorage.setItem('game_status', 'playing');
        localStorage.setItem('current_mission_index', '0');
        loadContent(missionToTest);
    } else {
        checkGameStatus();
    }
};

// [핵심] 페이지가 다시 보이게 될 때 실행되는 최후의 코드
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const currentUrl = window.location.href;
        const lastLoadedUrl = sessionStorage.getItem('last_loaded_url');

        // 조건: 현재 URL과, 마지막으로 성공 로드했던 URL이 다를 경우
        if (lastLoadedUrl && currentUrl !== lastLoadedUrl) {
            console.warn(`[강제 새로고침] URL 불일치 감지. 페이지를 새로고침합니다.`);
            // 캐시까지 무시하는 가장 강력한 형태의 새로고침을 실행
            location.reload(true);
        }
    }
});

function handlePhaseTransition(phase) {
    // [핵심] 화면을 성공적으로 로드할 때마다, 현재 URL을 세션에 기록
    sessionStorage.setItem('last_loaded_url', window.location.href);

    switch (phase) {
        case 2:
            localStorage.setItem('game_status', 'phase2_unlocked');
            loadContent('story_phase2.html');
            break;
        case 3:
            localStorage.setItem('game_status', 'phase3_unlocked');
            loadContent('story_phase3.html');
            break;
        case 4:
            localStorage.setItem('game_status', 'finished');
            loadContent('story_phase4.html');
            break;
        default:
            checkGameStatus();
            break;
    }
}

function checkGameStatus() {
    const status = localStorage.getItem('game_status');

    if (status === 'playing') {
        const myMissions = localStorage.getItem('my_mission_list');
        if (myMissions) {
            loadCurrentMission(); 
        } else {
            startGame(); 
        }
    } 
    else if (status === 'missions_cleared') { 
        loadContent('story_final.html'); 
    }
    else if (status === 'intro') { 
        loadContent('story_intro.html');
    }
    else {
        localStorage.clear();
        loadContent('welcome.html');
    }
}

async function loadContent(fileName, customTitle = null) {
    if (isContentLoading) { return; }
    isContentLoading = true;
    
    const gameContainer = document.getElementById('game-container');
    const contentWrapper = document.getElementById('dynamic-content');
    
    try {
        if (currentModule && currentModule.destroy) {
            currentModule.destroy();
        }
        currentModule = null;

        closeModal(); 
        closeMemo(); 

        // currentModule을 null로 만든 직후, UI 업데이트를 바로 실행하여
        // 이전 페이지의 아이콘들이 남아있지 않도록 확실하게 숨깁니다.
        updateHintUI();
        updateMemoUI();        

        // 1. gameContainer를 투명하게 만드는 작업을 requestAnimationFrame으로 감싸
        //    브라우저가 해당 스타일 변경을 확실히 인지하고 다음 프레임에 그리도록 합니다.
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                gameContainer.style.opacity = 0;
                // 2. 스타일 변경이 적용된 후, 애니메이션 시간만큼 기다립니다.
                setTimeout(resolve, 500); 
            });
        });

        const response = await fetch(`content/${fileName}`);
        if (!response.ok) { throw new Error(`${fileName} 로딩 실패`); }
        const html = await response.text();
        
        contentWrapper.innerHTML = html;
        
        await new Promise(resolve => requestAnimationFrame(resolve));

        if (fileName === 'welcome.html') {
            const startButton = document.getElementById('start-test-btn');
            if (startButton) {
                startButton.addEventListener('click', window.requestNotificationAndStartTest);
            }
        }

        try {
            const modulePath = `./content/${fileName.replace('.html', '.js')}`;
            const moduleFactory = await import(modulePath);
            const initFunction = moduleFactory.default || moduleFactory.init;

            if (typeof initFunction === 'function') {
                const elements = {
                    title: contentWrapper.querySelector('#puzzle-title'),
                    question: contentWrapper.querySelector('#puzzle-question'),
                    canvas: contentWrapper.querySelector('#puzzle-canvas'),
                    submitBtn: contentWrapper.querySelector('#puzzle-submit-btn'),
                    resultContainer: contentWrapper.querySelector('#extraction-result'),
                    resultTextarea: contentWrapper.querySelector('#result-textarea'),
                    copyBtn: contentWrapper.querySelector('#copy-btn'),
                };
                
                let missionTitle;
                if (sessionStorage.getItem('debug_mode')) {
                    missionTitle = `[디버그] ${fileName.replace('.html', '')}`;
                } else if (customTitle) {
                    missionTitle = customTitle;
                } else {
                    const missionNumberMap = ["첫 번째", "두 번째", "세 번째", "네 번째", "다섯 번째"];
                    const currentIndex = parseInt(localStorage.getItem('current_mission_index'));
                    if (!isNaN(currentIndex) && currentIndex < missionNumberMap.length) {
                        missionTitle = `${missionNumberMap[currentIndex]} 문제`;
                    } else {
                        missionTitle = "문제"; // 예외 처리
                    }
                }

                const config = {
                    title: missionTitle,
                    onComplete: (isSuccess) => {
                        if (isSuccess) missionCleared(); else missionFailed();
                    }
                };
                
                currentModule = {
                    config: config,
                    fileName: fileName
                };
                
                const puzzleInstance = initFunction(config, elements);
                if (typeof puzzleInstance === 'object' && puzzleInstance !== null) {
                    Object.assign(currentModule, puzzleInstance);
                }
            }
        } catch (e) { 
            console.error(`Error initializing module for ${fileName}:`, e);
        }

        updateHintUI();
        updateMemoUI();

        gameContainer.style.opacity = 1;

    } catch (error) {
        console.error("콘텐츠 로딩 중 오류 발생:", error);
    } finally {
        isContentLoading = false;
    }
}

async function startGame() {
    localStorage.removeItem('my_mission_list');
    localStorage.removeItem('current_mission_index');
    
    // [추가] 게임 시작 시 힌트 횟수 초기화
    localStorage.setItem('hint_count', '2');
    usedHintsForCurrentMission.clear(); // 게임 재시작 시 힌트 사용 기록 초기화

    localStorage.setItem('game_status', 'intro'); 
    
    try {
        const response = await fetch('php/get-mission-list.php');
        if (!response.ok) {
            throw new Error('미션 목록을 서버에서 가져오는 데 실패했습니다.');
        }
        const allMissions = await response.json();

        const cleanedMissions = allMissions.map(mission => String(mission).trim().toLowerCase());
        const uniqueMissions = [...new Set(cleanedMissions)];

        if (uniqueMissions.length < 5) {
            alert('게임 미션 설정에 오류가 발생했습니다. 관리자에게 문의해주세요.');
            return; 
        }

        const shuffledMissions = shuffleArray(uniqueMissions);
        const missionsToPlay = shuffledMissions.slice(0, 5);
        
        localStorage.setItem('my_mission_list', JSON.stringify(missionsToPlay));
        localStorage.setItem('current_mission_index', '0');
        
        await loadContent('story_intro.html');

    } catch (error) {
        console.error("startGame 함수 실행 중 오류:", error);
        alert("게임을 시작하는 중 문제가 발생했습니다. 페이지를 새로고침 해주세요.");
    }
}

async function loadCurrentMission() {
    const myMissions = JSON.parse(localStorage.getItem('my_mission_list'));
    let currentIndex = parseInt(localStorage.getItem('current_mission_index'));
    if (myMissions && currentIndex < myMissions.length) {
        let missionFile = myMissions[currentIndex];
        if (!missionFile.endsWith('.html')) { missionFile += '.html'; }
        await loadContent(missionFile);
    } else {
        localStorage.setItem('game_status', 'missions_cleared');
        await loadContent('story_final.html');
    }
}

async function loadNextMission() {
    const myMissions = JSON.parse(localStorage.getItem('my_mission_list'));
    if (!myMissions) {
        checkGameStatus();
        return;
    }
    await loadCurrentMission();
}

function startFirstMission() {
    localStorage.setItem('game_status', 'playing');
    loadCurrentMission();
}

function missionCleared() {
    if (sessionStorage.getItem('debug_mode')) {
        console.log("[디버그 모드] 미션 클리어! 최종 스토리 화면으로 바로 이동합니다.");
        loadContent('story_final.html');
    } else {
        _recordAndAdvanceMission();
    }
}

async function missionFailed() {
    const debugMission = sessionStorage.getItem('debug_mode');
    if (debugMission) {
        alert("[디버그 모드] 미션을 재시도합니다.");
        await loadContent(debugMission);
        return;
    }

    alert("두 번의 기회를 모두 사용했습니다. 새로운 문제를 맞닥뜨립니다.");

    // 1. 현재 상태를 가져옵니다. (기존과 동일)
    const myMissions = JSON.parse(localStorage.getItem('my_mission_list'));
    const currentIndex = parseInt(localStorage.getItem('current_mission_index'));
    const failedMission = myMissions[currentIndex];

    // 2. 실패한 미션을 플레이 기록에 남깁니다. (기존과 동일)
    _recordMissionAsPlayed(failedMission);

    // 3. 서버에서 전체 미션 목록을 가져옵니다. (기존과 동일)
    const response = await fetch('php/get-mission-list.php');
    const allMissionsRaw = await response.json();
    const allUniqueMissions = [...new Set(allMissionsRaw.map(m => String(m).trim().toLowerCase()))];

    // ★★★★★ [핵심 로직 수정] ★★★★★
    // 4. '교체 후보'를 올바른 기준으로 필터링합니다.
    
//    기준 1: '현재 내가 할당받은 5개의 미션'을 가져옵니다.
const currentMissions = myMissions;

//    기준 2: '지금까지 한 번이라도 플레이했던 모든 미션(성공, 실패 포함)'을 가져옵니다.
const playedMissions = JSON.parse(localStorage.getItem('played_missions') || '[]');

//    기준 3: 이 두 목록을 합쳐 '절대로 다음에 나와서는 안 되는 미션' 목록을 완성합니다.
//    Set을 사용하면 중복이 자동으로 제거됩니다.
const missionsToExclude = new Set([...currentMissions, ...playedMissions]);

//    기준 4: 전체 미션 목록에서, 위에서 만든 제외 목록에 포함되지 않은 것만 진짜 '교체 후보'로 삼습니다.
let candidateMissions = allUniqueMissions.filter(mission => !missionsToExclude.has(mission));

    let replacementMission;

    // 5. 교체할 미션을 최종 선택합니다.
    if (candidateMissions.length > 0) {
        // 후보군이 있다면, 그중에서 무작위로 하나를 선택합니다.
        replacementMission = candidateMissions[Math.floor(Math.random() * candidateMissions.length)];
    } else {
        // [예외 처리] 만약 후보군이 없다면 (예: 전체 미션이 5개뿐인 경우),
        // 사용자가 요청한 대로 '지금 실패한 미션'을 제외한 나머지 모든 미션 중에서 다시 고릅니다.
        let fallbackCandidates = allUniqueMissions.filter(m => m !== failedMission);
        
        if (fallbackCandidates.length > 0) {
            replacementMission = fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
        } else {
            // 게임에 미션이 단 하나뿐인 최악의 경우, 그냥 실패한 미션을 다시 줍니다.
            replacementMission = failedMission;
        }
    }
    // ★★★★★ [수정된 로직 끝] ★★★★★

    // 6. 할당된 미션 목록을 교체된 미션으로 갱신하고 저장합니다.
    myMissions[currentIndex] = replacementMission;
    localStorage.setItem('my_mission_list', JSON.stringify(myMissions));

    // 7. 교체된 새로운 미션을 불러옵니다.
    await loadCurrentMission();
}

async function loadNewMission() {
    try {
        const response = await fetch('php/get-mission-list.php');
        const allMissions = await response.json();
        const playedMissions = JSON.parse(localStorage.getItem('played_missions') || '[]');
        const unplayedMissions = allMissions.filter(mission => !playedMissions.includes(mission));

        let missionToLoad;

        if (unplayedMissions.length > 0) {
            missionToLoad = unplayedMissions[Math.floor(Math.random() * unplayedMissions.length)];
        } else {
            alert("모든 여정을 회상하셨습니다! 다시 처음부터 여정을 돌아봅니다.");
            missionToLoad = allMissions[Math.floor(Math.random() * allMissions.length)];
        }

        if (window.loadContent) {
            window.loadContent(missionToLoad, '여정 회상하기'); 
        }

    } catch (error) {
        console.error("새로운 미션을 불러오는 데 실패했습니다:", error);
        alert("미션을 불러오는 중 오류가 발생했습니다.");
    }
}

function _recordAndAdvanceMission() {
    const myMissions = JSON.parse(localStorage.getItem('my_mission_list'));
    let currentIndex = parseInt(localStorage.getItem('current_mission_index'));
    _recordMissionAsPlayed(myMissions[currentIndex]);

    const nextIndex = currentIndex + 1;
    localStorage.setItem('current_mission_index', nextIndex.toString());

    if (nextIndex >= myMissions.length) {
        console.log(`할당된 미션 ${myMissions.length}개를 모두 완료했습니다! 최종 스토리 화면으로 이동합니다.`);
        localStorage.setItem('game_status', 'missions_cleared');
        loadContent('story_final.html');
    } else {
        loadNextMission();
    }
}

function _recordMissionAsPlayed(missionFileName) {
    let played = JSON.parse(localStorage.getItem('played_missions') || '[]');
    if (!played.includes(missionFileName)) { played.push(missionFileName); }
    localStorage.setItem('played_missions', JSON.stringify(played));
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ★★★★★ [수정] 디버그 페이지 진입을 위한 히든 제스처 코드 복원 ★★★★★
// ========================================================================

// 디버그 페이지로 이동하는 함수
function openDebugMenu() {
    window.location.href = 'debug.html';
}

// 터치 횟수를 계산하기 위한 변수
let touchCounter = 0;
let resetTimer = null;

// 화면 터치 이벤트를 감지
document.addEventListener('touchstart', e => {
    // 화면의 왼쪽 상단 (80px x 80px) 영역인지 확인
    const touch = e.touches[0];
    if (touch.clientX < 80 && touch.clientY < 80) {
        
        // 2초 안에 다음 터치가 없으면 카운터를 초기화하는 타이머 설정
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            touchCounter = 0;
        }, 2000);
        
        // 터치 횟수를 1 증가
        touchCounter++;
        
        // 만약 5번 터치했다면 디버그 메뉴를 엽니다.
        if (touchCounter >= 5) {
            touchCounter = 0; // 카운터 초기화
            clearTimeout(resetTimer); // 타이머 제거
            openDebugMenu();
        }
    }
});