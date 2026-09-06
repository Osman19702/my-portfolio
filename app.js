(function () {
    const tablist = document.querySelector(".controls");
    const tabs = [...document.querySelectorAll(".control")];
    const panelFor = (tab) => document.getElementById(tab.dataset.id);

    /**
     * Reveals one panel and marks its tab selected. Keeps the roving
     * tabindex in step: only the selected tab sits in the tab order, so
     * Tab moves past the whole tablist and the arrow keys move within it.
     */
    function select(tab, { moveFocus = false } = {}) {
        tabs.forEach((candidate) => {
            const isSelected = candidate === tab;
            candidate.classList.toggle("active-btn", isSelected);
            candidate.setAttribute("aria-selected", String(isSelected));
            candidate.tabIndex = isSelected ? 0 : -1;
            panelFor(candidate).classList.toggle("active", isSelected);
        });

        if (moveFocus) {
            tab.focus();
        }
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => select(tab));
    });

    // The tablist is vertical on desktop and horizontal on narrow screens,
    // so both axes are accepted.
    tablist.addEventListener("keydown", (event) => {
        const current = tabs.indexOf(document.activeElement);
        if (current === -1) {
            return;
        }

        const destinations = {
            ArrowUp: current - 1,
            ArrowLeft: current - 1,
            ArrowDown: current + 1,
            ArrowRight: current + 1,
            Home: 0,
            End: tabs.length - 1,
        };

        if (!(event.key in destinations)) {
            return;
        }

        event.preventDefault();
        const target = (destinations[event.key] + tabs.length) % tabs.length;
        select(tabs[target], { moveFocus: true });
    });

    /**
     * Theme. The class lives on <html>, not <body>, so the pre-paint script in
     * <head> can apply it before <body> exists and avoid a flash of the wrong
     * theme. That script handles the stored choice and the OS preference on
     * first visit; this only has to keep the button in step and remember an
     * explicit choice.
     */
    const themeBtn = document.querySelector(".theme-btn");
    const root = document.documentElement;

    function syncThemeButton() {
        const isLight = root.classList.contains("light-mode");
        themeBtn.setAttribute("aria-pressed", String(isLight));
        themeBtn.setAttribute(
            "aria-label",
            isLight ? "Switch to dark mode" : "Switch to light mode"
        );
    }

    syncThemeButton();

    themeBtn.addEventListener("click", () => {
        const isLight = root.classList.toggle("light-mode");
        try {
            localStorage.setItem("theme", isLight ? "light" : "dark");
        } catch (error) {
            // Private browsing or blocked storage: the toggle still works for
            // this visit, it just will not be remembered.
        }
        syncThemeButton();
    });

    // Follow the OS if the visitor has never chosen explicitly.
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (event) => {
        let stored = null;
        try {
            stored = localStorage.getItem("theme");
        } catch (error) {
            stored = null;
        }
        if (stored) {
            return;
        }
        root.classList.toggle("light-mode", event.matches);
        syncThemeButton();
    });

    /**
     * Contact details are stored split across data attributes so the served
     * HTML contains no address or number a harvester can pattern-match. They
     * are reassembled here into ordinary clickable links, so a recruiter still
     * reaches Osman in a single click.
     *
     * This stops scrapers that read raw HTML. It does not stop one that runs
     * JavaScript, and it is not meant to.
     */
    document.querySelectorAll("[data-contact]").forEach((holder) => {
        const kind = holder.dataset.contact;
        let href = "";
        let label = "";

        if (kind === "email") {
            label = `${holder.dataset.user}@${holder.dataset.domain}`;
            href = `mailto:${label}`;
        } else if (kind === "tel") {
            label = `+${holder.dataset.cc} ${holder.dataset.number}`;
            href = `tel:+${holder.dataset.cc}${holder.dataset.number.replace(/\s/g, "")}`;
        } else {
            return;
        }

        const link = document.createElement("a");
        link.href = href;
        link.className = "contact-link";
        link.textContent = label;

        holder.textContent = "";
        holder.appendChild(link);
    });
})();
