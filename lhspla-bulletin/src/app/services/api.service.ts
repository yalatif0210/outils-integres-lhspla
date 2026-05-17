import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ─── Auth ─────────────────────────────────────────────────────────────────
  getMe() { return this.http.get<any>(`${this.base}/auth/me`); }

  // ─── Users ────────────────────────────────────────────────────────────────
  getUsers() { return this.http.get<any[]>(`${this.base}/users`); }
  createUser(data: any) { return this.http.post<any>(`${this.base}/users`, data); }
  updateUser(id: string, data: any) { return this.http.patch<any>(`${this.base}/users/${id}`, data); }
  toggleUserActive(id: string) { return this.http.patch<any>(`${this.base}/users/${id}/toggle-active`, {}); }
  setEntityResponsible(id: string) { return this.http.patch<any>(`${this.base}/users/${id}/set-responsible`, {}); }
  changeMyPassword(data: any) { return this.http.patch<any>(`${this.base}/users/me/password`, data); }

  // ─── Weeks ────────────────────────────────────────────────────────────────
  getWeeks() { return this.http.get<any[]>(`${this.base}/weeks`); }
  getActiveWeeks() { return this.http.get<any[]>(`${this.base}/weeks/active`); }
  getWeek(id: string) { return this.http.get<any>(`${this.base}/weeks/${id}`); }
  getWeekMatrix(id: string) { return this.http.get<any>(`${this.base}/weeks/${id}/matrix`); }
  createWeek(data: any) { return this.http.post<any>(`${this.base}/weeks`, data); }
  closeWeek(id: string) { return this.http.patch<any>(`${this.base}/weeks/${id}/close`, {}); }
  reopenWeek(id: string) { return this.http.patch<any>(`${this.base}/weeks/${id}/reopen`, {}); }

  // ─── Submissions ──────────────────────────────────────────────────────────
  getSubmission(weekId: string, entityCode: string) {
    return this.http.get<any>(`${this.base}/weeks/${weekId}/submissions/${entityCode}`);
  }
  getLocks(weekId: string, entityCode: string) {
    return this.http.get<any[]>(`${this.base}/weeks/${weekId}/submissions/${entityCode}/locks`);
  }
  acquireLock(weekId: string, entityCode: string, section: string) {
    return this.http.post<any>(`${this.base}/weeks/${weekId}/submissions/${entityCode}/lock/${section}`, {});
  }
  releaseLock(weekId: string, entityCode: string, section: string) {
    return this.http.post<any>(`${this.base}/weeks/${weekId}/submissions/${entityCode}/unlock/${section}`, {});
  }
  saveSection(weekId: string, entityCode: string, section: string, data: any) {
    return this.http.patch<any>(`${this.base}/weeks/${weekId}/submissions/${entityCode}/save`, { section, data });
  }
  submitEntity(weekId: string, entityCode: string) {
    return this.http.post<any>(`${this.base}/weeks/${weekId}/submissions/${entityCode}/submit`, {});
  }
  reopenSubmission(weekId: string, entityCode: string) {
    return this.http.post<any>(`${this.base}/weeks/${weekId}/submissions/${entityCode}/reopen`, {});
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  getAdminOverview(f: { year?: string; weekStatus?: string; weekId?: string } = {}) {
    let p = new HttpParams();
    if (f.year) p = p.set('year', f.year);
    if (f.weekStatus) p = p.set('weekStatus', f.weekStatus);
    if (f.weekId) p = p.set('weekId', f.weekId);
    return this.http.get<any>(`${this.base}/dashboard/admin`, { params: p });
  }
  getHeatmap(limit = 12, f: { year?: string; weekStatus?: string; entityCode?: string; weekId?: string } = {}) {
    let p = new HttpParams().set('limit', String(limit));
    if (f.year) p = p.set('year', f.year);
    if (f.weekStatus) p = p.set('weekStatus', f.weekStatus);
    if (f.entityCode) p = p.set('entityCode', f.entityCode);
    if (f.weekId) p = p.set('weekId', f.weekId);
    return this.http.get<any[]>(`${this.base}/dashboard/admin/heatmap`, { params: p });
  }
  getSubmissionRateTrend(limit = 12, f: { year?: string; weekStatus?: string; entityCode?: string; weekId?: string } = {}) {
    let p = new HttpParams().set('limit', String(limit));
    if (f.year) p = p.set('year', f.year);
    if (f.weekStatus) p = p.set('weekStatus', f.weekStatus);
    if (f.entityCode) p = p.set('entityCode', f.entityCode);
    if (f.weekId) p = p.set('weekId', f.weekId);
    return this.http.get<any[]>(`${this.base}/dashboard/admin/submission-trend`, { params: p });
  }
  getRiskTrend(limit = 12, f: { year?: string; weekStatus?: string; entityCode?: string; weekId?: string } = {}) {
    let p = new HttpParams().set('limit', String(limit));
    if (f.year) p = p.set('year', f.year);
    if (f.weekStatus) p = p.set('weekStatus', f.weekStatus);
    if (f.entityCode) p = p.set('entityCode', f.entityCode);
    if (f.weekId) p = p.set('weekId', f.weekId);
    return this.http.get<any[]>(`${this.base}/dashboard/admin/risk-trend`, { params: p });
  }
  getCriticalRisks() { return this.http.get<any[]>(`${this.base}/dashboard/admin/critical-risks`); }
  getDashboardAvailableYears() { return this.http.get<string[]>(`${this.base}/dashboard/available-years`); }
  getDashboardWeekPeriods() { return this.http.get<any[]>(`${this.base}/dashboard/week-periods`); }
  getEntityComparison(f: { year?: string; weekStatus?: string; entityCode?: string; weekId?: string } = {}) {
    let p = new HttpParams();
    if (f.year) p = p.set('year', f.year);
    if (f.weekStatus) p = p.set('weekStatus', f.weekStatus);
    if (f.entityCode) p = p.set('entityCode', f.entityCode);
    if (f.weekId) p = p.set('weekId', f.weekId);
    return this.http.get<any[]>(`${this.base}/dashboard/admin/entity-comparison`, { params: p });
  }
  getEntityDashboard(code: string, limit = 12) { return this.http.get<any>(`${this.base}/dashboard/entity/${code}?limit=${limit}`); }
  getMyEntityDashboard() { return this.http.get<any>(`${this.base}/dashboard/my-entity`); }

  // ─── Entity history ───────────────────────────────────────────────────────
  getEntityHistory(code: string) { return this.http.get<any[]>(`${this.base}/dashboard/entity/${code}/history`); }

  // ─── App config ───────────────────────────────────────────────────────────
  getAppConfig() { return this.http.get<Record<string, string>>(`${this.base}/config`); }
  getAppConfigFull() { return this.http.get<any[]>(`${this.base}/config/full`); }
  updateAppConfig(key: string, value: string) { return this.http.patch<any>(`${this.base}/config/${key}`, { value }); }

  // ─── Activity references ──────────────────────────────────────────────────
  getActivityRefs(entityCode: string) { return this.http.get<any[]>(`${this.base}/activity-references?entityCode=${entityCode}`); }
  getAllActivityRefs() { return this.http.get<any[]>(`${this.base}/activity-references`); }
  createActivityRef(data: any) { return this.http.post<any>(`${this.base}/activity-references`, data); }
  updateActivityRef(id: string, data: any) { return this.http.patch<any>(`${this.base}/activity-references/${id}`, data); }
  deleteActivityRef(id: string) { return this.http.delete<any>(`${this.base}/activity-references/${id}`); }
  importActivityRefs(formData: FormData) { return this.http.post<any>(`${this.base}/activity-references/import`, formData); }

  // ─── Risk themes ──────────────────────────────────────────────────────────
  getRiskThemes() { return this.http.get<any[]>(`${this.base}/risk-themes`); }
  getAllRiskThemes() { return this.http.get<any[]>(`${this.base}/risk-themes?all=true`); }
  createRiskTheme(data: any) { return this.http.post<any>(`${this.base}/risk-themes`, data); }
  updateRiskTheme(id: string, data: any) { return this.http.patch<any>(`${this.base}/risk-themes/${id}`, data); }
  deleteRiskTheme(id: string) { return this.http.delete<any>(`${this.base}/risk-themes/${id}`); }

  // ─── Risk categories ──────────────────────────────────────────────────────
  getRiskCategories(themeId?: string) {
    const url = themeId
      ? `${this.base}/risk-categories?themeId=${themeId}`
      : `${this.base}/risk-categories`;
    return this.http.get<any[]>(url);
  }
  getAllRiskCategories() { return this.http.get<any[]>(`${this.base}/risk-categories?all=true`); }
  createRiskCategory(data: any) { return this.http.post<any>(`${this.base}/risk-categories`, data); }
  updateRiskCategory(id: string, data: any) { return this.http.patch<any>(`${this.base}/risk-categories/${id}`, data); }
  deleteRiskCategory(id: string) { return this.http.delete<any>(`${this.base}/risk-categories/${id}`); }
  importRiskThemesCategories(formData: FormData) { return this.http.post<any>(`${this.base}/risk-themes/import`, formData); }

  // ─── Financing funds ──────────────────────────────────────────────────────
  getFinancingFunds() { return this.http.get<any[]>(`${this.base}/financing-funds`); }
  getAllFinancingFunds() { return this.http.get<any[]>(`${this.base}/financing-funds?all=true`); }
  createFinancingFund(data: any) { return this.http.post<any>(`${this.base}/financing-funds`, data); }
  updateFinancingFund(id: string, data: any) { return this.http.patch<any>(`${this.base}/financing-funds/${id}`, data); }
  deleteFinancingFund(id: string) { return this.http.delete<any>(`${this.base}/financing-funds/${id}`); }

  // ─── Budget projects ──────────────────────────────────────────────────────
  getBudgets(entityCode?: string, budgetNumber?: string, createdAt?: string) {
    let params = new HttpParams();
    if (entityCode) params = params.set('entityCode', entityCode);
    if (budgetNumber) params = params.set('budgetNumber', budgetNumber);
    if (createdAt) params = params.set('createdAt', createdAt);
    return this.http.get<any[]>(`${this.base}/budget-projects`, { params });
  }
  getBudget(id: string) { return this.http.get<any>(`${this.base}/budget-projects/${id}`); }
  createBudget(data: any) { return this.http.post<any>(`${this.base}/budget-projects`, data); }
  updateBudget(id: string, data: any) { return this.http.patch<any>(`${this.base}/budget-projects/${id}`, data); }
  submitBudget(id: string) { return this.http.post<any>(`${this.base}/budget-projects/${id}/submit`, {}); }
  financeReviewBudget(id: string, data: { decision: 'finance_reviewed' | 'rejected'; rejectionReason?: string }) {
    return this.http.post<any>(`${this.base}/budget-projects/${id}/finance-review`, data);
  }
  tpmReviewBudget(id: string, data: { decision: 'tpm_approved' | 'rejected'; rejectionReason?: string }) {
    return this.http.post<any>(`${this.base}/budget-projects/${id}/tpm-review`, data);
  }
  copReviewBudget(id: string, data: { decision: 'approved' | 'rejected'; rejectionReason?: string }) {
    return this.http.post<any>(`${this.base}/budget-projects/${id}/cop-review`, data);
  }
  deleteBudget(id: string) { return this.http.delete<any>(`${this.base}/budget-projects/${id}`); }

  // ─── Grille de coûts ──────────────────────────────────────────────────────
  getCostItems(all = false) { return this.http.get<any[]>(`${this.base}/cost-items${all ? '?all=true' : ''}`); }
  getCostItemNatures() { return this.http.get<any[]>(`${this.base}/cost-items/natures`); }
  createCostItem(data: any) { return this.http.post<any>(`${this.base}/cost-items`, data); }
  updateCostItem(id: string, data: any) { return this.http.patch<any>(`${this.base}/cost-items/${id}`, data); }
  deleteCostItem(id: string) { return this.http.delete<any>(`${this.base}/cost-items/${id}`); }

  // ─── Budget recalls ───────────────────────────────────────────────────────
  getAllRecalls() { return this.http.get<any[]>(`${this.base}/budget-recalls`); }
  getRecallsByBudget(budgetId: string) { return this.http.get<any[]>(`${this.base}/budget-recalls/by-budget/${budgetId}`); }
  createRecall(data: any) { return this.http.post<any>(`${this.base}/budget-recalls`, data); }
  addRecallDocument(recallId: string, formData: FormData) { return this.http.post<any>(`${this.base}/budget-recalls/${recallId}/documents`, formData); }
  deleteRecallDocument(recallId: string, docId: string) { return this.http.delete<any>(`${this.base}/budget-recalls/${recallId}/documents/${docId}`); }
  getRecallCoverage(recallId: string) { return this.http.get<any[]>(`${this.base}/budget-recalls/${recallId}/coverage`); }
  getRecallAudit(recallId: string) { return this.http.get<any[]>(`${this.base}/budget-recalls/${recallId}/audit`); }
  downloadUploadedFile(filePath: string) {
    const uploadsBase = this.base.replace('/api', '');
    return this.http.get(`${uploadsBase}/uploads/${filePath}`, { responseType: 'blob' });
  }
  reviewRecallDoc(recallId: string, docId: string, body: { decision: string; rejectionNote?: string }) {
    return this.http.patch<any>(`${this.base}/budget-recalls/${recallId}/documents/${docId}/review`, body);
  }
  rejectRecall(recallId: string, body: { reason: string }) { return this.http.post<any>(`${this.base}/budget-recalls/${recallId}/reject`, body); }
  cancelRecall(recallId: string) { return this.http.post<any>(`${this.base}/budget-recalls/${recallId}/cancel`, {}); }
  closeRecall(recallId: string) { return this.http.post<any>(`${this.base}/budget-recalls/${recallId}/close`, {}); }
  reopenRecall(recallId: string) { return this.http.post<any>(`${this.base}/budget-recalls/${recallId}/reopen`, {}); }

  // ─── Notifications ────────────────────────────────────────────────────────
  getNotifications() { return this.http.get<any[]>(`${this.base}/notifications`); }
  getUnreadCount() { return this.http.get<{ count: number }>(`${this.base}/notifications/unread-count`); }
  markRead(id: string) { return this.http.patch<any>(`${this.base}/notifications/${id}/read`, {}); }
  markAllRead() { return this.http.patch<any>(`${this.base}/notifications/read-all`, {}); }

  // ─── Personnel ────────────────────────────────────────────────────────────
  getPersonnel(includeInactive = false) {
    return this.http.get<any[]>(`${this.base}/personnel?includeInactive=${includeInactive}`);
  }
  createPersonnel(data: any) { return this.http.post<any>(`${this.base}/personnel`, data); }
  updatePersonnel(id: string, data: any) { return this.http.patch<any>(`${this.base}/personnel/${id}`, data); }
  deletePersonnel(id: string) { return this.http.delete<any>(`${this.base}/personnel/${id}`); }
  seedPersonnel() { return this.http.post<any>(`${this.base}/personnel/seed`, {}); }
  reorderPersonnel(ids: string[]) { return this.http.put<any>(`${this.base}/personnel/reorder`, { ids }); }

  // ─── Missions ─────────────────────────────────────────────────────────────
  getMissions() { return this.http.get<any[]>(`${this.base}/missions`); }
  getMission(id: string) { return this.http.get<any>(`${this.base}/missions/${id}`); }
  createMission(data: any) { return this.http.post<any>(`${this.base}/missions`, data); }
  updateMission(id: string, data: any) { return this.http.patch<any>(`${this.base}/missions/${id}`, data); }
  submitMission(id: string) { return this.http.post<any>(`${this.base}/missions/${id}/submit`, {}); }
  tpmReviewMission(id: string, data: { decision: 'pending_cop' | 'draft'; rejectionReason?: string }) {
    return this.http.post<any>(`${this.base}/missions/${id}/tpm-review`, data);
  }
  updateMissionDashboard(id: string, data: { orderNumber?: string; dashboardObservations?: string }) {
    return this.http.patch<any>(`${this.base}/missions/${id}/dashboard`, data);
  }
  copReviewMission(id: string, data: any) { return this.http.post<any>(`${this.base}/missions/${id}/cop-review`, data); }
  generateMissionDocs(id: string) { return this.http.post<any>(`${this.base}/missions/${id}/generate-docs`, {}); }
  validateMissionDg(id: string) { return this.http.post<any>(`${this.base}/missions/${id}/validate-dg`, {}); }
  cancelMission(id: string) { return this.http.post<any>(`${this.base}/missions/${id}/cancel`, {}); }
  getMissionDashboard() { return this.http.get<any[]>(`${this.base}/missions/dashboard`); }
  downloadMissionDoc(id: string, docType: 'dm' | 'odm') {
    return this.http.get(`${this.base}/missions/${id}/download/${docType}`, { responseType: 'blob' });
  }

  // ─── Budget TDR ───────────────────────────────────────────────────────────
  uploadBudgetTdr(id: string, formData: FormData) {
    return this.http.post<any>(`${this.base}/budget-projects/${id}/upload-tdr`, formData);
  }
  downloadBudgetTdr(id: string) {
    return this.http.get(`${this.base}/budget-projects/${id}/download-tdr`, { responseType: 'blob' });
  }

  // ─── Mission — document signé ─────────────────────────────────────────────
  uploadMissionSignedDoc(id: string, formData: FormData) {
    return this.http.post<any>(`${this.base}/missions/${id}/upload-signed-doc`, formData);
  }
  downloadMissionSignedDoc(id: string) {
    return this.http.get(`${this.base}/missions/${id}/download-signed-doc`, { responseType: 'blob' });
  }

  // ─── Demandes de paiement ─────────────────────────────────────────────────
  getPaymentRequests(budgetId: string) {
    return this.http.get<any[]>(`${this.base}/payment-requests/by-budget/${budgetId}`);
  }
  uploadPaymentRequest(budgetId: string, formData: FormData) {
    return this.http.post<any>(`${this.base}/payment-requests/${budgetId}`, formData);
  }
  validatePaymentRequest(id: string) {
    return this.http.post<any>(`${this.base}/payment-requests/${id}/validate`, {});
  }
  rejectPaymentRequest(id: string, reason: string) {
    return this.http.post<any>(`${this.base}/payment-requests/${id}/reject`, { reason });
  }
  downloadPaymentRequest(id: string) {
    return this.http.get(`${this.base}/payment-requests/${id}/download`, { responseType: 'blob' });
  }
  uploadPaymentProof(id: string, formData: FormData) {
    return this.http.post<any>(`${this.base}/payment-requests/${id}/proofs`, formData);
  }
  getPaymentSummary(budgetId: string) {
    return this.http.get<{
      initialTotal: number; effectiveTotal: number; totalPaid: number;
      memoEnabled: boolean; totalBudget: number; resteAPayer: number;
    }>(`${this.base}/payment-requests/budget/${budgetId}/summary`);
  }
  downloadPaymentProof(id: string, proofId: string) {
    return this.http.get(`${this.base}/payment-requests/${id}/proofs/${proofId}/download`, { responseType: 'blob' });
  }
  // ─── KPI Dashboard ────────────────────────────────────────────────────────
  getBudgetKpis(filters: { entityCode?: string; from?: string; to?: string; fiscalYear?: string } = {}) {
    let params = new HttpParams();
    if (filters.entityCode) params = params.set('entityCode', filters.entityCode);
    if (filters.fiscalYear) params = params.set('fiscalYear', filters.fiscalYear);
    else {
      if (filters.from) params = params.set('from', filters.from);
      if (filters.to) params = params.set('to', filters.to);
    }
    return this.http.get<any>(`${this.base}/dashboard/budget-kpis`, { params });
  }
  getMissionStats(filters: { entityCode?: string; personnelId?: string; from?: string; to?: string; fiscalYear?: string } = {}) {
    let params = new HttpParams();
    if (filters.entityCode) params = params.set('entityCode', filters.entityCode);
    if (filters.personnelId) params = params.set('personnelId', filters.personnelId);
    if (filters.fiscalYear) params = params.set('fiscalYear', filters.fiscalYear);
    else {
      if (filters.from) params = params.set('from', filters.from);
      if (filters.to) params = params.set('to', filters.to);
    }
    return this.http.get<any>(`${this.base}/dashboard/mission-stats`, { params });
  }
  getFinancialDashboard(filters: { entityCode?: string; budgetType?: string; from?: string; to?: string } = {}) {
    let params = new HttpParams();
    if (filters.entityCode) params = params.set('entityCode', filters.entityCode);
    if (filters.budgetType) params = params.set('budgetType', filters.budgetType);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<any>(`${this.base}/dashboard/financial`, { params });
  }

  deletePaymentRequest(id: string) {
    return this.http.delete<void>(`${this.base}/payment-requests/${id}`);
  }
  deletePaymentProof(requestId: string, proofId: string) {
    return this.http.delete<void>(`${this.base}/payment-requests/${requestId}/proofs/${proofId}`);
  }
  downloadPaymentTemplate() {
    return this.http.get(`${this.base}/payment-template/download`, { responseType: 'blob' });
  }
  uploadPaymentTemplate(formData: FormData) {
    return this.http.post<any>(`${this.base}/payment-template`, formData);
  }

  // ─── Budget memos ─────────────────────────────────────────────────────────
  getBudgetMemos(budgetId: string) {
    return this.http.get<any>(`${this.base}/budget-memos/by-budget/${budgetId}`);
  }
  createBudgetMemo(formData: FormData) {
    return this.http.post<any>(`${this.base}/budget-memos`, formData);
  }
  deleteBudgetMemo(id: string) {
    return this.http.delete<void>(`${this.base}/budget-memos/${id}`);
  }
  downloadBudgetMemoFile(id: string) {
    return this.http.get(`${this.base}/budget-memos/${id}/download`, { responseType: 'blob' });
  }
  copReviewBudgetMemo(id: string, data: { decision: 'approved' | 'rejected'; rejectionReason?: string }) {
    return this.http.post<any>(`${this.base}/budget-memos/${id}/cop-review`, data);
  }
}
