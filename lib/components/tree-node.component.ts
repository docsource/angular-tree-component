import { Component, Input, ViewEncapsulation, TemplateRef, ElementRef } from '@angular/core';
import { TreeNode } from '../models/tree-node.model';
import { deprecatedSelector } from '../deprecated-selector';

@Component({
  selector: 'TreeNode, tree-node',
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-container *mobxAutorun>
      <div
        *ngIf="!templates.treeNodeFullTemplate"
        [class]="node.getClass()"
        [class.tree-node]="true"
        [class.tree-node-expanded]="node.isExpanded && node.hasChildren"
        [class.tree-node-collapsed]="node.isCollapsed && node.hasChildren"
        [class.tree-node-leaf]="node.isLeaf"
        [class.tree-node-active]="node.isActive"
        [class.tree-node-focused]="node.isFocused">

        <tree-node-drop-slot *ngIf="index === 0" [dropIndex]="node.index" [node]="node.parent"></tree-node-drop-slot>

          <div class="node-wrapper"
            [style.padding-left]="node.getNodePadding()"
            [class.matchesFilter]="!!node.data.matchesFilter"
            [class.containsMatch]="!!node.data.containsMatch">
            <tree-node-expander [node]="node"></tree-node-expander>
            <div class="node-content-wrapper"
              (click)="node.mouseAction('click', $event)"
              (dblclick)="node.mouseAction('dblClick', $event)"
              (contextmenu)="node.mouseAction('contextMenu', $event)"
              (treeDrop)="node.onDrop($event)"
              [treeAllowDrop]="node.allowDrop"
              [treeDrag]="node"
              [treeDragEnabled]="node.allowDrag()">

              <tree-node-content [node]="node" [index]="index" [template]="templates.treeNodeTemplate">
              </tree-node-content>
            </div>
          </div>

        <tree-node-children *ngIf="nodeHasChildren" [node]="node" [templates]="templates"></tree-node-children>
        <tree-node-drop-slot [dropIndex]="node.index + 1" [node]="node.parent"></tree-node-drop-slot>
      </div>
      <ng-template
        [ngTemplateOutlet]="templates.treeNodeFullTemplate"
        [ngTemplateOutletContext]="{ $implicit: node, node: node, index: index, templates: templates }">
      </ng-template>
    </ng-container>`
})

export class TreeNodeComponent {
  @Input() node: TreeNode;
  @Input() index: number;
  @Input() templates: any;

  constructor(private elementRef: ElementRef) {
    deprecatedSelector('TreeNode', 'tree-node', elementRef);
  }

  get nodeHasChildren(){
    return this.node.children && this.node.children.length > 0;
  }
}
