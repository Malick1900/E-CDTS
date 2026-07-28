import { defineConfig, devices } from '@playwright/test';

/*
 * Playwright — parcours E2E critiques + captures de rendu (revue visuelle du
 * front avant validation). Le serveur PHP est démarré automatiquement ; les
 * assets doivent être buildés au préalable (`npm run build`).
 *
 * L'authentification passe par une fixture de setup qui se connecte une fois
 * (utilisateur CGC seedé) et réutilise l'état de session (storageState).
 */
export default defineConfig({
    testDir: './tests/e2e',
    outputDir: './tests/e2e/.output',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:8000',
        trace: 'off',
        viewport: { width: 1280, height: 900 },
    },
    projects: [
        { name: 'setup', testMatch: /auth\.setup\.ts/ },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' },
            dependencies: ['setup'],
        },
    ],
    webServer: {
        command: 'php artisan serve --port=8000',
        url: 'http://127.0.0.1:8000',
        reuseExistingServer: true,
        timeout: 30_000,
    },
});
