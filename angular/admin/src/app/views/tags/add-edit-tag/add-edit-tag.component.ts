import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormGroup } from '@angular/forms';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
   selector: 'app-add-edit-tag',
  templateUrl: './add-edit-tag.component.html',
  styleUrls: ['./add-edit-tag.component.scss'],
})
export class AddEditTagComponent {
  submitebtn = false;
  viewpage = false;
  userDetails: any = {};

  contractTypes = ['Yes', 'No'];
  documentTypes = ['PDF', 'DOC'];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private notifyService: NotificationService
  ) {}

  onlyNumbers(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  onFormSubmit(tagAddEditForm: UntypedFormGroup) {
    console.log(tagAddEditForm.value);

    if (!this.viewpage) {
      if (tagAddEditForm.valid) {
        this.submitebtn = true;
        this.userDetails = tagAddEditForm.value;

        const datas = {
          carrierName: this.userDetails.carrierName,
          noOfDrivers: this.userDetails.noOfDrivers,
          contractId: this.userDetails.contractId,
          contractType: this.userDetails.contractType,
          startDate: this.userDetails.startDate,
          endDate: this.userDetails.endDate,
          noOfBuses: this.userDetails.noOfBuses,
          contactOfficer: this.userDetails.contactOfficer,
          documentType: this.userDetails.documentType,
          documentFile: this.userDetails.documentFile
        };

        this.apiService
          .CommonApi(Apiconfig.tagSave.method, Apiconfig.tagSave.url, datas)
          .subscribe((result) => {
            if (result.status !== 0) {
              this.router.navigate(['/app/carrier/list']);
              this.notifyService.showSuccess(result.message);
            } else {
              this.notifyService.showError(result.message);
            }
            this.submitebtn = false;
          });
      } else {
        this.notifyService.showError('Please enter all mandatory fields');
      }
    } else {
      if (tagAddEditForm.valid) {
        this.submitebtn = true;
        this.userDetails = tagAddEditForm.value;

        const datas = {
          id: this.userDetails.id,
          carrierName: this.userDetails.carrierName,
          noOfDrivers: this.userDetails.noOfDrivers,
          contractId: this.userDetails.contractId,
          contractType: this.userDetails.contractType,
          startDate: this.userDetails.startDate,
          endDate: this.userDetails.endDate,
          noOfBuses: this.userDetails.noOfBuses,
          contactOfficer: this.userDetails.contactOfficer,
          documentType: this.userDetails.documentType,
          documentFile: this.userDetails.documentFile
        };

        this.apiService
          .CommonApi(Apiconfig.tagEdit.method, Apiconfig.tagEdit.url, datas)
          .subscribe((result) => {
            if (result) {
              this.router.navigate(['/app/carrier/list']);
              this.notifyService.showSuccess(result.message);
            } else {
              this.notifyService.showError(result.message);
            }
            this.submitebtn = false;
          });
      } else {
        this.notifyService.showError('Please enter all mandatory fields');
      }
    }
  }
}
