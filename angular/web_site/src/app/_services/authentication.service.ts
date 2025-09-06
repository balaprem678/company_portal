import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { SpinnerService } from '../shared/spinner/spinner.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  public currentUserSubject: BehaviorSubject<any>;
    public currentUser: Observable<any>;
    constructor(
        private http: HttpClient,
        private spinner: SpinnerService,

    ) {
        var userDeatil = localStorage.getItem('userDetails');
        this.currentUserSubject = new BehaviorSubject<any>(userDeatil ? JSON.parse(userDeatil) : null);
        this.currentUser = this.currentUserSubject.asObservable();
    }
    public get currentUserValue(): any {
        return this.currentUserSubject.value;
    }

    login(object: any) {
        this.showspinner();
        return this.http.post<any>(`${environment.apiUrl}site-user-login`, object)
            .pipe(map(user => {

                // console.log(user,"user13");
                if (user && user.data && user.data.status == 1) {
                    
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem('userDetails', JSON.stringify(user.data));
                    localStorage.setItem('userId', user.data.user_id);
                    this.currentUserSubject.next({username : user.data.user_name , role : user.data.role});
                }
                setTimeout(() => {
                    this.hidespinner()
                }, 1000);
                return user;
            }));
    }

    logout() {
        this.showspinner();
        // remove user from local storage to log user out
        localStorage.removeItem('userDetails');
        this.currentUserSubject.next(null); // Notify subscribers that user has logged out
        localStorage.clear()

        window.location.reload();
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
