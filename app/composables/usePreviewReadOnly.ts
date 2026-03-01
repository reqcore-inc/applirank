const DEFAULT_PREVIEW_MESSAGE = 'This is a read-only demo so you can explore the interface. Editing is disabled here, but it\'s fully unlocked when you self-host.'

type PreviewReadOnlyErrorData = {
  code?: string
  message?: string
}

type PreviewReadOnlyError = {
  status?: number
  statusCode?: number
  statusMessage?: string
  data?: PreviewReadOnlyErrorData & {
    data?: PreviewReadOnlyErrorData
    statusMessage?: string
  }
}

function isPreviewReadOnlyError(error: unknown): error is PreviewReadOnlyError {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as PreviewReadOnlyError
  const code = maybeError.data?.code ?? maybeError.data?.data?.code
  const message =
    maybeError.data?.message
    ?? maybeError.data?.data?.message
    ?? maybeError.data?.statusMessage
    ?? maybeError.statusMessage

  return code === 'PREVIEW_READ_ONLY' || message?.includes('Preview mode') === true
}

function getPreviewReadOnlyMessage(error: PreviewReadOnlyError): string | undefined {
  return (
    error.data?.message
    ?? error.data?.data?.message
    ?? error.data?.statusMessage
    ?? error.statusMessage
  )
}

export function usePreviewReadOnly() {
  const isUpsellOpen = useState('preview-read-only-upsell-open', () => false)
  const message = useState('preview-read-only-upsell-message', () => DEFAULT_PREVIEW_MESSAGE)

  function openUpsell(nextMessage?: string) {
    message.value = nextMessage || DEFAULT_PREVIEW_MESSAGE
    isUpsellOpen.value = true
  }

  function closeUpsell() {
    isUpsellOpen.value = false
  }

  function handlePreviewReadOnlyError(error: unknown): boolean {
    if (!isPreviewReadOnlyError(error)) return false

    openUpsell(getPreviewReadOnlyMessage(error))
    return true
  }

  async function withPreviewReadOnly(action: () => Promise<unknown>) {
    try {
      return await action()
    } catch (error) {
      handlePreviewReadOnlyError(error)
      throw error
    }
  }

  return {
    isUpsellOpen,
    message,
    openUpsell,
    closeUpsell,
    handlePreviewReadOnlyError,
    withPreviewReadOnly,
  }
}
