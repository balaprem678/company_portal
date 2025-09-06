import { Component, Output, EventEmitter, Input } from "@angular/core";

@Component({
    selector: "star-button-component",
    template: `
    <span class="start-rate">
    <i class="fa fa-star" aria-hidden="true" *ngIf="value && value == 1" (click)="onModelChange()"></i>
    <i class="fa fa-star-o" aria-hidden="true" *ngIf="!value || value == 0" (click)="onModelChange()"></i>
    </span>
  `
})
export class StarButtonComponent {
    rowData: any;
    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();

    onModelChange() {
        this.save.emit(this.rowData);
    }
}
