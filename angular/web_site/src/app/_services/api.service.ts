import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SpinnerService } from '../shared/spinner/spinner.service';
import { AuthenticationService } from './authentication.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private tap = new Subject<any>();
  tapObservable$ = this.tap.asObservable();
  private reloadPage = new Subject<any>();
  reloadObservable$ = this.reloadPage.asObservable(); 
  private cartPage = new Subject<any>();
  cartObservable$ = this.cartPage.asObservable();
  private checkoutPage = new Subject<any>();
  checkoutObservable$ = this.checkoutPage.asObservable();
  private buyNowFunction = new Subject<any>();
  buyNowObservable$ = this.buyNowFunction.asObservable();
  private viewProduct = new Subject<any>();
  viewProductObservable$ = this.viewProduct.asObservable();
  private placeOrder = new Subject<any>();
  placeOrderObservable$ = this.placeOrder.asObservable();

  constructor(
    @Inject(DOCUMENT) private _document: HTMLDocument,
    private http: HttpClient,
    private spinner: SpinnerService,
    private Authenticate: AuthenticationService,
    private notifyService: NotificationService,
  ) { }

  public CommonApi(method: any, url: any, data: any): Observable<any> {
    this.showspinner();
    var http_method = method;
    return this.http[http_method](`${environment.apiUrl}${url}`, data)
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
    return this.http.get(environment.apiUrl + 'site/getIP');
  }

  private handleError(error: HttpErrorResponse) {
    if (error && error.status === 401) {
      let userDetails = localStorage.getItem('userDetails');
      
      setTimeout(()=>{
        this.notifyService.showError("You are not authorized");
      },100)
      if (userDetails) {
        this.Authenticate.logout();
      }
      return
    }
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
          this._document.getElementById('appFavicon').setAttribute('href', 'assets/image/logo_icon.png');
        }
      });
    } else {
      this._document.getElementById('appFavicon').setAttribute('href', 'assets/image/logo_icon.png');
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

  public getTapName(data: any) {
    if (data) {
      this.tap.next(data);
    }
  }

  public realoadFunction(data: any) {
    if (data) {
      this.reloadPage.next(data);
    }
  }

  public checkoutFunction(data: any) {
    if (data) {
      this.checkoutPage.next(data);
    }
  }

  public getCart(data: any) {
    if (data) {
      this.cartPage.next(data);
    }
  }

  public buynowFunction(data: any) {
    if (data) {
      this.buyNowFunction.next(data)
    }
  }
  public viewProductPage(data: any) {
    if (data) {
      this.viewProduct.next(data)
    }
  }

  public placerOrderFunction(data: any) {
    if (data) {
      this.placeOrder.next(data)
    }
  }

}
