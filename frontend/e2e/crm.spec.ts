import { test, expect, loginByApi } from './fixtures';

test.describe.configure({ timeout: 120_000 });

function normalizeList<T>(data: T[] | { results?: T[] }) {
  return Array.isArray(data) ? data : data.results ?? [];
}

async function fetchUsers(request: Parameters<typeof test>[0] extends never ? never : any, auth: Awaited<ReturnType<typeof loginByApi>>) {
  const usersRes = await request.get(`${auth.apiUrl}/api/accounts/users/`, { headers: auth.headers });
  expect(usersRes.ok()).toBeTruthy();
  return normalizeList(await usersRes.json()) as Array<{ id: number; username: string; first_name?: string; last_name?: string }>;
}

async function fetchPipelines(request: Parameters<typeof test>[0] extends never ? never : any, auth: Awaited<ReturnType<typeof loginByApi>>) {
  const pipelinesRes = await request.get(`${auth.apiUrl}/api/crm/pipelines/`, { headers: auth.headers });
  expect(pipelinesRes.ok()).toBeTruthy();
  return normalizeList(await pipelinesRes.json()) as Array<{
    id: number;
    name: string;
    stages: Array<{ id: number; name: string }>;
    columns: Array<{ id: number; title: string; legacy_stage?: number | null }>;
  }>;
}

async function fetchContacts(request: Parameters<typeof test>[0] extends never ? never : any, auth: Awaited<ReturnType<typeof loginByApi>>) {
  const contactsRes = await request.get(`${auth.apiUrl}/api/crm/contacts/`, { headers: auth.headers });
  expect(contactsRes.ok()).toBeTruthy();
  return normalizeList(await contactsRes.json()) as Array<{ id: number; name: string }>;
}

async function fetchDeals(request: Parameters<typeof test>[0] extends never ? never : any, auth: Awaited<ReturnType<typeof loginByApi>>) {
  const dealsRes = await request.get(`${auth.apiUrl}/api/crm/deals/?omit_legacy_stage_fields=1`, { headers: auth.headers });
  expect(dealsRes.ok()).toBeTruthy();
  return normalizeList(await dealsRes.json()) as Array<{
    id: number;
    title: string;
    column?: number | null;
    column_id?: number | null;
    priority: string;
    description?: string;
    custom_fields?: Record<string, unknown>;
  }>;
}

async function fetchDealDetail(request: Parameters<typeof test>[0] extends never ? never : any, auth: Awaited<ReturnType<typeof loginByApi>>, dealId: number) {
  const dealRes = await request.get(`${auth.apiUrl}/api/crm/deals/${dealId}/?omit_legacy_stage_fields=1`, { headers: auth.headers });
  expect(dealRes.ok()).toBeTruthy();
  return await dealRes.json();
}

async function openCRM(page: Parameters<typeof test>[0] extends never ? never : any) {
  await page.goto('/crm', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'CRM & Atendimento' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Novo Card' })).toBeVisible({ timeout: 30_000 });
}

async function createDeal(page: Parameters<typeof test>[0] extends never ? never : any, dealTitle: string) {
  await page.getByRole('button', { name: 'Novo Card' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole('heading', { name: 'Novo Card no CRM' })).toBeVisible({ timeout: 15_000 });

  await dialog.locator('input[name="title"]').fill(dealTitle);

  const comboBoxes = dialog.locator('button[role="combobox"]');
  await comboBoxes.nth(0).click();
  await page.locator('[role="option"]').first().click();

  await comboBoxes.nth(1).click();
  await page.getByRole('option', { name: 'Média' }).click();

  await comboBoxes.nth(2).click();
  await page.locator('[role="option"]').first().click();

  const createRequest = page.waitForResponse(
    (response) =>
      response.url().includes('/api/crm/deals/?omit_legacy_stage_fields=1') &&
      response.request().method() === 'POST' &&
      response.ok(),
    { timeout: 20_000 }
  );

  await dialog.getByRole('button', { name: 'Salvar Card' }).click();
  const createResponse = await createRequest;
  const createdDeal = await createResponse.json();
  await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 15_000 });
  await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'CRM & Atendimento' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Novo Card' })).toBeVisible({ timeout: 30_000 });
  return createdDeal;
}

