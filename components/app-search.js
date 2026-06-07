<<<<<<< HEAD
(function initAppSearchModule() {
=======
(function initGravepediaSearch() {
>>>>>>> ec6052d3872e0fbec1db9610b4257e17cb502462
    if (window.AppSearch) {
        return;
    }

<<<<<<< HEAD
    const APP_SEARCH_STYLE_ID = 'app-search-styles';
    const APP_SEARCH_DROPDOWN_LIMIT = 6;

    function resolveAppSearchScriptUrl() {
        const script = document.currentScript || document.querySelector('script[src*="app-search.js"]');
        if (script?.src) {
            return script.src;
        }

        const pathname = window.location.pathname.replace(/\\/g, '/');
        if (pathname.includes('/pages/') || pathname.match(/\/people\/[^/]+\//)) {
            return new URL('../components/app-search.js', window.location.href).href;
        }

        return new URL('components/app-search.js', window.location.href).href;
    }

    const PEOPLE_REGISTRY_SCRIPT_URL = new URL('../lib/people-registry.js', resolveAppSearchScriptUrl()).href;

    function getAppName() {
        const name = window.App?.getName?.() || window.App?.Name;
        return (typeof name === 'string' && name.trim()) ? name.trim() : '';
    }

    const APP_SEARCH_STYLES = String.raw`
.app-search-anchor {
  position: relative;
}

.app-search__dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 1200;
  margin: 0;
  padding: 0.35rem 0;
  list-style: none;
  border: 1px solid var(--app-search-border, rgba(0, 0, 0, 0.12));
  border-radius: 0.125rem;
  background: var(--app-search-dropdown-bg, #fff);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  box-sizing: border-box;
  max-height: 18rem;
  overflow: auto;
}

.app-search__dropdown[hidden] {
  display: none !important;
}

.app-search__option {
  margin: 0;
  padding: 0;
}

.app-search__option-link {
  display: block;
  padding: 0.55rem 0.85rem;
  color: var(--app-search-fg, #202122);
  font: 0.9375rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-decoration: none;
  text-align: left;
}

.app-search__option-link:hover,
.app-search__option.is-active .app-search__option-link {
  background: var(--app-search-hover, rgba(0, 0, 0, 0.05));
  color: var(--app-search-fg, #202122);
  text-decoration: none;
}

.app-search__option-title {
  display: block;
  font-weight: 600;
}

.app-search__option-description {
  display: block;
  margin-top: 0.15rem;
  color: var(--app-search-muted, #54595d);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.app-search__dropdown-footer {
  margin: 0.35rem 0 0;
  padding: 0.35rem 0 0;
  border-top: 1px solid var(--app-search-border, rgba(0, 0, 0, 0.12));
}

.app-search__dropdown-all {
  display: block;
  padding: 0.55rem 0.85rem;
  color: var(--app-search-link, #3366cc);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-align: left;
  text-decoration: none;
}

.app-search__dropdown-all:hover {
  background: var(--app-search-hover, rgba(0, 0, 0, 0.05));
  text-decoration: none;
}

.app-search__dropdown-empty {
  padding: 0.65rem 0.85rem;
  color: var(--app-search-muted, #54595d);
  font: 0.875rem -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

body.theme-dark {
  --app-search-border: rgba(255, 255, 255, 0.12);
  --app-search-dropdown-bg: #313438;
  --app-search-fg: #eaecf0;
  --app-search-muted: #a7adb4;
  --app-search-hover: rgba(255, 255, 255, 0.08);
  --app-search-link: #6b9eff;
}

body:not(.theme-dark) {
  --app-search-border: rgba(0, 0, 0, 0.12);
  --app-search-dropdown-bg: #ffffff;
  --app-search-fg: #202122;
  --app-search-muted: #54595d;
  --app-search-hover: rgba(0, 0, 0, 0.05);
  --app-search-link: #3366cc;
}

.header-chrome__search-form.app-search-anchor {
  position: relative;
  overflow: visible;
  z-index: 2;
}

.header-chrome__search-form .app-search__dropdown {
  min-width: 16rem;
  right: 0;
  left: auto;
  width: max(16rem, 100%);
}

.main-content.search-page {
  box-sizing: border-box;
  width: 100%;
  padding: 1rem 1rem 2rem;
}

.search-page__panel {
  margin-bottom: 1.5rem;
  padding: 1.35rem 1.5rem 1.5rem;
  border: 1px solid var(--app-search-border, rgba(0, 0, 0, 0.12));
  border-radius: var(--border-radius-base, 0.125rem);
  background: var(--background-color-base, #ffffff);
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

body.theme-dark .search-page__panel {
  background: #242629;
  box-shadow: inset 0 -1px 3px rgba(0, 0, 0, 0.08);
}

.search-page__lead {
  margin: 0 0 1.1rem;
  color: var(--app-search-muted, #54595d);
  font: 0.9375rem/1.55 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

.search-page__form {
  margin: 0;
}

.search-page__bar {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 2.875rem;
  border: 1px solid var(--app-search-border, rgba(0, 0, 0, 0.12));
  border-radius: var(--border-radius-base, 0.125rem);
  background: var(--app-search-bar-bg, #f8f9fa);
  overflow: visible;
  box-sizing: border-box;
}

body.theme-dark .search-page__bar {
  --app-search-bar-bg: #1e2125;
}

.search-page__bar:focus-within {
  border-color: var(--border-color-progressive, #36c);
  box-shadow: 0 0 0 3px rgba(51, 102, 204, 0.15);
}

body.theme-dark .search-page__bar:focus-within {
  box-shadow: 0 0 0 3px rgba(107, 158, 255, 0.18);
}

.search-page__bar-icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding-left: 0.9rem;
  color: var(--app-search-muted, #54595d);
  font-size: 1.05rem;
  line-height: 1;
  pointer-events: none;
}

.search-page__input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  margin: 0;
  border: 0;
  background: transparent;
  color: var(--app-search-fg, #202122);
  font: 1rem/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  padding: 0.7rem 0.75rem;
  outline: none;
  box-sizing: border-box;
}

.search-page__input::placeholder {
  color: color-mix(in srgb, var(--app-search-muted, #54595d) 88%, transparent);
}

.search-page__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  flex: 0 0 auto;
  align-self: center;
  margin: 0.3rem 0.3rem 0.3rem 0;
  padding: 0.55rem 1rem;
  border: 1px solid var(--border-color-progressive, #36c);
  border-radius: var(--border-radius-base, 0.125rem);
  background: var(--background-color-progressive, #36c);
  color: var(--color-inverted, #ffffff);
  font: 0.875rem/1 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
}

.search-page__submit:hover {
  background: var(--background-color-progressive--hover, #447ff5);
}

.search-page__submit:focus-visible {
  outline: 2px solid var(--border-color-progressive--focus, #36c);
  outline-offset: 2px;
}

.search-page__submit i {
  font-size: 1rem;
  line-height: 1;
}

.search-page__suggestions {
  margin-top: 1.15rem;
  padding-top: 1rem;
  border-top: 1px solid var(--app-search-border, rgba(0, 0, 0, 0.12));
}

.search-page__suggestions[hidden] {
  display: none !important;
}

.search-page__suggestions-label {
  margin: 0 0 0.7rem;
  color: var(--app-search-muted, #54595d);
  font: 0.75rem/1.2 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.search-page__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.search-page__results-root {
  min-height: 0;
}

.search-page__results-header {
  margin: 0 0 0.75rem;
  color: var(--app-search-muted, #54595d);
  font: 0.875rem/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
}

@media (max-width: 520px) {
  .search-page__panel {
    padding: 1.1rem 1rem 1.15rem;
  }

  .search-page__submit-text {
    display: none;
  }

  .search-page__submit {
    padding: 0.55rem 0.7rem;
  }
}

.search-page__results {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.search-page__result {
  margin: 0;
  padding: 0;
}

.search-page__result-link {
  display: block;
  padding: 1rem 1.1rem;
  border: 1px solid var(--app-search-border, rgba(0, 0, 0, 0.12));
  border-radius: var(--border-radius-base, 0.125rem);
  background: var(--background-color-base, #ffffff);
  color: var(--app-search-link, #3366cc);
  text-decoration: none;
  transition: background 0.12s ease, border-color 0.12s ease;
}

body.theme-dark .search-page__result-link {
  background: #242629;
}

.search-page__result-link:hover {
  background: var(--app-search-hover, rgba(0, 0, 0, 0.05));
  border-color: color-mix(in srgb, var(--app-search-link, #3366cc) 30%, var(--app-search-border, rgba(0, 0, 0, 0.12)));
  text-decoration: none;
}

.search-page__result-title {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.3;
}

.search-page__result-description {
  display: block;
  margin-top: 0.35rem;
  color: var(--app-search-fg, #202122);
  font-size: 0.9375rem;
  line-height: 1.5;
}

.search-page__empty {
  margin: 0;
  padding: 1.25rem 1.1rem;
  border: 1px dashed var(--app-search-border, rgba(0, 0, 0, 0.12));
  border-radius: var(--border-radius-base, 0.125rem);
  color: var(--app-search-muted, #54595d);
  font: 0.9375rem/1.55 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, Helvetica, Arial, sans-serif;
  text-align: left;
}
`;

    let peopleRegistryScriptPromise = null;

    function normalizeSiteRootPrefix(prefix) {
        if (!prefix || prefix === '/') {
            return '';
        }

        return prefix;
    }

    function ensureSearchStyles() {
        if (document.getElementById(APP_SEARCH_STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = APP_SEARCH_STYLE_ID;
        style.textContent = APP_SEARCH_STYLES;
        document.head.append(style);
    }

    function ensurePeopleRegistryScript() {
        if (window.PeopleRegistry) {
            return Promise.resolve();
        }

        if (peopleRegistryScriptPromise) {
            return peopleRegistryScriptPromise;
        }

        const existingScript = document.querySelector('script[src*="people-registry.js"]');
        if (existingScript) {
            peopleRegistryScriptPromise = new Promise((resolve, reject) => {
                existingScript.addEventListener('load', resolve, { once: true });
                existingScript.addEventListener('error', reject, { once: true });
            });
            return peopleRegistryScriptPromise;
        }

        peopleRegistryScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = PEOPLE_REGISTRY_SCRIPT_URL;
            script.defer = true;
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', reject, { once: true });
            document.head.append(script);
        });

        return peopleRegistryScriptPromise;
    }

    function getSiteRootPrefix() {
        if (window.PeopleRegistry?.getSiteRootPrefix) {
            return window.PeopleRegistry.getSiteRootPrefix();
        }

        const pathname = window.location.pathname.replace(/\\/g, '/');
        const nestedProfileMatch = pathname.match(/^(.*\/ )people\/[^/]+\/[^/]+$/);
        if (nestedProfileMatch) {
            return normalizeSiteRootPrefix(nestedProfileMatch[1]);
        }

        const peopleDirectoryMatch = pathname.match(/^(.*\/ )people\/[^/]+\//);
        if (peopleDirectoryMatch) {
            return normalizeSiteRootPrefix(peopleDirectoryMatch[1]);
        }

        if (pathname.includes('/pages/')) {
            return '../';
        }

        return '';
    }

    function resolvePersonProfileUrl(personId) {
        if (window.PeopleRegistry?.resolvePersonProfileUrl) {
            return window.PeopleRegistry.resolvePersonProfileUrl(personId);
        }

        return new URL(`people/${personId}/profile.html`, new URL(getSiteRootPrefix(), window.location.href)).href;
    }

    function resolveSearchPageUrl(query = '') {
        const trimmedQuery = (query || '').trim();

        // Prefer the site-provided resolver when available — it's authoritative
        if (window.App?.resolveSiteUrl) {
            try {
                const resolved = window.App.resolveSiteUrl('pages/search.html');
                const url = new URL(resolved, window.location.href);
                if (trimmedQuery) url.searchParams.set('q', trimmedQuery);
                return url.href;
            } catch (e) {
                // fall through to the fallback below
            }
        }

        // Fallback: resolve relative to the computed site-root prefix so this
        // works correctly from pages/, people/*/profile, and site root.
        const base = new URL(getSiteRootPrefix() || '.', window.location.href);
        const url = new URL('pages/search.html', base);
        if (trimmedQuery) url.searchParams.set('q', trimmedQuery);
        return url.href;
    }

    function normalizeSearchText(value) {
        return (value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }

    function getPersonDisplayName(entry) {
        return [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim();
    }

    function scorePersonEntry(query, entry) {
        const normalizedQuery = normalizeSearchText(query);
        if (!normalizedQuery) {
            return 0;
        }

        const firstName = normalizeSearchText(entry.firstName);
        const lastName = normalizeSearchText(entry.lastName);
        const fullName = normalizeSearchText(getPersonDisplayName(entry));
        const id = String(entry.id || '').toLowerCase();
        let score = 0;

        if (fullName === normalizedQuery || id === normalizedQuery) {
            score = Math.max(score, 120);
        }

        if (fullName.startsWith(normalizedQuery) || firstName.startsWith(normalizedQuery) || lastName.startsWith(normalizedQuery) || id.startsWith(normalizedQuery)) {
            score = Math.max(score, 95);
        }

        if (fullName.includes(normalizedQuery) || firstName.includes(normalizedQuery) || lastName.includes(normalizedQuery)) {
            score = Math.max(score, 80);
        }

        const queryTokens = normalizedQuery.split(' ').filter(Boolean);
        if (queryTokens.length > 1) {
            const haystack = [firstName, lastName, fullName].join(' ');
            const allTokensMatch = queryTokens.every((token) => haystack.includes(token));
            if (allTokensMatch) {
                score = Math.max(score, 100);
            }
        }

        return score;
    }

    async function loadSearchIndex() {
        await ensurePeopleRegistryScript();
        return window.PeopleRegistry.loadPeopleRegistry();
    }

    async function findPersonMatches(query, { limit = 8 } = {}) {
        const people = await loadSearchIndex();

        return people
            .map((entry) => ({
                entry,
                score: scorePersonEntry(query, entry),
                url: resolvePersonProfileUrl(entry.id),
            }))
            .filter((result) => result.score > 0)
            .sort((a, b) => b.score - a.score || getPersonDisplayName(a.entry).localeCompare(getPersonDisplayName(b.entry)))
            .slice(0, limit);
    }

    function getSearchInput(form) {
        return form.querySelector('input[name="search"], input[type="search"]');
    }

    function getDropdownAnchor(form) {
        if (form.id === 'header-chrome-search-form' || form.classList.contains('header-chrome__search-form')) {
            return form;
        }

        return form.querySelector('.app-search-anchor, .search-input, .search-page__bar') || form;
    }

    function createDropdown(anchor) {
        const dropdown = document.createElement('ul');
        dropdown.className = 'app-search__dropdown';
        dropdown.setAttribute('role', 'listbox');
        dropdown.hidden = true;
        anchor.append(dropdown);
        return dropdown;
    }

    function renderDropdownItems(dropdown, matches, query) {
        dropdown.textContent = '';

        const appName = getAppName();

        if (matches.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'app-search__dropdown-empty';
            empty.textContent = query.trim() ? `No profiles match "${query.trim()}".` : `Type to search ${appName}.`;
            dropdown.append(empty);
            return;
        }

        matches.forEach((match, index) => {
            const item = document.createElement('li');
            item.className = 'app-search__option';
            item.setAttribute('role', 'option');
            item.dataset.index = String(index);

            const link = document.createElement('a');
            link.className = 'app-search__option-link';
            link.href = match.url;

            const title = document.createElement('span');
            title.className = 'app-search__option-title';
            title.textContent = getPersonDisplayName(match.entry);
            link.append(title);

            item.append(link);
            dropdown.append(item);
        });

        const footer = document.createElement('li');
        footer.className = 'app-search__dropdown-footer';
        footer.setAttribute('role', 'presentation');

        const viewAll = document.createElement('a');
        viewAll.className = 'app-search__dropdown-all';
        viewAll.href = resolveSearchPageUrl(query);
        viewAll.textContent = `View all results for “${query.trim()}”`;
        footer.append(viewAll);
        dropdown.append(footer);
    }

    function setActiveDropdownOption(dropdown, index) {
        const options = [...dropdown.querySelectorAll('.app-search__option')];
        options.forEach((option, optionIndex) => {
            const isActive = optionIndex === index;
            option.classList.toggle('is-active', isActive);
            option.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        return options[index] || null;
    }

    function bindAppSearchSubmitLink(form, input, { closeDropdown, getActiveMatch, goToSearchPage }) {
        const submitControl = form.querySelector('a.app-search-submit') || form.querySelector('button[type="submit"]');
        if (!submitControl) {
            return;
        }

        const syncSubmitHref = () => {
            if (submitControl.tagName === 'A') {
                submitControl.href = resolveSearchPageUrl(input.value);
            }
        };

        input.addEventListener('input', syncSubmitHref);
        syncSubmitHref();

        if (submitControl.tagName !== 'A') {
            return;
        }

        submitControl.addEventListener('click', (event) => {
            if (event.defaultPrevented) {
                return;
            }

            // Let the browser handle open-in-new-tab and other modified clicks.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                syncSubmitHref();
                return;
            }

            event.preventDefault();
            closeDropdown();

            const activeMatch = getActiveMatch();
            if (activeMatch) {
                window.location.assign(activeMatch.url);
                return;
            }

            goToSearchPage(input.value);
        });
    }

    function bindAppSearchForm(form) {
        if (!form || form.dataset.appSearchBound === 'true') {
            return;
        }

        ensureSearchStyles();
        form.dataset.appSearchBound = 'true';

        const input = getSearchInput(form);
=======
    const RECORDS = [
        {
            title: 'Memorials',
            type: 'Collection',
            description: 'Documented graves, monuments, inscriptions, and linked cemetery records.',
            url: 'pages/search.html?q=memorials',
            keywords: 'memorial grave monument inscription headstone'
        },
        {
            title: 'Cemeteries',
            type: 'Places',
            description: 'Cemetery profiles with location notes, sections, maps, and preservation status.',
            url: 'pages/search.html?q=cemeteries',
            keywords: 'cemetery graveyard churchyard burial ground place map'
        },
        {
            title: 'War Graves',
            type: 'Memorials',
            description: 'Service burials, military memorials, and veteran cemetery records.',
            url: 'pages/search.html?q=war%20graves',
            keywords: 'war veteran military service soldiers'
        },
        {
            title: 'Obituaries',
            type: 'Records',
            description: 'Obituary references connected to memorial and burial records.',
            url: 'pages/search.html?q=obituaries',
            keywords: 'obituary death notice family'
        },
        {
            title: 'Photo Requests',
            type: 'Community',
            description: 'Open requests for cemetery photos, transcriptions, and location checks.',
            url: 'pages/search.html?q=photo%20requests',
            keywords: 'photo request volunteer transcribe'
        },
        {
            title: 'Notable Graves',
            type: 'Profiles',
            description: 'Historical memorials and notable burial places curated by contributors.',
            url: 'pages/search.html?q=notable%20graves',
            keywords: 'notable historic famous profile'
        }
    ];

    function resolveSiteUrl(path) {
        const cleanPath = String(path || '').replace(/^\//, '');
        if (window.App?.resolveSiteUrl) {
            return window.App.resolveSiteUrl(cleanPath);
        }

        return new URL(cleanPath, window.location.href).href;
    }

    function resolveSearchPageUrl(query) {
        const url = new URL(resolveSiteUrl('pages/search.html'));
        const trimmed = String(query || '').trim();
        if (trimmed) {
            url.searchParams.set('q', trimmed);
        }
        return url.href;
    }

    function normalize(value) {
        return String(value || '').trim().toLowerCase();
    }

    function findMatches(query, limit = 12) {
        const q = normalize(query);
        if (!q) {
            return RECORDS.slice(0, limit);
        }

        return RECORDS
            .filter((record) => [record.title, record.type, record.description, record.keywords].some((value) => normalize(value).includes(q)))
            .slice(0, limit);
    }

    function bindAppSearchForm(form) {
        if (!form || form.dataset.gravepediaSearchBound === 'true') {
            return;
        }

        const input = form.querySelector('input[type="search"], input[name="search"], .header-chrome__search-input');
>>>>>>> ec6052d3872e0fbec1db9610b4257e17cb502462
        if (!input) {
            return;
        }

<<<<<<< HEAD
        const anchor = getDropdownAnchor(form);
        anchor.classList.add('app-search-anchor');
        const dropdown = createDropdown(anchor);

        let activeIndex = -1;
        let debounceTimer = null;
        let latestMatches = [];

        const closeDropdown = () => {
            dropdown.hidden = true;
            activeIndex = -1;
            input.setAttribute('aria-expanded', 'false');
        };

        const openDropdown = () => {
            dropdown.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        };

        const updateDropdown = async () => {
            const query = input.value;
            const trimmedQuery = query.trim();

            if (!trimmedQuery) {
                closeDropdown();
                return;
            }

            latestMatches = await findPersonMatches(trimmedQuery, { limit: APP_SEARCH_DROPDOWN_LIMIT });
            renderDropdownItems(dropdown, latestMatches, trimmedQuery);
            activeIndex = -1;
            openDropdown();
        };

        const scheduleUpdate = () => {
            window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
                void updateDropdown();
            }, 150);
        };

        const goToSearchPage = (query) => {
            const trimmedQuery = (query || '').trim();
            window.location.assign(resolveSearchPageUrl(trimmedQuery));
=======
        form.dataset.gravepediaSearchBound = 'true';

        const submitLink = form.querySelector('a.app-search-submit');
        const go = () => {
            window.location.assign(resolveSearchPageUrl(input.value));
>>>>>>> ec6052d3872e0fbec1db9610b4257e17cb502462
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
<<<<<<< HEAD
            closeDropdown();

            if (activeIndex >= 0 && latestMatches[activeIndex]) {
                window.location.assign(latestMatches[activeIndex].url);
                return;
            }

            goToSearchPage(input.value);
        });

        bindAppSearchSubmitLink(form, input, {
            closeDropdown,
            getActiveMatch: () => (activeIndex >= 0 ? latestMatches[activeIndex] : null),
            goToSearchPage,
        });

        input.addEventListener('input', scheduleUpdate);

        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                scheduleUpdate();
            }
        });

        input.addEventListener('keydown', (event) => {
            const options = dropdown.hidden ? [] : [...dropdown.querySelectorAll('.app-search__option')];

            if (event.key === 'ArrowDown') {
                if (!options.length) {
                    return;
                }

                event.preventDefault();
                activeIndex = Math.min(activeIndex + 1, options.length - 1);
                setActiveDropdownOption(dropdown, activeIndex)?.scrollIntoView({ block: 'nearest' });
                return;
            }

            if (event.key === 'ArrowUp') {
                if (!options.length) {
                    return;
                }

                event.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                setActiveDropdownOption(dropdown, activeIndex)?.scrollIntoView({ block: 'nearest' });
                return;
            }

            if (event.key === 'Escape') {
                closeDropdown();
                return;
            }
        });

        dropdown.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });

        document.addEventListener('click', (event) => {
            if (!form.contains(event.target)) {
                closeDropdown();
            }
        });

        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', dropdown.id || '');
        if (!dropdown.id) {
            dropdown.id = `app-search-dropdown-${Math.random().toString(36).slice(2, 9)}`;
            input.setAttribute('aria-controls', dropdown.id);
        }
        input.setAttribute('aria-expanded', 'false');
    }

    function initSearchPageChips() {
        const chips = Array.from(document.querySelectorAll('.search-page__chip[data-query]'));
        if (!chips.length) return;

        // Set a sensible default (search page) so links work immediately,
        // then try to resolve to a person profile and replace the label with the full name.
        chips.forEach((chip) => {
            const query = chip.dataset.query?.trim() || chip.textContent.trim();
            if (query) {
                chip.href = resolveSearchPageUrl(query);
            }
        });

        // Asynchronously resolve person profiles for chips when the people registry is available.
        void ensurePeopleRegistryScript()
            .then(() => Promise.resolve())
            .then(async () => {
                for (const chip of chips) {
                    try {
                        const query = chip.dataset.query?.trim() || chip.textContent.trim();
                        if (!query) continue;

                        const matches = await findPersonMatches(query, { limit: 1 });
                        if (matches && matches.length) {
                            const match = matches[0];
                            chip.href = match.url || resolvePersonProfileUrl(match.entry.id);
                            const name = getPersonDisplayName(match.entry);
                            if (name) {
                                chip.textContent = name;
                            }
                        }
                    } catch (err) {
                        // If anything fails, leave the chip as a search link.
                        // Swallow errors to avoid breaking the rest of the page.
                        // eslint-disable-next-line no-console
                        console.debug('initSearchPageChips: could not resolve chip', err);
                    }
                }
            })
            .catch(() => { });
    }

    async function renderSearchResultsPage() {
        const resultsRoot = document.getElementById('app-search-results');
        if (!resultsRoot) {
            return;
        }

        ensureSearchStyles();
        initSearchPageChips();

        const params = new URLSearchParams(window.location.search);
        const query = (params.get('q') || params.get('search') || '').trim();
        const metaEl = document.getElementById('app-search-page-meta');
        const suggestionsEl = document.getElementById('app-search-suggestions');
        const toolbar = document.querySelector('full-page-toolbar');
        const formInput = document.querySelector('#search-page-form input[name="search"], #search-page-form input[type="search"]');

        if (formInput) {
            formInput.value = query;
        }

        const appName = getAppName();
        const pageTitle = query ? `Search results for “${query}”` : `Search ${appName}`;

        if (toolbar) {
            toolbar.setAttribute('title', pageTitle);
        }

        document.title = query ? `Search: ${query} - ${appName}` : `Search - ${appName}`;

        if (!query) {
            if (metaEl) {
                metaEl.textContent = `Enter a name or keyword to find people in ${appName}.`;
            }
            if (suggestionsEl) {
                suggestionsEl.hidden = false;
            }
            resultsRoot.replaceChildren();
            return;
        }

        if (suggestionsEl) {
            suggestionsEl.hidden = true;
        }

        const matches = await findPersonMatches(query, { limit: 100 });

        if (metaEl) {
            metaEl.textContent = matches.length === 1
                ? '1 result'
                : `${matches.length} results`;
        }

        if (matches.length === 0) {
            resultsRoot.innerHTML = `<p class="search-page__empty">No profiles matched “${query}”. Try another spelling, pick a popular search above, or use a shorter keyword.</p>`;
            return;
        }

        const header = document.createElement('p');
        header.className = 'search-page__results-header';
        header.textContent = matches.length === 1 ? '1 profile found' : `${matches.length} profiles found`;

        const list = document.createElement('ul');
        list.className = 'search-page__results';

        matches.forEach((match) => {
            const item = document.createElement('li');
            item.className = 'search-page__result';

            const link = document.createElement('a');
            link.className = 'search-page__result-link';
            link.href = match.url;

            const title = document.createElement('span');
            title.className = 'search-page__result-title';
            title.textContent = getPersonDisplayName(match.entry);
            link.append(title);

            item.append(link);
            list.append(item);
        });

        resultsRoot.replaceChildren(header, list);
=======
            go();
        });

        submitLink?.addEventListener('click', (event) => {
            event.preventDefault();
            go();
        });
>>>>>>> ec6052d3872e0fbec1db9610b4257e17cb502462
    }

    function bindAllSearchForms() {
        document.querySelectorAll('form[role="search"], #search-form, #header-chrome-search-form, #search-page-form').forEach(bindAppSearchForm);
    }

<<<<<<< HEAD
    function initAppSearch() {
        ensureSearchStyles();
        bindAllSearchForms();
        initSearchPageChips();

        void ensurePeopleRegistryScript()
            .then(() => renderSearchResultsPage())
            .catch((error) => {
                console.error('Failed to load people registry for search', error);

                const resultsRoot = document.getElementById('app-search-results');
                const query = (new URLSearchParams(window.location.search).get('q') || '').trim();
                if (resultsRoot && query) {
                    resultsRoot.innerHTML = '<p class="search-page__empty">Search is temporarily unavailable. Please try again in a moment.</p>';
                }
            });
    }

    window.AppSearch = {
        findPersonMatches,
        resolveSearchPageUrl,
        resolvePersonProfileUrl,
        bindAppSearchForm,
        bindAllSearchForms,
        renderSearchResultsPage,
=======
    function renderSearchResultsPage() {
        const root = document.getElementById('gravepedia-search-results');
        if (!root) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const query = (params.get('q') || params.get('search') || '').trim();
        const input = document.querySelector('#searchPageInput');
        const meta = document.getElementById('gravepedia-search-meta');
        const toolbar = document.querySelector('full-page-toolbar');

        if (input) {
            input.value = query;
        }

        if (toolbar) {
            toolbar.setAttribute('title', query ? `Search: ${query}` : 'Search Gravepedia');
        }

        const matches = findMatches(query);
        if (meta) {
            meta.textContent = query
                ? `${matches.length} result${matches.length === 1 ? '' : 's'} for "${query}"`
                : 'Search memorials, cemeteries, obituaries, photo requests, and cemetery maps.';
        }

        root.replaceChildren();

        if (!query) {
            return;
        }

        if (!matches.length) {
            const empty = document.createElement('p');
            empty.className = 'gravepedia-muted';
            empty.textContent = 'No Gravepedia sections matched your search yet. Try a broader cemetery or memorial keyword.';
            root.append(empty);
            return;
        }

        matches.forEach((record) => {
            const link = document.createElement('a');
            link.className = 'gravepedia-panel gravepedia-result';
            link.href = resolveSiteUrl(record.url);
            link.innerHTML = `
                <span class="gravepedia-result__title">${record.title}</span>
                <span class="gravepedia-muted">${record.type}</span>
                <span>${record.description}</span>
            `;
            root.append(link);
        });
    }

    function initAppSearch() {
        bindAllSearchForms();
        renderSearchResultsPage();
    }

    window.AppSearch = {
        bindAppSearchForm,
        bindAllSearchForms,
        renderSearchResultsPage,
        resolveSearchPageUrl,
        findMatches,
>>>>>>> ec6052d3872e0fbec1db9610b4257e17cb502462
        initAppSearch,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAppSearch, { once: true });
    } else {
        initAppSearch();
    }
<<<<<<< HEAD

=======
>>>>>>> ec6052d3872e0fbec1db9610b4257e17cb502462
})();
