import { expect, test, type Page } from '@playwright/test';

const composer = (page: Page) => page.getByRole('textbox', { name: 'Message' });
const sidebar = (page: Page) =>
  page.getByRole('navigation', { name: 'Conversations' });
const replies = (page: Page) =>
  page.getByRole('article', { name: 'Assistant' });

async function send(page: Page, text: string) {
  await composer(page).fill(text);
  await composer(page).press('Enter');
}

/** Waits for the mock provider's reply to finish streaming. */
async function waitForReply(page: Page) {
  await expect(replies(page).last()).toContainText('End of mock response.');
  await expect(
    page.getByRole('button', { name: 'Send message' }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(composer(page)).toBeEnabled();
});

test('creates a conversation by sending a message', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'How can I help?' }),
  ).toBeVisible();

  await send(page, 'Hello there');

  await expect(page.getByRole('article', { name: 'You' })).toHaveText(
    /Hello there/,
  );
  await expect(composer(page)).toHaveValue('');
  await expect(
    sidebar(page).getByRole('button', { name: 'Hello there', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Hello there',
  );
});

test('streams the assistant response incrementally', async ({ page }) => {
  await send(page, 'Explain streaming');

  // Partial text is visible while the response is still in progress…
  await expect(replies(page)).toContainText('Here is a mock answer');
  await expect(
    page.getByRole('button', { name: 'Stop response' }),
  ).toBeVisible();
  await expect(replies(page)).not.toContainText('End of mock response.');

  // …then it completes, with Markdown rendered.
  await waitForReply(page);
  await expect(replies(page).locator('strong')).toHaveText('Explain streaming');
  await expect(
    replies(page).getByRole('button', { name: 'Copy code' }),
  ).toBeVisible();
  await expect(replies(page)).toHaveCount(1);
});

test('switches conversations and restores history after a reload', async ({
  page,
}) => {
  await send(page, 'Alpha topic');
  await waitForReply(page);

  await page.getByRole('button', { name: 'New chat' }).click();
  await send(page, 'Beta topic');
  await waitForReply(page);

  await sidebar(page)
    .getByRole('button', { name: 'Alpha topic', exact: true })
    .click();
  await expect(replies(page)).toContainText('mock answer about Alpha topic');
  await expect(page.getByText('Beta topic')).toHaveCount(1); // sidebar only

  await page.reload();
  await expect(composer(page)).toBeEnabled();

  // Most recently active first.
  await expect(sidebar(page).getByRole('listitem')).toHaveText([
    'Beta topic',
    'Alpha topic',
  ]);
  await expect(
    sidebar(page).getByRole('button', { name: 'Alpha topic', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(replies(page)).toContainText('mock answer about Alpha topic');

  await sidebar(page)
    .getByRole('button', { name: 'Beta topic', exact: true })
    .click();
  await expect(page.getByRole('article', { name: 'You' })).toHaveText(
    /Beta topic/,
  );
  await expect(replies(page)).toContainText('mock answer about Beta topic');
});

test('cancels a response, keeping the partial text', async ({ page }) => {
  await send(page, '[slow] long story');
  await expect(replies(page)).toContainText('Here is');

  await page.getByRole('button', { name: 'Stop response' }).click();

  await expect(replies(page)).toContainText('Response stopped.');
  await expect(replies(page)).toContainText('Here is');
  await expect(replies(page)).not.toContainText('End of mock response.');
  await expect(composer(page)).toBeFocused();

  // The stopped state survives a reload.
  await page.reload();
  await expect(replies(page)).toContainText('Response stopped.');
});

test('shows a failed request and retries it without duplicating messages', async ({
  page,
}) => {
  // The mock fails a [fail-once] prompt only the first time the server sees
  // it, so make it unique per run (repeats and CI retries).
  await send(
    page,
    `[fail-once] flaky question ${test.info().testId}-${Date.now()}`,
  );

  const reply = replies(page);
  await expect(reply).toContainText('The assistant is unavailable right now.');

  await reply.getByRole('button', { name: 'Retry' }).click();

  await waitForReply(page);
  await expect(reply).not.toContainText('unavailable');
  await expect(page.getByRole('article', { name: 'You' })).toHaveCount(1);
  await expect(replies(page)).toHaveCount(1);
});
