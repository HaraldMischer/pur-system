// pur-system/src/app/services/domain/schicht-rastermodell.service.ts

import { Injectable } from '@angular/core';

import { SchichtmodellService } from './schichtmodell.service';

/**
 * Eindeutig benannter Service für das bestehende Schicht-Rastermodell.
 */
@Injectable({ providedIn: 'root' })
export class SchichtRastermodellService extends SchichtmodellService {}
