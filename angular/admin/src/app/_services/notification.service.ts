// import { Injectable } from '@angular/core';

// import { ToastrService } from 'ngx-toastr';
// import { DefaultStoreService } from './default-store.service';

// @Injectable({
//     providedIn: 'root'
// })
// export class NotificationService {

//     title: string;
//     constructor(
//         private toastr: ToastrService,
//         private store: DefaultStoreService
//     ) {
//         this.store.generalSettings.subscribe(
//             (result) => {
//                 if (result && typeof result.site_title != 'undefined') {
//                     this.title = result.site_title;
//                 }
//             }
//         );
//     }

//     showSuccess(message) {
//         this.toastr.success(message, this.title,
//             {
//                 progressBar: true,
//                 progressAnimation: "decreasing",
//                 closeButton: true
//             }
//         )
//     }

//     showError(message) {
//         this.toastr.error(message, this.title,
//             {
//                 progressBar: true,
//                 progressAnimation: "decreasing",
//                 closeButton: true
//             }
//         );
//     }

//     showInfo(message) {
//         this.toastr.info(message, this.title,
//             {
//                 progressBar: true,
//                 progressAnimation: "decreasing",
//                 closeButton: true
//             }
//         )
//     }

//     showWarning(message: string, enableHtml?: boolean) {
//         this.toastr.warning(message, this.title,
//             {
//                 enableHtml: enableHtml ? enableHtml : false,
//                 progressBar: true,
//                 progressAnimation: "decreasing",
//                 closeButton: true
//             }
//         )
//     }

// }



import { Injectable } from '@angular/core';
import { ToastrService, ProgressAnimationType, IndividualConfig } from 'ngx-toastr';
import { DefaultStoreService } from './default-store.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  title: string;
  isToastrVisible: boolean = false;

  constructor(
    private toastr: ToastrService,
    private store: DefaultStoreService
  ) {
    this.store.generalSettings.subscribe(
      (result) => {
        if (result && typeof result.site_title !== 'undefined') {
          this.title = result.site_title;
        }
      }
    );
  }

  private showNotification(type: 'success' | 'error' | 'info' | 'warning', message: string, enableHtml: boolean = false) {
    if (!this.isToastrVisible) {
      this.isToastrVisible = true;

      const toastrOptions: Partial<IndividualConfig> = {
        progressBar: true,
        progressAnimation: 'decreasing' as ProgressAnimationType,
        closeButton: true,
        enableHtml: enableHtml,
        timeOut: 5000,  // Customize the timeout duration as needed
        onActivateTick: true
      };

      const toastRef = this.toastr[type](message, this.title, toastrOptions);

      toastRef.onHidden.subscribe(() => {
        this.isToastrVisible = false;
      });
    }
  }

  showSuccess(message: string) {
    this.showNotification('success', message);
  }

  showError(message: string) {
    this.showNotification('error', message);
  }

  showInfo(message: string) {
    this.showNotification('info', message);
  }

  showWarning(message: string, enableHtml: boolean = false) {
    this.showNotification('warning', message, enableHtml);
  }
}
