import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[rgba(130,80,223,0.06)] mb-6">
            <span className="text-[36px] font-normal text-[#8250DF] tracking-tight leading-none">
              404
            </span>
          </div>
        </div>

        <h1 className="text-[24px] font-normal text-[#1F1E1D] mb-4 tracking-tight">
          Page not found
        </h1>
        <p className="text-[15px] text-[#73726C] mb-10 leading-[22.5px]">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="h-[44px] px-6 rounded-[9.6px] bg-[#1F1E1D] text-white text-[15px] font-normal hover:bg-[#0A0A0A] active:bg-[#000000] active:scale-[0.98] shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] hover:shadow-[rgba(0,0,0,0.08)_0px_8px_28px_0px] w-full sm:w-auto transition-all"
            >
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Button>
          </Link>

          <Button
            size="lg"
            variant="outline"
            className="h-[44px] px-6 rounded-[9.6px] bg-white text-[#1F1E1D] text-[15px] font-normal border border-[rgba(31,30,29,0.3)] hover:bg-[#FAF9F5] hover:border-[rgba(31,30,29,0.6)] active:bg-[#F0F0ED] w-full sm:w-auto transition-all"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>

        <div className="mt-14 pt-8 border-t border-[rgba(31,30,29,0.08)]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#73726C] hover:text-[#1F1E1D] transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            Browse pages
          </Link>
        </div>
      </div>
    </div>
  )
}
