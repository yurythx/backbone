import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KanbanBoard } from '../kanban-board'
import * as useCRMHook from '../use-crm'
import type { Deal, Pipeline } from '../use-crm'

// Mock do hook useCRM
vi.mock('../use-crm', () => ({
  useCRM: vi.fn(),
}))

describe('KanbanBoard Component', () => {
  const mockPipeline: Pipeline = {
    id: 1,
    name: 'Suporte TI',
    stages: [
      { id: 10, name: 'Novo', order: 10, pipeline: 1 },
      { id: 20, name: 'Em Andamento', order: 20, pipeline: 1 },
    ],
  }

  const mockDeals: Deal[] = [
    {
      id: 1,
      uuid: 'deal-1',
      title: 'Servidor Offline',
      contact: 1,
      contact_name: 'Maria Financeiro',
      stage: 10,
      stage_name: 'Novo',
      priority: 'URGENT',
      owner: 1,
      is_closed: false,
    },
    {
       id: 2,
       uuid: 'deal-2',
       title: 'Notebook Lento',
       contact: 2,
       contact_name: 'Pedro Marketing',
       stage: 20,
       stage_name: 'Em En Andamento',
       priority: 'MEDIUM',
       owner: 1,
       is_closed: false,
    }
  ]

  it('deve renderizar as colunas do pipeline corretamente', () => {
    const mockedUseCRM = vi.mocked(useCRMHook.useCRM)
    mockedUseCRM.mockReturnValue({
      deals: mockDeals,
      updateDeal: { mutateAsync: vi.fn() },
    })

    render(<KanbanBoard pipeline={mockPipeline} />)

    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(screen.getByText('Em Andamento')).toBeInTheDocument()
  })

  it('deve exibir os cards nas colunas corretas', () => {
    const mockedUseCRM = vi.mocked(useCRMHook.useCRM)
    mockedUseCRM.mockReturnValue({
      deals: mockDeals,
      updateDeal: { mutateAsync: vi.fn() },
    })

    render(<KanbanBoard pipeline={mockPipeline} />)

    expect(screen.getByText('Servidor Offline')).toBeInTheDocument()
    expect(screen.getByText('Notebook Lento')).toBeInTheDocument()
  })

  it('deve mostrar a prioridade correta nos cards', () => {
    const mockedUseCRM = vi.mocked(useCRMHook.useCRM)
    mockedUseCRM.mockReturnValue({
      deals: mockDeals,
      updateDeal: { mutateAsync: vi.fn() },
    })

    render(<KanbanBoard pipeline={mockPipeline} />)

    expect(screen.getByText('URGENT')).toBeInTheDocument()
  })
})
