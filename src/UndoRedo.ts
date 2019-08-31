import { fabric } from 'fabric';
import $ from 'jquery';

import { change, CanvasEvent, CanvasObject } from './types';
import { Connection } from './Connection';
import { Canvas } from './Canvas';

export class UndoRedo {
	private _changeStack: change[] = [];
	private _it: number = -1;
	private _idsToSupress: number[] = [];

	constructor(private _fabric: Canvas, private _connection: Connection) {
		this.addListeners();
		this.bindKeys();
	}

	/**
     * Public
     */

	/**
      * undo
      */
	public undo(): boolean {
		if (this._it < 0 || this._changeStack.length === 0) return false;

		let success: boolean = false;

		const change = this.changeStack[this._it];

		this._it--;

		switch (change.type) {
			case 'update':
				success = this.update(change.objs);
				break;
			case 'create':
				success = this.create(change.objs);
				break;
			case 'remove':
				success = this.remove(change.objs);
				break;

			default:
				break;
		}

		return success;
	}

	public redo(): boolean {
		if (this._it === this._changeStack.length) return false;

		let success: boolean = false;

		const change = this.changeStack[this._it];

		this._it++;

		switch (change.type) {
			case 'update':
				success = this.update(change.objs);
				break;
			case 'create':
				success = this.remove(change.objs);
				break;
			case 'remove':
				success = this.create(change.objs);
				break;

			default:
				break;
		}

		return success;

		return true;
	}

	/**
	 * update
	 */
	private update(objs: CanvasObject[]): boolean {
		for (const obj of objs) {
			if (obj.id === undefined) continue;
			const instance = this._fabric.getObjectById(obj.id);

			instance.set(obj);
		}

		return true;
	}
	private remove(objs: CanvasObject[]): boolean {
		const instances: CanvasObject[] = [];

		for (const obj of objs) {
			if (obj.id === undefined) continue;

			this._idsToSupress.push(obj.id);
			const instance = this._fabric.getObjectById(obj.id);

			instances.push(instance);
		}
		this._fabric.remove(...instances);

		return true;
	}
	private create(objs: CanvasObject[]): boolean {
		fabric.util.enlivenObjects(
			objs,
			(objects: CanvasObject[]) => {
				objects.forEach((obj: CanvasObject) => {
					if (obj.id === undefined) return;

					this._idsToSupress.push(obj.id);
					this._fabric.add(obj);
				});
			},
			'fabric'
		);

		return true;
	}

	/**
     * Private
     */

	private filterSupressed(objs: CanvasObject[]): CanvasObject[] {
		const filtered = [];

		for (const obj of objs) {
			const index = this._idsToSupress.indexOf(<number>obj.id);
			if (index !== -1) {
				this._idsToSupress.splice(index, 1);
			} else filtered.push(obj);
		}

		return filtered;
	}

	private addListeners(): void {
		this._fabric.on('object:added', (e: CanvasEvent) => {
			if (e.target === undefined) return;

			const target: CanvasObject = e.target;

			const objs: CanvasObject[] = target._objects ? target._objects : [ target ];

			const filtered = this.filterSupressed(objs);

			this._changeStack.push({ type: 'create', objs: filtered.map((obj) => obj.toObject([ 'id', 'extra' ])) });
		});
		this._fabric.on('object:removed', (e: CanvasEvent) => {
			if (e.target === undefined) return;

			const target: CanvasObject = e.target;

			const objs: CanvasObject[] = target._objects ? target._objects : [ target ];

			const filtered = this.filterSupressed(objs);

			this._changeStack.push({ type: 'remove', objs: objs.map((obj) => obj.toObject([ 'id', 'extra' ])) });
		});
		this._fabric.on('object:modified', (e: CanvasEvent) => {
			let filtered: CanvasObject[] = [];
			if (e.ids !== undefined) {
				const objs = e.ids.map((id) => this._fabric.getObjectById(id));
				filtered = this.filterSupressed(objs);
			} else {
				if (e.target === undefined) return;

				const target = e.target;

				const objs = target._objects ? target._objects : [ target ];

				filtered = this.filterSupressed(objs);

				this._connection.sendFabricData({
					modified: {
						ids: filtered.map((c) => <number>c.id)
					}
				});
			}
			this._changeStack.push({ type: 'update', objs: filtered.map((obj) => obj.toObject([ 'id', 'extra' ])) });
		});
	}

	private bindKeys(): void {
		$(document).keydown((e: JQuery.Event) => {
			if (e.ctrlKey) {
				if (e.key === 'z') {
					this.undo();
				} else if (e.key === 'y') {
					this.redo();
				}
			}
		});
	}

	/**
     * Getter
     */

	get it(): number {
		return this._it;
	}

	get changeStack(): change[] {
		return this._changeStack;
	}

	get fabric(): fabric.Canvas {
		return this._fabric;
	}
	get connection(): Connection {
		return this._connection;
	}
}
