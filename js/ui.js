// js/ui.js

const REVIEW_DAYS = [1, 3, 7, 14, 30];

export class UIManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        
        this.elements = {
            mainPercent: document.getElementById('mainPercent'),
            mainProgressCircle: document.getElementById('mainProgressCircle'),
            userLevel: document.getElementById('userLevel'),
            expText: document.getElementById('expText'),
            expBar: document.getElementById('expBar'),
            avgPurityText: document.getElementById('avgPurityText'),
            monthlyGoalDisplay: document.getElementById('monthlyGoalDisplay'),
            weeklyGoalDisplay: document.getElementById('weeklyGoalDisplay'),
            slotContent: document.getElementById('slotContent'),
            textbookList: document.getElementById('textbookList'),
            inventoryContainer: document.getElementById('inventoryContainer'),
            monthTitleLabel: document.getElementById('monthTitleLabel'),
            weekTitleLabel: document.getElementById('weekTitleLabel'),
            medicationAlert: document.getElementById('medicationAlert'),
            reviewBanner: document.getElementById('reviewBanner'),
            reviewList: document.getElementById('reviewList')
        };
    }

    // 💡 과목별 전용 색상 스타일 반환 로직
    getSubjectStyle(subject) {
        const styles = {
            '국어': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
            '수학': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
            '영어': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
            '과탐': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
            '기타': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
        };
        return styles[subject] || styles['기타'];
    }

    render() {
        const state = this.stateManager;
        this.updateDateLabels();
        this.renderHeader(state);
        this.renderCompass(state);
        this.renderActiveSlot(state);
        this.renderTextbooks(state);
        this.renderInventory(state);
        this.checkReminders(state);
        
        if (window.lucide) window.lucide.createIcons();
    }

    updateDateLabels() {
        const now = new Date(); 
        const month = now.getMonth() + 1; 
        const start = new Date(now.getFullYear(), 0, 1);
        const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
        this.elements.monthTitleLabel.innerText = `${month}월`; 
        this.elements.weekTitleLabel.innerText = `${week}주차`;
    }

    renderHeader(state) {
        const total = state.config.totalGoal || 1;
        const completed = state.logs.reduce((acc, log) => acc + (log.vol || 0), 0);
        const percent = Math.min(100, Math.floor((completed / total) * 100));
        
        // 라이트 모드 대비 텍스트 색상 변경 (text-slate-800)
        this.elements.mainPercent.innerText = `${percent}%`;
        this.elements.mainPercent.classList.add('text-slate-800');
        this.elements.mainProgressCircle.style.strokeDashoffset = 464.7 - (464.7 * (percent / 100));

        let exp = 0; let pc = 0; let totalP = 0;
        state.logs.forEach(l => { 
            exp += 10; 
            (l.reviews || []).forEach(r => { if(r) exp += 5; }); 
            if(l.score > 0){ totalP += l.score; pc++; } 
        });
        
        let lvl = 1, req = 100; 
        while(exp >= req){ exp -= req; lvl++; req = Math.floor(req * 1.15); }
        
        this.elements.userLevel.innerText = lvl;
        this.elements.expText.innerText = `${exp} / ${req}`;
        this.elements.expBar.style.width = `${(exp/req)*100}%`;
        this.elements.avgPurityText.innerText = `${pc ? Math.round(totalP/pc) : 0}%`;
    }

    renderCompass(state) {
        const format = (t) => t.replace(/\[(.*?)\]/g, '<span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 mr-1">$1</span>');
        
        const renderTasks = (tasks, type) => {
            if(!tasks || tasks.length === 0) return `<p class="text-xs text-slate-400 italic">목표를 설정하세요.</p>`;
            return tasks.map((t, i) => `
                <div class="flex items-start gap-2.5 group cursor-pointer" onclick="app.toggleGoalTask('${type}', ${i})">
                    <div class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border ${t.done ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-indigo-400'} flex items-center justify-center transition-all">
                        <i data-lucide="check" class="w-3 h-3"></i>
                    </div>
                    <span class="text-xs font-bold ${t.done ? 'text-slate-400 line-through' : 'text-slate-700'} flex-1 leading-snug">${format(t.text)}</span>
                </div>`).join('');
        };
        
        this.elements.monthlyGoalDisplay.innerHTML = renderTasks(state.config.monthlyGoals || [], 'monthly');
        this.elements.weeklyGoalDisplay.innerHTML = renderTasks(state.config.weeklyGoals || [], 'weekly');
    }

    renderActiveSlot(state) {
        const info = { 
            morning: { t: '🌞 Morning Output', i: 'zap', color: 'text-indigo-600' }, 
            afternoon: { t: '📖 Afternoon Input', i: 'book-open', color: 'text-amber-600' }, 
            evening: { t: '🌙 Evening Review', i: 'refresh-cw', color: 'text-rose-600' } 
        }[state.activeSlot];
        
        let html = `<div class="mb-8"><h4 class="text-sm font-black ${info.color} flex items-center gap-2.5 uppercase tracking-widest"><i data-lucide="${info.i}" class="w-4 h-4"></i> ${info.t}</h4></div><div class="space-y-3">`;
        
        const overdue = [];
        state.logs.forEach(l => { 
            REVIEW_DAYS.forEach((d, idx) => { 
                if(this.isTargetDate(l.date, d) && !(l.reviews && l.reviews[idx])) {
                    overdue.push({ id: l.id, content: l.content, dayIdx: idx, dayLabel: d }); 
                }
            }); 
        });
        
        if(overdue.length > 0) {
            this.elements.reviewBanner.classList.remove('hidden');
            this.elements.reviewList.innerHTML = overdue.map(o => `
                <div class="bg-white/50 border border-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div class="min-w-0"><p class="text-[9px] text-rose-600 font-black uppercase mb-1">${o.dayLabel}일차 복습</p><h5 class="text-xs font-bold text-slate-800 truncate">${o.content}</h5></div>
                    <button onclick="app.completeReview('${o.id}', ${o.dayIdx})" class="bg-rose-500 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-md active:scale-95"><i data-lucide="check" class="w-4 h-4"></i></button>
                </div>`).join('');
        } else {
            this.elements.reviewBanner.classList.add('hidden');
        }

        const ts = state.tasks[state.activeSlot] || [];
        ts.forEach((t, i) => {
            html += `
            <div class="bg-white border border-slate-200 p-4 rounded-[2rem] flex justify-between items-center group hover:border-indigo-300 transition-colors shadow-sm">
                <div class="flex-1 min-w-0 pr-4">
                    <h5 class="font-bold text-sm ${t.done ? 'line-through text-slate-300' : 'text-slate-700'} truncate">${t.title}</h5>
                </div>
                <div class="flex gap-2">
                    <button onclick="app.deleteTask('${state.activeSlot}', ${i})" class="w-10 h-10 rounded-xl flex items-center justify-center bg-transparent text-slate-300 hover:bg-slate-100 hover:text-rose-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    <button onclick="app.toggleTask('${state.activeSlot}', ${i})" class="w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all ${t.done ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-50 border border-slate-200 text-slate-400 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white'}">
                        <i data-lucide="${t.done ? 'check' : 'circle'}" class="w-6 h-6"></i>
                    </button>
                </div>
            </div>`;
        });

        html += `
            <div class="flex gap-2 mt-4 items-center bg-white p-2 rounded-[2rem] border border-slate-200 focus-within:border-indigo-500 shadow-inner transition-colors">
                <input type="text" id="inlineTaskInput" placeholder="이 슬롯에 추가할 미션 입력" onkeypress="if(event.key==='Enter') app.addInlineTask('${state.activeSlot}')" class="flex-1 bg-transparent border-none px-4 py-3 text-sm text-slate-700 outline-none">
                <button onclick="app.addInlineTask('${state.activeSlot}')" class="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-500 active:scale-95 transition-all"><i data-lucide="plus" class="w-5 h-5"></i></button>
            </div>
        </div>`;
        
        this.elements.slotContent.innerHTML = html;
    }

    renderTextbooks(state) {
        this.elements.textbookList.innerHTML = state.textbooks.map(tb => {
            const style = this.getSubjectStyle(tb.subject);
            return `
            <div class="p-6 rounded-[2.5rem] bg-white border border-slate-200 row-animate hover:border-indigo-200 shadow-sm transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div class="min-w-0 pr-2">
                        <span class="text-[9px] font-black px-2.5 py-1 rounded-full ${style.bg} ${style.text} uppercase tracking-tighter border ${style.border}">${tb.subject}</span>
                        <h3 class="font-bold text-slate-800 text-sm mt-2.5 truncate">${tb.title}</h3>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <span class="text-xl font-black text-indigo-600">${tb.progress}%</span>
                        <div class="flex gap-2">
                            <button onclick="app.editTextbook('${tb.id}')" class="text-slate-300 hover:text-indigo-500 transition-colors" title="수정"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                            <button onclick="app.deleteTextbook('${tb.id}')" class="text-slate-300 hover:text-rose-500 transition-colors" title="삭제"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                </div>
                <div class="bg-slate-100 h-2 rounded-full overflow-hidden mb-5"><div class="bg-indigo-500 h-full transition-all duration-500" style="width:${tb.progress}%"></div></div>
                <details class="group"><summary class="text-[10px] font-bold text-slate-400 cursor-pointer list-none flex justify-between items-center hover:text-slate-600">목차 열기 <i data-lucide="chevron-down" class="w-3 h-3 group-open:rotate-180 transition-transform"></i></summary>
                    <div class="mt-4 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        ${tb.items.map((it, idx) => `
                        <div class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group/item">
                            <label class="flex items-center gap-3 cursor-pointer flex-1">
                                <input type="checkbox" ${it.checked ? 'checked' : ''} onclick="app.toggleTbItem('${tb.id}', ${idx})" class="w-4 h-4 accent-indigo-500 rounded bg-white border-slate-300 cursor-pointer">
                                <span class="text-xs ${it.checked ? 'line-through text-slate-300' : 'text-slate-600 font-bold'}">${it.title}</span>
                            </label>
                            <button onclick="app.quickAdd('${tb.id}', ${idx})" class="p-1.5 text-slate-300 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg transition-all opacity-50 group-hover/item:opacity-100" title="현재 슬롯으로 추가"><i data-lucide="arrow-up-right" class="w-4 h-4"></i></button>
                        </div>`).join('')}
                    </div>
                </details></div>`;
        }).join('');
    }

    renderInventory(state) {
        const searchInput = document.getElementById('searchInput');
        const term = searchInput ? searchInput.value.toLowerCase() : '';
        const filtered = state.logs.filter(l => l.content.toLowerCase().includes(term));
        
        this.elements.inventoryContainer.innerHTML = filtered.map(l => {
            const style = this.getSubjectStyle(l.subject);
            return `
            <div class="p-6 flex flex-col gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100 row-animate">
                <div class="flex justify-between items-start gap-4">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-[9px] font-black px-2 py-0.5 rounded-md ${style.bg} ${style.text} border ${style.border}">${l.subject || '기타'}</span>
                            <span class="text-[10px] font-bold text-slate-400 tabular-nums">${l.date}</span>
                        </div>
                        <h3 class="font-bold text-slate-700 text-sm truncate">${l.content}</h3>
                    </div>
                    <div class="flex items-center gap-3">
                        ${l.score > 0 ? `<span class="text-[10px] font-black text-amber-600 flex items-center gap-1 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100"><i data-lucide="gem" class="w-3 h-3"></i>순도 ${l.score}%</span>` : ''}
                        <button onclick="app.deleteLog('${l.id}')" class="text-slate-300 hover:text-rose-500 p-2 transition-colors"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${REVIEW_DAYS.map((d, i) => `
                        <button onclick="app.toggleLogReview('${l.id}', ${i})" class="flex flex-col items-center gap-1.5 group">
                            <div class="w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${l.reviews && l.reviews[i] ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-300 hover:bg-slate-100 hover:text-slate-600'}">
                                <i data-lucide="check" class="w-4 h-4"></i>
                            </div>
                            <span class="text-[7px] font-black ${l.reviews && l.reviews[i] ? 'text-indigo-600' : 'text-slate-400'}">${d}D</span>
                        </button>`).join('')}
                </div>
            </div>`;
        }).join('');
    }

    checkReminders(state) {
        const now = new Date(); 
        const medTime = state.config.medTime || '08:00';
        const [h, m] = medTime.split(':'); 
        const med = new Date(); 
        med.setHours(h, m, 0); 
        const diff = (now - med) / 3600000;
        this.elements.medicationAlert.classList.toggle('hidden', !(diff >= 0 && diff <= 4)); 
    }

    isTargetDate(b, d) { 
        const t = new Date(); 
        t.setHours(0,0,0,0); 
        const r = new Date(b); 
        r.setDate(r.getDate() + d); 
        r.setHours(0,0,0,0); 
        return t.getTime() === r.getTime(); 
    }

    celebrate() { 
        for(let i=0; i<30; i++){ 
            const c = document.createElement('div'); 
            c.className = 'confetti'; 
            c.style.left = Math.random() * 100 + 'vw'; 
            c.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`; 
            c.style.width = Math.random() * 10 + 5 + 'px'; 
            c.style.height = c.style.width; 
            c.style.top = '-20px'; 
            document.body.appendChild(c); 
            setTimeout(() => c.remove(), 3000); 
        } 
    }
}
