/**
 * Toast notifications for the contact form.
 *
 * The container is a live region (role="status", aria-live="polite"), so
 * replacing its text is what announces the message to a screen reader. The
 * toast is hidden with visibility rather than opacity alone, so an invisible
 * box cannot sit over the page swallowing clicks.
 */
window.showNotification = (function () {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    let hideTimer = null;

    if (!notification || !text) {
        return function noop() {};
    }

    return function showNotification(message, type) {
        clearTimeout(hideTimer);

        text.textContent = message;
        notification.classList.remove('is-success', 'is-error');
        notification.classList.add(type === 'success' ? 'is-success' : 'is-error');
        notification.classList.add('show');

        // Errors need reading straight away; a success confirmation can wait
        // for a natural pause.
        notification.setAttribute('aria-live', type === 'success' ? 'polite' : 'assertive');

        hideTimer = setTimeout(() => {
            notification.classList.remove('show');
        }, type === 'success' ? 5000 : 8000);
    };
})();
