export const catboxService = {
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('reqtype', 'fileupload')
    formData.append('userhash', '') // Optional for anonymous uploads
    formData.append('fileToUpload', file)

    try {
      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const url = await response.text()
      return url
    } catch (error) {
      console.error('Catbox upload error:', error)
      throw error
    }
  }
}
