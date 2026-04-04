import { test, expect } from '@playwright/test';

test.describe('Campaigns Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@advertising-ai.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*app/);
  });

  test('should display campaigns page with KPIs', async ({ page }) => {
    await page.goto('/app/campaigns');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Campaigns');
    
    // Check KPI cards are visible
    await expect(page.locator('[data-testid="kpi-total-campaigns"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-active-campaigns"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-total-spend"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-average-roas"]')).toBeVisible();
  });

  test('should display campaign list', async ({ page }) => {
    await page.goto('/app/campaigns');
    
    // Check campaigns table is visible
    await expect(page.locator('[data-testid="campaigns-table"]')).toBeVisible();
    
    // Check table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Channel")')).toBeVisible();
    await expect(page.locator('th:has-text("Budget")')).toBeVisible();
    await expect(page.locator('th:has-text("ROAS")')).toBeVisible();
  });

  test('should create new campaign', async ({ page }) => {
    await page.goto('/app/campaigns');
    
    // Click create campaign button
    await page.click('[data-testid="create-campaign-btn"]');
    
    // Check create form is visible
    await expect(page.locator('[data-testid="campaign-form"]')).toBeVisible();
    
    // Fill campaign details
    await page.fill('[data-testid="campaign-name"]', 'Test Campaign E2E');
    await page.fill('[data-testid="campaign-description"]', 'Campaign created by E2E test');
    await page.selectOption('[data-testid="campaign-channel"]', 'Search');
    await page.fill('[data-testid="campaign-budget"]', '5000');
    
    // Submit form
    await page.click('[data-testid="save-campaign-btn"]');
    
    // Check success message
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Campaign created successfully');
    
    // Check campaign appears in list
    await expect(page.locator('td:has-text("Test Campaign E2E")')).toBeVisible();
  });

  test('should validate campaign form', async ({ page }) => {
    await page.goto('/app/campaigns');
    await page.click('[data-testid="create-campaign-btn"]');
    
    // Try to submit empty form
    await page.click('[data-testid="save-campaign-btn"]');
    
    // Should show validation errors
    await expect(page.locator('text=Campaign name is required')).toBeVisible();
    await expect(page.locator('text=Channel is required')).toBeVisible();
  });

  test('should filter campaigns by status', async ({ page }) => {
    await page.goto('/app/campaigns');
    
    // Click status filter
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-active"]');
    
    // Wait for filter to apply
    await page.waitForTimeout(1000);
    
    // Check that only active campaigns are shown
    const campaignRows = page.locator('[data-testid="campaign-row"]');
    const count = await campaignRows.count();
    
    if (count > 0) {
      // Check first campaign is active
      const firstRowStatus = campaignRows.first().locator('[data-testid="campaign-status"]');
      await expect(firstRowStatus).toContainText('Active');
    }
  });

  test('should search campaigns', async ({ page }) => {
    await page.goto('/app/campaigns');
    
    // Type in search box
    await page.fill('[data-testid="campaign-search"]', 'Test');
    
    // Wait for search to apply
    await page.waitForTimeout(1000);
    
    // Check search results
    const campaignRows = page.locator('[data-testid="campaign-row"]');
    const count = await campaignRows.count();
    
    if (count > 0) {
      // Check that at least one result contains "Test"
      const firstRowName = campaignRows.first().locator('[data-testid="campaign-name"]');
      await expect(firstRowName).toContainText('Test');
    }
  });

  test('should export campaigns', async ({ page }) => {
    await page.goto('/app/campaigns');
    
    // Click export button
    await page.click('[data-testid="export-campaigns-btn"]');
    
    // Check export success message
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Campaigns exported successfully');
  });

  test('should view campaign details', async ({ page }) => {
    await page.goto('/app/campaigns');
    
    // Wait for campaigns to load
    await page.waitForTimeout(2000);
    
    // Click on first campaign
    const firstCampaign = page.locator('[data-testid="campaign-row"]').first();
    if (await firstCampaign.isVisible()) {
      await firstCampaign.click();
      
      // Check campaign details page
      await expect(page.locator('h1')).toContainText('Campaign Details');
      await expect(page.locator('[data-testid="campaign-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="campaign-metrics"]')).toBeVisible();
    }
  });

  test('should handle campaign actions', async ({ page }) => {
    await page.goto('/app/campaigns');
    
    // Wait for campaigns to load
    await page.waitForTimeout(2000);
    
    // Find first campaign with actions
    const firstCampaign = page.locator('[data-testid="campaign-row"]').first();
    if (await firstCampaign.isVisible()) {
      // Click actions dropdown
      await firstCampaign.locator('[data-testid="campaign-actions"]').click();
      
      // Check action menu items
      await expect(page.locator('[data-testid="action-edit"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-duplicate"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-pause"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-delete"]')).toBeVisible();
    }
  });
});
