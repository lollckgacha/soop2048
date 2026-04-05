// === 1. 사운드 및 다크모드 시스템 ===
window.audioCtx = null;
window.globalVolume = parseFloat(localStorage.getItem('soop2048Volume') || '1.0');
window.isDarkMode = localStorage.getItem('soop2048DarkMode') === 'true';

window.initAudio = function() {
    if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
};

window.playSound = function(type) {
    if (!window.audioCtx || window.globalVolume <= 0) return;
    const now = window.audioCtx.currentTime;
    const osc = window.audioCtx.createOscillator();
    const gain = window.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(window.audioCtx.destination);

    if (type === 'move') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.05 * window.globalVolume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'merge') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
        gain.gain.setValueAtTime(0.1 * window.globalVolume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'timeup') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.15 * window.globalVolume, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.1 * window.globalVolume, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    } else if (type === 'clear') {
        osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.1); osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1 * window.globalVolume, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    }
};

// === 2. 기본 데이터 및 State 초기화 ===
window.getFirstChosung = function(str) {
    if (!str) return "";
    const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    const code = str.charCodeAt(0) - 44032;
    if (code > -1 && code < 11172) return cho[Math.floor(code / 588)];
    return str.charAt(0).toUpperCase();
};

window.CHOSUNG_LIST = ['전체', 'ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ', 'A-Z'];

window.FALLBACK_DATA = {
    streamers: [
        { "id": "s1", "name": "아이네", "imgs": ["images/streamers/aine.png"] },
        { "id": "s2", "name": "징버거", "imgs": ["images/streamers/jingbeogeo.png"] },
        { "id": "s3", "name": "릴파", "imgs": ["images/streamers/rilpa.png"] },
        { "id": "s4", "name": "주르르", "imgs": ["images/streamers/jureureu.png"] },
        { "id": "s5", "name": "고세구", "imgs": ["images/streamers/gosegu.png"] },
        { "id": "s6", "name": "비챤", "imgs": ["images/streamers/bichyan.png"] },
        { "id": "s7", "name": "우왁굳", "imgs": ["images/streamers/uwaggud.webp"] },
        { "id": "s14", "name": "천양", "imgs": ["images/streamers/cheonyang.webp"] }
    ],
    achievements: [
        { "id": "c1", "title": "이세계아이돌", "type": "CREW", "targetList": ["우왁굳", "아이네", "징버거", "릴파", "주르르", "고세구", "비챤"] }
    ]
};

window.DATA = (typeof SOOP_DATA !== 'undefined') ? SOOP_DATA : window.FALLBACK_DATA;
window.CREWS_DB = window.DATA.achievements.filter(a => a.type === 'CREW').map(c => ({ id: c.id, name: c.title, members: c.targetList, chosung: window.getFirstChosung(c.title) })).sort((a, b) => a.name.localeCompare(b.name));
window.MEMBER_DB = window.DATA.streamers.map(s => ({ id: s.id, name: s.name, imgUrl: s.imgs[0] || 'images/soop_logo.svg', chosung: window.getFirstChosung(s.name) }));

window.state = {
    screen: 'home',
    gameMode: 'normal',
    multiplayState: { isHost: false, roomId: null, players: {}, active: false }, 
    difficulty: 'advanced',
    selectedCrews: [], searchCrewText: '', filterChosung: '전체',
    availableMembers: [], selectedMembers: [],  
    gridSize: 4, board: [], tiles: {},
    score: 0, maxLevelReached: 0,
    gameOver: false, gameWon: false, continueAfterWin: false, isAnimating: false,
    gameImages: {}, guidePosition: 'bottom',
    timeLeft: 15.0, maxTime: 15.0, timerInterval: null,
    tutorialStep: 0,
    simulatedBots: [] 
};

