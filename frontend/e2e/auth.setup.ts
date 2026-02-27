/**
 * Auth setup — runs ONCE before all authenticated tests.
 * Logs in with test credentials and saves auth state to disk.
 * All other tests reuse this state (no repeated login overhead).
 *
 * Requirements:
 *   - Local dev server running on port 3005
 *   - Backend running with a test user: E2E_USERNAME / E2E_PASSWORD / E2E_COMPANY_SLUG
 *   - Set these in a .env.test.local file or pass via environment
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

// Ensure the .auth directory exists
fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

const E2E_USERNAME = process.env.E2E_USERNAME || 'suporte'
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'suporte123'
const E2E_COMPANY = process.env.E2E_COMPANY_NAME || 'Backbone 123'


setup('authenticate', async ({ page }) => {
    await page.goto('/login')

    // Wait for company selector to load
    await page.waitForSelector('[aria-label="Selecionar empresa"]', { timeout: 15_000 })

    // Select company
    await page.click('[aria-label="Selecionar empresa"]')

    // Wait for options to appear in the portal/popover
    await page.waitForSelector('[role="option"]', { timeout: 10_000, state: 'visible' })

    // Use the name to find the option (less sensitive)
    const option = page.getByRole('option', { name: E2E_COMPANY }).first()
    await option.click()



    // Fill credentials
    await page.fill('[aria-label="Nome de usuário"]', E2E_USERNAME)
    await page.fill('[aria-label="Senha"]', E2E_PASSWORD)

    // Submit and wait for redirect
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 20_000 })

    // Verify we're actually logged in
    await expect(page).not.toHaveURL('/login')

    // Save auth state (cookies + localStorage)
    await page.context().storageState({ path: AUTH_FILE })
})
