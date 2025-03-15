import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-my-tasks-page',
  standalone: true,
  imports: [
    RouterOutlet
  ],
  templateUrl: './my-tasks-page.component.html',
  styleUrls: ['./my-tasks-page.component.scss']
})
export class MyTasksPageComponent {
} 