/**
 * Escape from Tarkov - Торговцы и репутация
 * Интерактивные задания для повышения репутации
 */

// ========== КОНСТАНТЫ ==========
const MAX_REP = 6.00;
const REP_BONUS = 0.05;

// Данные о торговцах (9 персонажей из Escape from Tarkov)
const TRADERS_DATA = [
    { id: "prapor", name: "Prapor", baseRep: 0.75, questDesc: "Доставка: найти 2 пачки патронов и вернуть склад" },
    { id: "therapist", name: "Therapist", baseRep: 1.25, questDesc: "Лекарства для фельдшера: собрать аптечку и бинты" },
    { id: "fence", name: "Fence", baseRep: 3.10, questDesc: "Секретная сумка: найти утерянный чёрный ящик" },
    { id: "skier", name: "Skier", baseRep: 1.30, questDesc: "Контрабанда: передать USB-флешку на таможне" },
    { id: "peacekeeper", name: "Peacekeeper", baseRep: 0.70, questDesc: "Дипломатический груз: сопроводить конвой" },
    { id: "mechanic", name: "Mechanic", baseRep: 1.30, questDesc: "Гаражные испытания: починить деталь двигателя" },
    { id: "ragman", name: "Ragman", baseRep: 0.80, questDesc: "Потерянный груз: найти три бронежилета" },
    { id: "jaeger", name: "Jaeger", baseRep: 0.45, questDesc: "Выживание в лесу: убить кабана и принести шкуру" },
    { id: "ref", name: "Ref", baseRep: 0.20, questDesc: "Складские остатки: найти редкий инструмент" }
];

// ========== КЛАСС ДЛЯ УПРАВЛЕНИЯ СОСТОЯНИЕМ ТОРГОВЦЕВ ==========
class TradersStateManager {
    constructor() {
        this.state = this.loadState();
    }

    // Загрузка состояния из localStorage
    loadState() {
        const saved = localStorage.getItem("eft_traders_rep_state");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Валидация и инициализация недостающих полей
                for (const trader of TRADERS_DATA) {
                    if (!parsed[trader.id] || typeof parsed[trader.id].rep !== "number") {
                        parsed[trader.id] = { rep: trader.baseRep, completedQuests: [] };
                    }
                    if (!parsed[trader.id].completedQuests) {
                        parsed[trader.id].completedQuests = [];
                    }
                    // Корректировка репутации, если она превышает максимум
                    if (parsed[trader.id].rep > MAX_REP) {
                        parsed[trader.id].rep = MAX_REP;
                    }
                }
                return parsed;
            } catch (e) {
                console.warn("Ошибка парсинга localStorage:", e);
            }
        }
        return this.getInitialState();
    }

    // Начальное состояние
    getInitialState() {
        const initialState = {};
        TRADERS_DATA.forEach(trader => {
            initialState[trader.id] = {
                rep: trader.baseRep,
                completedQuests: []
            };
        });
        return initialState;
    }

    // Сохранение состояния в localStorage
    saveState() {
        localStorage.setItem("eft_traders_rep_state", JSON.stringify(this.state));
    }

    // Получить репутацию торговца
    getRep(traderId) {
        return this.state[traderId]?.rep ?? 0;
    }

    // Получить количество выполненных заданий
    getQuestsCount(traderId) {
        return this.state[traderId]?.completedQuests?.length ?? 0;
    }

    // Проверить, можно ли добавить репутацию
    canAddRep(traderId) {
        const currentRep = this.getRep(traderId);
        return currentRep + REP_BONUS <= MAX_REP + 0.001;
    }

    // Выполнить задание для торговца
    completeQuest(traderId) {
        const traderState = this.state[traderId];
        if (!traderState) return false;

        if (!this.canAddRep(traderId)) {
            return false;
        }

        // Повышаем репутацию
        let newRep = traderState.rep + REP_BONUS;
        newRep = Math.min(Math.round(newRep * 100) / 100, MAX_REP);
        traderState.rep = newRep;

        // Добавляем запись о выполненном задании
        const questRecord = {
            timestamp: Date.now(),
            added: REP_BONUS
        };
        traderState.completedQuests.push(questRecord);

        this.saveState();
        return true;
    }

    // Сброс всех торговцев
    resetAll() {
        this.state = this.getInitialState();
        this.saveState();
    }

    // Получить остаток до максимальной репутации
    getRemainingToMax(traderId) {
        const current = this.getRep(traderId);
        return (MAX_REP - current).toFixed(2);
    }

    // Проверить, достигнут ли максимум
    isMaxRep(traderId) {
        return this.getRep(traderId) >= MAX_REP - 0.001;
    }
}

