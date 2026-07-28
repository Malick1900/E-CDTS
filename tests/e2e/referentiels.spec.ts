import { test, expect } from '@playwright/test';

/*
 * Capture de rendu du module Référentiels — onglet « Types de navire » (tranche
 * verticale câblée au backend). Sert de revue visuelle avant validation du
 * front. Les images sont écrites dans tests/e2e/.output/.
 */
test('rendu — Référentiels / Types de navire', async ({ page }) => {
    await page.goto('/admin/referentiels');
    await expect(page.getByRole('heading', { name: 'Référentiels' })).toBeVisible();

    // Bascule sur l'onglet Types de navire (bouton d'onglet de l'AdminShell).
    await page.getByRole('button', { name: /Types de navire/ }).click();
    await page.waitForTimeout(600);

    await page.screenshot({ path: 'tests/e2e/.output/referentiels-types-1280.png', fullPage: true });
});
