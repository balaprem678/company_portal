import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() currentPage: number;
  @Input() totalPages: number;
  @Output() pageChange = new EventEmitter<number>();

  constructor() { }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }

  getVisiblePageNumbers(): number[] {
    const visiblePages = 4;
    const halfVisiblePages = Math.floor(visiblePages / 2);
    const startPage = Math.max(this.currentPage - halfVisiblePages, 1);
    const endPage = Math.min(startPage + visiblePages - 1, this.totalPages);
    return Array.from({ length: (endPage - startPage + 1) }, (_, i) => i + startPage);
  }
}
