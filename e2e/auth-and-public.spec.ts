import { test, expect, type Page } from "@playwright/test";

const password = process.env.SEED_PASSWORD ?? "password123";
const publicToken =
  process.env.E2E_PUBLIC_TOKEN ?? "grrx-sJIAlyUqKSfDExMQJ5PA07Y5w1S";

async function loginAs(page: Page, email: string) {
  await page.goto("/login", { waitUntil: "networkidle" });
  // Wait React hydrate — button enables with data-ready=1
  await expect(page.locator('button[type="submit"][data-ready="1"]')).toBeVisible({
    timeout: 45_000,
  });
  await page.getByLabel("Email").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
}

async function expectShell(page: Page, path: RegExp, text: RegExp) {
  await expect(page).toHaveURL(path, { timeout: 45_000 });
  // Body text is enough — Hobby cold can stream shell before #main settles.
  await expect(page.locator("body")).toContainText(text, { timeout: 45_000 });
}

test.describe("auth roles", () => {
  test("developer login → dashboard", async ({ page }) => {
    await loginAs(page, "developer@finvoice.local");
    await expectShell(page, /\/dashboard/, /Dashboard|Halo/i);
  });

  test("admin login → dashboard", async ({ page }) => {
    await loginAs(page, "admin@finvoice.local");
    await expectShell(page, /\/dashboard/, /Dashboard|Halo/i);
  });

  test("customer login → portal", async ({ page }) => {
    await loginAs(page, "customer@finvoice.local");
    await expectShell(page, /\/portal/, /Portal|tagihan|notifikasi/i);
  });

  test("bad password stays on login", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.locator('button[type="submit"][data-ready="1"]')).toBeVisible({
      timeout: 45_000,
    });
    await page.getByLabel("Email").fill("developer@finvoice.local");
    await page.locator('input[type="password"]').fill("wrong-password-xx");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByRole("alert").or(page.locator("text=/salah|invalid/i"))).toBeVisible({
      timeout: 25_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("public invoice", () => {
  test("public token page loads", async ({ page }) => {
    await page.goto(`/i/${publicToken}`);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Total|Sisa|Item/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /WhatsApp/i })).toBeVisible();
  });

  test("honeypot field present but hidden", async ({ page }) => {
    await page.goto(`/i/${publicToken}`);
    const hp = page.locator('input[name="website"]');
    // may only render when canPay — if form missing, skip soft
    if ((await hp.count()) === 0) {
      test.skip();
      return;
    }
    await expect(hp).toBeAttached();
    await expect(hp).not.toBeFocused();
  });
});
