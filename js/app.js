// js/app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { StateManager } from './state.js';
import { DatabaseService } from './database.js';
import { UIManager } from './ui.js';

const firebaseConfig = {
    apiKey: "AIzaSyAxmvKC9RdRSlVpNjFZTV18XLQlvoWHyH4",
    authDomain: "study-manager-github-54812.firebaseapp.com",
    projectId: "study-manager-github-54812",
    storageBucket: "study-manager-github-54812.firebasestorage.app",
    messagingSenderId: "143994482333",
    appId: "1:143994482333:web:9256e1f39a05ab99b26e74"
};
const APP_ID = "med-unified-manager-final-stable";

class App {
    constructor() {
        const app = initializeApp(firebaseConfig);
        this.auth = getAuth(app);
        
        this.state = new StateManager();
        this.db = new DatabaseService(APP_ID, app);
        this.ui = new UIManager(this.state);

        this.editingTbId = null;
        this.tempTaskData = null;

        // 상태 변경 시 자동으로 UI 다시 그리기
        this.state.subscribe(() => this.ui.render());

        this.initAuth();
        
        // HTML의 인라인 이벤트(onclick="app.명령어()")에서 이 클래스를 찾을 수 있도록 전역 연결
        window.app = this;
    }

initAuth() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                document.getElementById('authOverlay').classList.add('hidden');
                this.db.setUserId(user.uid);
                this.db.syncData(this.state); 
                
                // 🌟 추가된 코드: 좌측 상단 'Connected' 글씨 대신 로그인된 이메일을 보여줍니다!
                document.getElementById('syncStatus').innerText = user.email;
                document.getElementById('syncStatus').classList.remove('uppercase'); // 대문자 변환 해제
                
            } else {
                document.getElementById('loadingText').innerText = "기기 간 연동을 위해 구글 로그인이 필요합니다.";
                document.getElementById('loginBtn').classList.remove('hidden');
            }
        });
    }
