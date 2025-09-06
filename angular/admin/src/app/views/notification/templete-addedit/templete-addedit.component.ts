import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';

@Component({
  selector: 'app-templete-addedit',
  templateUrl: './templete-addedit.component.html',
  styleUrls: ['./templete-addedit.component.scss']
})
export class TempleteAddeditComponent implements OnInit {

  @ViewChild('templeteForm') form: NgForm;

  templeteDetails: any;
  pageTitle: string = 'Push Notification Template Add';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  templatedecision: any;
  id: any;
  data: any;
  curentUser: any;
  userPrivilegeDetails: any;

  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private authService: AuthenticationService,
    private route: ActivatedRoute
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');
    console.log("current", this.curentUser)
    if (this.curentUser && this.curentUser.role == "subadmin") {
      if (this.router.url == '/app/notification/templete-add' || (split.length > 0 && split[2] == 'notification')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'notification');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.add && !this.route.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.edit && this.route.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
      };
    }

    var split = this.router.url.split('/');
    if (split && split.length > 3) {
      if ('view' == split[3]) {
        this.viewpage = true;
      }
    };
  }

  get formcontrol() {
    return this.form.controls;
  }

  ngOnInit(): void {

    this.id = this.ActivatedRoute.snapshot.paramMap.get('id');
    if (this.id) {
      this.pageTitle = "Push Notification Templete " + (this.viewpage ? 'View' : 'Edit');

      this.apiService.CommonApi(Apiconfig.getedittemplate.method, Apiconfig.getedittemplate.url, { id: this.id }).subscribe(
        (result) => {
          if (result && result.status == 1) {
            this.templeteDetails = result;
            console.log("sdf", this.templeteDetails)
            this.templatedecision = this.templeteDetails.notificationtype
            this.form.controls['notificationtype'].setValue(this.templeteDetails.notificationtype);
            setTimeout(() => {
              if (this.templeteDetails.notificationtype == "email") {
                console.log("hiisdf")
                this.form.controls['name'].setValue(this.templeteDetails.name)
                this.form.controls['subject'].setValue(this.templeteDetails.subject ? this.templeteDetails.subject : '');
                this.form.controls['sender_name'].setValue(this.templeteDetails.sender_name ? this.templeteDetails.sender_name : '');
                this.form.controls['sender_email'].setValue(this.templeteDetails.sender_email ? this.templeteDetails.sender_email : '');
                this.form.controls['content'].setValue(this.templeteDetails.content ? this.templeteDetails.content : '');

              }
              else {
                this.form.controls['name'].setValue(this.templeteDetails.name)
                this.form.controls['subject'].setValue(this.templeteDetails.subject ? this.templeteDetails.subject : '');
                this.form.controls['content'].setValue(this.templeteDetails.content ? this.templeteDetails.content : '');
              }
              this.form.controls['name'].setValue(this.templeteDetails.name ? this.templeteDetails.name : '')
            }, 500)
            if (this.viewpage) {
              this.form.form.disable();
            }
          }
        }
      )
    }

  };

  notificationtypeChange() {
    // this.form.reset();
  }

  public onFormSubmit(templeteForm: UntypedFormGroup) {
    console.log(templeteForm);

    if (templeteForm.valid) {
      this.submitebtn = true;
      this.data = templeteForm.value;
      console.log("asdsd", this.data)
      // data.content = templeteForm.value.emailcontent ? templeteForm.value.emailcontent : templeteForm.value.messagecontent;
      // data.subject = templeteForm.value.emailsubject ? templeteForm.value.emailsubject : templeteForm.value.messagesubject;
      // data.name = templeteForm.value.name ? templeteForm.value.name : templeteForm.value.messagetitle;
      // data.sender_email = templeteForm.value.senderemail ? templeteForm.value.senderemail : templeteForm.value.senderemail;
      // data.sender_name = templeteForm.value.sendername ? templeteForm.value.sendername : templeteForm.value.sendername;
      if (this.id) {
        this.data._id = this.id;
      }
      console.log("sdf", this.data)
      this.apiService.CommonApi(Apiconfig.saveemailTemplate.method, Apiconfig.saveemailTemplate.url, this.data).subscribe(
        (result) => {
          if (result) {
            this.router.navigate(['/app/notification/templete']);
            this.notifyService.showSuccess("Notification Updated Successfully");
          } else {
            this.notifyService.showError("Error Updated Successfully");
          }
          this.submitebtn = false;
          console.log(result)
        }, (error) => {
          this.submitebtn = false;
        }
      )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }

}
