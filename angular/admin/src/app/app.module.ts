import { NgModule } from '@angular/core';
import { BrowserModule, Meta } from '@angular/platform-browser';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ErrorInterceptor } from 'src/app/_helpers/error.interceptor';
import { JwtInterceptor } from 'src/app/_helpers/jwt.interceptor';
import { ToastrModule, ToastNoAnimationModule } from 'ngx-toastr';
// import { SpinnerComponent } from './shared/spinner/spinner.component';
import { ErrorComponent } from './error/error.component';
import { SuccessComponent } from './success/success.component';
import { SitePageComponent } from './site-page/site-page.component';
import { Page404Component } from './page404/page404.component';
import { WebSocketService } from './_services/webSocketService.service';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { environment } from 'src/environments/environment';
import { SharedModule } from './shared/shared.module';
import { DebatedetailsComponent } from './debatedetails/debatedetails.component';
import { RouterModule } from '@angular/router';
import {  DeviceDetectorService } from 'ngx-device-detector';
// import { UniversalDeviceDetectorService } from './app-device.service';
const config: SocketIoConfig = { url: environment.apiUrl, options: {} };

@NgModule({
  declarations: [
    AppComponent,
    // SpinnerComponent,
    ErrorComponent,
    SuccessComponent,
    SitePageComponent,
    Page404Component,
    DebatedetailsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    // DeviceDetectorModule.forRoot(),
    ToastrModule.forRoot(),
    ToastNoAnimationModule.forRoot(),
    SocketIoModule.forRoot(config),
    SharedModule,
    RouterModule
  ],
  providers: [
    Meta,
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy,
    },
    {
      provide: DeviceDetectorService,
      // useClass: UniversalDeviceDetectorService
    },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    // { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    WebSocketService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
