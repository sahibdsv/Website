export class Router {
    constructor(routes) {
        this.routes = routes;
        this.appElement = document.getElementById('app');
        this.init();
    }

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-link]')) {
                e.preventDefault();
                this.navigateTo(e.target.href);
            }
        });
        this.handleRoute();
    }

    navigateTo(url) {
        history.pushState(null, null, url);
        this.handleRoute();
    }

    async handleRoute() {
        const path = window.location.pathname;
        let route = this.routes[path] || this.routes['404'];

        this.appElement.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';

        try {
            const content = await route.render();
            this.appElement.innerHTML = `<div class="page-content">${content}</div>`;
            window.scrollTo(0, 0);
            if (route.afterRender) route.afterRender();
        } catch (error) {
            console.error('Routing error:', error);
            this.appElement.innerHTML = '<div class="page-content"><h1>Error</h1><p>Something went wrong.</p></div>';
        }
    }
}
