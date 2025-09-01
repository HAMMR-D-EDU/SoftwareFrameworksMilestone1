import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-channel-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container py-4">
      <h2>Channel {{ cid }} in Group {{ gid }}</h2>
      <p>Chat coming in Phase 2</p>
    </div>
  `
})
export class ChannelViewComponent implements OnInit {
  gid = '';
  cid = '';
  
  constructor(private route: ActivatedRoute) {}
  
  ngOnInit() {
    this.gid = this.route.snapshot.paramMap.get('gid') ?? '';
    this.cid = this.route.snapshot.paramMap.get('cid') ?? '';
  }
}