async login() {
        const provider = new GoogleAuthProvider();
        
        // 🌟 핵심 추가: 모바일에서도 무조건 구글 계정 선택 창을 강제로 띄우게 만듭니다!
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        document.getElementById('loadingText').innerText = "인증 중...";
        document.getElementById('loginBtn').classList.add('hidden');
        try { 
            await signInWithPopup(this.auth, provider); 
        } catch(e) { 
            alert("로그인 에러: " + e.message); 
            document.getElementById('loadingText').innerText = "로그인 실패";
            document.getElementById('loginBtn').classList.remove('hidden');
        }
    }

    setSlot(slot) {
        ['morning', 'afternoon', 'evening'].forEach(s => {
            const tab = document.getElementById(`tab-${s}`);
            if (tab) {
                tab.className = s === slot 
                    ? "flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black transition-all slot-active"
                    : "flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black transition-all text-slate-500";
            }
        });
        this.state.setActiveSlot(slot);
    }

    // --- 목표 및 태스크 관리 ---
    async toggleGoalTask(type, idx) {
        const list = type === 'monthly' ? this.state.config.monthlyGoals : this.state.config.weeklyGoals;
        list[idx].done = !list[idx].done; 
        if(list[idx].done) this.ui.celebrate();
        await this.db.saveConfig(this.state.config);
    }

    async addInlineTask(slot) {
        const input = document.getElementById('inlineTaskInput');
        const title = input.value.trim();
        if(!title) return;
        
        const tasks = this.state.tasks;
        if (!tasks[slot]) tasks[slot] = [];
        tasks[slot].push({ title, vol: 1, done: false, subject: '기타' });
        
        this.state.setTasks(tasks);
        await this.db.saveTasks(tasks);
        input.value = ''; 
    }

    async deleteTask(slot, idx) {
        const tasks = this.state.tasks;
        tasks[slot].splice(idx, 1);
        this.state.setTasks(tasks);
        await this.db.saveTasks(tasks);
    }

    async toggleTask(slot, idx) {
        const tasks = this.state.tasks;
        const t = tasks[slot][idx]; 
        t.done = !t.done;
        
        if(t.done){ 
            this.ui.celebrate(); 
            
            // 연결된 교재가 있다면 진행률 업데이트
            if(t.linkedTbId) {
                const tb = this.state.textbooks.find(x => x.id === t.linkedTbId);
                if(tb && tb.items[t.linkedIdx] && !tb.items[t.linkedIdx].checked) {
                    tb.items[t.linkedIdx].checked = true;
                    tb.progress = Math.round((tb.items.filter(i => i.checked).length / tb.items.length) * 100);
                    this.db.saveTextbook(tb.id, tb);
                }
            }

            if(slot !== 'afternoon') { 
                this.tempTaskData = { slot, idx }; 
                this.openScoreModal(t.title); 
            } else { 
                await this.createLog(t, 0); 
            } 
        }
        this.state.setTasks(tasks);
        await this.db.saveTasks(tasks);
    }

    // --- 로그(학습 데이터) 관리 ---
    async createLog(t, score) {
        const id = Date.now().toString();
        const logData = {
            content: t.title, subject: t.subject || '기타', date: new Date().toISOString().split('T')[0],
            vol: t.vol, reviews: [false,false,false,false,false], score, createdAt: Date.now()
        };
        await this.db.saveLog(id, logData);
    }

    async deleteLog(id) {
        if(confirm("기록을 영구 삭제할까요?")) {
            await this.db.deleteLog(id);
        }
    }

    async toggleLogReview(id, di) {
        const log = this.state.logs.find(l => l.id === id); 
        const up = [...(log.reviews || [false,false,false,false,false])]; 
        up[di] = !up[di]; 
        await this.db.saveLog(id, { ...log, reviews: up });
    }

    async completeReview(id, di) { 
        const log = this.state.logs.find(l => l.id === id); 
        const up = [...(log.reviews || [false,false,false,false,false])]; 
        up[di] = true; 
        await this.db.saveLog(id, { ...log, reviews: up }); 
        this.ui.celebrate(); 
    }

    // --- 교재(Textbook) 관리 ---
    async toggleTbItem(tbId, idx) {
        const tb = this.state.textbooks.find(t => t.id === tbId); 
        const items = [...tb.items]; 
        items[idx].checked = !items[idx].checked;
        const progress = Math.round((items.filter(i => i.checked).length / items.length) * 100);
        await this.db.saveTextbook(tbId, { ...tb, items, progress });
        if(items[idx].checked) this.ui.celebrate();
    }

    async quickAdd(tbId, idx) {
        const tb = this.state.textbooks.find(t => t.id === tbId);
        const slot = this.state.activeSlot; 
        
        const tasks = this.state.tasks;
        if (!tasks[slot]) tasks[slot] = [];
        
        tasks[slot].push({ 
            title: `[${tb.title}] ${tb.items[idx].title}`, 
            vol: 1, 
            done: false, 
            subject: tb.subject,
            linkedTbId: tb.id, 
            linkedIdx: idx
        });
        this.state.setTasks(tasks);
        await this.db.saveTasks(tasks);
    }

    async deleteTextbook(id) {
        if(confirm("이 교재를 삭제하시겠습니까? (기록된 로그는 삭제되지 않습니다.)")) {
            await this.db.deleteTextbook(id);
        }
    }

    async saveTextbook() {
        const title = document.getElementById('tbTitle').value; 
        const itemsT = document.getElementById('tbItemsText').value;
        if(!title || !itemsT) return; 
        
        let items;
        if(this.editingTbId) {
            const existingTb = this.state.textbooks.find(t => t.id === this.editingTbId);
            const newTitles = itemsT.split('\n').filter(i => i.trim()).map(i => i.trim());
            items = newTitles.map(t => {
                const existing = existingTb.items.find(old => old.title === t);
                return existing ? existing : { title: t, checked: false }; 
            });
        } else {
            items = itemsT.split('\n').filter(i => i.trim()).map(i => ({ title: i.trim(), checked: false }));
        }

        const tbId = this.editingTbId || Date.now().toString();
        const progress = Math.round((items.filter(i => i.checked).length / items.length) * 100) || 0;
        
        await this.db.saveTextbook(tbId, { 
            title, 
            subject: document.getElementById('tbSubject').value, 
            items, 
            progress 
        }); 
        this.closeTextbookModal();
    }

    // --- UI 조작 및 설정 저장 (모달 등) ---
    openSettings() {
        document.getElementById('setTotalGoal').value = this.state.config.totalGoal; 
        document.getElementById('setMedTime').value = this.state.config.medTime || '08:00';
        document.getElementById('setMonthlyGoal').value = (this.state.config.monthlyGoals || []).map(t => t.text).join('\n');
        document.getElementById('setWeeklyGoal').value = (this.state.config.weeklyGoals || []).map(t => t.text).join('\n');
        document.getElementById('settingsModal').classList.remove('hidden');
    }
    
    async saveSettings() {
        const newConfig = { ...this.state.config };
        newConfig.totalGoal = parseInt(document.getElementById('setTotalGoal').value) || 1000; 
        newConfig.medTime = document.getElementById('setMedTime').value || '08:00';
        
        const p = (v, o) => v.split('\n').filter(l => l.trim()).map(line => { 
            const e = (o || []).find(t => t.text === line); 
            return e ? e : { text: line, done: false }; 
        });
        newConfig.monthlyGoals = p(document.getElementById('setMonthlyGoal').value, newConfig.monthlyGoals);
        newConfig.weeklyGoals = p(document.getElementById('setWeeklyGoal').value, newConfig.weeklyGoals);
        
        this.state.updateConfig(newConfig);
        await this.db.saveConfig(newConfig); 
        this.closeSettings();
    }

    closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }
    scrollToInventory() { document.getElementById('inventorySection').scrollIntoView({ behavior: 'smooth' }); }
    
    openTextbookModal() {
        this.editingTbId = null;
        document.getElementById('tbModalTitle').innerText = "📖 새 교재 등록";
        document.getElementById('tbTitle').value = ''; 
        document.getElementById('tbItemsText').value = '';
        document.getElementById('textbookModal').classList.remove('hidden');
    }

    editTextbook(id) {
        this.editingTbId = id;
        const tb = this.state.textbooks.find(t => t.id === id);
        document.getElementById('tbModalTitle').innerText = "✏️ 교재 수정";
        document.getElementById('tbTitle').value = tb.title;
        document.getElementById('tbSubject').value = tb.subject;
        document.getElementById('tbItemsText').value = tb.items.map(i => i.title).join('\n');
        document.getElementById('textbookModal').classList.remove('hidden');
    }

    closeTextbookModal() { document.getElementById('textbookModal').classList.add('hidden'); }

    openScoreModal(name) { 
        document.getElementById('scoreTargetName').innerText = name; 
        document.getElementById('inputScoreValue').value = ''; 
        document.getElementById('scoreModal').classList.remove('hidden'); 
    }

    async saveOutputScore() {
        const val = parseInt(document.getElementById('inputScoreValue').value); 
        if(isNaN(val)) return;
        const { slot, idx } = this.tempTaskData; 
        await this.createLog(this.state.tasks[slot][idx], val); 
        document.getElementById('scoreModal').classList.add('hidden');
    }

    renderInventory() { this.ui.renderInventory(this.state); } // 검색 필터용 수동 렌더 트리거

    async handleOcr(e) {
        const file = e.target.files[0]; if(!file) return; 
        const overlay = document.getElementById('ocrOverlay'); overlay.classList.remove('hidden');
        try { 
            const worker = await window.Tesseract.createWorker('kor+eng'); 
            const ret = await worker.recognize(file); 
            await worker.terminate();
            const lines = ret.data.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const currentVal = document.getElementById('tbItemsText').value;
            const prefix = currentVal.trim() ? currentVal.trim() + '\n' : '';
            document.getElementById('tbItemsText').value = prefix + lines.join('\n');
            this.ui.celebrate();
            alert('목차 텍스트 추출이 완료되었습니다! 오타가 있다면 살짝만 수정해 주세요.');
        } catch (err) { 
            alert('OCR 추출 중 오류가 발생했습니다.'); 
        } finally { 
            overlay.classList.add('hidden'); 
            e.target.value = ''; 
        }
    }
}

// 앱 구동
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
