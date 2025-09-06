import {Directive, ElementRef, HostListener} from '@angular/core';

@Directive({
  selector: '[appNavDropdown]'
})
export class NavDropdownDirective {

  constructor(private el: ElementRef) { }

  toggle() {
    // this.el.nativeElement.classList.toggle('open');.
    this.el.nativeElement.classList.remove('toggling');
      this.el.nativeElement.classList.toggle('open');
    // setTimeout(() => {
    //   this.el.nativeElement.classList.remove('toggling');
    //   this.el.nativeElement.classList.toggle('open');
    // }, 0.5);
  }
}

/**
 * Allows the dropdown to be toggled via click.
 */
@Directive({
  selector: '[appNavDropdownToggle]'
})
export class NavDropdownToggleDirective {
  constructor(private dropdown: NavDropdownDirective) {}

  @HostListener('click', ['$event'])
  toggleOpen($event: any) {
    $event.preventDefault();
    this.dropdown.toggle();
  }
}
