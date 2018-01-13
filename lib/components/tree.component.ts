import {
  Component, Input, Output, OnChanges, EventEmitter, Renderer, ElementRef,
  ViewEncapsulation, ContentChild, TemplateRef, HostListener, ViewChild
} from '@angular/core';
import { TreeModel } from '../models/tree.model';
import { TreeNode } from '../models/tree-node.model';
import { TreeDraggedElement } from '../models/tree-dragged-element.model';
import { TreeOptions } from '../models/tree-options.model';
import { TreeViewportComponent } from './tree-viewport.component';

let pick = require('lodash.pick');

@Component({
  selector: 'Tree, tree-root',
  providers: [TreeModel],
  template: `
  <div tabindex="0" style="outline: none !important;" #focusEl>
    <tree-viewport #viewport>
      <div
        class="angular-tree-component"
        [class.node-dragging]="treeDraggedElement.isDragging()"
        [class.filtering]="treeModel.isFiltering"
        [class.angular-tree-component-rtl]="treeModel.options.rtl">
        <tree-node-collection
          *ngIf="treeModel.roots"
          [nodes]="treeModel.roots"
          [treeModel]="treeModel"
          [templates]="{
            loadingTemplate: loadingTemplate,
            treeNodeTemplate: treeNodeTemplate,
            treeNodeWrapperTemplate: treeNodeWrapperTemplate,
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
  @ContentChild('treeNodeWrapperTemplate') treeNodeWrapperTemplate: TemplateRef<any>;
  @ContentChild('treeNodeFullTemplate') treeNodeFullTemplate: TemplateRef<any>;

  @ViewChild('viewport') viewportComponent: TreeViewportComponent;
  @ViewChild('focusEl') focusEl: ElementRef;

  // Will be handled in ngOnChanges
  @Input() set nodes(nodes: any[]) { };
  @Input() set options(options: TreeOptions) { };

  @Input() set focused(value: boolean) {
    this.treeModel.setFocus(value);
  }

  @Input() set state(state) {
    this.treeModel.setState(state);
  }

  @Output() toggleExpanded: EventEmitter<any>;
  @Output() activate: EventEmitter<any>;
  @Output() deactivate: EventEmitter<any>;
  @Output() select: EventEmitter<any>;
  @Output() deselect: EventEmitter<any>;
  @Output() focus: EventEmitter<any>;
  @Output() blur: EventEmitter<any>;
  @Output() updateData: EventEmitter<any>;
  @Output() initialized: EventEmitter<any>;
  @Output() moveNode: EventEmitter<any>;
  @Output() copyNode: EventEmitter<any>;
  @Output() loadNodeChildren: EventEmitter<any>;
  @Output() changeFilter: EventEmitter<any>;
  @Output() event: EventEmitter<any>;
  @Output() stateChange: EventEmitter<any>;
  @Output() noPreviousNode: EventEmitter<any>;
  @Output() noNextNode: EventEmitter<any>;

  constructor(
    public treeModel: TreeModel,
    public treeDraggedElement: TreeDraggedElement,
    private renderer: Renderer
  ) {
      treeModel.eventNames.forEach((name) => this[name] = new EventEmitter());
      treeModel.subscribeToState((state) => this.stateChange.emit(state));
  }

  @HostListener('body: keydown', ['$event'])
  onKeydown($event) {
    if (!this.treeModel.isFocused) return;
    let tagName = document.activeElement.tagName.toLowerCase();
    if (['input', 'textarea'].indexOf(tagName) !== -1) return;

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

  sizeChanged() {
    this.viewportComponent.setViewport();
  }
  
  ngAfterViewInit() {
    this.treeModel.focusElement = this.focusEl.nativeElement;
  }
}
