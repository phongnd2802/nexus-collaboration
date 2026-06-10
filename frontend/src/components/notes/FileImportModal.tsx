import { useState, useCallback, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { ScrollArea } from '../ui/scroll-area'
import { Skeleton } from '../ui/skeleton'
import { Upload, FileText, Link, Loader2, Folder, ChevronRight, Home, AlertCircle, Search, Table, Presentation } from 'lucide-react'
import { useToast } from '../ui/use-toast'
import { notesApi } from '../../lib/api/notes-api'
import { cn } from '../../lib/utils'
import mammoth from 'mammoth'

interface BreadcrumbItem {
  id: string
  name: string
}

interface FileImportModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  parentId?: string
  onNoteCreated?: (noteId: string) => void
}

export function FileImportModal({ isOpen, onClose, workspaceId, parentId, onNoteCreated }: FileImportModalProps) {
  const intl = useIntl()
  const { toast } = useToast()
  const [importType, setImportType] = useState<'file' | 'url' | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)


  const handleClose = useCallback(() => {
    setImportType(null)
    setTitle('')
    setUrl('')
    setSelectedFile(null)
    setIsProcessing(false)
    onClose()
  }, [onClose])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setTitle(file.name.replace(/\.[^/.]+$/, '')) // Remove file extension
    }
  }, [])

  // Check if file is a PDF
  const isPdfFile = (file: File): boolean => {
    return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
  }

  // Process non-PDF files locally (TXT, Markdown, Word)
  const processFileContent = async (file: File): Promise<string> => {
    const fileName = file.name.toLowerCase()

    // Handle Word documents (.docx)
    if (fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        return result.value || '<p></p>'
      } catch (error) {
        console.error('Failed to parse Word document:', error)
        throw new Error('Failed to parse Word document. Please ensure the file is a valid .docx file.')
      }
    }

    // Handle plain text files (.txt)
    if (fileName.endsWith('.txt') || file.type === 'text/plain') {
      const content = await file.text()
      // Convert plain text to HTML paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim())
      if (paragraphs.length === 0) {
        return `<p>${content.replace(/\n/g, '<br>')}</p>`
      }
      return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
    }

    // Handle Markdown files (.md)
    if (fileName.endsWith('.md') || file.type === 'text/markdown') {
      const content = await file.text()
      // Simple markdown to HTML conversion
      let html = content
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Code blocks
        .replace(/```[\s\S]*?```/g, (match) => {
          const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '')
          return `<pre><code>${code}</code></pre>`
        })
        // Inline code
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Links
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">')
        // Unordered lists
        .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Blockquotes
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr>')
        // Tables (basic support)
        .replace(/^\|(.+)\|$/gm, (match) => {
          const cells = match.split('|').filter(c => c.trim())
          if (cells.every(c => /^[\s\-:]+$/.test(c))) {
            return '' // Skip separator row
          }
          const cellHtml = cells.map(c => `<td style="border: 1px solid #ddd; padding: 8px;">${c.trim()}</td>`).join('')
          return `<tr>${cellHtml}</tr>`
        })
        // Paragraphs (lines that don't start with HTML tags)
        .split('\n')
        .map(line => {
          const trimmed = line.trim()
          if (!trimmed) return ''
          if (trimmed.startsWith('<')) return trimmed
          return `<p>${trimmed}</p>`
        })
        .join('\n')

      // Wrap consecutive <li> elements in <ul>
      html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)

      // Wrap consecutive <tr> elements in <table>
      html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (match) => `<table style="border-collapse: collapse; width: 100%;">${match}</table>`)

      return html || '<p></p>'
    }

    // For other file types, try to read as text
    try {
      const content = await file.text()
      return `<p>${content.replace(/\n/g, '<br>')}</p>`
    } catch {
      throw new Error('Unable to read file content')
    }
  }

  const handleImport = useCallback(async () => {
    if (!title.trim()) {
      toast({
        title: intl.formatMessage({ id: 'modules.notes.fileImport.titleRequired' }),
        description: intl.formatMessage({ id: 'modules.notes.fileImport.titleRequiredMessage' }),
        variant: 'destructive',
      })
      return
    }

    if (!workspaceId) {
      toast({
        title: intl.formatMessage({ id: 'modules.notes.fileImport.error' }),
        description: intl.formatMessage({ id: 'modules.notes.fileImport.noWorkspace' }),
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)

    try {
      let noteId: string | undefined

      if (importType === 'file' && selectedFile) {
        // Check if it's a PDF - use backend processing
        if (isPdfFile(selectedFile)) {
          const result = await notesApi.importPdf(workspaceId, selectedFile, {
            title: title.trim(),
            parentId,
            tags: ['pdf', 'imported'],
            extractImages: true,
          })

          noteId = result.noteId

          toast({
            title: intl.formatMessage({ id: 'modules.notes.fileImport.pdfImportSuccess' }),
            description: result.message || intl.formatMessage({ id: 'modules.notes.fileImport.pdfImportDescription' }, { pageCount: result.pageCount, hasTable: result.hasTable, imageCount: result.imageCount }),
          })
        } else {
          // Process other file types locally
          const htmlContent = await processFileContent(selectedFile)

          const newNote = await notesApi.createNote(workspaceId, {
            title: title.trim(),
            content: htmlContent,
            parent_id: parentId,
            tags: ['imported'],
          })

          noteId = newNote.id

          toast({
            title: intl.formatMessage({ id: 'modules.notes.fileImport.importSuccessful' }),
            description: intl.formatMessage({ id: 'modules.notes.fileImport.importedAsNewNote' }),
          })
        }
      } else if (importType === 'url' && url) {
        // Use backend to fetch and extract content from URL
        const result = await notesApi.importUrl(workspaceId, {
          url: url.trim(),
          title: title.trim() || undefined,
          parentId,
          tags: ['web', 'imported'],
        })

        noteId = result.noteId

        toast({
          title: intl.formatMessage({ id: 'modules.notes.fileImport.urlImportSuccess' }),
          description: result.message || intl.formatMessage({ id: 'modules.notes.fileImport.urlImportDescription' }, { siteName: result.siteName || intl.formatMessage({ id: 'modules.notes.fileImport.website' }) }),
        })
      }

      // Call the callback with the new note ID
      if (noteId && onNoteCreated) {
        onNoteCreated(noteId)
      }

      handleClose()
    } catch (error) {
      console.error('Import failed:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.notes.fileImport.importFailed' }),
        description: error instanceof Error ? error.message : intl.formatMessage({ id: 'modules.notes.fileImport.importFailedMessage' }),
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }, [title, importType, selectedFile, url, workspaceId, parentId, handleClose, onNoteCreated, toast])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'modules.notes.fileImport.importContent' })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!importType ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'modules.notes.fileImport.chooseImportMethod' })}
              </p>

              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-32 flex-col gap-3"
                  onClick={() => setImportType('file')}
                >
                  <FileText className="h-8 w-8" />
                  <span>{intl.formatMessage({ id: 'modules.notes.fileImport.importFile' })}</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-32 flex-col gap-3"
                  onClick={() => setImportType('url')}
                >
                  <Link className="h-8 w-8" />
                  <span>{intl.formatMessage({ id: 'modules.notes.fileImport.importURL' })}</span>
                </Button>


              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportType(null)}
              >
                {intl.formatMessage({ id: 'modules.notes.fileImport.back' })}
              </Button>

              <div>
                <Label htmlFor="title">{intl.formatMessage({ id: 'modules.notes.fileImport.noteTitle' })}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'modules.notes.fileImport.noteTitlePlaceholder' })}
                  autoFocus
                />
              </div>

              {importType === 'file' && (
                <div>
                  <Label htmlFor="file">{intl.formatMessage({ id: 'modules.notes.fileImport.selectFile' })}</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileSelect}
                    accept=".txt,.md,.doc,.docx,.pdf"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {intl.formatMessage({ id: 'modules.notes.fileImport.supportedFilesPDF' })}
                  </p>
                </div>
              )}

              {importType === 'url' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="url">{intl.formatMessage({ id: 'modules.notes.fileImport.url' })}</Label>
                    <Input
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'modules.notes.fileImport.urlPlaceholder' })}
                    />
                  </div>
                  <div className="text-xs space-y-2 p-3 bg-muted/50 rounded-md">
                    <p className="font-medium text-foreground">{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLsTitle' })}</p>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                      <li>{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLs.news' })}</li>
                      <li>{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLs.blogs' })}</li>
                      <li>{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLs.wikipedia' })}</li>
                      <li>{intl.formatMessage({ id: 'modules.notes.fileImport.supportedURLs.docs' })}</li>
                    </ul>
                    <p className="text-amber-600 dark:text-amber-500 mt-2">
                      {intl.formatMessage({ id: 'modules.notes.fileImport.urlLimitation' })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  {intl.formatMessage({ id: 'modules.notes.fileImport.cancel' })}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    isProcessing ||
                    !title.trim() ||
                    (importType === 'file' && !selectedFile) ||
                    (importType === 'url' && !url.trim())
                  }
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {intl.formatMessage({ id: 'modules.notes.fileImport.importing' })}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {intl.formatMessage({ id: 'modules.notes.fileImport.import' })}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
