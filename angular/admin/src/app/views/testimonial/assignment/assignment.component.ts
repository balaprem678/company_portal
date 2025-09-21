import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/_services/api.service';
import * as html2pdf from 'html2pdf.js';
import { Apiconfig } from 'src/app/_helpers/api-config';

@Component({
  selector: 'app-assignment',
  templateUrl: './assignment.component.html',
  styleUrls: ['./assignment.component.scss']
})
export class AssignmentComponent implements OnInit {
  fleets: any[] = [];
  totalVehicles = 0;
  deployedVehicles = 0;
  vehiclesOnMaintenance = 0;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadFleetAssignments();
  }

  loadFleetAssignments() {
    this.apiService.CommonApi(Apiconfig.listFleets.method, Apiconfig.listFleets.url, {})
      .subscribe((res: any) => {
        if (res?.status) {
          this.fleets = res.data || [];
          this.totalVehicles = this.fleets.length;
          this.deployedVehicles = this.fleets.filter(f => f.deployedContract).length;
          this.vehiclesOnMaintenance = this.fleets.filter(f => f.maintenance?.nextMaintenanceDue).length;
        }
      });
  }

  downloadPDF() {
    const element = document.getElementById('pdfContent');
    const opt = {
      margin: 0.5,
      filename: 'fleet-assignment-report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
  }
}
