const PREVIEW_READ_ONLY_MESSAGE = 'This is a read-only demo so you can explore the interface. Editing is disabled here, but it\'s fully unlocked when you self-host.'

export function createPreviewReadOnlyError() {
  return createError({
    statusCode: 403,
    statusMessage: PREVIEW_READ_ONLY_MESSAGE,
    data: {
      code: 'PREVIEW_READ_ONLY',
      message: PREVIEW_READ_ONLY_MESSAGE,
    },
  })
}