window.generateId = () => Math.random().toString(36).substr(2, 9);
window.getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00adef&color=fff&font-size=0.33`;

// === 3. Firebase 및 사용자 설정 ===
window.loadBestScoresLocal = function() {
    try {
        const s = localStorage.getItem('soop2048BestScoresObj');
        if (s) return JSON.parse(s);
    } catch(e) {}
    return { normal: 0, surv_beginner: 0, surv_intermediate: 0, surv_advanced: 0, surv_expert: 0, surv_master: 0, rank_point: 1000 };
};
window.saveBestScoresLocal = function() {
    localStorage.setItem('soop2048BestScoresObj', JSON.stringify(window.userData.bestScores));
};

window.userData = { nickname: "", bestScores: window.loadBestScoresLocal() };

const fC = {
    apiKey: atob("QUl6YVN5QTFBa0lVMVVqdXhiX0c4dWpJNFFHTlJXNkhjOHRwZnln"),
    authDomain: atob("ZG9uZ3BhMjAyNi0yZmRhNS5maXJlYmFzZWFwcC5jb20="),
    databaseURL: atob("aHR0cHM6Ly9kb25ncGEyMDI2LTJmZGE1LWRlZmF1bHQtcnRkYi5hc2lhLXNvdXRoZWFzdDEuZmlyZWJhc2VkYXRhYmFzZS5hcHA="),
    projectId: atob("ZG9uZ3BhMjAyNi0yZmRhNQ=="),
    storageBucket: atob("ZG9uZ3BhMjAyNi0yZmRhNS5maXJlYmFzZXN0b3JhZ2UuYXBw"),
    messagingSenderId: atob("MTAwODI3NTYxNTgwNg=="),
    appId: atob("MToxMDA4Mjc1NjE1ODA2OndlYjpiMzIzMGEyZDE4YTc3YWVjYjUyMTZm")
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) firebase.initializeApp(fC);
window.auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
window.db = typeof firebase !== 'undefined' ? firebase.database() : null;
window.currentUser = null;

if (window.auth) {
    window.auth.onAuthStateChanged(async (u) => {
        window.currentUser = u;
        const bL = document.getElementById('btn-google-login');
        const uP = document.getElementById('user-profile');
        const bLHome = document.getElementById('btn-google-login-home');
        const uPHome = document.getElementById('user-profile-home');
        
        if (u && !u.isAnonymous) {
            if(bL) bL.classList.add('hidden'); 
            if(uP) { uP.classList.remove('hidden'); uP.classList.add('flex'); }
            if(bLHome) bLHome.classList.add('hidden'); 
            if(uPHome) { uPHome.classList.remove('hidden'); uPHome.classList.add('flex'); }
            await window.loadFirebaseData(u.uid);
        } else {
            if(bL) bL.classList.remove('hidden'); 
            if(uP) { uP.classList.add('hidden'); uP.classList.remove('flex'); }
            if(bLHome) bLHome.classList.remove('hidden'); 
            if(uPHome) { uPHome.classList.add('hidden'); uPHome.classList.remove('flex'); }
            
            if (!window.userData.nickname || !window.userData.nickname.startsWith("숲청자")) {
                window.userData.nickname = "숲청자" + Math.random().toString(36).substring(2, 5).toUpperCase();
            }
            const un = document.getElementById('user-name');
            const unh = document.getElementById('user-name-home');
            if(un) un.innerText = window.userData.nickname;
            if(unh) unh.innerText = window.userData.nickname;
            await window.auth.signInAnonymously().catch(() => {});
        }
    });
}

window.loadFirebaseData = async function(uid) {
    try {
        const s = await window.db.ref('users/' + uid + '/soop2048_multi').get();
        if (s.exists()) {
            const data = s.val();
            window.userData.nickname = data.nickname || ("숲청자" + Math.random().toString(36).substring(2, 5).toUpperCase());
            if (data.bestScores) {
                ['normal', 'surv_beginner', 'surv_intermediate', 'surv_advanced', 'surv_expert', 'surv_master', 'rank_point'].forEach(k => {
                    if ((data.bestScores[k] || 0) > (window.userData.bestScores[k] || 0)) {
                        window.userData.bestScores[k] = data.bestScores[k];
                    }
                });
                window.saveBestScoresLocal();
            }
        } else {
            if (!window.userData.nickname || window.userData.nickname.startsWith("숲청자")) {
                const m = document.getElementById('nickname-modal');
                if(m) { m.classList.remove('hidden'); m.classList.add('flex'); }
                window.resetNicknameValidation('btn-confirm-nickname');
            } else {
                await window.db.ref('users/' + uid + '/soop2048_multi').set(window.userData);
            }
        }
        
        const un = document.getElementById('user-name');
        const unh = document.getElementById('user-name-home');
        if(un) un.innerText = window.userData.nickname;
        if(unh) unh.innerText = window.userData.nickname;
        
        const hbs = document.getElementById('home-best-score');
        if(hbs) hbs.innerText = window.userData.bestScores.normal.toLocaleString();
    } catch(e) { console.error("데이터 로드 실패", e); }
};

window.saveBestScoreToFirebase = async function() {
    window.saveBestScoresLocal();
    if(window.currentUser && !window.currentUser.isAnonymous && window.db) {
        try { await window.db.ref('users/' + window.currentUser.uid + '/soop2048_multi/bestScores').update(window.userData.bestScores); } catch(e) {}
    }
};

window.loginWithGoogle = async function() {
    window.initAudio(); window.playSound('click');
    if (!window.auth) return;
    const p = new firebase.auth.GoogleAuthProvider();
    try { await window.auth.signInWithPopup(p); } catch (e) {}
};

window.logoutGoogle = async function() {
    window.initAudio(); window.playSound('click');
    if (!window.auth) return;
    try {
        await window.auth.signOut();
        window.userData.nickname = "숲청자" + Math.random().toString(36).substring(2, 5).toUpperCase();
        document.getElementById('user-name').innerText = window.userData.nickname;
        document.getElementById('user-name-home').innerText = window.userData.nickname;
    } catch (e) {}
};

window.resetNicknameValidation = function(btnId) { document.getElementById(btnId).disabled = true; };

window.checkNicknameDuplicate = async function(inputId, confirmBtnId) {
    window.playSound('click');
    const inputVal = document.getElementById(inputId).value.trim();
    if(!inputVal) { alert("닉네임을 입력해주세요."); return; }
    if (!window.currentUser || window.currentUser.isAnonymous) { alert("구글 로그인이 필요합니다."); return; }
    try {
        const s = await window.db.ref('nicknames/' + inputVal).get();
        if(s.exists() && s.val() !== window.currentUser.uid) { alert("이미 사용 중인 닉네임입니다."); document.getElementById(confirmBtnId).disabled = true; } 
        else { alert("사용 가능한 닉네임입니다!"); document.getElementById(confirmBtnId).disabled = false; }
    } catch(e) { alert("오류가 발생했습니다."); }
};

window.confirmNicknameModal = async function() {
    window.playSound('click'); 
    const input = document.getElementById('modal-nickname-input').value.trim();
    if(!input) return;
    try {
        const old = window.userData.nickname; window.userData.nickname = input;
        await window.db.ref('users/' + window.currentUser.uid + '/soop2048_multi').update({ nickname: input, bestScores: window.userData.bestScores });
        await window.db.ref('nicknames/' + input).set(window.currentUser.uid);
        if (old && !old.startsWith("숲청자") && old !== input) await window.db.ref('nicknames/' + old).set(null); 
        document.getElementById('user-name').innerText = input; document.getElementById('user-name-home').innerText = input;
        document.getElementById('nickname-modal').classList.add('hidden'); document.getElementById('nickname-modal').classList.remove('flex');
    } catch(e) {}
};

window.cancelNicknameModal = function() { 
    window.playSound('click'); document.getElementById('nickname-modal').classList.add('hidden'); document.getElementById('nickname-modal').classList.remove('flex'); window.logoutGoogle(); 
};

window.applyNicknameFromSettings = async function() {
    window.playSound('click');
    if (!window.currentUser || window.currentUser.isAnonymous) { alert("구글 로그인이 필요합니다."); return; }
    const input = document.getElementById('settings-nickname-input').value.trim();
    if(!input) return;
    try {
        const old = window.userData.nickname; window.userData.nickname = input;
        await window.db.ref('users/' + window.currentUser.uid + '/soop2048_multi').update({ nickname: input });
        await window.db.ref('nicknames/' + input).set(window.currentUser.uid);
        if (old && !old.startsWith("숲청자") && old !== input) await window.db.ref('nicknames/' + old).set(null); 
        document.getElementById('user-name').innerText = input; document.getElementById('user-name-home').innerText = input;
        alert("닉네임이 변경되었습니다."); window.resetNicknameValidation('btn-apply-nickname');
    } catch(e) {}
};

// === 4. UI 네비게이션 및 모달 제어 ===
window.goToScreen = function(screenId) {
    window.initAudio();
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if(targetScreen) targetScreen.classList.add('active');
    
    clearInterval(window.state.timerInterval);
    
    const header = document.getElementById('global-header');
    if (screenId === 'home') {
        if(header) header.style.display = 'none';
        window.state.selectedMembers = [];
    } else {
        if(header) header.style.display = 'flex';
    }
    
    window.state.screen = screenId;

    if (screenId === 'crew_select') {
        window.renderCrewChosungNav();
        window.renderCrewList();
        if(typeof window.initPCMouseDrag === 'function') window.initPCMouseDrag();
    } else if (screenId === 'member_select') {
        window.updateAvailableMembers();
        window.renderMemberList();
    }
};

window.selectMode = function(mode) {
    window.initAudio(); window.playSound('click');
    window.state.gameMode = mode;
    if (mode === 'survival') window.goToScreen('difficulty_select');
    else window.goToScreen('crew_select');
};

window.setDifficulty = function(diff) {
    window.initAudio(); window.playSound('click');
    window.state.difficulty = diff;
    window.goToScreen('crew_select');
};

window.goBackFromCrewSelect = function() {
    window.playSound('click');
    if (window.state.gameMode === 'survival') window.goToScreen('difficulty_select');
    else if (window.state.gameMode === 'rank' || window.state.gameMode === 'custom') window.goToScreen('modeselect-multi');
    else window.goToScreen('modeselect-single');
};

window.openSettings = function() {
    document.getElementById('settings-modal').classList.remove('hidden');
    document.getElementById('settings-modal').classList.add('flex');
    document.getElementById('volume-slider').value = Math.round(window.globalVolume * 100);
    document.getElementById('volume-val').innerText = Math.round(window.globalVolume * 100) + '%';
    document.getElementById('dark-mode-toggle').checked = window.isDarkMode;
    if(window.userData.nickname && !window.userData.nickname.startsWith('숲청자')) {
        document.getElementById('settings-nickname-input').value = window.userData.nickname;
    }
    window.resetNicknameValidation('btn-apply-nickname');
};

window.closeSettings = function() {
    document.getElementById('settings-modal').classList.add('hidden');
    document.getElementById('settings-modal').classList.remove('flex');
};

window.openBestScores = function() {
    window.initAudio(); window.playSound('click');
    document.getElementById('score-normal').innerText = window.userData.bestScores.normal.toLocaleString();
    document.getElementById('score-surv-beginner').innerText = window.userData.bestScores.surv_beginner.toLocaleString();
    document.getElementById('score-surv-intermediate').innerText = window.userData.bestScores.surv_intermediate.toLocaleString();
    document.getElementById('score-surv-advanced').innerText = window.userData.bestScores.surv_advanced.toLocaleString();
    document.getElementById('score-surv-expert').innerText = window.userData.bestScores.surv_expert.toLocaleString();
    document.getElementById('score-surv-master').innerText = window.userData.bestScores.surv_master.toLocaleString();
    document.getElementById('score-rank-point').innerText = window.userData.bestScores.rank_point.toLocaleString();
    
    document.getElementById('best-scores-modal').classList.remove('hidden');
    document.getElementById('best-scores-modal').classList.add('flex');
};

window.closeBestScores = function() {
    window.playSound('click');
    document.getElementById('best-scores-modal').classList.add('hidden');
    document.getElementById('best-scores-modal').classList.remove('flex');
};

// === 5. 크루/멤버 선택 ===
window.renderCrewChosungNav = function() {
    const nav = document.getElementById('crew-chosung-nav');
    if(!nav) return;
    nav.innerHTML = window.CHOSUNG_LIST.map(cho => `
        <button onclick="window.setCrewChosung('${cho}')" class="shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${window.state.filterChosung === cho ? 'bg-soop text-white shadow-md' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}">
            ${cho}
        </button>
    `).join('');
};

window.setCrewChosung = function(cho) {
    window.state.filterChosung = cho;
    window.renderCrewChosungNav();
    window.renderCrewList();
};

window.toggleCrew = function(crewId) {
    window.initAudio(); window.playSound('click');
    if (window.state.selectedCrews.includes(crewId)) {
        window.state.selectedCrews = window.state.selectedCrews.filter(id => id !== crewId);
    } else {
        window.state.selectedCrews.push(crewId);
    }
    window.renderCrewList();
};

window.clearAllCrews = function() {
    window.initAudio(); window.playSound('click');
    window.state.selectedCrews = [];
    window.renderCrewList();
};

window.renderCrewList = function() {
    const grid = document.getElementById('crew-list-grid');
    if(!grid) return;
    let totalMembers = 0;
    const selectedNames = new Set();
    
    window.state.selectedCrews.forEach(cId => {
        const c = window.CREWS_DB.find(x => x.id === cId);
        if (c) c.members.forEach(m => selectedNames.add(m));
    });
    totalMembers = selectedNames.size;

    const filtered = window.CREWS_DB.filter(c => {
        const mSearch = c.name.includes(window.state.searchCrewText);
        const mCho = window.state.filterChosung === '전체' || c.chosung === window.state.filterChosung || (!window.CHOSUNG_LIST.includes(c.chosung) && window.state.filterChosung === 'A-Z');
        return mSearch && mCho;
    });

    grid.innerHTML = filtered.map(crew => {
        const isSel = window.state.selectedCrews.includes(crew.id);
        return `
            <div onclick="window.toggleCrew('${crew.id}')" class="p-4 border-2 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 select-none
                ${isSel ? 'border-soop bg-sky-100' : 'border-sky-200 bg-white hover:bg-sky-50'}">
                <div class="font-bold text-sky-950 break-keep">${crew.name}</div>
                <div class="text-xs font-medium px-2 py-1 rounded-full ${isSel ? 'bg-soop text-white' : 'bg-sky-100 text-sky-600'}">${crew.members.length}명</div>
            </div>
        `;
    }).join('');

    const tagsContainer = document.getElementById('selected-crews-tags');
    if (tagsContainer) {
        if (window.state.selectedCrews.length > 0) {
            tagsContainer.innerHTML = window.state.selectedCrews.map(cId => {
                const c = window.CREWS_DB.find(x => x.id === cId);
                return c ? `<span onclick="window.toggleCrew('${cId}')" class="bg-soop text-white text-xs px-3 py-1 rounded-full cursor-pointer hover:bg-rose-500 transition-colors flex items-center gap-1 shadow-sm">${c.name} <span class="font-black text-[10px] ml-1">✕</span></span>` : '';
            }).join('');
            tagsContainer.classList.remove('hidden');
        } else {
            tagsContainer.innerHTML = '';
            tagsContainer.classList.add('hidden');
        }
    }

    const countEl = document.getElementById('crew-selected-count');
    if(countEl) {
        countEl.innerText = `${totalMembers}명`;
        countEl.className = `text-lg ${totalMembers >= 12 ? 'text-soop' : 'text-rose-500'}`;
    }

    const btn = document.getElementById('btn-crew-next');
    if (btn) {
        if (totalMembers >= 12) {
            btn.className = "py-3 px-8 rounded-xl font-bold text-lg transition-all bg-soop text-white shadow-[0_4px_0_#007bb5] active:translate-y-1 active:shadow-none";
            btn.disabled = false;
        } else {
            btn.className = "py-3 px-8 rounded-xl font-bold text-lg transition-all bg-sky-200 text-sky-500 cursor-not-allowed";
            btn.disabled = true;
        }
    }
};

window.goToMemberSelect = function() {
    let total = 0;
    const sNames = new Set();
    window.state.selectedCrews.forEach(cId => {
        const c = window.CREWS_DB.find(x => x.id === cId);
        if(c) c.members.forEach(m => sNames.add(m));
    });
    if (sNames.size < 12) return;
    window.goToScreen('member_select');
};

window.updateAvailableMembers = function() {
    const sNames = new Set();
    window.state.selectedCrews.forEach(cId => {
        const c = window.CREWS_DB.find(x => x.id === cId);
        if (c) c.members.forEach(m => sNames.add(m));
    });
    window.state.availableMembers = Array.from(sNames)
        .map(n => window.MEMBER_DB.find(m => m.name === n))
        .filter(Boolean)
        .sort((a,b) => a.name.localeCompare(b.name));
    
    const availIds = window.state.availableMembers.map(m => m.id);
    window.state.selectedMembers = window.state.selectedMembers.filter(id => availIds.includes(id));
};

window.toggleMember = function(mId) {
    window.initAudio(); window.playSound('click');
    const idx = window.state.selectedMembers.indexOf(mId);
    if (idx > -1) {
        window.state.selectedMembers.splice(idx, 1);
    } else {
        if (window.state.selectedMembers.length < 12) window.state.selectedMembers.push(mId);
    }
    window.renderMemberList();
};

window.randomSelectMembers = function() {
    window.initAudio(); window.playSound('click');
    const currentSelectedCount = window.state.selectedMembers.length;
    if (currentSelectedCount >= 12) return; 

    const unselectedMembers = window.state.availableMembers.filter(m => !window.state.selectedMembers.includes(m.id));
    
    for (let i = unselectedMembers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unselectedMembers[i], unselectedMembers[j]] = [unselectedMembers[j], unselectedMembers[i]];
    }

    const needed = 12 - currentSelectedCount;
    const toAdd = unselectedMembers.slice(0, needed).map(m => m.id);
    
    window.state.selectedMembers = [...window.state.selectedMembers, ...toAdd];
    window.renderMemberList();
};

window.renderMemberList = function() {
    const grid = document.getElementById('member-list-grid');
    if(!grid) return;
    grid.innerHTML = window.state.availableMembers.map(m => {
        const sIdx = window.state.selectedMembers.indexOf(m.id);
        const isSel = sIdx > -1;
        
        return `
            <div onclick="window.toggleMember('${m.id}')" class="relative w-full aspect-square rounded-2xl bg-white shadow-sm border-2 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 select-none overflow-hidden ${isSel ? 'border-soop ring-2 ring-soop/30' : 'border-sky-100'}">
                <img src="${m.imgUrl}" onerror="this.src='${window.getAvatarUrl(m.name)}'" class="absolute inset-0 w-full h-full object-cover smooth-image" alt="${m.name}">
                ${isSel ? `<div class="absolute top-1 left-1 w-6 h-6 bg-soop text-white font-black text-xs rounded-full flex items-center justify-center shadow-md z-20">${sIdx + 1}</div>` : ''}
                <div class="absolute bottom-0 left-0 w-full bg-sky-950/70 pt-2 pb-1.5 z-10 flex justify-center backdrop-blur-[2px]">
                    <span class="text-[10px] font-bold w-full text-center px-1 overflow-hidden text-ellipsis whitespace-nowrap text-white">${m.name}</span>
                </div>
            </div>
        `;
    }).join('');

    const c = window.state.selectedMembers.length;
    const cntEl = document.getElementById('member-selected-count');
    if(cntEl) cntEl.innerText = c;
    
    const prog = document.getElementById('member-progress-bar');
    if(prog) prog.style.width = `${(c/12)*100}%`;

    const btn = document.getElementById('btn-member-start');
    if(btn) {
        if (c === 12) {
            btn.className = "w-full max-w-5xl py-4 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-2 bg-soop text-white shadow-[0_4px_0_#007bb5] active:translate-y-1 active:shadow-none animate-pulse";
            btn.disabled = false;
        } else {
            btn.className = "w-full max-w-5xl py-4 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-2 bg-sky-200 text-sky-500 cursor-not-allowed";
            btn.disabled = true;
        }
    }
};

// === 7. 멀티플레이 시뮬레이션 및 커스텀 방 ===
window.joinRankMatch = function() {
    window.initAudio(); window.playSound('click');
    if(window.state.selectedMembers.length !== 12) {
        window.state.gameMode = 'rank';
        window.state.difficulty = 'advanced'; 
        window.goToScreen('crew_select');
        return;
    }
    window.startRankMatchSimulation();
};

window.createCustomMatch = function() {
    window.initAudio(); window.playSound('click');
    if (!window.currentUser || window.currentUser.isAnonymous) {
        alert("커스텀 매치를 생성하려면 구글 로그인이 필요합니다.");
        return;
    }
    if(window.state.selectedMembers.length !== 12) {
        window.state.gameMode = 'custom';
        window.state.difficulty = 'advanced'; 
        window.goToScreen('crew_select');
        return;
    }
    window.initCustomRoom(true);
};

window.openJoinRoomModal = function() {
    window.initAudio(); window.playSound('click');
    document.getElementById('room-code-input').value = "";
    document.getElementById('join-room-modal').classList.remove('hidden');
    document.getElementById('join-room-modal').classList.add('flex');
};
window.closeJoinRoomModal = function() {
    window.playSound('click');
    document.getElementById('join-room-modal').classList.add('hidden');
    document.getElementById('join-room-modal').classList.remove('flex');
};

window.submitJoinRoom = function() {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if(code.length !== 6) { alert("6자리 방 코드를 입력해주세요."); return; }
    window.closeJoinRoomModal();
    window.state.gameMode = 'custom';
    window.state.multiplayState.pendingRoomCode = code; 
    window.goToScreen('crew_select');
};

window.finalizeMultiplayerSetup = function() {
    if(window.state.gameMode === 'rank') {
        window.startRankMatchSimulation();
    } else if (window.state.gameMode === 'custom') {
        if(window.state.multiplayState.pendingRoomCode) {
            window.joinCustomRoom(window.state.multiplayState.pendingRoomCode);
        } else {
            window.initCustomRoom(true);
        }
    }
};

window.startRankMatchSimulation = async function() {
    window.goToScreen('rank-matchmaking');
    document.getElementById('rank-countdown-container').classList.add('hidden');
    document.getElementById('rank-player-list').innerHTML = '';
    document.getElementById('rank-my-nickname').innerText = window.userData.nickname;
    document.getElementById('rank-my-rp').innerText = (window.userData.bestScores.rank_point || 1000) + ' RP';
    
    const myRP = window.userData.bestScores.rank_point || 1000;
    
    try {
        const snap = await window.db.ref('rank_rooms').orderByChild('status').equalTo('waiting').once('value');
        let targetRoomId = null;
        
        if (snap.exists()) {
            const rooms = snap.val();
            for (let rId in rooms) {
                const r = rooms[rId];
                const pCount = r.players ? Object.keys(r.players).length : 0;
                if (pCount < 8 && !r.countdownUntil) {
                    targetRoomId = rId;
                    break;
                }
            }
        }

        if (targetRoomId) {
            window.state.multiplayState.roomId = targetRoomId;
            window.state.multiplayState.isHost = false;
        } else {
            targetRoomId = 'RANK_' + Math.random().toString(36).substr(2, 9).toUpperCase();
            window.state.multiplayState.roomId = targetRoomId;
            window.state.multiplayState.isHost = true;
            await window.db.ref('rank_rooms/' + targetRoomId).set({
                status: 'waiting',
                host: window.currentUser.uid,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                countdownUntil: null
            });
        }

        window.rankMatchRef = window.db.ref('rank_rooms/' + targetRoomId);
        window.myRankPlayerRef = window.db.ref('rank_rooms/' + targetRoomId + '/players/' + window.currentUser.uid);
        
        await window.myRankPlayerRef.set({
            name: window.userData.nickname,
            rp: myRP,
            score: 0,
            level: 0,
            isReady: true 
        });
        window.myRankPlayerRef.onDisconnect().remove();

        window.listenRankRoom();
    } catch(e) {
        console.error(e);
        alert("매칭 중 오류가 발생했습니다.");
        window.goToScreen('modeselect-multi');
    }
};

window.listenRankRoom = function() {
    window.rankMatchRef.on('value', (snap) => {
        if (!snap.exists() && window.state.screen === 'rank-matchmaking') {
            alert("방이 닫혔습니다.");
            window.cancelRankMatch();
            return;
        }
        const data = snap.val();
        if (!data) return;

        const players = data.players || {};
        const pKeys = Object.keys(players);
        const count = pKeys.length;

        document.getElementById('rank-player-count').innerText = `${count}`;
        const list = document.getElementById('rank-player-list');
        
        list.innerHTML = pKeys.map(uid => {
            const p = players[uid];
            const isMe = uid === window.currentUser.uid;
            const borderClass = isMe ? 'border-soop bg-sky-50' : 'border-gray-100 bg-white';
            
            let medalIcons = '';
            if (p.rp >= 1500) medalIcons = '🥇🥇🥇';
            else if (p.rp >= 1200) medalIcons = '🥇🥈';
            else if (p.rp >= 1050) medalIcons = '🥈🥉';
            else medalIcons = '🥉';

            return `<div class="p-3 border-b ${borderClass} flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    <span class="font-bold text-gray-800">${p.name} ${medalIcons} ${isMe ? '<span class="text-soop text-xs ml-1">(me)</span>' : ''}</span>
                </div>
            </div>`;
        }).join('');

        const cdContainer = document.getElementById('rank-countdown-container');
        const cdEl = document.getElementById('rank-countdown');
        if (data.countdownUntil) {
            cdContainer.classList.remove('hidden');
            const updateCd = () => {
                const left = Math.ceil((data.countdownUntil - Date.now()) / 1000);
                if (left > 0) {
                    cdEl.innerText = left;
                } else {
                    cdEl.innerText = 0;
                    if (window.state.multiplayState.isHost && data.status === 'waiting') {
                        window.rankMatchRef.update({ status: 'playing' });
                    }
                }
            };
            updateCd();
            if (!window.rankCdInterval) {
                window.rankCdInterval = setInterval(updateCd, 1000);
            }
        } else {
            cdContainer.classList.add('hidden');
            clearInterval(window.rankCdInterval);
            window.rankCdInterval = null;
        }

        if (window.state.multiplayState.isHost && data.status === 'waiting') {
            if (count >= 4 && !data.countdownUntil) {
                window.rankMatchRef.update({ countdownUntil: Date.now() + 30000 });
            } else if (count < 4 && data.countdownUntil) {
                window.rankMatchRef.update({ countdownUntil: null });
            }
            if (count === 8 && data.status === 'waiting') {
                window.rankMatchRef.update({ status: 'playing' });
            }
        }

        if (data.status === 'playing' && window.state.screen === 'rank-matchmaking') {
            clearInterval(window.rankCdInterval);
            window.startGame();
        }
    });
};

window.cancelRankMatch = function() {
    window.playSound('click');
    if (window.myRankPlayerRef) window.myRankPlayerRef.remove();
    if (window.state.multiplayState.isHost && window.rankMatchRef) window.rankMatchRef.remove();
    if (window.rankMatchRef) window.rankMatchRef.off();
    clearInterval(window.rankCdInterval);
    window.goToScreen('modeselect-multi');
};

window.roomRef = null;
window.myPlayerRef = null;

window.initCustomRoom = async function(isHost) {
    window.state.multiplayState.isHost = isHost;
    window.state.multiplayState.active = true;
    document.getElementById('custom-room-my-nickname').innerText = window.userData.nickname;
    
    if (isHost) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        window.state.multiplayState.roomId = code;
        document.getElementById('room-code-display').innerText = "******";
        document.getElementById('room-code-display').dataset.code = code;
        document.getElementById('custom-difficulty-select').disabled = false;
        document.getElementById('custom-difficulty-select').value = window.state.difficulty;
        
        document.getElementById('btn-custom-start').classList.remove('hidden');
        document.getElementById('btn-custom-ready').classList.add('hidden');

        try {
            window.roomRef = window.db.ref('rooms/' + code);
            await window.roomRef.set({
                host: window.currentUser.uid,
                status: 'waiting',
                difficulty: window.state.difficulty,
                timestamp: new Date().getTime()
            });
            
            window.myPlayerRef = window.db.ref(`rooms/${code}/players/${window.currentUser.uid}`);
            await window.myPlayerRef.set({ name: window.userData.nickname, isReady: true, score: 0, level: 0 });
            window.myPlayerRef.onDisconnect().remove();
            
            window.listenRoomState(code);
            window.goToScreen('custom-room');
        } catch(e) { alert("방 생성 실패"); }
    }
};

window.joinCustomRoom = async function(code) {
    try {
        const snap = await window.db.ref('rooms/' + code).get();
        if (!snap.exists() || snap.val().status !== 'waiting') {
            alert("존재하지 않거나 이미 시작된 방입니다.");
            window.goToScreen('modeselect-multi');
            return;
        }
        
        window.state.multiplayState.isHost = false;
        window.state.multiplayState.roomId = code;
        window.state.multiplayState.active = true;
        
        document.getElementById('room-code-display').innerText = "******";
        document.getElementById('room-code-display').dataset.code = code;
        document.getElementById('custom-difficulty-select').disabled = true;
        document.getElementById('custom-difficulty-select').value = snap.val().difficulty;
        document.getElementById('custom-room-my-nickname').innerText = window.userData.nickname;
        
        document.getElementById('btn-custom-start').classList.add('hidden');
        document.getElementById('btn-custom-ready').classList.remove('hidden');
        document.getElementById('btn-custom-ready').innerText = "준비 하기";
        document.getElementById('btn-custom-ready').className = "flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-lg py-3 rounded-xl transition-colors shadow-sm";

        window.roomRef = window.db.ref('rooms/' + code);
        window.myPlayerRef = window.db.ref(`rooms/${code}/players/${window.currentUser.uid}`);
        await window.myPlayerRef.set({ name: window.userData.nickname, isReady: false, score: 0, level: 0 });
        window.myPlayerRef.onDisconnect().remove();
        
        window.listenRoomState(code);
        window.goToScreen('custom-room');
    } catch(e) { alert("입장 실패"); }
};

window.listenRoomState = function(code) {
    window.roomRef.on('value', (snap) => {
        if(!snap.exists() && window.state.screen === 'custom-room') {
            alert("방이 사라졌습니다.");
            window.leaveCustomRoom();
            return;
        }
        const data = snap.val();
        if(!data) return;
        
        if (!window.state.multiplayState.isHost) {
            document.getElementById('custom-difficulty-select').value = data.difficulty;
            window.state.difficulty = data.difficulty;
        }
        
        const players = data.players || {};
        window.state.multiplayState.players = players;
        const pList = document.getElementById('custom-player-list');
        pList.innerHTML = '';
        let allReady = true;
        let count = 0;
        
        Object.keys(players).forEach(uid => {
            count++;
            const p = players[uid];
            const isMe = uid === window.currentUser.uid;
            if (!p.isReady) allReady = false;
            
            const isHost = uid === data.host;
            const hostIcon = isHost ? '👑' : '👤';
            const readyText = p.isReady ? '<span class="text-soop">준비 완료</span>' : '<span class="text-gray-400">대기 중</span>';
            
            pList.innerHTML += `
                <div class="p-3 border-2 ${isMe ? 'highlight-me' : 'border-gray-200 bg-gray-50'} rounded-xl flex justify-between items-center transition-colors">
                    <span class="font-bold text-gray-800">${hostIcon} ${p.name} ${isMe ? '<span class="text-soop text-xs ml-1">(me)</span>' : ''}</span>
                    <span class="text-sm font-bold">${readyText}</span>
                </div>
            `;
        });
        document.getElementById('custom-player-count').innerText = count;
        
        if(window.state.multiplayState.isHost) {
            const startBtn = document.getElementById('btn-custom-start');
            if(allReady && count > 1) { 
                startBtn.disabled = false;
                startBtn.classList.replace('bg-gray-300', 'bg-soop');
                startBtn.classList.replace('text-gray-500', 'text-white');
            } else {
                startBtn.disabled = true;
                startBtn.classList.replace('bg-soop', 'bg-gray-300');
                startBtn.classList.replace('text-white', 'text-gray-500');
            }
        }
        
        if (data.status === 'playing' && window.state.screen === 'custom-room') {
            window.startGame(); 
        }
    });
};

window.toggleReadyStatus = async function() {
    window.playSound('click');
    const p = window.state.multiplayState.players[window.currentUser.uid];
    if(p) {
        const newStatus = !p.isReady;
        await window.myPlayerRef.update({ isReady: newStatus });
        const btn = document.getElementById('btn-custom-ready');
        if(newStatus) {
            btn.innerText = "준비 취소";
            btn.className = "flex-1 bg-gray-400 hover:bg-gray-500 text-white font-black text-lg py-3 rounded-xl transition-colors shadow-sm";
        } else {
            btn.innerText = "준비 하기";
            btn.className = "flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-lg py-3 rounded-xl transition-colors shadow-sm";
        }
    }
};

window.updateRoomDifficulty = async function(val) {
    window.state.difficulty = val;
    if (window.state.multiplayState.isHost && window.roomRef) {
        await window.roomRef.update({ difficulty: val });
    }
};

window.startCustomGame = async function() {
    window.playSound('click');
    if (window.state.multiplayState.isHost && window.roomRef) {
        await window.roomRef.update({ status: 'playing' });
    }
};

window.leaveCustomRoom = async function() {
    window.playSound('click');
    if(window.myPlayerRef) { await window.myPlayerRef.remove(); window.myPlayerRef = null; }
    if(window.state.multiplayState.isHost && window.roomRef) { await window.roomRef.remove(); } 
    window.roomRef = null;
    window.state.multiplayState.active = false;
    window.goToScreen('modeselect-multi');
};

window.revealRoomCode = function() {
    const el = document.getElementById('room-code-display');
    if (el.classList.contains('blur-sm')) {
        el.classList.remove('blur-sm');
        el.innerText = el.dataset.code;
    } else {
        el.classList.add('blur-sm');
        el.innerText = '******';
    }
};

window.copyRoomLink = function() {
    window.playSound('click');
    const code = document.getElementById('room-code-display').dataset.code;
    if(!code) return;
    const txt = `[SOOP 2048 커스텀 매치]\n방 코드: ${code}\n게임에 접속하여 커스텀 매치에 입장하세요!`;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => alert("초대 코드가 복사되었습니다.")).catch(() => 0);
    else alert("방 코드: " + code);
};

// === 8. 게임 로직 ===
window.startGame = function() {
    if(window.state.selectedMembers.length !== 12) {
         window.finalizeMultiplayerSetup(); 
         return;
    }
    
    window.state.gameImages = {};
    window.state.selectedMembers.forEach((mId, idx) => {
        const m = window.MEMBER_DB.find(x => x.id === mId);
        window.state.gameImages[idx + 1] = { name: m.name, imgUrl: m.imgUrl };
    });

    const bgGrid = document.getElementById('game-bg-grid');
    let bgHtml = '';
    for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
            bgHtml += `<div class="absolute w-1/4 h-1/4 p-1" style="transform: translate(${c * 100}%, ${r * 100}%);"><div class="bg-slate-700/60 shadow-inner rounded-xl w-full h-full"></div></div>`;
        }
    }
    bgGrid.innerHTML = bgHtml;
    
    window.goToScreen('game');
    window.renderGuideLayout(); 
    window.initBoard();
};

window.toggleGuidePosition = function() {
    window.state.guidePosition = window.state.guidePosition === 'bottom' ? 'right' : 'bottom';
    window.renderGuideLayout();
};

window.renderGuideLayout = function() {
    const layout = document.getElementById('game-main-layout');
    const guideWrap = document.getElementById('guide-wrapper');
    const guide = document.getElementById('evolution-guide');
    const guideTitle = document.getElementById('guide-title-text');

    if (window.state.guidePosition === 'right') {
        layout.className = "flex flex-col lg:flex-row items-center lg:items-start justify-center w-full max-w-5xl mx-auto gap-6";
        guideWrap.className = "w-full max-w-md lg:w-[150px] lg:max-w-none bg-white p-4 rounded-2xl shadow-md border-2 border-soop shrink-0 flex flex-col items-center h-auto lg:h-[450px] overflow-y-auto hide-scrollbar transition-colors";
        guideTitle.innerHTML = "진화 순서<br/>가이드"; 
        guide.className = "grid grid-cols-2 gap-x-2 gap-y-3 justify-items-center w-full";
    } else {
        layout.className = "flex flex-col items-center w-full max-w-5xl mx-auto gap-6";
        guideWrap.className = "w-full max-w-md sm:max-w-[450px] bg-white p-4 rounded-2xl shadow-md border-2 border-soop shrink-0 transition-colors";
        guideTitle.innerHTML = "진화 순서 가이드";
        guide.className = "grid grid-cols-6 grid-rows-2 gap-x-1 gap-y-3 justify-items-center w-full";
    }
    window.renderEvolutionGuide();
};

window.renderEvolutionGuide = function() {
    const guide = document.getElementById('evolution-guide');
    guide.innerHTML = Object.entries(window.state.gameImages).map(([lvl, img]) => {
        return `
            <div class="flex flex-col items-center w-full">
                <div class="flex flex-col items-center w-[40px] sm:w-[44px]">
                    <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] overflow-hidden mb-1 shadow-sm border border-sky-200 relative bg-sky-50 shrink-0">
                        <img src="${img.imgUrl}" onerror="this.src='${window.getAvatarUrl(img.name)}'" class="w-full h-full object-cover smooth-image">
                        <span class="absolute top-0 left-0 text-[8px] bg-sky-900/80 text-white w-3 h-3 flex items-center justify-center font-bold rounded-br-sm">${lvl}</span>
                    </div>
                    <span class="text-[8px] font-bold text-sky-800 truncate w-full text-center px-0.5">${img.name}</span>
                </div>
            </div>
        `;
    }).join('');
};

window.getEmptyCells = function(board) {
    let cells = [];
    for (let r = 0; r < window.state.gridSize; r++) {
        for (let c = 0; c < window.state.gridSize; c++) {
            if (!board[r][c]) cells.push({ r, c });
        }
    }
    return cells;
};

window.startSurvivalTimer = function() {
    clearInterval(window.state.timerInterval);
    window.state.timeLeft = window.state.maxTime;
    window.updateTimerUI();
    
    window.state.timerInterval = setInterval(() => {
        if (window.state.gameOver || window.state.gameWon || window.state.isAnimating) return;
        window.state.timeLeft = Math.max(0, window.state.timeLeft - 0.1);
        window.updateTimerUI();
        
        if (window.state.timeLeft <= 0) {
            window.state.gameOver = true;
            document.getElementById('gameover-desc').innerText = "시간 초과! 아쉽습니다.";
            window.playSound('gameover');
            clearInterval(window.state.timerInterval);
            window.renderGame();
        }
    }, 100);
};

window.updateTimerUI = function() {
    const timeText = document.getElementById('survival-time-text');
    const timeBar = document.getElementById('survival-time-bar');
    if(timeText && timeBar) {
        timeText.innerText = window.state.timeLeft.toFixed(1) + 's';
        const pct = Math.min(100, (window.state.timeLeft / window.state.maxTime) * 100);
        timeBar.style.width = pct + '%';
        
        if (window.state.timeLeft <= 5) {
            timeBar.classList.replace('bg-rose-500', 'bg-red-600');
            timeText.classList.replace('text-rose-600', 'text-red-600');
        } else {
            timeBar.classList.replace('bg-red-600', 'bg-rose-500');
            timeText.classList.replace('text-red-600', 'text-rose-600');
        }
    }
};

window.initBoard = function() {
    clearInterval(window.state.timerInterval);
    clearInterval(window.multiSyncInterval);
    document.getElementById('tutorial-tooltip').classList.add('hidden');
    document.getElementById('overlay-multi-result').classList.add('hidden');
    document.getElementById('multiplayer-leaderboard').classList.add('hidden');
    
    const modeSubtitle = document.getElementById('game-mode-subtitle');
    const isSurvivalRules = window.state.gameMode === 'survival' || window.state.gameMode === 'rank' || window.state.gameMode === 'custom';
    
    if(isSurvivalRules) {
        if(window.state.gameMode === 'survival') modeSubtitle.innerText = "서바이벌 모드: 시간 내에 진화시키세요!";
        else if(window.state.gameMode === 'rank') modeSubtitle.innerText = "랭크 매치: 끝까지 살아남아 점수를 올리세요!";
        else modeSubtitle.innerText = "커스텀 매치: 친구들과의 진검승부!";
        
        modeSubtitle.classList.replace('text-sky-600', 'text-rose-500');
        document.getElementById('survival-timer-wrapper').classList.remove('hidden');
        
        if(window.state.gameMode === 'rank' || window.state.gameMode === 'custom') {
            document.getElementById('btn-restart-game').classList.add('hidden');
            document.getElementById('btn-gameover-restart').classList.add('hidden');
            document.getElementById('ingame-best-score-box').classList.add('hidden'); 
            window.startMultiplayerSync();
        } else {
            document.getElementById('btn-restart-game').classList.add('hidden');
            document.getElementById('btn-gameover-restart').classList.remove('hidden');
            document.getElementById('ingame-best-score-box').classList.remove('hidden');
        }
        
        let maxTime = 30;
        let timeDesc = "";
        if (window.state.difficulty === 'beginner') { maxTime = 60; timeDesc = "(진화할때마다 +2초)"; }
        else if (window.state.difficulty === 'intermediate') { maxTime = 45; timeDesc = "(4단계 이상 진화 시 +2초)"; }
        else if (window.state.difficulty === 'advanced') { maxTime = 30; timeDesc = "(4단계 이상 진화 시 +2초)"; }
        else if (window.state.difficulty === 'expert') { maxTime = 30; timeDesc = "(4~9단계 진화 시 +2초)"; }
        else if (window.state.difficulty === 'master') { maxTime = 20; timeDesc = "(4~9단계 진화 시 +2초)"; }

        window.state.timeLeft = maxTime;
        window.state.maxTime = maxTime;
        document.getElementById('survival-time-desc').innerText = `남은 시간 ${timeDesc}`;
        
        window.startSurvivalTimer();
    } else {
        modeSubtitle.innerText = "나만의 스트리머 라인업 합치기!";
        modeSubtitle.classList.replace('text-rose-500', 'text-sky-600');
        document.getElementById('survival-timer-wrapper').classList.add('hidden');
        document.getElementById('btn-restart-game').classList.remove('hidden');
        document.getElementById('btn-gameover-restart').classList.remove('hidden');
        document.getElementById('ingame-best-score-box').classList.remove('hidden');
    }

    window.state.board = Array(window.state.gridSize).fill(null).map(() => Array(window.state.gridSize).fill(null));
    window.state.tiles = {};
    window.state.score = 0;
    window.state.maxLevelReached = 0;
    window.state.gameOver = false;
    window.state.gameWon = false;
    window.state.continueAfterWin = false;
    document.getElementById('gameover-desc').innerText = "더 이상 합칠 수 없습니다.";

    for (let i = 0; i < 2; i++) {
        const empties = window.getEmptyCells(window.state.board);
        const cell = empties[Math.floor(Math.random() * empties.length)];
        const id = window.generateId();
        const val = Math.random() < 0.9 ? 1 : 2;
        window.state.tiles[id] = { id, value: val, r: cell.r, c: cell.c, isNew: true };
        window.state.board[cell.r][cell.c] = id;
    }
    window.renderGame();
};

window.updateScore = function(add) {
    window.state.score += add;
    
    if (window.state.gameMode === 'normal' || window.state.gameMode === 'survival') {
        let targetKey = 'normal';
        if(window.state.gameMode === 'survival') {
            if(window.state.difficulty === 'beginner') targetKey = 'surv_beginner';
            else if(window.state.difficulty === 'intermediate') targetKey = 'surv_intermediate';
            else if(window.state.difficulty === 'advanced') targetKey = 'surv_advanced';
            else if(window.state.difficulty === 'expert') targetKey = 'surv_expert';
            else if(window.state.difficulty === 'master') targetKey = 'surv_master';
        }
        
        if(window.state.score > (window.userData.bestScores[targetKey] || 0)) {
            window.userData.bestScores[targetKey] = window.state.score;
            window.saveBestScoreToFirebase();
            const gbs = document.getElementById('game-best-score');
            if(gbs) gbs.innerText = window.userData.bestScores[targetKey].toLocaleString();
            const hbs = document.getElementById('home-best-score');
            if(window.state.gameMode === 'normal' && hbs) hbs.innerText = window.userData.bestScores[targetKey].toLocaleString();
        }
    }
};

window.renderGame = function() {
    document.getElementById('game-score').innerText = window.state.score;
    if(window.state.gameMode === 'normal' || window.state.gameMode === 'survival') {
        let targetKey = window.state.gameMode === 'normal' ? 'normal' : `surv_${window.state.difficulty}`;
        const gameBestEl = document.getElementById('game-best-score');
        if (gameBestEl) gameBestEl.innerText = window.userData.bestScores[targetKey] || 0;
    }

    const container = document.getElementById('game-tiles-container');
    container.innerHTML = Object.values(window.state.tiles).map(t => {
        const lvlData = window.state.gameImages[t.value] || window.state.gameImages[12];
        let classes = "tile-wrapper w-1/4 h-1/4 p-1";
        if(t.isDeleted) classes += " z-10"; else classes += " z-20";
        
        let innerClasses = "w-full h-full rounded-xl flex flex-col items-center justify-center shadow-md border border-white/60 overflow-hidden relative bg-white";
        if(t.isNew) innerClasses += " animate-pop-in";
        if(t.isMerged) innerClasses += " animate-pop";

        return `
            <div class="${classes}" style="transform: translate(${t.c * 100}%, ${t.r * 100}%);">
                <div class="${innerClasses}">
                    <img src="${lvlData.imgUrl}" onerror="this.src='${window.getAvatarUrl(lvlData.name)}'" class="absolute inset-0 w-full h-full object-cover smooth-image z-0">
                    <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-900/90 to-transparent pt-4 pb-1 z-10 flex justify-center">
                        <span class="text-[10px] sm:text-xs font-extrabold tracking-tight px-1 text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-white drop-shadow-md">
                            ${lvlData.name}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const overL = document.getElementById('overlay-gameover');
    const wonL = document.getElementById('overlay-gamewon');
    
    if (window.state.gameOver && window.state.gameMode !== 'tutorial') {
        if (window.state.gameMode === 'rank' || window.state.gameMode === 'custom') {
            window.showMultiplayerResult();
        } else {
            overL.style.display = 'flex';
        }
    } else {
        overL.style.display = 'none';
    }
    
    if(window.state.gameWon && !window.state.continueAfterWin && window.state.gameMode !== 'tutorial' && window.state.gameMode !== 'rank' && window.state.gameMode !== 'custom') {
        document.getElementById('gamewon-img').src = window.state.gameImages[12].imgUrl;
        document.getElementById('gamewon-name').innerText = window.state.gameImages[12].name + ' 달성!';
        wonL.style.display = 'flex';
    } else {
        wonL.style.display = 'none';
    }
};

