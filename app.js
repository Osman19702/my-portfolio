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

    const themeBtn = document.querySelector(".theme-btn");

    themeBtn.addEventListener("click", () => {
        const isLight = document.body.classList.toggle("light-mode");
        themeBtn.setAttribute("aria-pressed", String(isLight));
        themeBtn.setAttribute(
            "aria-label",
            isLight ? "Switch to dark mode" : "Switch to light mode"
        );
    });
})();