// ========== КЛАСС ДЛЯ ОТОБРАЖЕНИЯ UI ==========
class TradersUI {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.gridContainer = document.getElementById('tradersGrid');
        this.resetBtn = document.getElementById('resetAllBtn');
        this.init();
    }

    init() {
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.handleReset());
        }
        this.renderAll();
    }

    // Показать уведомление
    showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        if (isError) {
            toast.style.borderColor = '#ff6b6b';
            toast.style.color = '#ffb3b3';
        }
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    // Обработчик сброса
    handleReset() {
        const confirmReset = confirm("Сбросить репутацию и историю заданий для ВСЕХ торговцев?");
        if (!confirmReset) return;

        this.stateManager.resetAll();
        this.renderAll();
        this.showToast("🔄 Все торговцы возвращены к исходной репутации");
    }

    // Обработчик выполнения задания
    handleCompleteQuest(traderId, traderName) {
        const success = this.stateManager.completeQuest(traderId);
        if (success) {
            this.renderSingleTrader(traderId);
            this.showToast(`✅ Задание выполнено! +${REP_BONUS} репутации у ${traderName}`);
        } else {
            this.showToast(`⚠️ У ${traderName} максимальная репутация (${MAX_REP.toFixed(2)})`, true);
        }
    }

    // Рендер одного торговца
    renderSingleTrader(traderId) {
        const cardElement = document.getElementById(`card-${traderId}`);
        if (!cardElement) return;

        const trader = TRADERS_DATA.find(t => t.id === traderId);
        if (!trader) return;

        const rep = this.stateManager.getRep(traderId);
        const questsCount = this.stateManager.getQuestsCount(traderId);
        const remainingToMax = this.stateManager.getRemainingToMax(traderId);
        const isMax = this.stateManager.isMaxRep(traderId);

        // Обновляем содержимое карточки
        cardElement.innerHTML = `
            <div class="trader-card__header">
                <div class="trader-card__name">${trader.name}</div>
                <div class="reputation-badge">
                    <span>⭐ репутация</span>
                    <span class="reputation-badge__value">${rep.toFixed(2)}</span>
                    <span class="reputation-badge__max">/ ${MAX_REP.toFixed(2)}</span>
                </div>
            </div>
            <div class="quest-section">
                <div class="quest-text">
                    📜 <strong>Задание:</strong> ${trader.questDesc}
                </div>
                <div class="quest-reward">
                    <span>🏆 награда:</span>
                    <span class="quest-reward__value">+${REP_BONUS.toFixed(2)} репутации</span>
                </div>
                <button class="complete-btn" data-trader-id="${trader.id}" ${isMax ? 'disabled' : ''}>
                    ✅ Выполнить задание
                </button>
                <div class="quest-status ${isMax ? 'quest-status--completed' : ''}">
                    ${isMax ? '🏅 МАКСИМАЛЬНАЯ РЕПУТАЦИЯ' : `📌 Выполнено заданий: ${questsCount} | до макс: +${remainingToMax}`}
                </div>
            </div>
        `;

        // Навешиваем обработчик на кнопку
        const button = cardElement.querySelector('.complete-btn');
        if (button && !button.disabled) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const traderIdFromBtn = button.getAttribute('data-trader-id');
                this.handleCompleteQuest(traderIdFromBtn, trader.name);
            });
        }
    }

    // Рендер всех торговцев
    renderAll() {
        if (!this.gridContainer) return;

        this.gridContainer.innerHTML = '';
        
        TRADERS_DATA.forEach(trader => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'trader-card';
            cardDiv.id = `card-${trader.id}`;
            this.gridContainer.appendChild(cardDiv);
            this.renderSingleTrader(trader.id);
        });
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    const stateManager = new TradersStateManager();
    const ui = new TradersUI(stateManager);
    console.log('Приложение Tarkov Trader Reputation запущено');
});