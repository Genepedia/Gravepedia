(function initGravepediaSearch() {
    if (window.AppSearch) {
        return;
    }

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
        if (!input) {
            return;
        }

        form.dataset.gravepediaSearchBound = 'true';

        const submitLink = form.querySelector('a.app-search-submit');
        const go = () => {
            window.location.assign(resolveSearchPageUrl(input.value));
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            go();
        });

        submitLink?.addEventListener('click', (event) => {
            event.preventDefault();
            go();
        });
    }

    function bindAllSearchForms() {
        document.querySelectorAll('form[role="search"], #search-form, #header-chrome-search-form, #search-page-form').forEach(bindAppSearchForm);
    }

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
        initAppSearch,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAppSearch, { once: true });
    } else {
        initAppSearch();
    }
})();
