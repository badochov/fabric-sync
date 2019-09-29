import { fabric } from "fabric";
import $ from "jquery";

import { change, CanvasEvent, CanvasObject } from "./types";
import { Connection } from "./Connection";
import { Canvas } from "./Canvas";
import { UpdateData } from "./interfaces";

export class UndoRedo {
	private _changeStack: change[] = [];
	private _it: number = -1;
	private _idsToSupress: string[] = [];

	constructor(private _fabric: Canvas, private _connection: Connection) {}

	/**
	 * Public
	 */

	public init(): void {
		this.addListeners();
	}

	/**
	 * undo
	 */
	public undo(send: boolean = true): boolean {
		if (this._it < 0 || this._changeStack.length === 0) return false;

		let success: boolean = false;

		const change = this._changeStack[this._it];

		this._it--;

		switch (change.type) {
			case "update":
				success = this.update(change.objs, change.prev);

				break;
			case "create":
				success = this.remove(change.objs);

				break;
			case "remove":
				success = this.create(change.objs);
				break;

			default:
				break;
		}

		if (success && send) {
			this._connection.sendFabricData({ undo: true });
		}

		return success;
	}

	public redo(send: boolean = true): boolean {
		if (this._it === this._changeStack.length - 1) return false;

		let success: boolean = false;

		this._it++;
		const change = this._changeStack[this._it];

		switch (change.type) {
			case "update":
				success = this.update(change.objs, change.prev, true);

				break;
			case "create":
				success = this.create(change.objs);

				break;
			case "remove":
				success = this.remove(change.objs);
				break;

			default:
				break;
		}
		if (success && send) {
			this._connection.sendFabricData({ undo: false });
		}

		return success;
	}

	/**
	 * clearStack
	 */
	public clearStack(): void {
		this._changeStack = [];
		this._it = -1;
	}

	/**
	 * update
	 */
	private update(
		objs: CanvasObject[],
		prev: fabric.Object | undefined,
		redo: boolean = false
	): boolean {
		fabric.util.enlivenObjects(
			objs,
			(objects: CanvasObject[]) => {
				objects.forEach((obj: CanvasObject) => {
					if (obj.id === undefined || obj === null) return;

					if (!redo) {
						if (prev !== undefined) {
							obj.set(prev);
						}
						obj = this._fabric.transformObj(obj);
					}

					const instance = this._fabric.getObjectById(obj.id);
					if (instance !== null) {
						instance.set(obj.toObject(["id", "extra"]));
						instance.calcCoords();
						this._fabric.refresh();
					}
				});
			},
			"fabric"
		);

		this._fabric.refresh();

		return true;
	}
	private remove(objs: CanvasObject[]): boolean {
		const instances: CanvasObject[] = [];

		for (const obj of objs) {
			if (obj.id === undefined) continue;

			const instance = this._fabric.getObjectById(obj.id);
			if (instance !== null) {
				//@ts-ignore
				instance.set({ ignore: true });

				console.info(instance.ignore);
				instances.push(instance);

				this._idsToSupress.push(obj.id);
				console.info(this._idsToSupress);
			}
		}
		this._fabric.refresh();

		console.log(this._fabric.getObjects().map((o: any) => o.ignore));
		setTimeout(() => {
			this._fabric.remove(...instances);
		}, 0);

		return true;
	}
	private create(objs: CanvasObject[]): boolean {
		fabric.util.enlivenObjects(
			objs,
			(objects: CanvasObject[]) => {
				console.log(objects.map(o => o.toObject(["id", "extra"])));
				objects.forEach((obj: CanvasObject) => {
					if (obj.id === undefined) return;
					if (this._fabric.getObjectById(obj.id) === null) {
						this._idsToSupress.push(obj.id);
						// @ts-ignore
						obj.set("ignore", true);
						this._fabric.add(obj);
					}
				});
			},
			"fabric"
		);

		this._fabric.refresh();

		return true;
	}

