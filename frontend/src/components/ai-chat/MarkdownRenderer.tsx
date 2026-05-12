import React, { useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'

function CodeBlock({ language, value }: { language?: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [value])

  return (
    <div className="relative group my-4 rounded-lg border border-[rgba(31,30,29,0.12)] overflow-hidden bg-[#FAF9F5]">
      <div className="flex items-center justify-between px-4 py-2 bg-[rgba(31,30,29,0.03)] border-b border-[rgba(31,30,29,0.06)]">
        <span className="text-[11px] font-medium text-[#73726C] uppercase tracking-wider">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-[#73726C] hover:text-[#1F1E1D] transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-[13px] leading-[19.5px] font-medium text-[#1F1E1D]">
          <code className={`hljs language-${language || 'text'}`}>{value}</code>
        </pre>
      </div>
    </div>
  )
}

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  useEffect(() => {
    if (!document.getElementById('highlight-theme')) {
      const link = document.createElement('link')
      link.id = 'highlight-theme'
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
      document.head.appendChild(link)
    }
  }, [])

  return (
    <div className="prose prose-sm max-w-none
      prose-headings:text-[#1F1E1D] prose-headings:font-normal prose-headings:tracking-tight
      prose-h1:text-[24px] prose-h1:mt-8 prose-h1:mb-4
      prose-h2:text-[20px] prose-h2:mt-6 prose-h2:mb-3
      prose-h3:text-[17px] prose-h3:mt-5 prose-h3:mb-2
      prose-p:text-[15px] prose-p:leading-[24px] prose-p:text-[#1F1E1D] prose-p:my-3
      prose-strong:text-[#1F1E1D] prose-strong:font-medium
      prose-a:text-[#8250DF] prose-a:no-underline hover:prose-a:underline
      prose-code:text-[#DC6038] prose-code:bg-[rgba(31,30,29,0.04)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
      prose-blockquote:border-l-[3px] prose-blockquote:border-[#D97757] prose-blockquote:text-[#3D3D3A] prose-blockquote:pl-4 prose-blockquote:my-4 prose-blockquote:font-normal prose-blockquote:not-italic
      prose-ul:text-[#1F1E1D] prose-ul:my-3 prose-ul:pl-6
      prose-ol:text-[#1F1E1D] prose-ol:my-3 prose-ol:pl-6
      prose-li:text-[15px] prose-li:leading-[24px] prose-li:text-[#1F1E1D] prose-li:my-1
      prose-table:border-collapse prose-table:w-full prose-table:my-4
      prose-th:bg-[rgba(31,30,29,0.03)] prose-th:px-4 prose-th:py-2 prose-th:text-[#1F1E1D] prose-th:font-medium prose-th:text-[13px] prose-th:text-left prose-th:border prose-th:border-[rgba(31,30,29,0.12)]
      prose-td:px-4 prose-td:py-2 prose-td:text-[14px] prose-td:border prose-td:border-[rgba(31,30,29,0.12)]
      prose-hr:border-[rgba(31,30,29,0.1)] prose-hr:my-6
      [&_.hljs]:bg-transparent
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre({ children }: any) {
            return <>{children}</>
          },
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const value = String(children).replace(/\n$/, '')
            const isInline = !match && !value.includes('\n')

            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <CodeBlock
                language={match ? match[1] : undefined}
                value={value}
              />
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
