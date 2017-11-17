import { Injectable, EventEmitter } from '@angular/core';
import { observable, computed, action, autorun } from 'mobx';
import { TreeNode } from './tree-node.model';
import { TreeOptions } from './tree-options.model';
import { TreeVirtualScroll } from './tree-virtual-scroll.model';
import { ITreeModel, IDType, IDTypeDictionary } from '../defs/api';
import { TREE_EVENTS } from '../constants/events';

let first = require('lodash.first');
let last = require('lodash.last');
let compact = require('lodash.compact');
let find = require('lodash.find');
let isString = require('lodash.isstring');
let isFunction = require('lodash.isfunction');

@Injectable()
export class TreeModel implements ITreeModel {
  static focusedTree = null;

  options: TreeOptions = new TreeOptions();
  nodes: any[];
  eventNames = Object.keys(TREE_EVENTS);
  virtualScroll: TreeVirtualScroll;

  @observable roots: TreeNode[];
  @observable expandedNodeIds: IDTypeDictionary = {};
  @observable activeNodeIds: IDTypeDictionary = {};
  @observable hiddenNodeIds: IDTypeDictionary = {};
  @observable focusedNodeId: IDType = null;
  @observable virtualRoot: TreeNode;

  isFiltering = false;
  beginFilterCallback: () => void | null = null;
  endFilterCallback: () => void | null = null;
  canFocusNode: (node: any) => boolean;

  focusElement: HTMLElement | null = null;

  private firstUpdate = true;
  private events: any;

  constructor() {
    this.canFocusNode = () => true;
  }

  // events
  fireEvent(event) {
    event.treeModel = this;
    this.events[event.eventName].emit(event);
    this.events.event.emit(event);
  }

  subscribe(eventName, fn) {
    this.events[eventName].subscribe(fn);
  }

  // getters
  getFocusedNode(): TreeNode {
    return this.focusedNode;
  }


  getActiveNode(): TreeNode {
    return this.activeNodes[0];
  }

  getActiveNodes(): TreeNode[] {
    return this.activeNodes;
  }

  getVisibleRoots() {
    return this.virtualRoot.visibleChildren;
  }

  getFirstRoot(skipHidden = false) {
    return first(skipHidden ? this.getVisibleRoots() : this.roots);
  }

  getLastRoot(skipHidden = false) {
    return last(skipHidden ? this.getVisibleRoots() : this.roots);
  }

  get isFocused() {
    if (this.focusElement && document.activeElement !== this.focusElement) return false;
    return TreeModel.focusedTree === this;
  }

  isNodeFocused(node) {
    return this.focusedNode === node;
  }

  isEmptyTree(): boolean {
    return this.roots && this.roots.length === 0;
  }

  @computed get focusedNode() {
    return this.focusedNodeId ? this.getNodeById(this.focusedNodeId) : null;
  }

  @computed get expandedNodes() {
    const nodes = Object.keys(this.expandedNodeIds)
      .filter((id) => this.expandedNodeIds[id])
      .map((id) => this.getNodeById(id));

    return compact(nodes);
  }

  @computed get activeNodes() {
    const nodes = Object.keys(this.activeNodeIds)
      .filter((id) => this.activeNodeIds[id])
      .map((id) => this.getNodeById(id));

    return compact(nodes);
  }

  // locating nodes
  getNodeByPath(path: any[], startNode= null): TreeNode {
    if (!path) return null;

    startNode = startNode || this.virtualRoot;
    if (path.length === 0) return startNode;

    if (!startNode.children) return null;

    const childId = path.shift();
    const childNode = find(startNode.children, { id: childId });

    if (!childNode) return null;

    return this.getNodeByPath(path, childNode);
  }

  getNodeById(id) {
    const idStr = id.toString();

    return this.getNodeBy((node) => node.id.toString() === idStr);
  }

  getNodeBy(predicate, startNode = null) {
    startNode = startNode || this.virtualRoot;

    if (!startNode.children) return null;

    const found = find(startNode.children, predicate);

    if (found) { // found in children
      return found;
    } else { // look in children's children
      for (let child of startNode.children) {
        const foundInChildren = this.getNodeBy(predicate, child);
        if (foundInChildren) return foundInChildren;
      }
    }
  }

  isExpanded(node) {
    return this.expandedNodeIds[node.id];
  }

  isHidden(node) {
    return this.hiddenNodeIds[node.id];
  }

  isActive(node) {
    return this.activeNodeIds[node.id];
  }

  // actions
  @action setData({ nodes, options = null, events = null }: {nodes: any, options: any, events: any}) {
    if (options) {
      this.options = new TreeOptions(options);
    }
    if (events) {
      this.events = events;
    }
    if (nodes) {
      this.nodes = nodes;
    }

    this.update();
  }

