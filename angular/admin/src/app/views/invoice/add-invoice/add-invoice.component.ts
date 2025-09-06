import { Component } from '@angular/core';
// import { UntypedFormGroup, NgForm } from '@angular/forms';

@Component({
  selector: 'app-add-invoice',
  templateUrl: './add-invoice.component.html',
  styleUrls: ['./add-invoice.component.scss']
})
export class AddInvoiceComponent {
  submitted = false;
  today: string = '';

  clientOptions: string[] = [
    'Acme Corp',
    'Globex Inc',
    'Soylent LLC',
    'Umbrella Ltd'
  ];

  constructor() {
    const d = new Date();
    this.today = d.toISOString().substring(0, 10); // YYYY-MM-DD
  }

  submitForm(form: any) {
    this.submitted = true;
    if (form.valid) {
      // Handle form data submission logic here (API call, etc.)
      // Example: console.log(form.value);
      alert('Invoice submitted:\n' + JSON.stringify(form.value, null, 2));
      form.resetForm();
      this.submitted = false;
    }
  }
}
