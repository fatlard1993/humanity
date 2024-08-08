export default class JSONFile {
	constructor(path) {
		this.path = path;
		this.file = Bun.file(path);
	}

	async read() {
		this.data = await this.file.text();

		try {
			this.data = JSON.parse(this.data);
		} catch (error) {
			console.error(error);
		}

		return this.data;
	}

	async write(data = this.data) {
		this.data = data;

		await Bun.write(this.path, JSON.stringify(data));
	}
}