  @action update() {
    // Rebuild tree:
    let virtualRootConfig = {
      id: this.options.rootId,
      virtual: true,
      [this.options.childrenField]: this.nodes
    };

    this.virtualRoot = new TreeNode(virtualRootConfig, null, this, 0);

    this.roots = this.virtualRoot.children;

    // Fire event:
    if (this.firstUpdate) {
      if (this.roots) {
        this.firstUpdate = false;
        this._calculateExpandedNodes();
      }
    } else {
      this.fireEvent({ eventName: TREE_EVENTS.updateData });
    }
  }


  @action setFocusedNode(node) {
    this.focusedNodeId = node ? node.id : null;
  }

  @action setFocus(value) {
    TreeModel.focusedTree = value ? this : null;
  }

  @action doForAll(fn) {
    this.roots.forEach((root) => root.doForAll(fn));
  }

  @action focusNextNode() {
    let previousNode = this.getFocusedNode();
    let nextNode = previousNode ? previousNode.findNextNode(true, true) : this.getFirstRoot(true);
    while (nextNode) {
      if (!this.canFocusNode(nextNode)) {
        nextNode = nextNode.findNextNode(true, true);
      }
      else {
        nextNode.focus();
        break;
      }
    }
  }

  @action focusPreviousNode() {
    let previousNode = this.getFocusedNode();
    let nextNode = previousNode ? previousNode.findPreviousNode(true) : this.getLastRoot(true);
    while (nextNode) {
      if (!this.canFocusNode(nextNode)) {
        nextNode = nextNode.findPreviousNode(true, true);
      }
      else {
        nextNode.focus();
        break;
      }
    }
  }

  @action focusDrillDown() {
    let previousNode = this.getFocusedNode();
    if (previousNode && previousNode.isCollapsed && previousNode.hasChildren) {
      previousNode.toggleExpanded();
    }
    else {
      let nextNode = previousNode ? previousNode.getFirstChild(true) : this.getFirstRoot(true);
      if (nextNode) nextNode.focus();
    }
  }

  @action focusDrillUp() {
    let previousNode = this.getFocusedNode();
    if (!previousNode) return;
    if (previousNode.isExpanded) {
      previousNode.toggleExpanded();
    }
    else {
      let nextNode = previousNode.realParent;
      if (nextNode) nextNode.focus();
    }
  }

  @action setActiveNode(node, value, multi = false, expandTo = false) {
    if (multi) {
      this._setActiveNodeMulti(node, value);
    }
    else {
      this._setActiveNodeSingle(node, value);
    }

    if (value) {
      node.focus();
      this.fireEvent({ eventName: TREE_EVENTS.activate, node });
    } else {
      this.fireEvent({ eventName: TREE_EVENTS.deactivate, node });
    }

    if (expandTo) {
      let currentNode = node;
      while (currentNode.parent) {
        this.addToExpandedNodeIds(currentNode.parent.id, value);
        currentNode = currentNode.parent;
      }
      this._calculateExpandedNodes();
    }
  }

  @action setExpandedNode(node, value) {
    this.addToExpandedNodeIds(node.id, value);
    this.fireEvent({ eventName: TREE_EVENTS.toggleExpanded, node, isExpanded: value });
  }

  addToExpandedNodeIds(nodeId, value) {
    if (this.expandedNodeIds[nodeId]) {
      this.expandedNodeIds[nodeId] = value;
    } else {
      this.expandedNodeIds = Object.assign({}, this.expandedNodeIds, {[nodeId]: value});
    }
  }

  @action expandAll() {
    this.roots.forEach((root) => root.expandAll());
  }

  @action collapseAll() {
    this.roots.forEach((root) => root.collapseAll());
  }

  @action setIsHidden(node, value) {
    this.hiddenNodeIds = Object.assign({}, this.hiddenNodeIds, {[node.id]: value});
  }

  @action setHiddenNodeIds(nodeIds) {
    this.hiddenNodeIds = nodeIds.reduce((id, hiddenNodeIds) => Object.assign(hiddenNodeIds, {
      [id]: true
    }), {});
  }

  performKeyAction(node, $event) {
    const action = this.options.actionMapping.keys[$event.keyCode];
    if (action) {
      $event.preventDefault();
      action(this, node, $event);
      return true;
    } else {
      return false;
    }
  }

  @action filterNodes(filter, autoShow = true) {
    let filterFn;

    if (!filter) {
      return this.clearFilter();
    }

    // support function and string filter
    if (isString(filter)) {
      filterFn = (node) => node.displayField.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    }
    else if (isFunction(filter)) {
       filterFn = filter;
    }
    else {
      console.error('Don\'t know what to do with filter', filter);
      console.error('Should be either a string or function');
      return;
    }

    const ids = {};
    this.roots.forEach((node) => this._filterNode(ids, node, filterFn, autoShow));
    this.hiddenNodeIds = ids;
    this.fireEvent({ eventName: TREE_EVENTS.changeFilter });
  }

