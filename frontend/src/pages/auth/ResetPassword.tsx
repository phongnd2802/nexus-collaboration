import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, Key, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'
import { authService } from '@/lib/api/auth-api'

export default function ResetPassword() {
  const intl = useIntl()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError(intl.formatMessage({ id: 'auth.resetPassword.invalidToken' }))
    }
  }, [token, intl])

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return intl.formatMessage({ id: 'auth.resetPassword.passwordHint' })
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError(intl.formatMessage({ id: 'auth.resetPassword.invalidToken' }))
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError(intl.formatMessage({ id: 'auth.resetPassword.passwordMismatch' }))
      return
    }

    setIsLoading(true)

    try {
      await authService.resetPassword({ token, password })
      setIsSuccess(true)

      setTimeout(() => {
        navigate('/auth/login')
      }, 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[12px] border border-[rgba(31,30,29,0.15)] shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] p-8">
            <div className="flex flex-col items-center mb-8">
              <img src="/nexus-logo.png" alt="Nexus" className="h-8 mb-6" />
              <h1 className="font-serif text-[28px] font-normal leading-[33.6px] text-[#1F1E1D] mb-2">
                {intl.formatMessage({ id: 'auth.resetPassword.success' })}
              </h1>
              <p className="text-[15px] text-[#73726C] leading-[22.5px] text-center">
                {intl.formatMessage({ id: 'auth.resetPassword.successMessage' })}
              </p>
            </div>

            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-[12px] bg-[#D97757]/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-[#D97757]" />
              </div>
              <p className="text-[15px] text-[#3D3D3A] leading-[22.5px]">
                {intl.formatMessage({ id: 'auth.resetPassword.redirectMessage' })}
              </p>
              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full h-[44px] bg-[#1F1E1D] text-white rounded-[9.6px] hover:bg-[#0A0A0A] transition-all"
              >
                {intl.formatMessage({ id: 'auth.resetPassword.continueSignIn' })}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[12px] border border-[rgba(31,30,29,0.15)] shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] p-8">
          <div className="flex flex-col items-center mb-8">
            <img src="/nexus-logo.png" alt="Nexus" className="h-8 mb-6" />
            <h1 className="font-serif text-[28px] font-normal leading-[33.6px] text-[#1F1E1D] mb-2">
              {intl.formatMessage({ id: 'auth.resetPassword.title' })}
            </h1>
            <p className="text-[15px] text-[#73726C] leading-[22.5px] text-center">
              {intl.formatMessage({ id: 'auth.resetPassword.subtitle' })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[14px] font-medium text-[#1F1E1D]">
                {intl.formatMessage({ id: 'auth.resetPassword.password' })}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.resetPassword.passwordPlaceholder' })}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="h-[44px] pr-11 bg-white border-[rgba(31,30,29,0.15)] rounded-[9.6px] text-[#141413] placeholder:text-[rgba(61,61,58,0.6)] focus:border-[#1F1E1D] focus:ring-0 focus:shadow-[0_0_0_3px_rgba(31,30,29,0.1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#73726C] hover:text-[#1F1E1D] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[12px] text-[#73726C]">
                {intl.formatMessage({ id: 'auth.resetPassword.passwordHint' })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[14px] font-medium text-[#1F1E1D]">
                {intl.formatMessage({ id: 'auth.resetPassword.confirmPassword' })}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.resetPassword.confirmPasswordPlaceholder' })}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="h-[44px] pr-11 bg-white border-[rgba(31,30,29,0.15)] rounded-[9.6px] text-[#141413] placeholder:text-[rgba(61,61,58,0.6)] focus:border-[#1F1E1D] focus:ring-0 focus:shadow-[0_0_0_3px_rgba(31,30,29,0.1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#73726C] hover:text-[#1F1E1D] transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-[8px] border border-[rgba(224,30,90,0.3)] bg-[rgba(224,30,90,0.1)] px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-[#BE123C] flex-shrink-0" />
                <p className="text-sm text-[#BE123C]">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !token}
              className="w-full h-[44px] bg-[#1F1E1D] text-white rounded-[9.6px] hover:bg-[#0A0A0A] transition-all disabled:bg-[#3D3D3A] disabled:text-[#73726C]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {intl.formatMessage({ id: 'auth.resetPassword.resetting' })}
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  {intl.formatMessage({ id: 'auth.resetPassword.reset' })}
                </>
              )}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-3 mt-8 pt-6 border-t border-[rgba(31,30,29,0.15)]">
            <Link
              to="/auth/login"
              className="flex items-center text-sm text-[#D97757] hover:text-[#c8684a] transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {intl.formatMessage({ id: 'auth.resetPassword.backToLogin' })}
            </Link>

            <p className="text-sm text-[#73726C]">
              {intl.formatMessage({ id: 'auth.resetPassword.rememberPassword' })}{' '}
              <Link
                to="/auth/login"
                className="text-[#D97757] hover:text-[#c8684a] transition-colors"
              >
                {intl.formatMessage({ id: 'auth.resetPassword.signIn' })}
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
