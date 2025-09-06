import { Component, Output, EventEmitter, Input, OnInit, ChangeDetectorRef } from "@angular/core";

@Component({
    selector: "edit-button-component",
    template: `
    <button class="btn btn-info btn-rounded  btn-ef btn-ef-5 btn-ef-5b ng-scope"  (click)="onModelChange()"  ><i class="fa fa-clone"></i> <span>Clone</span></button>`
})
export class CloneComponent {
    rowData: any;
    productDetails: any;
    constructor() {
    }

    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();
   
    onModelChange() {
        this.save.emit(this.rowData);
    }
}