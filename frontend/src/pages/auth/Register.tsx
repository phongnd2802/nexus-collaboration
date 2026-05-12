import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { FaGoogle, FaGithub } from 'react-icons/fa'
import { authApi } from '../../lib/api/auth-api'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { workspaceApi } from '../../lib/api/workspace-api'
import { api } from '../../lib/fetch'

export default function Register() {
  const intl = useIntl()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const invitationToken = searchParams.get('invitation') || localStorage.getItem('pending_invitation_token')
  const slackSetupToken = searchParams.get('slack_setup') || null

  useEffect(() => {
    const urlInvitation = searchParams.get('invitation')
    if (urlInvitation) {
      localStorage.setItem('pending_invitation_token', urlInvitation)
    }
  }, [searchParams])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!acceptTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to continue')
      setIsLoading(false)
      return
    }

    try {
      const response = await authApi.register({
        email,
        password,
        name: fullName
      })

      if (response.requiresVerification) {
        const redirectUrl = slackSetupToken
          ? `/auth/login?slack_setup=${slackSetupToken}`
          : '/auth/login';
        navigate(redirectUrl, {
          state: {
            message: 'Registration successful! Please check your email to verify your account before signing in.',
            type: 'success'
          }
        })
        return
      }

      if (slackSetupToken) {
        const authToken = (response as any).access_token || response.token;
        if (authToken) {
          localStorage.setItem('auth_token', authToken);
        } else {
          setError('Authentication token not received. Please try logging in.');
          setIsLoading(false);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

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
        navigate(`/invite/${invitationToken}`)
        return
      }

      try {
        const workspaces = await workspaceApi.getWorkspaces()

        if (workspaces.length > 0) {
          const workspace = workspaces[0]
          navigate(`/workspaces/${workspace.id}/dashboard`)
        } else {
          navigate('/create-workspace')
        }
      } catch (error) {
        navigate('/create-workspace')
      }
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialSignUp = async (provider: string) => {
    setSocialLoading(provider)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
      const frontendUrl = window.location.origin

      window.location.href = `${apiUrl}/api/v1/auth/oauth/${provider}?frontendUrl=${encodeURIComponent(frontendUrl)}`
    } catch (err: any) {
      setError(`Failed to sign up with ${provider}. Please try again.`)
      setSocialLoading('')
    }
  }

  const socialProviders = [
    { key: 'google', name: 'Google', icon: FaGoogle },
    { key: 'github', name: 'GitHub', icon: FaGithub },
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
              {intl.formatMessage({ id: 'auth.register.title' })}
            </h1>
            <p className="text-[15px] text-[#73726C] leading-[22.5px]">
              {intl.formatMessage({ id: 'auth.register.subtitle' })}
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                {intl.formatMessage({ id: 'auth.register.name' })}
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={intl.formatMessage({ id: 'auth.register.namePlaceholder' })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                {intl.formatMessage({ id: 'auth.register.email' })}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={intl.formatMessage({ id: 'auth.register.emailPlaceholder' })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {intl.formatMessage({ id: 'auth.register.password' })}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'auth.register.passwordPlaceholder' })}
                  required
                  disabled={isLoading}
                  minLength={8}
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
              <p className="text-xs text-[#73726C]">
                {intl.formatMessage({ id: 'auth.register.passwordHint' })}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(!!checked)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-[#73726C] cursor-pointer leading-[19.6px]">
                {intl.formatMessage({ id: 'auth.register.agree' })}{' '}
                <Link to="/terms" className="text-[#D97757] hover:text-[#c8684a]">
                  {intl.formatMessage({ id: 'auth.register.terms' })}
                </Link>{' '}
                {intl.formatMessage({ id: 'auth.register.and' })}{' '}
                <Link to="/privacy" className="text-[#D97757] hover:text-[#c8684a]">
                  {intl.formatMessage({ id: 'auth.register.privacy' })}
                </Link>
              </label>
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
              size="default"
              className="w-full"
              disabled={isLoading || socialLoading !== ''}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {intl.formatMessage({ id: 'auth.register.creatingAccount' })}
                </>
              ) : (
                intl.formatMessage({ id: 'auth.register.createAccount' })
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(31,30,29,0.15)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#73726C] font-normal uppercase tracking-[0.25px]">
                {intl.formatMessage({ id: 'auth.register.orSignUpWith' })}
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
                  onClick={() => handleSocialSignUp(provider.key)}
                  disabled={isLoading || socialLoading !== ''}
                  title={`Sign up with ${provider.name}`}
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
              {intl.formatMessage({ id: 'auth.register.haveAccount' })}{' '}
              <Link
                to={invitationToken ? `/auth/login?invitation=${invitationToken}` : "/auth/login"}
                className="font-normal text-[#D97757] hover:text-[#c8684a] transition-colors"
              >
                {intl.formatMessage({ id: 'auth.register.signIn' })}
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
