import { Component, Input, TemplateRef, ElementRef } from '@angular/core';
import { TreeNode } from '../models/tree-node.model';
import { deprecatedSelector } from '../deprecated-selector';

@Component({
  selector: 'LoadingComponent, tree-loading-component',
  template: `
    <ng-template
      [ngTemplateOutlet]="template"
      [ngTemplateOutletContext]="{ $implicit: node }">
    </ng-template>
  `,
})
export class LoadingComponent {
  @Input() template: TemplateRef<any>;
  @Input() node: TreeNode;

  constructor(private elementRef: ElementRef) {
    deprecatedSelector('LoadingComponent', 'tree-loading-component', elementRef);
  }
}
