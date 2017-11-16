import {
  Component, Input, Output, OnChanges, EventEmitter, Renderer, ElementRef,
  ViewEncapsulation, ContentChild, TemplateRef, HostListener, ViewChild
} from '@angular/core';
import { TreeModel } from '../models/tree.model';
import { TreeNode } from '../models/tree-node.model';
import { TreeDraggedElement } from '../models/tree-dragged-element.model';
import { TreeOptions } from '../models/tree-options.model';
import { deprecatedSelector } from '../deprecated-selector';

let includes = require('lodash.includes');
let pick = require('lodash.pick');

@Component({
  selector: 'Tree, tree-root',
  encapsulation: ViewEncapsulation.None,
  providers: [TreeModel],
  template: `
  <div tabindex="0" style="outline: none !important;" #focusEl>
    <tree-viewport>
      <div
        class="tree"
        [class.node-dragging]="treeDraggedElement.isDragging()"
        [class.filtering]="treeModel.isFiltering">
        <tree-node-collection
          *ngIf="treeModel.roots"
          [nodes]="treeModel.roots"
          [templates]="{
            loadingTemplate: loadingTemplate,
            treeNodeTemplate: treeNodeTemplate,
            treeNodeFullTemplate: treeNodeFullTemplate
          }">
        </tree-node-collection>
        <tree-node-drop-slot
          class="empty-tree-drop-slot"
          *ngIf="treeModel.isEmptyTree()"
          [dropIndex]="0"
          [node]="treeModel.virtualRoot">
        </tree-node-drop-slot>
      </div>
    </tree-viewport>
  </div>
  `
})
export class TreeComponent implements OnChanges {
  _nodes: any[];
  _options: TreeOptions;

  @ContentChild('loadingTemplate') loadingTemplate: TemplateRef<any>;
  @ContentChild('treeNodeTemplate') treeNodeTemplate: TemplateRef<any>;
  @ContentChild('treeNodeFullTemplate') treeNodeFullTemplate: TemplateRef<any>;

  @ViewChild('focusEl') focusEl: ElementRef;

  // Will be handled in ngOnChanges
  @Input() set nodes(nodes: any[]) { };
  @Input() set options(options: TreeOptions) { };

  @Input() set focused(value: boolean) {
    this.treeModel.setFocus(value);
  }

  @Output() onToggleExpanded;
  @Output() onActivate;
  @Output() onDeactivate;
  @Output() onFocus;
  @Output() onBlur;
  @Output() onUpdateData;
  @Output() onInitialized;
  @Output() onMoveNode;
  @Output() onLoadChildren;
  @Output() onChangeFilter;
  @Output() onEvent;

  constructor(
    public treeModel: TreeModel,
    public treeDraggedElement: TreeDraggedElement,
    private renderer: Renderer,
    private elementRef: ElementRef
  ) {
      deprecatedSelector('Tree', 'tree-root', elementRef);
      treeModel.eventNames.forEach((name) => this[name] = new EventEmitter());
    }

  @HostListener('body: keydown', ['$event'])
  onKeydown($event) {
    if (!this.treeModel.isFocused) return;
    if (includes(['input', 'textarea'],
        document.activeElement.tagName.toLowerCase())) return;

    const focusedNode = this.treeModel.getFocusedNode();

    this.treeModel.performKeyAction(focusedNode, $event);
  }

  @HostListener('body: mousedown', ['$event'])
  onMousedown($event) {
    const insideClick = this.renderer.invokeElementMethod($event.target, 'closest', ['Tree']);

    if (!insideClick) {
      this.treeModel.setFocus(false);
    }
  }

  ngOnChanges(changes) {
    this.treeModel.setData({
      options: changes.options && changes.options.currentValue,
      nodes: changes.nodes && changes.nodes.currentValue,
      events: pick(this, this.treeModel.eventNames)
    });
  }

  ngAfterViewInit() {
    this.treeModel.focusElement = this.focusEl.nativeElement;
  }
}
