import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type InputType = 'activity' | 'indicator' | 'milestone' | 'comment' | 'risk';
export type InputStatus = 'draft' | 'submitted' | 'retained' | 'rejected';

export interface Input {
  id: string;
  referenceSectionId: string;
  entityId: string;
  authorUserId: string;
  type: InputType;
  title: string | null;
  content: string;
  means: string | null;
  output: string | null;
  verificationMethod: string | null;
  targetValue: string | null;
  dueMonth: string | null;
  objective: string | null;
  sourceRef: string | null;
  deliverable: string | null;
  paymentAmountProposed: string | null;
  paymentAmountFinal: string | null;
  baseline: string | null;
  dataSource: string | null;
  frequency: string | null;
  likelihood: string | null;
  impact: string | null;
  mitigation: string | null;
  targetRef: string | null;
  status: InputStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; email: string };
  entity: { id: string; code: string; label: string };
  referenceSection?: { id: string; titre: string };
  revisions?: any[];
}

export interface CreateInputPayload {
  referenceSectionId: string;
  type: InputType;
  content?: string;
  title?: string;
  means?: string;
  output?: string;
  objective?: string;
  sourceRef?: string;
  deliverable?: string;
  verificationMethod?: string;
  dueMonth?: string;
  paymentAmountProposed?: string;
  targetValue?: string;
  baseline?: string;
  dataSource?: string;
  frequency?: string;
  likelihood?: string;
  impact?: string;
  mitigation?: string;
  targetRef?: string;
}

@Injectable({ providedIn: 'root' })
export class InputsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inputs`;

  getAll(filters: { sectionId?: string; entityId?: string; type?: string; status?: string } = {}) {
    let params = new HttpParams();
    if (filters.sectionId) params = params.set('sectionId', filters.sectionId);
    if (filters.entityId) params = params.set('entityId', filters.entityId);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<Input[]>(this.base, { params });
  }

  getMine(filters: { sectionId?: string; status?: string; entityCode?: string } = {}) {
    let params = new HttpParams();
    if (filters.sectionId) params = params.set('sectionId', filters.sectionId);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.entityCode) params = params.set('entityCode', filters.entityCode);
    return this.http.get<Input[]>(`${this.base}/mine`, { params });
  }

  getTrash() {
    return this.http.get<Input[]>(`${this.base}/trash`);
  }

  getOne(id: string) {
    return this.http.get<Input>(`${this.base}/${id}`);
  }

  getStats() {
    return this.http.get<any>(`${this.base}/stats`);
  }

  create(payload: CreateInputPayload) {
    return this.http.post<Input>(this.base, payload);
  }

  update(id: string, payload: Partial<CreateInputPayload>) {
    return this.http.patch<Input>(`${this.base}/${id}`, payload);
  }

  updateStatus(id: string, status: InputStatus) {
    return this.http.patch<Input>(`${this.base}/${id}/status`, { status });
  }

  updatePmo(id: string, payload: { status?: 'retained' | 'rejected'; paymentAmountFinal?: string }) {
    return this.http.patch<Input>(`${this.base}/${id}/pmo`, payload);
  }

  restore(id: string) {
    return this.http.patch<Input>(`${this.base}/${id}/restore`, {});
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }

  downloadDocx(sectionId?: string) {
    const url = sectionId
      ? `${environment.apiUrl}/export/section/${sectionId}/docx`
      : `${environment.apiUrl}/export/global/docx`;
    return this.http.get(url, { responseType: 'blob' });
  }

  downloadXlsx(sectionId?: string) {
    const url = sectionId
      ? `${environment.apiUrl}/export/section/${sectionId}/xlsx`
      : `${environment.apiUrl}/export/global/xlsx`;
    return this.http.get(url, { responseType: 'blob' });
  }
}
