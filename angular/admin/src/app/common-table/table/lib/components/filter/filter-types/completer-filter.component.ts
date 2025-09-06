import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
// import { CompleterService } from 'ng2-completer';

import { DefaultFilter } from './default-filter';
import { distinctUntilChanged, debounceTime, map } from 'rxjs/operators';
// import { NgAutocompleteConfig, NgAutocompleteSelected } from 'angular-ng-autocomplete';
@Component({
  selector: 'completer-filter',
  template: `
    <!-- <ng2-completer [(ngModel)]="query"
                   (ngModelChange)="inputTextChanged($event)"
                   [dataService]="column.getFilterConfig().completer.dataService"
                   [minSearchLength]="column.getFilterConfig().completer.minSearchLength || 0"
                   [pause]="column.getFilterConfig().completer.pause || 0"
                   [placeholder]="column.getFilterConfig().completer.placeholder || 'Start typing...'"
                   (selected)="completerContent.next($event)">
    </ng2-completer> -->
    <div class="ng-autocomplete">
  <ng-autocomplete 
    [(ngModel)]="query"
    (ngModelChange)="inputTextChanged($event)"
    [data]="column.getFilterConfig().completer.dataService"
    [searchKeyword]="query"
    [placeholder]="column.getFilterConfig().completer.placeholder || 'Start typing...'"
    (selected)="completerContent.next($event)"
    (inputChanged)="query = $event">                                 
  </ng-autocomplete>
</div>
  `,
})
export class CompleterFilterComponent extends DefaultFilter implements OnInit {

  completerContent = new Subject<any>();

  // constructor(private completerService: CompleterService) {
  //   super();
  // }

  ngOnInit() {
    const config = this.column.getFilterConfig().completer;
    // config.dataService = this.completerService.local(config.data, config.searchFields, config.titleField);
    config.dataService.descriptionField(config.descriptionField);

    this.changesSubscription = this.completerContent
      .pipe(
        map((ev: any) => (ev && ev.title) || ev || ''),
        distinctUntilChanged(),
        debounceTime(this.delay)
      )
      .subscribe((search: string) => {
        this.query = search;
        this.setFilter();
      });
  }

  inputTextChanged(event: string) {
    // workaround to trigger the search event when the home/end buttons are clicked
    // when this happens the [(ngModel)]="query" is set to "" but the (selected) method is not called
    // so here it gets called manually
    if (event === '') {
      this.completerContent.next(event);
    }
  }
}
