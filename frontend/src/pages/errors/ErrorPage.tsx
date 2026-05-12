import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { RefreshCw, Home, AlertTriangle, ChevronRight } from 'lucide-react'

interface ErrorPageProps {
  error?: Error
  resetErrorBoundary?: () => void
}

export default function ErrorPage({ error, resetErrorBoundary }: ErrorPageProps) {
  const handleRetry = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[rgba(217,119,87,0.08)] mb-6">
            <AlertTriangle className="h-10 w-10 text-[#D97757]" />
          </div>
        </div>

        <h1 className="text-[24px] font-normal text-[#1F1E1D] mb-4 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-[15px] text-[#73726C] mb-10 leading-[22.5px]">
          An unexpected error occurred. Please try again or return home.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-10 p-4 bg-[#FAF9F5] border border-[rgba(31,30,29,0.12)] rounded-xl text-left">
            <p className="text-[11px] font-medium text-[#73726C] uppercase tracking-wider mb-1">Error details</p>
            <p className="text-[13px] text-[#DC6038] font-mono break-all leading-[19.5px]">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            className="h-[44px] px-6 rounded-[9.6px] bg-[#1F1E1D] text-white text-[15px] font-normal hover:bg-[#0A0A0A] active:bg-[#000000] active:scale-[0.98] shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] hover:shadow-[rgba(0,0,0,0.08)_0px_8px_28px_0px] w-full sm:w-auto transition-all"
            onClick={handleRetry}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>

          <Link to="/" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="h-[44px] px-6 rounded-[9.6px] bg-white text-[#1F1E1D] text-[15px] font-normal border border-[rgba(31,30,29,0.3)] hover:bg-[#FAF9F5] hover:border-[rgba(31,30,29,0.6)] active:bg-[#F0F0ED] w-full transition-all"
            >
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Button>
          </Link>
        </div>

        <div className="mt-14 pt-8 border-t border-[rgba(31,30,29,0.08)]">
          <a
            href="mailto:support@nexusapp.io"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#73726C] hover:text-[#1F1E1D] transition-colors"
          >
            Contact support
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
