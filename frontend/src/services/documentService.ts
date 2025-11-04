import api from './api';

export const documentService = {
  async download(documentId: number) {
    return api.get(`/documents/${documentId}/download`, {
      responseType: 'blob'
    });
  }
};
