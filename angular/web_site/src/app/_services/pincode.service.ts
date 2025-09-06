import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PincodeService {
  private apiUrl = 'https://api.postalpincode.in/pincode/';

  constructor(private http: HttpClient) { }

  getPincodeDetails(pincode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${pincode}`);
  }
}
