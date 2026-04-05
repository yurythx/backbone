import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { CRMTableView } from "../crm-table-view"
import * as useCRMHook from "../use-crm"
import type { Deal, Pipeline } from "../use-crm"

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false
}

if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {}
}

if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {}
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

vi.mock("../use-crm", async () => {
  const actual = await vi.importActual("../use-crm")
  return {
    ...actual,
    useCRM: vi.fn(),
  }
})

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query")
  return {
    ...actual,
    useQuery: vi.fn(),
  }
})

vi.mock("../deal-details-modal", () => ({
  DealDetailsModal: ({ deal, open }: { deal: Deal; open: boolean }) =>
    open ? <div>Detalhes do card: {deal.title}</div> : null,
}))

describe("CRMTableView", () => {
  const mockUpdateDeal = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }
  const mockPipeline: Pipeline = {
    id: 1,
    name: "Suporte TI",
    description: "Pipeline principal",
    stages: [
      { id: 10, name: "Novo", order: 1, pipeline: 1 },
      { id: 20, name: "Em Andamento", order: 2, pipeline: 1 },
    ],
  }

  const mockDeals: Deal[] = [
    {
      id: 1,
      uuid: "deal-1",
      title: "Servidor Offline",
      contact: 1,
      contact_name: "Maria Financeiro",
      stage: 10,
      stage_name: "Novo",
      value: "1500.00",
      priority: "URGENT",
      owner: 7,
      is_closed: false,
      closing_date: "1970-04-03T10:00:00Z",
      custom_fields: { progress_percentage: 25 },
    },
    {
      id: 2,
      uuid: "deal-2",
      title: "Notebook Lento",
      contact: 2,
      contact_name: "Pedro Marketing",
      stage: 20,
      stage_name: "Em Andamento",
      value: "300.00",
      priority: "LOW",
      owner: 8,
      is_closed: false,
      custom_fields: { progress_percentage: 80 },
    },
    {
      id: 3,
      uuid: "deal-2",
      title: "Troca de Monitor",
      contact: 2,
      contact_name: "Pedro Marketing",
      stage: 999,
      stage_name: "Arquivado",
      value: "300.00",
      priority: "LOW",
      owner: 8,
      is_closed: false,
    },
  ]

  beforeEach(async () => {
    vi.clearAllMocks()
    mockUpdateDeal.mutateAsync.mockResolvedValue(undefined)

    const mockedUseCRM = vi.mocked(useCRMHook.useCRM)
    mockedUseCRM.mockReturnValue({
      deals: mockDeals,
      pipelines: [mockPipeline],
      contacts: [],
      isLoading: false,
      createDeal: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
      updateDeal: mockUpdateDeal,
    } as never)

    const reactQuery = await import("@tanstack/react-query")
    vi.mocked(reactQuery.useQuery).mockReturnValue({
      data: [
        { id: 7, username: "tecnico", first_name: "Ana", last_name: "Silva", email: "ana@empresa.com" },
        { id: 8, username: "suporte", first_name: "Paulo", last_name: "Souza", email: "paulo@empresa.com" },
      ],
    } as never)
  })

  it("renderiza apenas os cards do pipeline atual", () => {
    render(<CRMTableView pipeline={mockPipeline} />)

    expect(screen.getByText("Tabela operacional do pipeline")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Servidor Offline")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Notebook Lento")).toBeInTheDocument()
    expect(screen.queryByDisplayValue("Troca de Monitor")).not.toBeInTheDocument()
    expect(screen.getAllByText("Vencido").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Quase lá").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Crítico").length).toBeGreaterThan(0)
    expect(screen.getByText("Vencidos")).toBeInTheDocument()
    expect(screen.getByText("Progresso médio")).toBeInTheDocument()
    expect(screen.getByText("53%")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Editar título do card Servidor Offline" })).toBeInTheDocument()
    expect(screen.getByLabelText("Editar prazo do card Servidor Offline")).toBeInTheDocument()
    expect(screen.getByRole("spinbutton", { name: "Editar progresso do card Servidor Offline" })).toBeInTheDocument()
    expect(screen.getAllByText("25% concluído").length).toBeGreaterThan(0)
    expect(screen.getAllByText("80% concluído").length).toBeGreaterThan(0)
    expect(screen.getByRole("combobox", { name: "Filtrar por responsável" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Editar responsável do card Servidor Offline" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Editar coluna do card Servidor Offline" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Editar prioridade do card Servidor Offline" })).toBeInTheDocument()
  })

  it("abre o painel do card ao clicar na linha da tabela", async () => {
    const user = userEvent.setup()

    render(<CRMTableView pipeline={mockPipeline} />)

    await user.click(screen.getByLabelText("Abrir card Servidor Offline"))

    expect(screen.getByText("Detalhes do card: Servidor Offline")).toBeInTheDocument()
  })

  it("filtra os cards por coluna e prioridade", async () => {
    const user = userEvent.setup()

    render(<CRMTableView pipeline={mockPipeline} />)
    const clearButtons = screen.getAllByRole("button", { name: "Todas" })

    await user.click(screen.getByRole("button", { name: "Em Andamento" }))
    expect(screen.queryByDisplayValue("Servidor Offline")).not.toBeInTheDocument()
    expect(screen.getByDisplayValue("Notebook Lento")).toBeInTheDocument()

    await user.click(clearButtons[0])
    await user.click(screen.getByRole("button", { name: "Urgente" }))
    expect(screen.getByDisplayValue("Servidor Offline")).toBeInTheDocument()
    expect(screen.queryByDisplayValue("Notebook Lento")).not.toBeInTheDocument()
  })

  it("filtra os cards por responsável", async () => {
    const user = userEvent.setup()

    render(<CRMTableView pipeline={mockPipeline} />)

    await user.click(screen.getByRole("combobox", { name: "Filtrar por responsável" }))
    await user.click(screen.getByRole("option", { name: "Paulo Souza" }))

    expect(screen.queryByDisplayValue("Servidor Offline")).not.toBeInTheDocument()
    expect(screen.getByDisplayValue("Notebook Lento")).toBeInTheDocument()
  })

  it("ordena os cards por prioridade e progresso", async () => {
    const user = userEvent.setup()

    render(<CRMTableView pipeline={mockPipeline} />)

    await user.click(screen.getByRole("button", { name: "Ordenar por Prioridade" }))
    const prioritySortedRows = screen.getAllByRole("textbox", { name: /Editar título do card/i })
    expect(prioritySortedRows[0]).toHaveValue("Notebook Lento")

    await user.click(screen.getByRole("button", { name: "Ordenar por Progresso" }))
    await user.click(screen.getByRole("button", { name: "Ordenar por Progresso" }))
    const progressSortedRows = screen.getAllByRole("textbox", { name: /Editar título do card/i })
    expect(progressSortedRows[0]).toHaveValue("Notebook Lento")
  })

  it("ordena os cards por status consolidado", async () => {
    const user = userEvent.setup()

    render(<CRMTableView pipeline={mockPipeline} />)

    await user.click(screen.getByRole("button", { name: "Ordenar por Status" }))
    const statusSortedRows = screen.getAllByRole("textbox", { name: /Editar título do card/i })
    expect(statusSortedRows[0]).toHaveValue("Servidor Offline")
  })

  it("atualiza a prioridade inline pela tabela", async () => {
    const user = userEvent.setup()

    render(<CRMTableView pipeline={mockPipeline} />)

    await user.click(screen.getByRole("combobox", { name: "Editar prioridade do card Servidor Offline" }))
    await user.click(screen.getByRole("option", { name: "Alta" }))

    expect(mockUpdateDeal.mutateAsync).toHaveBeenCalledWith({
      id: 1,
      priority: "HIGH",
    })
  })

  it("atualiza o responsável inline pela tabela", async () => {
    const user = userEvent.setup()

    render(<CRMTableView pipeline={mockPipeline} />)

    await user.click(screen.getByRole("combobox", { name: "Editar responsável do card Servidor Offline" }))
    await user.click(screen.getByRole("option", { name: "Paulo Souza" }))

    expect(mockUpdateDeal.mutateAsync).toHaveBeenCalledWith({
      id: 1,
      owner: 8,
    })
  })

  it("atualiza o título inline pela tabela", async () => {
    const user = userEvent.setup()

    render(<CRMTableView pipeline={mockPipeline} />)

    const titleInput = screen.getByRole("textbox", { name: "Editar título do card Servidor Offline" })
    await user.clear(titleInput)
    await user.type(titleInput, "Servidor Principal Offline")
    fireEvent.keyDown(titleInput, { key: "Enter", code: "Enter", charCode: 13 })

    await waitFor(() => {
      expect(mockUpdateDeal.mutateAsync).toHaveBeenCalledWith({
        id: 1,
        title: "Servidor Principal Offline",
      })
    })
  })

  it("atualiza o prazo inline pela tabela", async () => {
    render(<CRMTableView pipeline={mockPipeline} />)

    const deadlineInput = screen.getByLabelText("Editar prazo do card Servidor Offline")
    fireEvent.change(deadlineInput, { target: { value: "2026-04-10T15:30" } })
    fireEvent.blur(deadlineInput)

    await waitFor(() => {
      expect(mockUpdateDeal.mutateAsync).toHaveBeenCalledWith({
        id: 1,
        closing_date: "2026-04-10T15:30",
      })
    })
  })

  it("atualiza o progresso inline pela tabela", async () => {
    render(<CRMTableView pipeline={mockPipeline} />)

    const progressInput = screen.getByRole("spinbutton", { name: "Editar progresso do card Servidor Offline" })
    fireEvent.change(progressInput, { target: { value: "75" } })
    fireEvent.blur(progressInput)

    await waitFor(() => {
      expect(mockUpdateDeal.mutateAsync).toHaveBeenCalledWith({
        id: 1,
        custom_fields: {
          progress_percentage: 75,
        },
      })
    })
  })
})
