// js/state.js

export class StateManager {
    constructor() {
        // 앱의 초기 상태 정의
        this.config = { totalGoal: 1000, medTime: '08:00', monthlyGoals: [], weeklyGoals: [] };
        this.tasks = { morning: [], afternoon: [], evening: [] };
        this.logs = [];
        this.textbooks = [];
        this.activeSlot = 'morning';
        
        // 데이터가 변경될 때마다 화면(UI)에 알려주기 위한 리스너 목록
        this.listeners = []; 
    }

    // 화면 갱신 함수를 등록하는 메서드
    subscribe(listener) {
        this.listeners.push(listener);
    }

    // 데이터가 바뀌었으니 화면을 다시 그리라고 알리는 메서드
    notify() {
        this.listeners.forEach(listener => listener(this));
    }

    // --- 상태 업데이트 메서드들 ---

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.notify(); // 설정이 바뀌면 화면 갱신
    }

    setTasks(tasks) {
        this.tasks = tasks;
        this.notify();
    }

    setLogs(logs) {
        // 최신순 정렬하여 저장
        this.logs = logs.sort((a, b) => b.createdAt - a.createdAt);
        this.notify();
    }

    setTextbooks(textbooks) {
        this.textbooks = textbooks;
        this.notify();
    }

    setActiveSlot(slot) {
        this.activeSlot = slot;
        this.notify();
    }
}
