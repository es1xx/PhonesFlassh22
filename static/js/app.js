/**
 * Головний клієнтський скрипт гри Флешер
 * Реалістична симуляція прошивки (утримання кнопок, touch recovery, термінал, шанс збою)
 * Нижня мобільна навігація (Telegram Mini App Style)
 * Тримовність: UA / EN / RU.
 */

// Безпечний доступ до LocalStorage
function safeStorageGet(key, fallback = '') {
    try {
        return localStorage.getItem(key) || fallback;
    } catch (e) {
        return fallback;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {}
}

const i18n = {
    uk: {
        nav_collection: "Колекція",
        nav_shop: "Магазин",
        disclaimer: "Навчальний симулятор: реальна взаємодія з кнопками телефона, ризик збоїв, справжній термінал та жодних нудних галочок!",
        claim_title: "Отримання смартфона",
        claim_desc: "Випадкова картка однієї з 15 реальних моделей із реальними інструкціями.",
        btn_wait: "Зачекайте...",
        btn_claim: "📱 Отримати телефон",
        btn_ready: "Готово!",
        my_collection: "Моя колекція",
        filter_all: "Всі",
        filter_flashed: "Прошиті",
        filter_stock: "Не прошиті",
        shop_title: "Магазин телефонів",
        shop_desc: "Придбайте конкретну модель за віртуальні монети.",
        btn_buy: "Купити",
        btn_sell: "💰 Продати",
        btn_upgrade: "⬆️ +1",
        btn_flash: "⚡ Прошити",
        btn_flashed_guide: "✅ Тест-прошивка",
        badge_flashed: "✨ Прошито",
        badge_stock: "⚙️ Сток",
        sell_price_label: "Ціна продажу: ",
        upgrade_cost_label: "Покращення: ",
        shop_price_label: "Ціна: ",
        no_phones_found: "Телефонів не знайдено",
        no_phones_desc: "Отримайте перший телефон безкоштовно кнопкою вище або купіть у магазині!",
        confirm_sell: "Продати {name} за {price} монет?",
        confirm_clear: "Очистити всі телефони з вашої колекції?"
    },
    en: {
        nav_collection: "Collection",
        nav_shop: "Store",
        disclaimer: "Educational simulator: real hardware button combos, brick chances, and interactive terminal without boring checkboxes!",
        claim_title: "Claim Smartphone",
        claim_desc: "Random card from 15 real smartphone models with true-to-life boot modes.",
        btn_wait: "Please wait...",
        btn_claim: "📱 Claim Phone",
        btn_ready: "Ready!",
        my_collection: "My Collection",
        filter_all: "All",
        filter_flashed: "Flashed",
        filter_stock: "Stock",
        shop_title: "Smartphone Store",
        shop_desc: "Purchase any phone model directly with coins.",
        btn_buy: "Buy",
        btn_sell: "💰 Sell",
        btn_upgrade: "⬆️ +1",
        btn_flash: "⚡ Flash",
        btn_flashed_guide: "✅ Re-Flash Test",
        badge_flashed: "✨ Flashed",
        badge_stock: "⚙️ Stock",
        sell_price_label: "Sell price: ",
        upgrade_cost_label: "Upgrade: ",
        shop_price_label: "Price: ",
        no_phones_found: "No phones found",
        no_phones_desc: "Claim your first phone above or buy one from the shop!",
        confirm_sell: "Sell {name} for {price} coins?",
        confirm_clear: "Clear all phones from your collection?"
    },
    ru: {
        nav_collection: "Коллекция",
        nav_shop: "Магазин",
        disclaimer: "Обучающий симулятор: реальное удержание кнопок телефона, шанс сбоя и настоящий терминал без скучных галочек!",
        claim_title: "Получение смартфона",
        claim_desc: "Случайная карточка одной из 15 реальных моделей с настоящей логикой прошивки.",
        btn_wait: "Подождите...",
        btn_claim: "📱 Получить телефон",
        btn_ready: "Готово!",
        my_collection: "Моя коллекция",
        filter_all: "Все",
        filter_flashed: "Прошитые",
        filter_stock: "Не прошитые",
        shop_title: "Магазин телефонов",
        shop_desc: "Купите конкретную модель за виртуальные монеты.",
        btn_buy: "Купить",
        btn_sell: "💰 Продать",
        btn_upgrade: "⬆️ +1",
        btn_flash: "⚡ Прошить",
        btn_flashed_guide: "✅ Тест-прошивка",
        badge_flashed: "✨ Прошито",
        badge_stock: "⚙️ Сток",
        sell_price_label: "Цена продажи: ",
        upgrade_cost_label: "Улучшение: ",
        shop_price_label: "Цена: ",
        no_phones_found: "Телефонов не найдено",
        no_phones_desc: "Получите первый телефон бесплатно кнопкой выше или купите в магазине!",
        confirm_sell: "Продать {name} за {price} монет?",
        confirm_clear: "Очистить все телефоны из вашей коллекции?"
    }
};

let currentLang = safeStorageGet('app_lang', 'uk');
let currentUser = null;
let currentCollection = [];
let currentFilter = 'all';
let currentTab = 'collection';
let cooldownInterval = null;
let remainingSeconds = 0;

// Змінні симулятора воркшопу
let currentFlashingPhone = null;
let currentFlashingData = null;
let currentStage = 'idle'; // idle, holding, fastboot, download, dfu, recovery, sideloading, complete, failed
let holdTimer = null;
let holdSec = 0;

function t(key, vars = {}) {
    let str = i18n[currentLang]?.[key] || i18n['uk'][key] || key;
    for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, v);
    }
    return str;
}

