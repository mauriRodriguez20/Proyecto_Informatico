import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    technology: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import {
  listTechnologies,
  getTechnologyById,
  upsertTechnologyByName,
} from '@/modules/technologies/technologies.service'

describe('listTechnologies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna todas las tecnologías sin filtro', async () => {
    const mockData = [{ id: 't1', name: 'TypeScript', slug: 'typescript' }]
    vi.mocked(prisma.$transaction).mockResolvedValue([mockData, 1] as any)

    const result = await listTechnologies({ limit: 20 })

    expect(result.data).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('filtra por search cuando se proporciona', async () => {
    const mockData = [{ id: 't2', name: 'JavaScript', slug: 'javascript' }]
    vi.mocked(prisma.$transaction).mockResolvedValue([mockData, 1] as any)

    const result = await listTechnologies({ search: 'java', limit: 10 })

    expect(result.data).toHaveLength(1)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('retorna lista vacía si no hay tecnologías', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const result = await listTechnologies({ limit: 20 })

    expect(result.data).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})

describe('getTechnologyById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna null si la tecnología no existe', async () => {
    vi.mocked(prisma.technology.findUnique).mockResolvedValue(null)

    const result = await getTechnologyById('no-existe')
    expect(result).toBeNull()
  })

  it('retorna la tecnología si existe', async () => {
    vi.mocked(prisma.technology.findUnique).mockResolvedValue({
      id: 'tech-1', name: 'Go', slug: 'go',
    } as any)

    const result = await getTechnologyById('tech-1')
    expect(result?.name).toBe('Go')
  })
})

describe('upsertTechnologyByName', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna la tecnología existente si el slug ya existe', async () => {
    vi.mocked(prisma.technology.findUnique).mockResolvedValue({
      id: 'existing', name: 'TypeScript', slug: 'typescript',
    } as any)

    const result = await upsertTechnologyByName({ name: 'TypeScript' })
    expect(result.id).toBe('existing')
    expect(prisma.technology.create).not.toHaveBeenCalled()
  })

  it('crea una nueva tecnología si el slug no existe', async () => {
    vi.mocked(prisma.technology.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.technology.create).mockResolvedValue({
      id: 'new-id', name: 'Kotlin', slug: 'kotlin',
    } as any)

    const result = await upsertTechnologyByName({ name: 'Kotlin' })
    expect(result.name).toBe('Kotlin')
    expect(prisma.technology.create).toHaveBeenCalled()
  })

  it('lanza INVALID_TECHNOLOGY_NAME si el slug queda vacío', async () => {
    await expect(upsertTechnologyByName({ name: '---' })).rejects.toThrow('INVALID_TECHNOLOGY_NAME')
  })

  it('normaliza el nombre con mayúsculas correctas', async () => {
    vi.mocked(prisma.technology.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.technology.create).mockResolvedValue({
      id: 'new-id', name: 'React', slug: 'react',
    } as any)

    const result = await upsertTechnologyByName({ name: 'react' })
    expect(result.name).toBe('React')
  })

  it('retorna tecnología existente por findFirst cuando create lanza P2002 (race condition)', async () => {
    vi.mocked(prisma.technology.findUnique)
      .mockResolvedValueOnce(null) // primera búsqueda por slug → no existe

    // Simular error P2002 de Prisma
    const { Prisma: PrismaClient } = await import('@prisma/client')
    const p2002Error = new PrismaClient.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['slug'] },
    })
    vi.mocked(prisma.technology.create).mockRejectedValue(p2002Error)

    vi.mocked(prisma.technology.findFirst).mockResolvedValue({
      id: 'race-winner', name: 'Node', slug: 'node',
    } as any)

    const result = await upsertTechnologyByName({ name: 'Node' })
    expect(result.id).toBe('race-winner')
    expect(prisma.technology.findFirst).toHaveBeenCalled()
  })

  it('relanza el error si create falla por razón distinta a P2002', async () => {
    vi.mocked(prisma.technology.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.technology.create).mockRejectedValue(new Error('DB connection lost'))

    await expect(upsertTechnologyByName({ name: 'Elixir' })).rejects.toThrow('DB connection lost')
  })
})
