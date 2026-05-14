const CONFIG = {
    NAME: "Sahib Virdee",
    EMAIL: "me@sahibvirdee.com",
    CONTACT_LINKS: [
        { label: "Email", url: "mailto:me@sahibvirdee.com", id: "email-link" }
    ],
    // Public Sheet (Everyone sees this)
    DATA_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7HtdJsNwYO8TkB4mem_IKZ-D8xNZ9DTAi-jgxpDM2HScpp9Tlz5DGFuBPd9TuMRwP16vUd-5h47Yz/pub?gid=1470188926&single=true&output=csv',
    
    // Private Sheet (Only logged in users fetch this)
    PRIVATE_DATA_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT7HtdJsNwYO8TkB4mem_IKZ-D8xNZ9DTAi-jgxpDM2HScpp9Tlz5DGFuBPd9TuMRwP16vUd-5h47Yz/pub?gid=PRIVATE_GID_HERE&single=true&output=csv',
    
    // Subdomain Configuration
    FAMILY_SUBDOMAIN: 'family.sahibvirdee.com'
};

/**
 * Triggers a brief haptic feedback (1ms) on supported devices.
 */
function haptic() {
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(1);
    }
}


// State
let publicDb = [];
let privateDb = [];
let db = []; // Combined database
let currentView = 'grid';
let currentUser = null;
let initialRouteHandled = false;
let isFamilyMode = window.location.hostname === CONFIG.FAMILY_SUBDOMAIN;
const DEFAULT_MODEL_CAMERA_RADIUS = "85%";
const DEFAULT_MODEL_CAMERA_ORBIT = `45deg 75deg ${DEFAULT_MODEL_CAMERA_RADIUS}`;
const MIN_MODEL_CAMERA_ORBIT = `-Infinity 0deg ${DEFAULT_MODEL_CAMERA_RADIUS}`;
const MAX_MODEL_CAMERA_ORBIT = `Infinity 180deg ${DEFAULT_MODEL_CAMERA_RADIUS}`;
const modelOrbitBySrc = new Map();
let lastFullscreenModel = null;
const CAUTION_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 1.5em; height: 1.5em;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;

// Elements
const grid = document.getElementById('grid');
const pageView = document.getElementById('page');
const siteName = document.getElementById('site-name');

// Click outside to go back
pageView.addEventListener('click', (e) => {
    if (e.target.closest('.page-back-layer')) {
        navigateTo('/');
    }
});

pageView.addEventListener('pointermove', (e) => {
    const cursor = pageView.querySelector('.back-cursor');
    if (!cursor) return;

    const isBackZone = !!e.target.closest('.page-back-layer') && e.pointerType !== 'touch';
    cursor.classList.toggle('is-visible', isBackZone);

    if (isBackZone) {
        cursor.style.transform = `translate3d(${e.clientX - 20}px, ${e.clientY - 20}px, 0)`;
    }
});

pageView.addEventListener('pointerleave', () => {
    pageView.querySelector('.back-cursor')?.classList.remove('is-visible');
});

// Disable context menu (right-click/long-press) on grid items
grid.addEventListener('contextmenu', (e) => {
    if (currentView === 'grid') {
        e.preventDefault();
    }
});

function initHeader() {
    siteName.textContent = isFamilyMode ? "Virdee Family" : CONFIG.NAME;
}
initHeader();

// Firebase Auth Logic
function initAuth() {
    if (window.firebase && firebase.auth) {
        const auth = firebase.auth();
        const db_fs = firebase.firestore();

        // If we are on the family subdomain and not logged in, trigger sign-in
        if (isFamilyMode && !currentUser) {
            signIn();
        }

        auth.onAuthStateChanged(async (user) => {
            currentUser = user;
            
            if (user) {
                try {
                    // Check Firestore if the user's email exists in the family collection
                    const doc = await db_fs.collection('family').doc(user.email).get();
                    
                    if (doc.exists) {
                        await fetchPrivateData();
                    } else {
                        console.log("User not authorized for private data.");
                        privateDb = [];
                        updateCombinedDb();
                    }
                } catch (e) {
                    console.error("Auth check failed:", e);
                    privateDb = [];
                    updateCombinedDb();
                }
            } else {
                privateDb = [];
                updateCombinedDb();
                // Re-trigger login if they logged out on the family subdomain
                if (isFamilyMode) signIn();
            }
        });
    }
}

