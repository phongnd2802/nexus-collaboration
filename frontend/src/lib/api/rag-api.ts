import type { ExecuteCommandRequest, StreamCallbacks, StreamEvent } from './autopilot-api'

export const ragApi = {
  answerStream: async (
    data: ExecuteCommandRequest,
    callbacks: StreamCallbacks,
    token: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    const apiVersion = import.meta.env.VITE_API_VERSION || '/api/v1'
    const baseUrl = `${apiUrl}${apiVersion}`
    const url = `${baseUrl}/workspaces/${data.workspaceId}/rag/answer/stream`

    const userLocale = localStorage.getItem('nexus_locale') || navigator.language || 'en'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Accept-Language': userLocale,
      },
      body: JSON.stringify({
        query: data.command,
        sessionId: data.sessionId,
        limit: data.context?.limit || 10,
        docId: data.context?.docId,
        hasTables: data.context?.hasTables,
        hasImages: data.context?.hasImages,
        includeTrace: data.context?.includeTrace === true,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const payload = line.slice(6).trim()
          if (payload === '[DONE]') return
          if (!payload) continue

          try {
            const event: StreamEvent = JSON.parse(payload)

            switch (event.type) {
              case 'status':
                callbacks.onStatus?.(event.data.status, event.data.message)
                break
              case 'text':
                callbacks.onText?.(event.data.content)
                break
              case 'text_delta':
                callbacks.onTextDelta?.(event.data.content)
                break
              case 'complete':
                callbacks.onComplete?.(event.data)
                break
              case 'error':
                callbacks.onError?.(event.data.message)
                break
            }
          } catch (parseError) {
            console.error('Failed to parse RAG SSE event:', parseError)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },
}
