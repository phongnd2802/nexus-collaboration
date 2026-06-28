import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { WorkspaceIconUpload } from './WorkspaceIconUpload'
import { useCreateWorkspace, useUploadWorkspaceLogo } from '../../lib/api/workspace-api'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useIntl } from 'react-intl'
import { useAuth } from '../../contexts/AuthContext'

interface CreateWorkspaceFormData {
  name: string
  icon: File | null
}

export function CreateWorkspaceForm() {
  const navigate = useNavigate()
  const intl = useIntl()
  const { user } = useAuth()
  const createWorkspaceMutation = useCreateWorkspace()
  const uploadLogoMutation = useUploadWorkspaceLogo()

  const [formData, setFormData] = useState<CreateWorkspaceFormData>({
    name: '',
    icon: null,
  })
  const [errors, setErrors] = useState<Partial<CreateWorkspaceFormData>>({})
  const [isSuccess, setIsSuccess] = useState(false)
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null)
  const [hasEditedName, setHasEditedName] = useState(false)

  useEffect(() => {
    if (hasEditedName || formData.name.trim()) return

    const displayName = user?.fullName?.trim() || user?.name?.trim() || user?.username?.trim() || ''
    if (!displayName) return

    setFormData(prev => ({
      ...prev,
      name: intl.formatMessage(
        { id: 'workspace.createForm.defaultNameTemplate' },
        { name: displayName }
      ),
    }))
  }, [user, intl, hasEditedName, formData.name])

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateWorkspaceFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = intl.formatMessage({ id: 'workspace.createForm.errors.nameRequired' })
    } else if (formData.name.trim().length < 2) {
      newErrors.name = intl.formatMessage({ id: 'workspace.createForm.errors.nameMinLength' })
    } else if (formData.name.trim().length > 50) {
      newErrors.name = intl.formatMessage({ id: 'workspace.createForm.errors.nameMaxLength' })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleIconChange = async (file: File | null) => {
    console.log('🖼️ Icon changed:', file?.name)
    setFormData(prev => ({ ...prev, icon: file }))

    if (file) {
      try {
        console.log('📤 Uploading icon immediately...')
        const result = await uploadLogoMutation.mutateAsync(file)
        console.log('✅ Icon uploaded successfully:', result.url)
        setUploadedLogoUrl(result.url)
      } catch (error) {
        console.error('❌ Failed to upload icon:', error)
        setUploadedLogoUrl(null)
      }
    } else {
      setUploadedLogoUrl(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🔍 Form submitted with data:', formData)
    console.log('🔍 Uploaded logo URL:', uploadedLogoUrl)

    if (!validateForm()) {
      console.log('❌ Form validation failed')
      return
    }

    try {
      const workspaceData = {
        name: formData.name.trim(),
        logo: uploadedLogoUrl || undefined,
      }

      console.log('📤 Creating workspace with data:', workspaceData)

      const workspace = await createWorkspaceMutation.mutateAsync(workspaceData)

      console.log('✅ Workspace created successfully:', workspace)
      console.log('✅ Workspace ID:', workspace.id)

      setIsSuccess(true)

      // Clear any previous errors
      setErrors({})

      // Note: current_workspace is already stored in localStorage by the mutation hook
      // Store the workspace ID for quick access as well
      localStorage.setItem('lastWorkspaceId', workspace.id)

      // Redirect to the new workspace dashboard after a brief success animation (1.5 seconds)
      // The mutation hook will also invalidate and refetch the workspaces list
      const dashboardUrl = `/workspaces/${workspace.id}/dashboard`
      console.log('📍 Will redirect to:', dashboardUrl)

      setTimeout(() => {
        console.log('➡️ Redirecting now to:', dashboardUrl)
        navigate(dashboardUrl, { replace: true })
      }, 1500)
    } catch (error: any) {
      console.error('❌ Failed to create workspace:', error)
      setIsSuccess(false)
    }
  }

  const handleInputChange = (field: keyof CreateWorkspaceFormData, value: string) => {
    if (field === 'name') {
      setHasEditedName(true)
    }
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-white rounded-[12px] border border-[rgba(31,30,29,0.15)] shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-[rgba(34,197,94,0.1)] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-[#15803d]" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-[22px] font-normal leading-[28px] text-[#1F1E1D]">
              {intl.formatMessage({ id: 'workspace.createForm.success.title' })}
            </h3>
            <p className="text-[15px] text-[#73726C] leading-[22.5px]">
              {intl.formatMessage({ id: 'workspace.createForm.success.description' }, { name: formData.name })}
            </p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#D97757]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[12px] border border-[rgba(31,30,29,0.15)] shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] p-8">
      <div className="text-center mb-6">
        <h2 className="font-serif text-[22px] font-normal leading-[28px] text-[#1F1E1D] mb-1">
          {intl.formatMessage({ id: 'workspace.createForm.title' })}
        </h2>
        <p className="text-[15px] text-[#73726C] leading-[22.5px]">
          {intl.formatMessage({ id: 'workspace.createForm.description' })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Workspace Icon Upload */}
        <div className="flex justify-center">
          <WorkspaceIconUpload
            onIconChange={handleIconChange}
          />
        </div>

        {/* Workspace Name */}
        <div className="space-y-2">
          <Label htmlFor="workspace-name">
            {intl.formatMessage({ id: 'workspace.createForm.nameLabel' })} <span className="text-[#D97757]">*</span>
          </Label>
          <Input
            id="workspace-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={intl.formatMessage({ id: 'workspace.createForm.namePlaceholder' })}
            className={errors.name ? 'border-[#BE123C] focus:border-[#BE123C]' : ''}
            maxLength={50}
          />
          {errors.name && (
            <p className="text-xs text-[#BE123C] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.name}
            </p>
          )}
          <p className="text-xs text-[#73726C]">
            {intl.formatMessage({ id: 'workspace.createForm.characterCount' }, { count: formData.name.length })}
          </p>
        </div>

        {/* Error Alert */}
        {createWorkspaceMutation.isError && (
          <div className="flex items-center gap-2 rounded-[8px] border border-[rgba(224,30,90,0.3)] bg-[rgba(224,30,90,0.1)] px-3 py-2.5">
            <AlertCircle className="h-4 w-4 text-[#BE123C] flex-shrink-0" />
            <p className="text-sm text-[#BE123C]">
              {createWorkspaceMutation.error?.message || intl.formatMessage({ id: 'workspace.createForm.errors.createFailed' })}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="default"
          size="default"
          className="w-full"
          disabled={createWorkspaceMutation.isPending || uploadLogoMutation.isPending || !formData.name.trim()}
        >
          {createWorkspaceMutation.isPending || uploadLogoMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadLogoMutation.isPending
                ? intl.formatMessage({ id: 'workspace.createForm.uploading' })
                : intl.formatMessage({ id: 'workspace.createForm.creating' })}
            </>
          ) : (
            intl.formatMessage({ id: 'workspace.createForm.submit' })
          )}
        </Button>
      </form>

      {/* Help Text */}
      <div className="text-center mt-6 pt-6 border-t border-[rgba(31,30,29,0.15)]">
        <p className="text-xs text-[#73726C]">
          {intl.formatMessage({ id: 'workspace.createForm.helpText' })}
        </p>
      </div>
    </div>
  )
}