window.continueGame = function() {
    window.state.continueAfterWin = true;
    window.renderGame();
};

const getVector = (dir) => ({ 0: { x: 0, y: -1 }, 1: { x: 1, y: 0 }, 2: { x: 0, y: 1 }, 3: { x: -1, y: 0 } }[dir]);
const isValidPos = (r, c) => r >= 0 && r < window.state.gridSize && c >= 0 && c < window.state.gridSize;

window.findFarthestPosition = function(board, r, c, vector) {
    let prevR = r, prevC = c;
    let nextR = r + vector.y, nextC = c + vector.x;
    while (isValidPos(nextR, nextC) && !board[nextR][nextC]) {
        prevR = nextR; prevC = nextC;
        nextR += vector.y; nextC += vector.x;
    }
    return { farthest: { r: prevR, c: prevC }, next: { r: nextR, c: nextC } };
};

window.moveTiles = function(direction) {
    if (window.state.gameOver || window.state.isAnimating || (window.state.gameWon && !window.state.continueAfterWin)) return;
    
    if (window.state.gameMode === 'tutorial') {
        const expectedDirs = [1, 3, 2, 0];
        if (direction !== expectedDirs[window.state.tutorialStep]) return;
    }

    let hasMoved = false;
    let scoreIncrease = 0;
    let reachedMaxLevel = false;
    let isMergedThisTurn = false;
    let highMergeThisTurn = false;
    let tutMerged = false;
    
    const newBoard = JSON.parse(JSON.stringify(window.state.board));
    const newTiles = JSON.parse(JSON.stringify(window.state.tiles));
    const mergedThisTurnArray = Array(window.state.gridSize).fill(null).map(() => Array(window.state.gridSize).fill(false));

    let traversals = { x: [], y: [] };
    for (let i = 0; i < window.state.gridSize; i++) { traversals.x.push(i); traversals.y.push(i); }
    const vector = getVector(direction);
    if (vector.x === 1) traversals.x.reverse();
    if (vector.y === 1) traversals.y.reverse();

    window.state.isAnimating = true;

    traversals.y.forEach(r => {
        traversals.x.forEach(c => {
            const tileId = newBoard[r][c];
            if (tileId) {
                const tile = newTiles[tileId];
                const positions = window.findFarthestPosition(newBoard, r, c, vector);
                const next = positions.next;

                if (isValidPos(next.r, next.c) &&
                    newBoard[next.r][next.c] &&
                    newTiles[newBoard[next.r][next.c]].value === tile.value &&
                    !mergedThisTurnArray[next.r][next.c]) {
                    
                    const targetId = newBoard[next.r][next.c];
                    const newValue = tile.value + 1;
                    
                    window.state.maxLevelReached = Math.max(window.state.maxLevelReached, newValue);
                    
                    scoreIncrease += Math.pow(2, newValue) * 10;
                    if (newValue === 12) reachedMaxLevel = true;

                    mergedThisTurnArray[next.r][next.c] = true;
                    newTiles[tileId].r = next.r;
                    newTiles[tileId].c = next.c;
                    newTiles[tileId].isDeleted = true;
                    
                    newTiles[targetId].value = newValue;
                    newTiles[targetId].isNew = false;
                    newTiles[targetId].isMerged = true;
                    
                    newBoard[r][c] = null;
                    hasMoved = true;
                    isMergedThisTurn = true;
                    if (window.state.gameMode === 'tutorial') tutMerged = true;
                    
                    if(window.state.gameMode === 'survival' || window.state.gameMode === 'rank' || window.state.gameMode === 'custom') {
                        let bonus = 0;
                        if (window.state.difficulty === 'beginner') bonus = 2;
                        else if (window.state.difficulty === 'intermediate' || window.state.difficulty === 'advanced') {
                            if (newValue >= 4) bonus = 2;
                        } else if (window.state.difficulty === 'expert' || window.state.difficulty === 'master') {
                            if (newValue >= 4 && newValue <= 9) bonus = 2;
                        }

                        if (bonus > 0) {
                            window.state.timeLeft += bonus;
                            highMergeThisTurn = true;
                            window.updateTimerUI();
                        }
                    }

                } else if (positions.farthest.r !== r || positions.farthest.c !== c) {
                    newBoard[positions.farthest.r][positions.farthest.c] = tileId;
                    newBoard[r][c] = null;
                    newTiles[tileId].r = positions.farthest.r;
                    newTiles[tileId].c = positions.farthest.c;
                    hasMoved = true;
                }
            }
        });
    });

    if (hasMoved) {
        if (isMergedThisTurn) {
            window.playSound(highMergeThisTurn ? 'timeup' : 'merge');
        } else {
            window.playSound('move');
        }

        if (window.state.gameMode === 'tutorial') {
            const step = window.state.tutorialStep;
            if (step === 0) {
                const id = window.generateId();
                newTiles[id] = { id, value: 2, r: 1, c: 2, isNew: true };
                newBoard[1][2] = id;
            } else if (step === 1) {
                const id = window.generateId();
                newTiles[id] = { id, value: 3, r: 0, c: 0, isNew: true };
                newBoard[0][0] = id;
            } else if (step === 2) {
                const id = window.generateId();
                newTiles[id] = { id, value: 4, r: 2, c: 0, isNew: true };
                newBoard[2][0] = id;
            }
        } else {
            const empties = window.getEmptyCells(newBoard);
            if (empties.length > 0) {
                const cell = empties[Math.floor(Math.random() * empties.length)];
                const id = window.generateId();
                const val = Math.random() < 0.9 ? 1 : 2;
                newTiles[id] = { id, value: val, r: cell.r, c: cell.c, isNew: true };
                newBoard[cell.r][cell.c] = id;
            }
        }

        window.state.board = newBoard;
        window.state.tiles = newTiles;
        if (scoreIncrease > 0) window.updateScore(scoreIncrease);
        if (reachedMaxLevel && !window.state.gameWon) window.state.gameWon = true;

        window.renderGame();

        setTimeout(() => {
            const cleanedTiles = {};
            Object.keys(window.state.tiles).forEach(key => {
                if (!window.state.tiles[key].isDeleted) {
                    cleanedTiles[key] = { ...window.state.tiles[key], isNew: false, isMerged: false };
                }
            });
            window.state.tiles = cleanedTiles;

            if (window.state.gameMode === 'tutorial' && tutMerged) {
                window.state.tutorialStep++;
                if (window.state.tutorialStep > 3) {
                    window.state.isAnimating = false;
                    window.renderGame();
                    window.playSound('clear');
                    document.getElementById('tutorial-tooltip').classList.add('hidden');
                    document.getElementById('tutorial-tooltip').classList.remove('flex');
                    document.getElementById('overlay-tutorial-won').classList.remove('hidden');
                    document.getElementById('overlay-tutorial-won').classList.add('flex');
                } else {
                    const icons = ["👉", "👈", "👇", "👆"];
                    const texts = ["오른쪽(▶)으로 스와이프!", "왼쪽(◀)으로 스와이프!", "아래(▼)로 스와이프!", "위(▲)로 스와이프!"];
                    document.getElementById('tutorial-tooltip-icon').innerText = icons[window.state.tutorialStep];
                    document.getElementById('tutorial-tooltip-text').innerText = texts[window.state.tutorialStep];
                    window.state.isAnimating = false;
                    window.renderGame();
                }
                return; 
            }
            
            let over = true;
            if (window.getEmptyCells(window.state.board).length > 0) over = false;
            else {
                for (let i = 0; i < window.state.gridSize; i++) {
                    for (let j = 0; j < window.state.gridSize; j++) {
                        const val = window.state.tiles[window.state.board[i][j]]?.value;
                        if (i < window.state.gridSize - 1 && window.state.tiles[window.state.board[i + 1][j]]?.value === val) over = false;
                        if (j < window.state.gridSize - 1 && window.state.tiles[window.state.board[i][j + 1]]?.value === val) over = false;
                    }
                }
            }
            if (over) {
                window.state.gameOver = true;
                clearInterval(window.state.timerInterval);
                window.playSound('gameover');
            }
            if (reachedMaxLevel && window.state.gameWon && !window.state.continueAfterWin) {
                 clearInterval(window.state.timerInterval);
                 window.playSound('clear');
            }
            
            window.state.isAnimating = false;
            window.renderGame();
        }, 150);
    } else {
        window.state.isAnimating = false;
    }
};

