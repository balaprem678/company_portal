import { Component, OnInit, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { DefaultStoreService } from 'src/app/_services/default-store.service';
import { NotificationService } from 'src/app/_services/notification.service';
@Component({
  selector: 'app-faq-management',
  templateUrl: './faq-management.component.html',
  styleUrls: ['./faq-management.component.scss']
})
export class FaqManagementComponent {
  id: any

  faq_details = [{ title: '', content: '' }];

  constructor(private apiService: ApiService, private notifyService: NotificationService, private router: Router,) {


    // getFaq
    this.apiService.CommonApi(Apiconfig.getFaq.method, Apiconfig.getFaq.url, {}).subscribe((result) => {
      if(result && result.status &&  result.status == 1){
        this.faq_details = result.data.doc.faq_details
        this.id = result.data.doc._id
      }
    })
  }



  addfaqContent() {
    this.faq_details.push({ title: '', content: '' });
  }

  removefaqContent(index: number) {
    this.faq_details.splice(index, 1);
  }

  onsubmitform(form) {
    if (form.valid) {
      console.log('Form Data:', this.faq_details);
      var data = {} as any
      data.faq_details = this.faq_details
      if (this.id && this.id != (undefined || null || '')) {
        data._id = this.id
      }
      // faqAddEdit
      this.apiService.CommonApi(Apiconfig.faqAddEdit.method, Apiconfig.faqAddEdit.url, data).subscribe((result) => {
        if (this.id) {
          this.notifyService.showSuccess("Updated Successfully")
        } else {
          this.notifyService.showSuccess("Added Successfully")

        }
        this.router.navigate(['/'])

      })

    } else {
      console.error('Form is not valid');
      this.notifyService.showError("Please enter the details")
    }
  }
}