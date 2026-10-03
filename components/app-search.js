(function initGravepediaSearch() {
    if (window.AppSearch) {
        return;
    }

    const DROPDOWN_LIMIT = 6;
    const STYLE_ID = 'gravepedia-search-styles';
    let nextDropdownId = 0;

    const SEARCH_STYLES = `
.app-search-anchor { position: relative; }
.app-search__dropdown {
  position: absolute; z-index: 1200; top: calc(100% + .25rem); left: 0; right: 0;
  box-sizing: border-box; max-height: 18rem; overflow: auto; margin: 0; padding: .35rem 0;
  list-style: none; border: 1px solid var(--border-color-base, rgba(0,0,0,.14));
  border-radius: var(--border-radius-base, .125rem); background: var(--background-color-base, #fff);
  color: var(--color-base, #202122); box-shadow: 0 8px 24px rgba(0,0,0,.14);
}
.app-search__dropdown[hidden] { display: none !important; }
.app-search__option { display: block; margin: 0; padding: .55rem .85rem; cursor: pointer; }
.app-search__option:hover, .app-search__option.is-active {
  background: var(--background-color-interactive, rgba(0,0,0,.06));
}
.app-search__option-name { display: block; font-weight: 600; }
.app-search__option-place { display: block; margin-top: .12rem; color: var(--color-subtle, #54595d); font-size: .875em; }
.app-search__dropdown-message { padding: .65rem .85rem; color: var(--color-subtle, #54595d); }
.gravepedia-search-results:focus { outline: none; }
.gravepedia-search-empty { padding: 1rem; border: 1px dashed var(--border-color-base, rgba(0,0,0,.16)); border-radius: var(--border-radius-base, .125rem); }
.gravepedia-search-results .gravepedia-result h2, .gravepedia-search-results .gravepedia-result h3 { margin: 0 0 .5rem; }
.gravepedia-result__details { display: grid; grid-template-columns: max-content 1fr; gap: .25rem .75rem; margin: .65rem 0 0; }
.gravepedia-result__details dt { color: var(--color-subtle, #54595d); }
.gravepedia-result__details dd { margin: 0; }
.gravepedia-result__inscription { margin: .75rem 0 0; padding-left: .8rem; border-left: 3px solid var(--border-color-base, rgba(0,0,0,.16)); }
.gravepedia-contribute { margin-top: 1.25rem; }
.gravepedia-contribute > summary { cursor: pointer; font-weight: 600; }
.gravepedia-contribute__form { margin-top: 1rem; }
.gravepedia-form [aria-invalid="true"] { border-color: #b32424; }
.gravepedia-status { min-height: 1.5em; }
body.theme-dark .app-search__dropdown { --background-color-interactive: rgba(255,255,255,.08); }
@media (max-width: 42rem) {
  .gravepedia-result__details { grid-template-columns: 1fr; gap: .1rem; }
  .gravepedia-result__details dd + dt { margin-top: .35rem; }
}
`;

    function ensureSearchStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = SEARCH_STYLES;
        document.head.append(style);
    }

    function getAppName() {
        const name = window.App?.getName?.() || window.App?.Name;
        return typeof name === 'string' && name.trim() ? name.trim() : 'Gravepedia';
    }

    function getSiteRootUrl() {
        if (typeof window.App?.resolveSiteUrl === 'function') {
            try {
                return new URL(window.App.resolveSiteUrl(''), window.location.href);
            } catch (error) {
                // Use the page path fallback below.
            }
        }

        const url = new URL(window.location.href);
        const pageMarker = url.pathname.match(/^(.*\/)(?:pages|people)\/.*$/);
        if (pageMarker) {
            url.pathname = pageMarker[1];
        } else if (!url.pathname.endsWith('/')) {
            url.pathname = url.pathname.slice(0, url.pathname.lastIndexOf('/') + 1);
        }
        url.search = '';
        url.hash = '';
        return url;
    }

    function resolveSearchPageUrl(query = '') {
        let url;
        if (typeof window.App?.resolveSiteUrl === 'function') {
            try {
                url = new URL(window.App.resolveSiteUrl('pages/search.html'), window.location.href);
            } catch (error) {
                url = new URL('pages/search.html', getSiteRootUrl());
            }
        } else {
            url = new URL('pages/search.html', getSiteRootUrl());
        }

        const trimmedQuery = String(query || '').trim();
        if (trimmedQuery) {
            url.searchParams.set('q', trimmedQuery);
        } else {
            url.searchParams.delete('q');
        }
        return url.href;
    }

    function getApiBase() {
        const configuredBase = window.App?.getGitHubApiBase?.() || window.App?.GitHubApiBase;
        if (typeof configuredBase !== 'string' || !configuredBase.trim()) {
            throw new Error('The Gravepedia API is not configured.');
        }
        return `${configuredBase.trim().replace(/\/+$/, '')}/`;
    }

    function getMemorialsEndpoint() {
        return new URL('memorials.php', getApiBase()).href;
    }

    async function readJsonResponse(response) {
        let payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            // A useful API response must be JSON; handle invalid responses below.
        }

        if (!response.ok || payload?.success === false) {
            const message = typeof payload?.message === 'string' ? payload.message : '';
            const error = new Error(message || 'The request could not be completed.');
            error.status = response.status;
            error.payload = payload;
            throw error;
        }
        if (!payload || typeof payload !== 'object') {
            throw new Error('The API returned an unreadable response.');
        }
        return payload;
    }

    async function findMemorials(query) {
        const trimmedQuery = String(query || '').trim();
        if (trimmedQuery.length < 2) {
            return { results: [], total: 0 };
        }

        const url = new URL(getMemorialsEndpoint());
        url.searchParams.set('q', trimmedQuery);
        const response = await fetch(url.href, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'include',
        });
        const payload = await readJsonResponse(response);
        if (!Array.isArray(payload.results)) {
            throw new Error('The API returned an invalid memorial search response.');
        }
        const total = Number(payload.total);
        return {
            results: payload.results,
            total: Number.isFinite(total) && total >= 0 ? total : payload.results.length,
        };
    }

    function getMemorialName(record) {
        return String(record?.name || '').trim();
    }

    function getMemorialPlace(record) {
        return String(record?.cemetery || '').trim();
    }

    function createResultCard(record) {
        const card = document.createElement('article');
        card.className = 'gravepedia-panel gravepedia-result';

        const name = getMemorialName(record);
        if (name) {
            const heading = document.createElement('h2');
            heading.className = 'gravepedia-result__title';
            heading.textContent = name;
            card.append(heading);
        }

        const details = [];
        const cemetery = getMemorialPlace(record);
        if (cemetery) details.push(['Cemetery', cemetery]);
        if (record?.birth_date) details.push(['Born', String(record.birth_date)]);
        if (record?.death_date) details.push(['Died', String(record.death_date)]);
        if (record?.source) details.push(['Source', String(record.source)]);

        if (details.length) {
            const list = document.createElement('dl');
            list.className = 'gravepedia-result__details';
            details.forEach(([label, value]) => {
                const term = document.createElement('dt');
                term.textContent = label;
                const description = document.createElement('dd');
                description.textContent = value;
                list.append(term, description);
            });
            card.append(list);
        }

        if (record?.inscription) {
            const inscription = document.createElement('blockquote');
            inscription.className = 'gravepedia-result__inscription';
            inscription.textContent = String(record.inscription);
            card.append(inscription);
        }

        if (record?.notes) {
            const notes = document.createElement('p');
            notes.textContent = String(record.notes);
            card.append(notes);
        }

        return card;
    }

    function createDropdown(anchor, input) {
        const dropdown = document.createElement('ul');
        dropdown.id = `gravepedia-search-options-${++nextDropdownId}`;
        dropdown.className = 'app-search__dropdown';
        dropdown.setAttribute('role', 'listbox');
        dropdown.hidden = true;
        anchor.append(dropdown);
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', dropdown.id);
        input.setAttribute('aria-expanded', 'false');
        return dropdown;
    }

    function renderDropdownMessage(dropdown, message) {
        dropdown.replaceChildren();
        const item = document.createElement('li');
        item.className = 'app-search__dropdown-message';
        item.setAttribute('role', 'presentation');
        item.textContent = message;
        dropdown.append(item);
    }

    function renderDropdownResults(dropdown, records, query) {
        dropdown.replaceChildren();
        if (!records.length) {
            renderDropdownMessage(dropdown, `No published memorials match “${query}”.`);
            return;
        }

        records.slice(0, DROPDOWN_LIMIT).forEach((record, index) => {
            const item = document.createElement('li');
            item.className = 'app-search__option';
            item.id = `${dropdown.id}-option-${index}`;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', 'false');
            item.dataset.index = String(index);

            const name = document.createElement('span');
            name.className = 'app-search__option-name';
            name.textContent = getMemorialName(record) || 'Memorial record';
            item.append(name);
            const placeText = getMemorialPlace(record);
            if (placeText) {
                const place = document.createElement('span');
                place.className = 'app-search__option-place';
                place.textContent = placeText;
                item.append(place);
            }
            item.addEventListener('click', () => {
                const selectedName = getMemorialName(record);
                if (selectedName) {
                    window.location.assign(resolveSearchPageUrl(selectedName));
                }
            });
            dropdown.append(item);
        });

        const footer = document.createElement('li');
        footer.className = 'app-search__dropdown-message';
        footer.setAttribute('role', 'presentation');
        footer.textContent = `View all results for “${query}” by pressing Enter.`;
        dropdown.append(footer);
    }

    function setActiveOption(dropdown, index, input) {
        const options = [...dropdown.querySelectorAll('.app-search__option')];
        options.forEach((option, optionIndex) => {
            const active = optionIndex === index;
            option.classList.toggle('is-active', active);
            option.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        if (options[index]) {
            input.setAttribute('aria-activedescendant', options[index].id);
            options[index].scrollIntoView({ block: 'nearest' });
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    function getSearchInput(form) {
        return form.querySelector('input[name="search"], input[name="q"], input[type="search"]');
    }

    function getDropdownAnchor(form) {
        if (form.classList.contains('header-chrome__search-form')) {
            return form;
        }
        return form.querySelector('.search-input, .search-page__bar') || form;
    }

    function goToSearchPage(query) {
        window.location.assign(resolveSearchPageUrl(query));
    }

    function bindAppSearchForm(form) {
        if (!form || form.dataset.gravepediaSearchBound === 'true') {
            return;
        }

        const input = getSearchInput(form);
        if (!input) {
            return;
        }

        ensureSearchStyles();
        form.dataset.gravepediaSearchBound = 'true';
        const anchor = getDropdownAnchor(form);
        anchor.classList.add('app-search-anchor');
        const dropdown = createDropdown(anchor, input);
        let debounceTimer = null;
        let activeIndex = -1;
        let requestController = null;
        let latestResults = [];

        const closeDropdown = () => {
            window.clearTimeout(debounceTimer);
            requestController?.abort();
            dropdown.hidden = true;
            activeIndex = -1;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
        };

        const openDropdown = () => {
            dropdown.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        };

        const updateSuggestions = async () => {
            const query = input.value.trim();
            if (query.length < 2) {
                closeDropdown();
                return;
            }

            requestController?.abort();
            requestController = new AbortController();
            const currentController = requestController;
            renderDropdownMessage(dropdown, `Searching ${getAppName()}…`);
            openDropdown();
            try {
                const url = new URL(getMemorialsEndpoint());
                url.searchParams.set('q', query);
                const response = await fetch(url.href, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                    credentials: 'include',
                    signal: currentController.signal,
                });
                const payload = await readJsonResponse(response);
                if (!Array.isArray(payload.results)) {
                    throw new Error('The API returned an invalid memorial search response.');
                }
                if (currentController !== requestController) return;
                latestResults = payload.results.slice(0, DROPDOWN_LIMIT);
                activeIndex = -1;
                renderDropdownResults(dropdown, latestResults, query);
                openDropdown();
            } catch (error) {
                if (error.name === 'AbortError') return;
                if (currentController !== requestController) return;
                latestResults = [];
                renderDropdownMessage(dropdown, 'Search is temporarily unavailable. You can still submit your search.');
                openDropdown();
            }
        };

        const scheduleSuggestions = () => {
            window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => void updateSuggestions(), 180);
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const query = input.value.trim();
            if (query.length < 2) {
                input.setCustomValidity('Enter at least 2 characters to search memorials.');
                input.reportValidity();
                input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
                return;
            }
            closeDropdown();
            goToSearchPage(query);
        });

        const submitLink = form.querySelector('a.app-search-submit');
        const syncSubmitLink = () => {
            if (submitLink) {
                submitLink.href = resolveSearchPageUrl(input.value);
            }
        };
        input.addEventListener('input', () => {
            scheduleSuggestions();
            syncSubmitLink();
        });
        syncSubmitLink();

        submitLink?.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                syncSubmitLink();
                return;
            }
            event.preventDefault();
            const query = input.value.trim();
            if (query.length < 2) {
                input.setCustomValidity('Enter at least 2 characters to search memorials.');
                input.reportValidity();
                input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
                return;
            }
            closeDropdown();
            goToSearchPage(query);
        });

        input.addEventListener('focus', () => {
            if (input.value.trim().length >= 2) scheduleSuggestions();
        });
        input.addEventListener('keydown', (event) => {
            const options = dropdown.hidden ? [] : [...dropdown.querySelectorAll('.app-search__option')];
            if (event.key === 'ArrowDown' && options.length) {
                event.preventDefault();
                activeIndex = Math.min(activeIndex + 1, options.length - 1);
                setActiveOption(dropdown, activeIndex, input);
            } else if (event.key === 'ArrowUp' && options.length) {
                event.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                setActiveOption(dropdown, activeIndex, input);
            } else if (event.key === 'Enter' && activeIndex >= 0 && latestResults[activeIndex]) {
                event.preventDefault();
                const selectedName = getMemorialName(latestResults[activeIndex]);
                if (selectedName) goToSearchPage(selectedName);
            } else if (event.key === 'Escape') {
                closeDropdown();
            }
        });
        document.addEventListener('click', (event) => {
            if (!form.contains(event.target)) closeDropdown();
        });
    }

    function bindAllSearchForms() {
        document.querySelectorAll('form[role="search"], #search-form, #header-chrome-search-form, #search-page-form')
            .forEach(bindAppSearchForm);
    }

    function renderMemorialResults(root, records) {
        const fragment = document.createDocumentFragment();
        records.forEach((record) => fragment.append(createResultCard(record)));
        root.replaceChildren(fragment);
    }

    function addSubmissionLink(message, intro = '') {
        message.append(document.createTextNode(intro));
        const link = document.createElement('a');
        link.href = '#submit-memorial';
        link.textContent = 'Submit a memorial for review';
        message.append(link);
    }

    async function renderSearchResultsPage() {
        const root = document.getElementById('gravepedia-search-results');
        if (!root) return;

        ensureSearchStyles();
        const params = new URLSearchParams(window.location.search);
        const query = (params.get('q') || params.get('search') || '').trim();
        const meta = document.getElementById('gravepedia-search-meta');
        const input = document.querySelector('#search-page-form input[name="search"], #search-page-form input[type="search"]');
        const toolbar = document.querySelector('full-page-toolbar');
        const appName = getAppName();

        if (input) input.value = query;
        if (toolbar) toolbar.setAttribute('title', query ? `Search: ${query}` : `Search ${appName}`);
        document.title = query ? `Search: ${query} - ${appName}` : `Search - ${appName}`;

        if (!query) {
            if (meta) meta.textContent = 'Search published memorials by name, cemetery, or place.';
            const empty = document.createElement('p');
            empty.className = 'gravepedia-search-empty';
            empty.append(document.createTextNode('Enter a name or cemetery to search. New memorial submissions are reviewed before they appear in public results. '));
            addSubmissionLink(empty);
            root.replaceChildren(empty);
            return;
        }

        if (meta) meta.textContent = `Searching for “${query}”…`;
        root.setAttribute('aria-busy', 'true');
        const loading = document.createElement('p');
        loading.className = 'gravepedia-search-empty';
        loading.textContent = 'Searching published memorial records…';
        root.replaceChildren(loading);

        try {
            const searchResult = await findMemorials(query);
            const records = searchResult.results;
            root.removeAttribute('aria-busy');
            if (meta) {
                const total = searchResult.total;
                meta.textContent = `${total} published memorial record${total === 1 ? '' : 's'} found for “${query}”.`;
            }

            if (!records.length) {
                const empty = document.createElement('p');
                empty.className = 'gravepedia-search-empty';
                empty.append(document.createTextNode(`No published memorial records were found for “${query}”. `));
                addSubmissionLink(empty);
                root.replaceChildren(empty);
                return;
            }
            renderMemorialResults(root, records);
        } catch (error) {
            root.removeAttribute('aria-busy');
            if (meta) meta.textContent = 'Memorial search is temporarily unavailable.';
            const message = document.createElement('p');
            message.className = 'gravepedia-search-empty';
            message.setAttribute('role', 'alert');
            message.textContent = 'We could not load memorial records right now. Please try again in a moment.';
            const retry = document.createElement('button');
            retry.className = 'pure-button';
            retry.type = 'button';
            retry.textContent = 'Try again';
            retry.addEventListener('click', () => void renderSearchResultsPage());
            root.replaceChildren(message, retry);
        }
    }

    function makeGitHubLoginUrl() {
        const url = new URL('github-login.php', getApiBase());
        url.searchParams.set('return_to', window.location.href);
        return url.href;
    }

    function showSubmissionStatus(status, message, loginRequired = false) {
        status.replaceChildren();
        const paragraph = document.createElement('span');
        paragraph.textContent = message;
        status.append(paragraph);
        if (loginRequired) {
            const link = document.createElement('a');
            link.href = makeGitHubLoginUrl();
            link.textContent = 'Sign in with GitHub';
            link.className = 'gravepedia-login-link';
            status.append(document.createTextNode(' '), link);
        }
    }

    function isAuthenticationError(error) {
        const code = String(error.payload?.error || error.payload?.code || '').toLowerCase();
        const message = String(error.payload?.message || error.message || '').toLowerCase();
        return error.status === 401 || ((error.status === 403) && /(auth|login|sign in|unauthenticated)/.test(`${code} ${message}`));
    }

    function bindMemorialSubmissionForm() {
        const form = document.getElementById('memorial-submission-form');
        const status = document.getElementById('memorial-submission-status');
        if (!form || !status || form.dataset.gravepediaSubmissionBound === 'true') return;
        form.dataset.gravepediaSubmissionBound = 'true';

        const birthDate = form.elements.namedItem('birth_date');
        const deathDate = form.elements.namedItem('death_date');
        const requiredTextFields = [
            [form.elements.namedItem('name'), 'Enter the name shown on the memorial.'],
            [form.elements.namedItem('cemetery'), 'Enter the cemetery or burial place.'],
            [form.elements.namedItem('source'), 'Add a source or evidence for this memorial.'],
        ];
        const validateRequiredText = () => {
            requiredTextFields.forEach(([field, message]) => {
                field.setCustomValidity(field.value.trim() ? '' : message);
            });
        };
        const validateDates = () => {
            deathDate.setCustomValidity('');
            birthDate.setCustomValidity('');
            if (birthDate.value && deathDate.value && deathDate.value < birthDate.value) {
                deathDate.setCustomValidity('Death date must be on or after the birth date.');
            }
        };
        requiredTextFields.forEach(([field]) => field.addEventListener('input', () => field.setCustomValidity('')));
        birthDate.addEventListener('change', validateDates);
        deathDate.addEventListener('change', validateDates);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            validateRequiredText();
            validateDates();
            if (!form.reportValidity()) return;

            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting…';
            status.setAttribute('aria-busy', 'true');
            showSubmissionStatus(status, 'Sending your memorial for review…');

            const payload = {
                name: form.elements.namedItem('name').value.trim(),
                cemetery: form.elements.namedItem('cemetery').value.trim(),
                birth_date: birthDate.value || '',
                death_date: deathDate.value || '',
                inscription: form.elements.namedItem('inscription').value.trim(),
                notes: form.elements.namedItem('notes').value.trim(),
                source: form.elements.namedItem('source').value.trim(),
            };

            try {
                const response = await fetch(getMemorialsEndpoint(), {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });
                const result = await readJsonResponse(response);
                if (result.status !== 'pending') {
                    throw new Error('The API did not confirm that the submission is pending review.');
                }
                showSubmissionStatus(status, result.message || 'Your memorial was submitted and is pending review. It will appear in public search only after approval.');
                form.reset();
            } catch (error) {
                if (isAuthenticationError(error)) {
                    showSubmissionStatus(status, 'Sign in with GitHub before submitting a memorial.', true);
                } else {
                    const apiMessage = typeof error.payload?.message === 'string' ? error.payload.message.trim() : '';
                    showSubmissionStatus(status, apiMessage || 'We could not submit your memorial right now. Please try again later.');
                }
            } finally {
                status.removeAttribute('aria-busy');
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    function initAppSearch() {
        ensureSearchStyles();
        bindAllSearchForms();
        bindMemorialSubmissionForm();
        void renderSearchResultsPage();
    }

    window.AppSearch = {
        findMemorials,
        resolveSearchPageUrl,
        bindAppSearchForm,
        bindAllSearchForms,
        renderSearchResultsPage,
        initAppSearch,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAppSearch, { once: true });
    } else {
        initAppSearch();
    }
})();
