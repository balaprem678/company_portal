import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { SpinnerService } from '../shared/spinner/spinner.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private tap = new Subject<any>();
  tapObservable$ = this.tap.asObservable();
  constructor(
    @Inject(DOCUMENT) private _document: HTMLDocument,
    private http: HttpClient,
    private spinner: SpinnerService,
  ) { }

  public CommonApi(method, url, data): Observable<any> {
    this.showspinner();
    return this.http[method](`${environment.apiUrl}${url}`, data)
      .pipe(
        tap( // Log the result or error
          data => {
            setTimeout(() => {
              this.hidespinner()
            }, 1000);
          },
          error => this.handleError(error)
        )
      );
  };

  public getIPAddress() {
    return this.http.get(environment.apiUrl + 'api/getIP');
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
      
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.log(
        `Backend returned code ${error.status}, ` +
        `body was: ${error}`);
        setTimeout(() => {
          this.hidespinner()
        }, 1000);
    }

    // Return an observable with a user-facing error message.
    return throwError({ message: error });
  };

  public setAppFavicon(icon: string) {
    if (icon != '') {
      var imageUrl = environment.apiUrl + icon;
      this.imageExists(imageUrl, (exists) => {
        if (exists) {
          this._document.getElementById('appFavicon').setAttribute('href', environment.apiUrl + icon);
        } else {
          this._document.getElementById('appFavicon').setAttribute('href', 'assets/image/logo-icon.png');
        }
      });
    } else {
      this._document.getElementById('appFavicon').setAttribute('href', 'assets/image/logo-icon.png');
    };
  };

  imageExists(url, callback) {
    var img = new Image();
    img.onload = () => { callback(true); };
    img.onerror = () => { callback(false); };
    img.src = url;
  };

  showspinner() {
    this.spinner.Spinner('show');
  }
  hidespinner() {
    this.spinner.Spinner('hide');
  }

  public notificationFunction(data: any){
    if(data){
      this.tap.next(data)
    }
  }
}
