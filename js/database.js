// js/database.js

import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export class DatabaseService {
    constructor(appId, app) {
        this.db = getFirestore(app);
        this.appId = appId;
        this.uid = null;
    }

    setUserId(uid) {
        this.uid = uid;
    }

    // 서버 데이터를 실시간으로 가져와 StateManager에 업데이트
    syncData(stateManager) {
        if (!this.uid) return;

        const userDocBase = `artifacts/${this.appId}/users/${this.uid}`;

        // 1. 설정(Config) 동기화
        onSnapshot(doc(this.db, `${userDocBase}/config/main`), (docSnapshot) => {
            if (docSnapshot.exists()) stateManager.updateConfig(docSnapshot.data());
        });

        // 2. 일일 태스크 동기화
        onSnapshot(doc(this.db, `${userDocBase}/tasks/daily`), (docSnapshot) => {
            if (docSnapshot.exists()) stateManager.setTasks(docSnapshot.data());
        });

        // 3. 로그 동기화
        onSnapshot(collection(this.db, `${userDocBase}/logs`), (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            stateManager.setLogs(logs);
        });

        // 4. 교재 동기화
        onSnapshot(collection(this.db, `${userDocBase}/textbooks`), (snapshot) => {
            const textbooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            stateManager.setTextbooks(textbooks);
        });
    }

    // --- 데이터 저장/삭제 메서드들 ---

    async saveConfig(configData) {
        await setDoc(doc(this.db, `artifacts/${this.appId}/users/${this.uid}/config/main`), configData);
    }

    async saveTasks(tasksData) {
        await setDoc(doc(this.db, `artifacts/${this.appId}/users/${this.uid}/tasks/daily`), tasksData);
    }

    async saveLog(id, logData) {
        await setDoc(doc(this.db, `artifacts/${this.appId}/users/${this.uid}/logs/${id}`), logData);
    }

    async deleteLog(id) {
        await deleteDoc(doc(this.db, `artifacts/${this.appId}/users/${this.uid}/logs/${id}`));
    }

    async saveTextbook(id, textbookData) {
        await setDoc(doc(this.db, `artifacts/${this.appId}/users/${this.uid}/textbooks/${id}`), textbookData);
    }

    async deleteTextbook(id) {
        await deleteDoc(doc(this.db, `artifacts/${this.appId}/users/${this.uid}/textbooks/${id}`));
    }
}
