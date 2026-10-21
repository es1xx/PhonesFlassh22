/**
 * Модуль інтеграції з Telegram WebApp API.
 */
const tg = window.Telegram?.WebApp;

// Ініціалізація WebApp
if (tg) {
    tg.ready();
    tg.expand();
    // Налаштування кольору заголовка під тему
    if (tg.setHeaderColor) {
        tg.setHeaderColor('#0f172a');
    }
}

/**
 * Отримує Telegram initData для авторизації.
 * Якщо запускається у звичайному браузері (DEV_MODE), повертає порожній рядок.
 */
function getTelegramInitData() {
    return tg?.initData || '';
}

/**
 * Отримує об'єкт користувача з Telegram, якщо доступний.
 */
function getTelegramUser() {
    return tg?.initDataUnsafe?.user || null;
}

/**
 * Тактильний відгук (вібрація) для підтримки інтерфейсу в Telegram.
 */
function hapticFeedback(type = 'light') {
    if (tg?.HapticFeedback) {
        if (type === 'light' || type === 'medium' || type === 'heavy') {
            tg.HapticFeedback.impactOccurred(type);
        } else if (type === 'success' || type === 'error' || type === 'warning') {
            tg.HapticFeedback.notificationOccurred(type);
        }
    }
}
