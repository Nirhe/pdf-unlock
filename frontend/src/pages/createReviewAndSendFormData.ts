const createReviewAndSendFormData = (file: File, customerId: string) => {
  const formData = new FormData()
  formData.append('document', file)
  formData.append('customerId', customerId)

  return formData
}

export default createReviewAndSendFormData
export { createReviewAndSendFormData }