function updateUiTexts() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && (i18n[currentLang]?.[key] || i18n['uk'][key])) {
            el.textContent = t(key);
        }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        const l = btn.getAttribute('data-lang');
        if (l === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    updateClaimButton();
    renderCollection();
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.borderColor = isError ? 'var(--danger-color)' : 'var(--button-color)';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function apiRequest(endpoint, options = {}) {
    const initData = typeof getTelegramInitData === 'function' ? getTelegramInitData() : '';
    const headers = {
        'Content-Type': 'application/json',
        ...(initData ? { 'X-Telegram-Init-Data': initData } : {}),
        ...(options.headers || {})
    };

    try {
        const response = await fetch(endpoint, { ...options, headers });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Помилка сервера (${response.status})`);
        }
        return await response.json();
    } catch (err) {
        console.warn('API fetch error:', err);
        throw err;
    }
}

async function loadUserProfile() {
    try {
        const user = await apiRequest('/api/user/me');
        currentUser = user;

        const usernameEl = document.getElementById('username-display');
        const balanceEl = document.getElementById('balance-display');
        const badgeEl = document.getElementById('app-mode-badge');

        if (usernameEl) usernameEl.textContent = user.username ? `@${user.username}` : (user.first_name || `ID: ${user.telegram_id}`);
        if (balanceEl) balanceEl.textContent = user.balance;
        if (badgeEl) badgeEl.textContent = user.app_mode || 'DEBUG';

        if (user.cooldown_remaining_seconds !== undefined) {
            startCooldownTimer(user.cooldown_remaining_seconds);
        }
    } catch (err) {
        console.error('Failed to load user profile:', err);
    }
}

function startCooldownTimer(seconds) {
    if (cooldownInterval) clearInterval(cooldownInterval);
    remainingSeconds = Math.max(0, Math.floor(seconds));
    updateClaimButton();

    if (remainingSeconds > 0) {
        cooldownInterval = setInterval(() => {
            remainingSeconds--;
            updateClaimButton();
            if (remainingSeconds <= 0) {
                clearInterval(cooldownInterval);
                updateClaimButton();
            }
        }, 1000);
    }
}

function updateClaimButton() {
    const btn = document.getElementById('btn-claim-phone');
    const timerDisplay = document.getElementById('cooldown-timer');
    if (!btn || !timerDisplay) return;

    if (remainingSeconds > 0) {
        btn.disabled = true;
        const h = Math.floor(remainingSeconds / 3600);
        const m = Math.floor((remainingSeconds % 3600) / 60);
        const s = remainingSeconds % 60;
        const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        timerDisplay.textContent = formatted;
        btn.textContent = `${t('btn_wait')} (${formatted})`;
    } else {
        btn.disabled = false;
        timerDisplay.textContent = '00:00:00';
        btn.textContent = t('btn_claim');
    }
}

async function loadCollection() {
    try {
        const list = await apiRequest('/api/collection');
        currentCollection = list;
        renderCollection();
    } catch (err) {
        console.error('Failed to load collection:', err);
    }
}

function renderCollection() {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filterTabs = document.querySelectorAll('.filter-tabs .tab-btn');
    const totalCount = currentCollection.length;
    const flashedCount = currentCollection.filter(i => i.flashed).length;
    const stockCount = totalCount - flashedCount;

    filterTabs.forEach(btn => {
        const f = btn.getAttribute('data-filter');
        if (f === 'all') btn.textContent = `${t('filter_all')} (${totalCount})`;
        if (f === 'flashed') btn.textContent = `${t('filter_flashed')} (${flashedCount})`;
        if (f === 'stock') btn.textContent = `${t('filter_stock')} (${stockCount})`;
    });

    const filtered = currentCollection.filter(item => {
        if (currentFilter === 'flashed') return item.flashed;
        if (currentFilter === 'stock') return !item.flashed;
        return true;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <h4>${t('no_phones_found')}</h4>
                <p>${t('no_phones_desc')}</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const card = createPhoneCard(item);
        grid.appendChild(card);
    });
}

function createPhoneCard(item) {
    const card = document.createElement('div');
    card.className = `phone-card rarity-${item.rarity}`;

    const top = document.createElement('div');
    top.className = 'phone-card-top';

    const emoji = document.createElement('span');
    emoji.className = 'phone-emoji';
    emoji.textContent = item.emoji;

    const info = document.createElement('div');
    info.className = 'phone-info';

    const name = document.createElement('h3');
    name.className = 'phone-name';
    name.textContent = item.name;

    const codename = document.createElement('span');
    codename.className = 'phone-codename';
    codename.textContent = item.codename;
    name.appendChild(codename);

    const badges = document.createElement('div');
    badges.className = 'phone-badges';

    const levelBadge = document.createElement('span');
    levelBadge.className = 'badge badge-level';
    levelBadge.textContent = `Рівень ${item.level}`;

    const statusBadge = document.createElement('span');
    statusBadge.className = item.flashed ? 'badge badge-flashed' : 'badge badge-stock';
    statusBadge.textContent = item.flashed ? t('badge_flashed') : t('badge_stock');

    badges.appendChild(levelBadge);
    badges.appendChild(statusBadge);

    info.appendChild(name);
    info.appendChild(badges);
    top.appendChild(emoji);
    top.appendChild(info);

    const pricing = document.createElement('div');
    pricing.className = 'phone-pricing';

    const sellPrice = document.createElement('div');
    sellPrice.className = 'price-item';
    sellPrice.textContent = t('sell_price_label');
    const sellPriceVal = document.createElement('span');
    sellPriceVal.className = 'price-val';
    sellPriceVal.textContent = `🪙 ${item.sell_price}`;
    sellPrice.appendChild(sellPriceVal);

    const upCost = document.createElement('div');
    upCost.className = 'price-item';
    upCost.textContent = t('upgrade_cost_label');
    const upCostVal = document.createElement('span');
    upCostVal.className = 'price-val';
    upCostVal.textContent = `🪙 ${item.upgrade_cost}`;
    upCost.appendChild(upCostVal);

    pricing.appendChild(sellPrice);
    pricing.appendChild(upCost);

    const actions = document.createElement('div');
    actions.className = 'phone-actions';

    const btnFlash = document.createElement('button');
    btnFlash.className = `btn btn-sm ${item.flashed ? 'btn-outline' : 'btn-primary'}`;
    btnFlash.textContent = item.flashed ? t('btn_flashed_guide') : t('btn_flash');
    btnFlash.addEventListener('click', () => openFlashingModal(item));

    const btnUpgrade = document.createElement('button');
    btnUpgrade.className = 'btn btn-sm btn-upgrade';
    btnUpgrade.textContent = t('btn_upgrade');
    btnUpgrade.addEventListener('click', async () => {
        try {
            const res = await apiRequest(`/api/phone/${item.id}/upgrade`, { method: 'POST' });
            showToast(res.message);
            hapticFeedback('success');
            await loadUserProfile();
            await loadCollection();
        } catch (err) {
            showToast(err.message, true);
        }
    });

    const btnSell = document.createElement('button');
    btnSell.className = 'btn btn-sm btn-sell';
    btnSell.textContent = t('btn_sell');
    btnSell.addEventListener('click', async () => {
        if (!confirm(t('confirm_sell', { name: item.name, price: item.sell_price }))) return;
        try {
            const res = await apiRequest(`/api/phone/${item.id}/sell`, { method: 'POST' });
            showToast(res.message);
            hapticFeedback('success');
            await loadUserProfile();
            await loadCollection();
        } catch (err) {
            showToast(err.message, true);
        }
    });

    actions.appendChild(btnFlash);
    actions.appendChild(btnUpgrade);
    actions.appendChild(btnSell);

    card.appendChild(top);
    card.appendChild(pricing);
    card.appendChild(actions);

    return card;
}

// =========================================================================
// СИМУЛЯТОР ПРОШИВКИ З УТРИМАННЯМ КНОПОК ТА TOUCH RECOVERY
// =========================================================================

async function openFlashingModal(userPhone) {
    currentFlashingPhone = userPhone;
    try {
        const data = await apiRequest(`/api/phone/${userPhone.id}/instructions`);
        currentFlashingData = data;
        currentStage = 'idle';

        const emojiEl = document.getElementById('modal-phone-emoji');
        const nameEl = document.getElementById('modal-phone-name');
        if (emojiEl) emojiEl.textContent = data.emoji;
        if (nameEl) nameEl.textContent = `${data.name} (${data.codename})`;

        const modal = document.getElementById('flash-modal');
        if (modal) modal.classList.remove('hidden');

        updateWorkbenchView();
        hapticFeedback('medium');
    } catch (err) {
        showToast(err.message, true);
    }
}

function updateWorkbenchView() {
    const screenEl = document.getElementById('phone-screen');
    const iconEl = document.getElementById('screen-status-icon');
    const titleEl = document.getElementById('screen-status-title');
    const descEl = document.getElementById('screen-status-desc');
    const recoveryMenu = document.getElementById('screen-recovery-menu');
    const progressWrap = document.getElementById('screen-progress-wrap');
    const termLogs = document.getElementById('modal-terminal-logs');
    const stageCounter = document.getElementById('modal-stage-counter');
    const btnFinish = document.getElementById('btn-modal-finish');
    const hintEl = document.getElementById('control-hint');

    // Кнопки дій
    const btnHold = document.getElementById('btn-hold-combination');
    const btnFlashRecovery = document.getElementById('btn-action-flash-recovery');
    const btnPalera1n = document.getElementById('btn-action-palera1n');
    const btnUnbrick = document.getElementById('btn-action-unbrick');

    if (!screenEl || !currentFlashingData) return;

    screenEl.className = 'phone-mockup-screen';
    if (recoveryMenu) recoveryMenu.classList.add('hidden');
    if (progressWrap) progressWrap.classList.add('hidden');
    if (btnFinish) btnFinish.disabled = true;

    btnHold.classList.add('hidden');
    btnFlashRecovery.classList.add('hidden');
    btnPalera1n.classList.add('hidden');
    btnUnbrick.classList.add('hidden');

    const brand = currentFlashingData.brand.toLowerCase();
    const mockupEl = document.querySelector('.phone-mockup');
    if (mockupEl) {
        mockupEl.className = 'phone-mockup';
        const model = currentFlashingData.name.toLowerCase();
        if (brand.includes('apple')) {
            if (model.includes('7') || model.includes('8') || model.includes('se')) {
                mockupEl.classList.add('chassis-iphone-classic');
            }
        } else if (brand.includes('nothing')) {
            mockupEl.classList.add('chassis-nothing-glyph');
        } else if (brand.includes('google') || brand.includes('pixel')) {
            mockupEl.classList.add('chassis-pixel-visor');
        } else if (brand.includes('samsung')) {
            mockupEl.classList.add('chassis-samsung-curved');
        }
    }

    if (currentStage === 'idle') {
        screenEl.classList.add('state-stock');
        iconEl.textContent = '📱';
        titleEl.textContent = 'Stock OS';
        descEl.textContent = brand.includes('apple') ? 'Lightning підключено. Затисніть кнопки збоку на 4 сек' : 'USB підключено. Затисніть кнопки збоку на 3 сек';
        btnHold.classList.remove('hidden');
        if (stageCounter) stageCounter.textContent = 'РЕЖИМ: READY';
        if (termLogs) termLogs.textContent = brand.includes('apple') ? `$ ideviceinfo\nUSBMux: iPhone detected in normal mode\nГотово до переходу в DFU...` : `$ adb devices\ndevice_attached    device\nОчікування входу в режим завантажувача...`;
        if (hintEl) hintEl.textContent = brand.includes('apple') ? 'Затисніть Power + Vol Down на 4 секунди для DFU' : 'Затисніть кнопку Power + Vol Down на 3 секунди';
    } else if (currentStage === 'holding') {
        screenEl.classList.add('state-stock');
        iconEl.textContent = '⏳';
        titleEl.textContent = `Утримання... ${holdSec}s`;
        descEl.textContent = 'Не відпускайте завчасно!';
        btnHold.classList.remove('hidden');
    } else if (currentStage === 'fastboot') {
        screenEl.classList.add('state-fastboot');
        iconEl.textContent = '🤖';
        titleEl.textContent = 'FASTBOOT MODE';
        descEl.textContent = `PRODUCT: ${currentFlashingData.codename} • UNLOCKED`;
        btnFlashRecovery.classList.remove('hidden');
        if (stageCounter) stageCounter.textContent = 'РЕЖИМ: FASTBOOT';
        if (termLogs) termLogs.textContent += `\n$ fastboot devices\n${currentFlashingData.codename}    fastboot\nГотово до прошивки Recovery!`;
        if (hintEl) hintEl.textContent = 'Натисніть "fastboot flash recovery"';
    } else if (currentStage === 'download') {
        screenEl.classList.add('state-download');
        iconEl.textContent = '📥';
        titleEl.textContent = 'DOWNLOADING...';
        descEl.textContent = 'Do not turn off target!!';
        btnFlashRecovery.classList.remove('hidden');
        if (stageCounter) stageCounter.textContent = 'РЕЖИМ: ODIN DOWNLOAD';
        if (termLogs) termLogs.textContent += `\nHeimdall: Samsung Galaxy S10 detected in Download Mode!`;
        if (hintEl) hintEl.textContent = 'Прошийте recovery через heimdall flash';
    } else if (currentStage === 'dfu') {
        screenEl.classList.add('state-dfu');
        iconEl.textContent = '⬛';
        titleEl.textContent = 'APPLE DFU MODE';
        descEl.textContent = 'PITCH BLACK SCREEN (checkm8)';
        btnPalera1n.classList.remove('hidden');
        if (stageCounter) stageCounter.textContent = 'РЕЖИМ: DFU';
        if (termLogs) termLogs.textContent += `\n$ palera1n --dfuhelper\n[+] Success: Device entered DFU Mode!\n[+] Found checkm8 vulnerable device!`;
        if (hintEl) hintEl.textContent = 'Запустіть palera1n для джейлбрейку';
    } else if (currentStage === 'recovery') {
        screenEl.classList.add('state-recovery');
        iconEl.textContent = '⚙️';
        titleEl.textContent = 'Lineage Recovery 21';
        descEl.textContent = 'Натискайте пункти прямо на екрані';
        if (recoveryMenu) recoveryMenu.classList.remove('hidden');
        if (stageCounter) stageCounter.textContent = 'РЕЖИМ: RECOVERY';
        if (hintEl) hintEl.textContent = 'Натисніть "Apply from ADB (Sideload)"';
    } else if (currentStage === 'sideloading') {
        screenEl.classList.add('state-sideload');
        iconEl.textContent = '⚡';
        titleEl.textContent = 'ADB SIDELOAD';
        descEl.textContent = 'Запис системних образів... (Не вимикайте!)';
        if (progressWrap) progressWrap.classList.remove('hidden');
        if (stageCounter) stageCounter.textContent = 'РЕЖИМ: SIDELOAD';
    } else if (currentStage === 'complete') {
        screenEl.classList.add('state-booting');
        const isApple = brand.includes('apple');
        iconEl.textContent = isApple ? '' : '✨';
        titleEl.textContent = isApple ? 'Palera1n (Sileo/Zebra)' : 'Custom ROM';
        descEl.textContent = isApple ? 'Джейлбрейк успішний! Sileo встановлено.' : 'Успішно встановлено та протестовано!';
        if (btnFinish) btnFinish.disabled = false;
        if (stageCounter) stageCounter.textContent = 'СТАТУС: ПРОШИТО';
        if (hintEl) hintEl.textContent = 'Прошивку завершено! Натисніть кнопку внизу';
    } else if (currentStage === 'hardbrick') {
        screenEl.classList.add('state-hardbrick');
        const isApple = brand.includes('apple');
        iconEl.textContent = '💀';
        titleEl.textContent = isApple ? 'APPLE DFU RESTORE' : 'QUALCOMM CRASHDUMP';
        descEl.textContent = isApple ? 'Збій NAND! Потрібне відновлення через iTunes/Finder' : 'EDL 9008 аварійне відновлення';
        btnUnbrick.classList.remove('hidden');
        if (stageCounter) stageCounter.textContent = 'CRITICAL: HARD BRICK';
        if (termLogs) termLogs.textContent += isApple ? `\n[FATAL] Bus reset during AP Ticket validation!\n[DFU RESTORE REQUIRED]` : `\n[FATAL] Power cut during sparse chunk write!\nQualcomm HS-USB QDLoader 9008 activated.`;
        if (hintEl) hintEl.textContent = 'Натисніть "Відновити збій / Unbrick"';
    } else if (currentStage === 'failed') {
        screenEl.classList.add('state-dfu');
        iconEl.textContent = '❌';
        titleEl.textContent = 'ERROR / BRICK';
        descEl.textContent = 'Збій підпису розділу Recovery!';
        btnUnbrick.classList.remove('hidden');
        if (stageCounter) stageCounter.textContent = 'ЗБІЙ: RECOVERY ERROR';
        if (termLogs) termLogs.textContent += `\nFAILED (remote: partition table signature error)\n⚠️ Потрібне відновлення!`;
        if (hintEl) hintEl.textContent = 'Натисніть кнопку "Відновити збій / Unbrick"';
    }
}

function startHoldingKey() {
    if (currentStage !== 'idle') return;
    currentStage = 'holding';
    holdSec = 0;
    updateWorkbenchView();
    hapticFeedback('medium');

    holdTimer = setInterval(() => {
        holdSec++;
        updateWorkbenchView();
        hapticFeedback('light');

        const brand = currentFlashingData.brand.toLowerCase();

        if (brand.includes('apple') && holdSec >= 4) {
            clearInterval(holdTimer);
            currentStage = 'dfu';
            updateWorkbenchView();
            hapticFeedback('success');
        } else if (brand.includes('samsung') && holdSec >= 3) {
            clearInterval(holdTimer);
            currentStage = 'download';
            updateWorkbenchView();
            hapticFeedback('success');
        } else if (holdSec >= 3) {
            clearInterval(holdTimer);
            currentStage = 'fastboot';
            updateWorkbenchView();
            hapticFeedback('success');
        }
    }, 1000);
}

function stopHoldingKey() {
    if (holdTimer) clearInterval(holdTimer);
    if (currentStage === 'holding') {
        currentStage = 'idle';
        updateWorkbenchView();
        showToast('⚠️ Відпущено завчасно! Тримайте 3-4 секунди.', true);
        hapticFeedback('error');
    }
}

function setupFlashingWorkbenchEvents() {
    const btnHold = document.getElementById('btn-hold-combination');
    const keyPower = document.getElementById('btn-mockup-power');
    const keyVolDown = document.getElementById('btn-mockup-voldown');

    [btnHold, keyPower, keyVolDown].forEach(el => {
        if (!el) return;
        el.addEventListener('mousedown', startHoldingKey);
        el.addEventListener('mouseup', stopHoldingKey);
        el.addEventListener('touchstart', startHoldingKey);
        el.addEventListener('touchend', stopHoldingKey);
    });

    const btnFlashRecovery = document.getElementById('btn-action-flash-recovery');
    if (btnFlashRecovery) {
        btnFlashRecovery.addEventListener('click', () => {
            const termLogs = document.getElementById('modal-terminal-logs');
            if (termLogs) termLogs.textContent += `\n$ fastboot flash recovery recovery.img\nWriting recovery block...`;

            setTimeout(() => {
                // 15% шанс збою
                if (Math.random() < 0.15) {
                    currentStage = 'failed';
                    updateWorkbenchView();
                    hapticFeedback('error');
                } else {
                    currentStage = 'recovery';
                    updateWorkbenchView();
                    hapticFeedback('success');
                    if (termLogs) termLogs.textContent += `\nOKAY [0.420s]\nRebooting into Lineage Recovery...`;
                }
            }, 600);
        });
    }

    const btnPalera1n = document.getElementById('btn-action-palera1n');
    if (btnPalera1n) {
        btnPalera1n.addEventListener('click', () => {
            const termLogs = document.getElementById('modal-terminal-logs');
            if (termLogs) termLogs.textContent += `\n$ palera1n -l\n[+] checkm8 injected!\n[+] Booting PongoOS kernel...\n[+] Rootless jailbreak active!`;
            setTimeout(() => {
                currentStage = 'complete';
                updateWorkbenchView();
                hapticFeedback('success');
            }, 1200);
        });
    }

    const btnUnbrick = document.getElementById('btn-action-unbrick');
    if (btnUnbrick) {
        btnUnbrick.addEventListener('click', () => {
            const isApple = currentFlashingData && currentFlashingData.brand.toLowerCase().includes('apple');
            const termLogs = document.getElementById('modal-terminal-logs');
            if (isApple) {
                if (termLogs) termLogs.textContent += `\n$ idevicerestore -e -y\n[+] Restoring IPSW via Apple Recovery Protocol...\n[+] NAND flash restored!`;
                setTimeout(() => {
                    currentStage = 'idle';
                    updateWorkbenchView();
                    showToast('🛠️ iPhone успішно відновлено через DFU Restore!');
                    hapticFeedback('success');
                }, 900);
            } else {
                if (termLogs) termLogs.textContent += `\n$ qdl prog_firehose_lite.elf rawprogram0.xml patch0.xml\nEmergency EDL 9008 Flash... OKAY!`;
                setTimeout(() => {
                    currentStage = 'fastboot';
                    updateWorkbenchView();
                    showToast('🛠️ Телефон успішно відновлено через EDL 9008!');
                    hapticFeedback('success');
                }, 700);
            }
        });
    }

    if (keyPower) {
        keyPower.addEventListener('click', () => {
            if (currentStage === 'sideloading') {
                currentStage = 'hardbrick';
                updateWorkbenchView();
                showToast('🚨 КРИТИЧНИЙ ЗБІЙ: Живлення вимкнено під час прошивки! Спрацював захист.', true);
                hapticFeedback('error');
            }
        });
    }

    // Сенсорне меню Recovery на екрані
    const btnScreenSideload = document.getElementById('btn-screen-sideload');
    const btnScreenWipe = document.getElementById('btn-screen-wipe');

    if (btnScreenWipe) {
        btnScreenWipe.addEventListener('click', () => {
            const termLogs = document.getElementById('modal-terminal-logs');
            if (termLogs) termLogs.textContent += `\n[Recovery] Formatting /data partition... Done.`;
            showToast('✅ Data відформатовано!');
            hapticFeedback('light');
        });
    }

    if (btnScreenSideload) {
        btnScreenSideload.addEventListener('click', () => {
            currentStage = 'sideloading';
            updateWorkbenchView();
            const termLogs = document.getElementById('modal-terminal-logs');
            if (termLogs) termLogs.textContent += `\n$ adb -d sideload rom-package.zip\nserving: rom-package.zip (~47%)\nTotal xfer: 1.00x\nadb: failed to read command: Success (Normal finish)`;

            setTimeout(() => {
                if (currentStage === 'sideloading') {
                    currentStage = 'complete';
                    updateWorkbenchView();
                    hapticFeedback('success');
                }
            }, 1800);
        });
    }

    // Завершити прошивку
    const btnFinish = document.getElementById('btn-modal-finish');
    if (btnFinish) {
        btnFinish.addEventListener('click', async () => {
            try {
                const res = await apiRequest(`/api/phone/${currentFlashingPhone.id}/complete-flash`, { method: 'POST' });
                showToast(res.message);
                hapticFeedback('success');
                closeFlashingModal();
                await loadUserProfile();
                await loadCollection();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }

    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-modal-cancel');
    if (btnClose) btnClose.addEventListener('click', closeFlashingModal);
    if (btnCancel) btnCancel.addEventListener('click', closeFlashingModal);
}

function closeFlashingModal() {
    const modal = document.getElementById('flash-modal');
    if (modal) modal.classList.add('hidden');
    currentFlashingPhone = null;
    currentFlashingData = null;
    currentStage = 'idle';
    loadCollection();
}

// --- НАВІГАЦІЯ ТА ВКЛАДКИ ---

function setupNavigation() {
    const views = {
        collection: document.getElementById('collection-view'),
        shop: document.getElementById('shop-view'),
        admin: document.getElementById('admin-view'),
        settings: document.getElementById('settings-view')
    };

    const bnavButtons = {
        collection: document.getElementById('bnav-btn-collection'),
        shop: document.getElementById('bnav-btn-shop'),
        admin: document.getElementById('bnav-btn-admin'),
        settings: document.getElementById('bnav-btn-settings')
    };

    const claimSection = document.getElementById('claim-section');

    function switchTab(tab) {
        currentTab = tab;
        Object.keys(views).forEach(k => {
            if (views[k]) {
                if (k === tab) views[k].classList.remove('hidden');
                else views[k].classList.add('hidden');
            }
        });

        Object.keys(bnavButtons).forEach(k => {
            if (bnavButtons[k]) {
                if (k === tab) bnavButtons[k].classList.add('active');
                else bnavButtons[k].classList.remove('active');
            }
        });

        if (claimSection) {
            if (tab === 'collection') claimSection.classList.remove('hidden');
            else claimSection.classList.add('hidden');
        }

        if (tab === 'shop') loadShop();
        if (tab === 'admin') loadAdminStats();
        hapticFeedback('light');
    }

    Object.keys(bnavButtons).forEach(tab => {
        if (bnavButtons[tab]) {
            bnavButtons[tab].addEventListener('click', () => switchTab(tab));
        }
    });

    // Фільтри карток
    document.querySelectorAll('.filter-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter') || 'all';
            renderCollection();
            hapticFeedback('light');
        });
    });

    // Мовні кнопки
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLang = btn.getAttribute('data-lang') || 'uk';
            safeStorageSet('app_lang', currentLang);
            updateUiTexts();
            hapticFeedback('light');
        });
    });

    // Кнопка клейму
    const btnClaim = document.getElementById('btn-claim-phone');
    if (btnClaim) {
        btnClaim.addEventListener('click', async () => {
            try {
                btnClaim.disabled = true;
                const res = await apiRequest('/api/claim-phone', { method: 'POST' });
                showToast(res.message);
                hapticFeedback('success');
                await loadUserProfile();
                await loadCollection();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }

    // Розсилка в адмінці
    const btnBroadcast = document.getElementById('btn-admin-broadcast');
    const inputBroadcast = document.getElementById('admin-broadcast-input');
    if (btnBroadcast && inputBroadcast) {
        btnBroadcast.addEventListener('click', async () => {
            const text = inputBroadcast.value.trim();
            if (!text) return;
            try {
                const res = await apiRequest('/api/admin/broadcast', {
                    method: 'POST',
                    body: JSON.stringify({ message: text })
                });
                showToast(res.message);
                inputBroadcast.value = '';
                hapticFeedback('success');
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }

    // Dev buttons
    const btnResetCooldown = document.getElementById('btn-dev-cooldown');
    if (btnResetCooldown) {
        btnResetCooldown.addEventListener('click', async () => {
            try {
                const res = await apiRequest('/api/dev/reset-cooldown', { method: 'POST' });
                showToast(res.message || 'Кулдаун скинуто');
                hapticFeedback('success');
                await loadUserProfile();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }

    const btnAddCoins = document.getElementById('btn-dev-coins');
    if (btnAddCoins) {
        btnAddCoins.addEventListener('click', async () => {
            try {
                const res = await apiRequest('/api/dev/add-coins', { method: 'POST' });
                showToast(res.message || '+1000 монет');
                hapticFeedback('success');
                await loadUserProfile();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }

    const btnFlashAll = document.getElementById('btn-dev-flash-all');
    if (btnFlashAll) {
        btnFlashAll.addEventListener('click', async () => {
            try {
                const res = await apiRequest('/api/dev/flash-all', { method: 'POST' });
                showToast(res.message);
                hapticFeedback('success');
                await loadUserProfile();
                await loadCollection();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }

    const btnClearCollection = document.getElementById('btn-dev-clear');
    if (btnClearCollection) {
        btnClearCollection.addEventListener('click', async () => {
            if (!confirm(t('confirm_clear'))) return;
            try {
                const res = await apiRequest('/api/dev/clear-collection', { method: 'POST' });
                showToast(res.message || 'Колекцію очищено');
                hapticFeedback('warning');
                await loadCollection();
            } catch (err) {
                showToast(err.message, true);
            }
        });
    }
}

async function loadAdminStats() {
    try {
        const stats = await apiRequest('/api/admin/stats');
        const u = document.getElementById('admin-stat-users');
        const c = document.getElementById('admin-stat-cards');
        const f = document.getElementById('admin-stat-flashed');
        const coins = document.getElementById('admin-stat-coins');
        if (u) u.textContent = stats.users_count;
        if (c) c.textContent = stats.cards_count;
        if (f) f.textContent = stats.flashed_count;
        if (coins) coins.textContent = stats.total_coins;
    } catch (e) {
        console.warn('Admin stats note:', e);
    }
}

async function loadShop() {
    try {
        const items = await apiRequest('/api/shop');
        const grid = document.getElementById('shop-grid');
        if (!grid) return;
        grid.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = `phone-card rarity-${item.rarity}`;

            const top = document.createElement('div');
            top.className = 'phone-card-top';

            const emoji = document.createElement('span');
            emoji.className = 'phone-emoji';
            emoji.textContent = item.emoji;

            const info = document.createElement('div');
            info.className = 'phone-info';

            const name = document.createElement('h3');
            name.className = 'phone-name';
            name.textContent = item.name;

            const codename = document.createElement('span');
            codename.className = 'phone-codename';
            codename.textContent = item.codename;
            name.appendChild(codename);

            const badges = document.createElement('div');
            badges.className = 'phone-badges';

            const brandBadge = document.createElement('span');
            brandBadge.className = 'badge badge-level';
            brandBadge.textContent = item.brand;
            badges.appendChild(brandBadge);

            info.appendChild(name);
            info.appendChild(badges);
            top.appendChild(emoji);
            top.appendChild(info);

            const pricing = document.createElement('div');
            pricing.className = 'phone-pricing';

            const priceItem = document.createElement('div');
            priceItem.className = 'price-item';
            priceItem.textContent = t('shop_price_label');
            const priceVal = document.createElement('span');
            priceVal.className = 'price-val';
            priceVal.textContent = `🪙 ${item.price}`;
            priceItem.appendChild(priceVal);

            const btnBuy = document.createElement('button');
            btnBuy.className = 'btn btn-sm btn-primary';
            btnBuy.textContent = t('btn_buy');
            btnBuy.addEventListener('click', async () => {
                try {
                    const res = await apiRequest(`/api/shop/buy/${item.id}`, { method: 'POST' });
                    showToast(res.message);
                    hapticFeedback('success');
                    await loadUserProfile();
                    await loadCollection();
                } catch (err) {
                    showToast(err.message, true);
                }
            });

            pricing.appendChild(priceItem);
            pricing.appendChild(btnBuy);
            card.appendChild(top);
            card.appendChild(pricing);
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load shop:', err);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    setupFlashingWorkbenchEvents();
    updateUiTexts();
    await loadUserProfile();
    await loadCollection();
});