async function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await firebase.auth().signInWithPopup(provider);
    } catch (e) {
        console.error("Sign-in failed:", e);
    }
}

function signOut() {
    firebase.auth().signOut();
}

function getYoutubeId(url) {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) return match[2];
    return (url.length === 11 && !url.includes('/') && !url.includes('.')) ? url : null;
}

function normalizeMediaUrl(url) {
    let finalUrl = String(url || '').replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u00A0]/g, '').trim();

    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('//')) {
        finalUrl = finalUrl.toLowerCase();
        if (!finalUrl.startsWith('/')) {
            finalUrl = '/' + finalUrl;
        }
    }

    return finalUrl;
}

/**
 * Parses a media line into a URL and a set of tags.
 * Example: "video.mp4 #loop #nocontrols" -> { url: "video.mp4", tags: Set { "loop", "nocontrols" } }
 */
function parseMediaLine(line) {
    if (!line || typeof line !== 'string') return { url: '', tags: new Set() };
    const parts = line.trim().split(/\s+/);
    const url = parts[0].trim();
    const tags = new Set(parts.slice(1).map(t => t.toLowerCase().replace(/^#/, '')));
    
    // Also check for hash-style tags inside the first part (e.g. video.mp4#loop)
    const [baseUrl, ...fragments] = url.split('#');
    fragments.forEach(f => tags.add(f.toLowerCase()));
    
    return { url: normalizeMediaUrl(baseUrl), tags };
}

function parseModelOrientation(tags) {
    let rx = 0;
    let ry = 0;
    let rz = 0;
    let hasOrientation = false;

    tags.forEach(tag => {
        const match = tag.match(/^r([xyz])(-?\d+)$/);
        if (!match) return;

        const axis = match[1];
        const degrees = parseInt(match[2], 10);
        hasOrientation = true;

        if (axis === 'x') rx += degrees;
        if (axis === 'y') ry += degrees;
        if (axis === 'z') rz += degrees;
    });

    return hasOrientation ? `${rx}deg ${ry}deg ${rz}deg` : null;
}

function shouldInvertMedia(tags) {
    return tags.has('invert');
}

function isThumbnailOnly(tags) {
    return tags.has('thumbnail') || tags.has('thumb');
}

function classifyThemeInvertElement(target, drawable) {
    try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(drawable, 0, 0, size, size);

        const data = ctx.getImageData(0, 0, size, size).data;
        let lightCount = 0;
        let darkCount = 0;
        let midCount = 0;
        let transparentCount = 0;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha < 50) {
                transparentCount++;
                continue;
            }

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;

            if (brightness > 200) lightCount++;
            else if (brightness < 60) darkCount++;
            else midCount++;
        }

        const totalPixels = data.length / 4;
        const totalVisible = lightCount + darkCount + midCount;
        const lightRatio = totalVisible ? lightCount / totalVisible : 0;
        const darkRatio = totalVisible ? darkCount / totalVisible : 0;

        target.classList.remove('is-bright', 'is-dark', 'is-transparent');

        if (transparentCount > totalPixels * 0.1) {
            target.classList.add('is-transparent');
        }

        if (lightRatio > darkRatio && lightRatio > 0.15) {
            target.classList.add('is-bright');
        } else if (darkRatio > lightRatio && darkRatio > 0.05) {
            target.classList.add('is-dark');
        }
    } catch (e) {
        target.classList.add('is-bright');
    }
}

function initThemeInvert(container = document) {
    container.querySelectorAll('.theme-invert').forEach((el) => {
        if (el.dataset.invertReady === 'true') return;
        el.dataset.invertReady = 'true';

        if (el.tagName === 'IMG') {
            if (el.complete) classifyThemeInvertElement(el, el);
            else el.addEventListener('load', () => classifyThemeInvertElement(el, el), { once: true });
            return;
        }

        if (el.tagName === 'VIDEO') {
            if (el.readyState >= 2) classifyThemeInvertElement(el, el);
            else el.addEventListener('loadeddata', () => classifyThemeInvertElement(el, el), { once: true });
        }
    });
}

