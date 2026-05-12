import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Link } from 'react-router-dom'
import { AlertCircle, Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { authService } from '@/lib/api/auth-api'

export default function ForgotPassword() {
  const intl = useIntl()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await authService.forgotPassword(email)
      setIsSuccess(true)
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryAgain = () => {
    setIsSuccess(false)
    setEmail('')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[12px] border border-[rgba(31,30,29,0.15)] shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] p-8">
          <div className="flex flex-col items-center mb-8">
            <img
              src="/nexus-logo.png"
              alt="Nexus"
              className="h-8 mb-6"
            />
            <h1 className="font-serif text-[28px] font-normal leading-[33.6px] text-[#1F1E1D] mb-2">
              {isSuccess
                ? intl.formatMessage({ id: 'auth.forgotPassword.success' })
                : intl.formatMessage({ id: 'auth.forgotPassword.title' })
              }
            </h1>
            <p className="text-[15px] text-[#73726C] leading-[22.5px] text-center">
              {isSuccess
                ? intl.formatMessage({ id: 'auth.forgotPassword.successMessage' })
                : intl.formatMessage({ id: 'auth.forgotPassword.subtitle' })
              }
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-[12px] bg-[#D97757]/10 flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-[#D97757]" />
                </div>
                <p className="text-[15px] text-[#3D3D3A] leading-[22.5px]">
                  {intl.formatMessage({ id: 'auth.forgotPassword.checkInbox' })}
                </p>
                <p className="text-xs text-[#73726C]">
                  {intl.formatMessage({ id: 'auth.forgotPassword.noEmail' })}
                </p>
              </div>

              <Button
                onClick={handleTryAgain}
                variant="outline"
                className="w-full"
              >
                {intl.formatMessage({ id: 'auth.forgotPassword.sendAnother' })}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {intl.formatMessage({ id: 'auth.forgotPassword.email' })}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.forgotPassword.emailPlaceholder' })}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-[8px] border border-[rgba(224,30,90,0.3)] bg-[rgba(224,30,90,0.1)] px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-[#BE123C] flex-shrink-0" />
                  <p className="text-sm text-[#BE123C]">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {intl.formatMessage({ id: 'auth.forgotPassword.sendingLink' })}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    {intl.formatMessage({ id: 'auth.forgotPassword.sendLink' })}
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="flex flex-col items-center gap-3 mt-8 pt-6 border-t border-[rgba(31,30,29,0.15)]">
            <Link
              to="/auth/login"
              className="flex items-center text-sm text-[#D97757] hover:text-[#c8684a] transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {intl.formatMessage({ id: 'auth.forgotPassword.backToLogin' })}
            </Link>

            <p className="text-sm text-[#73726C]">
              {intl.formatMessage({ id: 'auth.forgotPassword.noAccount' })}{' '}
              <Link
                to="/auth/register"
                className="text-[#D97757] hover:text-[#c8684a] transition-colors"
              >
                {intl.formatMessage({ id: 'auth.forgotPassword.signUp' })}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[#73726C] mt-8">
          &copy; {new Date().getFullYear()} Nexus. All rights reserved.
        </p>
      </div>
    </div>
  )
}
