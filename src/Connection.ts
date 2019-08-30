import { Canvas } from './Canvas';
import { fabric } from 'fabric';

import { DataChannel, TransferData, FabricSyncData, UpdateData } from './interfaces';
import { onmessage } from './types';

export class Connection {
	private idsToSupress: Array<number> = [];

	constructor(
		private _fabric: Canvas,
		private _channel: DataChannel,
		private _master: boolean = false,
		private _onmessage: onmessage = (data: any): void => {}
	) {
		this._channel.onmessage = this.receive.bind(this);

		if (!_master) {
			this.sendFabricData({
				init: true
			});
		}
	}

	public send(data: any): void {
		this._channel.send(JSON.stringify({ data: data }));
	}

	public remove(ids: Array<number>): boolean {
		const data = this.filterSupressed(ids);
		if (data === []) return false;

		this.sendFabricData({ obj: { data: data, type: 'remove' } });

		return true;
	}

	private filterSupressed(objs: any[]): any[] {
		const filtered = [];

		for (const obj of objs) {
			const index = this.idsToSupress.indexOf(<number>obj.id);
			if (index !== -1) {
				this.idsToSupress.splice(index, 1);
			} else filtered.push(obj);
		}

		return filtered;
	}

	/**
	 * created
	 */
	public create(objs: any[]) {
		const data = [];
		for (const obj of this.filterSupressed(objs)) {
			if (obj !== null) {
				const temp = obj.toObject([ 'id', 'extra' ]);
				data.push(temp);
			}
		}

		if (data === []) return false;

		this.sendFabricData({ obj: { data: data, type: 'create' } });

		return true;
	}

	/**
	 * updated
	 */
	public update(objs: UpdateData[]) {
		const data = this.filterSupressed(objs);

		if (data === []) return false;

		this.sendFabricData({ obj: { data: data, type: 'update' } });

		return true;
	}

	private sendFabricData(data: FabricSyncData) {
		this._channel.send(JSON.stringify({ fabricSync: data }));
	}
	private parseFabricData(data: FabricSyncData): void {
		if (data.init === true) {
			this.sendFabricData({
				canvasJSON: this._fabric.toObject([ 'id', 'extra' ])
			});
		}
		if (data.canvasJSON) {
			for (const obj of data.canvasJSON.objects) {
				this.idsToSupress.push(obj.id);
			}
			this._fabric.loadFromJSON(data.canvasJSON, () => {
				this._fabric.refresh();
			});
		}
		if (data.obj) {
			const dataObj = data.obj;

			if (dataObj.type === 'remove') {
				const instances = [];
				for (const id of dataObj.data) {
					this.idsToSupress.push(id);
					const instance = this._fabric.getObjectById(id);

					instances.push(instance);
				}
				this._fabric.remove(...instances);
			} else if (dataObj.type === 'new') {
				fabric.util.enlivenObjects(
					dataObj.data,
					(objects: any) => {
						objects.forEach((obj: any) => {
							this.idsToSupress.push(obj.id);
							this._fabric.add(obj);
						});
					},
					'fabric'
				);
			} else if (dataObj.type === 'update') {
				dataObj.data.forEach((obj: any) => {
					const instance = this._fabric.getObjectById(obj.id);
					instance.set(obj);

					instance.calcCoords();
				});
			}
			this._fabric.refresh();
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

	get channel() {
		return this._channel;
	}

	get onmessage(): onmessage {
		return this._onmessage;
	}

	/**
 	 * Setters
	 */

	set onmessage(fn: onmessage) {
		this._onmessage = fn;
	}
}
