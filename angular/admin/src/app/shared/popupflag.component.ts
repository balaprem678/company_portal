import { Component, Output, EventEmitter, Input, OnInit } from "@angular/core";
import { PopupService } from "../_services/popup.service";

@Component({
    selector: "popup-button-component",
    template: `
    
    <!-- <span style="cursor: pointer;" class='badge badge-success badge-pill mb-1' *ngIf="rowData && rowData.status == 1" (click)="showModal()" >Active</span><span style="cursor: pointer;" class='badge badge-pill badge-warning mb-1' (click)="showModal()" *ngIf="rowData && rowData.status == 2">Inactive</span>
    <span id="confirmPopModal1{{rowData._id}}" (click)="onModelChange()"></span> 
     *ngIf="rowData && rowData.flagged"-->
    <span  style="cursor: pointer;" class=' mb-1' *ngIf="(rowData && rowData.flag == 1)|| !rowData.flag" (click)="showModal()"><i class="fa fa-flag-o" style="font-size:20px"></i></span>
    <span    style="cursor: pointer;" class=' mb-1' *ngIf="rowData && rowData.flag == 2" (click)="showModal()"><i class="fa fa-flag" style="font-size:20px"></i></span>
    <span id="confirmPopModal1{{rowData._id}}" (click)="onModelChange()"></span>
  `   
})
export class PopupflagComponent {
    rowData: any;
    confirmModal: any
    selectedData: any;
    @Input() value: any;

    @Output() save1: EventEmitter<any> = new EventEmitter();
    constructor(
        private popupService: PopupService
    ) { }
    onModelChange() {
        this.save1.emit(this.rowData);
    }

    showModal() {
        this.popupService.openModal1(this.rowData);
        // document.getElementById("triggerPopupModal1").click();
    }
}