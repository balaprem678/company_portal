import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { SpinnerService } from '../shared/spinner/spinner.service';

import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    public currentUserSubject: BehaviorSubject<any>;
    public currentUser: Observable<any>;

    constructor(private http: HttpClient, private spinner: SpinnerService) {
        this.currentUserSubject = new BehaviorSubject<any>(localStorage.getItem('currentAdmin') ? JSON.parse(localStorage.getItem('currentAdmin')) : null);
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): any {
        return this.currentUserSubject.value;
    }

    login(username: string, password: string) {
        this.showspinner();
        return this.http.post<any>(`${environment.apiUrl}admin`, { username, password }, { withCredentials: true })
            .pipe(map(user => {
                
                if (user && user.data && user.data.status == 1) {
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem('currentAdmin', JSON.stringify(user.data));
                    this.currentUserSubject.next(user.data);
                };
                setTimeout(() => {
                    this.hidespinner()
                }, 1000);
                return user;
            }));
    }

    updateBrands(id) {
        return this.http.post<any>(environment.apiUrl + 'brands/edit', id);
    }

    addBrands(brands: any) {
        return this.http.post(`${environment.apiUrl}brands/save`, brands);
    }

    addWeb(webbrands: any) {
        return this.http.post(`${environment.apiUrl}banners/websave`, webbrands);
    }



    logout() {
        this.showspinner();
        // remove user from local storage to log user out
        localStorage.removeItem('currentAdmin');
        this.currentUserSubject.next(null);
        setTimeout(() => {
            this.hidespinner()
        }, 1000);
    }

    private showspinner() {
        this.spinner.Spinner('show');
    }
    private hidespinner() {
        this.spinner.Spinner('hide');
    }
}