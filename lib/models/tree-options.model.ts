import { TreeNode } from './tree-node.model';
import { TreeModel } from './tree.model';
import { KEYS } from '../constants/keys';
import { ITreeOptions } from '../defs/api';

let defaultsDeep = require('lodash.defaultsDeep');

export interface IActionHandler {
  (tree: TreeModel, node: TreeNode, $event: any, ...rest);
}

export const TREE_ACTIONS = {
  TOGGLE_SELECTED: (tree: TreeModel, node: TreeNode, $event: any) => node.toggleActivated(),
  TOGGLE_SELECTED_MULTI: (tree: TreeModel, node: TreeNode, $event: any) => node.toggleActivated(true),
  SELECT: (tree: TreeModel, node: TreeNode, $event: any) => node.setIsActive(true),
  DESELECT: (tree: TreeModel, node: TreeNode, $event: any) => node.setIsActive(false),
  FOCUS: (tree: TreeModel, node: TreeNode, $event: any) => node.focus(),
  TOGGLE_EXPANDED: (tree: TreeModel, node: TreeNode, $event: any) => node.hasChildren && node.toggleExpanded(),
  EXPAND: (tree: TreeModel, node: TreeNode, $event: any) => node.expand(),
  COLLAPSE: (tree: TreeModel, node: TreeNode, $event: any) => node.collapse(),
  DRILL_DOWN: (tree: TreeModel, node: TreeNode, $event: any) => tree.focusDrillDown(),
  DRILL_UP: (tree: TreeModel, node: TreeNode, $event: any) => tree.focusDrillUp(),
  NEXT_NODE: (tree: TreeModel, node: TreeNode, $event: any) =>  tree.focusNextNode(),
  PREVIOUS_NODE: (tree: TreeModel, node: TreeNode, $event: any) =>  tree.focusPreviousNode(),
  MOVE_NODE: (tree: TreeModel, node: TreeNode, $event: any, {from , to}: {from: any, to: any}) => {
    // default action assumes from = node, to = {parent, index}
    tree.moveNode(from, to);
  }
};

const defaultActionMapping: IActionMapping = {
  mouse: {
    click: TREE_ACTIONS.TOGGLE_SELECTED,
    dblClick: null,
    contextMenu: null,
    expanderClick: TREE_ACTIONS.TOGGLE_EXPANDED,
    drop: TREE_ACTIONS.MOVE_NODE
  },
  keys: {
    [KEYS.RIGHT]: TREE_ACTIONS.DRILL_DOWN,
    [KEYS.LEFT]: TREE_ACTIONS.DRILL_UP,
    [KEYS.DOWN]: TREE_ACTIONS.NEXT_NODE,
    [KEYS.UP]: TREE_ACTIONS.PREVIOUS_NODE,
    [KEYS.SPACE]: TREE_ACTIONS.TOGGLE_SELECTED,
    [KEYS.ENTER]: TREE_ACTIONS.TOGGLE_SELECTED
  }
};

export interface IActionMapping {
  mouse?: {
    click?: IActionHandler,
    dblClick?: IActionHandler,
    contextMenu?: IActionHandler,
    expanderClick?: IActionHandler,
    dragStart?: IActionHandler,
    drag?: IActionHandler,
    dragEnd?: IActionHandler,
    dragOver?: IActionHandler,
    drop?: IActionHandler
  };
  keys?: {
    [key: number]: IActionHandler
  };
}

export class TreeOptions {
  get childrenField(): string { return this.options.childrenField || 'children'; }
  get displayField(): string { return this.options.displayField || 'name'; }
  get idField(): string { return this.options.idField || 'id'; }
  get isExpandedField(): string { return this.options.isExpandedField || 'isExpanded'; }
  get isHiddenField(): string { return this.options.isHiddenField || 'isHidden'; }
  get getChildren(): any { return this.options.getChildren; }
  get allowDrag(): boolean { return this.options.allowDrag; }
  get levelPadding(): number { return this.options.levelPadding || 0; }
  get useVirtualScroll(): boolean { return this.options.useVirtualScroll; }
  actionMapping: IActionMapping;

  constructor(private options: ITreeOptions = {}) {
    this.actionMapping = defaultsDeep({}, this.options.actionMapping, defaultActionMapping);
  }
  allowDrop(element, to): boolean {
    if (this.options.allowDrop instanceof Function) {
      return this.options.allowDrop(element, to);
    }
    else {
      return this.options.allowDrop === undefined ? true : this.options.allowDrop;
    }
  }
  nodeClass(node: TreeNode): string {
    return this.options.nodeClass ? this.options.nodeClass(node) : '';
  }

  nodeHeight(node: TreeNode): number {
    if (node.data.virtual) {
      return 0;
    }

    let nodeHeight = this.options.nodeHeight || 22;

    if (typeof nodeHeight === 'function') {
      nodeHeight = nodeHeight(node);
    }

    // account for drop slots:
    return nodeHeight + (node.index === 0 ?  2 : 1) * this.dropSlotHeight;
  }

  get dropSlotHeight(): number {
    return this.options.dropSlotHeight || 2;
  }
}