test.describe('CRM E2E Flow', () => {
  let auth: Awaited<ReturnType<typeof loginByApi>>;

  test.beforeEach(async ({ page, request }) => {
    auth = await loginByApi(page, request);

    const pipelinesRes = await request.get(`${auth.apiUrl}/api/crm/pipelines/`, { headers: auth.headers });
    expect(pipelinesRes.ok()).toBeTruthy();
    const pipelines = normalizeList(await pipelinesRes.json());

    let pipelineId = pipelines[0]?.id as number | undefined;
    if (!pipelineId) {
      const createPipelineRes = await request.post(`${auth.apiUrl}/api/crm/pipelines/`, {
        headers: auth.headers,
        data: { name: 'Pipeline E2E', description: 'Pipeline criado automaticamente para testes' },
      });
      expect(createPipelineRes.ok()).toBeTruthy();
      pipelineId = (await createPipelineRes.json()).id;
    }

    const contactsRes = await request.get(`${auth.apiUrl}/api/crm/contacts/`, { headers: auth.headers });
    expect(contactsRes.ok()).toBeTruthy();
    const contacts = normalizeList(await contactsRes.json());

    if (contacts.length === 0) {
      const createContactRes = await request.post(`${auth.apiUrl}/api/crm/contacts/`, {
        headers: auth.headers,
        data: {
          name: 'Contato E2E',
          email: `contato-e2e-${Date.now()}@example.com`,
          phone: '11999999999',
          company_name: 'Empresa E2E',
        },
      });
      expect(createContactRes.ok()).toBeTruthy();
    }
  });
  
  test('deve criar um novo Deal no Kanban', async ({ page, request }) => {
    const dealTitle = `Test Deal ${Date.now()}`;
    await openCRM(page);
    const createdDeal = await createDeal(page, dealTitle);
    expect(createdDeal?.title).toBe(dealTitle);

    await expect(async () => {
      const savedDeal = await fetchDealDetail(request, auth, createdDeal.id);
      expect(savedDeal?.title).toBe(dealTitle);
    }).toPass({ timeout: 20_000 });
  });

  test('deve abrir um card pela visualização em tabela', async ({ page, request }) => {
    const pipelines = await fetchPipelines(request, auth);
    const contacts = await fetchContacts(request, auth);
    const activePipeline = pipelines[0];
    const firstColumn = activePipeline?.columns?.[0];
    expect(activePipeline).toBeTruthy();
    expect(firstColumn).toBeTruthy();
    expect(contacts.length).toBeGreaterThan(0);

    const createDealRes = await request.post(`${auth.apiUrl}/api/crm/deals/`, {
      headers: auth.headers,
      data: {
        title: `Tabela Deal ${Date.now()}`,
        contact: contacts[0].id,
        column: firstColumn?.id,
        priority: 'MEDIUM',
      },
    });
    expect(createDealRes.ok()).toBeTruthy();
    const createdDeal = await createDealRes.json();

    await openCRM(page);
    await page.getByRole('tab', { name: 'Tabela' }).click();
    const searchbox = page.getByRole('searchbox', { name: 'Buscar cards por título' });
    await expect(searchbox).toBeVisible({ timeout: 20_000 });
    await searchbox.fill(createdDeal.title);

    const row = page.getByLabel(`Abrir card ${createdDeal.title}`).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.focus();
    await row.press('Enter');

    await expect(page.getByText('Monday-style')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: createdDeal.title })).toBeVisible({ timeout: 15_000 });
  });

  test('deve mover um Deal de coluna (Drag and Drop)', async ({ page, request }) => {
    await openCRM(page);

    const firstCard = page.locator('.glass-card').first();
    if ((await firstCard.count()) === 0) {
      await createDeal(page, `Drag Deal ${Date.now()}`);
    }

    await expect(page.locator('.glass-card').first()).toBeVisible({ timeout: 20_000 });
    const currentFirstCard = page.locator('.glass-card').first();

    const cardTitle = await currentFirstCard.locator('h4').first().innerText();
    const dealsBefore = await fetchDeals(request, auth);
    const dealBefore = dealsBefore.find((deal) => deal.title === cardTitle);
    expect(dealBefore).toBeTruthy();
    const draggableCard = page.locator(`[data-deal-id="${dealBefore?.id}"]`).first();
    const currentColumnId = dealBefore?.column_id || dealBefore?.column;
    const targetColumn = page.locator(`[data-column-id]:not([data-column-id="${currentColumnId}"])`).first();
    const targetColumnId = Number(await targetColumn.getAttribute('data-column-id'));

    await expect(draggableCard).toBeVisible({ timeout: 20_000 });
    await expect(targetColumn).toBeVisible({ timeout: 20_000 });

    const updateRequest = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/crm/deals/${dealBefore?.id}/?omit_legacy_stage_fields=1`) &&
        response.request().method() === 'PATCH' &&
        response.ok(),
      { timeout: 20_000 }
    );

    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await draggableCard.dispatchEvent('dragstart', { dataTransfer });
    await targetColumn.dispatchEvent('dragover', { dataTransfer });
    await targetColumn.dispatchEvent('drop', { dataTransfer });
    const updateResponse = await updateRequest;
    expect(updateResponse.request().postDataJSON()?.column).toBe(targetColumnId);

    await expect(page.getByText('Progresso atualizado!')).toBeVisible({ timeout: 15_000 });
  });

  test('deve editar um card com prioridade, usuários relacionados e descrição', async ({ page, request }) => {
    await openCRM(page);

    const users = await fetchUsers(request, auth);
    expect(users.length).toBeGreaterThan(0);
    const relatedUser = users[0];
    const relatedUserName = `${relatedUser.first_name ?? ''} ${relatedUser.last_name ?? ''}`.trim() || relatedUser.username;

    const firstCard = page.locator('.glass-card').first();
    if ((await firstCard.count()) === 0) {
      await createDeal(page, `Editable Deal ${Date.now()}`);
    }

    await expect(page.locator('.glass-card').first()).toBeVisible({ timeout: 20_000 });
    const currentFirstCard = page.locator('.glass-card').first();
    const cardTitle = await currentFirstCard.locator('h4').first().innerText();
    const dealsBefore = await fetchDeals(request, auth);
    const dealBefore = dealsBefore.find((deal) => deal.title === cardTitle);
    expect(dealBefore).toBeTruthy();

    await currentFirstCard.click();
    await expect(page.getByText('Monday-style')).toBeVisible({ timeout: 15_000 });

    const primarySection = page.locator('section').filter({ hasText: 'Campos principais' });
    await primarySection.locator('button[role="combobox"]').nth(1).click();
    await page.getByRole('option', { name: 'Alta' }).click();

    const description = `Descrição editada no E2E ${Date.now()}`;
    await page.getByPlaceholder('Descreva o andamento, bloqueios, próximos passos e contexto do card...').fill(description);

    const userRow = page.locator('label').filter({ hasText: relatedUserName }).first();
    await userRow.locator('button[role="checkbox"]').click();

    const updateRequest = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/crm/deals/${dealBefore?.id}/?omit_legacy_stage_fields=1`) &&
        response.request().method() === 'PATCH' &&
        response.ok(),
      { timeout: 20_000 }
    );

    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    const updateResponse = await updateRequest;
    const payload = updateResponse.request().postDataJSON();
    expect(payload?.priority).toBe('HIGH');
    expect(payload?.description).toBe(description);
    expect(payload?.custom_fields?.related_user_ids).toContain(relatedUser.id);

    await expect(page.getByText('Progresso atualizado!')).toBeVisible({ timeout: 15_000 });

    await expect(async () => {
      const dealsAfter = await fetchDeals(request, auth);
      const dealAfter = dealsAfter.find((deal) => deal.id === dealBefore?.id);
      expect(dealAfter?.priority).toBe('HIGH');
      expect(dealAfter?.description).toBe(description);
      expect(Array.isArray(dealAfter?.custom_fields?.related_user_ids)).toBeTruthy();
      expect((dealAfter?.custom_fields?.related_user_ids as number[] | undefined) || []).toContain(relatedUser.id);
    }).toPass({ timeout: 20_000 });
  });

  test('deve manter o card em Concluído após mover de Em Andamento', async ({ page, request }) => {
    const pipelines = await fetchPipelines(request, auth);
    const activePipeline = pipelines[0];
    expect(activePipeline).toBeTruthy();

    const inProgressColumn = activePipeline?.columns.find((column) => column.title === 'Em Andamento');
    const doneColumn = activePipeline?.columns.find((column) => column.title === 'Concluído');
    const contacts = await fetchContacts(request, auth);
    expect(inProgressColumn).toBeTruthy();
    expect(doneColumn).toBeTruthy();
    expect(contacts.length).toBeGreaterThan(0);

    const createDealRes = await request.post(`${auth.apiUrl}/api/crm/deals/`, {
      headers: auth.headers,
      data: {
        title: `Concluir Deal ${Date.now()}`,
        contact: contacts[0].id,
        column: inProgressColumn?.id,
        priority: 'MEDIUM',
      },
    });
    expect(createDealRes.ok()).toBeTruthy();
    const createdDeal = await createDealRes.json();

    const updateDealRes = await request.patch(`${auth.apiUrl}/api/crm/deals/${createdDeal.id}/`, {
      headers: auth.headers,
      data: { column: doneColumn?.id },
    });
    expect(updateDealRes.ok()).toBeTruthy();
    const updatedDeal = await updateDealRes.json();
    expect(updatedDeal.column_id || updatedDeal.column).toBe(doneColumn?.id);

    await expect(async () => {
      const dealAfter = await fetchDealDetail(request, auth, createdDeal.id);
      expect(dealAfter?.column_id || dealAfter?.column).toBe(doneColumn?.id);
    }).toPass({ timeout: 20_000 });
  });

});
