import { test as setup } from '@playwright/test';

/*
 * Fixture d'authentification : connexion unique avec l'utilisateur de
 * développement (profil Administrateur — porte la permission
 * `referentiels.gerer`), état de session sauvegardé pour les autres specs.
 */
const authFile = 'tests/e2e/.auth/user.json';

setup('authentification CGC', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password');
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/dashboard');
    await page.context().storageState({ path: authFile });
});
