import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom'
import { FaGoogle, FaGithub } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { workspaceApi } from '../../lib/api/workspace-api'
import { api } from '../../lib/fetch'

export default function Login() {
  const intl = useIntl()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const state = location.state as { message?: string; type?: string } | null
    if (state?.message && state?.type === 'success') {
      setSuccessMessage(state.message)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const callbackUrl = searchParams.get('callbackUrl') || null
  const slackSetupToken = searchParams.get('slack_setup') || null

  const fromLocation = (location.state as { from?: Location })?.from
  const redirectTo = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search || ''}`
    : callbackUrl

  const invitationToken = searchParams.get('invitation') || localStorage.getItem('pending_invitation_token')

  useEffect(() => {
    const urlInvitation = searchParams.get('invitation');
    if (urlInvitation) {
      localStorage.setItem('pending_invitation_token', urlInvitation);
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await login({ email, password })

      if (slackSetupToken) {
        try {
          const setupResult = await api.post<{
            success: boolean;
            data: { workspaceId: string; teamId: string; teamName: string };
            message: string;
          }>('/slack/whiteboard/complete-setup', {
            setupToken: slackSetupToken
          });

          if (setupResult.success) {
            navigate(`/slack/success?workspace_id=${setupResult.data.workspaceId}&team_id=${setupResult.data.teamId}`);
            return;
          } else {
            setError(setupResult.message || 'Failed to complete Slack setup.');
            setIsLoading(false);
            return;
          }
        } catch (setupError) {
          setError('Failed to complete Slack setup. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      if (invitationToken) {
        navigate(`/invite/${invitationToken}`);
        return;
      }

      try {
        const workspaces = await workspaceApi.getWorkspaces()

        if (workspaces.length > 0) {
          const lastWorkspaceId = localStorage.getItem('lastWorkspaceId')
          const currentWorkspaceId = localStorage.getItem('currentWorkspaceId')

          let workspace = workspaces.find(w => w.id === lastWorkspaceId)

          if (!workspace) {
            workspace = workspaces.find(w => w.id === currentWorkspaceId)
          }

          if (!workspace) {
            workspace = workspaces[0]
            if (lastWorkspaceId) localStorage.removeItem('lastWorkspaceId')
            if (currentWorkspaceId) localStorage.removeItem('currentWorkspaceId')
          }

          localStorage.setItem('lastWorkspaceId', workspace.id)
          localStorage.setItem('currentWorkspaceId', workspace.id)

          if (redirectTo && redirectTo !== '/') {
            navigate(redirectTo)
          } else {
            navigate(`/workspaces/${workspace.id}/dashboard`)
          }
        } else {
          navigate('/create-workspace')
        }
      } catch (error) {
        navigate(callbackUrl || '/create-workspace')
      }
    } catch (error: any) {
      if (error.code === 'TWO_FACTOR_REQUIRED') {
        setShowTwoFactor(true)
        return
      }
      setError(error.message || 'Sign in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignIn = async (provider: string) => {
    setSocialLoading(provider)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const frontendUrl = window.location.origin

      window.location.href = `${apiUrl}/api/v1/auth/oauth/${provider}?frontendUrl=${encodeURIComponent(frontendUrl)}`
    } catch (err: any) {
      setError(`Failed to sign in with ${provider}. Please try again.`)
      setSocialLoading('')
    }
  }

  const socialProviders = [
    {
      key: 'google',
      name: 'Google',
      icon: FaGoogle,
    },
    {
      key: 'github',
      name: 'GitHub',
      icon: FaGithub,
    },
  ]

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
              {intl.formatMessage({ id: 'auth.login.title' })}
            </h1>
            <p className="text-[15px] text-[#73726C] leading-[22.5px]">
              {intl.formatMessage({ id: 'auth.login.subtitle' })}
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">
                {intl.formatMessage({ id: 'auth.login.email' })}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={intl.formatMessage({ id: 'auth.login.emailPlaceholder' })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">
                  {intl.formatMessage({ id: 'auth.login.password' })}
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[#D97757] hover:text-[#c8684a] font-normal"
                >
                  {intl.formatMessage({ id: 'auth.login.forgotPassword' })}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.login.passwordPlaceholder' })}
                  required
                  disabled={isLoading}
                  className="pr-11"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 h-[44px] w-11 flex items-center justify-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-[#73726C]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[#73726C]" />
                  )}
                </button>
              </div>
            </div>

            {showTwoFactor && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">
                  {intl.formatMessage({ id: 'auth.login.twoFactorCode' })}
                </Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.login.twoFactorPlaceholder' })}
                  required={showTwoFactor}
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-[8px] border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] px-3 py-2.5">
                <CheckCircle className="h-4 w-4 text-[#15803d] flex-shrink-0" />
                <p className="text-sm text-[#15803d]">{successMessage}</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-[8px] border border-[rgba(224,30,90,0.3)] bg-[rgba(224,30,90,0.1)] px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-[#BE123C] flex-shrink-0" />
                <p className="text-sm text-[#BE123C]">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="default"
              size="default"
              className="w-full"
              disabled={isLoading || socialLoading !== ''}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {intl.formatMessage({ id: 'auth.login.signingIn' })}
                </>
              ) : (
                intl.formatMessage({ id: 'auth.login.signIn' })
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(31,30,29,0.15)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#73726C] font-normal uppercase tracking-[0.25px]">
                {intl.formatMessage({ id: 'auth.login.orSignInWith' })}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            {socialProviders.map((provider) => {
              const Icon = provider.icon
              return (
                <button
                  key={provider.key}
                  type="button"
                  onClick={() => handleSocialSignIn(provider.key)}
                  disabled={isLoading || socialLoading !== ''}
                  title={`Continue with ${provider.name}`}
                  className="inline-flex items-center justify-center w-[44px] h-[44px] rounded-[9.6px] border border-[rgba(31,30,29,0.3)] bg-white text-[#1F1E1D] hover:bg-[#FAF9F5] hover:border-[rgba(31,30,29,0.6)] active:bg-[#F0F0ED] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {socialLoading === provider.key ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <p className="text-[15px] text-[#73726C] leading-[22.5px]">
              {intl.formatMessage({ id: 'auth.login.noAccount' })}{' '}
              <Link
                to={
                  slackSetupToken
                    ? `/auth/register?slack_setup=${slackSetupToken}`
                    : invitationToken
                    ? `/auth/register?invitation=${invitationToken}`
                    : "/auth/register"
                }
                className="font-normal text-[#D97757] hover:text-[#c8684a] transition-colors"
              >
                {intl.formatMessage({ id: 'auth.login.signUp' })}
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
