import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule],
  template: `<h2>Group {{ gid }}</h2>`
})
export class GroupDetailComponent implements OnInit {
  gid = '';
  constructor(private route: ActivatedRoute) {}
  ngOnInit() {
    this.gid = this.route.snapshot.paramMap.get('gid') ?? '';
  }
}