import { Component } from '@angular/core';
import {SupplyCardComponent} from '../../supply-card/supply-card.component';
@Component({
  selector: 'app-supplies-page',
  imports: [
    SupplyCardComponent
  ],
  templateUrl: './supplies-page.component.html',
  standalone: true,
  styleUrl: './supplies-page.component.scss'
})
export class SuppliesPageComponent {

}
