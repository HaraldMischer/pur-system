// pur-system/src/app/pages/schichtplan/dienstplan-ansicht-page/dienstplan-ansicht-page.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DienstplanArbeitsbereich } from '../../../components/schichtplan/dienstplan-arbeitsbereich/dienstplan-arbeitsbereich';

@Component({
  selector: 'app-dienstplan-ansicht-page',
  imports: [DienstplanArbeitsbereich],
  templateUrl: './dienstplan-ansicht-page.html',
  styleUrl: './dienstplan-ansicht-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DienstplanAnsichtPage {}
