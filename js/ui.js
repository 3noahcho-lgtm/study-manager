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

    getSubjectStyle(subject) {
        const styles = {
            '국어': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
            '수학': { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500' },
            '영어': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
            '과탐': { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
            '기타': { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' }
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
        this.elements.mainPercent.innerText = `${percent}%`;
        this.elements.mainProgressCircle.style.strokeDashoffset = 364.4 - (364.4 * (percent / 100));

        let exp = 0; let pc = 0; let totalP = 0;
        state.logs.forEach(l => { 
            exp += 10; 
            (l.reviews || []).forEach(r => { if(r) exp += 5; }); 
            if(l.score > 0){ totalP += l.score; pc++; } 
        });
        
        let lvl = 1, req = 100; while(exp >= req){ exp -= req; lvl++; req = Math.floor(req * 1.15); }
        this.elements.userLevel.innerText = lvl;
        this.elements.expText.innerText = `${exp} / ${req} EXP`;
        this.elements.expBar.style.width = `${(exp/req)*100}%`;
        this.elements.avgPurityText.innerText = `${pc ? Math.round(totalP/pc) : 0}%`;
    }

    renderCompass(state) {
        const format = (t) => t.replace(/\[(.*?)\]/g, '<span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold mr-1">$1</span>');
        const renderTasks = (tasks, type) => {
            if(!tasks || tasks.length === 0) return `<p class="text-xs text-slate-400 italic">목표를 설정하세요.</p>`;
            return tasks.map((t, i) => `
                <div class="flex items-start gap-3 group cursor-pointer" onclick="app.toggleGoalTask('${type}', ${i})">
                    <div class="mt-0.5 w-4 h-4 rounded border ${t.done ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-200 bg-white'} flex items-center justify-center transition-all">
                        <i data-lucide="check" class="w-3 h-3"></i>
                    </div>
                    <span class="text-sm ${t.done ? 'text-slate-300 line-through' : 'text-slate-600 font-medium'} flex-1 leading-snug">${format(t.text)}</span>
                </div>`).join('');
        };
        this.elements.monthlyGoalDisplay.innerHTML = renderTasks(state.config.monthlyGoals || [], 'monthly');
        this.elements.weeklyGoalDisplay.innerHTML = renderTasks(state.config.weeklyGoals || [], 'weekly');
    }

    renderActiveSlot(state) {
        const info = { 
            morning: { t: 'MORNING OUTPUT', color: 'text-indigo-500' }, 
            afternoon: { t: 'AFTERNOON INPUT', color: 'text-amber-500' }, 
            evening: { t: 'EVENING REVIEW', color: 'text-rose-500' } 
        }[state.activeSlot];
        
        let html = `<div class="mb-6"><h4 class="text-[10px] font-black ${info.color} tracking-[0.2em]">${info.t}</h4></div><div class="space-y-3">`;
        
        const ts = state.tasks[state.activeSlot] || [];
        ts.forEach((t, i) => {
            html += `
            <div class="glass-card p-4 flex justify-between items-center group hover:border-indigo-200 transition-all">
                <h5 class="font-bold text-sm ${t.done ? 'line-through text-slate-300' : 'text-slate-700'} truncate">${t.title}</h5>
                <div class="flex gap-2">
                    <button onclick="app.deleteTask('${state.activeSlot}', ${i})" class="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    <button onclick="app.toggleTask('${state.activeSlot}', ${i})" class="w-10 h-10 rounded-xl transition-all ${t.done ? 'bg-green-500 text-white' : 'bg-slate-50 text-slate-300 hover:bg-indigo-500 hover:text-white'} flex items-center justify-center">
                        <i data-lucide="check" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>`;
        });

        html += `
            <div class="flex gap-2 mt-4 items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-inner">
                <input type="text" id="inlineTaskInput" placeholder="미션 추가..." onkeypress="if(event.key==='Enter') app.addInlineTask('${state.activeSlot}')" class="flex-1 bg-transparent border-none px-4 py-2 text-sm text-slate-700 outline-none">
                <button onclick="app.addInlineTask('${state.activeSlot}')" class="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"><i data-lucide="plus" class="w-4 h-4"></i></button>
            </div></div>`;
        this.elements.slotContent.innerHTML = html;
    }

    renderTextbooks(state) {
        this.elements.textbookList.innerHTML = state.textbooks.map(tb => {
            const s = this.getSubjectStyle(tb.subject);
            return `
            <div class="glass-card p-6 row-animate">
                <div class="flex justify-between items-start mb-5">
                    <div>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.bg} ${s.text} text-[10px] font-bold border border-white">
                            <span class="w-1.5 h-1.5 rounded-full ${s.dot}"></span>${tb.subject}
                        </span>
                        <h3 class="font-bold text-slate-800 text-base mt-3">${tb.title}</h3>
                    </div>
                    <span class="text-lg font-black text-slate-200">${tb.progress}%</span>
                </div>
                <div class="progress-container h-1.5 mb-5">
                    <div class="bg-indigo-500 h-full transition-all duration-700" style="width:${tb.progress}%"></div>
                </div>
                <details class="group">
                    <summary class="text-[10px] font-bold text-slate-400 cursor-pointer list-none flex justify-between items-center group-open:mb-4">CONTENTS <i data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform group-open:rotate-180"></i></summary>
                    <div class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        ${tb.items.map((it, idx) => `
                            <div class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50">
                                <label class="flex items-center gap-3 cursor-pointer flex-1">
                                    <input type="checkbox" ${it.checked ? 'checked' : ''} onclick="app.toggleTbItem('${tb.id}', ${idx})" class="w-4 h-4 rounded border-slate-300 text-indigo-600">
                                    <span class="text-sm ${it.checked ? 'line-through text-slate-300 font-medium' : 'text-slate-600 font-semibold'}">${it.title}</span>
                                </label>
                                <button onclick="app.quickAdd('${tb.id}', ${idx})" class="p-1.5 text-slate-300 hover:text-indigo-600"><i data-lucide="plus-circle" class="w-4 h-4"></i></button>
                            </div>`).join('')}
                    </div>
                </details></div>`;
        }).join('');
    }

    renderInventory(state) {
        const term = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const filtered = state.logs.filter(l => l.content.toLowerCase().includes(term));
        this.elements.inventoryContainer.innerHTML = filtered.map(l => {
            const s = this.getSubjectStyle(l.subject);
            return `
            <div class="p-6 flex flex-col gap-4 hover:bg-slate-50 transition-colors border-b border-slate-50 row-animate">
                <div class="flex justify-between items-start">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="px-2 py-0.5 rounded ${s.bg} ${s.text} text-[10px] font-bold">${l.subject}</span>
                            <span class="text-[10px] font-bold text-slate-300">${l.date}</span>
                        </div>
                        <h3 class="font-bold text-slate-700 text-sm truncate">${l.content}</h3>
                    </div>
                    <div class="flex items-center gap-3">
                        ${l.score > 0 ? `<span class="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">순도 ${l.score}%</span>` : ''}
                        <button onclick="app.deleteLog('${l.id}')" class="text-slate-200 hover:text-rose-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${REVIEW_DAYS.map((d, i) => `
                        <button onclick="app.toggleLogReview('${l.id}', ${i})" class="flex flex-col items-center gap-1.5 group">
                            <div class="w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${l.reviews && l.reviews[i] ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-100 bg-white text-slate-200 hover:text-slate-400'}">
                                <i data-lucide="check" class="w-4 h-4"></i>
                            </div>
                            <span class="text-[8px] font-bold ${l.reviews && l.reviews[i] ? 'text-indigo-500' : 'text-slate-300'}">${d}D</span>
                        </button>`).join('')}
                </div></div>`;
        }).join('');
    }

    checkReminders(state) {
        const now = new Date(); const [h, m] = (state.config.medTime || '08:00').split(':');
        const med = new Date(); med.setHours(h, m, 0); const diff = (now - med) / 3600000;
        this.elements.medicationAlert.classList.toggle('hidden', !(diff >= 0 && diff <= 4)); 
    }

    isTargetDate(b, d) { const t = new Date(); t.setHours(0,0,0,0); const r = new Date(b); r.setDate(r.getDate() + d); r.setHours(0,0,0,0); return t.getTime() === r.getTime(); }

    celebrate() { 
        for(let i=0; i<30; i++){ 
            const c = document.createElement('div'); c.className = 'confetti'; 
            c.style.left = Math.random() * 100 + 'vw'; c.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`; 
            c.style.width = Math.random() * 8 + 4 + 'px'; c.style.height = c.style.width; c.style.top = '-20px'; 
            document.body.appendChild(c); setTimeout(() => c.remove(), 3000); 
        } 
    }
}
