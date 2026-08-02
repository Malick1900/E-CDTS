import { test, expect } from '@playwright/test';

/*
 * Capture de rendu du barème CDTS (ADR-0034). Les tests Pest vérifient les
 * données envoyées ; celui-ci vérifie qu'un navigateur les affiche — un écran
 * peut être servi en 200 et rester blanc.
 */
test('rendu — Barème', async ({ page }) => {
    await page.goto('/admin/bareme');
    await expect(page.getByRole('heading', { name: 'Barème' })).toBeVisible();

    // Le volet Export s'ouvre par défaut : les deux montants d'une même ligne.
    await expect(page.getByText('CONTENEUR 20 PIEDS SEC (DRY)').first()).toBeVisible();
    await expect(page.getByText('14 326,10').first()).toBeVisible();
    await expect(page.getByText('21,84 €').first()).toBeVisible();

    await page.getByRole('button', { name: /Import/ }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('AUTRES EMBALLAGES').first()).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/.output/bareme-import-1280.png', fullPage: true });
});
