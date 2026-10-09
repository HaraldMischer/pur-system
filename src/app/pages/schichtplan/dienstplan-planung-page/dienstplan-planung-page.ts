// pur-system/src/app/pages/schichtplan/dienstplan-planung-page/dienstplan-planung-page.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DienstplanArbeitsbereich } from '../../../components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich';

@Component({
  selector: 'app-dienstplan-planung-page',
  imports: [DienstplanArbeitsbereich],
  templateUrl: './dienstplan-planung-page.html',
  styleUrl: './dienstplan-planung-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanPlanungPage {}
