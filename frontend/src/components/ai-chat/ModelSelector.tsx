import React from 'react'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export interface ModelOption {
  id: string
  name: string
  provider: string
  description?: string
}

const DEFAULT_MODELS: ModelOption[] = [
  { id: 'claude-3-opus', name: 'Opus 4', provider: 'Most powerful' },
  { id: 'claude-3-sonnet', name: 'Sonnet 4', provider: 'Best overall' },
  { id: 'claude-3-haiku', name: 'Haiku 4', provider: 'Fastest' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google' },
]

interface ModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  models?: ModelOption[]
}

export function ModelSelector({ value, onChange, models = DEFAULT_MODELS }: ModelSelectorProps) {
  const selected = models.find(m => m.id === value) || models[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[12px] font-medium text-[#73726C] hover:text-[#1F1E1D] hover:bg-[rgba(31,30,29,0.04)] transition-colors">
          <span>{selected.name}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 rounded-xl border border-[rgba(31,30,29,0.12)] shadow-[rgba(0,0,0,0.016)_0px_4px_24px_0px,rgba(0,0,0,0.016)_0px_4px_32px_0px,rgba(0,0,0,0.01)_0px_2px_64px_0px,rgba(0,0,0,0.01)_0px_16px_32px_0px]">
        {models.map(model => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onChange(model.id)}
            className="flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-lg mx-1 my-0.5"
          >
            <div className="flex flex-col">
              <span className="text-[14px] font-medium text-[#1F1E1D]">{model.name}</span>
              <span className="text-[11px] text-[#73726C]">{model.provider}</span>
            </div>
            {value === model.id && (
              <div className="w-2 h-2 rounded-full bg-[#D97757]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
