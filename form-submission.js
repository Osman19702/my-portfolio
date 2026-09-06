/**
 * Contact form: validation, spam guards, and submission to Web3Forms.
 *
 * GitHub Pages serves static files only, so there is no server to post to.
 * Web3Forms takes the POST and forwards it by email. The access key in the
 * markup is public by design; it names the destination inbox and grants
 * nothing else.
 */
(function () {
    const ENDPOINT = 'https://api.web3forms.com/submit';
    const KEY_PLACEHOLDER = 'WEB3FORMS_ACCESS_KEY_HERE';

    // A person cannot complete four fields this fast; a script can. Kept low so
    // that autofill plus a quick paste is never mistaken for a bot.
    const MIN_FILL_MS = 1200;

    const form = document.getElementById('contact-form');
    if (!form) {
        return;
    }

    const submitButton = document.getElementById('contact-submit');
    const honeypot = form.querySelector('[name="botcheck"]');
    const accessKey = form.querySelector('[name="access_key"]');
    const openedAt = Date.now();

    const validators = {
        name: (value) => (value.trim() ? '' : 'Please enter your name.'),
        email: (value) => {
            if (!value.trim()) return 'Please enter your email address.';
            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
                ? ''
                : 'That does not look like an email address.';
        },
        subject: (value) => (value.trim() ? '' : 'Please enter a subject.'),
        message: (value) => (value.trim().length >= 10
            ? ''
            : 'Please write a message of at least 10 characters.'),
    };

    const fields = Object.keys(validators)
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    function setFieldError(field, message) {
        const target = document.getElementById(`${field.id}-error`);
        if (target) {
            target.textContent = message;
        }
        field.setAttribute('aria-invalid', message ? 'true' : 'false');
        field.classList.toggle('is-invalid', Boolean(message));
    }

    /** Validates every field; returns the first invalid one, or null. */
    function validateAll() {
        let firstInvalid = null;
        fields.forEach((field) => {
            const message = validators[field.id](field.value);
            setFieldError(field, message);
            if (message && !firstInvalid) {
                firstInvalid = field;
            }
        });
        return firstInvalid;
    }

    fields.forEach((field) => {
        // Validate on blur, then live-correct once a field is already flagged,
        // so the error clears as soon as the visitor fixes it.
        field.addEventListener('blur', () => {
            setFieldError(field, validators[field.id](field.value));
        });
        field.addEventListener('input', () => {
            if (field.getAttribute('aria-invalid') === 'true') {
                setFieldError(field, validators[field.id](field.value));
            }
        });
    });

    function setBusy(isBusy) {
        submitButton.disabled = isBusy;
        submitButton.setAttribute('aria-busy', String(isBusy));
        submitButton.textContent = isBusy ? 'Sending...' : 'Submit Message';
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const firstInvalid = validateAll();
        if (firstInvalid) {
            firstInvalid.focus();
            window.showNotification('Please correct the highlighted fields.', 'error');
            return;
        }

        // Silently accept and drop anything that trips a spam guard: telling a
        // bot why it failed only helps it try again.
        if ((honeypot && honeypot.checked) || Date.now() - openedAt < MIN_FILL_MS) {
            form.reset();
            window.showNotification('Thanks - your message has been sent.', 'success');
            return;
        }

        if (!accessKey || accessKey.value === KEY_PLACEHOLDER || !accessKey.value.trim()) {
            window.showNotification(
                'The contact form is not configured yet. Please email me directly.',
                'error'
            );
            return;
        }

        setBusy(true);
        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form))),
            });
            const result = await response.json().catch(() => ({}));

            if (response.ok && result.success) {
                form.reset();
                fields.forEach((field) => setFieldError(field, ''));
                window.showNotification('Thanks - your message has been sent.', 'success');
            } else {
                window.showNotification(
                    result.message || 'Your message could not be sent. Please email me directly.',
                    'error'
                );
            }
        } catch (error) {
            window.showNotification(
                'Could not reach the mail service. Check your connection, or email me directly.',
                'error'
            );
        } finally {
            setBusy(false);
        }
    });
})();
