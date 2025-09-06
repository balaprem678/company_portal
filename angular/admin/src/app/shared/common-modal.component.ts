import { Component, Output, EventEmitter, Input } from "@angular/core";

@Component({
    selector: "star-button-component",
    template: `
    <span>
    <div class='info-text mb-1 plan-modal' *ngIf="value && value == 'FREE'" (click)="onModelChange()">{{value}}</div>
    <div class='success-text mb-1 plan-modal' *ngIf="value && value == 'PAID'" (click)="onModelChange()">{{(rowData.plan_name ? rowData.plan_name.toUpperCase() : value)}}</div>
    <div class='danger-text mb-1 plan-modal' *ngIf="value && value == 'EXPIRED'" (click)="onModelChange()">{{value}}</div> 
    <div class='danger-text mb-1 plan-modal' *ngIf="value && value == 'CANCELLED'" (click)="onModelChange()">{{value}}</div>
    </span>
  `
})
export class CommonModalComponent {
    rowData: any;
    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();

    onModelChange() {
        this.save.emit(this.rowData);
    }
}