window.startTutorial = function() {
    window.initAudio();
    window.state.gameMode = 'tutorial';
    window.state.tutorialStep = 0;
    window.state.gameImages = {};
    
    const tutMembers = window.MEMBER_DB.slice(0, 12);
    if(tutMembers.length < 12) { 
         window.FALLBACK_DATA.streamers.slice(0, 12).forEach((m, idx) => tutMembers[idx] = {name:m.name, imgUrl:m.imgs[0]});
    }
    tutMembers.forEach((m, idx) => {
        window.state.gameImages[idx + 1] = { name: m.name, imgUrl: m.imgUrl || m.imgs?.[0] };
    });

    const bgGrid = document.getElementById('game-bg-grid');
    let bgHtml = '';
    for(let r=0; r<4; r++) {
        for(let c=0; c<4; c++) {
            bgHtml += `<div class="absolute w-1/4 h-1/4 p-1" style="transform: translate(${c * 100}%, ${r * 100}%);"><div class="bg-slate-700/60 shadow-inner rounded-xl w-full h-full"></div></div>`;
        }
    }
    bgGrid.innerHTML = bgHtml;
    
    window.goToScreen('game');
    window.renderGuideLayout();
    
    window.state.board = Array(window.state.gridSize).fill(null).map(() => Array(window.state.gridSize).fill(null));
    window.state.tiles = {};
    window.state.score = 0;
    window.state.gameOver = false;
    window.state.gameWon = false;
    window.state.continueAfterWin = false;

    const id1 = window.generateId();
    const id2 = window.generateId();
    window.state.tiles[id1] = { id: id1, value: 1, r: 1, c: 1, isNew: true };
    window.state.tiles[id2] = { id: id2, value: 1, r: 1, c: 2, isNew: true };
    window.state.board[1][1] = id1;
    window.state.board[1][2] = id2;

    document.getElementById('tutorial-tooltip').classList.remove('hidden');
    document.getElementById('tutorial-tooltip').classList.add('flex');
    document.getElementById('tutorial-tooltip-icon').innerText = '👉';
    document.getElementById('tutorial-tooltip-text').innerText = '오른쪽(▶)으로 스와이프!';
    
    document.getElementById('overlay-tutorial-won').classList.add('hidden');
    document.getElementById('overlay-tutorial-won').classList.remove('flex');
    document.getElementById('survival-timer-wrapper').classList.add('hidden');
    
    document.getElementById('btn-restart-game').classList.remove('hidden');
    
    window.renderGame();
};

