import service from './request'

const API_BASE = '/api/pageindex'

export interface CustomAPIConfig {
  base_url: string
  api_key: string
  model_id: string
}

export async function buildPageIndex(bookId: string, file: File): Promise<any> {
  const form = new FormData()
  form.append('book_id', bookId)
  form.append('epub_file', file, file.name)

  const response = await service.post(`${API_BASE}/build`, form, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export async function getPageIndexStatus(bookId: string): Promise<any> {
  const response = await service.get(`${API_BASE}/status/${bookId}`)
  return response.data
}

export async function answerPageIndex(params: {
  book_id: string
  query: string
  access_token?: string
  resource_url?: string
  custom_api?: CustomAPIConfig
  model?: string
  temperature?: number
  top_k?: number
}): Promise<any> {
  const response = await service.post(`${API_BASE}/answer`, params)
  return response.data
}

export async function searchLibrary(params: {
  query: string
  book_ids?: string[]
  top_k_per_book?: number
  top_k_total?: number
}): Promise<any> {
  const response = await service.post(`${API_BASE}/search`, params)
  return response.data
}
