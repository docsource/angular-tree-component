import { Directive, Output, Input, EventEmitter, HostListener, Renderer, ElementRef, NgZone } from '@angular/core';
import { TreeDraggedElement } from '../models/tree-dragged-element.model';

const DRAG_OVER_CLASS = 'is-dragging-over';
const DRAG_DISABLED_CLASS = 'is-dragging-over-disabled';

@Directive({
  selector: '[treeDrop]'
})
export class TreeDropDirective {
  @Output('treeDrop') onDropCallback = new EventEmitter();
  @Output('treeDropDragOver') onDragOverCallback = new EventEmitter();
  @Output('treeDropDragLeave') onDragLeaveCallback = new EventEmitter();
  @Output('treeDropDragEnter') onDragEnterCallback = new EventEmitter();

  private _allowDrop = (element, $event) => true;
  @Input() set treeAllowDrop(allowDrop) {
    if (allowDrop instanceof Function) {
      this._allowDrop = allowDrop;
    }
    else this._allowDrop = (element, $event) => allowDrop;
  }
  allowDrop($event) {
    return this._allowDrop(this.treeDraggedElement.get(), $event);
  }

  constructor(private el: ElementRef, private renderer: Renderer, private treeDraggedElement: TreeDraggedElement, private zone: NgZone) {
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      let el = <HTMLElement>this.el.nativeElement!;
      el.addEventListener('dragover', this.onDragOver.bind(this));
      el.addEventListener('dragenter', this.onDragEnter.bind(this));
      el.addEventListener('dragleave', this.onDragLeave.bind(this));
    });
  }

  /**
   * This event is run outside of angular.
   * If the mouse action makes changes to application state,
   * it should manually trigger change detection
   */
  onDragOver($event) {
    if (!this.allowDrop($event)) return this.addDisabledClass();

    this.onDragOverCallback.emit({event: $event, element: this.treeDraggedElement.get()});

    $event.preventDefault();
    this.addClass();
  }

  /**
   * This event is run outside of angular.
   * If the mouse action makes changes to application state,
   * it should manually trigger change detection
   */
  onDragEnter($event) {
    if (!this.allowDrop($event)) return;

    this.onDragEnterCallback.emit({event: $event, element: this.treeDraggedElement.get()});
  }

  /**
   * This event is run outside of angular.
   * If the mouse action makes changes to application state,
   * it should manually trigger change detection
   */
  onDragLeave($event) {
    if (!this.allowDrop($event)) return this.removeDisabledClass();

    this.onDragLeaveCallback.emit({event: $event, element: this.treeDraggedElement.get()});

    this.removeClass();
  }

  @HostListener('drop', ['$event']) onDrop($event) {
    if (!this.allowDrop($event)) return;

    $event.preventDefault();
    this.onDropCallback.emit({event: $event, element: this.treeDraggedElement.get()});
    this.removeClass();
    this.treeDraggedElement.set(null);
  }

  private addClass() {
    this.renderer.setElementClass(this.el.nativeElement, DRAG_OVER_CLASS, true);
  }

  private removeClass() {
    this.renderer.setElementClass(this.el.nativeElement, DRAG_OVER_CLASS, false);
  }

  private addDisabledClass() {
    this.renderer.setElementClass(this.el.nativeElement, DRAG_DISABLED_CLASS, true);
  }

  private removeDisabledClass() {
    this.renderer.setElementClass(this.el.nativeElement, DRAG_DISABLED_CLASS, false);
  }
}