function getTagValue(tags, prefix) {
    const tag = [...tags].find(t => t.startsWith(prefix));
    if (!tag) return null;
    return tag.replace(prefix, '');
}

function getModelKey(url) {
    return url.split(/[?#]/)[0];
}

function getPageLabel(pagePath) {
    const parts = String(pagePath || '').split('/').map(part => part.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : String(pagePath || '').trim();
}

function normalizePagePath(pagePath) {
    return String(pagePath || '')
        .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u00A0]/g, ' ')
        .split('/')
        .map(part => part.trim())
        .filter(Boolean)
        .join('/');
}

function getPageParts(pagePath) {
    return normalizePagePath(pagePath).split('/').filter(Boolean);
}

function slugifyPart(part) {
    return encodeURIComponent(String(part || '').trim().toLowerCase().replace(/\s+/g, '-'));
}

function pathToSlug(pagePath) {
    const parts = getPageParts(pagePath).map(slugifyPart);
    return parts.length ? `/${parts.join('/')}` : '/';
}

function slugToComparablePath(slugPath) {
    return decodeURIComponent(String(slugPath || '/'))
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .map(part => part.replace(/-/g, ' ').trim().toLowerCase())
        .filter(Boolean)
        .join('/');
}

function getItemPath(item) {
    return normalizePagePath(item && item.Page);
}

function findItemByPath(pagePath) {
    const normalized = normalizePagePath(pagePath).toLowerCase();
    return db.find(item => getItemPath(item).toLowerCase() === normalized) || null;
}

function getChildrenForPath(pagePath) {
    const parentParts = getPageParts(pagePath);
    const parentLower = parentParts.map(part => part.toLowerCase());
    const children = new Map();

    db.forEach(item => {
        const itemParts = getPageParts(item.Page);
        if (itemParts.length <= parentParts.length) return;

        const hasPrefix = parentLower.every((part, idx) => itemParts[idx].toLowerCase() === part);
        if (!hasPrefix) return;

        const childParts = itemParts.slice(0, parentParts.length + 1);
        const childPath = childParts.join('/');
        const childKey = childPath.toLowerCase();
        const exactItem = findItemByPath(childPath);

        if (!children.has(childKey)) {
            children.set(childKey, {
                Page: childPath,
                Content: exactItem ? exactItem.Content : '',
                __virtualFolder: !exactItem
            });
        }
    });

    return [...children.values()];
}

function getHomepageItems() {
    return db.filter(item => getItemPath(item));
}

function resolveRoute(pathname) {
    const comparablePath = slugToComparablePath(pathname);
    if (!comparablePath) return { type: 'grid' };

    const exactItem = findItemByPath(comparablePath);
    if (exactItem) return { type: 'page', item: exactItem };

    const children = getChildrenForPath(comparablePath);
    if (children.length) {
        const depth = getPageParts(comparablePath).length;
        const canonicalPath = getPageParts(children[0].Page).slice(0, depth).join('/');
        return {
            type: 'page',
            item: { Page: canonicalPath || comparablePath, Content: '', __virtualFolder: true }
        };
    }

    return null;
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function getModelOrbit(mv) {
    if (!mv || typeof mv.getCameraOrbit !== 'function') return null;

    const orbit = mv.getCameraOrbit();
    if (orbit && orbit.theta != null && orbit.phi != null && orbit.radius != null) {
        return `${orbit.theta}rad ${orbit.phi}rad ${DEFAULT_MODEL_CAMERA_RADIUS}`;
    }

    return null;
}

function rememberModelOrbit(mv, url) {
    if (document.fullscreenElement) return; // Don't save zoomed/distorted states from fullscreen
    const orbit = getModelOrbit(mv);
    if (orbit) modelOrbitBySrc.set(getModelKey(url), orbit);
}

function initModelOrbitTracking(container = document) {
    container.querySelectorAll('model-viewer[data-model-src]').forEach((mv) => {
        const url = mv.dataset.modelSrc;
        const shouldTrackOrbit = mv.dataset.trackOrbit === 'true';
        const savedOrbit = shouldTrackOrbit ? modelOrbitBySrc.get(getModelKey(url)) : null;

        if (savedOrbit) mv.setAttribute('camera-orbit', savedOrbit);

        if (shouldTrackOrbit) {
            mv.addEventListener('camera-change', () => rememberModelOrbit(mv, url));
            mv.addEventListener('load', () => rememberModelOrbit(mv, url), { once: true });
        }

        mv.addEventListener('error', (e) => {
            console.error(`Model Viewer failed to load: ${url} (Encoded: ${encodeURIComponent(url)})`, e);
            const wrapper = mv.closest('.model-container') || mv.parentElement;
            if (wrapper) wrapper.innerHTML = `<div class="placeholder-404">${CAUTION_ICON}</div>`;
        });
        modelViewerObserver.observe(mv);
    });
}

function rememberVisibleModelOrbits(container = document) {
    container.querySelectorAll('model-viewer[data-model-src][data-track-orbit="true"]').forEach((mv) => {
        rememberModelOrbit(mv, mv.dataset.modelSrc);
    });
}

function cleanupModelViewers(container = document) {
    container.querySelectorAll('model-viewer[data-model-src]').forEach((mv) => {
        modelViewerObserver.unobserve(mv);
    });
}

function syncModelVisibility(mv, isVisible) {
    if (isVisible && !mv.getAttribute('src')) {
        const cacheBuster = `?v=${Date.now()}`;
        mv.setAttribute('src', mv.dataset.modelSrc + cacheBuster);
    }

    if (mv.dataset.autoRotate !== 'true') return;

    if (isVisible) {
        mv.setAttribute('auto-rotate', '');
    } else {
        mv.removeAttribute('auto-rotate');
    }
}

const modelViewerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        syncModelVisibility(entry.target, entry.isIntersecting);
    });
}, { rootMargin: '600px 0px', threshold: 0.01 });

