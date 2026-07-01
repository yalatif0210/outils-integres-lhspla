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
  status: InputStatus;
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
  content: string;
  title?: string;
  means?: string;
  output?: string;
  verificationMethod?: string;
  targetValue?: string;
  dueMonth?: string;
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

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }

  exportDocx(sectionId?: string): string {
    if (sectionId) return `${environment.apiUrl}/export/section/${sectionId}/docx`;
    return `${environment.apiUrl}/export/global/docx`;
  }

  exportXlsx(sectionId?: string): string {
    if (sectionId) return `${environment.apiUrl}/export/section/${sectionId}/xlsx`;
    return `${environment.apiUrl}/export/global/xlsx`;
  }
}
