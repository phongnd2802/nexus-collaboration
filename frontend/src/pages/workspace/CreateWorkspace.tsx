import { CreateWorkspaceForm } from '../../components/workspace/CreateWorkspaceForm'
import { useIntl } from 'react-intl'
import { useAuth } from '../../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export default function CreateWorkspace() {
  const { isAuthenticated, isLoading } = useAuth()
  const intl = useIntl()

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/nexus-logo.png" alt="Nexus" className="h-8 mb-6" />
          <h1 className="font-serif text-[28px] font-normal leading-[33.6px] text-[#1F1E1D] mb-2 text-center">
            {intl.formatMessage({ id: 'workspace.createTitle' })}
          </h1>
          <p className="text-[15px] text-[#73726C] leading-[22.5px] text-center">
            {intl.formatMessage({ id: 'workspace.createDescription' })}
          </p>
        </div>

        {/* Form */}
        <CreateWorkspaceForm />

        <p className="text-center text-xs text-[#73726C] mt-8">
          &copy; {new Date().getFullYear()} Nexus. All rights reserved.
        </p>
      </div>
    </div>
  )
}