

import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PrivilagesData } from 'src/app/menu/privilages';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { ApiService } from 'src/app/_services/api.service';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { NotificationService } from 'src/app/_services/notification.service';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { log } from 'console';
@Component({
  selector: 'app-useremailtemplate',
  templateUrl: './useremailtemplate.component.html',
  styleUrls: ['./useremailtemplate.component.scss']
})
export class UseremailtemplateComponent implements OnInit {

  editorConfig: AngularEditorModule = {

    editable: true,
    sanitize: false,
    spellcheck: true,
    height: '15rem',
    minHeight: '5rem',
    placeholder: 'Enter text here...',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [
      ['bold']
    ],
    customClasses: [
      {
        name: "quote",
        class: "quote",
      },
      {
        name: 'redText',
        class: 'redText'
      },
      {
        name: 'customcheck',
        class: 'customcheck'
      },
      {
        name: "titleText",
        class: "titleText",
        tag: "h1",
      },
    ]
  };
  viewConfig: AngularEditorModule = {
    editable: false,
    sanitize: false,
    spellcheck: true,
    height: '15rem',
    minHeight: '5rem',
    placeholder: 'Enter text here...',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [
      ['bold']
    ],
    customClasses: [
      {
        name: "quote",
        class: "quote",
      },
      {
        name: 'redText',
        class: 'redText'
      },
      {
        name: 'customcheck',
        class: 'customcheck'
      },
      {
        name: "titleText",
        class: "titleText",
        tag: "h1",
      },
    ]
  };
  @ViewChild('emailtempleteForm') form: NgForm;
  emailtempleteDetails: any;
  pageTitle: string = 'Send Subcriber E-mail';
  submitebtn: boolean = false;
  viewpage: boolean = false;
  submitted: boolean = false;
  curentUser: any;
  activeUsers: any[] = [];
  emailContent: string = ''; 
  emailSubject: string = ''; 
  senderEmail: string = 'thiagarajan@teamtweaks.com';
  recipients: any[] = [];
  

  selectedEmails: string[] = [];  
  userEmails: any[] = [];
  allActiveUsers:boolean = false;
  userPrivilegeDetails: PrivilagesData[] = [];
  editorDisabled: boolean = false;
  selectedEmail: any[]= [];
  emailFooter: string = 'Unsubscribe: If you no longer wish to receive our emails, you can  [unsubscribe here].'; // Static text
  constructor(
    private ActivatedRoute: ActivatedRoute,
    private apiService: ApiService,
    private notifyService: NotificationService,
    private router: Router,
    private authService: AuthenticationService,
  ) {
    this.curentUser = this.authService.currentUserValue;
    var split = this.router.url.split('/');

    if (this.curentUser && this.curentUser.role == "subadmin" && this.curentUser.privileges) {
      if (this.router.url == '/email-template/add' || (split.length > 0 && split[2] == 'email-template')) {
        this.userPrivilegeDetails = this.curentUser.privileges.filter(x => x.alias == 'email-template');
        if (!this.userPrivilegeDetails[0].status.view) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.add && !this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
        if (!this.userPrivilegeDetails[0].status.edit && this.ActivatedRoute.snapshot.paramMap.get('id')) {
          this.notifyService.showWarning('You are not authorized this module');
          this.router.navigate(['/app']);
          return;
        };
      };
    };

    if (split && split.length > 3) {
      if ('view' == split[3]) {
        this.viewpage = true;
        this.editorDisabled = true
      }
      else {
        this.editorDisabled = false
      }
    };
  }

  ngOnInit(): void {
    this.getActiveUsers();

    this.form.controls['email_footer'].setValue('Unsubscribe: If you no longer wish to receive our emails, you can [unsubscribe here].');
  }

  onActiveUsersChange() {
    if (this.allActiveUsers) {
      console.log(this.allActiveUsers,"acttttt");
      
        // Clear the selected emails and disable the input
        this.selectedEmails = [];
    }
}


