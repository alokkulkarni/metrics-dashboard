import { test, expect } from '@playwright/test';

test.describe('Metrics Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should load the dashboard page', async ({ page }) => {
    // Check if the dashboard title is visible
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check if the navigation is present
    await expect(page.locator('text=Metrics Dashboard')).toBeVisible();
    
    // Check for navigation items
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Boards')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should navigate to boards page', async ({ page }) => {
    // Click on Boards navigation
    await page.click('text=Boards');
    
    // Check if we're on the boards page
    await expect(page.locator('h1')).toContainText('Boards');
    await expect(page.url()).toContain('/boards');
  });

  test('should navigate to settings page', async ({ page }) => {
    // Click on Settings navigation
    await page.click('text=Settings');
    
    // Check if we're on the settings page
    await expect(page.locator('h1')).toContainText('Settings');
    await expect(page.url()).toContain('/settings');
    
    // Check for Jira configuration section
    await expect(page.locator('text=Jira Configuration')).toBeVisible();
  });

  test('should display stats cards on dashboard', async ({ page }) => {
    // Check for stats cards
    await expect(page.locator('text=Total Boards')).toBeVisible();
    await expect(page.locator('text=Active Boards')).toBeVisible();
    await expect(page.locator('text=Scrum Boards')).toBeVisible();
    await expect(page.locator('text=Kanban Boards')).toBeVisible();
  });

  test('should show sync button in sidebar', async ({ page }) => {
    // Check for sync button
    await expect(page.locator('text=Sync Boards')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile menu button is visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    
    // Check if sidebar is visible
    await expect(page.locator('text=Metrics Dashboard')).toBeVisible();
  });
});
