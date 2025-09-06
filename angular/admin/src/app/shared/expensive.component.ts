import { Component, Output, EventEmitter, Input, OnInit } from "@angular/core";

@Component({
    selector: "expensive-button-component",
    template: `
    <span class="start-rate">
    <div class="btn app-close" *ngIf="rowData && rowData.expensive == 1" (click)="onModelChange()">Featured</div>
    <div class="btn app-closedd" *ngIf="rowData && rowData.expensive != 1" (click)="onModelChange()">Unfeatured</div>
    </span>
  `
})
export class ExpensiveComponent {
    rowData: any;
    
    @Input() value: any;

    @Output() save: EventEmitter<any> = new EventEmitter();
    onModelChange() {
        console.log(this.rowData);
        
        this.save.emit(this.rowData);
    }
}