  getActiveUsers() {
    this.apiService.CommonApi(Apiconfig.subscribeUser.method, Apiconfig.subscribeUser.url, {}).subscribe((res: any) => {
      if (res && res.data) {
        // Assuming response contains a 'data' property which holds the user list
        this.activeUsers = res.data 
        this.userEmails = res.data.map(user => ({ email: user.email }));// Filter users based on 'isActive' field
      }
    }, error => {
      console.error('Error fetching user list:', error);
    });
  }


  

  // This method is triggered when emails are selected in the ng-select component
  onEmailsSelected(selectedEmails: any) {
    console.log(selectedEmails);
    this.selectedEmail = selectedEmails
    console.log(this.allActiveUsers,"activeeeeeee");
    
    console.log('Selected emails:', selectedEmails);  // You can handle further logic with selected emails here
  }

//   sendEmail() {
//     console.log(this.email_content);

//     const emailContent = this.email_content; // Get HTML content from the editor
//     const data = {
//         user_id: this.selectedUsers.map(user => user._id),
//         email: this.selectedUsers.map(user => user.email),
//         productid: this.select_subscript,
//         email_content: emailContent ,
//         template:'subscribe_news_letter-1'
//     };

//     this.apiService.CommonApi(Apiconfig.sendMail.method, Apiconfig.sendMail.url, data).subscribe(result => {
//         if (result && result.status === 1) {
//             this.notifyService.showSuccess(result.message);
//             this.model.hide();
//         } else {
//             this.notifyService.showError(result.message);
//         }
//     });
// }

  public onFormSubmit(emailtempleteForm: UntypedFormGroup) {
    this.prepareRecipients()
    console.log(emailtempleteForm, "asdasda sdasd asd asd");
    this.recipients
    console.log(this.recipients,"this.recipients");

    this.emailSubject = emailtempleteForm.value.email_subject;
    this.emailContent = emailtempleteForm.value.email_content;
    this.emailFooter = emailtempleteForm.value.email_footer;
     let data ={
      
        recipients: this.recipients, // List of email addresses to send to
        subject: this.emailSubject,   // Subject from the form
        content: this.emailContent,   // Content from the editor (email content)
        footer: this.emailFooter,   // Content from the editor (email content)
        senderEmail: this.senderEmail, 
      
     }
    this.submitted = true
    if (emailtempleteForm.valid) {
          this.apiService.CommonApi(Apiconfig.sendMail.method, Apiconfig.sendMail.url, data).subscribe(result => {
        if (result && result.status === 1) {
             this.router.navigate(['/app/users/subscribe']);
            this.notifyService.showSuccess(result.message);
        } else {
            this.notifyService.showError(result.message);
        }
    });
     

      // this.submitebtn = true;
      // var data = emailtempleteForm.value;
      // data.subscription = data.subscription ? 1 : 0;
      // data._id = this.ActivatedRoute.snapshot.paramMap.get('id');
      // data.subscription = data.subscription ? 1 : 0;
      // this.apiService.CommonApi(Apiconfig.emailTempletSave.method, Apiconfig.emailTempletSave.url, data).subscribe(
      //   (result) => {
      //     // this.router.navigate(['/app/email-template/list']);
      //     this.notifyService.showSuccess("E-mail template updated sucessfully");
      //     this.submitebtn = false;
      //   }, (error) => {
      //     this.submitebtn = false;
      //     this.notifyService.showError("Something went wrong.");
      //   }
      // )
    } else {
      this.notifyService.showError('Please Enter all mandatory fields');
    }
  }


  prepareRecipients() {
    if (this.allActiveUsers) {
      // If the checkbox is ticked, send to all active users
      this.recipients = this.activeUsers.map(user => user.email);
      console.log(this.recipients);
      
    } else {
      // If the checkbox is not ticked, send to users based on the sender email
      // const matchedUsers = this.activeUsers.filter(user =>
      //   user.email.includes(this.selectedEmail)
      // );
      console.log(this.selectedEmail);
      this.selectedEmail.forEach((res)=>this.selectedEmails.push(res.email))
      
      this.recipients  =  this.selectedEmails
    }
  }

  sendEmail() {
    // You can call an email service here to send the email
    console.log('Email sent to:', this.recipients);
    console.log('Email Subject:', this.emailSubject);
    console.log('Email Content:', this.emailContent);
  }

}
