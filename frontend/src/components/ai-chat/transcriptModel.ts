export type TranscriptStatus = 'pending' | 'running' | 'completed' | 'error' | 'denied' | 'skipped'

export function orchestrationLabel(stage?: string) {
  switch (stage) {
    case 'planner':
      return 'Lap ke hoach'
    case 'retriever':
      return 'Truy xuat du lieu'
    case 'synthesizer':
      return 'Tong hop cau tra loi'
    case 'critic':
      return 'Kiem tra chat luong'
    case 'revision':
      return 'Chinh sua'
    case 'answer':
      return 'Hoan tat'
    default:
      return 'Xu ly tac vu'
  }
}

export function normalizeTranscriptStatus(status?: string): TranscriptStatus {
  if (
    status === 'completed' ||
    status === 'running' ||
    status === 'skipped' ||
    status === 'error' ||
    status === 'denied'
  ) {
    return status
  }
  return 'pending'
}