// Media Extractor for Grid
function getFirstMedia(content) {
    if (!content) return null;
    
    // Split by newlines and filter out empty lines
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    let firstMedia = null;
    
    for (let line of lines) {
        // 1. YouTube check
        const parsed = parseMediaLine(line);
        if (getYoutubeId(parsed.url)) {
            if (isThumbnailOnly(parsed.tags)) return line;
            if (!firstMedia) firstMedia = line;
            continue;
        }
        
        // 2. Extension check (Internal or External)
        const parts = parsed.url.split(/[?#]/)[0].split('.');
        const ext = parts.pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'glb'].includes(ext)) {
            if (isThumbnailOnly(parsed.tags)) return line;
            if (!firstMedia) firstMedia = line;
        }
    }
    return firstMedia;
}

// Helper to render media blocks
function renderMediaBlock(line) {
    if (!line || typeof line !== 'string') return null;
    const { url, tags } = parseMediaLine(line);
    if (isThumbnailOnly(tags)) return '';
    const youtubeId = getYoutubeId(url);
    
    // Get extension safely even with query params
    const parts = url.split(/[?#]/)[0].split('.');
    const ext = parts.pop().toLowerCase();

    if (youtubeId) {
        const loopAttr = tags.has('loop') ? `&playlist=${youtubeId}&loop=1` : '';
        const autoplay = tags.has('noautoplay') ? '0' : '1';
        const controls = tags.has('nocontrols') ? '0' : '1';
        const muted = tags.has('unmute') ? '0' : '1';

        // Aspect Ratio
        let aspect = "16 / 9";
        if (tags.has('portrait') || tags.has('9x16')) aspect = "9 / 16";
        if (tags.has('4x3')) aspect = "4 / 3";
        const ratioVal = getTagValue(tags, 'ratio');
        if (ratioVal) aspect = ratioVal.replace(':', ' / ');

        return `
            <div class="block-media">
                <div class="iframe-wrapper loading" style="aspect-ratio: ${aspect};">
                    <iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=${autoplay}&mute=${muted}&controls=${controls}${loopAttr}" 
                        style="width: 100%; height: 100%; border: none;" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        onload="this.parentElement.classList.remove('loading')"></iframe>
                </div>
            </div>
        `;
    }
    
    if (ext === 'mp4') {
        const autoplay = !tags.has('noautoplay');
        const controls = !tags.has('nocontrols');
        const loop = tags.has('loop');
        const muted = !tags.has('unmute');
        const invertClass = shouldInvertMedia(tags) ? ' class="theme-invert"' : '';

        return `
            <div class="block-media">
                <video${invertClass} ${controls ? 'controls' : ''} ${autoplay ? 'autoplay' : ''} ${muted ? 'muted' : ''} ${loop ? 'loop' : ''} playsinline style="width: 100%;" onerror="this.outerHTML='<div class=&quot;placeholder-404&quot;>${CAUTION_ICON.replace(/"/g, '&quot;')}</div>'">
                    <source src="${url}" type="video/mp4">
                </video>
            </div>
        `;
    }

    if (ext === 'glb') {
        const orientation = parseModelOrientation(tags);
        return `
            <div class="block-media">
                <div class="model-container loading">
                    <model-viewer 
                        data-model-src="${url}"
                        data-track-orbit="true"
                        data-auto-rotate="true"
                        loading="lazy"
                        rotation-speed="20%"
                        auto-rotate-delay="5000"
                        camera-controls
                        disable-zoom
                        crossorigin="anonymous"
                        translate="no"
                        field-of-view="15deg"
                        min-field-of-view="15deg"
                        max-field-of-view="15deg"
                        interaction-prompt="none"
                        shadow-intensity="0" 
                        shadow-softness="0"
                        exposure="0.75"
                        camera-orbit="${modelOrbitBySrc.get(getModelKey(url)) || DEFAULT_MODEL_CAMERA_ORBIT}"
                        min-camera-orbit="${MIN_MODEL_CAMERA_ORBIT}"
                        max-camera-orbit="${MAX_MODEL_CAMERA_ORBIT}"
                        min-polar-angle="0deg"
                        max-polar-angle="180deg"
                        ${orientation ? `orientation="${orientation}"` : ''}
                        style="width: 100%; height: 100%;"
                        onload="this.parentElement.classList.remove('loading')"
                        draco-decoder-location="https://www.gstatic.com/draco/versioned/decoders/1.5.7/">
                    </model-viewer>
                    <button class="btn-mini fullscreen-btn" onclick="toggleFullscreen(this)">
                    </button>
                </div>
            </div>
        `;
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
        const invertClass = shouldInvertMedia(tags) ? ' class="theme-invert"' : '';
        return `
            <div class="block-media">
                <img${invertClass} src="${url}" alt="media" onerror="this.outerHTML='<div class=&quot;placeholder-404&quot;>${CAUTION_ICON.replace(/"/g, '&quot;')}</div>'">
            </div>
        `;
    }

    return null;
}

// Custom Markdown Renderer for Auto-Embeds
const renderer = new marked.Renderer();

renderer.link = (arg1, arg2, arg3) => {
    // Handle both old and new marked.js API
    let href, title, text;
    if (typeof arg1 === 'object') {
        ({ href, title, text } = arg1);
    } else {
        [href, title, text] = [arg1, arg2, arg3];
    }

    const isExternal = href.startsWith('http') || href.startsWith('//');
    const externalIcon = isExternal ? ` <svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>` : '';
    const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    
    return `<a href="${href}"${title ? ` title="${title}"` : ''}${target}>${text}${externalIcon}</a>`;
};

// Helper to wrap text blocks
function wrapText(content) {
    return `<div class="block-text">${content}</div>`;
}

function parseInlineMarkdownToken(token) {
    if (!token || !token.tokens) return token && token.text ? token.text : '';
    if (marked.Parser && typeof marked.Parser.parseInline === 'function') {
        return marked.Parser.parseInline(token.tokens);
    }
    if (typeof marked.parseInline === 'function') {
        return marked.parseInline(token.text || '');
    }
    return token.text || '';
}

// Handle naked links in paragraphs
renderer.paragraph = function (arg) {
    const rawText = (typeof arg === 'object' && arg.text) ? arg.text : (typeof arg === 'string' ? arg : '');
    const trimmed = rawText.trim();
    
    // Check if it's a naked URL or internal path
    const mediaHtml = renderMediaBlock(trimmed);
    if (mediaHtml) return mediaHtml;

    const text = typeof arg === 'object' ? parseInlineMarkdownToken(arg) : rawText;
    return `<p>${text}</p>\n`;
};

function renderMarkdown(content) {
    const parsed = marked.parse(content || '', { renderer });
    const template = document.createElement('template');
    template.innerHTML = parsed.trim();

    const wrapped = Array.from(template.content.childNodes).map((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return node.textContent.trim() ? wrapText(node.textContent) : '';
        }

        if (node.classList.contains('block-media')) return node.outerHTML;
        if (node.classList.contains('block-text')) return node.outerHTML;

        return wrapText(node.outerHTML);
    });

    return wrapped.join('');
}

// Router Logic (No-Hash)
function navigateTo(path, item = null) {
    if (path === '/') {
        history.pushState({ path: '/' }, '', '/');
        showGrid();
    } else {
        const route = item ? { type: 'page', item } : resolveRoute(path);
        if (!route || route.type !== 'page') return;
        const cleanPath = pathToSlug(route.item.Page);
        history.pushState({ path: cleanPath }, '', cleanPath);
        renderPage(route.item);
    }
    
    if (window.firebase && firebase.analytics) {
        firebase.analytics().logEvent('page_view', { page_path: path });
    }
}

window.addEventListener('popstate', (e) => {
    const route = resolveRoute(window.location.pathname);
    if (route && route.type === 'page') {
        renderPage(route.item);
    } else {
        showGrid();
    }
});

// Handle Home Click
siteName.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.location.pathname !== '/') {
        navigateTo('/');
    } else {
        window.scrollTo(0, 0);
    }
});

