import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class TreeDraggedElement {
  _draggedElement: any = null;

  set(draggedElement: any) {
    this._draggedElement = draggedElement;
  }

  _dragEventSubject: Subject<DragEvent> = new Subject<DragEvent>();
  setDragEvent(e: DragEvent) {
    this._dragEventSubject.next(e);
  }
  get dragEventObservable(): Observable<DragEvent> {
    return this._dragEventSubject.asObservable();
  }

  get(): any {
    return this._draggedElement;
  }

  isDragging() {
    return !!this.get();
  }
}
