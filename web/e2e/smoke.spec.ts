import { test, expect } from "@playwright/test";

test("signup/login → advisor → recommend shows results", async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = "test-password-123";

  // Go to signup (if your app redirects, this still works)
  await page.goto("http://localhost:5173/signup");

  // Fill fields using stable selectors
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);

  // Submit without depending on button text
  const signupResPromise = page.waitForResponse((r) => r.url().includes("/auth/signup"));
  await page.locator('form button[type="submit"]').click();
  const signupRes = await signupResPromise;

  expect(signupRes.status()).toBe(200);

  // Navigate to advisor
  await page.goto("http://localhost:5173/advisor");

  // Recommend
  const recResPromise = page.waitForResponse(
    (r) => r.url().includes("/recommend") && r.request().method() === "POST" && r.status() === 200
  );  
  await page.getByRole("button", { name: /recommend/i }).click();
  const recRes = await recResPromise;

  expect(recRes.status()).toBe(200);
  const body = await recRes.json();
  expect(body.ok).toBe(true);
  expect(body.results?.singleModels?.length ?? 0).toBeGreaterThan(0);


  // Assert results are visible
  await expect(page.getByText(/#1\s+—/)).toBeVisible({ timeout: 10_000 });
});
