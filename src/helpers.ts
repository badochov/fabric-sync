export const cryptoObj = window.crypto;

export function dec2hex(dec: number) {
	return ('0' + dec.toString(16)).substr(-2);
}

export function generateId(len: number = 40) {
	const arr = new Uint8Array(len / 2);
	cryptoObj.getRandomValues(arr);
	return Array.from(arr, dec2hex).join('');
}
