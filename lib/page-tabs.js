/* Page / Changes tab switching for full-page-toolbar variant="page" pages */
(function () {
  const PAGE_TABS = ['page', 'changes'];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function getSelectedTab() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    return hash === 'changes' ? 'changes' : 'page';
  }

  const PEOPLE_PROFILE_RELATIVE_FILES = [
    'index.html',
    'profile.html',
    'data/profile.html',
    'data/talk.json',
  ];

  function getPeopleProfileId() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const match = path.match(/\/people\/([^/]+)\/(?:index\.html|profile\.html)?$/);
    return match?.[1]?.trim() || '';
  }

  function getPeopleProfileSourcePaths() {
    const personId = getPeopleProfileId();
    if (!personId) {
      return null;
    }

    const base = `pages/people/${personId}`;
    return PEOPLE_PROFILE_RELATIVE_FILES.map((file) => `${base}/${file}`);
  }

  function normalizeSourcePaths(sourcePathOrPaths) {
    if (Array.isArray(sourcePathOrPaths)) {
      return sourcePathOrPaths
        .map((path) => String(path || '').replace(/^\/+/, '').trim())
        .filter(Boolean);
    }

    const raw = String(sourcePathOrPaths || '').replace(/^\/+/, '').trim();
    if (!raw) {
      return [];
    }

    if (raw.includes(',')) {
      return raw
        .split(',')
        .map((path) => path.trim())
        .filter(Boolean);
    }

    return [raw];
  }

  function getSourcePath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const markers = ['pages/', 'people/'];

    for (const marker of markers) {
      const index = path.indexOf(marker);
      if (index !== -1) {
        return path.slice(index);
      }
    }

    return path.replace(/^\//, '');
  }

  function getSourcePaths() {
    const profilePaths = getPeopleProfileSourcePaths();
    if (profilePaths?.length) {
      return profilePaths;
    }

    const single = getSourcePath();
    return single ? [single] : [];
  }

  function getGitHubCommitUrl(hash, repo) {
    const repoSlug = String(repo || '').replace(/^\/+|\/+$/g, '');
    const commitHash = String(hash || '').trim();

    if (!repoSlug || !commitHash) {
      return '';
    }

    return `https://github.com/${repoSlug}/commit/${encodeURIComponent(commitHash)}`;
  }

  function getGitHubFileUrl(hash, filePath, repo) {
    const repoSlug = String(repo || '').replace(/^\/+|\/+$/g, '');
    const commitHash = String(hash || '').trim();
    const cleanPath = String(filePath || '').replace(/^\/+/, '');

    if (!repoSlug || !commitHash || !cleanPath) {
      return '';
    }

    return `https://github.com/${repoSlug}/blob/${encodeURIComponent(commitHash)}/${cleanPath}`;
  }

  function getGitHubAuthorUrl(commit) {
    return String(commit?.author_url || '').trim();
  }

  function formatCommitDate(value) {
    if (!value) {
      return 'Unknown date';
    }

    try {
      return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return value;
    }
  }

  function resolveGitHubApiBase() {
    return String(
      window.App?.getGitHubApiBase?.()
      || window.App?.GitHubApiBase
      || '',
    ).trim().replace(/\/+$/, '');
  }

  function resolveFileCommitsApiUrl(sourcePathOrPaths) {
    const apiBase = resolveGitHubApiBase();
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!apiBase || !paths.length) {
      return '';
    }

    const url = new URL('files/commits', `${apiBase}/`);
    if (paths.length === 1) {
      url.searchParams.set('path', paths[0]);
    } else {
      url.searchParams.set('paths', paths.join(','));
    }
    return url.href;
  }

  function resolveFileCommitDiffApiUrl(sourcePathOrPaths, hash) {
    const apiBase = resolveGitHubApiBase();
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!apiBase || !paths.length) {
      return '';
    }

    const url = new URL('files/commit-diff', `${apiBase}/`);
    if (paths.length === 1) {
      url.searchParams.set('path', paths[0]);
    } else {
      url.searchParams.set('paths', paths.join(','));
    }
    url.searchParams.set('hash', hash);
    return url.href;
  }

  async function fetchFileCommitsFromApi(sourcePathOrPaths) {
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    const url = resolveFileCommitsApiUrl(paths);

    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(url);
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      const message = payload?.message || `Failed to load commit history (${response.status})`;
      const requestError = new Error(message);
      requestError.status = response.status;
      throw requestError;
    }

    return {
      commits: Array.isArray(payload.commits) ? payload.commits : [],
      repo: String(payload.repo || '').trim(),
      paths: Array.isArray(payload.paths) ? payload.paths : paths,
    };
  }

  async function fetchFileCommitDiff(sourcePathOrPaths, hash) {
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    const url = resolveFileCommitDiffApiUrl(paths, hash);
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(url);
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || !payload?.ok) {
      const message = payload?.message || `Failed to load file changes (${response.status})`;
      const requestError = new Error(message);
      requestError.status = response.status;
      throw requestError;
    }

    if (Array.isArray(payload.diffs) && payload.diffs.length) {
      return payload.diffs;
    }

    if (payload.diff) {
      return [payload.diff];
    }

    throw new Error('No file changes were returned for this commit.');
  }

  function resolvePullRequestsApiUrl(sourcePathOrPaths) {
    const apiBase = resolveGitHubApiBase();
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!apiBase || !paths.length) {
      return '';
    }

    const url = new URL('pull-requests', `${apiBase}/`);
    if (paths.length === 1) {
      url.searchParams.set('path', paths[0]);
    } else {
      url.searchParams.set('paths', paths.join(','));
    }

    return url.href;
  }

  function resolvePullRequestDetailApiUrl(number, repo = '') {
    const apiBase = resolveGitHubApiBase();
    if (!apiBase || !number) {
      return '';
    }

    const url = new URL('pull-requests', `${apiBase}/`);
    url.searchParams.set('number', String(number));
    if (repo) {
      url.searchParams.set('repo', String(repo));
    }
    return url.href;
  }

  function resolvePullRequestReviewApiUrl(repo = '') {
    const apiBase = resolveGitHubApiBase();
    if (!apiBase) {
      return '';
    }

    const url = new URL('pull-requests/review', `${apiBase}/`);
    if (repo) {
      url.searchParams.set('repo', String(repo));
    }
    return url.href;
  }

  function resolveMaintainersApiUrl(sourcePathOrPaths) {
    const apiBase = resolveGitHubApiBase();
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!apiBase || !paths.length) {
      return '';
    }

    const url = new URL('maintainers', `${apiBase}/`);
    if (paths.length === 1) {
      url.searchParams.set('path', paths[0]);
    } else {
      url.searchParams.set('paths', paths.join(','));
    }

    return url.href;
  }

  async function fetchPendingPullRequests(sourcePathOrPaths) {
    const url = resolvePullRequestsApiUrl(sourcePathOrPaths);
    if (!url) {
      return {
        pull_requests: [],
        can_review: false,
        review_login: '',
      };
    }

    const response = await fetch(
      url,
      window.App?.getGitHubFetchInit?.() || { credentials: 'include' },
    );
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Failed to load pending edits (${response.status})`);
    }

    return payload;
  }

  function resolveSiteUrl(path) {
    const clean = String(path || '').replace(/^\/+/, '');
    if (!clean) {
      return '';
    }

    try {
      return window.App?.resolveSiteUrl?.(clean) || new URL(clean, window.location.origin).href;
    } catch (error) {
      return clean;
    }
  }

  function getProfileIdFromPaths(paths) {
    for (const path of normalizeSourcePaths(paths)) {
      const match = path.match(/^people\/([^/]+)\//);
      if (match?.[1]) {
        return match[1];
      }
    }

    return '';
  }

  function getPageOwnershipConfigPath(paths) {
    const normalized = normalizeSourcePaths(paths);
    if (normalized.length !== 1 || !/^pages\/.+\.html$/.test(normalized[0])) {
      return '';
    }

    return normalized[0].replace(/\.html$/, '.json');
  }

  // The people database is the source of truth for structured data. Ownership
  // lives in data/Genepedia-Database/people/ownership/<bucket>/<id>.json and the
  // person record (names, events, media, living flag) in
  // data/Genepedia-Database/people/persons/<bucket>/<id>.json.
  function personDbBucket(id) {
    const n = Number(String(id).replace(/[^0-9]/g, '')) || 0;
    return Math.floor((Math.max(1, n) - 1) / 1000);
  }

  function resolvePeopleDbPath(path = '') {
    const clean = String(path || '').replace(/^\/+/, '');
    if (typeof window.App?.resolvePeopleDbPath === 'function') {
      return window.App.resolvePeopleDbPath(clean);
    }
    if (!clean) {
      return 'data/Genepedia-Database/people';
    }
    if (clean.startsWith('data/Genepedia-Database/people/')) {
      return clean;
    }
    if (clean === 'data/Genepedia-Database') {
      return 'data/Genepedia-Database/people';
    }
    if (clean.startsWith('data/Genepedia-Database/')) {
      return `data/Genepedia-Database/people/${clean.slice('data/Genepedia-Database/'.length)}`;
    }
    if (clean.startsWith('data/people/')) {
      return `data/Genepedia-Database/people/${clean.slice('data/people/'.length)}`;
    }
    return `data/Genepedia-Database/people/${clean}`;
  }

  async function fetchOwnershipConfig(personId) {
    const id = String(personId || '').trim();
    if (!id) {
      return null;
    }
    return fetchJsonIfExists(resolvePeopleDbPath(`ownership/${personDbBucket(id)}/${id}.json`));
  }

  async function fetchPersonRecord(personId) {
    const id = String(personId || '').trim();
    if (!id) {
      return null;
    }
    return fetchJsonIfExists(resolvePeopleDbPath(`persons/${personDbBucket(id)}/${id}.json`));
  }

  async function fetchJsonIfExists(path) {
    const url = resolveSiteUrl(path);
    if (!url) {
      return null;
    }

    try {
      const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) {
        return null;
      }
      const payload = await response.json();
      return payload && typeof payload === 'object' ? payload : null;
    } catch (error) {
      return null;
    }
  }

  async function fetchChangesPeopleMetadata(paths) {
    const personId = getProfileIdFromPaths(paths);
    if (personId) {
      const profile = await fetchOwnershipConfig(personId);
      return {
        type: 'profile',
        personId,
        config: profile || {},
      };
    }

    const pageConfigPath = getPageOwnershipConfigPath(paths);
    if (pageConfigPath) {
      const pageConfig = await fetchJsonIfExists(pageConfigPath);
      return {
        type: 'page',
        config: pageConfig || {},
      };
    }

    return {
      type: 'page',
      config: {},
    };
  }

  async function fetchPullRequestDetail(number, repo = '') {
    const url = resolvePullRequestDetailApiUrl(number, repo);
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(
      url,
      window.App?.getGitHubFetchInit?.() || { credentials: 'include' },
    );
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Failed to load pull request #${number}`);
    }

    return payload;
  }

  async function submitPullRequestReview(number, action, repo = '') {
    const url = resolvePullRequestReviewApiUrl(repo);
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const response = await fetch(url, window.App?.getGitHubFetchInit?.({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number, action, repo }),
    }) || {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number, action, repo }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Failed to ${action} pull request #${number}`);
    }

    return payload;
  }

  async function fetchMaintainerState(sourcePathOrPaths) {
    const url = resolveMaintainersApiUrl(sourcePathOrPaths);
    if (!url) {
      return {
        items: [],
        can_manage: false,
        is_maintainer: false,
        current_user: null,
      };
    }

    const response = await fetch(
      url,
      window.App?.getGitHubFetchInit?.() || { credentials: 'include' },
    );
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Failed to load maintainer access (${response.status})`);
    }

    return payload;
  }

  async function submitMaintainerAction(sourcePathOrPaths, actionPayload) {
    const url = resolveMaintainersApiUrl(sourcePathOrPaths);
    if (!url) {
      throw new Error('GitHub API base is not configured.');
    }

    const paths = normalizeSourcePaths(sourcePathOrPaths);
    const response = await fetch(url, window.App?.getGitHubFetchInit?.({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...actionPayload,
        paths,
      }),
    }) || {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...actionPayload,
        paths,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || `Failed to update maintainer access (${response.status})`);
    }

    return payload;
  }

  function renderPendingReviewActions(number, canReview, repo = '') {
    if (!canReview) {
      return '';
    }

    return `
      <div class="page-changes__pending-actions">
        <button type="button" class="page-changes__pending-button page-changes__pending-button--approve" data-pr-action="merge" data-pr-number="${number}" data-pr-repo="${escapeHtml(String(repo || ''))}">
          <i class="bi bi-check2-circle" aria-hidden="true"></i>
          <span>Approve &amp; merge</span>
        </button>
        <button type="button" class="page-changes__pending-button page-changes__pending-button--decline" data-pr-action="decline" data-pr-number="${number}" data-pr-repo="${escapeHtml(String(repo || ''))}">
          <i class="bi bi-x-circle" aria-hidden="true"></i>
          <span>Decline</span>
        </button>
      </div>
    `;
  }

  function renderPendingPullRequestRow(pullRequest, canReview) {
    const author = pullRequest?.user || {};
    const authorLabel = author.displayName || author.login || 'Unknown author';
    const githubUrl = pullRequest?.url || '';
    const stats = pullRequest?.changed_files
      ? `<span class="page-changes__pending-stats">${pullRequest.changed_files} file(s), +${pullRequest.additions} / −${pullRequest.deletions}</span>`
      : '';

    return `
      <li class="page-changes__pending-item">
        <details class="page-changes__details page-changes__pending-details" data-pr-number="${pullRequest.number}" data-pr-repo="${escapeHtml(String(pullRequest.repo || ''))}">
          <summary class="page-changes__pending-summary">
            <span class="page-changes__pending-title">
              <span class="page-changes__pending-number">#${escapeHtml(String(pullRequest.number))}</span>
              <span class="page-changes__pending-subject">${escapeHtml(pullRequest.title || 'Untitled change')}</span>
            </span>
            <span class="page-changes__pending-meta">
              <span>${escapeHtml(authorLabel)}</span>
              <span>${escapeHtml(formatCommitDate(pullRequest.updated_at || pullRequest.created_at))}</span>
              ${stats}
            </span>
          </summary>
          <div class="page-changes__pending-body">
            <p class="page-changes__hint">
              Proposed page edit waiting for review.
              ${githubUrl ? `<a href="${escapeHtml(githubUrl)}" target="_blank" rel="noopener noreferrer">View on GitHub</a>` : ''}
            </p>
            <div class="page-changes__diff-panel page-changes__pending-diff-panel" data-loaded="false"></div>
            ${renderPendingReviewActions(pullRequest.number, canReview, pullRequest.repo || '')}
          </div>
        </details>
      </li>
    `;
  }

  function renderPendingEditsSection(pendingPayload) {
    const pullRequests = Array.isArray(pendingPayload?.pull_requests)
      ? pendingPayload.pull_requests
      : [];
    const canReview = Boolean(pendingPayload?.can_review);
    const intro = pullRequests.length
      ? (canReview
        ? '<p class="page-changes__hint">These edits are not merged yet. Only you can approve or decline them.</p>'
        : `<p class="page-changes__hint">These edits are waiting for review by ${escapeHtml(pendingPayload?.review_login || 'the site reviewer')}.</p>`)
      : '';
    const body = pullRequests.length
      ? `<ol class="page-changes__pending-list">
          ${pullRequests.map((pullRequest) => renderPendingPullRequestRow(pullRequest, canReview)).join('')}
        </ol>`
      : '<p class="page-changes__empty">No pending changes right now.</p>';

    return `
      <section class="page-changes__pending" aria-label="Pending edits">
        ${intro}
        ${body}
      </section>
    `;
  }

  function resolvePersonProfileUrl(personId) {
    const id = String(personId || '').trim();
    if (!id) {
      return '';
    }

    if (window.PeopleRegistry?.resolvePersonProfileUrl) {
      return window.PeopleRegistry.resolvePersonProfileUrl(id);
    }

    return resolveSiteUrl(`people/${id}/index.html`);
  }

  async function loadPeopleRegistry() {
    if (window.PeopleRegistry?.loadPeopleRegistry) {
      return window.PeopleRegistry.loadPeopleRegistry();
    }

    try {
      const response = await fetch(resolveSiteUrl('people/people.json'), { cache: 'no-store' });
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data?.people) ? data.people : [];
    } catch (error) {
      return [];
    }
  }

  const personProfileStatusCache = new Map();
  const personOwnerCache = new Map();

  function getPersonDisplayName(entry) {
    return [entry?.firstName, entry?.lastName].filter(Boolean).join(' ').trim();
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function scorePersonEntry(query, entry) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return 0;
    }

    const firstName = normalizeSearchText(entry?.firstName);
    const lastName = normalizeSearchText(entry?.lastName);
    const fullName = normalizeSearchText(getPersonDisplayName(entry));
    const id = String(entry?.id || '').toLowerCase();
    let score = 0;

    if (fullName === normalizedQuery || id === normalizedQuery) {
      score = Math.max(score, 120);
    }

    if (
      fullName.startsWith(normalizedQuery)
      || firstName.startsWith(normalizedQuery)
      || lastName.startsWith(normalizedQuery)
      || id.startsWith(normalizedQuery)
    ) {
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

  async function fetchPersonProfileStatus(personId) {
    const id = String(personId || '').trim();
    if (!id) {
      return 'unknown';
    }

    if (personProfileStatusCache.has(id)) {
      return personProfileStatusCache.get(id);
    }

    const promise = (async () => {
      try {
        const record = await fetchPersonRecord(id);
        if (!record || typeof record !== 'object') {
          return 'unknown';
        }
        if (record.living === true) {
          return 'living';
        }
        if (record.events && record.events.death) {
          return 'deceased';
        }
        return 'unknown';
      } catch (error) {
        return 'unknown';
      }
    })();

    personProfileStatusCache.set(id, promise);
    return promise;
  }

  async function isPersonLiving(personId) {
    return (await fetchPersonProfileStatus(personId)) === 'living';
  }

  function normalizeOwnerEntry(owner) {
    if (!owner || typeof owner !== 'object') {
      return null;
    }

    const personId = String(owner.personId || owner.person_id || '').trim();
    const login = String(owner.githubLogin || owner.github_login || owner.login || '').trim();
    if (!personId && !login) {
      return null;
    }

    return { personId, login };
  }

  async function fetchPersonHasOwner(personId) {
    const id = String(personId || '').trim();
    if (!id) {
      return false;
    }

    if (personOwnerCache.has(id)) {
      return personOwnerCache.get(id);
    }

    const promise = (async () => {
      try {
        const config = await fetchOwnershipConfig(id);
        if (!config) {
          return false;
        }

        if (normalizeOwnerEntry(config?.owner)) {
          return true;
        }

        if (Array.isArray(config?.owners)) {
          return config.owners.some((entry) => normalizeOwnerEntry(entry));
        }

        return false;
      } catch (error) {
        return false;
      }
    })();

    personOwnerCache.set(id, promise);
    return promise;
  }

  async function isPersonInvitableAsMaintainer(personId) {
    const [living, hasOwner] = await Promise.all([
      isPersonLiving(personId),
      fetchPersonHasOwner(personId),
    ]);
    return living && hasOwner;
  }

  async function getPersonMaintainerInviteLogin(personId) {
    const config = await fetchOwnershipConfig(personId);
    const owners = [
      config?.owner,
      ...(Array.isArray(config?.owners) ? config.owners : []),
    ];
    return owners
      .map(normalizeOwnerEntry)
      .find((owner) => owner?.login)?.login || '';
  }

  async function searchInvitableMaintainerPeople(query, { limit = 8, candidateLimit = 24 } = {}) {
    const people = await loadPeopleRegistry();
    const scored = people
      .map((entry) => ({
        entry,
        score: scorePersonEntry(query, entry),
        url: resolvePersonProfileUrl(entry?.id),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => (
        b.score - a.score
        || getPersonDisplayName(a.entry).localeCompare(getPersonDisplayName(b.entry))
      ))
      .slice(0, candidateLimit);

    const eligibleMatches = await Promise.all(scored.map(async (result) => {
      const personId = result.entry?.id;
      const [status, hasOwner] = await Promise.all([
        fetchPersonProfileStatus(personId),
        fetchPersonHasOwner(personId),
      ]);
      return status === 'living' && hasOwner ? result : null;
    }));

    return eligibleMatches
      .filter(Boolean)
      .sort((a, b) => (
        b.score - a.score
        || getPersonDisplayName(a.entry).localeCompare(getPersonDisplayName(b.entry))
      ))
      .slice(0, limit);
  }

  async function loadPeopleLoginDirectory() {
    if (window.__peopleLoginDirectoryPromise) {
      return window.__peopleLoginDirectoryPromise;
    }

    window.__peopleLoginDirectoryPromise = (async () => {
      const directory = new Map();

      try {
        const logins = window.App?.loadOwnershipLoginIndex
          ? await window.App.loadOwnershipLoginIndex()
          : await fetchJsonIfExists(resolvePeopleDbPath('index/ownership-logins.json')).then((payload) => payload?.logins || {});
        Object.entries(logins || {}).forEach(([login, personId]) => {
          const cleanLogin = String(login || '').trim().toLowerCase();
          const cleanPersonId = String(personId || '').trim();
          if (cleanLogin && cleanPersonId && !directory.has(cleanLogin)) {
            directory.set(cleanLogin, cleanPersonId);
          }
        });
      } catch (error) {
        console.warn('Could not build the people login directory', error);
      }

      return directory;
    })();

    return window.__peopleLoginDirectoryPromise;
  }

  async function loadPersonCard(personId) {
    const id = String(personId || '').trim();
    if (!id) {
      return null;
    }

    window.__personCardCache = window.__personCardCache || new Map();
    if (window.__personCardCache.has(id)) {
      return window.__personCardCache.get(id);
    }

    const promise = (async () => {
      const card = {
        personId: id,
        profileUrl: resolvePersonProfileUrl(id),
        name: '',
        photoUrl: '',
      };

      try {
        const people = await loadPeopleRegistry();
        const entry = people.find((person) => String(person?.id) === id);
        if (entry) {
          card.name = String(entry.displayName || '').trim()
            || [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim();
        }
      } catch (error) {
        // keep fallback name
      }

      try {
        const record = await fetchPersonRecord(id);
        const primary = record?.media?.primary;
        if (typeof window.App?.resolvePreferredPersonMediaUrl === 'function') {
          card.photoUrl = String(window.App.resolvePreferredPersonMediaUrl(id, primary) || '');
        } else if (primary?.local) {
          card.photoUrl = resolveSiteUrl(`people/${id}/${String(primary.local).replace(/^\.?\//, '')}`);
        } else if (primary?.remote) {
          card.photoUrl = primary.remote;
        }
        if (!card.name && record?.names?.display) {
          card.name = record.names.display;
        }
      } catch (error) {
        // no portrait available
      }

      return card;
    })();

    window.__personCardCache.set(id, promise);
    return promise;
  }

  async function enrichPersonIdentity(person, directory) {
    if (!person) {
      return person;
    }

    let personId = String(person.personId || '').trim();
    if (!personId && person.login) {
      personId = directory.get(String(person.login).toLowerCase()) || '';
    }

    if (!personId) {
      return person;
    }

    const card = await loadPersonCard(personId);
    if (!card) {
      return {
        ...person,
        personId,
        url: resolvePersonProfileUrl(personId),
      };
    }

    return {
      ...person,
      personId,
      name: card.name || person.name || person.login,
      url: card.profileUrl || resolvePersonProfileUrl(personId),
      photoUrl: card.photoUrl || person.photoUrl || '',
    };
  }

  async function enrichChangesPeopleModel(peopleModel) {
    const directory = await loadPeopleLoginDirectory();
    const enrichGroup = (people) => Promise.all(
      (Array.isArray(people) ? people : []).map((person) => enrichPersonIdentity(person, directory)),
    );

    const [creators, owners, maintainers, contributors] = await Promise.all([
      enrichGroup(peopleModel.creators),
      enrichGroup(peopleModel.owners),
      enrichGroup(peopleModel.maintainers),
      enrichGroup(peopleModel.contributors),
    ]);

    return {
      creators,
      owners,
      maintainers,
      contributors,
    };
  }

  function normalizePersonIdentity(identity, fallbackRole = '') {
    if (!identity) {
      return null;
    }

    if (typeof identity === 'string') {
      const login = identity.trim();
      return login ? {
        key: login.toLowerCase(),
        login,
        name: login,
        personId: '',
        url: `https://github.com/${encodeURIComponent(login)}`,
        photoUrl: '',
        role: fallbackRole,
      } : null;
    }

    const login = String(identity.githubLogin || identity.github_login || identity.login || '').trim();
    const name = String(identity.name || identity.displayName || identity.author || login || '').trim();
    const personId = String(identity.personId || identity.person_id || '').trim();
    const profileUrl = personId ? resolvePersonProfileUrl(personId) : '';
    const url = profileUrl || String(
      identity.profileUrl || identity.author_url || identity.html_url || (login ? `https://github.com/${login}` : ''),
    ).trim();
    const key = (login || name).toLowerCase();
    if (!key) {
      return null;
    }

    return {
      key,
      login,
      name: name || login,
      personId,
      url,
      photoUrl: String(identity.photoUrl || identity.photo_url || '').trim(),
      role: fallbackRole,
    };
  }

  function normalizeIdentityList(value, role) {
    const rawItems = Array.isArray(value) ? value : [value];
    return rawItems
      .map((item) => normalizePersonIdentity(item, role))
      .filter(Boolean);
  }

  function uniquePeople(people) {
    const seen = new Set();
    const result = [];
    people.forEach((person) => {
      const key = String(person?.key || '').toLowerCase();
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      result.push(person);
    });
    return result;
  }

  function personFromCommit(commit) {
    const login = String(commit?.author_login || '').trim();
    const name = String(commit?.author || login || '').trim();
    const url = String(commit?.author_url || (login ? `https://github.com/${login}` : '')).trim();
    return normalizePersonIdentity({ login, name, profileUrl: url }, 'Contributor');
  }

  function personFromPullRequest(pullRequest) {
    const user = pullRequest?.user || {};
    const login = String(user.login || '').trim();
    const name = String(user.displayName || login || '').trim();
    const url = String(user.profileUrl || (login ? `https://github.com/${login}` : '')).trim();
    return normalizePersonIdentity({ login, name, profileUrl: url }, 'Contributor');
  }

  function oldestCommit(commits) {
    const items = Array.isArray(commits) ? commits.filter(Boolean) : [];
    if (!items.length) {
      return null;
    }

    return items[items.length - 1];
  }

  function buildChangesPeopleModel(commits, pendingPayload, metadata) {
    const config = metadata?.config || {};
    const creators = uniquePeople([
      ...normalizeIdentityList(config.creator, 'Creator'),
      ...normalizeIdentityList(config.createdBy || config.created_by, 'Creator'),
    ]);
    if (!creators.length) {
      const fallbackCreator = personFromCommit(oldestCommit(commits));
      if (fallbackCreator) {
        creators.push({ ...fallbackCreator, role: 'Creator' });
      }
    }

    const owners = uniquePeople([
      ...normalizeIdentityList(config.owner, 'Owner'),
      ...normalizeIdentityList(config.owners, 'Owner'),
      ...normalizeIdentityList(config.ownedBy || config.owned_by, 'Owner'),
    ]);

    const maintainers = uniquePeople([
      ...normalizeIdentityList(config.maintainers, 'Maintainer'),
      ...normalizeIdentityList(config.maintainedBy || config.maintained_by, 'Maintainer'),
    ]);

    const managerKeys = new Set(
      [...creators, ...owners, ...maintainers]
        .map((person) => person.key)
        .filter(Boolean),
    );

    const pendingPullRequests = Array.isArray(pendingPayload?.pull_requests)
      ? pendingPayload.pull_requests
      : [];
    const contributors = uniquePeople([
      ...(Array.isArray(commits) ? commits.map(personFromCommit) : []),
      ...pendingPullRequests.map(personFromPullRequest),
    ].filter(Boolean))
      .filter((person) => !managerKeys.has(person.key));

    return {
      creators,
      owners,
      maintainers,
      contributors,
    };
  }

  function renderPersonRow(person, label) {
    const name = escapeHtml(person?.name || person?.login || 'Unknown');
    const login = String(person?.login || '').trim();
    const loginMarkup = login ? `<span class="page-changes__person-login">@${escapeHtml(login)}</span>` : '';
    const roleMarkup = label ? `<span class="page-changes__person-role">${escapeHtml(label)}</span>` : '';
    const isSiteProfile = Boolean(person?.personId);
    const nameMarkup = person?.url
      ? `<a class="page-changes__person-name" href="${escapeHtml(person.url)}"${isSiteProfile ? '' : ' target="_blank" rel="noopener noreferrer"'}>${name}</a>`
      : `<span class="page-changes__person-name">${name}</span>`;
    const photoUrl = String(person?.photoUrl || '').trim();
    const avatarMarkup = photoUrl
      ? `<img class="page-changes__person-avatar" src="${escapeHtml(photoUrl)}" alt="" loading="lazy">`
      : `<span class="page-changes__person-avatar" aria-hidden="true">${escapeHtml((person?.name || person?.login || '?').trim().slice(0, 1).toUpperCase() || '?')}</span>`;

    return `
      <li class="page-changes__person">
        ${avatarMarkup}
        <span class="page-changes__person-main">
          ${nameMarkup}
          ${loginMarkup}
        </span>
        ${roleMarkup}
      </li>
    `;
  }

  function getMaintainerStateItems(maintainerState) {
    return Array.isArray(maintainerState?.items)
      ? maintainerState.items.filter((item) => item && item.status === 'pending')
      : [];
  }

  function getCurrentMaintainerLogin(maintainerState) {
    return String(
      maintainerState?.current_user?.login
      || maintainerState?.current_user?.githubLogin
      || '',
    ).trim().toLowerCase();
  }

  function maintainerItemLogin(item) {
    return String(item?.person?.githubLogin || item?.person?.login || '').trim().toLowerCase();
  }

  function hasPendingMaintainerRequest(maintainerState) {
    const login = getCurrentMaintainerLogin(maintainerState);
    if (!login) {
      return false;
    }

    return getMaintainerStateItems(maintainerState).some((item) => (
      item.kind === 'request' && maintainerItemLogin(item) === login
    ));
  }

  function renderMaintainerActionButton(action, id, label, modifier = '') {
    return `
      <button
        type="button"
        class="page-changes__maintainer-button${modifier ? ` ${modifier}` : ''}"
        data-maintainer-action="${escapeHtml(action)}"
        ${id ? `data-maintainer-id="${escapeHtml(id)}"` : ''}
      >${escapeHtml(label)}</button>
    `;
  }

  function renderMaintainerQueueItem(item, maintainerState) {
    const person = normalizePersonIdentity(item?.person, item?.kind === 'invite' ? 'Invited' : 'Requested')
      || normalizePersonIdentity('Unknown', '');
    const kind = String(item?.kind || '');
    const id = String(item?.id || '');
    const currentLogin = getCurrentMaintainerLogin(maintainerState);
    const itemLogin = maintainerItemLogin(item);
    const canManage = Boolean(maintainerState?.can_manage);
    const isOwnInvite = kind === 'invite' && currentLogin && itemLogin === currentLogin;
    const label = kind === 'invite' ? 'Invited' : 'Requested';
    let actions = '';

    if (kind === 'request' && canManage) {
      actions = `
        ${renderMaintainerActionButton('approve', id, 'Accept', 'page-changes__maintainer-button--approve')}
        ${renderMaintainerActionButton('decline', id, 'Decline')}
      `;
    } else if (isOwnInvite) {
      actions = `
        ${renderMaintainerActionButton('accept_invite', id, 'Accept', 'page-changes__maintainer-button--approve')}
        ${renderMaintainerActionButton('decline_invite', id, 'Decline')}
      `;
    } else if (kind === 'invite' && canManage) {
      actions = renderMaintainerActionButton('cancel', id, 'Cancel');
    }

    return `
      <li class="page-changes__maintainer-item">
        <ul class="page-changes__people-list">
          ${renderPersonRow(person, label)}
        </ul>
        ${actions ? `<div class="page-changes__maintainer-actions">${actions}</div>` : ''}
      </li>
    `;
  }

  function renderMaintainerHeadingActions(maintainerState) {
    if (!maintainerState?.can_manage) {
      return '';
    }

    return `
      <button
        type="button"
        class="page-changes__maintainer-invite-open"
        data-maintainer-invite-open
        aria-label="Invite maintainer"
        title="Invite maintainer"
      >
        <i class="bi bi-person-plus" aria-hidden="true"></i>
      </button>
    `;
  }

  function renderMaintainerInviteDialog(maintainerState) {
    if (!maintainerState?.can_manage) {
      return '';
    }

    return `
      <div class="page-changes__maintainer-dialog" data-maintainer-invite-dialog hidden aria-hidden="true">
        <div class="page-changes__maintainer-dialog-backdrop" data-maintainer-invite-close></div>
        <div
          class="page-changes__maintainer-dialog-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-changes-maintainer-invite-title"
        >
          <header class="page-changes__maintainer-dialog-header">
            <h4 id="page-changes-maintainer-invite-title" class="page-changes__maintainer-dialog-title">Invite maintainer</h4>
            <button
              type="button"
              class="page-changes__maintainer-dialog-close"
              data-maintainer-invite-close
              aria-label="Close"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>
          <p class="page-changes__maintainer-dialog-intro">
            Search for a living profile with a claimed owner.
          </p>
          <form class="page-changes__maintainer-form page-changes__maintainer-form--dialog" data-maintainer-invite-form>
            <div class="page-changes__maintainer-search" data-maintainer-person-search-wrap>
              <label class="screen-reader-text" for="page-changes-maintainer-person">Profile to invite</label>
              <input
                id="page-changes-maintainer-person"
                class="page-changes__maintainer-input"
                type="search"
                inputmode="search"
                autocomplete="off"
                placeholder="Search profiles"
                data-maintainer-person-search
                role="combobox"
                aria-expanded="false"
                aria-controls="page-changes-maintainer-person-list"
                aria-autocomplete="list"
              >
              <input type="hidden" name="person_id" value="">
              <ul
                class="page-changes__maintainer-search-results"
                id="page-changes-maintainer-person-list"
                data-maintainer-person-search-results
                role="listbox"
                hidden
              ></ul>
            </div>
            <div class="page-changes__maintainer-dialog-actions">
              <button type="button" class="page-changes__maintainer-button" data-maintainer-invite-close>
                Cancel
              </button>
              <button type="submit" class="page-changes__maintainer-button page-changes__maintainer-button--approve">
                Send invite
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderMaintainerWorkflow(maintainerState) {
    if (!maintainerState) {
      return '';
    }

    const pendingItems = getMaintainerStateItems(maintainerState);
    const queue = pendingItems.length
      ? `<ul class="page-changes__maintainer-list">
          ${pendingItems.map((item) => renderMaintainerQueueItem(item, maintainerState)).join('')}
        </ul>`
      : '<p class="page-changes__empty">No maintainer invitations or requests are pending.</p>';
    const error = maintainerState.error
      ? `<p class="page-changes__status">${escapeHtml(maintainerState.error)}</p>`
      : '';
    const isMaintainer = Boolean(maintainerState.is_maintainer);
    const isLoggedIn = Boolean(getCurrentMaintainerLogin(maintainerState));
    let requestControl = '';
    if (!isMaintainer) {
      if (!isLoggedIn) {
        requestControl = '<p class="page-changes__hint">Sign in with GitHub from the site header to request maintainer access.</p>';
      } else if (hasPendingMaintainerRequest(maintainerState)) {
        requestControl = '<button type="button" class="page-changes__maintainer-button" disabled>Request pending</button>';
      } else {
        requestControl = renderMaintainerActionButton('request', '', 'Request to be a maintainer', 'page-changes__maintainer-button--approve');
      }
    }
    const toolbar = requestControl
      ? `<div class="page-changes__maintainer-toolbar">${requestControl}</div>`
      : '';

    return `
      <div class="page-changes__maintainer-workflow">
        ${error}
        ${toolbar}
        ${queue}
      </div>
    `;
  }

  function renderPeopleGroup(title, people, emptyText, label, fullWidth = false, extraContent = '', headingActions = '') {
    const body = people.length
      ? `<ul class="page-changes__people-list">${people.map((person) => renderPersonRow(person, label)).join('')}</ul>`
      : `<p class="page-changes__empty">${escapeHtml(emptyText)}</p>`;
    const headingMarkup = headingActions
      ? `<div class="page-changes__people-heading-row">
          <h3 class="page-changes__people-heading">${escapeHtml(title)}</h3>
          ${headingActions}
        </div>`
      : `<h3 class="page-changes__people-heading">${escapeHtml(title)}</h3>`;

    return `
      <section class="page-changes__people-group${fullWidth ? ' page-changes__people-group--full' : ''}">
        ${headingMarkup}
        ${body}
        ${extraContent}
      </section>
    `;
  }

  function renderPeoplePanel(peopleModel, maintainerState = null) {
    return `
      <section class="page-changes__people" aria-label="People">
        <div class="page-changes__people-grid">
          ${renderPeopleGroup('Created By', peopleModel.creators, 'No creator metadata was found.', 'Creator')}
          ${renderPeopleGroup('Owners', peopleModel.owners, 'No claimed owner is listed yet.', 'Owner')}
          ${renderPeopleGroup(
      'Maintainers',
      peopleModel.maintainers,
      'No maintainers are listed yet.',
      'Maintainer',
      false,
      renderMaintainerInviteDialog(maintainerState) + renderMaintainerWorkflow(maintainerState),
      renderMaintainerHeadingActions(maintainerState),
    )}
          ${renderPeopleGroup('Contributors', peopleModel.contributors, 'No separate contributors yet.', 'Contributor', true)}
        </div>
      </section>
    `;
  }

  const HIGHLIGHT_JS_BASE = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build';
  let highlightJsPromise = null;

  function isDarkThemeActive() {
    return document.body?.classList.contains('theme-dark');
  }

  function getHighlightThemeUrl() {
    return isDarkThemeActive()
      ? `${HIGHLIGHT_JS_BASE}/styles/github-dark.min.css`
      : `${HIGHLIGHT_JS_BASE}/styles/github.min.css`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', reject, { once: true });
        if (existing.dataset.loaded === 'true') {
          resolve();
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function ensureHighlightStylesheet() {
    const href = getHighlightThemeUrl();
    let link = document.getElementById('page-changes-hljs-theme');
    if (!link) {
      link = document.createElement('link');
      link.id = 'page-changes-hljs-theme';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) {
      link.setAttribute('href', href);
    }
  }

  function ensureHighlightJs() {
    if (window.hljs?.highlight) {
      ensureHighlightStylesheet();
      return Promise.resolve(window.hljs);
    }

    if (!highlightJsPromise) {
      highlightJsPromise = loadScript(`${HIGHLIGHT_JS_BASE}/highlight.min.js`)
        .then(() => loadScript(`${HIGHLIGHT_JS_BASE}/languages/xml.min.js`))
        .then(() => loadScript(`${HIGHLIGHT_JS_BASE}/languages/javascript.min.js`))
        .then(() => loadScript(`${HIGHLIGHT_JS_BASE}/languages/css.min.js`))
        .then(() => loadScript(`${HIGHLIGHT_JS_BASE}/languages/json.min.js`))
        .then(() => {
          ensureHighlightStylesheet();
          return window.hljs;
        })
        .catch((error) => {
          highlightJsPromise = null;
          throw error;
        });
    }

    return highlightJsPromise;
  }

  function getLanguageFromPath(filePath) {
    const path = String(filePath || '').toLowerCase();
    if (path.endsWith('.html') || path.endsWith('.htm')) {
      return 'xml';
    }
    if (path.endsWith('.css')) {
      return 'css';
    }
    if (path.endsWith('.js') || path.endsWith('.mjs')) {
      return 'javascript';
    }
    if (path.endsWith('.json')) {
      return 'json';
    }
    return 'plaintext';
  }

  function highlightCodeLine(text, language) {
    const value = String(text ?? '');
    if (!value) {
      return '&nbsp;';
    }

    if (!window.hljs?.highlight) {
      return escapeHtml(value);
    }

    try {
      if (language !== 'plaintext' && window.hljs.getLanguage(language)) {
        return window.hljs.highlight(value, { language }).value;
      }
    } catch (error) {
      // fall through to escaped text
    }

    return escapeHtml(value);
  }

  function emptyDiffCell() {
    return { line: '', text: '', change: 'empty' };
  }

  function parseUnifiedPatch(patch) {
    const hunks = [];
    let current = null;

    for (const rawLine of String(patch || '').split('\n')) {
      if (rawLine.startsWith('@@')) {
        const match = rawLine.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          current = {
            oldStart: Number(match[1]),
            newStart: Number(match[3]),
            lines: [],
          };
          hunks.push(current);
        }
        continue;
      }

      if (!current || rawLine.startsWith('+++') || rawLine.startsWith('---')) {
        continue;
      }

      if (rawLine === '\\ No newline at end of file') {
        continue;
      }

      const prefix = rawLine[0];
      if (prefix === ' ' || prefix === '-' || prefix === '+') {
        current.lines.push({
          type: prefix === ' ' ? 'context' : prefix === '-' ? 'delete' : 'add',
          text: rawLine.slice(1),
        });
      }
    }

    return hunks;
  }

  function rowsFromHunk(hunk) {
    const rows = [];
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;

    for (let index = 0; index < hunk.lines.length; index += 1) {
      const line = hunk.lines[index];

      if (line.type === 'context') {
        rows.push({
          before: { line: oldLine, text: line.text, change: 'context' },
          after: { line: newLine, text: line.text, change: 'context' },
        });
        oldLine += 1;
        newLine += 1;
        continue;
      }

      if (line.type === 'delete') {
        const dels = [];
        const adds = [];
        let cursor = index;

        while (cursor < hunk.lines.length && hunk.lines[cursor].type === 'delete') {
          dels.push({
            line: oldLine,
            text: hunk.lines[cursor].text,
            change: 'delete',
          });
          oldLine += 1;
          cursor += 1;
        }

        while (cursor < hunk.lines.length && hunk.lines[cursor].type === 'add') {
          adds.push({
            line: newLine,
            text: hunk.lines[cursor].text,
            change: 'add',
          });
          newLine += 1;
          cursor += 1;
        }

        const count = Math.max(dels.length, adds.length, 1);
        for (let offset = 0; offset < count; offset += 1) {
          rows.push({
            before: dels[offset] || emptyDiffCell(),
            after: adds[offset] || emptyDiffCell(),
          });
        }

        index = cursor - 1;
        continue;
      }

      if (line.type === 'add') {
        rows.push({
          before: emptyDiffCell(),
          after: { line: newLine, text: line.text, change: 'add' },
        });
        newLine += 1;
      }
    }

    return rows;
  }

  function diffLinesFallback(beforeText, afterText) {
    const beforeLines = String(beforeText || '').split('\n');
    const afterLines = String(afterText || '').split('\n');
    const rowCount = beforeLines.length;
    const colCount = afterLines.length;

    if (rowCount * colCount > 250000) {
      return [];
    }

    const lcs = Array.from({ length: rowCount + 1 }, () => Array(colCount + 1).fill(0));
    for (let i = rowCount - 1; i >= 0; i -= 1) {
      for (let j = colCount - 1; j >= 0; j -= 1) {
        if (beforeLines[i] === afterLines[j]) {
          lcs[i][j] = lcs[i + 1][j + 1] + 1;
        } else {
          lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
      }
    }

    const rows = [];
    let i = 0;
    let j = 0;
    let oldLine = 1;
    let newLine = 1;

    while (i < rowCount && j < colCount) {
      if (beforeLines[i] === afterLines[j]) {
        rows.push({
          before: { line: oldLine, text: beforeLines[i], change: 'context' },
          after: { line: newLine, text: afterLines[j], change: 'context' },
        });
        i += 1;
        j += 1;
        oldLine += 1;
        newLine += 1;
      } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
        rows.push({
          before: { line: oldLine, text: beforeLines[i], change: 'delete' },
          after: emptyDiffCell(),
        });
        i += 1;
        oldLine += 1;
      } else {
        rows.push({
          before: emptyDiffCell(),
          after: { line: newLine, text: afterLines[j], change: 'add' },
        });
        j += 1;
        newLine += 1;
      }
    }

    while (i < rowCount) {
      rows.push({
        before: { line: oldLine, text: beforeLines[i], change: 'delete' },
        after: emptyDiffCell(),
      });
      i += 1;
      oldLine += 1;
    }

    while (j < colCount) {
      rows.push({
        before: emptyDiffCell(),
        after: { line: newLine, text: afterLines[j], change: 'add' },
      });
      j += 1;
      newLine += 1;
    }

    return rows;
  }

  function rowsFromSingleSide(text, side, change) {
    return String(text || '').split('\n').map((line, index) => ({
      before: side === 'before'
        ? { line: index + 1, text: line, change }
        : emptyDiffCell(),
      after: side === 'after'
        ? { line: index + 1, text: line, change }
        : emptyDiffCell(),
    }));
  }

  function buildSideBySideRows(diff) {
    const hunks = parseUnifiedPatch(diff?.patch);
    if (hunks.length > 0) {
      return hunks.flatMap((hunk) => rowsFromHunk(hunk));
    }

    if (diff?.before && diff?.after) {
      return diffLinesFallback(diff.before, diff.after);
    }

    if (diff?.after) {
      return rowsFromSingleSide(diff.after, 'after', 'add');
    }

    if (diff?.before) {
      return rowsFromSingleSide(diff.before, 'before', 'delete');
    }

    return [];
  }

  function renderDiffCell(side, cell, language) {
    const change = cell?.change || 'context';
    const lineNumber = cell?.line ? String(cell.line) : '';

    if (change === 'empty') {
      return `
        <div class="page-changes__diff-cell is-${side} is-empty" aria-hidden="true">
          <span class="page-changes__diff-lno"></span>
          <pre class="page-changes__diff-line"><code>&nbsp;</code></pre>
        </div>
      `;
    }

    const highlighted = highlightCodeLine(cell.text, language);

    return `
      <div class="page-changes__diff-cell is-${side} is-${change}">
        <span class="page-changes__diff-lno">${escapeHtml(lineNumber)}</span>
        <pre class="page-changes__diff-line"><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre>
      </div>
    `;
  }

  function renderSideBySideDiff(diff, filePath) {
    const language = getLanguageFromPath(filePath || diff?.path);
    const rows = buildSideBySideRows(diff);

    if (!rows.length) {
      return '<p class="page-changes__diff-empty">No line changes are available for this commit.</p>';
    }

    const body = rows.map((row) => `
      <div class="page-changes__diff-row">
        ${renderDiffCell('before', row.before, language)}
        ${renderDiffCell('after', row.after, language)}
      </div>
    `).join('');

    return `
      <div class="page-changes__diff-sidebyside">
        <div class="page-changes__diff-columns">
          <div class="page-changes__diff-column-label">Before</div>
          <div class="page-changes__diff-column-label">After</div>
        </div>
        <div class="page-changes__diff-rows">${body}</div>
      </div>
    `;
  }

  function renderUnifiedDiff(patch) {
    if (!patch) {
      return '<p class="page-changes__diff-empty">No unified diff is available for this change.</p>';
    }

    const lines = String(patch).split('\n').map((line) => {
      let className = 'page-changes__diff-unified-line';
      if (line.startsWith('+++') || line.startsWith('---')) {
        className += ' is-meta';
      } else if (line.startsWith('@@')) {
        className += ' is-hunk';
      } else if (line.startsWith('+')) {
        className += ' is-add';
      } else if (line.startsWith('-')) {
        className += ' is-del';
      }

      return `<div class="${className}">${escapeHtml(line)}</div>`;
    }).join('');

    return `<div class="page-changes__diff-unified">${lines}</div>`;
  }

  function renderDiffPanel(diff, filePath) {
    const additions = Number(diff?.additions || 0);
    const deletions = Number(diff?.deletions || 0);
    const status = escapeHtml(diff?.status || 'modified');
    const path = String(filePath || diff?.path || '');

    return `
      <div class="page-changes__diff">
        <div class="page-changes__diff-toolbar">
          <span class="page-changes__diff-status">${status}</span>
          <span class="page-changes__diff-stats">
            <span class="page-changes__diff-add">+${additions}</span>
            <span class="page-changes__diff-del">−${deletions}</span>
          </span>
        </div>
        <div class="page-changes__diff-views">
          <details class="page-changes__diff-view" open>
            <summary>Before and after</summary>
            ${renderSideBySideDiff(diff, path)}
          </details>
          <details class="page-changes__diff-view">
            <summary>Unified diff</summary>
            ${renderUnifiedDiff(diff?.patch)}
          </details>
        </div>
      </div>
    `;
  }

  function renderDiffPanels(diffs, sourcePathOrPaths) {
    const items = Array.isArray(diffs) ? diffs : [diffs];
    if (items.length === 1) {
      const diff = items[0];
      return renderDiffPanel(diff, diff?.path || normalizeSourcePaths(sourcePathOrPaths)[0] || '');
    }

    return items.map((diff) => `
      <section class="page-changes__file-diff">
        <h3 class="page-changes__file-diff-title"><code>${escapeHtml(diff?.path || '')}</code></h3>
        ${renderDiffPanel(diff, diff?.path || '')}
      </section>
    `).join('');
  }

  function closeMaintainerInviteDialog(dialog) {
    if (!dialog) {
      return;
    }

    dialog.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
    const form = dialog.querySelector('[data-maintainer-invite-form]');
    form?.reset();
    const wrap = dialog.querySelector('[data-maintainer-person-search-wrap]');
    const list = wrap?.querySelector('[data-maintainer-person-search-results]');
    const input = wrap?.querySelector('[data-maintainer-person-search]');
    if (list) {
      list.hidden = true;
      list.innerHTML = '';
    }
    input?.setAttribute('aria-expanded', 'false');
  }

  function openMaintainerInviteDialog(dialog) {
    if (!dialog) {
      return;
    }

    dialog.hidden = false;
    dialog.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(() => {
      dialog.querySelector('[data-maintainer-person-search]')?.focus();
    });
  }

  function bindMaintainerPersonSearch(main) {
    let maintainerSearchToken = 0;

    const closeMaintainerSearchResults = (wrap) => {
      const input = wrap?.querySelector?.('[data-maintainer-person-search]');
      const list = wrap?.querySelector?.('[data-maintainer-person-search-results]');
      if (!list) {
        return;
      }

      list.hidden = true;
      list.innerHTML = '';
      input?.setAttribute('aria-expanded', 'false');
    };

    const clearMaintainerPersonSelection = (form) => {
      const hidden = form?.querySelector?.('[name="person_id"]');
      if (hidden) {
        hidden.value = '';
      }
    };

    const renderMaintainerSearchResults = (list, matches, query) => {
      const trimmedQuery = query.trim();
      if (!matches.length) {
        list.innerHTML = `<li class="page-changes__maintainer-search-empty" role="presentation">${trimmedQuery
            ? `No living, claimed profiles match “${escapeHtml(trimmedQuery)}”.`
            : 'Type to search profiles.'
          }</li>`;
        list.hidden = false;
        return;
      }

      list.innerHTML = matches.map((match, index) => {
        const name = getPersonDisplayName(match.entry) || `Profile ${match.entry.id}`;
        return `
          <li role="presentation">
            <button
              type="button"
              class="page-changes__maintainer-search-option"
              data-maintainer-person-option
              data-person-id="${escapeHtml(String(match.entry.id))}"
              data-person-name="${escapeHtml(name)}"
              role="option"
              data-index="${index}"
            >
              <span class="page-changes__maintainer-search-option-name">${escapeHtml(name)}</span>
              <span class="page-changes__maintainer-search-option-meta">Profile #${escapeHtml(String(match.entry.id))}</span>
            </button>
          </li>
        `;
      }).join('');
      list.hidden = false;
    };

    main.addEventListener('input', async (event) => {
      const input = event.target.closest?.('[data-maintainer-person-search]');
      if (!input || !main.contains(input)) {
        return;
      }

      const wrap = input.closest('[data-maintainer-person-search-wrap]');
      const form = input.closest('[data-maintainer-invite-form]');
      const list = wrap?.querySelector('[data-maintainer-person-search-results]');
      if (!wrap || !form || !list) {
        return;
      }

      clearMaintainerPersonSelection(form);

      const query = input.value.trim();
      const token = ++maintainerSearchToken;

      if (!query) {
        closeMaintainerSearchResults(wrap);
        return;
      }

      list.innerHTML = '<li class="page-changes__maintainer-search-empty" role="presentation">Searching…</li>';
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');

      const matches = await searchInvitableMaintainerPeople(query, { limit: 8 });
      if (token !== maintainerSearchToken) {
        return;
      }

      renderMaintainerSearchResults(list, matches, query);
      input.setAttribute('aria-expanded', 'true');
    });

    main.addEventListener('click', (event) => {
      const openButton = event.target.closest?.('[data-maintainer-invite-open]');
      if (openButton && main.contains(openButton)) {
        event.preventDefault();
        const dialog = main.querySelector('[data-maintainer-invite-dialog]');
        openMaintainerInviteDialog(dialog);
        return;
      }

      const closeButton = event.target.closest?.('[data-maintainer-invite-close]');
      if (closeButton && main.contains(closeButton)) {
        event.preventDefault();
        const dialog = closeButton.closest('[data-maintainer-invite-dialog]')
          || main.querySelector('[data-maintainer-invite-dialog]');
        closeMaintainerInviteDialog(dialog);
        return;
      }

      const option = event.target.closest?.('[data-maintainer-person-option]');
      if (option && main.contains(option)) {
        event.preventDefault();
        const wrap = option.closest('[data-maintainer-person-search-wrap]');
        const form = option.closest('[data-maintainer-invite-form]');
        const input = wrap?.querySelector('[data-maintainer-person-search]');
        const hidden = form?.querySelector('[name="person_id"]');
        if (!input || !hidden) {
          return;
        }

        hidden.value = option.dataset.personId || '';
        input.value = option.dataset.personName || '';
        closeMaintainerSearchResults(wrap);
        input.focus();
        return;
      }

      if (!event.target.closest?.('[data-maintainer-person-search-wrap]')) {
        main.querySelectorAll('[data-maintainer-person-search-wrap]').forEach((wrap) => {
          closeMaintainerSearchResults(wrap);
        });
      }
    });

    main.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const openDialog = main.querySelector('[data-maintainer-invite-dialog]:not([hidden])');
        if (openDialog && main.contains(openDialog)) {
          event.preventDefault();
          closeMaintainerInviteDialog(openDialog);
          return;
        }
      }

      const input = event.target.closest?.('[data-maintainer-person-search]');
      if (!input || !main.contains(input)) {
        return;
      }

      if (event.key === 'Escape') {
        const wrap = input.closest('[data-maintainer-person-search-wrap]');
        closeMaintainerSearchResults(wrap);
        return;
      }

      const wrap = input.closest('[data-maintainer-person-search-wrap]');
      const list = wrap?.querySelector('[data-maintainer-person-search-results]');
      if (!list || list.hidden) {
        return;
      }

      const options = [...list.querySelectorAll('[data-maintainer-person-option]')];
      if (!options.length) {
        return;
      }

      const activeIndex = options.findIndex((option) => option.classList.contains('is-active'));
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = activeIndex < options.length - 1 ? activeIndex + 1 : 0;
        options.forEach((option, index) => {
          option.classList.toggle('is-active', index === nextIndex);
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = activeIndex > 0 ? activeIndex - 1 : options.length - 1;
        options.forEach((option, index) => {
          option.classList.toggle('is-active', index === nextIndex);
        });
      } else if (event.key === 'Enter') {
        const selected = options.find((option) => option.classList.contains('is-active'));
        if (selected) {
          event.preventDefault();
          selected.click();
        }
      }
    });
  }

  function bindChangesView(main, sourcePathOrPaths, onPendingReviewComplete = () => { }, onMaintainersChanged = () => { }) {
    const diffCache = new Map();
    const prDiffCache = new Map();
    bindMaintainerPersonSearch(main);

    const activateChangesSubtab = (button) => {
      const root = button?.closest?.('.page-changes');
      const tab = button?.dataset?.changesTab || '';
      if (!root || !tab) {
        return;
      }

      root.querySelectorAll('[data-changes-tab]').forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        item.tabIndex = isActive ? 0 : -1;
      });

      root.querySelectorAll('[data-changes-panel]').forEach((panel) => {
        const isActive = panel.dataset.changesPanel === tab;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
    };

    main.addEventListener('toggle', async (event) => {
      const details = event.target.closest?.('.page-changes__details');
      if (!details || event.target !== details || !details.open) {
        return;
      }

      const prNumber = Number(details.dataset.prNumber || 0);
      const prRepo = String(details.dataset.prRepo || '').trim();
      const panel = details.querySelector('.page-changes__diff-panel');
      if (!panel || panel.dataset.loaded === 'true' || panel.dataset.loaded === 'loading') {
        return;
      }

      if (prNumber > 0) {
        panel.dataset.loaded = 'loading';
        panel.innerHTML = '<p class="page-changes__status">Loading file changes…</p>';

        try {
          const prCacheKey = `${prRepo}:${prNumber}`;
          let diffs = prDiffCache.get(prCacheKey);
          if (!diffs) {
            const payload = await fetchPullRequestDetail(prNumber, prRepo);
            diffs = Array.isArray(payload.diffs) ? payload.diffs : [];
            prDiffCache.set(prCacheKey, diffs);
          }

          await ensureHighlightJs();
          panel.innerHTML = renderDiffPanels(diffs, sourcePathOrPaths);
          panel.dataset.loaded = 'true';
        } catch (error) {
          panel.dataset.loaded = 'false';
          const message = error?.message || 'Could not load file changes.';
          panel.innerHTML = `<p class="page-changes__status">${escapeHtml(message)}</p>`;
        }

        return;
      }

      const hash = details.dataset.commitHash || '';
      const commitPaths = normalizeSourcePaths(
        details.dataset.commitPaths || sourcePathOrPaths,
      );
      if (!hash) {
        return;
      }

      panel.dataset.loaded = 'loading';
      panel.innerHTML = '<p class="page-changes__status">Loading file changes…</p>';

      try {
        const cacheKey = `${hash}:${commitPaths.join('|')}`;
        let diffs = diffCache.get(cacheKey);
        if (!diffs) {
          diffs = await fetchFileCommitDiff(commitPaths, hash);
          diffCache.set(cacheKey, diffs);
        }

        await ensureHighlightJs();
        panel.innerHTML = renderDiffPanels(diffs, commitPaths);
        panel.dataset.loaded = 'true';
      } catch (error) {
        panel.dataset.loaded = 'false';
        const message = error?.message || 'Could not load file changes.';
        panel.innerHTML = `<p class="page-changes__status">${escapeHtml(message)}</p>`;
      }
    }, true);

    main.addEventListener('click', async (event) => {
      const tabButton = event.target.closest?.('[data-changes-tab]');
      if (tabButton && main.contains(tabButton)) {
        event.preventDefault();
        activateChangesSubtab(tabButton);
        return;
      }

      const maintainerButton = event.target.closest?.('[data-maintainer-action]');
      if (maintainerButton && main.contains(maintainerButton)) {
        event.preventDefault();
        const action = maintainerButton.dataset.maintainerAction || '';
        const id = maintainerButton.dataset.maintainerId || '';
        if (!action) {
          return;
        }

        const needsConfirm = ['approve', 'decline', 'cancel', 'accept_invite', 'decline_invite'].includes(action);
        if (needsConfirm && !window.confirm('Update this maintainer access item?')) {
          return;
        }

        const buttons = main.querySelectorAll('[data-maintainer-action], .page-changes__maintainer-form button');
        buttons.forEach((item) => {
          item.disabled = true;
        });

        try {
          await submitMaintainerAction(sourcePathOrPaths, { action, id });
          await onMaintainersChanged();
        } catch (error) {
          window.alert(error?.message || 'Could not update maintainer access.');
          buttons.forEach((item) => {
            item.disabled = false;
          });
        }
        return;
      }

      const button = event.target.closest?.('[data-pr-action]');
      if (!button || !main.contains(button)) {
        return;
      }

      event.preventDefault();
      const number = Number(button.dataset.prNumber || 0);
      const action = button.dataset.prAction || '';
      const repo = String(button.dataset.prRepo || '').trim();
      if (!number || !action) {
        return;
      }

      const verb = action === 'merge' ? 'approve and merge' : 'decline';
      if (!window.confirm(`Are you sure you want to ${verb} pull request #${number}?`)) {
        return;
      }

      const buttons = main.querySelectorAll('[data-pr-action]');
      buttons.forEach((item) => {
        item.disabled = true;
      });

      try {
        await submitPullRequestReview(number, action, repo);
        prDiffCache.delete(`${repo}:${number}`);
        await onPendingReviewComplete();
      } catch (error) {
        window.alert(error?.message || `Could not ${verb} this pull request.`);
        buttons.forEach((item) => {
          item.disabled = false;
        });
      }
    });

    main.addEventListener('submit', async (event) => {
      const form = event.target.closest?.('[data-maintainer-invite-form]');
      if (!form || !main.contains(form)) {
        return;
      }

      event.preventDefault();
      const formData = new FormData(form);
      const personId = String(formData.get('person_id') || '').trim();
      if (!personId) {
        window.alert('Select a profile from the search results.');
        return;
      }

      if (!(await isPersonInvitableAsMaintainer(personId))) {
        window.alert('You can only invite living profiles that have a claimed owner.');
        return;
      }

      const githubLogin = await getPersonMaintainerInviteLogin(personId);
      if (!githubLogin) {
        window.alert('The selected profile does not have a linked GitHub login to invite.');
        return;
      }

      const dialog = form.closest('[data-maintainer-invite-dialog]');
      const buttons = main.querySelectorAll('[data-maintainer-action], .page-changes__maintainer-form button');
      buttons.forEach((item) => {
        item.disabled = true;
      });

      try {
        await submitMaintainerAction(sourcePathOrPaths, {
          action: 'invite',
          github_login: githubLogin,
        });
        form.reset();
        closeMaintainerInviteDialog(dialog);
        await onMaintainersChanged();
      } catch (error) {
        window.alert(error?.message || 'Could not invite that maintainer.');
        buttons.forEach((item) => {
          item.disabled = false;
        });
      }
    });

    main.addEventListener('keydown', (event) => {
      const current = event.target.closest?.('[data-changes-tab]');
      if (!current || !main.contains(current)) {
        return;
      }

      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }

      const tabs = Array.from(current.closest('[role="tablist"]')?.querySelectorAll('[data-changes-tab]') || []);
      if (!tabs.length) {
        return;
      }

      event.preventDefault();
      const index = tabs.indexOf(current);
      let nextIndex = index;
      if (event.key === 'ArrowLeft') nextIndex = index <= 0 ? tabs.length - 1 : index - 1;
      if (event.key === 'ArrowRight') nextIndex = index >= tabs.length - 1 ? 0 : index + 1;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;

      const next = tabs[nextIndex];
      next?.focus();
      if (next) activateChangesSubtab(next);
    });
  }

  function commitSearchText(commit) {
    return [
      commit?.subject,
      commit?.author,
      commit?.author_login,
      commit?.hash,
      commit?.hash ? commit.hash.slice(0, 7) : '',
      commit?.date,
      formatCommitDate(commit?.date),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function filterCommits(commits, query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) {
      return commits;
    }

    return commits.filter((commit) => commitSearchText(commit).includes(needle));
  }

  function getChangesSearchMetaText(shownCount, totalCount, query) {
    const filter = String(query || '').trim();
    if (!filter) {
      return `${totalCount} commit${totalCount === 1 ? '' : 's'}`;
    }

    if (shownCount === 0) {
      return `No commits match “${filter}”`;
    }

    return `Showing ${shownCount} of ${totalCount} commit${totalCount === 1 ? '' : 's'}`;
  }

  function getCommitLinkUrl(commit, sourcePathOrPaths, repo) {
    const hash = String(commit?.hash || '').trim();
    const paths = Array.isArray(commit?.paths) && commit.paths.length
      ? commit.paths
      : normalizeSourcePaths(sourcePathOrPaths);

    if (paths.length === 1) {
      return getGitHubFileUrl(hash, paths[0], repo);
    }

    if (paths.length > 1) {
      return getGitHubCommitUrl(hash, repo);
    }

    return getGitHubCommitUrl(hash, repo);
  }

  function renderCommitRow(commit, sourcePathOrPaths, repo) {
    const hash = String(commit.hash || '');
    const fileUrl = escapeHtml(getCommitLinkUrl(commit, sourcePathOrPaths, repo));
    const commitUrl = escapeHtml(getGitHubCommitUrl(hash, repo));
    const authorUrl = escapeHtml(getGitHubAuthorUrl(commit));
    const shortHash = escapeHtml(hash.slice(0, 7) || '—');
    const subject = escapeHtml(commit.subject || 'No commit message');
    const author = escapeHtml(commit.author || 'Unknown author');
    const date = escapeHtml(formatCommitDate(commit.date));
    const authorMarkup = authorUrl
      ? `<a class="page-changes__author" href="${authorUrl}" target="_blank" rel="noopener noreferrer">${author}</a>`
      : `<span class="page-changes__author">${author}</span>`;
    const hashMarkup = commitUrl
      ? `<a class="page-changes__hash" href="${commitUrl}" target="_blank" rel="noopener noreferrer"><code>${shortHash}</code></a>`
      : `<code class="page-changes__hash">${shortHash}</code>`;

    const commitPaths = Array.isArray(commit?.paths) && commit.paths.length
      ? commit.paths
      : normalizeSourcePaths(sourcePathOrPaths);

    return `
      <li class="page-changes__item">
        <a class="page-changes__subject" href="${fileUrl}" target="_blank" rel="noopener noreferrer">${subject}</a>
        <div class="page-changes__meta">
          <span class="page-changes__date">${date}</span>
          ${authorMarkup}
          ${hashMarkup}
        </div>
        <details
          class="page-changes__details"
          data-commit-hash="${escapeHtml(hash)}"
          data-commit-paths="${escapeHtml(commitPaths.join(','))}"
        >
          <summary class="page-changes__toggle">Show file changes</summary>
          <div class="page-changes__diff-panel" data-loaded="false"></div>
        </details>
      </li>
    `;
  }

  function renderCommitList(commits, sourcePathOrPaths, repo) {
    return `
      <ol class="page-changes__list">
        ${commits.map((commit) => renderCommitRow(commit, sourcePathOrPaths, repo)).join('')}
      </ol>
    `;
  }

  function renderChangesResults(commits, sourcePathOrPaths, repo, query) {
    if (!commits.length) {
      const filter = escapeHtml(String(query || '').trim());
      return `
        <p class="page-changes__status">
          No commits match <code>${filter || 'your search'}</code>.
        </p>
      `;
    }

    return renderCommitList(commits, sourcePathOrPaths, repo);
  }

  function renderChangesPathSummary(sourcePathOrPaths) {
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (paths.length <= 1) {
      return `<code>${escapeHtml(paths[0] || '')}</code>`;
    }

    return paths.map((path) => `<code>${escapeHtml(path)}</code>`).join(', ');
  }

  function renderSavedChangesSection(commits, sourcePathOrPaths, repo, query = '') {
    const filter = String(query || '');
    const hasCommits = Array.isArray(commits) && commits.length > 0;

    if (hasCommits) {
      const filteredCommits = filterCommits(commits, filter);
      const searchMeta = escapeHtml(getChangesSearchMetaText(filteredCommits.length, commits.length, filter));

      return `
        <section class="page-changes__history" aria-label="Merged change history">
          <div class="page-changes__search">
            <label class="screen-reader-text" for="page-changes-search">Filter changes</label>
            <input
              type="search"
              id="page-changes-search"
              class="page-changes__search-input"
              placeholder="Search by message, author, or commit…"
              value="${escapeHtml(filter)}"
              autocomplete="off"
              enterkeyhint="search"
            />
            <p class="page-changes__search-meta" aria-live="polite">${searchMeta}</p>
          </div>
          <div class="page-changes__results">
            ${renderChangesResults(filteredCommits, sourcePathOrPaths, repo, filter)}
          </div>
        </section>
      `;
    }

    return `
      <section class="page-changes__history" aria-label="Merged change history">
        <p class="page-changes__status">No merged commit history was found for ${renderChangesPathSummary(sourcePathOrPaths)}.</p>
      </section>
    `;
  }

  function renderChangesSubtabButton(id, label, count, selected = false) {
    return `
      <button
        type="button"
        class="page-changes__subtab${selected ? ' is-active' : ''}"
        role="tab"
        id="page-changes-tab-${id}"
        aria-selected="${selected ? 'true' : 'false'}"
        aria-controls="page-changes-panel-${id}"
        data-changes-tab="${id}"
        tabindex="${selected ? '0' : '-1'}"
      >
        <span>${escapeHtml(label)}</span>
        <span class="page-changes__subtab-count">${escapeHtml(String(count))}</span>
      </button>
    `;
  }

  function renderChangesPanel(id, content, selected = false) {
    return `
      <div
        class="page-changes__panel${selected ? ' is-active' : ''}"
        role="tabpanel"
        id="page-changes-panel-${id}"
        aria-labelledby="page-changes-tab-${id}"
        data-changes-panel="${id}"
        ${selected ? '' : 'hidden'}
      >
        ${content}
      </div>
    `;
  }

  function renderChangesView(commits, sourcePathOrPaths, repo, query = '', pendingPayload = null, peopleMetadata = null, peopleModel = null, maintainerState = null) {
    const safeCommits = Array.isArray(commits) ? commits : [];
    const pullRequests = Array.isArray(pendingPayload?.pull_requests)
      ? pendingPayload.pull_requests
      : [];
    const resolvedPeopleModel = peopleModel || buildChangesPeopleModel(safeCommits, pendingPayload, peopleMetadata);
    const peopleCount = uniquePeople([
      ...resolvedPeopleModel.creators,
      ...resolvedPeopleModel.owners,
      ...resolvedPeopleModel.maintainers,
      ...resolvedPeopleModel.contributors,
    ]).length + getMaintainerStateItems(maintainerState).length;

    return `
      <section class="page-changes" aria-label="Changes">
        <div class="page-changes__subtabs" role="tablist" aria-label="Change views">
          ${renderChangesSubtabButton('saved', 'Saved Changes', safeCommits.length, true)}
          ${renderChangesSubtabButton('pending', 'Pending Changes', pullRequests.length)}
          ${renderChangesSubtabButton('people', 'People', peopleCount)}
        </div>
        ${renderChangesPanel('saved', renderSavedChangesSection(safeCommits, sourcePathOrPaths, repo, query), true)}
        ${renderChangesPanel('pending', renderPendingEditsSection(pendingPayload))}
        ${renderChangesPanel('people', renderPeoplePanel(resolvedPeopleModel, maintainerState))}
      </section>
    `;
  }

  function bindChangesSearch(main, getChangesData, setFilter) {
    main.addEventListener('input', (event) => {
      const input = event.target.closest?.('.page-changes__search-input');
      if (!input || !main.contains(input)) {
        return;
      }

      const data = getChangesData();
      if (!data) {
        return;
      }

      const filter = input.value;
      setFilter(filter);

      const section = input.closest('.page-changes');
      const results = section?.querySelector('.page-changes__results');
      const meta = section?.querySelector('.page-changes__search-meta');
      const filteredCommits = filterCommits(data.commits, filter);

      if (results) {
        results.innerHTML = renderChangesResults(
          filteredCommits,
          data.sourcePaths || data.sourcePath,
          data.repo,
          filter,
        );
      }

      if (meta) {
        meta.textContent = getChangesSearchMetaText(filteredCommits.length, data.commits.length, filter);
      }
    });
  }

  function syncToolbarTabSelection(toolbar, tab = getSelectedTab()) {
    if (toolbar) {
      toolbar.querySelectorAll('.people-page__tab-link[data-tab]').forEach((link) => {
        const isSelected = link.dataset.tab === tab;
        link.closest('.people-page__tab-item')?.classList.toggle('is-selected', isSelected);
        link.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
    }

    try {
      window.dispatchEvent(new CustomEvent('page-tab:sync', { detail: { tab } }));
    } catch (error) {
      // ignore
    }
  }

  function mountChangesView(container, sourcePathOrPaths, {
    filter = '',
    onFilterChange = () => { },
    getChangesData = null,
  } = {}) {
    const paths = normalizeSourcePaths(sourcePathOrPaths);
    if (!container || !paths.length) {
      return Promise.resolve();
    }

    let historyDatasetPromise = null;
    let pendingDatasetPromise = null;
    let peopleMetadataPromise = null;
    let maintainerStatePromise = null;
    let changesData = getChangesData?.() || null;
    let changesFilter = filter;

    const loadHistory = () => {
      if (!historyDatasetPromise) {
        historyDatasetPromise = fetchFileCommitsFromApi(paths);
      }

      return historyDatasetPromise;
    };

    const loadPending = () => {
      if (!pendingDatasetPromise) {
        pendingDatasetPromise = fetchPendingPullRequests(paths).catch((error) => {
          console.error(error);
          return {
            pull_requests: [],
            can_review: false,
            review_login: '',
            error: error?.message || 'Could not load pending edits.',
          };
        });
      }

      return pendingDatasetPromise;
    };

    const loadPeopleMetadata = () => {
      if (!peopleMetadataPromise) {
        peopleMetadataPromise = fetchChangesPeopleMetadata(paths);
      }

      return peopleMetadataPromise;
    };

    const loadMaintainerState = () => {
      if (!maintainerStatePromise) {
        maintainerStatePromise = fetchMaintainerState(paths).catch((error) => {
          console.error(error);
          return {
            items: [],
            can_manage: false,
            is_maintainer: false,
            current_user: null,
            error: error?.message || 'Could not load maintainer invitations and requests.',
          };
        });
      }

      return maintainerStatePromise;
    };

    const renderLoadedChanges = async ([history, pending, peopleMetadata, maintainerState]) => {
      const sourcePaths = history.paths?.length ? history.paths : paths;
      const peopleModel = await enrichChangesPeopleModel(
        buildChangesPeopleModel(history.commits, pending, peopleMetadata),
      );
      changesData = {
        commits: history.commits,
        repo: history.repo,
        sourcePath: sourcePaths[0],
        sourcePaths,
        pending,
        peopleMetadata,
        peopleModel,
        maintainerState,
      };
      container.innerHTML = renderChangesView(
        history.commits,
        sourcePaths,
        history.repo,
        changesFilter,
        pending,
        peopleMetadata,
        peopleModel,
        maintainerState,
      );

      if (pending?.error) {
        const pendingSection = container.querySelector('.page-changes__pending');
        if (pendingSection) {
          pendingSection.insertAdjacentHTML(
            'beforeend',
            `<p class="page-changes__status">${escapeHtml(pending.error)}</p>`,
          );
        }
      }
    };

    const reloadChanges = () => {
      historyDatasetPromise = null;
      pendingDatasetPromise = null;
      peopleMetadataPromise = null;
      maintainerStatePromise = null;
      container.classList.add('is-changes-view');
      container.setAttribute('aria-busy', 'true');
      container.innerHTML = '<p class="page-changes__status">Loading changes…</p>';

      return Promise.all([loadHistory(), loadPending(), loadPeopleMetadata(), loadMaintainerState()])
        .then(renderLoadedChanges)
        .catch((error) => {
          console.error(error);
          const message = error?.message || 'Could not load changes. Please try again.';
          container.innerHTML = `<p class="page-changes__status">${escapeHtml(message)}</p>`;
        })
        .finally(() => {
          container.removeAttribute('aria-busy');
        });
    };

    if (container.dataset.changesBound !== 'true') {
      bindChangesView(container, paths, () => reloadChanges(), () => reloadChanges());
      bindChangesSearch(container, () => changesData, (value) => {
        changesFilter = value;
        onFilterChange(value);
      });
      container.dataset.changesBound = 'true';
    }

    container.classList.add('is-changes-view');
    return reloadChanges();
  }

  function resolvePageTabsScriptUrl() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i]?.src || '';
      if (src.includes('page-tabs.js')) {
        return src;
      }
    }

    return new URL('lib/page-tabs.js', window.location.href).href;
  }

  function ensurePageTabsLoaded() {
    if (window.AppPageTabs?.mountChangesView) {
      return Promise.resolve(window.AppPageTabs);
    }

    if (document.querySelector('script[src*="page-tabs.js"]')) {
      return new Promise((resolve) => {
        const check = () => {
          if (window.AppPageTabs?.mountChangesView) {
            resolve(window.AppPageTabs);
            return;
          }

          window.setTimeout(check, 25);
        };
        check();
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = resolvePageTabsScriptUrl();
      script.async = true;
      script.addEventListener('load', () => resolve(window.AppPageTabs), { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.append(script);
    });
  }

  function initPageTabs() {
    const toolbar = document.querySelector('full-page-toolbar[variant="page"]');
    const main = document.querySelector('article > main.main-content') || document.querySelector('article > main');

    if (!toolbar || !main || main.dataset.pageTabsBound === 'true') {
      return;
    }

    main.dataset.pageTabsBound = 'true';

    const pageHtml = main.innerHTML;
    const sourcePaths = getSourcePaths();
    let changesFilter = '';
    let viewingChanges = false;

    const render = async () => {
      const tab = getSelectedTab();

      if (tab === 'page') {
        if (viewingChanges) {
          main.innerHTML = pageHtml;
          viewingChanges = false;
          window.dispatchEvent(new CustomEvent('app:page-tab-restored'));
        }
        main.classList.remove('is-changes-view');
        main.removeAttribute('aria-busy');
        return;
      }

      viewingChanges = true;
      await mountChangesView(main, sourcePaths, {
        filter: changesFilter,
        onFilterChange: (value) => {
          changesFilter = value;
        },
      });
    };

    const selectTab = (tab, { updateHash = true } = {}) => {
      if (!PAGE_TABS.includes(tab)) {
        return;
      }

      if (updateHash) {
        const nextHash = tab === 'page' ? '#page' : '#changes';
        if (window.location.hash !== nextHash) {
          history.replaceState(null, '', nextHash);
        }
      }

      syncToolbarTabSelection(toolbar, tab);
      render();
    };

    toolbar.addEventListener('click', (event) => {
      const link = event.target.closest?.('.people-page__tab-link[data-tab]');
      if (!link || !toolbar.contains(link)) {
        return;
      }

      event.preventDefault();
      selectTab(link.dataset.tab);
    });

    const syncChrome = () => {
      syncToolbarTabSelection(toolbar, getSelectedTab());
    };

    window.addEventListener('hashchange', () => {
      syncChrome();
      render();
    });

    window.addEventListener('app:namechange', syncChrome);
    window.addEventListener('load', syncChrome);

    syncChrome();
    render();
    setTimeout(syncChrome, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageTabs, { once: true });
  } else {
    initPageTabs();
  }

  window.AppPageTabs = {
    init: initPageTabs,
    getSourcePath,
    getSourcePaths,
    getPeopleProfileSourcePaths,
    mountChangesView,
    ensurePageTabsLoaded,
    renderDiffPanels,
    ensureHighlightJs,
  };
})();
