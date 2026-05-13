export class Router {
    constructor(onRoute) {
        this.onRoute = onRoute;
        this.init();
    }

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-link]');
            if (link) {
                e.preventDefault();
                this.navigateTo(link.getAttribute('href'));
            }
        });
        this.handleRoute();
    }

    navigateTo(url) {
        if (window.location.pathname === url) return;
        history.pushState(null, null, url);
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname;
        // Map paths to categories
        const categories = {
            '/personal': 'personal',
            '/professional': 'professional',
            '/projects': 'projects',
            '/': 'default'
        };
        
        const category = categories[path] || 'projects'; // Fallback
        this.onRoute(category);
    }
}
