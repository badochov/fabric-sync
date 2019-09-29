import { Canvas } from "./Canvas";
import { fabric } from "fabric";

import {
	DataChannel,
	TransferData,
	FabricSyncData,
	UpdateData,
} from "./interfaces";
import { onmessage } from "./types";
import { CanvasObject } from ".";
import { UndoRedo } from "./UndoRedo";

export class Connection {
	private _idsToSupress: string[] = [];
	private _undoRedo: UndoRedo;

	constructor(
		private _fabric: Canvas,
		private _channel: DataChannel,
		private _master: boolean = false,
		private _onmessage: onmessage = (data: any): void => {}
	) {
		this._channel.onmessage = this.receive.bind(this);
		this._undoRedo = new UndoRedo(this._fabric, this);
	}
	public init(): void {
		if (!this._master) {
			this.sendFabricData({
				init: true,
			});
		}
		this._undoRedo.init();
	}

	public send(data: any): void {
		this._channel.send(JSON.stringify({ data: data }));
	}

	public remove(ids: string[]): boolean {
		const data = this.filterSupressedIds(ids);
		if (data === []) return false;

		this.sendFabricData({ obj: { data: data, type: "remove" } });

		return true;
	}

	private filterSupressed(objs: CanvasObject[]): CanvasObject[] {
		const filtered = [];

		for (const obj of objs) {
			if (obj.id === undefined) continue;
			const index = this._idsToSupress.indexOf(obj.id);
			if (index !== -1) {
				this._idsToSupress.splice(index, 1);
			} else filtered.push(obj);
		}

		return filtered;
	}
	private filterSupressedIds(ids: Array<string | undefined>): Array<string> {
		const filtered = [];

		for (const id of ids) {
			if (id === undefined) continue;
			const index = this._idsToSupress.indexOf(id);
			if (index !== -1) {
				this._idsToSupress.splice(index, 1);
			} else filtered.push(id);
		}

		return filtered;
	}

	/**
	 * created
	 */
	public create(objs: CanvasObject[]) {
		const data = [];
		for (const obj of this.filterSupressed(objs)) {
			if (obj !== null) {
				const temp = obj.toObject(["id", "extra"]);
				data.push(temp);
			}
		}

		console.log(data);

		if (data === []) return false;

		this.sendFabricData({ obj: { data: data, type: "create" } });

		return true;
	}

	/**
	 * updated
	 */
	public update(objs: UpdateData[]) {
		const filteredIds = this.filterSupressedIds(objs.map(obj => obj.id));
		const data = objs.filter(obj => filteredIds.indexOf(obj.id) !== -1);

		if (data === []) return false;

		this.sendFabricData({ obj: { data: data, type: "update" } });

		return true;
	}

	public sendFabricData(data: FabricSyncData) {
		this._channel.send(JSON.stringify({ fabricSync: data }));
	}
	private parseFabricData(data: FabricSyncData): void {
		// @ts-ignore
		console.log(data, this._fabric.lowerCanvasEl.id);
		if (data.init === true) {
			this.sendFabricData({
				canvasJSON: this._fabric.toObject(["id", "extra"]),
			});
		}
		if (data.canvasJSON) {
			for (const obj of data.canvasJSON.objects) {
				this._idsToSupress.push(obj.id);
			}
			this._undoRedo.clearStack();

			// this._idsToSupress = [];
			this._fabric.loadFromJSON(data.canvasJSON, () => {
				this._fabric.refresh();
			});
		}
		if (data.obj) {
			const dataObj = data.obj;

			if (dataObj.type === "remove") {
				const instances = [];
				for (const id of dataObj.data) {
					this._idsToSupress.push(id);
					const instance = this._fabric.getObjectById(id);
					if (instance !== null) instances.push(instance);
				}
				this._fabric.remove(...instances);
			} else if (dataObj.type === "create") {
				fabric.util.enlivenObjects(
					dataObj.data,
					(objects: any) => {
						objects.forEach((obj: any) => {
							if (this._fabric.getObjectById(obj.id) === null) {
								this._idsToSupress.push(obj.id);
								this._fabric.add(obj);
							}
						});
					},
					"fabric"
				);
			} else if (dataObj.type === "update") {
				const instances: CanvasObject[] = [];

				dataObj.data.forEach((obj: any) => {
					const instance = this._fabric.getObjectById(obj.id);
					if (instance === null) return;

					instances.push(instance);

					instance.set(obj);

					instance.calcCoords();
				});
			}
			this._fabric.refresh();
		}
		if (data.modified) {
			this._fabric.trigger("object:modified", data.modified);
		}
		if (data.undo !== undefined) {
			if (data.undo === true) {
				this._undoRedo.undo(false);
			} else this._undoRedo.redo(false);
		}
	}

	public receive(event: MessageEvent): void {
		const data: TransferData = JSON.parse(event.data);

		if (data.fabricSync) {
			this.parseFabricData(data.fabricSync);
		} else {
			this._onmessage(data.data);
		}
	}

	/**
	 * Getters
	 */

	get channel(): DataChannel {
		return this._channel;
	}

	get master(): boolean {
		return this._master;
	}

	get onmessage(): onmessage {
		return this._onmessage;
	}

	get idsToSupress(): string[] {
		return this._idsToSupress;
	}

	get undoRedo(): UndoRedo {
		return this._undoRedo;
	}

	/**
	 * Setters
	 */

	set onmessage(fn: onmessage) {
		this._onmessage = fn;
	}
	set master(value: boolean) {
		this._master = value;
	}
}