window.endTutorial = function() {
    document.getElementById('tutorial-tooltip').classList.add('hidden');
    document.getElementById('tutorial-tooltip').classList.remove('flex');
    document.getElementById('overlay-tutorial-won').classList.add('hidden');
    document.getElementById('overlay-tutorial-won').classList.remove('flex');
    window.state.gameMode = 'normal';
    window.goToScreen('home'); 
};

window.handleRestart = function() {
    window.initAudio();
    if (window.state.gameMode === 'tutorial') {
        window.startTutorial();
    } else {
        window.initBoard();
    }
};

window.confirmExitGame = function() {
    window.playSound('click');
    document.getElementById('exit-confirm-modal').classList.remove('hidden');
    document.getElementById('exit-confirm-modal').classList.add('flex');
};

window.executeExitGame = function() {
    window.playSound('click');
    document.getElementById('exit-confirm-modal').classList.add('hidden');
    document.getElementById('exit-confirm-modal').classList.remove('flex');
    
    clearInterval(window.state.timerInterval);
    clearInterval(window.multiSyncInterval);
    
    if(window.state.gameMode === 'custom' || window.state.gameMode === 'rank') {
        if(window.state.gameMode === 'custom') window.leaveCustomRoom();
        else window.goToScreen('modeselect-multi');
    } else {
        window.goToScreen('modeselect-single');
    }
};

