import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { DefaultStoreService } from './default-store.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  title:any='Ecommerce'
  constructor(
    private toastr: ToastrService,
    public store: DefaultStoreService,
  ) { 
    this.store.generalSettings.subscribe((result) => {
      if (result && typeof result.site_title != 'undefined') {
        this.title = result.site_title;
    }
    });
  }

  showSuccess(message: string) {
    this.toastr.success(message, this.title,
      {
        progressBar: true,
        progressAnimation: "decreasing",
        closeButton: true
      }
    )
  }

  showError(message:string) {
    this.toastr.error(message, this.title,
      {
        
        progressBar: true,
        progressAnimation: "decreasing",
        closeButton: true
        
      }
    );
  }
  showError1(message:string) {
    this.toastr.error(message, this.title,
      {
        progressBar: true,
        progressAnimation: "decreasing",
        closeButton: true
      }
    );
  }

  showInfo(message: string) {
    this.toastr.info(message, this.title,
      {
        progressBar: true,
        progressAnimation: "decreasing",
        closeButton: true
      }
    )
  }

  showWarning(message: string, enableHtml?: boolean) {
    this.toastr.warning(message, this.title,
      {
        enableHtml: enableHtml ? enableHtml : false,
        progressBar: true,
        progressAnimation: "decreasing",
        closeButton: true
      }
    )
  }
}
