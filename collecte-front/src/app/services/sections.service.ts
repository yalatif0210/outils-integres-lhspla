import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ReferenceSection {
  id: string;
  titre: string;
  rubriqueNofo: string;
  objectif: string;
  entites: string[];
  ordre: number;
  contributionMode: 'structuree' | 'commentaire' | 'lecture_seule';
  texteReference: string;
  _count?: { inputs: number };
  inputs?: any[];
}

@Injectable({ providedIn: 'root' })
export class SectionsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/sections`;

  getAll() {
    return this.http.get<ReferenceSection[]>(this.base);
  }

  getOne(id: string) {
    return this.http.get<ReferenceSection>(`${this.base}/${id}`);
  }
}