  @action setClassFilter(filter: ((node: any) => boolean) | null) {
    if (this.isFiltering !== !!filter) {
      this.isFiltering = !!filter;
      if (this.isFiltering) {
        // Rising edge
        if (this.beginFilterCallback) this.beginFilterCallback();
      }
      else {
        // Falling edge
        if (this.endFilterCallback) this.endFilterCallback();
      }
    }

    let matches: any[] = [];

    this.doForAll((node) => {
      let matchesFilter = !!(filter ? filter(node) : true);
      node.data.matchesFilter = matchesFilter;
      node.data.containsMatch = false;
      if (matchesFilter) matches.push(node);
    });

    for (let match of matches) {
      let parent: any = match.parent;
      while (parent) {
        parent.data.containsMatch = true;
        parent = parent.parent;
      }
    }
  }

  @action clearFilter() {
    this.hiddenNodeIds = {};
    this.fireEvent({ eventName: TREE_EVENTS.changeFilter });
  }

  @action moveNode(node, to) {
    const fromIndex = node.getIndexInParent();
    const fromParent = node.parent;

    if (!this._canMoveNode(node, fromIndex , to)) return;

    const fromChildren = fromParent.getField('children');

    // If node doesn't have children - create children array
    if (!to.parent.getField('children')) {
      to.parent.setField('children', []);
    }
    const toChildren = to.parent.getField('children');

    const originalNode = fromChildren.splice(fromIndex, 1)[0];

    // Compensate for index if already removed from parent:
    let toIndex = (fromParent === to.parent && to.index > fromIndex) ? to.index - 1 : to.index;

    toChildren.splice(toIndex, 0, originalNode);

    fromParent.treeModel.update();
    if (to.parent.treeModel !== fromParent.treeModel) {
      to.parent.treeModel.update();
    }

    this.fireEvent({ eventName: TREE_EVENTS.moveNode, node: originalNode, to: { parent: to.parent.data, index: toIndex } });
  }

  @action copyNode(node, to) {
    const fromIndex = node.getIndexInParent();

    if (!this._canMoveNode(node, fromIndex , to)) return;

    // If node doesn't have children - create children array
    if (!to.parent.getField('children')) {
      to.parent.setField('children', []);
    }
    const toChildren = to.parent.getField('children');

    const nodeCopy = this.options.getNodeClone(node);

    toChildren.splice(to.index, 0, nodeCopy);

    node.treeModel.update();
    if (to.parent.treeModel !== node.treeModel) {
      to.parent.treeModel.update();
    }

    this.fireEvent({ eventName: TREE_EVENTS.copyNode, node: nodeCopy, to: { parent: to.parent.data, index: to.index } });
  }

  getState() {
    return {
      expandedNodeIds: this.expandedNodeIds,
      activeNodeIds: this.activeNodeIds,
      hiddenNodeIds: this.hiddenNodeIds,
      focusedNodeId: this.focusedNodeId
    };
  }

  @action setState(state) {
    if (!state) return;

    Object.assign(this, {
      expandedNodeIds: state.expandedNodeIds || {},
      activeNodeIds: state.activeNodeIds || {},
      hiddenNodeIds: state.hiddenNodeIds || {},
      focusedNodeId: state.focusedNodeId
    });
  }

  subscribeToState(fn) {
    autorun(() => fn(this.getState()));
  }

  // private methods
  private _canMoveNode(node, fromIndex, to) {
    // same node:
    if (node.parent === to.parent && fromIndex === to.index) {
      return false;
    }

    return !to.parent.isDescendantOf(node);
  }


  private _filterNode(ids, node, filterFn, autoShow) {
    // if node passes function then it's visible
    let isVisible = filterFn(node);

    if (node.children) {
      // if one of node's children passes filter then this node is also visible
      node.children.forEach((child) => {
        if (this._filterNode(ids, child, filterFn, autoShow)) {
          isVisible = true;
        }
      });
    }

    // mark node as hidden
    if (!isVisible) {
      ids[node.id] = true;
    }
    // auto expand parents to make sure the filtered nodes are visible
    if (autoShow && isVisible) {
      node.ensureVisible();
    }
    return isVisible;
  }

  private _calculateExpandedNodes(startNode = null) {
    startNode = startNode || this.virtualRoot;

    if (startNode.data[this.options.isExpandedField]) {
      this.expandedNodeIds = Object.assign({}, this.expandedNodeIds, {[startNode.id]: true});
    }
    if (startNode.children) {
      startNode.children.forEach((child) => this._calculateExpandedNodes(child));
    }
  }

  private _setActiveNodeSingle(node, value) {
    // Deactivate all other nodes:
    this.activeNodes
      .filter((activeNode) => activeNode !== node)
      .forEach((activeNode) => {
        this.fireEvent({ eventName: TREE_EVENTS.deactivate, node: activeNode });
      });

    if (value) {
      this.activeNodeIds = {[node.id]: true};
    }
    else {
      this.activeNodeIds = {};
    }
  }

  private _setActiveNodeMulti(node, value) {
    this.activeNodeIds = Object.assign({}, this.activeNodeIds, {[node.id]: value});
  }

}
