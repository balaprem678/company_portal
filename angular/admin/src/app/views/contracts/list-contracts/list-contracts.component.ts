import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/_services/api.service';
import { Apiconfig } from 'src/app/_helpers/api-config';
import { NotificationService } from 'src/app/_services/notification.service';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-list-contracts',
  templateUrl: './list-contracts.component.html',
  styleUrls: ['./list-contracts.component.scss']
})
export class ListContractsComponent implements OnInit {
  contracts: any[] = [];
  loading: boolean = true;

  constructor(
    private apiService: ApiService,
    private notifyService: NotificationService
  ) {}

  ngOnInit(): void {
    this.getContracts();
  }

  getContracts() {
    this.loading = true;
    this.apiService.CommonApi(Apiconfig.listContracts.method, Apiconfig.listContracts.url, { status: 1 })
      .subscribe(
        (res: any) => {
          this.contracts = res.data || [];
          this.loading = false;
        },
        (err) => {
          this.notifyService.showError("Failed to load contracts");
          this.loading = false;
        }
      );
  }

  downloadPDF() {
    const element = document.getElementById('contractsTable');
    const options = {
      margin: 0.5,
      filename: `contracts_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(options).save();
  }
}