	/**
	 * Private
	 */

	private filterSupressed(objs: CanvasObject[]): CanvasObject[] {
		const filtered = [];

		for (const obj of objs) {
			console.log(obj.toObject(["id", "extra"]));
			if (obj.id === undefined) {
				filtered.push(obj);
				continue;
			}
			const index = this._idsToSupress.indexOf(obj.id);
			if (index !== -1) {
				this._idsToSupress.splice(index, 1);
			} else {
				// const connectionIndex = this._connection.idsToSupress.indexOf(obj.id);
				// if (connectionIndex === -1)
				filtered.push(obj);
			}
		}

		return filtered;
	}

	private addListeners(): void {
		this._fabric.on("object:added", (e: CanvasEvent) => {
			if (e.target === undefined) return;

			const target: CanvasObject = e.target;

			const objs: CanvasObject[] = target._objects
				? target._objects
				: [target];

			let ret = false;
			for (const obj of objs) {
				if (obj.ignore === true) {
					// @ts-ignore
					obj.set("ignore", false);
					ret = true;
				}
			}
			setTimeout(() => {
				const filtered = this.filterSupressed(objs);
				if (ret) return;

				if (filtered.length !== 0) {
					this._it = this._changeStack.length;
					this._changeStack.push({
						type: "create",
						objs: filtered.map(obj =>
							obj.toObject(["id", "extra"])
						),
					});
				}
			}, 0);
		});
		this._fabric.on("object:removed", (e: CanvasEvent) => {
			if (e.target === undefined) return;

			const target: CanvasObject = e.target;

			const objs: CanvasObject[] = target._objects
				? target._objects
				: [target];

			console.log(this._fabric.getObjects().map((o: any) => o.ignore));

			let ret = false;
			for (const obj of objs) {
				if (obj.ignore === true) {
					// @ts-ignore
					obj.set("ignore", false);
					ret = true;
				}
			}
			setTimeout(() => {
				const filtered = this.filterSupressed(objs);
				if (ret) return;

				if (filtered.length !== 0) {
					this._it = this._changeStack.length;
					this._changeStack.push({
						type: "remove",
						objs: filtered.map(obj =>
							obj.toObject(["id", "extra"])
						),
					});
				}
			}, 0);
		});
		this._fabric.on("object:modified", (e: CanvasEvent) => {
			console.info(e);

			let filtered: CanvasObject[] = [];
			let prev: fabric.Object | undefined;
			if (e.ids !== undefined) {
				const objs = e.ids
					.map(id => this._fabric.getObjectById(id))
					.filter(obj => obj !== null);

				filtered = this.filterSupressed(<CanvasObject[]>objs);
				prev = e.prev;
			} else {
				if (e.target === undefined) return;

				const target = e.target;

				const objs = target._objects ? target._objects : [target];

				filtered = this.filterSupressed(objs);

				prev =
					e.transform !== undefined
						? e.transform.original
						: e.transform;

				// todo calc transform  matrix and then pass options
				if (filtered.length !== 0) {
					this._connection.sendFabricData({
						modified: {
							ids: filtered.map(c => <string>c.id),
							prev: prev,
						},
					});
				}
				// }
			}
			if (filtered.length !== 0) {
				this._it = this._changeStack.length;
				this._changeStack.push({
					type: "update",
					objs: filtered.map(obj => obj.toObject(["id", "extra"])),
					prev: prev,
				});
			}
		});
	}

	// private bindKeys(): void {
	// 	$(document).keydown((e: JQuery.Event) => {
	// 		if (e.ctrlKey) {
	// 			if (e.key === 'z') {
	// 				this.undo();
	// 			} else if (e.key === 'y') {
	// 				this.redo();
	// 			}
	// 		}
	// 	});
	// }

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

// todo make it work properly -> sync2 sometimes has two  instances o change