// 멀티플레이 동기화 타이머
window.multiSyncInterval = null;

window.startMultiplayerSync = function() {
    clearInterval(window.multiSyncInterval);
    document.getElementById('multiplayer-leaderboard').classList.remove('hidden');
    
    window.multiSyncInterval = setInterval(() => {
        if (window.state.gameOver || window.state.screen !== 'game') { clearInterval(window.multiSyncInterval); return; }
        
        if (window.state.gameMode === 'rank') {
            window.state.simulatedBots.forEach(b => {
                if(Math.random() > 0.3) {
                    b.score += Math.floor(Math.random() * 50);
                    if(b.score > 1000 && Math.random()>0.9) b.level = Math.min(12, b.level+1);
                }
            });
            window.renderMultiplayerLeaderboard(window.state.simulatedBots);
        } 
        else if (window.state.gameMode === 'custom' && window.myPlayerRef) {
            window.myPlayerRef.update({ score: window.state.score, level: window.state.maxLevelReached }).catch(e=>0);
            if(window.roomRef) {
                window.roomRef.child('players').get().then(snap => {
                    if(snap.exists()) {
                        const pData = snap.val();
                        const pList = Object.keys(pData).filter(uid => uid !== window.currentUser.uid).map(uid => ({ id: uid, name: pData[uid].name, score: pData[uid].score||0, level: pData[uid].level||0 }));
                        window.renderMultiplayerLeaderboard(pList);
                    }
                }).catch(e=>0);
            }
        }
    }, 2000);
};