function toggleFullscreen(btn) {
    const container = btn.closest('.model-container');
    if (!container) return;
    const mv = container.querySelector('model-viewer');
    
    if (!document.fullscreenElement) {
        if (mv) mv.removeAttribute('disable-zoom');
        container.requestFullscreen().then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        });
        btn.classList.add('is-exit');
    } else {
        if (mv) mv.setAttribute('disable-zoom', '');
        document.exitFullscreen();
        btn.classList.remove('is-exit');
    }
}

document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement;
    
    if (!isFullscreen) {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        // Force model-viewer to recalculate layout
        window.dispatchEvent(new Event('resize'));

        // Reset camera if we were just in fullscreen
        if (lastFullscreenModel) {
            lastFullscreenModel.cameraOrbit = DEFAULT_MODEL_CAMERA_ORBIT;
            lastFullscreenModel.fieldOfView = '15deg';
            if (typeof lastFullscreenModel.jumpCameraToGoal === 'function') {
                lastFullscreenModel.jumpCameraToGoal();
            }
            lastFullscreenModel = null;
        }
    }

    document.querySelectorAll('.model-container model-viewer[camera-controls]').forEach((mv) => {
        if (mv.closest('.model-container') === document.fullscreenElement) {
            mv.removeAttribute('disable-zoom');
            lastFullscreenModel = mv; // Track the one that just entered
        } else {
            mv.setAttribute('disable-zoom', '');
        }
    });
});

