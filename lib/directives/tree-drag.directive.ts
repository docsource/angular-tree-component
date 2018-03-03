import { Directive, Input, HostListener, Renderer, ElementRef, DoCheck, NgZone } from '@angular/core';
import { TreeDraggedElement } from '../models/tree-dragged-element.model';

const DRAG_OVER_CLASS = 'is-dragging-over';

@Directive({
  selector: '[treeDrag]'
})
export class TreeDragDirective implements DoCheck {
  @Input('treeDrag') draggedElement;
  @Input() treeDragEnabled;

  constructor(private el: ElementRef, private renderer: Renderer, private treeDraggedElement: TreeDraggedElement, private zone: NgZone) {
  }

  ngAfterViewInit() {
    let el: HTMLElement = this.el.nativeElement!;
    this.zone.runOutsideAngular(() => {
      el.addEventListener('drag', this.onDrag.bind(this));
    });
  }

  ngDoCheck() {
    this.renderer.setElementAttribute(this.el.nativeElement, 'draggable', this.treeDragEnabled ? 'true' : 'false');
  }

  @HostListener('dragstart', ['$event']) onDragStart(ev) {
    // setting the data is required by firefox
    ev.dataTransfer.setData('text', ev.target.id);
    this.treeDraggedElement.set(this.draggedElement);
    this.treeDraggedElement.setDragEvent(ev);
    if (this.draggedElement.mouseAction) {
        this.draggedElement.mouseAction('dragStart', ev);
    }
  }

  /**
   * This event is run outside of angular.
   * If the mouse action makes changes to application state,
   * it should manually trigger change detection
   */
  onDrag(ev) {
    if (this.draggedElement.mouseAction) {
        this.draggedElement.mouseAction('drag', ev);
    }
  }

  @HostListener('dragend') onDragEnd() {
    if (this.draggedElement.mouseAction) {
      this.draggedElement.mouseAction('dragEnd');
    }
    this.treeDraggedElement.set(null);
  }
}
