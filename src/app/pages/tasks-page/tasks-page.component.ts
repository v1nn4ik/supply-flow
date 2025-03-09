import { Component } from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-tasks-page',
  imports: [
    RouterOutlet
  ],
  templateUrl: './tasks-page.component.html',
  standalone: true,
  styleUrl: './tasks-page.component.scss'
})
export class TasksPageComponent {

}