// CSV Parser
function parseCSV(text) {
    const p = [[]];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"' && inQuotes && next === '"') {
            cur += '"'; i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            p[p.length - 1].push(cur.trim()); cur = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i++;
            p[p.length - 1].push(cur.trim()); cur = '';
            p.push([]);
        } else {
            cur += char;
        }
    }
    if (cur || p[p.length - 1].length) p[p.length - 1].push(cur.trim());
    const rows = p.filter(r => r.length > 1);
    
    if (rows.length < 2) return [];
    const header = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        const obj = {};
        header.forEach((key, idx) => {
            obj[key] = row[idx] || '';
        });
        return obj;
    });
}

async function fetchData() {
    try {
        const res = await fetch(CONFIG.DATA_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            console.error("Public data fetch returned HTML instead of CSV. Check if the sheet is published to the web correctly.");
            return;
        }

        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE')) {
            console.error("Public data starts with HTML doctype. Likely a login or error page.");
            return;
        }

        publicDb = parseCSV(text);
        updateCombinedDb();
    } catch (e) {
        console.error("Public fetch failed:", e);
    }
}

async function fetchPrivateData() {
    if (CONFIG.PRIVATE_DATA_URL.includes('PRIVATE_GID_HERE')) return;
    try {
        const res = await fetch(CONFIG.PRIVATE_DATA_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            console.error("Private data fetch returned HTML. Ensure the private sheet is published to the web.");
            return;
        }

        const text = await res.text();
        if (text.trim().startsWith('<!DOCTYPE')) {
            console.error("Private data starts with HTML doctype. Likely a login or error page.");
            return;
        }

        privateDb = parseCSV(text);
        updateCombinedDb();
    } catch (e) {
        console.error("Private fetch failed:", e);
    }
}