window.renderMultiplayerLeaderboard = function(otherPlayers) {
    const list = document.getElementById('multiplayer-leaderboard');
    let allP = [...otherPlayers, { id: 'me', name: window.userData.nickname, score: window.state.score, level: window.state.maxLevelReached }];
    
    allP.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.level - a.level;
    });
    
    list.innerHTML = allP.map((p, idx) => {
        const isMe = p.id === 'me';
        let medal = `${idx+1}위`;
        if(idx === 0) medal = '🥇'; else if(idx === 1) medal = '🥈'; else if(idx === 2) medal = '🥉';
        return `<div class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isMe ? 'bg-soop border-2 border-sky-300' : 'bg-indigo-800 border border-indigo-600'}">
            <span class="text-sm font-black text-white">${medal}</span>
            <span class="text-xs font-bold text-white truncate max-w-[60px]">${p.name}</span>
            <span class="text-xs font-mono text-indigo-200">${p.score}</span>
        </div>`;
    }).join('');
};

window.showMultiplayerResult = function() {
    clearInterval(window.multiSyncInterval);
    const overlay = document.getElementById('overlay-multi-result');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    
    document.getElementById('multi-result-score').innerText = window.state.score.toLocaleString();
    
    let myRank = 1;
    let totalPlayers = 1;
    if (window.state.gameMode === 'rank') {
        window.state.simulatedBots.forEach(b => {
            totalPlayers++;
            if(b.score > window.state.score || (b.score === window.state.score && b.level > window.state.maxLevelReached)) myRank++;
        });
    } else if (window.state.gameMode === 'custom' && window.state.multiplayState.players) {
        Object.values(window.state.multiplayState.players).forEach(p => {
            if (p.name !== window.userData.nickname) {
                totalPlayers++;
                if(p.score > window.state.score || (p.score === window.state.score && p.level > window.state.maxLevelReached)) myRank++;
            }
        });
    }

    document.getElementById('multi-result-rank').innerText = `${myRank}위`;
    
    const ptEl = document.getElementById('multi-result-point');
    if (window.state.gameMode === 'rank') {
        const points = [40, 30, 20, 10, 0, -15, -25, -35];
        const earn = points[myRank-1] || 0;
        if(earn > 0) { ptEl.innerText = `+${earn} RP`; ptEl.className = "text-green-400 font-bold text-2xl mb-4"; }
        else if(earn < 0) { ptEl.innerText = `${earn} RP`; ptEl.className = "text-red-400 font-bold text-2xl mb-4"; }
        else { ptEl.innerText = `-`; ptEl.className = "text-gray-400 font-bold text-xl mb-4"; }
        
        window.userData.bestScores.rank_point = Math.max(0, (window.userData.bestScores.rank_point || 1000) + earn);
        window.saveBestScoreToFirebase();
    } else {
        ptEl.innerText = "친선 게임";
        ptEl.className = "text-sky-400 font-bold text-lg mb-4";
    }
};

// === 8. 키보드 및 터치 이벤트 리스너 ===
window.addEventListener('keydown', (e) => {
    if (window.state.screen !== 'game') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (['ArrowUp', 'w', 'W'].includes(e.key)) window.moveTiles(0);
    if (['ArrowRight', 'd', 'D'].includes(e.key)) window.moveTiles(1);
    if (['ArrowDown', 's', 'S'].includes(e.key)) window.moveTiles(2);
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) window.moveTiles(3);
}, { passive: false });

let touchStartX = null;
let touchStartY = null;

document.addEventListener('touchstart', (e) => {
    if (window.state.screen !== 'game') return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (window.state.screen !== 'game' || !touchStartX) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) {
        if (Math.abs(dx) > Math.abs(dy)) window.moveTiles(dx > 0 ? 1 : 3);
        else window.moveTiles(dy > 0 ? 2 : 0);
    }
    touchStartX = null;
    touchStartY = null;
});