import { Component, Output, EventEmitter, Input, OnInit, ViewChild, ElementRef } from "@angular/core";
import { Apiconfig } from 'src/app/_helpers/api-config';
import { AuthenticationService } from 'src/app/_services/authentication.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { Router } from '@angular/router';
import { NotificationService } from 'src/app/_services/notification.service';
import { ApiService } from "../_services/api.service";

import { AngularEditorModule } from '@kolkov/angular-editor';


@Component({
    selector: 'assign-popup-button',
    template: `
    <!-- <span  style="cursor: pointer;" class='badge badge-warning w-100 badge-pill py-2 mb-2' (click)="confirmModal.show()" >Send Mail</span> -->
    <!-- <span *ngIf="rowData.active == true" class='badge badge-success w-100 badge-pill py-2 mb-2' >Subscribed</span> -->
    <!-- <div bsModal #confirmModal="bs-modal" class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true"> -->
        <div class="cases-model" bsModal #confirmModal="bs-modal">
            <div class="modal-header">
                <h4 class="modal-title pull-left">Enter Your Email Content</h4>
            </div>
            <div class="modal-body">
              
            <angular-editor 
               id="email_content" 
                 name="email_content" 
                 required 
                    [(ngModel)]="email_content">
                   </angular-editor>
       
                <div class="yes_no_btn">
                    <button type="button" class="btn conform_yes" (click)="sendEmail()">
                        Yes
                    </button>
                    <button type="button" class="btn conform_no" (click)="confirmModal.hide()">
                        No
                    </button>
                </div>
            </div>
        </div>
<!-- </div> -->
  `,

    styleUrls: ['./sendmail.component.scss']

})

export class SendmailComponent {

    editorConfig: AngularEditorModule = {
        editable: true,
        sanitize: true,
        spellcheck: true,
        height: '15rem',
        minHeight: '5rem',
        placeholder: 'Enter text here...',
        translate: 'no',
        defaultParagraphSeparator: 'p',
        defaultFontName: 'Arial',
        upload: (file: File) => {

            console.log('Uploading file:', file);
        },
        uploadWithCredentials: false,
        toolbarPosition: 'top',
        toolbarHiddenButtons: [
            ['bold', 'italic'],
            ['fontSize']
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
        sanitize: true,
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


    rowData: any;
    confirmModal: any;
    select_subscript: any;
    productList: any[] = [];
    @Input() selectedUsers: any[] = []; // Receive selected users

    @ViewChild('confirmModal') model: BsModalRef;
    @Input() value: any;
    @Output() save: EventEmitter<any> = new EventEmitter();
    email_content: any;

    constructor(
        private apiService: ApiService,
        private notifyService: NotificationService,
    ) {
        this.apiService.CommonApi(Apiconfig.trendingProduct.method, Apiconfig.trendingProduct.url, {}).subscribe(result => {

            if (result && result.status == 1) {
                console.log(result);

                this.productList = result.data;
            }
        })
    }

    sendEmail() {
        console.log(this.email_content);

        const emailContent = this.email_content; // Get HTML content from the editor
        const data = {
            user_id: this.selectedUsers.map(user => user._id),
            email: this.selectedUsers.map(user => user.email),
            productid: this.select_subscript,
            email_content: emailContent ,
            template:'subscribe_news_letter-1'
        };

        this.apiService.CommonApi(Apiconfig.sendMail.method, Apiconfig.sendMail.url, data).subscribe(result => {
            if (result && result.status === 1) {
                this.notifyService.showSuccess(result.message);
                this.model.hide();
            } else {
                this.notifyService.showError(result.message);
            }
        });
    }
    onModelChange() {
        console.log(this.select_subscript);

        if (this.select_subscript && this.select_subscript !== '') {
            const data = {
                user_id: this.selectedUsers.map(user => user._id), // Adjusted to handle multiple users
                email: this.selectedUsers.map(user => user.email), // Adjusted to handle multiple users

                productid: this.select_subscript
            };
            this.apiService.CommonApi(Apiconfig.sendMail.method, Apiconfig.sendMail.url, data).subscribe(result => {
                if (result && result.status === 1) {
                    this.notifyService.showSuccess(result.message);
                    this.model.hide();
                    // Emit any event if needed
                } else {
                    this.notifyService.showError(result.message);
                }
            });
        } else {
            this.notifyService.showError("Please choose a subscription.");
        }
    }
}