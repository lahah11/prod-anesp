import api from './api';

export const documentService = {
  async download(documentId: number) {
    return api.get(`/mission-documents/${documentId}/download`, {
      responseType: 'blob'
    });
  }
};
