import { Component, ElementRef, ViewChild } from '@angular/core';
import html2pdf from 'html2pdf.js';

interface PerformanceRecord {
  name: string;
  doj: string;  // Date of joining
  leaveDays: number;
  sickDays: number;
  analysis: number; // numeric performance score
  drivingBehaviour?: string; // only for drivers
  remarks: string;
  role: 'Employee' | 'Driver';
}
@Component({
  selector: 'app-performance-analysis-list',
  templateUrl: './performance-analysis-list.component.html',
  styleUrls: ['./performance-analysis-list.component.scss']
})
export class PerformanceAnalysisListComponent {
  @ViewChild('performanceTable', { static: false }) performanceTable!: ElementRef;

  // Filters
  filterMonth: string = '';
  filterAnalysis: string = '';
  filterBehaviour: string = '';
  sortBy: string = '';

  // Dummy Data
  records: PerformanceRecord[] = [
    { name: 'John Smith', doj: '2021-05-12', leaveDays: 10, sickDays: 3, analysis: 95, drivingBehaviour: 'Speed Violations', remarks: 'Top performer', role: 'Driver' },
    { name: 'Mary Johnson', doj: '2022-03-08', leaveDays: 5, sickDays: 1, analysis: 85, remarks: 'Consistent employee', role: 'Employee' },
    { name: 'David Lee', doj: '2020-11-20', leaveDays: 12, sickDays: 4, analysis: 78, drivingBehaviour: 'Traffic Penalties', remarks: 'Needs improvement', role: 'Driver' }
  ];

  // Filter + Sort
  get filteredRecords() {
    let data = [...this.records];

    // Filter by Month (D.O.J)
    if (this.filterMonth) {
      data = data.filter(d => new Date(d.doj).getMonth() + 1 === +this.filterMonth);
    }

    // Filter by Analysis Range
    if (this.filterAnalysis === '100-90') {
      data = data.filter(d => d.analysis >= 90 && d.analysis <= 100);
    }
    if (this.filterAnalysis === '90-80') {
      data = data.filter(d => d.analysis >= 80 && d.analysis < 90);
    }
    if (this.filterAnalysis === '<80') {
      data = data.filter(d => d.analysis < 80);
    }

    // Filter by Driving Behaviour
    if (this.filterBehaviour) {
      data = data.filter(d => d.drivingBehaviour === this.filterBehaviour);
    }

    // Sort
    if (this.sortBy === 'dojAsc') data.sort((a, b) => a.doj.localeCompare(b.doj));
    if (this.sortBy === 'dojDesc') data.sort((a, b) => b.doj.localeCompare(a.doj));
    if (this.sortBy === 'analysisAsc') data.sort((a, b) => a.analysis - b.analysis);
    if (this.sortBy === 'analysisDesc') data.sort((a, b) => b.analysis - a.analysis);

    return data;
  }

  // Export as PDF
  downloadPDF() {
    const element = this.performanceTable.nativeElement;
    const opt = {
      margin: 0.5,
      filename: 'performance-analysis.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
  }
}
