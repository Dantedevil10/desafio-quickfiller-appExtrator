import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DocumentoService {
  private apiUrl = 'https://backnode-htfx.onrender.com/';

  constructor(private http: HttpClient) {}

  // POST /api/transcricoes
  uploadDocumento(file: File, tipo: string): Observable<any> {
    const formData = new FormData();
    formData.append('arquivo', file); // ATENÇÃO: Nome exato exigido pelo contrato
    formData.append('tipo', tipo);
    return this.http.post(`${this.apiUrl}/transcricoes`, formData);
  }

  // GET /api/transcricoes/:id
  checkStatus(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/transcricoes/${id}`);
  }

  // PUT /api/transcricoes/:id
  salvarEdicoes(id: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/transcricoes/${id}`, { value: value });
  }

  // GET /api/transcricoes/:id/planilha?formato=...
  baixarPlanilha(id: string, formato: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/transcricoes/${id}/planilha?formato=${formato}`, {
      responseType: 'blob'
    });
  }
}