function handleInitialRoute() {
    if (initialRouteHandled) return;
    
    const route = resolveRoute(window.location.pathname);
    if (route && route.type === 'grid') {
        initialRouteHandled = true;
        return;
    }

    if (route && route.type === 'page') {
        history.replaceState({ path: pathToSlug(route.item.Page) }, '', pathToSlug(route.item.Page));
        renderPage(route.item);
        initialRouteHandled = true;
    }
}

function updateCombinedDb() {
    if (isFamilyMode) {
        db = [...privateDb]; // Only show private family work
    } else {
        db = [...publicDb, ...privateDb]; // Show everything
    }
    
    if (currentView === 'grid') initGrid('', grid);
    
    handleInitialRoute();
}

function initGrid(contextPath = '', container = grid) {
    container.innerHTML = '';
    
    const validItems = getPageParts(contextPath).length ? getChildrenForPath(contextPath) : getHomepageItems();

    validItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item loading';
        
        const pagePath = getItemPath(item);
        const title = getPageLabel(pagePath);
        const thumbnail = getFirstMedia(item.Content);

        if (!thumbnail) {
            div.innerHTML = `<div class="placeholder-title">${escapeHtml(title)}</div>`;
        } else {
            const { url: thumbnailUrl, tags } = parseMediaLine(thumbnail);
            const isVideo = thumbnailUrl.endsWith('.mp4');
            const isModel = thumbnailUrl.endsWith('.glb');
            const youtubeId = getYoutubeId(thumbnailUrl);
            
            if (isVideo && !youtubeId) {
                const invertClass = shouldInvertMedia(tags) ? ' theme-invert' : '';
                div.innerHTML = `
                    <video muted playsinline class="thumb-video${invertClass}" onloadeddata="this.parentElement.classList.remove('loading')" onerror="this.parentElement.classList.remove('loading'); this.outerHTML='<div class=&quot;placeholder-404&quot;>${CAUTION_ICON.replace(/"/g, '&quot;')}</div>'">
                        <source src="${thumbnailUrl}" type="video/mp4">
                    </video>
                `;
                const videoEl = div.querySelector('video');
                mediaObserver.observe(videoEl);
            } else if (isModel) {
                const orientation = parseModelOrientation(tags);
                div.innerHTML = `
                    <model-viewer 
                        data-model-src="${thumbnailUrl}"
                        data-auto-rotate="false"
                        loading="lazy"
                        interaction-prompt="none"
                        crossorigin="anonymous"
                        translate="no"
                        field-of-view="15deg"
                        min-field-of-view="15deg"
                        max-field-of-view="15deg"
                        camera-orbit="${DEFAULT_MODEL_CAMERA_ORBIT}"
                        min-camera-orbit="${MIN_MODEL_CAMERA_ORBIT}"
                        max-camera-orbit="${MAX_MODEL_CAMERA_ORBIT}"
                        min-polar-angle="0deg"
                        max-polar-angle="180deg"
                        ${orientation ? `orientation="${orientation}"` : ''}
                        exposure="0.75"
                        shadow-intensity="0"
                        shadow-softness="0"
                        style="width: 100%; height: 100%; pointer-events: none;"
                        draco-decoder-location="https://www.gstatic.com/draco/versioned/decoders/1.5.7/">
                    </model-viewer>
                `;
                const mv = div.querySelector('model-viewer');
                mv.addEventListener('load', () => div.classList.remove('loading'));
                mv.addEventListener('error', (e) => {
                    console.error(`Grid model failed to load: ${thumbnailUrl} (Encoded: ${encodeURIComponent(thumbnailUrl)})`, e);
                    div.classList.remove('loading');
                    div.innerHTML = `<div class="placeholder-404">${CAUTION_ICON}</div>`;
                });
            } else {
                const thumbUrl = youtubeId 
                    ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` 
                    : thumbnailUrl;
                const invertClass = shouldInvertMedia(tags) ? ' class="theme-invert"' : '';
                div.innerHTML = `<img${invertClass} src="${thumbUrl}" alt="${title}" onload="this.parentElement.classList.remove('loading')" onerror="this.parentElement.classList.remove('loading'); this.outerHTML='<div class=&quot;placeholder-404&quot;>${CAUTION_ICON.replace(/"/g, '&quot;')}</div>'">`;
            }
        }

        div.addEventListener('click', () => {
            rememberVisibleModelOrbits(div);
            const path = pathToSlug(pagePath);
            navigateTo(path, item);
        });
        container.appendChild(div);
        initModelOrbitTracking(div);
        initThemeInvert(div);
    });
}

const mediaObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
            if (!video.ended) video.play();
        } else {
            video.pause();
        }
    });
}, { threshold: 0.1 });

function renderPage(item) {
    currentView = 'page';
    document.documentElement.classList.add('page-open');
    document.body.classList.add('page-open');
    grid.style.display = 'none';
    pageView.style.display = 'block';
    window.scrollTo(0, 0);

    const fullPagePath = getItemPath(item);
    const pathParts = getPageParts(fullPagePath);
    let breadcrumbHtml = '';
    let runningPath = '';
    
    pathParts.forEach((part, idx) => {
        runningPath += (runningPath ? '/' : '') + part;
        const isLast = idx === pathParts.length - 1;
        const partSlug = pathToSlug(runningPath);
        const safePart = escapeHtml(part);
        
        if (isLast) {
            breadcrumbHtml += `<span class="title-part" data-path="${partSlug}">${safePart}</span>`;
        } else {
            breadcrumbHtml += `<span class="title-part" data-path="${partSlug}">${safePart}</span><span class="title-slash">/</span>`;
        }
    });

    const contentMarkdown = item.Content || "";
    const content = contentMarkdown ? renderMarkdown(contentMarkdown) : '';

    pageView.innerHTML = `
        <div class="page-back-layer" aria-hidden="true"></div>
        <div class="btn-mini back-cursor is-back" aria-hidden="true"></div>
        <div class="page-content">
            <div class="block-text">
                <h1>${breadcrumbHtml}</h1>
            </div>
            ${content}
            <div class="sub-grid" style="display: none;"></div>
        </div>
    `;

    // Breadcrumb clicks
    pageView.querySelectorAll('.title-part').forEach(el => {
        el.addEventListener('click', (e) => {
            const targetPath = el.dataset.path;
            navigateTo(targetPath);
        });
    });

    const children = getChildrenForPath(fullPagePath);
    if (children.length) {
        const subGrid = pageView.querySelector('.sub-grid');
        subGrid.style.display = 'grid';
        initGrid(fullPagePath, subGrid);
    }

    initModelOrbitTracking(pageView);
    initThemeInvert(pageView);
}

function showGrid() {
    rememberVisibleModelOrbits(pageView);
    cleanupModelViewers(pageView);
    currentView = 'grid';
    document.documentElement.classList.remove('page-open');
    document.body.classList.remove('page-open');
    grid.style.display = 'grid';
    pageView.style.display = 'none';
    pageView.innerHTML = ''; // Kill all playing videos/iframes
    window.scrollTo(0, 0);
}

// Global Exports
window.signIn = signIn;
window.signOut = signOut;

// Global Haptic Trigger
document.addEventListener('click', (e) => {
    const isActivator = e.target.closest('.item, .btn, .btn-mini, .header-name, a');
    const isPageBack = !!e.target.closest('.page-back-layer');

    if (isActivator || isPageBack) haptic();
});

initAuth();

fetchData();
