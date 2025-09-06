import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule, Meta } from '@angular/platform-browser';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ToastNoAnimationModule, ToastrModule } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { WebsocketService } from './_services/websocket.service';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { SharedModule } from './shared/shared.module';
import { LayoutModule } from './layout/layout.module';
import { CookieService } from 'ngx-cookie-service';

// const config: SocketIoConfig = { url: `${environment.apiUrl}chat`, options: {} };
const config: SocketIoConfig = { url: `${environment.apiUrl}chat`, options: {} };

/* import { SocialLoginModule, SocialAuthServiceConfig } from 'angularx-social-login';
import {
  GoogleLoginProvider,
  FacebookLoginProvider
} from 'angularx-social-login'; */
import { SitePageComponent } from './site-page/site-page.component';
import { SafeHtmlPipe } from './safe-html.pipe';
import { PaymentSuccessComponent } from './payment-success/payment-success.component';
import { PaymentFailureComponent } from './payment-failure/payment-failure.component';
import { JwtInterceptor } from './_helpers/jwt.interceptor';
import { PaymentstatusComponent } from './paymentstatus/paymentstatus.component';
import { CodOrderStatusComponent } from './cod-order-status/cod-order-status.component';
import { NotFoundComponent } from './not-found/not-found.component';



/* const googleLoginOptions = {
  scope: 'profile email',
  plugin_name:'sample_login'//this can be any string
}; */ // https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiauth2clientconfig


@NgModule({
  declarations: [
    AppComponent,
    SitePageComponent,
    SafeHtmlPipe,
    PaymentSuccessComponent,
    PaymentFailureComponent,
    PaymentstatusComponent,
    CodOrderStatusComponent,
    NotFoundComponent,
    

  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    ToastrModule.forRoot(),
    ToastNoAnimationModule.forRoot(),
    SharedModule,
    SocketIoModule.forRoot(config),
    LayoutModule,
    
    // SocialLoginModule
  ],
  providers: [
    Meta,
    // {
    //   provide: LocationStrategy,
    //   useClass: HashLocationStrategy,
    // },
    WebsocketService,
    CookieService,
    {
      provide:HTTP_INTERCEPTORS,useClass:JwtInterceptor,multi:true
    }
    /* {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            // provider: new GoogleLoginProvider(
            //   '1028186456420-sgm4s29iu9tjmrok2e2t5nad8jpggffv.apps.googleusercontent.com', googleLoginOptions
            // ) // localhost
            provider: new GoogleLoginProvider(
              '908639971397-atv6h5eebb8mqharapk2vt6huocgu8vq.apps.googleusercontent.com', googleLoginOptions
            ) //staging
          },
          {
            id: FacebookLoginProvider.PROVIDER_ID,
            provider: new FacebookLoginProvider('250279994495041')
          }
        ],
        onError: (err) => {
          console.error(err);
        }
      } as SocialAuthServiceConfig,
    } */
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
